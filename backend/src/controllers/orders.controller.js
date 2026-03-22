import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Offer from "../models/offer.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse } from "../utils/api-response.js";
import { APIError } from "../utils/api-error.js";
import { sendFCM } from "../utils/send-fcm.js";
import { emitNewOrder, emitStatusUpdate } from "../socket/socket.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const TRANSITIONS = {
  placed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

//POST /api/orders/
const initiateOrder = asyncHandler(async (req, res) => {
  const { items, deliveryPhone  } = req.body;

  if (!items || items.length === 0) {
    throw new APIError(400, "Order must have at least one item");
  }

  const now = new Date();
  const activeOffers = await Offer.find({
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  });

  let subtotal = 0;
  let discount = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId).populate(
      "category",
      "name basePrice",
    );

    if (!product || !product.isAvailable || !product.isActive) {
      throw new APIError(400, `Product ${item.productId} is not available`);
    }

    const base =
      product.priceOverride?.[item.variant] ??
      product.category.basePrice[item.variant];

    if (!base) throw new APIError(400, `Invalid variant: ${item.variant}`);

    const offer = activeOffers.find(
      (o) =>
        o.category === null ||
        o.category?.toString() === product.category._id.toString(),
    );

    const unitPrice = offer
      ? Math.round(base * (1 - offer.discountPercent / 100))
      : base;
    const itemTotal = unitPrice * item.quantity;
    subtotal += base * item.quantity;
    discount += (base - unitPrice) * item.quantity;
  }

  const total = subtotal - discount;

  const rzpOrder = await razorpay.orders.create({
    amount: total * 100, // paise
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
  });

  return res.status(200).json(
    new APIResponse(
      200,
      {
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
        breakdown: { subtotal, discountAmount: discount, total },
      },
      "Order initiated",
    ),
  );
});

//POST /api/orders/confirm
const confirmOrder = asyncHandler(async (req, res) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    items,
    deliveryAddress,
    deliveryPhone,
    deliveryLocation,
  } = req.body;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  if (expected !== razorpaySignature) {
    throw new APIError(400, "Payment verification failed — invalid signature");
  }

  // Step 2 — Check not already confirmed (idempotency)
  const existing = await Order.findOne({
    "payment.razorpayOrderId": razorpayOrderId,
  });
  if (existing) throw new APIError(409, "Order already confirmed");

  // Step 3 — Re-calculate prices server-side (same logic as initiate)
  const now = new Date();
  const activeOffers = await Offer.find({
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  });

  const orderItems = [];
  let subtotal = 0;
  let discount = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId).populate(
      "category",
      "name basePrice",
    );

    if (!product || !product.isAvailable || !product.isActive) {
      throw new APIError(
        400,
        `Product ${item.productId} is no longer available`,
      );
    }

    const base =
      product.priceOverride?.[item.variant] ??
      product.category.basePrice[item.variant];
    const offer = activeOffers.find(
      (o) =>
        o.category === null ||
        o.category?.toString() === product.category._id.toString(),
    );
    const unitPrice = offer
      ? Math.round(base * (1 - offer.discountPercent / 100))
      : base;

    orderItems.push({
      product: product._id,
      productName: product.name,
      variant: item.variant,
      isZeroSugar: product.isZeroSugar,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
    });

    subtotal += base * item.quantity;
    discount += (base - unitPrice) * item.quantity;
  }

  // Step 4 — Save order
  const order = await Order.create({
    customer: req.user._id,
    items: orderItems,
    status: "placed",
    delivery: {
      address: deliveryAddress,
      phone: deliveryPhone,
      location: deliveryLocation,
    },
    pricing: { subtotal, discountAmount: discount, total: subtotal - discount },
    payment: {
      razorpayOrderId,
      razorpayPaymentId,
      status: "paid",
      paidAt: new Date(),
    },
  });

  // Step 5 — Notify admin via Socket + FCM
  const populatedOrder = await Order.findById(order._id).populate(
    "customer",
    "name phone",
  );
  emitNewOrder(populatedOrder);

  const admin = await User.findOne({ role: "admin" });
  if (admin?.fcmToken) {
    await sendFCM(
      admin.fcmToken,
      "🍦 New Order!",
      `Order from ${req.user.phone}`,
      { type: "new_order", orderId: order._id.toString() },
    );
  }

  // Step 6 — Notify customer
  if (req.user.fcmToken) {
    await sendFCM(
      req.user.fcmToken,
      "Order Placed ✅",
      "Your order is confirmed!",
      { type: "order_update", orderId: order._id.toString(), status: "placed" },
    );
  }

  return res.status(201).json(new APIResponse(201, order, "Order confirmed"));
});

//GET /api/orders/my
const getMyOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ customer: req.user._id }),
  ]);

  return res.status(200).json(
    new APIResponse(
      200,
      {
        orders,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
      },
      "Orders fetched",
    ),
  );
});

//GET /api/ordeders/:id
const getOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new APIError(404, "Order not found");

  if (order.customer.toString() !== req.user._id.toString()) {
    throw new APIError(403, "Access denied");
  }

  return res.status(200).json(new APIResponse(200, order, "Order fetched"));
});

//POST /api/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new APIError(404, "Order not found");
  if (order.customer.toString() !== req.user._id.toString()) {
    throw new APIError(403, "Access denied");
  }
  if (order.status !== "placed") {
    throw new APIError(400, `Cannot cancel — order is already ${order.status}`);
  }

  order.status = "cancelled";
  await order.save();

  emitStatusUpdate(order._id.toString(), "cancelled");

  return res
    .status(200)
    .json(new APIResponse(200, { status: "cancelled" }, "Order cancelled"));
});

//GET /api/admin/orders/
const getAdminOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, date } = req.query;

  const filter = {};
  if (status) {
    filter.status = { $in: status.split(",") };
  }
  if (date) {
    const d = new Date(date);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.createdAt = { $gte: d, $lt: nextDay };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("customer", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new APIResponse(
      200,
      {
        orders,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
      },
      "Admin orders fetched",
    ),
  );
});

//GET /api/admin/orders/:id
const getAdminOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "customer",
    "name phone",
  );
  if (!order) throw new APIError(404, "Order not found");
  return res
    .status(200)
    .json(new APIResponse(200, order, "Admin order fetched"));
});

//PATCH /api/admin/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new APIError(400, "status is required");

  const order = await Order.findById(req.params.id).populate(
    "customer",
    "fcmToken",
  );
  if (!order) throw new APIError(404, "Order not found");

  if (!TRANSITIONS[order.status]?.includes(status)) {
    throw new APIError(
      400,
      `Cannot transition from '${order.status}' to '${status}'`,
    );
  }

  order.status = status;
  await order.save();

  // Real-time update to customer
  emitStatusUpdate(order._id.toString(), status);

  // FCM to customer
  const messages = {
    preparing: {
      title: "Preparing your order 👨‍🍳",
      body: "We're making it fresh!",
    },
    out_for_delivery: {
      title: "On the way! 🛵",
      body: "Your ice cream is coming",
    },
    delivered: { title: "Delivered! 🍨", body: "Enjoy your Apsara ice cream" },
    cancelled: {
      title: "Order Cancelled",
      body: "Your order has been cancelled",
    },
  };

  const msg = messages[status];
  if (msg && order.customer?.fcmToken) {
    await sendFCM(order.customer.fcmToken, msg.title, msg.body, {
      type: "order_update",
      orderId: order._id.toString(),
      status,
    });
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { status, updatedAt: order.updatedAt },
        "Status updated",
      ),
    );
});

//GET /api/admin/reports/monthly
const getMonthlyReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) throw new APIError(400, "from and to dates are required");

  const orders = await Order.find({
    status: "delivered",
    createdAt: { $gte: new Date(from), $lte: new Date(to) },
  }).populate("customer", "name phone");

  const totalRevenue = orders.reduce((sum, o) => sum + o.pricing.total, 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  const productMap = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (!productMap[item.productName]) {
        productMap[item.productName] = { totalSold: 0, revenue: 0 };
      }
      productMap[item.productName].totalSold += item.quantity;
      productMap[item.productName].revenue += item.totalPrice;
    });
  });

  const topProducts = Object.entries(productMap)
    .map(([productName, stats]) => ({ productName, ...stats }))
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);

  return res.status(200).json(
    new APIResponse(
      200,
      {
        totalOrders,
        totalRevenue,
        avgOrderValue: avgOrder,
        topProducts,
        orders,
      },
      "Report generated",
    ),
  );
});

export {
  initiateOrder,
  confirmOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderStatus,
  getMonthlyReport,
};

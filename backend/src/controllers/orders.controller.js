import crypto   from 'crypto';
import Razorpay  from 'razorpay';
import Order, { generateOrderNumber } from '../models/order.model.js';
import Product   from '../models/product.model.js';
import Offer     from '../models/offer.model.js';
import User      from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { APIResponse }  from '../utils/api-response.js';
import { APIError }     from '../utils/api-error.js';
import { sendFCM }      from '../utils/send-fcm.js';
import { emitNewOrder, emitStatusUpdate } from '../socket/socket.js';

const razorpay = process.env.RAZORPAY_KEY_ID ? new Razorpay({
  key_id    : process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

const TRANSITIONS = {
  placed          : ['preparing', 'cancelled'],
  preparing       : ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered       : [],
  cancelled       : [],
};

// ─── Shared price resolver for order items ────────────────────────────────────
const resolveItemPrice = (product, variant, activeOffers) => {
  const category = product.category;
  const isSingle = category.productType === 'single';

  // For single products variant is always 'regular'
  const v = isSingle ? 'regular' : variant;

  const base = product.priceOverride?.[v] ?? category.basePrice[v] ?? 0;

  const offer = activeOffers.find(o =>
    !o.category ||
    o.category.toString() === category._id.toString()
  );

  return offer ? Math.round(base * (1 - offer.discountPercent / 100)) : base;
};

// ─── Check if variant is available ───────────────────────────────────────────
const isVariantAvailable = (product, variant) => {
  if (product.category.productType === 'single') {
    return product.isAvailable;
  }
  return product.variantAvailability?.[variant] ?? true;
};

// ─── Fetch all products for order in one query (fixes N+1) ───────────────────
const fetchProductsMap = async (items) => {
  const ids      = items.map(i => i.productId);
  const products = await Product.find({ _id: { $in: ids } })
    .populate('category', 'name basePrice productType hasShareIt');
  const map = {};
  products.forEach(p => { map[p._id.toString()] = p; });
  return map;
};

// ─── POST /api/orders/initiate ────────────────────────────────────────────────
const initiateOrder = asyncHandler(async (req, res) => {
  const { items, paymentMethod } = req.body;
  console.log("Initate hit")

  if (!items || items.length === 0) throw new APIError(400, 'Order must have at least one item');
  if (!paymentMethod || !['online', 'cod'].includes(paymentMethod)) {
    throw new APIError(400, 'paymentMethod must be online or cod');
  }

  const now          = new Date();
  const activeOffers = await Offer.find({ isActive:true, startsAt:{$lte:now}, expiresAt:{$gte:now} });
  const productMap   = await fetchProductsMap(items); // ← single DB query

  let subtotal = 0;
  let discount = 0;

  for (const item of items) {
    const product = productMap[item.productId];
    if (!product || !product.isActive) {
      throw new APIError(400, `Product ${item.productId} not found`);
    }
    if (!isVariantAvailable(product, item.variant)) {
      throw new APIError(400, `${product.name} (${item.variant}) is not available`);
    }

    console.log(items,paymentMethod)

    const isSingle = product.category.productType === 'single';
    const v        = isSingle ? 'regular' : item.variant;
    const base     = product.priceOverride?.[v] ?? product.category.basePrice[v] ?? 0;
    const unitPrice = resolveItemPrice(product, v, activeOffers);

    subtotal += base * item.quantity;
    discount += (base - unitPrice) * item.quantity;
  }

  const deliveryCharge = 20;
  const codCharge      = paymentMethod === 'cod' ? 10 : 0;
  const total          = (subtotal - discount) + deliveryCharge + codCharge;

  // COD or no Razorpay — skip payment gateway
  if (!razorpay || paymentMethod === 'cod') {
    return res.status(200).json(new APIResponse(200, {
      razorpayOrderId: null,
      amount         : total * 100,
      currency       : 'INR',
      key            : null,
      paymentMethod,
      breakdown      : { subtotal, discountAmount:discount, deliveryCharge, codCharge, total },
    }, 'Order initiated'));
  }

  const rzpOrder = await razorpay.orders.create({
    amount  : total * 100,
    currency: 'INR',
    receipt : `rcpt_${Date.now()}`,
  });

  return res.status(200).json(new APIResponse(200, {
    razorpayOrderId: rzpOrder.id,
    amount         : rzpOrder.amount,
    currency       : 'INR',
    key            : process.env.RAZORPAY_KEY_ID,
    paymentMethod,
    breakdown      : { subtotal, discountAmount:discount, deliveryCharge, codCharge, total },
  }, 'Order initiated'));
});

// ─── POST /api/orders/confirm ─────────────────────────────────────────────────
const confirmOrder = asyncHandler(async (req, res) => {
  const {
    razorpayOrderId, razorpayPaymentId, razorpaySignature,
    items, deliveryAddress, deliveryPhone, deliveryLocation, paymentMethod,
  } = req.body;

  // Signature check only for online payments
  if (paymentMethod === 'online' && razorpayOrderId) {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    if (expected !== razorpaySignature) {
      throw new APIError(400, 'Payment verification failed');
    }
    // Idempotency check
    const existing = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
    if (existing) throw new APIError(409, 'Order already confirmed');
  }

  const now          = new Date();
  const activeOffers = await Offer.find({ isActive:true, startsAt:{$lte:now}, expiresAt:{$gte:now} });
  const productMap   = await fetchProductsMap(items); 

  const orderItems = [];
  let subtotal     = 0;
  let discount     = 0;

  for (const item of items) {
    const product = productMap[item.productId];
    if (!product || !product.isActive) {
      throw new APIError(400, `Product ${item.productId} no longer available`);
    }

    const isSingle  = product.category.productType === 'single';
    const v         = isSingle ? 'regular' : item.variant;
    const base      = product.priceOverride?.[v] ?? product.category.basePrice[v] ?? 0;
    const unitPrice = resolveItemPrice(product, v, activeOffers);

    orderItems.push({
      product    : product._id,
      productName: product.name,
      variant    : isSingle ? 'single' : v,
      isZeroSugar: product.isZeroSugar,
      quantity   : item.quantity,
      unitPrice,
      totalPrice : unitPrice * item.quantity,
    });

    subtotal += base * item.quantity;
    discount += (base - unitPrice) * item.quantity;
  }

  const deliveryCharge = 20;
  const codCharge      = paymentMethod === 'cod' ? 10 : 0;
  const total          = (subtotal - discount) + deliveryCharge + codCharge;

  // Generate human-readable order number — ORD-001
  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: req.user._id,
    items   : orderItems,
    status  : 'placed',
    delivery: { address:deliveryAddress, phone:deliveryPhone, location:deliveryLocation },
    pricing : { subtotal, discountAmount:discount, deliveryCharge, codCharge, total },
    payment : {
      razorpayOrderId  : razorpayOrderId   || null,
      razorpayPaymentId: razorpayPaymentId || null,
      method           : paymentMethod,
      status           : paymentMethod === 'cod' ? 'pending' : 'paid',
      paidAt           : paymentMethod === 'online' ? new Date() : null,
    },
  });

  // Notify admin
  const populatedOrder = await Order.findById(order._id).populate('customer', 'name phone');
  emitNewOrder(populatedOrder);

  const adminUser = await User.findOne({ role: 'admin' });
  if (adminUser?.fcmToken) {
    await sendFCM(
      adminUser.fcmToken,
      `🍦 New Order ${orderNumber}`,
      `${paymentMethod.toUpperCase()} order from ${req.user.phone}`,
      { type:'new_order', orderId:order._id.toString(), orderNumber }
    );
  }

  if (req.user.fcmToken) {
    await sendFCM(
      req.user.fcmToken,
      `Order ${orderNumber} Placed ✅`,
      'Your order is confirmed!',
      { type:'order_update', orderId:order._id.toString(), status:'placed', orderNumber }
    );
  }

  return res.status(201).json(new APIResponse(201, order, 'Order confirmed'));
});

// ─── GET /api/orders/my ───────────────────────────────────────────────────────
const getMyOrders = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ customer: req.user._id }),
  ]);

  return res.status(200).json(new APIResponse(200, {
    orders, currentPage:page, totalPages:Math.ceil(total/limit), total,
  }, 'Orders fetched'));
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
const getOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new APIError(404, 'Order not found');
  if (order.customer.toString() !== req.user._id.toString()) {
    throw new APIError(403, 'Access denied');
  }
  return res.status(200).json(new APIResponse(200, order, 'Order fetched'));
});

// ─── POST /api/orders/:id/cancel ─────────────────────────────────────────────
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new APIError(404, 'Order not found');
  if (order.customer.toString() !== req.user._id.toString()) throw new APIError(403, 'Access denied');
  if (order.status !== 'placed') throw new APIError(400, `Cannot cancel — order is ${order.status}`);

  order.status = 'cancelled';
  await order.save();
  emitStatusUpdate(order._id.toString(), 'cancelled');

  return res.status(200).json(new APIResponse(200, { status:'cancelled' }, 'Order cancelled'));
});

// ─── GET /api/orders — admin order list ──────────────────────────────────────
const getAdminOrders = asyncHandler(async (req, res) => {
  const { status, page=1, limit=20, date } = req.query;

  const filter = {};
  if (status) filter.status = { $in: status.split(',') };
  if (date) {
    const d       = new Date(date);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.createdAt = { $gte: d, $lt: nextDay };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(new APIResponse(200, {
    orders, currentPage:parseInt(page), totalPages:Math.ceil(total/parseInt(limit)), total,
  }, 'Admin orders fetched'));
});

// ─── GET /api/orders/admin/:id ────────────────────────────────────────────────
const getAdminOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customer', 'name phone');
  if (!order) throw new APIError(404, 'Order not found');
  return res.status(200).json(new APIResponse(200, order, 'Order fetched'));
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new APIError(400, 'status is required');

  const order = await Order.findById(req.params.id).populate('customer', 'fcmToken');
  if (!order) throw new APIError(404, 'Order not found');

  if (!TRANSITIONS[order.status]?.includes(status)) {
    throw new APIError(400, `Cannot go from '${order.status}' to '${status}'`);
  }

  order.status = status;
  await order.save();

  emitStatusUpdate(order._id.toString(), status);

  const messages = {
    preparing       : { title:'Preparing 👨‍🍳', body:"We're making it fresh!" },
    out_for_delivery: { title:'On the way! 🛵', body:'Your ice cream is coming' },
    delivered       : { title:'Delivered! 🍨', body:'Enjoy your Apsara ice cream' },
    cancelled       : { title:'Cancelled', body:'Your order has been cancelled' },
  };

  const msg = messages[status];
  if (msg && order.customer?.fcmToken) {
    await sendFCM(order.customer.fcmToken, msg.title, msg.body, {
      type:'order_update', orderId:order._id.toString(), status,
    });
  }

  return res.status(200).json(
    new APIResponse(200, { status, updatedAt:order.updatedAt }, 'Status updated')
  );
});

// ─── GET /api/admin/reports/monthly ──────────────────────────────────────────
const getMonthlyReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) throw new APIError(400, 'from and to dates are required');

  const orders = await Order.find({
    status   : 'delivered',
    createdAt: { $gte: new Date(from), $lte: new Date(to) },
  }).populate('customer', 'name phone');

  const totalRevenue = orders.reduce((s, o) => s + o.pricing.total, 0);
  const totalOrders  = orders.length;
  const avgOrder     = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  const productMap = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!productMap[item.productName]) productMap[item.productName] = { totalSold:0, revenue:0 };
      productMap[item.productName].totalSold += item.quantity;
      productMap[item.productName].revenue   += item.totalPrice;
    });
  });

  const topProducts = Object.entries(productMap)
    .map(([productName, stats]) => ({ productName, ...stats }))
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);

  return res.status(200).json(new APIResponse(200, {
    totalOrders, totalRevenue, avgOrderValue:avgOrder, topProducts, orders,
  }, 'Report generated'));
});

export {
  initiateOrder, confirmOrder, getMyOrders, getOrderDetails,
  cancelOrder, getAdminOrders, getAdminOrderDetails, updateOrderStatus, getMonthlyReport,
};
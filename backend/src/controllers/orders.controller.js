import crypto   from 'crypto';
import Razorpay  from 'razorpay';
import Order, { generateOrderNumber } from '../models/order.model.js';
import Product   from '../models/product.model.js';
import Offer     from '../models/offer.model.js';
import User      from '../models/user.model.js';
import StoreSettings from '../models/storeSettings.model.js';
import Staff from '../models/staff.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { APIResponse }  from '../utils/api-response.js';
import { APIError }     from '../utils/api-error.js';
import { sendFCM }      from '../utils/send-fcm.js';
import { emitNewOrder, emitStatusUpdate, emitRiderLocationUpdated, emitOrderCancelled, emitRiderAssigned } from '../socket/socket.js';
import { calculateDistanceKm, calculateDeliveryCharge } from '../utils/delivery.js';

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

// ─── Shared price resolver for order items with minOrderAmount verification ──
const calculateOrderPricing = (items, productMap, activeOffers) => {
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = productMap[item.productId];
    if (!product || !product.isActive) {
      throw new APIError(400, `Product ${item.productId} not found`);
    }
    if (!isVariantAvailable(product, item.variant)) {
      throw new APIError(400, `${product.name} (${item.variant}) is not available`);
    }

    const isSingle = product.category.productType === 'single';
    const v = isSingle ? 'regular' : item.variant;
    const base = product.priceOverride?.[v] ?? product.category.basePrice[v] ?? 0;

    orderItems.push({
      product: product._id,
      productName: product.name,
      variant: isSingle ? 'single' : v,
      isZeroSugar: product.isZeroSugar,
      quantity: item.quantity,
      unitPrice: base,
      totalPrice: base * item.quantity,
      imageUrl: product.imageUrl || '',
      categoryId: product.category._id.toString(),
    });

    subtotal += base * item.quantity;
  }

  const uniqueCategoryIds = Array.from(new Set(orderItems.map(it => it.categoryId).filter(Boolean)));
  const totalQuantity = orderItems.reduce((acc, it) => acc + it.quantity, 0);

  let totalDiscount = 0;
  let appliedOffer = null;

  // Rule 1: If strictly 1 category is present in cart, evaluate category-specific offer
  if (uniqueCategoryIds.length === 1) {
    const singleCatId = uniqueCategoryIds[0];
    const categoryOffer = activeOffers.find(off => {
      const targetCatId = off.category ? (off.category._id || off.category).toString() : null;
      return targetCatId === singleCatId;
    });

    if (categoryOffer) {
      const minReq = categoryOffer.minOrderAmount || 0;
      const minQty = categoryOffer.minQuantity || 1;
      if (subtotal >= minReq && totalQuantity >= minQty) {
        totalDiscount = Math.round(subtotal * (categoryOffer.discountPercent / 100));
        appliedOffer = categoryOffer;
      }
    }
  }

  // Rule 2: If mix of categories or category offer requirements were not met, evaluate storewide All-Category offer
  if (!appliedOffer) {
    const allCategoryOffer = activeOffers.find(off => !off.category);
    if (allCategoryOffer) {
      const minReq = allCategoryOffer.minOrderAmount || 0;
      const minQty = allCategoryOffer.minQuantity || 1;
      if (subtotal >= minReq && totalQuantity >= minQty) {
        totalDiscount = Math.round(subtotal * (allCategoryOffer.discountPercent / 100));
        appliedOffer = allCategoryOffer;
      }
    }
  }

  return { orderItems, subtotal, discount: totalDiscount };
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
  const storeSettings = await StoreSettings.findOne();
  if (storeSettings && storeSettings.isStoreOpen === false) {
    throw new APIError(400, storeSettings.closedNotice || 'Store is currently closed and not accepting orders.');
  }

  const { items, paymentMethod } = req.body;

  if (!items || items.length === 0) throw new APIError(400, 'Order must have at least one item');
  if (!paymentMethod || !['online', 'cod'].includes(paymentMethod)) {
    throw new APIError(400, 'paymentMethod must be online or cod');
  }

  const now          = new Date();
  const activeOffers = await Offer.find({ isActive:true, startsAt:{$lte:now}, expiresAt:{$gte:now} });
  const productMap   = await fetchProductsMap(items);

  const { subtotal, discount } = calculateOrderPricing(items, productMap, activeOffers);

  const deliveryLocation = req.body.deliveryLocation || req.body.delivery?.location;
  const storeLat = storeSettings?.storeLocation?.lat ?? 13.0033;
  const storeLng = storeSettings?.storeLocation?.lng ?? 77.6834;
  const baseDeliveryPrice = storeSettings?.baseDeliveryPrice ?? 30;
  const freeDeliveryThreshold = storeSettings?.freeDeliveryThreshold ?? 599;

  let distanceKm = null;
  if (deliveryLocation && deliveryLocation.lat != null && deliveryLocation.lng != null) {
    distanceKm = calculateDistanceKm(storeLat, storeLng, deliveryLocation.lat, deliveryLocation.lng);
  }

  const deliveryCalc = calculateDeliveryCharge({
    distanceKm,
    basePrice: baseDeliveryPrice,
    paymentMethod,
    subtotal,
    freeDeliveryThreshold,
  });

  if (!deliveryCalc.allowed) {
    throw new APIError(400, deliveryCalc.reason);
  }

  const deliveryCharge = deliveryCalc.charge;
  const packagingFee   = subtotal > 0 ? 10 : 0;
  const codCharge      = 0;
  const total          = Math.max(0, subtotal - discount) + deliveryCharge + packagingFee;

  // COD or no Razorpay — skip payment gateway
  if (!razorpay || paymentMethod === 'cod') {
    return res.status(200).json(new APIResponse(200, {
      razorpayOrderId: null,
      amount         : total * 100,
      currency       : 'INR',
      key            : null,
      paymentMethod,
      breakdown      : {
        subtotal,
        discountAmount: discount,
        deliveryCharge,
        packagingFee,
        codCharge,
        total,
        distanceKm,
        isFreeDelivery: deliveryCalc.isFree,
      },
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
    breakdown      : { subtotal, discountAmount: discount, deliveryCharge, packagingFee, codCharge, total },
  }, 'Order initiated'));
});

// ─── POST /api/orders/confirm ─────────────────────────────────────────────────
const confirmOrder = asyncHandler(async (req, res) => {
  const {
    razorpayOrderId, razorpayPaymentId, razorpaySignature,
    items, deliveryAddress, deliveryPhone, deliveryLocation, paymentMethod,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new APIError(400, 'Order must have at least one item');
  }

  const now = new Date();
  const [storeSettings, activeOffers, productMap] = await Promise.all([
    StoreSettings.findOne(),
    Offer.find({ isActive: true, startsAt: { $lte: now }, expiresAt: { $gte: now } }),
    fetchProductsMap(items),
  ]);

  if (storeSettings && storeSettings.isStoreOpen === false) {
    throw new APIError(400, storeSettings.closedNotice || 'Store is currently closed and not accepting orders.');
  }

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

  const { orderItems, subtotal, discount } = calculateOrderPricing(items, productMap, activeOffers);

  const parsedLocation =
    deliveryLocation &&
    typeof deliveryLocation === 'object' &&
    deliveryLocation.lat !== undefined &&
    deliveryLocation.lng !== undefined
      ? { lat: Number(deliveryLocation.lat), lng: Number(deliveryLocation.lng) }
      : null;

  const storeLat = storeSettings?.storeLocation?.lat ?? 13.0033;
  const storeLng = storeSettings?.storeLocation?.lng ?? 77.6834;
  const baseDeliveryPrice = storeSettings?.baseDeliveryPrice ?? 30;
  const freeDeliveryThreshold = storeSettings?.freeDeliveryThreshold ?? 599;

  let distanceKm = null;
  if (parsedLocation && parsedLocation.lat != null && parsedLocation.lng != null) {
    distanceKm = calculateDistanceKm(storeLat, storeLng, parsedLocation.lat, parsedLocation.lng);
  }

  const deliveryCalc = calculateDeliveryCharge({
    distanceKm,
    basePrice: baseDeliveryPrice,
    paymentMethod,
    subtotal,
    freeDeliveryThreshold,
  });

  if (!deliveryCalc.allowed) {
    throw new APIError(400, deliveryCalc.reason);
  }

  const deliveryCharge = deliveryCalc.charge;
  const packagingFee   = subtotal > 0 ? 10 : 0;
  const codCharge      = 0;
  const total          = Math.max(0, subtotal - discount) + deliveryCharge + packagingFee;

  // Generate human-readable order number — ORD-001
  const orderNumber = await generateOrderNumber();

  let googleMapsUrl = '';
  if (parsedLocation && parsedLocation.lat && parsedLocation.lng) {
    googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${parsedLocation.lat},${parsedLocation.lng}`;
  } else if (deliveryAddress) {
    const queryAddress = deliveryAddress.toLowerCase().includes('mandya')
      ? deliveryAddress
      : `${deliveryAddress}, Mandya, Karnataka`;
    googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryAddress)}`;
  }

  const order = await Order.create({
    orderNumber,
    customer: req.user._id,
    items   : orderItems,
    status  : 'placed',
    delivery: {
      address      : deliveryAddress,
      phone        : deliveryPhone,
      ...(parsedLocation ? { location: parsedLocation } : {}),
      googleMapsUrl,
      riderTrackingToken: crypto.randomBytes(16).toString('hex'),
    },
    pricing : { subtotal, discountAmount: discount, deliveryCharge, packagingFee, codCharge, total },
    payment : {
      ...(razorpayOrderId ? { razorpayOrderId } : {}),
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
      method           : paymentMethod,
      status           : paymentMethod === 'cod' ? 'pending' : 'paid',
      paidAt           : paymentMethod === 'online' ? new Date() : null,
    },
  });

  // Notify admin via socket immediately
  const populatedOrder = order.toObject ? order.toObject() : { ...order };
  populatedOrder.customer = {
    _id: req.user._id,
    name: req.user.name || '',
    phone: req.user.phone || '',
  };
  emitNewOrder(populatedOrder);

  // Background non-blocking FCM notifications so customer checkout is instant
  setImmediate(async () => {
    try {
      const adminUsers = await User.find({ role: { $in: ['admin', 'owner'] } })
        .select('fcmToken pushToken')
        .lean();

      for (const adminUser of adminUsers) {
        const tokens = [adminUser.fcmToken, adminUser.pushToken].filter(Boolean);
        for (const token of new Set(tokens)) {
          sendFCM(
            token,
            `🍦 New Order ${orderNumber}`,
            `${paymentMethod.toUpperCase()} order from ${req.user.phone}`,
            { type: 'new_order', orderId: order._id.toString(), orderNumber }
          ).catch(() => {});
        }
      }

      const customerUser = await User.findById(req.user._id)
        .select('fcmToken pushToken')
        .lean();

      if (customerUser) {
        const customerTokens = [customerUser.fcmToken, customerUser.pushToken].filter(Boolean);
        for (const token of new Set(customerTokens)) {
          sendFCM(
            token,
            `Order ${orderNumber} Placed ✅`,
            'Your order is confirmed!',
            { type: 'order_update', orderId: order._id.toString(), status: 'placed', orderNumber }
          ).catch(() => {});
        }
      }
    } catch (fcmErr) {
      console.warn('[Push Background Warning]', fcmErr.message);
    }
  });

  return res.status(201).json(new APIResponse(201, order, 'Order confirmed'));
});

// ─── GET /api/orders/my ───────────────────────────────────────────────────────
const getMyOrders = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ customer: req.user._id })
      .populate('items.product', 'name imageUrl category')
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
  const order = await Order.findById(req.params.id)
    .populate('items.product', 'name imageUrl category');
  if (!order) throw new APIError(404, 'Order not found');
  if (order.customer.toString() !== req.user._id.toString()) {
    throw new APIError(403, 'Access denied');
  }
  return res.status(200).json(new APIResponse(200, order, 'Order fetched'));
});

// ─── POST /api/orders/:id/cancel ─────────────────────────────────────────────
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name phone fcmToken pushToken');
  if (!order) throw new APIError(404, 'Order not found');

  const customerId = order.customer?._id || order.customer;
  if (customerId.toString() !== req.user._id.toString()) {
    throw new APIError(403, 'Access denied');
  }

  if (order.status !== 'placed') {
    throw new APIError(400, `Cannot cancel — order is already ${order.status}`);
  }

  // Enforce 1-minute cancellation window (allow 65s for network latency)
  const orderCreatedTime = new Date(order.createdAt).getTime();
  const elapsedSec = (Date.now() - orderCreatedTime) / 1000;
  if (elapsedSec > 65) {
    throw new APIError(400, 'Cancellation window expired. Orders can only be cancelled within 1 minute of booking.');
  }

  order.status = 'cancelled';
  order.cancellationReason = req.body?.reason || 'Cancelled by customer within 1 minute';
  order.cancelledAt = new Date();
  if (order.payment?.status === 'paid') {
    order.payment.status = 'refund_pending';
  }
  await order.save();

  // Socket broadcast to admin store side and tracking screen
  emitStatusUpdate(order._id.toString(), 'cancelled');
  emitOrderCancelled(order);

  // Send push notification to Admin & Owner
  setImmediate(async () => {
    try {
      const adminUsers = await User.find({ role: { $in: ['admin', 'owner'] } })
        .select('fcmToken pushToken')
        .lean();

      const customerPhone = order.customer?.phone || req.user.phone || '';
      for (const adminUser of adminUsers) {
        const tokens = [adminUser.fcmToken, adminUser.pushToken].filter(Boolean);
        for (const token of new Set(tokens)) {
          sendFCM(
            token,
            `⚠️ Order Cancelled: ${order.orderNumber}`,
            `Customer (${customerPhone}) cancelled order within 1 minute.`,
            {
              type: 'order_cancelled',
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              status: 'cancelled',
            }
          ).catch(() => {});
        }
      }
    } catch (fcmErr) {
      console.warn('[Push Cancellation Warning]', fcmErr.message);
    }
  });

  return res.status(200).json(new APIResponse(200, { status: 'cancelled', order }, 'Order cancelled successfully'));
});

const formatOrderForRole = (orderDoc, role) => {
  if (!orderDoc) return null;
  const order = orderDoc.toObject ? orderDoc.toObject() : { ...orderDoc };

  if (role === 'biller') {
    const isCod = order.payment?.method === 'cod';

    if (Array.isArray(order.items)) {
      order.items = order.items.map((item) => {
        const itemObj = item.toObject ? item.toObject() : { ...item };
        return {
          ...itemObj,
          unitPrice: null,
          totalPrice: null,
        };
      });
    }

    if (isCod) {
      const finalTotal = order.pricing?.total ?? null;
      order.pricing = {
        subtotal: null,
        discountAmount: null,
        deliveryCharge: null,
        packagingFee: null,
        codCharge: null,
        total: finalTotal,
      };
      order.totalAmount = finalTotal;
    } else {
      order.pricing = {
        subtotal: null,
        discountAmount: null,
        deliveryCharge: null,
        packagingFee: null,
        codCharge: null,
        total: null,
      };
      order.totalAmount = null;
    }

    if (order.payment) {
      order.payment = {
        method: order.payment.method,
        status: order.payment.status,
        paidAt: order.payment.paidAt,
      };
    }
  }

  return order;
};

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
      .populate('items.product', 'name imageUrl category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  const userRole = req.user?.role;
  const formattedOrders = orders.map((o) => formatOrderForRole(o, userRole));

  return res.status(200).json(new APIResponse(200, {
    orders: formattedOrders, currentPage:parseInt(page), totalPages:Math.ceil(total/parseInt(limit)), total,
  }, 'Admin orders fetched'));
});

// ─── GET /api/orders/admin/:id ────────────────────────────────────────────────
const getAdminOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name phone')
    .populate('items.product', 'name imageUrl category');
  if (!order) throw new APIError(404, 'Order not found');

  const userRole = req.user?.role;
  const formattedOrder = formatOrderForRole(order, userRole);

  return res.status(200).json(new APIResponse(200, formattedOrder, 'Order fetched'));
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new APIError(400, 'status is required');

  if (['out_for_delivery', 'delivered'].includes(status)) {
    throw new APIError(400, 'Orders cannot be marked Out for Delivery or Delivered from Admin. The assigned rider must initiate delivery and verify the customer OTP.');
  }

  const order = await Order.findById(req.params.id).populate('customer', 'fcmToken pushToken name phone');
  if (!order) throw new APIError(404, 'Order not found');

  if (!TRANSITIONS[order.status]?.includes(status)) {
    throw new APIError(400, `Cannot go from '${order.status}' to '${status}'`);
  }

  if (status === 'out_for_delivery' && !order.delivery?.riderTrackingToken) {
    if (!order.delivery) order.delivery = {};
    order.delivery.riderTrackingToken = crypto.randomBytes(16).toString('hex');
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
  if (msg) {
    let customerDoc = order.customer;
    if (!customerDoc?.fcmToken && !customerDoc?.pushToken) {
      const customerId = order.customer?._id || order.customer;
      if (customerId) {
        customerDoc = await User.findById(customerId).select('fcmToken pushToken').lean();
      }
    }

    const tokens = new Set();
    if (customerDoc?.fcmToken) tokens.add(customerDoc.fcmToken);
    if (customerDoc?.pushToken) tokens.add(customerDoc.pushToken);

    for (const token of tokens) {
      sendFCM(token, msg.title, msg.body, {
        type: 'order_update',
        orderId: order._id.toString(),
        status,
        orderNumber: order.orderNumber || '',
      }).catch((err) => console.warn('[Order Update Push Warning]', err.message));
    }
  }

  return res.status(200).json(
    new APIResponse(200, { status, updatedAt:order.updatedAt }, 'Status updated')
  );
});

// ─── GET /api/admin/reports/monthly ──────────────────────────────────────────
const getMonthlyReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) throw new APIError(400, 'from and to dates are required');

  const startDate = new Date(from);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    status   : 'delivered',
    createdAt: { $gte: startDate, $lte: endDate },
  }).populate('customer', 'name phone').sort({ createdAt: -1 });

  const totalRevenue = orders.reduce((s, o) => s + (o.pricing?.total ?? o.totalAmount ?? 0), 0);
  const totalOrders  = orders.length;
  const avgOrder     = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  const productMap = {};
  orders.forEach(order => {
    (order.items || []).forEach(item => {
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

// ─── GET /api/orders/rider-track/:id ──────────────────────────────────────────
const getRiderOrderDetails = asyncHandler(async (req, res) => {
  const clientToken = req.query?.token || req.headers['x-rider-token'] || req.body?.token;
  const orderDoc = await Order.findById(req.params.id)
    .populate('customer', 'name phone');

  if (!orderDoc) throw new APIError(404, 'Order not found');
  if (orderDoc.delivery?.riderTrackingToken && clientToken && clientToken !== orderDoc.delivery.riderTrackingToken) {
    throw new APIError(403, 'Invalid or missing rider tracking token');
  }

  const order = orderDoc.toObject();
  // Never expose delivery OTP to rider screen
  delete order.deliveryOtp;

  // Auto seed default staff if none exist yet, then fetch active staff
  let activeStaff = await Staff.find({ isActive: true }).select('name phone role').lean();
  if (!activeStaff || activeStaff.length === 0) {
    const totalStaffCount = await Staff.countDocuments();
    if (totalStaffCount === 0) {
      await Staff.insertMany([
        { name: 'Ramesh', phone: '9876543210', role: 'rider', isActive: true },
        { name: 'Suresh', phone: '9876543211', role: 'rider', isActive: true },
      ]);
      activeStaff = await Staff.find({ isActive: true }).select('name phone role').lean();
    }
  }

  return res.status(200).json(new APIResponse(200, {
    order,
    activeStaff,
  }, 'Rider order details fetched'));
});

// ─── POST /api/orders/rider-track/:id/start ──────────────────────────────────
const startRiderDelivery = asyncHandler(async (req, res) => {
  const { token, staffId, name, phone } = req.body;
  const clientToken = token || req.query?.token || req.headers['x-rider-token'];

  const order = await Order.findById(req.params.id).populate('customer', 'fcmToken pushToken name phone');
  if (!order) throw new APIError(404, 'Order not found');

  if (order.delivery?.riderTrackingToken && clientToken && clientToken !== order.delivery.riderTrackingToken) {
    throw new APIError(403, 'Invalid or missing rider tracking token');
  }

  if (order.status === 'cancelled') {
    throw new APIError(400, 'Order has already been cancelled');
  }
  if (order.status === 'delivered') {
    throw new APIError(400, 'Order has already been delivered');
  }

  // Generate 4-digit OTP if not already generated
  if (order.status !== 'out_for_delivery') {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    order.deliveryOtp = otp;
    order.deliveryOtpVerified = false;
    order.status = 'out_for_delivery';
  }

  const staffName = name || 'Store Staff';
  const staffPhone = phone || '';

  order.deliveryStaff = {
    staffId: staffId || null,
    name: staffName,
    phone: staffPhone,
    assignedAt: new Date(),
  };

  if (!order.delivery) order.delivery = {};
  order.delivery.riderName = staffName;
  order.delivery.riderPhone = staffPhone;

  await order.save();

  emitStatusUpdate(order._id.toString(), 'out_for_delivery');
  emitRiderAssigned(order._id.toString(), order.deliveryStaff);

  // Send push notification to Customer with OTP
  try {
    let customerDoc = order.customer;
    if (!customerDoc?.fcmToken && !customerDoc?.pushToken) {
      const customerId = order.customer?._id || order.customer;
      if (customerId) {
        customerDoc = await User.findById(customerId).select('fcmToken pushToken').lean();
      }
    }
    const tokens = new Set();
    if (customerDoc?.fcmToken) tokens.add(customerDoc.fcmToken);
    if (customerDoc?.pushToken) tokens.add(customerDoc.pushToken);

    for (const tok of tokens) {
      sendFCM(
        tok,
        '🛵 Order Out for Delivery!',
        `${staffName} is on the way with your ice cream! Share Delivery OTP ${order.deliveryOtp} upon arrival.`,
        {
          type: 'order_update',
          orderId: order._id.toString(),
          status: 'out_for_delivery',
          otp: order.deliveryOtp,
          orderNumber: order.orderNumber || '',
          riderName: staffName,
          riderPhone: staffPhone,
        }
      ).catch((err) => console.warn('[Rider Start FCM Warning]', err.message));
    }
  } catch (err) {
    console.warn('[Rider Start Notification Error]', err.message);
  }

  return res.status(200).json(
    new APIResponse(200, {
      status: order.status,
      deliveryStaff: order.deliveryStaff,
      updatedAt: order.updatedAt,
    }, 'Order picked up and marked out for delivery')
  );
});

// ─── POST /api/orders/rider-track/:id/verify-otp ─────────────────────────────
const verifyRiderDeliveryOtp = asyncHandler(async (req, res) => {
  const { token, otp } = req.body;
  const clientToken = token || req.query?.token || req.headers['x-rider-token'];

  const order = await Order.findById(req.params.id).populate('customer', 'fcmToken pushToken name phone');
  if (!order) throw new APIError(404, 'Order not found');

  if (order.delivery?.riderTrackingToken && clientToken && clientToken !== order.delivery.riderTrackingToken) {
    throw new APIError(403, 'Invalid or missing rider tracking token');
  }

  if (order.status === 'delivered') {
    return res.status(200).json(new APIResponse(200, { status: 'delivered' }, 'Order is already delivered'));
  }

  if (order.status !== 'out_for_delivery') {
    throw new APIError(400, `Order is not out for delivery (current status: ${order.status})`);
  }

  if (!otp || String(otp).trim() !== String(order.deliveryOtp).trim()) {
    throw new APIError(400, 'Invalid Delivery OTP. Please ask the customer for their 4-digit OTP.');
  }

  order.deliveryOtpVerified = true;
  order.status = 'delivered';

  // If COD, mark payment as paid
  if (order.payment?.method === 'cod') {
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
  }

  await order.save();

  emitStatusUpdate(order._id.toString(), 'delivered');

  // Push notification to Customer
  try {
    let customerDoc = order.customer;
    if (!customerDoc?.fcmToken && !customerDoc?.pushToken) {
      const customerId = order.customer?._id || order.customer;
      if (customerId) {
        customerDoc = await User.findById(customerId).select('fcmToken pushToken').lean();
      }
    }
    const tokens = new Set();
    if (customerDoc?.fcmToken) tokens.add(customerDoc.fcmToken);
    if (customerDoc?.pushToken) tokens.add(customerDoc.pushToken);

    for (const tok of tokens) {
      sendFCM(
        tok,
        '🍨 Order Delivered!',
        'Your Apsara Ice Cream order has been delivered! Enjoy your treat.',
        {
          type: 'order_update',
          orderId: order._id.toString(),
          status: 'delivered',
          orderNumber: order.orderNumber || '',
        }
      ).catch((err) => console.warn('[Rider Delivered FCM Warning]', err.message));
    }
  } catch (err) {
    console.warn('[Rider Delivered Notification Error]', err.message);
  }

  return res.status(200).json(
    new APIResponse(200, {
      status: 'delivered',
      deliveryOtpVerified: true,
      updatedAt: order.updatedAt,
    }, 'Order delivered successfully')
  );
});

// ─── POST /api/orders/rider-track/:id/location ────────────────────────────────
const updateRiderLocation = asyncHandler(async (req, res) => {
  const { lat, lng, heading } = req.body;
  if (!lat || !lng) throw new APIError(400, 'lat and lng are required');

  const clientToken = req.query?.token || req.headers['x-rider-token'] || req.body?.token;
  const order = await Order.findById(req.params.id);
  if (!order) throw new APIError(404, 'Order not found');

  if (order.delivery?.riderTrackingToken && clientToken && clientToken !== order.delivery.riderTrackingToken) {
    throw new APIError(403, 'Invalid or missing rider tracking token');
  }

  if (!order.delivery) order.delivery = {};
  order.delivery.riderLocation = {
    lat: Number(lat),
    lng: Number(lng),
    heading: Number(heading || 0),
    updatedAt: new Date(),
  };

  await order.save();

  emitRiderLocationUpdated(order._id.toString(), {
    lat: Number(lat),
    lng: Number(lng),
    heading: Number(heading || 0),
    updatedAt: order.delivery.riderLocation.updatedAt,
  });

  return res.status(200).json(new APIResponse(200, { success: true }, 'Rider location recorded'));
});

export {
  initiateOrder, confirmOrder, getMyOrders, getOrderDetails,
  cancelOrder, getAdminOrders, getAdminOrderDetails, updateOrderStatus, getMonthlyReport,
  getRiderOrderDetails, updateRiderLocation, startRiderDelivery, verifyRiderDeliveryOtp,
};
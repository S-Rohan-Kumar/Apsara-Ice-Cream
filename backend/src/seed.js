import mongoose from 'mongoose';
import './models/category.model.js';
import Product from './models/product.model.js';
import Order, { OrderCounter } from './models/order.model.js'; // Ensure OrderCounter is exported
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// ── Shared IDs ──────────────────────────────────────────────────────────────
const CUSTOMERS = [
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
];

// ── Modernized generateOrderNumber (Fixes Deprecation Warning) ──────────────
const getCurrentFinancialYear = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  return `FY${startYear}-${(startYear + 1).toString().slice(-2)}`;
};

const getOrderNumber = async () => {
  const fy = getCurrentFinancialYear();
  const counter = await OrderCounter.findOneAndUpdate(
    { financialYear: fy },
    { $inc: { lastNumber: 1 } },
    { returnDocument: 'after', upsert: true } // Use returnDocument: 'after'
  );
  return `ORD-${counter.lastNumber.toString().padStart(3, '0')}`;
};

const seed = async () => {
  // Use a cleaner connection string
  await mongoose.connect(process.env.MONGO_URI || `${process.env.MONGO_URL}/apsara_db`);
  console.log('Connected to DB');

  // CLEANUP: Optional - clear old orders to avoid ID collisions during testing
  await Order.deleteMany({});
  console.log('Cleared old orders');

  const products = await Product.find({ isActive: true }).populate('category').limit(20);
  if (!products.length) {
    console.error('No products found — run the main seed first!');
    process.exit(1);
  }

  const rndProduct = () => products[Math.floor(Math.random() * products.length)];

  const makeItem = (product, variant, qty) => {
    const cat = product.category;
    let unitPrice = product.priceOverride?.[variant] || 
                    (variant === 'single' ? cat.basePrice.regular : (cat.basePrice[variant] ?? cat.basePrice.regular));

    return {
      product: product._id,
      productName: product.name,
      variant,
      isZeroSugar: product.isZeroSugar,
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
    };
  };

  const orderDefs = [
    {
      customer: CUSTOMERS[0],
      items: [makeItem(rndProduct(), 'regular', 2)],
      status: 'delivered',
      delivery: { address: '12, Rose Garden, Mumbai', phone: '9876543210' },
      payment: { method: 'online', status: 'paid', razorpayOrderId: `rzp_${Math.random()}` }, // Give unique IDs
      pricing: { deliveryCharge: 20, discountAmount: 0, codCharge: 0 },
    },
    {
      customer: CUSTOMERS[1],
      items: [makeItem(rndProduct(), 'single', 3)],
      status: 'out_for_delivery',
      delivery: { address: '5B, Sea View, Bandra', phone: '9123456780' },
      payment: { method: 'cod', status: 'pending', razorpayOrderId: null }, // Null works if index is sparse
      pricing: { deliveryCharge: 20, discountAmount: 0, codCharge: 25 },
    }
  ];

  for (const def of orderDefs) {
    const subtotal = def.items.reduce((sum, i) => sum + i.totalPrice, 0);
    const total = subtotal - def.pricing.discountAmount + def.pricing.deliveryCharge + def.pricing.codCharge;

    const orderNum = await getOrderNumber();

    await Order.create({
      orderNumber: orderNum,
      customer: def.customer,
      items: def.items,
      status: def.status,
      delivery: def.delivery,
      pricing: { ...def.pricing, subtotal, total },
      payment: def.payment,
    });
    console.log(`Created ${orderNum} - ₹${total}`);
  }

  console.log(`\nSample orders inserted ✅`);
  process.exit(0);
};

seed().catch(err => {
  console.error('Order seed failed:', err);
  process.exit(1);
});
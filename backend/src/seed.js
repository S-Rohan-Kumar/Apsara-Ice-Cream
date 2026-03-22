import mongoose from 'mongoose';
import Category from './models/category.model.js';
import Product from './models/product.model.js';
import dotenv from 'dotenv';

dotenv.config({
  path: './.env',
});



const seed = async () => {
  await mongoose.connect(`${process.env.MONGO_URL}/apsara_db`);
  console.log('Connected to DB');

  // Clear existing data
  await Category.deleteMany({});
  await Product.deleteMany({});
  console.log('Cleared existing data');

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = await Category.insertMany([
    {
      name     : 'Fruitylicious',
      imageUrl : '',
      basePrice: { small: 90, regular: 135, large: 170, binge: 310 },
      isActive : true,
      sortOrder: 1,
    },
    {
      name     : 'Chocolicious',
      imageUrl : '',
      basePrice: { small: 90, regular: 135, large: 170, binge: 310 },
      isActive : true,
      sortOrder: 2,
    },
    {
      name     : 'Nuttylicious',
      imageUrl : '',
      basePrice: { small: 90, regular: 135, large: 170, binge: 310 },
      isActive : true,
      sortOrder: 3,
    },
    {
      name     : 'Zero Added Sugar',
      imageUrl : '',
      basePrice: { small: 105, regular: 160, large: 200, binge: 350 },
      isActive : true,
      sortOrder: 4,
    },
    {
      name     : 'Kulfis',
      imageUrl : '',
      basePrice: { small: 55, regular: 55, large: 55, binge: 55 },
      isActive : true,
      sortOrder: 5,
    },
    {
      name     : 'Festive Special',
      imageUrl : '',
      basePrice: { small: 90, regular: 135, large: 170, binge: 310 },
      isActive : true,
      sortOrder: 6,
    },
    {
      name     : 'Sorbelicious',
      imageUrl : '',
      basePrice: { small: 90, regular: 135, large: 170, binge: 310 },
      isActive : true,
      sortOrder: 7,
    },
    {
      name     : 'Popsicles',
      imageUrl : '',
      basePrice: { small: 90, regular: 90, large: 90, binge: 90 },
      isActive : true,
      sortOrder: 8,
    },
  ]);

  console.log(`Inserted ${categories.length} categories`);

  // helper to find category id by name
  const cat = (name) => categories.find(c => c.name === name)._id;

  // ── Products ───────────────────────────────────────────────────────────────
  const products = await Product.insertMany([

    // Fruitylicious
    { name: 'Asli Alphonso',     category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 1 },
    { name: 'Blueberry Cheesecake', category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 2 },
    { name: 'Coconut Cravings',  category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 3 },
    { name: 'Guava Glory',       category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 4 },
    { name: 'Scrumptious Sitafal', category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 5 },
    { name: 'Orange Apricot',    category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 6 },
    { name: 'Luscious Lychee',   category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 7 },
    { name: 'Pinaberry Passion', category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 8 },
    { name: 'Strawberry Story',  category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 9 },
    { name: 'Trippy Targola',    category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 10 },
    { name: 'Cheeky Chikoo',     category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 11 },
    { name: 'Jamun Josh',        category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 12 },
    { name: 'Jackfruit Jazz',    category: cat('Fruitylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 13 },

    // Chocolicious
    { name: 'Belgian Bite',      category: cat('Chocolicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 1 },
    { name: 'Brownie Blast',     category: cat('Chocolicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 2 },
    { name: 'Choco Cherry',      category: cat('Chocolicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 3 },
    { name: 'Cookies N Cream',   category: cat('Chocolicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 4 },
    { name: 'Funky Ferrero',     category: cat('Chocolicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 5 },
    { name: 'Mississippi Madness', category: cat('Chocolicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 6 },

    // Nuttylicious
    { name: 'Pan Pasand',        category: cat('Nuttylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 1 },
    { name: 'Falooda Funda',     category: cat('Nuttylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 2 },
    { name: 'Kesar Pistachio',   category: cat('Nuttylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 3 },
    { name: 'Anjeer Andaaz',     category: cat('Nuttylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 4 },
    { name: 'Roasted Almonde',   category: cat('Nuttylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 5 },
    { name: 'Vanilla Vibes',     category: cat('Nuttylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 6 },
    { name: 'Butterscotch Crunch', category: cat('Nuttylicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 7 },

    // Zero Added Sugar
    { name: 'Pinaberry Passion', category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 1 },
    { name: 'Jamun Josh',        category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 2 },
    { name: 'Scrumptious Sitafal', category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 3 },
    { name: 'Guava Glory',       category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 4 },
    { name: 'Asli Alphonso',     category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 5 },
    { name: 'Anjeer Andaaz',     category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 6 },
    { name: 'Belgian Bite',      category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 7 },
    { name: 'Kesar Pistachio',   category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 8 },
    { name: 'Orange Chocolate',  category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 9 },
    { name: 'Strawberry Story',  category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 10 },
    { name: 'Roasted Almonde',   category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 11 },
    { name: 'Vanilla Vibes',     category: cat('Zero Added Sugar'), isZeroSugar: true, isAvailable: true, isActive: true, sortOrder: 12 },

    // Kulfis
    { name: 'Gulkand Kulfi',     category: cat('Kulfis'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 1 },
    { name: 'Raj Bhog Kulfi',    category: cat('Kulfis'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 2 },
    { name: 'Malai Kulfi',       category: cat('Kulfis'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 3 },
    { name: 'Malai Slice',       category: cat('Kulfis'), isZeroSugar: false, isAvailable: true, isActive: true,
      priceOverride: { small: 110, regular: 110, large: 110, binge: 110 },
      sortOrder: 4
    },

    // Festive Special
    { name: 'Crunchy Chikki',    category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 1 },
    { name: 'Red Velvet',        category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 2 },
    { name: 'Thandi Thandai',    category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 3 },
    { name: 'Boondi Modakam',    category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 4 },
    { name: 'Fruit N Nut',       category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 5 },
    { name: 'Shahi Daawat',      category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 6 },
    { name: 'Diwali Delight',    category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 7 },
    { name: 'Royal Rasmalai',    category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 8 },
    { name: 'Mint Marvel',       category: cat('Festive Special'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 9 },

    // Sorbelicious
    { name: 'Berry Bonanza',     category: cat('Sorbelicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 1 },
    { name: 'Pani Puri Patakha', category: cat('Sorbelicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 2 },
    { name: 'Tamarind Twist',    category: cat('Sorbelicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 3 },
    { name: 'Watermelon Wonder', category: cat('Sorbelicious'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 4 },

    // Popsicles
    { name: 'Berry Bahar',       category: cat('Popsicles'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 1 },
    { name: 'Namaste Guava',     category: cat('Popsicles'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 2 },
    { name: 'Desi Citrus',       category: cat('Popsicles'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 3 },
    { name: 'Pinakiwi Masti',    category: cat('Popsicles'), isZeroSugar: false, isAvailable: true, isActive: true, sortOrder: 4 },

  ]);

  console.log(`Inserted ${products.length} products`);
  console.log('Seed complete ✅');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
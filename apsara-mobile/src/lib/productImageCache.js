import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

let memoryCache = {};

export const optimizeCloudinaryUrl = (url, width = 400) => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  if (url.includes('f_auto') || url.includes('q_auto')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
};

export const cacheProducts = (products = []) => {
  if (!Array.isArray(products)) return;
  let updated = false;
  products.forEach((p) => {
    if (p && p.imageUrl) {
      if (p._id) {
        memoryCache[p._id.toString()] = p.imageUrl;
        updated = true;
      }
      if (p.name) {
        memoryCache[p.name.trim().toLowerCase()] = p.imageUrl;
        updated = true;
      }
    }
  });
  if (updated) {
    AsyncStorage.setItem('apsara_product_img_cache', JSON.stringify(memoryCache)).catch(() => {});
  }
};

export const getCachedProductImage = (item) => {
  if (!item) return null;
  if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim() !== '') {
    return item.imageUrl;
  }
  if (item.product?.imageUrl && typeof item.product.imageUrl === 'string' && item.product.imageUrl.trim() !== '') {
    return item.product.imageUrl;
  }

  const id = item.product?._id
    ? item.product._id.toString()
    : item.product && typeof item.product === 'string'
    ? item.product
    : item.productId
    ? item.productId.toString()
    : item._id
    ? item._id.toString()
    : '';

  if (id && memoryCache[id]) {
    return memoryCache[id];
  }

  const nameKey = item.productName
    ? item.productName.trim().toLowerCase()
    : item.name
    ? item.name.trim().toLowerCase()
    : '';

  if (nameKey && memoryCache[nameKey]) {
    return memoryCache[nameKey];
  }

  return null;
};

export const ensureProductImageCache = async () => {
  if (Object.keys(memoryCache).length === 0) {
    try {
      const stored = await AsyncStorage.getItem('apsara_product_img_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        memoryCache = { ...parsed, ...memoryCache };
      }
    } catch (e) {}
  }

  if (Object.keys(memoryCache).length === 0) {
    try {
      const res = await api.get('/products');
      const pData = res.data?.data;
      const list = Array.isArray(pData)
        ? pData
        : Array.isArray(pData?.products)
        ? pData.products
        : [];
      cacheProducts(list);
    } catch (e) {}
  }

  return memoryCache;
};

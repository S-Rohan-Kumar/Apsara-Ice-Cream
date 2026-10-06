import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('apsara_cart', JSON.stringify(items)).catch(() => {});
    }
  }, [items, isLoaded]);

  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem('apsara_cart');
      if (stored) {
        setItems(JSON.parse(stored));
      }
      const storedOrders = await AsyncStorage.getItem('apsara_active_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        setActiveOrders(parsed);
        if (parsed.length > 0) {
          setActiveOrder(parsed[0]);
        }
      } else {
        const storedOrder = await AsyncStorage.getItem('apsara_active_order');
        if (storedOrder) {
          const parsed = JSON.parse(storedOrder);
          setActiveOrder(parsed);
          setActiveOrders([parsed]);
        }
      }
    } catch (e) {
    } finally {
      setIsLoaded(true);
    }
  };

  const saveActiveOrder = (orderData) => {
    setActiveOrder((prev) => {
      if (!orderData && !prev) return null;
      if (
        orderData &&
        prev &&
        prev.orderId === orderData.orderId &&
        prev.status === orderData.status &&
        prev.total === orderData.total &&
        prev.activeCount === orderData.activeCount
      ) {
        return prev;
      }
      if (orderData) {
        AsyncStorage.setItem('apsara_active_order', JSON.stringify(orderData)).catch(() => {});
      } else {
        AsyncStorage.removeItem('apsara_active_order').catch(() => {});
      }
      return orderData;
    });
  };

  const updateActiveOrderStatus = (newStatus) => {
    setActiveOrder((prev) => {
      if (!prev) return null;
      const updated = { ...prev, status: newStatus };
      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        AsyncStorage.removeItem('apsara_active_order').catch(() => {});
      } else {
        AsyncStorage.setItem('apsara_active_order', JSON.stringify(updated)).catch(() => {});
      }
      return updated;
    });
  };

  const clearActiveOrder = () => {
    setActiveOrder(null);
    setActiveOrders([]);
    AsyncStorage.removeItem('apsara_active_order').catch(() => {});
    AsyncStorage.removeItem('apsara_active_orders').catch(() => {});
  };

  const syncActiveOrders = (orderList = []) => {
    if (!Array.isArray(orderList)) {
      clearActiveOrder();
      return;
    }
    const activeList = orderList.filter((o) => {
      const st = o.status || o.orderStatus || 'placed';
      return ['placed', 'preparing', 'out_for_delivery'].includes(st);
    });

    if (activeList.length === 0) {
      clearActiveOrder();
      return;
    }

    const priority = { out_for_delivery: 3, preparing: 2, placed: 1 };
    const sorted = [...activeList].sort((a, b) => {
      const pA = priority[a.status || a.orderStatus] || 0;
      const pB = priority[b.status || b.orderStatus] || 0;
      if (pA !== pB) return pB - pA;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const formattedActive = sorted.map((ord) => ({
      orderId: ord._id,
      orderNumber: ord.orderNumber,
      status: ord.status || ord.orderStatus || 'placed',
      total: ord.pricing?.total ?? ord.totalAmount ?? 0,
      activeCount: sorted.length,
    }));

    setActiveOrders(formattedActive);
    AsyncStorage.setItem('apsara_active_orders', JSON.stringify(formattedActive)).catch(() => {});

    const primary = formattedActive[0];
    saveActiveOrder(primary);
  };

  const getItemQuantity = (productId, variant = 'regular') => {
    const rawId = typeof productId === 'object' && productId !== null
      ? (productId._id?._id || productId._id || productId.id || productId.productId)
      : productId;
    const prodIdStr = rawId ? (typeof rawId === 'object' ? (rawId._id?.toString?.() || rawId.toString?.() || '') : rawId.toString()) : '';
    const v = (variant === 'single' ? 'regular' : variant) || 'regular';
    const key = `${prodIdStr}_${v}`;
    const found = items.find((i) => i.key === key);
    return found ? found.quantity : 0;
  };

  const getProductTotalQuantity = (productId) => {
    const rawId = typeof productId === 'object' && productId !== null
      ? (productId._id?._id || productId._id || productId.id || productId.productId)
      : productId;
    const prodIdStr = rawId ? (typeof rawId === 'object' ? (rawId._id?.toString?.() || rawId.toString?.() || '') : rawId.toString()) : '';
    return items
      .filter((i) => i.productId === prodIdStr)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const addToCart = (product, variant = 'regular', price = 0, quantityToAdd = 1) => {
    const rawId = typeof product === 'object' && product !== null
      ? (product._id?._id || product._id || product.id || product.productId)
      : product;
    const prodIdStr = rawId ? (typeof rawId === 'object' ? (rawId._id?.toString?.() || rawId.toString?.() || '') : rawId.toString()) : '';
    if (!prodIdStr) return;

    const v = (variant === 'single' ? 'regular' : variant) || 'regular';
    const key = `${prodIdStr}_${v}`;
    const rawCatId = product.categoryId || product.category?._id || product.category || (typeof product._id === 'object' ? (product._id.categoryId || product._id.category?._id || product._id.category) : null);
    const catIdStr = rawCatId ? (rawCatId._id ? rawCatId._id.toString() : rawCatId.toString()) : null;
    const catName = product.categoryName || product.category?.name || (typeof product._id === 'object' ? product._id.category?.name : '') || '';
    const imgUrl = product.imageUrl || (typeof product._id === 'object' ? product._id.imageUrl : '') || '';
    const prodName = product.name || (typeof product._id === 'object' ? product._id.name : '') || '';
    const addQty = typeof quantityToAdd === 'number' && quantityToAdd > 0 ? quantityToAdd : 1;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.key === key);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + addQty,
          categoryId: next[existingIndex].categoryId || catIdStr,
          categoryName: next[existingIndex].categoryName || catName,
          imageUrl: next[existingIndex].imageUrl || imgUrl,
          price: price > 0 ? price : next[existingIndex].price,
        };
        return next;
      }
      return [
        ...prev,
        {
          key,
          productId: prodIdStr,
          name: prodName,
          imageUrl: imgUrl,
          variant: v,
          price,
          quantity: addQty,
          isZeroSugar: product.isZeroSugar || false,
          categoryId: catIdStr,
          categoryName: catName,
          appliedOffer: product.appliedOffer || null,
        },
      ];
    });
  };

  const decrementItem = (productId, variant = 'regular') => {
    const rawId = typeof productId === 'object' && productId !== null
      ? (productId._id?._id || productId._id || productId.id || productId.productId)
      : productId;
    const prodIdStr = rawId ? (typeof rawId === 'object' ? (rawId._id?.toString?.() || rawId.toString?.() || '') : rawId.toString()) : '';
    const v = (variant === 'single' ? 'regular' : variant) || 'regular';
    const key = `${prodIdStr}_${v}`;
    setItems((prev) => {
      return prev
        .map((i) => {
          if (i.key === key) {
            return { ...i, quantity: i.quantity - 1 };
          }
          return i;
        })
        .filter((i) => i.quantity > 0);
    });
  };

  const reorderItems = (orderItems = []) => {
    if (!Array.isArray(orderItems) || orderItems.length === 0) return;
    orderItems.forEach((item) => {
      const prod = item.product || {};
      const rawId = typeof prod === 'object' && prod !== null
        ? (prod._id?._id || prod._id || prod.id || prod.productId)
        : (item.product || item.productId);
      const prodIdStr = rawId ? (typeof rawId === 'object' ? (rawId._id?.toString?.() || rawId.toString?.() || '') : rawId.toString()) : '';
      if (!prodIdStr) return;
      const rawCatId = item.categoryId || (typeof prod === 'object' ? (prod.category?._id || prod.category || prod.categoryId) : null);
      const catIdStr = rawCatId ? (rawCatId._id ? rawCatId._id.toString() : rawCatId.toString()) : null;
      const v = (item.variant === 'single' ? 'regular' : item.variant) || 'regular';
      const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 0 ? item.unitPrice : (item.price || 0);
      const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      addToCart(
        {
          _id: prodIdStr,
          name: item.productName || (typeof prod === 'object' ? prod.name : '') || '',
          imageUrl: item.imageUrl || (typeof prod === 'object' ? prod.imageUrl : '') || '',
          categoryId: catIdStr,
          categoryName: item.categoryName || (typeof prod === 'object' ? prod.category?.name : '') || '',
          isZeroSugar: item.isZeroSugar ?? (typeof prod === 'object' ? prod.isZeroSugar : false) ?? false,
        },
        v,
        unitPrice,
        qty
      );
    });
  };

  const syncLivePrices = (liveProductsList) => {
    if (!Array.isArray(liveProductsList) || liveProductsList.length === 0) return;
    setItems((prev) => {
      let changed = false;
      const updated = prev.map((item) => {
        const prod = liveProductsList.find((p) => {
          const rawPId = typeof p._id === 'object' && p._id !== null ? (p._id._id || p._id.id || p._id) : p._id;
          const pId = rawPId ? rawPId.toString() : '';
          return pId === item.productId;
        });
        if (!prod) return item;
        const isSingle = prod.category?.productType === 'single';
        const v = isSingle ? 'regular' : item.variant;
        const basePrice = prod.basePrices?.[v] ?? prod.priceOverride?.[v] ?? prod.category?.basePrice?.[v] ?? prod.resolvedPrices?.[v];
        const newPrice = typeof basePrice === 'number' && basePrice > 0 ? basePrice : item.price;
        const rawCatId = prod.category?._id || prod.category || prod.categoryId;
        const newCatId = rawCatId ? (rawCatId._id ? rawCatId._id.toString() : rawCatId.toString()) : item.categoryId;
        const newCatName = prod.category?.name || item.categoryName || '';
        const newImg = prod.imageUrl || item.imageUrl || '';
        const newName = prod.name || item.name;

        if (
          item.price !== newPrice ||
          item.categoryId !== newCatId ||
          item.name !== newName ||
          item.imageUrl !== newImg ||
          item.categoryName !== newCatName
        ) {
          changed = true;
          return {
            ...item,
            price: newPrice,
            categoryId: newCatId,
            categoryName: newCatName,
            imageUrl: newImg,
            name: newName,
          };
        }
        return item;
      });
      return changed ? updated : prev;
    });
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const removeUnavailableItems = (keys = []) => {
    if (!keys || keys.length === 0) return;
    setItems((prev) => prev.filter((i) => !keys.includes(i.key)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const deliveryFee = subtotal > 599 || subtotal === 0 ? 0 : 20;
  const packagingFee = subtotal > 0 ? 5 : 0;
  const grandTotal = subtotal + deliveryFee + packagingFee;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        deliveryFee,
        packagingFee,
        grandTotal,
        activeOrder,
        activeOrders,
        saveActiveOrder,
        updateActiveOrderStatus,
        clearActiveOrder,
        syncActiveOrders,
        getItemQuantity,
        getProductTotalQuantity,
        addToCart,
        decrementItem,
        reorderItems,
        syncLivePrices,
        removeItem,
        removeUnavailableItems,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

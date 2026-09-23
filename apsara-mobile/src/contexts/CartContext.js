import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
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
    } catch (e) {
    } finally {
      setIsLoaded(true);
    }
  };

  const getItemQuantity = (productId, variant = 'regular') => {
    const key = `${productId}_${variant}`;
    const found = items.find((i) => i.key === key);
    return found ? found.quantity : 0;
  };

  const getProductTotalQuantity = (productId) => {
    return items
      .filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const addToCart = (product, variant = 'regular', price = 0) => {
    const key = `${product._id}_${variant}`;
    const rawCatId = product.categoryId || product.category?._id || product.category || null;
    const catIdStr = rawCatId ? (rawCatId._id ? rawCatId._id.toString() : rawCatId.toString()) : null;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.key === key);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
          categoryId: next[existingIndex].categoryId || catIdStr,
        };
        return next;
      }
      return [
        ...prev,
        {
          key,
          productId: product._id,
          name: product.name,
          imageUrl: product.imageUrl,
          variant,
          price,
          quantity: 1,
          isZeroSugar: product.isZeroSugar || false,
          categoryId: catIdStr,
          categoryName: product.categoryName || product.category?.name || '',
          appliedOffer: product.appliedOffer || null,
        },
      ];
    });
  };

  const decrementItem = (productId, variant = 'regular') => {
    const key = `${productId}_${variant}`;
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

  const removeItem = (key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
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
        getItemQuantity,
        getProductTotalQuantity,
        addToCart,
        decrementItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

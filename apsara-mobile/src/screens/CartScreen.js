import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../theme';
import { useCart } from '../contexts/CartContext';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const TIPS = [10, 20, 30, 50];

const INSTRUCTIONS = [
  { id: '1', icon: 'notifications-off-outline', label: 'Do not ring bell' },
  { id: '2', icon: 'home-outline', label: 'Leave at the door' },
  { id: '3', icon: 'call-outline', label: 'Call before delivery' },
  { id: '4', icon: 'shield-checkmark-outline', label: 'Avoid calling' },
];

export default function CartScreen() {
  const navigation = useNavigation();
  const {
    items,
    itemCount,
    subtotal,
    deliveryFee,
    packagingFee,
    addToCart,
    decrementItem,
    removeItem,
    removeUnavailableItems,
    clearCart,
    saveActiveOrder,
  } = useCart();
  const { address, flatNo, landmark, phone, coords, isLocating, detectLocation, updateLocation } = useLocation();
  const { isAuthenticated } = useAuth();

  const [selectedTip, setSelectedTip] = useState(0);
  const [selectedInstructions, setSelectedInstructions] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOffers, setActiveOffers] = useState([]);
  const [liveProducts, setLiveProducts] = useState(null);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [storeNotice, setStoreNotice] = useState('');

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editFlat, setEditFlat] = useState(flatNo || '');
  const [editStreet, setEditStreet] = useState(address || '');
  const [editLandmark, setEditLandmark] = useState(landmark || '');
  const [editPhone, setEditPhone] = useState(phone || '');

  const checkStoreStatus = useCallback(async () => {
    try {
      const res = await api.get('/admin/store-status');
      if (res.data?.data) {
        setIsStoreOpen(res.data.data.isStoreOpen ?? true);
        if (res.data.data.closedNotice) {
          setStoreNotice(res.data.data.closedNotice);
        }
      }
    } catch (e) {
    }
  }, []);

  const verifyLiveStock = useCallback(async () => {
    try {
      const res = await api.get('/products');
      setLiveProducts(res.data?.data || []);
    } catch (e) {
    }
  }, []);

  useEffect(() => {
    fetchActiveOffers();
    verifyLiveStock();
    checkStoreStatus();
  }, [verifyLiveStock, checkStoreStatus]);

  useFocusEffect(
    useCallback(() => {
      verifyLiveStock();
      checkStoreStatus();
    }, [verifyLiveStock, checkStoreStatus])
  );

  useEffect(() => {
    setEditFlat(flatNo || '');
    setEditStreet(address || '');
    setEditLandmark(landmark || '');
    setEditPhone(phone || '');
  }, [flatNo, address, landmark, phone]);

  const fetchActiveOffers = async () => {
    try {
      const res = await api.get('/offers/active');
      setActiveOffers(res.data?.data || []);
    } catch (e) {}
  };

  const toggleInstruction = (id) => {
    setSelectedInstructions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  let offerDiscount = 0;
  let activeOfferObj = null;
  let offerNudge = null;

  if (activeOffers.length > 0 && items.length > 0) {
    for (const off of activeOffers) {
      const targetCatId = off.category ? (off.category._id || off.category).toString() : null;
      const qualifyingItems = targetCatId
        ? items.filter((it) => (it.categoryId ? it.categoryId.toString() : '') === targetCatId)
        : items;

      const catSubtotal = qualifyingItems.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 0), 0);

      if (catSubtotal > 0) {
        const minReq = off.minOrderAmount || 0;
        if (catSubtotal >= minReq) {
          const disc = Math.round(catSubtotal * (off.discountPercent / 100));
          if (disc > offerDiscount) {
            offerDiscount = disc;
            activeOfferObj = off;
          }
        } else if (!offerNudge) {
          const diff = minReq - catSubtotal;
          const catName = off.category?.name || 'items';
          offerNudge = `Add ₹${diff} more of ${catName} to unlock ${off.discountPercent}% OFF with ${off.title}!`;
        }
      }
    }
  }

  const currentDeliveryFee = paymentMethod === 'cod' ? (subtotal > 599 || subtotal === 0 ? 0 : 20) : 0;
  const currentPackagingFee = packagingFee;
  const finalAmount = Math.max(0, subtotal - offerDiscount) + currentDeliveryFee + currentPackagingFee + selectedTip;

  const getUnavailableStatus = (item) => {
    if (!liveProducts) return null;
    const matched = liveProducts.find((p) => (p._id?.toString?.() || p._id) === (item.productId?.toString?.() || item.productId));
    if (!matched) {
      return 'Item no longer available';
    }
    if (matched.isAvailable === false) {
      return 'Out of stock';
    }
    if (matched.category?.productType === 'icecream') {
      let isVarAvail = true;
      if (Array.isArray(matched.availableVariants)) {
        isVarAvail = matched.availableVariants.includes(item.variant);
      } else if (matched.availableVariants && typeof matched.availableVariants === 'object') {
        isVarAvail = matched.availableVariants[item.variant] !== false;
      } else if (matched.variantAvailability && typeof matched.variantAvailability === 'object') {
        isVarAvail = matched.variantAvailability[item.variant] !== false;
      }
      if (!isVarAvail) {
        return `${item.variant.toUpperCase()} size out of stock`;
      }
    }
    return null;
  };

  const unavailableKeys = liveProducts
    ? items.filter((it) => Boolean(getUnavailableStatus(it))).map((it) => it.key)
    : [];
  const hasUnavailableItems = unavailableKeys.length > 0;

  const handleSaveAddress = async () => {
    if (!editStreet.trim()) {
      Alert.alert('Address Required', 'Please enter your street or area address.');
      return;
    }
    const combined = [editFlat.trim(), editStreet.trim(), editLandmark.trim()].filter(Boolean).join(', ');
    await updateLocation(combined, 'Home', editPhone.trim(), coords, editFlat.trim(), editLandmark.trim());
    setShowAddressModal(false);
  };

  const handleDetectGPS = async () => {
    const loc = await detectLocation();
    if (loc) {
      setEditStreet(address || '');
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    if (!isStoreOpen) {
      Alert.alert('Store Closed', storeNotice || "We're currently closed • Kitchen is resting, reopening soon!");
      return;
    }

    if (hasUnavailableItems) {
      Alert.alert(
        'Out of Stock Items',
        'Some items in your cart are currently out of stock. Please remove them before placing your order.'
      );
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in with your phone number to place an order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (!address || address.trim().length === 0) {
      setShowAddressModal(true);
      return;
    }

    try {
      setIsSubmitting(true);

      const orderItems = items.map((i) => ({
        productId: i.productId,
        variant: i.variant,
        quantity: i.quantity,
      }));

      const confirmRes = await api.post('/orders/confirm', {
        items: orderItems,
        deliveryAddress: address,
        deliveryPhone: phone || editPhone || '+91 0000000000',
        deliveryLocation: coords && coords.lat && coords.lng ? { lat: coords.lat, lng: coords.lng } : null,
        paymentMethod,
      });

      const order = confirmRes.data?.data;
      if (order) {
        saveActiveOrder({
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status || order.orderStatus || 'placed',
          itemsCount: orderItems.length,
          total: order.pricing?.total ?? order.totalAmount ?? 0,
        });
      }
      clearCart();

      navigation.replace('OrderTracking', {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    } catch (err) {
      Alert.alert(
        'Order Failed',
        err.response?.data?.message || err.message || 'Could not place your order. Please try again.'
      );
      verifyLiveStock();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
        <View style={styles.emptyContent}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Explore delicious natural ice creams and add your favorite scoops!</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Main', { screen: 'Home' });
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.browseButtonText}>Browse Flavours</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.addressCard}>
          <View style={styles.addressLeft}>
            <View style={styles.pinIconContainer}>
              <Ionicons name="location" size={18} color={colors.primary} />
            </View>
            <View style={styles.addressTextContainer}>
              <Text style={styles.deliveringToText}>Delivering in 15-20 mins to</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {address || 'Tap "Change" to set delivery location'}
              </Text>
              {phone ? <Text style={styles.phoneText}>📞 {phone}</Text> : null}
              <TouchableOpacity
                onPress={detectLocation}
                disabled={isLocating}
                style={[styles.gpsBadge, coords && styles.gpsBadgeActive]}
              >
                <Ionicons
                  name={coords ? 'navigate-circle' : 'navigate-circle-outline'}
                  size={13}
                  color={coords ? colors.primaryDark : colors.textSecondary}
                />
                <Text style={[styles.gpsBadgeText, coords && styles.gpsBadgeTextActive]}>
                  {isLocating
                    ? 'Locating via GPS...'
                    : coords
                    ? `GPS Pinned (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                    : 'Tap to Pin Current GPS'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowAddressModal(true)} style={styles.changeAddressButton}>
            <Text style={styles.changeAddressText}>Change</Text>
          </TouchableOpacity>
        </View>

        {offerDiscount > 0 && activeOfferObj ? (
          <View style={styles.appliedOfferCard}>
            <Text style={styles.nudgeEmoji}>🎉</Text>
            <Text style={styles.appliedOfferText}>
              '{activeOfferObj.title}' applied! You save ₹{offerDiscount} on this order.
            </Text>
          </View>
        ) : offerNudge ? (
          <View style={styles.nudgeCard}>
            <Text style={styles.nudgeEmoji}>🏷️</Text>
            <Text style={styles.nudgeText}>{offerNudge}</Text>
          </View>
        ) : null}

        <View style={styles.insulationNotice}>
          <Text style={styles.insulationEmoji}>❄️</Text>
          <View style={styles.insulationTextContainer}>
            <Text style={styles.insulationTitle}>Guaranteed Frozen Delivery</Text>
            <Text style={styles.insulationSubtitle}>
              Packed in sub-zero thermal dry-ice insulated bags so your ice cream reaches you in perfect condition.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Items in Cart</Text>

          {hasUnavailableItems && (
            <View style={styles.stockWarningBanner}>
              <View style={styles.stockWarningLeft}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <View style={styles.stockWarningTextCol}>
                  <Text style={styles.stockWarningTitle}>Items Unavailable</Text>
                  <Text style={styles.stockWarningSubtitle}>
                    Some items went out of stock. Remove them to place order.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeUnavailableBtn}
                onPress={() => removeUnavailableItems(unavailableKeys)}
                activeOpacity={0.8}
              >
                <Text style={styles.removeUnavailableBtnText}>Remove All</Text>
              </TouchableOpacity>
            </View>
          )}

          {items.map((item) => {
            const unavailReason = getUnavailableStatus(item);
            const isUnavail = Boolean(unavailReason);

            return (
              <View key={item.key} style={[styles.itemRow, isUnavail && styles.itemRowUnavailable]}>
                <View style={styles.itemLeft}>
                  <Text style={[styles.itemName, isUnavail && styles.dimmedText]}>{item.name}</Text>
                  <Text style={[styles.itemVariant, isUnavail && styles.dimmedText]}>
                    {item.variant.toUpperCase()} • ₹{item.price} each
                  </Text>
                  {isUnavail && (
                    <View style={styles.outOfStockBadge}>
                      <Ionicons name="alert-circle-outline" size={11} color="#DC2626" />
                      <Text style={styles.outOfStockBadgeText}>{unavailReason}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.itemRight}>
                  {isUnavail ? (
                    <TouchableOpacity
                      style={styles.singleRemoveBtn}
                      onPress={() => removeItem(item.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      <Text style={styles.singleRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperButton}
                        onPress={() => decrementItem(item.productId, item.variant)}
                      >
                        <Ionicons name="remove" size={14} color={colors.white} />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepperButton}
                        onPress={() => addToCart({ _id: item.productId, name: item.name, categoryId: item.categoryId, categoryName: item.categoryName, appliedOffer: item.appliedOffer }, item.variant, item.price)}
                      >
                        <Ionicons name="add" size={14} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={[styles.itemTotal, isUnavail && styles.dimmedText]}>₹{item.price * item.quantity}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Delivery Instructions</Text>
          <View style={styles.instructionsRow}>
            {INSTRUCTIONS.map((inst) => {
              const isSelected = selectedInstructions.includes(inst.id);
              return (
                <TouchableOpacity
                  key={inst.id}
                  style={[styles.instructionChip, isSelected && styles.activeInstructionChip]}
                  onPress={() => toggleInstruction(inst.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={inst.icon}
                    size={14}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.instructionText, isSelected && styles.activeInstructionText]}>
                    {inst.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.tipHeaderRow}>
            <Text style={styles.sectionHeading}>Tip Delivery Partner</Text>
            <Text style={styles.tipSubheading}>100% goes to your rider</Text>
          </View>
          <View style={styles.tipsRow}>
            {TIPS.map((tip) => {
              const isSelected = selectedTip === tip;
              return (
                <TouchableOpacity
                  key={tip}
                  style={[styles.tipChip, isSelected && styles.activeTipChip]}
                  onPress={() => setSelectedTip(isSelected ? 0 : tip)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tipText, isSelected && styles.activeTipText]}>
                    ₹{tip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Payment Mode</Text>
          <View style={styles.paymentOptionsColumn}>
            <TouchableOpacity
              style={[styles.paymentMethodCard, paymentMethod === 'cod' && styles.paymentMethodCardActive]}
              onPress={() => setPaymentMethod('cod')}
              activeOpacity={0.8}
            >
              <View style={styles.codLeft}>
                <View style={[styles.codIconWrap, paymentMethod === 'cod' && styles.codIconWrapActive]}>
                  <Ionicons name="cash" size={20} color={paymentMethod === 'cod' ? colors.primaryDark : colors.textSecondary} />
                </View>
                <View style={styles.paymentMethodTextCol}>
                  <View style={styles.paymentMethodTitleRow}>
                    <Text style={[styles.codTitle, paymentMethod === 'cod' && styles.codTitleActive]}>Cash on Delivery (COD)</Text>
                  </View>
                  <Text style={styles.codSub}>Pay cash when order arrives • ₹20 delivery (Free >₹599)</Text>
                </View>
              </View>
              <Ionicons
                name={paymentMethod === 'cod' ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={paymentMethod === 'cod' ? colors.primary : colors.border}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentMethodCard, paymentMethod === 'online' && styles.paymentMethodCardActive]}
              onPress={() => setPaymentMethod('online')}
              activeOpacity={0.8}
            >
              <View style={styles.codLeft}>
                <View style={[styles.codIconWrap, paymentMethod === 'online' && styles.upiIconWrapActive]}>
                  <Ionicons name="qr-code" size={20} color={paymentMethod === 'online' ? '#1D4ED8' : colors.textSecondary} />
                </View>
                <View style={styles.paymentMethodTextCol}>
                  <View style={styles.paymentMethodTitleRow}>
                    <Text style={[styles.codTitle, paymentMethod === 'online' && styles.upiTitleActive]}>UPI / Online Payment</Text>
                    <View style={styles.freeDeliveryBadge}>
                      <Text style={styles.freeDeliveryBadgeText}>FREE DELIVERY</Text>
                    </View>
                  </View>
                  <Text style={styles.codSub}>GPay, PhonePe, Paytm • Zero delivery charge</Text>
                </View>
              </View>
              <Ionicons
                name={paymentMethod === 'online' ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={paymentMethod === 'online' ? colors.primary : colors.border}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.sectionCard, styles.billCard]}>
          <Text style={styles.sectionHeading}>Bill Details</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{subtotal}</Text>
          </View>

          {offerDiscount > 0 && (
            <View style={styles.billRow}>
              <View style={styles.feeInfoRow}>
                <Text style={styles.discountLabel}>
                  🏷️ Offer ({activeOfferObj?.title || 'Applied'})
                </Text>
              </View>
              <Text style={styles.discountValue}>-₹{offerDiscount}</Text>
            </View>
          )}

          <View style={styles.billRow}>
            <View style={styles.feeInfoRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              {currentDeliveryFee === 0 && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              )}
            </View>
            <Text style={[styles.billValue, currentDeliveryFee === 0 && styles.freeValueText]}>
              {currentDeliveryFee === 0 ? '₹0' : `₹${currentDeliveryFee}`}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Insulated Packaging</Text>
            <Text style={styles.billValue}>₹{currentPackagingFee}</Text>
          </View>

          {selectedTip > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Tip</Text>
              <Text style={styles.billValue}>₹{selectedTip}</Text>
            </View>
          )}

          <View style={styles.billDivider} />

          <View style={styles.billRow}>
            <Text style={styles.grandTotalLabel}>To Pay</Text>
            <Text style={styles.grandTotalValue}>₹{finalAmount}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerTotalLabel}>TO PAY</Text>
          <Text style={styles.footerTotalValue}>₹{finalAmount}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            (isSubmitting || hasUnavailableItems || !isStoreOpen) && styles.disabledButton,
            !isStoreOpen && styles.storeClosedButton,
            hasUnavailableItems && styles.unavailablePlaceOrderButton,
          ]}
          onPress={
            !isStoreOpen
              ? () => Alert.alert('Store Closed', storeNotice || "We're currently closed • Kitchen is resting, reopening soon!")
              : (hasUnavailableItems ? () => removeUnavailableItems(unavailableKeys) : handlePlaceOrder)
          }
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : !isStoreOpen ? (
            <>
              <Text style={styles.placeOrderText}>Store Currently Closed</Text>
              <Ionicons name="moon" size={16} color={colors.white} />
            </>
          ) : hasUnavailableItems ? (
            <>
              <Text style={styles.placeOrderText}>Remove Out-of-Stock Items</Text>
              <Ionicons name="trash-outline" size={16} color={colors.white} />
            </>
          ) : (
            <>
              <Text style={styles.placeOrderText}>
                {paymentMethod === 'online' ? 'Pay with UPI' : 'Place Order (COD)'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleDetectGPS}
              disabled={isLocating}
              style={styles.modalGpsButton}
            >
              <Ionicons name="navigate-circle" size={20} color={colors.primaryDark} />
              <Text style={styles.modalGpsText}>
                {isLocating ? 'Detecting Current Location...' : 'Use My Current GPS Location'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>House / Flat / Floor No.</Text>
              <TextInput
                placeholder="e.g. Flat 302, 3rd Floor"
                value={editFlat}
                onChangeText={setEditFlat}
                style={styles.modalInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Area / Street / Colony</Text>
              <TextInput
                placeholder="e.g. Ashok Nagar, Mandya"
                value={editStreet}
                onChangeText={setEditStreet}
                style={styles.modalInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Landmark (Optional)</Text>
              <TextInput
                placeholder="e.g. Near Kalikamba Temple"
                value={editLandmark}
                onChangeText={setEditLandmark}
                style={styles.modalInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Phone Number</Text>
              <TextInput
                placeholder="e.g. +91 9876543210"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                style={styles.modalInput}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveAddress}
              style={styles.saveAddressButton}
              activeOpacity={0.85}
            >
              <Text style={styles.saveAddressText}>Save & Use Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
    padding: spacing.md,
  },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  pinIconContainer: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addressTextContainer: {
    flex: 1,
  },
  deliveringToText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  phoneText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsBadgeActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  gpsBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  gpsBadgeTextActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  changeAddressButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  changeAddressText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  appliedOfferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nudgeEmoji: {
    fontSize: 18,
  },
  nudgeText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: '#065F46',
  },
  appliedOfferText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: '#15803D',
  },
  insulationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  insulationEmoji: {
    fontSize: 24,
  },
  insulationTextContainer: {
    flex: 1,
  },
  insulationTitle: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: '#1E40AF',
  },
  insulationSubtitle: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 1,
    lineHeight: 14,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionHeading: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
  },
  itemVariant: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  stepperButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stepperValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
    paddingHorizontal: 6,
  },
  itemTotal: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  instructionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  instructionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  activeInstructionChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  instructionText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeInstructionText: {
    color: colors.primary,
    fontWeight: '700',
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  tipSubheading: {
    fontSize: 10,
    color: colors.textMuted,
  },
  tipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tipChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  activeTipChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
  },
  activeTipText: {
    color: colors.primary,
    fontWeight: '900',
  },
  paymentOptionsColumn: {
    gap: spacing.sm,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  paymentMethodCardActive: {
    backgroundColor: '#F7FBF9',
    borderColor: colors.primary,
  },
  paymentMethodTextCol: {
    flex: 1,
  },
  paymentMethodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  freeDeliveryBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#86EFAC',
  },
  freeDeliveryBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#15803D',
  },
  codLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  codIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codIconWrapActive: {
    backgroundColor: '#D1FAE5',
  },
  upiIconWrapActive: {
    backgroundColor: '#DBEAFE',
  },
  codTitle: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.text,
  },
  codTitleActive: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  upiTitleActive: {
    color: '#1D4ED8',
    fontWeight: '900',
  },
  codSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  billCard: {
    marginBottom: 40,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  feeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  freeBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  freeBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  billLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  billValue: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
  },
  discountLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: '#059669',
  },
  discountValue: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    color: '#059669',
  },
  freeValueText: {
    color: colors.accent,
    fontWeight: '800',
  },
  billDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  grandTotalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerLeft: {
    justifyContent: 'center',
  },
  footerTotalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  footerTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.primary,
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  storeClosedButton: {
    backgroundColor: '#DC2626',
    shadowColor: '#991B1B',
  },
  placeOrderText: {
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 18,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  browseButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
  },
  modalGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  modalGpsText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '600',
  },
  saveAddressButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  saveAddressText: {
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: colors.white,
  },
  stockWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  stockWarningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  stockWarningTextCol: {
    flex: 1,
  },
  stockWarningTitle: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: '#991B1B',
  },
  stockWarningSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#B91C1C',
    marginTop: 1,
  },
  removeUnavailableBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  removeUnavailableBtnText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  itemRowUnavailable: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    padding: spacing.xs,
    marginHorizontal: -spacing.xs,
  },
  dimmedText: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  outOfStockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  singleRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  singleRemoveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  unavailablePlaceOrderButton: {
    backgroundColor: '#DC2626',
  },
});

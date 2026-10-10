/**
 * Distance & Delivery Fee Calculation
 */

export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

export const calculateDeliveryCharge = ({
  distanceKm,
  basePrice = 30,
  paymentMethod = 'cod',
  subtotal = 0,
  freeDeliveryThreshold = 599,
  maxRadiusKm = 5,
}) => {
  // 1. Strict check: above 5 km cannot place order!
  if (distanceKm != null && distanceKm > maxRadiusKm) {
    return {
      allowed: false,
      reason: 'Delivery address is outside our delivery zone. We cannot accept orders for this location.',
      charge: 0,
      distanceKm,
    };
  }

  // 2. On UPI / Online payment: 100% FREE delivery!
  if (paymentMethod === 'online') {
    return {
      allowed: true,
      charge: 0,
      isFree: true,
      freeReason: 'Free on Online / UPI Payment',
      distanceKm,
    };
  }

  // 3. Free delivery threshold (orders meeting threshold get free delivery)
  if (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold) {
    return {
      allowed: true,
      charge: 0,
      isFree: true,
      freeReason: 'Free Delivery',
      distanceKm,
    };
  }

  // 4. Distance-based tier pricing for COD
  const base = Number(basePrice) || 30;
  let charge = base;

  if (distanceKm == null || distanceKm <= 2) {
    charge = base;
  } else if (distanceKm <= 3) {
    charge = Math.round(base * 1.25); // +25%
  } else if (distanceKm <= 4) {
    charge = Math.round(base * 1.30); // +30%
  } else if (distanceKm <= 5) {
    charge = Math.round(base * 1.35); // +35%
  }

  return {
    allowed: true,
    charge,
    isFree: false,
    distanceKm,
  };
};

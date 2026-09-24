export function getDeliveryBoyMessage(order) {
  if (!order) return '';
  const orderNum = order.orderNumber || `#${order._id?.slice(-4)?.toUpperCase() || ''}`;
  const custName = order.customer?.name || 'Customer';
  const custPhone = order.customer?.phone || order.delivery?.phone || '';
  const phoneText = custPhone ? ` (${custPhone})` : '';
  const address = order.delivery?.address || 'Store Pickup';

  let mapsUrl = order.delivery?.googleMapsUrl || '';
  if (!mapsUrl && order.delivery?.location?.lat && order.delivery?.location?.lng) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${order.delivery.location.lat},${order.delivery.location.lng}`;
  }
  if (!mapsUrl && address && address !== 'Store Pickup') {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  const amount = order.pricing?.total ?? order.totalAmount ?? 0;
  const payType = order.payment?.method === 'cod' ? 'Cash on Delivery' : 'Paid Online';

  return `Apsara Ice Cream Order ${orderNum}
Customer: ${custName}${phoneText}
Address: ${address}
Maps: ${mapsUrl}
Amount: ₹${amount} (${payType})`;
}

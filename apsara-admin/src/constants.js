export const BASE_URL        = import.meta.env.VITE_API_URL;
export const SOCKET_URL      = import.meta.env.VITE_SOCKET_URL;
 
export const CATEGORIES_URL  = '/categories';
export const PRODUCTS_URL    = '/products';
export const ORDERS_URL      = '/orders';
export const OFFERS_URL      = '/offers';
export const AUTH_URL        = '/auth';
export const ADMIN_URL       = '/admin';
 
export const STATUS_LABELS = {
  placed          : 'Order Placed',
  preparing       : 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered       : 'Delivered',
  cancelled       : 'Cancelled',
};
 
export const STATUS_TRANSITIONS = {
  placed          : ['preparing', 'cancelled'],
  preparing       : ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered       : [],
  cancelled       : [],
};
 
export const NAV_LINKS = [
  { label: 'Orders',     path: '/orders'     },
  { label: 'Products',   path: '/products'   },
  { label: 'Categories', path: '/categories' },
  { label: 'Offers',     path: '/offers'     },
  { label: 'Broadcast',  path: '/broadcast'  },
  { label: 'Reports',    path: '/reports'    },
];

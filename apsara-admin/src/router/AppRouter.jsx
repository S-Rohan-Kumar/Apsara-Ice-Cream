import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector }    from 'react-redux';
import { selectUserInfo } from '../slices/authSlice';
import AppLayout          from '../components/layout/AppLayout';
import LoginPage          from '../pages/LoginPage';
import OrdersPage         from '../pages/OrdersPage';
import OrderDetailPage    from '../pages/OrderDetailPage';
import ProductsPage       from '../pages/ProductsPage';
import CategoriesPage     from '../pages/CategoriesPage';
import OffersPage         from '../pages/OffersPage';
import BroadcastPage      from '../pages/BroadcastPage';
import ReportsPage        from '../pages/ReportsPage';
 
function ProtectedRoute() {
  const userInfo = useSelector(selectUserInfo);
  return userInfo ? <Outlet /> : <Navigate to='/login' replace />;
}
 
function PublicRoute() {
  const userInfo = useSelector(selectUserInfo);
  return userInfo ? <Navigate to='/orders' replace /> : <Outlet />;
}
 
export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path='/login' element={<LoginPage />} />
      </Route>
 
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to='/orders' replace />} />
          <Route path='/orders'     element={<OrdersPage />} />
          <Route path='/orders/:id' element={<OrderDetailPage />} />
          <Route path='/products'   element={<ProductsPage />} />
          <Route path='/categories' element={<CategoriesPage />} />
          <Route path='/offers'     element={<OffersPage />} />
          <Route path='/broadcast'  element={<BroadcastPage />} />
          <Route path='/reports'    element={<ReportsPage />} />
        </Route>
      </Route>
 
      <Route path='*' element={<Navigate to='/orders' replace />} />
    </Routes>
  );
}

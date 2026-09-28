import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AccountLayout from '../layouts/AccountLayout';
import { ProtectedRoute, AdminRoute } from './ProtectedRoute';
import { PageLoader } from '../components/Loader';

import HomePage from '../pages/HomePage';
import ShopPage from '../pages/ShopPage';
import ProductDetailsPage from '../pages/ProductDetailsPage';
import CartPage from '../pages/CartPage';

const AboutPage = lazy(() => import('../pages/AboutPage'));
const ProductsPage = lazy(() => import('../pages/ProductsPage'));
const OurFarmPage = lazy(() => import('../pages/OurFarmPage'));
const QualityPage = lazy(() => import('../pages/QualityPage'));
const HowWeProducePage = lazy(() => import('../pages/HowWeProducePage'));
const GalleryPage = lazy(() => import('../pages/GalleryPage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));
const BulkOrdersPage = lazy(() => import('../pages/BulkOrdersPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('../pages/OrderConfirmationPage'));
const PaymentVerifyPage = lazy(() => import('../pages/PaymentVerifyPage'));
const TrackOrderPage = lazy(() => import('../pages/TrackOrderPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const ProfilePage = lazy(() => import('../pages/account/ProfilePage'));
const MyOrdersPage = lazy(() => import('../pages/account/MyOrdersPage'));
const MyOrderDetailsPage = lazy(() => import('../pages/account/MyOrderDetailsPage'));
const AddressesPage = lazy(() => import('../pages/account/AddressesPage'));

const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage'));
const AdminProductFormPage = lazy(() => import('../pages/admin/AdminProductFormPage'));
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage'));
const AdminInventoryPage = lazy(() => import('../pages/admin/AdminInventoryPage'));
const AdminLossesPage = lazy(() => import('../pages/admin/AdminLossesPage'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminOrderDetailsPage = lazy(() => import('../pages/admin/AdminOrderDetailsPage'));
const AdminCustomersPage = lazy(() => import('../pages/admin/AdminCustomersPage'));
const AdminCustomerDetailsPage = lazy(() => import('../pages/admin/AdminCustomerDetailsPage'));
const AdminContentPage = lazy(() => import('../pages/admin/AdminContentPage'));
const AdminGalleryPage = lazy(() => import('../pages/admin/AdminGalleryPage'));
const AdminCertificationsPage = lazy(() => import('../pages/admin/AdminCertificationsPage'));
const AdminBulkOrdersPage = lazy(() => import('../pages/admin/AdminBulkOrdersPage'));
const AdminMessagesPage = lazy(() => import('../pages/admin/AdminMessagesPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:categorySlug" element={<ShopPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="product/:slug" element={<ProductDetailsPage />} />
          <Route path="our-farm" element={<OurFarmPage />} />
          <Route path="quality-and-hygiene" element={<QualityPage />} />
          <Route path="how-we-produce" element={<HowWeProducePage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="bulk-orders" element={<BulkOrdersPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="payment/verify" element={<PaymentVerifyPage />} />
          <Route path="track-order" element={<TrackOrderPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="account" element={<AccountLayout />}>
              <Route index element={<ProfilePage />} />
              <Route path="orders" element={<MyOrdersPage />} />
              <Route path="orders/:id" element={<MyOrderDetailsPage />} />
              <Route path="addresses" element={<AddressesPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route path="admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductFormPage />} />
            <Route path="products/:id/edit" element={<AdminProductFormPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="inventory" element={<AdminInventoryPage />} />
            <Route path="losses" element={<AdminLossesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="customers/:id" element={<AdminCustomerDetailsPage />} />
            <Route path="content" element={<AdminContentPage />} />
            <Route path="gallery" element={<AdminGalleryPage />} />
            <Route path="certifications" element={<AdminCertificationsPage />} />
            <Route path="bulk-orders" element={<AdminBulkOrdersPage />} />
            <Route path="messages" element={<AdminMessagesPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

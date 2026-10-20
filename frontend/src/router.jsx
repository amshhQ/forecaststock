import { createBrowserRouter } from 'react-router'
import Layout from './components/Layout'
import CategoriesPage from './pages/CategoriesPage'
import DashboardPage from './pages/DashboardPage'
import ForecastsPage from './pages/ForecastsPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProductsPage from './pages/ProductsPage'
import RecommendationsPage from './pages/RecommendationsPage'
import RegisterPage from './pages/RegisterPage'
import SalesPage from './pages/SalesPage'
import ScenariosPage from './pages/ScenariosPage'
import SettingsPage from './pages/SettingsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/daftar', element: <RegisterPage /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'produk', element: <ProductsPage /> },
      { path: 'kategori', element: <CategoriesPage /> },
      { path: 'penjualan', element: <SalesPage /> },
      { path: 'prediksi', element: <ForecastsPage /> },
      { path: 'prediksi/:id', lazy: () => import('./pages/ForecastDetailPage').then((m) => ({ Component: m.default })) },
      { path: 'rekomendasi', element: <RecommendationsPage /> },
      { path: 'skenario', element: <ScenariosPage /> },
      { path: 'pengaturan', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

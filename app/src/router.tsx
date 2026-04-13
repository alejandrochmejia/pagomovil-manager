import { createHashRouter } from 'react-router-dom';
import App from './App';
import AuthLayout from '@/pages/auth/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import OnboardingPage from '@/pages/auth/OnboardingPage';
import DashboardPage from '@/pages/DashboardPage/DashboardPage';
import PagosPage from '@/pages/PagosPage/PagosPage';
import ScanPage from '@/pages/ScanPage/ScanPage';
import CuentasPage from '@/pages/CuentasPage/CuentasPage';
import SettingsPage from '@/pages/SettingsPage/SettingsPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'pagos', element: <PagosPage /> },
      { path: 'scan', element: <ScanPage /> },
      { path: 'cuentas', element: <CuentasPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  { path: 'onboarding', element: <OnboardingPage /> },
]);

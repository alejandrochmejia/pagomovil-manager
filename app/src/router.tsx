import { createHashRouter } from 'react-router-dom';
import DashboardPage from '@/pages/DashboardPage/DashboardPage';
import PagosPage from '@/pages/PagosPage/PagosPage';
import ScanPage from '@/pages/ScanPage/ScanPage';
import CuentasPage from '@/pages/CuentasPage/CuentasPage';
import SettingsPage from '@/pages/SettingsPage/SettingsPage';
import App from './App';

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
]);

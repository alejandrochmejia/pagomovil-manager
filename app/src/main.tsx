import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { initFontSize } from '@/hooks/useFontSize';
import { router } from './router';
import './index.css';

initFontSize();

// Evita que el browser/WebView intente "restaurar" el scroll al hacer
// history.pushState / popState (lo hace useBackButtonClose al abrir modales).
// En Capacitor/Android eso resetea el scroll de los contenedores internos.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);

import { Outlet, useLocation } from 'react-router-dom';
import { useRouteIndex } from '@/hooks/useRouteIndex';
import NavBar from '@/components/organisms/NavBar/NavBar';
import PageTransition from '@/components/atoms/PageTransition/PageTransition';
import './App.css';

export default function App() {
  const { pathname } = useLocation();
  const { direction } = useRouteIndex();

  return (
    <div className="app-layout">
      <main className="app-content">
        <PageTransition routeKey={pathname} direction={direction}>
          <Outlet />
        </PageTransition>
      </main>
      <NavBar />
    </div>
  );
}

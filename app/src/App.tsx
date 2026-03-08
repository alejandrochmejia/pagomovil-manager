import { Outlet } from 'react-router-dom';
import NavBar from '@/components/organisms/NavBar/NavBar';
import './App.css';

export default function App() {
  return (
    <div className="app-layout">
      <main className="app-content">
        <Outlet />
      </main>
      <NavBar />
    </div>
  );
}

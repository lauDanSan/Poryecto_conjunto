import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext';
import { AdminSessionProvider } from './context/AdminSessionContext';
import Login from './pages/Login';
import ResidentView from './pages/ResidentView';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <SessionProvider>
      <AdminSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/residente" element={<ResidentView />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/panel" element={<AdminPanel />} />
          </Routes>
        </BrowserRouter>
      </AdminSessionProvider>
    </SessionProvider>
  );
}

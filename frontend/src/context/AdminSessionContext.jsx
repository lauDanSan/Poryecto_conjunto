import { createContext, useContext, useState } from 'react';

const AdminSessionContext = createContext(null);

const STORAGE_KEY = 'registro_danos_admin_sesion';

export function AdminSessionProvider({ children }) {
  const [adminAuth, setAdminAuth] = useState(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  function iniciarSesionAdmin(auth) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    setAdminAuth(auth);
  }

  function cerrarSesionAdmin() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAdminAuth(null);
  }

  return (
    <AdminSessionContext.Provider value={{ adminAuth, iniciarSesionAdmin, cerrarSesionAdmin }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession debe usarse dentro de AdminSessionProvider');
  return ctx;
}

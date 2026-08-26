import { createContext, useContext, useEffect, useState } from 'react';

const SessionContext = createContext(null);

const STORAGE_KEY = 'registro_danos_sesion';

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  function iniciarSesion({ apartamento, nombre }) {
    setSession({ apartamento, nombre });
  }

  function cerrarSesion() {
    setSession(null);
  }

  return (
    <SessionContext.Provider value={{ session, iniciarSesion, cerrarSesion }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { verificarAdmin } from '../lib/api';
import { useAdminSession } from '../context/AdminSessionContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { iniciarSesionAdmin } = useAdminSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await verificarAdmin({ username, password });
      iniciarSesionAdmin({ username, password });
      navigate('/admin/panel');
    } catch (err) {
      setError('Usuario o clave incorrectos.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="pagina-centrada">
      <form className="tarjeta" onSubmit={handleSubmit}>
        <h1>Acceso administrador</h1>
        <label>
          Usuario
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="mensaje-error">{error}</p>}
        <button type="submit" disabled={cargando}>{cargando ? 'Ingresando...' : 'Ingresar'}</button>
        <Link className="enlace-admin" to="/">← Volver al acceso de residente</Link>
      </form>
    </div>
  );
}

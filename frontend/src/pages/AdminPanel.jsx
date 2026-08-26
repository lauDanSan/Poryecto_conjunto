import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { descargarReporteExcel } from '../lib/api';
import { useAdminSession } from '../context/AdminSessionContext';
import ApartmentDetail from '../components/ApartmentDetail';

export default function AdminPanel() {
  const { adminAuth, cerrarSesionAdmin } = useAdminSession();
  const navigate = useNavigate();

  const [apartamentos, setApartamentos] = useState([]);
  const [estados, setEstados] = useState({});
  const [filtroTorre, setFiltroTorre] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  async function cargarDatos() {
    const [{ data: apts }, { data: est }] = await Promise.all([
      supabase.from('apartamentos').select('*').order('torre').order('piso').order('numero_apto'),
      supabase.from('estados').select('apartamento_id, estado_actual'),
    ]);
    setApartamentos(apts ?? []);
    setEstados(Object.fromEntries((est ?? []).map((e) => [e.apartamento_id, e.estado_actual])));
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  if (!adminAuth) return <Navigate to="/admin" replace />;

  const total = apartamentos.length;
  const revisados = apartamentos.filter((a) => estados[a.id] === 'Revisado').length;
  const sinRevisar = total - revisados;

  const torres = useMemo(
    () => [...new Set(apartamentos.map((a) => a.torre))].sort((a, b) => a - b),
    [apartamentos],
  );

  const apartamentosFiltrados = useMemo(() => {
    return apartamentos.filter((a) => {
      if (filtroTorre && a.torre !== Number(filtroTorre)) return false;
      if (busqueda) {
        const texto = `torre ${a.torre} piso ${a.piso} apto ${a.numero_apto}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
  }, [apartamentos, filtroTorre, busqueda]);

  function handleSalir() {
    cerrarSesionAdmin();
    navigate('/admin');
  }

  async function handleDescargarReporte() {
    setError('');
    setDescargando(true);
    try {
      await descargarReporteExcel(adminAuth);
    } catch (err) {
      setError(err.message);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="pagina-ancha">
      <header className="encabezado-vista">
        <h1>Panel de administrador</h1>
        <div className="acciones-encabezado">
          <button onClick={handleDescargarReporte} disabled={descargando}>
            {descargando ? 'Generando...' : 'Descargar reporte Excel'}
          </button>
          <button className="boton-secundario" onClick={handleSalir}>Salir</button>
        </div>
      </header>

      {error && <p className="mensaje-error">{error}</p>}

      <section className="tarjetas-resumen">
        <div className="tarjeta-resumen">
          <span className="numero">{total}</span>
          <span>Total apartamentos</span>
        </div>
        <div className="tarjeta-resumen tarjeta-verde">
          <span className="numero">{revisados}</span>
          <span>Revisados</span>
        </div>
        <div className="tarjeta-resumen tarjeta-ambar">
          <span className="numero">{sinRevisar}</span>
          <span>Sin revisar</span>
        </div>
      </section>

      {!seleccionado && (
        <>
          <section className="controles-filtro">
            <select value={filtroTorre} onChange={(e) => setFiltroTorre(e.target.value)}>
              <option value="">Todas las torres</option>
              {torres.map((t) => (
                <option key={t} value={t}>Torre {t}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Buscar por torre, piso o apto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </section>

          <section className="mapa-torres">
            {apartamentosFiltrados.map((a) => (
              <button
                key={a.id}
                className={`punto-apto ${estados[a.id] === 'Revisado' ? 'punto-verde' : 'punto-ambar'}`}
                onClick={() => setSeleccionado(a)}
                title={`Torre ${a.torre} Piso ${a.piso} Apto ${a.numero_apto}`}
              >
                T{a.torre}-P{a.piso}-{a.numero_apto}
              </button>
            ))}
          </section>
        </>
      )}

      {seleccionado && (
        <div>
          <button className="boton-secundario" onClick={() => { setSeleccionado(null); cargarDatos(); }}>
            ← Volver al listado
          </button>
          <ApartmentDetail
            apartamento={seleccionado}
            autorTipo="admin"
            nombreAutor="Administrador"
            esAdmin
            adminAuth={adminAuth}
          />
        </div>
      )}
    </div>
  );
}

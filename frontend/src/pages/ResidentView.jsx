import { Navigate, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import ApartmentDetail from '../components/ApartmentDetail';

export default function ResidentView() {
  const { session, cerrarSesion } = useSession();
  const navigate = useNavigate();

  if (!session) return <Navigate to="/" replace />;

  function handleSalir() {
    cerrarSesion();
    navigate('/');
  }

  return (
    <div className="pagina-ancha">
      <header className="encabezado-vista">
        <div>
          <h1>Hola, {session.nombre}</h1>
          <p className="subtitulo">
            Torre {session.apartamento.torre} · Piso {session.apartamento.piso} · Apto {session.apartamento.numero_apto}
          </p>
        </div>
        <button className="boton-secundario" onClick={handleSalir}>Salir</button>
      </header>

      <ApartmentDetail
        apartamento={session.apartamento}
        autorTipo="residente"
        nombreAutor={session.nombre}
        esAdmin={false}
      />
    </div>
  );
}

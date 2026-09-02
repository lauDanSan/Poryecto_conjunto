import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { validarApartamento, registrarConsentimiento } from '../lib/api';
import { useSession } from '../context/SessionContext';

export default function Login() {
  const navigate = useNavigate();
  const { iniciarSesion } = useSession();

  const [apartamentos, setApartamentos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [torre, setTorre] = useState('');
  const [piso, setPiso] = useState('');
  const [numeroApto, setNumeroApto] = useState('');
  const [aceptaTratamiento, setAceptaTratamiento] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    async function cargarApartamentos() {
      const { data, error } = await supabase
        .from('apartamentos')
        .select('id, torre, piso, numero_apto, registrado')
        .order('torre')
        .order('piso')
        .order('numero_apto');

      if (error) {
        setError('No se pudo cargar la lista de apartamentos.');
        return;
      }
      setApartamentos(data ?? []);
    }
    cargarApartamentos();
  }, []);

  const torres = useMemo(
    () => [...new Set(apartamentos.map((a) => a.torre))].sort((a, b) => a - b),
    [apartamentos],
  );

  const pisos = useMemo(
    () =>
      [...new Set(apartamentos.filter((a) => a.torre === Number(torre)).map((a) => a.piso))].sort(
        (a, b) => a - b,
      ),
    [apartamentos, torre],
  );

  const aptos = useMemo(
    () =>
      apartamentos
        .filter((a) => a.torre === Number(torre) && a.piso === Number(piso))
        .map((a) => a.numero_apto)
        .sort(),
    [apartamentos, torre, piso],
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!nombre || !torre || !piso || !numeroApto) {
      setError('Completa todos los campos.');
      return;
    }
    if (!aceptaTratamiento) {
      setError('Debes aceptar el tratamiento de datos personales para continuar.');
      return;
    }

    setCargando(true);
    try {
      const resultado = await validarApartamento({
        torre: Number(torre),
        piso: Number(piso),
        numero_apto: numeroApto,
        nombre,
      });

      await registrarConsentimiento({ apartamento_id: resultado.apartamento.id, nombre });

      iniciarSesion({ apartamento: resultado.apartamento, nombre });
      navigate('/residente');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="pagina-centrada">
      <form className="tarjeta" onSubmit={handleSubmit}>
        <h1>Registro de daños del conjunto</h1>
        <p className="subtitulo">Ingresa tus datos para reportar o consultar el estado de tu apartamento</p>

        <label>
          Nombre completo
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre y apellido"
            required
          />
        </label>

        <div className="fila-selects">
          <label>
            Torre
            <select value={torre} onChange={(e) => { setTorre(e.target.value); setPiso(''); setNumeroApto(''); }} required>
              <option value="">Selecciona</option>
              {torres.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label>
            Piso
            <select value={piso} onChange={(e) => { setPiso(e.target.value); setNumeroApto(''); }} required disabled={!torre}>
              <option value="">Selecciona</option>
              {pisos.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label>
            Apartamento
            <select value={numeroApto} onChange={(e) => setNumeroApto(e.target.value)} required disabled={!piso}>
              <option value="">Selecciona</option>
              {aptos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="subtitulo">
          Si tu apartamento ya fue registrado antes, ingresa con el mismo nombre que usaste la primera vez.
        </p>

        <div className="aviso-privacidad">
          <p>
            De conformidad con la <strong>Ley 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013</strong>,
            por medio de los cuales se dictan las disposiciones generales para la proteccion de datos
            personales en Colombia, usted autoriza el tratamiento de sus datos personales (nombre,
            torre, piso y apartamento) suministrados en este formulario.
          </p>
          <p>
            Estos datos seran usados unicamente para fines internos del conjunto residencial,
            especificamente para recopilar informacion sobre los danos causados por el terremoto
            ocurrido el 10 de agosto de 2026, incluyendo evidencias fotograficas, comentarios y el
            seguimiento del estado de revision de cada apartamento. No seran compartidos con terceros
            ajenos a la administracion del conjunto.
          </p>
        </div>

        <label className="fila-checkbox">
          <input
            type="checkbox"
            checked={aceptaTratamiento}
            onChange={(e) => setAceptaTratamiento(e.target.checked)}
            required
          />
          Autorizo el tratamiento de mis datos personales para este registro
        </label>

        {error && <p className="mensaje-error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>

        <Link className="enlace-admin" to="/admin">Acceso administrador</Link>
      </form>
    </div>
  );
}

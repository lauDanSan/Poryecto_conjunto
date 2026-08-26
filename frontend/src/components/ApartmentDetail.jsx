import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { crearComentario, subirEvidencia, fileToBase64, actualizarEstado } from '../lib/api';

const MAX_FOTOS = 5;

export default function ApartmentDetail({ apartamento, autorTipo, nombreAutor, esAdmin, adminAuth }) {
  const [evidencias, setEvidencias] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [estado, setEstado] = useState('Sin revisar');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  async function cargarDatos() {
    const [{ data: ev }, { data: co }, { data: es }] = await Promise.all([
      supabase.from('evidencias').select('*').eq('apartamento_id', apartamento.id).order('fecha_subida'),
      supabase.from('comentarios').select('*').eq('apartamento_id', apartamento.id).order('fecha'),
      supabase.from('estados').select('*').eq('apartamento_id', apartamento.id).maybeSingle(),
    ]);
    setEvidencias(ev ?? []);
    setComentarios(co ?? []);
    setEstado(es?.estado_actual ?? 'Sin revisar');
  }

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartamento.id]);

  async function handleSubirFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('Solo se permiten imagenes jpg o png.');
      e.target.value = '';
      return;
    }

    setSubiendo(true);
    try {
      const archivo_base64 = await fileToBase64(file);
      await subirEvidencia({
        apartamento_id: apartamento.id,
        nombre_quien_subio: nombreAutor,
        archivo_base64,
        mime_type: file.type,
      });
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  }

  async function handleComentar(e) {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setError('');
    try {
      await crearComentario({
        apartamento_id: apartamento.id,
        autor_tipo: autorTipo,
        nombre: nombreAutor,
        texto: nuevoComentario.trim(),
      });
      setNuevoComentario('');
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCambiarEstado(nuevoEstado) {
    setError('');
    try {
      await actualizarEstado({ apartamento_id: apartamento.id, estado_actual: nuevoEstado }, adminAuth);
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="detalle-apartamento">
      <div className="encabezado-detalle">
        <div>
          <h2>Torre {apartamento.torre} · Piso {apartamento.piso} · Apto {apartamento.numero_apto}</h2>
        </div>
        <span className={`insignia ${estado === 'Revisado' ? 'insignia-verde' : 'insignia-ambar'}`}>
          {estado}
        </span>
      </div>

      {esAdmin && (
        <div className="acciones-admin">
          <button onClick={() => handleCambiarEstado('Revisado')} disabled={estado === 'Revisado'}>
            Marcar Revisado
          </button>
          <button onClick={() => handleCambiarEstado('Sin revisar')} disabled={estado === 'Sin revisar'}>
            Marcar Sin revisar
          </button>
        </div>
      )}

      {error && <p className="mensaje-error">{error}</p>}

      <section>
        <h3>Fotos ({evidencias.length}/{MAX_FOTOS})</h3>
        <div className="grilla-fotos">
          {evidencias.map((ev) => (
            <a key={ev.id} href={ev.link_foto_drive} target="_blank" rel="noreferrer" className="foto-item">
              <img src={ev.link_foto_drive} alt="Evidencia de daño" />
            </a>
          ))}
          {evidencias.length < MAX_FOTOS && (
            <label className="foto-item foto-subir">
              {subiendo ? 'Subiendo...' : '+ Agregar foto'}
              <input type="file" accept="image/png, image/jpeg" onChange={handleSubirFoto} hidden disabled={subiendo} />
            </label>
          )}
        </div>
      </section>

      <section>
        <h3>Comentarios</h3>
        <ul className="lista-comentarios">
          {comentarios.map((c) => (
            <li key={c.id}>
              <strong>{c.nombre}</strong>{' '}
              <span className="etiqueta-autor">({c.autor_tipo === 'admin' ? 'Administrador' : 'Residente'})</span>
              <p>{c.texto}</p>
              <small>{new Date(c.fecha).toLocaleString()}</small>
            </li>
          ))}
          {comentarios.length === 0 && <li className="sin-datos">Aun no hay comentarios.</li>}
        </ul>

        <form onSubmit={handleComentar} className="form-comentario">
          <textarea
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            placeholder="Escribe un comentario..."
            required
          />
          <button type="submit">Comentar</button>
        </form>
      </section>
    </div>
  );
}

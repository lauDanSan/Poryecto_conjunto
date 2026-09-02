import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callFunction(name, body, extraHeaders = {}) {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Ocurrio un error inesperado');
  }
  return data;
}

export function validarApartamento({ torre, piso, numero_apto, nombre }) {
  return callFunction('validar-apartamento', { torre, piso, numero_apto, nombre });
}

export function crearComentario({ apartamento_id, autor_tipo, nombre, texto }) {
  return callFunction('crear-comentario', { apartamento_id, autor_tipo, nombre, texto });
}

export function registrarConsentimiento({ apartamento_id, nombre }) {
  return callFunction('registrar-consentimiento', { apartamento_id, nombre });
}

const LOCAL_UPLOAD_URL = import.meta.env.VITE_LOCAL_UPLOAD_URL;

export async function subirEvidencia({ apartamento_id, nombre_quien_subio, archivo_base64, mime_type }) {
  if (LOCAL_UPLOAD_URL) {
    const res = await fetch(`${LOCAL_UPLOAD_URL}/subir-evidencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apartamento_id, nombre_quien_subio, archivo_base64, mime_type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ocurrio un error inesperado');
    return data;
  }

  return callFunction('subir-evidencia', { apartamento_id, nombre_quien_subio, archivo_base64, mime_type });
}

export function verificarAdmin(adminAuth) {
  return callFunction(
    'verificar-admin',
    {},
    { 'x-admin-username': adminAuth.username, 'x-admin-password': adminAuth.password },
  );
}

export function actualizarEstado({ apartamento_id, estado_actual }, adminAuth) {
  return callFunction(
    'actualizar-estado',
    { apartamento_id, estado_actual },
    { 'x-admin-username': adminAuth.username, 'x-admin-password': adminAuth.password },
  );
}

export async function descargarReporteExcel() {
  const [apartamentosRes, evidenciasRes, comentariosRes, consentimientosRes, estadosRes] =
    await Promise.all([
      supabase.from('apartamentos').select('id, torre, piso, numero_apto'),
      supabase.from('evidencias').select('apartamento_id, nombre_quien_subio, fecha_subida'),
      supabase.from('comentarios').select('apartamento_id, nombre, autor_tipo, fecha'),
      supabase.from('consentimientos').select('apartamento_id, nombre, fecha_aceptacion'),
      supabase.from('estados').select('apartamento_id, estado_actual'),
    ]);

  for (const res of [apartamentosRes, evidenciasRes, comentariosRes, consentimientosRes, estadosRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const apartamentosPorId = new Map(apartamentosRes.data.map((a) => [a.id, a]));
  const estadoPorApartamento = new Map(
    estadosRes.data.map((e) => [e.apartamento_id, e.estado_actual]),
  );

  const filas = [];

  for (const e of evidenciasRes.data ?? []) {
    const apto = apartamentosPorId.get(e.apartamento_id);
    if (!apto) continue;
    filas.push({
      Nombre: e.nombre_quien_subio,
      Torre: apto.torre,
      Piso: apto.piso,
      Apartamento: apto.numero_apto,
      Fecha: e.fecha_subida,
      Accion: 'Evidencia subida',
      Estado: estadoPorApartamento.get(e.apartamento_id) ?? 'Sin revisar',
    });
  }

  for (const c of comentariosRes.data ?? []) {
    const apto = apartamentosPorId.get(c.apartamento_id);
    if (!apto) continue;
    filas.push({
      Nombre: c.nombre,
      Torre: apto.torre,
      Piso: apto.piso,
      Apartamento: apto.numero_apto,
      Fecha: c.fecha,
      Accion: `Comentario (${c.autor_tipo})`,
      Estado: estadoPorApartamento.get(c.apartamento_id) ?? 'Sin revisar',
    });
  }

  for (const co of consentimientosRes.data ?? []) {
    const apto = apartamentosPorId.get(co.apartamento_id);
    if (!apto) continue;
    filas.push({
      Nombre: co.nombre,
      Torre: apto.torre,
      Piso: apto.piso,
      Apartamento: apto.numero_apto,
      Fecha: co.fecha_aceptacion,
      Accion: 'Consentimiento aceptado',
      Estado: estadoPorApartamento.get(co.apartamento_id) ?? 'Sin revisar',
    });
  }

  filas.sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
  XLSX.writeFile(libro, 'reporte_registro_danos.xlsx');
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

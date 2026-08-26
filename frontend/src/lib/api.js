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

export function subirEvidencia({ apartamento_id, nombre_quien_subio, archivo_base64, mime_type }) {
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

export async function descargarReporteExcel(adminAuth) {
  const res = await fetch(`${FUNCTIONS_URL}/reporte-excel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      'x-admin-username': adminAuth.username,
      'x-admin-password': adminAuth.password,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'No se pudo generar el reporte' }));
    throw new Error(data.error || 'No se pudo generar el reporte');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte_registro_danos.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

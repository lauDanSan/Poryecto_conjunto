import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'local-uploads');
const PORT = process.env.LOCAL_UPLOAD_PORT || 4000;
const MAX_FOTOS = 5;

const TIPOS_PERMITIDOS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function withCors(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, {});
  }

  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const filePath = path.join(UPLOADS_DIR, decodeURIComponent(req.url.replace('/uploads/', '')));
    try {
      const file = await fs.readFile(filePath);
      res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
      res.end(file);
    } catch {
      res.writeHead(404);
      res.end();
    }
    return;
  }

  if (req.method !== 'POST' || req.url !== '/subir-evidencia') {
    return withCors(res, 404, { error: 'No encontrado' });
  }

  try {
    const raw = await readBody(req);
    const { apartamento_id, nombre_quien_subio, archivo_base64, mime_type } = JSON.parse(raw);

    if (!apartamento_id || !nombre_quien_subio || !archivo_base64 || !mime_type) {
      return withCors(res, 400, {
        error: 'Faltan campos: apartamento_id, nombre_quien_subio, archivo_base64, mime_type',
      });
    }

    const extension = TIPOS_PERMITIDOS[mime_type];
    if (!extension) {
      return withCors(res, 400, { error: 'Tipo de archivo no permitido. Solo jpg o png.' });
    }

    const { data: apartamento, error: apartamentoError } = await supabase
      .from('apartamentos')
      .select('id, torre, piso, numero_apto')
      .eq('id', apartamento_id)
      .maybeSingle();

    if (apartamentoError) return withCors(res, 500, { error: apartamentoError.message });
    if (!apartamento) return withCors(res, 404, { error: 'Apartamento no encontrado' });

    const { count, error: countError } = await supabase
      .from('evidencias')
      .select('id', { count: 'exact', head: true })
      .eq('apartamento_id', apartamento_id);

    if (countError) return withCors(res, 500, { error: countError.message });
    if ((count ?? 0) >= MAX_FOTOS) {
      return withCors(res, 400, { error: `Ya se alcanzo el maximo de ${MAX_FOTOS} fotos para este apartamento` });
    }

    const carpetaRelativa = path.join(
      `Torre_${apartamento.torre}`,
      `Piso_${apartamento.piso}`,
      `Apto_${apartamento.numero_apto}`,
    );
    const carpetaAbsoluta = path.join(UPLOADS_DIR, carpetaRelativa);
    await fs.mkdir(carpetaAbsoluta, { recursive: true });

    const nombreArchivo = `evidencia_${Date.now()}.${extension}`;
    const binario = Buffer.from(archivo_base64, 'base64');
    await fs.writeFile(path.join(carpetaAbsoluta, nombreArchivo), binario);

    const linkLocal = `http://localhost:${PORT}/uploads/${carpetaRelativa.split(path.sep).join('/')}/${nombreArchivo}`;

    const { data: evidencia, error: insertError } = await supabase
      .from('evidencias')
      .insert({ apartamento_id, link_foto_drive: linkLocal, nombre_quien_subio })
      .select()
      .single();

    if (insertError) return withCors(res, 500, { error: insertError.message });

    return withCors(res, 200, { evidencia });
  } catch (err) {
    return withCors(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor local de evidencias escuchando en http://localhost:${PORT}`);
  console.log(`Guardando archivos en: ${UPLOADS_DIR}`);
});

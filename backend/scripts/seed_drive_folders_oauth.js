import 'dotenv/config';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const TORRES = 5;
const PISOS = 12;
const APTOS_POR_PISO = 4;
const ROOT_FOLDER_NAME = 'Registro de danos - Conjunto';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_OAUTH_REFRESH_TOKEN,
} = process.env;

for (const [key, value] of Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_OAUTH_REFRESH_TOKEN,
})) {
  if (!value) {
    console.error(`Falta variable de entorno: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const auth = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
auth.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth });

async function findFolder(name, parentId) {
  const q = parentId
    ? `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents`;

  const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive' });
  return res.data.files?.[0] ?? null;
}

async function getOrCreateFolder(name, parentId) {
  const existing = await findFolder(name, parentId);
  if (existing) return existing.id;

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });
  return res.data.id;
}

async function main() {
  console.log('Creando carpeta raiz con tu cuenta OAuth...');
  const rootFolderId = await getOrCreateFolder(ROOT_FOLDER_NAME, null);
  console.log(`Carpeta raiz: ${rootFolderId}`);

  let actualizados = 0;

  for (let torre = 1; torre <= TORRES; torre++) {
    const torreFolderId = await getOrCreateFolder(`Torre_${torre}`, rootFolderId);

    for (let piso = 1; piso <= PISOS; piso++) {
      const pisoFolderId = await getOrCreateFolder(`Piso_${piso}`, torreFolderId);

      for (let apto = 1; apto <= APTOS_POR_PISO; apto++) {
        const numeroApto = String(apto);
        const aptoFolderId = await getOrCreateFolder(`Apto_${numeroApto}`, pisoFolderId);

        const { error } = await supabase
          .from('apartamentos')
          .update({ carpeta_drive_id: aptoFolderId })
          .eq('torre', torre)
          .eq('piso', piso)
          .eq('numero_apto', numeroApto);

        if (error) throw error;

        actualizados++;
        console.log(`Torre ${torre} / Piso ${piso} / Apto ${numeroApto} -> carpeta ${aptoFolderId}`);
      }
    }
  }

  console.log(`\nListo. Apartamentos actualizados: ${actualizados}`);
  console.log(`\nCarpeta raiz nueva en tu Drive: https://drive.google.com/drive/folders/${rootFolderId}`);
}

main().catch((err) => {
  console.error('Error ejecutando el seed:', err);
  process.exit(1);
});

import 'dotenv/config';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const TORRES = 5;
const PISOS = 12;
const APTOS_POR_PISO = 4;

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  GOOGLE_DRIVE_ROOT_FOLDER_ID,
} = process.env;

for (const [key, value] of Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  GOOGLE_DRIVE_ROOT_FOLDER_ID,
})) {
  if (!value) {
    console.error(`Falta variable de entorno: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const auth = new google.auth.JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function findFolder(name, parentId) {
  const res = await drive.files.list({
    q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  return res.data.files?.[0] ?? null;
}

async function getOrCreateFolder(name, parentId) {
  const existing = await findFolder(name, parentId);
  if (existing) return existing.id;

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return res.data.id;
}

async function getOrCreateApartamento(torre, piso, numeroApto, carpetaDriveId) {
  const { data: existing, error: selectError } = await supabase
    .from('apartamentos')
    .select('id')
    .eq('torre', torre)
    .eq('piso', piso)
    .eq('numero_apto', numeroApto)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: inserted, error: insertError } = await supabase
    .from('apartamentos')
    .insert({ torre, piso, numero_apto: numeroApto, carpeta_drive_id: carpetaDriveId })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return inserted.id;
}

async function main() {
  let creadas = 0;
  let existentes = 0;

  for (let torre = 1; torre <= TORRES; torre++) {
    const torreFolderId = await getOrCreateFolder(`Torre_${torre}`, GOOGLE_DRIVE_ROOT_FOLDER_ID);

    for (let piso = 1; piso <= PISOS; piso++) {
      const pisoFolderId = await getOrCreateFolder(`Piso_${piso}`, torreFolderId);

      for (let apto = 1; apto <= APTOS_POR_PISO; apto++) {
        const numeroApto = String(apto);
        const aptoFolderId = await getOrCreateFolder(`Apto_${numeroApto}`, pisoFolderId);

        const { data: preExisting } = await supabase
          .from('apartamentos')
          .select('id')
          .eq('torre', torre)
          .eq('piso', piso)
          .eq('numero_apto', numeroApto)
          .maybeSingle();

        await getOrCreateApartamento(torre, piso, numeroApto, aptoFolderId);

        if (preExisting) {
          existentes++;
        } else {
          creadas++;
        }

        console.log(`Torre ${torre} / Piso ${piso} / Apto ${numeroApto} -> carpeta ${aptoFolderId}`);
      }
    }
  }

  console.log(`\nListo. Apartamentos nuevos: ${creadas}, ya existentes: ${existentes}, total: ${creadas + existentes}`);
}

main().catch((err) => {
  console.error('Error ejecutando el seed:', err);
  process.exit(1);
});

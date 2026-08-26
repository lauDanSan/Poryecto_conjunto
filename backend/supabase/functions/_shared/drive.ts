import { google } from 'npm:googleapis@144';

export function getDriveClient() {
  const email = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const rawKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

  if (!email || !rawKey) {
    throw new Error('Faltan credenciales de la cuenta de servicio de Google Drive');
  }

  const auth = new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

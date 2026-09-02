import 'dotenv/config';
import http from 'node:http';
import { google } from 'googleapis';

const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } = process.env;

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  console.error('Falta GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET en backend/.env');
  console.error('Copialos del JSON descargado en Google Cloud (client_id y client_secret).');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3457/oauth2callback';
const PORT = 3457;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  REDIRECT_URI,
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\nAbre esta URL en tu navegador (con la cuenta de Google dueña del Drive) y acepta el permiso:\n');
console.log(authUrl);
console.log('\nEsperando la autorizacion...\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>No se recibio el codigo de autorizacion.</h1>');
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Listo, ya puedes cerrar esta pestaña.</h1>');

    console.log('Autorizacion exitosa.\n');
    console.log('Guarda este refresh_token como secret (GOOGLE_OAUTH_REFRESH_TOKEN):\n');
    console.log(tokens.refresh_token);
    console.log('\nSi sale "undefined", revoca el acceso en https://myaccount.google.com/permissions y vuelve a correr este script (a veces Google no reenvia el refresh_token si ya habias autorizado antes).');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>Error obteniendo el token.</h1>');
    console.error('Error:', err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Servidor local esperando el callback en ${REDIRECT_URI}`);
});

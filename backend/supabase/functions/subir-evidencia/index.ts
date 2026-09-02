import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, withCors } from '../_shared/cors.ts';
import { getDriveClient } from '../_shared/drive.ts';
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';

const TIPOS_PERMITIDOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

const MAX_FOTOS = 5;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { apartamento_id, nombre_quien_subio, archivo_base64, mime_type } = await req.json();

    if (!apartamento_id || !nombre_quien_subio || !archivo_base64 || !mime_type) {
      return withCors(
        { error: 'Faltan campos: apartamento_id, nombre_quien_subio, archivo_base64, mime_type' },
        400,
      );
    }

    const extension = TIPOS_PERMITIDOS[mime_type];
    if (!extension) {
      return withCors({ error: 'Tipo de archivo no permitido. Solo jpg o png.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: apartamento, error: apartamentoError } = await supabase
      .from('apartamentos')
      .select('id, carpeta_drive_id')
      .eq('id', apartamento_id)
      .maybeSingle();

    if (apartamentoError) return withCors({ error: apartamentoError.message }, 500);
    if (!apartamento) return withCors({ error: 'Apartamento no encontrado' }, 404);
    if (!apartamento.carpeta_drive_id) {
      return withCors({ error: 'El apartamento no tiene carpeta de Drive asignada' }, 500);
    }

    const { count, error: countError } = await supabase
      .from('evidencias')
      .select('id', { count: 'exact', head: true })
      .eq('apartamento_id', apartamento_id);

    if (countError) return withCors({ error: countError.message }, 500);
    if ((count ?? 0) >= MAX_FOTOS) {
      return withCors({ error: `Ya se alcanzo el maximo de ${MAX_FOTOS} fotos para este apartamento` }, 400);
    }

    const binario = Uint8Array.from(atob(archivo_base64), (c) => c.charCodeAt(0));
    const nombreArchivo = `evidencia_${Date.now()}.${extension}`;

    const drive = getDriveClient();
    const uploadRes = await drive.files.create({
      requestBody: {
        name: nombreArchivo,
        parents: [apartamento.carpeta_drive_id],
      },
      media: {
        mimeType: mime_type,
        body: Readable.from(Buffer.from(binario)),
      },
      fields: 'id',
    });

    const fileId = uploadRes.data.id!;

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const link = `https://drive.google.com/uc?id=${fileId}`;

    const { data: evidencia, error: insertError } = await supabase
      .from('evidencias')
      .insert({
        apartamento_id,
        link_foto_drive: link,
        nombre_quien_subio,
      })
      .select()
      .single();

    if (insertError) return withCors({ error: insertError.message }, 500);

    return withCors({ evidencia });
  } catch (err) {
    return withCors({ error: (err as Error).message }, 400);
  }
});

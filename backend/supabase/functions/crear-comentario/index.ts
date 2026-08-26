import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, withCors } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { apartamento_id, autor_tipo, nombre, texto } = await req.json();

    if (!apartamento_id || !autor_tipo || !nombre || !texto) {
      return withCors({ error: 'Faltan campos: apartamento_id, autor_tipo, nombre, texto' }, 400);
    }

    if (!['residente', 'admin'].includes(autor_tipo)) {
      return withCors({ error: "autor_tipo debe ser 'residente' o 'admin'" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: comentario, error } = await supabase
      .from('comentarios')
      .insert({ apartamento_id, autor_tipo, nombre, texto })
      .select()
      .single();

    if (error) return withCors({ error: error.message }, 500);

    return withCors({ comentario });
  } catch (err) {
    return withCors({ error: (err as Error).message }, 400);
  }
});

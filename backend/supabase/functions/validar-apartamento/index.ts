import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, withCors } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { torre, piso, numero_apto, nombre } = await req.json();

    if (!torre || !piso || !numero_apto || !nombre) {
      return withCors({ error: 'Faltan campos: torre, piso, numero_apto, nombre' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('apartamentos')
      .select('id, torre, piso, numero_apto')
      .eq('torre', torre)
      .eq('piso', piso)
      .eq('numero_apto', String(numero_apto))
      .maybeSingle();

    if (error) return withCors({ error: error.message }, 500);
    if (!data) return withCors({ valido: false }, 404);

    return withCors({ valido: true, apartamento: data, nombre });
  } catch (err) {
    return withCors({ error: (err as Error).message }, 400);
  }
});

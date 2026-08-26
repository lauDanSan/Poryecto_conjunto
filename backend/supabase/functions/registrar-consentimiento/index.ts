import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, withCors } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { apartamento_id, nombre } = await req.json();

    if (!apartamento_id || !nombre) {
      return withCors({ error: 'Faltan campos: apartamento_id, nombre' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: consentimiento, error } = await supabase
      .from('consentimientos')
      .insert({ apartamento_id, nombre })
      .select()
      .single();

    if (error) return withCors({ error: error.message }, 500);

    return withCors({ consentimiento });
  } catch (err) {
    return withCors({ error: (err as Error).message }, 400);
  }
});

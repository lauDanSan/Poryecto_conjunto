import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, withCors } from '../_shared/cors.ts';
import { isAdminAuthenticated } from '../_shared/admin.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!isAdminAuthenticated(req)) {
    return withCors({ error: 'No autorizado' }, 401);
  }

  try {
    const { apartamento_id, estado_actual } = await req.json();

    if (!apartamento_id || !estado_actual) {
      return withCors({ error: 'Faltan campos: apartamento_id, estado_actual' }, 400);
    }

    if (!['Revisado', 'Sin revisar'].includes(estado_actual)) {
      return withCors({ error: "estado_actual debe ser 'Revisado' o 'Sin revisar'" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: estado, error } = await supabase
      .from('estados')
      .upsert(
        { apartamento_id, estado_actual, fecha_actualizacion: new Date().toISOString() },
        { onConflict: 'apartamento_id' },
      )
      .select()
      .single();

    if (error) return withCors({ error: error.message }, 500);

    return withCors({ estado });
  } catch (err) {
    return withCors({ error: (err as Error).message }, 400);
  }
});

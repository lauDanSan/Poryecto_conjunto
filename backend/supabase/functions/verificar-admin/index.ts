import { corsHeaders, withCors } from '../_shared/cors.ts';
import { isAdminAuthenticated } from '../_shared/admin.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!isAdminAuthenticated(req)) {
    return withCors({ autenticado: false }, 401);
  }

  return withCors({ autenticado: true });
});

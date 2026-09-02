import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, withCors } from '../_shared/cors.ts';

function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

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
      .select('id, torre, piso, numero_apto, registrado, registrado_por')
      .eq('torre', torre)
      .eq('piso', piso)
      .eq('numero_apto', String(numero_apto))
      .maybeSingle();

    if (error) return withCors({ error: error.message }, 500);
    if (!data) {
      return withCors(
        { valido: false, error: 'El apartamento indicado no existe. Verifica torre, piso y numero.' },
        404,
      );
    }

    if (data.registrado) {
      const mismoResidente = data.registrado_por && normalizar(data.registrado_por) === normalizar(nombre);

      if (mismoResidente) {
        return withCors({
          valido: true,
          apartamento: { id: data.id, torre: data.torre, piso: data.piso, numero_apto: data.numero_apto },
          nombre,
        });
      }

      return withCors(
        {
          valido: false,
          yaRegistrado: true,
          error: 'Este apartamento ya fue registrado por otra persona. Si eres tu quien lo registro, ingresa con el mismo nombre que usaste la primera vez.',
        },
        409,
      );
    }

    const { data: reclamado, error: claimError } = await supabase
      .from('apartamentos')
      .update({ registrado: true, registrado_por: nombre })
      .eq('id', data.id)
      .eq('registrado', false)
      .select('id, torre, piso, numero_apto')
      .maybeSingle();

    if (claimError) return withCors({ error: claimError.message }, 500);

    if (!reclamado) {
      return withCors(
        { valido: false, yaRegistrado: true, error: 'Este apartamento ya fue registrado y no se puede volver a ingresar.' },
        409,
      );
    }

    return withCors({ valido: true, apartamento: reclamado, nombre });
  } catch (err) {
    return withCors({ error: (err as Error).message }, 400);
  }
});

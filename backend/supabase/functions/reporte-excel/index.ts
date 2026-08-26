import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';
import { corsHeaders } from '../_shared/cors.ts';
import { isAdminAuthenticated } from '../_shared/admin.ts';

type Actividad = {
  nombre: string;
  torre: number;
  piso: number;
  numero_apto: string;
  fecha: string;
  accion: string;
  estado: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!isAdminAuthenticated(req)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const [apartamentosRes, evidenciasRes, comentariosRes, consentimientosRes, estadosRes] =
      await Promise.all([
        supabase.from('apartamentos').select('id, torre, piso, numero_apto'),
        supabase.from('evidencias').select('apartamento_id, nombre_quien_subio, fecha_subida'),
        supabase.from('comentarios').select('apartamento_id, nombre, autor_tipo, fecha'),
        supabase.from('consentimientos').select('apartamento_id, nombre, fecha_aceptacion'),
        supabase.from('estados').select('apartamento_id, estado_actual'),
      ]);

    for (const res of [apartamentosRes, evidenciasRes, comentariosRes, consentimientosRes, estadosRes]) {
      if (res.error) throw new Error(res.error.message);
    }

    const apartamentosPorId = new Map(apartamentosRes.data!.map((a) => [a.id, a]));
    const estadoPorApartamento = new Map(
      estadosRes.data!.map((e) => [e.apartamento_id, e.estado_actual]),
    );

    const filas: Actividad[] = [];

    for (const e of evidenciasRes.data ?? []) {
      const apto = apartamentosPorId.get(e.apartamento_id);
      if (!apto) continue;
      filas.push({
        nombre: e.nombre_quien_subio,
        torre: apto.torre,
        piso: apto.piso,
        numero_apto: apto.numero_apto,
        fecha: e.fecha_subida,
        accion: 'Evidencia subida',
        estado: estadoPorApartamento.get(e.apartamento_id) ?? 'Sin revisar',
      });
    }

    for (const c of comentariosRes.data ?? []) {
      const apto = apartamentosPorId.get(c.apartamento_id);
      if (!apto) continue;
      filas.push({
        nombre: c.nombre,
        torre: apto.torre,
        piso: apto.piso,
        numero_apto: apto.numero_apto,
        fecha: c.fecha,
        accion: `Comentario (${c.autor_tipo})`,
        estado: estadoPorApartamento.get(c.apartamento_id) ?? 'Sin revisar',
      });
    }

    for (const co of consentimientosRes.data ?? []) {
      const apto = apartamentosPorId.get(co.apartamento_id);
      if (!apto) continue;
      filas.push({
        nombre: co.nombre,
        torre: apto.torre,
        piso: apto.piso,
        numero_apto: apto.numero_apto,
        fecha: co.fecha_aceptacion,
        accion: 'Consentimiento aceptado',
        estado: estadoPorApartamento.get(co.apartamento_id) ?? 'Sin revisar',
      });
    }

    filas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const hoja = XLSX.utils.json_to_sheet(
      filas.map((f) => ({
        Nombre: f.nombre,
        Torre: f.torre,
        Piso: f.piso,
        Apartamento: f.numero_apto,
        Fecha: f.fecha,
        Accion: f.accion,
        Estado: f.estado,
      })),
    );

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');

    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte_registro_danos.xlsx"',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

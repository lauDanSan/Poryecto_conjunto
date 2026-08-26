# Plan de construcción — Registro de daños del conjunto

Plan para ejecutar con Claude Code, dividido en fases pequeñas y verificables. Cada fase termina en algo que se puede probar antes de pasar a la siguiente — no avances a la fase N+1 sin haber probado la fase N.

## Fase 0 · Preparación (antes de escribir código)

- [ ] Crear proyecto en Supabase (si no existe) y guardar `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
- [ ] Crear cuenta de servicio de Google Cloud con acceso a Google Drive API y descargar el archivo de credenciales JSON.
- [ ] Crear una carpeta raíz en Google Drive ("Registro de daños - Conjunto") y compartirla con el correo de la cuenta de servicio como Editor.
- [ ] Tener a mano la lista real de torres/pisos/apartamentos (5 torres, 12 pisos, 4 aptos por piso = 240) para precargarla.

**No le des las credenciales reales a Claude Code para que las escriba en el código.** Van en variables de entorno (`.env`, ignorado por git).

---

## Fase 1 · Base de datos en Supabase

Prompt sugerido para Claude Code:

> Crea las migraciones SQL de Supabase para estas tablas: `apartamentos` (torre int, piso int, numero_apto text, carpeta_drive_id text, único por torre+piso+numero_apto), `evidencias` (apartamento_id FK, link_foto_drive text, nombre_quien_subio text, fecha_subida timestamptz default now()), `comentarios` (apartamento_id FK, autor_tipo text check in residente/admin, nombre text, texto text, fecha timestamptz default now()), `estados` (apartamento_id FK único, estado_actual text check in 'Revisado'/'Sin revisar' default 'Sin revisar', fecha_actualizacion timestamptz), `consentimientos` (apartamento_id FK, nombre text, fecha_aceptacion timestamptz default now()). Agrega políticas RLS: lectura pública solo de `apartamentos`; inserción abierta en evidencias/comentarios/consentimientos; nunca permitir UPDATE ni DELETE en evidencias ni comentarios desde el cliente.

**Prueba antes de seguir:** insertar los 240 apartamentos reales (script aparte, no a mano) y confirmar en el dashboard de Supabase que quedaron bien torre/piso/numero_apto.

---

## Fase 2 · Script de carga inicial de apartamentos y carpetas de Drive

Prompt sugerido:

> Escribe un script en Node.js que, para cada una de las 5 torres × 12 pisos × 4 apartamentos, cree una carpeta en Google Drive con la estructura Torre_X/Piso_Y/Apto_Z dentro de la carpeta raíz, usando la API de Drive con la cuenta de servicio, y luego inserte el registro correspondiente en la tabla `apartamentos` de Supabase guardando el `carpeta_drive_id`. Que sea idempotente: si el apartamento ya existe, no lo duplique.

**Prueba antes de seguir:** correr el script, y verificar manualmente en Drive y en Supabase que las 240 carpetas y los 240 registros coinciden.

---

## Fase 3 · Backend (funciones serverless)

Prompt sugerido:

> Crea funciones backend (Supabase Edge Functions en Deno, o Node.js si prefieres) para: (1) validar que un apartamento existe dado torre/piso/numero_apto, (2) subir una foto a la carpeta de Drive del apartamento vía API con la cuenta de servicio y guardar el link en `evidencias`, rechazando si el apartamento ya tiene 5 fotos o si el archivo no es jpg/png, (3) insertar un comentario en `comentarios` con autor_tipo y nombre, (4) actualizar `estados` (solo permitir INSERT/UPDATE de este registro específico, nunca de evidencias/comentarios), (5) registrar consentimiento con fecha, (6) generar y devolver un reporte en Excel con nombre, torre, piso, apto, fecha, acción y estado, solo si el llamado viene autenticado como administrador.

**Prueba antes de seguir:** probar cada función por separado con curl o Postman (no desde el frontend todavía) — subir una foto de prueba, un comentario de prueba, y confirmar que efectivamente no se puede editar ni borrar nada vía API.

---

## Fase 4 · Frontend — pantalla de acceso

Prompt sugerido:

> Construye la pantalla de acceso en [React o HTML/CSS/JS simple, decide cuál usas] con: nombre completo, selects de torre/piso/apartamento poblados desde Supabase, checkbox obligatorio de tratamiento de datos personales, botón Ingresar que valida contra la función del backend y guarda la sesión (torre/piso/apto/nombre) en memoria o localStorage.

Usa como referencia visual el mockup ya definido: fondo claro, acento azul-acero, tarjeta centrada con los campos en el orden nombre → torre/piso/apto → consentimiento → botón.

**Prueba:** entrar con un apartamento real y uno inventado (debe rechazar el inventado).

---

## Fase 5 · Frontend — vista del residente

Prompt sugerido:

> Construye la vista del residente: encabezado con torre/piso/apto y nombre de quien reportó, insignia de estado (Revisado en verde / Sin revisar en ámbar), cuadrícula de hasta 5 fotos con opción de subir si quedan espacios, hilo de comentarios ordenado por fecha mostrando autor (Residente/Administrador) y nombre, campo para agregar comentario nuevo.

**Prueba:** subir 5 fotos y confirmar que la 6ª se bloquea; dejar un comentario y confirmar que aparece con el autor correcto.

---

## Fase 6 · Frontend — panel del administrador

Prompt sugerido:

> Construye el panel del administrador: login simple de administrador (usuario/contraseña compartida, sin registrar individuos), tarjetas resumen (total, revisados, sin revisar), mapa de torres con un punto por apartamento coloreado según estado, buscador/filtro por torre o apartamento, vista de detalle de cada apartamento igual a la del residente pero con opción de marcar Revisado/Sin revisar y agregar nota como Administrador, botón para descargar el reporte en Excel.

**Prueba:** confirmar que el administrador puede ver todos los apartamentos, marcar estados, comentar, y descargar el Excel — pero que ninguna acción permite editar o borrar una evidencia o comentario existente.

---

## Fase 7 · Despliegue

- [ ] Desplegar el frontend en Vercel o Netlify (capa gratuita).
- [ ] Configurar las variables de entorno (Supabase, credenciales de Drive) como secretos del hosting, nunca en el código.
- [ ] Probar el flujo completo de punta a punta con un apartamento real antes de compartir el enlace con todo el conjunto.
- [ ] Preparar el mensaje/aviso para los residentes con el enlace y las instrucciones de uso.

---

## Notas para trabajar con Claude Code

- Pide una fase a la vez. No le pases todo este plan de una — dale el prompt de la fase actual, revisa el resultado, y solo entonces avanza.
- Si Claude Code sugiere agregar `UPDATE`/`DELETE` en evidencias o comentarios "por conveniencia", recházalo — es una regla de negocio explícita, no un olvido.
- Guarda las credenciales reales (Supabase, Google) en un archivo `.env` y confirma que está en `.gitignore` antes del primer commit.

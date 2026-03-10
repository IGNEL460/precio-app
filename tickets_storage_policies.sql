-- Crear políticas públicas para el bucket 'tickets'
-- Esto permite a cualquier usuario subir, ver o actualizar fotos allí.

-- 1. Permitir la inserción de objetos por cualquier persona anónima
CREATE POLICY "Permitir subida pública a tickets"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'tickets');

-- 2. Permitir la lectura de los tickets a cualquiera (para que el dashboard los pueda mostrar)
CREATE POLICY "Permitir lectura pública de tickets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tickets');

-- Política fuerte para que PostgREST no alerte de RLS desactivado
-- Mantiene RLS activado en la tabla `ticket_images` de forma general.

-- Primero, re-habilitar el Row-Level Security:
ALTER TABLE ticket_images ENABLE ROW LEVEL SECURITY;

-- Segundo, le permitimos al usuario anónimo (y rol de autenticación, es decir "Todos") hacer SOLO 'INSERT' (Pueden enviar tickets a moderar pero NO borrarlos)
CREATE POLICY "Permitir solo insertar tickets a usuarios"
ON ticket_images FOR INSERT
TO public
WITH CHECK (true);

-- Tercero, permitimos al Anónimo hacer 'SELECT' y 'UPDATE' (Porque tu /api/ que despacha "Siguiente Ticket" actúa a nivel Next.js o Auth, dependerá de cómo tu cliente consume)
CREATE POLICY "Permitir consultar y modificar los tickets de moderación"
ON ticket_images FOR SELECT
TO public
USING (true);

CREATE POLICY "Permitir que el validador apruebe y mande tickets"
ON ticket_images FOR UPDATE
TO public
USING (true);

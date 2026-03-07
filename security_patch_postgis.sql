-- Security Patch para Tablas de PostGIS 
-- Resuelve advertencia de Supabase Linting "RLS Disabled in Public Entity: public.spatial_ref_sys"

-- Activar RLS en la tabla del sistema de coordenadas PostGIS
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Permitir acceso de solo lectura (SELECT) a usuarios anónimos y autenticados
-- Es necesario porque las funciones espaciales pueden necesitar consultar los sistemas de referencia (SRID)
CREATE POLICY "allow_read_public" 
ON public.spatial_ref_sys 
FOR SELECT 
TO public 
USING (true);

-- Revocar permisos de escritura explícitos por seguridad
REVOKE INSERT, UPDATE, DELETE 
ON TABLE public.spatial_ref_sys 
FROM public, authenticated, anon;

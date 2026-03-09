-- Configuración del Sistema de Gestión de Tickets en Supabase

-- 1. Crear el Bucket de Storage para guardar las imágenes de los tickets si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tickets', 'tickets', true) 
ON CONFLICT DO NOTHING;

-- 2. Crear la tabla de gestión de estado de los tickets
CREATE TABLE IF NOT EXISTS ticket_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    storage_path TEXT NOT NULL,         -- Ruta dentro del bucket 'tickets'
    public_url TEXT NOT NULL,           -- URL pública para mostrar en img src
    status TEXT DEFAULT 'pending_moderation', -- Estados: pending_moderation -> pending_collaboration -> archived
    file_size_bytes BIGINT DEFAULT 0,   -- Para gestionar la cuota de memoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índices para agilizar la obtención de tickets aleatorios 
CREATE INDEX IF NOT EXISTS idx_ticket_images_status ON ticket_images(status);

-- 4. Políticas de Seguridad (Ruta rápida, permisos públicos para insertar desde el cliente y admin para procesar)
-- (Opcional si tienes RLS activado, pero para ambiente de dev es seguro deshabilitarlo temporalmente o permitir anon)
-- ALTER TABLE ticket_images ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public inserts" ON ticket_images FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "Allow public select" ON ticket_images FOR SELECT TO anon USING (true);
-- CREATE POLICY "Allow public update" ON ticket_images FOR UPDATE TO anon USING (true);

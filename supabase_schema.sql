-- Habilitar extensión PostGIS para cálculos geográficos exactos (búsqueda por radio, cercanía)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Tabla de Establecimientos
CREATE TABLE establishments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    -- Tipo POINT(longitude, latitude) de PostGIS
    location geography(POINT),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Productos (Diccionario)
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- Unique para evitar duplicados como "Leche" repetidas veces en el maestro
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla Histórica de Precios (Transaccional)
CREATE TABLE prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) NOT NULL,
    establishment_id UUID REFERENCES establishments(id) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    ticket_date DATE NOT NULL,
    status TEXT DEFAULT 'approved', -- 'pending_revision', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices para mayor velocidad en las búsquedas
CREATE INDEX idx_prices_product ON prices(product_id);
CREATE INDEX idx_establishments_location ON establishments USING GIST (location);

-- Función que permite buscar productos cercanos por texto y radio (en metros)
CREATE OR REPLACE FUNCTION search_nearby_prices(
    search_term TEXT,
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
    price_id UUID,
    product_name TEXT,
    store_name TEXT,
    store_address TEXT,
    price NUMERIC,
    ticket_date DATE,
    distance_meters DOUBLE PRECISION
)
LANGUAGE sql
AS $$
    SELECT 
        pr.id as price_id,
        p.name as product_name,
        e.name as store_name,
        e.address as store_address,
        pr.price,
        pr.ticket_date,
        ST_Distance(e.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) as distance_meters
    FROM prices pr
    JOIN products p ON pr.product_id = p.id
    JOIN establishments e ON pr.establishment_id = e.id
    WHERE 
        pr.status = 'approved'
        AND p.name ILIKE '%' || search_term || '%'
        AND ST_DWithin(e.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters)
    ORDER BY price ASC, distance_meters ASC;
$$;

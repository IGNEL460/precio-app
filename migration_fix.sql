-- 1. Agregar las nuevas columnas fiscales (si no existen)
ALTER TABLE prices ADD COLUMN IF NOT EXISTS cuit TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS pdv TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS ticket_number TEXT;

-- 2. Sistema de Anti-Fraude (Evitar el mismo ítem subido del mismo ticket)
-- No puede haber un producto duplicado en un mismo ticket del mismo proveedor
ALTER TABLE prices
ADD CONSTRAINT unique_ticket_product UNIQUE (establishment_id, cuit, pdv, ticket_number, product_id);

-- 3. Super parche al Buscador PostGIS
-- Obligar a que me traiga solo 1 resultado por comercio, quedándose con el más barato.
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
    WITH RankedPrices AS (
        SELECT 
            pr.id as price_id,
            p.name as product_name,
            e.name as store_name,
            e.address as store_address,
            pr.price,
            pr.ticket_date,
            ST_Distance(e.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) as distance_meters,
            -- Agrupa por establecimiento y le da el #1 al más barato
            ROW_NUMBER() OVER(PARTITION BY e.id ORDER BY pr.price ASC) as rn
        FROM prices pr
        JOIN products p ON pr.product_id = p.id
        JOIN establishments e ON pr.establishment_id = e.id
        WHERE 
            pr.status = 'approved'
            AND p.name ILIKE '%' || search_term || '%'
            AND ST_DWithin(e.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters)
    )
    -- Solo me trae a los campeones #1 por tienda
    SELECT 
        price_id, product_name, store_name, store_address, price, ticket_date, distance_meters
    FROM RankedPrices
    WHERE rn = 1
    ORDER BY price ASC, distance_meters ASC;
$$;

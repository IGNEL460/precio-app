-- REINVENCIÓN: PRECIO APP - ALQUILERES CORRIENTES

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfiles de Usuario (Inquilinos y Propietarios)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('tenant', 'owner', 'admin')) DEFAULT 'tenant',
    is_verified BOOLEAN DEFAULT false,
    max_budget NUMERIC(12, 2) DEFAULT 0, -- Solo para inquilinos
    city_preference TEXT DEFAULT 'Corrientes',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Propiedades en Oferta
CREATE TABLE IF NOT EXISTS listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    province TEXT DEFAULT 'Corrientes',
    city TEXT DEFAULT 'Corrientes',
    has_garage BOOLEAN DEFAULT false,
    status TEXT CHECK (status IN ('active', 'paused', 'expired')) DEFAULT 'active',
    last_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Interés y Chat (Habilita el contacto)
CREATE TABLE IF NOT EXISTS interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'chat_opened')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, listing_id)
);

-- 4. Mensajes del Chat Privado
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    interest_id UUID REFERENCES interests(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. FUNCIÓN DE SIMULACIÓN DE PRECIOS JUSTOS
-- Calcula cuántos matches ganaría el propietario si baja el precio en bloques de %
CREATE OR REPLACE FUNCTION get_price_suggestions(listing_id_param UUID)
RETURNS TABLE (
    discount_percent INT,
    suggested_price NUMERIC,
    potential_matches BIGINT
) LANGUAGE plpgsql AS $$
DECLARE
    original_price NUMERIC;
    current_discount INT := 10;
    current_matches BIGINT;
BEGIN
    -- Obtener el precio original de la propiedad
    SELECT price INTO original_price FROM listings WHERE id = listing_id_param;

    -- Retornamos primero el match actual (0% de descuento)
    RETURN QUERY 
    SELECT 0, original_price, COUNT(*) 
    FROM profiles 
    WHERE role = 'tenant' AND max_budget >= original_price;

    -- Calculamos en bloques hasta llegar a 10 matches o 50% de descuento
    LOOP
        SELECT COUNT(*) INTO current_matches 
        FROM profiles 
        WHERE role = 'tenant' AND max_budget >= (original_price * (1 - current_discount / 100.0));

        RETURN QUERY 
        SELECT current_discount, 
               (original_price * (1 - current_discount / 100.0)),
               current_matches;

        -- Condiciones de salida: más de 10 matches o llegamos al 50%
        IF current_matches >= 10 OR current_discount >= 50 THEN
            EXIT;
        END IF;

        -- Incrementos: 10% inicial, luego de 5% en 5% (15, 20, 25...)
        IF current_discount = 10 THEN
            current_discount := 15;
        ELSE
            current_discount := current_discount + 5;
        END IF;
    END LOOP;
END;
$$;

-- 6. Trigger para crear perfil automáticamente al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'tenant');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Migration to support bot-generated listings and claiming mechanism

ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_bot_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bot_contact_info TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bot_source_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- Asegurar que RLS permita a los usuarios actualizar su propio presupuesto
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Anyone can view active listings"
ON listings FOR SELECT
USING (status = 'active' OR is_bot_generated = true);

-- Optional: Index for faster lookup of unclaimed bot listings
CREATE INDEX IF NOT EXISTS idx_listings_bot_unclaimed ON listings(is_bot_generated) WHERE is_bot_generated = true;

-- Tabla para rastrear notificaciones enviadas y evitar spam
CREATE TABLE IF NOT EXISTS sent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, listing_id) -- Evita enviar el mismo dpto al mismo usuario
);

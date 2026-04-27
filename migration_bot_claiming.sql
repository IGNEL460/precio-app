-- Migration to support bot-generated listings and claiming mechanism

ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_bot_generated BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bot_contact_info TEXT; -- E.g. Instagram handle or phone
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bot_source_url TEXT;   -- Original link if needed
ALTER TABLE listings ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- Optional: Index for faster lookup of unclaimed bot listings
CREATE INDEX IF NOT EXISTS idx_listings_bot_unclaimed ON listings(is_bot_generated) WHERE is_bot_generated = true;

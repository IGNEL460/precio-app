import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export type Product = {
    id: string;
    name: string;
    category: string;
};

export type PriceEntry = {
    id: string;
    product_id: string;
    price: number;
    establishment: string;
    lat: number;
    lng: number;
    created_at: string;
    status: 'pending' | 'approved' | 'rejected';
    image_url?: string;
};

// Trigger Vercel Build

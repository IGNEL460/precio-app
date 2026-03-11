import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function run() {
    console.log("Checking DB Connection...");
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    console.log("Buckets:", buckets?.map(b => b.name), "Error:", bErr?.message);

    const { data: tickets, error: tErr } = await supabase.from('ticket_images').select('*');
    console.log("Tickets count:", tickets?.length, "Error:", tErr?.message);
}

run();

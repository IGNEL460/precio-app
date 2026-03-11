import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log('Buckets:', buckets?.map(b => b.name));

    const { data: files } = await supabase.storage.from('tickets').list();
    console.log('Files in tickets bucket:', files);

    const { data, error } = await supabase.from('ticket_images').select('*');
    console.log('Tickets DB records:', data);
    console.log('DB Error:', error);

    const { data: random, error: rErr } = await supabase.from('ticket_images').select('*').eq('status', 'pending_moderation');
    console.log('Pending Tickets:', random);
}

check();

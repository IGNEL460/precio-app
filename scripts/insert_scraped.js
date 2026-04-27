const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const data = [
  {
    "title": "Alquilo Dpto 1 Dorm",
    "price": 450000,
    "image": "https://http2.mlstatic.com/D_NQ_NP_2X_618690-MLA109552629818_042026-E.webp",
    "link": "https://departamento.mercadolibre.com.ar/MLA-1748743295-alquilo-dpto-1-dorm-_JM"
  },
  {
    "title": "Departamento",
    "price": 250000,
    "image": "https://http2.mlstatic.com/D_NQ_NP_2X_709885-MLA99809335624_122025-E.webp",
    "link": "https://departamento.mercadolibre.com.ar/MLA-3160062024-departamento-_JM"
  }
];

async function insertResults() {
    console.log("📥 Insertando resultados en Supabase...");
    
    for (const item of data) {
        const { data: listing, error } = await supabase
            .from('listings')
            .insert({
                title: item.title,
                description: `Oferta detectada automáticamente en Mercado Libre.`,
                price: item.price,
                city: 'Corrientes',
                is_bot_generated: true,
                bot_source_url: item.link,
                bot_contact_info: 'Ver link original',
                status: 'active',
                owner_id: 'a06be87c-f881-4383-a306-d87ea3b78299'
            })
            .select()
            .single();

        if (error) {
            console.error(`❌ Error insertando ${item.title}:`, error.message);
            continue;
        }

        if (item.image && listing) {
            await supabase.from('listing_images').insert({
                listing_id: listing.id,
                image_url: item.image,
                label: 'Frente (Bot)'
            });
            console.log(`✅ ${item.title} guardado con éxito.`);
        }
    }
}

insertResults();

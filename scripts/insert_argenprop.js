const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const data = [
  {
    "title": "Dpto. Gral Juan F Velazco 1700",
    "price": 600000,
    "link": "https://www.argenprop.com/departamento-en-alquiler-en-corrientes-2-ambientes--19336589",
    "image": "https://www.argenprop.com/static-content/98563391/c998ea87-682a-4845-98d1-02bb75235c74_u_small.jpg",
    "description": "Departamento céntrico de 1 dorm. Cómodo departamento con estar-comedor con cocina integrada, 1 habitación con placar y baño en suite."
  },
  {
    "title": "Dpto. Uruguay 1000",
    "price": 700000,
    "link": "https://www.argenprop.com/departamento-en-alquiler-en-corrientes-2-ambientes--8285776",
    "image": "https://www.argenprop.com/static-content/6775828/fb858705-d512-43d8-8130-481771a3c468_u_small.jpg",
    "description": "Departamento luminoso y céntrico con estar-comedor amplio y cocina integrada, 1 habitación con placard."
  },
  {
    "title": "Loft José Ingenieros 100",
    "price": 350000,
    "link": "https://www.argenprop.com/departamento-en-alquiler-en-corrientes-2-ambientes--19239353",
    "image": "https://www.argenprop.com/static-content/35393291/6d08df8a-4b4e-43e7-9c1d-4a6eece32e37_u_small.jpg",
    "description": "Amplio loft ideal para estudiantes con estar comedor, cocina semi integrada, 1 habitación (entrepiso), baño."
  },
  {
    "title": "Loft José Ingenieros 100 (Unidad 2)",
    "price": 450000,
    "link": "https://www.argenprop.com/departamento-en-alquiler-en-corrientes-2-ambientes--19239365",
    "image": "https://www.argenprop.com/static-content/56393291/ac81cf7e-c054-4735-bedd-3528a2796d87_u_small.jpg",
    "description": "Amplio loft ideal para estudiantes con estar comedor, cocina semi integrada, 1 habitación (entrepiso) muy amplia."
  },
  {
    "title": "Dpto. Junin 2100",
    "price": 700000,
    "link": "https://www.argenprop.com/departamento-en-alquiler-en-corrientes-3-ambientes--7442841",
    "image": "https://www.argenprop.com/static-content/1482447/c6e5bbe2-46f4-42ca-9e30-1fa2df58e7c0_u_small.jpg",
    "description": "Departamento amplio y con muy buen entrada de luz natural cuenta con estar comedor con balcón a la calle, 2 habitaciones."
  }
];

async function insertResults() {
    console.log("📥 Insertando resultados de Argenprop en Supabase...");
    
    for (const item of data) {
        const { data: listing, error } = await supabase
            .from('listings')
            .insert({
                title: item.title,
                description: item.description,
                price: item.price,
                city: 'Corrientes',
                is_bot_generated: true,
                bot_source_url: item.link,
                bot_contact_info: 'Ver en Argenprop',
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

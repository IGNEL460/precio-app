const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno (intentar .env y .env.local)
dotenv.config();
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Error: Debes configurar NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function scrapeMercadoLibre() {
    console.log("🚀 Iniciando scraper de Mercado Libre (Corrientes)...");
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        // URL de búsqueda: Departamentos en Alquiler en Corrientes Capital
        const searchUrl = 'https://inmuebles.mercadolibre.com.ar/departamentos/alquiler/corrientes/corrientes-capital/_NoIndex_True';
        await page.goto(searchUrl, { waitUntil: 'networkidle' });

        console.log("⌛ Extrayendo datos de la página...");

        // Extraer los datos básicos
        const listings = await page.$$eval('.ui-search-result__wrapper', (elements) => {
            return elements.map(el => {
                const title = el.querySelector('.ui-search-item__title')?.innerText;
                const priceText = el.querySelector('.andes-money-amount__fraction')?.innerText;
                const link = el.querySelector('a.ui-search-link')?.href;
                const image = el.querySelector('img.ui-search-result-image__element')?.src || el.querySelector('img.poly-component__picture')?.src;
                
                return {
                    title: title || "Sin título",
                    price: priceText ? parseInt(priceText.replace(/\./g, '')) : 0,
                    link: link || "",
                    image: image || "",
                    city: 'Corrientes'
                };
            });
        });

        console.log(`✅ Se encontraron ${listings.length} ofertas potenciales.`);

        for (const item of listings) {
            if (item.price === 0 || !item.link) continue;

            console.log(`📥 Guardando: ${item.title} - $${item.price}`);

            // 1. Insertar la oferta bot
            const { data: listing, error } = await supabase
                .from('listings')
                .insert({
                    title: item.title,
                    description: `Oferta detectada automáticamente. Para más detalles, visita la publicación original.`,
                    price: item.price,
                    city: item.city,
                    is_bot_generated: true,
                    bot_source_url: item.link,
                    bot_contact_info: 'Ver link original',
                    status: 'active',
                    owner_id: '00000000-0000-0000-0000-000000000000' // ID ficticio o admin
                })
                .select()
                .single();

            if (error) {
                console.error(`❌ Error guardando ${item.title}:`, error.message);
                continue;
            }

            // 2. Si tiene imagen, guardarla en listing_images
            if (item.image && listing) {
                await supabase.from('listing_images').insert({
                    listing_id: listing.id,
                    image_url: item.image,
                    label: 'Frente (Bot)'
                });
            }
        }

        console.log("✨ Proceso finalizado con éxito.");

    } catch (err) {
        console.error("💥 Error durante el scraping:", err);
    } finally {
        await browser.close();
    }
}

scrapeMercadoLibre();

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function scrapeArgenprop() {
    console.log("🚀 Iniciando scraper de Argenprop (Corrientes Capital)...");
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // URL específica para Corrientes Capital para evitar sugerencias de otras provincias
        await page.goto('https://www.argenprop.com/departamento-en-alquiler-en-corrientes-capital', { waitUntil: 'networkidle' });

        console.log("⌛ Analizando listado refinado...");

        const listings = await page.$$eval('.listing__item', (elements) => {
            return elements.map(el => {
                const title = el.querySelector('.card__title--address')?.innerText || el.querySelector('.card__address')?.innerText;
                const priceElement = el.querySelector('.card__price');
                const link = el.querySelector('a')?.href;
                const image = el.querySelector('img')?.src;
                const description = el.querySelector('.card__info')?.innerText || el.querySelector('.card__common-data')?.innerText;

                // Extraer solo el primer número grande (el precio del alquiler)
                // Evitamos concatenar expensas
                let priceText = priceElement?.innerText || "0";
                const matches = priceText.match(/[0-9.]+/g);
                const priceClean = matches ? parseInt(matches[0].replace(/\./g, '')) : 0;

                return {
                    title: title?.trim() || "Departamento en Corrientes",
                    price: priceClean,
                    link: link || "",
                    image: image || "",
                    description: description?.trim() || "Sin descripción adicional."
                };
            });
        });

        console.log(`✅ Encontradas ${listings.length} ofertas potenciales.`);

        for (const item of listings) {
            if (!item.link || item.price === 0) continue;

            // Filtro de seguridad: Solo si el título no parece ser de Buenos Aires
            const isBSAS = /palermo|recoleta|belgrano|caballito|puerto madero|av. cordoba|beruti|aguero/i.test(item.title);
            if (isBSAS) {
                console.log(`🚫 Filtrado por ubicación (BSAS): ${item.title}`);
                continue;
            }

            console.log(`📥 Procesando: ${item.title} - $${item.price}`);

            // Verificar si ya existe para evitar duplicados
            const { data: existing } = await supabase
                .from('listings')
                .select('id')
                .eq('bot_source_url', item.link)
                .maybeSingle();

            if (existing) {
                console.log(`⏩ Saltando (ya existe): ${item.title}`);
                continue;
            }

            // Insertar
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
                    owner_id: 'a06be87c-f881-4383-a306-d87ea3b78299' // Tu ID de usuario para las ofertas bot
                })
                .select()
                .single();

            if (error) {
                console.error(`❌ Error guardando ${item.title}:`, error.message);
                continue;
            }

            if (item.image && listing) {
                await supabase.from('listing_images').insert({
                    listing_id: listing.id,
                    image_url: item.image,
                    label: 'Frente (Bot)'
                });
            }
        }

        console.log("✨ Scraping de Argenprop finalizado.");

    } catch (err) {
        console.error("💥 Error fatal:", err);
    } finally {
        await browser.close();
    }
}

scrapeArgenprop();

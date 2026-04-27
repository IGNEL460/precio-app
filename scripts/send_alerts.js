const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.warn("⚠️ Advertencia: RESEND_API_KEY no configurada. El script no enviará correos reales.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY || 're_placeholder');

async function sendAlerts() {
    console.log("🔔 Iniciando motor de alertas de Precio App...");

    try {
        // 1. Obtener todos los listings activos
        const { data: listings } = await supabase
            .from('listings')
            .select('*')
            .eq('status', 'active');

        // 2. Obtener todos los inquilinos con presupuesto configurado
        const { data: tenants } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'tenant')
            .gt('max_budget', 0);

        console.log(`📊 Analizando ${listings?.length} propiedades contra ${tenants?.length} inquilinos...`);

        for (const listing of listings) {
            for (const tenant of tenants) {
                // Verificar si el precio entra en el presupuesto del inquilino
                if (listing.price <= tenant.max_budget) {
                    
                    // 3. Verificar si ya notificamos a este usuario sobre esta propiedad
                    const { data: alreadySent } = await supabase
                        .from('sent_notifications')
                        .select('id')
                        .eq('profile_id', tenant.id)
                        .eq('listing_id', listing.id)
                        .maybeSingle();

                    if (!alreadySent) {
                        console.log(`🎯 ¡Match! Enviando alerta a ${tenant.full_name || tenant.id} por "${listing.title}" ($${listing.price})`);

                        if (RESEND_API_KEY) {
                            try {
                                await resend.emails.send({
                                    from: 'Precio App <alertas@precioapp.ar>', // Necesitas verificar tu dominio en Resend
                                    to: tenant.email || 'mauro.corrientes@gmail.com', // Placeholder o email real
                                    subject: `🏠 ¡Nueva oferta dentro de tu presupuesto! - ${listing.title}`,
                                    html: `
                                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
                                            <h1 style="color: #4CAF50;">¡Hola ${tenant.full_name || 'Inquilino'}!</h1>
                                            <p>Hemos encontrado una propiedad que se ajusta a tu presupuesto de <strong>$${tenant.max_budget.toLocaleString()}</strong>.</p>
                                            
                                            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                                <h2 style="margin-top: 0;">${listing.title}</h2>
                                                <p style="font-size: 1.5rem; font-weight: bold; color: #333;">$${listing.price.toLocaleString()}</p>
                                                <p>${listing.description}</p>
                                            </div>

                                            <a href="https://precio-app.vercel.app/" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver en Precio App</a>
                                            
                                            <p style="color: #666; font-size: 0.8rem; margin-top: 30px;">
                                                Recibes este correo porque configuraste tu presupuesto en Precio App Corrientes.
                                            </p>
                                        </div>
                                    `
                                });

                                // 4. Registrar que ya enviamos la notificación
                                await supabase.from('sent_notifications').insert({
                                    profile_id: tenant.id,
                                    listing_id: listing.id
                                });
                                
                                console.log(`✅ Alerta enviada con éxito.`);
                            } catch (emailErr) {
                                console.error(`❌ Error enviando email:`, emailErr.message);
                            }
                        } else {
                            console.log("📝 (Modo Simulación) Alerta registrada en la base de datos.");
                            // Registrar igual para no repetir en simulación
                            await supabase.from('sent_notifications').insert({
                                profile_id: tenant.id,
                                listing_id: listing.id
                            });
                        }
                    }
                }
            }
        }

        console.log("✨ Proceso de alertas finalizado.");

    } catch (err) {
        console.error("💥 Error en el motor de alertas:", err);
    }
}

sendAlerts();

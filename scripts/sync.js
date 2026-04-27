const { execSync } = require('child_process');

/**
 * Script de Sincronización Total - Precio App
 * Este script coordina el scraping de todas las fuentes y el envío de alertas.
 */

async function runSync() {
    console.log("=========================================");
    console.log("🔄 INICIANDO SINCRONIZACIÓN TOTAL");
    console.log("=========================================");

    try {
        // 1. Mercado Libre
        console.log("\n📦 PASO 1: Raspando Mercado Libre...");
        try {
            execSync('node scripts/scrape_me_li.js', { stdio: 'inherit' });
        } catch (e) {
            console.warn("⚠️ Error menor en Mercado Libre, continuando...");
        }

        // 2. Argenprop
        console.log("\n📦 PASO 2: Raspando Argenprop...");
        try {
            execSync('node scripts/scrape_argenprop.js', { stdio: 'inherit' });
        } catch (e) {
            console.warn("⚠️ Error menor en Argenprop, continuando...");
        }

        // 3. Motor de Alertas
        console.log("\n🔔 PASO 3: Procesando Alertas Inteligentes...");
        try {
            execSync('node scripts/send_alerts.js', { stdio: 'inherit' });
        } catch (e) {
            console.error("❌ Error procesando alertas:", e.message);
        }

        console.log("\n=========================================");
        console.log("✨ SINCRONIZACIÓN FINALIZADA CON ÉXITO");
        console.log("=========================================");

    } catch (err) {
        console.error("\n💥 Error crítico durante la sincronización:", err.message);
    }
}

runSync();

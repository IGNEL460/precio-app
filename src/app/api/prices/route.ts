import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { establishment, address, cuit, pdv, ticket_number, date, items, lat, lng } = body;

        // 1. Guardar o Recuperar Establishment
        // Pasamos latitud y longitud como un POINT (PostGIS) WKT WGS84
        const locationWKT = `POINT(${lng} ${lat})`;

        // Buscar primero el supermercado si ya existe
        let { data: storeData, error: storeError } = await supabaseAdmin
            .from("establishments")
            .select("id")
            .eq("name", establishment)
            .single();

        let storeId = storeData?.id;

        if (!storeId || storeError) {
            // Si no existe, lo creamos
            const { data: newStore, error: createStoreError } = await supabaseAdmin
                .from("establishments")
                .insert({
                    name: establishment,
                    address: address || "",
                    location: locationWKT,
                })
                .select("id")
                .single();

            if (createStoreError) throw new Error("Error creando Comercio: " + createStoreError.message);
            storeId = newStore.id;
        }

        // 2. Iterar sobre cada ítem y guardar Producto + Precio
        for (const item of items) {
            // Producto (diccionario)
            let { data: productData } = await supabaseAdmin
                .from("products")
                .select("id")
                .eq("name", item.name)
                .single();

            let productId = productData?.id;

            if (!productId) {
                const { data: newProduct, error: createProdError } = await supabaseAdmin
                    .from("products")
                    .insert({ name: item.name, category: "General" })
                    .select("id")
                    .single();
                if (createProdError) throw new Error("Error guardando Producto: " + createProdError.message);
                productId = newProduct.id;
            }

            // Historial de Precios
            const { error: priceError } = await supabaseAdmin
                .from("prices")
                .insert({
                    product_id: productId,
                    establishment_id: storeId,
                    price: parseFloat(item.price),
                    ticket_date: date,
                    cuit: cuit || '0000',
                    pdv: pdv || '0000',
                    ticket_number: ticket_number || '00000000',
                    status: 'approved' // Como lo valida un admin, ya va aprobado
                });

            if (priceError) throw new Error("Error guardando Precio: " + priceError.message);
        }

        return NextResponse.json({ message: "Datos guardados exitosamente", success: true });
    } catch (error: any) {
        console.error("Error validando el ticket en BD:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";
        const lat = parseFloat(searchParams.get("lat") || "-27.4692"); // Default Corrientes
        const lng = parseFloat(searchParams.get("lng") || "-58.8306");
        const radius = parseFloat(searchParams.get("radius") || "5000"); // 5km de radio predeterminado

        if (!q) {
            return NextResponse.json([]);
        }

        // Llamada a la función PostgreSQL (PostGIS) optimizada para GPS
        const { data, error } = await supabaseAdmin.rpc("search_nearby_prices", {
            search_term: q,
            user_lat: lat,
            user_lng: lng,
            radius_meters: radius
        });

        if (error) {
            console.error(error);
            throw new Error("Error consultando precios cercanos.");
        }

        // Agrupación de emergencia en el Frontend (Next.js)
        // Mantenemos solo el registro MÁS RECIENTE por comercio para ese producto.
        const uniqueStorePrices = new Map<string, any>();

        for (const item of (data || [])) {
            const key = item.store_name + "_" + Math.round(item.distance_meters); // Mismo comercio, mismo lugar
            if (!uniqueStorePrices.has(key)) {
                uniqueStorePrices.set(key, item);
            } else {
                // Si ya existe este producto en este comercio, revisamos la fecha
                const existingItem = uniqueStorePrices.get(key);
                const currentItemDate = new Date(item.ticket_date).getTime();
                const existingItemDate = new Date(existingItem.ticket_date).getTime();

                // Nos quedamos siempre con el ticket más reciente
                if (currentItemDate > existingItemDate) {
                    uniqueStorePrices.set(key, item);
                }
                // En caso de que sean del mismo día exacto, priorizamos el más barato para el usuario
                else if (currentItemDate === existingItemDate && item.price < existingItem.price) {
                    uniqueStorePrices.set(key, item);
                }
            }
        }

        const finalResults = Array.from(uniqueStorePrices.values()).sort((a, b) => a.price - b.price);

        return NextResponse.json(finalResults);
    } catch (error: any) {
        console.error("Error en API GET prices:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

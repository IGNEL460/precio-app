import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === "your-gemini-api-key") {
            return NextResponse.json({
                error: "Falta la clave API de Gemini. Por favor, agrégala al archivo .env.local"
            }, { status: 500 });
        }

        let base64Image = "";
        let mimeType = "image/jpeg";

        // Intentar leer como JSON primero, por si mandan la URL (desde el Admin)
        if (req.headers.get("content-type")?.includes("application/json")) {
            const body = await req.json();
            if (body.image_url) {
                const imgRes = await fetch(body.image_url);
                if (!imgRes.ok) throw new Error("No se pudo descargar la imagen para el OCR");
                const arrayBuf = await imgRes.arrayBuffer();
                base64Image = Buffer.from(arrayBuf).toString("base64");
                mimeType = imgRes.headers.get("content-type") || "image/jpeg";
            } else {
                return NextResponse.json({ error: "No se proporcionó image_url" }, { status: 400 });
            }
        } else {
            // Leer como FormData (desde la App móvil si quieren probar directo)
            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file) {
                return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            base64Image = Buffer.from(bytes).toString("base64");
            mimeType = file.type;
        }

        // Inicializar Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Analiza esta imagen de un ticket o factura de compra y extrae la información en formato JSON siguiendo estrictamente este esquema:
{
  "establishment": "Nombre del comercio",
  "address": "Dirección completa del local comercial",
  "cuit": "Número de CUIT del comercio (solo números y guiones)",
  "pdv": "Punto de venta (ej: 0005, revisar cabecera)",
  "ticket_number": "Número de ticket o factura (ej: 00014028)",
  "date": "Fecha en formato YYYY-MM-DD",
  "items": [
    { "name": "Descripción clara del producto sin descuentos aplicados a él", "price": valor_numérico_precio_unitario }
  ]
}

Reglas:
1. Retorna ÚNICAMENTE el código JSON, sin marcas de bloque de código ni texto adicional.
2. Si no ves algún dato, usa null o una lista vacía.
3. Asegúrate de que los precios sean números, no strings. 
4. Ignora totales, subtotales, impuestos, descuentos globales, o vueltos. Solo incluye los productos reales comprados.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            }
        ]);

        const responseText = result.response.text().trim();

        // Limpiar posibles bloques de código markdown si la IA los incluye
        const cleanJson = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');

        try {
            const parsedData = JSON.parse(cleanJson);
            return NextResponse.json(parsedData);
        } catch (e) {
            console.error("Error al parsear JSON de Gemini:", cleanJson);
            return NextResponse.json({
                error: "La IA no devolvió un JSON válido",
                raw: responseText
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Error en el proceso OCR con Gemini:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

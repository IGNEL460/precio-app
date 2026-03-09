import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Subir a Supabase Storage (Bucket "tickets")
        const { data: storageData, error: storageError } = await supabase.storage
            .from('tickets')
            .upload(fileName, file, {
                contentType: file.type || 'image/jpeg',
                upsert: false
            });

        if (storageError) {
            throw new Error("Error subiendo imagen a Storage: " + storageError.message);
        }

        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage.from('tickets').getPublicUrl(fileName);
        const publicUrl = publicUrlData.publicUrl;

        // Guardar en la base de datos el estado "pending_moderation"
        const { error: dbError } = await supabase
            .from('ticket_images')
            .insert({
                storage_path: fileName,
                public_url: publicUrl,
                status: 'pending_moderation',
                file_size_bytes: file.size
            });

        if (dbError) {
            throw new Error("Error registrando el ticket en la BD: " + dbError.message);
        }

        return NextResponse.json({ success: true, message: "Ticket recibido exitosamente", url: publicUrl });
    } catch (e: any) {
        console.error("Upload Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

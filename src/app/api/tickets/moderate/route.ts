import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ticket_id, action } = body;

        if (!ticket_id) {
            return NextResponse.json({ error: "Falta ticket_id" }, { status: 400 });
        }

        // Action puede ser 'approve' (va a pending_collaboration) o 'reject' (va a archived directo o borrado)
        const newStatus = action === 'reject' ? 'archived' : 'pending_collaboration';

        const { error: updateError } = await supabase
            .from('ticket_images')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', ticket_id);

        if (updateError) {
            throw new Error(updateError.message);
        }

        // Disparamos la limpieza asíncrona ("límite de memoria") sin bloquear la respuesta
        cleanupOldTickets().catch(err => console.error("Error en cleanup:", err));

        return NextResponse.json({ success: true, newStatus });

    } catch (e: any) {
        console.error("Moderate Ticket Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// Función que mantiene la "cuota de memoria" manejando la carpeta "final" (archived)
async function cleanupOldTickets() {
    // Ejemplo de límite: No permitir más de 1000 tickets archivados o 500MB
    // Este script sencillo simplemente borrará los tickets 'archived' si superan un número (ej. 500)
    const MAX_ARCHIVED = 500;

    const { count } = await supabase
        .from('ticket_images')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'archived');

    if (count && count > MAX_ARCHIVED) {
        const toDeleteCount = count - MAX_ARCHIVED;

        // Obtener los IDs y paths de los más antiguos para borrar
        const { data: oldestTickets } = await supabase
            .from('ticket_images')
            .select('id, storage_path')
            .eq('status', 'archived')
            .order('created_at', { ascending: true })
            .limit(toDeleteCount);

        if (oldestTickets && oldestTickets.length > 0) {
            const idsToDelete = oldestTickets.map(t => t.id);
            const pathsToDelete = oldestTickets.map(t => t.storage_path);

            // Borrar de Storage
            await supabase.storage.from('tickets').remove(pathsToDelete);

            // Borrar de BD
            await supabase.from('ticket_images').delete().in('id', idsToDelete);

            console.log(`Cleaned up ${oldestTickets.length} old archived tickets.`);
        }
    }
}

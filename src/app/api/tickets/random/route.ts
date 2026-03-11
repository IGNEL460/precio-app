import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Evita que Next.js cachee esta ruta para que siempre traiga un ticket aleatorio nuevo
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Traer un ticket que esté esperando moderación de forma aleatoria (PostgreSQL)
        const { data, error } = await supabase
            .from('ticket_images')
            .select('*')
            .eq('status', 'pending_moderation')
            // Alternativa: traer los 50 más antiguos y elegir 1 aleatorio en JS
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) {
            throw new Error(error.message);
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ message: "No hay tickets pendientes", ticket: null });
        }

        // Elegir uno aleatoriamente de los más antiguos (Top 20)
        const randomTicket = data[Math.floor(Math.random() * data.length)];

        return NextResponse.json({ ticket: randomTicket });
    } catch (e: any) {
        console.error("Get Random Ticket Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

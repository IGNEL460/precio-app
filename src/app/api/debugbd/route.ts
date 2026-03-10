import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { data: est, error: eError } = await supabase.from('establishments').select('*').limit(1);
        const { data: prod, error: pError } = await supabase.from('products').select('*').limit(1);
        const { data: prices, error: prError } = await supabase.from('prices').select('*').limit(1);
        const { data: tickets, error: tError } = await supabase.from('ticket_images').select('*').limit(10);

        return NextResponse.json({
            establishments: est,
            products: prod,
            prices: prices,
            tickets: tickets,
            errors: { eError, pError, prError, tError }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

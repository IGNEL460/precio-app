import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
    try {
        const { data: est, error: eError } = await supabase.from('establishments').select('*');
        const { data: prod, error: pError } = await supabase.from('products').select('*');
        const { data: prices, error: prError } = await supabase.from('prices').select('*');

        return NextResponse.json({
            establishments: est,
            products: prod,
            prices: prices,
            errors: { eError, pError, prError }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

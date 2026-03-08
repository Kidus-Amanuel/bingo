import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Attempt to fetch something simple, like the list of tables or a single row from a generic table
        // If you have a specific table like 'profiles', you can try that.
        // For a generic test, we can just check if the client is initialized and maybe run a simple query.
        const { data, error } = await supabase.from('profiles').select('*').limit(1);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

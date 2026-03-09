import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 🎱 Scalable Game Loop (Edge Function)
 * Note: Scheduled via Vercel Cron or webhook
 * Tick length: Invoked every 3 seconds while game is in `playing` status.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role for admin bypass
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { room_id } = await req.json();

    // 1. Fetch room status
    const { data: room, error: roomErr } = await supabase
      .from("rooms_engine")
      .select("*")
      .eq("id", room_id)
      .single();

    if (roomErr || !room)
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.status !== "playing")
      return NextResponse.json({ message: "Not playing" });

    // 2. Fetch existing called numbers for the room
    const { data: calledNumbers, error: callErr } = await supabase
      .from("called_numbers")
      .select("number")
      .eq("room_id", room_id);

    const calledArray = calledNumbers?.map((n) => n.number) || [];

    // 3. Number Calling Engine Logic: Pick a random, unique number (1 to 75)
    let nextNumber = 0;
    while (nextNumber === 0 || calledArray.includes(nextNumber)) {
      if (calledArray.length >= 75) {
        return NextResponse.json({ message: "All numbers called." });
      }
      nextNumber = Math.floor(Math.random() * 75) + 1;
    }

    // 4. Save and Broadcast Instantly
    // (Inserting triggers Supabase Realtime broadcast to clients)
    const { error: insertErr } = await supabase
      .from("called_numbers")
      .insert({ room_id, number: nextNumber });

    if (insertErr) throw insertErr;

    // Trigger next call natively if using background tasks, or relying on external chron/loop
    return NextResponse.json({ success: true, number: nextNumber });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

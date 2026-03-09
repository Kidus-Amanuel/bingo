import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 🎱 Server-side Bingo Verification
 * Prevents cheating by ensuring the server recalculates the pattern.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WINNING_PATTERNS = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

export async function POST(req: NextRequest) {
  try {
    const { room_id, card_id, user_id } = await req.json();

    // 1. Fetch exactly the unalterable card from backend DB
    const { data: card, error: cardErr } = await supabase
      .from('room_cards')
      .select('card_numbers')
      .eq('id', card_id)
      .eq('room_id', room_id)
      .eq('user_id', user_id)
      .single();

    if (cardErr || !card) return NextResponse.json({ error: "Invalid Card" }, { status: 400 });

    // 2. Fetch all valid called numbers securely from Server
    const { data: called, error: callErr } = await supabase
      .from('called_numbers')
      .select('number')
      .eq('room_id', room_id);

    const calledNumbersSet = new Set(called?.map((c) => c.number) || []);
    const playerNumbers = card.card_numbers;

    // 3. Independent Verify Setup (Index 12 is Free Space)
    const isBingo = WINNING_PATTERNS.some(pattern => {
      return pattern.every(index => {
        if (index === 12) return true; // Free Space always marked
        return calledNumbersSet.has(playerNumbers[index]);
      });
    });

    if (!isBingo) {
      return NextResponse.json({ error: "False BINGO. Server verification failed." }, { status: 403 });
    }

    // 4. Verification Successful -> Lock and Distribute Rewards 
    // Uses PostgreSQL atomic operations mapping
    const payoutPayload = { p_room_id: room_id, p_user_id: user_id, p_card_id: card_id };
    
    // We would use an RPC call similar to buy_card_atomic but for win logic
    const { data: payoutRes, error: payoutErr } = await supabase.rpc('process_bingo_win', payoutPayload);

    if (payoutErr) {
        return NextResponse.json({ error: payoutErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Valid Bingo! Reward Distributed!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

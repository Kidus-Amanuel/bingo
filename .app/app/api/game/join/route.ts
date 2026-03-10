import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateBingoCard, calculateGridHash } from '@/lib/gameEngine';

export async function POST(req: Request) {
    try {
        const { gameId, userId, cardTemplateId } = await req.json();

        if (!gameId || !userId) {
            return NextResponse.json({ success: false, error: 'Missing gameId or userId' }, { status: 400 });
        }

        // 1. Check if game exists and get bet amount (From rooms_engine)
        const { data: game, error: gameError } = await supabaseAdmin
            .from('rooms_engine')
            .select('status, card_price')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
        }

        if (game.status !== 'waiting') {
            return NextResponse.json({ success: false, error: 'Game has already started or finished' }, { status: 400 });
        }

        // 2. Determine Bingo Card (Template or Generated)
        let grid;
        if (cardTemplateId) {
            const { data: template } = await supabaseAdmin
                .from('card_templates')
                .select('grid')
                .eq('id', cardTemplateId)
                .single();

            if (template) {
                grid = template.grid;
            }
        }

        if (!grid) {
            grid = generateBingoCard();
        }

        // Flatten Grid for DB Insertion (Row-Major to match engine WINNING_PATTERNS)
        const flatCardNumbers: number[] = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const cell = grid[r][c];
                flatCardNumbers.push(cell === 'FREE' ? 0 : Number(cell));
            }
        }

        // 3. Perform Atomic Transaction (Deduct balance, Insert Transaction, Augment Pool, Buy Card)
        const { data: cardId, error: buyError } = await supabaseAdmin.rpc('buy_card_atomic', {
            p_user_id: userId,
            p_room_id: gameId,
            p_card_numbers: flatCardNumbers,
            p_price: game.card_price,
            p_template_id: cardTemplateId || null
        });

        if (buyError) {
            const msg = buyError.message || JSON.stringify(buyError);
            if (msg.includes('already_joined') || msg.includes('unique_user_per_room')) {
               return NextResponse.json({ success: false, error: 'You already have a card in this game.' }, { status: 400 });
            }
            if (msg.includes('unique_room_card')) {
               return NextResponse.json({ success: false, error: 'Someone else just picked this card. Please choose another.' }, { status: 400 });
            }
            if (msg.includes('balance') || msg.includes('violates check constraint')) {
               return NextResponse.json({ success: false, error: 'Insufficient balance. Please top up to continue.' }, { status: 400 });
            }
            return NextResponse.json({ success: false, error: `Failed to join game: ${msg}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, cardId: cardId, grid: grid });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

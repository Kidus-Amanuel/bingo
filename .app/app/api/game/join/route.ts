import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { generateBingoCard, calculateGridHash } from '@/lib/gameEngine';

export async function POST(req: Request) {
    try {
        const { gameId, userId, cardTemplateId } = await req.json();

        if (!gameId || !userId) {
            return NextResponse.json({ success: false, error: 'Missing gameId or userId' }, { status: 400 });
        }

        // 1. Check if game exists and get bet amount
        const { data: game, error: gameError } = await supabaseAdmin
            .from('games')
            .select('status, bet_amount')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
        }

        if (game.status !== 'waiting') {
            return NextResponse.json({ success: false, error: 'Game has already started or finished' }, { status: 400 });
        }

        // 2. Check user balance
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();

        if (walletError || !wallet) {
            return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 });
        }

        if (wallet.balance < game.bet_amount) {
            return NextResponse.json({ success: false, error: 'Insufficient balance' }, { status: 400 });
        }

        // 3. Check if player is already in the game
        const { data: existingPlayer, error: playerCheckError } = await supabaseAdmin
            .from('game_players')
            .select('user_id')
            .eq('game_id', gameId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existingPlayer) {
            return NextResponse.json({ success: false, error: 'User already joined this game' }, { status: 400 });
        }

        // 4. Determine Bingo Card (Template or Generated)
        let grid;
        let gridHash;

        if (cardTemplateId) {
            const { data: template } = await supabaseAdmin
                .from('card_templates')
                .select('grid, grid_hash')
                .eq('id', cardTemplateId)
                .single();

            if (template) {
                grid = template.grid;
                gridHash = template.grid_hash;
            }
        }

        if (!grid) {
            grid = generateBingoCard();
            gridHash = calculateGridHash(grid);
        }

        // 5. Deduct Balance
        const { error: deductError } = await supabaseAdmin
            .from('wallets')
            .update({ balance: wallet.balance - game.bet_amount })
            .eq('user_id', userId);

        if (deductError) {
            return NextResponse.json({ success: false, error: 'Failed to deduct balance' }, { status: 500 });
        }

        // 6. Log Transaction
        await supabaseAdmin.from('transactions').insert({
            user_id: userId,
            amount: -game.bet_amount,
            type: 'bet',
            status: 'completed',
            idempotency_key: `join_${gameId}_${userId}_${Date.now()}`
        });

        // 7. Save Card
        const { data: card, error: cardError } = await supabaseAdmin
            .from('cards')
            .insert({
                user_id: userId,
                grid: grid,
                grid_hash: gridHash
            })
            .select()
            .single();

        if (cardError) {
            return NextResponse.json({ success: false, error: 'Failed to create card' }, { status: 500 });
        }

        // 8. Join Game
        const { error: joinError } = await supabaseAdmin
            .from('game_players')
            .insert({
                game_id: gameId,
                user_id: userId,
                card_id: card.id
            });

        if (joinError) {
            return NextResponse.json({ success: false, error: 'Failed to join game' }, { status: 500 });
        }

        return NextResponse.json({ success: true, cardId: card.id, grid: card.grid });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

import { create } from 'zustand';
import { Game, BingoCard } from '@/app/types/game';
import { supabase } from '@/lib/supabase';

interface CurrentGame extends Game {
    selectedCard: BingoCard | null;
}

interface UserProfile {
    username: string;
    avatarUrl: string | null;
}

interface GameStore {
    userId: string | null;
    profile: UserProfile | null;
    balance: number;
    games: Game[];
    templates: BingoCard[];
    selectedGame: Game | null;
    selectedCard: BingoCard | null;
    isJoining: boolean;
    currentGame: CurrentGame | null;
    history: any[];

    // Actions
    initSession: (userId: string) => Promise<void>;
    fetchGames: () => Promise<void>;
    setBalance: (amount: number) => void;
    selectGame: (gameId: string | null) => void;
    selectCard: (cardId: string | null) => void;
    joinGame: (gameId: string, cardId?: string | null) => Promise<boolean>;
    leaveGame: () => void;
    setCurrentGame: (game: CurrentGame | null) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    userId: null,
    profile: null,
    balance: 0,
    games: [],
    templates: [],
    selectedGame: null,
    selectedCard: null,
    isJoining: false,
    currentGame: null,
    history: [],

    initSession: async (userId: string) => {
        set({ userId });

        // Use server-side API to bypass RLS for wallet/profile data
        const res = await fetch(`/api/user/session?userId=${userId}`);
        const data = await res.json();

        if (data.profile) {
            set({
                profile: {
                    username: data.profile.username || 'Player',
                    avatarUrl: data.profile.avatar_url || null
                }
            });
        }
        if (data.balance !== undefined) {
            set({ balance: Number(data.balance) });
        }
    },

    fetchGames: async () => {
        // 1. Fetch active/waiting games
        const { data: gamesData, error: gamesError } = await supabase
            .from('rooms_engine')
            .select(`
                id,
                card_price,
                status,
                pool,
                start_time,
                created_at,
                room_cards(user_id)
            `)
            .in('status', ['waiting', 'playing'])
            .order('created_at', { ascending: false });

        // 2. Fetch card templates
        const { data: templatesData, error: templatesError } = await supabase
            .from('card_templates')
            .select('*')
            .limit(50);

        if (gamesError || templatesError) {
            console.error('Error fetching games/templates:', gamesError || templatesError);
            return;
        }

        const templates: BingoCard[] = (templatesData || []).map(t => ({
            id: t.id,
            numbers: t.grid
        }));

        const formattedGames: Game[] = (gamesData || []).map((g, index) => {
            // Count unique players and track which template IDs are taken
            const cardData = g.room_cards || [];
            const uniquePlayers = new Set(cardData.map((p: any) => p.user_id)).size;
            const takenCardIds = cardData
                .map((p: any) => p.card_template_id)
                .filter((id: string | null) => id !== null);
            
            return {
                gameNumber: index + 1,
                gameId: g.id,
                betAmount: Number(g.card_price),
                playersCount: uniquePlayers,
                maxPlayers: 100,
                totalPot: Number(g.pool),
                status: g.status as any,
                range: "1-75",
                timeToStart: g.start_time ? new Date(g.start_time).getTime() : undefined,
                availableCards: templates,
                takenCardIds: takenCardIds
            };
        });

        set({ games: formattedGames, templates });

        // 3. Setup REALTIME subscription for the Lobby
        supabase.channel('lobby_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms_engine' }, () => {
                get().fetchGames(); // Re-fetch on any engine change
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_cards' }, () => {
                get().fetchGames(); // Re-fetch when someone buys a card
            })
            .subscribe();
    },

    setBalance: (amount) => set({ balance: amount }),

    selectGame: (gameId) => {
        if (!gameId) {
            set({ selectedGame: null, selectedCard: null });
            return;
        }
        const game = get().games.find((g) => g.gameId === gameId) || null;
        set({ selectedGame: game, selectedCard: null });
    },

    selectCard: (cardId) => {
        if (!cardId) {
            set({ selectedCard: null });
            return;
        }
        // Template card selection
        const card = get().templates.find((c) => c.id === cardId) || null;
        set({ selectedCard: card });
    },

    joinGame: async (gameId: string, cardId?: string | null) => {
        const { userId, balance, games } = get();
        if (!userId) return false;

        const game = games.find((g: Game) => g.gameId === gameId);
        if (!game) return false;

        if (cardId && balance < game.betAmount) return false;

        set({ isJoining: true });

        try {
            const res = await fetch('/api/game/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId, userId, cardTemplateId: cardId || null })
            });
            const data = await res.json();

            if (data.success) {
                set((state) => ({
                    balance: state.balance - game.betAmount,
                    isJoining: false,
                    currentGame: {
                        ...game,
                        selectedCard: { id: data.cardId, numbers: data.grid }
                    },
                    selectedGame: null,
                    selectedCard: null
                }));
                return true;
            }
        } catch (err) {
            console.error('Join Error:', err);
        }

        set({ isJoining: false });
        return false;
    },

    leaveGame: () => set({ currentGame: null }),
    setCurrentGame: (game) => set({ currentGame: game }),
}));
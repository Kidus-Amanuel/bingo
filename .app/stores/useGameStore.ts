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

    // Maps gameId -> cardTemplateId the current user has already bought in that room
    userCardsByGame: Record<string, string>;
    lastActiveRoomId: string | null;

    // Actions
    initSession: (userId: string) => Promise<void>;
    fetchGames: () => Promise<void>;
    setBalance: (amount: number) => void;
    selectGame: (gameId: string | null) => void;
    selectCard: (cardId: string | null) => void;
    joinGame: (gameId: string, cardId?: string | null) => Promise<string | null>;
    leaveGame: () => void;
    setCurrentGame: (game: CurrentGame | null) => void;
    subscribeLobby: () => () => void;
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
    userCardsByGame: {},
    lastActiveRoomId: null,

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
        const { userId } = get();

        // 1. Fetch active/waiting games with card data
        const { data: gamesData, error: gamesError } = await supabase
            .from('rooms_engine')
            .select(`
                id,
                card_price,
                status,
                pool,
                start_time,
                created_at,
                room_cards(user_id, card_template_id)
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

        // Build a map of which card the current user has in each room
        const userCardsByGame: Record<string, string> = {};
        if (userId) {
            (gamesData || []).forEach(g => {
                const cardData: any[] = g.room_cards || [];
                const myCard = cardData.find(c => c.user_id === userId && c.card_template_id);
                if (myCard) {
                    userCardsByGame[g.id] = myCard.card_template_id;
                }
            });
        }

        const formattedGames: Game[] = (gamesData || []).map((g, index) => {
            const cardData: any[] = g.room_cards || [];
            const uniquePlayers = new Set(cardData.map((p) => p.user_id)).size;
            const takenCardIds = cardData
                .map((p) => p.card_template_id)
                .filter((id: string | null) => id !== null);

            return {
                gameNumber: index + 1,
                gameId: g.id,
                betAmount: Number(g.card_price),
                playersCount: uniquePlayers,
                maxPlayers: 100,
                totalPot: Number(g.pool),
                status: g.status as any,
                range: '1-75',
                timeToStart: g.start_time ? new Date(g.start_time).getTime() : undefined,
                availableCards: templates,
                takenCardIds: takenCardIds
            };
        });
 
        set({ games: formattedGames, templates, userCardsByGame });

        // Auto-select logic for returning from game or first load
        const state = get();
        const currentGames = formattedGames;
        
        // If we have an active selection that's still valid, keep it
        if (state.selectedGame && currentGames.some(g => g.gameId === state.selectedGame?.gameId)) {
            return;
        }

        // Otherwise, if we have games, auto-select the first one
        if (currentGames.length > 0) {
            state.selectGame(currentGames[0].gameId);
        }
    },

    subscribeLobby: () => {
        const channel = supabase
            .channel('lobby_realtime')
            // When a room's pool or status changes → full refetch (cheap, infrequent)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms_engine' }, (payload) => {
                get().fetchGames();
            })
            // When a new card is bought → patch takenCardIds + pool in-place for speed,
            // then do a background refetch to reconcile player counts etc.
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_cards' }, (payload: any) => {
                const newCard = payload.new as {
                    room_id: string;
                    user_id: string;
                    card_template_id: string | null;
                };

                // Optimistically patch the relevant game instantly
                set(state => {
                    const games = state.games.map(g => {
                        if (g.gameId !== newCard.room_id) return g;

                        const currentTaken = g.takenCardIds || [];
                        const takenCardIds = newCard.card_template_id && !currentTaken.includes(newCard.card_template_id)
                            ? [...currentTaken, newCard.card_template_id]
                            : currentTaken;

                        return {
                            ...g,
                            playersCount: g.playersCount + 1,
                            takenCardIds
                        };
                    });

                    // Also patch selectedGame if it matches so the bottom bar updates
                    const selectedGame = state.selectedGame?.gameId === newCard.room_id
                        ? games.find(g => g.gameId === newCard.room_id) || state.selectedGame
                        : state.selectedGame;

                    return { games, selectedGame };
                });

                // Full refetch in background to sync pool amount and any missed changes
                get().fetchGames();
            })
            // Handle card deletions (e.g. if someone's card is removed)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_cards' }, () => {
                get().fetchGames();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
        const card = get().templates.find((c) => c.id === cardId) || null;
        set({ selectedCard: card });
    },

    joinGame: async (gameId: string, cardId?: string | null) => {
        const { userId, games } = get();
        if (!userId) return 'Not logged in. Please reload the page.';

        const game = games.find((g: Game) => g.gameId === gameId);
        if (!game) return 'Game not found. It may have already started.';

        // NOTE: Do NOT check balance here — the store balance may not be loaded yet.
        // The backend buy_card_atomic RPC is the authoritative validator.

        set({ isJoining: true });

        try {
            const res = await fetch('/api/game/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId, userId, cardTemplateId: cardId || null })
            });
            const data = await res.json();

            if (data.success) {
                const userCardsByGame = {
                    ...get().userCardsByGame,
                    ...(cardId ? { [gameId]: cardId } : {})
                };

                set((state) => ({
                    balance: Math.max(0, state.balance - game.betAmount),
                    isJoining: false,
                    userCardsByGame,
                    currentGame: {
                        ...game,
                        selectedCard: { id: data.cardId, numbers: data.grid }
                    },
                    // Keep selectedGame and selectedCard so lobby stays open
                    // and the card preview modal can display the assigned card
                }));
                return null; // null = success
            } else {
                set({ isJoining: false });
                return data.error || 'Could not join. Please try again.';
            }
        } catch (err: any) {
            console.error('Join Error:', err);
        }

        set({ isJoining: false });
        return 'Network error. Please check your connection and try again.';
    },

    leaveGame: () => {
        const current = get().currentGame;
        set({ 
            currentGame: null,
            // Keep selectedGame so the UI doesn't collapse while returning,
            // but store the ID so fetchGames knows we are transitioning
            lastActiveRoomId: current?.gameId || null
        });
    },
    setCurrentGame: (game) => set({ currentGame: game }),
}));
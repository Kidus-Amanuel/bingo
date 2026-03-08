import { create } from 'zustand';
import { Game, BingoCard } from '@/app/types/game';
import gamesData from '@/mockup/game.json';
import usersData from '@/mockup/users.json';

interface CurrentGame extends Game {
    selectedCard: BingoCard | null;
}

interface GameStore {
    balance: number;
    games: Game[];
    selectedGame: Game | null;
    selectedCard: BingoCard | null;
    isJoining: boolean;
    currentGame: CurrentGame | null;
    history: any[];

    // Actions
    fetchGames: () => Promise<void>;
    setBalance: (amount: number) => void;
    selectGame: (gameId: string | null) => void;
    selectCard: (cardId: string | null) => void;
    joinGame: (gameId: string, cardId?: string | null) => Promise<boolean>;
    leaveGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    balance: usersData.user.balance,
    games: [],
    selectedGame: null,
    selectedCard: null,
    isJoining: false,
    currentGame: null,
    history: [],

    fetchGames: async () => {
        // Simulate API fetch delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        set({ games: gamesData.games as Game[] });
    },

    fetchGameById: async (gameId: string) => {
        // Implementation for deep link or direct access
        if (get().games.length === 0) {
            await get().fetchGames();
        }
        return get().games.find(g => g.gameId === gameId);
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
        const card = get().selectedGame?.availableCards.find((c: BingoCard) => c.id === cardId) || null;
        set({ selectedCard: card });
    },

    joinGame: async (gameId: string, cardId?: string | null) => {
        const { balance, games } = get();
        const game = games.find((g: Game) => g.gameId === gameId);

        if (!game) return false;

        // If playing (has cardId), check balance
        if (cardId && balance < game.betAmount) {
            return false;
        }

        set({ isJoining: true });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const selectedCard = cardId
            ? (game.availableCards.find((c: BingoCard) => c.id === cardId) || null)
            : null;

        set((state) => ({
            balance: cardId ? state.balance - game.betAmount : state.balance,
            isJoining: false,
            currentGame: {
                ...game,
                selectedCard: selectedCard
            },
            selectedGame: null,
            selectedCard: null
        }));

        return true;
    },

    leaveGame: () => set({ currentGame: null }),
}));
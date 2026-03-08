"use client"

import { BingoCard } from "@/components/game/BingoCard";
import { CalledNumbers } from "@/components/game/CalledNumbers";
import { WinnerPopup } from "@/components/game/WinnerPopup";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/useGameStore";
import {
    ChevronLeft,
    Users,
    Zap,
    Loader2,
    Trophy,
    Hash,
    PlayCircle
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { cn } from "@/lib/utils";

function GameContent() {
    const params = useParams<{ id: string }>();
    const { currentGame, leaveGame, balance, userId, setCurrentGame } = useGameStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
    const [isWinnerPopupOpen, setIsWinnerPopupOpen] = useState(false);
    const [winnerDetails, setWinnerDetails] = useState<{ isMe: boolean; name?: string } | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isLoadingGame, setIsLoadingGame] = useState(false);

    // Self-initialize game state from server if currentGame is missing (e.g. direct nav / refresh)
    useEffect(() => {
        if (currentGame) return;

        const uid = userId || searchParams.get('userId');
        const gameId = params?.id;
        if (!uid || !gameId) return;

        setIsLoadingGame(true);
        fetch(`/api/game/state?userId=${uid}&gameId=${gameId}`)
            .then(r => r.json())
            .then(data => {
                if (data.game) {
                    setCurrentGame({
                        gameId: data.game.id,
                        gameNumber: 1,
                        betAmount: Number(data.game.bet_amount),
                        playersCount: 0,
                        maxPlayers: 100,
                        totalPot: Number(data.game.total_pot),
                        status: data.game.status,
                        range: '1-75',
                        availableCards: [],
                        selectedCard: data.cardId
                            ? { id: data.cardId, numbers: data.grid }
                            : null
                    });
                }
            })
            .catch(err => console.error("Error fetching game state:", err))
            .finally(() => setIsLoadingGame(false));
    }, [currentGame, params?.id, userId, searchParams, setCurrentGame]);

    // Simulation of drawing numbers
    useEffect(() => {
        if (!currentGame || winnerDetails) return;

        const interval = setInterval(() => {
            if (calledNumbers.length >= 75) return;

            let nextNum;
            do {
                nextNum = Math.floor(Math.random() * 75) + 1;
            } while (calledNumbers.includes(nextNum));

            setCalledNumbers((prev) => [...prev, nextNum]);

            // Simulation: Someone else wins after 45 calls with a 5% chance per call
            if (calledNumbers.length > 45 && Math.random() > 0.95) {
                setWinnerDetails({ isMe: false, name: "Abebe K." });
                setIsWinnerPopupOpen(true);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [currentGame, calledNumbers, winnerDetails]);

    if (!currentGame) {
        return (
            <div className="h-screen flex items-center justify-center p-4 text-center space-y-4 flex-col bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="font-bold text-slate-500">Connecting to game server...</p>
                <Button onClick={() => router.push("/lobby")}>Back to Lobby</Button>
            </div>
        );
    }

    const handleBingo = async () => {
        setIsValidating(true);
        // Simulate server-side validation
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsValidating(false);
        setWinnerDetails({ isMe: true });
        setIsWinnerPopupOpen(true);
    };

    const getBingoLetter = (num: number) => {
        if (num <= 15) return 'B';
        if (num <= 30) return 'I';
        if (num <= 45) return 'N';
        if (num <= 60) return 'G';
        return 'O';
    };

    const getBannerColor = (letter: string | null) => {
        switch (letter) {
            case 'B': return 'bg-blue-600 shadow-blue-200';
            case 'I': return 'bg-red-600 shadow-red-200';
            case 'N': return 'bg-amber-500 shadow-amber-200';
            case 'G': return 'bg-green-600 shadow-green-200';
            case 'O': return 'bg-purple-600 shadow-purple-200';
            default: return 'bg-primary-950 shadow-primary-900/20';
        }
    };

    const latestNum = calledNumbers[calledNumbers.length - 1];
    const latestLetter = latestNum ? getBingoLetter(latestNum) : null;
    const bannerColor = getBannerColor(latestLetter);

    // Transpose the grid for vertical column display (since mock data is column-based)
    const transposedGrid = currentGame.selectedCard
        ? (() => {
            const grid = [[], [], [], [], []] as (number | 'FREE')[][];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    grid[r][c] = currentGame.selectedCard!.numbers[c][r];
                }
            }
            return grid;
        })()
        : null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
            {/* Minimal Header */}
            <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (confirm("Leave game? Stake will not be refunded.")) {
                                leaveGame();
                                router.push("/lobby");
                            }
                        }}
                        className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Session</span>
                        <span className="text-sm font-black text-primary-900 leading-none">#{currentGame.gameNumber}</span>
                    </div>
                </div>

                <div className="bg-success-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg shadow-success-200 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    {balance} Birr
                </div>
            </header>

            <main className="flex-1 p-3 flex flex-col gap-2.5 max-w-lg mx-auto w-full">
                {/* 1-Row Overview Stats (Ultra Slim) */}
                <div className="bg-white px-3 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-secondary-500" />
                        <span className="text-xs font-black tabular-nums">{currentGame.totalPot}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Pot</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100" />
                    <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-primary-600" />
                        <span className="text-xs font-black tabular-nums">{currentGame.playersCount}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Users</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100" />
                    <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-accent-600" />
                        <span className="text-xs font-black tabular-nums">{currentGame.betAmount}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Bet</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100" />
                    <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-slate-500" />
                        <span className="text-xs font-black tabular-nums">{calledNumbers.length}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Calls</span>
                    </div>
                </div>

                {/* Centered Color-Coded Latest Call Banner */}
                <div className={cn(
                    "rounded-2xl py-2 px-4 shadow-xl relative overflow-hidden transition-all duration-500",
                    bannerColor
                )}>
                    <div className="absolute inset-0 bg-white/10 opacity-20 pointer-events-none" />
                    {latestNum ? (
                        <div className="relative z-10 flex flex-col items-center justify-center animate-in zoom-in duration-500">
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] leading-none mb-1">Latest Draw</span>
                            <div className="flex items-baseline justify-center gap-3">
                                <span className="text-2xl font-black text-white/50 uppercase italic leading-none">{latestLetter}</span>
                                <span className="text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl leading-none">
                                    {latestNum}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 flex items-center justify-center w-full py-4 gap-2">
                            <div className="w-2 h-2 bg-white/20 rounded-full animate-ping" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Ready for Draw...</span>
                        </div>
                    )}
                </div>

                {/* Game Play Area (Bingo Card + Calls) */}
                <div className="flex gap-2.5 items-start justify-center min-h-[320px]">
                    {transposedGrid ? (
                        <BingoCard grid={transposedGrid} />
                    ) : (
                        <div className="flex-1 aspect-[4/5] bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center space-y-4 relative overflow-hidden group shadow-inner">
                            <div className="absolute inset-0 bg-hero-gradient opacity-[0.02] group-hover:opacity-[0.05] transition-opacity" />
                            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary-600 shadow-xl shadow-primary-500/5 relative animate-in zoom-in duration-700">
                                <Users className="w-10 h-10 animate-pulse" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-success-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                                </div>
                            </div>
                            <div className="space-y-2 relative z-10">
                                <h3 className="font-black text-primary-900 dark:text-white uppercase tracking-[0.2em] text-sm">Watching Live</h3>
                                <p className="text-[11px] text-slate-500 font-bold leading-relaxed max-w-[160px] mx-auto">
                                    You joined as a spectator. Sit back and watch the balance of luck shift!
                                </p>
                            </div>
                            <div className="pt-2">
                                <div className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 rounded-full inline-flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Live Sync</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <CalledNumbers numbers={calledNumbers} />
                </div>

                {/* Bingo Button (Fixed Height) */}
                <div className="pt-1">
                    {currentGame.selectedCard ? (
                        <Button
                            onClick={handleBingo}
                            disabled={isValidating || calledNumbers.length === 0 || !!winnerDetails}
                            className={cn(
                                "w-full h-14 bg-accent-500 hover:bg-accent-600 text-white font-black text-xl rounded-2xl shadow-xl shadow-accent-200 transition-all active:scale-95 flex items-center justify-center gap-3",
                                (isValidating || !!winnerDetails) && "opacity-80"
                            )}
                        >
                            {isValidating ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    VALIDATING...
                                </>
                            ) : winnerDetails ? (
                                "GAME OVER"
                            ) : (
                                "BINGO!"
                            )}
                        </Button>
                    ) : (
                        <div className="w-full h-14 bg-slate-100/50 rounded-2xl flex items-center justify-center gap-3 border border-slate-200">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Watching Gameplay...</span>
                        </div>
                    )}
                </div>
            </main>

            <WinnerPopup
                isOpen={isWinnerPopupOpen}
                prize={currentGame.totalPot}
                isWinner={winnerDetails?.isMe ?? false}
                winnerName={winnerDetails?.name}
            />

            <footer className="mt-auto py-2 text-center opacity-10">
                <p className="text-[7px] font-black uppercase tracking-[0.5em] text-slate-500">kiik Game Engine</p>
            </footer>
        </div>
    );
}

export default function GamePage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center p-4 text-center space-y-4 flex-col bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="font-bold text-slate-500">Loading game...</p>
            </div>
        }>
            <GameContent />
        </Suspense>
    );
}

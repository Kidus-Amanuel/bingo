"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LobbyHeader } from "@/components/player/LobbyHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGameStore } from "@/stores/useGameStore";
import { Timer, Users, PlayCircle, Loader2, ChevronRight, Zap } from "lucide-react";
import { Game, BingoCard } from "@/app/types/game";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function LobbyPage() {
    const {
        games,
        fetchGames,
        selectedGame,
        selectGame,
        isJoining,
        joinGame,
        selectedCard,
        selectCard
    } = useGameStore();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [localGames, setLocalGames] = useState<Game[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        fetchGames();
    }, [fetchGames]);

    // Update local games and auto-expand first game
    useEffect(() => {
        setLocalGames(games);
        if (games.length > 0 && !selectedGame) {
            selectGame(games[0].gameId);
        }
    }, [games, selectedGame, selectGame]);

    // Countdown and Auto-Join Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setLocalGames(prev => {
                return prev.map(game => {
                    if (game.status === "waiting" && game.timeToStart && game.timeToStart > 0) {
                        return { ...game, timeToStart: game.timeToStart - 1 };
                    }
                    return game;
                });
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Side-effect handler for countdown reaching zero
    useEffect(() => {
        if (!selectedGame || isJoining) return;

        const currentGameData = localGames.find(g => g.gameId === selectedGame.gameId);
        if (currentGameData && currentGameData.timeToStart === 0) {
            handleAutoJoin(currentGameData.gameId);
        }
    }, [localGames, selectedGame, isJoining]);

    const handleAutoJoin = async (gameId: string) => {
        setPreviewOpen(false);
        const success = await joinGame(gameId, selectedCard?.id);

        if (success) {
            router.push(`/game/${gameId}`);
        } else {
            // If join failed (e.g. balance), we still navigate as spectator
            // but joinGame already handled setting state if success was false due to balance
            // However, our joinGame returns false for balance. 
            // Let's ensure we navigate anyway.
            router.push(`/game/${gameId}`);
        }
    };

    const handleSelectNumber = (cardId: string) => {
        selectCard(cardId);
        setPreviewOpen(true);
    };

    // Helper to transpose the grid (Column-based mock data to Row-based UI)
    const getTransposedNumbers = (numbers: (number | "FREE")[][]) => {
        const transposed = [[], [], [], [], []] as (number | "FREE")[][];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                transposed[r][c] = numbers[c][r];
            }
        }
        return transposed;
    };

    const currentGameData = localGames.find(g => g.gameId === selectedGame?.gameId);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pb-24">
            <LobbyHeader
                showBack={!!selectedGame}
                onBack={() => selectGame(null)}
            />

            {error && (
                <div className="fixed top-20 left-4 right-4 z-[60] bg-error-500 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    <span className="font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 fill-white" />
                        {error}
                    </span>
                </div>
            )}

            <main className="flex-1 p-3 max-w-lg mx-auto w-full space-y-3">
                {localGames.length === 0 ? (
                    <div className="text-center py-20 space-y-4 opacity-50">
                        <PlayCircle className="w-16 h-16 mx-auto text-slate-300" />
                        <p className="font-bold text-slate-400">Searching for games...</p>
                    </div>
                ) : (
                    localGames.map((game) => (
                        <div key={game.gameId} className="space-y-3">
                            <GameListItem
                                game={game}
                                isSelected={selectedGame?.gameId === game.gameId}
                                onClick={() => selectGame(selectedGame?.gameId === game.gameId ? null : game.gameId)}
                            />

                            {selectedGame?.gameId === game.gameId && (
                                <div className="animate-in slide-in-from-top-4 duration-300 space-y-4 px-1 py-2">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                            Select Lucky Number
                                        </h3>
                                        <Badge variant="outline" className="text-[9px] font-black text-primary-500 bg-primary-50/50 border-primary-100 uppercase tracking-tighter">
                                            Join on 0s
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2.5">
                                        {game.availableCards.map((card, cIdx) => (
                                            <button
                                                key={card.id}
                                                onClick={() => handleSelectNumber(card.id)}
                                                className={cn(
                                                    "aspect-square rounded-xl flex items-center justify-center font-black text-lg transition-all active:scale-90 border-2",
                                                    selectedCard?.id === card.id
                                                        ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200"
                                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 shadow-sm"
                                                )}
                                            >
                                                {cIdx + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </main>

            {/* Sticky Floating Countdown Bar */}
            {selectedGame && currentGameData && (
                <div className="fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-primary-900 rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-primary-900/40 border border-white/10 backdrop-blur-md bg-opacity-95">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-hero-gradient flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary-950">
                                <Timer className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none mb-1">Game Starts In</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{currentGameData.timeToStart || 0}</span>
                                    <span className="text-xs font-black text-primary-400">SECONDS</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Pot Prize</div>
                            <div className="flex items-center gap-1.5 text-secondary-400 font-black">
                                <Zap className="w-4 h-4 fill-secondary-400" />
                                <span className="text-lg tracking-tight tabular-nums">{currentGameData.totalPot} Birr</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Card Preview Modal */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="sm:max-w-md p-5 rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden max-w-[92vw]">
                    <DialogHeader className="pb-3 text-center">
                        <DialogTitle className="text-xl font-black text-primary-900 tracking-tight uppercase">LUCKY BINGO CARD</DialogTitle>
                    </DialogHeader>

                    {selectedCard && (
                        <div className="space-y-5">
                            <div className="bg-slate-50 p-3 rounded-[2rem] border border-slate-100">
                                {/* BINGO Headers */}
                                <div className="grid grid-cols-5 gap-1.5 mb-2">
                                    {['B', 'I', 'N', 'G', 'O'].map(letter => (
                                        <div key={letter} className="text-center font-black text-primary-600 text-sm tracking-[0.2em] py-1 drop-shadow-sm">
                                            {letter}
                                        </div>
                                    ))}
                                </div>

                                {/* Transposed Grid (Rows from Mock Columns) */}
                                <div className="grid grid-cols-5 gap-1.5 aspect-square w-full">
                                    {getTransposedNumbers(selectedCard.numbers).map((row, rIdx) =>
                                        row.map((num, cIdx) => (
                                            <div
                                                key={`${rIdx}-${cIdx}`}
                                                className={cn(
                                                    "flex items-center justify-center rounded-xl text-xs font-black shadow-sm aspect-square",
                                                    num === "FREE" ? "bg-amber-400 text-white animate-pulse" : "bg-white text-slate-500"
                                                )}
                                            >
                                                {num === "FREE" ? "★" : num}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-3">
                                <div className="px-3 py-1 bg-slate-100 rounded-full">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedCard.id.toUpperCase()}</span>
                                </div>
                                <Button
                                    onClick={() => setPreviewOpen(false)}
                                    className="w-full h-12 rounded-xl bg-primary-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-primary-900/20"
                                >
                                    CONFIRM SELECTION
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {isJoining && (
                <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 border border-slate-100">
                        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
                        <span className="font-black text-primary-900 tracking-tight text-lg uppercase">ENTERING GAME...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function GameListItem({ game, isSelected, onClick }: { game: Game; isSelected: boolean; onClick: () => void }) {
    const isWaiting = game.status === "waiting";

    return (
        <Card
            className={cn(
                "border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl group transition-all cursor-pointer",
                isSelected ? "ring-2 ring-primary-500 shadow-md scale-[1.01]" : "hover:shadow-md opacity-80 hover:opacity-100"
            )}
            onClick={onClick}
        >
            <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        isWaiting ? "bg-primary-50 text-primary-600" : "bg-slate-100 text-slate-400"
                    )}>
                        <PlayCircle className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0">
                            <span className="font-black text-primary-900 dark:text-white uppercase text-[8px] tracking-widest truncate">GAME #{game.gameNumber}</span>
                            <Badge variant="outline" className={cn(
                                "text-[7px] font-black uppercase tracking-tighter px-1 h-3.5 border-none",
                                isWaiting ? "bg-secondary-100 text-secondary-600" : "bg-slate-100 text-slate-400"
                            )}>
                                {game.status}
                            </Badge>
                        </div>
                        <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">
                            {game.betAmount} Birr Classic
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end scale-90">
                        <div className="flex items-center gap-1 text-secondary-600 font-black text-[10px]">
                            <Zap className="w-2.5 h-2.5 fill-secondary-600" />
                            {game.totalPot}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 font-bold text-[9px]">
                            <Users className="w-2.5 h-2.5" />
                            {game.playersCount}/{game.maxPlayers}
                        </div>
                    </div>

                    <ChevronRight className={cn(
                        "w-4 h-4 text-slate-300 transition-transform",
                        isSelected ? "rotate-90 text-primary-600" : "group-hover:translate-x-1"
                    )} />
                </div>
            </div>
        </Card>
    );
}
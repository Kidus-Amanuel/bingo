"use client"

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LobbyHeader } from "@/components/player/LobbyHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGameStore } from "@/stores/useGameStore";
import { Timer, Users, PlayCircle, Loader2, ChevronRight, Zap, CheckCircle2 } from "lucide-react";
import { Game, BingoCard } from "@/app/types/game";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

function LobbyContent() {
    const searchParams = useSearchParams();
    const userId = searchParams.get("userId");

    const {
        games,
        fetchGames,
        selectedGame,
        selectGame,
        isJoining,
        joinGame,
        selectedCard,
        selectCard,
        initSession,
        subscribeLobby,
        userCardsByGame,
        currentGame,
    } = useGameStore();

    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [localGames, setLocalGames] = useState<Game[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        if (userId) {
            initSession(userId).then(() => {
                fetchGames();
            });
        } else {
            fetchGames();
        }
    }, [userId]);

    // Real-time synchronization
    useEffect(() => {
        const unsubscribe = subscribeLobby();
        return () => unsubscribe();
    }, []);

    // Sync localGames - always take fresh pot/takenCardIds from store,
    // only preserve the local countdown timer if the game is still waiting
    useEffect(() => {
        setLocalGames(prev => {
            return games.map(g => {
                const existing = prev.find(p => p.gameId === g.gameId);
                // Always update pot, takenCardIds, and playersCount from live data
                // Only preserve the local timeToStart to avoid countdown jumps
                if (!existing || existing.status !== g.status) {
                    return g;
                }
                return {
                    ...g,
                    // Keep local countdown if it exists and game is still waiting
                    timeToStart: existing.timeToStart ?? g.timeToStart,
                };
            });
        });
    }, [games]);

    // Auto-select first game whenever the games list is updated and nothing is selected
    useEffect(() => {
        if (games.length > 0 && !selectedGame) {
            selectGame(games[0].gameId);
        }
    }, [games, selectedGame, selectGame]);

    // Re-render interval to keep countdowns ticking
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-navigate when any game moves to 'playing' status.
    // This allows active players OR spectators to enter the game page.
    useEffect(() => {
        // Find if any game just started
        const startedGame = games.find(g => g.status === 'playing');
        if (startedGame) {
            setPreviewOpen(false);
            router.push(`/game/${startedGame.gameId}`);
        }
    }, [games, router]);

    // Auto-clear error after 4 seconds
    useEffect(() => {
        if (!error) return;
        const t = setTimeout(() => setError(null), 4000);
        return () => clearTimeout(t);
    }, [error]);


    // Immediately join on card tap — modal is just a success preview
    const handleSelectNumber = async (cardId: string) => {
        if (!selectedGame) return;
        selectCard(cardId);
        const err = await joinGame(selectedGame.gameId, cardId);
        if (err === null) {
            // Open the preview modal to show the assigned card, then let user navigate
            setPreviewOpen(true);
        } else {
            selectCard(null);
            setError(err);
        }
    };

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
                <div className="fixed top-20 left-4 right-4 z-[60] bg-red-500 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
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
                    localGames.map((game) => {
                        // Check if this user already bought a card in this game
                        const userOwnedCardId = userCardsByGame[game.gameId];

                        return (
                            <div key={game.gameId} className="space-y-3">
                                <GameListItem
                                    game={game}
                                    isSelected={selectedGame?.gameId === game.gameId}
                                    onClick={() => selectGame(game.gameId)}
                                />

                                {selectedGame?.gameId === game.gameId && (
                                    <div className="animate-in slide-in-from-top-4 duration-300 space-y-4 px-1 py-2">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                                {userOwnedCardId ? "Your Card" : "Select Lucky Number"}
                                            </h3>
                                            <Badge variant="outline" className="text-[9px] font-black text-primary-500 bg-primary-50/50 border-primary-100 uppercase tracking-tighter">
                                                {userOwnedCardId ? "1 Card / Player" : "Join on 0s"}
                                            </Badge>
                                        </div>

                                        {userOwnedCardId && game.status === 'waiting' && (
                                            <div className="flex items-center gap-2 px-1 py-2 bg-green-50 border border-green-100 rounded-xl">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                <p className="text-xs font-bold text-green-700">
                                                    You've already joined this game. Wait for the draw!
                                                </p>
                                            </div>
                                        )}

                                        {!userOwnedCardId && game.status === 'playing' && (
                                            <div className="flex items-center gap-2 px-1 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                                <Timer className="w-4 h-4 text-amber-500 shrink-0" />
                                                <p className="text-xs font-bold text-amber-700">
                                                    Game in progress. You can spectate or wait for the next round.
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-5 gap-2.5">
                                            {game.availableCards.map((card, cIdx) => {
                                                const isTaken = game.takenCardIds?.includes(card.id);
                                                const isMyCard = userOwnedCardId === card.id;
                                                // If user already owns a card in this game, disable every OTHER card
                                                const isDisabled = isTaken || (!!userOwnedCardId && !isMyCard);

                                                return (
                                                    <button
                                                        key={card.id}
                                                        onClick={() => {
                                                            if (isMyCard) {
                                                                setPreviewOpen(true);
                                                            } else if (!isDisabled) {
                                                                handleSelectNumber(card.id);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "aspect-square rounded-xl flex items-center justify-center font-black text-lg transition-all active:scale-90 border-2",
                                                            isMyCard
                                                                ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200 cursor-pointer"
                                                                : selectedCard?.id === card.id && !userOwnedCardId
                                                                    ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200"
                                                                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 shadow-sm",
                                                            isDisabled && !isMyCard && "grayscale opacity-30 cursor-not-allowed border-slate-200"
                                                        )}
                                                    >
                                                        {cIdx + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </main>

            {selectedGame && currentGameData && (
                <div className="fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-primary-900 rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-primary-900/40 border border-white/10 backdrop-blur-md bg-opacity-95">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-hero-gradient flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary-950">
                                <Timer className={cn("w-5 h-5", (currentGameData.timeToStart !== undefined) && "animate-pulse")} />
                            </div>
                            <div>
                                {currentGameData.timeToStart !== undefined ? (
                                    <>
                                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none mb-1">Game Starts In</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-white tabular-nums tracking-tighter">
                                                {Math.max(0, Math.floor((currentGameData.timeToStart - Date.now()) / 1000))}
                                            </span>
                                            <span className="text-xs font-black text-primary-400">SECONDS</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none mb-1 text-center">
                                            {currentGameData.playersCount < 3 ? "⌛ Waiting For Players" : "Ready to Start"}
                                        </p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-white tabular-nums tracking-tighter">
                                                {currentGameData.playersCount < 3 ? "READY?" : `${currentGameData.playersCount} / 3`}
                                            </span>
                                            {currentGameData.playersCount >= 3 && (
                                                <span className="text-[10px] font-black text-primary-400">JOINED</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Pot Prize</div>
                            <div className="flex items-center gap-1.5 text-secondary-400 font-black">
                                <Zap className="w-4 h-4 fill-secondary-400" />
                                <span className="text-lg tracking-tight tabular-nums">{(currentGameData.totalPot * 0.85).toFixed(2)} Birr</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="sm:max-w-md p-5 rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden max-w-[92vw]">
                    <DialogHeader className="pb-3 text-center">
                        <DialogTitle className="text-xl font-black text-primary-900 tracking-tight uppercase">LUCKY BINGO CARD</DialogTitle>
                    </DialogHeader>

                    {/* Use currentGame.selectedCard — the server-confirmed card with the real grid */}
                    {currentGame?.selectedCard && (
                        <div className="space-y-5">
                            <div className="bg-slate-50 p-3 rounded-[2rem] border border-slate-100">
                                <div className="grid grid-cols-5 gap-1.5 mb-2">
                                    {['B', 'I', 'N', 'G', 'O'].map(letter => (
                                        <div key={letter} className="text-center font-black text-primary-600 text-sm tracking-[0.2em] py-1 drop-shadow-sm">
                                            {letter}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-5 gap-1.5 aspect-square w-full">
                                    {getTransposedNumbers(currentGame.selectedCard.numbers).map((row, rIdx) =>
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
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Card Secured! Waiting for draw...</span>
                                </div>
                                <Button
                                    onClick={() => setPreviewOpen(false)}
                                    className="w-full h-12 rounded-xl bg-primary-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-primary-900/20"
                                >
                                    BACK TO LOBBY — WAITING ⏳
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
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-secondary-600 font-black text-xs">
                            <Zap className="w-2.5 h-2.5 fill-secondary-600" />
                            {(game.totalPot * 0.85).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px]">
                            <Users className="w-2.5 h-2.5" />
                            {game.playersCount < 3 ? "Wait" : `${game.playersCount}/3`}
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

export default function LobbyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
            </div>
        }>
            <LobbyContent />
        </Suspense>
    );
}
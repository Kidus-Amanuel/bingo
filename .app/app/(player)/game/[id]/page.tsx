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
    Clock
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Game, BingoCard as BingoType } from "@/app/types/game";

function GameContent() {
    const params = useParams<{ id: string }>();
    const { currentGame, leaveGame, balance, userId, setCurrentGame } = useGameStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Realtime Game States
    const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
    const [isWinnerPopupOpen, setIsWinnerPopupOpen] = useState(false);
    const [winnerDetails, setWinnerDetails] = useState<{ isMe: boolean; name?: string; prize?: number } | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isLoadingGame, setIsLoadingGame] = useState(true);
    
    // Countdown State
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Track latest numbers safely
    const numbersRef = useRef(calledNumbers);
    useEffect(() => { numbersRef.current = calledNumbers; }, [calledNumbers]);

    const gameId = params?.id as string;
    const uid = userId || searchParams.get('userId');

    // 1. Initial Data Fetch
    useEffect(() => {
        if (!uid || !gameId) return;

        const loadRoomData = async () => {
            setIsLoadingGame(true);
            try {
                // Get player state and game room
                const res = await fetch(`/api/game/state?userId=${uid}&gameId=${gameId}`);
                const data = await res.json();
                
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
                        availableCards: [] as BingoType[],
                        takenCardIds: [],
                        timeToStart: data.game.start_time ? new Date(data.game.start_time).getTime() : undefined,
                        selectedCard: data.grid
                            ? { id: data.cardId, numbers: data.grid }
                            : null
                    });
                }

                // Get already called numbers so late joiners sync immediately
                const { data: pastCalls } = await supabase
                    .from('called_numbers')
                    .select('number')
                    .eq('room_id', gameId)
                    .order('called_at', { ascending: true });

                if (pastCalls) {
                    setCalledNumbers(pastCalls.map(c => c.number));
                }
            } catch (err) {
                console.error("Error loading initial game data:", err);
            } finally {
                setIsLoadingGame(false);
            }
        };

        loadRoomData();
    }, [gameId, uid, setCurrentGame]);

    // 2. Realtime Bingo Engine Synchronizer
    useEffect(() => {
        if (!gameId) return;

        const channel = supabase.channel(`room_${gameId}`)
            // Listen for New Numbers (Server calls)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'called_numbers', filter: `room_id=eq.${gameId}` },
                (payload) => {
                    const newNumber = payload.new.number;
                    if (!numbersRef.current.includes(newNumber)) {
                        setCalledNumbers(prev => [...prev, newNumber]);
                    }
                }
            )
            // Listen for Sync / Status changes (waiting -> playing -> finished)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms_engine', filter: `id=eq.${gameId}` },
                (payload) => {
                    const current = useGameStore.getState().currentGame;
                    if (current) {
                        setCurrentGame({
                            ...current,
                            status: payload.new.status as any,
                            totalPot: payload.new.pool,
                            timeToStart: payload.new.start_time ? new Date(payload.new.start_time).getTime() : undefined,
                        });
                    }
                }
            )
            // Listen for new participants
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'room_cards', filter: `room_id=eq.${gameId}` },
                () => {
                    const current = useGameStore.getState().currentGame;
                    if (current) {
                        setCurrentGame({ ...current, playersCount: (current.playersCount || 0) + 1 });
                    }
                }
            )
            // Listen for Winners
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'game_winners', filter: `room_id=eq.${gameId}` },
                (payload) => {
                    const isMe = payload.new.user_id === uid;
                    setWinnerDetails({ isMe, name: isMe ? "You" : "Unknown Player" });
                    setIsWinnerPopupOpen(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, uid, setCurrentGame]);

    // 3. Countdown Timer strictly tied to server explicit start_time
    useEffect(() => {
        if (!currentGame || currentGame.status !== 'waiting' || !currentGame.timeToStart) {
            setTimeLeft(null);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const start = currentGame.timeToStart!;
            const diff = Math.floor((start - now) / 1000);

            if (diff <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentGame?.status, currentGame?.timeToStart]);


    const handleBingo = async () => {
        if (!uid || !gameId || !currentGame?.selectedCard) return;
        setIsValidating(true);
        
        try {
            const res = await fetch('/api/game/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: gameId,
                    user_id: uid,
                    card_id: currentGame.selectedCard.id
                })
            });
            const data = await res.json();
            
            if (data.success) {
                setWinnerDetails({ isMe: true, name: "You" });
                setIsWinnerPopupOpen(true);
            } else {
                alert(data.error || "BINGO pattern invalid or not verified by server!");
            }
        } catch (e) {
            console.error(e);
            alert("Error verifying BINGO.");
        } finally {
            setIsValidating(false);
        }
    };

    if (isLoadingGame || !currentGame) {
        return (
            <div className="h-screen flex items-center justify-center p-4 text-center space-y-4 flex-col bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="font-bold text-slate-500">Connecting to game server...</p>
                <Button onClick={() => router.push("/lobby")}>Back to Lobby</Button>
            </div>
        );
    }

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

    // Format `MM:SS` universally
    const formattedTimeLeft = timeLeft !== null
        ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
        : '--:--';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
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
                        <span className="text-sm font-black text-primary-900 leading-none">#{currentGame.gameId.substring(0,6)}</span>
                    </div>
                </div>
                <div className="bg-success-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg shadow-success-200 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    {balance} Birr
                </div>
            </header>

            <main className="flex-1 p-3 flex flex-col gap-2.5 max-w-lg mx-auto w-full">
                <div className="bg-white px-3 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-secondary-500" />
                        <span className="text-xs font-black tabular-nums">{(currentGame.totalPot * 0.85).toFixed(2)}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Pot (-15%)</span>
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

                {currentGame.status === 'waiting' && (
                    <div className="rounded-2xl py-3 px-4 shadow-xl bg-primary-950 flex flex-col items-center justify-center animate-pulse duration-1000">
                        <Clock className="w-6 h-6 text-white/50 mb-1" />
                        <span className="text-xs font-black text-white/60 uppercase tracking-widest">Game Starts In</span>
                        <span className="text-4xl font-black text-white tabular-nums drop-shadow-lg tracking-widest">{formattedTimeLeft}</span>
                    </div>
                )}

                {currentGame.status !== 'waiting' && (
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
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{currentGame.status === 'finished' ? 'Game Finished' : 'Drawing next number...'}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-2.5 items-start justify-center min-h-[320px]">
                    {currentGame.selectedCard ? (
                        <BingoCard grid={currentGame.selectedCard.numbers} />
                    ) : (
                        <div className="flex-1 aspect-[4/5] bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-inner">
                            <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-full">
                                <Users className="w-10 h-10 text-primary-300" />
                            </div>
                            <h3 className="font-black text-primary-900 uppercase">Spectator</h3>
                        </div>
                    )}
                    <CalledNumbers numbers={calledNumbers} />
                </div>

                <div className="pt-1">
                    {currentGame.selectedCard && (
                        <Button
                            onClick={handleBingo}
                            disabled={isValidating || currentGame.status === 'waiting' || !!winnerDetails}
                            className={cn(
                                "w-full h-14 bg-accent-500 hover:bg-accent-600 text-white font-black text-xl rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3",
                                (isValidating || !!winnerDetails || currentGame.status === 'waiting') && "opacity-80"
                            )}
                        >
                            {isValidating ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    SERVER CHECKING...
                                </>
                            ) : winnerDetails ? (
                                "GAME OVER"
                            ) : currentGame.status === 'waiting' ? (
                                "WAITING TO START"
                            ) : (
                                "BINGO!"
                            )}
                        </Button>
                    )}
                </div>
            </main>

            <WinnerPopup
                isOpen={isWinnerPopupOpen}
                prize={currentGame.totalPot}
                isWinner={winnerDetails?.isMe ?? false}
                winnerName={winnerDetails?.name}
            />
        </div>
    );
}

export default function GamePage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
            </div>
        }>
            <GameContent />
        </Suspense>
    );
}

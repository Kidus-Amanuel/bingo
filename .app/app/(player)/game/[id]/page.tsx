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
    Clock,
    Wifi
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Game, BingoCard as BingoType } from "@/app/types/game";

// ─── Helpers ────────────────────────────────────────────────────────────────
function getBingoLetter(num: number) {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
}

function getBannerColor(letter: string | null) {
    switch (letter) {
        case 'B': return 'bg-blue-600 shadow-blue-200';
        case 'I': return 'bg-red-600 shadow-red-200';
        case 'N': return 'bg-amber-500 shadow-amber-200';
        case 'G': return 'bg-green-600 shadow-green-200';
        case 'O': return 'bg-purple-600 shadow-purple-200';
        default: return 'bg-primary-950 shadow-primary-900/20';
    }
}

/**
 * Reconstruct the 5×5 card grid from the flat int[] stored in the DB.
 * 0 in the DB represents the FREE center cell.
 */
function flatToGrid(nums: number[]): (number | 'FREE')[][] {
    const rows: (number | 'FREE')[][] = [];
    for (let r = 0; r < 5; r++) {
        const row: (number | 'FREE')[] = [];
        for (let c = 0; c < 5; c++) {
            const val = nums[r * 5 + c];
            row.push(val === 0 ? 'FREE' : val);
        }
        rows.push(row);
    }
    return rows;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function GameContent() {
    const params = useParams<{ id: string }>();
    const { currentGame, leaveGame, balance, userId, setCurrentGame } = useGameStore();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Game state
    const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
    const [isWinnerPopupOpen, setIsWinnerPopupOpen] = useState(false);
    const [winnerDetails, setWinnerDetails] = useState<{ isMe: boolean; name?: string; prize?: number } | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isLoadingGame, setIsLoadingGame] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [newlyCalledNumber, setNewlyCalledNumber] = useState<number | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const numbersRef = useRef(calledNumbers);
    useEffect(() => { numbersRef.current = calledNumbers; }, [calledNumbers]);

    const gameId = params?.id as string;
    const uid = userId || searchParams.get('userId');

    // ── 1. Initial Data Fetch ─────────────────────────────────────────────
    useEffect(() => {
        if (!uid || !gameId) return;

        const loadRoomData = async () => {
            setIsLoadingGame(true);
            try {
                const res = await fetch(`/api/game/state?userId=${uid}&gameId=${gameId}`);
                const data = await res.json();

                if (data.game) {
                    // Build the card grid from the server response
                    // data.grid comes as 5×5 array from the API, but values may be 0 for FREE
                    let cardGrid: (number | 'FREE')[][] | null = null;
                    if (data.grid) {
                        // API returns [[row0], [row1], ...] — replace 0 with 'FREE'
                        cardGrid = (data.grid as number[][]).map(row =>
                            row.map(v => (v === 0 ? 'FREE' : v) as number | 'FREE')
                        );
                    } else if (currentGame?.selectedCard) {
                        // Fallback: use the card stored from lobby selection
                        cardGrid = currentGame.selectedCard.numbers;
                    }

                    setCurrentGame({
                        gameId: data.game.id,
                        gameNumber: 1,
                        betAmount: Number(data.game.bet_amount),
                        playersCount: data.game.players_count || 0,
                        maxPlayers: 100,
                        totalPot: Number(data.game.total_pot),
                        status: data.game.status,
                        range: '1-75',
                        availableCards: [] as BingoType[],
                        takenCardIds: [],
                        timeToStart: data.game.start_time ? new Date(data.game.start_time).getTime() : undefined,
                        selectedCard: cardGrid && data.cardId
                            ? { id: data.cardId, numbers: cardGrid }
                            : (currentGame?.selectedCard ?? null)
                    });
                }

                // Load any already-called numbers so late joiners sync immediately
                const { data: pastCalls } = await supabase
                    .from('called_numbers')
                    .select('number')
                    .eq('room_id', gameId)
                    .order('called_at', { ascending: true });

                if (pastCalls && pastCalls.length > 0) {
                    const nums = pastCalls.map((c: any) => c.number);
                    setCalledNumbers(nums);
                }
            } catch (err) {
                console.error("Error loading game data:", err);
            } finally {
                setIsLoadingGame(false);
            }
        };

        loadRoomData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, uid]);

    // ── 2. Real-Time Subscriptions ────────────────────────────────────────
    useEffect(() => {
        if (!gameId) return;

        const channel = supabase
            .channel(`game_room_${gameId}`)
            // ⚡ New number called — NO row filter here so it works before
            //    REPLICA IDENTITY FULL migration is applied. We filter client-side.
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'called_numbers' },
                (payload: any) => {
                    // Client-side filter by room_id
                    if (payload.new.room_id !== gameId) return;
                    const num: number = payload.new.number;
                    if (!numbersRef.current.includes(num)) {
                        setCalledNumbers(prev => [...prev, num]);
                        setNewlyCalledNumber(num);
                        playCallSound();
                    }
                }
            )
            // Room status / pool update
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms_engine' },
                (payload: any) => {
                    if (payload.new.id !== gameId) return;
                    const current = useGameStore.getState().currentGame;
                    if (current) {
                        setCurrentGame({
                            ...current,
                            status: payload.new.status,
                            totalPot: Number(payload.new.pool),
                            timeToStart: payload.new.start_time
                                ? new Date(payload.new.start_time).getTime()
                                : undefined,
                        });
                    }
                }
            )
            // New player joined
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'room_cards' },
                (payload: any) => {
                    if (payload.new.room_id !== gameId) return;
                    const current = useGameStore.getState().currentGame;
                    if (current) {
                        setCurrentGame({ ...current, playersCount: (current.playersCount || 0) + 1 });
                    }
                }
            )
            // Winner declared
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'game_winners' },
                async (payload: any) => {
                    if (payload.new.room_id !== gameId) return;
                    const isMe = payload.new.user_id === uid;

                    // Fetch username from profiles
                    let winnerUsername = isMe ? 'You' : 'A Player';
                    if (!isMe) {
                        const { data: p } = await supabase.from('profiles').select('username').eq('id', payload.new.user_id).maybeSingle();
                        if (p?.username) winnerUsername = p.username;
                    }

                    setWinnerDetails({ isMe, name: winnerUsername });
                    setIsWinnerPopupOpen(true);
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        // ── Polling fallback: re-sync state every 5s ─────────────────────
        const poll = setInterval(async () => {
            // 1. Sync called numbers
            const { data: calls } = await supabase
                .from('called_numbers')
                .select('number')
                .eq('room_id', gameId)
                .order('called_at', { ascending: true });
            
            if (calls) {
                const nums = calls.map((c: any) => c.number);
                const current = numbersRef.current;
                const hasNew = nums.some((n: number) => !current.includes(n));
                if (hasNew) setCalledNumbers(nums);
            }

            // 2. Sync room status
            const { data: room } = await supabase
                .from('rooms_engine')
                .select('status, pool, start_time')
                .eq('id', gameId)
                .single();

            if (room && room.status === 'finished') {
                // If room is finished but popup is not open, trigger it
                // We'll also need winner details, but the popup fetches them itself
                setIsWinnerPopupOpen(true);
            }
        }, 5000);

        return () => {
            clearInterval(poll);
            supabase.removeChannel(channel);
        };
    }, [gameId, uid, setCurrentGame]);

    // ── 3. Countdown Timer ────────────────────────────────────────────────
    useEffect(() => {
        if (!currentGame?.timeToStart || currentGame.status !== 'waiting') {
            setTimeLeft(null);
            return;
        }

        const interval = setInterval(() => {
            const diff = Math.floor((currentGame.timeToStart! - Date.now()) / 1000);
            setTimeLeft(diff <= 0 ? 0 : diff);
        }, 500);

        return () => clearInterval(interval);
    }, [currentGame?.status, currentGame?.timeToStart]);

    // ── 4. BINGO Claim ────────────────────────────────────────────────────
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
                setWinnerDetails({ isMe: true, name: 'You', prize: currentGame.totalPot * 0.85 });
                setIsWinnerPopupOpen(true);
            } else {
                alert(data.error || 'Pattern not valid yet — keep going!');
            }
        } catch (e) {
            console.error(e);
            alert('Error verifying BINGO.');
        } finally {
            setIsValidating(false);
        }
    };

    // ── Derived Values ────────────────────────────────────────────────────
    const latestNum = calledNumbers[calledNumbers.length - 1];
    const latestLetter = latestNum ? getBingoLetter(latestNum) : null;
    const bannerColor = getBannerColor(latestLetter);

    const formattedTimeLeft = timeLeft !== null
        ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
        : currentGame?.status === 'waiting' ? '...' : '--:--';

    // ── Loading State ─────────────────────────────────────────────────────
    if (isLoadingGame || !currentGame) {
        return (
            <div className="h-screen flex items-center justify-center p-4 text-center space-y-4 flex-col bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="font-bold text-slate-500">Connecting to game server...</p>
                <Button variant="outline" onClick={() => router.push('/lobby')}>Back to Lobby</Button>
            </div>
        );
    }

    const isGamePlaying = currentGame.status === 'playing';
    const isGameFinished = currentGame.status === 'finished';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">

            {/* ── Header ── */}
            <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (isGamePlaying) {
                                if (!confirm('Leave game? Your stake will not be refunded.')) return;
                            }
                            leaveGame();
                            router.push('/lobby');
                        }}
                        className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Session</span>
                        <span className="text-sm font-black text-primary-900 leading-none">#{gameId.substring(0, 6).toUpperCase()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Connection indicator */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        isConnected ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"
                    )}>
                        <Wifi className="w-2.5 h-2.5" />
                        {isConnected ? 'LIVE' : 'Sync...'}
                    </div>
                    <div className="bg-primary-900 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg flex items-center gap-1.5">
                        <Zap className="w-3 h-3 fill-secondary-400 text-secondary-400" />
                        {balance} Birr
                    </div>
                </div>
            </header>

            <main className="flex-1 p-3 flex flex-col gap-2.5 max-w-lg mx-auto w-full">

                {/* ── Stats Bar ── */}
                <div className="bg-white px-3 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-secondary-500" />
                        <span className="text-xs font-black tabular-nums">{(currentGame.totalPot * 0.85).toFixed(0)}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Pot (Birr)</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100" />
                    <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-primary-500" />
                        <span className="text-xs font-black tabular-nums">{currentGame.playersCount || '?'}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Players</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100" />
                    <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-slate-500" />
                        <span className="text-xs font-black tabular-nums">{calledNumbers.length}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Calls</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100" />
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className={cn(
                            "text-xs font-black tabular-nums",
                            isGamePlaying ? "text-green-600" : "text-slate-700"
                        )}>
                            {isGamePlaying ? 'LIVE' : isGameFinished ? 'ENDED' : formattedTimeLeft}
                        </span>
                    </div>
                </div>

                {/* ── Waiting / Countdown Banner ── */}
                {currentGame.status === 'waiting' && (
                    <div className="rounded-2xl py-3 px-4 shadow-xl bg-primary-950 flex flex-col items-center justify-center">
                        <Clock className="w-6 h-6 text-white/40 mb-1" />
                        <span className="text-xs font-black text-white/60 uppercase tracking-widest mb-1">
                            {timeLeft === null ? 'Waiting for players...' : 'Game Starts In'}
                        </span>
                        {timeLeft !== null && (
                            <span className="text-4xl font-black text-white tabular-nums drop-shadow-lg tracking-widest animate-pulse">
                                {formattedTimeLeft}
                            </span>
                        )}
                    </div>
                )}

                {/* ── Live Number Banner ── */}
                {currentGame.status !== 'waiting' && (
                    <div className={cn(
                        "rounded-2xl py-2 px-4 shadow-xl relative overflow-hidden transition-all duration-500",
                        bannerColor
                    )}>
                        <div className="absolute inset-0 bg-white/10 pointer-events-none" />
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
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                    {isGameFinished ? 'Game Finished' : 'Drawing first number...'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Card + Called Numbers ── */}
                <div className="flex gap-2.5 items-start justify-center min-h-[320px]">
                    {currentGame.selectedCard ? (
                        <div className="flex-1">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-center">
                                🎟 Your Card
                            </div>
                            <BingoCard
                                grid={currentGame.selectedCard.numbers}
                                calledNumbers={calledNumbers}
                                newlyCalledNumber={newlyCalledNumber}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 aspect-[4/5] bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-inner">
                            <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-full">
                                <Users className="w-10 h-10 text-primary-300" />
                            </div>
                            <h3 className="font-black text-primary-900 uppercase">Spectator</h3>
                            <p className="text-xs text-slate-400">You didn't join this round.</p>
                        </div>
                    )}
                    <CalledNumbers numbers={calledNumbers} />
                </div>

                {/* ── BINGO Button ── */}
                <div className="pt-1 pb-4">
                    {currentGame.selectedCard ? (
                        <Button
                            onClick={handleBingo}
                            disabled={isValidating || !isGamePlaying || !!winnerDetails}
                            className={cn(
                                "w-full h-14 font-black text-xl rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3",
                                isGamePlaying && !winnerDetails
                                    ? "bg-accent-500 hover:bg-accent-600 text-white animate-pulse"
                                    : "bg-slate-200 text-slate-400",
                            )}
                        >
                            {isValidating ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    CHECKING...
                                </>
                            ) : winnerDetails ? (
                                'GAME OVER 🏆'
                            ) : isGameFinished ? (
                                'GAME ENDED'
                            ) : !isGamePlaying ? (
                                'WAITING TO START'
                            ) : (
                                '🎱 BINGO!'
                            )}
                        </Button>
                    ) : null}
                </div>
            </main>

            <WinnerPopup
                isOpen={isWinnerPopupOpen}
                prize={currentGame.totalPot * 0.85}
                isWinner={winnerDetails?.isMe ?? false}
                winnerName={winnerDetails?.name}
                gameId={gameId}
                calledNumbers={calledNumbers}
            />
        </div>
    );
}

// ─── Sound ──────────────────────────────────────────────────────────────────
function playCallSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {
        // Audio not available in this context, ignore silently
    }
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

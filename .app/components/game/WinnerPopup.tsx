"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Trophy, ArrowRight, Coins, XCircle, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/useGameStore";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WinnerInfo {
    userId: string;
    username: string;
    position: number;
    cardNumbers: number[];     // flat 25-element array, 0 = FREE
    winningLine: number[];     // indices of winning cells (0-24)
}

interface WinnerPopupProps {
    isOpen: boolean;
    prize: number;
    isWinner: boolean;
    winnerName?: string;
    gameId?: string;
    calledNumbers?: number[];
    countdown: number;
    onRedirect: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const WINNING_PATTERNS = [
    // Rows
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    // Columns
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    // Diagonals
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
];

function findWinningLine(cardNumbers: number[], calledNums: number[]): number[] {
    const calledSet = new Set(calledNums);
    for (const pattern of WINNING_PATTERNS) {
        const isWin = pattern.every(idx => idx === 12 || calledSet.has(cardNumbers[idx]));
        if (isWin) return pattern;
    }
    return [];
}

function getBingoLetterForCol(col: number) {
    return ['B', 'I', 'N', 'G', 'O'][col];
}

// ── Mini Bingo Card ───────────────────────────────────────────────────────────
function WinnerCard({ winner, calledNumbers }: { winner: WinnerInfo; calledNumbers: number[] }) {
    const winLine = winner.winningLine.length > 0
        ? winner.winningLine
        : findWinningLine(winner.cardNumbers, calledNumbers);

    return (
        <div className="bg-white rounded-3xl border-2 border-amber-200 overflow-hidden shadow-lg shadow-amber-100/50 flex-shrink-0 w-full">
            {/* Winner name badge */}
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                    {winner.position === 1
                        ? <Crown className="w-4 h-4 text-white drop-shadow" />
                        : <Trophy className="w-4 h-4 text-white/70" />
                    }
                    <span className="font-black text-white text-sm uppercase tracking-wide drop-shadow-sm">
                        {winner.username}
                    </span>
                </div>
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest bg-black/10 px-2 py-0.5 rounded-full">
                    #{winner.position} WINNER
                </span>
            </div>

            {/* Card grid */}
            <div className="p-3 space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-5 gap-1">
                    {['B', 'I', 'N', 'G', 'O'].map(l => (
                        <div key={l} className="text-center text-[10px] font-black text-amber-500 tracking-widest">{l}</div>
                    ))}
                </div>

                {/* 5×5 grid (row-major) */}
                <div className="grid grid-cols-5 gap-1">
                    {winner.cardNumbers.map((num, idx) => {
                        const isWinCell = winLine.includes(idx);
                        const isFree = idx === 12;
                        const isCalled = isFree || new Set(calledNumbers).has(num);

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "aspect-square rounded-lg flex items-center justify-center text-xs font-black transition-all",
                                    isWinCell
                                        ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-300/60 scale-105 ring-2 ring-amber-300"
                                        : isCalled
                                            ? "bg-primary-100 text-primary-700"
                                            : "bg-slate-50 text-slate-400"
                                )}
                            >
                                {isFree ? "★" : num}
                            </div>
                        );
                    })}
                </div>

                {/* Winning line label */}
                {winLine.length > 0 && (
                    <div className="flex items-center justify-center gap-1 pt-1">
                        <div className="h-px flex-1 bg-amber-200" />
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">BINGO!</span>
                        <div className="h-px flex-1 bg-amber-200" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Popup ────────────────────────────────────────────────────────────────
export function WinnerPopup({ isOpen, prize, isWinner, winnerName, gameId, calledNumbers = [], countdown, onRedirect }: WinnerPopupProps) {
    const [winners, setWinners] = useState<WinnerInfo[]>([]);
    const [loadingWinners, setLoadingWinners] = useState(false);
    const { userId, initSession } = useGameStore();

    // 1. Refresh balance & fetch all winners when popup opens
    useEffect(() => {
        if (!isOpen) return;

        if (userId) initSession(userId);

        if (gameId) {
            setLoadingWinners(true);
            supabase
                .from('game_winners')
                .select(`
                    position,
                    user_id,
                    room_cards!inner(card_numbers)
                `)
                .eq('room_id', gameId)
                .order('position', { ascending: true })
                .then(async ({ data: winData }) => {
                    if (!winData) return;

                    // Fetch usernames from profiles table
                    const userIds = winData.map((w: any) => w.user_id);
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('id, username')
                        .in('id', userIds);

                    const profileMap: Record<string, string> = {};
                    (profileData || []).forEach((p: any) => {
                        profileMap[p.id] = p.username || 'Player';
                    });

                    const enriched: WinnerInfo[] = winData.map((w: any) => {
                        const cardNums: number[] = (w.room_cards as any).card_numbers || [];
                        const winLine = findWinningLine(cardNums, calledNumbers);
                        return {
                            userId: w.user_id,
                            username: profileMap[w.user_id] || 'Player',
                            position: w.position,
                            cardNumbers: cardNums,
                            winningLine: winLine,
                        };
                    });

                    setWinners(enriched);
                    setLoadingWinners(false);
                });
        }
    }, [isOpen, gameId, userId]);



    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md border-none bg-slate-50 overflow-hidden text-center p-0 rounded-[2.5rem] shadow-2xl max-w-[90vw] max-h-[92vh] flex flex-col">

                {/* ── Header ── */}
                <div className={cn(
                    "h-28 flex items-center justify-center relative overflow-hidden transition-colors duration-700 shrink-0",
                    isWinner ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600" : "bg-slate-800"
                )}>
                    {/* Decorative blobs */}
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-1/2 translate-y-1/2 animate-pulse delay-700" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-1">
                        {isWinner ? (
                            <>
                                <Trophy className="w-10 h-10 text-white animate-bounce drop-shadow-lg" />
                                <span className="text-2xl font-black text-white uppercase italic tracking-tight drop-shadow">🎉 YOU WON!</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-10 h-10 text-slate-400 animate-in zoom-in duration-500" />
                                <span className="text-2xl font-black text-white uppercase italic tracking-tight">GAME OVER</span>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 space-y-4 min-h-0">

                    {/* Winner prize (for winner only) */}
                    {isWinner && (
                        <div className="bg-white border-2 border-amber-100 rounded-2xl p-4 flex items-center justify-center gap-3 shadow-sm">
                            <Coins className="w-7 h-7 text-amber-500" />
                            <div>
                                <div className="text-3xl font-black text-primary-900 leading-none">{prize.toFixed(0)}</div>
                                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Birr Added to Wallet</div>
                            </div>
                        </div>
                    )}

                    {/* Caption for losers */}
                    {!isWinner && (
                        <div className="text-center space-y-1">
                            <p className="text-sm font-black text-slate-600 uppercase tracking-wide">
                                {winnerName ? `${winnerName}` : 'Someone'} shouted BINGO!
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">See their winning card{winners.length > 1 ? 's' : ''} below</p>
                        </div>
                    )}

                    {/* Winner Cards — scrollable list */}
                    {loadingWinners ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : winners.length > 0 ? (
                        <div className="space-y-4">
                            {winners.map((w) => (
                                <WinnerCard key={w.userId} winner={w} calledNumbers={calledNumbers} />
                            ))}
                        </div>
                    ) : (
                        /* Fallback if no card data yet (e.g. spectators) */
                        !isWinner && (
                            <div className="bg-slate-100 rounded-2xl p-5 text-center">
                                <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-400 uppercase">Better luck next time!</p>
                            </div>
                        )
                    )}

                    {/* ── Actions ── */}
                    <div className="space-y-2 pt-2">
                        <Button
                            onClick={onRedirect}
                            className={cn(
                                "w-full h-12 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 group",
                                isWinner
                                    ? "bg-primary-900 hover:bg-black shadow-primary-900/20"
                                    : "bg-slate-800 hover:bg-black shadow-slate-900/20"
                            )}
                        >
                            GO TO LOBBY <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">
                            Redirecting in {countdown}s...
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

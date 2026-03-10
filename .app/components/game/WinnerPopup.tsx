"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Trophy, ArrowRight, Coins, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/useGameStore";

interface WinnerPopupProps {
    isOpen: boolean;
    prize: number;
    isWinner: boolean;
    winnerName?: string;
}

export function WinnerPopup({ isOpen, prize, isWinner, winnerName }: WinnerPopupProps) {
    const router = useRouter();
    const [countdown, setCountdown] = useState(4);

    const { leaveGame } = useGameStore();

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isOpen && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev: number) => prev - 1);
            }, 1000);
        } else if (isOpen && countdown === 0) {
            leaveGame();
            router.push("/lobby");
        }
        return () => clearInterval(timer);
    }, [isOpen, countdown, router, leaveGame]);

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md border-none bg-slate-50 overflow-hidden text-center p-0 rounded-[2.5rem] shadow-2xl max-w-[90vw]">
                {/* Header Section */}
                <div className={cn(
                    "h-32 flex items-center justify-center relative overflow-hidden transition-colors duration-700",
                    isWinner ? "bg-hero-gradient" : "bg-slate-200 dark:bg-slate-800"
                )}>
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-1/2 translate-y-1/2 animate-pulse delay-700" />
                    </div>
                    {isWinner ? (
                        <Trophy className="w-16 h-16 text-white animate-bounce drop-shadow-lg" />
                    ) : (
                        <XCircle className="w-16 h-16 text-slate-400 animate-in zoom-in duration-500" />
                    )}
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <h2 className={cn(
                            "text-4xl font-black tracking-tighter uppercase italic",
                            isWinner ? "text-primary-900" : "text-slate-400"
                        )}>
                            {isWinner ? "🎉 YOU WON! 🎉" : "GAME OVER"}
                        </h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                            {isWinner
                                ? "Your luck has truly paid off!"
                                : winnerName ? `${winnerName} completed BINGO!` : "Someone else shouted BINGO!"
                            }
                        </p>
                    </div>

                    {isWinner && (
                        <div className="bg-white border-2 border-primary-100 rounded-3xl p-6 flex flex-col items-center gap-2 shadow-sm">
                            <div className="flex items-center gap-2 text-5xl font-black text-primary-900">
                                <Coins className="w-8 h-8 text-secondary-500" />
                                <span>{prize}</span>
                            </div>
                            <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest shrink-0">Birr Added to Wallet</span>
                        </div>
                    )}

                    {!isWinner && (
                        <div className="bg-slate-100/50 border border-slate-200 rounded-3xl p-6 flex flex-col items-center gap-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Better luck next time!</p>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay tuned for the next game</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Button
                            onClick={() => {
                                leaveGame();
                                router.push("/lobby");
                            }}
                            className={cn(
                                "w-full h-14 text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-95 group",
                                isWinner
                                    ? "bg-primary-900 hover:bg-black shadow-primary-900/20"
                                    : "bg-slate-800 hover:bg-black shadow-slate-900/20"
                            )}
                        >
                            GO TO LOBBY <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
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

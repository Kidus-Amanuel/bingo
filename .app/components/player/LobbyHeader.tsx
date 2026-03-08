"use client"

import { useGameStore } from "@/stores/useGameStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Wallet, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface LobbyHeaderProps {
    showBack?: boolean;
    onBack?: () => void;
}

export function LobbyHeader({ showBack, onBack }: LobbyHeaderProps) {
    const { balance } = useGameStore();

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                {showBack && (
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"
                        aria-label="Back"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-primary-100">
                        <AvatarImage src="/avatar-placeholder.png" alt="Player" />
                        <AvatarFallback className="bg-primary-50 text-primary-600 font-bold">JD</AvatarFallback>
                    </Avatar>
                    <span className="font-black text-primary-900 tracking-tight hidden sm:block uppercase">Bingo</span>
                </div>
            </div>

            <div className="flex items-center gap-2 bg-success-500 text-white px-4 py-1.5 rounded-full font-bold shadow-lg shadow-success-200 transition-all hover:scale-105 select-none cursor-pointer">
                <Wallet className="w-4 h-4" />
                <span>{balance.toLocaleString()} Birr</span>
            </div>
        </header>
    );
}

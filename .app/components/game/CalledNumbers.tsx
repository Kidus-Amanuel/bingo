"use client"

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface CalledNumbersProps {
    numbers: number[];
}

export function CalledNumbers({ numbers }: CalledNumbersProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0; // Always show latest at top
        }
    }, [numbers]);

    const getBingoLetter = (num: number) => {
        if (num <= 15) return 'B';
        if (num <= 30) return 'I';
        if (num <= 45) return 'N';
        if (num <= 60) return 'G';
        return 'O';
    };

    const getLetterColor = (letter: string) => {
        switch (letter) {
            case 'B': return 'text-blue-500 bg-blue-50 border-blue-100';
            case 'I': return 'text-red-500 bg-red-50 border-red-100';
            case 'N': return 'text-amber-500 bg-amber-50 border-amber-100';
            case 'G': return 'text-green-500 bg-green-50 border-green-100';
            case 'O': return 'text-purple-500 bg-purple-50 border-purple-100';
            default: return 'text-slate-500 bg-slate-50 border-slate-100';
        }
    };

    return (
        <div className="w-16 h-[380px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-xl sm:w-20">
            <div className="bg-slate-50 py-2 border-b border-slate-200 dark:border-slate-800 text-[8px] font-black text-slate-400 text-center uppercase tracking-widest shrink-0">
                Calls
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-2 space-y-2 scroll-smooth no-scrollbar"
            >
                {numbers.slice().reverse().map((num, i) => {
                    const letter = getBingoLetter(num);
                    const colorClasses = getLetterColor(letter);

                    return (
                        <div
                            key={`${num}-${i}`}
                            className={cn(
                                "aspect-square rounded-2xl flex flex-col items-center justify-center font-black transition-all duration-500 animate-in fade-in zoom-in slide-in-from-top-2 border shrink-0",
                                i === 0
                                    ? "bg-primary-900 text-white shadow-lg scale-105 z-10 border-primary-800"
                                    : cn("opacity-60", colorClasses)
                            )}
                        >
                            <span className={cn("text-[8px] sm:text-[10px] uppercase", i === 0 ? "text-primary-400" : "")}>{letter}</span>
                            <span className="text-sm sm:text-base leading-none">{num}</span>
                        </div>
                    );
                })}
                {numbers.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" />
                    </div>
                )}
            </div>
        </div>
    );
}

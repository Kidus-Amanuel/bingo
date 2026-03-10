"use client"

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface BingoCardProps {
    grid: (number | 'FREE')[][];
    calledNumbers?: number[];
    newlyCalledNumber?: number | null;
}

const HEADERS = [
    { char: 'B', color: 'bg-blue-500',   text: 'text-blue-600',   border: 'border-blue-300',   hit: 'bg-blue-500 border-blue-600 shadow-blue-200' },
    { char: 'I', color: 'bg-red-500',    text: 'text-red-600',    border: 'border-red-300',    hit: 'bg-red-500 border-red-600 shadow-red-200' },
    { char: 'N', color: 'bg-amber-500',  text: 'text-amber-600',  border: 'border-amber-300',  hit: 'bg-amber-500 border-amber-600 shadow-amber-200' },
    { char: 'G', color: 'bg-green-500',  text: 'text-green-600',  border: 'border-green-300',  hit: 'bg-green-500 border-green-600 shadow-green-200' },
    { char: 'O', color: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-300', hit: 'bg-purple-500 border-purple-600 shadow-purple-200' },
];

export function BingoCard({ grid, calledNumbers = [], newlyCalledNumber = null }: BingoCardProps) {
    const calledSet = new Set(calledNumbers);
    const [flashCell, setFlashCell] = useState<string | null>(null);
    const prevNewRef = useRef<number | null>(null);

    // When a new number is called, flash any matching cell for 1.2s
    useEffect(() => {
        if (!newlyCalledNumber || newlyCalledNumber === prevNewRef.current) return;
        prevNewRef.current = newlyCalledNumber;

        // Find matching cell key (data is column-major: grid[col][row])
        for (let c = 0; c < 5; c++) {
            for (let r = 0; r < 5; r++) {
                if (grid[c] && grid[c][r] === newlyCalledNumber) {
                    setFlashCell(`${c}-${r}`);
                    setTimeout(() => setFlashCell(null), 1200);
                    return;
                }
            }
        }
    }, [newlyCalledNumber, grid]);

    return (
        <div className="w-full max-w-[340px] mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-3 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* BINGO Header */}
            <div className="grid grid-cols-5 gap-1.5 mb-2">
                {HEADERS.map((h) => (
                    <div
                        key={h.char}
                        className={cn("text-center font-black text-xl tracking-tighter py-1 rounded-xl", h.text)}
                    >
                        {h.char}
                    </div>
                ))}
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-5 gap-1.5">
                {[0, 1, 2, 3, 4].map((rowIndex) =>
                    [0, 1, 2, 3, 4].map((colIndex) => {
                        const cell = grid[colIndex]?.[rowIndex];
                        const isFree = cell === 'FREE';
                        const isHit = !isFree && calledSet.has(cell as number);
                        const isFlashing = flashCell === `${colIndex}-${rowIndex}`;
                        const h = HEADERS[colIndex];

                        return (
                            <div
                                key={`${colIndex}-${rowIndex}`}
                                className={cn(
                                    "aspect-square rounded-xl flex items-center justify-center font-black text-base transition-all duration-300 relative overflow-hidden border-2",
                                    isFree
                                        ? "bg-amber-400 border-amber-500 text-white shadow-lg shadow-amber-100"
                                        : isHit
                                            ? cn("text-white border-transparent shadow-lg scale-105 z-10", h.hit)
                                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-700",
                                    isFlashing && "ring-4 ring-white ring-offset-2 ring-offset-primary-500 animate-bounce"
                                )}
                            >
                                {isFree ? (
                                    <StarIcon className="w-5 h-5 fill-white text-white" />
                                ) : (
                                    <>
                                        {cell}
                                        {isHit && (
                                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-white/50 rounded-full animate-ping" />
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function StarIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}

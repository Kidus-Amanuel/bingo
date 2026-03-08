"use client"

import { cn } from "@/lib/utils";
import { useState } from "react";

interface BingoCardProps {
    grid: (number | 'FREE')[][];
}

export function BingoCard({ grid }: BingoCardProps) {
    const [marked, setMarked] = useState<Set<string>>(new Set(['2-2'])); // FREE space is at 2,2

    const toggleMark = (row: number, col: number) => {
        const key = `${row}-${col}`;
        const newMarked = new Set(marked);
        if (newMarked.has(key)) {
            newMarked.delete(key);
        } else {
            newMarked.add(key);
        }
        setMarked(newMarked);
    };

    const headers = [
        { char: 'B', color: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-50' },
        { char: 'I', color: 'bg-red-500', text: 'text-red-600', border: 'border-red-200', light: 'bg-red-50' },
        { char: 'N', color: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', light: 'bg-amber-50' },
        { char: 'G', color: 'bg-green-500', text: 'text-green-600', border: 'border-green-200', light: 'bg-green-50' },
        { char: 'O', color: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200', light: 'bg-purple-50' },
    ];

    // Transpose back if necessary, but here we assume grid is row-based as passed from GamePage
    // However, the Lobby transposed it for preview. Let's make sure GamePage passes it correctly.

    return (
        <div className="w-full max-w-[340px] mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-3 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="grid grid-cols-5 gap-1.5 mb-2">
                {headers.map((h) => (
                    <div key={h.char} className={cn("text-center font-black text-xl tracking-tighter py-1 rounded-xl", h.text)}>
                        {h.char}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-5 gap-1.5">
                {grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                        const isMarked = marked.has(`${rowIndex}-${colIndex}`);
                        const isFree = cell === 'FREE';
                        const h = headers[colIndex];

                        return (
                            <button
                                key={`${rowIndex}-${colIndex}`}
                                onClick={() => toggleMark(rowIndex, colIndex)}
                                className={cn(
                                    "aspect-square rounded-xl flex items-center justify-center font-black text-base transition-all active:scale-90 relative overflow-hidden text-center border-2",
                                    isMarked
                                        ? cn(h.color, "text-white border-transparent shadow-lg scale-105 z-10")
                                        : cn("bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-700 hover:border-slate-200"),
                                    isFree && !isMarked && "bg-amber-50 text-amber-600 border-amber-200 border-dashed"
                                )}
                            >
                                {isFree ? (
                                    <StarIcon className={cn("w-5 h-5", isMarked ? "fill-white text-white" : "fill-amber-400 text-amber-400")} />
                                ) : (
                                    cell
                                )}
                                {isMarked && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white/40 rounded-full animate-ping" />
                                )}
                            </button>
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
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}

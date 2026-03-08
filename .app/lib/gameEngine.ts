/**
 * 🎱 Bingo Pro: Core Game Engine Logic
 * Handles card generation, hashing, and winner detection.
 */

export type BingoGrid = (number | "FREE")[][];

export const BINGO_RANGES = {
    B: { min: 1, max: 15 },
    I: { min: 16, max: 30 },
    N: { min: 31, max: 45 },
    G: { min: 46, max: 60 },
    O: { min: 61, max: 75 },
};

/**
 * Generates a standard 5x5 Bingo Card following B-I-N-G-O rules.
 */
export function generateBingoCard(): BingoGrid {
    const grid: BingoGrid = [[], [], [], [], []];
    const columns = ["B", "I", "N", "G", "O"] as const;

    columns.forEach((col, colIndex) => {
        const range = BINGO_RANGES[col];
        const numbers: number[] = [];

        while (numbers.length < 5) {
            const num = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        }

        // Sort numbers within the column for a "nice" professional look
        numbers.sort((a, b) => a - b);

        numbers.forEach((num, rowIndex) => {
            if (colIndex === 2 && rowIndex === 2) {
                grid[rowIndex][colIndex] = "FREE";
            } else {
                grid[rowIndex][colIndex] = num;
            }
        });
    });

    return grid;
}

/**
 * Calculates a unique string hash for a bingo grid to ensure uniqueness in DB.
 */
export function calculateGridHash(grid: BingoGrid): string {
    return grid.flat().join(",");
}

/**
 * Checks if a given card has a winning BINGO pattern.
 * Supports: 5 Rows, 5 Columns, and 2 Diagonals.
 */
export function checkBingoWinner(grid: BingoGrid, drawnNumbers: number[]): boolean {
    const isMarked = (cell: number | "FREE") => cell === "FREE" || drawnNumbers.includes(cell);

    // 1. Check Rows
    for (let y = 0; y < 5; y++) {
        if (grid[y].every(isMarked)) return true;
    }

    // 2. Check Columns
    for (let x = 0; x < 5; x++) {
        let win = true;
        for (let y = 0; y < 5; y++) {
            if (!isMarked(grid[y][x])) {
                win = false;
                break;
            }
        }
        if (win) return true;
    }

    // 3. Check Diagonals
    // Top-Left to Bottom-Right
    if ([0, 1, 2, 3, 4].every(i => isMarked(grid[i][i]))) return true;

    // Top-Right to Bottom-Left
    if ([0, 1, 2, 3, 4].every(i => isMarked(grid[i][4 - i]))) return true;

    return false;
}

/**
 * Picks a unique random number that hasn't been drawn yet.
 * Returns null if all 75 numbers have been drawn.
 */
export function drawNextNumber(alreadyDrawn: number[]): number | null {
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    const available = allNumbers.filter(n => !alreadyDrawn.includes(n));

    if (available.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
}

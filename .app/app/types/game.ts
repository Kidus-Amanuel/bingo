export interface BingoCard {
    id: string;
    numbers: (number | "FREE")[][];
}

export interface Game {
    gameNumber: number;
    gameId: string;
    betAmount: number;
    playersCount: number;
    maxPlayers: number;
    totalPot: number;
    status: "waiting" | "active" | "finished" | "playing";
    timeToStart?: number; // Unix timestamp in milliseconds
    calledNumbers?: number[];
    range: string;
    availableCards: BingoCard[];
    takenCardIds: string[];
}
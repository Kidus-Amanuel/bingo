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
    status: "waiting" | "active" | "finished";
    timeToStart?: number; // seconds
    calledNumbers?: number[];
    range: string;
    availableCards: BingoCard[];
}
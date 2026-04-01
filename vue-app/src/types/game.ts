export type RoomId = string;
export type SessionId = string;

export type Cell = number;

export type ListOfShip = {
  id: number;
  cells: Cell[];
};

export type CellStatus = "kill" | "hit";

export type DamageInfo = {
  cells: Cell[];
  status: CellStatus;
  boardList: Cell[];
  isMyBoard: boolean;
};

export type Shots = {
  id: SessionId;
  cells: Cell[];
  status?: CellStatus;
};

export type ScoresPlayer = {
  shots: Shots[];
  damages: Shots[];
  ships: Shots[];
  miss: Cell[];
  opponentMiss: Cell[];
}

export type GameScoresPlayer = {
  gameScoresPlayer: ScoresPlayer;
  currentPlayerId: SessionId;
  winnerId: SessionId;
}

export type GameScoresMiss = {
  cellId: Cell
  currentPlayerId: SessionId
}

export type GameScoresDamages = {
  damageInfo: DamageInfo
  cellId: Cell
  currentPlayerId: SessionId
}

export type PlayerJoined = {
  gameStarted: boolean
  players: SessionId[]
}

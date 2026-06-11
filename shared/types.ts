import type { GameModeId } from "./game-modes.js";

export type GamePhase =
  | "lobby"
  | "round_intro"
  | "timing"
  | "guessing"
  | "reveal"
  | "match_end";

export type TurnIndex = 0 | 1;

export interface Player {
  id: string;
  name: string;
  matchScore: number;
  isHost: boolean;
  eliminated: boolean;
}

export interface TimerState {
  running: boolean;
  startedAt: number | null;
  stoppedAt: number | null;
  actualMs: number | null;
  hidden: boolean;
}

export interface Guess {
  playerId: string;
  guessMs: number;
  targetPlayerId?: string;
}

export interface RoundResultGuess {
  playerId: string;
  playerName: string;
  guessMs: number;
  diffMs: number;
  targetPlayerId?: string;
  targetPlayerName?: string;
  actualMs?: number;
  stoppedMs?: number;
}

export interface RoundResult {
  actualMs: number | null;
  targetMs: number | null;
  guesses: RoundResultGuess[];
  winnerId: string | null;
  winnerName: string | null;
  isTie: boolean;
  eliminatedId: string | null;
  eliminatedName: string | null;
  message: string | null;
}

export interface RoomState {
  code: string;
  phase: GamePhase;
  gameMode: GameModeId;
  roundNumber: number;
  players: Player[];
  activeDuel: [string, string] | null;
  activePlayerIds: string[];
  spectatorIds: string[];
  currentTurn: TurnIndex | null;
  timer: TimerState;
  guesses: Guess[];
  lastResult: RoundResult | null;
  matchWinnerId: string | null;
  winTarget: number;
  targetMs: number | null;
  guessTargetId: string | null;
  statusMessage: string;
  memoryFlashMs: number;
  screenBlank: boolean;
  guessAnchorMs: number;
  needsGuess: boolean;
  brSequencePlayerId: string | null;
  brSequenceTotal: number;
  brSequenceIndex: number;
}

export interface ClientToServerEvents {
  create_room: (data: { playerName: string }) => void;
  join_room: (data: { code: string; playerName: string }) => void;
  set_game_mode: (data: { mode: GameModeId }) => void;
  start_game: () => void;
  timer_toggle: () => void;
  submit_guess: (data: { guessMs: number }) => void;
  next_round: () => void;
  leave_room: () => void;
}

export interface ServerToClientEvents {
  room_state: (state: RoomState) => void;
  timer_tick: (data: { elapsedMs: number; running: boolean }) => void;
  error: (data: { message: string }) => void;
}

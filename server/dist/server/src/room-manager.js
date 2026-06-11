import { customAlphabet } from "nanoid";
import { GAME_MODES } from "../../shared/game-modes.js";
const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const MEMORY_FLASH_MS = 2000;
const MAX_MS = 9 * 60 * 1000 + 59 * 1000 + 99 * 10;
const GUESS_ANCHOR_MS = 10000;
function emptyTimer() {
    return {
        running: false,
        startedAt: null,
        stoppedAt: null,
        actualMs: null,
        hidden: false,
    };
}
function clampMs(ms) {
    return Math.max(0, Math.min(ms, MAX_MS));
}
function randomTargetMs() {
    const seconds = 4 + Math.floor(Math.random() * 11);
    const centis = Math.floor(Math.random() * 100);
    return seconds * 1000 + centis * 10;
}
export class Room {
    code;
    hostId;
    gameMode = "classic_duel";
    players = new Map();
    phase = "lobby";
    roundNumber = 0;
    activeDuel = null;
    rotationQueue = [];
    currentTurn = null;
    timer = emptyTimer();
    guesses = [];
    lastResult = null;
    matchWinnerId = null;
    targetMs = null;
    guessTargetId = null;
    mindReaderRuns = [];
    brSequence = [];
    brSequenceIndex = 0;
    brRoundResults = new Map();
    blindTargetDiffs = [];
    playerStopTimes = new Map();
    constructor(hostId, hostName) {
        this.code = generateCode();
        this.hostId = hostId;
        this.addPlayer(hostId, hostName, true);
    }
    get modeInfo() {
        return GAME_MODES[this.gameMode];
    }
    get winTarget() {
        return this.modeInfo.winTarget;
    }
    addPlayer(id, name, isHost = false) {
        this.players.set(id, {
            id,
            name: name.trim().slice(0, 20) || "Player",
            matchScore: 0,
            isHost,
            eliminated: false,
        });
    }
    removePlayer(id) {
        const wasHost = this.hostId === id;
        this.players.delete(id);
        this.rotationQueue = this.rotationQueue.filter((pid) => pid !== id);
        this.brSequence = this.brSequence.filter((pid) => pid !== id);
        this.brRoundResults.delete(id);
        if (this.activeDuel) {
            const next = this.activeDuel.map((pid) => (pid === id ? "" : pid));
            if (!next[0] || !next[1]) {
                this.activeDuel = null;
                if (this.phase !== "lobby")
                    this.phase = "lobby";
            }
            else {
                this.activeDuel = next;
            }
        }
        if (wasHost && this.players.size > 0) {
            const nextHost = this.players.values().next().value;
            nextHost.isHost = true;
            this.hostId = nextHost.id;
        }
    }
    getAlivePlayerIds() {
        return [...this.players.values()]
            .filter((p) => !p.eliminated)
            .map((p) => p.id);
    }
    getActivePlayerIds() {
        if (this.gameMode === "battle_royale") {
            return this.brSequencePlayerId ? [this.brSequencePlayerId] : [];
        }
        if (this.gameMode === "sudden_death" && this.activeDuel) {
            return [...this.activeDuel];
        }
        return this.activeDuel ? [...this.activeDuel] : [];
    }
    getSpectatorIds() {
        const active = new Set(this.getActivePlayerIds());
        return [...this.players.keys()].filter((id) => !active.has(id));
    }
    get brSequencePlayerId() {
        if (this.gameMode !== "battle_royale")
            return null;
        return this.brSequence[this.brSequenceIndex] ?? null;
    }
    isScreenBlank(now) {
        if (this.gameMode === "blind_target" && this.phase === "timing")
            return true;
        return this.isTimerHidden(now);
    }
    isTimerHidden(now) {
        if (this.timer.hidden)
            return true;
        if (this.gameMode === "memory_blitz" &&
            this.timer.running &&
            this.timer.startedAt !== null) {
            return now - this.timer.startedAt >= MEMORY_FLASH_MS;
        }
        return false;
    }
    getStatusMessage() {
        switch (this.phase) {
            case "lobby":
                return "Select a mode and start the game";
            case "round_intro":
                return `Round ${this.roundNumber}`;
            case "timing":
                return this.getTimingMessage();
            case "guessing":
                return this.getGuessingMessage();
            case "reveal":
                return "Round results";
            case "match_end":
                return "Match over";
            default:
                return this.modeInfo.name;
        }
    }
    getTimingMessage() {
        if (this.gameMode === "blind_target") {
            return `Stop at ${this.formatMs(this.targetMs ?? 0)} — clock is hidden`;
        }
        if (this.gameMode === "memory_blitz") {
            return "Clock vanishes after 2 seconds — keep the rhythm!";
        }
        const id = this.getCurrentActorId();
        const name = id ? this.players.get(id)?.name : "";
        return `${name}'s turn`;
    }
    getGuessingMessage() {
        if (this.gameMode === "mind_reader" && this.guessTargetId) {
            const name = this.players.get(this.guessTargetId)?.name;
            return `Guess ${name}'s stopped time`;
        }
        return "Guess your stopped time";
    }
    formatMs(ms) {
        const cs = Math.floor(ms / 10) % 100;
        const s = Math.floor(ms / 1000) % 60;
        const m = Math.floor(ms / 60000);
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(cs).padStart(2, "0")}`;
    }
    getCurrentActorId() {
        if (this.gameMode === "battle_royale")
            return this.brSequencePlayerId;
        if (!this.activeDuel || this.currentTurn === null)
            return null;
        return this.activeDuel[this.currentTurn];
    }
    toState() {
        const now = Date.now();
        const timer = { ...this.timer, hidden: this.isTimerHidden(now) };
        return {
            code: this.code,
            phase: this.phase,
            gameMode: this.gameMode,
            roundNumber: this.roundNumber,
            players: [...this.players.values()],
            activeDuel: this.activeDuel,
            activePlayerIds: this.getActivePlayerIds(),
            spectatorIds: this.getSpectatorIds(),
            currentTurn: this.currentTurn,
            timer,
            guesses: [...this.guesses],
            lastResult: this.lastResult,
            matchWinnerId: this.matchWinnerId,
            winTarget: this.winTarget,
            targetMs: this.targetMs,
            guessTargetId: this.guessTargetId,
            statusMessage: this.getStatusMessage(),
            memoryFlashMs: MEMORY_FLASH_MS,
            screenBlank: this.isScreenBlank(now),
            guessAnchorMs: GUESS_ANCHOR_MS,
            needsGuess: this.modeInfo.needsGuess,
            brSequencePlayerId: this.brSequencePlayerId,
            brSequenceTotal: this.brSequence.length,
            brSequenceIndex: this.brSequenceIndex,
        };
    }
    setGameMode(mode) {
        if (this.phase !== "lobby")
            return false;
        this.gameMode = mode;
        return true;
    }
    canStartGame() {
        if (this.phase !== "lobby")
            return false;
        const count = this.players.size;
        if (this.gameMode === "sudden_death")
            return count === 2;
        return count >= this.modeInfo.minPlayers && count <= this.modeInfo.maxPlayers;
    }
    startGame() {
        if (!this.canStartGame())
            return false;
        this.resetMatchScores();
        this.roundNumber = 0;
        this.matchWinnerId = null;
        this.mindReaderRuns = [];
        this.brRoundResults.clear();
        this.blindTargetDiffs = [];
        this.playerStopTimes.clear();
        const ids = [...this.players.keys()];
        if (this.gameMode === "battle_royale") {
            this.activeDuel = null;
            for (const p of this.players.values())
                p.eliminated = false;
        }
        else if (this.gameMode === "sudden_death") {
            this.rotationQueue = [];
            this.activeDuel = [ids[0], ids[1]];
        }
        else {
            this.rotationQueue = ids.slice(2);
            this.activeDuel = [ids[0], ids[1]];
        }
        this.beginRoundIntro();
        return true;
    }
    resetMatchScores() {
        for (const player of this.players.values()) {
            player.matchScore = 0;
            player.eliminated = false;
        }
    }
    beginRoundIntro() {
        this.roundNumber += 1;
        this.phase = "round_intro";
        this.currentTurn = null;
        this.timer = emptyTimer();
        this.guesses = [];
        this.lastResult = null;
        this.guessTargetId = null;
        this.mindReaderRuns = [];
        this.blindTargetDiffs = [];
        this.brRoundResults.clear();
        this.playerStopTimes.clear();
        if (this.gameMode === "blind_target" || this.gameMode === "battle_royale") {
            this.targetMs = randomTargetMs();
        }
        else {
            this.targetMs = null;
        }
        if (this.gameMode === "battle_royale") {
            this.brSequence = this.getAlivePlayerIds();
            this.brSequenceIndex = 0;
        }
    }
    beginRound() {
        this.phase = "timing";
        this.guesses = [];
        this.lastResult = null;
        this.timer = emptyTimer();
        if (this.gameMode === "battle_royale") {
            return;
        }
        this.currentTurn = 0;
    }
    toggleTimer(playerId, now) {
        if (this.phase !== "timing")
            return false;
        if (playerId !== this.getCurrentActorId())
            return false;
        if (!this.timer.running) {
            this.timer.running = true;
            this.timer.startedAt = now;
            this.timer.stoppedAt = null;
            this.timer.actualMs = null;
            this.timer.hidden = this.gameMode === "blind_target";
            return true;
        }
        if (this.timer.startedAt === null)
            return false;
        this.timer.running = false;
        this.timer.stoppedAt = now;
        this.timer.actualMs = now - this.timer.startedAt;
        this.timer.hidden = true;
        this.playerStopTimes.set(playerId, this.timer.actualMs);
        if (this.gameMode === "blind_target") {
            return this.afterBlindTargetStop(playerId);
        }
        if (this.gameMode === "mind_reader") {
            this.guessTargetId = playerId;
            this.phase = "guessing";
            return true;
        }
        if (this.gameMode === "battle_royale") {
            this.phase = "guessing";
            return true;
        }
        this.phase = "guessing";
        return true;
    }
    afterBlindTargetStop(playerId) {
        const stoppedMs = this.timer.actualMs;
        const diffMs = Math.abs(stoppedMs - (this.targetMs ?? 0));
        this.blindTargetDiffs.push({ playerId, diffMs, stoppedMs });
        if (this.blindTargetDiffs.length < 2) {
            this.currentTurn = this.currentTurn === 0 ? 1 : 0;
            this.timer = emptyTimer();
            this.phase = "timing";
            return true;
        }
        this.resolveBlindTargetRound();
        return true;
    }
    advanceBrSequence() {
        this.brSequenceIndex += 1;
        if (this.brSequenceIndex < this.brSequence.length) {
            this.timer = emptyTimer();
            this.guesses = [];
            this.phase = "timing";
            return true;
        }
        this.resolveBrRound();
        return true;
    }
    canSubmitGuess(playerId) {
        if (this.phase !== "guessing")
            return false;
        if (this.guesses.some((g) => g.playerId === playerId))
            return false;
        if (this.gameMode === "mind_reader") {
            return (!!this.guessTargetId &&
                playerId !== this.guessTargetId &&
                !!this.activeDuel?.includes(playerId));
        }
        if (this.gameMode === "battle_royale") {
            return playerId === this.brSequencePlayerId;
        }
        if (this.gameMode === "classic_duel" || this.gameMode === "memory_blitz") {
            return playerId === this.getCurrentActorId();
        }
        if (this.gameMode === "sudden_death") {
            return playerId === this.getCurrentActorId();
        }
        return false;
    }
    submitGuess(playerId, guessMs) {
        if (!this.canSubmitGuess(playerId))
            return false;
        const clamped = clampMs(guessMs);
        const guess = { playerId, guessMs: clamped };
        if (this.gameMode === "mind_reader" && this.guessTargetId) {
            guess.targetPlayerId = this.guessTargetId;
        }
        this.guesses.push(guess);
        if (this.gameMode === "battle_royale") {
            const actualMs = this.timer.actualMs ?? 0;
            this.brRoundResults.set(playerId, {
                actualMs,
                guessMs: clamped,
                diffMs: Math.abs(clamped - actualMs),
            });
            return this.advanceBrSequence();
        }
        if (this.gameMode === "classic_duel" || this.gameMode === "memory_blitz") {
            if (this.guesses.length === 1 && this.currentTurn === 0) {
                this.currentTurn = 1;
                this.timer = emptyTimer();
                this.phase = "timing";
                return true;
            }
            if (this.guesses.length === 2) {
                this.resolveDuelRound();
            }
            return true;
        }
        if (this.gameMode === "mind_reader") {
            const runnerId = this.guessTargetId;
            this.mindReaderRuns.push({
                runnerId,
                actualMs: this.timer.actualMs,
                guesserId: playerId,
                guessMs: clamped,
            });
            if (this.mindReaderRuns.length < 2) {
                this.currentTurn = this.currentTurn === 0 ? 1 : 0;
                this.timer = emptyTimer();
                this.guessTargetId = null;
                this.guesses = [];
                this.phase = "timing";
                return true;
            }
            this.resolveMindReaderRound();
            return true;
        }
        if (this.gameMode === "sudden_death") {
            if (this.guesses.length === 1 && this.currentTurn === 0) {
                this.currentTurn = 1;
                this.timer = emptyTimer();
                this.phase = "timing";
                return true;
            }
            if (this.guesses.length === 2) {
                this.resolveSuddenDeath();
            }
            return true;
        }
        return false;
    }
    resolveDuelRound() {
        if (!this.activeDuel)
            return;
        const entries = this.guesses.map((g) => ({
            playerId: g.playerId,
            guessMs: g.guessMs,
            actualMs: this.playerStopTimes.get(g.playerId) ?? 0,
            stoppedMs: this.playerStopTimes.get(g.playerId) ?? 0,
        }));
        this.finishScoredRound(entries, entries[0]?.actualMs ?? null, null, true);
    }
    resolveBlindTargetRound() {
        const target = this.targetMs;
        const entries = this.blindTargetDiffs.map((d) => ({
            playerId: d.playerId,
            guessMs: d.stoppedMs,
            actualMs: target,
            stoppedMs: d.stoppedMs,
            diffOverride: d.diffMs,
        }));
        this.finishScoredRound(entries.map((e) => ({
            playerId: e.playerId,
            guessMs: e.stoppedMs,
            actualMs: target,
            stoppedMs: e.stoppedMs,
            diffMs: e.diffOverride,
        })), null, target, true);
    }
    resolveBrRound() {
        const entries = [...this.brRoundResults.entries()].map(([id, r]) => ({
            playerId: id,
            guessMs: r.guessMs,
            actualMs: r.actualMs,
            stoppedMs: r.actualMs,
            diffMs: r.diffMs,
        }));
        this.finishEliminationRound(entries, entries[0]?.actualMs ?? null, null);
    }
    resolveMindReaderRound() {
        const entries = this.mindReaderRuns.map((run) => ({
            playerId: run.guesserId,
            guessMs: run.guessMs,
            actualMs: run.actualMs,
            stoppedMs: run.actualMs,
            targetPlayerId: run.runnerId,
        }));
        this.finishScoredRound(entries, this.mindReaderRuns[0]?.actualMs ?? null, null, true);
    }
    resolveSuddenDeath() {
        const entries = this.guesses.map((g) => ({
            playerId: g.playerId,
            guessMs: g.guessMs,
            actualMs: this.playerStopTimes.get(g.playerId) ?? 0,
            stoppedMs: this.playerStopTimes.get(g.playerId) ?? 0,
        }));
        this.finishScoredRound(entries, entries[0]?.actualMs ?? null, null, false, true);
    }
    finishScoredRound(entries, displayActualMs, targetMs, awardPoints, instantWin = false) {
        const results = entries.map((e) => {
            const player = this.players.get(e.playerId);
            const targetPlayer = e.targetPlayerId
                ? this.players.get(e.targetPlayerId)
                : undefined;
            const diffMs = e.diffMs ?? Math.abs(e.guessMs - e.actualMs);
            return {
                playerId: e.playerId,
                playerName: player.name,
                guessMs: e.guessMs,
                diffMs,
                targetPlayerId: e.targetPlayerId,
                targetPlayerName: targetPlayer?.name,
                actualMs: e.actualMs,
                stoppedMs: e.stoppedMs ?? e.actualMs,
            };
        });
        const minDiff = Math.min(...results.map((r) => r.diffMs));
        const winners = results.filter((r) => r.diffMs === minDiff);
        const isTie = winners.length > 1;
        const winnerId = isTie ? null : winners[0]?.playerId ?? null;
        let message = null;
        if (instantWin && winnerId) {
            this.matchWinnerId = winnerId;
            this.players.get(winnerId).matchScore = 1;
            this.phase = "match_end";
            message = "Sudden Death — most accurate guess wins!";
        }
        else if (awardPoints && winnerId) {
            this.players.get(winnerId).matchScore += 1;
            if (this.players.get(winnerId).matchScore >= this.winTarget) {
                this.matchWinnerId = winnerId;
                this.phase = "match_end";
            }
        }
        this.lastResult = {
            actualMs: displayActualMs,
            targetMs,
            guesses: results,
            winnerId: this.phase === "match_end" ? this.matchWinnerId : winnerId,
            winnerName: winnerId ? this.players.get(winnerId)?.name ?? null : null,
            isTie,
            eliminatedId: null,
            eliminatedName: null,
            message,
        };
        if (this.phase !== "match_end") {
            this.timer.hidden = false;
            this.phase = "reveal";
        }
    }
    finishEliminationRound(entries, displayActualMs, targetMs) {
        const results = entries.map((e) => {
            const player = this.players.get(e.playerId);
            const diffMs = e.diffMs ?? Math.abs(e.guessMs - e.actualMs);
            return {
                playerId: e.playerId,
                playerName: player.name,
                guessMs: e.guessMs,
                diffMs,
                actualMs: e.actualMs,
                stoppedMs: e.stoppedMs ?? e.actualMs,
            };
        });
        const maxDiff = Math.max(...results.map((r) => r.diffMs));
        const losers = results.filter((r) => r.diffMs === maxDiff);
        let eliminatedId = null;
        let message = null;
        if (losers.length < results.length) {
            for (const loser of losers) {
                const p = this.players.get(loser.playerId);
                if (p)
                    p.eliminated = true;
            }
            eliminatedId = losers.map((l) => l.playerId).join(",");
            message =
                losers.length === 1
                    ? `${losers[0].playerName} has been eliminated!`
                    : `${losers.map((l) => l.playerName).join(", ")} eliminated!`;
        }
        else {
            message = "Tie — no elimination this round";
        }
        const alive = this.getAlivePlayerIds();
        if (alive.length <= 1) {
            this.matchWinnerId = alive[0] ?? null;
            this.phase = "match_end";
        }
        const bestDiff = Math.min(...results.map((r) => r.diffMs));
        const roundWinner = results.find((r) => r.diffMs === bestDiff);
        this.lastResult = {
            actualMs: displayActualMs,
            targetMs,
            guesses: results,
            winnerId: this.matchWinnerId,
            winnerName: this.matchWinnerId
                ? this.players.get(this.matchWinnerId)?.name ?? null
                : roundWinner?.playerName ?? null,
            isTie: false,
            eliminatedId,
            eliminatedName: eliminatedId
                ? eliminatedId
                    .split(",")
                    .map((id) => this.players.get(id)?.name)
                    .filter(Boolean)
                    .join(", ")
                : null,
            message,
        };
        if (this.phase !== "match_end") {
            this.timer.hidden = false;
            this.phase = "reveal";
        }
    }
    advanceAfterReveal() {
        if (this.phase === "match_end") {
            if (this.gameMode !== "battle_royale" &&
                this.rotationQueue.length > 0 &&
                this.players.size > 2) {
                this.rotateDuelists();
            }
            else {
                this.phase = "lobby";
                this.resetMatchScores();
            }
            return;
        }
        if (this.phase !== "reveal")
            return;
        if (this.gameMode === "battle_royale") {
            const alive = this.getAlivePlayerIds();
            if (alive.length <= 1) {
                this.phase = "match_end";
                return;
            }
            this.brSequence = alive;
            this.brSequenceIndex = 0;
            this.beginRoundIntro();
            return;
        }
        this.beginRoundIntro();
    }
    rotateDuelists() {
        if (!this.activeDuel)
            return;
        const allIds = [...this.players.keys()];
        if (allIds.length <= 2) {
            this.phase = "lobby";
            this.activeDuel = null;
            this.currentTurn = null;
            this.resetMatchScores();
            return;
        }
        const [a, b] = this.activeDuel;
        const queue = [...this.rotationQueue, a, b].filter((id) => this.players.has(id));
        const nextA = queue.shift();
        const nextB = queue.shift() ?? nextA;
        this.rotationQueue = queue;
        this.activeDuel = [nextA, nextB];
        this.resetMatchScores();
        this.beginRoundIntro();
    }
    getElapsedMs(now) {
        if (!this.timer.running || this.timer.startedAt === null) {
            return this.timer.actualMs ?? 0;
        }
        return now - this.timer.startedAt;
    }
    hasRunningTimers() {
        return this.timer.running;
    }
}
export class RoomManager {
    rooms = new Map();
    playerRoom = new Map();
    createRoom(hostId, hostName) {
        const room = new Room(hostId, hostName);
        this.rooms.set(room.code, room);
        this.playerRoom.set(hostId, room.code);
        return room;
    }
    getRoomByCode(code) {
        return this.rooms.get(code.toUpperCase());
    }
    getRoomForPlayer(playerId) {
        const code = this.playerRoom.get(playerId);
        return code ? this.rooms.get(code) : undefined;
    }
    joinRoom(code, playerId, playerName) {
        const room = this.getRoomByCode(code);
        if (!room || room.phase !== "lobby")
            return null;
        if (room.players.size >= room.modeInfo.maxPlayers)
            return null;
        if (room.gameMode === "sudden_death" &&
            room.players.size >= 2) {
            return null;
        }
        room.addPlayer(playerId, playerName);
        this.playerRoom.set(playerId, room.code);
        return room;
    }
    leaveRoom(playerId) {
        const room = this.getRoomForPlayer(playerId);
        if (!room)
            return null;
        room.removePlayer(playerId);
        this.playerRoom.delete(playerId);
        if (room.players.size === 0) {
            this.rooms.delete(room.code);
        }
        return room;
    }
    deleteRoomIfEmpty(room) {
        if (room.players.size === 0) {
            this.rooms.delete(room.code);
        }
    }
}

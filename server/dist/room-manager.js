import { customAlphabet } from "nanoid";
import { GAME_MODES } from "../../shared/game-modes.js";
const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const MEMORY_FLASH_MS = 2000;
const MAX_GUESS_MS = 9 * 60 * 1000 + 59 * 1000 + 99 * 10;
function emptyTimer() {
    return {
        running: false,
        startedAt: null,
        stoppedAt: null,
        actualMs: null,
        hidden: false,
    };
}
function clampGuess(ms) {
    return Math.max(0, Math.min(ms, MAX_GUESS_MS));
}
function randomTargetMs() {
    const seconds = 3 + Math.floor(Math.random() * 13);
    const centis = Math.floor(Math.random() * 100);
    return seconds * 1000 + centis * 10;
}
export class Room {
    code;
    hostId;
    gameMode = "classic";
    players = new Map();
    phase = "lobby";
    roundNumber = 0;
    activeDuel = null;
    rotationQueue = [];
    currentTurn = null;
    timer = emptyTimer();
    playerTimers = {};
    guesses = [];
    lastResult = null;
    matchWinnerId = null;
    targetMs = null;
    guessTargetId = null;
    ghostRuns = [];
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
            name: name.trim().slice(0, 20) || "Hráč",
            matchScore: 0,
            isHost,
            eliminated: false,
        });
    }
    removePlayer(id) {
        const wasHost = this.hostId === id;
        this.players.delete(id);
        this.rotationQueue = this.rotationQueue.filter((pid) => pid !== id);
        delete this.playerTimers[id];
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
        if (this.gameMode === "battle_royale" || this.gameMode === "sudden_death") {
            return this.getAlivePlayerIds();
        }
        if (this.gameMode === "target") {
            return this.getAlivePlayerIds();
        }
        return this.activeDuel ? [...this.activeDuel] : [];
    }
    getSpectatorIds() {
        const active = new Set(this.getActivePlayerIds());
        return [...this.players.keys()].filter((id) => !active.has(id));
    }
    isTimerDisplayHidden(now) {
        if (this.timer.hidden)
            return true;
        if (this.gameMode === "memory" &&
            this.timer.running &&
            this.timer.startedAt !== null) {
            return now - this.timer.startedAt >= MEMORY_FLASH_MS;
        }
        return false;
    }
    isPlayerTimerHidden(playerId, now) {
        const t = this.playerTimers[playerId];
        if (!t)
            return false;
        if (t.hidden)
            return true;
        if (this.gameMode === "memory" && t.running && t.startedAt !== null) {
            return now - t.startedAt >= MEMORY_FLASH_MS;
        }
        return false;
    }
    getStatusMessage() {
        const mode = this.modeInfo.name;
        switch (this.phase) {
            case "lobby":
                return `Lobby — vyber mód a spusť hru`;
            case "round_intro":
                return `${mode} — kolo ${this.roundNumber}`;
            case "timing":
                return this.getTimingMessage();
            case "guessing":
                return this.getGuessingMessage();
            case "reveal":
                return "Výsledky kola";
            case "match_end":
                return "Konec zápasu!";
            default:
                return mode;
        }
    }
    getTimingMessage() {
        if (this.gameMode === "sync" || this.gameMode === "battle_royale" || this.gameMode === "sudden_death") {
            return "Zastav stopky, až budeš ready!";
        }
        if (this.gameMode === "memory") {
            return "Pozor — displej zmizí po 2 sekundách!";
        }
        const name = this.getActivePlayerId()
            ? this.players.get(this.getActivePlayerId())?.name
            : "";
        return `${name} měří čas`;
    }
    getGuessingMessage() {
        if (this.gameMode === "target") {
            return `Tipni cíl: ${this.formatMs(this.targetMs ?? 0)}`;
        }
        if (this.gameMode === "ghost" && this.guessTargetId) {
            const target = this.players.get(this.guessTargetId)?.name;
            return `Tipni čas hráče ${target}`;
        }
        return "Uhodni svůj čas!";
    }
    formatMs(ms) {
        const cs = Math.floor(ms / 10) % 100;
        const s = Math.floor(ms / 1000) % 60;
        const m = Math.floor(ms / 60000);
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(cs).padStart(2, "0")}`;
    }
    toState() {
        const now = Date.now();
        const timer = { ...this.timer };
        timer.hidden = this.isTimerDisplayHidden(now);
        const playerTimers = {};
        for (const [id, t] of Object.entries(this.playerTimers)) {
            playerTimers[id] = {
                ...t,
                hidden: this.isPlayerTimerHidden(id, now),
            };
        }
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
            playerTimers,
            guesses: [...this.guesses],
            lastResult: this.lastResult,
            matchWinnerId: this.matchWinnerId,
            winTarget: this.winTarget,
            targetMs: this.targetMs,
            guessTargetId: this.guessTargetId,
            statusMessage: this.getStatusMessage(),
            memoryFlashMs: MEMORY_FLASH_MS,
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
        const alive = this.players.size;
        return alive >= this.modeInfo.minPlayers;
    }
    startGame() {
        if (!this.canStartGame())
            return false;
        this.resetMatchScores();
        this.roundNumber = 0;
        this.matchWinnerId = null;
        this.ghostRuns = [];
        if (this.usesDuelRotation()) {
            const ids = [...this.players.keys()];
            this.rotationQueue = ids.slice(2);
            this.activeDuel = [ids[0], ids[1]];
        }
        else {
            this.activeDuel = null;
            for (const p of this.players.values()) {
                p.eliminated = false;
            }
        }
        this.beginRoundIntro();
        return true;
    }
    usesDuelRotation() {
        return ["classic", "sync", "ghost", "memory"].includes(this.gameMode);
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
        this.playerTimers = {};
        this.guesses = [];
        this.lastResult = null;
        this.guessTargetId = null;
        this.ghostRuns = [];
        if (this.gameMode === "target") {
            this.targetMs = randomTargetMs();
        }
        else {
            this.targetMs = null;
        }
        if (this.gameMode === "sync" ||
            this.gameMode === "battle_royale" ||
            this.gameMode === "sudden_death") {
            for (const id of this.getActivePlayerIds()) {
                this.playerTimers[id] = emptyTimer();
            }
        }
    }
    beginRound() {
        if (this.gameMode === "target") {
            this.phase = "guessing";
            return;
        }
        this.phase = "timing";
        this.guesses = [];
        this.lastResult = null;
        if (this.gameMode === "classic" || this.gameMode === "memory" || this.gameMode === "ghost") {
            this.currentTurn = 0;
            this.timer = emptyTimer();
        }
        if (this.gameMode === "sync" ||
            this.gameMode === "battle_royale" ||
            this.gameMode === "sudden_death") {
            this.currentTurn = null;
            for (const id of this.getActivePlayerIds()) {
                this.playerTimers[id] = emptyTimer();
            }
        }
    }
    getActivePlayerId() {
        if (!this.activeDuel || this.currentTurn === null)
            return null;
        return this.activeDuel[this.currentTurn];
    }
    toggleTimer(playerId, now) {
        if (this.phase !== "timing")
            return false;
        if (this.usesPerPlayerTimers()) {
            return this.togglePlayerTimer(playerId, now);
        }
        if (playerId !== this.getActivePlayerId())
            return false;
        return this.toggleSharedTimer(now);
    }
    usesPerPlayerTimers() {
        return ["sync", "battle_royale", "sudden_death"].includes(this.gameMode);
    }
    toggleSharedTimer(now) {
        if (!this.timer.running) {
            this.timer.running = true;
            this.timer.startedAt = now;
            this.timer.stoppedAt = null;
            this.timer.actualMs = null;
            this.timer.hidden = false;
            return true;
        }
        if (this.timer.startedAt === null)
            return false;
        this.timer.running = false;
        this.timer.stoppedAt = now;
        this.timer.actualMs = now - this.timer.startedAt;
        this.timer.hidden = true;
        if (this.gameMode === "ghost") {
            const runnerId = this.getActivePlayerId();
            this.guessTargetId = runnerId;
            this.phase = "guessing";
            return true;
        }
        this.phase = "guessing";
        return true;
    }
    togglePlayerTimer(playerId, now) {
        if (!this.getActivePlayerIds().includes(playerId))
            return false;
        const t = this.playerTimers[playerId] ?? emptyTimer();
        if (!t.running) {
            t.running = true;
            t.startedAt = now;
            t.stoppedAt = null;
            t.actualMs = null;
            t.hidden = false;
            this.playerTimers[playerId] = t;
            return true;
        }
        if (t.startedAt === null)
            return false;
        t.running = false;
        t.stoppedAt = now;
        t.actualMs = now - t.startedAt;
        t.hidden = true;
        this.playerTimers[playerId] = t;
        const allStopped = this.getActivePlayerIds().every((id) => {
            const pt = this.playerTimers[id];
            return pt && !pt.running && pt.actualMs !== null;
        });
        if (allStopped) {
            this.phase = "guessing";
        }
        return true;
    }
    canSubmitGuess(playerId) {
        if (this.phase !== "guessing")
            return false;
        if (this.guesses.some((g) => g.playerId === playerId))
            return false;
        if (this.gameMode === "target") {
            return this.getActivePlayerIds().includes(playerId);
        }
        if (this.gameMode === "ghost") {
            if (!this.guessTargetId || !this.activeDuel)
                return false;
            return playerId !== this.guessTargetId && this.activeDuel.includes(playerId);
        }
        if (this.usesPerPlayerTimers()) {
            return this.getActivePlayerIds().includes(playerId);
        }
        if (this.gameMode === "classic" || this.gameMode === "memory") {
            return playerId === this.getActivePlayerId();
        }
        return false;
    }
    submitGuess(playerId, guessMs) {
        if (!this.canSubmitGuess(playerId))
            return false;
        const clamped = clampGuess(guessMs);
        const guess = { playerId, guessMs: clamped };
        if (this.gameMode === "ghost" && this.guessTargetId) {
            guess.targetPlayerId = this.guessTargetId;
        }
        this.guesses.push(guess);
        if (this.gameMode === "classic" || this.gameMode === "memory") {
            if (this.guesses.length === 1 && this.currentTurn === 0) {
                this.currentTurn = 1;
                this.timer = emptyTimer();
                this.phase = "timing";
                return true;
            }
            if (this.guesses.length === 2) {
                this.resolveClassicRound();
            }
            return true;
        }
        if (this.gameMode === "ghost") {
            const runnerId = this.guessTargetId;
            const actualMs = this.timer.actualMs;
            this.ghostRuns.push({
                runnerId,
                actualMs,
                guesserId: playerId,
                guessMs: clamped,
            });
            if (this.ghostRuns.length < 2) {
                this.currentTurn = this.currentTurn === 0 ? 1 : 0;
                this.timer = emptyTimer();
                this.guessTargetId = null;
                this.guesses = [];
                this.phase = "timing";
                return true;
            }
            this.resolveGhostRound();
            return true;
        }
        const expected = this.getActivePlayerIds().length;
        if (this.guesses.length >= expected) {
            this.resolveMultiplayerRound();
        }
        return true;
    }
    resolveClassicRound() {
        if (!this.activeDuel || this.timer.actualMs === null)
            return;
        const actualMs = this.timer.actualMs;
        this.finishRound(this.guesses.map((g) => ({
            playerId: g.playerId,
            guessMs: g.guessMs,
            actualMs,
        })), actualMs, null);
    }
    resolveGhostRound() {
        const guesses = this.ghostRuns.map((run) => ({
            playerId: run.guesserId,
            guessMs: run.guessMs,
            actualMs: run.actualMs,
            targetPlayerId: run.runnerId,
        }));
        const actualMs = this.ghostRuns[0]?.actualMs ?? 0;
        this.finishRound(guesses, actualMs, null);
    }
    resolveMultiplayerRound() {
        if (this.gameMode === "target") {
            const target = this.targetMs;
            this.finishRound(this.guesses.map((g) => ({
                playerId: g.playerId,
                guessMs: g.guessMs,
                actualMs: target,
            })), null, target);
            return;
        }
        const entries = this.guesses.map((g) => {
            const actualMs = this.playerTimers[g.playerId]?.actualMs ?? 0;
            return {
                playerId: g.playerId,
                guessMs: g.guessMs,
                actualMs,
            };
        });
        const firstActual = entries[0]?.actualMs ?? 0;
        this.finishRound(entries, firstActual, null);
    }
    finishRound(entries, displayActualMs, targetMs) {
        const results = entries.map((e) => {
            const player = this.players.get(e.playerId);
            const targetPlayer = e.targetPlayerId
                ? this.players.get(e.targetPlayerId)
                : undefined;
            return {
                playerId: e.playerId,
                playerName: player.name,
                guessMs: e.guessMs,
                diffMs: Math.abs(e.guessMs - e.actualMs),
                targetPlayerId: e.targetPlayerId,
                targetPlayerName: targetPlayer?.name,
                actualMs: e.actualMs,
            };
        });
        const minDiff = Math.min(...results.map((r) => r.diffMs));
        const maxDiff = Math.max(...results.map((r) => r.diffMs));
        const winners = results.filter((r) => r.diffMs === minDiff);
        const isTie = winners.length > 1 && this.gameMode !== "battle_royale";
        const winnerId = isTie ? null : winners[0]?.playerId ?? null;
        let eliminatedId = null;
        let message = null;
        if (this.gameMode === "battle_royale") {
            const losers = results.filter((r) => r.diffMs === maxDiff);
            if (losers.length < results.length) {
                for (const loser of losers) {
                    const p = this.players.get(loser.playerId);
                    if (p)
                        p.eliminated = true;
                }
                eliminatedId = losers.map((l) => l.playerId).join(",");
                message =
                    losers.length === 1
                        ? `${losers[0].playerName} je eliminován!`
                        : `${losers.map((l) => l.playerName).join(", ")} eliminováni!`;
            }
            else {
                message = "Remíza — nikdo nepadá";
            }
            const alive = this.getAlivePlayerIds();
            if (alive.length <= 1) {
                this.matchWinnerId = alive[0] ?? null;
                this.phase = "match_end";
            }
        }
        else if (this.gameMode === "sudden_death") {
            if (winnerId) {
                this.matchWinnerId = winnerId;
                this.players.get(winnerId).matchScore = 1;
                this.phase = "match_end";
                message = "Sudden Death — jedno kolo rozhodlo!";
            }
        }
        else if (winnerId) {
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
            winnerId: this.matchWinnerId && this.phase === "match_end" ? this.matchWinnerId : winnerId,
            winnerName: winnerId ? this.players.get(winnerId)?.name ?? null : null,
            isTie,
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
            for (const id of Object.keys(this.playerTimers)) {
                if (this.playerTimers[id])
                    this.playerTimers[id].hidden = false;
            }
            this.phase = "reveal";
        }
    }
    advanceAfterReveal() {
        if (this.phase === "match_end") {
            if (this.usesDuelRotation()) {
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
            for (const id of alive) {
                this.playerTimers[id] = emptyTimer();
            }
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
    getPlayerElapsedMs(playerId, now) {
        const t = this.playerTimers[playerId];
        if (!t)
            return 0;
        if (!t.running || t.startedAt === null)
            return t.actualMs ?? 0;
        return now - t.startedAt;
    }
    hasRunningTimers() {
        if (this.timer.running)
            return true;
        return Object.values(this.playerTimers).some((t) => t.running);
    }
    getRunningTimerSnapshot(now) {
        const snapshot = {};
        for (const [id, t] of Object.entries(this.playerTimers)) {
            if (t.running) {
                snapshot[id] = {
                    elapsedMs: this.getPlayerElapsedMs(id, now),
                    running: true,
                };
            }
        }
        return snapshot;
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

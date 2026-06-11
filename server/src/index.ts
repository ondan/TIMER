import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import type { GameModeId } from "../../shared/game-modes.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../shared/types.js";
import { RoomManager } from "./room-manager.js";

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

const roomManager = new RoomManager();

function broadcastRoom(roomCode: string): void {
  const room = roomManager.getRoomByCode(roomCode);
  if (!room) return;
  io.to(roomCode).emit("room_state", room.toState());
}

function emitError(socketId: string, message: string): void {
  io.to(socketId).emit("error", { message });
}

io.on("connection", (socket) => {
  socket.on("create_room", ({ playerName }) => {
    const room = roomManager.createRoom(socket.id, playerName);
    socket.join(room.code);
    socket.emit("room_state", room.toState());
  });

  socket.on("join_room", ({ code, playerName }) => {
    const room = roomManager.joinRoom(code, socket.id, playerName);
    if (!room) {
      emitError(socket.id, "Room not found or game already in progress.");
      return;
    }
    socket.join(room.code);
    broadcastRoom(room.code);
  });

  socket.on("set_game_mode", ({ mode }) => {
    const room = roomManager.getRoomForPlayer(socket.id);
    if (!room || room.hostId !== socket.id) {
      emitError(socket.id, "Only the host can change the game mode.");
      return;
    }
    if (!room.setGameMode(mode as GameModeId)) {
      emitError(socket.id, "Cannot change mode right now.");
      return;
    }
    broadcastRoom(room.code);
  });

  socket.on("start_game", () => {
    const room = roomManager.getRoomForPlayer(socket.id);
    if (!room || room.hostId !== socket.id) {
      emitError(socket.id, "Only the host can start the game.");
      return;
    }
    if (!room.startGame()) {
      const { name, minPlayers, maxPlayers } = room.modeInfo;
      emitError(
        socket.id,
        `Cannot start ${name} — needs ${minPlayers}${maxPlayers !== minPlayers ? `–${maxPlayers}` : ""} players.`,
      );
      return;
    }
    broadcastRoom(room.code);
  });

  socket.on("timer_toggle", () => {
    const room = roomManager.getRoomForPlayer(socket.id);
    if (!room) return;

    if (!room.toggleTimer(socket.id, Date.now())) {
      emitError(socket.id, "You cannot control the button right now.");
      return;
    }
    broadcastRoom(room.code);
  });

  socket.on("submit_guess", ({ guessMs }) => {
    const room = roomManager.getRoomForPlayer(socket.id);
    if (!room) return;

    if (!room.submitGuess(socket.id, guessMs)) {
      emitError(socket.id, "Cannot submit guess right now.");
      return;
    }
    broadcastRoom(room.code);
  });

  socket.on("next_round", () => {
    const room = roomManager.getRoomForPlayer(socket.id);
    if (!room || room.hostId !== socket.id) return;

    if (room.phase === "round_intro") {
      room.beginRound();
    } else {
      room.advanceAfterReveal();
    }
    broadcastRoom(room.code);
  });

  socket.on("leave_room", () => {
    const room = roomManager.leaveRoom(socket.id);
    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }
    if (room) {
      roomManager.deleteRoomIfEmpty(room);
      if (room.players.size > 0) {
        broadcastRoom(room.code);
      }
    }
  });

  socket.on("disconnect", () => {
    const room = roomManager.leaveRoom(socket.id);
    if (!room) return;
    if (room.players.size > 0) {
      broadcastRoom(room.code);
    } else {
      roomManager.deleteRoomIfEmpty(room);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const roomCode of io.sockets.adapter.rooms.keys()) {
    if (roomCode.length !== 6) continue;
    const gameRoom = roomManager.getRoomByCode(roomCode);
    if (!gameRoom?.hasRunningTimers()) continue;

    io.to(roomCode).emit("timer_tick", {
      elapsedMs: gameRoom.getElapsedMs(now),
      running: true,
    });
  }
}, 50);

httpServer.listen(PORT, () => {
  console.log(`Guess the Time server running on http://localhost:${PORT}`);
});

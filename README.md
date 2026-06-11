# Guess the Time

Real-time multiplayer party game inspired by the TikTok trend — stop the clock, guess the split, beat your friends.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js (App Router), Tailwind CSS, Shadcn/ui |
| Backend | Node.js, Express, Socket.io |
| Shared | TypeScript types + game mode definitions |

## Quick Start

```bash
npm install
cd server && npm install && cd ..
cd web && npm install && cd ..

npm run dev
```

- **Frontend:** http://localhost:3000  
- **Backend:** http://localhost:3001  

## Project Structure

```
guess-the-time/
├── shared/
│   ├── game-modes.ts      # Mode definitions, rules, difficulty
│   └── types.ts           # RoomState, socket events
├── server/
│   └── src/
│       ├── index.ts       # Socket.io event handlers + timer broadcast
│       └── room-manager.ts # Authoritative game engine
└── web/
    ├── app/               # Next.js pages + global styles
    ├── components/
    │   ├── lobby/         # Lobby, ModeSelector, RulesSidebar
    │   ├── game/          # GameRoom, ArcadeButton, Stopwatch, GuessInput
    │   ├── scoreboard/    # Scoreboard
    │   └── result/        # Results (trophy + elimination UI)
    └── hooks/
        └── useGameSocket.ts
```

## Game Modes

| Mode | Players | Summary |
|------|---------|---------|
| Classic Duel | 2–8 | Turn-based 1v1, guess your stopped time, first to 3 |
| Blind Target | 2–8 | Blank clock, stop at server target, no guessing |
| Memory Blitz | 2–8 | 2s visibility then blackout, guess your stop |
| Mind Reader | 2–8 | Guess opponent's stopped time |
| Battle Royale | 3–8 | Sequential classic turns, worst guess eliminated |
| Sudden Death | 2 | Single 1v1 round, most accurate wins all |

## Socket Events

**Client → Server:** `create_room`, `join_room`, `set_game_mode`, `start_game`, `timer_toggle`, `submit_guess`, `next_round`, `leave_room`

**Server → Client:** `room_state`, `timer_tick`, `error`

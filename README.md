# Crowd Runner

A fast-paced 3D endless runner where you build a crowd by matching shapes. Run through a three-lane corridor, switch between Circle (Blue), Triangle (Red), and Square (Green) to recruit matching NPCs, dodge barriers, and survive increasingly difficult encounters.

---

## Game Concept

**Core Mechanic:** You are a geometric character auto-running down an infinite three-lane track. NPCs of three shapes approach you. Match your current shape to an NPC's shape to recruit them into your following crowd. Mismatch or hit a barrier, and you lose crowd members. Build the largest crowd possible while surviving escalating speed and complexity.

**Shapes & Colors:**
- **Blue Circle** — Tap to cycle
- **Red Triangle** — Tap to cycle
- **Green Square** — Tap to cycle

**Objective:** Maximize crowd size and streak. Game ends when crowd reaches zero after scoring.

---

## Core Gameplay

| System | Description |
|--------|-------------|
| **Auto-run** | Player moves forward automatically at increasing speed |
| **Lane Switching** | Swipe left/right to change between 3 lanes (positions -2.8, 0, +2.8) |
| **Jumping** | Swipe up to jump over low barriers |
| **Shape Switching** | Tap to cycle through Circle → Triangle → Square |
| **NPC Matching** | Same shape = recruit (+1 or +3 for risk); Different shape = penalty |
| **Crowd Growth** | Recruited NPCs follow behind in formation |
| **Obstacles** | Barriers block lanes; must jump or switch lanes |
| **Streak** | Consecutive matches increase streak, speed, and score |
| **Perfect Match** | Match within 0.35s of shape change for bonus effects |
| **Multi-target** | 2-3 NPCs spawn simultaneously in different lanes |
| **Risk/Safe** | Risk targets give +3 crowd but are visually distinct; Safe give +1 |
| **Moving NPCs** | Some NPCs telegraph and change lanes mid-approach |

---

## Game Systems

### Player
- **Entity:** `src/js/entities/Player.js`
- **State:** Lane (0/1/2), Shape Index (0/1/2), Jump Physics, Switch Cooldown
- **Movement:** Smooth lane interpolation (`PLAYER_SWITCH_SPEED`), parabolic jump (`JUMP_FORCE`, `GRAVITY`)
- **Shape Cycling:** Instant mesh replacement with visual pulse feedback

### NPC
- **Entity:** `src/js/entities/NPC.js`
- **Properties:** Shape, Color, Lane, Target Type (safe/risk), Crowd Reward, Moving State
- **Visuals:** Scaled shape mesh (0.85x), animated face (angry/happy), floating label (+1/+3)
- **Behavior:** Bobbing animation, constant rotation, telegraph before lane change, smooth lateral movement with easing
- **Collision:** Swept Z-overlap with vertical tolerance

### Obstacles (Barriers)
- **Entity:** `src/js/entities/Barrier.js`
- **Geometry:** Box (lane-width × 1.4 height × 0.6 depth) + 5 spikes on top
- **Position:** Centered on lane X, ground level Y=0
- **Collision:** Swept Z-overlap; jump clears if player Y > 1.8

### Collision System
- **File:** `src/js/systems/Collision.js`
- **Player ↔ NPC:** Lane match + swept Z overlap + vertical tolerance → match/mismatch
- **Player ↔ Barrier:** Lane match + swept Z overlap + jump height check → crash
- **No NPC ↔ Barrier** gameplay collision (spatial overlap prevented at spawn/movement instead)

### Spawning System
- **File:** `src/js/systems/Spawner.js`
- **Pools:** 20 NPCs, 8 Barriers (object pooling)
- **Intervals:** NPC every ~70 frames, Barrier every ~110 frames (decreases with streak)
- **Minimum Gap:** 30 units between spawns of same type
- **Validation:** All spawns use 3D bounds checking with safety margin

### Moving NPC System
- **Probability:** 7.5% base, increases with streak (max 15%)
- **Telegraph:** 30-unit timer with visual wobble before move
- **Movement:** Starts at 25 units from player, lasts 25 frames, cubic easing
- **Validation:** Pre-spawn target lane check + runtime path validation against barriers

### Crowd System
- **File:** `src/js/entities/Crowd.js`
- **Formation:** Staggered rows (1-2-3-2-3 pattern) across lanes
- **Following:** Smooth position/rotation interpolation behind player
- **Bounce:** Visual feedback on streak milestones (5, 10)

### Streak System
- **Increment:** +1 per successful match
- **Reset:** On mismatch, barrier hit, or game over
- **Speed Formula:** `BASE_SPEED + floor(streak / 10) * 0.01` (capped at 0.85)
- **UI:** Progress bar, milestone popups, camera punch, lighting pulse

### Perfect Match
- **Window:** 0.35 seconds after shape change
- **Rewards:** Audio cue, particle burst, camera punch, lighting flash

### Multi-target Encounters
- **Probability:** 30% base, +1% per streak (max 50%)
- **Count:** 2-3 NPCs
- **Shapes:** Randomized, distinct per target
- **Risk Injection:** 40% chance one target is risk (+3 reward)
- **Stagger:** 8-unit Z offset between targets

### Risk/Safe Encounters
- **Risk Probability:** 40% (after early game)
- **Visual:** Red "+3" label with pulse animation
- **Safe:** Green "+1" label
- **Early Game:** First 30 seconds risk-free

---

## Spawn Safety (Critical)

**Rule:** NPCs and Barriers must NEVER occupy overlapping physical gameplay space.

**Validation Pipeline:**

1. **Bounds Computation**
   - NPC: Shape-specific half-width × visual scale (0.85), centered at clamped lane X, Y=0.5
   - Barrier: Fixed half-width (lane-width × 0.4), height 1.4, depth 0.3, centered at lane X, Y=0

2. **Overlap Test** (`_boundsOverlap`)
   - AABB intersection with configurable safety margin (`MIN_SPAWN_GAP × 0.3 = 9 units`)
   - Checks all 3 axes (X, Y, Z)

3. **Spawn Gates**
   - **Single NPC:** `_isPositionSafeForNPC(lane, z, shape)` vs all active barriers + NPCs
   - **Multi-target:** Same check per target with Z stagger
   - **Moving NPC:** Spawn lane + target lane both validated at spawn Z; runtime path validation during movement
   - **Barrier:** `_isPositionSafeForBarrier(lane, z)` vs all active NPCs + barriers

4. **Fallback:** If no safe lane found, falls back to lane-only Z-gap check (`_canSafelySpawnInLane`), then first valid lane

5. **Moving NPC Runtime:** `_canNPCMoveToLane(npc, targetLane)` samples 5 points along lateral path at NPC's current Z; cancels move if barrier detected

**Lane ≠ Safety:** Same lane is allowed if Z separation + margins clear both objects' bounds. System evaluates X AND Z simultaneously.

---

## Project Structure

```
crowd-runner/
├── index.html                 # Entry HTML
├── package.json               # npm config, scripts, deps
├── vite.config.js             # Vite build config
├── capacitor.config.ts        # Capacitor Android config
├── server.cjs                 # Dev server with SPA fallback
├── src/
│   ├── main.js                # Bootstrap, mounts Game to canvas
│   ├── css/style.css          # Global styles
│   └── js/
│       ├── Game.js            # Main game loop, state machine, system coordination
│       ├── engine/
│       │   ├── Config.js      # All constants (tunable gameplay params)
│       │   ├── ShapeFactory.js # Geometry cache, shape/barrier creation, half-widths
│       │   ├── Input.js       # Touch/mouse swipe + tap detection
│       │   └── ObjectPool.js  # Generic pool (unused, reserved)
│       ├── entities/
│       │   ├── Player.js      # Player character, movement, shape cycling
│       │   ├── NPC.js         # NPC entity, movement, telegraph, lane change
│       │   ├── Barrier.js     # Barrier entity, simple forward movement
│       │   ├── Crowd.js       # Crowd formation, following, bounce
│       │   └── Track.js       # Infinite scrolling track segments
│       ├── systems/
│       │   ├── Spawner.js     # NPC/barrier spawning, pools, SPAWN SAFETY
│       │   ├── Collision.js   # Player-NPC, Player-Barrier collision
│       │   ├── Effects.js     # Particles, trails, screen shake, lighting
│       │   └── Audio.js       # Web Audio API synthesis (no assets)
│       └── ui/
│           └── UI.js          # HUD, menus, streak bar, debug overlay
└── dist/                      # Production build output (gitignored)
```

---

## Development

### Install
```bash
npm install
```

### Dev Server (Hot Reload)
```bash
npm run dev
```
Opens at `http://localhost:5173`

### Production Build
```bash
npm run build
```
Outputs to `dist/`

### Preview Build
```bash
npm run preview
```

### Package.json Scripts
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "cap:add": "capacitor add android",
  "cap:sync": "capacitor sync android",
  "cap:open": "capacitor open android",
  "cap:run": "capacitor run android"
}
```

---

## Android Build (Capacitor)

**Prerequisites:**
- Android Studio with SDK 34+
- JDK 17+
- `ANDROID_HOME` set

**Workflow:**
```bash
# 1. Add Android platform (once)
npm run cap:add

# 2. Build web assets + sync to Android project
npm run build
npm run cap:sync

# 3. Open in Android Studio for signing/APK/AAB
npm run cap:open
```

**Config:** `capacitor.config.ts`
- App ID: `com.savisani.crowdrunner`
- Web Dir: `dist`
- Server: `cleartext: true` for local dev

**Gradle:** `android/app/build.gradle` — configure signing, minSdk 24, targetSdk 34

**Output:** `android/app/build/outputs/apk/release/app-release.apk` or `.aab` for Play Store

---

## Git Workflow

```bash
# Status
git status

# Stage all
git add .

# Commit
git commit -m "Descriptive message"

# Push (main branch)
git push -u origin main
```

**Remote:** `https://github.com/savisani/crowd-runner.git`

**Branch Strategy:** Single `main` branch. Feature work in local commits, push when stable.

---

## Known Issues / Future Improvements

- [ ] **Mobile Touch Tuning** — Swipe thresholds may need per-device calibration
- [ ] **Barrier Variety** — Add rotating, scaling, or multi-lane barriers
- [ ] **Power-ups** — Shield, magnet, score multiplier pickups
- [ ] **Procedural Difficulty** — Dynamic spawn rate based on crowd size, not just streak
- [ ] **Audio Polish** — Layered stems, adaptive music intensity
- [ ] **Visual Polish** — Shader-based glow, motion blur, better particles
- [ ] **Leaderboards** — Backend integration for global scores
- [ ] **Accessibility** — Color-blind mode, reduced motion, haptic feedback

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `npm install` fails | Node version mismatch | Use Node 18+ (LTS) |
| Blank screen on dev | Vite base path / import error | Check browser console; verify `main.js` imports |
| Build fails | TypeScript/ESM issues | `vite.config.js` → `esbuild` target; check imports |
| Mobile controls unresponsive | Touch event not bound | `Input.js` — verify `canvas` ref passed correctly |
| Android build fails | Gradle/SDK mismatch | `capacitor doctor`; sync Android Studio SDK |
| NPC inside barrier | Spawn validation missed case | Check `Spawner._isPositionSafeForNPC` bounds logic |
| Collision feels wrong | Swept Z margins | Tune `NPC_COLLISION_Z_FRONT/BACK`, `BARRIER_COLLISION_Z_FRONT/BACK` |
| Crowd jitter | Formation slots / smoothing | Adjust `Crowd.memberSmoothing`, `laneSmoothing` |
| Stuck on start screen | Audio context not unlocked | Tap screen to unlock `AudioContext` (browser policy) |

---

## Current Feature Status

- [x] Three-lane runner
- [x] Auto-run with speed scaling
- [x] Swipe lane movement (left/right)
- [x] Jump (swipe up)
- [x] Shape switching (tap cycle: Circle→Triangle→Square)
- [x] Blue Circle / Red Triangle / Green Square
- [x] NPC matching (recruit on match)
- [x] Crowd recruitment & formation following
- [x] Streak counter + speed bonus
- [x] Streak progress bar (UI)
- [x] Perfect Match (0.35s window)
- [x] Multi-target encounters (2-3 NPCs)
- [x] Risk/Safe targets (+3/+1 crowd, visual distinction)
- [x] Moving NPCs (telegraph + lateral move)
- [x] Obstacle/Barrier system (jump or dodge)
- [x] Crowd bounce on milestones
- [x] NPC/Barrier spawn separation (3D bounds + safety margin)
- [x] Moving NPC barrier avoidance (runtime path validation)
- [x] Particle effects (match, mismatch, crash, perfect, streak)
- [x] Camera punch / lighting pulse / screen shake
- [x] Procedural audio (Web Audio API, zero assets)
- [x] HUD (score, streak, crowd, shape indicator)
- [x] Start / Game Over screens
- [x] Capacitor Android configuration
- [x] Production build (Vite)

---

## License

MIT — Free to use, modify, distribute.
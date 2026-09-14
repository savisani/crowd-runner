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
| **Perfect Catch** | Match within 0.35s of shape change for bonus effects |
| **Multi-target** | 2-3 NPCs spawn simultaneously in different lanes |
| **Risk/Safe** | Risk targets give +3 crowd but are visually distinct; Safe give +1 |
| **Moving NPCs** | Some NPCs telegraph and change lanes mid-approach |
| **Near Miss** | Narrowly avoid obstacles or mismatched NPCs for feedback |
| **Flow Aura** | 10-streak milestone triggers golden energy aura |
| **Perfect Combo** | Chain perfect matches for escalating rewards |
| **Crowd Formations** | Milestone crowd sizes trigger special formations |
| **Rival Crowd** | Compete against AI runner with their own crowd |
| **Dynamic Music** | Background music intensifies with streak (5, 10, 20, 30+) |

---

## Game Systems

### Player
- **Entity:** `src/js/entities/Player.js`
- **State:** Lane (0/1/2), Shape Index (0/1/2), Jump Physics, Switch Cooldown
- **Movement:** Smooth lane interpolation (`PLAYER_SWITCH_SPEED`), parabolic jump (`JUMP_FORCE`, `GRAVITY`)
- **Shape Cycling:** Instant mesh replacement with visual pulse feedback

### NPC
- **Entity:** `src/js/entities/NPC.js`
- **Properties:** Shape, Color, Lane, Target Type (safe/risk), Crowd Reward, Moving State, Perfect Catch Flag, Near Miss Flag
- **Visuals:** Scaled shape mesh (0.85x), animated face (angry/happy), floating label (+1/+3)
- **Behavior:** Bobbing animation, constant rotation, telegraph before lane change, smooth lateral movement with easing
- **Collision:** Swept Z-overlap with vertical tolerance

### Obstacles (Barriers)
- **Entity:** `src/js/entities/Barrier.js`
- **Geometry:** Box (lane-width × 1.4 height × 0.6 depth) + 5 spikes on top
- **Position:** Centered on lane X, ground level Y=0
- **Collision:** Swept Z-overlap; jump clears if player Y > 1.8

### Rival Crowd
- **Entity:** `src/js/entities/Rival.js`
- **Properties:** Shape, Color, Lane, Crowd Size, Perfect Sequence Progress, Defeat State
- **Visuals:** Runner mesh (same scale as player), red glow ring, small crowd in V formation
- **Behavior:** Auto-runs ahead of player, starts interaction when player approaches, requires perfect match sequence to defeat
- **Rewards:** Defeat grants portion of rival's crowd (up to 3 members)
- **Visuals:** Red glow ring distinguishes rival; small crowd in V formation
- **Rarity:** Rare encounter — adds tension without overwhelming

### Collision System
- **File:** `src/js/systems/Collision.js`
- **Player ↔ NPC:** Lane match + swept Z overlap + vertical tolerance → match/mismatch
- **Player ↔ Barrier:** Lane match + swept Z overlap + jump height check → crash
- **Near Miss Detection:** Proximity check within `NEAR_MISS_DISTANCE` (3.5 units) without collision
- **No NPC ↔ Barrier** gameplay collision (spatial overlap prevented at spawn/movement instead)

### Spawning System
- **File:** `src/js/systems/Spawner.js`
- **Pools:** 20 NPCs, 8 Barriers, 2 Rivals (object pooling)
- **Intervals:** NPC every ~70 frames, Barrier every ~110 frames, Rival every ~500 frames (decreases with streak)
- **Minimum Gap:** 30 units between spawns of same type
- **Validation:** All spawns use 3D bounds checking with safety margin + encounter-level Z separation

### Opening Encounter System
- **Duration:** First ~10 seconds of each run
- **Purpose:** Teach player core mechanics through curated encounters
- **Sequence:** 12 carefully designed steps that introduce NPCs, obstacles, multi-targets, and empty recovery sections
- **Lane Distribution:** Encounters rotate across left, center, and right lanes
- **Transition:** Seamlessly transitions into procedural generation after sequence completes
- **Safety:** No impossible combinations, no spam obstacles, easy-to-understand pacing

### Encounter Variety
- **Lane Distribution:** Weighted randomization ensures encounters spread across all lanes
- **Encounter Types:** Single NPC, multi-target (2-3 NPCs), moving NPC, barrier, empty recovery
- **Safety Gap:** Z-separation ensures clear visual distinction between encounters
- **Risk/Safe:** 40% chance of risk targets (+3 crowd) after early game
- **Multi-target:** 30% base probability, scales with streak
- **Moving NPCs:** 7.5% base probability, telegraph before lane change

### Moving NPC System
- **Probability:** 7.5% base, increases with streak (max 15%)
- **Telegraph:** 30-unit timer with visual wobble before move
- **Movement:** Starts at 25 units from player, lasts 25 frames, cubic easing
- **Validation:** Pre-spawn target lane check + runtime swept-path validation against barriers (10 samples)
- **Visual Separation:** Checks Z-distance to barriers in both start and target lanes during transition

### Crowd System
- **File:** `src/js/entities/Crowd.js`
- **Formation:** 5 followers per row in compact grid behind player
- **Following:** Smooth position/rotation interpolation behind player
- **Bounce:** Visual feedback on streak milestones (5, 10)
- **Milestone Formations:** Special formations at 10 (Tight V), 25 (Wide Spread), 50 (Grand Array) crowd members
- **Object Pooling:** Pre-allocated pool of 50 visible follower meshes; off-screen followers recycled
- **Size:** Followers are 25-40% of player size for clear visual hierarchy
- **Optimization:** Logical crowd count (up to 1000) decoupled from visible rendering (max 50)

### Streak System
- **Increment:** +1 per successful match
- **Reset:** On mismatch, barrier hit, or game over
- **Speed Formula:** `BASE_SPEED + floor(streak / 10) * 0.01` (capped at 0.85)
- **UI:** Progress bar, milestone popups, camera punch, lighting pulse

### Perfect Catch
- **Window:** 0.35 seconds after shape change (configurable: `PERFECT_MATCH_WINDOW`)
- **Requirements:** 
  1. Player shape exactly matches NPC shape
  2. Player changed into that form recently (within window)
  3. Collision/match occurs successfully
  4. NPC is successfully recruited
- **Rewards:** 
  - "PERFECT CATCH!" UI text (distinct from normal streak)
  - Enhanced particle burst (30 particles, radial spread)
  - Distinct audio chord (880→1047→1319→1568 Hz)
  - Stronger camera punch (0.04 intensity, 8 frames)
  - Lighting pulse
- **No gameplay advantage** beyond feedback — streak and crowd rewards unchanged

### Perfect Combo
- **Counter:** Tracks consecutive Perfect Catches
- **Thresholds:**
  - **×3:** "PERFECT COMBO!" — audio fanfare, UI popup
  - **×5:** "UNSTOPPABLE!" — enhanced audio, UI popup
- **Reset:** On normal (non-perfect) match or mismatch (configurable: `PERFECT_COMBO_RESET_ON_NORMAL`)
- **Independence:** Separate from normal streak — normal matches don't break streak, only perfect combo
- **Feedback:** "PERFECT ×N" popup on each perfect match

### Near Miss
- **Trigger:** Player passes within `NEAR_MISS_DISTANCE` (3.5 units) of:
  - Barrier in same lane (while not jumping)
  - Mismatched NPC in same lane
- **Cooldown:** `NEAR_MISS_COOLDOWN_FRAMES` (45 frames) per entity — each object triggers once
- **Priority:** Collision takes precedence — Near Miss never fires after hit
- **Feedback:**
  - "NEAR MISS!" UI text
  - Subtle particle effect (15 particles, amber/orange)
  - Distinct audio cue (660→580 Hz descending)
- **No reward** — purely feedback for mastery recognition

### Near Miss Chain
- **Counter:** Tracks consecutive Near Misses without collision/match
- **Thresholds:**
  - **2:** "RISKY!" — UI popup
  - **3:** "DANGEROUS!" — UI popup
- **Timeout:** `NEAR_MISS_CHAIN_TIMEOUT` (120 frames / ~2 seconds) without new near miss resets chain
- **Reset:** On successful match, collision, or timeout
- **Feedback:** Escalating tension without gameplay penalty

### Multi-target Encounters
- **Probability:** 30% base, +1% per streak (max 50%)
- **Count:** 2-3 NPCs
- **Shapes:** Randomized, distinct per target
- **Risk Injection:** 40% chance one target is risk (+3 reward)
- **Stagger:** 8-unit Z offset between targets
- **Encounter Validation:** Entire group validated against obstacles with `NPC_OBSTACLE_MULTI_TARGET_GAP` (16 units)

### Risk/Safe Encounters
- **Risk Probability:** 40% (after early game)
- **Visual:** Red "+3" label with pulse animation
- **Safe:** Green "+1" label
- **Early Game:** First 30 seconds risk-free

### Milestone Aura System
- **Trigger:** Every 10 streak (10, 20, 30, 40, 50)
- **Level = floor(streak / 10)**
- **Persistence:** Aura level persists until the next milestone (does NOT time out)
- **Player Preservation:** Player shape/color NEVER changes — only surrounding energy changes
- **Level 1 (10 streak):** Medium intensity flame aura — energetic flame movement, moderate particles, bright but controlled, gold-orange energy rising around player
- **Level 2 (20 streak):** Stronger flames + red/orange shift — increased flame size, speed, particle density, glow intensity, vertical height, turbulence
- **Level 3 (30 streak):** Dramatic flames — much taller aura, red/orange core with bright energy tips, larger particles, stronger turbulence, small energy bursts, subtle ground energy effect
- **Level 4 (40 streak):** Intense flames — further increased all parameters, deep red core with yellow-white tips
- **Level 5 (50 streak):** Maximum flames — all parameters at cap, most dramatic visual state
- **Implementation:** Cone-shaped flame tongues arranged around player, animated with flickering, rising motion, and opacity pulsing. Spark particles rise upward. Point light provides glow. All flame meshes use additive blending with depthWrite disabled.
- **UI:** "FLOW LEVEL N" popup on upgrade
- **Gameplay:** No mechanical changes — purely visual celebration

### Aura Architecture
- **Root Cause Fix:** Flame aura meshes are scene children with per-frame position updates relative to player position
- **Aura Light:** PointLight positioned at player location with pulsing intensity
- **Cleanup:** `deactivateFlameAura()` properly hides all meshes, resets opacity, and disables light
- **Reset:** Full cleanup on game restart — no residual effects between runs
- **Coordinate System:** Flame positions calculated in player-local space, then transformed to world space

### Coin System
- **Earned by:** Successful NPC recruitment (matching shape collision)
- **Normal Match:** +1 coin
- **Perfect Match:** +2 coins (configurable: `COIN_PER_PERFECT_MATCH`)
- **NOT awarded for:** Random taps, shape changes without match, obstacle hits, mismatched NPCs
- **HUD:** Coin counter in top-right of HUD (screen-space, immune to camera effects)
- **Animation:** Brief "+N" coin burst animation floats upward on earn
- **Persistence:** Coins persist during current run only. No permanent storage.
- **Visual:** Gold coin icon (CSS-styled) + counter number in HUD

### Cosmic Environment
- **Background:** Deep space environment with stars, planets, moons, nebulae, and distant galaxies
- **Star Fields:** Three layers at different depths for parallax effect (white, blue-tinted, warm-tinted)
- **Planets:** Giant blue planet, red/orange planet, ringed planet — all distant and non-interactive
- **Moons:** Small gray moons scattered in background
- **Nebulae:** Subtle purple/blue gas clouds with additive blending
- **Distant Galaxies:** Circular sprites with faint glow
- **Parallax:** Each layer moves at different speed based on depth multiplier
- **Performance:** Lightweight geometry (low-poly spheres, simple materials) — minimal GPU cost
- **Readability:** Background never interferes with gameplay — track and NPCs remain primary focus

### Crowd Formation Milestones
- **10 Crowd:** "TIGHT V" — compact wedge formation, reduced spacing
- **25 Crowd:** "WIDE SPREAD" — expanded formation with extra rows
- **50 Crowd:** "GRAND ARRAY" — large organized formation, 8 rows
- **Duration:** 3 seconds (`formationDuration`)
- **Transition:** Smooth interpolation between formations
- **Gameplay:** No mechanical changes — visual celebration only

### Virtual Crowd Rendering
- **Architecture:** Logical crowd count (up to 1000) decoupled from visible mesh count (max 50)
- **Object Pool:** Pre-allocated pool of50 follower meshes at initialization
- **Formation:** 5 followers per row in compact grid directly behind player
- **Size:** Followers are 25-40% of player size for clear visual hierarchy
- **Off-Screen Culling:** Followers outside visible Z-range (-2 to +25 units from player) are hidden
- **Recycling:** When follower leaves visible range, its pool slot is reassigned to nearest visible follower
- **Variation:** Small random offsets in position, rotation, and bounce timing for natural appearance
- **Performance:** Only50 meshes active at any time regardless of logical crowd size
- **Milestone Formations:** Temporary formation changes at 10/25/50 crowd members

### Rival Crowd
- **Spawn:** After streak 15, 2% chance per spawn cycle, 300-frame cooldown
- **Behavior:** Runs ahead in random lane, slows to wait for player
- **Interaction:** Activates when player within 25 units
- **Challenge:** Requires 3 consecutive Perfect Catches (`perfectSequenceRequired`)
- **Failure:** Normal match resets sequence; mismatch ends interaction
- **Defeat Reward:** Up to 3 crowd members join player (based on rival crowd size)
- **Visuals:** Red glow ring distinguishes rival; small crowd in V formation
- **Rarity:** Rare encounter — adds tension without overwhelming

### Audio System
- **File:** `src/js/systems/Audio.js`
- **Sound Effects:** Procedurally generated tones for matches, mismatches, jumps, switches, etc.
- **Background Music:** 
  - Generates a simple melodic loop (C4-E4-G4-C5) that loops seamlessly
  - Volume controlled separately from SFX volume
  - Intensity increases with streak (5, 10, 20, 30+) via volume scaling
  - Starts after game initialization (first user interaction)
  - Respects browser audio restrictions (requires user interaction to start)
  - Music and SFX volumes are independent in the HUD/settings

### Effects System
- **File:** `src/js/systems/Effects.js`
- **Particles:** Match, mismatch, crash, perfect, streak, perfect catch, near miss, flow, rival
- **Trails:** Following trails behind the player
- **Screen Shake:** Camera punch effects for streaks and perfect combos
- **Lighting Pulse:** Global lighting intensification on streaks
- **Flow Aura:** As described above (with fixed center)
- **Background:** Scrolling background objects

### UI System
- **File:** `src/js/ui/UI.js`
- **HUD:** Displays score, streak, crowd size, and current shape
- **Menus:** Start screen, game over screen
- **Pop-ups:** Streak updates, near miss, perfect combo, flow aura, rival defeated, milestone celebrations
- **Streak Bar:** Visual progress toward next streak milestone
- **Shape Indicator:** Shows current shape (circle/triangle/square)
- **Audio Settings:** (Planned) Separate sliders for music and SFX volume

---

## HUD Architecture (Fixed)

**Problem:** HUD elements appeared to drift/move with camera shake.

**Root Cause:** `#hud` used `position: absolute` inside `#game-container` (`position: relative`). While camera shake only affects Three.js camera, any transform on the container would affect absolute children.

**Solution:** 
- `#hud` now uses `position: fixed` with `transform: none !important` and `will-change: transform`
- All dynamic popups (`streak-popup`, `near-miss-popup`, `perfect-combo-popup`, `flow-popup`, `rival-popup`, `milestone-title`, `milestone-subtitle`) use `position: fixed` with viewport-relative positioning
- Camera shake/punch only modifies `camera.position` in Three.js — zero DOM impact

**Result:** HUD remains visually locked to screen during:
- Camera shake / punch
- Lane switching
- Jumping
- Perfect Match / Perfect Catch
- Near Miss
- Flow Aura activation
- Window resize / mobile rotation

---

## Spawn Safety (Critical)

**Rule:** NPCs and Barriers must NEVER occupy overlapping physical gameplay space OR create visually ambiguous encounters.

**Validation Pipeline:**

1. **Bounds Computation**
   - NPC: Shape-specific half-width × visual scale (0.85), centered at clamped lane X, Y=0.5
   - Barrier: Fixed half-width (lane-width × 0.4), height 1.4, depth 0.3, centered at lane X, Y=0

2. **Overlap Test** (`_boundsOverlap`)
   - AABB intersection with configurable safety margin (`MIN_SPAWN_GAP × 0.3 = 9 units`)
   - Checks all 3 axes (X, Y, Z)

3. **Encounter-Level Z Separation** (NEW)
   - **Same Lane:** `NPC_OBSTACLE_SAME_LANE_GAP` = 24 units minimum Z separation
   - **Different Lane:** `NPC_OBSTACLE_VISUAL_GAP` = 18 units minimum Z separation  
   - **Multi-target:** `NPC_OBSTACLE_MULTI_TARGET_GAP` = 16 units per target
   - Based on camera perspective (camera at Z=8, FOV 65°): these distances ensure clear visual separation at spawn distance (Z=-55)

4. **Spawn Gates**
   - **Single NPC:** `_findValidEncounterPosition()` — checks encounter zone clearance + bounds
   - **Multi-target:** Validates each target + entire encounter zone against obstacles
   - **Moving NPC:** Spawn lane + target lane both validated; runtime swept-path check (10 samples)
   - **Barrier:** `_findSafeLaneForBarrier()` — checks encounter zone + bounds
   - **Rival:** Lane validation + Z clearance from all active NPCs/barriers

5. **Fallback:** If no safe lane found, falls back to lane-only Z-gap check (`_canSafelySpawnInLane`), then first valid lane

6. **Moving NPC Runtime:** `_canNPCMoveToLane(npc, targetLane)` samples 10 points along lateral path; checks both AABB overlap AND Z-distance to barriers in start/target lanes

**Lane ≠ Safety:** Same lane is allowed if Z separation + margins clear both objects' bounds. System evaluates X AND Z simultaneously.

**Bounded Attempts:** All spawn searches capped at `MAX_SPAWN_ATTEMPTS` (8). Failed searches skip spawn gracefully — never freeze the game.

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
│       │   ├── Rival.js       # Rival runner + crowd entity
│       │   └── Track.js       # Infinite scrolling track segments
│       ├── systems/
│       │   ├── Spawner.js     # NPC/barrier/rival spawning, pools, SPAWN SAFETY
│       │   ├── Collision.js   # Player-NPC, Player-Barrier collision + Near Miss
│       │   ├── Effects.js     # Particles, trails, screen shake, lighting, Flow Aura
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
- [ ] **Audio Polish** — Layered stems, adaptive music intensity (implemented basic intensity via volume)
- [ ] **Visual Polish** — Shader-based glow, motion blur, better particles
- [ ] **Leaderboards** — Backend integration for global scores
- [ ] **Accessibility** — Color-blind mode, reduced motion, haptic feedback
- [ ] **Virtual Crowd Rendering** — Implement system to render limited visible followers while tracking high logical crowd counts (1000+)
- [ ] **Branching Tracks** — Add path selection mechanics with risk/reward choices that merge back to main track

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
- [x] Perfect Catch (0.35s window, distinct feedback)
- [x] Multi-target encounters (2-3 NPCs)
- [x] Risk/Safe targets (+3/+1 crowd, visual distinction)
- [x] Moving NPCs (telegraph + lateral move)
- [x] Obstacle/Barrier system (jump or dodge)
- [x] Crowd bounce on milestones
- [x] NPC/Barrier spawn separation (3D bounds + safety margin)
- [x] Moving NPC barrier avoidance (runtime swept-path validation)
- [x] Encounter-level visual Z separation (camera-aware)
- [x] Near Miss detection (barrier + mismatched NPC)
- [x] Near Miss Chain (2/3 thresholds with escalating feedback)
- [x] Perfect Combo (×3/×5 milestones, independent from streak)
- [x] Milestone Aura System (10/20/30/40/50 streak, persistent flame/energy aura, player shape preserved)
- [x] Crowd Formation Milestones (10/25/50, temporary formations)
- [x] Rival Crowd (rare encounter, perfect sequence challenge, crowd reward)
- [x] HUD fixed positioning (immune to camera shake/punch)
- [x] Coin System (+1 per match, +2 perfect match, HUD counter, burst animation)
- [x] Particle effects (match, mismatch, crash, perfect, streak, perfect catch, near miss, aura, coin, rival)
- [x] Camera punch / lighting pulse / screen shake
- [x] Procedural audio (Web Audio API, zero assets)
- [x] HUD (score, streak, crowd, shape indicator)
- [x] Start / Game Over screens
- [x] Capacitor Android configuration
- [x] Production build (Vite)
- [x] **Dynamic Music** (procedural melodic loop, streak-based intensity)
- [x] Opening encounter system (curated first ~10 seconds)
- [x] Encounter variety (weighted lane distribution, multiple encounter types)
- [x] Virtual crowd rendering (object pooling, off-screen culling, 5-per-row formation)
- [x] Cosmic background environment (stars, planets, nebulae, parallax)
- [x] Aura architecture fix (proper cleanup, no stuck effects)
- [ ] Branching Tracks

---

## License

MIT — Free to use, modify, distribute.
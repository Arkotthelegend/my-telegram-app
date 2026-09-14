# Study Defense

Educational tower defense. Place Sword, Gunner, or Tank by answering a question. Kills add **bounty** (score only — you cannot buy with it).

## Play on your Mac

1. Copy this `tower-defense` folder.
2. `cd tower-defense` then `python3 -m http.server 8080`
3. Open http://localhost:8080

## How to play

1. Pick Sword / Gunner / Tank at the bottom.
2. Tap a grass tile. Answer the question to place that fighter.
3. Tap a fighter you already placed, then answer, to upgrade (max level 3).
4. Survive 8 waves.

## Where to add your own towers, monsters, questions

Edit **[game.js](game.js)** at the top:

- **Towers** — `TOWERS`. Copy a block (`sword`, `gunner`, or `tank`). Set `id`, `name`, `sprite`, `dmg`, `range`, `rate`, `splash`, `slow`.
- **Tower pictures** — put a PNG in `assets/` named like the `sprite` field (`assets/myhero.png` → `sprite: 'myhero'`). Then add `scene.load.image('myhero', 'assets/myhero.png');` inside `loadArt()`.
- **Monsters** — `MONSTERS`. Copy a block. `icon` is an emoji. `bounty` is score on kill. `hpMul` / `spdMul` scale with the wave.
- **Which monster each wave uses** — `WAVE_MONSTERS` (ids from `MONSTERS`, in order, then it loops).
- **Questions** — `QUESTIONS`. `c` is the correct answer index (`0` = first choice).

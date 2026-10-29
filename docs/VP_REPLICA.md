# VP (Visual Programming) replica

Open at `?vp=1` (optionally `&task=<taskId>&level=<n>`), e.g. `/?vp=1&task=22221&level=1`.

## What exists
| Part | Where |
|---|---|
| Raw capture of the original course (111 tasks, 632 levels) | `input/vp-capture/vp_capture_all.json` |
| Data builder → `public/vp-data/` | `scripts/buildVpData.mjs` (`npm run vp:data`) |
| Images, game UI/skin assets, Scratch projects + assets | `public/vp-assets/` |
| Maze rules engine (all skins), tested against the platform's own solutions | `src/vp/maze/mazeEngine.js`, `scripts/testMazeSolutions.mjs` |
| Maze SVG view (skins, tiles, cargo, rocks, minerals, balloons) | `src/vp/maze/mazeView.js`, `skins.json` |
| Block editor (drag & drop, conditions, loops, variables) | `src/vp/maze/BlockEditor.jsx`, `blockDefs.js`, `treeOps.js` |
| Lesson player, content levels (comics, quiz, rating, typing, finish, html) | `src/vp/VpPlayer.jsx`, `src/vp/levels/*` |
| Scratch levels: official Scratch GUI + captured projects + task panel | `src/vp/levels/ScratchLevel.jsx`, `scripts/fetchScratchGui.sh` |

## Scratch editor
The official prebuilt Scratch GUI (BSD-3-Clause, `scratchfoundation/scratch-gui` gh-pages) is downloaded by
`npm run vp:scratch-gui` (also run automatically as `prebuild`) into `public/vp-assets/scratch-gui/` (git-ignored, ~86 MB).
`editor.html` redirects scratch.mit.edu project/asset requests to `public/vp-assets/scratch/`.

## Known gaps
- Mini-games not built yet (levels show a notice + "Mark as done"): construction, coordinates, plants, turtle, fruits, weed, retrominerals (96 levels).
- 76 custom Scratch assets could not be captured (`public/vp-assets/scratch/missing_assets.json`); affected costumes/sounds are blank.
- Progress is stored in the browser (localStorage); Scratch edits are not saved back.
- 9 maze levels cannot be verified: 5 have no stored solution, 4 have stored solutions that do not match their map.
- Some captured text (e.g. quiz questions) is Russian in the source data.

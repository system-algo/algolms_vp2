# VP2 original-platform Block Task status

Rule: finish a page, run a quick build and push main immediately. Do not inspect Render deployments.

## Implemented

| Page | Original task | Positions | Main commit |
| --- | --- | --- | --- |
| M1 L1 Excursion | 18341 | 12 | a152374 |
| M1 L1 Help load the rocket | 18342 | 14 | 0a88703 |
| M1 L2 Building a Marsbase | 19095 | 18 | 4900b35 |
| M1 L2 Excavations | 19096 | 15 | 3ae3375 |
| M2 L1 Rocket flight | 21608 | 12 coordinate Block Tasks, typing, four source links | b8d9f19 |
| M2 L2 Collecting cargo | 21625 | 15 | 4919080 |
| M2 L3 Laser and plants | 21714 | 14 | 524bb88 |

All previously closed positions are now accessible. Rendered geometry, instructions and image assets are saved alongside their reference JSON. VP2 and VP page aliases were updated where applicable.

## Rocket flight exceptions

Positions 2 and 3 are original Scratch games. The original page displays its Go/Stop toolbar but no stage/canvas content in this browser, so the clone links to the original activity rather than inventing a game. Positions 4 and 12 are comics on userapi.com; browser security denied downloading that image host. Those positions also link to the original. These four links do not automatically mark the activities complete. This page is not a complete local restoration of all 17 positions.

## Scope and validation

The request targets Block Tasks through Module 2. Other Scratch/editor/test pages are outside this pass. M2 L1 page 2 Find the coordinates is three original Scratch games; M2 L2 page 2 Pen is four Scratch tasks and a rating. Existing maze placeholders on those pages still need separate Scratch restoration.

Excavations command limits are copied from the displayed original counters (positions 2–13); position 14 has no displayed cap. All thirteen stone boards passed reachability/destroy checks.

Quick production builds passed after each page. All 24 existing Excursion/cargo tests passed. Traversal checks passed for all 12 Collecting cargo routes, all 11 greenhouse tasks and all 12 coordinate programs. No Render verification was performed. Source exercise completion was not used as a shortcut to alter clone progress.

Ratings are kept in session state. Construction uses the marked current cell; its original build execution has not been verified end to end. Greenhouse destroy/water commands affect the matching pest/sprout and leave mature plants untouched; source command semantics beyond visible layout and task goals have not been exhaustively checked.

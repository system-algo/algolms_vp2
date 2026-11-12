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


## Module 4 continuation — 12 November 2026

The authenticated source account vasgh05 was inspected through the visible lesson UI. Five Block Task pages now have reference data and runtime routing: 53 programming exercises across 65 positions. Source comics remain links for the user to replace with downloaded images. No source exercise answers were submitted to obtain content. Opening source feedback positions can itself update source progress.

| Page | Source task | Positions | Programming exercises |
| --- | --- | --- | --- |
| Martian Chef | 23815 | 17 | 14 |
| Unknown maze | 24121 | 11 | 9 |
| Bonus: Training base | 24122 | 15 | 13 |
| Bonus: Maze in the dark | 24123 | 7 | 5 |
| Getting the soccer field ready | 24491 | 15 | 12 |

Chef uses logical color/shape/size predicates and checks every ingredient; field exercises compare X/Y with numbers or the other coordinate, combine conditions, and preserve healthy plants. Training base samples one tank per hidden color group and rejects stepping onto dynamite. Maze in the dark uses the observed initial tank positions. Its final source level parameter is 8 despite there being only seven displayed positions; local navigation uses seven consecutive positions.

Module 3 Sorting cargo and rocket journey reference routing was moved out of the legacy level-ID resolver into the component dispatcher, correcting its undefined `props` path.

Validation: production build; 24 existing Excursion/cargo tests; 14 Chef completion/incorrect-recipe checks; 12 field completion/healthy-plant checks; reachability of all 27 maze/tank boards; cross-coordinate comparisons. This is logic/build validation, not a full browser end-to-end validation of the clone. No Render deployment check was run.

Remaining limits: Scratch/editor and quiz pages are outside the Block Task pass. New artwork currently references the original public asset URLs; local image bundling is deferred as requested. Chef/field use the shared clone workspace rather than an exact copy of the original Blockly UI. Training hidden-group randomization implements the observed one-tank-per-color goal; its underlying original randomization was not inspected. Dark-mode fog and the original field harvester animation have not been reproduced. Source comics are linked, not falsely marked complete. Automatic approval review blocked the first default-branch push; commits are local pending explicit push confirmation.

## Module 5 — Land of minerals

Restored all eleven positions (nine mineral programs, introduction link and rating). Maps and initial mineral quantities were transcribed from rendered source SVGs. Added variable assignment/change, exact mineral collection, live counters and mineral sensors. Source question-mark counters stay hidden. Fixed condition editors accidentally placed in the pointer handler so conditional blocks can be edited and dragged.

Validation: production build; all nine mineral routes with exact collection targets and live variable counts; Module 4 logic regression passed. Artwork remains on the original public asset host as requested. No Render deployment check.

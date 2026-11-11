# VP2 original-platform block task status

Working rule: finish a page, run a quick production build and push main immediately. Do not wait for Render or repeat frontend smoke tests for every page.

## Implemented pages

- M1 L1 page 1: Excursion — 12 positions.
- M1 L1 page 2: Help load the rocket — 14 positions.
- M1 L2 page 1: Building a Marsbase — 18 positions; original comic images, 15 construction boards, building sprites, three building actions and feedback. Source lesson 8750/task 19095. Commit 4900b35.

## Source access blockers observed

The authenticated original platform exposes the following navigation statuses. Closed links do not open when clicked; their content has not been invented.

| Page | Original task | Remaining source access needed |
| --- | --- | --- |
| M1 L2 page 2 Excavations | 19096 | Positions 3–15 closed; intro completed through its normal slideshow; position 2 open |
| M2 L1 page 1 Rocket flight | 21608 | Positions 5–17 closed; 1 typing, 2–3 Scratch games, 4 comic |
| M2 L2 page 1 Collecting cargo | 21625 | Positions 3–8 and 10–15 closed |
| M2 L3 page 1 Laser and plants | 21714 | Positions 10 and 14 closed; rendered references saved for 2–8 and 11–13 |

## Mapping gaps

The existing repository task counts/types are not sufficient evidence of original content. The original Rocket flight has 17 positions, Collecting cargo 15 and Excavations 15. Existing placeholders contain fewer.

M2 L1 page 2 “Find the coordinates” is three original Scratch games, not five maze block tasks. M2 L2 page 2 “Pen” is four Scratch editor tasks plus rating, not five maze block tasks. Their placeholder metadata needs separate Scratch content restoration rather than replacing it with invented robot routes.

Raw rendered SVG references are kept in docs/references to avoid losing work when the browser session expires. These contain rendered lesson geometry and instructions, not authentication state. Construction build simulation uses the marked current cell and validates building type and duplicates; production build passed. No Render deployment check was performed, per user instruction.

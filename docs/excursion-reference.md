# Excursion source references

All twelve positions in VP2 M1 L1 page 1 were inspected in the authenticated original platform (lesson 8464, task 18341) on 11 November 2026 after the account was unlocked.

- Positions 1–5: Mars station maps, original building artwork, directional robot, obstacles and instructions.
- Position 6: autumn forest, straight route, loop tutorial and original illustration; the source also offers cargo commands even though no cargo exists on this map.
- Position 7: feedback acknowledgement (“Thanks! We love having cool lessons!”), Next button.
- Positions 8–9: forest routes with loops; position 9 has an eight-command limit.
- Position 10: original illustrated bonus introduction, Next button.
- Positions 11–12: bonus forest routes; position 11 has a twelve-command limit.

Map geometry was transcribed from the rendered SVG (clip rectangles, tile atlas offsets, finish marker and initial robot frame), not guessed from old placeholder levels. Artwork is bundled locally. The dedicated renderer is selected only for the twelve VP/VP2 M1L1_1 IDs, keeping other activities unchanged.

Validation: production build; original station and greenhouse route regressions; every remaining maze route; blocked/off-track moves; loop iteration marker; every referenced local asset. Generic congratulations text is used where the original success dialog was not observed. This change does not alter database schemas, RLS or course access.

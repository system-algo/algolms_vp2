# Excursion reference restoration

The dedicated renderer currently covers **VP2 M1 L1 page 1, tasks 1 and 2**.
Reference: the supplied 11 November 2026 recordings and the authenticated original
`learn.alg.academy` Excursion page (module 1, lesson 8464, task 18341).

Original station/greenhouse backgrounds, route tile atlas, marker, robot sprite,
mascot and task-1 diagram are bundled in `public/vp-assets/excursion/`.
The reference maps preserve the 8x8 grid, starting direction and tan obstacles.
The renderer uses the existing block workspace with compact styling, the original
three commands, instruction text, and explicit Continue/Go again controls.
The outer LMS shell remains responsible for task navigation and progress.

Tasks 3–12 retain their previous implementation. The supplied video shows only
1–2; the original account returns Task unavailable for task 3. No captured
Excursion archive was present in the repository: `input/VP M1L1_1.h5p` is a
SingleChoiceSet quiz, not the maze capture. Obtain the original archive or
accessible references before replacing the remaining tasks. Do not infer their
maps or instructions from the existing generic Mars cargo levels.

Validation: `node --test tests/excursion.test.mjs` and `npm run build`.

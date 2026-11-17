# M2L1_3 — Scratch. Coordinates

Source: task 26849, lesson 9520, XML inspected on 2026-11-18.
These are teacher reference notes, never student hint images. Starter files remain unchanged. Completed demo files have not yet been supplied.

| Task | Title | Starter project | Demo project |
| --- | --- | --- | --- |
| 1 | Teleport | 10680304 / M2L1_Teleport.sb3 | 6083048 |
| 2 | Star | 10680306 / M2L1_A_star.sb3 | 2670925 |
| 3 | Moon | 10680307 / M2L1_Moon.sb3 | 2670933 |
| 4 | Crab | 10680311 / M2L1_Crab.sb3 | 2672391 |
| 5 | Thermometer | 10680315 / M2L1_Thermometer.sb3 | 10680328 |
| 6 | Rating | — | — |
| 7 (bonus) | Traffic light | 10683422 / M2L1_Traffic_light.sb3 | 6083052 |
| 8 (bonus) | Sun | 10680339 / M2L1_The_Sun.sb3 | 2670940 |

## Task 1 — Teleport (Rocketship)

XML contains two separate scripts:

```text
when [up arrow] key pressed
  go to x: -140 y: -74

when [down arrow] key pressed
  go to x: -140 y: -74
```

Both sample positions are identical in XML, conflicting with the requirement to move between two points. To build a working demo, use two different positions; for example up=(-140,74), down=(-140,-74). This adjustment is a suggestion, not an exact XML answer.

## Task 2 — Star (Wand)

The complete XML example with delays:

```text
when green flag clicked
  go to x: 16 y: -7
  wait 1 seconds
  go to x: 100 y: 66
  wait 1 seconds
  go to x: -67 y: 53
  wait 1 seconds
  go to x: -40 y: -58
```

Another XML variant without delays uses (15,46), (-63,-21), (69,-26), (64,81). The requirements allow different coordinate choices; there are four explicit positions, rather than a random-position block.

## Task 3 — Moon (Moon)

```text
when green flag clicked
  go to x: -199 y: -17
  wait 1 seconds
  go to x: -8 y: 64
  wait 1 seconds
  go to x: 225 y: -30
```

## Task 4 — Crab (Crab)

The XML sample contains five `set x to 109` blocks with `wait 1 seconds` between them. Identical X values would produce no visible movement. To fulfill the text, select five different X values, keeping Y unchanged; for example:

```text
when green flag clicked
  set x to -180
  wait 1 seconds
  set x to -90
  wait 1 seconds
  set x to 0
  wait 1 seconds
  set x to 90
  wait 1 seconds
  set x to 180
```

The five different X values above are a suggested working demo, not literal XML values.

## Task 5 — Thermometer (Sprite 1)

The complete XML sequence sets Y to 77, 16, -29, -66, -122, each followed by `say Hello! for 2 seconds`. The text requirements instead ask for temperature messages. Keep the XML Y coordinates and replace the placeholder messages as follows:

```text
when green flag clicked
  set y to 77
  say [Hot!] for 2 seconds
  set y to 16
  say [Warm!] for 2 seconds
  set y to -29
  say [Cool!] for 2 seconds
  set y to -66
  say [Cold!] for 2 seconds
  set y to -122
  say [Freezing!] for 2 seconds
```

The message corrections follow the requirements; literal XML messages are all `Hello!`.

## Task 6 — Rating

No Scratch project or demo.

## Task 7 — Traffic light (bonus)

Use the complete `go to x/y` XML variants, applied to both gray masks:

```text
Sprite Спрайт 3:
  when [1] key pressed -> go to x: 0 y: -72
  when [2] key pressed -> go to x: 0 y: -72
  when [3] key pressed -> go to x: 0 y: 0

Sprite Спрайт 1:
  when [1] key pressed -> go to x: 0 y: 0
  when [2] key pressed -> go to x: 0 y: 73
  when [3] key pressed -> go to x: 0 y: 73
```

The XML also contains alternative `set y to 0` checks for every key. Those alternatives alone do not express the required mask positions; use the explicit XY variants above for the demo.

## Task 8 — Sun (bonus)

The XML includes several variants with repeated (225,11) coordinates. The complete variant with three distinct destinations is:

```text
when green flag clicked
  go to x: -168 y: -43
  switch costume to [afternoon]
  glide 1 seconds to x: -122 y: 18
  switch costume to [morning/evening]
  glide 1 seconds to x: 10 y: 55
  switch costume to [afternoon]
  glide 1 seconds to x: 183 y: -36
```

Another variant explicitly initializes `morning/evening` at (-216,9), but repeats (225,11) for every glide. For a visually natural sunrise/noon/sunset demo, use `morning/evening` at the start, `afternoon` near the highest point, and `morning/evening` at the end. That costume timing is a suggested refinement, separate from the literal XML script above.

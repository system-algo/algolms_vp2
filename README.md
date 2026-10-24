# LMS Replica Template

This template keeps one stable LMS frame and swaps only the imported activity content.

## Run the sample

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Import another capture ZIP

Put your capture ZIP anywhere, then run:

```bash
npm run import -- ./input/YOUR_FILE.zip
npm run dev
```

The import script replaces only `public/courses/current/`. The React shell, navbar, background, Next button, and renderer structure stay unchanged.

## Activity renderer structure

- `src/activities/McqCheckboxTask.jsx`
- `src/activities/MatchingDragdropTask.jsx`
- `src/activities/GenericCapturedTask.jsx`
- `src/components/StateReplay.jsx`

Right now these render captured states for pixel-accurate replay. Later, you can replace one activity file at a time with real interactive logic while keeping the same outer shell.

## Adjust crop

Screenshots from the capture include the original LMS top bar. Because this template has its own fixed top bar, the screenshot is cropped by default.

Change this value in `src/styles.css` if needed:

```css
--capture-top-crop: 60px;
```

Use the `Show raw capture` button in the footer to compare the original full screenshot.

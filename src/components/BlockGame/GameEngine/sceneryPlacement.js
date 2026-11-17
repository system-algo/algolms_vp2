// Source maze: a 400px board with a 679x768 scene anchored at (-179, -70).
// Convert the scene to board units so it shares every responsive SVG transform.
export function sceneryPlacement(viewBox = '0 0 400 400', sceneryPath = '') {
  const sceneryHeight = sceneryPath.endsWith('/map2_2_9.svg') ? 1000 : 768;
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
  return { x: x - 179 * width / 400, y: y - 70 * height / 400,
    width: 679 * width / 400, height: sceneryHeight * height / 400 };
}

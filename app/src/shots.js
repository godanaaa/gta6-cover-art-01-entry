// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone. `photo` picks the sample
// (samples/<photo>.jpg), `caption` the title, and `layout`, `grade` and
// `size` pick the cover settings. window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const layout = query.get('layout') ?? 'hero3';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'wide';
  await load(`samples/${photo}.jpg`, caption, { layout, grade, size });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

// Neon Vice Cover Studio — wires the editor page.
// Photos stay on the machine (FileReader / object URLs, never uploaded).
// Click a panel to select it, drag it to pan, zoom it with the slider.
import { drawCover, defaultState, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const preview = document.getElementById('preview');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const badgeInput = document.getElementById('badge');
const starsInput = document.getElementById('stars');
const zoomInput = document.getElementById('zoom');
const panelPhotoSelect = document.getElementById('panel-photo');
const status = document.getElementById('status');
const panelLabel = document.getElementById('panel-label');

const state = defaultState();
const photos = [null, null, null, null];
const photoNames = ['Boulevard sample', 'Pier sample', 'Upload 1', 'Upload 2'];
let history = [];
let future = [];
let dragging = null;

function snapshot() {
  return JSON.stringify({ ...state, panelPhoto: [...state.panelPhoto], panelCrop: state.panelCrop.map((c) => ({ ...c })) });
}
function pushHistory() {
  history.push(snapshot());
  if (history.length > 40) history.shift();
  future = [];
}
function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  state.panelPhoto = [...s.panelPhoto];
  state.panelCrop = s.panelCrop.map((c) => ({ ...c }));
  syncControls();
  redraw();
}
function syncControls() {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  starsInput.value = String(state.stars);
  zoomInput.value = String(state.panelCrop[state.selected].zoom);
  panelPhotoSelect.value = String(state.panelPhoto[state.selected]);
  panelLabel.textContent = `Panel ${state.selected + 1} of ${panelCount()} — ${photoNames[state.panelPhoto[state.selected]] || 'photo'}`;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
}
function panelCount() {
  return (LAYOUTS[state.layout] || LAYOUTS.hero3).panels.length;
}
function redraw() {
  drawCover(preview, state, photos);
}
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
async function loadSample(name) {
  return loadImage(`samples/${name}.jpg`);
}

async function loadDefaults() {
  photos[0] = await loadSample('boulevard');
  photos[1] = await loadSample('pier');
  redraw();
}

function bindPicker(attr, key) {
  document.querySelectorAll(`[data-${attr}]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      pushHistory();
      state[key] = btn.dataset[attr];
      if (key === 'layout' && state.selected >= panelCount()) state.selected = 0;
      syncControls();
      redraw();
    });
  });
}
bindPicker('layout', 'layout');
bindPicker('grade', 'grade');
bindPicker('size', 'size');

for (const [key, input, field] of [
  ['title', titleInput, 'title'],
  ['subtitle', subtitleInput, 'subtitle'],
  ['badge', badgeInput, 'badge'],
]) {
  input.addEventListener('input', () => {
    state[field] = input.value;
    redraw();
  });
  input.addEventListener('change', () => pushHistory());
}
starsInput.addEventListener('input', () => {
  state.stars = Number(starsInput.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panelCrop[state.selected].zoom = Number(zoomInput.value);
  redraw();
});
zoomInput.addEventListener('change', () => pushHistory());
panelPhotoSelect.addEventListener('change', () => {
  pushHistory();
  state.panelPhoto[state.selected] = Number(panelPhotoSelect.value);
  syncControls();
  redraw();
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', () => {
    pushHistory();
    state.panelPhoto[state.selected] = Number(btn.dataset.sample);
    syncControls();
    redraw();
  });
});
document.querySelectorAll('[data-upload]').forEach((input) => {
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const slot = Number(input.dataset.upload);
    photos[slot] = await loadImage(URL.createObjectURL(file));
    photoNames[slot] = file.name;
    pushHistory();
    state.panelPhoto[state.selected] = slot;
    syncControls();
    redraw();
    status.textContent = `Loaded ${file.name}`;
  });
});

function panelAt(px, py) {
  const rect = preview.getBoundingClientRect();
  const x = (px - rect.left) / rect.width;
  const y = (py - rect.top) / rect.height;
  const panels = (LAYOUTS[state.layout] || LAYOUTS.hero3).panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const [fx, fy, fw, fh] = panels[i];
    if (x >= fx && x <= fx + fw && y >= fy && y <= fy + fh) return i;
  }
  return 0;
}
preview.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i !== state.selected) {
    state.selected = i;
    syncControls();
  }
  dragging = { x: e.clientX, y: e.clientY, crop: { ...state.panelCrop[i] } };
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = preview.getBoundingClientRect();
  const crop = state.panelCrop[state.selected];
  crop.x = dragging.crop.x + ((e.clientX - dragging.x) / rect.width) * 1.6;
  crop.y = dragging.crop.y + ((e.clientY - dragging.y) / rect.height) * 1.6;
  crop.x = Math.max(-1, Math.min(1, crop.x));
  crop.y = Math.max(-1, Math.min(1, crop.y));
  redraw();
});
preview.addEventListener('pointerup', () => {
  if (dragging) pushHistory();
  dragging = null;
});

document.getElementById('undo').addEventListener('click', () => {
  if (!history.length) return;
  future.push(snapshot());
  restore(history.pop());
});
document.getElementById('redo').addEventListener('click', () => {
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
});
document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  drawCover(off, state, photos);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved neon-vice-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  const params = new URLSearchParams(location.search);
  runShot(shot, params, async (sample, text, opts) => {
    state.layout = opts.layout;
    state.grade = opts.grade;
    state.size = opts.size;
    state.title = text;
    photos[0] = await loadImage(sample);
    // Load the other sample too, so multi-panel layouts alternate photos.
    const other = sample.includes('boulevard') ? 'samples/pier.jpg' : 'samples/boulevard.jpg';
    photos[1] = await loadImage(other);
    syncControls();
    redraw();
  });
} else {
  loadDefaults().then(() => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  });
  syncControls();
}

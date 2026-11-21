// Neon Vice Cover Studio — the cover renderer.
// Draws a multi-panel poster cover from the editor state onto any canvas.
// Everything is drawn by hand: panel gutters, grade washes, a halftone title
// block, grain, vignette, a badge ribbon and a star heat-meter.

export const LAYOUTS = {
  hero3: { name: 'Hero + 3', panels: [[0, 0, 1, 0.62], [0, 0.62, 0.34, 0.38], [0.33, 0.62, 0.34, 0.38], [0.66, 0.62, 0.34, 0.38]] },
  grid4: { name: 'Four-panel grid', panels: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
  grid9: { name: 'Nine-panel grid', panels: [[0, 0, 1 / 3, 1 / 3], [1 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [0, 1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]] },
  fullbleed: { name: 'Full-bleed hero', panels: [[0, 0, 1, 1]] },
  tilted: { name: 'Tilted snapshots', panels: [[0.02, 0.04, 0.62, 0.52], [0.38, 0.3, 0.6, 0.52], [0.08, 0.62, 0.56, 0.34]] },
  diagonal: { name: 'Diagonal strip', panels: [[0, 0, 0.62, 1], [0.38, 0, 0.62, 1], [0.68, 0, 0.32, 1]] },
};

export const GRADES = {
  sunset: { name: 'Vice Sunset', top: 'rgba(255, 170, 60, 0.10)', bottom: 'rgba(214, 40, 130, 0.42)', wash: 'rgba(255, 110, 60, 0.14)' },
  neon: { name: 'Neon Night', top: 'rgba(30, 230, 255, 0.16)', bottom: 'rgba(255, 45, 180, 0.38)', wash: 'rgba(90, 40, 220, 0.18)' },
  palm: { name: 'Palm Gold', top: 'rgba(255, 210, 90, 0.18)', bottom: 'rgba(180, 90, 20, 0.34)', wash: 'rgba(255, 190, 80, 0.12)' },
  teal: { name: 'Teal Noir', top: 'rgba(20, 200, 190, 0.14)', bottom: 'rgba(10, 30, 60, 0.48)', wash: 'rgba(0, 120, 130, 0.16)' },
  rose: { name: 'Rose Dusk', top: 'rgba(255, 120, 170, 0.16)', bottom: 'rgba(120, 20, 90, 0.44)', wash: 'rgba(230, 90, 140, 0.14)' },
};

export const SIZES = {
  square: { name: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { name: '1080 x 1350', w: 1080, h: 1350 },
  wide: { name: '1920 x 1080', w: 1920, h: 1080 },
};

export function defaultState() {
  return {
    layout: 'hero3', grade: 'sunset', size: 'wide',
    title: 'Sunset Heist', subtitle: 'neon nights, palm dreams',
    badge: 'NEON COAST', stars: 4,
    panelPhoto: [0, 1, 0, 1, 0, 1, 0, 1, 0],
    panelCrop: Array.from({ length: 9 }, () => ({ x: 0, y: 0, zoom: 1 })),
    selected: 0,
  };
}

/** Seeded pseudo-random, so the grain is identical on every export. */
function grainRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawPhotoInto(ctx, img, x, y, w, h, crop) {
  if (!img) {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `bold ${Math.max(14, h * 0.08)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    return;
  }
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (crop.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = x + (w - pw) / 2 + (crop.x || 0) * w * 0.4;
  // Face-aware vertical anchor: when the photo is taller than the panel
  // (a portrait photo in a wide panel), centre-cropping cuts the face off
  // the top. Anchor toward the top instead, cropping only ~5% of the
  // excess off the top, so eyes and chin stay in frame. The user can still
  // drag the panel to re-centre it.
  const dy = ph > h
    ? y - (ph - h) * 0.05 + (crop.y || 0) * h * 0.4
    : y + (h - ph) / 2 + (crop.y || 0) * h * 0.4;
  ctx.drawImage(img, dx, dy, pw, ph);
}

function drawPanel(ctx, img, rect, crop, w, h, tilted, diagonal) {
  const [fx, fy, fw, fh] = rect;
  const x = fx * w, y = fy * h, pw = fw * w, ph = fh * h;
  const slant = diagonal ? w * 0.07 : 0;
  ctx.save();
  if (diagonal) {
    ctx.beginPath();
    ctx.moveTo(x + slant, y);
    ctx.lineTo(x + pw, y);
    ctx.lineTo(x + pw - slant, y + ph);
    ctx.lineTo(x, y + ph);
    ctx.closePath();
    ctx.clip();
    drawPhotoInto(ctx, img, x, y, pw, ph, crop);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + slant, y);
    ctx.lineTo(x + pw, y);
    ctx.lineTo(x + pw - slant, y + ph);
    ctx.lineTo(x, y + ph);
    ctx.closePath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.stroke();
    ctx.strokeStyle = '#12081c';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (tilted) {
    ctx.translate(x + pw / 2, y + ph / 2);
    ctx.rotate((tilted * Math.PI) / 180);
    ctx.translate(-pw / 2, -ph / 2);
    ctx.beginPath();
    ctx.rect(0, 0, pw, ph);
    ctx.clip();
    drawPhotoInto(ctx, img, 0, 0, pw, ph, crop);
    ctx.restore();
    ctx.save();
    ctx.translate(x + pw / 2, y + ph / 2);
    ctx.rotate((tilted * Math.PI) / 180);
    ctx.translate(-pw / 2, -ph / 2);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, pw, ph);
    ctx.clip();
    drawPhotoInto(ctx, img, x, y, pw, ph, crop);
  }
  ctx.restore();
  // Poster ink: a white gutter band and a black keyline around every panel.
  ctx.save();
  if (tilted) {
    ctx.translate(x + pw / 2, y + ph / 2);
    ctx.rotate((tilted * Math.PI) / 180);
    ctx.translate(-pw / 2, -ph / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.strokeRect(0, 0, pw, ph);
    ctx.strokeStyle = '#12081c';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(0, 0, pw, ph);
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.strokeRect(x, y, pw, ph);
    ctx.strokeStyle = '#12081c';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(x, y, pw, ph);
  }
  ctx.restore();
}

function drawHalftoneBand(ctx, x, y, w, h) {
  ctx.fillStyle = '#12081c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255, 90, 180, 0.55)';
  const step = Math.max(10, w * 0.012);
  for (let cy = y + step / 2; cy < y + h; cy += step) {
    for (let cx = x + step / 2; cx < x + w; cx += step) {
      const r = step * 0.16 * (1 + 0.6 * Math.sin(cx * 0.02));
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStars(ctx, x, y, size, filled) {
  for (let i = 0; i < 5; i++) {
    const cx = x + i * size * 1.25;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? size / 2 : size / 5;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = cx + r * Math.cos(a), py = y + r * Math.sin(a);
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = i < filled ? '#ffd23e' : 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = '#12081c';
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.stroke();
  }
}

/** Draws the whole cover from `state` and `photos` (array of images) onto `canvas`. */
export function drawCover(canvas, state, photos) {
  const size = SIZES[state.size] || SIZES.wide;
  const w = size.w, h = size.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero3;
  const grade = GRADES[state.grade] || GRADES.sunset;

  ctx.fillStyle = '#12081c';
  ctx.fillRect(0, 0, w, h);

  const tilts = state.layout === 'tilted' ? [-3, 2.5, -1.5] : null;
  const diagonal = state.layout === 'diagonal';
  layout.panels.forEach((rect, i) => {
    const img = photos[state.panelPhoto[i] ?? 0] || null;
    drawPanel(ctx, img, rect, state.panelCrop[i] || { x: 0, y: 0, zoom: 1 }, w, h, tilts ? tilts[i] ?? 0 : 0, diagonal);
  });

  // The grade: a sunset/neon wash over the whole cover, then a soft-light pass.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // Title block: a dark scrim, a halftone band, big Anton title, Pacifico subtitle.
  const bandH = h * (state.size === 'portrait' ? 0.2 : 0.24);
  const bandY = h - bandH;
  ctx.fillStyle = 'rgba(18, 8, 28, 0.55)';
  ctx.fillRect(0, bandY, w, bandH);
  drawHalftoneBand(ctx, 0, bandY, w, bandH * 0.28);
  const title = (state.title || 'SUNSET HEIST').toUpperCase();
  let ts = h * 0.085;
  ctx.font = `${ts}px Anton, 'Arial Black', sans-serif`;
  while (ctx.measureText(title).width > w * 0.92 && ts > 20) {
    ts -= 4;
    ctx.font = `${ts}px Anton, 'Arial Black', sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 60, 180, 0.9)';
  ctx.shadowBlur = ts * 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, w / 2, bandY + bandH * 0.48);
  ctx.shadowBlur = 0;
  ctx.font = `italic ${Math.max(18, h * 0.038)}px Pacifico, cursive`;
  ctx.fillStyle = '#7df9ff';
  ctx.shadowColor = 'rgba(60, 220, 255, 0.9)';
  ctx.shadowBlur = 12;
  ctx.fillText(state.subtitle || '', w / 2, bandY + bandH * 0.82);
  ctx.shadowBlur = 0;

  // Badge ribbon, top right, and the star heat-meter, top left.
  const badge = (state.badge || '').toUpperCase();
  if (badge) {
    // Set the font before measuring, cap the ribbon so it never runs off
    // the edge or over a face in the top-right panel.
    const bf = Math.max(14, h * 0.02);
    ctx.font = `bold ${bf}px Anton, sans-serif`;
    const bw = Math.min(w * 0.2, Math.max(80, ctx.measureText(badge).width + w * 0.03));
    ctx.save();
    ctx.translate(w * 0.89, h * 0.032);
    ctx.rotate(0.05);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(-bw / 2, -h * 0.026, bw, h * 0.052);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.strokeRect(-bw / 2, -h * 0.026, bw, h * 0.052);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badge, 0, 2);
    ctx.restore();
  }
  drawStars(ctx, w * 0.03, h * 0.035, Math.max(18, h * 0.032), state.stars || 4);

  // Grain, then a vignette to pull the eye to the middle.
  const rnd = grainRandom(20261121);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < w * h * 0.00012; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,4,20,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

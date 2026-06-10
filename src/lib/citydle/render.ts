// Canvas 渲染:沧桑制图师美学(暗羊皮纸 + 暖金线条)。
// 取景严格按城市声明 bbox —— 与人工选片一致,几何超出画框自然裁掉。
import type { Bbox, Seg } from "./types";
import type { ClueLayers } from "./clues";

export const MAX_CLUES = 6;

const C = {
  bg: "#14100c",
  faint: "rgba(94,79,55,0.75)",
  mid: "rgba(154,125,78,0.9)",
  bright: "#e6c178",
  glow: "#f4dca0",
  water: "rgba(74,144,194,0.55)",
  coast: "rgba(63,182,168,0.85)",
};

type Projector = (lat: number, lng: number) => [number, number];

function projector(bbox: Bbox, W: number, H: number, pad: number): Projector {
  const cl = Math.cos(((bbox.south + bbox.north) / 2) * (Math.PI / 180));
  const x0 = bbox.west * cl;
  const rx = bbox.east * cl - x0 || 1e-6;
  const ry = bbox.north - bbox.south || 1e-6;
  const s = Math.min((W - 2 * pad) / rx, (H - 2 * pad) / ry);
  const ox = (W - rx * s) / 2;
  const oy = (H - ry * s) / 2;
  return (lat, lng) => [(lng * cl - x0) * s + ox, (bbox.north - lat) * s + oy];
}

function strokeSegs(ctx: CanvasRenderingContext2D, proj: Projector, segs: Seg[], color: string, w: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const seg of segs) {
    ctx.beginPath();
    for (let i = 0; i < seg.length; i++) {
      const [x, y] = proj(seg[i][0], seg[i][1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number) {
  ctx.font = `600 ${px}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = C.glow;
  ctx.fillText(text, x, y);
}

export interface RenderHints {
  countryHint: string;
}

/** 把第 level 层线索画到 canvas 上(level 1–6,层层叠加) */
export function drawClue(
  canvas: HTMLCanvasElement,
  bbox: Bbox,
  layers: ClueLayers,
  level: number,
  hints: RenderHints,
) {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W || !H) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // 画布越大线越粗、字越大——桌面端大画幅保持视觉密度
  const k = Math.max(1, Math.min(2.2, Math.min(W, H) / 520));
  const proj = projector(bbox, W, H, 14 * k);
  const lv = Math.min(level, MAX_CLUES);

  if (lv >= 2) {
    strokeSegs(ctx, proj, layers.water, C.water, 1.4 * k);
    strokeSegs(ctx, proj, layers.coast, C.coast, 1.6 * k);
  }
  if (lv >= 4) strokeSegs(ctx, proj, layers.t3, C.faint, 0.6 * k);
  if (lv >= 3) strokeSegs(ctx, proj, layers.t2, C.mid, 1.0 * k);
  strokeSegs(ctx, proj, layers.skeleton, C.bright, 1.8 * k);

  if (lv >= 5 && layers.nameStreet) {
    const [x, y] = proj(layers.nameStreet.at[0], layers.nameStreet.at[1]);
    outlinedText(ctx, layers.nameStreet.name, x, y - 8 * k, Math.round(13 * k));
  }
  if (lv >= 6 && hints.countryHint) {
    outlinedText(ctx, hints.countryHint, W / 2, 26 * k, Math.round(14 * k));
  }
}

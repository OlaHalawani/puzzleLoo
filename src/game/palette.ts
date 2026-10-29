export type Shape =
  | 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon'
  | 'star' | 'plus' | 'triangleDown' | 'octagon' | 'heart' | 'ring';

export const PALETTE: { color: string; shape: Shape }[] = [
  { color: '#ff3b5c', shape: 'circle' },
  { color: '#2dff7a', shape: 'diamond' },
  { color: '#3d8bff', shape: 'square' },
  { color: '#ffd23d', shape: 'pentagon' },
  { color: '#b65cff', shape: 'triangle' },
  { color: '#ff8a2b', shape: 'triangleDown' },
  { color: '#2de0ff', shape: 'hexagon' },
  { color: '#ff5cd6', shape: 'heart' },
  { color: '#c6ff3d', shape: 'star' },
  { color: '#f4f1ff', shape: 'plus' },
  { color: '#2dffc8', shape: 'octagon' },
  { color: '#ff9e9e', shape: 'ring' },
];

function polygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, rot: number): void {
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Adds the outline of `shape` (radius r, centred on x,y) to the current path. */
export function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, r: number): void {
  const up = -Math.PI / 2;
  switch (shape) {
    case 'circle':
    case 'ring':
      ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(x - r * 0.78, y - r * 0.78, r * 1.56, r * 1.56);
      break;
    case 'triangle':
      polygon(ctx, x, y + r * 0.15, r * 1.1, 3, up);
      break;
    case 'triangleDown':
      polygon(ctx, x, y - r * 0.15, r * 1.1, 3, -up);
      break;
    case 'diamond':
      polygon(ctx, x, y, r * 1.05, 4, up);
      break;
    case 'pentagon':
      polygon(ctx, x, y, r, 5, up);
      break;
    case 'hexagon':
      polygon(ctx, x, y, r, 6, 0);
      break;
    case 'octagon':
      polygon(ctx, x, y, r * 0.98, 8, Math.PI / 8);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r * 1.1 : r * 0.48;
        const a = up + (i * Math.PI) / 5;
        if (i === 0) ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
        else ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 'plus': {
      const t = r * 0.36;
      const l = r * 0.95;
      ctx.moveTo(x - t, y - l);
      ctx.lineTo(x + t, y - l);
      ctx.lineTo(x + t, y - t);
      ctx.lineTo(x + l, y - t);
      ctx.lineTo(x + l, y + t);
      ctx.lineTo(x + t, y + t);
      ctx.lineTo(x + t, y + l);
      ctx.lineTo(x - t, y + l);
      ctx.lineTo(x - t, y + t);
      ctx.lineTo(x - l, y + t);
      ctx.lineTo(x - l, y - t);
      ctx.lineTo(x - t, y - t);
      ctx.closePath();
      break;
    }
    case 'heart': {
      const s = r * 1.05;
      ctx.moveTo(x, y + s * 0.85);
      ctx.bezierCurveTo(x - s * 1.25, y + s * 0.05, x - s * 0.75, y - s * 1.0, x, y - s * 0.4);
      ctx.bezierCurveTo(x + s * 0.75, y - s * 1.0, x + s * 1.25, y + s * 0.05, x, y + s * 0.85);
      ctx.closePath();
      break;
    }
  }
}

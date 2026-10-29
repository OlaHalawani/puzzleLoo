import type { Board } from './board';
import { PALETTE, shapePath } from './palette';

export interface Layout {
  originX: number;
  originY: number;
  cell: number;
}

const GRID_LINE = 'rgba(190, 170, 255, 0.16)';
const BOARD_BG = 'rgba(12, 6, 32, 0.82)';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  layout: Layout = { originX: 0, originY: 0, cell: 0 };
  private dpr = 1;
  /** Cell under the finger while dragging, for the touch halo. */
  pointerCell = -1;
  /** Pair indices that flash after a hint or completion. */
  pulse = new Map<number, number>();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
  }

  resize(board: Board): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    const pad = 6;
    const side = Math.min(rect.width, rect.height) - pad * 2;
    const cell = Math.floor(side / board.size);
    this.layout = {
      cell,
      originX: (rect.width - cell * board.size) / 2,
      originY: (rect.height - cell * board.size) / 2,
    };
  }

  cellAt(clientX: number, clientY: number, size: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const { originX, originY, cell } = this.layout;
    const col = Math.floor((clientX - rect.left - originX) / cell);
    const row = Math.floor((clientY - rect.top - originY) / cell);
    if (col < 0 || row < 0 || col >= size || row >= size) return -1;
    return row * size + col;
  }

  /** Like cellAt but clamps to the board edge, so dragging off the board keeps tracking. */
  clampedCellAt(clientX: number, clientY: number, size: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const { originX, originY, cell } = this.layout;
    const col = Math.max(0, Math.min(size - 1, Math.floor((clientX - rect.left - originX) / cell)));
    const row = Math.max(0, Math.min(size - 1, Math.floor((clientY - rect.top - originY) / cell)));
    return row * size + col;
  }

  private center(c: number, size: number): [number, number] {
    const { originX, originY, cell } = this.layout;
    return [originX + (c % size) * cell + cell / 2, originY + Math.floor(c / size) * cell + cell / 2];
  }

  draw(board: Board, now: number): void {
    const ctx = this.ctx;
    const { size } = board;
    const { originX, originY, cell } = this.layout;
    const total = cell * size;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Board background
    ctx.fillStyle = BOARD_BG;
    roundRect(ctx, originX - 4, originY - 4, total + 8, total + 8, 14);
    ctx.fill();

    // Filled-cell tint
    board.paths.forEach((p, i) => {
      const col = PALETTE[board.puzzle.pairs[i].color].color;
      ctx.fillStyle = hexA(col, board.isComplete(i) ? 0.2 : 0.11);
      for (const c of p) {
        ctx.fillRect(originX + (c % size) * cell + 1, originY + Math.floor(c / size) * cell + 1, cell - 2, cell - 2);
      }
    });

    // Grid
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= size; i++) {
      ctx.moveTo(originX + i * cell + 0.5, originY);
      ctx.lineTo(originX + i * cell + 0.5, originY + total);
      ctx.moveTo(originX, originY + i * cell + 0.5);
      ctx.lineTo(originX + total, originY + i * cell + 0.5);
    }
    ctx.stroke();

    // Touch halo
    if (board.active !== -1 && this.pointerCell !== -1) {
      const [x, y] = this.center(this.pointerCell, size);
      const col = PALETTE[board.puzzle.pairs[board.active].color].color;
      const g = ctx.createRadialGradient(x, y, 0, x, y, cell * 1.1);
      g.addColorStop(0, hexA(col, 0.35));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, cell * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pipes
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    board.paths.forEach((p, i) => {
      if (p.length < 2) return;
      const col = PALETTE[board.puzzle.pairs[i].color].color;
      const pulse = this.pulseAmount(i, now);
      ctx.beginPath();
      p.forEach((c, k) => {
        const [x, y] = this.center(c, size);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = cell * (0.35 + pulse * 0.5);
      ctx.lineWidth = cell * (0.2 + pulse * 0.06);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = cell * 0.05;
      ctx.stroke();
    });

    // Endpoints
    board.puzzle.pairs.forEach((pair, i) => {
      const { color, shape } = PALETTE[pair.color];
      const done = board.isComplete(i);
      const pulse = this.pulseAmount(i, now);
      for (const c of [pair.a, pair.b]) {
        const [x, y] = this.center(c, size);
        const r = cell * (0.3 + pulse * 0.05);
        ctx.beginPath();
        shapePath(ctx, shape, x, y, r);
        ctx.shadowColor = color;
        ctx.shadowBlur = cell * (done ? 0.6 : 0.35);
        ctx.fillStyle = shape === 'ring' ? 'rgba(0,0,0,0)' : hexA(color, done ? 1 : 0.85);
        ctx.fill();
        ctx.strokeStyle = shape === 'ring' ? color : 'rgba(255,255,255,0.85)';
        ctx.lineWidth = shape === 'ring' ? cell * 0.11 : Math.max(1.5, cell * 0.035);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
  }

  private pulseAmount(i: number, now: number): number {
    const start = this.pulse.get(i);
    if (start === undefined) return 0;
    const t = (now - start) / 600;
    if (t >= 1) {
      this.pulse.delete(i);
      return 0;
    }
    return Math.sin(t * Math.PI);
  }

  get animating(): boolean {
    return this.pulse.size > 0;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

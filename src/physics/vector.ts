import type { Vector2 } from "./types";

export const add = (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vector2, s: number): Vector2 => ({ x: a.x * s, y: a.y * s });
export const norm2 = (a: Vector2): number => a.x * a.x + a.y * a.y;
export const norm = (a: Vector2): number => Math.sqrt(norm2(a));
export const isFiniteVector = (a: Vector2): boolean => Number.isFinite(a.x) && Number.isFinite(a.y);

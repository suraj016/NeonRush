import type { GameEngine } from './engine.ts'

let engine: GameEngine | null = null

export function setEngine(next: GameEngine | null): void {
  engine = next
}

export function getEngine(): GameEngine | null {
  return engine
}

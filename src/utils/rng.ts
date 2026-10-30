export class RNG {
  private state: number

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0
    if (this.state === 0) this.state = 0x9e3779b9
  }

  next(): number {
    this.state += 0x6d2b79f5
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)] as T
  }

  getSeed(): number {
    return this.state
  }
}

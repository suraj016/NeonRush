import { MAP_ORDER, type MapId } from './maps.ts'
import type { MapRecord, RunHistoryEntry, RunStats } from './types.ts'

export const MAP_STAR_MARKS = [600, 1600, 3200] as const
export const HISTORY_LIMIT = 8

export function emptyMapRecords(): Record<MapId, MapRecord> {
  const records = {} as Record<MapId, MapRecord>
  for (const id of MAP_ORDER) {
    records[id] = { bestScore: 0, bestDistance: 0, bestCombo: 0, runs: 0 }
  }
  return records
}

export function mapStars(bestDistance: number): number {
  let stars = 0
  for (const mark of MAP_STAR_MARKS) {
    if (bestDistance >= mark) stars += 1
  }
  return stars
}

export function starLabel(stars: number): string {
  const filled = Math.max(0, Math.min(3, stars))
  return `${'★'.repeat(filled)}${'☆'.repeat(3 - filled)}`
}

export function applyRunRecords(
  records: Record<MapId, MapRecord>,
  history: RunHistoryEntry[],
  run: RunStats,
  at: string,
): {
  records: Record<MapId, MapRecord>
  history: RunHistoryEntry[]
  isMapBestScore: boolean
  isMapBestDistance: boolean
  isBestCombo: boolean
  previousMapDistance: number
  hallRank: number
} {
  const prev = records[run.mapId] ?? emptyMapRecords()[run.mapId]
  const nextMap: MapRecord = {
    bestScore: Math.max(prev.bestScore, run.score),
    bestDistance: Math.max(prev.bestDistance, run.distance),
    bestCombo: Math.max(prev.bestCombo, run.maxCombo),
    runs: prev.runs + 1,
  }
  const nextRecords = { ...records, [run.mapId]: nextMap }
  const entry: RunHistoryEntry = {
    score: run.score,
    distance: Math.floor(run.distance),
    combo: run.maxCombo,
    mapId: run.mapId,
    at,
  }
  const historyNext = [...history, entry]
    .sort((a, b) => b.score - a.score || b.distance - a.distance)
    .slice(0, HISTORY_LIMIT)
  const better = historyNext.filter((item) => item.score > run.score).length
  const inHall = historyNext.some(
    (item) => item.score === entry.score && item.distance === entry.distance && item.mapId === entry.mapId,
  )
  return {
    records: nextRecords,
    history: historyNext,
    isMapBestScore: run.score > prev.bestScore && run.score > 0,
    isMapBestDistance: run.distance > prev.bestDistance && run.distance > 0,
    isBestCombo: run.maxCombo > prev.bestCombo && run.maxCombo > 0,
    previousMapDistance: prev.bestDistance,
    hallRank: inHall ? better + 1 : 0,
  }
}

export function chaseLine(bestDistance: number, current: number): string | null {
  if (bestDistance <= 0) return null
  if (current > bestDistance) return `New best +${Math.floor(current - bestDistance)}m`
  const remain = Math.max(0, Math.ceil(bestDistance - current))
  if (remain === 0) return 'Matching your best'
  return `${remain}m to PB`
}

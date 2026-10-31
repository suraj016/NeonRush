export const MapIds = {
  Emerald: 'emerald',
  Desert: 'desert',
  Frozen: 'frozen',
} as const

export type MapId = (typeof MapIds)[keyof typeof MapIds]

export type MapInfo = {
  id: MapId
  name: string
  tagline: string
  description: string
  accent: string
  tone: string
}

export const MAPS: Record<MapId, MapInfo> = {
  emerald: {
    id: 'emerald',
    name: 'Cyber Emerald',
    tagline: 'Neon megacity',
    description: 'Race the mint-lit transit spine through a dense emerald night city.',
    accent: '#00F5A0',
    tone: '#102923',
  },
  desert: {
    id: 'desert',
    name: 'Desert Frontier',
    tagline: 'Sunbaked canyons',
    description: 'Cut a trail through sandstone gorges, ruined temples, and drifting gold sand.',
    accent: '#C99A55',
    tone: '#754A32',
  },
  frozen: {
    id: 'frozen',
    name: 'Frozen Wilds',
    tagline: 'Alpine winter',
    description: 'Sprint a packed-snow path between pine forests, ice lakes, and mountain peaks.',
    accent: '#79B9D0',
    tone: '#344B60',
  },
}

export const MAP_ORDER: MapId[] = ['emerald', 'desert', 'frozen']

export function isMapId(value: unknown): value is MapId {
  return value === 'emerald' || value === 'desert' || value === 'frozen'
}

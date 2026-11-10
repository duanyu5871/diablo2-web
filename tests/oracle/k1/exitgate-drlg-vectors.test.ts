import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import * as d2kern from '../../../src/d2kern-113c/index.ts'
import {
  DRLG_FROZEN_SEEDS,
  DRLG_SEED_LIST_FNV64,
  DRLG_TOWN_LEVEL_IDS,
  type DrlgDigestRecord,
  type DrlgLevelRoomsGroup,
  computeDrlgLevelCollHash,
  computeDrlgLevelLayoutHash,
  parseDrlgCollFile,
  parseDrlgDigestFile,
  parseDrlgRoomsFile,
} from '../../../tools/oracle/vectors/drlg-vector.ts'
import { D2TV_MAGIC } from '../../../tools/oracle/vectors/vector-format.ts'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const FIXTURES_DIR = resolve(REPO_ROOT, 'tests/fixtures/oracle/vectors')
const MANIFEST_PATH = resolve(REPO_ROOT, 'tools/oracle/callgraph/manifest-113c.json')

const PINNED_SHA256 = {
  digestRaw: '2bdf75938c7e55904b354f7463c0f35334d3f130ef580681bf5d58399eeced28',
  roomsRaw: 'dc625a2bf9a4ee24c117a11fde8891d97d926c6edbae56d282edfa0690f49ee9',
  collRaw: 'a7fc68ead57379c285df1e45c92a833d9a1213dc7357099a96f298939dfee120',
} as const

const DRLG_LAYOUT_ENTRY_VAS = ['0x6FD8CB30', '0x6FD7D9B0', '0x6FD7E360'] as const
const DRLG_COLL_ENTRY_VAS = ['0x6FD8CB30', '0x6FD7D9B0', '0x6FD7E360', '0x6FDCC270'] as const

interface ManifestFunctionEntry {
  va: string
  name: string
  module: string
  size: number
  status: 'unported' | 'ported' | 'diff-verified'
  tsSymbol?: string | null
  kernFile?: string | null
  callees?: string[]
}

interface ManifestFile {
  functions: ManifestFunctionEntry[]
}

interface ClosureInfo {
  entryVas: string[]
  totalFunctions: number
  portedFunctions: number
  unportedFunctions: number
  unportedBytes: number
  unportedVas: string[]
  portedEntries: ManifestFunctionEntry[]
}

interface ExpectedDivergenceItem {
  status: 'blocked' | 'diverge'
  reason: string
  vas?: string[]
}

interface ExpectedDivergenceFile {
  schema: number
  closures: Record<
    string,
    {
      entryVas: string[]
      totalFunctions: number
      portedFunctions: number
      unportedFunctions: number
      unportedBytes: number
      unportedVas: string[]
    }
  >
  items: Record<string, ExpectedDivergenceItem>
}

function normalizeVa(va: string): string {
  const stripped = va.includes(':') ? va.split(':', 2)[1]! : va
  const hex = stripped.toLowerCase().startsWith('0x') ? stripped.slice(2) : stripped
  return `0x${hex.toUpperCase()}`
}

function computeManifestClosure(
  byVa: ReadonlyMap<string, ManifestFunctionEntry>,
  entryVas: readonly string[],
): ClosureInfo {
  const visited = new Map<string, ManifestFunctionEntry>()
  const queue = entryVas.map(normalizeVa)
  while (queue.length > 0) {
    const cur = queue.shift()!
    if (visited.has(cur)) continue
    const fn = byVa.get(cur)
    if (!fn) continue
    visited.set(cur, fn)
    for (const callee of fn.callees ?? []) {
      const cva = normalizeVa(callee)
      if (!visited.has(cva) && byVa.has(cva)) {
        queue.push(cva)
      }
    }
  }
  const unportedVas: string[] = []
  const portedEntries: ManifestFunctionEntry[] = []
  let unportedBytes = 0
  for (const [va, fn] of [...visited.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (fn.status === 'unported') {
      unportedVas.push(va)
      unportedBytes += fn.size
    } else {
      portedEntries.push(fn)
    }
  }
  return {
    entryVas: entryVas.map(normalizeVa),
    totalFunctions: visited.size,
    portedFunctions: portedEntries.length,
    unportedFunctions: unportedVas.length,
    unportedBytes,
    unportedVas,
    portedEntries,
  }
}

export interface LiveItemStatus {
  status: 'match' | 'diverge' | 'blocked'
  reason: string
  vas: string[]
}

export function verifyDrlgRatchet(
  liveByKey: ReadonlyMap<string, LiveItemStatus>,
  expected: ExpectedDivergenceFile,
  liveClosures: Record<string, ClosureInfo>,
): { matchCount: number; blockedCount: number; divergeCount: number } {
  if (expected.schema !== 1) {
    throw new Error(`Unsupported expected-divergence schema: ${expected.schema}`)
  }

  for (const [closureName, liveCl] of Object.entries(liveClosures)) {
    const expCl = expected.closures[closureName]
    if (!expCl) {
      throw new Error(`Missing closure '${closureName}' in expected-divergence file`)
    }
    if (
      expCl.unportedVas.length !== liveCl.unportedVas.length ||
      expCl.unportedVas.some((v, idx) => v !== liveCl.unportedVas[idx])
    ) {
      throw new Error(
        `Closure '${closureName}' unportedVas mismatch: expected ${expCl.unportedVas.length} VAs, live manifest has ${liveCl.unportedVas.length}`,
      )
    }
  }

  let matchCount = 0
  let blockedCount = 0
  let divergeCount = 0

  for (const [key, live] of liveByKey.entries()) {
    const exp = expected.items[key]
    if (live.status === 'match') {
      matchCount++
      if (exp) {
        throw new Error(
          `Ratchet violation (b): item '${key}' now matches real DLL; remove it from drlg-expected-divergence.json`,
        )
      }
      continue
    }

    if (live.status === 'blocked') blockedCount++
    else divergeCount++

    if (!exp) {
      throw new Error(
        `Ratchet violation (a): unlisted item '${key}' has non-match status '${live.status}' (${live.reason})`,
      )
    }
    if (exp.status !== live.status) {
      throw new Error(
        `Ratchet violation: item '${key}' expected status '${exp.status}', got '${live.status}'`,
      )
    }
    if (live.status === 'blocked') {
      const expVas = exp.vas ?? []
      if (expVas.length !== live.vas.length || expVas.some((v, i) => v !== live.vas[i])) {
        throw new Error(
          `Ratchet violation (c): blocked item '${key}' VA list mismatch: expected [${expVas.join(',')}], live [${live.vas.join(',')}]`,
        )
      }
    }
  }

  for (const key of Object.keys(expected.items)) {
    if (!liveByKey.has(key)) {
      throw new Error(`Ratchet violation: stale key '${key}' in drlg-expected-divergence.json`)
    }
  }

  return { matchCount, blockedCount, divergeCount }
}

describe('[K1-5] DRLG Real-DLL D2TV Vector Suite & Closure Ratchet', () => {
  const digGzPath = resolve(FIXTURES_DIR, 'drlg-digest-113c.d2tv.gz')
  const roomsGzPath = resolve(FIXTURES_DIR, 'drlg-rooms-s12345.d2tv.gz')
  const collGzPath = resolve(FIXTURES_DIR, 'drlg-coll-towns-s12345-d0.d2tv.gz')
  const expectedPath = resolve(FIXTURES_DIR, 'drlg-expected-divergence.json')

  const digGz = readFileSync(digGzPath)
  const roomsGz = readFileSync(roomsGzPath)
  const collGz = readFileSync(collGzPath)

  const digRaw = new Uint8Array(gunzipSync(digGz))
  const roomsRaw = new Uint8Array(gunzipSync(roomsGz))
  const collRaw = new Uint8Array(gunzipSync(collGz))

  const parsedDig = parseDrlgDigestFile(digRaw)
  const parsedRooms = parseDrlgRoomsFile(roomsRaw)
  const parsedColl = parseDrlgCollFile(collRaw)

  it('pins D2TV headers, record sizes, counts, gzip size budgets, and raw SHA-256 digests', () => {
    expect(digGz.byteLength).toBeLessThanOrEqual(1536 * 1024)
    expect(roomsGz.byteLength).toBeLessThanOrEqual(1024 * 1024)
    expect(collGz.byteLength).toBeLessThanOrEqual(200 * 1024)

    const shaDig = createHash('sha256').update(digRaw).digest('hex')
    const shaRooms = createHash('sha256').update(roomsRaw).digest('hex')
    const shaColl = createHash('sha256').update(collRaw).digest('hex')

    expect(shaDig).toBe(PINNED_SHA256.digestRaw)
    expect(shaRooms).toBe(PINNED_SHA256.roomsRaw)
    expect(shaColl).toBe(PINNED_SHA256.collRaw)

    expect(parsedDig.header.magic).toBe(D2TV_MAGIC)
    expect(parsedDig.header.version).toBe(1)
    expect(parsedDig.header.flags).toBe(1)
    expect(parsedDig.header.kind).toBe('DRLGDIG')
    expect(parsedDig.header.recordSize).toBe(56)
    expect(parsedDig.header.recordCount).toBe(20400)
    expect(parsedDig.header.seed).toBe(DRLG_SEED_LIST_FNV64)

    expect(parsedRooms.header.kind).toBe('DRLGROOM')
    expect(parsedRooms.header.recordSize).toBe(48)
    expect(parsedRooms.header.recordCount).toBe(20807)
    expect(parsedRooms.header.seed).toBe(12345n)

    expect(parsedColl.header.kind).toBe('DRLGCOLL')
    expect(parsedColl.header.recordSize).toBe(7232)
    expect(parsedColl.header.recordCount).toBe(169)
    expect(parsedColl.header.seed).toBe(12345n)
  })

  it('covers the frozen 50-seed x 3-difficulty x 136-level matrix and matches 1.13c structural invariants', () => {
    expect(DRLG_FROZEN_SEEDS.length).toBe(50)
    const seenSeeds = new Set<number>()
    const bySeedDiffLevel = new Map<string, DrlgDigestRecord>()

    for (const rec of parsedDig.records) {
      seenSeeds.add(rec.seed)
      const key = `${rec.seed}:${rec.diff}:${rec.levelId}`
      expect(bySeedDiffLevel.has(key)).toBe(false)
      bySeedDiffLevel.set(key, rec)

      expect(rec.diff).toBeGreaterThanOrEqual(0)
      expect(rec.diff).toBeLessThanOrEqual(2)
      expect(rec.levelId).toBeGreaterThanOrEqual(1)
      expect(rec.levelId).toBeLessThanOrEqual(136)
      expect([1, 2, 3]).toContain(rec.drlgType)
      expect(rec.sizeX).toBeGreaterThan(0)
      expect(rec.sizeY).toBeGreaterThan(0)
      expect(rec.nRoomsField).toBeGreaterThan(0)
      expect(rec.nRoomList).toBe(rec.nRoomsField)

      const expectedAct =
        rec.levelId <= 39 ? 0 : rec.levelId <= 74 ? 1 : rec.levelId <= 102 ? 2 : rec.levelId <= 108 ? 3 : 4
      expect(rec.act).toBe(expectedAct)
    }

    expect(seenSeeds.size).toBe(50)
    for (const seed of DRLG_FROZEN_SEEDS) {
      expect(seenSeeds.has(seed)).toBe(true)
    }

    // Probe ground-truth invariants for seed 12345, diff 0
    const l1 = bySeedDiffLevel.get('12345:0:1')!
    expect(l1.drlgType).toBe(2)
    expect(l1.posX).toBe(1104)
    expect(l1.posY).toBe(1176)
    expect(l1.sizeX).toBe(56)
    expect(l1.sizeY).toBe(40)
    expect(l1.nRoomsField).toBe(35)
    expect(l1.nCollRooms).toBe(35)

    const l2 = bySeedDiffLevel.get('12345:0:2')!
    expect(l2.drlgType).toBe(3)
    expect(l2.nRoomsField).toBe(84)

    const l8 = bySeedDiffLevel.get('12345:0:8')!
    expect(l8.drlgType).toBe(1)
    expect(l8.nRoomsField).toBe(27)

    // Difficulty-sensitive level set on nRoomsField for seed 12345 (d0 vs d2)
    const diffSensitiveLevels: number[] = []
    let totalRoomsD0 = 0
    let totalRoomsD1 = 0
    let totalRoomsD2 = 0
    for (let lvl = 1; lvl <= 136; lvl++) {
      const r0 = bySeedDiffLevel.get(`12345:0:${lvl}`)!
      const r1 = bySeedDiffLevel.get(`12345:1:${lvl}`)!
      const r2 = bySeedDiffLevel.get(`12345:2:${lvl}`)!
      totalRoomsD0 += r0.nRoomsField
      totalRoomsD1 += r1.nRoomsField
      totalRoomsD2 += r2.nRoomsField
      if (r0.nRoomsField !== r2.nRoomsField) {
        diffSensitiveLevels.push(lvl)
      }
    }
    expect(totalRoomsD0).toBe(6719)
    expect(totalRoomsD1).toBe(6810)
    expect(totalRoomsD2).toBe(6870)
    expect(totalRoomsD0 + totalRoomsD1 + totalRoomsD2 + 408).toBe(20807)
    expect(diffSensitiveLevels).toEqual([18, 19, 21, 22, 23, 24, 100, 101, 133])
  })

  it('verifies 100% self-consistency of DRLGROOM -> DRLGDIG.layoutHash across all 408 seed-12345 levels', () => {
    expect(parsedRooms.levels.length).toBe(408) // 3 diffs x 136 levels
    const groupByDiffLevel = new Map<string, DrlgLevelRoomsGroup>()
    for (const grp of parsedRooms.levels) {
      const key = `${grp.header.diff}:${grp.header.levelId}`
      expect(groupByDiffLevel.has(key)).toBe(false)
      groupByDiffLevel.set(key, grp)
    }

    let verifiedLevels = 0
    for (const dig of parsedDig.records) {
      if (dig.seed !== 12345) continue
      const key = `${dig.diff}:${dig.levelId}`
      const grp = groupByDiffLevel.get(key)
      expect(grp).toBeDefined()
      expect(grp!.rooms.length).toBe(dig.nRoomList)
      for (let i = 0; i < grp!.rooms.length; i++) {
        expect(grp!.rooms[i]!.idx).toBe(i)
        expect(grp!.rooms[i]!.levelId).toBe(dig.levelId)
      }
      const computedHash = computeDrlgLevelLayoutHash(grp!.header, grp!.rooms)
      expect(computedHash).toBe(dig.layoutHash)
      verifiedLevels++
    }
    expect(verifiedLevels).toBe(408)
  })

  it('verifies 100% self-consistency of DRLGCOLL -> DRLGDIG.collHash across all 5 town levels (169 rooms)', () => {
    let cursor = 0
    for (const townLevelId of DRLG_TOWN_LEVEL_IDS) {
      const dig = parsedDig.records.find(
        (d) => d.seed === 12345 && d.diff === 0 && d.levelId === townLevelId,
      )!
      const colls = parsedColl.records.slice(cursor, cursor + dig.nCollRooms)
      expect(colls.length).toBe(dig.nCollRooms)
      for (const c of colls) {
        expect(c.nSubtileWidth).toBe(40)
        expect(c.nSubtileHeight).toBe(40)
      }
      const computedCollHash = computeDrlgLevelCollHash(colls)
      expect(computedCollHash).toBe(dig.collHash)
      cursor += dig.nCollRooms
    }
    expect(cursor).toBe(169)
  })

  it('computes manifest callgraph closures, resolves ported kernel symbols, and enforces the shrink-only ratchet', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as ManifestFile
    const byVa = new Map<string, ManifestFunctionEntry>()
    for (const fn of manifest.functions) {
      byVa.set(normalizeVa(fn.va), fn)
    }

    const layoutClosure = computeManifestClosure(byVa, DRLG_LAYOUT_ENTRY_VAS)
    const collClosure = computeManifestClosure(byVa, DRLG_COLL_ENTRY_VAS)

    expect(layoutClosure.totalFunctions).toBe(305)
    expect(layoutClosure.portedFunctions).toBe(143)
    expect(layoutClosure.unportedFunctions).toBe(162)
    expect(layoutClosure.unportedBytes).toBe(57261)

    expect(collClosure.totalFunctions).toBe(306)
    expect(collClosure.portedFunctions).toBe(143)
    expect(collClosure.unportedFunctions).toBe(163)
    expect(collClosure.unportedBytes).toBe(57335)

    // Every ported / diff-verified function in the DRLG closure must resolve dynamically from src/d2kern-113c/index.ts
    const kernExports = d2kern as Record<string, unknown>
    for (const fn of collClosure.portedEntries) {
      expect(fn.tsSymbol, `Missing tsSymbol on ported manifest entry ${fn.va}`).toBeTruthy()
      expect(
        typeof kernExports[fn.tsSymbol!],
        `Ported symbol ${fn.tsSymbol} (${fn.va}) is missing from src/d2kern-113c/index.ts`,
      ).toBe('function')
    }

    const unpLayoutRoots = layoutClosure.entryVas
      .filter((va) => byVa.get(va)?.status === 'unported')
      .sort()
    const unpCollRoots = collClosure.entryVas
      .filter((va) => byVa.get(va)?.status === 'unported')
      .sort()

    const townSet = new Set<number>(DRLG_TOWN_LEVEL_IDS)
    const liveByKey = new Map<string, LiveItemStatus>()
    for (const rec of parsedDig.records) {
      const key = `${rec.seed}:${rec.diff}:${rec.levelId}`
      const isColl = rec.seed === 12345 && rec.diff === 0 && townSet.has(rec.levelId)
      const unpRoots = isColl ? unpCollRoots : unpLayoutRoots
      liveByKey.set(key, {
        status: unpRoots.length > 0 ? 'blocked' : 'match',
        reason: isColl ? 'collision' : 'layout',
        vas: unpRoots,
      })
    }

    const expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as ExpectedDivergenceFile
    const summary = verifyDrlgRatchet(liveByKey, expected, {
      layout: layoutClosure,
      collision: collClosure,
    })

    expect(summary).toEqual({
      matchCount: 0,
      blockedCount: 20400,
      divergeCount: 0,
    })

    // Mutation checks: prove the ratchet rejects (a) missing entry, (b) newly matched entry still in list, (c) altered VA list
    const cloneMissing = structuredClone(expected)
    delete cloneMissing.items['12345:0:1']
    expect(() =>
      verifyDrlgRatchet(liveByKey, cloneMissing, {
        layout: layoutClosure,
        collision: collClosure,
      }),
    ).toThrow(/Ratchet violation \(a\)/)

    const liveWithMatch = new Map(liveByKey)
    liveWithMatch.set('12345:0:1', { status: 'match', reason: 'collision', vas: [] })
    expect(() =>
      verifyDrlgRatchet(liveWithMatch, expected, {
        layout: layoutClosure,
        collision: collClosure,
      }),
    ).toThrow(/Ratchet violation \(b\)/)

    const cloneBadVas = structuredClone(expected)
    cloneBadVas.items['12345:0:1']!.vas = ['0x6FD8CB30']
    expect(() =>
      verifyDrlgRatchet(liveByKey, cloneBadVas, {
        layout: layoutClosure,
        collision: collClosure,
      }),
    ).toThrow(/Ratchet violation \(c\)/)
  })
})

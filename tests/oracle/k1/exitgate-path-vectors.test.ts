import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import * as d2kern from '../../../src/d2kern-113c/index.ts'
import {
  PATH_SetTargetPos113c,
  PATH_SetType113c,
  SparseMemory113c,
} from '../../../src/d2kern-113c/index.ts'
import {
  PATH_META_MAGIC,
  PATH_PREFLAG_SET_PREV_TYPE,
  PATH_PREFLAG_SET_VELOCITY,
  PATH_PREFLAG_SKIP_SET_TYPE,
  loadPathWorldIntoMemory,
  parsePathVectors,
  parsePathWorldImage,
} from '../../../tools/oracle/vectors/path-vector.ts'
import { parseDrlgCollFile } from '../../../tools/oracle/vectors/drlg-vector.ts'
import { D2TV_MAGIC } from '../../../tools/oracle/vectors/vector-format.ts'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const FIXTURES_DIR = resolve(REPO_ROOT, 'tests/fixtures/oracle/vectors')
const MANIFEST_PATH = resolve(REPO_ROOT, 'tools/oracle/callgraph/manifest-113c.json')

const PINNED_SHA256 = {
  vectorsRaw: 'eb59554dc7b5d0bb4e79211c8042fa24ca1a5a6e61e56fd3a919c9ec7d9068dc',
  worldImgRaw: '7938797317be1ce51e911a6788ceb886fa8437d5c59bb0230a2b18520546123b',
} as const

const PATH_ENTRY_VAS = ['0x6FD86030', '0x6FD86230', '0x6FD84F80', '0x6FD849D0'] as const

const HANDLER_BY_PATHTYPE: Readonly<Record<number, string>> = {
  0: '0x6FDC0E40',
  1: '0x6FDCB630',
  2: '0x6FDB78B0',
  3: '0x6FDB7B70',
  4: '0x6FD85780',
  5: '0x6FDB78B0',
  6: '0x6FDB78B0',
  7: '0x6FDB7AD0',
  8: '0x6FDB7390',
  9: '0x6FDB77F0',
  10: '0x6FD85780',
  11: '0x6FDB77C0',
  12: '0x6FDB7850',
  13: '0x6FDB78B0',
  14: '0x6FD85780',
  15: '0x6FD68C40',
  16: '0x6FDC0E40',
  17: '0x6FD86230',
}

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

export interface LivePathStatus {
  status: 'match' | 'diverge' | 'blocked'
  reason: string
  vas: string[]
}

export function verifyPathRatchet(
  liveByIdx: ReadonlyMap<string, LivePathStatus>,
  expected: ExpectedDivergenceFile,
  liveClosure: ClosureInfo,
): { matchCount: number; blockedCount: number; divergeCount: number } {
  if (expected.schema !== 1) {
    throw new Error(`Unsupported expected-divergence schema: ${expected.schema}`)
  }
  const expCl = expected.closures['path']
  if (!expCl) {
    throw new Error(`Missing closure 'path' in path-expected-divergence.json`)
  }
  if (
    expCl.unportedVas.length !== liveClosure.unportedVas.length ||
    expCl.unportedVas.some((v, idx) => v !== liveClosure.unportedVas[idx])
  ) {
    throw new Error(
      `Closure 'path' unportedVas mismatch: expected ${expCl.unportedVas.length} VAs, live manifest has ${liveClosure.unportedVas.length}`,
    )
  }

  let matchCount = 0
  let blockedCount = 0
  let divergeCount = 0

  for (const [key, live] of liveByIdx.entries()) {
    const exp = expected.items[key]
    if (live.status === 'match') {
      matchCount++
      if (exp) {
        throw new Error(
          `Ratchet violation (b): vector '${key}' now matches real DLL; remove it from path-expected-divergence.json`,
        )
      }
      continue
    }

    if (live.status === 'blocked') blockedCount++
    else divergeCount++

    if (!exp) {
      throw new Error(
        `Ratchet violation (a): unlisted vector '${key}' has non-match status '${live.status}' (${live.reason})`,
      )
    }
    if (exp.status !== live.status) {
      throw new Error(
        `Ratchet violation: vector '${key}' expected status '${exp.status}', got '${live.status}'`,
      )
    }
    if (live.status === 'blocked') {
      const expVas = exp.vas ?? []
      if (expVas.length !== live.vas.length || expVas.some((v, i) => v !== live.vas[i])) {
        throw new Error(
          `Ratchet violation (c): blocked vector '${key}' VA list mismatch: expected [${expVas.join(',')}], live [${live.vas.join(',')}]`,
        )
      }
    }
  }

  for (const key of Object.keys(expected.items)) {
    if (!liveByIdx.has(key)) {
      throw new Error(`Ratchet violation: stale vector key '${key}' in path-expected-divergence.json`)
    }
  }

  return { matchCount, blockedCount, divergeCount }
}

describe('[K1-6] PATH Real-DLL D2TV Vector Suite, World Image & Closure Ratchet', () => {
  const vecGzPath = resolve(FIXTURES_DIR, 'path-vectors-113c.d2tv.gz')
  const imgGzPath = resolve(FIXTURES_DIR, 'path-world-town-s12345.img.gz')
  const collGzPath = resolve(FIXTURES_DIR, 'drlg-coll-towns-s12345-d0.d2tv.gz')
  const expectedPath = resolve(FIXTURES_DIR, 'path-expected-divergence.json')

  const vecGz = readFileSync(vecGzPath)
  const imgGz = readFileSync(imgGzPath)
  const collGz = readFileSync(collGzPath)

  const vecRaw = new Uint8Array(gunzipSync(vecGz))
  const imgRaw = new Uint8Array(gunzipSync(imgGz))
  const collRaw = new Uint8Array(gunzipSync(collGz))

  const parsedVec = parsePathVectors(vecRaw)
  const parsedImg = parsePathWorldImage(imgRaw)
  const parsedColl = parseDrlgCollFile(collRaw)

  it('pins D2TV headers, record sizes, counts, gzip size budgets, and raw SHA-256 digests', () => {
    expect(vecGz.byteLength).toBeLessThanOrEqual(1024 * 1024)
    expect(imgGz.byteLength).toBeLessThanOrEqual(1024 * 1024)

    const shaVec = createHash('sha256').update(vecRaw).digest('hex')
    const shaImg = createHash('sha256').update(imgRaw).digest('hex')

    expect(shaVec).toBe(PINNED_SHA256.vectorsRaw)
    expect(shaImg).toBe(PINNED_SHA256.worldImgRaw)

    expect(parsedVec.header.magic).toBe(D2TV_MAGIC)
    expect(parsedVec.header.version).toBe(1)
    expect(parsedVec.header.flags).toBe(1)
    expect(parsedVec.header.kind).toBe('PATHVEC')
    expect(parsedVec.header.recordSize).toBe(460)
    expect(parsedVec.header.recordCount).toBe(6924)
    expect(parsedVec.header.seed).toBe(12345n)

    expect(parsedImg.header.magic).toBe(D2TV_MAGIC)
    expect(parsedImg.header.version).toBe(1)
    expect(parsedImg.header.flags).toBe(1)
    expect(parsedImg.header.kind).toBe('PAGEIMG')
    expect(parsedImg.header.recordSize).toBe(4100)
    expect(parsedImg.header.recordCount).toBe(66)
    expect(parsedImg.header.seed).toBe(12345n)

    expect(parsedImg.meta.magic).toBe(PATH_META_MAGIC)
    expect(parsedImg.meta.version).toBe(1)
    expect(parsedImg.meta.seed).toBe(12345)
    expect(parsedImg.meta.diff).toBe(0)
    expect(parsedImg.meta.nActiveRooms).toBe(35)
    expect(parsedImg.meta.activeRoomVas.length).toBe(35)
    expect(parsedImg.pages.length).toBe(65) // 55 arena pages + 10 D2Common pages
  })

  it('verifies full PATHTYPE 0..17 coverage table, positive returns for 0..16, and documented Fog.#10024 asserts', () => {
    const nonFaultByType = new Array<number>(18).fill(0)
    const posRetByType = new Array<number>(18).fill(0)
    const assertByType = new Array<number>(18).fill(0)
    const maxPtsByType = new Array<number>(18).fill(0)

    for (const rec of parsedVec.records) {
      expect(rec.pathType).toBeGreaterThanOrEqual(0)
      expect(rec.pathType).toBeLessThan(18)
      // Zero hardware access violations across all 6,924 vectors
      expect(rec.faultKind).not.toBe(1)

      if (rec.faultKind === 0) {
        nonFaultByType[rec.pathType]!++
        if (rec.ret > 0 && rec.dwPathPoints > 0) {
          posRetByType[rec.pathType]!++
          if (rec.dwPathPoints > maxPtsByType[rec.pathType]!) {
            maxPtsByType[rec.pathType] = rec.dwPathPoints
          }
          expect(rec.dwPathPoints).toBeLessThanOrEqual(78)
        }
      } else if (rec.faultKind === 2) {
        assertByType[rec.pathType]!++
        expect(rec.faultCode).toBe(0xe0000024)
      }
    }

    // Every PATHTYPE 0..16 must have positive-return vectors (ret > 0 && dwPathPoints > 0)
    for (let t = 0; t <= 16; t++) {
      expect(nonFaultByType[t], `PATHTYPE ${t} nonFault count`).toBeGreaterThan(0)
      expect(posRetByType[t], `PATHTYPE ${t} posRet count`).toBeGreaterThan(0)
    }

    // Specific PATHTYPE coverage invariants
    expect(posRetByType[0]).toBe(148) // IDA* (>=2 corners required by 0x6FDC0650)
    expect(posRetByType[1]).toBe(318) // A*
    expect(posRetByType[2]).toBe(160) // TOWARD (valid on monsters)
    expect(assertByType[2]).toBe(181) // TOWARD asserts at line 0x861 (2145) on players
    expect(posRetByType[4]).toBe(360) // MON_CIRCLE (requires nDistMax < 0x4E)
    expect(assertByType[4]).toBe(2) // asserts at line 0x873 (2163) when nDistMax >= 0x4E
    expect(posRetByType[8]).toBe(315) // KNOCKBACK_SERVER
    expect(posRetByType[9]).toBe(264) // LEAP
    expect(posRetByType[10]).toBe(384) // FLEE
    expect(posRetByType[11]).toBe(262) // KNOCKBACK_CLIENT
    expect(posRetByType[14]).toBe(384) // BLESSEDHAMMER (77-point spiral)
    expect(maxPtsByType[14]).toBe(77)
    expect(posRetByType[17]).toBe(0) // NULL handler in 0x6FDDE360
    expect(assertByType[17]).toBe(318) // asserts at line 0x37E (894) via IsBadCodePtr(NULL)

    // Verify the 12 explicit pre-state / assert edge-case records (indices 6912..6923)
    const expPrev11 = parsedVec.records[6912]!
    expect(expPrev11.preFlags & PATH_PREFLAG_SET_PREV_TYPE).toBeTruthy()
    expect(expPrev11.prevPathType).toBe(11)
    expect(expPrev11.faultKind).toBe(0)
    expect(expPrev11.dwPrevPathType).toBe(0) // pathType 0 has no 0x2000 bit in gdwPathTypeFlags
    expect(expPrev11.ret).toBeGreaterThan(0)

    const expPrev8 = parsedVec.records[6914]!
    expect(expPrev8.preFlags & PATH_PREFLAG_SET_PREV_TYPE).toBeTruthy()
    expect(expPrev8.prevPathType).toBe(8)
    expect(expPrev8.faultKind).toBe(0)
    expect(expPrev8.dwPrevPathType).toBe(0)
    expect(expPrev8.ret).toBeGreaterThan(0)

    const expDistMax = parsedVec.records[6916]!
    expect(expDistMax.pathType).toBe(4)
    expect(expDistMax.nDistMax).toBe(0x4e)
    expect(expDistMax.faultKind).toBe(2)
    expect(expDistMax.faultStage).toBe(2)
    expect(expDistMax.faultLine).toBe(0x873) // 2163

    const expAllocFlag = parsedVec.records[6918]!
    expect(expAllocFlag.bAllocFlag).toBe(1)
    expect(expAllocFlag.dwFlags & 0x10).toBe(0x10)

    const expVel = parsedVec.records[6920]!
    expect(expVel.preFlags & PATH_PREFLAG_SET_VELOCITY).toBeTruthy()
    expect(expVel.dwPrevPathType).toBe(7) // pathType 9 (LEAP) has 0x2000 bit -> saves prev type 7
    expect(expVel.ret).toBeGreaterThan(0)

    const expSkipPlayer = parsedVec.records[6922]!
    expect(expSkipPlayer.preFlags & PATH_PREFLAG_SKIP_SET_TYPE).toBeTruthy()
    expect(expSkipPlayer.dwPathType).toBe(7)

    const expSkipMon = parsedVec.records[6923]!
    expect(expSkipMon.preFlags & PATH_PREFLAG_SKIP_SET_TYPE).toBeTruthy()
    expect(expSkipMon.dwPathType).toBe(2)
  })

  it('loads PAGEIMG into SparseMemory113c, verifies L1 ActiveRooms/CollisionGrids, and replays ported PATH_SetType113c + PATH_SetTargetPos113c', () => {
    const mem = new SparseMemory113c()
    loadPathWorldIntoMemory(mem, parsedImg.pages)

    const { meta } = parsedImg
    expect(mem.u32(meta.pActVa + 0x0c)).toBe(12345) // pAct->dwInitSeed
    expect(mem.u32(meta.pActVa + 0x48)).toBe(meta.pDrlgVa) // pAct->pDrlg
    expect(mem.u32(meta.pLevelVa + 0x1d0)).toBe(1) // pLevel->dwLevelNo == 1 (Rogue Encampment)

    // Cross-verify the 35 ActiveRooms and their CollisionGrids in SparseMemory113c against DRLGCOLL L1 (first 35 records)
    const loadedPageSet = new Set<number>(parsedImg.pages.map((p) => p.va >>> 12))
    const l1Colls = parsedColl.records.slice(0, 35)
    expect(l1Colls.length).toBe(35)
    let roomsWithTouchedMap = 0
    for (let i = 0; i < 35; i++) {
      const roomVa = meta.activeRoomVas[i]!
      const pColl = mem.u32(roomVa + 0x20)
      expect(pColl).toBeGreaterThan(0)
      const subX = mem.u32(pColl + 0x00) | 0
      const subY = mem.u32(pColl + 0x04) | 0
      const subW = mem.u32(pColl + 0x08) | 0
      const subH = mem.u32(pColl + 0x0c) | 0
      const pMap = mem.u32(pColl + 0x20)

      expect(subX).toBe(l1Colls[i]!.nSubtileX)
      expect(subY).toBe(l1Colls[i]!.nSubtileY)
      expect(subW).toBe(40)
      expect(subH).toBe(40)

      // Check 16-bit subtile collision cells on all rooms whose map pages were touched by the 6,924 vectors
      if (
        loadedPageSet.has(pMap >>> 12) &&
        loadedPageSet.has((pMap + 799 * 2) >>> 12) &&
        loadedPageSet.has((pMap + 1599 * 2) >>> 12)
      ) {
        expect(mem.u16(pMap)).toBe(l1Colls[i]!.mapWords[0])
        expect(mem.u16(pMap + 799 * 2)).toBe(l1Colls[i]!.mapWords[799])
        expect(mem.u16(pMap + 1599 * 2)).toBe(l1Colls[i]!.mapWords[1599])
        roomsWithTouchedMap++
      }
    }
    expect(roomsWithTouchedMap).toBe(18)

    // Replay ported Stage 2 (#10647 PATH_SetType113c) & Stage 3 (#10286 PATH_SetTargetPos113c) on SparseMemory113c
    let replayedOk = 0
    let replayedStage2Asserts = 0
    for (const rec of parsedVec.records) {
      if (rec.preFlags & PATH_PREFLAG_SKIP_SET_TYPE) continue

      const pUnit = meta.pUnitVa
      const pPath = meta.pPathVa
      for (let off = 0; off < 0x200; off += 4) {
        mem.setU32(pPath + off, 0)
      }
      mem.setU32(pUnit + 0x00, rec.unitType)
      mem.setU32(pUnit + 0x04, rec.classId)
      mem.setU32(pPath + 0x30, pUnit)
      mem.setU8(pPath + 0x91, rec.nDistMax !== 0xff ? rec.nDistMax : 14)

      // Replicate #11003 initial pathType setup before the explicit #10647 call
      if (rec.unitType === 0) {
        PATH_SetType113c(mem, pPath, 7)
      } else if (rec.unitType === 1) {
        mem.setU32(pPath + 0x3c, 2)
      } else if (rec.unitType === 3) {
        PATH_SetType113c(mem, pPath, 4)
      }

      if (rec.nDistMax !== 0xff) {
        mem.setU8(pPath + 0x91, rec.nDistMax)
      }
      if (rec.preFlags & PATH_PREFLAG_SET_PREV_TYPE) {
        mem.setU32(pPath + 0x3c, rec.prevPathType)
      }

      if (rec.faultStage === 2) {
        expect(() => PATH_SetType113c(mem, pPath, rec.pathType)).toThrow(
          new RegExp(`^D2Common assertion failed at .*:${rec.faultLine}$`),
        )
        replayedStage2Asserts++
      } else {
        PATH_SetType113c(mem, pPath, rec.pathType)
        PATH_SetTargetPos113c(mem, pPath, rec.targetX, rec.targetY)
        expect(mem.u32(pPath + 0x3c)).toBe(rec.dwPathType)
        expect(mem.u32(pPath + 0x40)).toBe(rec.dwPrevPathType)
        expect(mem.u16(pPath + 0x10)).toBe(rec.targetX)
        expect(mem.u16(pPath + 0x12)).toBe(rec.targetY)
        replayedOk++
      }
    }
    expect(replayedStage2Asserts).toBe(130) // 128 line 2145 + 2 line 2163
    expect(replayedOk).toBe(6792)

    // Also verify line 2161 (dwPrevPathType == 11) and line 2162 (dwPrevPathType == 8) when switching to a 0x2000-flag pathType (9 = LEAP)
    mem.setU32(meta.pPathVa + 0x34, 0)
    mem.setU32(meta.pPathVa + 0x3c, 11)
    expect(() => PATH_SetType113c(mem, meta.pPathVa, 9)).toThrow(/^D2Common assertion failed at .*:2161$/)
    mem.setU32(meta.pPathVa + 0x34, 0)
    mem.setU32(meta.pPathVa + 0x3c, 8)
    expect(() => PATH_SetType113c(mem, meta.pPathVa, 9)).toThrow(/^D2Common assertion failed at .*:2162$/)
  })

  it('computes manifest callgraph closure, resolves ported kernel symbols, and enforces the shrink-only ratchet', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as ManifestFile
    const byVa = new Map<string, ManifestFunctionEntry>()
    for (const fn of manifest.functions) {
      byVa.set(normalizeVa(fn.va), fn)
    }

    const pathClosure = computeManifestClosure(byVa, PATH_ENTRY_VAS)
    expect(pathClosure.totalFunctions).toBe(104)
    expect(pathClosure.portedFunctions).toBe(71)
    expect(pathClosure.unportedFunctions).toBe(33)
    expect(pathClosure.unportedBytes).toBe(11637)

    // Dynamically resolve all 68 ported / diff-verified symbols in the PATH closure from src/d2kern-113c/index.ts
    const kernExports = d2kern as Record<string, unknown>
    for (const fn of pathClosure.portedEntries) {
      expect(fn.tsSymbol, `Missing tsSymbol on ported manifest entry ${fn.va}`).toBeTruthy()
      expect(
        typeof kernExports[fn.tsSymbol!],
        `Ported symbol ${fn.tsSymbol} (${fn.va}) is missing from src/d2kern-113c/index.ts`,
      ).toBe('function')
    }

    const liveByIdx = new Map<string, LivePathStatus>()
    for (let i = 0; i < parsedVec.records.length; i++) {
      const rec = parsedVec.records[i]!
      const candVas =
        rec.faultStage === 2
          ? ['0x6FD86030', '0x6FD84F80']
          : ['0x6FD86030', '0x6FD84F80', '0x6FD849D0', '0x6FD86230', HANDLER_BY_PATHTYPE[rec.pathType]!]
      const unpVas = [...new Set(candVas.filter((va) => byVa.get(va)?.status === 'unported'))].sort()
      liveByIdx.set(String(i), {
        status: unpVas.length > 0 ? 'blocked' : 'match',
        reason: 'path',
        vas: unpVas,
      })
    }

    const expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as ExpectedDivergenceFile
    const summary = verifyPathRatchet(liveByIdx, expected, pathClosure)

    expect(summary).toEqual({
      matchCount: 0,
      blockedCount: 6924,
      divergeCount: 0,
    })

    // Mutation checks: prove the ratchet rejects (a) missing entry, (b) newly matched entry still in list, (c) altered VA list
    const cloneMissing = structuredClone(expected)
    delete cloneMissing.items['0']
    expect(() => verifyPathRatchet(liveByIdx, cloneMissing, pathClosure)).toThrow(
      /Ratchet violation \(a\)/,
    )

    const liveWithMatch = new Map(liveByIdx)
    liveWithMatch.set('0', { status: 'match', reason: 'path', vas: [] })
    expect(() => verifyPathRatchet(liveWithMatch, expected, pathClosure)).toThrow(
      /Ratchet violation \(b\)/,
    )

    const cloneBadVas = structuredClone(expected)
    cloneBadVas.items['0']!.vas = ['0x6FD86030']
    expect(() => verifyPathRatchet(liveByIdx, cloneBadVas, pathClosure)).toThrow(
      /Ratchet violation \(c\)/,
    )
  })
})

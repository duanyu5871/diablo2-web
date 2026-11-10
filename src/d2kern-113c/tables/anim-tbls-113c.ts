/**
 * Diablo II v1.13c `D2Common.dll` Act 5 outdoor room level-link callbacks (`0x6FD90E10..0x6FD90FC0`, image base `0x6FD50000`).
 *
 * Batch `B009` (3 functions assigned to `tables/anim-tbls-113c.ts` in callgraph survey):
 * - `0x6FD90E10` `DRLGOUTROOM_LinkLevelsByOffsetCoords113c` (internal, `__fastcall(ecx=pLinkData)`)
 * - `0x6FD90F00` `DRLGOUTROOM_LinkLevelsByLevelDef113c` (internal, `__fastcall(ecx=pLinkData)`)
 * - `0x6FD90FC0` `DRLGOUTROOM_LinkLevelsByLevelCoords113c` (internal, `__fastcall(ecx=pLinkData)`)
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import { D2CommonAssertError } from '../common/inline-helpers.ts'
import {
  D2AnimDataRecordStrc,
  D2AnimDataRecordStrc_SIZE,
  D2AnimDataTableStrc,
  D2DrlgCoordStrc,
  D2DrlgCoordStrc_SIZE,
  D2DrlgLevelLinkDataStrc,
  D2LevelDefBin,
} from '../mem/layout.generated.ts'
import { DATATBLS_GetLevelDefRecord113c } from './lvl-tbls-113c.ts'

/** `.rdata` `int32[4][2]` offset table at `0x6FDE380C..0x6FDE3828` used by `0x6FD90E10`. */
const LINK_OFFSET_COORDS_113C: readonly [number, number][] = [
  [0, -160],
  [-96, -64],
  [-64, -96],
  [-160, 0],
]

/**
 * `@va D2Common:0x6FD90E10` (internal, `__fastcall(ecx=pLinkData) -> BOOL`, `ret`).
 *
 * - Reads `it = pLinkData->nIteration (+0x1EC)` and `r1 = pLinkData->nRand1[it] (+0x138 + it*4)`.
 * - If `r1 === -1`:
 *   - Advances the 64-bit LCG at `[pLinkData+0x00, pLinkData+0x04]` (`seedLo * 0x6AC690C5 + seedHi`),
 *     writes `[newLo, newHi]`, and sets `nRand1[it] = nRand0[it] = newLo & 1`.
 * - Else:
 *   - Reads `r0 = pLinkData->nRand0[it] (+0xFC + it*4)` and computes `flipped = (r0 === 0 ? 1 : 0)`.
 *   - If `flipped === r1`, returns `0` immediately without writing.
 *   - Writes `pLinkData->nRand0[it] = flipped`.
 * - Sets `pCoord[it].nWidth/nHeight` to `(64, 160)` when `nRand0[it] === 0` or `(160, 64)` when `nRand0[it] === 1`,
 *   looks up `(dx, dy)` in `0x6FDE380C` indexed by `nRand0[it] + 2 * nRand0[linkIdx]` where
 *   `linkIdx = *(int32*)(pLinkData->pLink (+0xF8) + it*16 + 8)`, and sets
 *   `pCoord[it].nPosX = pCoord[linkIdx].nPosX + dx`, `pCoord[it].nPosY = pCoord[linkIdx].nPosY + dy`.
 * - Returns `1`.
 */
export function DRLGOUTROOM_LinkLevelsByOffsetCoords113c(
  m: Memory113c,
  pLinkData: number,
): number {
  const it = m.get(pLinkData, D2DrlgLevelLinkDataStrc.nIteration) | 0
  const r1Addr = (pLinkData + D2DrlgLevelLinkDataStrc.nRand1.off + it * 4) >>> 0
  const r0Addr = (pLinkData + D2DrlgLevelLinkDataStrc.nRand0.off + it * 4) >>> 0
  const r1 = m.u32(r1Addr) | 0

  if (r1 === -1) {
    const seedLo = BigInt(m.get(pLinkData, D2DrlgLevelLinkDataStrc.seedLo))
    const seedHi = BigInt(m.get(pLinkData, D2DrlgLevelLinkDataStrc.seedHi))
    const prod = seedLo * 0x6ac690c5n + seedHi
    const newLo = Number(prod & 0xffffffffn) >>> 0
    const newHi = Number((prod >> 32n) & 0xffffffffn) >>> 0
    m.set(pLinkData, D2DrlgLevelLinkDataStrc.seedLo, newLo)
    m.set(pLinkData, D2DrlgLevelLinkDataStrc.seedHi, newHi)
    const bit = newLo & 1
    m.setU32(r1Addr, bit)
    m.setU32(r0Addr, bit)
  } else {
    const r0 = m.u32(r0Addr) | 0
    const flipped = r0 === 0 ? 1 : 0
    if (flipped === r1) return 0
    m.setU32(r0Addr, flipped)
  }

  const pLink = m.get(pLinkData, D2DrlgLevelLinkDataStrc.pLink)
  const esi = m.u32(r0Addr) | 0
  const linkIdx = m.u32((pLink + it * 16 + 8) >>> 0) | 0
  const ebx = m.u32((pLinkData + D2DrlgLevelLinkDataStrc.nRand0.off + linkIdx * 4) >>> 0) | 0

  const coordIt = (pLinkData + D2DrlgLevelLinkDataStrc.nPosX.off + it * D2DrlgCoordStrc_SIZE) >>> 0
  const coordLink =
    (pLinkData + D2DrlgLevelLinkDataStrc.nPosX.off + linkIdx * D2DrlgCoordStrc_SIZE) >>> 0

  if (esi === 0) {
    m.set(coordIt, D2DrlgCoordStrc.nWidth, 0x40)
    m.set(coordIt, D2DrlgCoordStrc.nHeight, 0xa0)
  } else if (esi === 1) {
    m.set(coordIt, D2DrlgCoordStrc.nWidth, 0xa0)
    m.set(coordIt, D2DrlgCoordStrc.nHeight, 0x40)
  }

  const pairIdx = (esi + ebx * 2) | 0
  const [dx, dy] = LINK_OFFSET_COORDS_113C[pairIdx]!
  m.set(coordIt, D2DrlgCoordStrc.nPosX, (m.get(coordLink, D2DrlgCoordStrc.nPosX) + dx) >>> 0)
  m.set(coordIt, D2DrlgCoordStrc.nPosY, (m.get(coordLink, D2DrlgCoordStrc.nPosY) + dy) >>> 0)
  return 1
}

/**
 * `@va D2Common:0x6FD90F00` (internal, `__fastcall(ecx=pLinkData) -> BOOL`, `ret`).
 *
 * - Advances the 64-bit LCG at `[pLinkData+0x00, pLinkData+0x04]`, sets `bit = newLo & 1`,
 *   and writes `bit` to `nRand0[it]` and `nRand1[it]` where `it = pLinkData->nIteration (+0x1EC)`.
 * - Sets `pCoord[it].nWidth/nHeight` to `(64, 160)` if `bit === 0` or `(160, 64)` if `bit === 1`.
 * - Calls `DATATBLS_GetLevelDefRecord(pLinkData->nCurrentLevel (+0x1F0))` (`0x6FDBCB20`) and copies
 *   `pLevelDef->dwOffsetX (+0x24)` and `pLevelDef->dwOffsetY (+0x28)` to `pCoord[it].nPosX` and `pCoord[it].nPosY`.
 * - Returns `1`.
 */
export function DRLGOUTROOM_LinkLevelsByLevelDef113c(
  m: Memory113c,
  pLinkData: number,
): number {
  const seedLo = BigInt(m.get(pLinkData, D2DrlgLevelLinkDataStrc.seedLo))
  const seedHi = BigInt(m.get(pLinkData, D2DrlgLevelLinkDataStrc.seedHi))
  const prod = seedLo * 0x6ac690c5n + seedHi
  const newLo = Number(prod & 0xffffffffn) >>> 0
  const newHi = Number((prod >> 32n) & 0xffffffffn) >>> 0
  m.set(pLinkData, D2DrlgLevelLinkDataStrc.seedHi, newHi)
  m.set(pLinkData, D2DrlgLevelLinkDataStrc.seedLo, newLo)

  const bit = newLo & 1
  const it = m.get(pLinkData, D2DrlgLevelLinkDataStrc.nIteration) | 0
  m.setU32((pLinkData + D2DrlgLevelLinkDataStrc.nRand0.off + it * 4) >>> 0, bit)
  m.setU32((pLinkData + D2DrlgLevelLinkDataStrc.nRand1.off + it * 4) >>> 0, bit)

  const coordIt = (pLinkData + D2DrlgLevelLinkDataStrc.nPosX.off + it * D2DrlgCoordStrc_SIZE) >>> 0
  if (bit === 0) {
    m.set(coordIt, D2DrlgCoordStrc.nWidth, 0x40)
    m.set(coordIt, D2DrlgCoordStrc.nHeight, 0xa0)
  } else {
    m.set(coordIt, D2DrlgCoordStrc.nWidth, 0xa0)
    m.set(coordIt, D2DrlgCoordStrc.nHeight, 0x40)
  }

  const nLvl = m.get(pLinkData, D2DrlgLevelLinkDataStrc.nCurrentLevel) | 0
  const pLevelDef = DATATBLS_GetLevelDefRecord113c(m, nLvl)
  m.set(coordIt, D2DrlgCoordStrc.nPosX, m.get(pLevelDef, D2LevelDefBin.dwOffsetX))
  m.set(coordIt, D2DrlgCoordStrc.nPosY, m.get(pLevelDef, D2LevelDefBin.dwOffsetY))
  return 1
}

/**
 * `@va D2Common:0x6FD90FC0` (internal, `__fastcall(ecx=pLinkData) -> BOOL`, `ret`).
 *
 * - Advances the 64-bit LCG at `[pLinkData+0x00, pLinkData+0x04]`, sets `bit = newLo & 1`,
 *   and writes `bit` to `nRand0[it]` and `nRand1[it]` where `it = pLinkData->nIteration (+0x1EC)`.
 * - Sets `pCoord[it].nWidth/nHeight` to `(64, 160)` if `bit === 0` or `(160, 64)` if `bit === 1`.
 * - Reads `linkIdx = *(int32*)(pLinkData->pLink (+0xF8) + it*16 + 8)` and sets:
 *   - `pCoord[it].nPosX = pCoord[linkIdx].nPosX - pCoord[it].nWidth`
 *   - `pCoord[it].nPosY = pCoord[linkIdx].nHeight - pCoord[it].nHeight + pCoord[linkIdx].nPosY - 16`
 * - Returns `1`.
 */
export function DRLGOUTROOM_LinkLevelsByLevelCoords113c(
  m: Memory113c,
  pLinkData: number,
): number {
  const seedLo = BigInt(m.get(pLinkData, D2DrlgLevelLinkDataStrc.seedLo))
  const seedHi = BigInt(m.get(pLinkData, D2DrlgLevelLinkDataStrc.seedHi))
  const prod = seedLo * 0x6ac690c5n + seedHi
  const newLo = Number(prod & 0xffffffffn) >>> 0
  const newHi = Number((prod >> 32n) & 0xffffffffn) >>> 0
  m.set(pLinkData, D2DrlgLevelLinkDataStrc.seedHi, newHi)
  m.set(pLinkData, D2DrlgLevelLinkDataStrc.seedLo, newLo)

  const bit = newLo & 1
  const it = m.get(pLinkData, D2DrlgLevelLinkDataStrc.nIteration) | 0
  m.setU32((pLinkData + D2DrlgLevelLinkDataStrc.nRand0.off + it * 4) >>> 0, bit)
  m.setU32((pLinkData + D2DrlgLevelLinkDataStrc.nRand1.off + it * 4) >>> 0, bit)

  const coordIt = (pLinkData + D2DrlgLevelLinkDataStrc.nPosX.off + it * D2DrlgCoordStrc_SIZE) >>> 0
  if (bit === 0) {
    m.set(coordIt, D2DrlgCoordStrc.nWidth, 0x40)
    m.set(coordIt, D2DrlgCoordStrc.nHeight, 0xa0)
  } else {
    m.set(coordIt, D2DrlgCoordStrc.nWidth, 0xa0)
    m.set(coordIt, D2DrlgCoordStrc.nHeight, 0x40)
  }

  const pLink = m.get(pLinkData, D2DrlgLevelLinkDataStrc.pLink)
  const linkIdx = m.u32((pLink + it * 16 + 8) >>> 0) | 0
  const coordLink =
    (pLinkData + D2DrlgLevelLinkDataStrc.nPosX.off + linkIdx * D2DrlgCoordStrc_SIZE) >>> 0

  const wIt = m.get(coordIt, D2DrlgCoordStrc.nWidth) | 0
  const hIt = m.get(coordIt, D2DrlgCoordStrc.nHeight) | 0
  const xLink = m.get(coordLink, D2DrlgCoordStrc.nPosX) | 0
  const yLink = m.get(coordLink, D2DrlgCoordStrc.nPosY) | 0
  const hLink = m.get(coordLink, D2DrlgCoordStrc.nHeight) | 0

  m.set(coordIt, D2DrlgCoordStrc.nPosX, (xLink - wIt) >>> 0)
  m.set(coordIt, D2DrlgCoordStrc.nPosY, (hLink - hIt + yLink - 16) >>> 0)
  return 1
}

// ============================================================================
// K1r2 Iteration 7 Lane B — Batch B036 (anim-tbls-113c.ts)
// ============================================================================

/**
 * `@va D2Common:0x6FD91D00` (internal `__fastcall(ecx = pStr1, edx = pStr2)` -> `BOOL`, `ret`).
 *
 * Validates `strlen(pStr1) <= 8` (`line 0xD6 = 214`) and `strlen(pStr2) <= 8` (`line 0xD7 = 215`),
 * then compares the two 8-byte blocks as two 32-bit dwords (`+0x00` and `+0x04`).
 */
export function ANIMTBLS_CompareCode8113c(m: Memory113c, ecx: number, edx: number): number {
  const s1 = ecx >>> 0
  const s2 = edx >>> 0
  let len1 = 0
  if (m.u8(s1) !== 0) {
    do {
      len1 = (len1 + 1) >>> 0
    } while (m.u8((s1 + len1) >>> 0) !== 0)
    if (len1 > 8) {
      throw new D2CommonAssertError('AnimTbls.cpp', 0xd6)
    }
  }
  let len2 = 0
  if (m.u8(s2) !== 0) {
    do {
      len2 = (len2 + 1) >>> 0
    } while (m.u8((s2 + len2) >>> 0) !== 0)
    if (len2 > 8) {
      throw new D2CommonAssertError('AnimTbls.cpp', 0xd7)
    }
  }
  if (m.u32(s1) !== m.u32(s2)) {
    return 0
  }
  return m.u32((s1 + 4) >>> 0) === m.u32((s2 + 4) >>> 0) ? 1 : 0
}


// ============================================================================
// K1r3 Iteration 9 Lane B — Batch I9B-B (anim-tbls-113c.ts): AnimData.d2 lookups
// ============================================================================

/** `.bss` `D2AnimDataTableStrc* sgpAnimDataTable` at `0x6FDF0B4C` (`0x6FD91DF0 mov esi, ds:0x6fdf0b4c`; stored at 0x6FDB623F). */
export const SGP_ANIMDATA_TABLE_VA_113C = 0x6fdf0b4c

/** Event-byte scan cap of `0x6FD91EF0` (`cmp ecx, 0x90; jae` at 0x6FD91F20). */
const ANIMDATA_EVENT_SCAN_MAX_113C = 0x90

/**
 * `@va D2Common:0x6FD91DD0` (internal, custom reg `ebx = szCode` -> `eax = D2AnimDataRecordStrc*` or `0`, plain `ret`;
 * `esi`/`edi` saved and restored).
 *
 * 1. If `szCode[0] != 0`, upper-cases `szCode` in place: every byte whose *signed* value is in `['a', 'z']`
 *    (`cmp al, 0x61; jl` / `cmp al, 0x7a; jg`) is rewritten as `al - 0x20` (`mov [ecx], al` at 0x6FD91DE3).
 * 2. `h = (sum of movzx bytes of the upper-cased string) & 0xFF` (0x6FD91E00..0x6FD91E0D).
 * 3. `pBucket = sgpAnimDataTable->pHashBuckets[h]` (0x6FD91E12), `n = (int32)*pBucket`, `pRec = pBucket + 4`.
 * 4. While `n > 0` (`test esi, esi; jle` / `jg`): returns `pRec` if `ANIMTBLS_CompareCode8113c(szCode, pRec)`,
 *    else `pRec += 0xA0`, `n--`. Returns `0` when the bucket is exhausted.
 */
export function ANIMDATA_FindRecordByCode113c(m: Memory113c, szCode: number): number {
  const sz = szCode >>> 0
  if (m.u8(sz) !== 0) {
    let p = sz
    let c = m.u8(p)
    do {
      const sc = (c << 24) >> 24
      if (sc >= 0x61 && sc <= 0x7a) {
        m.setU8(p, (c - 0x20) & 0xff)
      }
      c = m.u8((p + 1) >>> 0)
      p = (p + 1) >>> 0
    } while (c !== 0)
  }
  const pTable = m.u32(SGP_ANIMDATA_TABLE_VA_113C)
  let h = 0
  let p = sz
  let c = m.u8(p)
  while (c !== 0) {
    h = (h + c) >>> 0
    c = m.u8((p + 1) >>> 0)
    p = (p + 1) >>> 0
  }
  h &= 0xff
  const pBucket = m.get(pTable, D2AnimDataTableStrc.pHashBuckets, h)
  let n = m.u32(pBucket) | 0
  let pRec = (pBucket + 4) >>> 0
  while (n > 0) {
    if (ANIMTBLS_CompareCode8113c(m, sz, pRec) !== 0) {
      return pRec
    }
    pRec = (pRec + D2AnimDataRecordStrc_SIZE) >>> 0
    n = (n - 1) | 0
  }
  return 0
}

/**
 * `@va D2Common:0x6FD91EF0` (`D2Common.#10385`, `ANIMDATA_GetAnimDataInfo`,
 * `__stdcall(szCode, pFramesPerDirection, pAnimSpeed, pFirstEvent) -> BOOL`, `ret 0x10`).
 *
 * - `pRec = ANIMDATA_FindRecordByCode113c(szCode)` (upper-cases `szCode` in place).
 * - Found: `*pFrames = pRec->dwFramesPerDirection`, then `*pSpeed = pRec->dwAnimSpeed`; re-reads
 *   `n = pRec->dwFramesPerDirection` (0x6FD91F10) and scans `i = 0` upward while `i <u n`, `i <u 0x90` and
 *   `pRec->bFrameEvents[i] == 0`; stores `*pFirstEvent = i` and returns `1`.
 * - Not found: `*pFrames = sgpAnimDataTable->dwDefaultFramesPerDirection (+0x40C)`, then
 *   `*pSpeed = sgpAnimDataTable->dwDefaultAnimSpeed (+0x410)`, then `*pFirstEvent = *pFrames` (re-read through
 *   the out-pointer at 0x6FD91F61) and returns `0`.
 */
export function ANIMDATA_GetAnimDataInfo113c(
  m: Memory113c,
  szCode: number,
  pFramesPerDirection: number,
  pAnimSpeed: number,
  pFirstEvent: number,
): number {
  const pRec = ANIMDATA_FindRecordByCode113c(m, szCode)
  if (pRec !== 0) {
    m.setU32(pFramesPerDirection >>> 0, m.get(pRec, D2AnimDataRecordStrc.dwFramesPerDirection))
    m.setU32(pAnimSpeed >>> 0, m.get(pRec, D2AnimDataRecordStrc.dwAnimSpeed))
    const n = m.get(pRec, D2AnimDataRecordStrc.dwFramesPerDirection) >>> 0
    let i = 0
    if (n !== 0) {
      while (i < ANIMDATA_EVENT_SCAN_MAX_113C) {
        if (m.get(pRec, D2AnimDataRecordStrc.bFrameEvents, i) !== 0) break
        i++
        if (!(i < n)) break
      }
    }
    m.setU32(pFirstEvent >>> 0, i)
    return 1
  }
  const pTable = m.u32(SGP_ANIMDATA_TABLE_VA_113C)
  m.setU32(pFramesPerDirection >>> 0, m.get(pTable, D2AnimDataTableStrc.dwDefaultFramesPerDirection))
  m.setU32(pAnimSpeed >>> 0, m.get(pTable, D2AnimDataTableStrc.dwDefaultAnimSpeed))
  m.setU32(pFirstEvent >>> 0, m.u32(pFramesPerDirection >>> 0))
  return 0
}

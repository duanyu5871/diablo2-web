import {
  D2DrlgCoordStrc,
  D2DrlgLevelLinkDataStrc,
  D2DrlgLevelStrc,
  D2DrlgOutdoorInfoStrc,
  D2LevelDefBin,
  D2LevelDefBin_SIZE,
} from '../../mem/layout.generated.ts';
import type { Memory113c } from '../../mem/sparse-memory.ts';
import { DRLGGRID_OpOr113c as DRLGGRID_BitwiseOrCell113c } from './drlg-grid.ts';
import { SGPT_DATA_TABLES_PTR_VA } from './drlg-ver.ts';

/**
 * `D2Common.dll` `.data` `D2LevelLinkDefStrc` table for Act 1 outdoor link placement (15 records x 16 bytes).
 *
 * `@va D2Common:0x6FDDCBE8`
 */
export const ACT1_LINK_DEFS_VA = 0x6fddcbe8;

/**
 * `D2Common.dll` `.data` `D2LevelLinkDefStrc` table for Act 2 outdoor link placement (15 records x 16 bytes).
 *
 * `@va D2Common:0x6FDDCCD8`
 */
export const ACT2_LINK_DEFS_VA = 0x6fddccd8;

/**
 * `D2Common.dll` `.rdata` 64-entry `int32_t` compatibility matrix for Act 1 `nLevelLink == 1`.
 *
 * `@va D2Common:0x6FDE54B8`
 */
export const ACT1_TOWN_COMPAT_VA = 0x6fde54b8;

/**
 * `D2Common.dll` `.bss` `sgptDataTables.pLevelDefBin` (`D2LevelDefBin*`).
 *
 * `@va D2Common:0x6FDF0B38`
 */
export const SGPT_LEVELDEF_BIN_VA = 0x6fdf0b38;

/**
 * `D2Common.dll` `.bss` Act 4 step direction flag (`0x800000` or `0x400000`).
 *
 * `@va D2Common:0x6FDF146C`
 */
export const GDW_ACT4_STEP_FLAG_VA = 0x6fdf146c;

function stepLinkSeed(m: Memory113c, pSeed: number): number {
  const lo = BigInt(m.u32(pSeed));
  const hi = BigInt(m.u32((pSeed + 4) >>> 0));
  const prod = lo * 0x6ac690c5n + hi;
  const newLo = Number(prod & 0xffffffffn) >>> 0;
  const newHi = Number((prod >> 32n) & 0xffffffffn) >>> 0;
  m.setU32(pSeed, newLo);
  m.setU32((pSeed + 4) >>> 0, newHi);
  return newLo | 0;
}

function signedMod8(v: number): number {
  let eax = (v & 0x80000007) | 0;
  if (eax < 0) {
    eax = (((eax - 1) | -8) + 1) | 0;
  }
  return eax;
}

function signedMod4(v: number): number {
  let eax = (v & 0x80000003) | 0;
  if (eax < 0) {
    eax = (((eax - 1) | -4) + 1) | 0;
  }
  return eax;
}

function signedMod2(v: number): number {
  let eax = (v & 0x80000001) | 0;
  if (eax < 0) {
    eax = (((eax - 1) | -2) + 1) | 0;
  }
  return eax;
}

function boxesOverlap(m: Memory113c, pBoxA: number, pBoxB: number): boolean {
  const ax = m.u32(pBoxA) | 0;
  const ay = m.u32((pBoxA + 4) >>> 0) | 0;
  const aw = m.u32((pBoxA + 8) >>> 0) | 0;
  const ah = m.u32((pBoxA + 12) >>> 0) | 0;
  const bx = m.u32(pBoxB) | 0;
  const by = m.u32((pBoxB + 4) >>> 0) | 0;
  const bw = m.u32((pBoxB + 8) >>> 0) | 0;
  const bh = m.u32((pBoxB + 12) >>> 0) | 0;

  const sepX = ax < bx ? ((bx - aw - ax) | 0) : ((ax - bw - bx) | 0);
  const sepY = ay < by ? ((by - ah - ay) | 0) : ((ay - bh - by) | 0);
  return sepX < 0 && sepY < 0;
}

/**
 * `@va D2Common:0x6FD63F30` (`DRLGOUTPLACE_InitRoomExCoordByDir113c`, not exported;
 * custom LTCG `ebx = pDest`, `edi = nWidth`, `esi = nHeight`, `[esp+4] = pSrc`, `[esp+8] = nDir`, `ret 8`).
 *
 * Computes a directional coordinate offset `(dx, dy)` for `nDir` in `0..4`, sets
 * `pDest->nPosX = pSrc->nPosX + dx`, `pDest->nPosY = pSrc->nPosY + dy`,
 * `pDest->nWidth = nWidth`, `pDest->nHeight = nHeight`, and `*(pDest + 0x10) = nDir`.
 */
export function DRLGOUTPLACE_InitRoomExCoordByDir113c(
  m: Memory113c,
  pDest: number,
  nWidth: number,
  nHeight: number,
  pSrc: number,
  nDir: number,
): void {
  const dest = pDest >>> 0;
  const src = pSrc >>> 0;
  const w = nWidth | 0;
  const h = nHeight | 0;
  const dir = nDir >>> 0;

  let dx = 0;
  let dy = 0;
  if (dir === 0) {
    dx = 0;
    dy = (-h) | 0;
  } else if (dir === 1) {
    dx = (-w) | 0;
    const prod = BigInt(h) * 0x55555555n;
    const hi = Number((prod >> 32n) & 0xffffffffn) | 0;
    const edx = ((hi - h) | 0) >> 1;
    dy = (edx + (edx >>> 31)) | 0;
  } else if (dir === 2) {
    dx = w;
    const prod = BigInt(h) * 0x55555555n;
    const hi = Number((prod >> 32n) & 0xffffffffn) | 0;
    const edx = ((hi - h) | 0) >> 1;
    dy = (edx + (edx >>> 31)) | 0;
  } else if (dir === 3) {
    dx = (-w) | 0;
    const scaled = ((-h) << 1) | 0;
    const prod = BigInt(scaled) * 0x55555556n;
    const edx = Number((prod >> 32n) & 0xffffffffn) | 0;
    dy = (edx + (edx >>> 31)) | 0;
  } else if (dir === 4) {
    dx = w;
    const scaled = ((-h) << 1) | 0;
    const prod = BigInt(scaled) * 0x55555556n;
    const edx = Number((prod >> 32n) & 0xffffffffn) | 0;
    dy = (edx + (edx >>> 31)) | 0;
  }

  const outX = ((m.u32((src + D2DrlgCoordStrc.nPosX.off) >>> 0) | 0) + dx) >>> 0;
  m.setU32((dest + D2DrlgCoordStrc.nPosX.off) >>> 0, outX);
  const outY = ((m.u32((src + D2DrlgCoordStrc.nPosY.off) >>> 0) | 0) + dy) >>> 0;
  m.setU32((dest + 0x10) >>> 0, dir);
  m.setU32((dest + D2DrlgCoordStrc.nPosY.off) >>> 0, outY);
  m.setU32((dest + D2DrlgCoordStrc.nWidth.off) >>> 0, w >>> 0);
  m.setU32((dest + D2DrlgCoordStrc.nHeight.off) >>> 0, h >>> 0);
}

/**
 * `@va D2Common:0x6FD64900` (`DRLGOUTPLACE_CheckAct2LinkOverlap113c`, not exported;
 * `__fastcall(ecx = pLinkData, edx = nIteration) -> BOOL`, `ret`).
 *
 * Checks whether `pLinkData->pCoord[nIteration]` overlaps any non-linked prior box `0..nIteration-1`
 * (using `.data` `0x6FDDCCE0 + nIteration * 16` for `nTargetLink`), and when `nIteration != 0`,
 * temporarily expands `pCoord[0]` (`nPosY -= 200`, `nHeight += 200`) to reject overlap with the expanded box 0.
 */
export function DRLGOUTPLACE_CheckAct2LinkOverlap113c(
  m: Memory113c,
  pLinkData: number,
  nIteration: number,
): number {
  const base = pLinkData >>> 0;
  const iter = nIteration | 0;
  const pCurrBox = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iter << 4)) >>> 0;
  const linkedIdx = m.u32((0x6fddcce0 + (iter << 4)) >>> 0) | 0;

  for (let i = 0; i < iter; i++) {
    if (i !== linkedIdx) {
      const pOtherBox = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (i << 4)) >>> 0;
      if (boxesOverlap(m, pCurrBox, pOtherBox)) {
        return 0;
      }
    }
  }

  if (iter === 0) {
    return 1;
  }

  const pBox0 = (base + D2DrlgLevelLinkDataStrc.nPosX.off) >>> 0;
  const origY0 = m.u32((pBox0 + 4) >>> 0) | 0;
  const origH0 = m.u32((pBox0 + 12) >>> 0) | 0;
  const modY0 = (origY0 - 200) | 0;
  const modH0 = (origH0 + 200) | 0;
  m.setU32((pBox0 + 4) >>> 0, modY0 >>> 0);
  m.setU32((pBox0 + 12) >>> 0, modH0 >>> 0);

  const res = boxesOverlap(m, pBox0, pCurrBox) ? 0 : 1;

  const curY0 = m.u32((pBox0 + 4) >>> 0) | 0;
  m.setU32((pBox0 + 12) >>> 0, ((modH0 - 200) | 0) >>> 0);
  m.setU32((pBox0 + 4) >>> 0, ((curY0 + 200) | 0) >>> 0);
  return res;
}

/**
 * `@va D2Common:0x6FD64A00` (`DRLGOUTPLACE_CheckAct1LinkOverlap113c`, not exported;
 * `__fastcall(ecx = pLinkData, edx = nIteration) -> BOOL`, `ret`).
 *
 * Checks whether `pLinkData->pCoord[nIteration]` overlaps any non-linked prior box `0..nIteration-1`
 * (using `.data` `0x6FDDCBF0 + nIteration * 16` for `nTargetLink`), then dispatches on
 * `nLevelLink` (`.data` `0x6FDDCBEC + nIteration * 16`):
 * - `nLevelLink == 1`: returns `ACT1_TOWN_COMPAT_6FDE54B8` entry indexed by `nRand0` and `nRand2`.
 * - `nLevelLink == 17`: rejects if any other entry `k != nIteration` sharing the same `nTargetLink`
 *   has `nRand0[k] == nRand0[nIteration]`.
 */
export function DRLGOUTPLACE_CheckAct1LinkOverlap113c(
  m: Memory113c,
  pLinkData: number,
  nIteration: number,
): number {
  const base = pLinkData >>> 0;
  const iter = nIteration | 0;
  const pCurrBox = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iter << 4)) >>> 0;
  const linkedIdx = m.u32((0x6fddcbf0 + (iter << 4)) >>> 0) | 0;

  for (let i = 0; i < iter; i++) {
    if (i !== linkedIdx) {
      const pOtherBox = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (i << 4)) >>> 0;
      if (boxesOverlap(m, pCurrBox, pOtherBox)) {
        return 0;
      }
    }
  }

  const nLevelLink = m.u32((0x6fddcbec + (iter << 4)) >>> 0) | 0;
  if (nLevelLink === 1) {
    const v0 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (linkedIdx << 2)) >>> 0) | 0;
    const v1 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand2.off + (linkedIdx << 2)) >>> 0) | 0;
    const v2 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand2.off + (iter << 2)) >>> 0) | 0;
    const v3 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0) | 0;
    const idx = (v3 + (((v2 + (((v0 + (v1 << 2)) << 1) | 0)) << 2) | 0)) | 0;
    return m.u32((ACT1_TOWN_COMPAT_VA + ((idx << 2) >>> 0)) >>> 0) | 0;
  }

  if (nLevelLink === 17) {
    const myRand0 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0) | 0;
    for (let k = 0; k < 15; k++) {
      if (k !== iter && (m.u32((0x6fddcbf0 + (k << 4)) >>> 0) | 0) === linkedIdx) {
        const otherRand0 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (k << 2)) >>> 0) | 0;
        if (myRand0 === otherRand0) {
          return 0;
        }
      }
    }
  }

  return 1;
}

/**
 * `@va D2Common:0x6FD64B00` (`DRLGOUTPLACE_LinkAct4Step113c`, not exported;
 * `__fastcall(ecx = pLinkData) -> BOOL`, `ret`).
 *
 * Sets `nRand1[iter] = 3` and `nRand0[iter] = 3`, advances `pLinkData`'s 64-bit LCG seed,
 * positions `pCoord[iter]` relative to `pCoord[pLink[iter].nTargetLink]`, writes `0x800000`
 * (odd seed low bit) or `0x400000` (even seed low bit) to `0x6FDF146C`, and returns `1`.
 */
export function DRLGOUTPLACE_LinkAct4Step113c(m: Memory113c, pLinkData: number): number {
  const base = pLinkData >>> 0;
  const iter0 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  m.setU32((base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter0 << 2)) >>> 0, 3);
  const iter1 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const r1 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter1 << 2)) >>> 0);
  m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter1 << 2)) >>> 0, r1);

  const pLinkArr = m.u32((base + D2DrlgLevelLinkDataStrc.pLink.off) >>> 0);
  const iter2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const targetIdx = m.u32((pLinkArr + (iter2 << 4) + 8) >>> 0) | 0;

  const newLo = stepLinkSeed(m, base);
  const iter3 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const dir = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter3 << 2)) >>> 0) >>> 0;

  const pRef = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (targetIdx << 4)) >>> 0;
  const pCurr = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iter2 << 4)) >>> 0;
  const refX = m.u32(pRef) | 0;
  const refY = m.u32((pRef + 4) >>> 0) | 0;
  const refW = m.u32((pRef + 8) >>> 0) | 0;
  const refH = m.u32((pRef + 12) >>> 0) | 0;
  const curW = m.u32((pCurr + 8) >>> 0) | 0;
  const curH = m.u32((pCurr + 12) >>> 0) | 0;

  if ((newLo & 1) !== 0) {
    if (dir === 0) {
      m.setU32(pCurr, refX >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
    } else if (dir === 1) {
      m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, refY >>> 0);
    } else if (dir === 2) {
      m.setU32(pCurr, ((refX + refW - curW) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
    } else if (dir === 3) {
      m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY + refH - curH + 8) | 0) >>> 0);
    }
    m.setU32(GDW_ACT4_STEP_FLAG_VA, 0x800000);
    return 1;
  }

  if (dir === 0) {
    m.setU32(pCurr, ((refX + refW - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
  } else if (dir === 1) {
    m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH - curH) | 0) >>> 0);
  } else if (dir === 2) {
    m.setU32(pCurr, refX >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
  } else if (dir === 3) {
    m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - 8) | 0) >>> 0);
  }
  m.setU32(GDW_ACT4_STEP_FLAG_VA, 0x400000);
  return 1;
}

/**
 * `@va D2Common:0x6FD64D00` (`DRLGOUTPLACE_LinkAct3KurastCauseway113c`, not exported;
 * `__fastcall(ecx = pLinkData) -> BOOL`, `ret`).
 *
 * Cycles `nRand0[iter]` through `0..7` (`signedMod8`) starting from `stepLinkSeed & 7`;
 * places `pCoord[iter]` on one of the 4 cardinal sides of `pCoord[targetIdx]` (`dir >> 1`).
 */
export function DRLGOUTPLACE_LinkAct3KurastCauseway113c(
  m: Memory113c,
  pLinkData: number,
): number {
  const base = pLinkData >>> 0;
  const iter = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const rand1Addr = (base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter << 2)) >>> 0;
  const rand1 = m.u32(rand1Addr) | 0;

  if (rand1 === -1) {
    const r = stepLinkSeed(m, base) & 7;
    m.setU32(rand1Addr, r >>> 0);
    const iterNow = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    const r1 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand1.off + (iterNow << 2)) >>> 0);
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterNow << 2)) >>> 0, r1);
  } else {
    const rand0Addr = (base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0;
    const next = signedMod8(((m.u32(rand0Addr) | 0) + 1) | 0);
    if (next === rand1) {
      return 0;
    }
    m.setU32(rand0Addr, next >>> 0);
  }

  const iter2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const pLinkArr = m.u32((base + D2DrlgLevelLinkDataStrc.pLink.off) >>> 0);
  const dir = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter2 << 2)) >>> 0) >>> 0;
  const targetIdx = m.u32((pLinkArr + (iter2 << 4) + 8) >>> 0) | 0;

  const pRef = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (targetIdx << 4)) >>> 0;
  const pCurr = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iter2 << 4)) >>> 0;
  const refX = m.u32(pRef) | 0;
  const refY = m.u32((pRef + 4) >>> 0) | 0;
  const refW = m.u32((pRef + 8) >>> 0) | 0;
  const refH = m.u32((pRef + 12) >>> 0) | 0;
  const curW = m.u32((pCurr + 8) >>> 0) | 0;
  const curH = m.u32((pCurr + 12) >>> 0) | 0;

  if (dir === 0 || dir === 1) {
    m.setU32(pCurr, refX >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
  } else if (dir === 2 || dir === 3) {
    m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, refY >>> 0);
  } else if (dir === 4 || dir === 5) {
    m.setU32(pCurr, refX >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
  } else if (dir === 6 || dir === 7) {
    m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, refY >>> 0);
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD64E30` (`DRLGOUTPLACE_LinkAct3SpiderForest113c`, not exported;
 * `__fastcall(ecx = pLinkData) -> BOOL`, `ret`).
 *
 * Alternates `nRand0[iter]` between `1` and `2` starting from `((stepLinkSeed & 1) + 1)`,
 * and places `pCoord[iter]` relative to `pCoord[targetIdx]`.
 */
export function DRLGOUTPLACE_LinkAct3SpiderForest113c(
  m: Memory113c,
  pLinkData: number,
): number {
  const base = pLinkData >>> 0;
  const iter = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const rand1Addr = (base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter << 2)) >>> 0;
  const rand1 = m.u32(rand1Addr) | 0;

  if (rand1 === -1) {
    const r = ((stepLinkSeed(m, base) & 1) + 1) | 0;
    m.setU32(rand1Addr, r >>> 0);
    const iterNow = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    const r1 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand1.off + (iterNow << 2)) >>> 0);
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterNow << 2)) >>> 0, r1);
  } else {
    const rand0Addr = (base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0;
    const cur = m.u32(rand0Addr) | 0;
    const next = cur === 1 ? 2 : 1;
    if (next === rand1) {
      return 0;
    }
    m.setU32(rand0Addr, next >>> 0);
  }

  const iter2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const pLinkArr = m.u32((base + D2DrlgLevelLinkDataStrc.pLink.off) >>> 0);
  const dir = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter2 << 2)) >>> 0) >>> 0;
  const targetIdx = m.u32((pLinkArr + (iter2 << 4) + 8) >>> 0) | 0;

  const pRef = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (targetIdx << 4)) >>> 0;
  const pCurr = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iter2 << 4)) >>> 0;
  const refX = m.u32(pRef) | 0;
  const refY = m.u32((pRef + 4) >>> 0) | 0;
  const refW = m.u32((pRef + 8) >>> 0) | 0;
  const refH = m.u32((pRef + 12) >>> 0) | 0;
  const curW = m.u32((pCurr + 8) >>> 0) | 0;
  const curH = m.u32((pCurr + 12) >>> 0) | 0;

  if (dir === 1) {
    m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, refY >>> 0);
    return 1;
  }
  if (dir === 0) {
    m.setU32(pCurr, ((refX + refW - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
  } else if (dir === 2) {
    m.setU32(pCurr, refX >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
  } else if (dir === 3) {
    m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, refY >>> 0);
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD64F90` (`DRLGOUTPLACE_LinkAct1Rotating113c`, not exported;
 * `__fastcall(ecx = pLinkData) -> BOOL`, `ret`).
 *
 * Steps a 2D state `(nRand0[iter] in 0..3, nRand2[iter] in 0..1)` with `nRand1`/`nRand3` start markers,
 * rotates `pCoord[iter]` dimensions between `(56, 96)` (`0x38, 0x60`) and `(96, 56)` (`0x60, 0x38`)
 * according to `nRand0[iter] % 2`, and positions `pCoord[iter]` relative to `pCoord[targetIdx]` with `±16` offsets.
 */
export function DRLGOUTPLACE_LinkAct1Rotating113c(m: Memory113c, pLinkData: number): number {
  const base = pLinkData >>> 0;
  const iter = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const rand1Addr = (base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter << 2)) >>> 0;
  const rand1 = m.u32(rand1Addr) | 0;

  let next2: number;
  let idxForStore2: number;
  if (rand1 === -1) {
    const r0 = stepLinkSeed(m, base) & 3;
    m.setU32(rand1Addr, r0 >>> 0);
    const iterA = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    const savedR1 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand1.off + (iterA << 2)) >>> 0);
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterA << 2)) >>> 0, savedR1);

    const r2 = stepLinkSeed(m, base) & 1;
    const iterB = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand3.off + (iterB << 2)) >>> 0, r2 >>> 0);
    idxForStore2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    next2 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand3.off + (idxForStore2 << 2)) >>> 0) | 0;
  } else {
    const cur2 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand2.off + (iter << 2)) >>> 0) | 0;
    const cur0 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0) | 0;
    const next0 = signedMod4((cur0 + cur2) | 0);
    next2 = signedMod2((cur2 + 1) | 0);
    const rand3 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand3.off + (iter << 2)) >>> 0) | 0;
    if (next0 === rand1 && next2 === rand3) {
      return 0;
    }
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0, next0 >>> 0);
    idxForStore2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  }

  m.setU32((base + D2DrlgLevelLinkDataStrc.nRand2.off + (idxForStore2 << 2)) >>> 0, next2 >>> 0);

  const iterW = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const parityW = signedMod2(m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterW << 2)) >>> 0) | 0);
  const newW = parityW !== 0 ? 0x60 : 0x38;
  m.setU32((base + (((iterW + 1) << 4) >>> 0)) >>> 0, newW >>> 0);

  const iterH = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const parityH = signedMod2(m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterH << 2)) >>> 0) | 0);
  const newH = parityH !== 0 ? 0x38 : 0x60;
  m.setU32((base + (iterH << 4) + 0x14) >>> 0, newH >>> 0);

  const iterP = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const pLinkArr = m.u32((base + D2DrlgLevelLinkDataStrc.pLink.off) >>> 0);
  const branch = m.u32((base + D2DrlgLevelLinkDataStrc.nRand2.off + (iterP << 2)) >>> 0) | 0;
  const dir = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterP << 2)) >>> 0) >>> 0;
  const targetIdx = m.u32((pLinkArr + (iterP << 4) + 8) >>> 0) | 0;

  const pRef = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (targetIdx << 4)) >>> 0;
  const pCurr = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iterP << 4)) >>> 0;
  const refX = m.u32(pRef) | 0;
  const refY = m.u32((pRef + 4) >>> 0) | 0;
  const refW = m.u32((pRef + 8) >>> 0) | 0;
  const refH = m.u32((pRef + 12) >>> 0) | 0;
  const curW = m.u32((pCurr + 8) >>> 0) | 0;
  const curH = m.u32((pCurr + 12) >>> 0) | 0;

  if (branch === 1) {
    if (dir === 0) {
      m.setU32(pCurr, ((refX - 0x10) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
    } else if (dir === 1) {
      m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY - 0x10) | 0) >>> 0);
    } else if (dir === 2) {
      m.setU32(pCurr, ((refX + refW - curW + 0x10) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
    } else if (dir === 3) {
      m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY + refH - curH + 0x10) | 0) >>> 0);
    }
    return 1;
  }

  if (dir === 0) {
    m.setU32(pCurr, ((refX + refW - curW + 0x10) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
  } else if (dir === 1) {
    m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH - curH + 0x10) | 0) >>> 0);
  } else if (dir === 2) {
    m.setU32(pCurr, ((refX - 0x10) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
  } else if (dir === 3) {
    m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - 0x10) | 0) >>> 0);
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD65250` (`DRLGOUTPLACE_LinkAct1FixedSize113c`, not exported;
 * `__fastcall(ecx = pLinkData) -> BOOL`, `ret`).
 *
 * Steps `(nRand0[iter] in 0..3, nRand2[iter] in 0..1)` with `nRand1`/`nRand3` start markers
 * (preserving existing `nWidth`/`nHeight`) and positions `pCoord[iter]` relative to `pCoord[targetIdx]`.
 */
export function DRLGOUTPLACE_LinkAct1FixedSize113c(m: Memory113c, pLinkData: number): number {
  const base = pLinkData >>> 0;
  const iter = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const rand1Addr = (base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter << 2)) >>> 0;
  const rand1 = m.u32(rand1Addr) | 0;

  let next2: number;
  let idxForStore2: number;
  if (rand1 === -1) {
    const r0 = stepLinkSeed(m, base) & 3;
    m.setU32(rand1Addr, r0 >>> 0);
    const iterA = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    const savedR1 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand1.off + (iterA << 2)) >>> 0);
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterA << 2)) >>> 0, savedR1);

    const r2 = stepLinkSeed(m, base) & 1;
    const iterB = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand3.off + (iterB << 2)) >>> 0, r2 >>> 0);
    idxForStore2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    next2 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand3.off + (idxForStore2 << 2)) >>> 0) | 0;
  } else {
    const cur2 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand2.off + (iter << 2)) >>> 0) | 0;
    const cur0 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0) | 0;
    const next0 = signedMod4((cur0 + cur2) | 0);
    next2 = signedMod2((cur2 + 1) | 0);
    const rand3 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand3.off + (iter << 2)) >>> 0) | 0;
    if (next0 === rand1 && next2 === rand3) {
      return 0;
    }
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0, next0 >>> 0);
    idxForStore2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  }

  m.setU32((base + D2DrlgLevelLinkDataStrc.nRand2.off + (idxForStore2 << 2)) >>> 0, next2 >>> 0);

  const iterP = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const pLinkArr = m.u32((base + D2DrlgLevelLinkDataStrc.pLink.off) >>> 0);
  const branch = m.u32((base + D2DrlgLevelLinkDataStrc.nRand2.off + (iterP << 2)) >>> 0) | 0;
  const dir = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterP << 2)) >>> 0) >>> 0;
  const targetIdx = m.u32((pLinkArr + (iterP << 4) + 8) >>> 0) | 0;

  const pRef = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (targetIdx << 4)) >>> 0;
  const pCurr = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iterP << 4)) >>> 0;
  const refX = m.u32(pRef) | 0;
  const refY = m.u32((pRef + 4) >>> 0) | 0;
  const refW = m.u32((pRef + 8) >>> 0) | 0;
  const refH = m.u32((pRef + 12) >>> 0) | 0;
  const curW = m.u32((pCurr + 8) >>> 0) | 0;
  const curH = m.u32((pCurr + 12) >>> 0) | 0;

  if (branch === 1) {
    if (dir === 0) {
      m.setU32(pCurr, refX >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
    } else if (dir === 1) {
      m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY + 8) | 0) >>> 0);
    } else if (dir === 2) {
      m.setU32(pCurr, ((refX + refW - curW) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
    } else if (dir === 3) {
      m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
      m.setU32((pCurr + 4) >>> 0, ((refY + refH - curH - 8) | 0) >>> 0);
    }
    return 1;
  }

  if (dir === 0) {
    m.setU32(pCurr, ((refX + refW - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
  } else if (dir === 1) {
    m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH - curH - 8) | 0) >>> 0);
  } else if (dir === 2) {
    m.setU32(pCurr, refX >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
  } else if (dir === 3) {
    m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + 8) | 0) >>> 0);
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD65480` (`DRLGOUTPLACE_LinkAct3Jungle113c`, not exported;
 * `__fastcall(ecx = pLinkData) -> BOOL`, `ret`).
 *
 * Cycles `nRand0[iter]` through `0..7` (`signedMod8`) starting from `stepLinkSeed & 7` and
 * places `pCoord[iter]` with half-dimension (`w / 2` or `h / 2` signed division) and `±8` offsets.
 */
export function DRLGOUTPLACE_LinkAct3Jungle113c(m: Memory113c, pLinkData: number): number {
  const base = pLinkData >>> 0;
  const iter = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const rand1Addr = (base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter << 2)) >>> 0;
  const rand1 = m.u32(rand1Addr) | 0;

  if (rand1 === -1) {
    const r = stepLinkSeed(m, base) & 7;
    m.setU32(rand1Addr, r >>> 0);
    const iterNow = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    const r1 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand1.off + (iterNow << 2)) >>> 0);
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterNow << 2)) >>> 0, r1);
  } else {
    const rand0Addr = (base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0;
    const next = signedMod8(((m.u32(rand0Addr) | 0) + 1) | 0);
    if (next === rand1) {
      return 0;
    }
    m.setU32(rand0Addr, next >>> 0);
  }

  const iter2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const pLinkArr = m.u32((base + D2DrlgLevelLinkDataStrc.pLink.off) >>> 0);
  const dir = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter2 << 2)) >>> 0) >>> 0;
  const targetIdx = m.u32((pLinkArr + (iter2 << 4) + 8) >>> 0) | 0;

  const pRef = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (targetIdx << 4)) >>> 0;
  const pCurr = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iter2 << 4)) >>> 0;
  const refX = m.u32(pRef) | 0;
  const refY = m.u32((pRef + 4) >>> 0) | 0;
  const refW = m.u32((pRef + 8) >>> 0) | 0;
  const refH = m.u32((pRef + 12) >>> 0) | 0;
  const curW = m.u32((pCurr + 8) >>> 0) | 0;
  const curH = m.u32((pCurr + 12) >>> 0) | 0;
  const halfW = ((curW - (curW >> 31)) | 0) >> 1;
  const halfH = ((curH - (curH >> 31)) | 0) >> 1;

  if (dir === 0) {
    m.setU32(pCurr, ((refX + ((-8 - halfW) | 0)) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
  } else if (dir === 1) {
    m.setU32(pCurr, ((refX + ((halfW + 8) | 0)) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
  } else if (dir === 2) {
    m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - halfH - 8) | 0) >>> 0);
  } else if (dir === 3) {
    m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + halfH + 8) | 0) >>> 0);
  } else if (dir === 4) {
    m.setU32(pCurr, ((refX + ((-8 - halfW) | 0)) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
  } else if (dir === 5) {
    m.setU32(pCurr, ((refX + ((halfW + 8) | 0)) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
  } else if (dir === 6) {
    m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - halfH - 8) | 0) >>> 0);
  } else if (dir === 7) {
    m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + halfH + 8) | 0) >>> 0);
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD65680` (`DRLGOUTPLACE_LinkQuadrant4_113c`, not exported;
 * `__fastcall(ecx = pLinkData) -> BOOL`, `ret`).
 *
 * Cycles `nRand0[iter]` through `0..3` (`signedMod4`) starting from `stepLinkSeed & 3` and
 * places `pCoord[iter]` around `pCoord[targetIdx]` with `±16` (`0x10`) offsets.
 */
export function DRLGOUTPLACE_LinkQuadrant4_113c(m: Memory113c, pLinkData: number): number {
  const base = pLinkData >>> 0;
  const iter = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const rand1Addr = (base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter << 2)) >>> 0;
  const rand1 = m.u32(rand1Addr) | 0;

  if (rand1 === -1) {
    const r = stepLinkSeed(m, base) & 3;
    m.setU32(rand1Addr, r >>> 0);
    const iterNow = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
    const r1 = m.u32((base + D2DrlgLevelLinkDataStrc.nRand1.off + (iterNow << 2)) >>> 0);
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iterNow << 2)) >>> 0, r1);
  } else {
    const rand0Addr = (base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter << 2)) >>> 0;
    const next = signedMod4(((m.u32(rand0Addr) | 0) + 1) | 0);
    if (next === rand1) {
      return 0;
    }
    m.setU32(rand0Addr, next >>> 0);
  }

  const iter2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const pLinkArr = m.u32((base + D2DrlgLevelLinkDataStrc.pLink.off) >>> 0);
  const dir = m.u32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter2 << 2)) >>> 0) >>> 0;
  const targetIdx = m.u32((pLinkArr + (iter2 << 4) + 8) >>> 0) | 0;

  const pRef = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (targetIdx << 4)) >>> 0;
  const pCurr = (base + D2DrlgLevelLinkDataStrc.nPosX.off + (iter2 << 4)) >>> 0;
  const refX = m.u32(pRef) | 0;
  const refY = m.u32((pRef + 4) >>> 0) | 0;
  const refW = m.u32((pRef + 8) >>> 0) | 0;
  const refH = m.u32((pRef + 12) >>> 0) | 0;
  const curW = m.u32((pCurr + 8) >>> 0) | 0;
  const curH = m.u32((pCurr + 12) >>> 0) | 0;

  if (dir === 0) {
    m.setU32(pCurr, ((refX - 0x10) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH) | 0) >>> 0);
  } else if (dir === 1) {
    m.setU32(pCurr, ((refX - curW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - 0x10) | 0) >>> 0);
  } else if (dir === 2) {
    m.setU32(pCurr, ((refX + refW - curW + 0x10) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY - curH) | 0) >>> 0);
  } else if (dir === 3) {
    m.setU32(pCurr, ((refX + refW) | 0) >>> 0);
    m.setU32((pCurr + 4) >>> 0, ((refY + refH - curH + 0x10) | 0) >>> 0);
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD657D0` (`DRLGOUTPLACE_LinkFromLevelDef113c`, not exported;
 * `__fastcall(ecx = pLinkData) -> BOOL`, `ret`).
 *
 * Copies `(dwOffsetX, dwOffsetY)` (`+0x24`, `+0x28`) from `sgptDataTables.pLevelDefBin[nCurrentLevel]`
 * (`0x6FDF0B38`, stride `0x9C`) into `pLinkData->pCoord[nIteration].(nPosX, nPosY)` and returns `1`.
 */
export function DRLGOUTPLACE_LinkFromLevelDef113c(m: Memory113c, pLinkData: number): number {
  const base = pLinkData >>> 0;
  const iter0 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const rand1Addr = (base + D2DrlgLevelLinkDataStrc.nRand1.off + (iter0 << 2)) >>> 0;
  if ((m.u32(rand1Addr) | 0) === -1) {
    const r1 = m.u32(rand1Addr);
    m.setU32((base + D2DrlgLevelLinkDataStrc.nRand0.off + (iter0 << 2)) >>> 0, r1);
  }

  const nLevelId = m.u32((base + D2DrlgLevelLinkDataStrc.nCurrentLevel.off) >>> 0) | 0;
  let pLevelDef = 0;
  if (nLevelId >= 0) {
    const gpDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA);
    const nLevelsCount = m.u32((gpDataTables + 0xc5c) >>> 0) | 0;
    if (nLevelId < nLevelsCount) {
      pLevelDef = (m.u32(SGPT_LEVELDEF_BIN_VA) + Math.imul(nLevelId, D2LevelDefBin_SIZE)) >>> 0;
    }
  }

  const iter1 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const dwOffsetX = m.u32((pLevelDef + D2LevelDefBin.dwOffsetX.off) >>> 0);
  m.setU32((base + D2DrlgLevelLinkDataStrc.nPosX.off + (iter1 << 4)) >>> 0, dwOffsetX);

  const iter2 = m.u32((base + D2DrlgLevelLinkDataStrc.nIteration.off) >>> 0) | 0;
  const dwOffsetY = m.u32((pLevelDef + D2LevelDefBin.dwOffsetY.off) >>> 0);
  m.setU32((base + D2DrlgLevelLinkDataStrc.nPosY.off + (iter2 << 4)) >>> 0, dwOffsetY);
  return 1;
}

/**
 * `@va D2Common:0x6FD65840` (`DRLGOUTPLACE_MarkBorderGridCells113c`, not exported;
 * custom LTCG `eax = pLevel`, `ret`).
 *
 * Sweeps from all 4 corners of `pLevel->pOutdoors->pGrid2` (`(0, 0)` step `(+1, +1)`,
 * `(W-1, 0)` step `(-1, +1)`, `(0, H-1)` step `(+1, -1)`, `(W-1, H-1)` step `(-1, -1)`),
 * calling `DRLGGRID_BitwiseOrCell113c(m, cellAddr, 0x100)` (`0x6FD86C10` via `0x6FDEB244`)
 * on cells until a cell with bit `0` (`& 1`) set is encountered along each row/column.
 */
export function DRLGOUTPLACE_MarkBorderGridCells113c(m: Memory113c, pLevel: number): void {
  const pOutdoors = m.u32(((pLevel >>> 0) + D2DrlgLevelStrc.pOutdoors.off) >>> 0);
  const passes: ReadonlyArray< readonly [number, number, number, number]> = [
    [0, 0, 1, 1],
    [1, 0, -1, 1],
    [0, 1, 1, -1],
    [1, 1, -1, -1],
  ];

  for (let p = 0; p < 4; p++) {
    const [bRight, bBottom, stepX, stepY] = passes[p]!;
    const startX =
      bRight !== 0
        ? ((m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.nGridWidth.off) >>> 0) | 0) - 1) | 0
        : 0;
    let curY =
      bBottom !== 0
        ? ((m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.nGridHeight.off) >>> 0) | 0) - 1) | 0
        : 0;

    let pRowOffsets = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2RowOffsets.off) >>> 0);
    let rowBase = m.u32((pRowOffsets + ((curY << 2) >>> 0)) >>> 0) | 0;
    let pCells = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2Cells.off) >>> 0);

    if ((m.u8((pCells + (((rowBase + startX) << 2) >>> 0)) >>> 0) & 1) === 0) {
      do {
        pRowOffsets = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2RowOffsets.off) >>> 0);
        rowBase = m.u32((pRowOffsets + ((curY << 2) >>> 0)) >>> 0) | 0;
        pCells = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2Cells.off) >>> 0);
        let curX = startX;
        if ((m.u8((pCells + (((rowBase + startX) << 2) >>> 0)) >>> 0) & 1) === 0) {
          do {
            pRowOffsets = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2RowOffsets.off) >>> 0);
            rowBase = m.u32((pRowOffsets + ((curY << 2) >>> 0)) >>> 0) | 0;
            pCells = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2Cells.off) >>> 0);
            const cellAddr = (pCells + (((rowBase + curX) << 2) >>> 0)) >>> 0;
            DRLGGRID_BitwiseOrCell113c(m, cellAddr, 0x100);
            curX = (curX + stepX) | 0;
            pCells = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2Cells.off) >>> 0);
            pRowOffsets = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2RowOffsets.off) >>> 0);
            rowBase = m.u32((pRowOffsets + ((curY << 2) >>> 0)) >>> 0) | 0;
          } while ((m.u8((pCells + (((rowBase + curX) << 2) >>> 0)) >>> 0) & 1) === 0);
        }

        curY = (curY + stepY) | 0;
        pRowOffsets = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2RowOffsets.off) >>> 0);
        rowBase = m.u32((pRowOffsets + ((curY << 2) >>> 0)) >>> 0) | 0;
        pCells = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2Cells.off) >>> 0);
      } while ((m.u8((pCells + (((rowBase + startX) << 2) >>> 0)) >>> 0) & 1) === 0);
    }
  }
}

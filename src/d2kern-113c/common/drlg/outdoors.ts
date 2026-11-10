/**
 * Diablo II v1.13c `D2Common.dll` outdoor DRLG grid/preset placement helpers (`Drlg\DrlgOutdoors.cpp`),
 * image base `0x6FD50000`.
 *
 * Every function below is a 1:1 port of the cited disassembly (`objdump -d -M intel` on `D2Common.dll`).
 */
import { D2DrlgLevelStrc } from '../../mem/layout.generated.ts';
import type { Memory113c } from '../../mem/sparse-memory.ts';
import { SEED_RollRandomNumberInline113c } from '../inline-helpers.ts';
import { imul32, sdiv32, smod32 } from '../int-math.ts';

/**
 * Outdoor theme bitmask table at `0x6FDE345C` (`uint32[4] = [0x1000, 0x2000, 0x4000, 0x8000]`).
 * Copied verbatim from `D2Common.dll` v1.13c.
 */
export const OUTDOOR_THEME_FLAGS_6FDE345C = Uint32Array.from([
  0x1000, 0x2000, 0x4000, 0x8000,
]);

/**
 * `D2Common.dll` `.data` addresses used by `DRLGOUTDOORS_SpawnOutdoorRoomEx113c` (`0x6FD92370`).
 */
export const SGPT_DATA_TABLES_PTR_VA_6FDE9E1C = 0x6fde9e1c;
export const SG_LVL_PREST_TXT_PTR_VA_6FDF0B3C = 0x6fdf0b3c;

/**
 * `@va D2Common:0x6FD92270` (`DRLGOUTDOORS_MapPresetSlotIndex113c`, `__fastcall(pLevel, nX, nY)`, `ret 4`).
 *
 * Free-cell predicate (`D2DrlgSubstContextStrc.pfTestFree1` at `ctx + 0x1C`):
 * reads `pOutdoors = pLevel->pOutdoors (+0x14)` and inspects `grid2` (`pCells` at `+0x2C`, `pRowOffsets` at `+0x30`)
 * at `(nX, nY)`, returning `((~(val >>> 10)) & 1)` (`1` when bit 10 `0x400` is clear, `0` when set).
 */
export function DRLGOUTDOORS_MapPresetSlotIndex113c(
  m: Memory113c,
  pLevel: number,
  nX: number,
  nY: number,
): number {
  const pOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors);
  const pRowOffsets = m.u32((pOutdoors + 0x30) >>> 0);
  const pCells = m.u32((pOutdoors + 0x2c) >>> 0);
  const rowOff = m.u32((pRowOffsets + (nY | 0) * 4) >>> 0) | 0;
  const idx = (rowOff + (nX | 0)) | 0;
  const val = m.u32((pCells + (idx << 2)) >>> 0);
  return (~(val >>> 10)) & 1;
}

/**
 * `@va D2Common:0x6FD922A0` (`DRLGOUTDOORS_SetOutdoorCellFlag200_113c`, `__fastcall(pLevel, nX, nY)`, `ret 4`).
 *
 * Outdoor floor-clear callback (`D2DrlgSubstContextStrc.pfOnClear` at `ctx + 0x30`):
 * applies `gafGridCellOps[3]` (`OpOverwrite`, `0x6FD86C20`) with `0` to `pOutdoors->grid0[nY][nX]` (`+0x04`/`+0x08`)
 * and `gafGridCellOps[3]` (`OpOverwrite`, `0x6FD86C20`) with `0x100` to `pOutdoors->grid2[nY][nX]` (`+0x2C`/`+0x30`).
 */
export function DRLGOUTDOORS_SetOutdoorCellFlag200_113c(
  m: Memory113c,
  pLevel: number,
  nX: number,
  nY: number,
): void {
  const pOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors);
  const x = nX | 0;
  const y = nY | 0;

  const pRowOffsets0 = m.u32((pOutdoors + 0x08) >>> 0);
  const rowOff0 = m.u32((pRowOffsets0 + y * 4) >>> 0) | 0;
  const pCells0 = m.u32((pOutdoors + 0x04) >>> 0);
  const pCell0 = (pCells0 + (((rowOff0 + x) | 0) << 2)) >>> 0;
  m.setU32(pCell0, 0);

  const pRowOffsets2 = m.u32((pOutdoors + 0x30) >>> 0);
  const rowOff2 = m.u32((pRowOffsets2 + y * 4) >>> 0) | 0;
  const pCells2 = m.u32((pOutdoors + 0x2c) >>> 0);
  const pCell2 = (pCells2 + (((rowOff2 + x) | 0) << 2)) >>> 0;
  m.setU32(pCell2, 0x100);
}

/**
 * `@va D2Common:0x6FD922F0` (`DRLGOUTDOORS_ClearOutdoorCellFlag200_113c`, `__fastcall(pLevel, nX, nY)`, `ret 4`).
 *
 * Outdoor floor-bit2 callback (`D2DrlgSubstContextStrc.pfOnBit2` at `ctx + 0x2C`):
 * applies `gafGridCellOps[3]` (`OpOverwrite`, `0x6FD86C20`) with `0` to both `pOutdoors->grid0[nY][nX]` (`+0x04`/`+0x08`)
 * and `pOutdoors->grid2[nY][nX]` (`+0x2C`/`+0x30`).
 */
export function DRLGOUTDOORS_ClearOutdoorCellFlag200_113c(
  m: Memory113c,
  pLevel: number,
  nX: number,
  nY: number,
): void {
  const pOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors);
  const x = nX | 0;
  const y = nY | 0;

  const pRowOffsets0 = m.u32((pOutdoors + 0x08) >>> 0);
  const rowOff0 = m.u32((pRowOffsets0 + y * 4) >>> 0) | 0;
  const pCells0 = m.u32((pOutdoors + 0x04) >>> 0);
  const pCell0 = (pCells0 + (((rowOff0 + x) | 0) << 2)) >>> 0;
  m.setU32(pCell0, 0);

  const pRowOffsets2 = m.u32((pOutdoors + 0x30) >>> 0);
  const rowOff2 = m.u32((pRowOffsets2 + y * 4) >>> 0) | 0;
  const pCells2 = m.u32((pOutdoors + 0x2c) >>> 0);
  const pCell2 = (pCells2 + (((rowOff2 + x) | 0) << 2)) >>> 0;
  m.setU32(pCell2, 0);
}

/**
 * `@va D2Common:0x6FD92370` (`DRLGOUTDOORS_SpawnOutdoorRoomEx113c`, `__fastcall(pLevel, nX, nY, nLvlPrestId, nBorder, uFlags)`, `ret 0x10`).
 *
 * Outdoor preset footprint-free predicate (`D2DrlgSubstContextStrc.pfTestFree4` at `ctx + 0x20`):
 * computes the 8-tile-unit footprint `(w, h)` (either `(1, 1)` when `nLvlPrestId == 0`, or `(pPrest->nSizeX / 8, pPrest->nSizeY / 8)`
 * from `*(0x6FDF0B3C) + nLvlPrestId * 0x1B0`), expands by `nBorder` along the directions enabled in `uFlags & 0x0F`,
 * and returns `1` iff every cell in `[x .. x + w - 1] x [y .. y + h - 1]` is within `grid2` bounds (`+0x34`, `+0x38`)
 * and has `(grid2[cy][cx] & 0x1B81) == 0` (else `0`).
 */
export function DRLGOUTDOORS_SpawnOutdoorRoomEx113c(
  m: Memory113c,
  pLevel: number,
  nX: number,
  nY: number,
  nLvlPrestId: number,
  nBorder: number,
  uFlags: number,
): number {
  const pOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors);
  let x = nX | 0;
  let y = nY | 0;
  const prestId = nLvlPrestId | 0;
  let w: number;
  let h: number;

  if (prestId === 0) {
    w = 1;
    h = 1;
  } else {
    const sgptDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA_6FDE9E1C);
    const count = m.u32((sgptDataTables + 0xc68) >>> 0) | 0;
    const pPrest =
      prestId < 0 || prestId >= count
        ? 0
        : (m.u32(SG_LVL_PREST_TXT_PTR_VA_6FDF0B3C) +
            imul32(prestId, 0x1b0)) >>>
          0;
    const rawW = m.u32((pPrest + 0x28) >>> 0) | 0;
    const rawH = m.u32((pPrest + 0x2c) >>> 0) | 0;
    w = sdiv32(rawW, 8);
    h = sdiv32(rawH, 8);
  }

  const border = nBorder | 0;
  if (border !== 0) {
    const fl = uFlags & 0xff;
    if ((fl & 0x01) !== 0) {
      y = (y - border) | 0;
      h = (h + border) | 0;
    }
    if ((fl & 0x02) !== 0) {
      w = (w + border) | 0;
    }
    if ((fl & 0x04) !== 0) {
      h = (h + border) | 0;
    }
    if ((fl & 0x08) !== 0) {
      x = (x - border) | 0;
      w = (w + border) | 0;
    }
  }

  const endY = (y + h) | 0;
  const endX = (x + w) | 0;
  const gridW = m.u32((pOutdoors + 0x34) >>> 0) | 0;
  const gridH = m.u32((pOutdoors + 0x38) >>> 0) | 0;
  const pRowOffsets = m.u32((pOutdoors + 0x30) >>> 0);
  const pCells = m.u32((pOutdoors + 0x2c) >>> 0);

  for (let cy = y; cy < endY; cy++) {
    for (let cx = x; cx < endX; cx++) {
      if (cx < 0 || cx >= gridW || cy < 0 || cy >= gridH) {
        return 0;
      }
      const rowOff = m.u32((pRowOffsets + cy * 4) >>> 0) | 0;
      const cellVal = m.u32((pCells + (((rowOff + cx) | 0) << 2)) >>> 0);
      if ((cellVal & 0x1b81) !== 0) {
        return 0;
      }
    }
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD92460` (`DRLGOUTDOORS_SpawnRandomOutdoorThemes113c`, custom `esi = pLevel`, `[esp+4] = nMaxSpawns`, `ret 4`).
 *
 * Rolls an initial theme index `(seed & 3)` on `pLevel->sSeed (+0x1C4)`, builds a coordinate list of
 * `nCells = (pOutdoors->nGridWidth - 2) * (pOutdoors->nGridHeight - 2)` interior cells, shuffles it with `nCells`
 * random swaps using `pLevel->sSeed`, and for up to `nMaxSpawns` cells whose `(x+1, y+1)` cell in `grid2`
 * avoids `0x1B81`, ORs `OUTDOOR_THEME_FLAGS_6FDE345C[themeIdx]` into `grid1[y+1][x+1]` and `0x1000` into `grid2[y+1][x+1]`.
 */
export function DRLGOUTDOORS_SpawnRandomOutdoorThemes113c(
  m: Memory113c,
  pLevel: number,
  nMaxSpawns: number,
): void {
  const pSeed = (pLevel + D2DrlgLevelStrc.sSeed.off) >>> 0;
  const pOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors);
  let themeIdx = SEED_RollRandomNumberInline113c(m, pSeed, 4) & 3;

  const innerW = ((m.u32((pOutdoors + 0x5c) >>> 0) | 0) - 2) | 0;
  const innerH = ((m.u32((pOutdoors + 0x60) >>> 0) | 0) - 2) | 0;
  const nCells = imul32(innerH, innerW);
  if (nCells === 0) return;

  const xs = new Int32Array(nCells > 0 ? nCells : 0);
  const ys = new Int32Array(nCells > 0 ? nCells : 0);
  if (nCells > 0) {
    for (let i = 0; i < nCells; i++) {
      xs[i] = smod32(i, innerW);
      ys[i] = sdiv32(i, innerW);
    }
    for (let step = nCells; step !== 0; step--) {
      const idx1 = SEED_RollRandomNumberInline113c(m, pSeed, nCells);
      const idx2 = SEED_RollRandomNumberInline113c(m, pSeed, nCells);
      const tx = xs[idx1]!;
      const ty = ys[idx1]!;
      xs[idx1] = xs[idx2]!;
      ys[idx1] = ys[idx2]!;
      xs[idx2] = tx;
      ys[idx2] = ty;
    }
  }

  let remSpawns = nMaxSpawns | 0;
  for (let i = 0; i < nCells; i++) {
    if (remSpawns <= 0) break;
    const curOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors);
    const gx = (xs[i]! + 1) | 0;
    const gy = (ys[i]! + 1) | 0;
    const pRowOffsets2 = m.u32((curOutdoors + 0x30) >>> 0);
    const rowOff2 = m.u32((pRowOffsets2 + gy * 4) >>> 0) | 0;
    const pCells2 = m.u32((curOutdoors + 0x2c) >>> 0);
    const pCell2 = (pCells2 + (((rowOff2 + gx) | 0) << 2)) >>> 0;
    if ((m.u32(pCell2) & 0x1b81) === 0) {
      const pRowOffsets1 = m.u32((pOutdoors + 0x1c) >>> 0);
      const rowOff1 = m.u32((pRowOffsets1 + gy * 4) >>> 0) | 0;
      const pCells1 = m.u32((pOutdoors + 0x18) >>> 0);
      const pCell1 = (pCells1 + (((rowOff1 + gx) | 0) << 2)) >>> 0;
      const themeFlag = OUTDOOR_THEME_FLAGS_6FDE345C[themeIdx]!;
      m.setU32(pCell1, (m.u32(pCell1) | themeFlag) >>> 0);

      const pRowOffsets2b = m.u32((pOutdoors + 0x30) >>> 0);
      const rowOff2b = m.u32((pRowOffsets2b + gy * 4) >>> 0) | 0;
      const pCells2b = m.u32((pOutdoors + 0x2c) >>> 0);
      const pCell2b = (pCells2b + (((rowOff2b + gx) | 0) << 2)) >>> 0;
      m.setU32(pCell2b, (m.u32(pCell2b) | 0x1000) >>> 0);

      themeIdx = (themeIdx + 1) & 3;
      remSpawns = (remSpawns - 1) | 0;
    }
  }
}

/**
 * `@va D2Common:0x6FD92070` (`DRLGOUTDOORS_ScaleAndCompactVertices113c`, custom `edi = ppVertexHead`, `ebx = pMemPool`, `ret`).
 *
 * Scales every vertex's `(nPosX, nPosY)` in the circular `D2DrlgVertexStrc` list at `*ppVertexHead` by truncating signed division by `8`
 * (`(v + (v < 0 ? 7 : 0)) >> 3`), then compacts adjacent duplicate vertices (`pCur->nPosX == pNext->nPosX && pCur->nPosY == pNext->nPosY`)
 * by updating `*ppVertexHead` when `pNext == *ppVertexHead`, unlinking `pNext`, ORing `pNext->dwFlags` into `pCur->dwFlags`,
 * copying `pNext->nDirection` to `pCur->nDirection`, and freeing `pNext` via `Fog.#10046`.
 */
export function DRLGOUTDOORS_ScaleAndCompactVertices113c(
  m: Memory113c,
  ppVertexHead: number,
  _pMemPool = 0,
): void {
  const ppHead = ppVertexHead >>> 0;
  let pCur = m.u32(ppHead);
  do {
    const x = m.u32(pCur) | 0;
    m.setU32(pCur, sdiv32(x, 8) >>> 0);
    const y = m.u32((pCur + 0x04) >>> 0) | 0;
    m.setU32((pCur + 0x04) >>> 0, sdiv32(y, 8) >>> 0);
    pCur = m.u32((pCur + 0x10) >>> 0);
  } while (pCur !== m.u32(ppHead));

  const freeFn = (m as { free?: (p: number) => void }).free;
  do {
    const pNext = m.u32((pCur + 0x10) >>> 0);
    if (
      (m.u32(pCur) | 0) === (m.u32(pNext) | 0) &&
      (m.u32((pCur + 0x04) >>> 0) | 0) === (m.u32((pNext + 0x04) >>> 0) | 0)
    ) {
      if (pNext === m.u32(ppHead)) {
        m.setU32(ppHead, pCur);
      }
      m.setU32((pCur + 0x10) >>> 0, m.u32((pNext + 0x10) >>> 0));
      const nextFlags = m.u32((pNext + 0x0c) >>> 0);
      const curFlags = m.u32((pCur + 0x0c) >>> 0);
      m.setU32((pCur + 0x0c) >>> 0, (curFlags | nextFlags) >>> 0);
      const nextDir = m.u8((pNext + 0x08) >>> 0);
      m.setU8((pCur + 0x08) >>> 0, nextDir);
      freeFn?.call(m, pNext);
    }
    pCur = m.u32((pCur + 0x10) >>> 0);
  } while (pCur !== m.u32(ppHead));
}


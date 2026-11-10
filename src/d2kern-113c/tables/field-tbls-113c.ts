/**
 * Diablo II v1.13c `D2Common.dll` dungeon tile/subtile coordinate conversion and outdoor wilderness border/river helpers
 * (`0x6FD9D8A0`, `0x6FDCE8C0..0x6FDCEA40`, image base `0x6FD50000`).
 *
 * Batch `B009` (4 functions assigned to `tables/field-tbls-113c.ts` in callgraph survey):
 * - `0x6FD9D8A0` `DUNGEON_GameTileToSubtileCoords113c` (`#11158`, `__stdcall(pX, pY)`)
 * - `0x6FDCE8C0` `DRLGOUTWILD_MarkCliffBorderVertices113c` (internal, `eax=pLevel`)
 * - `0x6FDCE9F0` `DRLGOUTWILD_TestSpawnRiver113c` (internal, `eax=pLevel, edx=nX`)
 * - `0x6FDCEA40` `DRLGOUTWILD_GetBridgeCoords113c` (internal, `eax=pLevel, edi=nX, [esp+4]=pOutX, [esp+8]=pOutY`)
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import { D2CommonAssertError } from '../common/inline-helpers.ts'
import {
  D2DrlgLevelStrc,
  D2DrlgOutdoorInfoStrc,
  D2DrlgVertexStrc,
} from '../mem/layout.generated.ts'

/**
 * `@va D2Common:0x6FD9D8A0` (`D2Common.#11158`, `DUNGEON_GameTileToSubtileCoords`, `__stdcall(pX, pY) -> void`, `ret 8`).
 *
 * Multiplies `*pX` and `*pY` in-place by 5 (`lea ecx, [eax+eax*4]`).
 */
export function DUNGEON_GameTileToSubtileCoords113c(
  m: Memory113c,
  pX: number,
  pY: number,
): void {
  m.setU32(pX, Math.imul(m.u32(pX) | 0, 5) >>> 0)
  m.setU32(pY, Math.imul(m.u32(pY) | 0, 5) >>> 0)
}

/**
 * `@va D2Common:0x6FDCE8C0` (internal, custom reg `eax=pLevel -> void`, `ret`).
 *
 * Scans the circular singly-linked vertex ring `pLevel->pOutdoors (+0x14)->pVertex (+0x64)` for top-left
 * corner cliff runs:
 * - Finds the predecessor `ecx` of `pHead` by walking `pNext (+0x10)` until `ecx->pNext === pHead`.
 * - Walks the ring starting at `eax = pHead`:
 *   - Checks entry condition (`condA || condB`) where both `eax` and `ecx` have `(dwFlags (+0x0C) & 1) === 0`:
 *     - `condA`: `eax->nPosX < edx->nPosX && ecx->nPosY > eax->nPosY` (`edx = eax->pNext`)
 *     - `condB`: `eax->nPosY > edx->nPosY && ecx->nPosX > eax->nPosX`
 *   - When triggered, walks forward along the cliff run (`eax->nPosY >= esi->nPosY && eax->nPosX <= esi->nPosX`
 *     with `(dwFlags & 1) === 0` on both `eax` and `esi = eax->pNext`), tracking the last vertex `lastEndVtx`
 *     whose successor `esi` and `nextNext = esi->pNext` satisfy the exit corner check.
 *   - If `lastEndVtx !== 0`, sets `nDirection (+0x08) = 1` on `startVtx .. lastEndVtx` (inclusive) and ORs `0x20`
 *     into `pOutdoors->dwFlags (+0x00)`.
 *   - Stops when the inner scan wrapped past `pHead` (`bWrapped !== 0`) or when `eax` returns to `pHead`.
 */
export function DRLGOUTWILD_MarkCliffBorderVertices113c(
  m: Memory113c,
  pLevel: number,
): void {
  const pOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors)
  let pHead = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.pVertex)

  let ecx = pHead
  let next = m.get(ecx, D2DrlgVertexStrc.pNext)
  while (next !== pHead) {
    ecx = next
    next = m.get(ecx, D2DrlgVertexStrc.pNext)
  }

  let eax = pHead
  let bWrapped = 0

  do {
    const edx = m.get(eax, D2DrlgVertexStrc.pNext)
    const eaxX = m.get(eax, D2DrlgVertexStrc.nPosX) | 0
    const eaxY = m.get(eax, D2DrlgVertexStrc.nPosY) | 0
    const edxX = m.get(edx, D2DrlgVertexStrc.nPosX) | 0
    const edxY = m.get(edx, D2DrlgVertexStrc.nPosY) | 0
    const ecxX = m.get(ecx, D2DrlgVertexStrc.nPosX) | 0
    const ecxY = m.get(ecx, D2DrlgVertexStrc.nPosY) | 0
    const eaxFlag0 = (m.get(eax, D2DrlgVertexStrc.dwFlags) & 1) === 0
    const ecxFlag0 = (m.get(ecx, D2DrlgVertexStrc.dwFlags) & 1) === 0

    const condA = eaxX < edxX && ecxY > eaxY && eaxFlag0 && ecxFlag0
    const condB = eaxY > edxY && ecxX > eaxX && eaxFlag0 && ecxFlag0

    if (condA || condB) {
      const startVtx = eax
      let lastEndVtx = 0
      while (true) {
        if (eax === pHead) {
          bWrapped = 1
        }
        const esi = m.get(eax, D2DrlgVertexStrc.pNext)
        const ebp = m.get(eax, D2DrlgVertexStrc.nPosY) | 0
        const edi = m.get(eax, D2DrlgVertexStrc.nPosX) | 0
        const esiX = m.get(esi, D2DrlgVertexStrc.nPosX) | 0
        const esiY = m.get(esi, D2DrlgVertexStrc.nPosY) | 0
        if (
          ebp < esiY ||
          edi > esiX ||
          (m.get(eax, D2DrlgVertexStrc.dwFlags) & 1) !== 0 ||
          (m.get(esi, D2DrlgVertexStrc.dwFlags) & 1) !== 0
        ) {
          break
        }
        const nextNext = m.get(esi, D2DrlgVertexStrc.pNext)
        const nnX = m.get(nextNext, D2DrlgVertexStrc.nPosX) | 0
        const nnY = m.get(nextNext, D2DrlgVertexStrc.nPosY) | 0
        const esiFlag0 = (m.get(esi, D2DrlgVertexStrc.dwFlags) & 1) === 0
        const endCond1 = edi < esiX && esiY < nnY && esiFlag0
        const endCond2 = ebp > esiY && esiX < nnX && esiFlag0
        if (endCond1 || endCond2) {
          lastEndVtx = eax
        }
        eax = esi
        if (eax === startVtx) {
          break
        }
      }

      if (lastEndVtx !== 0) {
        let v = startVtx
        while (true) {
          m.set(v, D2DrlgVertexStrc.nDirection, 1)
          if (v === lastEndVtx) {
            break
          }
          v = m.get(v, D2DrlgVertexStrc.pNext)
        }
        m.set(
          pOutdoors,
          D2DrlgOutdoorInfoStrc.dwFlags,
          (m.get(pOutdoors, D2DrlgOutdoorInfoStrc.dwFlags) | 0x20) >>> 0,
        )
      }
    }

    ecx = eax
    eax = m.get(eax, D2DrlgVertexStrc.pNext)
    if (bWrapped !== 0) {
      return
    }
    pHead = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.pVertex)
  } while (eax !== pHead)
}

/**
 * `@va D2Common:0x6FDCE9F0` (internal, custom reg `eax=pLevel, edx=nX -> BOOL`, `ret`).
 *
 * Scans rows `y = 0 .. pOutdoors->nGridHeight (+0x60) - 1` of `pGrid2` (`pCells` at `+0x2C`, `pRowOffsets` at `+0x30`).
 * If bit `0x02` of the low byte at `(nX, y)` or `(nX + 1, y)` is set, returns `0`; otherwise returns `1`.
 */
export function DRLGOUTWILD_TestSpawnRiver113c(
  m: Memory113c,
  pLevel: number,
  nX: number,
): number {
  const pOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors)
  const nHeight = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.nGridHeight) | 0
  const x = nX | 0
  for (let y = 0; y < nHeight; y++) {
    const pRowOffsets = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.pGrid2RowOffsets)
    const rowOff = m.u32((pRowOffsets + y * 4) >>> 0) | 0
    const pCells = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.pGrid2Cells)
    const idx = (rowOff + x) | 0
    if ((m.u8((pCells + idx * 4) >>> 0) & 0x02) !== 0) return 0
    if ((m.u8((pCells + idx * 4 + 4) >>> 0) & 0x02) !== 0) return 0
  }
  return 1
}

/**
 * `@va D2Common:0x6FDCEA40` (internal, custom userpurge `eax=pLevel, edi=nX, [esp+4]=pOutX, [esp+8]=pOutY -> void`, `ret 8`).
 *
 * Scans `y = 1 .. pOutdoors->nGridWidth (+0x5C) - 2`:
 * - Checks if `pGrid0` (`pCells` at `+0x04`, `pRowOffsets` at `+0x08`) cell `(nX, y)` equals `0x1C` (`28`).
 * - If so, reads byte `+2` of `pGrid2` (`pCells` at `+0x2C`, `pRowOffsets` at `+0x30`) cell `(nX, y)` (`shr eax, 16; and al, 0x0F`).
 * - When `(byte2 & 0x0F) === 1`, writes `*pOutX = nX`, `*pOutY = y` and returns.
 * - If no cell matches, writes `*pOutX = -1`, `*pOutY = -1`.
 */
export function DRLGOUTWILD_GetBridgeCoords113c(
  m: Memory113c,
  pLevel: number,
  nX: number,
  pOutX: number,
  pOutY: number,
): void {
  const pOutdoors = m.get(pLevel, D2DrlgLevelStrc.pOutdoors)
  const limit = ((m.get(pOutdoors, D2DrlgOutdoorInfoStrc.nGridWidth) | 0) - 1) | 0
  const x = nX | 0
  for (let y = 1; y < limit; y++) {
    const pGrid0Rows = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.pGrid0RowOffsets)
    const row0 = m.u32((pGrid0Rows + y * 4) >>> 0) | 0
    const pGrid0Cells = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.pGrid0Cells)
    const cell0 = m.u32((pGrid0Cells + ((row0 + x) << 2)) >>> 0) | 0
    if (cell0 === 0x1c) {
      const pGrid2Rows = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.pGrid2RowOffsets)
      const row2 = m.u32((pGrid2Rows + y * 4) >>> 0) | 0
      const pGrid2Cells = m.get(pOutdoors, D2DrlgOutdoorInfoStrc.pGrid2Cells)
      const byte2 = m.u8((pGrid2Cells + ((row2 + x) << 2) + 2) >>> 0)
      if ((byte2 & 0x0f) === 1) {
        m.setU32(pOutX, x >>> 0)
        m.setU32(pOutY, y >>> 0)
        return
      }
    }
  }
  m.setU32(pOutX, 0xffffffff)
  m.setU32(pOutY, 0xffffffff)
}

// ============================================================================
// K1r2 Iteration 7 Lane B — Batch B036 (field-tbls-113c.ts)
// ============================================================================

export const FIELD_DIR_DELTA_X_VA = 0x6fde9ba0
export const FIELD_DIR_DELTA_Y_VA = 0x6fde9bc4
export const SGPT_FIELD_DATA_PTR_VA = 0x6fdf1404
export const SGPT_FIELD_CENTER_X_VA = 0x6fdf1414
export const SGPT_FIELD_CENTER_Y_VA = 0x6fdf1418

/**
 * `@va D2Common:0x6FDCE290` (`D2Common.#10139` `FIELD_StepFieldCoords`,
 * stdcall `[esp+4] = pField`, `[esp+8] = pX`, `[esp+0xC] = pY`, `ret 0xC` -> `BOOL`).
 */
export function FIELD_StepFieldCoords113c(
  m: Memory113c,
  pField: number,
  pX: number,
  pY: number,
): number {
  const fieldPtr = pField >>> 0
  if (fieldPtr === 0) {
    throw new D2CommonAssertError('FieldTbls.cpp', 0xbf)
  }
  const xPtr = pX >>> 0
  const yPtr = pY >>> 0
  const fieldY = m.u32((fieldPtr + 0x04) >>> 0) | 0
  const fieldX = m.u32(fieldPtr) | 0
  const x = m.u32(xPtr) | 0
  const y = m.u32(yPtr) | 0
  const centerY = m.u32(SGPT_FIELD_CENTER_Y_VA) | 0
  const pFieldData = m.u32(SGPT_FIELD_DATA_PTR_VA)
  const centerX = m.u32(SGPT_FIELD_CENTER_X_VA) | 0
  const addr1 = (((((y - fieldY + centerY) | 0) << 8) - fieldX + x + pFieldData + centerX) >>> 0)
  const dir = m.u8(addr1)
  const dx = m.u32((FIELD_DIR_DELTA_X_VA + dir * 4) >>> 0) | 0
  m.setU32(xPtr, (x + dx) >>> 0)
  const dy = m.u32((FIELD_DIR_DELTA_Y_VA + dir * 4) >>> 0) | 0
  const y0 = m.u32(yPtr) | 0
  const pFieldData2 = m.u32(SGPT_FIELD_DATA_PTR_VA)
  const newY = (y0 + dy) | 0
  m.setU32(yPtr, newY >>> 0)
  const fieldY2 = m.u32((fieldPtr + 0x04) >>> 0) | 0
  const fieldX2 = m.u32(fieldPtr) | 0
  const newX = m.u32(xPtr) | 0
  const centerX2 = m.u32(SGPT_FIELD_CENTER_X_VA) | 0
  const addr2 =
    (((((newY - fieldY2 + centerY) | 0) << 8) - fieldX2 + newX + pFieldData2 + centerX2) >>> 0)
  const dir2 = m.u8(addr2)
  return dir2 !== 8 ? 1 : 0
}

/**
 * `@va D2Common:0x6FDCE3D0` (`D2Common.#10791` `FIELD_FreeField`,
 * stdcall `[esp+4] = pField`, `ret 4`, void).
 */
export function FIELD_FreeField113c(m: Memory113c, pField: number): void {
  const ptr = pField >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('FieldTbls.cpp', 0x93)
  }
  ;(m as { free?: (p: number) => void }).free?.(ptr)
}

/**
 * `@va D2Common:0x6FDCE410` (`D2Common.#10415` `FIELD_AllocField`,
 * stdcall 0-arg `ret` -> `D2FieldStrc*`).
 */
export function FIELD_AllocField113c(m: Memory113c): number {
  const ptr = m.alloc(8) >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('FieldTbls.cpp', 0x88)
  }
  m.setU32(ptr, 0)
  m.setU32((ptr + 0x04) >>> 0, 0)
  return ptr
}


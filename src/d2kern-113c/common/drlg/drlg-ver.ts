import {
  D2ActiveRoomStrc,
  D2CubemainTxt_SIZE,
  D2DrlgCoordStrc,
  D2DrlgGridStrc,
  D2DrlgLevelStrc,
  D2DrlgOrthStrc,
  D2DrlgOutdoorInfoStrc,
  D2DrlgStrc,
  D2DrlgVertexStrc,
  D2DrlgVertexStrc_SIZE,
  D2HoverTextStrc,
  D2LevelsTxt,
  D2LevelsTxt_SIZE,
  D2MonStatsTxt,
  D2MonStatsTxt_SIZE,
  D2RoomExStrc,
  D2UnitStrc,
} from '../../mem/layout.generated.ts';
import type { Memory113c } from '../../mem/sparse-memory.ts';
import { D2CommonAssertError, SEED_RollRandomNumberInline113c } from '../inline-helpers.ts';

/**
 * `D2Common.dll` `.data` pointer to `gdwBitMasks[32]` (`1 << i` for `i = 0..31`).
 *
 * `@va D2Common:0x6FDD90B0`
 */
export const GDW_BIT_MASKS_PTR_VA = 0x6fdd90b0;

/**
 * `D2Common.dll` `.rdata` outdoor vertex `dX[4] = [1, 0, -1, 0]`.
 *
 * `@va D2Common:0x6FDE4020`
 */
export const OUTDOORS_VERTEX_DX_VA = 0x6fde4020;

/**
 * `D2Common.dll` `.rdata` outdoor vertex `dY[4] = [0, 1, 0, -1]`.
 *
 * `@va D2Common:0x6FDE4030`
 */
export const OUTDOORS_VERTEX_DY_VA = 0x6fde4030;

/**
 * `D2Common.dll` `.data` pointer to `sgptDataTables`.
 *
 * `@va D2Common:0x6FDE9E1C`
 */
export const SGPT_DATA_TABLES_PTR_VA = 0x6fde9e1c;

/**
 * `D2Common.dll` `.bss` `sgptDataTables.pMonStatsTxt` (`D2MonStatsTxt*`).
 *
 * `@va D2Common:0x6FDF0950`
 */
export const SGPT_MONSTATS_TXT_VA = 0x6fdf0950;

/**
 * `D2Common.dll` `.bss` `sgptDataTables.dwMonStatsRecs` (`int32_t`).
 *
 * `@va D2Common:0x6FDF0958`
 */
export const SGPT_MONSTATS_RECS_VA = 0x6fdf0958;

/**
 * `D2Common.dll` `.bss` `sgptDataTables.pCubemainTxt` (`D2CubemainTxt*`).
 *
 * `@va D2Common:0x6FDF1464`
 */
export const SGPT_CUBEMAIN_TXT_VA = 0x6fdf1464;

/**
 * `D2Common.dll` `.bss` `sgptDataTables.dwCubemainRecs` (`int32_t`).
 *
 * `@va D2Common:0x6FDF1468`
 */
export const SGPT_CUBEMAIN_RECS_VA = 0x6fdf1468;

/**
 * `@va D2Common:0x6FD67C80` (`DRLGOUTPLACE_CanStepMazeLinkNode113c`, not exported;
 * custom LTCG `eax = pHeadNode`, `ecx = pTargetCoord`, `esi = nCandX`, `ebx = nCandY`,
 * `[esp+4] = pLevel`, `ret 4`).
 *
 * Checks whether an outdoor maze link path can step to grid coordinate `(nCandX, nCandY)`:
 * 1. If `(nCandX, nCandY)` equals `(*pTargetCoord, *(pTargetCoord + 4))`, returns `1`.
 * 2. Checks bounds against `pLevel->pOutdoors` (`+0x14`):
 *    `nMinX <= nCandX < nMinX + nGridWidth` and `nMinY <= nCandY < nMinY + nGridHeight`
 *    (`nMinX` at `+0x54`, `nMinY` at `+0x58`, `nGridWidth` at `+0x5C`, `nGridHeight` at `+0x60`).
 * 3. Checks `pOutdoors->pGrid2` (`pCells` at `+0x2C`, `pRowOffsets` at `+0x30`):
 *    if `(pCells[pRowOffsets[nCandY] + nCandX] & 0x200) != 0`, returns `0`.
 * 4. Walks the linked list starting at `pHeadNode` (next pointer at `+0x20`):
 *    if any node has `(node[+0x0C], node[+0x10]) == (nCandX, nCandY)`, returns `0`.
 * 5. Otherwise returns `1`.
 */
export function DRLGOUTPLACE_CanStepMazeLinkNode113c(
  m: Memory113c,
  pHeadNode: number,
  pTargetCoord: number,
  nCandX: number,
  nCandY: number,
  pLevel: number,
): number {
  const candX = nCandX | 0;
  const candY = nCandY | 0;
  const target = pTargetCoord >>> 0;
  if (candX === (m.u32(target) | 0) && candY === (m.u32((target + 4) >>> 0) | 0)) {
    return 1;
  }

  const pOutdoors = m.u32(((pLevel >>> 0) + D2DrlgLevelStrc.pOutdoors.off) >>> 0);
  const nMinX = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.nWidth.off) >>> 0) | 0;
  if (candX < nMinX) {
    return 0;
  }
  const nMinY = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.nHeight.off) >>> 0) | 0;
  if (candY < nMinY) {
    return 0;
  }
  const nMaxX = (nMinX + (m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.nGridWidth.off) >>> 0) | 0)) | 0;
  if (candX >= nMaxX) {
    return 0;
  }
  const nMaxY = (nMinY + (m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.nGridHeight.off) >>> 0) | 0)) | 0;
  if (candY >= nMaxY) {
    return 0;
  }

  const pRowOffsets = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2RowOffsets.off) >>> 0);
  const rowOffset = m.u32((pRowOffsets + ((candY << 2) >>> 0)) >>> 0);
  const pCells = m.u32((pOutdoors + D2DrlgOutdoorInfoStrc.pGrid2Cells.off) >>> 0);
  const cellIndex = (rowOffset + candX) >>> 0;
  if ((m.u32((pCells + ((cellIndex << 2) >>> 0)) >>> 0) & 0x200) !== 0) {
    return 0;
  }

  let cur = pHeadNode >>> 0;
  while (cur !== 0) {
    if ((m.u32((cur + 0x0c) >>> 0) | 0) === candX && (m.u32((cur + 0x10) >>> 0) | 0) === candY) {
      return 0;
    }
    cur = m.u32((cur + 0x20) >>> 0);
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD681E0` (`CHAT_SetUsed113c`, ordinal `#10097`,
 * `__stdcall(pHoverMsg, bUsed)`, `ret 8`).
 *
 * Writes the low byte of `bUsed` to `pHoverMsg + 0x08` (`D2HoverTextStrc.nLangId`).
 */
export function CHAT_SetUsed113c(m: Memory113c, pHoverMsg: number, bUsed: number): void {
  m.setU8(((pHoverMsg >>> 0) + D2HoverTextStrc.nLangId.off) >>> 0, bUsed & 0xff);
}

/**
 * `@va D2Common:0x6FD681F0` (`CHAT_GetUsed113c`, ordinal `#10271`,
 * `__stdcall(pHoverMsg) -> uint8_t`, `ret 4`).
 *
 * Reads the byte at `pHoverMsg + 0x08` (`D2HoverTextStrc.nLangId`) into `AL`.
 */
export function CHAT_GetUsed113c(m: Memory113c, pHoverMsg: number): number {
  return m.u8(((pHoverMsg >>> 0) + D2HoverTextStrc.nLangId.off) >>> 0);
}

/**
 * `@va D2Common:0x6FD6A610` (`MONSTER_CheckMonTypeFlag0x20_113c`, ordinal `#10255`,
 * `__stdcall(pUnit) -> BOOL`, `ret 4`).
 *
 * Returns `1` iff `pUnit` is a valid monster unit (`dwUnitType == 1`) whose
 * `D2MonStatsTxt.nBitField2` (`+0x0D`) has the bit at `gdwBitMasks[5]` (`*(u8*)(*(u32*)0x6FDD90B0 + 0x14)`) set.
 */
export function MONSTER_CheckMonTypeFlag0x20_113c(m: Memory113c, pUnit: number): number {
  const unit = pUnit >>> 0;
  if (unit === 0 || m.u32(unit) !== 1) {
    return 0;
  }
  const nClassId = m.u32((unit + D2UnitStrc.dwClassId.off) >>> 0) | 0;
  if (nClassId < 0) {
    return 0;
  }
  const gpDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA);
  const nMonStatsCount = m.u32((gpDataTables + 0xa80) >>> 0) | 0;
  if (nClassId >= nMonStatsCount) {
    return 0;
  }
  const pMonStatsBase = m.u32((gpDataTables + 0xa78) >>> 0);
  const pRecord = (pMonStatsBase + Math.imul(nClassId, D2MonStatsTxt_SIZE)) >>> 0;
  if (pRecord === 0) {
    return 0;
  }
  const flagsByte = m.u8((pRecord + D2MonStatsTxt.nBitField2.off) >>> 0);
  const pBitMasks = m.u32(GDW_BIT_MASKS_PTR_VA);
  const maskByte = m.u8((pBitMasks + 0x14) >>> 0);
  return (flagsByte & maskByte) !== 0 ? 1 : 0;
}

/**
 * `@va D2Common:0x6FD6A720` (`MONSTER_GetMonStatsInteractBit113c`, ordinal `#10278`,
 * `__stdcall(pUnit) -> uint32_t`, `ret 4`).
 *
 * Returns `(uint8_t)pMonStatsTxt->nBitField1 & gdwBitMasks[7]` (`*(u32*)(*(u32*)0x6FDD90B0 + 0x1C)`)
 * for monster units (`dwUnitType == 1`), or `0` otherwise.
 */
export function MONSTER_GetMonStatsInteractBit113c(m: Memory113c, pUnit: number): number {
  const unit = pUnit >>> 0;
  if (unit === 0 || m.u32(unit) !== 1) {
    return 0;
  }
  const nClassId = m.u32((unit + D2UnitStrc.dwClassId.off) >>> 0) | 0;
  if (nClassId < 0) {
    return 0;
  }
  const gpDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA);
  const nMonStatsCount = m.u32((gpDataTables + 0xa80) >>> 0) | 0;
  if (nClassId >= nMonStatsCount) {
    return 0;
  }
  const pMonStatsBase = m.u32((gpDataTables + 0xa78) >>> 0);
  const pRecord = (pMonStatsBase + Math.imul(nClassId, D2MonStatsTxt_SIZE)) >>> 0;
  if (pRecord === 0) {
    return 0;
  }
  const flagsByte = m.u8((pRecord + D2MonStatsTxt.nBitField1.off) >>> 0);
  const pBitMasks = m.u32(GDW_BIT_MASKS_PTR_VA);
  return (flagsByte & m.u32((pBitMasks + 0x1c) >>> 0)) >>> 0;
}

/**
 * `@va D2Common:0x6FD6A770` (`DRLG_ResolveMonsterSubClassIdForRoom113c`, ordinal `#10581`,
 * `__stdcall(pRoom1, nClassId) -> int32_t`, `ret 8`).
 *
 * Resolves a monster subclass ID appropriate for `pRoom1`'s `D2LevelsTxt` record:
 * 1. Looks up `pLevelsTxt` from `pRoom1->pRoomEx->pLevel->nLevelId`.
 * 2. Reads `nNumMon = pLevelsTxt->nNumMon` (`+0x33`); if `0`, returns `nClassId`.
 * 3. Resolves `nBaseId = pMonStatsTxt[nClassId].wBaseId` (`+0x02`) and scans `pLevelsTxt->wMon[0..nNumMon-1]`
 *    (`+0x36`) for an entry whose `wBaseId == nBaseId`; if found, returns that `wMon[i]`.
 * 4. Otherwise walks up to `nSubClassCount` (`+0x4A` via `0x6FDF0950` / `0x6FDF0958`) links along
 *    `wNextInClass` (`+0x04`) while `pNextStats->wLevel (+0xAA) <= pLevelsTxt->wMonLv (+0x16) + 1`.
 */
export function DRLG_ResolveMonsterSubClassIdForRoom113c(
  m: Memory113c,
  pRoom1: number,
  nClassId: number,
): number {
  const room1 = pRoom1 >>> 0;
  const gpDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA);
  let pLevelsTxt = 0;
  if (room1 !== 0) {
    const pRoomEx = m.u32((room1 + D2ActiveRoomStrc.pRoomEx.off) >>> 0);
    const pLevel = m.u32((pRoomEx + D2RoomExStrc.pLevel.off) >>> 0);
    const nLevelId = m.u32((pLevel + D2DrlgLevelStrc.nLevelId.off) >>> 0) | 0;
    if (nLevelId > 0) {
      const nLevelsCount = m.u32((gpDataTables + 0xc5c) >>> 0) | 0;
      if (nLevelId < nLevelsCount) {
        pLevelsTxt = (m.u32((gpDataTables + 0xc58) >>> 0) + Math.imul(nLevelId, D2LevelsTxt_SIZE)) >>> 0;
      }
    }
  }

  const nNumMon = m.u8((pLevelsTxt + D2LevelsTxt.nNumMon.off) >>> 0);
  if (nNumMon === 0) {
    return nClassId | 0;
  }

  let ebx = nClassId | 0;
  const nMonStatsCount = m.u32((gpDataTables + 0xa80) >>> 0) | 0;
  const pMonStatsBase = m.u32((gpDataTables + 0xa78) >>> 0);

  let nBaseId = ebx;
  if (ebx >= 0 && ebx < nMonStatsCount) {
    const pMonStats = (pMonStatsBase + Math.imul(ebx, D2MonStatsTxt_SIZE)) >>> 0;
    if (pMonStats !== 0) {
      nBaseId = (m.u16((pMonStats + D2MonStatsTxt.wBaseId.off) >>> 0) << 16) >> 16;
    }
  }

  if (nBaseId < 0 || nBaseId >= nMonStatsCount) {
    return ebx;
  }
  const pBaseStats = (pMonStatsBase + Math.imul(nBaseId, D2MonStatsTxt_SIZE)) >>> 0;
  if (pBaseStats === 0) {
    return ebx;
  }

  for (let i = 0; i < nNumMon; i++) {
    const wMon = (m.u16((pLevelsTxt + D2LevelsTxt.wMon.off + i * 2) >>> 0) << 16) >> 16;
    let entryBaseId = wMon;
    if (wMon >= 0 && wMon < nMonStatsCount) {
      const pEntryStats = (pMonStatsBase + Math.imul(wMon, D2MonStatsTxt_SIZE)) >>> 0;
      if (pEntryStats !== 0) {
        entryBaseId = (m.u16((pEntryStats + D2MonStatsTxt.wBaseId.off) >>> 0) << 16) >> 16;
      }
    }
    if (entryBaseId === nBaseId) {
      return wMon;
    }
  }

  let nextId = (m.u16((pBaseStats + D2MonStatsTxt.wNextInClass.off) >>> 0) << 16) >> 16;
  let maxSteps = 0;
  if (ebx >= 0) {
    const nMonStatsRecs = m.u32(SGPT_MONSTATS_RECS_VA) | 0;
    if (ebx < nMonStatsRecs) {
      const pInlineStats = (m.u32(SGPT_MONSTATS_TXT_VA) + Math.imul(ebx, D2MonStatsTxt_SIZE)) >>> 0;
      maxSteps = m.u8((pInlineStats + D2MonStatsTxt.nSubClassCount.off) >>> 0);
    }
  }

  for (let step = 0; step < maxSteps; step++) {
    if (nextId < 0 || nextId >= nMonStatsCount) {
      break;
    }
    const pNextStats = (pMonStatsBase + Math.imul(nextId, D2MonStatsTxt_SIZE)) >>> 0;
    if (pNextStats === 0) {
      break;
    }
    const nMonLevel = (m.u16((pLevelsTxt + 0x16) >>> 0) << 16) >> 16;
    const nNextLevel = (m.u16((pNextStats + D2MonStatsTxt.wLevel.off) >>> 0) << 16) >> 16;
    if (nNextLevel > ((nMonLevel + 1) | 0)) {
      break;
    }
    ebx = nextId;
    nextId = (m.u16((pNextStats + D2MonStatsTxt.wNextInClass.off) >>> 0) << 16) >> 16;
  }

  return ebx;
}

/**
 * `@va D2Common:0x6FD6A990` (`MONSTER_IsSarcophagusBaseAndZeroArg113c`, ordinal `#10707`,
 * `__stdcall(pUnit, nArg) -> BOOL`, `ret 8`).
 *
 * Resolves `baseId` for monster unit `pUnit` (or `-1` if `pUnit == NULL` or `dwUnitType != 1`),
 * compares it against `(dwMonStatsRecs > 78 ? 78 : -1)`, and returns `1` iff equal and `nArg == 0`.
 */
export function MONSTER_IsSarcophagusBaseAndZeroArg113c(
  m: Memory113c,
  pUnit: number,
  nArg: number,
): number {
  const unit = pUnit >>> 0;
  const gpDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA);
  let baseId = -1;
  if (unit !== 0 && m.u32(unit) === 1) {
    const nClassId = m.u32((unit + D2UnitStrc.dwClassId.off) >>> 0) | 0;
    baseId = nClassId;
    const nMonStatsCount = m.u32((gpDataTables + 0xa80) >>> 0) | 0;
    if (nClassId >= 0 && nClassId < nMonStatsCount) {
      const pMonStatsBase = m.u32((gpDataTables + 0xa78) >>> 0);
      const pRecord = (pMonStatsBase + Math.imul(nClassId, D2MonStatsTxt_SIZE)) >>> 0;
      if (pRecord !== 0) {
        baseId = (m.u16((pRecord + D2MonStatsTxt.wBaseId.off) >>> 0) << 16) >> 16;
      }
    }
  }
  const totalCount = m.u32((gpDataTables + 0xa80) >>> 0) | 0;
  const targetBaseId = totalCount > 0x4e ? 0x4e : -1;
  return baseId === targetBaseId && (nArg | 0) === 0 ? 1 : 0;
}

/**
 * `@va D2Common:0x6FD6B880` (`DATATBLS_GetCubemainTxtRecordCount113c`, ordinal `#10675`,
 * `__stdcall() -> int32_t`, `ret`).
 *
 * Returns `sgptDataTables.dwCubemainRecs` (`*(int32_t*)0x6FDF1468`).
 */
export function DATATBLS_GetCubemainTxtRecordCount113c(m: Memory113c): number {
  return m.u32(SGPT_CUBEMAIN_RECS_VA) | 0;
}

/**
 * `@va D2Common:0x6FD8D810` (`DRLGGRID_Get3x3Neighborhood113c`, not exported;
 * custom LTCG `eax = pGrid`, `ecx = nY`, `edx = nX`, `esi = pOut9Dwords`, `ret`).
 *
 * Extracts the 3x3 neighborhood of grid cells centered at `(nX, nY)` into `pOut9Dwords[0..8]`:
 * - `out[0]` = `(nX - 1, nY + 1)`
 * - `out[1]` = `(nX - 1, nY)`
 * - `out[2]` = `(nX - 1, nY - 1)`
 * - `out[3]` = `(nX,     nY + 1)`
 * - `out[4]` = `(nX,     nY)`
 * - `out[5]` = `(nX,     nY - 1)`
 * - `out[6]` = `(nX + 1, nY + 1)`
 * - `out[7]` = `(nX + 1, nY)`
 * - `out[8]` = `(nX + 1, nY - 1)`
 */
export function DRLGGRID_Get3x3Neighborhood113c(
  m: Memory113c,
  pGrid: number,
  nY: number,
  nX: number,
  pOut9Dwords: number,
): void {
  const grid = pGrid >>> 0;
  const out = pOut9Dwords >>> 0;
  const x = nX | 0;
  const y = nY | 0;

  const pCells0 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  const pRowOffsets0 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowYm1_0 = (m.u32((pRowOffsets0 + (((y << 2) - 4) >>> 0)) >>> 0) + x) | 0;
  m.setU32((out + 0x08) >>> 0, m.u32((pCells0 + (((rowYm1_0 << 2) - 4) >>> 0)) >>> 0));

  const pRowOffsets1 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowY0_0 = (m.u32((pRowOffsets1 + ((y << 2) >>> 0)) >>> 0) + x) | 0;
  const pCells1 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  m.setU32((out + 0x04) >>> 0, m.u32((pCells1 + (((rowY0_0 << 2) - 4) >>> 0)) >>> 0));

  const pRowOffsets2 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowYp1_0 = (m.u32((pRowOffsets2 + (((y << 2) + 4) >>> 0)) >>> 0) + x) | 0;
  const pCells2 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  m.setU32(out, m.u32((pCells2 + (((rowYp1_0 << 2) - 4) >>> 0)) >>> 0));

  const pRowOffsets3 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowYm1_1 = (m.u32((pRowOffsets3 + (((y << 2) - 4) >>> 0)) >>> 0) + x) | 0;
  const pCells3 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  m.setU32((out + 0x14) >>> 0, m.u32((pCells3 + ((rowYm1_1 << 2) >>> 0)) >>> 0));

  const pRowOffsets4 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowYm1_2 = (m.u32((pRowOffsets4 + (((y << 2) - 4) >>> 0)) >>> 0) + x) | 0;
  const pCells4 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  m.setU32((out + 0x20) >>> 0, m.u32((pCells4 + (((rowYm1_2 << 2) + 4) >>> 0)) >>> 0));

  const pRowOffsets5 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowY0_1 = (m.u32((pRowOffsets5 + ((y << 2) >>> 0)) >>> 0) + x) | 0;
  const pCells5 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  m.setU32((out + 0x10) >>> 0, m.u32((pCells5 + ((rowY0_1 << 2) >>> 0)) >>> 0));

  const pRowOffsets6 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowY0_2 = (m.u32((pRowOffsets6 + ((y << 2) >>> 0)) >>> 0) + x) | 0;
  const pCells6 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  m.setU32((out + 0x1c) >>> 0, m.u32((pCells6 + (((rowY0_2 << 2) + 4) >>> 0)) >>> 0));

  const pRowOffsets7 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowYp1_1 = (m.u32((pRowOffsets7 + (((y << 2) + 4) >>> 0)) >>> 0) + x) | 0;
  const pCells7 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  m.setU32((out + 0x0c) >>> 0, m.u32((pCells7 + ((rowYp1_1 << 2) >>> 0)) >>> 0));

  const pRowOffsets8 = m.u32((grid + D2DrlgGridStrc.pRowOffsets.off) >>> 0);
  const rowYp1_2 = (m.u32((pRowOffsets8 + (((y << 2) + 4) >>> 0)) >>> 0) + x) | 0;
  const pCells8 = m.u32((grid + D2DrlgGridStrc.pCells.off) >>> 0);
  m.setU32((out + 0x18) >>> 0, m.u32((pCells8 + (((rowYp1_2 << 2) + 4) >>> 0)) >>> 0));
}

/**
 * `@va D2Common:0x6FD8E230` (`PATH_QuantizeDeltaIndex25_113c`, not exported;
 * custom LTCG `eax = nX1`, `ecx = nY1`, `edx = nY2`, `[esp+4] = nX2`, `ret 4`).
 *
 * Quantizes the 32-bit signed delta `(dx = nX1 - nX2, dy = nY1 - nY2)` into a 5x5 grid index
 * `5 * dx + dy + 12` (`0..24`).
 */
export function PATH_QuantizeDeltaIndex25_113c(
  nX1: number,
  nY1: number,
  nY2: number,
  nX2: number,
): number {
  let edx = ((nX1 | 0) - (nX2 | 0)) | 0;
  let esi = ((nY1 | 0) - (nY2 | 0)) | 0;
  const absX = edx < 0 ? -edx | 0 : edx;
  const absY = esi < 0 ? -esi | 0 : esi;

  if (absX >= ((absY + absY) | 0)) {
    esi = esi < 0 ? -1 : esi & 1;
    if (edx < -1) {
      edx = -2;
    } else if (edx > 1) {
      edx = 2;
    }
  } else if (absY >= ((absX + absX) | 0)) {
    if (edx < 0) {
      edx = -1;
    } else {
      edx = edx & 1;
      if (edx < -1) {
        edx = -2;
      } else if (edx > 1) {
        edx = 2;
      }
    }
  } else {
    if (edx < -1) {
      edx = -2;
    } else if (edx > 1) {
      edx = 2;
    }
  }

  if (esi < -1) {
    esi = -2;
  } else if (esi > 1) {
    esi = 2;
  }
  return (esi + ((edx * 5) | 0) + 12) | 0;
}

/**
 * `@va D2Common:0x6FD6B3D0` (`DRLGVER_FreeVertices113c`, not exported;
 * custom `ebx = pMemPool`, `edi = ppVertexList`, `ret`).
 *
 * Frees a linear or circular `D2DrlgVertexStrc` linked list via `Fog.#10046`
 * and zeroes `*ppVertexList`.
 */
export function DRLGVER_FreeVertices113c(
  m: Memory113c,
  pMemPool: number,
  ppVertexList: number,
): void {
  void pMemPool;
  const listPtr = ppVertexList >>> 0;
  const head = m.u32(listPtr);
  if (head === 0) {
    return;
  }
  const freeFn = (m as { free?: (p: number) => void }).free;
  let esi = m.u32((head + D2DrlgVertexStrc.pNext.off) >>> 0);
  if (esi !== 0) {
    while (true) {
      const toFree = esi;
      esi = m.u32((esi + D2DrlgVertexStrc.pNext.off) >>> 0);
      freeFn?.(toFree);
      if (esi === m.u32(listPtr)) {
        freeFn?.(esi);
        if (esi !== 0) {
          m.setU32(listPtr, 0);
          return;
        }
        break;
      }
      if (esi === 0) {
        break;
      }
    }
  }
  freeFn?.(m.u32(listPtr));
  m.setU32(listPtr, 0);
}

/**
 * `@va D2Common:0x6FD6B4B0` (`DRLGVER_CreateVerticesForRoom113c`, not exported;
 * `__stdcall(pMemPool, pVertexHead, pDefaultBox, nFlagByte, pOrthList)`, `ret 0x14`).
 *
 * Splits the 4-corner room boundary vertex loop along each `D2DrlgOrthStrc` overlap box.
 */
export function DRLGVER_CreateVerticesForRoom113c(
  m: Memory113c,
  pMemPool: number,
  pVertexHead: number,
  pDefaultBox: number,
  nFlagByte: number,
  pOrthList: number,
): void {
  void pMemPool;
  const v0 = pVertexHead >>> 0;
  const v1 = m.u32((v0 + D2DrlgVertexStrc.pNext.off) >>> 0);
  const v2 = m.u32((v1 + D2DrlgVertexStrc.pNext.off) >>> 0);
  const v3 = m.u32((v2 + D2DrlgVertexStrc.pNext.off) >>> 0);
  let pOrth = pOrthList >>> 0;
  if (pOrth === 0) {
    return;
  }

  while (pOrth !== 0) {
    let pBox = m.u32((pOrth + D2DrlgOrthStrc.pBox.off) >>> 0);
    if (pBox === 0) {
      pBox = pDefaultBox >>> 0;
    }
    const dir = m.u32((pOrth + D2DrlgOrthStrc.nDirection.off) >>> 0);
    if (dir > 3) {
      throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgVer.cpp', 109);
    }

    let ebp: number;
    let esi: number;
    let edi: number;
    let eax: number;
    let edx: number;
    let ebx: number;
    let isYAxis: number;

    if (dir === 0) {
      ebp = m.u32((pBox + D2DrlgCoordStrc.nPosY.off) >>> 0) | 0;
      esi = ((m.u32((pBox + D2DrlgCoordStrc.nHeight.off) >>> 0) | 0) + ebp) | 0;
      edi = v0;
      eax = m.u32((edi + D2DrlgVertexStrc.nPosY.off) >>> 0) | 0;
      edx = m.u32((v1 + D2DrlgVertexStrc.nPosY.off) >>> 0) | 0;
      ebx = -1;
      isYAxis = 1;
    } else if (dir === 1) {
      esi = m.u32((pBox + D2DrlgCoordStrc.nPosX.off) >>> 0) | 0;
      ebp = ((m.u32((pBox + D2DrlgCoordStrc.nWidth.off) >>> 0) | 0) + esi) | 0;
      edi = v1;
      eax = m.u32((edi + D2DrlgVertexStrc.nPosX.off) >>> 0) | 0;
      edx = m.u32((v2 + D2DrlgVertexStrc.nPosX.off) >>> 0) | 0;
      ebx = 1;
      isYAxis = 0;
    } else if (dir === 2) {
      esi = m.u32((pBox + D2DrlgCoordStrc.nPosY.off) >>> 0) | 0;
      ebp = ((m.u32((pBox + D2DrlgCoordStrc.nHeight.off) >>> 0) | 0) + esi) | 0;
      edi = v2;
      eax = m.u32((edi + D2DrlgVertexStrc.nPosY.off) >>> 0) | 0;
      edx = m.u32((v3 + D2DrlgVertexStrc.nPosY.off) >>> 0) | 0;
      ebx = 1;
      isYAxis = 1;
    } else {
      ebp = m.u32((pBox + D2DrlgCoordStrc.nPosX.off) >>> 0) | 0;
      esi = ((m.u32((pBox + D2DrlgCoordStrc.nWidth.off) >>> 0) | 0) + ebp) | 0;
      edi = v3;
      eax = m.u32((edi + D2DrlgVertexStrc.nPosX.off) >>> 0) | 0;
      edx = m.u32((v0 + D2DrlgVertexStrc.nPosX.off) >>> 0) | 0;
      ebx = -1;
      isYAxis = 0;
    }

    const scaledStart = Math.imul(eax, ebx);
    const scaledEsi = Math.imul(esi, ebx);
    let skip = false;

    if (scaledEsi > scaledStart) {
      if (scaledEsi > Math.imul(edx, ebx)) {
        skip = true;
      } else {
        const newV1 = m.alloc(D2DrlgVertexStrc_SIZE);
        m.setU32(newV1, 0);
        m.setU32((newV1 + 0x04) >>> 0, 0);
        m.setU32((newV1 + 0x08) >>> 0, 0);
        m.setU32((newV1 + 0x0c) >>> 0, 0);
        m.setU32((newV1 + 0x10) >>> 0, 0);
        m.setU8((newV1 + D2DrlgVertexStrc.nDirection.off) >>> 0, nFlagByte & 0xff);
        if (isYAxis !== 0) {
          m.setU32(newV1, m.u32(edi));
          m.setU32((newV1 + D2DrlgVertexStrc.nPosY.off) >>> 0, esi >>> 0);
        } else {
          m.setU32((newV1 + D2DrlgVertexStrc.nPosY.off) >>> 0, m.u32((edi + D2DrlgVertexStrc.nPosY.off) >>> 0));
          m.setU32(newV1, esi >>> 0);
        }
        m.setU32((newV1 + D2DrlgVertexStrc.pNext.off) >>> 0, m.u32((edi + D2DrlgVertexStrc.pNext.off) >>> 0));
        m.setU32((edi + D2DrlgVertexStrc.pNext.off) >>> 0, newV1);
        edi = newV1;
      }
    } else if (Math.imul(ebp, ebx) < scaledStart) {
      skip = true;
    }

    if (!skip) {
      const bIndoor = m.u32((pOrth + 0x08) >>> 0);
      let vFlags = (m.u32((edi + D2DrlgVertexStrc.dwFlags.off) >>> 0) | 1) >>> 0;
      m.setU32((edi + D2DrlgVertexStrc.dwFlags.off) >>> 0, vFlags);
      if (bIndoor !== 0) {
        vFlags = (vFlags | 2) >>> 0;
        m.setU32((edi + D2DrlgVertexStrc.dwFlags.off) >>> 0, vFlags);
      }

      if (Math.imul(ebp, ebx) < Math.imul(edx, ebx)) {
        const newV2 = m.alloc(D2DrlgVertexStrc_SIZE);
        m.setU32(newV2, 0);
        m.setU32((newV2 + 0x04) >>> 0, 0);
        m.setU32((newV2 + 0x08) >>> 0, 0);
        m.setU32((newV2 + 0x0c) >>> 0, 0);
        m.setU32((newV2 + 0x10) >>> 0, 0);
        m.setU8((newV2 + D2DrlgVertexStrc.nDirection.off) >>> 0, nFlagByte & 0xff);
        if (isYAxis !== 0) {
          m.setU32(newV2, m.u32(edi));
          m.setU32((newV2 + D2DrlgVertexStrc.nPosY.off) >>> 0, ebp >>> 0);
        } else {
          m.setU32((newV2 + D2DrlgVertexStrc.nPosY.off) >>> 0, m.u32((edi + D2DrlgVertexStrc.nPosY.off) >>> 0));
          m.setU32(newV2, ebp >>> 0);
        }
        m.setU32((newV2 + D2DrlgVertexStrc.pNext.off) >>> 0, m.u32((edi + D2DrlgVertexStrc.pNext.off) >>> 0));
        m.setU32((edi + D2DrlgVertexStrc.pNext.off) >>> 0, newV2);
      }
    }

    pOrth = m.u32((pOrth + 0x14) >>> 0);
  }
}

/**
 * `@va D2Common:0x6FD6B890` (`DATATBLS_GetCubemainTxtRecord113c`, ordinal `#10783`,
 * `__stdcall(nIndex) -> D2CubemainTxt*`, `ret 4`).
 *
 * Returns `sgptDataTables.pCubemainTxt + nIndex * 0x148` after asserting
 * `pCubemainTxt != NULL` and `nIndex < dwCubemainRecs`.
 */
export function DATATBLS_GetCubemainTxtRecord113c(m: Memory113c, nIndex: number): number {
  const pBase = m.u32(SGPT_CUBEMAIN_TXT_VA);
  if (pBase === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgVer.cpp', 846);
  }
  const idx = nIndex | 0;
  const nCount = m.u32(SGPT_CUBEMAIN_RECS_VA) | 0;
  if (idx >= nCount) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgVer.cpp', 847);
  }
  return (pBase + Math.imul(idx, D2CubemainTxt_SIZE)) >>> 0;
}

/**
 * `@va D2Common:0x6FD8D920` (`DRLGVER_ScaleOutdoorsVertices113c`, not exported;
 * custom `esi = pLevel`, `[esp+4] = nIndex`, `ret 4`).
 *
 * Scales and jitters outdoor vertex list `pLevel->pOutdoors->pVertexList[nIndex]` (`+0x68 + nIndex*4`)
 * using `pLevel->sSeed` (`+0x1C4`) and `.rdata` direction tables `0x6FDE4020` (`dX[4]`) and `0x6FDE4030` (`dY[4]`).
 */
export function DRLGVER_ScaleOutdoorsVertices113c(
  m: Memory113c,
  pLevel: number,
  nIndex: number,
): void {
  const level = pLevel >>> 0;
  const pDrlg = m.u32((level + D2DrlgLevelStrc.pDrlg.off) >>> 0);
  void m.u32((pDrlg + D2DrlgStrc.pMemPool.off) >>> 0);
  const idx = nIndex | 0;
  const pOutdoors = m.u32((level + D2DrlgLevelStrc.pOutdoors.off) >>> 0);
  let edi = m.u32((pOutdoors + idx * 4 + 0x68) >>> 0);

  let dir = SEED_RollRandomNumberInline113c(m, (level + D2DrlgLevelStrc.sSeed.off) >>> 0, 4);
  if (edi === 0) {
    return;
  }

  const edx5 = Math.imul(idx, 5);
  const ebx = (pOutdoors + edx5 * 4) >>> 0;
  if (m.u8((ebx + 0x1f0) >>> 0) !== 4) {
    const newHead = m.alloc(D2DrlgVertexStrc_SIZE);
    m.setU32(newHead, 0);
    m.setU32((newHead + 0x04) >>> 0, 0);
    m.setU32((newHead + 0x08) >>> 0, 0);
    m.setU32((newHead + 0x0c) >>> 0, 0);
    m.setU32((newHead + 0x10) >>> 0, 0);
    m.setU8((newHead + 0x08) >>> 0, 0);
    m.setU32(newHead, m.u32((ebx + 0x1e8) >>> 0));
    m.setU32((newHead + 0x04) >>> 0, m.u32((ebx + 0x1ec) >>> 0));
    m.setU32((newHead + 0x10) >>> 0, edi);
    m.setU32((pOutdoors + idx * 4 + 0x68) >>> 0, newHead);
  }

  m.setU32(edi, m.u32((ebx + 0x170) >>> 0));
  m.setU32((edi + 0x04) >>> 0, m.u32((ebx + 0x174) >>> 0));
  edi = m.u32((edi + 0x10) >>> 0);
  if (edi === 0) {
    return;
  }

  while (edi !== 0) {
    const nextV = m.u32((edi + 0x10) >>> 0);
    if (nextV === 0) {
      m.setU32(edi, m.u32((ebx + 0xf8) >>> 0));
      m.setU32((edi + 0x04) >>> 0, m.u32((ebx + 0xfc) >>> 0));
      const tailV = m.alloc(D2DrlgVertexStrc_SIZE);
      m.setU32(tailV, 0);
      m.setU32((tailV + 0x04) >>> 0, 0);
      m.setU32((tailV + 0x08) >>> 0, 0);
      m.setU32((tailV + 0x0c) >>> 0, 0);
      m.setU32((tailV + 0x10) >>> 0, 0);
      m.setU8((tailV + 0x08) >>> 0, 0);
      m.setU32(tailV, m.u32((ebx + 0x80) >>> 0));
      m.setU32((tailV + 0x04) >>> 0, m.u32((ebx + 0x84) >>> 0));
      m.setU32((edi + 0x10) >>> 0, tailV);
      return;
    }

    const r1 = (SEED_RollRandomNumberInline113c(m, (level + D2DrlgLevelStrc.sSeed.off) >>> 0, 2) + 2) | 0;
    const stepX = Math.imul(r1, m.u32((OUTDOORS_VERTEX_DX_VA + dir * 4) >>> 0) | 0);
    const r2 = (SEED_RollRandomNumberInline113c(m, (level + D2DrlgLevelStrc.sSeed.off) >>> 0, 2) + 2) | 0;
    const stepY = Math.imul(r2, m.u32((OUTDOORS_VERTEX_DY_VA + dir * 4) >>> 0) | 0);
    dir = (dir + 1) & 3;

    const vx8 = (m.u32(edi) << 3) | 0;
    const vy8 = (m.u32((edi + 0x04) >>> 0) << 3) | 0;
    m.setU32(edi, vx8 >>> 0);
    m.setU32((edi + 0x04) >>> 0, vy8 >>> 0);

    const levelX = m.u32((level + D2DrlgLevelStrc.nPosX.off) >>> 0) | 0;
    m.setU32(edi, (levelX + vx8 + stepX + 3) >>> 0);
    const levelY = m.u32((level + D2DrlgLevelStrc.nPosY.off) >>> 0) | 0;
    m.setU32((edi + 0x04) >>> 0, (levelY + vy8 + stepY + 3) >>> 0);

    edi = nextV;
  }
}

/**
 * `@va D2Common:0x6FD6B6E0` (`DRLGVER_BuildAndLocalizeRoomVertices113c`, not exported;
 * custom register ABI `eax = nFlag`, `ecx = pDrlgCoord`, `[esp+4] = pMemPool`,
 * `[esp+8] = ppVertices`, `[esp+0xC] = pRoomCoordNode`, `ret 0xC`).
 */
export function DRLGVER_BuildAndLocalizeRoomVertices113c(
  m: Memory113c,
  nFlag: number,
  pDrlgCoord: number,
  pMemPool: number,
  ppVertices: number,
  pRoomCoordNode: number,
): void {
  const coord = pDrlgCoord >>> 0;
  const ppVerts = ppVertices >>> 0;
  const flagByte = nFlag & 0xff;

  m.setU32((coord + 0x08) >>> 0, ((m.u32((coord + 0x08) >>> 0) | 0) - 1) >>> 0);
  m.setU32((coord + 0x0c) >>> 0, ((m.u32((coord + 0x0c) >>> 0) | 0) - 1) >>> 0);

  let pOrth = pRoomCoordNode >>> 0;
  while (pOrth !== 0) {
    const pBox = m.u32((pOrth + 0x10) >>> 0);
    m.setU32((pBox + 0x08) >>> 0, ((m.u32((pBox + 0x08) >>> 0) | 0) - 1) >>> 0);
    m.setU32((pBox + 0x0c) >>> 0, ((m.u32((pBox + 0x0c) >>> 0) | 0) - 1) >>> 0);
    pOrth = m.u32((pOrth + 0x14) >>> 0);
  }

  const v0 = m.alloc(0x14);
  m.setU32(v0, 0);
  m.setU32((v0 + 0x04) >>> 0, 0);
  m.setU32((v0 + 0x08) >>> 0, 0);
  m.setU32((v0 + 0x0c) >>> 0, 0);
  m.setU32((v0 + 0x10) >>> 0, 0);
  m.setU8((v0 + 0x08) >>> 0, flagByte);
  m.setU32(ppVerts, v0);

  const v1 = m.alloc(0x14);
  m.setU32(v1, 0);
  m.setU32((v1 + 0x04) >>> 0, 0);
  m.setU32((v1 + 0x08) >>> 0, 0);
  m.setU32((v1 + 0x0c) >>> 0, 0);
  m.setU32((v1 + 0x10) >>> 0, 0);
  m.setU8((v1 + 0x08) >>> 0, flagByte);
  m.setU32((v0 + 0x10) >>> 0, v1);

  const v2 = m.alloc(0x14);
  m.setU32(v2, 0);
  m.setU32((v2 + 0x04) >>> 0, 0);
  m.setU32((v2 + 0x08) >>> 0, 0);
  m.setU32((v2 + 0x0c) >>> 0, 0);
  m.setU32((v2 + 0x10) >>> 0, 0);
  m.setU8((v2 + 0x08) >>> 0, flagByte);
  m.setU32((v1 + 0x10) >>> 0, v2);

  const v3 = m.alloc(0x14);
  m.setU32(v3, 0);
  m.setU32((v3 + 0x04) >>> 0, 0);
  m.setU32((v3 + 0x08) >>> 0, 0);
  m.setU32((v3 + 0x0c) >>> 0, 0);
  m.setU32((v3 + 0x10) >>> 0, 0);
  m.setU8((v3 + 0x08) >>> 0, flagByte);
  m.setU32((v2 + 0x10) >>> 0, v3);
  m.setU32((v3 + 0x10) >>> 0, v0);

  m.setU32(v0, m.u32(coord));
  const y0 = m.u32((coord + 0x04) >>> 0) | 0;
  const h0 = m.u32((coord + 0x0c) >>> 0) | 0;
  m.setU32((v0 + 0x04) >>> 0, ((y0 + h0) | 0) >>> 0);

  m.setU32(v1, m.u32(coord));
  m.setU32((v1 + 0x04) >>> 0, m.u32((coord + 0x04) >>> 0));

  const x0 = m.u32(coord) | 0;
  const w0 = m.u32((coord + 0x08) >>> 0) | 0;
  m.setU32(v2, ((x0 + w0) | 0) >>> 0);
  m.setU32((v2 + 0x04) >>> 0, m.u32((coord + 0x04) >>> 0));

  const x1 = m.u32(coord) | 0;
  const w1 = m.u32((coord + 0x08) >>> 0) | 0;
  m.setU32(v3, ((x1 + w1) | 0) >>> 0);
  const y1 = m.u32((coord + 0x04) >>> 0) | 0;
  const h1 = m.u32((coord + 0x0c) >>> 0) | 0;
  m.setU32((v3 + 0x04) >>> 0, ((y1 + h1) | 0) >>> 0);

  DRLGVER_CreateVerticesForRoom113c(m, pMemPool, m.u32(ppVerts), coord, flagByte, pRoomCoordNode);

  const head = m.u32(ppVerts);
  let cur = head;
  do {
    m.setU32(cur, ((m.u32(cur) | 0) - (m.u32(coord) | 0)) >>> 0);
    m.setU32((cur + 0x04) >>> 0, ((m.u32((cur + 0x04) >>> 0) | 0) - (m.u32((coord + 0x04) >>> 0) | 0)) >>> 0);
    cur = m.u32((cur + 0x10) >>> 0);
  } while (cur !== head);

  m.setU32((coord + 0x08) >>> 0, ((m.u32((coord + 0x08) >>> 0) | 0) + 1) >>> 0);
  m.setU32((coord + 0x0c) >>> 0, ((m.u32((coord + 0x0c) >>> 0) | 0) + 1) >>> 0);

  pOrth = pRoomCoordNode >>> 0;
  while (pOrth !== 0) {
    const pBox = m.u32((pOrth + 0x10) >>> 0);
    m.setU32((pBox + 0x08) >>> 0, ((m.u32((pBox + 0x08) >>> 0) | 0) + 1) >>> 0);
    m.setU32((pBox + 0x0c) >>> 0, ((m.u32((pBox + 0x0c) >>> 0) | 0) + 1) >>> 0);
    pOrth = m.u32((pOrth + 0x14) >>> 0);
  }
}



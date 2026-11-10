/**
 * Diablo II v1.13c `D2Common.dll` room/outdoor/item-mods (`Drlg\DrlgRoom.cpp`, `Drlg\OutPlace.cpp`, `Items\ItemMods.cpp`)
 * leaf functions, image base `0x6FD50000`.
 *
 * Every function below is a 1:1 port of the cited disassembly (`objdump -d -M intel` on `D2Common.dll`).
 */
import type { Memory113c } from '../../mem/sparse-memory.ts';
import {
  D2DrlgCoordStrc,
  D2DrlgLevelStrc,
  D2DrlgOrthStrc,
  D2RoomExStrc,
} from '../../mem/layout.generated.ts';
import { D2CommonAssertError } from '../inline-helpers.ts';
import { imul32, sdiv32 } from '../int-math.ts';
import {
  DATATBLS_FindFloorWindowTileCacheEntry113c,
  DRLGROOMTILE_GetWarpLevelsArray113c,
} from './room-tile.ts';


/**
 * Switch index table at `0x6FD95668` (212 bytes for `u = (nStatId - 6) >>> 0 <= 0xD3`).
 * - `0` (`u in {0..5, 210, 211}`, i.e. `nStatId in {6..11, 216, 217}`): shifts `*pValue <<= 8` and returns `0` (`EAX = 0`).
 * - `1` (`u in {51, 52}`, i.e. `nStatId in {57, 58}`): no-op, returns `1` (`EAX = 1`).
 * - `2` (all other `u <= 0xD3`): no-op, returns `2` (`EAX = 2`).
 * Copied verbatim from `D2Common.dll` v1.13c.
 */
export const FIXED_POINT_STAT_SWITCH_6FD95668 = Uint8Array.from([
  0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1,
  1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 0, 0,
]);

/**
 * `D2Common.dll` `.data` address for `sgptDataTables`.
 */
export const SGPT_DATA_TABLES_PTR_VA_6FDE9E1C = 0x6fde9e1c;

/**
 * `@va D2Common:0x6FD67B70` (`DRLGOUTPLACE_StepMazeLinkNode113c`, custom `eax = pNode`, `edi = ppRootNode`, `ret`).
 *
 * Advances a maze link node's direction cursor (`+0x18`), direction (`+0x1C`), and step count (`+0x14`).
 * When step count reaches `3`, walks up the parent chain (`+0x20`) until reaching `*ppRootNode` (returns `0`)
 * or finding an ancestor whose incremented step count is not `3`.
 */
export function DRLGOUTPLACE_StepMazeLinkNode113c(
  m: Memory113c,
  pNode: number,
  ppRootNode: number,
): number {
  let cur = pNode >>> 0;
  let nStep = m.u32((cur + 0x14) >>> 0) | 0;
  if (nStep < 4) {
    const pCursor = (m.u32((cur + 0x18) >>> 0) + 1) >>> 0;
    m.setU32((cur + 0x18) >>> 0, pCursor);
    const dir = (m.u8((cur + 0x1c) >>> 0) + m.u8(pCursor)) & 0x03;
    m.setU8((cur + 0x1c) >>> 0, dir);
  }
  nStep = (nStep + 1) | 0;
  m.setU32((cur + 0x14) >>> 0, nStep >>> 0);
  if (nStep !== 3) {
    return cur;
  }

  while (true) {
    if (cur === m.u32(ppRootNode)) {
      return 0;
    }
    cur = m.u32((cur + 0x20) >>> 0);
    const pCursor = (m.u32((cur + 0x18) >>> 0) + 1) >>> 0;
    m.setU32((cur + 0x18) >>> 0, pCursor);
    const dir = (m.u8((cur + 0x1c) >>> 0) + m.u8(pCursor)) & 0x03;
    m.setU8((cur + 0x1c) >>> 0, dir);
    const parentStep = ((m.u32((cur + 0x14) >>> 0) | 0) + 1) | 0;
    m.setU32((cur + 0x14) >>> 0, parentStep >>> 0);
    if (parentStep !== 3) {
      return cur;
    }
  }
}

/**
 * `@va D2Common:0x6FD94540` (`DRLGROOM_PackAdjacentRooms113c`, custom `edx = pRoomEx`, `edi = ppOutRooms1`, `ret`).
 *
 * Iterates `i = 0 .. pRoomEx->nRoomsNear - 1`, packs non-NULL `pRoomEx->ppRoomsNear[i]->pRoom1 (+0x30)` pointers
 * into `ppOutRooms1[0..writeCount-1]`, zeroes `ppOutRooms1[writeCount..nRoomsNear-1]`, and returns `writeCount`.
 */
export function DRLGROOM_PackAdjacentRooms113c(
  m: Memory113c,
  pRoomEx: number,
  ppOutRooms1: number,
): number {
  let writeCount = 0;
  const nNear = m.get(pRoomEx, D2RoomExStrc.nRoomsNear) | 0;
  if (nNear > 0) {
    for (let i = 0; i < nNear; i++) {
      const ppRoomsNear = m.get(pRoomEx, D2RoomExStrc.ppRoomsNear);
      const pNearRoomEx = m.u32((ppRoomsNear + i * 4) >>> 0);
      const pRoom1 = m.get(pNearRoomEx, D2RoomExStrc.pRoom1);
      if (pRoom1 !== 0) {
        m.setU32((ppOutRooms1 + writeCount * 4) >>> 0, pRoom1);
        writeCount = (writeCount + 1) | 0;
      }
    }
  }
  const finalNear = m.get(pRoomEx, D2RoomExStrc.nRoomsNear) | 0;
  for (let c = writeCount; c < finalNear; c++) {
    m.setU32((ppOutRooms1 + c * 4) >>> 0, 0);
  }
  return writeCount;
}

/**
 * `@va D2Common:0x6FD945A0` (`DRLGROOM_SortRoomExArrayByBounds113c`, custom `eax = nCount`, `esi = ppRoomsEx`, `ret`).
 *
 * Performs `nCount - 1` passes over `i = 0 .. nCount - 2`, swapping adjacent pointers `ppRoomsEx[i]` (`edx`)
 * and `ppRoomsEx[i + 1]` (`ecx`) whenever `edx->nTileXPos >= ecx->nTileXPos + ecx->nTileWidth` OR
 * `edx->nTileYPos >= ecx->nTileYPos + ecx->nTileHeight`.
 */
export function DRLGROOM_SortRoomExArrayByBounds113c(
  m: Memory113c,
  nCount: number,
  ppRoomsEx: number,
): void {
  const limit = ((nCount | 0) - 1) | 0;
  if (limit <= 0) return;

  for (let pass = limit; pass !== 0; pass = (pass - 1) | 0) {
    for (let i = 0; i < limit; i++) {
      const pNext = m.u32((ppRoomsEx + (i + 1) * 4) >>> 0);
      const nextEndX =
        ((m.get(pNext, D2RoomExStrc.nTileWidth) | 0) +
          (m.get(pNext, D2RoomExStrc.nTileXPos) | 0)) |
        0;
      const pCur = m.u32((ppRoomsEx + i * 4) >>> 0);
      const curX = m.get(pCur, D2RoomExStrc.nTileXPos) | 0;
      let shouldSwap = curX >= nextEndX;
      if (!shouldSwap) {
        const nextEndY =
          ((m.get(pNext, D2RoomExStrc.nTileHeight) | 0) +
            (m.get(pNext, D2RoomExStrc.nTileYPos) | 0)) |
          0;
        const curY = m.get(pCur, D2RoomExStrc.nTileYPos) | 0;
        if (curY >= nextEndY) {
          shouldSwap = true;
        }
      }
      if (shouldSwap) {
        m.setU32((ppRoomsEx + i * 4) >>> 0, pNext);
        m.setU32((ppRoomsEx + (i + 1) * 4) >>> 0, pCur);
      }
    }
  }
}

/**
 * `@va D2Common:0x6FD94740` (`DRLGROOM_CheckPointInRect113c`, custom `eax = pRect`, `esi = nX`, `edi = nY`, `ret`).
 *
 * Half-open rectangle containment test: returns `1` iff `nPosX <= nX < nPosX + nWidth` and `nPosY <= nY < nPosY + nHeight`.
 */
export function DRLGROOM_CheckPointInRect113c(
  m: Memory113c,
  pRect: number,
  nX: number,
  nY: number,
): number {
  const x = nX | 0;
  const y = nY | 0;
  const rx = m.get(pRect, D2DrlgCoordStrc.nPosX) | 0;
  if (x < rx) return 0;
  const ry = m.get(pRect, D2DrlgCoordStrc.nPosY) | 0;
  if (y < ry) return 0;
  const rw = m.get(pRect, D2DrlgCoordStrc.nWidth) | 0;
  if (x >= ((rx + rw) | 0)) return 0;
  const rh = m.get(pRect, D2DrlgCoordStrc.nHeight) | 0;
  return y < ((ry + rh) | 0) ? 1 : 0;
}

/**
 * `@va D2Common:0x6FD94870` (`DRLGROOM_CompareOrthoNodes113c`, fastcall `ecx = pOrth1`, `edx = pOrth2`, `ret`).
 *
 * Compares two `D2DrlgOrthStrc` nodes:
 * - If `pOrth2->nDirection > pOrth1->nDirection` (signed), returns `1`.
 * - If `pOrth2->nDirection != pOrth1->nDirection`, returns `0`.
 * - When directions are equal (`0..3`), compares `pOrth2->pBox` vs `pOrth1->pBox`:
 *   - `dir == 0`: `box2.nPosY > box1.nPosY ? 1 : 0`
 *   - `dir == 1`: `box2.nPosX < box1.nPosX ? 1 : 0`
 *   - `dir == 2`: `box2.nPosY < box1.nPosY ? 1 : 0`
 *   - `dir == 3`: `box2.nPosX > box1.nPosX ? 1 : 0`
 *   - `dir > 3` (unsigned): `0`.
 */
export function DRLGROOM_CompareOrthoNodes113c(
  m: Memory113c,
  pOrth1: number,
  pOrth2: number,
): number {
  const dir1 = m.get(pOrth1, D2DrlgOrthStrc.nDirection) | 0;
  const dir2 = m.get(pOrth2, D2DrlgOrthStrc.nDirection) | 0;
  if (dir2 > dir1) return 1;
  if (dir2 !== dir1) return 0;
  if (dir1 >>> 0 > 3) return 0;

  const pBox2 = m.get(pOrth2, D2DrlgOrthStrc.pBox);
  const pBox1 = m.get(pOrth1, D2DrlgOrthStrc.pBox);
  switch (dir1 >>> 0) {
    case 0:
      return (m.get(pBox2, D2DrlgCoordStrc.nPosY) | 0) > (m.get(pBox1, D2DrlgCoordStrc.nPosY) | 0)
        ? 1
        : 0;
    case 1:
      return (m.get(pBox2, D2DrlgCoordStrc.nPosX) | 0) < (m.get(pBox1, D2DrlgCoordStrc.nPosX) | 0)
        ? 1
        : 0;
    case 2:
      return (m.get(pBox2, D2DrlgCoordStrc.nPosY) | 0) < (m.get(pBox1, D2DrlgCoordStrc.nPosY) | 0)
        ? 1
        : 0;
    case 3:
      return (m.get(pBox2, D2DrlgCoordStrc.nPosX) | 0) > (m.get(pBox1, D2DrlgCoordStrc.nPosX) | 0)
        ? 1
        : 0;
    default:
      return 0;
  }
}

/**
 * `@va D2Common:0x6FD94EB0` (`DRLGROOM_CheckLevelRoomsSeparation113c`, custom `eax = pLevel`, `ebx = nMinDist`,
 * `esi = pRoomEx1`, stack `[esp+4] = pRoomEx2`, `ret 4`).
 *
 * Walks `pLevel->pFirstRoomEx (+0x10)` via `pRoomNext (+0x24)`. For every room other than `pRoomEx1` and `pRoomEx2`,
 * computes axis separation `distX` and `distY`. If both `distX < nMinDist` and `distY < nMinDist`, returns `0`;
 * otherwise returns `1`.
 */
export function DRLGROOM_CheckLevelRoomsSeparation113c(
  m: Memory113c,
  pLevel: number,
  nMinDist: number,
  pRoomEx1: number,
  pRoomEx2: number,
): number {
  const minDist = nMinDist | 0;
  for (
    let pCur = m.get(pLevel, D2DrlgLevelStrc.pFirstRoomEx);
    pCur !== 0;
    pCur = m.get(pCur, D2RoomExStrc.pRoomNext)
  ) {
    if (pCur === pRoomEx1 || pCur === pRoomEx2) continue;

    const x1 = m.get(pRoomEx1, D2RoomExStrc.nTileXPos) | 0;
    const xCur = m.get(pCur, D2RoomExStrc.nTileXPos) | 0;
    let distX: number;
    if (x1 < xCur) {
      const w1 = m.get(pRoomEx1, D2RoomExStrc.nTileWidth) | 0;
      distX = ((xCur - w1) | 0) - x1;
    } else {
      const wCur = m.get(pCur, D2RoomExStrc.nTileWidth) | 0;
      distX = ((x1 - wCur) | 0) - xCur;
    }
    distX |= 0;

    const y1 = m.get(pRoomEx1, D2RoomExStrc.nTileYPos) | 0;
    const yCur = m.get(pCur, D2RoomExStrc.nTileYPos) | 0;
    let distY: number;
    if (y1 < yCur) {
      const h1 = m.get(pRoomEx1, D2RoomExStrc.nTileHeight) | 0;
      distY = ((yCur - h1) | 0) - y1;
    } else {
      const hCur = m.get(pCur, D2RoomExStrc.nTileHeight) | 0;
      distY = ((y1 - hCur) | 0) - yCur;
    }
    distY |= 0;

    if (distX < minDist && distY < minDist) {
      return 0;
    }
  }
  return 1;
}

/**
 * `@va D2Common:0x6FD95630` (`ITEMMODS_StubReturnOne113c`, stdcall 7 stack args, `ret 0x1C`).
 *
 * `mov eax, 1; ret 0x1c`.
 */
export function ITEMMODS_StubReturnOne113c(
  _a0 = 0,
  _a1 = 0,
  _a2 = 0,
  _a3 = 0,
  _a4 = 0,
  _a5 = 0,
  _a6 = 0,
): number {
  return 1;
}

/**
 * `@va D2Common:0x6FD95640` (`ITEMMODS_ShiftStatValueIfFixedPoint113c`, custom `eax = nStatId`, `ecx = pValue`, `ret`).
 *
 * `add eax, -6; cmp eax, 0xd3; ja ret; movzx eax, [eax+0x6fd95668]; jmp [eax*4+0x6fd9565c]`.
 * When `tag == 0` (`nStatId in {6..11, 216, 217}`), shifts `*pValue <<= 8` in place and returns `EAX = 0`.
 * Otherwise leaves `*pValue` untouched and returns `EAX = tag` (or `u = (nStatId - 6) | 0` when `u >>> 0 > 0xd3`).
 */
export function ITEMMODS_ShiftStatValueIfFixedPoint113c(
  m: Memory113c,
  nStatId: number,
  pValue: number,
): number {
  const u = ((nStatId - 6) | 0) >>> 0;
  if (u > 0xd3) {
    return u | 0;
  }
  const tag = FIXED_POINT_STAT_SWITCH_6FD95668[u]!;
  if (tag === 0) {
    m.setU32(pValue, (m.u32(pValue) << 8) >>> 0);
  }
  return tag;
}

/**
 * `D2Common.dll` `.text` switch index table at `0x6FD5B260` (40 bytes, `0..0x27`)
 * used by `0x6FD5AFD0` (`DRLGPRESET_SpawnMapAIPathPresets113c`).
 *
 * `@va D2Common:0x6FD5B260`
 */
export const MAP_AI_PATH_SWITCH_TABLE_VA_6FD5B260 = 0x6fd5b260;

/**
 * `D2Common.dll` `.bss` `sgptDataTables.pLevelsTxt` (`D2LevelsTxt*`).
 *
 * `@va D2Common:0x6FDF0B38`
 */
export const SGPT_LEVELS_TXT_VA_6FDF0B38 = 0x6fdf0b38;

/**
 * `D2Common.dll` `.bss` `sgptDataTables.pLvlTypesTxt` (`D2LvlTypesTxt*`).
 *
 * `@va D2Common:0x6FDF141C`
 */
export const SGPT_LVLTYPES_TXT_VA_6FDF141C = 0x6fdf141c;

/**
 * `D2Common.dll` `.rdata` `"DATA\\GLOBAL"` string for universal DT1 loading.
 *
 * `@va D2Common:0x6FDDAD5C`
 */
export const DT1_GLOBAL_PREFIX_VA_6FDDAD5C = 0x6fddad5c;

/**
 * `D2Common.dll` `.rdata` `"%s\\Tiles\\Act1\\Outdoors\\Blank.dt1"` format string.
 *
 * `@va D2Common:0x6FDDFFB4`
 */
export const DT1_BLANK_FMT_VA_6FDDFFB4 = 0x6fddffb4;

/**
 * `D2Common.dll` `.rdata` `"%s\\Tiles\\Act1\\Barracks\\InvisWal.dt1"` format string.
 *
 * `@va D2Common:0x6FDDFF90`
 */
export const DT1_INVISWAL_FMT_VA_6FDDFF90 = 0x6fddff90;

/**
 * `D2Common.dll` `.rdata` `"%s\\Tiles\\Act1\\Barracks\\Warp.dt1"` format string.
 *
 * `@va D2Common:0x6FDDFF70`
 */
export const DT1_WARP_FMT_VA_6FDDFF70 = 0x6fddff70;

/**
 * `@va D2Common:0x6FD5AF20` (`DRLGPRESET_SpawnHoradricOrifice113c`, not exported;
 * custom LTCG `esi = pDrlgMap`, stack `[esp+4] = pMemPool`, `ret 4`).
 *
 * Computes center subtile coordinates `subX = (nSizeX / 2 + nPosX) * 5`,
 * `subY = (nSizeY / 2 + nPosY) * 5`, checks `sgptDataTables->nMonStatsTxtRecordCount (+0xA80) > 0x10A`
 * (`266` if true else `-1`), allocates a `0x20`-byte `D2PresetUnitStrc`, populates
 * `{ nMode=1, nTxtFileNo, nXpos=subX, pNext=pDrlgMap->pPresetUnit, nUnitType=1, nYpos=subY }`,
 * and prepends it to `pDrlgMap->pPresetUnit (+0x38)`.
 */
export function DRLGPRESET_SpawnHoradricOrifice113c(
  m: Memory113c,
  pDrlgMap: number,
  _pMemPool: number,
): void {
  const map = pDrlgMap >>> 0;
  const sizeX = m.u32((map + 0x18) >>> 0) | 0;
  const posY = m.u32((map + 0x14) >>> 0) | 0;
  const posX = m.u32((map + 0x10) >>> 0) | 0;
  const subX = imul32((sdiv32(sizeX, 2) + posX) | 0, 5);
  const sizeY = m.u32((map + 0x1c) >>> 0) | 0;
  const subY = imul32((sdiv32(sizeY, 2) + posY) | 0, 5);
  const pDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA_6FDE9E1C);
  const monCount = m.u32((pDataTables + 0xa80) >>> 0) | 0;
  const nTxtFileNo = monCount > 0x10a ? 0x10a : -1;

  const pUnit = m.alloc(0x20);
  m.fill(pUnit, 0x20, 0);
  m.setU32((pUnit + 0x08) >>> 0, subX >>> 0);
  m.setU32((pUnit + 0x04) >>> 0, nTxtFileNo >>> 0);
  m.setU32((pUnit + 0x18) >>> 0, subY >>> 0);
  m.setU32((pUnit + 0x0c) >>> 0, 0);
  m.setU32((pUnit + 0x14) >>> 0, 1);
  m.setU32(pUnit, 1);
  m.setU32((pUnit + 0x0c) >>> 0, m.u32((map + 0x38) >>> 0));
  m.setU32((map + 0x38) >>> 0, pUnit);
}

/**
 * `@va D2Common:0x6FD5AFD0` (`DRLGPRESET_SpawnMapAIPathPresets113c`, not exported;
 * custom LTCG `esi = pDrlgMap`, stack `[esp+4] = pMemPool`, `[esp+8] = nTileX`, `[esp+0xC] = pOrientationGrid`, `ret 0xC`).
 *
 * For each row `y < pDrlgMap->nSizeY (+0x1C)`, spawns 5 object `D2PresetUnitStrc` nodes (`nUnitType = 2`, `dwFlags = 1`,
 * `nTxtFileNo` = `0x28, 0x29, 0x29, 0x29, 0x2A`) at `subX = (nPosX + nTileX)*5 - 5 + 5*k` (`k = 0..4`), `subY = (nPosY + y)*5`.
 * Inspects `pOrientationGrid[y][max(0, nTileX)]`; if `style == 4`, `seq <= 0x27`, and `u8(0x6FD5B260 + seq) == 0`,
 * advances `y` by an extra `3` rows (`y += 4` total).
 */
export function DRLGPRESET_SpawnMapAIPathPresets113c(
  m: Memory113c,
  pDrlgMap: number,
  _pMemPool: number,
  nTileX: number,
  pOrientationGrid: number,
): void {
  const map = pDrlgMap >>> 0;
  const h0 = m.u32((map + 0x1c) >>> 0) | 0;
  if (h0 <= 0) return;

  const tileX = nTileX | 0;
  const gridX = tileX <= 0 ? 0 : tileX;
  const oriGrid = pOrientationGrid >>> 0;

  let y = 0;
  while (true) {
    const subY = imul32(((m.u32((map + 0x14) >>> 0) | 0) + y) | 0, 5);
    const baseSubX =
      (imul32(((m.u32((map + 0x10) >>> 0) | 0) + tileX) | 0, 5) - 5) | 0;

    const txtIds = [0x28, 0x29, 0x29, 0x29, 0x2a];
    for (let k = 0; k < 5; k++) {
      const pUnit = m.alloc(0x20);
      m.fill(pUnit, 0x20, 0);
      m.setU32(pUnit, 0);
      m.setU32((pUnit + 0x04) >>> 0, txtIds[k]!);
      m.setU32((pUnit + 0x08) >>> 0, ((baseSubX + k * 5) | 0) >>> 0);
      m.setU32((pUnit + 0x14) >>> 0, 2);
      m.setU32((pUnit + 0x18) >>> 0, subY >>> 0);
      m.setU32((pUnit + 0x1c) >>> 0, 1);
      m.setU32((pUnit + 0x0c) >>> 0, m.u32((map + 0x38) >>> 0));
      m.setU32((map + 0x38) >>> 0, pUnit);
    }

    const pRowOffsets = m.u32((oriGrid + 4) >>> 0);
    const rowOff = m.u32((pRowOffsets + y * 4) >>> 0) | 0;
    const pCells = m.u32(oriGrid);
    const cell = m.u32((pCells + (((rowOff + gridX) | 0) << 2)) >>> 0);
    const style = (cell >>> 20) & 0x3f;
    if (style === 4) {
      const seq = (cell >>> 8) & 0xff;
      if (seq <= 0x27) {
        const tag = m.u8((MAP_AI_PATH_SWITCH_TABLE_VA_6FD5B260 + seq) >>> 0);
        if (tag === 0) {
          y = (y + 3) | 0;
        }
      }
    }

    const curH = m.u32((map + 0x1c) >>> 0) | 0;
    y = (y + 1) | 0;
    if (y >= curH) break;
  }
}

/**
 * `@va D2Common:0x6FD5B290` (`DRLGPRESET_SpawnFortressWall2Presets113c`, not exported;
 * custom LTCG `eax = nTileY`, `ecx = nTileX`, `edi = pDrlgMap`, stack `[esp+4] = pMemPool`, `ret 4`).
 *
 * Sets `subX = nTileY * 5`, `curSubY = nTileX * 5`, `endSubY = (pDrlgMap->pFile (+0x0C)->nSizeY (+0x10) + nTileX) * 5`.
 * While `curSubY < endSubY` (step `+0x28`), allocates a `0x20`-byte `D2PresetUnitStrc`
 * (`nUnitType = 2`, `nTxtFileNo = 0x41`, `dwFlags = 1`, `nXpos = subX`, `nYpos = curSubY`)
 * and prepends it to `pDrlgMap->pPresetUnit (+0x38)`.
 */
export function DRLGPRESET_SpawnFortressWall2Presets113c(
  m: Memory113c,
  nTileY: number,
  nTileX: number,
  pDrlgMap: number,
  _pMemPool: number,
): void {
  const map = pDrlgMap >>> 0;
  const subX = imul32(nTileY | 0, 5);
  const pFile = m.u32((map + 0x0c) >>> 0);
  const endTile = ((m.u32((pFile + 0x10) >>> 0) | 0) + (nTileX | 0)) | 0;
  let curSubY = imul32(nTileX | 0, 5);
  const endSubY = imul32(endTile, 5);
  if (curSubY >= endSubY) return;

  while (curSubY < endSubY) {
    const pUnit = m.alloc(0x20);
    m.fill(pUnit, 0x20, 0);
    m.setU32((pUnit + 0x18) >>> 0, curSubY >>> 0);
    m.setU32((pUnit + 0x14) >>> 0, 2);
    m.setU32((pUnit + 0x04) >>> 0, 0x41);
    m.setU32(pUnit, 0);
    m.setU32((pUnit + 0x08) >>> 0, subX >>> 0);
    m.setU32((pUnit + 0x1c) >>> 0, 1);
    m.setU32((pUnit + 0x0c) >>> 0, m.u32((map + 0x38) >>> 0));
    m.setU32((map + 0x38) >>> 0, pUnit);
    curSubY = (curSubY + 0x28) | 0;
  }
}

/**
 * `@va D2Common:0x6FD94480` (`DRLGROOM_AllocPresetUnit113c`, not exported;
 * custom LTCG `ecx = pMemPool`, `esi = pRoomEx`,
 * stack `[esp+4] = nUnitType`, `[esp+8] = nTxtFileNo`, `[esp+0xC] = nMode`, `[esp+0x10] = nXpos`, `[esp+0x14] = nYpos`, `ret 0x14`).
 *
 * Allocates a `0x20`-byte `D2PresetUnitStrc`, zeroes it, sets `nUnitType (+0x14)`, `nTxtFileNo (+0x04)`,
 * `nMode (+0x00)`, `nXpos (+0x08)`, `nYpos (+0x18)`, and if `pRoomEx != 0` prepends it to `pRoomEx->pPresetUnits (+0x5C)`.
 */
export function DRLGROOM_AllocPresetUnit113c(
  m: Memory113c,
  _pMemPool: number,
  pRoomEx: number,
  nUnitType: number,
  nTxtFileNo: number,
  nMode: number,
  nXpos: number,
  nYpos: number,
): number {
  const pUnit = m.alloc(0x20);
  m.fill(pUnit, 0x20, 0);
  m.setU32((pUnit + 0x14) >>> 0, nUnitType >>> 0);
  m.setU32((pUnit + 0x04) >>> 0, nTxtFileNo >>> 0);
  m.setU32(pUnit, nMode >>> 0);
  m.setU32((pUnit + 0x08) >>> 0, nXpos >>> 0);
  m.setU32((pUnit + 0x18) >>> 0, nYpos >>> 0);
  if (pRoomEx !== 0) {
    const roomEx = pRoomEx >>> 0;
    m.setU32((pUnit + 0x0c) >>> 0, m.u32((roomEx + 0x5c) >>> 0));
    m.setU32((roomEx + 0x5c) >>> 0, pUnit);
  } else {
    m.setU32((pUnit + 0x0c) >>> 0, 0);
  }
  return pUnit | 0;
}

/**
 * `@va D2Common:0x6FD94950` (`DRLGROOM_AddOrthRoomData113c`, not exported;
 * custom LTCG `eax = pRoomExAdj`, `esi = pRoomEx`, stack `[esp+4] = nDirection`, `ret 4`).
 *
 * Walks `pRoomEx->pDrlgOrth (+0x00)` via `pNext (+0x14)`; if a node with `pRoomEx == pRoomExAdj` already exists,
 * returns immediately. Otherwise allocates a `0x18`-byte `D2DrlgOrthStrc`, sets `pRoomEx = pRoomExAdj`,
 * `nDirection`, `bInit (+0x0C) = 1`, `pBox (+0x10) = pRoomExAdj + 0x34`, and prepends it to `pRoomEx->pDrlgOrth (+0x00)`.
 */
export function DRLGROOM_AddOrthRoomData113c(
  m: Memory113c,
  pRoomExAdj: number,
  pRoomEx: number,
  nDirection: number,
): void {
  const roomEx = pRoomEx >>> 0;
  const adj = pRoomExAdj >>> 0;
  for (
    let pCur = m.u32(roomEx);
    pCur !== 0;
    pCur = m.u32((pCur + 0x14) >>> 0)
  ) {
    if (m.u32(pCur) === adj) return;
  }

  const pLevel = m.u32((roomEx + 0x58) >>> 0);
  const pDrlg = m.u32((pLevel + 0x1b4) >>> 0);
  const _pMemPool = m.u32((pDrlg + 0x478) >>> 0);
  void _pMemPool;

  const pOrth = m.alloc(0x18);
  m.fill(pOrth, 0x18, 0);
  m.setU32((pOrth + 0x14) >>> 0, m.u32(roomEx));
  m.setU32(roomEx, pOrth);
  m.setU32(pOrth, adj);
  m.setU32((pOrth + 0x04) >>> 0, nDirection >>> 0);
  m.setU32((pOrth + 0x0c) >>> 0, 1);
  m.setU32((pOrth + 0x10) >>> 0, (adj + 0x34) >>> 0);
}

/**
 * `@va D2Common:0x6FD94A30` (`DRLGROOM_AppendAndSortAdjacentRoom113c`, custom `eax = pRoomEx`,
 * `ecx = pMemPool`, `[esp+4] = pAdjRoomEx`, `ret 4`).
 *
 * Increments `pRoomEx->nRoomsNear (+0x2C)`, reallocates `pRoomEx->ppRoomsNear (+0x08)` via `Fog.#10047`
 * (`0x6FD59252`) to `nRoomsNear * 4` bytes, appends `pAdjRoomEx`, and sorts via `0x6FD945A0`
 * (`DRLGROOM_SortRoomExArrayByBounds113c`).
 */
export function DRLGROOM_AppendAndSortAdjacentRoom113c(
  m: Memory113c,
  pRoomEx: number,
  _pMemPool: number,
  pAdjRoomEx: number,
): void {
  const roomEx = pRoomEx >>> 0;
  const pOldArr = m.u32((roomEx + 0x08) >>> 0);
  const nNewCount = ((m.u32((roomEx + 0x2c) >>> 0) | 0) + 1) | 0;
  m.setU32((roomEx + 0x2c) >>> 0, nNewCount >>> 0);

  const pNewArr = m.alloc((nNewCount << 2) >>> 0);
  if (pNewArr === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgRoom.cpp', 789);
  }
  if (pOldArr !== 0) {
    for (let i = 0; i < nNewCount - 1; i++) {
      m.setU32((pNewArr + i * 4) >>> 0, m.u32((pOldArr + i * 4) >>> 0));
    }
  }
  m.setU32((roomEx + 0x08) >>> 0, pNewArr);

  const nCount = m.u32((roomEx + 0x2c) >>> 0) | 0;
  m.setU32((pNewArr + (nCount - 1) * 4) >>> 0, pAdjRoomEx >>> 0);
  DRLGROOM_SortRoomExArrayByBounds113c(
    m,
    m.u32((roomEx + 0x2c) >>> 0) | 0,
    m.u32((roomEx + 0x08) >>> 0),
  );
}

/**
 * `@va D2Common:0x6FD94BD0` (`DRLGROOM_AllocRoomEx113c`, not exported;
 * custom LTCG `ebx = pLevel`, stack `[esp+4] = nType`, `ret 4`).
 *
 * Allocates a `0xEC`-byte `D2RoomExStrc`, zeroes it, initializes `pLevel (+0x58)`, `nType (+0x48)`,
 * `u8(+0x44) = 4`, rolls `pLevel->pSeed (+0x1C4)` to seed `pRoomEx->pSeed (+0x14)` and `dwInitSeed (+0x04)`,
 * copies `0x40000` flag when `(u8(pLevel + 4) & 0x10) != 0`, and allocates `pTypeData (+0x20)`
 * (`0x70` bytes when `nType == 1`, `0xF8` bytes when `nType == 2`).
 */
export function DRLGROOM_AllocRoomEx113c(
  m: Memory113c,
  pLevel: number,
  nType: number,
): number {
  const lvl = pLevel >>> 0;
  const pDrlg0 = m.u32((lvl + 0x1b4) >>> 0);
  const _pMemPool0 = m.u32((pDrlg0 + 0x478) >>> 0);
  void _pMemPool0;

  const pRoomEx = m.alloc(0xec);
  m.fill(pRoomEx, 0xec, 0);
  m.setU32((pRoomEx + 0x58) >>> 0, lvl);
  m.setU32((pRoomEx + 0x48) >>> 0, nType >>> 0);
  m.setU8((pRoomEx + 0x44) >>> 0, 4);

  const lvlSeedLo = m.u32((lvl + 0x1c4) >>> 0);
  const lvlSeedHi = m.u32((lvl + 0x1c8) >>> 0);
  const prod1 = BigInt(lvlSeedLo) * 0x6ac690c5n + BigInt(lvlSeedHi);
  const nextLvlLo = Number(prod1 & 0xffffffffn) >>> 0;
  const nextLvlHi = Number((prod1 >> 32n) & 0xffffffffn) >>> 0;
  m.setU32((lvl + 0x1c8) >>> 0, nextLvlHi);
  m.setU32((lvl + 0x1c4) >>> 0, nextLvlLo);

  m.setU32((pRoomEx + 0x14) >>> 0, nextLvlLo);
  m.setU32((pRoomEx + 0x18) >>> 0, 0x29a);
  const prod2 = BigInt(nextLvlLo) * 0x6ac690c5n + 0x29an;
  const roomLo = Number(prod2 & 0xffffffffn) >>> 0;
  const roomHi = Number((prod2 >> 32n) & 0xffffffffn) >>> 0;
  m.setU32((pRoomEx + 0x18) >>> 0, roomHi);
  m.setU32((pRoomEx + 0x14) >>> 0, roomLo);
  m.setU32((pRoomEx + 0x04) >>> 0, roomLo);

  if ((m.u8((lvl + 0x04) >>> 0) & 0x10) !== 0) {
    m.setU32(
      (pRoomEx + 0x28) >>> 0,
      (m.u32((pRoomEx + 0x28) >>> 0) | 0x40000) >>> 0,
    );
  }

  const t = nType | 0;
  if (t === 1) {
    const pLvl1 = m.u32((pRoomEx + 0x58) >>> 0);
    const pDrlg1 = m.u32((pLvl1 + 0x1b4) >>> 0);
    void m.u32((pDrlg1 + 0x478) >>> 0);
    const pTypeData = m.alloc(0x70);
    m.fill(pTypeData, 0x70, 0);
    m.setU32((pRoomEx + 0x20) >>> 0, pTypeData);
  } else if (t === 2) {
    const pLvl2 = m.u32((pRoomEx + 0x58) >>> 0);
    const pDrlg2 = m.u32((pLvl2 + 0x1b4) >>> 0);
    void m.u32((pDrlg2 + 0x478) >>> 0);
    const pTypeData = m.alloc(0xf8);
    m.fill(pTypeData, 0xf8, 0);
    m.setU32((pRoomEx + 0x20) >>> 0, pTypeData);
  }

  return pRoomEx | 0;
}

/**
 * `@va D2Common:0x6FD94CE0` (`DRLGWARP_GetWarpDstAdjustData113c`, not exported;
 * custom LTCG `eax = pRoomEx`, `edx = nLevelId`, plain `ret`).
 *
 * Walks `pWarp = *(u32*)(pRoomEx + 0x90)` via `pNext = *(u32*)(pWarp + 0x44)`:
 * - Asserts `*(u32*)pWarp != 0` (`line 1040`, `0x410`).
 * - If `*(u32*)pWarp == nLevelId`, returns `pWarp + 4`.
 * If not found, looks up `D2LevelsTxt` for `nLevelId` (`0 <= nLevelId < sgptDataTables->nLevelsTxtRecordCount (+0xC5C)`)
 * via `sgpLevelsTxt` (`0x6FDF0B38`, stride `0x9C`) and returns `pLevelsTxtRecord + 0x48` (or `0x48` if out of range).
 */
export function DRLGWARP_GetWarpDstAdjustData113c(
  m: Memory113c,
  pRoomEx: number,
  nLevelId: number,
): number {
  const lvlId = nLevelId | 0;
  let pWarp = m.u32((pRoomEx + 0x90) >>> 0);
  while (pWarp !== 0) {
    const entryLvlId = m.u32(pWarp) | 0;
    if (entryLvlId === 0) {
      throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\OutRoom.cpp', 1040);
    }
    if (lvlId === entryLvlId) {
      return (pWarp + 4) | 0;
    }
    pWarp = m.u32((pWarp + 0x44) >>> 0);
  }

  if (lvlId >= 0) {
    const pDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA_6FDE9E1C);
    const count = m.u32((pDataTables + 0xc5c) >>> 0) | 0;
    if (lvlId < count) {
      const pLevelsTxt = m.u32(SGPT_LEVELS_TXT_VA_6FDF0B38);
      return (pLevelsTxt + imul32(lvlId, 0x9c) + 0x48) | 0;
    }
  }
  return 0x48;
}

/**
 * `@va D2Common:0x6FD94DF0` (`DRLGROOM_BuildRoomExNearList113c`, custom `edi = pRoomEx`, `[esp+4] = pMemPool`, `ret 4`).
 *
 * Walks `pRoomEx->pLevel (+0x58)->pFirstRoomEx (+0x10)` via `pRoomNext (+0x24)`, collects all rooms whose
 * X and Y tile gaps from `pRoomEx` are both `< 6` into a 30-entry stack array, sorts via `0x6FD945A0`
 * (`DRLGROOM_SortRoomExArrayByBounds113c`), allocates `nCount * 4` bytes at `pRoomEx->ppRoomsNear (+0x08)`,
 * and copies the sorted pointers.
 */
export function DRLGROOM_BuildRoomExNearList113c(
  m: Memory113c,
  pRoomEx: number,
  _pMemPool = 0,
): void {
  const roomEx = pRoomEx >>> 0;
  const pLevel = m.u32((roomEx + 0x58) >>> 0);
  let pCur = m.u32((pLevel + 0x10) >>> 0);
  m.setU32((roomEx + 0x2c) >>> 0, 0);

  const tempNear = new Uint32Array(30);
  while (pCur !== 0) {
    const x1 = m.u32((roomEx + 0x34) >>> 0) | 0;
    const x2 = m.u32((pCur + 0x34) >>> 0) | 0;
    const gapX =
      x1 < x2
        ? ((x2 - (m.u32((roomEx + 0x3c) >>> 0) | 0)) - x1) | 0
        : ((x1 - (m.u32((pCur + 0x3c) >>> 0) | 0)) - x2) | 0;

    const y1 = m.u32((roomEx + 0x38) >>> 0) | 0;
    const y2 = m.u32((pCur + 0x38) >>> 0) | 0;
    const gapY =
      y1 < y2
        ? ((y2 - (m.u32((roomEx + 0x40) >>> 0) | 0)) - y1) | 0
        : ((y1 - (m.u32((pCur + 0x40) >>> 0) | 0)) - y2) | 0;

    if (gapX < 6 && gapY < 6) {
      const idx = m.u32((roomEx + 0x2c) >>> 0) | 0;
      tempNear[idx] = pCur;
      m.setU32((roomEx + 0x2c) >>> 0, ((idx + 1) | 0) >>> 0);
    }
    pCur = m.u32((pCur + 0x24) >>> 0);
  }

  const nCount = m.u32((roomEx + 0x2c) >>> 0) | 0;
  const pDest = m.alloc((nCount * 4) >>> 0);
  m.setU32((roomEx + 0x08) >>> 0, pDest);
  for (let i = 0; i < nCount; i++) {
    m.setU32((pDest + i * 4) >>> 0, tempNear[i]!);
  }
  DRLGROOM_SortRoomExArrayByBounds113c(m, nCount, pDest);
}

/**
 * `@va D2Common:0x6FD95240` (`DRLGROOM_AllocRoomTileWindowNode113c`, custom `edi = pRoomEx`,
 * `[esp+4] = nPackedCoords`, `[esp+8] = nSideIndex`, `ret 8`).
 *
 * Allocates and zeroes a `0x18`-byte window node via `Fog.#10045`, resolves `nTileId` from
 * `0x6FD69950` (`DRLGROOMTILE_GetWarpLevelsArray113c`) indexed by `nSideIndex & 0xFF`, looks up the
 * cache entry via `0x6FDBC5D0` (`DATATBLS_FindFloorWindowTileCacheEntry113c` with `0x62`), and prepends
 * the node to `pRoomEx + 0x4C`.
 */
export function DRLGROOM_AllocRoomTileWindowNode113c(
  m: Memory113c,
  pRoomEx: number,
  nPackedCoords: number,
  nSideIndex: number,
): void {
  const roomEx = pRoomEx >>> 0;
  const pLevel0 = m.u32((roomEx + 0x58) >>> 0);
  const pDrlg0 = m.u32((pLevel0 + 0x1b4) >>> 0);
  void m.u32((pDrlg0 + 0x478) >>> 0);

  const pNode = m.alloc(0x18);
  m.fill(pNode, 0x18, 0);
  m.setU32(pNode, nPackedCoords >>> 0);

  const pLevel = m.u32((roomEx + 0x58) >>> 0);
  const nLevelId = m.u32((pLevel + 0x1d0) >>> 0) | 0;
  const pDrlg = m.u32((pLevel + 0x1b4) >>> 0);
  const pWarpLevels = DRLGROOMTILE_GetWarpLevelsArray113c(m, pDrlg, nLevelId);
  const sideIdx = nSideIndex & 0xff;
  const nTileId = m.u32((pWarpLevels + sideIdx * 4) >>> 0) | 0;

  const pCacheEntry = DATATBLS_FindFloorWindowTileCacheEntry113c(
    m,
    nTileId,
    0x62,
  );
  m.setU32((pNode + 0x10) >>> 0, pCacheEntry);
  m.setU32((pNode + 0x08) >>> 0, 1);
  m.setU32((pNode + 0x04) >>> 0, m.u32((roomEx + 0x4c) >>> 0));
  m.setU32((roomEx + 0x4c) >>> 0, pNode);
}

/**
 * `@va D2Common:0x6FD958C0` (`DRLG_GetAutomapCoordSlotPtr113c`, not exported;
 * custom LTCG `ecx = pBase`, `edx = nGroup`, `eax = nIndex`, plain `ret`).
 *
 * Asserts `nGroup >>> 0 < 3` (`line 143`, `0x8F`) and `nIndex >>> 0 < 3` (`line 144`, `0x90`),
 * and returns `pBase + (nGroup + 1) * 0x30 + (nIndex << 4)`.
 */
export function DRLG_GetAutomapCoordSlotPtr113c(
  pBase: number,
  nGroup: number,
  nIndex: number,
): number {
  const grp = nGroup >>> 0;
  if (grp >= 3) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgRoom.cpp', 143);
  }
  const idx = nIndex >>> 0;
  if (idx >= 3) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgRoom.cpp', 144);
  }
  return ((pBase >>> 0) + (grp + 1) * 0x30 + (idx << 4)) | 0;
}

/**
 * `@va D2Common:0x6FD963F0` (`DRLGROOM_RollItemCoordinate113c`, not exported;
 * custom LTCG `eax = nMax`, `ecx = nMin`, `edx = pUnit`, plain `ret`).
 *
 * - If `nMax == nMin`, returns `nMin`; if `nMax < nMin`, swaps them.
 * - Asserts `pUnit != 0` (`line 5381`), `pUnit->dwUnitType (+0x00) == 4` (`line 5382`),
 *   and `pItemData = pUnit->pItemData (+0x14) != 0` (`line 5384`).
 * - Computes `range = (max - min) + (u16(pItemData + 0x30) >= 1 ? 1 : 0)`.
 * - Rolls `pItemData->pSeed` (`pItemData + 0x04`) and returns `min + roll(range)`.
 */
export function DRLGROOM_RollItemCoordinate113c(
  m: Memory113c,
  nMax: number,
  nMin: number,
  pUnit: number,
): number {
  let max = nMax | 0;
  let min = nMin | 0;
  if (max === min) return min;
  if (max < min) {
    const tmp = max;
    max = min;
    min = tmp;
  }
  if (pUnit === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgRoom.cpp', 5381);
  }
  const unit = pUnit >>> 0;
  const unitType = m.u32(unit) | 0;
  if (unitType !== 4) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgRoom.cpp', 5382);
  }
  const pItemData = m.u32((unit + 0x14) >>> 0);
  if (pItemData === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\DrlgRoom.cpp', 5384);
  }
  let range = (max - min) | 0;
  if (m.u16((pItemData + 0x30) >>> 0) >= 1) {
    range = (range + 1) | 0;
  }
  const pSeed = (pItemData + 4) >>> 0;
  if (range <= 0) {
    return min;
  }
  const lo0 = m.u32(pSeed);
  const hi0 = m.u32((pSeed + 4) >>> 0);
  const prod = BigInt(lo0) * 0x6ac690c5n + BigInt(hi0);
  const newLo = Number(prod & 0xffffffffn) >>> 0;
  const newHi = Number((prod >> 32n) & 0xffffffffn) >>> 0;
  m.setU32((pSeed + 4) >>> 0, newHi);
  m.setU32(pSeed, newLo);
  const uRange = range >>> 0;
  const rem =
    (uRange & ((uRange - 1) >>> 0)) === 0
      ? (newLo & ((uRange - 1) >>> 0)) >>> 0
      : (newLo % uRange) >>> 0;
  return (rem + min) | 0;
}

/**
 * `@va D2Common:0x6FD964D0` (`DRLGROOM_RollItemCoordinateAlt113c`, not exported;
 * custom LTCG `eax = nMax`, `ecx = nMin`, `edx = pUnit`, plain `ret`).
 *
 * Duplicate codegen twin of `0x6FD963F0` (`DRLGROOM_RollItemCoordinate113c`) in `D2Common.dll`.
 */
export function DRLGROOM_RollItemCoordinateAlt113c(
  m: Memory113c,
  nMax: number,
  nMin: number,
  pUnit: number,
): number {
  return DRLGROOM_RollItemCoordinate113c(m, nMax, nMin, pUnit);
}

function readCString113c(m: Memory113c, pStr: number): string {
  let out = '';
  for (let p = pStr >>> 0; ; p = (p + 1) >>> 0) {
    const b = m.u8(p);
    if (b === 0) break;
    out += String.fromCharCode(b);
  }
  return out;
}

function hashDt1PathIntoTiles113c(
  m: Memory113c,
  ppTiles: number,
  path: string,
): void {
  let h = m.u32(ppTiles >>> 0);
  for (let i = 0; i < path.length; i++) {
    h = (imul32(h, 33) + (path.charCodeAt(i) & 0xff)) >>> 0;
  }
  m.setU32(ppTiles >>> 0, h);
}

/**
 * `@va D2Common:0x6FDB8400` (`D2Common.#10006` `DRLGROOM_LoadDt1Files113c`,
 * custom LTCG `esi = pRoomEx`, plain `ret`).
 *
 * - Asserts `sgpLvlTypesTxt` (`*(u32*)0x6FDF141C`) `!= 0` (`line 593`, `0x251`).
 * - Computes `pLvlType = sgpLvlTypesTxt + pRoomEx->pLevel (+0x58)->nDrlgType (+0x1C0) * 0x788`.
 * - Iterates bits `0..31` of `pRoomEx->dwDT1Mask (+0x50)`: for each set bit `i`, passes
 *   `(&pRoomEx->pTiles (+0x68), pLvlType + i * 0x3C)` to `D2CMP.#10085` (`0x6FD592F4`).
 * - Formats and loads the 3 universal DT1 files (`Blank.dt1` at `0x6FDDFFB4`, `InvisWal.dt1` at `0x6FDDFF90`,
 *   `Warp.dt1` at `0x6FDDFF70`) with prefix `"DATA\\GLOBAL"` (`0x6FDDAD5C`) via `D2CMP.#10085`.
 * - Sets bit `0x01000000` on `pRoomEx->dwFlags (+0x28)`.
 */
export function DRLGROOM_LoadDt1Files113c(
  m: Memory113c,
  pRoomEx: number,
): void {
  const roomEx = pRoomEx >>> 0;
  const pLvlTypesTxt = m.u32(SGPT_LVLTYPES_TXT_VA_6FDF141C);
  const pLevel = m.u32((roomEx + 0x58) >>> 0);
  const nDrlgType = m.u32((pLevel + 0x1c0) >>> 0) | 0;
  if (pLvlTypesTxt === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\RoomTile.cpp', 593);
  }

  let mask = m.u32((roomEx + 0x50) >>> 0) >>> 0;
  let pEntry = (pLvlTypesTxt + imul32(nDrlgType, 0x788)) >>> 0;
  const ppTiles = (roomEx + 0x68) >>> 0;
  let bitIdx = 0;
  while (mask !== 0 && bitIdx < 0x20) {
    if ((mask & 1) !== 0) {
      const fileStr = readCString113c(m, pEntry);
      hashDt1PathIntoTiles113c(m, ppTiles, fileStr);
    }
    mask = mask >>> 1;
    pEntry = (pEntry + 0x3c) >>> 0;
    bitIdx++;
  }

  const prefix1 = readCString113c(m, DT1_GLOBAL_PREFIX_VA_6FDDAD5C);
  const fmt1 = readCString113c(m, DT1_BLANK_FMT_VA_6FDDFFB4);
  hashDt1PathIntoTiles113c(m, ppTiles, fmt1.replace('%s', prefix1));

  const prefix2 = readCString113c(m, DT1_GLOBAL_PREFIX_VA_6FDDAD5C);
  const fmt2 = readCString113c(m, DT1_INVISWAL_FMT_VA_6FDDFF90);
  hashDt1PathIntoTiles113c(m, ppTiles, fmt2.replace('%s', prefix2));

  const prefix3 = readCString113c(m, DT1_GLOBAL_PREFIX_VA_6FDDAD5C);
  const fmt3 = readCString113c(m, DT1_WARP_FMT_VA_6FDDFF70);
  hashDt1PathIntoTiles113c(m, ppTiles, fmt3.replace('%s', prefix3));

  m.setU32(
    (roomEx + 0x28) >>> 0,
    (m.u32((roomEx + 0x28) >>> 0) | 0x01000000) >>> 0,
  );
}



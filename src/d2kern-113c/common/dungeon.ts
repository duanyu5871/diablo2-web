/**
 * Diablo II v1.13c `D2Common.dll` dungeon / active-room leaf functions (`Dungeon.cpp` block, image base `0x6FD50000`).
 *
 * Every function below is a 1:1 port of the cited disassembly (`objdump -d -M intel` on the 1.13c image).
 * None of them calls another function. Register-convention (LTCG) arguments are explicit TS parameters, and
 * the doc comment of each function names the register that carries them. Signedness follows the branch
 * mnemonics: `jl/jg/jle/jge` are signed compares, `ja/jb/jae/jbe` are unsigned.
 *
 * Struct offsets come from `mem/layout.generated.ts` (`docs/oracle/route2-layout.json`). The two `.bss` globals
 * read by `DUNGEON_GetPortalLevelBit` are declared below with their writer/reader instruction VAs, because the
 * layout generator has no notion of globals.
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import { D2ActStrc, D2ActiveRoomStrc, D2DrlgLevelStrc, D2RoomExStrc } from '../mem/layout.generated.ts'
import { DRLGROOM_PackAdjacentRooms113c } from './drlg/drlg-room.ts'
import { D2CommonAssertError } from './inline-helpers.ts'
import { UNITROOM_RemoveUnitFromRoom113c } from './unit.ts'

/**
 * `.bss` `int32_t* gpPortalLevelIds` at `0x6FDF1420` (array of level ids whose `LevelDefs.bin` `dwPortal` is set).
 * - Written by the `DATATBLS\LvlTbls.cpp` loader `0x6FDBCB50` at `0x6FDBCBB6` (`mov ds:0x6fdf1420, eax` after the alloc).
 * - Read by `0x6FD8BC46` (`mov eax, ds:0x6fdf1420`).
 */
export const G_PORTAL_LEVEL_IDS_VA_113C = 0x6fdf1420
/**
 * `.bss` `int32_t gnPortalLevelIds` at `0x6FDF1424` (element count of `gpPortalLevelIds`).
 * - Written at `0x6FDBCB86`. Read at `0x6FD8BC40` (`mov edx, ds:0x6fdf1424`). The sibling `0x6FD8BC80` asserts it is `<= 0x20`.
 */
export const G_PORTAL_LEVEL_COUNT_VA_113C = 0x6fdf1424

/** `D2RoomExStrc.dwFlags` bit toggled by `DUNGEON_ToggleHasPortalFlag` (`0x6FD8BC26 and ecx, 0xFFBFFFFF` / `0x6FD8BC32 or ecx, 0x400000`). */
export const DRLGROOMFLAG_HAS_PORTAL_113C = 0x00400000
/** `D2RoomExStrc.dwFlags` bit returned by `DUNGEON_CheckLOSDraw` for type-2 rooms (`0x6FD8BDBC and eax, 0x80000`). */
export const DRLGROOMFLAG_NO_LOS_DRAW_113C = 0x00080000

/**
 * `DRLG_IsTownLevel` index table at `0x6FD7D348` (109 bytes, one per `nLevelId - 1` in `0..0x6C`).
 * Copied byte-for-byte from the 1.13c image; `tests/oracle/k1/laneC-B001.test.ts` re-reads the PE bytes
 * at `0x6FD7D348` and compares them to this constant. Value `0` selects case 0 (town), `1` selects case 1.
 */
export const DRLG_ISTOWN_CASE_INDEX_6FD7D348 = Uint8Array.from(
  [
    0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00,
  ],
)
/**
 * `DRLG_IsTownLevel` jump table at `0x6FD7D340` = `{0x6FD7D334, 0x6FD7D33A}`:
 * case 0 -> `0x6FD7D334 mov eax, 1; ret`, case 1 -> `0x6FD7D33A xor eax, eax; ret`.
 */
export const DRLG_ISTOWN_CASE_RESULT_6FD7D340: readonly [number, number] = [1, 0]

/**
 * `@va D2Common:0x6FD51330` (`DUNGEON_GetRoomAtPosition`, not exported; LTCG `eax = pRoom`, `ebx = nX`, `edi = nY`, plain `ret`).
 *
 * Returns `pRoom` when the subtile `(nX, nY)` lies inside it, otherwise the first non-NULL entry of
 * `pRoom->ppRoomsNear[0 .. nRoomsNear)` that contains it, otherwise `0`.
 * - `0x6FD51331 test eax, eax; jne` -> NULL room returns `0` (eax unchanged).
 * - `0x6FD51337..0x6FD51355`: `x >= X (jl)`, `x < X + W (jge, 32-bit wrapping add)`, `y >= Y`, `y < Y + H`, all signed.
 * - `0x6FD51357..0x6FD51398`: `ppRoomsNear (+0x00)`, `nRoomsNear (+0x24)`; the loop bound test is unsigned (`jbe`/`jb`).
 *   NULL near entries are skipped (`0x6FD5136D je`). A hit re-reads `ppRoomsNear[i]` (`0x6FD513A0`).
 */
export function DUNGEON_GetRoomAtPosition113c(m: Memory113c, pRoom: number, nX: number, nY: number): number {
  if (pRoom === 0) return 0
  const x = nX | 0
  const y = nY | 0
  const roomX = m.get(pRoom, D2ActiveRoomStrc.nSubtileX) | 0
  if (x >= roomX) {
    if (x < ((m.get(pRoom, D2ActiveRoomStrc.nSubtileWidth) + roomX) | 0)) {
      const roomY = m.get(pRoom, D2ActiveRoomStrc.nSubtileY) | 0
      if (y >= roomY) {
        if (y < ((m.get(pRoom, D2ActiveRoomStrc.nSubtileHeight) + roomY) | 0)) return pRoom >>> 0
      }
    }
  }
  const nRoomsNear = m.get(pRoom, D2ActiveRoomStrc.nRoomsNear) >>> 0
  const ppRoomsNear = m.get(pRoom, D2ActiveRoomStrc.ppRoomsNear)
  for (let i = 0; i < nRoomsNear; i++) {
    const pNear = m.u32((ppRoomsNear + i * 4) >>> 0)
    if (pNear === 0) continue
    if (x < (m.get(pNear, D2ActiveRoomStrc.nSubtileX) | 0)) continue
    const endX = (m.get(pNear, D2ActiveRoomStrc.nSubtileWidth) + m.get(pNear, D2ActiveRoomStrc.nSubtileX)) | 0
    if (x >= endX) continue
    if (y < (m.get(pNear, D2ActiveRoomStrc.nSubtileY) | 0)) continue
    const endY = (m.get(pNear, D2ActiveRoomStrc.nSubtileHeight) + m.get(pNear, D2ActiveRoomStrc.nSubtileY)) | 0
    if (y < endY) return m.u32((ppRoomsNear + i * 4) >>> 0)
  }
  return 0
}

/**
 * `@va D2Common:0x6FD7D320` (`DRLG_IsTownLevel`, not exported; LTCG `eax = nLevelId`, plain `ret`).
 *
 * `0x6FD7D320 dec eax; cmp eax, 0x6C; ja -> return 0` (unsigned, so `nLevelId <= 0` and `> 0x6D` return 0),
 * then `movzx eax, byte [eax + 0x6FD7D348]; jmp [eax*4 + 0x6FD7D340]`.
 * Not to be confused with `DUNGEON_CheckRoomIsTown` (`0x6FD8C390`), which calls this with `pLevel->nLevelId`.
 */
export function DRLG_IsTownLevel113c(nLevelId: number): number {
  const t = (nLevelId - 1) >>> 0
  if (t > 0x6c) return 0
  return DRLG_ISTOWN_CASE_RESULT_6FD7D340[DRLG_ISTOWN_CASE_INDEX_6FD7D348[t]!]!
}

/**
 * `@va D2Common:0x6FD8B6B0` (`D2Common.#10345` `DUNGEON_IncreaseRoomPlayerCount`, stdcall 1 arg, `ret 4`).
 *
 * `0x6FD8B6B4 test eax, eax; je` then `0x6FD8B6B8 inc dword [eax + 0x28]` (`D2ActiveRoomStrc.nPlayers`, wraps).
 */
export function DUNGEON_IncreaseRoomPlayerCount113c(m: Memory113c, pRoom: number): void {
  if (pRoom === 0) return
  m.set(pRoom, D2ActiveRoomStrc.nPlayers, (m.get(pRoom, D2ActiveRoomStrc.nPlayers) + 1) >>> 0)
}

/**
 * `@va D2Common:0x6FD8B710` (`D2Common.#11010` `DUNGEON_FindRoomBySubtileCoordinates`, stdcall `(pAct, nX, nY)`, `ret 0xC`).
 *
 * Walks `pAct->pRoom1 (+0x10)` through `pRoomNext (+0x7C)` and returns the first room whose subtile rectangle
 * contains `(nX, nY)`: `0x6FD8B72F..0x6FD8B74A` signed `jl/jge` with wrapping `X + W` / `Y + H`. NULL act -> `0`.
 */
export function DUNGEON_FindRoomBySubtileCoordinates113c(m: Memory113c, pAct: number, nX: number, nY: number): number {
  if (pAct === 0) return 0
  const x = nX | 0
  const y = nY | 0
  for (let pRoom = m.get(pAct, D2ActStrc.pRoom1); pRoom !== 0; pRoom = m.get(pRoom, D2ActiveRoomStrc.pRoomNext)) {
    const roomX = m.get(pRoom, D2ActiveRoomStrc.nSubtileX) | 0
    if (x < roomX) continue
    if (x >= ((m.get(pRoom, D2ActiveRoomStrc.nSubtileWidth) + roomX) | 0)) continue
    const roomY = m.get(pRoom, D2ActiveRoomStrc.nSubtileY) | 0
    if (y < roomY) continue
    if (y < ((m.get(pRoom, D2ActiveRoomStrc.nSubtileHeight) + roomY) | 0)) return pRoom >>> 0
  }
  return 0
}

/**
 * `D2DrlgRoomTilesStrc` field offsets. The struct is not heap-allocated on its own: it is embedded at `+0x14`
 * of the `0x2C`-byte tile grid (`0x6FD5C977 mov edx, 0x2C` alloc, stored to `D2RoomExStrc +0x54` at `0x6FD5C98A`),
 * and `D2ActiveRoomStrc.pRoomTiles (+0x08)` points at it (`0x6FD7E230 mov ecx, [esi+0x54]; 0x6FD7E23A add ecx, 0x14`,
 * passed to the room allocator which stores it at `0x6FD8C79F mov [ebx+0x8], edx`). Field evidence from the three
 * sibling getters (`ret = +0/+8/+0x10`, `*out = +4/+0xC/+0x14`): walls `0x6FD8BB3A/0x6FD8BB46`, floors
 * `0x6FD8BB5F mov edx, [ecx+0xC]` / `0x6FD8BB6B mov eax, [edx+0x8]`, roofs `0x6FD8BAFA/0x6FD8BB06`.
 */
export const D2DRLG_ROOMTILES_PFLOORTILES_OFF_113C = 0x08
export const D2DRLG_ROOMTILES_NFLOORS_OFF_113C = 0x0c

/**
 * `@va D2Common:0x6FD8BB50` (`D2Common.#10544` `DUNGEON_GetFloorTilesFromRoom`, stdcall `(pRoom, int* pnFloors)`, `ret 8`).
 *
 * - `pRoom != 0 && pRoom->pRoomTiles (+0x08) != 0`: `*pnFloors = tiles->nFloors (+0xC)` (`0x6FD8BB66`), then re-reads
 *   `pRoom->pRoomTiles` (`0x6FD8BB68`) and returns `tiles->pFloorTiles (+0x8)`.
 * - otherwise `*pnFloors = 0` (`0x6FD8BB75`) and returns `0`. `pnFloors` is never NULL-checked.
 */
export function DUNGEON_GetFloorTilesFromRoom113c(m: Memory113c, pRoom: number, pnFloors: number): number {
  if (pRoom !== 0) {
    const pTiles = m.get(pRoom, D2ActiveRoomStrc.pRoomTiles)
    if (pTiles !== 0) {
      m.setU32(pnFloors, m.u32((pTiles + D2DRLG_ROOMTILES_NFLOORS_OFF_113C) >>> 0))
      const pTilesAgain = m.get(pRoom, D2ActiveRoomStrc.pRoomTiles)
      return m.u32((pTilesAgain + D2DRLG_ROOMTILES_PFLOORTILES_OFF_113C) >>> 0)
    }
  }
  m.setU32(pnFloors, 0)
  return 0
}

/**
 * `@va D2Common:0x6FD8BC10` (`D2Common.#10346` `DUNGEON_ToggleHasPortalFlag`, stdcall `(pRoom, bReset)`, `ret 8`).
 *
 * NULL room -> no-op. Otherwise `pRoomEx = pRoom->pRoomEx (+0x10)`; a **nonzero** `bReset` clears bit `0x400000` of
 * `pRoomEx->dwFlags (+0x28)` (`0x6FD8BC26`), zero sets it (`0x6FD8BC32`). `pRoomEx` is not NULL-checked.
 */
export function DUNGEON_ToggleHasPortalFlag113c(m: Memory113c, pRoom: number, bReset: number): void {
  if (pRoom === 0) return
  const pRoomEx = m.get(pRoom, D2ActiveRoomStrc.pRoomEx)
  const flags = m.get(pRoomEx, D2RoomExStrc.dwFlags)
  if (bReset !== 0) m.set(pRoomEx, D2RoomExStrc.dwFlags, (flags & ~DRLGROOMFLAG_HAS_PORTAL_113C) >>> 0)
  else m.set(pRoomEx, D2RoomExStrc.dwFlags, (flags | DRLGROOMFLAG_HAS_PORTAL_113C) >>> 0)
}

/**
 * `@va D2Common:0x6FD8BC40` (`D2Common.#10805` `DUNGEON_GetPortalLevelBit`, stdcall `(nLevelId)`, `ret 4`).
 *
 * `n = *(int*)0x6FDF1424; a = *(int**)0x6FDF1420` (both read up front, `0x6FD8BC40/0x6FD8BC46`); for `i` in `0 .. n)`
 * (signed `jle`/`jl`): if `a[i] == nLevelId` return `1 << (i & 31)` (`0x6FD8BC68 mov eax, 1; shl eax, cl`); else `0`.
 */
export function DUNGEON_GetPortalLevelBit113c(m: Memory113c, nLevelId: number): number {
  const n = m.u32(G_PORTAL_LEVEL_COUNT_VA_113C) | 0
  const pIds = m.u32(G_PORTAL_LEVEL_IDS_VA_113C)
  for (let i = 0; i < n; i++) {
    if ((nLevelId | 0) === (m.u32((pIds + i * 4) >>> 0) | 0)) return (1 << (i & 31)) >>> 0
  }
  return 0
}

/**
 * `@va D2Common:0x6FD8BDA0` (`D2Common.#10685` `DUNGEON_CheckLOSDraw`, stdcall `(pRoom)`, `ret 4`).
 *
 * NULL -> `0`. `pRoomEx = pRoom->pRoomEx (+0x10)`; switch on `pRoomEx->nType (+0x48)` (`dec eax; je / dec eax; je`):
 * type 1 -> `1` (`0x6FD8BDC4`), type 2 -> `pRoomEx->dwFlags & 0x80000` (`0x6FD8BDB9`, the raw masked bit, not 1),
 * any other type -> `0`.
 */
export function DUNGEON_CheckLOSDraw113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) return 0
  const pRoomEx = m.get(pRoom, D2ActiveRoomStrc.pRoomEx)
  const nType = m.get(pRoomEx, D2RoomExStrc.nType) | 0
  if (nType === 1) return 1
  if (nType === 2) return (m.get(pRoomEx, D2RoomExStrc.dwFlags) & DRLGROOMFLAG_NO_LOS_DRAW_113C) >>> 0
  return 0
}

/**
 * `@va D2Common:0x6FD8C000` (`D2Common.#10826` `DUNGEON_GetLevelIdFromRoom`, stdcall `(pRoom)`, `ret 4`).
 *
 * NULL -> `0`; otherwise `pRoom->pRoomEx (+0x10)->pLevel (+0x58)->nLevelId (+0x1D0)` with no further NULL checks
 * (`0x6FD8C00B / 0x6FD8C00E / 0x6FD8C011`).
 */
export function DUNGEON_GetLevelIdFromRoom113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) return 0
  const pRoomEx = m.get(pRoom, D2ActiveRoomStrc.pRoomEx)
  const pLevel = m.get(pRoomEx, D2RoomExStrc.pLevel)
  return m.get(pLevel, D2DrlgLevelStrc.nLevelId) | 0
}

/**
 * `@va D2Common:0x6FD7D600` (`DRLG_GetRoomExFromCoordinates113c`, custom `eax = pDrlg`, `edi = nX`, `esi = nY`, plain `ret`).
 *
 * Walks `pDrlg->pRoomEx (+0x10)` via `pRoomExNext (+0x24)` and returns the first `D2RoomExStrc*`
 * whose tile box `[nTileXPos..nTileXPos+nTileWidth) x [nTileYPos..nTileYPos+nTileHeight)` (`+0x34/+0x38/+0x3C/+0x40`)
 * contains `(nX, nY)` (signed comparisons), or `0` if none matches.
 */
export function DRLG_GetRoomExFromCoordinates113c(
  m: Memory113c,
  eax: number,
  edi: number,
  esi: number,
): number {
  if (eax === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Drlg.cpp', 765)
  }
  let pRoomEx = m.u32((eax + 0x10) >>> 0)
  if (pRoomEx === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Drlg.cpp', 766)
  }
  const x = edi | 0
  const y = esi | 0
  do {
    const rx = m.u32((pRoomEx + 0x34) >>> 0) | 0
    if (x >= rx) {
      const ry = m.u32((pRoomEx + 0x38) >>> 0) | 0
      if (y >= ry) {
        const rw = m.u32((pRoomEx + 0x3c) >>> 0) | 0
        if (x < ((rx + rw) | 0)) {
          const rh = m.u32((pRoomEx + 0x40) >>> 0) | 0
          if (y < ((ry + rh) | 0)) {
            return pRoomEx >>> 0
          }
        }
      }
    }
    pRoomEx = m.u32((pRoomEx + 0x24) >>> 0)
  } while (pRoomEx !== 0)
  return 0
}

/**
 * `@va D2Common:0x6FD8B350` (`D2Common.#10557` `DUNGEON_UpdateRoomIdleCounter`, stdcall `(pRoom)`, `ret 4`).
 *
 * If `pRoom->nNumClients (+0x78) != 0`, resets `pRoom->nIdleCounter (+0x0C) = 0` and returns `0`;
 * otherwise increments `pRoom->nIdleCounter` and returns the new value.
 */
export function DUNGEON_UpdateRoomIdleCounter113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 1198)
  }
  const nClients = m.u32((pRoom + 0x78) >>> 0)
  if (nClients !== 0) {
    m.setU32((pRoom + 0x0c) >>> 0, 0)
    return m.u32((pRoom + 0x0c) >>> 0) | 0
  }
  const next = ((m.u32((pRoom + 0x0c) >>> 0) | 0) + 1) | 0
  m.setU32((pRoom + 0x0c) >>> 0, next >>> 0)
  return next
}

/**
 * `@va D2Common:0x6FD8B3A0` (`DUNGEON_VerifyRoomClientsNonNull113c`, fastcall `ecx = pRoom`, plain `ret`).
 *
 * Verifies that all `pRoom->nNumClients (+0x78)` entries in `pRoom->pClientList (+0x48)` are non-NULL,
 * then returns `1`.
 */
export function DUNGEON_VerifyRoomClientsNonNull113c(m: Memory113c, ecx: number): number {
  const nClients = m.u32((ecx + 0x78) >>> 0)
  if (nClients > 0) {
    let pList = m.u32((ecx + 0x48) >>> 0)
    for (let i = 0; i < nClients; i++, pList = (pList + 4) >>> 0) {
      if (m.u32(pList) === 0) {
        throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 1107)
      }
    }
  }
  return 1
}

/**
 * `@va D2Common:0x6FD8B3F0` (`D2Common.#10627` `DUNGEON_SetRoomFlag2`, stdcall `(pRoom, bSet)`, `ret 8`).
 *
 * Sets (`bSet != 0`) or clears (`bSet == 0`) bit `0x02` on `pRoom->dwFlags (+0x34)`.
 */
export function DUNGEON_SetRoomFlag2_113c(m: Memory113c, pRoom: number, bSet: number): void {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 1080)
  }
  const flags = m.u32((pRoom + 0x34) >>> 0)
  if (bSet !== 0) {
    m.setU32((pRoom + 0x34) >>> 0, (flags | 0x02) >>> 0)
  } else {
    m.setU32((pRoom + 0x34) >>> 0, (flags & ~0x02) >>> 0)
  }
}

/**
 * `@va D2Common:0x6FD8B440` (`D2Common.#11035` `DUNGEON_CheckRoomFlag2`, stdcall `(pRoom)`, `ret 4`).
 *
 * Returns `pRoom->dwFlags (+0x34) & 0x02`.
 */
export function DUNGEON_CheckRoomFlag2_113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 1071)
  }
  return (m.u32((pRoom + 0x34) >>> 0) & 0x02) >>> 0
}

/**
 * `@va D2Common:0x6FD8B470` (`D2Common.#10275` `DUNGEON_GetRoomPortalList`, stdcall `(pRoom)`, `ret 4`).
 *
 * Returns `pRoom->pPortalNodes (+0x18)`.
 */
export function DUNGEON_GetRoomPortalList113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 934)
  }
  return m.u32((pRoom + 0x18) >>> 0)
}

/**
 * `@va D2Common:0x6FD8B4A0` (`DUNGEON_FreeRoomPortalList113c`, stdcall `(pRoom)`, `ret 4`).
 *
 * Walks `pRoom->pPortalNodes (+0x18)` (next at `+0x08`), freeing each node via `Fog.#10046` with
 * `pRoom->pAct (+0x2C)->pMemPool (+0x5C)`, and zeroes `pRoom->pPortalNodes`.
 */
export function DUNGEON_FreeRoomPortalList113c(m: Memory113c, pRoom: number): void {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 912)
  }
  const pAct = m.u32((pRoom + 0x2c) >>> 0)
  let pNode = m.u32((pRoom + 0x18) >>> 0)
  void m.u32((pAct + 0x5c) >>> 0)
  if (pNode !== 0) {
    const freeFn = (m as { free?: (p: number) => void }).free
    do {
      const cur = pNode
      pNode = m.u32((pNode + 0x08) >>> 0)
      freeFn?.call(m, cur)
    } while (pNode !== 0)
    m.setU32((pRoom + 0x18) >>> 0, 0)
  }
}

/**
 * `@va D2Common:0x6FD8B500` (`D2Common.#10903` `DUNGEON_AddRoomPortalNode`, stdcall `(pRoom, nField0, nField4)`, `ret 0xC`).
 *
 * If `pRoom != 0`, allocates a 12-byte portal node via `Fog.#10045` (`[nField0, nField4, pRoom->pPortalNodes]`),
 * prepends it to `pRoom->pPortalNodes (+0x18)`, and sets `pRoom->pAct (+0x2C)->bHasPendingPortalUpdates (+0x58) = 1`.
 */
export function DUNGEON_AddRoomPortalNode113c(
  m: Memory113c,
  pRoom: number,
  nField0: number,
  nField4: number,
): void {
  if (pRoom === 0) return
  const pAct0 = m.u32((pRoom + 0x2c) >>> 0)
  void m.u32((pAct0 + 0x5c) >>> 0)
  const pNode = m.alloc(0x0c)
  m.setU32(pNode, nField0 >>> 0)
  m.setU32((pNode + 0x04) >>> 0, nField4 >>> 0)
  const prevHead = m.u32((pRoom + 0x18) >>> 0)
  m.setU32((pNode + 0x08) >>> 0, prevHead)
  const pAct = m.u32((pRoom + 0x2c) >>> 0)
  m.setU32((pRoom + 0x18) >>> 0, pNode)
  m.setU32((pAct + 0x58) >>> 0, 1)
}

/**
 * `@va D2Common:0x6FD8B550` (`D2Common.#10055` `DUNGEON_GetRoomExFromRoom`, stdcall `(pRoom)`, `ret 4`).
 *
 * Returns `pRoom->pRoomEx (+0x10)`.
 */
export function DUNGEON_GetRoomExFromRoom113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 798)
  }
  return m.u32((pRoom + 0x10) >>> 0)
}

/**
 * `@va D2Common:0x6FD8B5B0` (`DUNGEON_GetCollisionGridFromRoomFast113c`, custom `eax = pRoom`, plain `ret`).
 *
 * Returns `pRoom->pCollisionGrid (+0x20)`.
 */
export function DUNGEON_GetCollisionGridFromRoomFast113c(m: Memory113c, eax: number): number {
  if (eax === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 709)
  }
  return m.u32((eax + 0x20) >>> 0)
}

/**
 * `@va D2Common:0x6FD8BA20` (`D2Common.#10786` `DUNGEON_GetAdjacentRoomsListFromRoom`, stdcall `(pRoom, pppRoomsNear, pnRoomsNear)`, `ret 0xC`).
 *
 * Stores `pRoom->nRoomsNear (+0x24)` to `*pnRoomsNear` and `pRoom->ppRoomsNear (+0x00)` to `*pppRoomsNear`.
 */
export function DUNGEON_GetAdjacentRoomsListFromRoom113c(
  m: Memory113c,
  pRoom: number,
  pppRoomsNear: number,
  pnRoomsNear: number,
): void {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 236)
  }
  const nNear = m.u32((pRoom + 0x24) >>> 0)
  m.setU32(pnRoomsNear, nNear)
  const ppNear = m.u32(pRoom)
  m.setU32(pppRoomsNear, ppNear)
}

/**
 * `@va D2Common:0x6FD8BA60` (`D2Common.#10035` `DUNGEON_GetRoomCoordinates`, stdcall `(pRoom, pOutCoords)`, `ret 8`).
 *
 * Copies the 8 dwords at `pRoom + 0x4C .. pRoom + 0x68` (`D2DrlgCoordsStrc`) to `pOutCoords`,
 * or zeroes the 8 dwords at `pOutCoords` if `pRoom == 0`.
 */
export function DUNGEON_GetRoomCoordinates113c(
  m: Memory113c,
  pRoom: number,
  pOutCoords: number,
): void {
  if (pOutCoords === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 209)
  }
  if (pRoom === 0) {
    for (let i = 0; i < 8; i++) {
      m.setU32((pOutCoords + i * 4) >>> 0, 0)
    }
    return
  }
  for (let i = 0; i < 8; i++) {
    m.setU32((pOutCoords + i * 4) >>> 0, m.u32((pRoom + 0x4c + i * 4) >>> 0))
  }
}

/**
 * `@va D2Common:0x6FD8BD60` (`D2Common.#10006` `DUNGEON_GetLogicalRoomField30`, stdcall `(pRoom)`, `ret 4`).
 *
 * Reads `pLogical = pRoom->pRoomEx (+0x10)->pLogicalRoomInfo (+0x64)`, asserts `pLogical != 0`,
 * and returns `*[pLogical + 0x30]`.
 */
export function DUNGEON_GetLogicalRoomField30_113c(m: Memory113c, pRoom: number): number {
  const pRoomEx = m.u32((pRoom + 0x10) >>> 0)
  const pLogical = m.u32((pRoomEx + 0x64) >>> 0)
  if (pLogical === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 717)
  }
  return m.u32((pLogical + 0x30) >>> 0) | 0
}

/**
 * `@va D2Common:0x6FD8BDD0` (`DUNGEON_SortRoomClientArray113c`, custom `eax = pRoom`, `ret`).
 *
 * Verifies all client pointers via `0x6FD8B3A0` (`DUNGEON_VerifyRoomClientsNonNull113c`), bubble-sorts
 * `pRoom->pClientList (+0x48)` of length `pRoom->nNumClients (+0x78)` in ascending unsigned pointer order,
 * and re-verifies non-null entries if the outer loop runs to completion.
 */
export function DUNGEON_SortRoomClientArray113c(m: Memory113c, pRoom: number): void {
  const room = pRoom >>> 0
  if (DUNGEON_VerifyRoomClientsNonNull113c(m, room) === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 1115)
  }
  let edi = ((m.u32((room + 0x78) >>> 0) | 0) - 1) | 0
  if (edi > 0) {
    while (edi > 0) {
      let bSwapped = 0
      for (let ecx = 0; ecx < edi; ecx++) {
        const pArr = m.u32((room + 0x48) >>> 0)
        const a = m.u32((pArr + ecx * 4) >>> 0)
        const b = m.u32((pArr + ecx * 4 + 4) >>> 0)
        if ((a >>> 0) > (b >>> 0)) {
          const pArr2 = m.u32((room + 0x48) >>> 0)
          const vNext = m.u32((pArr2 + ecx * 4 + 4) >>> 0)
          const vCur = m.u32((pArr2 + ecx * 4) >>> 0)
          m.setU32((pArr2 + ecx * 4) >>> 0, vNext)
          const pArr3 = m.u32((room + 0x48) >>> 0)
          m.setU32((pArr3 + ecx * 4 + 4) >>> 0, vCur)
          bSwapped = 1
        }
      }
      if (bSwapped === 0) {
        return
      }
      edi = (edi - 1) | 0
    }
  }
  const nCount = m.u32((room + 0x78) >>> 0)
  if (nCount > 0) {
    const pArr = m.u32((room + 0x48) >>> 0)
    for (let i = 0; i < nCount; i++) {
      if (m.u32((pArr + i * 4) >>> 0) === 0) {
        throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 1107)
      }
    }
  }
}

/**
 * `@va D2Common:0x6FD8BE90` (`DUNGEON_AreAllAdjacentRoomsActive113c`, stdcall `(pRoom)`, `ret 4`).
 *
 * Returns `1` iff `pRoom->nRoomsNear (+0x24) == pRoom->pRoomEx (+0x10)->nRoomsNear (+0x2C)` and every
 * entry in `pRoom->ppRoomsNear[0..nRoomsNear)` has `(pAdj->dwFlags (+0x34) & 1) != 0`.
 */
export function DUNGEON_AreAllAdjacentRoomsActive113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 1007)
  }
  const pRoomEx = m.u32((pRoom + 0x10) >>> 0)
  const nExNear = m.u32((pRoomEx + 0x2c) >>> 0)
  const nNear = m.u32((pRoom + 0x24) >>> 0)
  if (nNear !== nExNear) return 0
  if (nNear > 0) {
    const ppNear = m.u32(pRoom)
    for (let i = 0; i < nNear; i++) {
      const pAdj = m.u32((ppNear + i * 4) >>> 0)
      if ((m.u8((pAdj + 0x34) >>> 0) & 0x01) === 0) {
        return 0
      }
    }
  }
  return 1
}

/**
 * `@va D2Common:0x6FD8BF60` (`D2Common.#10615` `DUNGEON_HasRoomExWaypointFlags`, stdcall `(pRoom)`, `ret 4`).
 *
 * Returns `1` if `(pRoom->pRoomEx (+0x10)->dwFlags (+0x28) & 0x30000) != 0`, else `0`.
 */
export function DUNGEON_HasRoomExWaypointFlags113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 867)
  }
  const pRoomEx = m.u32((pRoom + 0x10) >>> 0)
  if (pRoomEx === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 630)
  }
  return (m.u32((pRoomEx + 0x28) >>> 0) & 0x30000) !== 0 ? 1 : 0
}

/**
 * `@va D2Common:0x6FD8BFB0` (`D2Common.#10057` `DUNGEON_GetLevelIdIfNotHidden`, stdcall `(pRoom)`, `ret 4`).
 *
 * Returns `0` if `pRoom == 0` or `(pRoom->pRoomEx->dwFlags (+0x28) & 0x800000) != 0`; otherwise returns
 * `pRoom->pRoomEx->pLevel (+0x58)->nLevelId (+0x1D0)`.
 */
export function DUNGEON_GetLevelIdIfNotHidden113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) return 0
  const pRoomEx = m.u32((pRoom + 0x10) >>> 0)
  if (pRoomEx === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 619)
  }
  if ((m.u32((pRoomEx + 0x28) >>> 0) & 0x800000) !== 0) {
    return 0
  }
  const pLevel = m.u32((pRoomEx + 0x58) >>> 0)
  return m.u32((pLevel + 0x1d0) >>> 0) | 0
}

/**
 * `@va D2Common:0x6FD8C020` (`D2Common.#10142` `DUNGEON_AcquireRoomExDT1Mask`, stdcall `(pRoom)`, `ret 4`).
 *
 * Reads `flags = pRoom->pRoomEx (+0x10)->dwFlags (+0x28)`. If `(flags & 0x40000) != 0`, returns
 * `pRoomEx->dwDT1Mask (+0x5C)` without modifying `dwFlags`. Otherwise, if `(flags & 0x4000000) != 0`,
 * returns `0`; else sets `pRoomEx->dwFlags |= 0x4000000` and returns `pRoomEx->dwDT1Mask (+0x5C)`.
 */
export function DUNGEON_AcquireRoomExDT1Mask113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 699)
  }
  const pRoomEx = m.u32((pRoom + 0x10) >>> 0)
  const flags = m.u32((pRoomEx + 0x28) >>> 0)
  if ((flags & 0x40000) === 0) {
    if ((flags & 0x4000000) !== 0) {
      return 0
    }
    m.setU32((pRoomEx + 0x28) >>> 0, (flags | 0x4000000) >>> 0)
  }
  return m.u32((pRoomEx + 0x5c) >>> 0)
}

/**
 * `@va D2Common:0x6FD8C200` (`DUNGEON_AllocAndBuildRoomNeighborList113c`, custom `esi = pRoom`, `ecx = pMemPool`, `ret`).
 *
 * Allocates `pRoom->ppRoomsNear (+0x00)` of size `pRoom->pRoomEx (+0x10)->nRoomsNear (+0x2C) * 4`,
 * packs active neighbor rooms via `0x6FD94540` (`DRLGROOM_PackAdjacentRooms113c`), and refreshes each
 * distinct neighbor's `ppRoomsNear` and `nRoomsNear (+0x24)`.
 */
export function DUNGEON_AllocAndBuildRoomNeighborList113c(
  m: Memory113c,
  pRoom: number,
  _pMemPool = 0,
): void {
  const room = pRoom >>> 0
  const pRoomEx = m.u32((room + 0x10) >>> 0)
  const nCap = m.u32((pRoomEx + 0x2c) >>> 0)
  const ppRoomsNear = m.alloc((nCap * 4) >>> 0)
  m.setU32(room, ppRoomsNear)

  const nCount = DRLGROOM_PackAdjacentRooms113c(m, pRoomEx, ppRoomsNear) >>> 0
  m.setU32((room + 0x24) >>> 0, nCount)

  for (let i = 0; (i >>> 0) < (m.u32((room + 0x24) >>> 0) >>> 0); i++) {
    const pArr = m.u32(room)
    const pNeighbor = m.u32((pArr + i * 4) >>> 0)
    if (pNeighbor === 0) {
      throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 264)
    }
    if (pNeighbor !== room) {
      const nSubCount = DRLGROOM_PackAdjacentRooms113c(
        m,
        m.u32((pNeighbor + 0x10) >>> 0),
        m.u32(pNeighbor),
      )
      m.setU32((pNeighbor + 0x24) >>> 0, nSubCount >>> 0)
    }
  }
}

/**
 * `@va D2Common:0x6FD8C330` (`D2Common.#10099` `DUNGEON_CheckPresetRoomFlag80`, stdcall `(pRoom)`, `ret 4`).
 *
 * If `pRoom->pRoomEx (+0x10)->nType (+0x48) == 1`, returns `pRoomEx->pPresetType2info (+0x20)->fFlags (+0x54) & 0x80`;
 * otherwise returns `0`.
 */
export function DUNGEON_CheckPresetRoomFlag80_113c(m: Memory113c, pRoom: number): number {
  if (pRoom === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DUNGEON\\Dungeon.cpp', 1445)
  }
  const pRoomEx = m.u32((pRoom + 0x10) >>> 0)
  const nType = m.u32((pRoomEx + 0x48) >>> 0) | 0
  if (nType !== 1) return 0
  const pPreset = m.u32((pRoomEx + 0x20) >>> 0)
  return (m.u32((pPreset + 0x54) >>> 0) & 0x80) >>> 0
}

/**
 * `@va D2Common:0x6FD8C870` (`DUNGEON_FreeRoomAndDetachUnits113c`, custom `edi = pRoom`, `[esp+4] = pMemPool`, `ret 4`).
 *
 * Detaches all units on `pRoom->pUnitFirst (+0x74)` via `0x6FDB6700` (`UNITROOM_RemoveUnitFromRoom113c`),
 * frees `pRoom->pCollisionGrid (+0x20)`, calls `0x6FD8B4A0` (`DUNGEON_FreeRoomPortalList113c`),
 * and frees `pRoom->pClientList (+0x48)`, `pRoom->ppRoomsNear (+0x00)`, and `pRoom` via `Fog.#10046`.
 */
export function DUNGEON_FreeRoomAndDetachUnits113c(
  m: Memory113c,
  pRoom: number,
  _pMemPool = 0,
): void {
  const room = pRoom >>> 0
  let pUnit = m.u32((room + 0x74) >>> 0)
  while (pUnit !== 0) {
    const dwFlags = m.u32((pUnit + 0xc4) >>> 0)
    if (((dwFlags >>> 0x16) & 1) === 0) {
      m.setU32((pUnit + 0xc8) >>> 0, (m.u32((pUnit + 0xc8) >>> 0) | 0x20) >>> 0)
    }
    m.setU32((pUnit + 0xc4) >>> 0, (dwFlags | 0x800000) >>> 0)

    const nType = m.u32(pUnit) | 0
    const pPath = m.u32((pUnit + 0x2c) >>> 0)
    if (nType === 2 || (nType > 3 && nType <= 5)) {
      if (m.u32(pPath) !== 0) {
        UNITROOM_RemoveUnitFromRoom113c(m, pUnit)
      }
      m.setU32(pPath, 0)
    } else {
      const zero5c = m.u32(0x6fddd45c)
      const zero58 = m.u32(0x6fddd458)
      m.setU32((pPath + 0x04) >>> 0, zero5c)
      m.setU32((pPath + 0x0c) >>> 0, zero5c)
      const pPathRoom = m.u32((pPath + 0x1c) >>> 0)
      m.setU32(pPath, zero58)
      m.setU32((pPath + 0x08) >>> 0, zero58)
      m.setU32((pPath + 0x28) >>> 0, 0)
      if (pPathRoom !== 0) {
        m.setU32((pPath + 0x20) >>> 0, pPathRoom)
        UNITROOM_RemoveUnitFromRoom113c(m, m.u32((pPath + 0x30) >>> 0))
        m.setU32((pPath + 0x34) >>> 0, (m.u32((pPath + 0x34) >>> 0) | 0x02) >>> 0)
      }
    }
    pUnit = m.u32((room + 0x74) >>> 0)
  }

  const freeFn = (m as { free?: (p: number) => void }).free
  const pCollGrid = m.u32((room + 0x20) >>> 0)
  if (pCollGrid !== 0) {
    freeFn?.call(m, pCollGrid)
    m.setU32((room + 0x20) >>> 0, 0)
  }
  DUNGEON_FreeRoomPortalList113c(m, room)
  const pClients = m.u32((room + 0x48) >>> 0)
  if (pClients !== 0) {
    const pAct = m.u32((room + 0x2c) >>> 0)
    void m.u32((pAct + 0x5c) >>> 0)
    freeFn?.call(m, pClients)
  }
  const ppRoomsNear = m.u32(room)
  if (ppRoomsNear !== 0) {
    freeFn?.call(m, ppRoomsNear)
  }
  if (room !== 0) {
    freeFn?.call(m, room)
  }
}

/**
 * `@va D2Common:0x6FDCBA00` (`DUNGEON_ShouldDeactivateRoomEx113c`, custom `edx = pRoomEx`, `ret`).
 *
 * Returns `0` if `(pRoomEx->dwFlags & 0x400000) != 0` or `pRoomEx->fRoomStatus (+0x44) <= 1`.
 * For town levels (`0x6FD7D320`) or Arreat Summit (`120`), returns `0` if any room in
 * `pLevel->pFirstRoomEx (+0x10)` has `fRoomStatus <= 1`. Otherwise returns `1`.
 */
export function DUNGEON_ShouldDeactivateRoomEx113c(m: Memory113c, pRoomEx: number): number {
  const roomEx = pRoomEx >>> 0
  if ((m.u32((roomEx + 0x28) >>> 0) & 0x400000) !== 0) {
    return 0
  }
  const pLevel = m.u32((roomEx + 0x58) >>> 0)
  if (pLevel === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DATATBLS\\MissileTbls.cpp', 1068)
  }
  const pDrlg = m.u32((pLevel + 0x1b4) >>> 0)
  if (pDrlg === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DATATBLS\\MissileTbls.cpp', 1069)
  }
  if ((m.u8((pDrlg + 0x8c) >>> 0) & 0x01) !== 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DATATBLS\\MissileTbls.cpp', 743)
  }
  if (m.u8((roomEx + 0x44) >>> 0) <= 1) {
    return 0
  }
  const nLevelId = m.u32((pLevel + 0x1d0) >>> 0) | 0
  if (DRLG_IsTownLevel113c(nLevelId) !== 0 || nLevelId === 0x78) {
    let pCur = m.u32((pLevel + 0x10) >>> 0)
    while (pCur !== 0) {
      if (m.u8((pCur + 0x44) >>> 0) <= 1) {
        return 0
      }
      pCur = m.u32((pCur + 0x24) >>> 0)
    }
  }
  return 1
}



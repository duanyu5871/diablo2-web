/**
 * Diablo II v1.13c `D2Common.dll` unit search primitives (`UnitFinds.cpp`, image base `0x6FD50000`).
 *
 * Binary evidence (`objdump -d -M intel` on 1.13c `D2Common.dll`):
 * - `#10344` (`0x6FD62000`): `UNITFINDS_FreeUnitFindData` (`__stdcall(pUnitFindData)`, `ret 4`)
 * - `#10591` (`0x6FD62030`): `UNITFINDS_InitUnitFindData` (`__stdcall(...)`, `ret 0x20`)
 * - `0x6FD620F0`: `UNITFINDS_GrowUnitsArray` (custom LTCG `esi = pUnitFindData`, `ret`)
 * - `#10754` (`0x6FD622B0`): `UNITFINDS_FindUnitInAdjacentRooms` (`__stdcall(pRoom, nUnitType, nClassId)`, `ret 0xC`)
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import {
  D2ActiveRoomStrc,
  D2UnitFindDataStrc,
  D2UnitStrc,
} from '../mem/layout.generated.ts'
import { D2CommonAssertError } from './inline-helpers.ts'

/**
 * `@va D2Common:0x6FD62000` (`D2Common.#10344` `UNITFINDS_FreeUnitFindData`,
 * stdcall `[esp+4] = pUnitFindData`, `ret 4`, void).
 *
 * If `pUnitFindData != 0` and `pUnitFindData->pUnitsArray (+0x04) != 0`, reads `pMemPool (+0x00)`,
 * frees `pUnitsArray` via `Fog.#10046` (line `0xFF` = `255`), and zeroes `pUnitFindData->pUnitsArray (+0x04)`.
 */
export function UNITFINDS_FreeUnitFindData113c(m: Memory113c, pUnitFindData: number): void {
  const pData = pUnitFindData >>> 0
  if (pData === 0) return
  const pUnitsArray = m.get(pData, D2UnitFindDataStrc.pUnitsArray)
  if (pUnitsArray === 0) return
  const pMemPool = m.get(pData, D2UnitFindDataStrc.pMemPool)
  void pMemPool
  ;(m as { free?: (p: number) => void }).free?.(pUnitsArray)
  m.set(pData, D2UnitFindDataStrc.pUnitsArray, 0)
}

/**
 * `@va D2Common:0x6FD62030` (`D2Common.#10591` `UNITFINDS_InitUnitFindData`,
 * stdcall `[esp+4] = pMemPool`, `[esp+8] = pUnitFindData`, `[esp+0xC] = pRoom`,
 * `[esp+0x10] = pFilterUnit`, `[esp+0x14] = pfnCallback`, `[esp+0x18] = dwSize`,
 * `[esp+0x1C] = nX`, `[esp+0x20] = nY`, `ret 0x20`, void).
 */
export function UNITFINDS_InitUnitFindData113c(
  m: Memory113c,
  pMemPool: number,
  pUnitFindData: number,
  pRoom: number,
  pFilterUnit: number,
  pfnCallback: number,
  dwSize: number,
  nX: number,
  nY: number,
): void {
  const pData = pUnitFindData >>> 0
  if (pData === 0) {
    throw new D2CommonAssertError('UnitFinds.cpp', 0xe2)
  }
  const pUnitsArray = m.alloc(0x3c)
  m.set(pData, D2UnitFindDataStrc.pUnitsArray, pUnitsArray)
  if (pUnitsArray === 0) {
    throw new D2CommonAssertError('UnitFinds.cpp', 0xe5)
  }
  for (let i = 0; i < 15; i++) {
    m.setU32((pUnitsArray + i * 4) >>> 0, 0)
  }
  m.set(pData, D2UnitFindDataStrc.nIndex, 0)
  m.set(pData, D2UnitFindDataStrc.dwFlags, 0)
  m.set(pData, D2UnitFindDataStrc.pRoom, pRoom >>> 0)
  m.set(pData, D2UnitFindDataStrc.pFilterUnit, pFilterUnit >>> 0)
  m.set(pData, D2UnitFindDataStrc.pfnCallback, pfnCallback >>> 0)
  m.set(pData, D2UnitFindDataStrc.pMemPool, pMemPool >>> 0)
  m.set(pData, D2UnitFindDataStrc.nMaxCount, 0x0f)
  m.set(pData, D2UnitFindDataStrc.dwSize, dwSize >>> 0)
  m.set(pData, D2UnitFindDataStrc.nX, nX >>> 0)
  m.set(pData, D2UnitFindDataStrc.nY, nY >>> 0)
}

/**
 * `@va D2Common:0x6FD620F0` (`UNITFINDS_GrowUnitsArray`,
 * custom LTCG `esi = pUnitFindData`, plain `ret` -> `pNewArray`).
 *
 * Asserts `pUnitFindData != 0` (line `0xC0` = `192`), reads `pOldArray (+0x04)`, `pMemPool (+0x00)`,
 * and `nMaxCount (+0x1C)`, grows `nMaxCount` by `+15` (`0x0F`), reallocates `(newMax << 2)` bytes
 * via `Fog.#10047` (line `0xC5` = `197`), updates `+0x1C` and `+0x04`, and returns `pNewArray`.
 */
export function UNITFINDS_GrowUnitsArray113c(m: Memory113c, pUnitFindData: number): number {
  const pData = pUnitFindData >>> 0
  if (pData === 0) {
    throw new D2CommonAssertError('UnitFinds.cpp', 0xc0)
  }
  const pOldArray = m.get(pData, D2UnitFindDataStrc.pUnitsArray)
  const pMemPool = m.get(pData, D2UnitFindDataStrc.pMemPool)
  void pMemPool
  const oldMax = m.get(pData, D2UnitFindDataStrc.nMaxCount) | 0
  const newMax = (oldMax + 0x0f) | 0
  const newByteSize = (newMax << 2) >>> 0
  const pNewArray = m.alloc(newByteSize)
  if (pOldArray !== 0) {
    const copyDwords = Math.max(0, Math.min(oldMax, newMax))
    for (let i = 0; i < copyDwords; i++) {
      m.setU32((pNewArray + i * 4) >>> 0, m.u32((pOldArray + i * 4) >>> 0))
    }
    ;(m as { free?: (p: number) => void }).free?.(pOldArray)
  }
  m.set(pData, D2UnitFindDataStrc.nMaxCount, newMax >>> 0)
  m.set(pData, D2UnitFindDataStrc.pUnitsArray, pNewArray >>> 0)
  return pNewArray >>> 0
}

/**
 * `@va D2Common:0x6FD622B0` (`D2Common.#10754` `UNITFINDS_FindUnitInAdjacentRooms`,
 * stdcall `[esp+4] = pRoom`, `[esp+8] = nUnitType`, `[esp+0xC] = nClassId`, `ret 0xC` -> `pUnit` or `0`).
 *
 * Asserts `pRoom != 0` (line `0x31` = `49`), iterates `i = 0 .. pRoom->nNumRooms (+0x24) - 1`
 * over `pRoom->ppRoomList[i] (+0x00)`, walks each near room's `pUnitFirst (+0x74)` chain via
 * `pRoomUnitNext (+0xE8)`, and returns the first unit whose `dwUnitType (+0x00) == nUnitType`
 * and `dwClassId (+0x04) == nClassId`.
 */
export function UNITFINDS_FindUnitInAdjacentRooms113c(
  m: Memory113c,
  pRoom: number,
  nUnitType: number,
  nClassId: number,
): number {
  const room = pRoom >>> 0
  if (room === 0) {
    throw new D2CommonAssertError('UnitFinds.cpp', 0x31)
  }
  const ppRoomsNear = m.get(room, D2ActiveRoomStrc.ppRoomsNear)
  const nNumRooms = m.get(room, D2ActiveRoomStrc.nRoomsNear) | 0
  const targetType = nUnitType | 0
  const targetClassId = nClassId | 0
  for (let i = 0; i < nNumRooms; i++) {
    const pNearRoom = m.u32((ppRoomsNear + i * 4) >>> 0)
    let pUnit = m.get(pNearRoom, D2ActiveRoomStrc.pUnitFirst)
    while (pUnit !== 0) {
      const uType = m.get(pUnit, D2UnitStrc.dwUnitType) | 0
      if (uType === targetType) {
        const uClassId = m.get(pUnit, D2UnitStrc.dwClassId) | 0
        if (uClassId === targetClassId) {
          return pUnit >>> 0
        }
      }
      pUnit = m.get(pUnit, D2UnitStrc.pRoomUnitNext)
    }
  }
  return 0
}

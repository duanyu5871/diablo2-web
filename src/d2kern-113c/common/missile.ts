/**
 * Diablo II v1.13c `D2Common.dll` missile unit data accessors, damage scaling helper,
 * and hireling type classifier (Batch B023: `0x6FD6A2D0`, `0x6FDB9C60..0x6FDBA750`).
 *
 * Binary evidence (`objdump -d -M intel ~/d2-data/D2Common.dll`, image base `0x6FD50000`):
 * - Every missile unit data accessor verifies `pMissile != NULL && pMissile->dwUnitType == 3 (UNIT_MISSILE) && pMissile->pUnitData != NULL`.
 * - `D2MissileDataStrc` (52 bytes, allocated at `0x6FDBA3B2`) stores 16-bit frame/skill/level counters at `+0x04..+0x10`,
 *   stream flags at `+0x14`, and owner type/id at `+0x18/+0x1C`.
 * - `MISSILE_ScaleDamageDataBy128thsInline113c` (`0x6FDB9C60`) scales 17 signed dwords in `D2MissileDamageDataStrc`
 *   by `(val * scale + ((val * scale < 0) ? 127 : 0)) >> 7` (`imul; cdq; and edx, 0x7f; add eax, edx; sar eax, 7`)
 *   whenever `nScale128 != 128`.
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import {
  D2MissileDamageDataStrc,
  D2MissileDataStrc,
  D2MissileDataStrc_SIZE,
  D2MissilesTxt,
  D2UnitStrc,
  type FieldLayout113c,
} from '../mem/layout.generated.ts'
import {
  D2COMMON_GDWBITMASKS_IAT_VA_113C,
  D2COMMON_SGPT_DATATABLES_VA_113C,
  D2CommonAssertError,
  DATATBLS_GetMissilesTxtRecordInline113c,
  SEED_RollLimitedRandomNumberInline113c,
} from './inline-helpers.ts'
import { imul32, sar32 } from './int-math.ts'
import { INVENTORY_GetActiveWeaponMem113c } from './inventory.ts'
import { ITEMS_CheckItemTypeIdMem113c, ITEMS_IsTome113c } from './items.ts'
import { ITEMS_CheckItemTypeIdEquivalent113c } from './skills.ts'
import {
  STATLIST_FindStatFirstIndexOrLowerBound113c,
  STATLIST_GetUnitStatWithLayer113c,
} from './statlist.ts'

const UNIT_MONSTER = 1
const UNIT_MISSILE = 3

function s16(v: number): number {
  return (v << 16) >> 16
}

function getMissileData(m: Memory113c, pMissile: number): number {
  if (pMissile === 0) return 0
  if (m.get(pMissile, D2UnitStrc.dwUnitType) !== UNIT_MISSILE) return 0
  return m.get(pMissile, D2UnitStrc.pUnitData)
}

function clampS16(v: number): number {
  const n = v | 0
  if (n > 0x7fff) return 0x7fff
  if (n < -0x8000) return -0x8000
  return n
}

function clampNonNegS16(v: number): number {
  const n = v | 0
  if (n > 0x7fff) return 0x7fff
  if (n < 0) return 0
  return n
}

function scaleDmgFieldBy128(m: Memory113c, pDmgData: number, field: FieldLayout113c, scale: number): void {
  const prod = imul32(m.get(pDmgData, field) | 0, scale)
  const bias = (prod >> 31) & 0x7f
  m.set(pDmgData, field, sar32((prod + bias) | 0, 7) >>> 0)
}

/**
 * `@va D2Common:0x6FD6A2D0` (`MONSTERS_GetHirelingTypeId`, export `#11104`,
 * `stdcall (pUnit) -> int`, `ret 4`).
 *
 * Returns the hireling act/type identifier (`1..4`) for monster units matching classic
 * hireling class IDs (`0x10F` -> `1`, `0x152` -> `2`, `0x167` -> `3`, `0x230..0x231` -> `4`),
 * or `0` otherwise.
 */
export function MONSTERS_GetHirelingTypeId113c(m: Memory113c, pUnit: number): number {
  if (pUnit === 0) return 0
  if (m.get(pUnit, D2UnitStrc.dwUnitType) !== UNIT_MONSTER) return 0
  const classId = m.get(pUnit, D2UnitStrc.dwClassId) >>> 0
  if (classId === 0x10f) return 1
  if (classId === 0x152) return 2
  if (classId === 0x167) return 3
  if (((classId - 0x230) >>> 0) <= 1) return 4
  return 0
}

/**
 * `@va D2Common:0x6FDB9C60` (`MISSILE_ScaleDamageDataBy128thsInline`, internal LTCG helper,
 * `ecx = pDmgData`, `esi = nScale128` -> `void`).
 *
 * When `nScale128 != 128`, scales 17 signed dwords of `D2MissileDamageDataStrc` in place by
 * `(val * nScale128) / 128` truncated toward zero (`imul; cdq; and edx, 0x7F; add eax, edx; sar eax, 7`).
 */
export function MISSILE_ScaleDamageDataBy128thsInline113c(
  m: Memory113c,
  pDmgData: number,
  nScale128: number,
): void {
  const scale = nScale128 | 0
  if (scale === 128) return
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nFireMinDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nFireMaxDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nLtngMinDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nLtngMaxDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nMagMinDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nMagMaxDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nColdMinDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nColdMaxDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nColdLength, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nPoisMinDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nPoisMaxDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nPoisCount, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nLifeDrainMinDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nManaDrainMinDamage, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nBurningMin, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nBurningMax, scale)
  scaleDmgFieldBy128(m, pDmgData, D2MissileDamageDataStrc.nBurnLength, scale)
}

/**
 * `@va D2Common:0x6FDB9E70` (`MISSILE_GetHitShiftFromId`, export `#10557`,
 * `stdcall (nMissileId) -> uint8`, `ret 4`).
 *
 * Looks up `MissilesTxt[nMissileId]`; returns `0` (`xor al, al`) if NULL, else `rec->nHitShift (+0xE4)` in `al`.
 */
export function MISSILE_GetHitShiftFromId113c(m: Memory113c, nMissileId: number): number {
  const rec = DATATBLS_GetMissilesTxtRecordInline113c(m, nMissileId)
  if (rec === 0) return 0
  return m.get(rec, D2MissilesTxt.nHitShift) & 0xff
}

/**
 * `@va D2Common:0x6FDB9F50` (`MISSILE_GetTargetY`, export `#10818`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 */
export function MISSILE_GetTargetY113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return m.get(pData, D2MissileDataStrc.nTargetY) | 0
}

/**
 * `@va D2Common:0x6FDB9F70` (`MISSILE_SetTargetY`, export `#10019`,
 * `stdcall (pMissile, nTargetY) -> void`, `ret 8`).
 */
export function MISSILE_SetTargetY113c(m: Memory113c, pMissile: number, nTargetY: number): void {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return
  m.set(pData, D2MissileDataStrc.nTargetY, nTargetY >>> 0)
}

/**
 * `@va D2Common:0x6FDB9F90` (`MISSILE_GetTargetX`, export `#11018`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 */
export function MISSILE_GetTargetX113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return m.get(pData, D2MissileDataStrc.nTargetX) | 0
}

/**
 * `@va D2Common:0x6FDB9FB0` (`MISSILE_SetTargetX`, export `#10637`,
 * `stdcall (pMissile, nTargetX) -> void`, `ret 8`).
 */
export function MISSILE_SetTargetX113c(m: Memory113c, pMissile: number, nTargetX: number): void {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return
  m.set(pData, D2MissileDataStrc.nTargetX, nTargetX >>> 0)
}

/**
 * `@va D2Common:0x6FDBA030` (`MISSILE_GetActivateFrame`, export `#10130`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 */
export function MISSILE_GetActivateFrame113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return s16(m.get(pData, D2MissileDataStrc.nActivateFrame))
}

/**
 * `@va D2Common:0x6FDBA050` (`MISSILE_GetActivateFrameFromUnit`, export `#10677`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 *
 * Verifies `pMissile != NULL && pMissile->dwUnitType == 3`, looks up `MissilesTxt[pMissile->dwClassId]`,
 * and returns `movzx eax, byte ptr [rec+0x94]` (`nActivate`) or `0`.
 */
export function MISSILE_GetActivateFrameFromUnit113c(m: Memory113c, pMissile: number): number {
  if (pMissile === 0) return 0
  if (m.get(pMissile, D2UnitStrc.dwUnitType) !== UNIT_MISSILE) return 0
  const rec = DATATBLS_GetMissilesTxtRecordInline113c(m, m.get(pMissile, D2UnitStrc.dwClassId) | 0)
  if (rec === 0) return 0
  return m.get(rec, D2MissilesTxt.nActivate)
}

/**
 * `@va D2Common:0x6FDBA130` (`MISSILE_IsOwnedByUnit`, export `#10227`,
 * `stdcall (pMissile, pOwner) -> BOOL`, `ret 8`).
 *
 * Verifies `pMissile != NULL && pOwner != NULL && pMissile->dwUnitType == 3`, checks bit 0 of
 * `MissilesTxt[dwClassId]->dwMissileFlags (+0x04)` via `gdwBitMasks[0]`, and compares
 * `pData->nOwnerType (+0x18) == pOwner->dwUnitType` and `pData->dwOwnerId (+0x1C) == pOwner->dwUnitId`.
 */
export function MISSILE_IsOwnedByUnit113c(m: Memory113c, pMissile: number, pOwner: number): number {
  if (pMissile === 0) return 0
  if (pOwner === 0) return 0
  if (m.get(pMissile, D2UnitStrc.dwUnitType) !== UNIT_MISSILE) return 0
  const rec = DATATBLS_GetMissilesTxtRecordInline113c(m, m.get(pMissile, D2UnitStrc.dwClassId) | 0)
  if (rec === 0) return 0
  const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
  if ((m.u8(pBitMasks) & m.get(rec, D2MissilesTxt.dwMissileFlags)) === 0) return 0
  const pData = m.get(pMissile, D2UnitStrc.pUnitData)
  if (pData === 0) return 0
  if (m.get(pData, D2MissileDataStrc.nOwnerType) !== m.get(pOwner, D2UnitStrc.dwUnitType)) return 0
  return m.get(pData, D2MissileDataStrc.dwOwnerId) === m.get(pOwner, D2UnitStrc.dwUnitId) ? 1 : 0
}

/**
 * `@va D2Common:0x6FDBA1B0` (`MISSILE_SetOwner`, export `#10024`,
 * `stdcall (pMissile, pOwner) -> void`, `ret 8`).
 *
 * Verifies `pMissile != NULL && pMissile->dwUnitType == 3`, checks bit 0 of `MissilesTxt[dwClassId]->dwMissileFlags (+0x04)`,
 * and requires non-null `pUnitData`. If `pOwner == NULL`, writes `-1` (`0xFFFFFFFF`) to `pData->dwOwnerId (+0x1C)`
 * leaving `nOwnerType (+0x18)` unchanged; otherwise copies `pOwner->dwUnitType` and `pOwner->dwUnitId`.
 */
export function MISSILE_SetOwner113c(m: Memory113c, pMissile: number, pOwner: number): void {
  if (pMissile === 0) return
  if (m.get(pMissile, D2UnitStrc.dwUnitType) !== UNIT_MISSILE) return
  const rec = DATATBLS_GetMissilesTxtRecordInline113c(m, m.get(pMissile, D2UnitStrc.dwClassId) | 0)
  if (rec === 0) return
  const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
  if ((m.u8(pBitMasks) & m.get(rec, D2MissilesTxt.dwMissileFlags)) === 0) return
  const pData = m.get(pMissile, D2UnitStrc.pUnitData)
  if (pData === 0) return
  if (pOwner === 0) {
    m.set(pData, D2MissileDataStrc.dwOwnerId, 0xffffffff)
    return
  }
  m.set(pData, D2MissileDataStrc.nOwnerType, m.get(pOwner, D2UnitStrc.dwUnitType))
  m.set(pData, D2MissileDataStrc.dwOwnerId, m.get(pOwner, D2UnitStrc.dwUnitId))
}

/**
 * `@va D2Common:0x6FDBA220` (`MISSILE_GetClassId`, export `#10191`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 */
export function MISSILE_GetClassId113c(m: Memory113c, pMissile: number): number {
  if (pMissile === 0) return 0
  if (m.get(pMissile, D2UnitStrc.dwUnitType) !== UNIT_MISSILE) return 0
  return m.get(pMissile, D2UnitStrc.dwClassId) | 0
}

/**
 * `@va D2Common:0x6FDBA240` (`MISSILE_GetElapsedFrames`, export `#10985`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 *
 * Returns `s16(pData->nTotalFrames) - s16(pData->nRemainingFrames)`, or `0` if invalid.
 */
export function MISSILE_GetElapsedFrames113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return (s16(m.get(pData, D2MissileDataStrc.nTotalFrames)) - s16(m.get(pData, D2MissileDataStrc.nRemainingFrames))) | 0
}

/**
 * `@va D2Common:0x6FDBA270` (`MISSILE_GetRemainingFrames`, export `#10737`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 */
export function MISSILE_GetRemainingFrames113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return s16(m.get(pData, D2MissileDataStrc.nRemainingFrames))
}

/**
 * `@va D2Common:0x6FDBA290` (`MISSILE_GetTotalFrames`, export `#10534`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 */
export function MISSILE_GetTotalFrames113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return s16(m.get(pData, D2MissileDataStrc.nTotalFrames))
}

/**
 * `@va D2Common:0x6FDBA2B0` (`MISSILE_GetSkill`, export `#10240`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 */
export function MISSILE_GetSkill113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return s16(m.get(pData, D2MissileDataStrc.nSkill))
}

/**
 * `@va D2Common:0x6FDBA2D0` (`MISSILE_GetLevel`, export `#11029`,
 * `stdcall (pMissile) -> int`, `ret 4`).
 */
export function MISSILE_GetLevel113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return s16(m.get(pData, D2MissileDataStrc.nLevel))
}

/**
 * `@va D2Common:0x6FDBA2F0` (`MISSILE_SetLevel`, export `#10652`,
 * `stdcall (pMissile, nLevel) -> void`, `ret 8`).
 *
 * Unclamped 16-bit write `mov cx, [esp+8]; mov [eax+0x0C], cx`.
 */
export function MISSILE_SetLevel113c(m: Memory113c, pMissile: number, nLevel: number): void {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return
  m.set(pData, D2MissileDataStrc.nLevel, nLevel & 0xffff)
}

/**
 * `@va D2Common:0x6FDBA310` (`MISSILE_SetStreamFlags`, export `#11035`,
 * `stdcall (pMissile, dwStreamFlags) -> void`, `ret 8`).
 */
export function MISSILE_SetStreamFlags113c(m: Memory113c, pMissile: number, dwStreamFlags: number): void {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return
  m.set(pData, D2MissileDataStrc.dwStreamFlags, dwStreamFlags >>> 0)
}

/**
 * `@va D2Common:0x6FDBA330` (`MISSILE_GetStreamFlags`, export `#10623`,
 * `stdcall (pMissile) -> uint32`, `ret 4`).
 */
export function MISSILE_GetStreamFlags113c(m: Memory113c, pMissile: number): number {
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return 0
  return m.get(pData, D2MissileDataStrc.dwStreamFlags)
}

/**
 * `@va D2Common:0x6FDBA690` (`MISSILE_SetActivateFrame`, export `#10837`,
 * `stdcall (pMissile, nActivateFrame) -> void`, `ret 8`).
 *
 * Clamps signed 32-bit `nActivateFrame` to `[-32768, 32767]` before storing `u16` at `+0x08`.
 */
export function MISSILE_SetActivateFrame113c(m: Memory113c, pMissile: number, nActivateFrame: number): void {
  const clamped = clampS16(nActivateFrame)
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return
  m.set(pData, D2MissileDataStrc.nActivateFrame, clamped & 0xffff)
}

/**
 * `@va D2Common:0x6FDBA6D0` (`MISSILE_SetRemainingFrames`, export `#10970`,
 * `stdcall (pMissile, nRemainingFrames) -> void`, `ret 8`).
 *
 * Clamps signed 32-bit `nRemainingFrames` to `[-32768, 32767]` before storing `u16` at `+0x10`.
 */
export function MISSILE_SetRemainingFrames113c(m: Memory113c, pMissile: number, nRemainingFrames: number): void {
  const clamped = clampS16(nRemainingFrames)
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return
  m.set(pData, D2MissileDataStrc.nRemainingFrames, clamped & 0xffff)
}

/**
 * `@va D2Common:0x6FDBA710` (`MISSILE_SetTotalFrames`, export `#10558`,
 * `stdcall (pMissile, nTotalFrames) -> void`, `ret 8`).
 *
 * Clamps signed 32-bit `nTotalFrames` to `[-32768, 32767]` before storing `u16` at `+0x0E`.
 */
export function MISSILE_SetTotalFrames113c(m: Memory113c, pMissile: number, nTotalFrames: number): void {
  const clamped = clampS16(nTotalFrames)
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return
  m.set(pData, D2MissileDataStrc.nTotalFrames, clamped & 0xffff)
}

/**
 * `@va D2Common:0x6FDBA750` (`MISSILE_SetSkill`, export `#11167`,
 * `stdcall (pMissile, nSkill) -> void`, `ret 8`).
 *
 * Clamps signed 32-bit `nSkill` to `[0, 32767]` before storing `u16` at `+0x0A`.
 */
export function MISSILE_SetSkill113c(m: Memory113c, pMissile: number, nSkill: number): void {
  const clamped = clampNonNegS16(nSkill)
  const pData = getMissileData(m, pMissile)
  if (pData === 0) return
  m.set(pData, D2MissileDataStrc.nSkill, clamped & 0xffff)
}

/**
 * `@va D2Common:0x6FDBA350` (`D2Common.#10178` `MISSILE_FreeMissileData`, 49 bytes,
 * stdcall `[esp+4] = pMissile`, `ret 0x4`, void).
 */
export function MISSILE_FreeMissileData113c(m: Memory113c, pMissile: number): void {
  if (pMissile >>> 0 === 0 || m.get(pMissile, D2UnitStrc.dwUnitType) !== UNIT_MISSILE) {
    return
  }
  const pMissileData = m.get(pMissile, D2UnitStrc.pUnitData)
  if (pMissileData !== 0) {
    m.get(pMissile, D2UnitStrc.pMemPool)
    ;(m as { free?: (p: number) => void }).free?.(pMissileData)
    m.set(pMissile, D2UnitStrc.pUnitData, 0)
  }
}

/**
 * `@va D2Common:0x6FDBA390` (`D2Common.#10098` `MISSILE_AllocMissileData`, 72 bytes,
 * stdcall `[esp+4] = pMissile`, `ret 0x4`, void).
 */
export function MISSILE_AllocMissileData113c(m: Memory113c, pMissile: number): void {
  if (pMissile >>> 0 === 0 || m.get(pMissile, D2UnitStrc.dwUnitType) !== UNIT_MISSILE) {
    return
  }
  if (m.get(pMissile, D2UnitStrc.pUnitData) !== 0) {
    return
  }
  m.get(pMissile, D2UnitStrc.pMemPool)
  const pData = m.alloc(D2MissileDataStrc_SIZE)
  for (let i = 0; i < D2MissileDataStrc_SIZE; i += 4) {
    m.setU32((pData + i) >>> 0, 0)
  }
  m.set(pData, D2MissileDataStrc.dwOwnerId, 0xffffffff)
  m.set(pMissile, D2UnitStrc.pUnitData, pData >>> 0)
}

/**
 * `@va D2Common:0x6FD803A0` (`#10511` `SKILLS_GetUsedSkill`): asserts `0x65C` on a null unit
 * (0x6FD803A8), else `pUnit->pSkills (+0xA8) ? pSkills->pUsedSkill (+0x10) : 0`.
 */
function getUsedSkillMem113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x65c)
  }
  const pSkills = m.u32((u + 0xa8) >>> 0)
  if (pSkills === 0) return 0
  return m.u32((pSkills + 0x10) >>> 0)
}

/**
 * `@va D2Common:0x6FD730F0` (`ITEMS_GetItemTypeFromItem`, stdcall `[esp+4] = pItem`, `ret 4` -> signed
 * `wType[0]`): asserts `0x67E` on a null item (0x6FD730F8), `0` for non-items, else tail-jumps to
 * `0x6FD730A0` (`ITEMS_IsTome113c`).
 */
export function ITEMS_GetItemTypeFromItemMem113c(m: Memory113c, pItem: number): number {
  const itm = pItem >>> 0
  if (itm === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x67e)
  }
  if (m.u32(itm) !== 4) return 0
  return ITEMS_IsTome113c(m, m.u32((itm + 4) >>> 0)) | 0
}

/**
 * `@va D2Common:0x6FD882F0` (`STATLIST_GetStatsByIdFromList`, custom `eax = pStatList`, `ecx = pOut`,
 * stdcall `(nStatId, nMax)`, `ret 8` -> copied count): picks `pFullStat (+0x48)` when `dwFlags (+0x10)` is
 * negative else `pStat (+0x24)`, finds the first entry with `dwKey >= nStatId << 16` via `0x6FD88220`,
 * then copies consecutive entries whose high word equals `nStatId` while fewer than `nMax` were copied.
 * The DLL's only callers pass a stack buffer, so this port returns the copied `[dwKey, dwValue]` pairs
 * (array length = the DLL's return value) instead of writing them to emulated memory.
 */
export function STATLIST_GetStatsByIdFromList113c(
  m: Memory113c,
  pStatList: number,
  nStatId: number,
  nMax: number,
): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = []
  const list = pStatList >>> 0
  if (list === 0) return out
  const pHdr = (m.u32((list + 0x10) >>> 0) | 0) < 0 ? (list + 0x48) >>> 0 : (list + 0x24) >>> 0
  let idx = STATLIST_FindStatFirstIndexOrLowerBound113c(m, pHdr, (nStatId << 16) >>> 0) | 0
  if (idx < 0) return out
  let pEntry = (m.u32(pHdr) + imul32(idx, 8)) >>> 0
  while (idx < s16(m.u16((pHdr + 4) >>> 0))) {
    const dwKey = m.u32(pEntry)
    if (((dwKey >> 16) & 0xffff) !== (nStatId | 0)) break
    if (out.length >= (nMax | 0)) break
    out.push([dwKey, m.u32((pEntry + 4) >>> 0)])
    idx++
    pEntry = (pEntry + 8) >>> 0
  }
  return out
}

/** Max `dwValue` (signed, floor `0`) over entries whose `wParam` item type matches `pWeapon` (`0x6FD74430`). */
function maxMasteryValueMem113c(
  m: Memory113c,
  pWeapon: number,
  entries: ReadonlyArray<readonly [number, number]>,
): number {
  let best = 0
  for (const [dwKey, dwValue] of entries) {
    if (ITEMS_CheckItemTypeIdMem113c(m, pWeapon, dwKey & 0xffff) !== 0 && (dwValue | 0) > best) {
      best = dwValue | 0
    }
  }
  return best
}

/**
 * `@va D2Common:0x6FD9F200` (`SKILLS_GetThrowingWeaponMasteryBonus`, stdcall
 * `(pUnit, pWeapon, pSkill, nBonusType, pbThrowing)`, `ret 0x14`). Returns `null` where the DLL returns `0`
 * with `*pbThrowing == 0`, else the max bonus (`*pbThrowing = 1`, 0x6FD9F36B); the `pbThrowing` slot is a
 * caller stack local in every DLL call site.
 */
export function SKILLS_GetThrowingWeaponMasteryBonus113c(
  m: Memory113c,
  pUnit: number,
  pWeapon: number,
  pSkillIn: number,
  nBonusType: number,
): number | null {
  let pSkill = pSkillIn >>> 0
  if (pSkill === 0) {
    pSkill = getUsedSkillMem113c(m, pUnit)
    if (pSkill === 0) return null
  }
  const w = pWeapon >>> 0
  if (w === 0 || m.u32(w) !== 4) return null
  const nType = ITEMS_GetItemTypeFromItemMem113c(m, w)
  if (nType < 0) return null
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (nType >= (m.u32((sgpt + 0xbfc) >>> 0) | 0)) return null
  const pItemTypesTxt = (m.u32((sgpt + 0xbf8) >>> 0) + imul32(nType, 0xe4)) >>> 0
  if (pItemTypesTxt === 0) return null
  if (m.u8((pItemTypesTxt + 0x10) >>> 0) === 0) return null
  const pSkillsTxt = m.u32(pSkill)
  if (pSkillsTxt === 0) return null
  const nIType = s16(m.u16((pSkillsTxt + 0x18) >>> 0))
  if (nIType <= 0) return null
  if (ITEMS_CheckItemTypeIdEquivalent113c(m, nIType, 0x30) === 0) return null
  if (m.u8((pSkillsTxt + 0x14) >>> 0) !== 2) return null
  let nStatId: number
  if (nBonusType === 0) nStatId = 0x159
  else if (nBonusType === 1) nStatId = 0x15a
  else if (nBonusType === 2) nStatId = 0x15b
  else return null
  // 0x6FD886E0: `pUnit->pStatListEx (+0x5C)` must be non-null with a negative `dwFlags`, else 0 entries.
  const pStatList = m.u32(((pUnit >>> 0) + 0x5c) >>> 0)
  const entries =
    pStatList !== 0 && (m.u32((pStatList + 0x10) >>> 0) | 0) < 0
      ? STATLIST_GetStatsByIdFromList113c(m, pStatList, nStatId, 0x20)
      : []
  return maxMasteryValueMem113c(m, w, entries)
}

/**
 * `@va D2Common:0x6FD9F640` (`#10804` `SKILLS_GetWeaponMasteryBonus`, stdcall
 * `(pUnit, pWeapon, pSkill, nBonusType)`, `ret 0x10`): `0` for a null unit/weapon; resolves `pSkill` via
 * `0x6FD803A0` when null; returns the `0x6FD9F200` ranged bonus when it applies, else the max melee mastery
 * `0x156/0x157/0x158` value (via `0x6FD882F0`, at most `0x20` entries) whose item type matches the weapon.
 */
function SKILLS_GetWeaponMasteryBonusMem113c(
  m: Memory113c,
  pUnit: number,
  pWeapon: number,
  pSkill: number,
  nBonusType: number,
): number {
  const u = pUnit >>> 0
  const w = pWeapon >>> 0
  if (u === 0 || w === 0) return 0
  const pEffSkill = pSkill !== 0 ? pSkill >>> 0 : getUsedSkillMem113c(m, u)
  const rangedBonus = SKILLS_GetThrowingWeaponMasteryBonus113c(m, u, w, pEffSkill, nBonusType)
  if (rangedBonus !== null) return rangedBonus >>> 0
  let nStatId: number
  if (nBonusType === 0) nStatId = 0x156
  else if (nBonusType === 1) nStatId = 0x157
  else if (nBonusType === 2) nStatId = 0x158
  else return 0
  const pStatList = m.u32((u + 0x5c) >>> 0)
  const entries =
    pStatList !== 0 && (m.u32((pStatList + 0x10) >>> 0) | 0) < 0
      ? STATLIST_GetStatsByIdFromList113c(m, pStatList, nStatId, 0x20)
      : []
  return maxMasteryValueMem113c(m, w, entries) >>> 0
}

/**
 * `@va D2Common:0x6FD81B40` (`D2Common.#11100` `UNITS_GetMonsterActiveWeapon`, 67 bytes,
 * stdcall `[esp+4] = pUnit`, `ret 0x4` -> `D2UnitStrc*` weapon or `0`).
 */
export function UNITS_GetMonsterActiveWeapon113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0 || m.u32(u) !== UNIT_MONSTER) return 0
  const pInventory = m.u32((u + 0x60) >>> 0)
  if (pInventory === 0) return 0
  return INVENTORY_GetActiveWeaponMem113c(m, pInventory)
}

/**
 * `@va D2Common:0x6FDBABE0` (`MISSILE_AddStatsToDamage`, 1365 bytes,
 * custom LTCG `esi = pDmgData`, `[esp+4] = pUnit`, `[esp+8] = nShift`, `ret 0x8`, void).
 */
export function MISSILE_AddStatsToDamage113c(
  m: Memory113c,
  pDmgData: number,
  pUnit: number,
  nShift: number,
): void {
  const dmg = pDmgData >>> 0
  const u = pUnit >>> 0
  const sh = nShift & 0x1f
  const q = (statId: number): number =>
    u !== 0 ? STATLIST_GetUnitStatWithLayer113c(m, u, statId, 0) | 0 : 0
  const addDword = (off: number, delta: number): void => {
    const addr = (dmg + off) >>> 0
    m.setU32(addr, ((m.u32(addr) | 0) + (delta | 0)) >>> 0)
  }
  addDword(0x0c, q(0x30) << sh)
  addDword(0x10, q(0x31) << sh)
  addDword(0x18, q(0x32) << sh)
  addDword(0x1c, q(0x33) << sh)
  addDword(0x20, q(0x34) << sh)
  addDword(0x24, q(0x35) << sh)
  addDword(0x28, q(0x36) << sh)
  addDword(0x2c, q(0x37) << sh)
  addDword(0x30, q(0x38))
  addDword(0x34, q(0x39))
  addDword(0x38, q(0x3a))
  const overridePoisLen = q(0x65)
  if (overridePoisLen > 0) {
    addDword(0x3c, overridePoisLen)
  } else {
    addDword(0x3c, q(0x3b))
    addDword(0x40, q(0x146))
  }
  addDword(0x44, q(0x3c))
  addDword(0x4c, q(0x3e))
  addDword(0x60, q(0x13c))
  addDword(0x64, q(0x13d))
  addDword(0x68, q(0x13b))
}

function rollUnitSeedMod100Mem113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  const lo = BigInt(m.u32((u + 0x20) >>> 0))
  const hi = BigInt(m.u32((u + 0x24) >>> 0))
  const next = lo * 0x6ac690c5n + hi
  const nextLo = Number(next & 0xffffffffn) >>> 0
  const nextHi = Number((next >> 32n) & 0xffffffffn) >>> 0
  m.setU32((u + 0x20) >>> 0, nextLo)
  m.setU32((u + 0x24) >>> 0, nextHi)
  return (nextLo % 100) | 0
}

/**
 * `@va D2Common:0x6FDBB180` (`MISSILE_RollCriticalStrike`, 290 bytes,
 * custom LTCG `eax = pUnit`, `[esp+4] = pWeapon`, `ret 0x4` -> `1` or `0`).
 */
export function MISSILE_RollCriticalStrike113c(
  m: Memory113c,
  pUnit: number,
  pWeapon: number,
): number {
  const u = pUnit >>> 0
  const w = pWeapon >>> 0
  const critPct = u !== 0 ? STATLIST_GetUnitStatWithLayer113c(m, u, 0x151, 0) | 0 : 0
  const r1 = rollUnitSeedMod100Mem113c(m, u)
  if (r1 < critPct) return 1
  if (m.u32((u + 0x5c) >>> 0) !== 0) {
    const deadlyPct = STATLIST_GetUnitStatWithLayer113c(m, u, 0x8d, 0) | 0
    if (deadlyPct !== 0) {
      const r2 = rollUnitSeedMod100Mem113c(m, u)
      if (r2 < deadlyPct) return 1
    }
  }
  if (w !== 0) {
    const masteryCritPct = SKILLS_GetWeaponMasteryBonusMem113c(m, u, w, 0, 2) | 0
    if (masteryCritPct !== 0) {
      const r3 = rollUnitSeedMod100Mem113c(m, u)
      if (r3 < masteryCritPct) return 1
    }
  }
  return 0
}

/**
 * `@va D2Common:0x6FDBB140` (`MISSILE_RollLimitedFromUnitSeed`,
 * custom LTCG `ecx = nMin`, `edx = nMax`, `[esp+4] = _unused`, `[esp+8] = pUnit`, `ret 8` -> `number`).
 *
 * Returns `0` if `pUnit == NULL`; otherwise delegates `(&pUnit->seed (+0x20), nMin, nMax)` to
 * `0x6FD51180` (`SEED_RollLimitedRandomNumberInline113c`).
 */
export function MISSILE_RollLimitedFromUnitSeed113c(
  m: Memory113c,
  nMin: number,
  nMax: number,
  _unused: number,
  pUnit: number,
): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  return SEED_RollLimitedRandomNumberInline113c(m, (u + 0x20) >>> 0, nMin, nMax) >>> 0
}


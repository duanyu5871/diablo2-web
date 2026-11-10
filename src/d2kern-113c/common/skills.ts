/**
 * Diablo II v1.13c `D2Common.dll` skills, item-type equivalence, and unit state-mask pure-leaf functions
 * (`0x6FD72820..0x6FD9E550`, image base `0x6FD50000`).
 *
 * Batch `B003` (14 functions):
 * - `0x6FD72820` `ITEMS_CheckItemTypeIdEquivalent113c` (`#11034`)
 * - `0x6FD87DB0` `STATES_CheckStateMaskOnUnitFast113c` (internal)
 * - `0x6FD9DC30` `SKILLS_CalcDiminishingReturns113c` (`#10115`)
 * - `0x6FD9DDB0` `SKILLS_Calc5BandLinear113c` (internal)
 * - `0x6FD9E180` `SKILLS_GetLeftSkillFromSkillList113c` (`#10136`)
 * - `0x6FD9E1A0` `SKILLS_SetSkillSlotIndex113c` (`#10368`)
 * - `0x6FD9E1C0` `SKILLS_GetSkillsTxtFromSkill113c` (`#10858`)
 * - `0x6FD9E1D0` `SKILLS_GetSkillIdFromSkill113c` (`#10601`)
 * - `0x6FD9E3B0` `SKILLS_GetNextSkill113c` (`#10784`)
 * - `0x6FD9E3D0` `SKILLS_GetFirstSkillFromSkillList113c` (`#10273`)
 * - `0x6FD9E460` `SKILLS_GetSkillSlotIndex113c` (`#10952`)
 * - `0x6FD9E480` `SKILLS_GetHighestLevelSkillFromUnitAndId113c` (internal)
 * - `0x6FD9E520` `SKILLS_GetClassSkillCount113c` (`#11120`)
 * - `0x6FD9E550` `SKILLS_GetClassSkillId113c` (`#10044`)
 *
 * Batch `B012` (13 functions):
 * - `0x6FD9E8C0` `SKILLS_GetClassIdFromSkillId113c` (`#10847`)
 * - `0x6FD9EA00` `SKILLS_EvaluateManaCost256ths113c` (`#10090`)
 * - `0x6FD9EB00` `SKILLS_GetReqLevel113c` (`#11070`)
 * - `0x6FD9F080` `SKILLS_GetSkillById113c` (`#10708`)
 * - `0x6FD9F0C0` `SKILLS_CalcMaxCallback113c` (internal)
 * - `0x6FD9F0D0` `SKILLS_CalcMinCallback113c` (internal)
 * - `0x6FD9F0E0` `SKILLS_GetPassiveState113c` (`#10313`)
 * - `0x6FD9F4C0` `SKILLS_GetBaseSkillLevelById113c` (internal)
 * - `0x6FD9F510` `SKILLS_GetRequiredLevelForNextRank113c` (`#10339`)
 * - `0x6FD9F780` `SKILLS_MapPlayerAnimModeToMonsterMode113c` (`#10568`)
 * - `0x6FDA2E00` `DATATBLS_GetMonSeqTableRecord113c` (`#10194`)
 * - `0x6FDB9DC0` `MISSILE_EvaluateElementalLength113c` (`#10242`)
 * - `0x6FDCF5E0` `UNITS_GetUnitDistanceToCoordinates113c` (`#10080`)
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import { D2CommonAssertError, DATATBLS_CheckMonStats2FlagInline113c } from './inline-helpers.ts'
import { imul32, mulDiv113c, sar32, sdiv32 } from './int-math.ts'
import { STATE_DWORDS_113C, STATES_CheckStateMaskOnUnit113c, STATLIST_FindStatIndex113c } from './statlist.ts'
import {
  D2DynamicPathStrc,
  D2InventoryGridStrc,
  D2InventoryStrc,
  D2ItemStatCostTxt_SIZE,
  D2MissilesTxt,
  D2MissilesTxt_SIZE,
  D2MonStats2Txt_SIZE,
  D2MonStatsTxt,
  D2MonStatsTxt_SIZE,
  D2SkillListStrc,
  D2SkillListStrc_SIZE,
  D2SkillsTxt,
  D2SkillsTxt_SIZE,
  D2SkillStrc,
  D2StaticPathStrc,
  D2StatListExStrc,
  D2UnitStrc,
  type FieldLayout113c,
} from '../mem/layout.generated.ts'

/**
 * `@va D2Common:0x6FD803A0` (`D2Common.#10511` `SKILLS_GetUsedSkill`):
 * Returns `pUnit->pSkills (+0xA8)->pUsedSkill (+0x10)`.
 */
export function SKILLS_GetUsedSkill113c(m: Memory113c, pUnit: number): number {
  if (pUnit === 0) return 0
  const pSkills = m.get(pUnit, D2UnitStrc.pSkills)
  return pSkills !== 0 ? m.u32(pSkills + 0x10) : 0
}

/** `.data` `D2DataTablesStrc* sgptDataTables` at `0x6FDE9E1C`. */
export const SGPT_DATATABLES_VA_113C = 0x6fde9e1c
/** `.rdata` IAT slot for `Fog.dll!gdwBitMasks` (`uint32[32]`) at `0x6FDD90B0`. */
export const GDW_BITMASKS_IAT_VA_113C = 0x6fdd90b0

/** `sgptDataTables` field offsets accessed by `B003` and `B012` functions. */
export const DATATABLES_MONSTATS_TXT_OFF_113C = 0xa78
export const DATATABLES_MONSTATS_COUNT_OFF_113C = 0xa80
export const DATATABLES_MONSTATS2_TXT_OFF_113C = 0xa90
export const DATATABLES_MONSTATS2_COUNT_OFF_113C = 0xa98
export const DATATABLES_MISSILES_TXT_OFF_113C = 0xb64
export const DATATABLES_MISSILES_COUNT_OFF_113C = 0xb6c
export const DATATABLES_SKILLS_TXT_OFF_113C = 0xb98
export const DATATABLES_SKILLS_COUNT_OFF_113C = 0xba0
export const DATATABLES_PLAYER_CLASS_SKILL_COUNT_OFF_113C = 0xba4
export const DATATABLES_MAX_CLASS_SKILLS_STRIDE_OFF_113C = 0xba8
export const DATATABLES_PLAYER_CLASS_SKILL_LIST_OFF_113C = 0xbac
export const DATATABLES_ITEMTYPES_COUNT_OFF_113C = 0xbfc
export const DATATABLES_ITEMTYPES_STRIDE_OFF_113C = 0xc00
export const DATATABLES_ITEMTYPES_EQUIV_MASK_OFF_113C = 0xc04

/** `.data` `sgptDataTables->pMonSeqTable` (`0x6FDA2E14 mov ecx, ds:0x6fdf0a5c`) and count (`0x6FDA2E06 cmp eax, ds:0x6fdf0a60`). */
export const G_MONSEQ_TABLE_VA_113C = 0x6fdf0a5c
export const G_MONSEQ_COUNT_VA_113C = 0x6fdf0a60
export const D2MONSEQ_TABLE_RECORD_SIZE_113C = 12

/** `.rdata` `int32[]` player-mode -> monster-mode mapping at `0x6FDE3088` (`0x6FD9F784 mov eax, [eax*4+0x6fde3088]`). */
export const PLR_TO_MON_MODE_TABLE_VA_113C = 0x6fde3088

function i16(v: number): number {
  return (v << 16) >> 16
}

/**
 * `@va D2Common:0x6FD72820` (`D2Common.#11034`, `ITEMS_CheckItemTypeIdEquivalent`, `__stdcall(nItemType1, nItemType2) -> BOOL`).
 *
 * - Checks `0 <= (nItemType1 | 0) < sgptDataTables->nItemTypesTxtRecordCount (+0xBFC)` (`jl` / `jge`).
 * - Checks `0 <= (nItemType2 | 0) < sgptDataTables->nItemTypesTxtRecordCount (+0xBFC)` (`jl` / `jge`).
 * - Reads `stride = sgptDataTables->nItemTypesIndexStride (+0xC00)` and `pMask = sgptDataTables->pItemTypesEquivMask (+0xC04)`.
 * - Computes `idx = (Math.imul(stride, nItemType1) + (nItemType2 >> 5)) | 0`, reads `word = pMask[idx]`,
 *   and masks it with `gdwBitMasks[nItemType2 & 31]`.
 */
export function ITEMS_CheckItemTypeIdEquivalent113c(
  m: Memory113c,
  nItemType1: number,
  nItemType2: number,
): number {
  const t1 = nItemType1 | 0
  if (t1 < 0) return 0
  const pDataTables = m.u32(SGPT_DATATABLES_VA_113C)
  const nCount = m.u32((pDataTables + DATATABLES_ITEMTYPES_COUNT_OFF_113C) >>> 0) | 0
  if (t1 >= nCount) return 0
  const t2 = nItemType2 | 0
  if (t2 < 0 || t2 >= nCount) return 0

  const nStride = m.u32((pDataTables + DATATABLES_ITEMTYPES_STRIDE_OFF_113C) >>> 0) | 0
  const pMask = m.u32((pDataTables + DATATABLES_ITEMTYPES_EQUIV_MASK_OFF_113C) >>> 0)
  const wordIdx = (Math.imul(nStride, t1) + (t2 >> 5)) | 0
  const maskVal = m.u32((pMask + ((wordIdx << 2) >>> 0)) >>> 0)
  const pBitMasks = m.u32(GDW_BITMASKS_IAT_VA_113C)
  const bitMask = m.u32((pBitMasks + ((t2 & 0x1f) << 2)) >>> 0)
  return (maskVal & bitMask) >>> 0
}

/**
 * `@va D2Common:0x6FD87DB0` (internal, custom reg `eax=pUnit, ecx=nStateId -> uint32`).
 *
 * - If `pUnit === 0` or `pStatListEx = pUnit->pStatListEx (+0x5C) === 0`, returns `0`.
 * - If `(pStatListEx->dwFlags (+0x10) & 0x80000000) === 0` (`test edx, edx; js`), returns `0`.
 * - Reads `pStateFlags = pStatListEx->pStateFlags (+0x58)`, `word = pStateFlags[nStateId >> 5]`,
 *   and returns `(word & gdwBitMasks[nStateId & 31]) >>> 0`.
 */
export function STATES_CheckStateMaskOnUnitFast113c(
  m: Memory113c,
  pUnit: number,
  nStateId: number,
): number {
  if (pUnit === 0) return 0
  const pStatListEx = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pStatListEx === 0) return 0
  const dwFlags = m.get(pStatListEx, D2StatListExStrc.dwFlags)
  if ((dwFlags | 0) >= 0) return 0

  const st = nStateId | 0
  const pStateFlags = m.get(pStatListEx, D2StatListExStrc.pStateFlags)
  const word = m.u32((pStateFlags + (((st >> 5) << 2) >>> 0)) >>> 0)
  const pBitMasks = m.u32(GDW_BITMASKS_IAT_VA_113C)
  const bitMask = m.u32((pBitMasks + ((st & 0x1f) << 2)) >>> 0)
  return (word & bitMask) >>> 0
}

/**
 * `@va D2Common:0x6FD9DC30` (`D2Common.#10115`, `SKILLS_CalcDiminishingReturns`, `__stdcall(nLevel, nMin, nMax) -> int`).
 *
 * - Computes `factor = sdiv32(Math.imul(nLevel | 0, 110), (nLevel + 6) | 0)`.
 * - Computes `res = (sdiv32(Math.imul(factor, (nMax - nMin) | 0), 100) + nMin) | 0`.
 * - If `(res | 0) > (nMax | 0)` (`cmp eax, esi; jle`), clamps `res = nMax | 0`.
 */
export function SKILLS_CalcDiminishingReturns113c(
  _m: Memory113c,
  nLevel: number,
  nMin: number,
  nMax: number,
): number {
  const lvl = nLevel | 0
  const p1 = nMin | 0
  const p2 = nMax | 0
  const factor = sdiv32(Math.imul(lvl, 110), (lvl + 6) | 0)
  const scaled = Math.imul(factor, (p2 - p1) | 0)
  let res = (sdiv32(scaled, 100) + p1) | 0
  if (res > p2) {
    res = p2
  }
  return res >>> 0
}

/**
 * `@va D2Common:0x6FD9DDB0` (internal, custom reg `eax=nLevel, ecx=pCoeffs -> int`).
 *
 * Evaluates a 5-band piecewise-linear progression from `pCoeffs` (`int32[5]` at `+0x00..+0x10`):
 * - `nLevel <= 1 || pCoeffs == 0`: `0`
 * - `1 < nLevel <= 8`: `(nLevel - 1) * c0`
 * - `8 < nLevel <= 16`: `7 * c0 + (nLevel - 8) * c1`
 * - `16 < nLevel <= 22`: `7 * c0 + 8 * c1 + (nLevel - 16) * c2`
 * - `22 < nLevel <= 28`: `7 * c0 + 8 * c1 + 6 * c2 + (nLevel - 22) * c3`
 * - `nLevel > 28`: `7 * c0 + 8 * c1 + 6 * (c2 + c3) + (nLevel - 28) * c4`
 */
export function SKILLS_Calc5BandLinear113c(
  m: Memory113c,
  nLevel: number,
  pCoeffs: number,
): number {
  const lvl = nLevel | 0
  if (lvl <= 1 || pCoeffs === 0) return 0
  const c0 = m.u32(pCoeffs) | 0
  if (lvl <= 8) {
    return Math.imul((lvl - 1) | 0, c0) >>> 0
  }
  const c1 = m.u32((pCoeffs + 4) >>> 0) | 0
  const t1 = Math.imul(7, c0)
  if (lvl <= 16) {
    return (t1 + Math.imul((lvl - 8) | 0, c1)) >>> 0
  }
  const c2 = m.u32((pCoeffs + 8) >>> 0) | 0
  const t2 = (t1 + (c1 << 3)) | 0
  if (lvl <= 22) {
    return (t2 + Math.imul((lvl - 16) | 0, c2)) >>> 0
  }
  const c3 = m.u32((pCoeffs + 12) >>> 0) | 0
  if (lvl <= 28) {
    const t3 = (t2 + Math.imul(6, c2)) | 0
    return (t3 + Math.imul((lvl - 22) | 0, c3)) >>> 0
  }
  const c4 = m.u32((pCoeffs + 16) >>> 0) | 0
  const t4 = (t2 + Math.imul(6, (c2 + c3) | 0)) | 0
  return (t4 + Math.imul((lvl - 28) | 0, c4)) >>> 0
}

/**
 * `@va D2Common:0x6FD9E180` (`D2Common.#10136`, `SKILLS_GetLeftSkillFromSkillList`, `__stdcall(pSkillList) -> D2SkillStrc*`).
 */
export function SKILLS_GetLeftSkillFromSkillList113c(m: Memory113c, pSkillList: number): number {
  if (pSkillList === 0) return 0
  return m.get(pSkillList, D2SkillListStrc.pLeftSkill)
}

/**
 * `@va D2Common:0x6FD9E1A0` (`D2Common.#10368`, `SKILLS_SetSkillSlotIndex`, `__stdcall(pSkill, nSlotIndex) -> void`).
 *
 * Writes `pSkill->nSlotIndex (+0x08) = nSlotIndex` iff `pSkill !== 0` and `0 <= (nSlotIndex | 0) <= 32` (`0x20`).
 */
export function SKILLS_SetSkillSlotIndex113c(
  m: Memory113c,
  pSkill: number,
  nSlotIndex: number,
): void {
  if (pSkill === 0) return
  const slot = nSlotIndex | 0
  if (slot < 0 || slot > 0x20) return
  m.set(pSkill, D2SkillStrc.nSlotIndex, slot >>> 0)
}

/**
 * `@va D2Common:0x6FD9E1C0` (`D2Common.#10858`, `SKILLS_GetSkillsTxtFromSkill`, `__fastcall(ecx=pSkill) -> D2SkillsTxt*`).
 */
export function SKILLS_GetSkillsTxtFromSkill113c(m: Memory113c, pSkill: number): number {
  if (pSkill === 0) return 0
  return m.get(pSkill, D2SkillStrc.pSkillsTxt)
}

/**
 * `@va D2Common:0x6FD9E1D0` (`D2Common.#10601`, `SKILLS_GetSkillIdFromSkill`, `__stdcall(pSkill, pFile, nLine) -> int`).
 *
 * - If `pSkill === 0`, returns `0` (`test eax, eax; jne; ret 0xc`).
 * - Otherwise reads `pSkillsTxt = pSkill->pSkillsTxt (+0x00)` and returns sign-extended `(int16)pSkillsTxt->wSkillId (+0x00)`.
 */
export function SKILLS_GetSkillIdFromSkill113c(
  m: Memory113c,
  pSkill: number,
  _pFile = 0,
  _nLine = 0,
): number {
  if (pSkill === 0) return 0
  const pSkillsTxt = m.get(pSkill, D2SkillStrc.pSkillsTxt)
  return i16(m.get(pSkillsTxt, D2SkillsTxt.wSkillId)) >>> 0
}

/**
 * `@va D2Common:0x6FD9E3B0` (`D2Common.#10784`, `SKILLS_GetNextSkill`, `__stdcall(pSkill) -> D2SkillStrc*`).
 */
export function SKILLS_GetNextSkill113c(m: Memory113c, pSkill: number): number {
  if (pSkill === 0) return 0
  return m.get(pSkill, D2SkillStrc.pNextSkill)
}

/**
 * `@va D2Common:0x6FD9E3D0` (`D2Common.#10273`, `SKILLS_GetFirstSkillFromSkillList`, `__stdcall(pSkillList) -> D2SkillStrc*`).
 */
export function SKILLS_GetFirstSkillFromSkillList113c(m: Memory113c, pSkillList: number): number {
  if (pSkillList === 0) return 0
  return m.get(pSkillList, D2SkillListStrc.pFirstSkill)
}

/**
 * `@va D2Common:0x6FD9E460` (`D2Common.#10952`, `SKILLS_GetSkillSlotIndex`, `__stdcall(pUnit, pSkill) -> int`).
 *
 * - If `pUnit === 0` or `pSkill === 0`, returns `0`.
 * - Otherwise returns `pSkill->nSlotIndex (+0x08)`.
 */
export function SKILLS_GetSkillSlotIndex113c(
  m: Memory113c,
  pUnit: number,
  pSkill: number,
): number {
  if (pUnit === 0 || pSkill === 0) return 0
  return m.get(pSkill, D2SkillStrc.nSlotIndex)
}

/**
 * `@va D2Common:0x6FD9E480` (internal, custom reg `eax=pUnit, esi=nSkillId -> D2SkillStrc*`).
 *
 * Walks `pUnit->pSkills (+0xA8)->pFirstSkill (+0x04)` for skills with `(int16)pSkillsTxt->wSkillId == nSkillId`
 * and `dwFlags (+0x3C) == 0`:
 * - First matching skill becomes `pBestSkill`.
 * - Any matching skill with `nOwnerItemGuid (+0x34) == -1` (`0xFFFFFFFF`) replaces `pBestSkill`.
 * - Otherwise, if `pBestSkill->nOwnerItemGuid != -1`, a candidate replaces `pBestSkill` iff
 *   `(candidate->nSkillLevel (+0x28) | 0) > (pBestSkill->nSkillLevel (+0x28) | 0)`.
 */
export function SKILLS_GetHighestLevelSkillFromUnitAndId113c(
  m: Memory113c,
  pUnit: number,
  nSkillId: number,
): number {
  const pSkills = m.get(pUnit, D2UnitStrc.pSkills)
  if (pSkills === 0) return 0
  let pCur = m.get(pSkills, D2SkillListStrc.pFirstSkill)
  if (pCur === 0) return 0

  const targetId = nSkillId | 0
  let pBest = 0
  while (pCur !== 0) {
    const pSkillsTxt = m.get(pCur, D2SkillStrc.pSkillsTxt)
    const wSkillId = i16(m.get(pSkillsTxt, D2SkillsTxt.wSkillId))
    if (wSkillId === targetId && m.get(pCur, D2SkillStrc.dwFlags) === 0) {
      if (pBest === 0) {
        pBest = pCur
      } else if ((m.get(pCur, D2SkillStrc.nOwnerItemGuid) | 0) === -1) {
        pBest = pCur
      } else if ((m.get(pBest, D2SkillStrc.nOwnerItemGuid) | 0) !== -1) {
        const curLvl = m.get(pCur, D2SkillStrc.nSkillLevel) | 0
        const bestLvl = m.get(pBest, D2SkillStrc.nSkillLevel) | 0
        if (curLvl > bestLvl) {
          pBest = pCur
        }
      }
    }
    pCur = m.get(pCur, D2SkillStrc.pNextSkill)
  }
  return pBest
}

/**
 * `@va D2Common:0x6FD9E520` (`D2Common.#11120`, `SKILLS_GetClassSkillCount`, `__stdcall(nCharClass) -> int`).
 *
 * Returns `sgptDataTables->pPlayerClassSkillCount (+0xBA4)[nCharClass]` if `0 <= (nCharClass | 0) < 7`, else `0`.
 */
export function SKILLS_GetClassSkillCount113c(m: Memory113c, nCharClass: number): number {
  const cls = nCharClass | 0
  if (cls < 0 || cls >= 7) return 0
  const pDataTables = m.u32(SGPT_DATATABLES_VA_113C)
  const pCounts = m.u32((pDataTables + DATATABLES_PLAYER_CLASS_SKILL_COUNT_OFF_113C) >>> 0)
  return m.u32((pCounts + (cls << 2)) >>> 0)
}

/**
 * `@va D2Common:0x6FD9E550` (`D2Common.#10044`, `SKILLS_GetClassSkillId`, `__stdcall(nCharClass, nIndex) -> int`).
 *
 * - If `(nCharClass | 0) < 0` or `(nCharClass | 0) >= 7` or `(nIndex | 0) < 0`, returns `-1` (`0xFFFFFFFF`).
 * - Reads `nCount = sgptDataTables->pPlayerClassSkillCount (+0xBA4)[nCharClass]`; if `(nIndex | 0) >= (nCount | 0)`, returns `-1`.
 * - Reads `nStride = sgptDataTables->nMaxClassSkillsStride (+0xBA8)` and `pList = sgptDataTables->pPlayerClassSkillList (+0xBAC)`,
 *   and returns sign-extended `(int16)pList[nCharClass * nStride + nIndex]`.
 */
export function SKILLS_GetClassSkillId113c(
  m: Memory113c,
  nCharClass: number,
  nIndex: number,
): number {
  const cls = nCharClass | 0
  if (cls < 0 || cls >= 7) return 0xffffffff
  const idx = nIndex | 0
  if (idx < 0) return 0xffffffff
  const pDataTables = m.u32(SGPT_DATATABLES_VA_113C)
  const pCounts = m.u32((pDataTables + DATATABLES_PLAYER_CLASS_SKILL_COUNT_OFF_113C) >>> 0)
  const nCount = m.u32((pCounts + (cls << 2)) >>> 0) | 0
  if (idx >= nCount) return 0xffffffff
  const nStride = m.u32((pDataTables + DATATABLES_MAX_CLASS_SKILLS_STRIDE_OFF_113C) >>> 0) | 0
  const pList = m.u32((pDataTables + DATATABLES_PLAYER_CLASS_SKILL_LIST_OFF_113C) >>> 0)
  const elemIdx = (Math.imul(nStride, cls) + idx) | 0
  return i16(m.u16((pList + ((elemIdx << 1) >>> 0)) >>> 0)) >>> 0
}

function getSkillsTxtRecord(m: Memory113c, nSkillId: number): number {
  const id = nSkillId | 0
  if (id < 0) return 0
  const pDataTables = m.u32(SGPT_DATATABLES_VA_113C)
  const nCount = m.u32((pDataTables + DATATABLES_SKILLS_COUNT_OFF_113C) >>> 0) | 0
  if (id >= nCount) return 0
  const pBase = m.u32((pDataTables + DATATABLES_SKILLS_TXT_OFF_113C) >>> 0)
  const pRec = (pBase + Math.imul(id, D2SkillsTxt_SIZE)) >>> 0
  return pRec
}

/**
 * `@va D2Common:0x6FD9E8C0` (`D2Common.#10847`, `SKILLS_GetClassIdFromSkillId`, `__stdcall(nSkillId) -> int`, `ret 4`).
 *
 * Looks up `pSkillsTxt` for `nSkillId`; if null or `(int8)pSkillsTxt->nCharClass (+0x0C) < 0`, returns `7`,
 * else returns `(int8)pSkillsTxt->nCharClass`.
 */
export function SKILLS_GetClassIdFromSkillId113c(m: Memory113c, nSkillId: number): number {
  const pRec = getSkillsTxtRecord(m, nSkillId)
  if (pRec === 0) return 7
  const c = (m.get(pRec, D2SkillsTxt.nCharClass) << 24) >> 24
  return (c < 0 ? 7 : c) >>> 0
}

/**
 * `@va D2Common:0x6FD9EA00` (`D2Common.#10090`, `SKILLS_EvaluateManaCost256ths`,
 * `__stdcall(nSkillId, nSkillLevel) -> int`, `ret 8`).
 *
 * Computes `(((nSkillLevel - 1) * (int16)wLvlMana (+0x18C) + (int16)wMana (+0x18A)) << (nManaShift (+0x188) & 0x1F))`.
 */
export function SKILLS_EvaluateManaCost256ths113c(
  m: Memory113c,
  nSkillId: number,
  nSkillLevel: number,
): number {
  const pRec = getSkillsTxtRecord(m, nSkillId)
  if (pRec === 0) return 0
  const wLvlMana = i16(m.get(pRec, D2SkillsTxt.wLvlMana))
  const wMana = i16(m.get(pRec, D2SkillsTxt.wMana))
  const nManaShift = m.get(pRec, D2SkillsTxt.nManaShift) & 0x1f
  const base = (Math.imul(wLvlMana, ((nSkillLevel | 0) - 1) | 0) + wMana) | 0
  return (base << nManaShift) >>> 0
}

/**
 * `@va D2Common:0x6FD9EB00` (`D2Common.#11070`, `SKILLS_GetReqLevel`, `__stdcall(nSkillId) -> int`, `ret 4`).
 *
 * Returns `(int16)pSkillsTxt->wReqLevel (+0x174)` if `nSkillId` is valid, else `0x7FFFFFFF`.
 */
export function SKILLS_GetReqLevel113c(m: Memory113c, nSkillId: number): number {
  const pRec = getSkillsTxtRecord(m, nSkillId)
  if (pRec === 0) return 0x7fffffff
  return i16(m.get(pRec, D2SkillsTxt.wReqLevel)) >>> 0
}

/**
 * `@va D2Common:0x6FD9F080` (`D2Common.#10708`, `SKILLS_GetSkillById`,
 * custom `__fastcall(ecx=pUnit, edx=nSkillId, [esp+4]=nOwnerItemGuid) -> D2SkillStrc*`, `ret 4`).
 *
 * Walks `pUnit->pSkills (+0xA8)->pFirstSkill (+0x04)` for the first node matching
 * `(int16)pSkill->pSkillsTxt->wSkillId === nSkillId` and `pSkill->nOwnerItemGuid (+0x34) === nOwnerItemGuid`.
 */
export function SKILLS_GetSkillById113c(
  m: Memory113c,
  pUnit: number,
  nSkillId: number,
  nOwnerItemGuid: number,
): number {
  const pSkills = m.get(pUnit, D2UnitStrc.pSkills)
  if (pSkills === 0) return 0
  let pCur = m.get(pSkills, D2SkillListStrc.pFirstSkill)
  const targetId = nSkillId | 0
  const targetGuid = nOwnerItemGuid >>> 0
  while (pCur !== 0) {
    const pSkillsTxt = m.get(pCur, D2SkillStrc.pSkillsTxt)
    if (
      i16(m.get(pSkillsTxt, D2SkillsTxt.wSkillId)) === targetId &&
      m.get(pCur, D2SkillStrc.nOwnerItemGuid) === targetGuid
    ) {
      return pCur
    }
    pCur = m.get(pCur, D2SkillStrc.pNextSkill)
  }
  return 0
}

/**
 * `@va D2Common:0x6FD9F0C0` (internal, `ecx=a, edx=b, [esp+4]=arg0, [esp+8]=arg1 -> int`, `ret 8`).
 *
 * Signed max callback (`mov eax, ecx; cmp eax, edx; jg +2; mov eax, edx; ret 8`).
 */
export function SKILLS_CalcMaxCallback113c(
  _m: Memory113c,
  a: number,
  b: number,
  _arg0 = 0,
  _arg1 = 0,
): number {
  const x = a | 0
  const y = b | 0
  return (x > y ? x : y) >>> 0
}

/**
 * `@va D2Common:0x6FD9F0D0` (internal, `ecx=a, edx=b, [esp+4]=arg0, [esp+8]=arg1 -> int`, `ret 8`).
 *
 * Signed min callback (`mov eax, ecx; cmp eax, edx; jl +2; mov eax, edx; ret 8`).
 */
export function SKILLS_CalcMinCallback113c(
  _m: Memory113c,
  a: number,
  b: number,
  _arg0 = 0,
  _arg1 = 0,
): number {
  const x = a | 0
  const y = b | 0
  return (x < y ? x : y) >>> 0
}

/**
 * `@va D2Common:0x6FD9F0E0` (`D2Common.#10313`, `SKILLS_GetPassiveState`, `__stdcall(nSkillId) -> int`, `ret 4`).
 *
 * Returns `(int16)pSkillsTxt->wPassiveState (+0x94)` if positive (`jg`), else `0`.
 */
export function SKILLS_GetPassiveState113c(m: Memory113c, nSkillId: number): number {
  const pRec = getSkillsTxtRecord(m, nSkillId)
  if (pRec === 0) return 0
  const st = i16(m.get(pRec, D2SkillsTxt.wPassiveState))
  return st > 0 ? st >>> 0 : 0
}

/**
 * `@va D2Common:0x6FD9F4C0` (internal, custom reg `eax=pUnit, edx=nSkillId -> int`, `ret`).
 *
 * Returns `pSkill->nSkillLevel (+0x28)` for the unit's base skill (`nOwnerItemGuid (+0x34) == -1`) matching `nSkillId`,
 * or `0` if not found.
 */
export function SKILLS_GetBaseSkillLevelById113c(
  m: Memory113c,
  pUnit: number,
  nSkillId: number,
): number {
  if (pUnit === 0) return 0
  const pSkills = m.get(pUnit, D2UnitStrc.pSkills)
  if (pSkills === 0) return 0
  let pCur = m.get(pSkills, D2SkillListStrc.pFirstSkill)
  const targetId = nSkillId | 0
  while (pCur !== 0) {
    const pSkillsTxt = m.get(pCur, D2SkillStrc.pSkillsTxt)
    if (
      i16(m.get(pSkillsTxt, D2SkillsTxt.wSkillId)) === targetId &&
      (m.get(pCur, D2SkillStrc.nOwnerItemGuid) | 0) === -1
    ) {
      return m.get(pCur, D2SkillStrc.nSkillLevel)
    }
    pCur = m.get(pCur, D2SkillStrc.pNextSkill)
  }
  return 0
}

/**
 * `@va D2Common:0x6FD9F510` (`D2Common.#10339`, `SKILLS_GetRequiredLevelForNextRank`,
 * `__stdcall(pUnit, nSkillId) -> int`, `ret 8`).
 *
 * Returns `(int16)pSkillsTxt->wReqLevel (+0x174) + baseSkillLevel`, or `0x7FFFFFFF` if `nSkillId` is invalid.
 */
export function SKILLS_GetRequiredLevelForNextRank113c(
  m: Memory113c,
  pUnit: number,
  nSkillId: number,
): number {
  const pRec = getSkillsTxtRecord(m, nSkillId)
  if (pRec === 0) return 0x7fffffff
  let reqLvl = i16(m.get(pRec, D2SkillsTxt.wReqLevel))
  const pSkills = m.get(pUnit, D2UnitStrc.pSkills)
  if (pSkills !== 0) {
    let pCur = m.get(pSkills, D2SkillListStrc.pFirstSkill)
    const targetId = nSkillId | 0
    while (pCur !== 0) {
      const pSkillsTxt = m.get(pCur, D2SkillStrc.pSkillsTxt)
      if (
        i16(m.get(pSkillsTxt, D2SkillsTxt.wSkillId)) === targetId &&
        (m.get(pCur, D2SkillStrc.nOwnerItemGuid) | 0) === -1
      ) {
        reqLvl = (reqLvl + (m.get(pCur, D2SkillStrc.nSkillLevel) | 0)) | 0
        break
      }
      pCur = m.get(pCur, D2SkillStrc.pNextSkill)
    }
  }
  return reqLvl >>> 0
}

/**
 * `@va D2Common:0x6FD9F780` (`D2Common.#10568`, `SKILLS_MapPlayerAnimModeToMonsterMode`,
 * `__stdcall(nPlrMode, nMonClassId) -> int`, `ret 8`).
 */
export function SKILLS_MapPlayerAnimModeToMonsterMode113c(
  m: Memory113c,
  nPlrMode: number,
  nMonClassId: number,
): number {
  let mode = m.u32((PLR_TO_MON_MODE_TABLE_VA_113C + Math.imul(nPlrMode | 0, 4)) >>> 0) | 0
  const pDataTables = m.u32(SGPT_DATATABLES_VA_113C)
  const monId = nMonClassId | 0
  const pBitMasks = m.u32(GDW_BITMASKS_IAT_VA_113C)

  while (true) {
    const nMonCount = m.u32((pDataTables + DATATABLES_MONSTATS_COUNT_OFF_113C) >>> 0) | 0
    if (monId >= 0 && monId < nMonCount) {
      const pMonBase = m.u32((pDataTables + DATATABLES_MONSTATS_TXT_OFF_113C) >>> 0)
      const pMonStats = (pMonBase + Math.imul(monId, D2MonStatsTxt_SIZE)) >>> 0
      const wMonStatsEx = i16(m.get(pMonStats, D2MonStatsTxt.wMonStatsEx))
      const nMon2Count = m.u32((pDataTables + DATATABLES_MONSTATS2_COUNT_OFF_113C) >>> 0) | 0
      if (wMonStatsEx >= 0 && wMonStatsEx < nMon2Count) {
        const pMon2Base = m.u32((pDataTables + DATATABLES_MONSTATS2_TXT_OFF_113C) >>> 0)
        const pMonStats2 = (pMon2Base + Math.imul(wMonStatsEx, D2MonStats2Txt_SIZE)) >>> 0
        if (pMonStats2 !== 0) {
          const byteVal = m.u8((pMonStats2 + 0xf0 + (mode >> 3)) >>> 0)
          const bitMask = m.u32((pBitMasks + ((mode & 7) << 2)) >>> 0)
          if ((byteVal & bitMask) !== 0) {
            return mode >>> 0
          }
        }
      }
    }

    if (mode === 1) return 1
    if (mode === 15) {
      mode = 2
    } else if (mode === 9 || mode === 10 || mode === 11) {
      mode = 8
    } else if (mode === 6) {
      mode = 3
    } else if (mode === 5 || mode === 7) {
      mode = 4
    } else {
      mode = 1
    }
  }
}

/**
 * `@va D2Common:0x6FDA2E00` (`D2Common.#10194`, `DATATBLS_GetMonSeqTableRecord`,
 * `__stdcall(nSeqId) -> D2MonSeqTableStrc*`, `ret 4`).
 */
export function DATATBLS_GetMonSeqTableRecord113c(m: Memory113c, nSeqId: number): number {
  const id = nSeqId | 0
  if (id < 0) return 0
  const nCount = m.u32(G_MONSEQ_COUNT_VA_113C) | 0
  if (id >= nCount) return 0
  const pBase = m.u32(G_MONSEQ_TABLE_VA_113C)
  return (pBase + Math.imul(id, D2MONSEQ_TABLE_RECORD_SIZE_113C)) >>> 0
}

/**
 * `@va D2Common:0x6FDB9DC0` (`D2Common.#10242`, `MISSILE_EvaluateElementalLength`,
 * `__stdcall(pOwner, pUnit, nMissileId, nLevel) -> int`, `ret 0x10`).
 */
export function MISSILE_EvaluateElementalLength113c(
  m: Memory113c,
  _pOwner: number,
  _pUnit: number,
  nMissileId: number,
  nLevel: number,
): number {
  const id = nMissileId | 0
  if (id < 0) return 0
  const pDataTables = m.u32(SGPT_DATATABLES_VA_113C)
  const nCount = m.u32((pDataTables + DATATABLES_MISSILES_COUNT_OFF_113C) >>> 0) | 0
  if (id >= nCount) return 0
  const pBase = m.u32((pDataTables + DATATABLES_MISSILES_TXT_OFF_113C) >>> 0)
  const pRec = (pBase + Math.imul(id, D2MissilesTxt_SIZE)) >>> 0
  if (pRec === 0) return 0

  const eLen = m.get(pRec, D2MissilesTxt.dwELen) | 0
  const eLev1 = m.get(pRec, D2MissilesTxt.dwELevLen1) | 0
  const eLev2 = m.get(pRec, D2MissilesTxt.dwELevLen2) | 0
  const eLev3 = m.get(pRec, D2MissilesTxt.dwELevLen3) | 0
  const lvl = nLevel | 0

  if (lvl <= 0) return eLen >>> 0
  if (lvl <= 8) return (eLen + Math.imul((lvl - 1) | 0, eLev1)) >>> 0
  const t1 = Math.imul(7, eLev1)
  if (lvl <= 16) return (eLen + t1 + Math.imul((lvl - 8) | 0, eLev2)) >>> 0
  const t2 = (t1 + (eLev2 << 3)) | 0
  return (eLen + t2 + Math.imul((lvl - 16) | 0, eLev3)) >>> 0
}

/**
 * `@va D2Common:0x6FDCF5E0` (`D2Common.#10080`, `UNITS_GetUnitDistanceToCoordinates` / `UNITS_GetDistanceToCoordinates`,
 * `__stdcall(pUnit, nTargetX, nTargetY) -> int`, `ret 0xC`).
 */
export function UNITS_GetUnitDistanceToCoordinates113c(
  m: Memory113c,
  pUnit: number,
  nTargetX: number,
  nTargetY: number,
): number {
  const unitType = m.get(pUnit, D2UnitStrc.dwUnitType) | 0
  const pPath = m.get(pUnit, D2UnitStrc.pPath)
  let unitX = 0
  let unitY = 0

  if (unitType === 2 || (unitType > 3 && unitType <= 5)) {
    unitX = m.get(pPath, D2StaticPathStrc.nPosX) | 0
    unitY = m.get(pPath, D2StaticPathStrc.nPosY) | 0
  } else if (pPath !== 0) {
    unitX = m.get(pPath, D2DynamicPathStrc.wPosX)
    unitY = m.get(pPath, D2DynamicPathStrc.wPosY)
  }

  let dx = ((nTargetX | 0) - unitX) | 0
  if (dx < 0) dx = -dx | 0
  if (dx < 0) dx = 0

  let dy = ((nTargetY | 0) - unitY) | 0
  if (dy < 0) dy = -dy | 0
  if (dy < 0) dy = 0

  const sum = (dx > dy ? dy + (dx << 1) : dx + (dy << 1)) | 0
  return sdiv32(sum, 2) >>> 0
}

// ============================================================================
// K1r2 Iteration 7 Lane B — Batch B036 (19 D2Common hostImport functions)
// ============================================================================

/**
 * `@va D2Common:0x6FD9DD30` (`D2Common.#10252` `SKILLS_SetCharges`,
 * stdcall `[esp+4] = pSkill`, `[esp+8] = nCharges`, `ret 8`, void).
 */
export function SKILLS_SetCharges113c(m: Memory113c, pSkill: number, nCharges: number): void {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xdae)
  }
  m.set(ptr, D2SkillStrc.nQuantity, nCharges >>> 0)
}

/**
 * `@va D2Common:0x6FD9DD70` (`D2Common.#10353` `SKILLS_GetCharges`,
 * stdcall `[esp+4] = pSkill`, `ret 4` -> `int32_t`).
 */
export function SKILLS_GetCharges113c(m: Memory113c, pSkill: number): number {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xda5)
  }
  return m.get(ptr, D2SkillStrc.nQuantity)
}

/**
 * `@va D2Common:0x6FD9DE60` (`D2Common.#10137` `SKILLS_SetParam0C`,
 * stdcall `[esp+4] = pSkill`, `[esp+8] = nVal`, `ret 8`, void).
 */
export function SKILLS_SetParam0C113c(m: Memory113c, pSkill: number, nVal: number): void {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa9b)
  }
  m.set(ptr, D2SkillStrc.dwParam0C, nVal >>> 0)
}

/**
 * `@va D2Common:0x6FD9DEA0` (`D2Common.#11031` `SKILLS_SetParam4`,
 * stdcall `[esp+4] = pSkill`, `[esp+8] = nVal`, `ret 8`, void).
 */
export function SKILLS_SetParam4113c(m: Memory113c, pSkill: number, nVal: number): void {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa92)
  }
  m.set(ptr, D2SkillStrc.dwParam4, nVal >>> 0)
}

/**
 * `@va D2Common:0x6FD9DEE0` (`D2Common.#10748` `SKILLS_SetParam3`,
 * stdcall `[esp+4] = pSkill`, `[esp+8] = nVal`, `ret 8`, void).
 */
export function SKILLS_SetParam3113c(m: Memory113c, pSkill: number, nVal: number): void {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa89)
  }
  m.set(ptr, D2SkillStrc.dwParam3, nVal >>> 0)
}

/**
 * `@va D2Common:0x6FD9DF20` (`D2Common.#10554` `SKILLS_SetParam2`,
 * stdcall `[esp+4] = pSkill`, `[esp+8] = nVal`, `ret 8`, void).
 */
export function SKILLS_SetParam2113c(m: Memory113c, pSkill: number, nVal: number): void {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa80)
  }
  m.set(ptr, D2SkillStrc.dwParam2, nVal >>> 0)
}

/**
 * `@va D2Common:0x6FD9DF60` (`D2Common.#10243` `SKILLS_SetParam1`,
 * stdcall `[esp+4] = pSkill`, `[esp+8] = nVal`, `ret 8`, void).
 */
export function SKILLS_SetParam1113c(m: Memory113c, pSkill: number, nVal: number): void {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa77)
  }
  m.set(ptr, D2SkillStrc.dwParam1, nVal >>> 0)
}

/**
 * `@va D2Common:0x6FD9DFA0` (`D2Common.#10631` `SKILLS_GetParam4`,
 * stdcall `[esp+4] = pSkill`, `ret 4` -> `int32_t`).
 */
export function SKILLS_GetParam4113c(m: Memory113c, pSkill: number): number {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa6e)
  }
  return m.get(ptr, D2SkillStrc.dwParam4)
}

/**
 * `@va D2Common:0x6FD9DFD0` (`D2Common.#10179` `SKILLS_GetParam3`,
 * stdcall `[esp+4] = pSkill`, `ret 4` -> `int32_t`).
 */
export function SKILLS_GetParam3113c(m: Memory113c, pSkill: number): number {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa65)
  }
  return m.get(ptr, D2SkillStrc.dwParam3)
}

/**
 * `@va D2Common:0x6FD9E000` (`D2Common.#10649` `SKILLS_GetParam2`,
 * stdcall `[esp+4] = pSkill`, `ret 4` -> `int32_t`).
 */
export function SKILLS_GetParam2113c(m: Memory113c, pSkill: number): number {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa5c)
  }
  return m.get(ptr, D2SkillStrc.dwParam2)
}

/**
 * `@va D2Common:0x6FD9E030` (`D2Common.#10980` `SKILLS_GetParam1`,
 * stdcall `[esp+4] = pSkill`, `ret 4` -> `int32_t`).
 */
export function SKILLS_GetParam1113c(m: Memory113c, pSkill: number): number {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xa53)
  }
  return m.get(ptr, D2SkillStrc.dwParam1)
}

/**
 * `@va D2Common:0x6FD9E240` (`D2Common.#10537` `SKILLS_GetItemSkillInfo`,
 * stdcall `[esp+4] = pSkill`, `[esp+8] = pOutItemGuid`, `[esp+0xC] = pOutSkillId`,
 * `[esp+0x10] = pOutLevel`, `[esp+0x14] = pOutCharges`, `ret 0x14` -> `BOOL`).
 */
export function SKILLS_GetItemSkillInfo113c(
  m: Memory113c,
  pSkill: number,
  pOutItemGuid: number,
  pOutSkillId: number,
  pOutLevel: number,
  pOutCharges: number,
): number {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x642)
  }
  const ownerGuid = m.get(ptr, D2SkillStrc.nOwnerItemGuid)
  if (ownerGuid === 0xffffffff) {
    return 0
  }
  const outGuid = pOutItemGuid >>> 0
  if (outGuid !== 0) {
    m.setU32(outGuid, ownerGuid)
  }
  const outSkillId = pOutSkillId >>> 0
  if (outSkillId !== 0) {
    const pSkillsTxt = m.get(ptr, D2SkillStrc.pSkillsTxt)
    const skillId = i16(m.get(pSkillsTxt, D2SkillsTxt.wSkillId))
    m.setU32(outSkillId, skillId >>> 0)
  }
  const outLevel = pOutLevel >>> 0
  if (outLevel !== 0) {
    m.setU32(outLevel, m.get(ptr, D2SkillStrc.nSkillLevel))
  }
  const outCharges = pOutCharges >>> 0
  if (outCharges !== 0) {
    m.setU32(outCharges, m.get(ptr, D2SkillStrc.nCharges))
  }
  return 1
}

/**
 * `@va D2Common:0x6FD9E2B0` (`D2Common.#10304` `SKILLS_GetOwnerItemGuid`,
 * stdcall `[esp+4] = pSkill`, `ret 4` -> `uint32_t`).
 */
export function SKILLS_GetOwnerItemGuid113c(m: Memory113c, pSkill: number): number {
  const ptr = pSkill >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x638)
  }
  return m.get(ptr, D2SkillStrc.nOwnerItemGuid)
}

/**
 * `@va D2Common:0x6FD9E3F0` (`D2Common.#10856` `SKILLS_AllocSkillList`,
 * stdcall `[esp+4] = pMemPool`, `ret 4` -> `D2SkillListStrc*`).
 */
export function SKILLS_AllocSkillList113c(m: Memory113c, pMemPool: number): number {
  const pList = m.alloc(D2SkillListStrc_SIZE) >>> 0
  m.set(pList, D2SkillListStrc.pMemPool, 0)
  m.set(pList, D2SkillListStrc.pFirstSkill, 0)
  m.set(pList, D2SkillListStrc.pLeftSkill, 0)
  m.set(pList, D2SkillListStrc.pRightSkill, 0)
  m.set(pList, D2SkillListStrc.pUsedSkill, 0)
  m.set(pList, D2SkillListStrc.dwFlags, 0)
  m.set(pList, D2SkillListStrc.pMemPool, pMemPool >>> 0)
  return pList
}

/**
 * `@va D2Common:0x6FD9E6D0` (`D2Common.#10102` `SKILLS_EvaluateSkillManaCost`,
 * stdcall `[esp+4] = nSkillId`, `[esp+8] = nLevel`, `ret 8` -> `int32_t`).
 */
export function SKILLS_EvaluateSkillManaCost113c(
  m: Memory113c,
  nSkillId: number,
  nLevel: number,
): number {
  const skillId = nSkillId | 0
  if (skillId < 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x100d)
  }
  const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
  if (skillId >= (m.u32((sgpt + DATATABLES_SKILLS_COUNT_OFF_113C) >>> 0) | 0)) {
    throw new D2CommonAssertError('Skills.cpp', 0x100d)
  }
  const pSkillsTxt =
    (m.u32((sgpt + DATATABLES_SKILLS_TXT_OFF_113C) >>> 0) + imul32(skillId, D2SkillsTxt_SIZE)) >>> 0
  if (pSkillsTxt === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x100d)
  }
  const wLvlMana = i16(m.get(pSkillsTxt, D2SkillsTxt.wLvlMana))
  const wMana = i16(m.get(pSkillsTxt, D2SkillsTxt.wMana))
  const nManaShift = m.get(pSkillsTxt, D2SkillsTxt.nManaShift) & 0x1f
  const val = sar32(
    ((imul32(wLvlMana, ((nLevel | 0) - 1) | 0) + wMana) | 0) << nManaShift,
    8,
  )
  return val < 0 ? 0 : val >>> 0
}

/**
 * `@va D2Common:0x6FD9EB40` (internal LTCG helper `SKILLS_HasSkillByTxtRecord`,
 * custom reg `eax = pUnit`, `ecx = pSkillsTxt`, `ret` -> `BOOL`).
 */
export function SKILLS_HasSkillByTxtRecord113c(
  m: Memory113c,
  eax: number,
  ecx: number,
): number {
  const pUnit = eax >>> 0
  if (pUnit === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x638)
  }
  const pSkills = m.get(pUnit, D2UnitStrc.pSkills)
  let pSkill = pSkills !== 0 ? m.get(pSkills, D2SkillListStrc.pFirstSkill) : 0
  if (pSkill === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0xab1)
  }
  const targetTxt = ecx >>> 0
  while (pSkill !== 0) {
    if (m.get(pSkill, D2SkillStrc.pSkillsTxt) === targetTxt) {
      return 1
    }
    pSkill = m.get(pSkill, D2SkillStrc.pNextSkill)
  }
  return 0
}

/**
 * `@va D2Common:0x6FD9ECC0` (`D2Common.#10978` `SKILLS_SetRightSkill`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = nSkillId`, `[esp+0xC] = dwOwnerGuid`, `ret 0xC`, void).
 */
export function SKILLS_SetRightSkill113c(
  m: Memory113c,
  pUnit: number,
  nSkillId: number,
  dwOwnerGuid: number,
): void {
  const skillId = nSkillId | 0
  if (skillId < 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x680)
  }
  const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
  if (skillId >= (m.u32((sgpt + DATATABLES_SKILLS_COUNT_OFF_113C) >>> 0) | 0)) {
    throw new D2CommonAssertError('Skills.cpp', 0x680)
  }
  const pSkillsTxt =
    (m.u32((sgpt + DATATABLES_SKILLS_TXT_OFF_113C) >>> 0) + imul32(skillId, D2SkillsTxt_SIZE)) >>> 0
  if (pSkillsTxt === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x680)
  }
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x638)
  }
  const pSkills = m.get(unitPtr, D2UnitStrc.pSkills)
  let pSkill = pSkills !== 0 ? m.get(pSkills, D2SkillListStrc.pFirstSkill) : 0
  const targetOwner = dwOwnerGuid >>> 0
  while (pSkill !== 0) {
    if (
      m.get(pSkill, D2SkillStrc.pSkillsTxt) === pSkillsTxt &&
      m.get(pSkill, D2SkillStrc.nOwnerItemGuid) === targetOwner
    ) {
      m.set(pSkills, D2SkillListStrc.pRightSkill, pSkill)
      return
    }
    pSkill = m.get(pSkill, D2SkillStrc.pNextSkill)
  }
}

/**
 * `@va D2Common:0x6FD9ED60` (`D2Common.#10546` `SKILLS_SetLeftSkill`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = nSkillId`, `[esp+0xC] = dwOwnerGuid`, `ret 0xC`, void).
 */
export function SKILLS_SetLeftSkill113c(
  m: Memory113c,
  pUnit: number,
  nSkillId: number,
  dwOwnerGuid: number,
): void {
  const skillId = nSkillId | 0
  if (skillId < 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x669)
  }
  const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
  if (skillId >= (m.u32((sgpt + DATATABLES_SKILLS_COUNT_OFF_113C) >>> 0) | 0)) {
    throw new D2CommonAssertError('Skills.cpp', 0x669)
  }
  const pSkillsTxt =
    (m.u32((sgpt + DATATABLES_SKILLS_TXT_OFF_113C) >>> 0) + imul32(skillId, D2SkillsTxt_SIZE)) >>> 0
  if (pSkillsTxt === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x669)
  }
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) {
    throw new D2CommonAssertError('Skills.cpp', 0x638)
  }
  const pSkills = m.get(unitPtr, D2UnitStrc.pSkills)
  let pSkill = pSkills !== 0 ? m.get(pSkills, D2SkillListStrc.pFirstSkill) : 0
  const targetOwner = dwOwnerGuid >>> 0
  while (pSkill !== 0) {
    if (
      m.get(pSkill, D2SkillStrc.pSkillsTxt) === pSkillsTxt &&
      m.get(pSkill, D2SkillStrc.nOwnerItemGuid) === targetOwner
    ) {
      m.set(pSkills, D2SkillListStrc.pLeftSkill, pSkill)
      return
    }
    pSkill = m.get(pSkill, D2SkillStrc.pNextSkill)
  }
}

/**
 * `@va D2Common:0x6FD9F000` (`D2Common.#10335` `SKILLS_FreeSkillList`,
 * stdcall `[esp+4] = pUnit`, `ret 4`, void).
 */
export function SKILLS_FreeSkillList113c(m: Memory113c, pUnit: number): void {
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) {
    return
  }
  const pSkills = m.get(unitPtr, D2UnitStrc.pSkills)
  if (pSkills === 0) {
    return
  }
  let pSkill = m.get(pSkills, D2SkillListStrc.pFirstSkill)
  while (pSkill !== 0) {
    m.get(unitPtr, D2UnitStrc.pMemPool)
    const pNext = m.get(pSkill, D2SkillStrc.pNextSkill)
    ;(m as { free?: (p: number) => void }).free?.(pSkill)
    pSkill = pNext
  }
  m.get(unitPtr, D2UnitStrc.pMemPool)
  ;(m as { free?: (p: number) => void }).free?.(pSkills)
  m.set(unitPtr, D2UnitStrc.pSkills, 0)
}

// ============================================================================
// Batch B039 & B049 — skills.ts functions (B039-06..10, B049-16)
// ============================================================================

/** `.data` `D2InventoryGridInfoStrc` body grid definition at `0x6FDED378` (`bGridX = 13, bGridY = 1`). */
export const BODY_GRID_DEF_VA_113C = 0x6fded378
/** `.bss` `D2ExperienceTxt*` at `0x6FDF0B50` (`+0x00` = `nMaxLevel`). */
export const SGPT_EXPERIENCE_TXT_PTR_VA_113C = 0x6fdf0b50
/** `sgptDataTables` offsets used by `B039` / `B049` skills functions. */
export const DATATABLES_STATES_COUNT_OFF_113C = 0xc4
export const DATATABLES_FSTATEMASKS_PTR_OFF_113C = 0x110
export const DATATABLES_ISC_TXT_OFF_113C = 0xbcc
export const DATATABLES_ISC_COUNT_OFF_113C = 0xbd4

const INV_SIGNATURE_113C = 0x01020304
const INV_OFF_PGRIDS_113C = 0x14
const INV_OFF_NGRIDS_113C = 0x18

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD6E1B0` (`INVENTORY_GetOrInitGrid`,
 * custom reg `eax = gridIdx`, `ebx = pInventory`, stack `[esp+4] = pGridDef`, `ret 4`).
 */
function inventoryGetOrInitGridMem113c(
  m: Memory113c,
  gridIdx: number,
  pInventory: number,
  pGridDef: number,
): number {
  const idx = gridIdx | 0
  const inv = pInventory >>> 0
  const def = pGridDef >>> 0
  const nGrids = m.u32((inv + INV_OFF_NGRIDS_113C) >>> 0) | 0
  if (nGrids > idx) {
    const pGrids = m.u32((inv + INV_OFF_PGRIDS_113C) >>> 0)
    const pGrid = (pGrids + ((idx << 4) >>> 0)) >>> 0
    const ppItems = m.u32((pGrid + D2InventoryGridStrc.ppItems.off) >>> 0)
    if (def === 0) {
      return ppItems !== 0 ? pGrid : 0
    }
    if (ppItems === 0) {
      const gx = m.u8(def)
      m.set(pGrid, D2InventoryGridStrc.nGridWidth, gx)
      const gy = m.u8((def + 1) >>> 0)
      const countBytes = (imul32(m.get(pGrid, D2InventoryGridStrc.nGridWidth), gy) << 2) >>> 0
      m.set(pGrid, D2InventoryGridStrc.nGridHeight, gy)
      const newItems = m.alloc(countBytes) >>> 0
      const zeroCount = (imul32(m.get(pGrid, D2InventoryGridStrc.nGridWidth), m.get(pGrid, D2InventoryGridStrc.nGridHeight)) << 2) >>> 0
      m.set(pGrid, D2InventoryGridStrc.ppItems, newItems)
      m.fill(newItems, zeroCount, 0)
    }
    if (m.get(pGrid, D2InventoryGridStrc.nGridWidth) !== m.u8(def)) return 0
    if (m.get(pGrid, D2InventoryGridStrc.nGridHeight) !== m.u8((def + 1) >>> 0)) return 0
    return pGrid
  }
  if (def === 0) return 0
  const oldGrids = m.u32((inv + INV_OFF_PGRIDS_113C) >>> 0)
  const newCount = (idx + 1) | 0
  const newByteSize = (newCount << 4) >>> 0
  const newGrids = m.alloc(newByteSize) >>> 0
  if (oldGrids !== 0 && nGrids > 0) {
    const copyBytes = (nGrids << 4) >>> 0
    for (let i = 0; i < copyBytes; i++) {
      m.setU8((newGrids + i) >>> 0, m.u8((oldGrids + i) >>> 0))
    }
  }
  const oldCount = m.u32((inv + INV_OFF_NGRIDS_113C) >>> 0) | 0
  m.setU32((inv + INV_OFF_PGRIDS_113C) >>> 0, newGrids)
  const clearBytes = (((idx - oldCount + 1) | 0) << 4) >>> 0
  m.fill((newGrids + ((oldCount << 4) >>> 0)) >>> 0, clearBytes, 0)
  m.setU32((inv + INV_OFF_NGRIDS_113C) >>> 0, newCount >>> 0)
  const gx = m.u8(def)
  const pGrid = (m.u32((inv + INV_OFF_PGRIDS_113C) >>> 0) + ((idx << 4) >>> 0)) >>> 0
  m.set(pGrid, D2InventoryGridStrc.nGridWidth, gx)
  const gy = m.u8((def + 1) >>> 0)
  m.set(pGrid, D2InventoryGridStrc.nGridHeight, gy)
  const allocBytes = (imul32(gx, gy) << 2) >>> 0
  const newItems = m.alloc(allocBytes) >>> 0
  const zeroBytes = (imul32(m.get(pGrid, D2InventoryGridStrc.nGridWidth), m.get(pGrid, D2InventoryGridStrc.nGridHeight)) << 2) >>> 0
  m.set(pGrid, D2InventoryGridStrc.ppItems, newItems)
  m.fill(newItems, zeroBytes, 0)
  return pGrid
}

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD88A80` (`STATLIST_GetTotalStatWithMin`,
 * custom reg `ebx = pStatList`, `edi = dwKey`, stack `[esp+4] = pIsc` -> `i32`).
 */
function statListGetTotalStatWithMinMem113c(
  m: Memory113c,
  pStatList: number,
  dwKey: number,
  pIsc: number,
): number {
  const ebx = pStatList >>> 0
  const ebp = (m.u32((ebx + 0x10) >>> 0) & 0x80000000) >>> 0
  const pHdr = ebp !== 0 ? (ebx + 0x48) >>> 0 : (ebx + 0x24) >>> 0
  const idx = STATLIST_FindStatIndex113c(m, pHdr, dwKey >>> 0)
  if (idx < 0) return 0
  const pEntry = (m.u32(pHdr) + idx * 8) >>> 0
  if (pEntry === 0) return 0
  let val = m.u32((pEntry + 4) >>> 0) | 0
  const esi = pIsc >>> 0
  if (esi !== 0) {
    const dl = m.u8((esi + 0x05) >>> 0)
    const pBitMasks = m.u32(GDW_BITMASKS_IAT_VA_113C)
    if ((m.u8((pBitMasks + 0x08) >>> 0) & dl) !== 0 && ebp !== 0) {
      const pUnit = m.u32((ebx + 0x44) >>> 0)
      if (pUnit !== 0) {
        const uType = m.u32(pUnit)
        if (uType === 0 || uType === 1) {
          const minAccr = m.u32((esi + 0x2c) >>> 0) | 0
          if (val < minAccr) {
            const shift = m.u8((esi + 0x18) >>> 0) & 31
            val = (minAccr << shift) | 0
          }
        }
      }
    }
  }
  return val | 0
}

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD88B70` (`STATLIST_GetUnitStat`,
 * `__stdcall(pUnit, nStatId, wLayer) -> i32`, `ret 0xC`).
 */
function statListGetUnitStatMem113c(
  m: Memory113c,
  pUnit: number,
  nStatId: number,
  wLayer: number,
): number {
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) return 0
  const pStatList = m.get(unitPtr, D2UnitStrc.pStatListEx)
  if (pStatList === 0) return 0
  const statId = nStatId | 0
  if (statId < 0) return 0
  const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + DATATABLES_ISC_COUNT_OFF_113C) >>> 0) | 0)) return 0
  const pIsc = (m.u32((sgpt + DATATABLES_ISC_TXT_OFF_113C) >>> 0) + imul32(statId, D2ItemStatCostTxt_SIZE)) >>> 0
  if (pIsc === 0) return 0
  const dwKey = ((statId << 16) + (wLayer & 0xffff)) >>> 0
  return statListGetTotalStatWithMinMem113c(m, pStatList, dwKey, pIsc)
}

/**
 * `@va D2Common:0x6FD83F40` (internal `STATES_CheckUnitAnyActiveStateMask`,
 * `__stdcall(pUnit) -> BOOL`, `ret 4`).
 */
export function STATES_CheckUnitAnyActiveStateMask113c(m: Memory113c, pUnit: number): number {
  const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
  const pMask = m.u32((sgpt + DATATABLES_FSTATEMASKS_PTR_OFF_113C) >>> 0)
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) return 0
  const pListEx = m.get(unitPtr, D2UnitStrc.pStatListEx)
  if (pListEx === 0) return 0
  if ((m.get(pListEx, D2StatListExStrc.dwFlags) | 0) >= 0) return 0
  const pStateFlags = m.get(pListEx, D2StatListExStrc.pStateFlags)
  if (pStateFlags === 0) return 0
  const nStates = m.u32((sgpt + DATATABLES_STATES_COUNT_OFF_113C) >>> 0) | 0
  const plus31 = (nStates + 31) | 0
  const nDwords = sar32((plus31 + ((plus31 >> 31) & 31)) | 0, 5)
  for (let i = 0; i < nDwords; i++) {
    const maskWord = m.u32((pMask + i * 4) >>> 0)
    if (maskWord !== 0 && (m.u32((pStateFlags + i * 4) >>> 0) & maskWord) !== 0) {
      return 1
    }
  }
  return 0
}

/**
 * `@va D2Common:0x6FD9EBF0` (internal `SKILLS_GetWeaponFromArmSlot`,
 * custom reg `eax = nArmCode`, `ecx = pInventory` -> `pItem`, `ret`).
 */
export function SKILLS_GetWeaponFromArmSlot113c(
  m: Memory113c,
  nArmCode: number,
  pInventory: number,
): number {
  const inv = pInventory >>> 0
  if ((nArmCode | 0) === 5) {
    if (inv === 0 || m.get(inv, D2InventoryStrc.dwSignature) !== INV_SIGNATURE_113C) return 0
    const pGrid = inventoryGetOrInitGridMem113c(m, 0, inv, BODY_GRID_DEF_VA_113C)
    if (pGrid === 0) return 0
    const ppItems = m.get(pGrid, D2InventoryGridStrc.ppItems)
    return m.u32((ppItems + 0x10) >>> 0)
  }
  if (inv === 0 || m.get(inv, D2InventoryStrc.dwSignature) !== INV_SIGNATURE_113C) return 0
  const pGrid = inventoryGetOrInitGridMem113c(m, 0, inv, BODY_GRID_DEF_VA_113C)
  if (pGrid === 0) return 0
  const ppItems = m.get(pGrid, D2InventoryGridStrc.ppItems)
  return m.u32((ppItems + 0x14) >>> 0)
}

/**
 * `@va D2Common:0x6FD9F870` (internal `SKILLS_ApplyElementalMasteryBonus`,
 * custom reg `eax = pUnit`, `ecx = nElemType`, `esi = nDamage` -> `i32`, `ret`).
 */
export function SKILLS_ApplyElementalMasteryBonus113c(
  m: Memory113c,
  pUnit: number,
  nElemType: number,
  nDamage: number,
): number {
  const elemIdx = ((nElemType | 0) - 1) >>> 0
  if (elemIdx > 11) return 0
  switch (elemIdx) {
    case 0: {
      const bonus = statListGetUnitStatMem113c(m, pUnit, 0x149, 0)
      return bonus !== 0 ? mulDiv113c(bonus, nDamage | 0, 100) >>> 0 : 0
    }
    case 1: {
      const bonus = statListGetUnitStatMem113c(m, pUnit, 0x14a, 0)
      return bonus !== 0 ? mulDiv113c(bonus, nDamage | 0, 100) >>> 0 : 0
    }
    case 3:
    case 11: {
      const unitPtr = pUnit >>> 0
      if (unitPtr === 0) return 0
      const pStatList = m.get(unitPtr, D2UnitStrc.pStatListEx)
      if (pStatList === 0) return 0
      const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
      if ((m.u32((sgpt + DATATABLES_ISC_COUNT_OFF_113C) >>> 0) | 0) <= 0x14b) return 0
      const pIsc = (m.u32((sgpt + DATATABLES_ISC_TXT_OFF_113C) >>> 0) + 0x1a2ec) >>> 0
      if (pIsc === 0) return 0
      const bonus = statListGetTotalStatWithMinMem113c(m, pStatList, 0x14b0000, pIsc)
      return bonus !== 0 ? mulDiv113c(bonus, nDamage | 0, 100) >>> 0 : 0
    }
    case 4: {
      const bonus = statListGetUnitStatMem113c(m, pUnit, 0x14c, 0)
      return bonus !== 0 ? mulDiv113c(bonus, nDamage | 0, 100) >>> 0 : 0
    }
    default:
      return 0
  }
}

/**
 * `@va D2Common:0x6FD9F930` (internal `SKILLS_GetBasePhysDamageMinOrMax`,
 * custom reg `eax = pUnit`, stack `[esp+4] = bIsMin` -> `i32`, `ret 4`).
 */
export function SKILLS_GetBasePhysDamageMinOrMax113c(
  m: Memory113c,
  pUnit: number,
  bIsMin: number,
): number {
  const unitPtr = pUnit >>> 0
  let ecx = 0
  if (unitPtr !== 0) {
    if (m.get(unitPtr, D2UnitStrc.dwUnitType) === 0) {
      const pStatList = m.get(unitPtr, D2UnitStrc.pStatListEx)
      const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
      let str = 0
      if (pStatList !== 0 && (m.u32((sgpt + DATATABLES_ISC_COUNT_OFF_113C) >>> 0) | 0) > 0) {
        const pIsc0 = m.u32((sgpt + DATATABLES_ISC_TXT_OFF_113C) >>> 0)
        if (pIsc0 !== 0) {
          str = statListGetTotalStatWithMinMem113c(m, pStatList, 0, pIsc0)
        }
      }
      let dex = 0
      if (pStatList !== 0 && (m.u32((sgpt + DATATABLES_ISC_COUNT_OFF_113C) >>> 0) | 0) > 2) {
        const pIsc2 = (m.u32((sgpt + DATATABLES_ISC_TXT_OFF_113C) >>> 0) + 0x288) >>> 0
        if (pIsc2 !== 0) {
          dex = statListGetTotalStatWithMinMem113c(m, pStatList, 0x20000, pIsc2)
        }
      }
      ecx = (dex + str - 0x14) | 0
    } else {
      const pStatList = m.get(unitPtr, D2UnitStrc.pStatListEx)
      let lvl = 0
      if (pStatList !== 0) {
        const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
        if ((m.u32((sgpt + DATATABLES_ISC_COUNT_OFF_113C) >>> 0) | 0) > 0x0c) {
          const pIsc12 = (m.u32((sgpt + DATATABLES_ISC_TXT_OFF_113C) >>> 0) + 0xf30) >>> 0
          if (pIsc12 !== 0) {
            lvl = statListGetTotalStatWithMinMem113c(m, pStatList, 0xc0000, pIsc12)
          }
        }
      }
      ecx = (lvl * 3) | 0
    }
  }
  if (ecx < 1) ecx = 1
  if ((bIsMin | 0) !== 0) {
    const q4 = sar32((ecx + ((ecx >> 31) & 3)) | 0, 2)
    return (q4 << 8) >>> 0
  }
  const q3 = Math.trunc(ecx / 3) | 0
  return (q3 << 8) >>> 0
}

/**
 * `@va D2Common:0x6FDA0870` (internal `SKILLS_CheckItemChargedSkillHasCharges`,
 * custom reg `ecx = pUnit`, `eax = pSkill` -> `BOOL`, `ret`).
 */
export function SKILLS_CheckItemChargedSkillHasCharges113c(
  m: Memory113c,
  pUnit: number,
  pSkill: number,
): number {
  const unitPtr = pUnit >>> 0
  const skillPtr = pSkill >>> 0
  if (unitPtr === 0 || skillPtr === 0) return 0
  const pInv = m.get(unitPtr, D2UnitStrc.pInventory)
  if (pInv === 0) return 1
  const ownerGuid = m.get(skillPtr, D2SkillStrc.nOwnerItemGuid)
  if (ownerGuid === 0xffffffff) return 1
  const pSkillsTxt = m.get(skillPtr, D2SkillStrc.pSkillsTxt)
  const wSkillId = (m.get(pSkillsTxt, D2SkillsTxt.wSkillId) << 16) >> 16
  const rawLvl = m.get(skillPtr, D2SkillStrc.nSkillLevel) | 0
  const pExp = m.u32(SGPT_EXPERIENCE_TXT_PTR_VA_113C)
  const maxLvl = m.u32(pExp) | 0
  let lvl = rawLvl <= 0 ? 0 : rawLvl
  if (lvl >= maxLvl) lvl = maxLvl
  const wLayer = ((lvl & 0x3f) + (wSkillId << 6)) | 0
  if (m.get(pInv, D2InventoryStrc.dwSignature) !== INV_SIGNATURE_113C) return 1
  let pItem = m.get(pInv, D2InventoryStrc.pFirstItem)
  while (pItem !== 0) {
    if (m.get(pItem, D2UnitStrc.dwUnitType) !== 4) return 1
    if (m.get(pItem, D2UnitStrc.dwUnitId) === ownerGuid) {
      const val = statListGetUnitStatMem113c(m, pItem, 0xcc, wLayer)
      return (val & 0xff) > 0 ? 1 : 0
    }
    const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
    if (pItemData === 0) return 1
    const pExtra = (pItemData + 0x5c) >>> 0
    if (pExtra === 0) return 1
    pItem = m.u32((pExtra + 0x08) >>> 0)
  }
  return 1
}

/**
 * `@va D2Common:0x6FD9EE00` (internal `SKILLS_AddOrRemoveItemChargedSkill`,
 * custom reg `eax = nSkillId`, stack `[esp+4] = pUnit`, `[esp+8] = dwItemGuid`,
 * `[esp+0xC] = nLevel`, `[esp+0x10] = nCharges`, `[esp+0x14] = bRemove`, `ret 0x14`, void).
 */
export function SKILLS_AddOrRemoveItemChargedSkill113c(
  m: Memory113c,
  nSkillId: number,
  pUnit: number,
  dwItemGuid: number,
  nLevel: number,
  nCharges: number,
  bRemove: number,
): void {
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) return
  if (m.get(unitPtr, D2UnitStrc.dwUnitType) !== 0) return
  const lvl = nLevel | 0
  if (lvl <= 0) return
  const skillId = nSkillId | 0
  if (skillId < 0) return
  const sgpt = m.u32(SGPT_DATATABLES_VA_113C)
  if (skillId >= (m.u32((sgpt + DATATABLES_SKILLS_COUNT_OFF_113C) >>> 0) | 0)) return
  const pSkillsTxt =
    (m.u32((sgpt + DATATABLES_SKILLS_TXT_OFF_113C) >>> 0) + imul32(skillId, D2SkillsTxt_SIZE)) >>> 0
  if (pSkillsTxt === 0) return
  const pSkills = m.get(unitPtr, D2UnitStrc.pSkills)
  if (pSkills === 0) return
  const itemGuid = dwItemGuid >>> 0

  if ((bRemove | 0) !== 0) {
    const pRight = m.get(pSkills, D2SkillListStrc.pRightSkill)
    const rightSkillId = (m.get(m.get(pRight, D2SkillStrc.pSkillsTxt), D2SkillsTxt.wSkillId) << 16) >> 16
    const pLeft = m.get(pSkills, D2SkillListStrc.pLeftSkill)
    const leftSkillId = (m.get(m.get(pLeft, D2SkillStrc.pSkillsTxt), D2SkillsTxt.wSkillId) << 16) >> 16
    if (skillId === leftSkillId && m.get(pLeft, D2SkillStrc.nOwnerItemGuid) === itemGuid) {
      SKILLS_SetLeftSkill113c(m, unitPtr, 0, 0xffffffff)
    }
    if (skillId === rightSkillId && m.get(pRight, D2SkillStrc.nOwnerItemGuid) === itemGuid) {
      SKILLS_SetRightSkill113c(m, unitPtr, 0, 0xffffffff)
    }
    const pUsed = m.get(pSkills, D2SkillListStrc.pUsedSkill)
    if (pUsed !== 0) {
      const usedSkillId = (m.get(m.get(pUsed, D2SkillStrc.pSkillsTxt), D2SkillsTxt.wSkillId) << 16) >> 16
      if (skillId === usedSkillId) {
        m.set(pSkills, D2SkillListStrc.pUsedSkill, 0)
      }
    }
    let prev = 0
    let curr = m.get(pSkills, D2SkillListStrc.pFirstSkill)
    while (curr !== 0) {
      if (
        m.get(curr, D2SkillStrc.nOwnerItemGuid) === itemGuid &&
        m.get(curr, D2SkillStrc.pSkillsTxt) === pSkillsTxt
      ) {
        const next = m.get(curr, D2SkillStrc.pNextSkill)
        if (prev !== 0) {
          m.set(prev, D2SkillStrc.pNextSkill, next)
        } else {
          m.set(pSkills, D2SkillListStrc.pFirstSkill, next)
        }
        m.get(unitPtr, D2UnitStrc.pMemPool)
        ;(m as { free?: (p: number) => void }).free?.(curr)
        return
      }
      prev = curr
      curr = m.get(curr, D2SkillStrc.pNextSkill)
    }
    return
  }

  let last = 0
  let curr = m.get(pSkills, D2SkillListStrc.pFirstSkill)
  while (curr !== 0) {
    if (
      m.get(curr, D2SkillStrc.nOwnerItemGuid) === itemGuid &&
      m.get(curr, D2SkillStrc.pSkillsTxt) === pSkillsTxt
    ) {
      m.set(curr, D2SkillStrc.nSkillLevel, lvl >>> 0)
      m.set(curr, D2SkillStrc.dwFlags, 1)
      m.setU32((curr + 0x38) >>> 0, nCharges >>> 0)
      return
    }
    last = curr
    curr = m.get(curr, D2SkillStrc.pNextSkill)
  }

  m.get(pSkills, D2SkillListStrc.pMemPool)
  const pNew = m.alloc(0x40) >>> 0
  m.fill(pNew, 0x40, 0)
  m.set(pNew, D2SkillStrc.pSkillsTxt, pSkillsTxt)
  const nAnim = (m.u8((pSkillsTxt + 0x10) >>> 0) << 24) >> 24
  if (nAnim === 7 || nAnim === 8 || nAnim === 10 || nAnim === 11 || nAnim === 18) {
    m.set(pNew, D2SkillStrc.nSlotIndex, nAnim >>> 0)
  } else {
    m.set(pNew, D2SkillStrc.nSlotIndex, 0x0a)
  }
  m.set(pNew, D2SkillStrc.nSkillLevel, lvl >>> 0)
  m.set(pNew, D2SkillStrc.dwFlags, 1)
  m.setU32((pNew + 0x38) >>> 0, nCharges >>> 0)
  m.set(pNew, D2SkillStrc.nOwnerItemGuid, itemGuid)
  m.set(pNew, D2SkillStrc.pNextSkill, 0)
  if (last !== 0) {
    m.set(last, D2SkillStrc.pNextSkill, pNew)
  } else {
    m.set(pSkills, D2SkillListStrc.pFirstSkill, pNew)
  }
}

// ============================================================================
// K1r3 Iteration 9 Lane B — Batch I9B-B (skills.ts)
// ============================================================================

/** `sgptDataTables` `+0x150`: state-mask word array read by the corpse-selection predicates (`mov ecx, [eax+0x150]` at 0x6FD9FF9B). */
export const DATATABLES_CORPSE_STATE_MASK_OFF_113C = 0x150
/** `D2UnitStrc.dwUnitType` value tested by 0x6FD9FF80..0x6FDA0150 (`cmp eax, 1`): monsters. */
const UNIT_MONSTER_113C = 1
/** `D2UnitStrc.dwAnimMode` tested by 0x6FD9FF80..0x6FDA0150 (`cmp dword [esi+0x10], 0xc`): monster mode 12 (dead). */
const MONMODE_DEAD_113C = 0xc
/** MonStats2 `dwFlags` bit indices passed in `edx` to 0x6FD51470 by the corpse predicates (`mov edx, 7` / `mov edx, 0xc`). */
const MONSTATS2_FLAG_BIT7_113C = 7
const MONSTATS2_FLAG_BIT12_113C = 0xc

/**
 * Lazily-dereferenced view of the `ecx = pMaskWords` pointer handed to 0x6FD83C20: element `i` is read from
 * `pMaskWords + 4*i` only when the callee consumes it (the DLL passes a raw pointer, never a copy).
 */
function stateMaskWordsAt(m: Memory113c, pMaskWords: number): ArrayLike<number> {
  const view: { length: number; [i: number]: number } = { length: STATE_DWORDS_113C }
  for (let i = 0; i < STATE_DWORDS_113C; i++) {
    Object.defineProperty(view, i, { get: () => m.u32((pMaskWords + i * 4) >>> 0) })
  }
  return view
}

/**
 * Shared body of 0x6FD9E5E0 / 0x6FD9E630 / 0x6FD9E680 (`__stdcall(nLevel, nSkillId) -> int`, `ret 8`):
 * signed bounds check of `nSkillId` against `nSkillsTxtRecordCount (+0xBA0)`, `rec = pSkillsTxt (+0xB98) + id*0x23C`,
 * `rec == 0 -> 0`, then `nLevel > 0` (signed `jg`) else `0`; returns
 * `SKILLS_CalcDiminishingReturns113c(nLevel, rec[offLo], rec[offHi])` (`push hi; push lo; push nLevel`).
 */
function skillsEvalParamPairDimReturns(
  m: Memory113c,
  nLevel: number,
  nSkillId: number,
  fLo: FieldLayout113c,
  fHi: FieldLayout113c,
): number {
  const rec = getSkillsTxtRecord(m, nSkillId)
  if (rec === 0) return 0
  const lvl = nLevel | 0
  if (!(lvl > 0)) return 0
  const pHi = m.get(rec, fHi)
  const pLo = m.get(rec, fLo)
  return SKILLS_CalcDiminishingReturns113c(m, lvl, pLo, pHi)
}

/** `@va D2Common:0x6FD9E5E0` (`D2Common.#10832`, `__stdcall(nLevel, nSkillId) -> int`, `ret 8`): Param5/Param6 (`+0x158/+0x15C`). */
export function SKILLS_EvalParam56DimReturns113c(m: Memory113c, nLevel: number, nSkillId: number): number {
  return skillsEvalParamPairDimReturns(m, nLevel, nSkillId, D2SkillsTxt.dwParam5, D2SkillsTxt.dwParam6)
}

/** `@va D2Common:0x6FD9E630` (`D2Common.#10400`, `__stdcall(nLevel, nSkillId) -> int`, `ret 8`): Param3/Param4 (`+0x150/+0x154`). */
export function SKILLS_EvalParam34DimReturns113c(m: Memory113c, nLevel: number, nSkillId: number): number {
  return skillsEvalParamPairDimReturns(m, nLevel, nSkillId, D2SkillsTxt.dwParam3, D2SkillsTxt.dwParam4)
}

/** `@va D2Common:0x6FD9E680` (`D2Common.#10703`, `__stdcall(nLevel, nSkillId) -> int`, `ret 8`): Param1/Param2 (`+0x148/+0x14C`). */
export function SKILLS_EvalParam12DimReturns113c(m: Memory113c, nLevel: number, nSkillId: number): number {
  return skillsEvalParamPairDimReturns(m, nLevel, nSkillId, D2SkillsTxt.dwParam1, D2SkillsTxt.dwParam2)
}

/**
 * `@va D2Common:0x6FD9F070` (`D2Common.#10630`, `__fastcall(ecx = pUnit, edx = nSkillId) -> D2SkillStrc*`, `ret`):
 * `push esi; mov eax, ecx; mov esi, edx; call 0x6FD9E480; pop esi`.
 */
export function SKILLS_GetHighestLevelSkillFromUnitAndIdFastcall113c(
  m: Memory113c,
  pUnit: number,
  nSkillId: number,
): number {
  return SKILLS_GetHighestLevelSkillFromUnitAndId113c(m, pUnit, nSkillId)
}

/**
 * Common prefix of the corpse predicates after the unit/mode gate: `STATES_CheckStateMaskOnUnit113c(pUnit,
 * sgptDataTables->[+0x150]) == 0` then `DATATBLS_CheckMonStats2FlagInline113c(pUnit->dwClassId, 7) != 0`.
 */
function corpseStateAndFlag7Pass(m: Memory113c, pUnit: number): boolean {
  const dt = m.u32(SGPT_DATATABLES_VA_113C)
  const pMask = m.u32((dt + DATATABLES_CORPSE_STATE_MASK_OFF_113C) >>> 0)
  if (STATES_CheckStateMaskOnUnit113c(m, pUnit, stateMaskWordsAt(m, pMask)) !== 0) return false
  return DATATBLS_CheckMonStats2FlagInline113c(m, m.get(pUnit, D2UnitStrc.dwClassId), MONSTATS2_FLAG_BIT7_113C) !== 0
}

/**
 * Body of the byte-identical 0x6FD9FF80 / 0x6FD9FFD0 / 0x6FDA0090 (`__stdcall(pUnit) -> BOOL`, `ret 4`): returns `1`
 * only if `pUnit != 0`, `pUnit->dwUnitType == 1`, `pUnit->dwAnimMode (+0x10) == 0xC`, the `[sgpt+0x150]` state mask
 * misses the unit, and MonStats2 flag bit 7 is set for `pUnit->dwClassId`; else `0`.
 */
function skillsIsSelectableCorpse(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  if (m.get(u, D2UnitStrc.dwUnitType) !== UNIT_MONSTER_113C) return 0
  if (m.get(u, D2UnitStrc.dwAnimMode) !== MONMODE_DEAD_113C) return 0
  return corpseStateAndFlag7Pass(m, u) ? 1 : 0
}

/** `@va D2Common:0x6FD9FF80` (`D2Common.#10501`, `__stdcall(pUnit) -> BOOL`, `ret 4`). */
export function SKILLS_IsSelectableCorpse10501_113c(m: Memory113c, pUnit: number): number {
  return skillsIsSelectableCorpse(m, pUnit)
}

/** `@va D2Common:0x6FD9FFD0` (`D2Common.#11157`, `__stdcall(pUnit) -> BOOL`, `ret 4`; byte-identical to 0x6FD9FF80). */
export function SKILLS_IsSelectableCorpse11157_113c(m: Memory113c, pUnit: number): number {
  return skillsIsSelectableCorpse(m, pUnit)
}

/** `@va D2Common:0x6FDA0090` (`D2Common.#10678`, `__stdcall(pUnit) -> BOOL`, `ret 4`; byte-identical to 0x6FD9FF80). */
export function SKILLS_IsSelectableCorpse10678_113c(m: Memory113c, pUnit: number): number {
  return skillsIsSelectableCorpse(m, pUnit)
}

/**
 * `@va D2Common:0x6FDA00E0` (`D2Common.#10096`, `__stdcall(pUnit) -> BOOL`, `ret 4`): the 0x6FD9FF80 predicate plus
 * `DATATBLS_CheckMonStats2FlagInline113c(classId, 0xC) != 0`. The `cmp edi, edi; jne` at 0x6FDA0122 compares a
 * register with itself and never branches, so it has no TS counterpart.
 */
export function SKILLS_IsSelectableCorpseWithFlag12_113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  if (m.get(u, D2UnitStrc.dwUnitType) !== UNIT_MONSTER_113C) return 0
  if (m.get(u, D2UnitStrc.dwAnimMode) !== MONMODE_DEAD_113C) return 0
  if (!corpseStateAndFlag7Pass(m, u)) return 0
  const classId = m.get(u, D2UnitStrc.dwClassId)
  return DATATBLS_CheckMonStats2FlagInline113c(m, classId, MONSTATS2_FLAG_BIT12_113C) !== 0 ? 1 : 0
}

/**
 * `@va D2Common:0x6FDA0150` (`D2Common.#10444`, `__stdcall(pUnit, bAllowMode0) -> BOOL`, `ret 8`).
 *
 * - `pUnit == 0` or `dwUnitType != 1` -> `0`.
 * - Mode gate: `dwAnimMode == 0xC` passes; otherwise passes only if `bAllowMode0 != 0 && dwAnimMode == 0`.
 * - State mask / MonStats2 flag 7 as 0x6FD9FF80 (`sgptDataTables` cached in `edi` at 0x6FDA0173).
 * - `id = dwClassId`; `rec = (id >= 0 && id < nMonStatsTxtRecordCount (+0xA80)) ? pMonStatsTxt (+0xA78) + id*0x1A8 : 0`
 *   (0x6FDA01CC `xor esi, esi` on the out-of-range path, no NULL test); returns `rec->wVelocity (+0x32) != 0`.
 */
export function SKILLS_IsSelectableCorpseWithVelocity113c(
  m: Memory113c,
  pUnit: number,
  bAllowMode0: number,
): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  if (m.get(u, D2UnitStrc.dwUnitType) !== UNIT_MONSTER_113C) return 0
  const mode = m.get(u, D2UnitStrc.dwAnimMode)
  if (mode !== MONMODE_DEAD_113C) {
    if ((bAllowMode0 >>> 0) === 0) return 0
    if (mode !== 0) return 0
  }
  const dt = m.u32(SGPT_DATATABLES_VA_113C)
  const pMask = m.u32((dt + DATATABLES_CORPSE_STATE_MASK_OFF_113C) >>> 0)
  if (STATES_CheckStateMaskOnUnit113c(m, u, stateMaskWordsAt(m, pMask)) !== 0) return 0
  const id = m.get(u, D2UnitStrc.dwClassId) | 0
  if (DATATBLS_CheckMonStats2FlagInline113c(m, id >>> 0, MONSTATS2_FLAG_BIT7_113C) === 0) return 0
  let rec = 0
  if (id >= 0 && id < (m.u32((dt + DATATABLES_MONSTATS_COUNT_OFF_113C) >>> 0) | 0)) {
    rec = (m.u32((dt + DATATABLES_MONSTATS_TXT_OFF_113C) >>> 0) + imul32(id, D2MonStatsTxt_SIZE)) >>> 0
  }
  return m.get(rec, D2MonStatsTxt.wVelocity) !== 0 ? 1 : 0
}

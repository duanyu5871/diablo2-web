/**
 * Diablo II v1.13c `D2Common.dll` item flag, class potion scaling, and `D2ItemDataStrc` field
 * primitives (`Items.cpp`, `0x6FD71F60..0x6FD73C50`).
 *
 * Binary evidence (`objdump -d -M intel ~/d2-data/D2Common.dll`, image base `0x6FD50000`):
 * - `#10013` (`0x6FD71F60` `ITEMS_NoOpReturnZero`): `xor eax, eax; ret 8`.
 * - `#10758` (`0x6FD71FB0` `ITEMS_SetOrClearFlagMask`): `test [esp+0xC], [esp+0xC]; mov eax, [esp+4]`;
 *   if non-zero `*[esp+4] |= [esp+8]`, else `*[esp+4] &= ~[esp+8]`; `ret 0xC` (returns `pdwFlags` in `eax`).
 * - `#10197` (`0x6FD71FE0` `ITEMS_TestFlagMask`): `mov eax, [esp+4]; and eax, [esp+8]; ret 8`.
 * - `#10393` (`0x6FD72210` `ITEMS_ApplyClassManaPotionScale`): jump table at `0x6FD72248`, class index
 *   bytes at `0x6FD72254` (`00 01 01 00 02 01 00`):
 *   - NULL or `dwUnitType != 0` or `dwClassId > 6` (`ja`): returns `nValue`
 *   - `dwClassId` in `{0, 3, 6}` (Amazon, Paladin, Assassin): `nValue + (nValue >> 1)` (`sar eax, 1; add eax, edx`)
 *   - `dwClassId` in `{1, 2, 5}` (Sorceress, Necromancer, Druid): `nValue * 2` (`lea eax, [edx+edx]`)
 *   - `dwClassId == 4` (Barbarian): `nValue`
 * - `#10540` (`0x6FD72260` `ITEMS_ApplyClassLifePotionScale`): jump table at `0x6FD72298`, class index
 *   bytes at `0x6FD722A4` (`00 02 02 00 01 02 00`):
 *   - NULL or `dwUnitType != 0`: jumps to `0x6FD72292` (`lea eax, [ecx+ecx]`, returns `nValue * 2`!)
 *   - `dwClassId > 6` (`ja 0x6FD72295`): returns `nValue`
 *   - `dwClassId` in `{0, 3, 6}` (Amazon, Paladin, Assassin): `nValue + (nValue >> 1)` (`sar eax, 1; add eax, ecx`)
 *   - `dwClassId == 4` (Barbarian): `nValue * 2` (`lea eax, [ecx+ecx]`)
 *   - `dwClassId` in `{1, 2, 5}` (Sorceress, Necromancer, Druid): `nValue`
 * - `#10012` (`0x6FD737A0` `ITEMS_SetInvPage`): writes `(u8)[esp+8]` to `pItemData + 0x45` (`nInvPage`).
 * - `#10883` (`0x6FD73970` `ITEMS_SetRareSuffix`): writes `(u16)[esp+8]` to `pItemData + 0x34` (`wRareSuffix`).
 * - `#10611` (`0x6FD739C0` `ITEMS_SetRarePrefix`): writes `(u16)[esp+8]` to `pItemData + 0x32` (`wRarePrefix`).
 * - `#10525` (`0x6FD73A10` `ITEMS_SetMagicSuffix`): writes `(u16)[esp+8]` to `pItemData + 0x3E + nIndex * 2` (`wMagicSuffix[nIndex]`).
 * - `#10312` (`0x6FD73AC0` `ITEMS_SetMagicPrefix`): writes `(u16)[esp+8]` to `pItemData + 0x38 + nIndex * 2` (`wMagicPrefix[nIndex]`).
 * - `#10417` (`0x6FD73C50` `ITEMS_GetBodyLocation`): reads `(u8)(pItemData + 0x44)` (`nBodyLoc`) into `al`
 *   (or `xor al, al` on NULL / non-item / NULL `pItemData`).
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import {
  D2InventoryGridStrc,
  D2InventoryStrc,
  D2ItemDataStrc,
  D2ItemDataStrc_SIZE,
  D2ItemStatCostTxt,
  D2ItemStatCostTxt_SIZE,
  D2ItemsTxt,
  D2ItemsTxt_SIZE,
  D2ItemTypesTxt,
  D2ItemTypesTxt_SIZE,
  D2SetItemsTxt_SIZE,
  D2SkillsTxt_SIZE,
  D2StatListExStrc,
  D2StatListStrc,
  D2UnitStrc,
} from '../mem/layout.generated.ts'
import {
  DATATBLS_GetItemsTxtRecordByCode113c,
  DATATBLS_GetQualityItemsTxtRecord113c,
} from '../tables/datatbls-113c.ts'
import {
  D2COMMON_GDWBITMASKS_IAT_VA_113C,
  D2CommonAssertError,
  DATATABLES_OFF_113C,
  DATATBLS_GetMonStats2TxtRecordFromMonStatsIdInline113c,
  DATATBLS_GetSetItemsTxtRecordInline113c,
  DATATBLS_GetSetsTxtRecordInline113c,
  SEED_RollLimitedRandomNumberInline113c,
} from './inline-helpers.ts'
import { imul32, sar32 } from './int-math.ts'
import {
  INVENTORY_GetFirstItem113c,
  INVENTORY_GetItemNodePositionOther113c,
  INVENTORY_GetNextItem113c,
  INVENTORY_UnitIsItem113c,
  ITEMS_GetComponentFromItem113c,
  ITEMS_GetInvWidthFromId113c,
  ITEMS_GetWeaponClassCodeIdx113c,
} from './inventory.ts'
import {
  STATLIST_FindStatIndex113c,
  STATLIST_GetUnitBaseStat113c,
  STATLIST_GetUnitStat113c,
  STATLIST_RecordModStat113c,
  STATLIST_SetStat113c,
  STATLIST_SetUnitStat113c,
  statKey113c,
} from './statlist.ts'
import { UNIT_ITEM, UNIT_PLAYER, UNITS_GetPlayerBaseToHit113c } from './unit.ts'

/** `.data` `D2DataTablesStrc* sgptDataTables` at `0x6FDE9E1C` (`0x6FD72F88`, `0x6FD735D8`). */
const ITEMS_SGPT_DATATABLES_VA_113C = 0x6fde9e1c
/** `sgptDataTables->pItemTypesTxt` (`0x6FD72F96 mov edx, [ecx+0xBF8]`). */
const DATATABLES_ITEMTYPES_TXT_OFF_113C = 0xbf8
/** `sgptDataTables->nItemTypesTxtRecordCount` (`0x6FD72F8E cmp eax, [ecx+0xBFC]`). */
const DATATABLES_ITEMTYPES_COUNT_OFF_113C = 0xbfc
/** `.bss` `0x4C`-stride code table base pointer (`0x6FDA302C mov eax, ds:0x6FDF0880`). */
const DATATBLS_CODE_TABLE_PTR_VA_113C = 0x6fdf0880
/** `.bss` `0x4C`-stride code table record count (`0x6FDA3020 mov edx, ds:0x6FDF0884`). */
const DATATBLS_CODE_TABLE_COUNT_VA_113C = 0x6fdf0884
/** `.bss` `dwItemsTxtRecordCount` (`0x6FD722BA mov ecx, ds:0x6FDEFB94`). */
const ITEMS_TXT_COUNT_VA_113C = 0x6fdefb94
/** `.bss` `pItemsTxt` base pointer (`0x6FD722C2 mov ecx, ds:0x6FDEFB98`). */
const ITEMS_TXT_PTR_VA_113C = 0x6fdefb98
/** `.bss` `pItemsLink` (`D2LinkStrc*`) passed to `Fog.#10213` (`0x6FD79F7C mov eax, ds:0x6FDEFF6C`). */
const ITEMS_LINK_PTR_VA_113C = 0x6fdeff6c
/** `D2InventoryStrc.dwSignature` magic constant (`0x6FD73E41`, `0x6FD741A7`). */
const INVENTORY_SIGNATURE_113C = 0x01020304
/** Embedded `D2ItemExtraDataStrc` (`pItemData + 0x5C`) next-item offset (`0x6FD73EDB mov edi, [ecx+8]`). */
const ITEM_EXTRA_NEXT_ITEM_OFF_113C = 0x08
/** Embedded `D2ItemExtraDataStrc` (`pItemData + 0x5C`) node-pos byte offset (`0x6FD73E92 movsx ecx, byte [ecx+0xD]`). */
const ITEM_EXTRA_NODEPOS_OFF_113C = 0x0d

/**
 * `@va D2Common:0x6FD71F60` (`D2Common.#10013` `ITEMS_NoOpReturnZero`, stdcall 2 stack args, `ret 8` -> `0`).
 */
export function ITEMS_NoOpReturnZero113c(_m: Memory113c, _a0: number, _a1: number): number {
  return 0
}

/**
 * `@va D2Common:0x6FD71FB0` (`D2Common.#10758` `ITEMS_SetOrClearFlagMask`,
 * stdcall `[esp+4] = pdwFlags`, `[esp+8] = dwMask`, `[esp+0xC] = bSet`, `ret 0xC` -> `pdwFlags`).
 */
export function ITEMS_SetOrClearFlagMask113c(
  m: Memory113c,
  pdwFlags: number,
  dwMask: number,
  bSet: number,
): number {
  const ptr = pdwFlags >>> 0
  if ((bSet | 0) !== 0) {
    m.setU32(ptr, (m.u32(ptr) | dwMask) >>> 0)
  } else {
    m.setU32(ptr, (m.u32(ptr) & ~dwMask) >>> 0)
  }
  return ptr
}

/**
 * `@va D2Common:0x6FD71FE0` (`D2Common.#10197` `ITEMS_TestFlagMask`,
 * stdcall `[esp+4] = dwFlags`, `[esp+8] = dwMask`, `ret 8` -> `dwFlags & dwMask`).
 */
export function ITEMS_TestFlagMask113c(_m: Memory113c, dwFlags: number, dwMask: number): number {
  return (dwFlags & dwMask) >>> 0
}

/**
 * `@va D2Common:0x6FD72210` (`D2Common.#10393` `ITEMS_ApplyClassManaPotionScale`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = nValue`, `ret 8` -> scaled value).
 */
export function ITEMS_ApplyClassManaPotionScale113c(m: Memory113c, pUnit: number, nValue: number): number {
  const v = nValue | 0
  if (pUnit === 0) return v
  if (m.get(pUnit, D2UnitStrc.dwUnitType) !== UNIT_PLAYER) return v
  const classId = m.get(pUnit, D2UnitStrc.dwClassId) >>> 0
  if (classId > 6) return v
  switch (classId) {
    case 0:
    case 3:
    case 6:
      return (sar32(v, 1) + v) | 0
    case 1:
    case 2:
    case 5:
      return (v + v) | 0
    default:
      return v
  }
}

/**
 * `@va D2Common:0x6FD72260` (`D2Common.#10540` `ITEMS_ApplyClassLifePotionScale`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = nValue`, `ret 8` -> scaled value).
 */
export function ITEMS_ApplyClassLifePotionScale113c(m: Memory113c, pUnit: number, nValue: number): number {
  const v = nValue | 0
  if (pUnit === 0) return (v + v) | 0
  if (m.get(pUnit, D2UnitStrc.dwUnitType) !== UNIT_PLAYER) return (v + v) | 0
  const classId = m.get(pUnit, D2UnitStrc.dwClassId) >>> 0
  if (classId > 6) return v
  switch (classId) {
    case 0:
    case 3:
    case 6:
      return (sar32(v, 1) + v) | 0
    case 4:
      return (v + v) | 0
    default:
      return v
  }
}

/**
 * `@va D2Common:0x6FD737A0` (`D2Common.#10012` `ITEMS_SetInvPage`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nInvPage`, `ret 8`, void).
 */
export function ITEMS_SetInvPage113c(m: Memory113c, pItem: number, nInvPage: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.nInvPage, nInvPage & 0xff)
}

/**
 * `@va D2Common:0x6FD73970` (`D2Common.#10883` `ITEMS_SetRareSuffix`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = wSuffix`, `ret 8`, void).
 */
export function ITEMS_SetRareSuffix113c(m: Memory113c, pItem: number, wSuffix: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.wRareSuffix, wSuffix & 0xffff)
}

/**
 * `@va D2Common:0x6FD739C0` (`D2Common.#10611` `ITEMS_SetRarePrefix`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = wPrefix`, `ret 8`, void).
 */
export function ITEMS_SetRarePrefix113c(m: Memory113c, pItem: number, wPrefix: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.wRarePrefix, wPrefix & 0xffff)
}

/**
 * `@va D2Common:0x6FD73A10` (`D2Common.#10525` `ITEMS_SetMagicSuffix`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = wSuffix`, `[esp+0xC] = nIndex`, `ret 0xC`, void).
 */
export function ITEMS_SetMagicSuffix113c(m: Memory113c, pItem: number, wSuffix: number, nIndex: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.setU16((pItemData + D2ItemDataStrc.wMagicSuffix.off + imul32(nIndex | 0, 2)) >>> 0, wSuffix & 0xffff)
}

/**
 * `@va D2Common:0x6FD73AC0` (`D2Common.#10312` `ITEMS_SetMagicPrefix`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = wPrefix`, `[esp+0xC] = nIndex`, `ret 0xC`, void).
 */
export function ITEMS_SetMagicPrefix113c(m: Memory113c, pItem: number, wPrefix: number, nIndex: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.setU16((pItemData + D2ItemDataStrc.wMagicPrefix.off + imul32(nIndex | 0, 2)) >>> 0, wPrefix & 0xffff)
}

/**
 * `@va D2Common:0x6FD73C50` (`D2Common.#10417` `ITEMS_GetBodyLocation`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AL` = `pItemData->nBodyLoc (+0x44)` or `0`).
 */
export function ITEMS_GetBodyLocation113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return m.get(pItemData, D2ItemDataStrc.nBodyLoc)
}

/**
 * `@va D2Common:0x6FD71F70` (internal LTCG helper `ITEMS_CheckQualityTradable`,
 * custom reg `eax = nVal`, `ret` -> `1` if `nVal != 0 && (nVal <= 3 || nVal > 9)`, else `0`).
 */
export function ITEMS_CheckQualityTradable113c(_m: Memory113c, nVal: number): number {
  const v = nVal | 0
  if (v === 0) return 0
  if (v <= 3 || v > 9) return 1
  return 0
}

/**
 * `@va D2Common:0x6FD71F90` (internal LTCG helper `ITEMS_PackColorIndex`,
 * custom reg `eax, ecx`, `ret` -> `(((al << 5) & 0xff) + (cl & 0x1f)) & 0xff` or `0`).
 */
export function ITEMS_PackColorIndex113c(_m: Memory113c, eax: number, ecx: number): number {
  const a = eax | 0
  const c = ecx | 0
  if (a <= 0 || a >= 9 || c < 0 || c >= 0x15) return 0
  return (((a & 0xff) << 5) + (c & 0x1f)) & 0xff
}

/**
 * `@va D2Common:0x6FD71FF0` (internal LTCG helper `ITEMS_ReturnZero`, 0-arg `xor eax, eax; ret` -> `0`).
 */
export function ITEMS_ReturnZero113c(_m: Memory113c): number {
  return 0
}

/**
 * `@va D2Common:0x6FD72590` (`D2Common.#10572` `ITEMS_GetAutoAffixData`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = pOutField1C`, `[esp+0xC] = pOutField20`, `ret 0xC`, void).
 * Note: unconditionally writes to `pOutField1C` and `pOutField20` on both valid and fallback paths.
 */
export function ITEMS_GetAutoAffixData113c(
  m: Memory113c,
  pItem: number,
  pOutField1C: number,
  pOutField20: number,
): void {
  if (pItem !== 0 && m.get(pItem, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
    if (pItemData !== 0) {
      m.setU32(pOutField1C >>> 0, m.get(pItemData, D2ItemDataStrc.dwActionStamp))
      m.setU32(pOutField20 >>> 0, m.get(pItemData, D2ItemDataStrc.dwFileIndex))
      return
    }
  }
  m.setU32(pOutField1C >>> 0, 0)
  m.setU32(pOutField20 >>> 0, 0)
}

/**
 * `@va D2Common:0x6FD72F80` (`D2Common.#10108` `ITEMS_GetItemTypeNormal`,
 * stdcall `[esp+4] = nItemType`, `ret 4` -> `D2ItemTypesTxt.nNormal (+0x10)` or `0`).
 */
export function ITEMS_GetItemTypeNormal113c(m: Memory113c, nItemType: number): number {
  const idx = nItemType | 0
  if (idx < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const count = m.u32((sgpt + DATATABLES_ITEMTYPES_COUNT_OFF_113C) >>> 0) | 0
  if (idx >= count) return 0
  const base = m.u32((sgpt + DATATABLES_ITEMTYPES_TXT_OFF_113C) >>> 0)
  const pRec = (base + imul32(idx, D2ItemTypesTxt_SIZE)) >>> 0
  if (pRec === 0) return 0
  return m.get(pRec, D2ItemTypesTxt.nNormal)
}

/**
 * `@va D2Common:0x6FD72FC0` (internal LTCG helper `ITEMS_AccumulateItemLevelReq`,
 * custom reg `eax = nCurrentReq`, `ecx = pItemsTxt`, `edx = pUnit`, `ret` -> `max(nCurrentReq, req)`).
 */
export function ITEMS_AccumulateItemLevelReq113c(
  m: Memory113c,
  nCurrentReq: number,
  pItemsTxt: number,
  pUnit: number,
): number {
  const cur = nCurrentReq | 0
  const rec = pItemsTxt >>> 0
  if (rec === 0) return cur
  const nClass = m.get(rec, D2ItemsTxt.nClass)
  let req: number
  if (nClass !== 0xff && pUnit !== 0 && nClass === m.get(pUnit, D2UnitStrc.dwClassId)) {
    req = m.get(rec, D2ItemsTxt.nClassLevelReq)
  } else {
    req = m.get(rec, D2ItemsTxt.nLevelReq)
  }
  return cur > req ? cur : req
}

/**
 * `@va D2Common:0x6FD735D0` (`D2Common.#10430` `ITEMS_GetItemTypeShoots`,
 * stdcall `[esp+4] = nItemType`, `ret 4` -> sign-extended `D2ItemTypesTxt.wShoots (+0x0E)` or `0`).
 */
export function ITEMS_GetItemTypeShoots113c(m: Memory113c, nItemType: number): number {
  const idx = nItemType | 0
  if (idx < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const count = m.u32((sgpt + DATATABLES_ITEMTYPES_COUNT_OFF_113C) >>> 0) | 0
  if (idx >= count) return 0
  const base = m.u32((sgpt + DATATABLES_ITEMTYPES_TXT_OFF_113C) >>> 0)
  const pRec = (base + imul32(idx, D2ItemTypesTxt_SIZE)) >>> 0
  if (pRec === 0) return 0
  return (m.get(pRec, D2ItemTypesTxt.wShoots) << 16) >> 16
}

/**
 * `@va D2Common:0x6FD73650` (`D2Common.#11019` `ITEMS_SetVarGfxIndex`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nIndex`, `ret 8`, void).
 */
export function ITEMS_SetVarGfxIndex113c(m: Memory113c, pItem: number, nIndex: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.bVarGfxIndex, nIndex & 0xff)
}

/**
 * `@va D2Common:0x6FD73690` (`D2Common.#10467` `ITEMS_SetEarLevel`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nEarLevel`, `ret 8`, void).
 */
export function ITEMS_SetEarLevel113c(m: Memory113c, pItem: number, nEarLevel: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.bEarLevel, nEarLevel & 0xff)
}

/**
 * `@va D2Common:0x6FD736B0` (`D2Common.#10588` `ITEMS_GetEarLevel`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AL` = `pItemData->bEarLevel (+0x48)` or `1`).
 */
export function ITEMS_GetEarLevel113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 1
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 1
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 1
  return m.get(pItemData, D2ItemDataStrc.bEarLevel)
}

/**
 * `@va D2Common:0x6FD736D0` (`D2Common.#10782` `ITEMS_SetEarName`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = szName`, `ret 8`, void).
 */
export function ITEMS_SetEarName113c(m: Memory113c, pItem: number, szName: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  let src = szName >>> 0
  const delta = ((pItemData + D2ItemDataStrc.szPlayerName.off) - src) >>> 0
  let cl: number
  do {
    cl = m.u8(src)
    m.setU8((delta + src) >>> 0, cl)
    src = (src + 1) >>> 0
  } while (cl !== 0)
}

/**
 * `@va D2Common:0x6FD73700` (`D2Common.#10083` `ITEMS_GetEarName`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `(pItemData + 0x4A) >>> 0` or `0`).
 */
export function ITEMS_GetEarName113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return (pItemData + D2ItemDataStrc.szPlayerName.off) >>> 0
}

/**
 * `@va D2Common:0x6FD73720` (`D2Common.#11030` `ITEMS_SetNodePage`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nNodePage`, `ret 8`, void).
 */
export function ITEMS_SetNodePage113c(m: Memory113c, pItem: number, nNodePage: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.bNodePage, nNodePage & 0xff)
}

/**
 * `@va D2Common:0x6FD73740` (`D2Common.#10728` `ITEMS_GetNodePage`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AL` = `pItemData->bNodePage (+0x47)` or `0xFF`).
 */
export function ITEMS_GetNodePage113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0xff
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0xff
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0xff
  return m.get(pItemData, D2ItemDataStrc.bNodePage)
}

/**
 * `@va D2Common:0x6FD73760` (`D2Common.#10152` `ITEMS_SetCmdFlagsByte`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nVal`, `ret 8`, void).
 */
export function ITEMS_SetCmdFlagsByte113c(m: Memory113c, pItem: number, nVal: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.bCmdFlags, nVal & 0xff)
}

/**
 * `@va D2Common:0x6FD737C0` (`D2Common.#10020` `ITEMS_GetInvPage`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AL` = `pItemData->nInvPage (+0x45)` or `0xFF`).
 */
export function ITEMS_GetInvPage113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0xff
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0xff
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0xff
  return m.get(pItemData, D2ItemDataStrc.nInvPage)
}

/**
 * `@va D2Common:0x6FD737E0` (`D2Common.#10377` `ITEMS_SetItemLevel`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nItemLevel`, `ret 8`, void).
 */
export function ITEMS_SetItemLevel113c(m: Memory113c, pItem: number, nItemLevel: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  const lvl = (nItemLevel | 0) >= 1 ? nItemLevel >>> 0 : 1
  m.set(pItemData, D2ItemDataStrc.dwItemLevel, lvl)
}

/**
 * `@va D2Common:0x6FD73810` (`D2Common.#10086` `ITEMS_GetItemLevel`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `pItemData->dwItemLevel (+0x2C)`, clamped to `>= 1` in-place).
 */
export function ITEMS_GetItemLevel113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 1
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 1
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 1
  if ((m.get(pItemData, D2ItemDataStrc.dwItemLevel) | 0) < 1) {
    m.set(pItemData, D2ItemDataStrc.dwItemLevel, 1)
  }
  return m.get(pItemData, D2ItemDataStrc.dwItemLevel)
}

/**
 * `@va D2Common:0x6FD73870` (`D2Common.#10892` `ITEMS_SetItemFlag`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = dwFlag`, `[esp+0xC] = bSet`, `ret 0xC`, void).
 */
export function ITEMS_SetItemFlag113c(
  m: Memory113c,
  pItem: number,
  dwFlag: number,
  bSet: number,
): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  if ((bSet | 0) !== 0) {
    m.set(pItemData, D2ItemDataStrc.dwItemFlags, (m.get(pItemData, D2ItemDataStrc.dwItemFlags) | dwFlag) >>> 0)
  } else {
    m.set(pItemData, D2ItemDataStrc.dwItemFlags, (m.get(pItemData, D2ItemDataStrc.dwItemFlags) & ~dwFlag) >>> 0)
  }
}

/**
 * `@va D2Common:0x6FD738B0` (`D2Common.#11051` `ITEMS_CheckItemFlag`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = dwFlag`, `ret 8` -> `pItemData->dwItemFlags & dwFlag` or `0`).
 */
export function ITEMS_CheckItemFlag113c(m: Memory113c, pItem: number, dwFlag: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return (m.get(pItemData, D2ItemDataStrc.dwItemFlags) & dwFlag) >>> 0
}

/**
 * `@va D2Common:0x6FD738E0` (`D2Common.#10838` `ITEMS_GetCommandFlags`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `pItemData->dwCommandFlags (+0x18)` or `0`).
 */
export function ITEMS_GetCommandFlags113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return m.get(pItemData, D2ItemDataStrc.dwCommandFlags)
}

/**
 * `@va D2Common:0x6FD73900` (`D2Common.#10695` `ITEMS_SetOrClearCommandFlags`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = dwFlag`, `[esp+0xC] = bSet`, `ret 0xC`, void).
 */
export function ITEMS_SetOrClearCommandFlags113c(
  m: Memory113c,
  pItem: number,
  dwFlag: number,
  bSet: number,
): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  if ((bSet | 0) !== 0) {
    m.set(pItemData, D2ItemDataStrc.dwCommandFlags, (m.get(pItemData, D2ItemDataStrc.dwCommandFlags) | dwFlag) >>> 0)
  } else {
    m.set(pItemData, D2ItemDataStrc.dwCommandFlags, (m.get(pItemData, D2ItemDataStrc.dwCommandFlags) & ~dwFlag) >>> 0)
  }
}

/**
 * `@va D2Common:0x6FD73940` (`D2Common.#10700` `ITEMS_CheckCommandFlags`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = dwFlag`, `[esp+0xC] = _u3`, `[esp+0x10] = _u4`, `ret 0x10` -> `pItemData->dwCommandFlags & dwFlag` or `0`).
 */
export function ITEMS_CheckCommandFlags113c(
  m: Memory113c,
  pItem: number,
  dwFlag: number,
  _u3 = 0,
  _u4 = 0,
): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return (m.get(pItemData, D2ItemDataStrc.dwCommandFlags) & dwFlag) >>> 0
}

/**
 * `@va D2Common:0x6FD73990` (`D2Common.#10212` `ITEMS_GetRareSuffix`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AX` = `pItemData->wRareSuffix (+0x34)` or `0`).
 */
export function ITEMS_GetRareSuffix113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return m.get(pItemData, D2ItemDataStrc.wRareSuffix)
}

/**
 * `@va D2Common:0x6FD739E0` (`D2Common.#10185` `ITEMS_GetRarePrefix`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AX` = `pItemData->wRarePrefix (+0x32)` or `0`).
 */
export function ITEMS_GetRarePrefix113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return m.get(pItemData, D2ItemDataStrc.wRarePrefix)
}

/**
 * `@va D2Common:0x6FD73A40` (`D2Common.#11035` `ITEMS_GetMagicSuffix`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nIndex`, `ret 8` -> `AX` = `pItemData->wMagicSuffix[nIndex]` (`+0x3E + nIndex * 2`) or `0`).
 */
export function ITEMS_GetMagicSuffix113c(m: Memory113c, pItem: number, nIndex: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return m.u16((pItemData + D2ItemDataStrc.wMagicSuffix.off + imul32(nIndex | 0, 2)) >>> 0)
}

/**
 * `@va D2Common:0x6FD73A70` (`D2Common.#10188` `ITEMS_SetAutoAffix`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = wAffix`, `ret 8`, void).
 */
export function ITEMS_SetAutoAffix113c(m: Memory113c, pItem: number, wAffix: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.wAutoAffix, wAffix & 0xffff)
}

/**
 * `@va D2Common:0x6FD73A90` (`D2Common.#10506` `ITEMS_GetAutoAffix`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AX` = `pItemData->wAutoAffix (+0x36)` or `0`).
 */
export function ITEMS_GetAutoAffix113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return m.get(pItemData, D2ItemDataStrc.wAutoAffix)
}

/**
 * `@va D2Common:0x6FD73AF0` (`D2Common.#10668` `ITEMS_GetMagicPrefix`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nIndex`, `ret 8` -> `AX` = `pItemData->wMagicPrefix[nIndex]` (`+0x38 + nIndex * 2`) or `0`).
 */
export function ITEMS_GetMagicPrefix113c(m: Memory113c, pItem: number, nIndex: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return m.u16((pItemData + D2ItemDataStrc.wMagicPrefix.off + imul32(nIndex | 0, 2)) >>> 0)
}

/**
 * `@va D2Common:0x6FD73B20` (`D2Common.#10510` `ITEMS_SetItemQuality`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nQuality`, `ret 8`, void).
 */
export function ITEMS_SetItemQuality113c(m: Memory113c, pItem: number, nQuality: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.dwQuality, nQuality >>> 0)
}

/**
 * `@va D2Common:0x6FD73B40` (`D2Common.#10627` `ITEMS_GetItemQuality`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `pItemData->dwQuality (+0x00)` or `2`).
 */
export function ITEMS_GetItemQuality113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 2
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 2
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 2
  return m.get(pItemData, D2ItemDataStrc.dwQuality)
}

/**
 * `@va D2Common:0x6FD73BC0` (`D2Common.#10145` `ITEMS_GetOwnerGuid`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `pItemData->dwOwnerGuid (+0x10)` or `0`).
 */
export function ITEMS_GetOwnerGuid113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return m.get(pItemData, D2ItemDataStrc.dwOwnerGuid)
}

/**
 * `@va D2Common:0x6FD73BE0` (`D2Common.#10073` `ITEMS_InitItemSeed`,
 * stdcall `[esp+4] = pItem`, `ret 4`, void: sets `dwSeedLo = 1`, `dwSeedHi = 666`).
 */
export function ITEMS_InitItemSeed113c(m: Memory113c, pItem: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.dwSeedLo, 1)
  m.set(pItemData, D2ItemDataStrc.dwSeedHi, 0x29a)
}

/**
 * `@va D2Common:0x6FD73C10` (`D2Common.#10690` `ITEMS_GetItemSeed`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `(pItemData + 0x04) >>> 0` or `0`).
 */
export function ITEMS_GetItemSeed113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return (pItemData + D2ItemDataStrc.dwSeedLo.off) >>> 0
}

/**
 * `@va D2Common:0x6FD73C30` (`D2Common.#10075` `ITEMS_SetBodyLocation`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nBodyLoc`, `ret 8`, void).
 */
export function ITEMS_SetBodyLocation113c(m: Memory113c, pItem: number, nBodyLoc: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return
  m.set(pItemData, D2ItemDataStrc.nBodyLoc, nBodyLoc & 0xff)
}

/**
 * `@va D2Common:0x6FD73D50` (internal LTCG fastcall helper `ITEMS_MaxIntFastcall`,
 * `ecx = a`, `edx = b`, `ret 8` -> signed `a > b ? a : b`).
 */
export function ITEMS_MaxIntFastcall113c(
  _m: Memory113c,
  a: number,
  b: number,
  _s0 = 0,
  _s1 = 0,
): number {
  const x = a | 0
  const y = b | 0
  return (x > y ? x : y) >>> 0
}

/**
 * `@va D2Common:0x6FD73D60` (internal LTCG fastcall helper `ITEMS_MinIntFastcall`,
 * `ecx = a`, `edx = b`, `ret 8` -> signed `a < b ? a : b`).
 */
export function ITEMS_MinIntFastcall113c(
  _m: Memory113c,
  a: number,
  b: number,
  _s0 = 0,
  _s1 = 0,
): number {
  const x = a | 0
  const y = b | 0
  return (x < y ? x : y) >>> 0
}

/**
 * `@va D2Common:0x6FD73E00` (`D2Common.#11099` `ITEMS_CheckEtherealFlag`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `(pItemData->dwCommandFlags & 0x400000) >>> 0` or `0`).
 */
export function ITEMS_CheckEtherealFlag113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) return 0
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) return 0
  return (m.get(pItemData, D2ItemDataStrc.dwCommandFlags) & 0x400000) >>> 0
}

/**
 * `@va D2Common:0x6FD73E30` (`D2Common.#10640` `ITEMS_CountEquippedOrCarryItems`,
 * stdcall `[esp+4] = pUnit`, `ret 4` -> count of non-hidden items in `pUnit->pInventory`
 * where `nodePos == 3` or (`nodePos == 1 && (nInvPage == 0 || nInvPage == 3)`)).
 * Note: unconditionally dereferences `pUnit + 0x60` (`pInventory`).
 */
export function ITEMS_CountEquippedOrCarryItems113c(m: Memory113c, pUnit: number): number {
  const pInv = m.get(pUnit, D2UnitStrc.pInventory)
  let count = 0
  let pItem =
    pInv !== 0 && m.get(pInv, D2InventoryStrc.dwSignature) === INVENTORY_SIGNATURE_113C
      ? m.get(pInv, D2InventoryStrc.pFirstItem)
      : 0
  while (pItem !== 0) {
    if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) break
    const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
    if (pItemData === 0) break
    const pExtra = (pItemData + D2ItemDataStrc.pExtraOwnerInventory.off) >>> 0
    if ((m.get(pItemData, D2ItemDataStrc.dwCommandFlags) & 0x10) === 0) {
      const nodePos = (m.u8((pExtra + ITEM_EXTRA_NODEPOS_OFF_113C) >>> 0) << 24) >> 24
      if (nodePos === 3) {
        count = (count + 1) >>> 0
      } else if (nodePos === 1) {
        const invPage = m.get(pItemData, D2ItemDataStrc.nInvPage)
        if (invPage === 0 || invPage === 3) {
          count = (count + 1) >>> 0
        }
      }
    }
    pItem = m.u32((pExtra + ITEM_EXTRA_NEXT_ITEM_OFF_113C) >>> 0)
  }
  return count >>> 0
}

/**
 * `@va D2Common:0x6FD741A0` (internal LTCG helper `ITEMS_HasSocketedItems`,
 * custom reg `eax = pItem`, `ret` -> `1` if `pItem->pInventory` has a valid first item with `dwUnitType == 4`, else `0`).
 * Note: unconditionally dereferences `pItem + 0x60` (`pInventory`).
 */
export function ITEMS_HasSocketedItems113c(m: Memory113c, pItem: number): number {
  const pInv = m.get(pItem, D2UnitStrc.pInventory)
  if (pInv === 0 || m.get(pInv, D2InventoryStrc.dwSignature) !== INVENTORY_SIGNATURE_113C) return 0
  const pFirst = m.get(pInv, D2InventoryStrc.pFirstItem)
  if (pFirst === 0 || m.get(pFirst, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  return 1
}

/**
 * `@va D2Common:0x6FD74210` (`D2Common.#10516` `ITEMS_IsHighQualityItem`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `1` if `4 <= dwQuality <= 9`, else `0`).
 */
export function ITEMS_IsHighQualityItem113c(m: Memory113c, pItem: number): number {
  let qual = 2
  if (pItem !== 0 && m.get(pItem, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
    if (pItemData !== 0) {
      qual = m.get(pItemData, D2ItemDataStrc.dwQuality) | 0
    }
  }
  if (qual < 4 || qual > 9) return 0
  return 1
}

/**
 * `@va D2Common:0x6FDA3020` (`D2Common.#10079` `DATATBLS_FindCodeRecord4C`,
 * stdcall `[esp+4] = dwCode`, `ret 4` -> record pointer `base + i * 0x4C` where `*(u32*)(base + i * 0x4C) == dwCode`, or `0`).
 */
export function DATATBLS_FindCodeRecord4C113c(m: Memory113c, dwCode: number): number {
  const count = m.u32(DATATBLS_CODE_TABLE_COUNT_VA_113C) | 0
  if (count <= 0) return 0
  let ptr = m.u32(DATATBLS_CODE_TABLE_PTR_VA_113C)
  const code = dwCode >>> 0
  for (let i = 0; i < count; i++) {
    if (m.u32(ptr) === code) return ptr >>> 0
    ptr = (ptr + 0x4c) >>> 0
  }
  return 0
}

// ============================================================================
// K1r2 Iteration 6 Lane B — Batch B027 (15 D2Common hostImport functions)
// ============================================================================

function lookupItemsTxtRecord113c(m: Memory113c, nItemId: number): number {
  if (nItemId >>> 0 >= m.u32(ITEMS_TXT_COUNT_VA_113C)) return 0
  const base = m.u32(ITEMS_TXT_PTR_VA_113C)
  if (base === 0) {
    throw new D2CommonAssertError('DataTbls.cpp', 0x1ef)
  }
  return (base + imul32(nItemId, D2ItemsTxt_SIZE)) >>> 0
}

/**
 * Inlined `0x6FDC19A0` (`DATATBLS_GetItemsTxtRecord`, `DataTbls.cpp:0x1EF`) + caller null-record assert.
 */
function lookupItemsTxtInlineOrAssert113c(m: Memory113c, nItemId: number, assertLine: number): number {
  if (nItemId >>> 0 >= m.u32(ITEMS_TXT_COUNT_VA_113C)) {
    throw new D2CommonAssertError('Items.cpp', assertLine)
  }
  const base = m.u32(ITEMS_TXT_PTR_VA_113C)
  if (base === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1ef)
  }
  const pRec = (base + imul32(nItemId, D2ItemsTxt_SIZE)) >>> 0
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', assertLine)
  }
  return pRec
}

/**
 * `@va D2Common:0x6FD721C0` (`D2Common.#10207` `ITEMS_GetItemFormat`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AX` = `pItemData->wItemFormat (+0x30)`).
 */
export function ITEMS_GetItemFormat113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1505)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x1506)
  }
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1508)
  }
  return m.get(pItemData, D2ItemDataStrc.wItemFormat)
}

/**
 * `@va D2Common:0x6FD722B0` (internal LTCG helper `ITEMS_GetItemDropSound`,
 * custom reg `eax = pItem`, `ret` -> `D2ItemsTxt.nDropSound (+0x143)`).
 */
export function ITEMS_GetItemDropSound113c(m: Memory113c, pItem: number): number {
  const nItemId = pItem !== 0 ? m.get(pItem, D2UnitStrc.dwClassId) : 0xffffffff
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0x12e1)
  return m.get(pRec, D2ItemsTxt.nDropSound)
}

/**
 * `@va D2Common:0x6FD72380` (`D2Common.#10831` `ITEMS_GetQuestItemByte`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `AL` = `D2ItemsTxt.bQuest (+0x13C)`).
 */
export function ITEMS_GetQuestItemByte113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1190)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x1191)
  }
  const pRec = lookupItemsTxtRecord113c(m, m.get(pItem, D2UnitStrc.dwClassId))
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1193)
  }
  return m.get(pRec, D2ItemsTxt.bQuest)
}

/**
 * `@va D2Common:0x6FD72640` (`D2Common.#10434` `ITEMS_GetItemCell`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `pItemData->dwItemCell (+0x28)`).
 */
export function ITEMS_GetItemCell113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1071)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x1072)
  }
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1074)
  }
  return m.get(pItemData, D2ItemDataStrc.dwItemCell)
}

/**
 * `@va D2Common:0x6FD72690` (`D2Common.#10626` `ITEMS_IsScrollOrTome`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `0` if `nComponent >= 1` or `wType1 == 0x27`, else `1`).
 */
export function ITEMS_IsScrollOrTome113c(m: Memory113c, nItemId: number): number {
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0x105f)
  if (m.get(pRec, D2ItemsTxt.nComponent) >= 1) return 0
  const wType1 = (m.get(pRec, D2ItemsTxt.wType1) << 16) >> 16
  return wType1 !== 0x27 ? 1 : 0
}

/**
 * `@va D2Common:0x6FD727C0` (`D2Common.#10035` `ITEMS_IsThrowableBit`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `D2ItemsTxt.dwBitField1 (+0xDC) & 1`).
 */
export function ITEMS_IsThrowableBit113c(m: Memory113c, nItemId: number): number {
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0x1041)
  return (m.get(pRec, D2ItemsTxt.dwBitField1) & 1) >>> 0
}

/**
 * `@va D2Common:0x6FD72880` (`D2Common.#10394` `ITEMS_GetGemApplyType`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `D2ItemsTxt.nGemApplyType (+0x13E)`).
 */
export function ITEMS_GetGemApplyType113c(m: Memory113c, nItemId: number): number {
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0xf29)
  return m.get(pRec, D2ItemsTxt.nGemApplyType)
}

/**
 * `@va D2Common:0x6FD728D0` (`D2Common.#11044` `ITEMS_GetBeltTypeIndex`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `AL` = `D2ItemsTxt.bBelt (+0x138)` or `0` on out-of-range).
 */
export function ITEMS_GetBeltTypeIndex113c(m: Memory113c, nItemId: number): number {
  if (nItemId >>> 0 >= m.u32(ITEMS_TXT_COUNT_VA_113C)) return 0
  const base = m.u32(ITEMS_TXT_PTR_VA_113C)
  if (base === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1ef)
  }
  const pRec = (base + imul32(nItemId, D2ItemsTxt_SIZE)) >>> 0
  if (pRec === 0) return 0
  return m.get(pRec, D2ItemsTxt.bBelt)
}

/**
 * `@va D2Common:0x6FD72920` (`D2Common.#10530` `ITEMS_GetSubTypeByte`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `D2ItemsTxt.nSubType (+0x137)` or `0` on out-of-range).
 */
export function ITEMS_GetSubTypeByte113c(m: Memory113c, nItemId: number): number {
  if (nItemId >>> 0 >= m.u32(ITEMS_TXT_COUNT_VA_113C)) return 0
  const base = m.u32(ITEMS_TXT_PTR_VA_113C)
  if (base === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1ef)
  }
  const pRec = (base + imul32(nItemId, D2ItemsTxt_SIZE)) >>> 0
  if (pRec === 0) return 0
  return m.get(pRec, D2ItemsTxt.nSubType)
}

/**
 * `@va D2Common:0x6FD72AD0` (`D2Common.#10212` `ITEMS_GetGambleCost`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `D2ItemsTxt.dwGambleCost (+0xE4)`).
 */
export function ITEMS_GetGambleCost113c(m: Memory113c, nItemId: number): number {
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0xd8b)
  return m.get(pRec, D2ItemsTxt.dwGambleCost)
}

/**
 * `@va D2Common:0x6FD72B20` (`D2Common.#11068` `ITEMS_GetBitField2`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `D2ItemsTxt.dwBitField2 (+0xEC)`).
 */
export function ITEMS_GetBitField2113c(m: Memory113c, nItemId: number): number {
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0xd6d)
  return m.get(pRec, D2ItemsTxt.dwBitField2)
}

/**
 * `@va D2Common:0x6FD72B70` (`D2Common.#10011` `ITEMS_GetBaseSpeed`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `D2ItemsTxt.dwSpeed (+0xE8)`).
 */
export function ITEMS_GetBaseSpeed113c(m: Memory113c, nItemId: number): number {
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0xd50)
  return m.get(pRec, D2ItemsTxt.dwSpeed)
}

/**
 * `@va D2Common:0x6FD72BC0` (`D2Common.#10489` `ITEMS_GetComponentByte`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `D2ItemsTxt.nComponent (+0x12A)`).
 */
export function ITEMS_GetComponentByte113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x9db)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x9dc)
  }
  const pRec = lookupItemsTxtRecord113c(m, m.get(pItem, D2UnitStrc.dwClassId))
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x9df)
  }
  return m.get(pRec, D2ItemsTxt.nComponent)
}

/**
 * `@va D2Common:0x6FD72E20` (`D2Common.#10765` `ITEMS_GetTwoHandedFlag`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `D2ItemsTxt.nTwoHanded (+0x132)` or `0` on NULL / non-item).
 */
export function ITEMS_GetTwoHandedFlag113c(m: Memory113c, pItem: number): number {
  if (pItem === 0 || m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pRec = lookupItemsTxtRecord113c(m, m.get(pItem, D2UnitStrc.dwClassId))
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x923)
  }
  return m.get(pRec, D2ItemsTxt.nTwoHanded)
}

/**
 * `@va D2Common:0x6FD72FF0` (`D2Common.#10602` `ITEMS_GetAltGfxOrBaseCode`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `dwAlternateGfx (+0x84)` if non-zero else `dwCode (+0x80)`).
 * Note: binary has no `pRec == 0` guard after `0x6FDC19A0` and dereferences `[eax+0x84]` directly.
 */
export function ITEMS_GetAltGfxOrBaseCode113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x798)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x799)
  }
  const pRec = lookupItemsTxtRecord113c(m, m.get(pItem, D2UnitStrc.dwClassId))
  const alt = m.get(pRec, D2ItemsTxt.dwAlternateGfx)
  if (alt !== 0) return alt >>> 0
  return m.get(pRec, D2ItemsTxt.dwCode) >>> 0
}

// ============================================================================
// K1r2 Iteration 6 Lane B — Batch B030 (14 D2Common hostImport functions)
// ============================================================================

/** `Fog.#10128` (`0x6FF64120`): writes `nBits` of `nValue` into `D2BitBufferStrc` (`pBitStream`). */
function fogWriteBits113c(m: Memory113c, pBitStream: number, nValue: number, nBits: number): void {
  const esi = pBitStream >>> 0
  const ecx = m.u32((esi + 0x0c) >>> 0) | 0
  const edx = m.u32((esi + 0x08) >>> 0) | 0
  const eax = m.u32((esi + 0x04) >>> 0) | 0
  let ebp = nBits | 0
  const newBitTotal = (ecx + (edx << 3) + ebp) | 0
  if (newBitTotal > eax) {
    m.setU32((esi + 0x10) >>> 0, 1)
    m.setU32((esi + 0x08) >>> 0, sar32((eax + ((eax >> 31) & 7)) | 0, 3) >>> 0)
    m.setU32((esi + 0x0c) >>> 0, 0)
    return
  }
  if (ecx === 0) {
    m.setU8(m.u32((esi + 0x00) >>> 0), 0)
  }
  if (ebp <= 0) return
  let ebx = nValue | 0
  while (ebp > 0) {
    const curBit = m.u32((esi + 0x0c) >>> 0) | 0
    let chunk = (8 - curBit) | 0
    if (chunk > ebp) chunk = ebp
    const mask = ((1 << chunk) - 1) & 0xff
    const edi = m.u32((esi + 0x00) >>> 0)
    const dl = ((ebx & mask) << (curBit & 31)) & 0xff
    m.setU8(edi, (m.u8(edi) | dl) & 0xff)
    const nextBit = (curBit + chunk) | 0
    m.setU32((esi + 0x0c) >>> 0, nextBit >>> 0)
    if (nextBit === 8) {
      const newBuf = (m.u32((esi + 0x00) >>> 0) + 1) >>> 0
      const newPos = (m.u32((esi + 0x08) >>> 0) + 1) | 0
      const maxBits = m.u32((esi + 0x04) >>> 0) | 0
      m.setU32((esi + 0x08) >>> 0, newPos >>> 0)
      m.setU32((esi + 0x00) >>> 0, newBuf)
      m.setU32((esi + 0x0c) >>> 0, 0)
      if ((newPos << 3) < maxBits) {
        m.setU8(newBuf, 0)
      }
    }
    ebp = (ebp - chunk) | 0
    ebx = sar32(ebx, chunk & 31)
  }
}

/** `Fog.#10130` (`0x6FF64100` -> `0x6FF63CD0`): reads `nBits` unsigned from `D2BitBufferStrc`. */
function fogReadBitsUnsigned113c(m: Memory113c, pBitStream: number, nBits: number): number {
  const esi = pBitStream >>> 0
  const eax = m.u32((esi + 0x08) >>> 0) | 0
  const ecx = m.u32((esi + 0x0c) >>> 0) | 0
  let ebp = nBits | 0
  let overflow = ((eax << 3) - (m.u32((esi + 0x04) >>> 0) | 0) + ebp + ecx) | 0
  if (overflow < 0) overflow = 0
  ebp = (ebp - overflow) | 0
  if (overflow !== 0) {
    m.setU32((esi + 0x10) >>> 0, 1)
  }
  let result = 0
  let shift = 0
  if (ebp <= 0) return 0
  while (ebp > 0) {
    const curBit = m.u32((esi + 0x0c) >>> 0) | 0
    let edx = (8 - curBit) | 0
    if (edx > ebp) edx = ebp
    const ebx = m.u32((esi + 0x0c) >>> 0) | 0
    const edi = m.u32((esi + 0x00) >>> 0)
    const byteVal = m.u8(edi)
    const highMask = (0xff << (ebx & 7)) & 0xff
    const extracted = ((byteVal & highMask) >>> (ebx & 31)) & ((1 << edx) - 1)
    result = (result + ((extracted << (shift & 31)) >>> 0)) >>> 0
    shift = (shift + edx) | 0
    ebp = (ebp - edx) | 0
    const nextBit = (ebx + edx) | 0
    m.setU32((esi + 0x0c) >>> 0, nextBit >>> 0)
    if (nextBit === 8) {
      m.setU32((esi + 0x00) >>> 0, (edi + 1) >>> 0)
      m.setU32((esi + 0x0c) >>> 0, 0)
      m.setU32((esi + 0x08) >>> 0, (m.u32((esi + 0x08) >>> 0) + 1) >>> 0)
    }
  }
  return result >>> 0
}

/** `Fog.#10213` (`0x6FF61F00`): binary-searches sorted 8-byte `{dwCode, nIndex}` table at `pLink`. */
function fogGetLinkIndex113c(m: Memory113c, pLink: number, dwCode: number): number {
  const esi = m.u32((pLink + 0x00) >>> 0) | 0
  const edi = m.u32((pLink + 0x08) >>> 0)
  const ebx = dwCode >>> 0
  let low = 0
  let high = esi
  if (high <= 0) return -1
  while (low < high) {
    const diff = (high - low) | 0
    const mid = (low + sar32((diff - (diff >> 31)) | 0, 1)) | 0
    const entryCode = m.u32((edi + mid * 8) >>> 0)
    if (ebx > entryCode) {
      low = (mid + 1) | 0
    } else if (ebx === entryCode) {
      return m.u32((edi + mid * 8 + 4) >>> 0) | 0
    } else {
      high = mid
    }
  }
  return -1
}

/**
 * Memory port of `D2Common 0x6FD74430` (`#10744` `ITEMS_CheckItemTypeId`, stdcall `(pItem, nItemType)`,
 * `ret 8`). No unit-type and no broken check:
 * - `pItem == 0` -> `0` (0x6FD74437); `nItemType < 0` or `>= nItemTypesTxtRecordCount (+0xBFC)` (signed) -> `0`.
 * - `wType[0]` via `0x6FD730A0` (`ITEMS_IsTome113c`: asserts `0x68E` for `classId >= count`, `0x1EF` for a
 *   null table); if the ItemTypes equivalence bit-matrix row (`+0xC00` dwords, base `+0xC04`) has the
 *   `nItemType` bit (`gdwBitMasks` at `0x6FDD90B0`) -> `1` (0x6FD74499).
 * - Otherwise re-looks the record up via `0x6FDC19A0` (null -> `0`), reads signed `wType[1] (+0x120)`;
 *   `<= 0` or `>= count` -> `0`; else returns the raw `row & mask` dword (0x6FD744F2, not normalised).
 */
export function ITEMS_CheckItemTypeIdMem113c(m: Memory113c, pItem: number, nItemType: number): number {
  const itm = pItem >>> 0
  if (itm === 0) return 0
  const t = nItemType | 0
  if (t < 0) return 0
  const sgpt0 = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (t >= (m.u32((sgpt0 + DATATABLES_OFF_113C.nItemTypesTxtRecordCount) >>> 0) | 0)) return 0
  const wType0 = ITEMS_IsTome113c(m, m.get(itm, D2UnitStrc.dwClassId)) | 0
  const col = t >> 5
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const row0 = (imul32(m.u32((sgpt + DATATABLES_OFF_113C.nItemTypesEquivDwords) >>> 0) | 0, wType0) + col) | 0
  const word0 = m.u32((m.u32((sgpt + DATATABLES_OFF_113C.pItemTypesEquiv) >>> 0) + imul32(row0, 4)) >>> 0)
  const mask0 = m.u32((m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C) + (t & 0x1f) * 4) >>> 0)
  if ((word0 & mask0) !== 0) return 1
  const pRec = lookupItemsTxtRecord113c(m, m.get(itm, D2UnitStrc.dwClassId))
  if (pRec === 0) return 0
  const wType1 = (m.get(pRec, D2ItemsTxt.wType2) << 16) >> 16
  if (wType1 <= 0) return 0
  const sgpt1 = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (wType1 >= (m.u32((sgpt1 + DATATABLES_OFF_113C.nItemTypesTxtRecordCount) >>> 0) | 0)) return 0
  const row1 = (imul32(m.u32((sgpt1 + DATATABLES_OFF_113C.nItemTypesEquivDwords) >>> 0) | 0, wType1) + col) | 0
  const word1 = m.u32((m.u32((sgpt1 + DATATABLES_OFF_113C.pItemTypesEquiv) >>> 0) + imul32(row1, 4)) >>> 0)
  const mask1 = m.u32((m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C) + (t & 0x1f) * 4) >>> 0)
  return (word1 & mask1) >>> 0
}

function checkIfThrowItemMem113c(m: Memory113c, pItem: number): number {
  if (pItem === 0 || m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const wType1 = ITEMS_IsTome113c(m, m.get(pItem, D2UnitStrc.dwClassId)) | 0
  if (wType1 < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const count = m.u32((sgpt + DATATABLES_OFF_113C.nItemTypesTxtRecordCount) >>> 0) | 0
  if (wType1 >= count) return 0
  const pTypeRec = (m.u32((sgpt + DATATABLES_OFF_113C.pItemTypesTxt) >>> 0) + imul32(wType1, D2ItemTypesTxt_SIZE)) >>> 0
  if (pTypeRec === 0) return 0
  return m.u8((pTypeRec + 0x10) >>> 0)
}

function getUnitBaseStatWithIscCheck113c(m: Memory113c, pItem: number, nStatId: number, nLayer: number): number {
  if (pItem === 0 || nStatId < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (nStatId >= (m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0)) return 0
  const pIscRec = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + imul32(nStatId, D2ItemStatCostTxt_SIZE)) >>> 0
  if (pIscRec === 0) return 0
  return STATLIST_GetUnitBaseStat113c(m, pItem, nStatId, nLayer)
}

/**
 * `@va D2Common:0x6FD730A0` (`D2Common.#10731` `ITEMS_IsTome`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> sign-extended `D2ItemsTxt.wType1 (+0x11E)`).
 */
export function ITEMS_IsTome113c(m: Memory113c, nItemId: number): number {
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0x68e)
  return ((m.get(pRec, D2ItemsTxt.wType1) << 16) >> 16) >>> 0
}

/**
 * `@va D2Common:0x6FD73290` (`D2Common.#10001` `ITEMS_GetBaseCode`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `D2ItemsTxt.dwCode (+0x80)`).
 */
export function ITEMS_GetBaseCode113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x61b)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x61c)
  }
  const pRec = lookupItemsTxtRecord113c(m, m.get(pItem, D2UnitStrc.dwClassId))
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x61f)
  }
  return m.get(pRec, D2ItemsTxt.dwCode) >>> 0
}

/**
 * `@va D2Common:0x6FD73B70` (`D2Common.#10287` `ITEMS_SetOwnerGuid`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = dwOwnerGuid`, `ret 8`, void).
 */
export function ITEMS_SetOwnerGuid113c(m: Memory113c, pItem: number, dwOwnerGuid: number): void {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x188)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x189)
  }
  const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
  if (pItemData === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x18c)
  }
  m.set(pItemData, D2ItemDataStrc.dwOwnerGuid, dwOwnerGuid >>> 0)
}

/**
 * `@va D2Common:0x6FD73C70` (`D2Common.#10854` `ITEMS_AllocItemData`,
 * stdcall `[esp+4] = pMemPool`, `[esp+8] = pItem`, `ret 8`, void).
 */
export function ITEMS_AllocItemData113c(m: Memory113c, _pMemPool: number, pItem: number): void {
  if (pItem === 0) return
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  const pData = m.alloc(D2ItemDataStrc_SIZE)
  if (pData === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xd6)
  }
  m.fill(pData, D2ItemDataStrc_SIZE, 0)
  m.set(pData, D2ItemDataStrc.dwInitSeed, 0xffffffff)
  m.set(pItem, D2UnitStrc.pUnitData, pData)
}

/**
 * `@va D2Common:0x6FD73DD0` (internal LTCG helper `ITEMS_WriteBitsClamped`,
 * custom reg `esi = nBits`, `edx = nValue`, stack `[esp+4] = pBitStream`, `ret 4`, void).
 */
export function ITEMS_WriteBitsClamped113c(
  m: Memory113c,
  nBits: number,
  nValue: number,
  pBitStream: number,
): void {
  let val = nValue | 0
  const bits = nBits | 0
  if (bits !== 0x20) {
    const maxVal = ((1 << (bits & 31)) - 1) | 0
    const mask = val <= 0 ? 0 : -1
    val = val & mask
    if (val >= maxVal) {
      val = maxVal
    }
  }
  fogWriteBits113c(m, pBitStream >>> 0, val, bits)
}

/**
 * `@va D2Common:0x6FD74320` (`D2Common.#10627` `ITEMS_CheckItemTypeRarityUnder7`,
 * stdcall `[esp+4] = nItemId`, `ret 4` -> `1` if `D2ItemTypesTxt[wType1].nRarity < 7`, else `0`).
 */
export function ITEMS_CheckItemTypeRarityUnder7113c(m: Memory113c, nItemId: number): number {
  const pRec = lookupItemsTxtInlineOrAssert113c(m, nItemId, 0x68e)
  const wType1 = (m.get(pRec, D2ItemsTxt.wType1) << 16) >> 16
  if (wType1 < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const count = m.u32((sgpt + DATATABLES_ITEMTYPES_COUNT_OFF_113C) >>> 0) | 0
  if (wType1 >= count) return 0
  const base = m.u32((sgpt + DATATABLES_ITEMTYPES_TXT_OFF_113C) >>> 0)
  const pTypeRec = (base + imul32(wType1, D2ItemTypesTxt_SIZE)) >>> 0
  if (pTypeRec === 0) return 0
  return m.get(pTypeRec, D2ItemTypesTxt.nRarity) < 7 ? 1 : 0
}

/**
 * `@va D2Common:0x6FD74A50` (internal LTCG helper `ITEMS_AccumulateSocketedItemCosts`,
 * custom reg `eax = pItem`, stack `[esp+4] = pOutCost1`, `[esp+8] = pOutCost2`, `[esp+0xC] = pOutCost3`, `ret 0xC`, void).
 */
export function ITEMS_AccumulateSocketedItemCosts113c(
  m: Memory113c,
  pItem: number,
  pOutCost1: number,
  pOutCost2: number,
  pOutCost3: number,
): void {
  const pInv = m.get(pItem, D2UnitStrc.pInventory)
  if (pInv === 0) return
  let sum = 0
  if (m.get(pInv, D2InventoryStrc.dwSignature) === INVENTORY_SIGNATURE_113C) {
    let ecx = m.get(pInv, D2InventoryStrc.pFirstItem)
    if (ecx !== 0) {
      const pItemsTxtBase = m.u32(ITEMS_TXT_PTR_VA_113C)
      while (ecx !== 0) {
        const uType = m.get(ecx, D2UnitStrc.dwUnitType)
        const edx = uType === UNIT_ITEM ? ecx : 0
        let nextItem = 0
        if (uType === UNIT_ITEM) {
          const pData = m.get(ecx, D2UnitStrc.pUnitData)
          if (pData !== 0) {
            const pExtra = (pData + D2ItemDataStrc.pExtraOwnerInventory.off) >>> 0
            if (pExtra !== 0) {
              nextItem = m.u32((pExtra + ITEM_EXTRA_NEXT_ITEM_OFF_113C) >>> 0)
            }
          }
        }
        ecx = nextItem
        if (edx !== 0) {
          const itemId = m.get(edx, D2UnitStrc.dwClassId)
          let pRec = 0
          if (itemId >>> 0 < m.u32(ITEMS_TXT_COUNT_VA_113C)) {
            if (pItemsTxtBase === 0) {
              throw new D2CommonAssertError('Items.cpp', 0x1ef)
            }
            pRec = (pItemsTxtBase + imul32(itemId, D2ItemsTxt_SIZE)) >>> 0
          }
          const cost = m.get(pRec, D2ItemsTxt.dwCost) | 0
          const half = sar32((cost - (cost >> 31)) | 0, 1)
          sum = (sum + half) | 0
        }
      }
    }
  }
  m.setU32(pOutCost1 >>> 0, (m.u32(pOutCost1 >>> 0) + sum) >>> 0)
  m.setU32(pOutCost2 >>> 0, (m.u32(pOutCost2 >>> 0) + sum) >>> 0)
  m.setU32(pOutCost3 >>> 0, (m.u32(pOutCost3 >>> 0) + sum) >>> 0)
}

/**
 * `@va D2Common:0x6FD76080` (`D2Common.#10815` `ITEMS_GetMaxSockets`,
 * stdcall `[esp+4] = pItem`, `ret 4` -> `STAT_ITEM_NUMSOCKETS (0xC2)` or `0`).
 */
export function ITEMS_GetMaxSockets113c(m: Memory113c, pItem: number): number {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xea7)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0xea8)
  }
  const pStatListEx = m.get(pItem, D2UnitStrc.pStatListEx)
  if (pStatListEx === 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if ((m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0) <= 0xc2) return 0
  const pIscRec = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + 0xf588) >>> 0
  if (pIscRec === 0) return 0
  return STATLIST_GetUnitStat113c(m, pItem, 0xc2, 0) >>> 0
}

/**
 * `@va D2Common:0x6FD79D90` (internal LTCG helper `ITEMS_DecodeAndSetSaveStat`,
 * custom reg `eax = nSaveSlot`, `ecx = nVersion`, `esi = pIscRec`,
 * stack `[esp+4] = pBitStream`, `[esp+8] = pStatList`, `[esp+0xC] = nStatId`, `ret 0xC`, void).
 */
export function ITEMS_DecodeAndSetSaveStat113c(
  m: Memory113c,
  nSaveSlot: number,
  nVersion: number,
  pIscRec: number,
  pBitStream: number,
  pStatList: number,
  nStatId: number,
): void {
  const slot = nSaveSlot | 0
  const ver = nVersion >>> 0
  const isc = pIscRec >>> 0
  const saveParamBits = m.get(isc, D2ItemStatCostTxt.dwSaveParamBits, slot) | 0
  let saveAdd = m.get(isc, D2ItemStatCostTxt.dwSaveAdd, slot) | 0
  let statId = nStatId | 0
  let saveBits = m.get(isc, D2ItemStatCostTxt.nSaveBits, slot)

  switch (statId) {
    case 0x17:
      if (ver <= 0x59) saveBits = 5
      break
    case 0x18:
      if (ver <= 0x59) saveBits = 6
      break
    case 0x4a:
      if (ver <= 0x59) {
        saveBits = 5
        saveAdd = 0x0a
      }
      break
    case 0x4f:
      if (ver <= 0x59) {
        saveBits = 8
        saveAdd = 0x14
      }
      break
    case 0x50:
      if (ver <= 0x59) {
        saveBits = 7
        saveAdd = 0x14
      }
      break
    case 0x5d:
    case 0x60:
    case 0x63:
    case 0x66:
    case 0x69:
      if (ver <= 0x57) saveBits = 6
      break
    case 0x5c:
    case 0x5e:
      if (ver < 0x5d) statId = 0x5d
      break
    case 0x5f:
    case 0x61:
      if (ver < 0x5d) statId = 0x60
      break
    case 0x62:
    case 0x64:
      if (ver < 0x5d) statId = 0x63
      break
    case 0x65:
    case 0x67:
      if (ver < 0x5d) statId = 0x66
      break
    case 0x68:
    case 0x6a:
      if (ver < 0x5d) statId = 0x69
      break
    default:
      break
  }

  let param = 0
  if (saveParamBits > 0) {
    param = fogReadBitsUnsigned113c(m, pBitStream >>> 0, saveParamBits)
  }
  const rawVal = (fogReadBitsUnsigned113c(m, pBitStream >>> 0, saveBits) - saveAdd) | 0
  if (pStatList !== 0) {
    const shift = m.get(isc, D2ItemStatCostTxt.bValShift)
    STATLIST_SetStat113c(m, pStatList >>> 0, statId, (rawVal << (shift & 31)) | 0, param)
  }
}

/**
 * `@va D2Common:0x6FD79F30` (internal LTCG helper `ITEMS_EnsureMinimumBaseDamageAndACStats`,
 * custom reg `esi = pItem`, stack `[esp+4] = nStatId`, `ret 4`, void).
 */
export function ITEMS_EnsureMinimumBaseDamageAndACStats113c(
  m: Memory113c,
  pItem: number,
  nStatId: number,
): void {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x61b)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x61c)
  }
  const pRec = lookupItemsTxtRecord113c(m, m.get(pItem, D2UnitStrc.dwClassId))
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x61f)
  }
  const dwCode = m.get(pRec, D2ItemsTxt.dwCode)
  const idx = fogGetLinkIndex113c(m, m.u32(ITEMS_LINK_PTR_VA_113C), dwCode)
  if (idx < 0) return
  const pBaseRec = (m.u32(ITEMS_TXT_PTR_VA_113C) + imul32(idx, D2ItemsTxt_SIZE)) >>> 0
  if (pBaseRec === 0) return

  switch (nStatId | 0) {
    case 0x10:
    case 0x1f: {
      if (ITEMS_CheckItemTypeIdMem113c(m, pItem, 0x32) === 0) return
      const minAc = m.get(pBaseRec, D2ItemsTxt.nMinAc) | 0
      if (minAc === 0) return
      let val = (getUnitBaseStatWithIscCheck113c(m, pItem, 0x1f, 0) + 1) | 0
      if (val <= minAc) {
        val = (minAc + 1) | 0
      }
      STATLIST_SetUnitStat113c(m, pItem, 0x1f, val, 0)
      return
    }
    case 0x11:
    case 0x16: {
      if (ITEMS_CheckItemTypeIdMem113c(m, pItem, 0x2d) === 0) return
      const maxDam = m.get(pBaseRec, D2ItemsTxt.nMaxDam)
      if (maxDam !== 0) {
        const cur16 = getUnitBaseStatWithIscCheck113c(m, pItem, 0x16, 0) | 0
        if (cur16 < maxDam) {
          STATLIST_SetUnitStat113c(m, pItem, 0x16, maxDam, 0)
        }
      }
      const max2HandDam = m.get(pBaseRec, D2ItemsTxt.n2HandMaxDam)
      if (max2HandDam !== 0) {
        const cur18 = getUnitBaseStatWithIscCheck113c(m, pItem, 0x18, 0) | 0
        if (cur18 < max2HandDam) {
          STATLIST_SetUnitStat113c(m, pItem, 0x18, max2HandDam, 0)
        }
      }
      const curA0 = getUnitBaseStatWithIscCheck113c(m, pItem, 0xa0, 0) | 0
      if (checkIfThrowItemMem113c(m, pItem) === 0) return
      const maxMisDam = m.get(pBaseRec, D2ItemsTxt.nMaxMisDam)
      if (maxMisDam === 0 || curA0 >= maxMisDam) return
      STATLIST_SetUnitStat113c(m, pItem, 0xa0, maxMisDam, 0)
      return
    }
    case 0x12:
    case 0x15: {
      if (ITEMS_CheckItemTypeIdMem113c(m, pItem, 0x2d) === 0) return
      const minDam = m.get(pBaseRec, D2ItemsTxt.nMinDam)
      if (minDam !== 0) {
        const cur15 = getUnitBaseStatWithIscCheck113c(m, pItem, 0x15, 0) | 0
        if (cur15 < minDam) {
          STATLIST_SetUnitStat113c(m, pItem, 0x15, minDam, 0)
        }
      }
      const min2HandDam = m.get(pBaseRec, D2ItemsTxt.n2HandMinDam)
      if (min2HandDam !== 0) {
        const cur17 = getUnitBaseStatWithIscCheck113c(m, pItem, 0x17, 0) | 0
        if (cur17 < min2HandDam) {
          STATLIST_SetUnitStat113c(m, pItem, 0x17, min2HandDam, 0)
        }
      }
      const cur9F = getUnitBaseStatWithIscCheck113c(m, pItem, 0x9f, 0) | 0
      if (checkIfThrowItemMem113c(m, pItem) === 0) return
      const minMisDam = m.get(pBaseRec, D2ItemsTxt.nMinMisDam)
      if (minMisDam === 0 || cur9F >= minMisDam) return
      STATLIST_SetUnitStat113c(m, pItem, 0x9f, minMisDam, 0)
      return
    }
    default:
      return
  }
}

/**
 * `@va D2Common:0x6FD7D0F0` (internal helper `DRLGWARP_TestRoomTileBit`,
 * stdcall `[esp+4] = pRoomMaskPtr`, `[esp+8] = nX`, `[esp+0xC] = nY`, `ret 0xC` -> `0` or `1`).
 */
export function DRLGWARP_TestRoomTileBit113c(
  m: Memory113c,
  pRoomMaskPtr: number,
  nX: number,
  nY: number,
): number {
  if (pRoomMaskPtr === 0) {
    throw new D2CommonAssertError('DrlgWarp.cpp', 0x1f)
  }
  const bitIdx = ((nX << 4) + nY) | 0
  const pBitArray = m.u32(pRoomMaskPtr >>> 0)
  const byteVal = m.u8((pBitArray + (bitIdx >> 3)) >>> 0)
  return (byteVal & (1 << (bitIdx & 7))) !== 0 ? 1 : 0
}

/**
 * `@va D2Common:0x6FD95A40` (internal LTCG helper `ITEMS_GetItemsTxtRecordFromUnitOrAlt`,
 * custom reg `eax = pUnit1`, `ecx = pUnit2`, `ret` -> `D2ItemsTxt*` or `0`).
 */
export function ITEMS_GetItemsTxtRecordFromUnitOrAlt113c(
  m: Memory113c,
  pUnit1: number,
  pUnit2: number,
): number {
  if (pUnit1 !== 0 && m.get(pUnit1, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    return lookupItemsTxtRecord113c(m, m.get(pUnit1, D2UnitStrc.dwClassId))
  }
  const nItemId = pUnit2 !== 0 ? m.get(pUnit2, D2UnitStrc.dwClassId) : 0xffffffff
  return lookupItemsTxtRecord113c(m, nItemId)
}

function scaleItemBaseStatEthereal113c(m: Memory113c, pItem: number, statId: number): void {
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const iscCount = m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0
  let cur = 0
  if (iscCount > statId) {
    const pIscRec = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + imul32(statId, D2ItemStatCostTxt_SIZE)) >>> 0
    if (pIscRec !== 0 && m.get(pItem, D2UnitStrc.pStatListEx) !== 0) {
      cur = STATLIST_GetUnitBaseStat113c(m, pItem, statId, 0) | 0
    }
  }
  const pStatListEx = m.get(pItem, D2UnitStrc.pStatListEx)
  if (pStatListEx === 0) return
  const prod = imul32(cur, 3)
  const scaled = sar32((prod - (prod >> 31)) | 0, 1)
  const changed = STATLIST_SetStat113c(m, pStatListEx, statId, scaled, 0)
  if (changed !== 0 && m.get(pItem, D2UnitStrc.dwUnitType) === UNIT_PLAYER) {
    STATLIST_RecordModStat113c(m, pStatListEx, statKey113c(statId, 0))
  }
}

/**
 * `@va D2Common:0x6FD96A40` (internal helper `ITEMS_ApplyEtherealBonusStats`,
 * stdcall `[esp+4] = pItem`, `ret 4`, void).
 */
export function ITEMS_ApplyEtherealBonusStats113c(m: Memory113c, pItem: number): void {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x706)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const pItemData = m.get(pItem, D2UnitStrc.pUnitData)
    if (pItemData !== 0) {
      m.set(
        pItemData,
        D2ItemDataStrc.dwCommandFlags,
        (m.get(pItemData, D2ItemDataStrc.dwCommandFlags) | 0x400000) >>> 0,
      )
    }
  }
  if (ITEMS_CheckItemTypeIdMem113c(m, pItem, 0x2d) !== 0) {
    scaleItemBaseStatEthereal113c(m, pItem, 0x15)
    scaleItemBaseStatEthereal113c(m, pItem, 0x16)
    scaleItemBaseStatEthereal113c(m, pItem, 0x17)
    scaleItemBaseStatEthereal113c(m, pItem, 0x18)
    scaleItemBaseStatEthereal113c(m, pItem, 0x9f)
    scaleItemBaseStatEthereal113c(m, pItem, 0xa0)
  } else {
    scaleItemBaseStatEthereal113c(m, pItem, 0x1f)
  }
}

/**
 * `@va D2Common:0x6FD96E50` (internal LTCG helper `ITEMS_ResetBaseDamageOrACStatFromTxt`,
 * custom reg `esi = pItem`, stack `[esp+4] = nStatId`, `ret 4`, void).
 */
export function ITEMS_ResetBaseDamageOrACStatFromTxt113c(
  m: Memory113c,
  pItem: number,
  nStatId: number,
): void {
  if (pItem === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x61b)
  }
  if (m.get(pItem, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x61c)
  }
  const pRec = lookupItemsTxtRecord113c(m, m.get(pItem, D2UnitStrc.dwClassId))
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x61f)
  }
  const dwCode = m.get(pRec, D2ItemsTxt.dwCode)
  const idx = fogGetLinkIndex113c(m, m.u32(ITEMS_LINK_PTR_VA_113C), dwCode)
  if (idx < 0) return
  const pBaseRec = (m.u32(ITEMS_TXT_PTR_VA_113C) + imul32(idx, D2ItemsTxt_SIZE)) >>> 0
  if (pBaseRec === 0) return

  switch (nStatId | 0) {
    case 0x10:
    case 0x1f: {
      if (ITEMS_CheckItemTypeIdMem113c(m, pItem, 0x32) === 0) return
      const minAc = m.get(pBaseRec, D2ItemsTxt.nMinAc) | 0
      if (minAc === 0) return
      let val = (getUnitBaseStatWithIscCheck113c(m, pItem, 0x1f, 0) + 1) | 0
      if (val <= minAc) {
        val = (minAc + 1) | 0
      }
      STATLIST_SetUnitStat113c(m, pItem, 0x1f, val, 0)
      return
    }
    case 0x11:
    case 0x16: {
      if (ITEMS_CheckItemTypeIdMem113c(m, pItem, 0x2d) === 0) return
      const maxDam = m.get(pBaseRec, D2ItemsTxt.nMaxDam)
      if (maxDam !== 0) {
        STATLIST_SetUnitStat113c(m, pItem, 0x16, maxDam, 0)
      }
      const max2HandDam = m.get(pBaseRec, D2ItemsTxt.n2HandMaxDam)
      if (max2HandDam !== 0) {
        STATLIST_SetUnitStat113c(m, pItem, 0x18, max2HandDam, 0)
      }
      if (checkIfThrowItemMem113c(m, pItem) === 0) return
      const maxMisDam = m.get(pBaseRec, D2ItemsTxt.nMaxMisDam)
      if (maxMisDam === 0) return
      STATLIST_SetUnitStat113c(m, pItem, 0xa0, maxMisDam, 0)
      return
    }
    case 0x12:
    case 0x15: {
      if (ITEMS_CheckItemTypeIdMem113c(m, pItem, 0x2d) === 0) return
      const minDam = m.get(pBaseRec, D2ItemsTxt.nMinDam)
      if (minDam !== 0) {
        STATLIST_SetUnitStat113c(m, pItem, 0x15, minDam, 0)
      }
      const min2HandDam = m.get(pBaseRec, D2ItemsTxt.n2HandMinDam)
      if (min2HandDam !== 0) {
        STATLIST_SetUnitStat113c(m, pItem, 0x17, min2HandDam, 0)
      }
      if (checkIfThrowItemMem113c(m, pItem) === 0) return
      const minMisDam = m.get(pBaseRec, D2ItemsTxt.nMinMisDam)
      if (minMisDam === 0) return
      STATLIST_SetUnitStat113c(m, pItem, 0x9f, minMisDam, 0)
      return
    }
    default:
      return
  }
}

// ============================================================================
// Iteration 8 Lane B — B039, B049, B052 & Cross-Lane B043 Helpers
// ============================================================================

/** `.data` `gItemCalcCallbackTable` (`4 x 8B`) at `0x6FDED354` and count at `0x6FDED374`. */
const ITEM_CALC_FN_TABLE_VA_113C = 0x6fded354
const ITEM_CALC_FN_COUNT_VA_113C = 0x6fded374
/** `.data` `D2InventoryGridInfoStrc` body grid definition at `0x6FDED378`. */
const ITEM_BODY_GRID_DEF_VA_113C = 0x6fded378
/** `.bss` `nRunesTxtRecordCount` at `0x6FDEFBD4` and `pRunesTxt` at `0x6FDEFBD8` (stride `0x120`). */
const RUNES_TXT_COUNT_VA_113C = 0x6fdefbd4
const RUNES_TXT_PTR_VA_113C = 0x6fdefbd8
const D2RUNESTXT_SIZE_113C = 0x120

/** Additional `sgptDataTables` field offsets used by `B039`/`B049`/`B052`. */
const DATATABLES_ITEMS_CODE_BUF_OFF_113C = 0x98
const DATATABLES_ITEMS_CODE_SIZE_OFF_113C = 0x9c
const DATATABLES_MONSTATS_COUNT_OFF_113C = 0xa80
const DATATABLES_SKILLS_TXT_OFF_113C = 0xb98
const DATATABLES_SKILLS_COUNT_OFF_113C = 0xba0
const DATATABLES_SETITEMS_TXT_OFF_113C = 0xc18
const DATATABLES_SETITEMS_COUNT_OFF_113C = 0xc1c
const DATATABLES_SKILL_PARAM_SHIFT_OFF_113C = 0xc6c
const DATATABLES_SKILL_PARAM_MASK_OFF_113C = 0xc70

const INV_OFF_PGRIDS_113C = 0x14
const INV_OFF_NGRIDS_113C = 0x18
const INV_OFF_DWLEFTITEMGUID_113C = 0x1c

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD88A80` (`STATLIST_GetTotalStatWithMin`).
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
    const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
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
 * Exact 1:1 `Memory113c`-backed `0x6FD88B00` (`STATLIST_GetBaseStatWithMin`).
 */
function statListGetBaseStatWithMinMem113c(
  m: Memory113c,
  pStatList: number,
  dwKey: number,
  pIsc: number,
): number {
  const ebx = pStatList >>> 0
  const pHdr = (ebx + 0x24) >>> 0
  const idx = STATLIST_FindStatIndex113c(m, pHdr, dwKey >>> 0)
  if (idx < 0) return 0
  const pEntry = (m.u32(pHdr) + idx * 8) >>> 0
  if (pEntry === 0) return 0
  let val = m.u32((pEntry + 4) >>> 0) | 0
  const ebp = pIsc >>> 0
  if (ebp !== 0) {
    const dl = m.u8((ebp + 0x05) >>> 0)
    const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
    if ((m.u8((pBitMasks + 0x08) >>> 0) & dl) !== 0 && (m.u32((ebx + 0x10) >>> 0) | 0) < 0) {
      const pUnit = m.u32((ebx + 0x44) >>> 0)
      if (pUnit !== 0) {
        const uType = m.u32(pUnit)
        if (uType === 0 || uType === 1) {
          const minAccr = m.u32((ebp + 0x2c) >>> 0) | 0
          if (val < minAccr) {
            const shift = m.u8((ebp + 0x18) >>> 0) & 31
            val = (minAccr << shift) | 0
          }
        }
      }
    }
  }
  return val | 0
}

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
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0)) return 0
  const pIsc = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + imul32(statId, D2ItemStatCostTxt_SIZE)) >>> 0
  if (pIsc === 0) return 0
  const dwKey = ((statId << 16) + (wLayer & 0xffff)) >>> 0
  return statListGetTotalStatWithMinMem113c(m, pStatList, dwKey, pIsc)
}

function statListGetUnitBaseStatMem113c(
  m: Memory113c,
  pUnit: number,
  nStatId: number,
  wLayer: number,
): number {
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) return 0
  const statId = nStatId | 0
  if (statId < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0)) return 0
  const pIsc = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + imul32(statId, D2ItemStatCostTxt_SIZE)) >>> 0
  if (pIsc === 0) return 0
  const pStatList = m.get(unitPtr, D2UnitStrc.pStatListEx)
  if (pStatList === 0) return 0
  const dwKey = ((statId << 16) + (wLayer & 0xffff)) >>> 0
  return statListGetBaseStatWithMinMem113c(m, pStatList, dwKey, pIsc)
}

/**
 * `@va D2Common:0x6FD88FF0` (Cross-lane `B043` helper `STATLIST_GetMaxDurabilityFromUnit`,
 * `__stdcall(pUnit) -> i32`, `ret 4`).
 */
export function ITEMS_B043_GetMaxDurabilityFromUnit113c(m: Memory113c, pUnit: number): number {
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if ((m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0) <= 0x49) return 0
  const pIsc = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + 0x5c64) >>> 0
  if (pIsc === 0) return 0
  const pStatList = m.get(unitPtr, D2UnitStrc.pStatListEx)
  if (pStatList === 0) return 0
  const baseDur = statListGetBaseStatWithMinMem113c(m, pStatList, 0x490000, pIsc)
  if (baseDur === 0) return 0
  return statListGetTotalStatWithMinMem113c(m, pStatList, 0x490000, pIsc) >>> 0
}

/**
 * `@va D2Common:0x6FD89380` (Cross-lane `B043` helper `STATLIST_GetStatDiffAfterClear`,
 * custom reg `eax = pStatList`, `esi = nStatId`, stack `[esp+4] = wLayer` -> `i32`, `ret 4`).
 */
export function ITEMS_B043_GetStatDiffAfterClear113c(
  m: Memory113c,
  pStatList: number,
  nStatId: number,
  wLayer: number,
): number {
  const ebx = pStatList >>> 0
  if (ebx === 0) return 0
  const statId = nStatId | 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const iscCount = m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0
  const iscBase = m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0)
  const dwKey = ((statId << 16) + (wLayer & 0xffff)) >>> 0
  let totalVal = 0
  if (statId >= 0 && statId < iscCount) {
    const pIsc = (iscBase + imul32(statId, D2ItemStatCostTxt_SIZE)) >>> 0
    if (pIsc !== 0) {
      totalVal = statListGetTotalStatWithMinMem113c(m, ebx, dwKey, pIsc)
    }
  }
  let baseVal = 0
  if (statId >= 0 && statId < iscCount) {
    const pIsc = (iscBase + imul32(statId, D2ItemStatCostTxt_SIZE)) >>> 0
    if (pIsc !== 0) {
      baseVal = statListGetBaseStatWithMinMem113c(m, ebx, dwKey, pIsc)
    }
  }
  return ((totalVal - baseVal) | 0) >>> 0
}

/**
 * `@va D2Common:0x6FD89430` (Cross-lane `B043` helper `STATLIST_GetTotalStatFromUnitFast`,
 * `__stdcall(pUnit, nStatId, wLayer) -> i32`, `ret 0xC`).
 */
export function ITEMS_B043_GetTotalStatFromUnitFast113c(
  m: Memory113c,
  pUnit: number,
  nStatId: number,
  wLayer: number,
): number {
  const unitPtr = pUnit >>> 0
  const pStatList = m.get(unitPtr, D2UnitStrc.pStatListEx)
  if (pStatList === 0) return 0
  const statId = nStatId | 0
  if (statId < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0)) return 0
  const pIsc = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + imul32(statId, D2ItemStatCostTxt_SIZE)) >>> 0
  if (pIsc === 0) return 0
  const dwKey = ((statId << 16) + (wLayer & 0xffff)) >>> 0
  return statListGetTotalStatWithMinMem113c(m, pStatList, dwKey, pIsc) >>> 0
}

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD6E1B0` (`INVENTORY_GetOrInitGrid`).
 */
function inventoryGetOrInitGridItemsMem113c(
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
    const ppItems = m.get(pGrid, D2InventoryGridStrc.ppItems)
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
 * Exact 1:1 `Memory113c`-backed `0x6FD73EF0` (`ITEMS_CheckNotBrokenOrUnequipping`).
 */
function checkNotBrokenOrUnequippingMem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) return 0
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 1
  const pData = m.get(ptr, D2UnitStrc.pUnitData)
  if (pData !== 0 && (m.get(pData, D2ItemDataStrc.dwCommandFlags) & 0x100) !== 0) return 0
  if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const pData2 = m.get(ptr, D2UnitStrc.pUnitData)
    if (pData2 !== 0 && (m.get(pData2, D2ItemDataStrc.dwCommandFlags) & 0x4000) !== 0) return 0
  }
  return 1
}

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD70320` (`INVENTORY_GetCompositWeapon`).
 */
function inventoryGetCompositWeaponMem113c(m: Memory113c, pInventory: number): number {
  const inv = pInventory >>> 0
  if (inv === 0 || m.get(inv, D2InventoryStrc.dwSignature) !== INVENTORY_SIGNATURE_113C) return 0
  if (m.u32((inv + INV_OFF_DWLEFTITEMGUID_113C) >>> 0) === 0xffffffff) return 0
  const pGrid1 = inventoryGetOrInitGridItemsMem113c(m, 0, inv, ITEM_BODY_GRID_DEF_VA_113C)
  if (pGrid1 !== 0) {
    const ppItems = m.get(pGrid1, D2InventoryGridStrc.ppItems)
    const pLeft = m.u32((ppItems + 0x14) >>> 0)
    if (
      pLeft !== 0 &&
      ITEMS_CheckItemTypeIdMem113c(m, pLeft, 0x2d) !== 0 &&
      m.get(pLeft, D2UnitStrc.dwUnitId) === m.u32((inv + INV_OFF_DWLEFTITEMGUID_113C) >>> 0)
    ) {
      return pLeft
    }
  }
  if (m.get(inv, D2InventoryStrc.dwSignature) !== INVENTORY_SIGNATURE_113C) return 0
  const pGrid2 = inventoryGetOrInitGridItemsMem113c(m, 0, inv, ITEM_BODY_GRID_DEF_VA_113C)
  if (pGrid2 !== 0) {
    const ppItems = m.get(pGrid2, D2InventoryGridStrc.ppItems)
    const pRight = m.u32((ppItems + 0x10) >>> 0)
    if (
      pRight !== 0 &&
      ITEMS_CheckItemTypeIdMem113c(m, pRight, 0x2d) !== 0 &&
      m.get(pRight, D2UnitStrc.dwUnitId) === m.u32((inv + INV_OFF_DWLEFTITEMGUID_113C) >>> 0)
    ) {
      return pRight
    }
  }
  return 0
}

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD70700` (`INVENTORY_GetActiveWeapon`,
 * returns active weapon `pItem` without writing to stack output pointers).
 */
function inventoryGetActiveWeaponPtrMem113c(m: Memory113c, pInventory: number): number {
  const inv = pInventory >>> 0
  if (inv === 0) return 0
  inventoryGetCompositWeaponMem113c(m, inv)
  if (m.get(inv, D2InventoryStrc.dwSignature) === INVENTORY_SIGNATURE_113C) {
    const pGrid = inventoryGetOrInitGridItemsMem113c(m, 0, inv, ITEM_BODY_GRID_DEF_VA_113C)
    if (pGrid !== 0) {
      const ppItems = m.get(pGrid, D2InventoryGridStrc.ppItems)
      const pRight = m.u32((ppItems + 0x10) >>> 0)
      if (pRight !== 0) {
        if (
          checkNotBrokenOrUnequippingMem113c(m, pRight) !== 0 &&
          ITEMS_CheckItemTypeIdMem113c(m, pRight, 0x2d) !== 0
        ) {
          return pRight
        }
      }
    }
  }
  let pLeft = 0
  if (m.get(inv, D2InventoryStrc.dwSignature) === INVENTORY_SIGNATURE_113C) {
    const pGrid = inventoryGetOrInitGridItemsMem113c(m, 0, inv, ITEM_BODY_GRID_DEF_VA_113C)
    if (pGrid !== 0) {
      const ppItems = m.get(pGrid, D2InventoryGridStrc.ppItems)
      pLeft = m.u32((ppItems + 0x14) >>> 0)
    }
  }
  if (
    checkNotBrokenOrUnequippingMem113c(m, pLeft) !== 0 &&
    ITEMS_CheckItemTypeIdMem113c(m, pLeft, 0x2d) !== 0
  ) {
    return pLeft
  }
  return 0
}

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD70830` (`INVENTORY_GetWeaponByHandSlot`).
 */
function inventoryGetWeaponByHandSlotMem113c(
  m: Memory113c,
  pInventory: number,
  nHandSlot: number,
): number {
  const inv = pInventory >>> 0
  if (inv === 0 || m.get(inv, D2InventoryStrc.dwSignature) !== INVENTORY_SIGNATURE_113C) return 0
  const pGrid = inventoryGetOrInitGridItemsMem113c(m, 0, inv, ITEM_BODY_GRID_DEF_VA_113C)
  if (pGrid === 0) return 0
  const pComp = inventoryGetCompositWeaponMem113c(m, inv)
  const slot = nHandSlot | 0
  for (let off = 0; off < 0x2c; off += 4) {
    const ppItems = m.get(pGrid, D2InventoryGridStrc.ppItems)
    const pItem = m.u32((ppItems + off) >>> 0)
    if (pItem === 0) continue
    const wClassIdx = ITEMS_GetWeaponClassCodeIdx113c(m, pItem) & 0xffff
    if (wClassIdx === 2 || wClassIdx === 3 || wClassIdx === 0x0c) {
      if (slot === 6) {
        if (pItem !== pComp) return pItem
      } else if (slot === 5) {
        if (pItem === pComp) return pItem
      }
    } else {
      const compByte = ITEMS_GetComponentFromItem113c(m, pItem) & 0xff
      if (compByte === slot) return pItem
    }
  }
  return 0
}

/**
 * Exact 1:1 `Memory113c`-backed `0x6FD80530` (`UNITS_CanDualWield`).
 */
function unitsCanDualWieldMem113c(m: Memory113c, pUnit: number): number {
  const ptr = pUnit >>> 0
  const uType = ptr !== 0 ? m.get(ptr, D2UnitStrc.dwUnitType) : 6
  const classId = ptr !== 0 ? (m.get(ptr, D2UnitStrc.dwClassId) | 0) : -1
  if (uType === 0) {
    return classId === 4 || classId === 6 ? 1 : 0
  }
  if (uType === 1) {
    if (classId < 0) return 0
    const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
    if (classId >= (m.u32((sgpt + DATATABLES_MONSTATS_COUNT_OFF_113C) >>> 0) | 0)) return 0
    return classId >= 0x1a1 && classId <= 0x1a2 ? 1 : 0
  }
  return 0
}

/**
 * Exact 1:1 `Memory113c`-backed `Fog.#10253` (`Fog:0x6FF69E90` `FOG_EvalPostFixExpression`)
 * specialized for `0x6FD73CE0` (`ITEMS_EvalItemCalc113c`).
 */
function fogEvalItemPostFixExpression113c(
  m: Memory113c,
  pBuf: number,
  nBufSize: number,
  pFnTable: number,
  nFnTableSize: number,
  pItem: number,
  _pOwner: number,
): number {
  const size = nBufSize | 0
  if (size <= 0) return 0
  const stack = new Int32Array(64)
  let sp = 0
  const pop = (): number => (sp > 0 ? stack[--sp]! : 0)
  const push = (v: number): void => {
    if (sp < 64) stack[sp++] = v | 0
  }
  const base = pBuf >>> 0
  let cur = base
  while (((cur - base) | 0) < size) {
    const op = m.u8(cur)
    cur = (cur + 1) >>> 0
    if (op === 0 || op > 22 || op === 2 || op === 3) {
      return sp > 0 ? stack[sp - 1]! >>> 0 : 0
    }
    switch (op) {
      case 1: {
        const fnIdx = m.u8(cur)
        cur = (cur + 1) >>> 0
        if ((fnIdx | 0) >= (nFnTableSize | 0)) {
          push(0)
          break
        }
        const arity = m.u32((pFnTable + fnIdx * 8 + 4) >>> 0) | 0
        const fnVa = m.u32((pFnTable + fnIdx * 8) >>> 0)
        let a1 = 0
        let a2 = 0
        if (arity === 3) {
          pop()
          a2 = pop()
          a1 = pop()
        } else if (arity === 2) {
          a2 = pop()
          a1 = pop()
        } else if (arity === 1) {
          a1 = pop()
        } else if (arity !== 0) {
          push(0)
          break
        }
        let res = 0
        if (fnVa === 0x6fd73d60) {
          res = ITEMS_MinIntFastcall113c(m, a1, a2) | 0
        } else if (fnVa === 0x6fd73d50) {
          res = ITEMS_MaxIntFastcall113c(m, a1, a2) | 0
        } else if (fnVa === 0x6fd767c0) {
          res = pItem !== 0 ? (SEED_RollLimitedRandomNumberInline113c(m, (pItem + 0x20) >>> 0, a1, a2) | 0) : 0
        } else if (fnVa === 0x6fd77120) {
          res = evalItemStatDirect113c(m, a1, a2, pItem) | 0
        }
        push(res)
        break
      }
      case 4: {
        if (((cur - base) | 0) >= size) return 0
        cur = (cur + 1) >>> 0
        push(0)
        break
      }
      case 5: {
        if (((cur - base) | 0) >= size) return 0
        cur = (cur + 2) >>> 0
        push(0)
        break
      }
      case 6: {
        if (((cur - base) | 0) >= size) return 0
        cur = (cur + 4) >>> 0
        push(0)
        break
      }
      case 7: {
        if (((cur - base) | 0) >= size) return 0
        const v = (m.u8(cur) << 24) >> 24
        cur = (cur + 1) >>> 0
        push(v)
        break
      }
      case 8: {
        if (((cur - base) | 0) >= size) return 0
        const v = (m.u16(cur) << 16) >> 16
        cur = (cur + 2) >>> 0
        push(v)
        break
      }
      case 9: {
        if (((cur - base) | 0) >= size) return 0
        const v = m.u32(cur) | 0
        cur = (cur + 4) >>> 0
        push(v)
        break
      }
      case 10: {
        const rhs = pop()
        const lhs = pop()
        push(lhs < rhs ? 1 : 0)
        break
      }
      case 11: {
        const rhs = pop()
        const lhs = pop()
        push(lhs > rhs ? 1 : 0)
        break
      }
      case 12: {
        const rhs = pop()
        const lhs = pop()
        push(lhs <= rhs ? 1 : 0)
        break
      }
      case 13: {
        const rhs = pop()
        const lhs = pop()
        push(lhs >= rhs ? 1 : 0)
        break
      }
      case 14: {
        const rhs = pop()
        const lhs = pop()
        push(lhs === rhs ? 1 : 0)
        break
      }
      case 15: {
        const rhs = pop()
        const lhs = pop()
        push(lhs !== rhs ? 1 : 0)
        break
      }
      case 16: {
        const rhs = pop()
        const lhs = pop()
        push((lhs + rhs) | 0)
        break
      }
      case 17: {
        const rhs = pop()
        const lhs = pop()
        push((lhs - rhs) | 0)
        break
      }
      case 18: {
        const rhs = pop()
        const lhs = pop()
        push(imul32(lhs, rhs))
        break
      }
      case 19: {
        const rhs = pop()
        const lhs = pop()
        push(rhs === 0 ? 0 : (Math.trunc(lhs / rhs) | 0))
        break
      }
      case 20: {
        const exp = pop()
        const baseVal = pop()
        if (exp <= 0) {
          push(1)
        } else {
          let acc = baseVal
          for (let k = exp - 1; k > 0; k--) {
            acc = imul32(acc, baseVal)
          }
          push(acc)
        }
        break
      }
      case 21: {
        const v = pop()
        push((-v) | 0)
        break
      }
      case 22: {
        const fVal = pop()
        const tVal = pop()
        const cond = pop()
        push(cond !== 0 ? tVal : fVal)
        break
      }
      default:
        break
    }
  }
  return 0
}

function evalItemStatDirect113c(m: Memory113c, nStatId: number, nMode: number, pUnit: number): number {
  const unitPtr = pUnit >>> 0
  if (unitPtr === 0) return 0
  const statId = nStatId | 0
  if (statId < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0)) return 0
  if (statId === 0x13) {
    return UNITS_GetPlayerBaseToHit113c(m, unitPtr) >>> 0
  }
  const mode = nMode | 0
  if (mode === 1) {
    return statListGetUnitBaseStatMem113c(m, unitPtr, statId, 0) >>> 0
  }
  if (mode === 2) {
    return ITEMS_B043_GetTotalStatFromUnitFast113c(m, unitPtr, statId, 0) >>> 0
  }
  return statListGetUnitStatMem113c(m, unitPtr, statId, 0) >>> 0
}

// ============================================================================
// Batch B039 — items.ts functions (B039-02, B039-04, B039-05)
// ============================================================================

/**
 * `@va D2Common:0x6FD72F50` (`D2Common.#10321` `ITEMS_GetMissileType`,
 * `__stdcall(pItem) -> i32`, `ret 4`).
 */
export function ITEMS_GetMissileType113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0xffffffff
  const pRec = lookupItemsTxtRecord113c(m, m.get(ptr, D2UnitStrc.dwClassId))
  return m.u16((pRec + 0xfa) >>> 0)
}

/**
 * `@va D2Common:0x6FD745C0` (`D2Common.#10439` `ITEMS_CheckIfSocketFiller`,
 * `__stdcall(pItem) -> BOOL`, `ret 4`).
 */
export function ITEMS_CheckIfSocketFiller113c(m: Memory113c, pItem: number): number {
  return ITEMS_CheckItemTypeIdMem113c(m, pItem >>> 0, 0x35)
}

/**
 * `@va D2Common:0x6FD81B90` (`D2Common.#10641` `ITEMS_GetActiveWeaponForAttack`,
 * `__stdcall(pUnit, bCheckSkill) -> pItem`, `ret 8`).
 */
export function ITEMS_GetActiveWeaponForAttack113c(
  m: Memory113c,
  pUnit: number,
  bCheckSkill: number,
): number {
  const unitPtr = pUnit >>> 0
  const pInventory = m.get(unitPtr, D2UnitStrc.pInventory)
  if (pInventory === 0) return 0
  let pActiveWeap = inventoryGetActiveWeaponPtrMem113c(m, pInventory)
  if (unitsCanDualWieldMem113c(m, unitPtr) === 0) return pActiveWeap
  const pSkills = m.get(unitPtr, D2UnitStrc.pSkills)
  if (pSkills === 0) return pActiveWeap
  const pUsedSkill = m.u32((pSkills + 0x10) >>> 0)
  if (pUsedSkill === 0) return pActiveWeap
  const pSkillsTxt = m.u32(pUsedSkill)
  if (pSkillsTxt === 0) return pActiveWeap
  const bWeapSel = m.u8((pSkillsTxt + 0x168) >>> 0)
  let esi = 0
  switch ((bWeapSel - 1) >>> 0) {
    case 0: {
      esi = inventoryGetWeaponByHandSlotMem113c(m, pInventory, 6)
      break
    }
    case 1: {
      const skillFlags = (m.u32((pUsedSkill + 0x0c) >>> 0) & 0x2000) >>> 0
      esi = inventoryGetWeaponByHandSlotMem113c(m, pInventory, 5)
      const edi = inventoryGetWeaponByHandSlotMem113c(m, pInventory, 6)
      if (esi === 0 || ITEMS_CheckItemTypeIdMem113c(m, esi, 0x2d) === 0) {
        esi = edi
      } else if (edi !== 0 && ITEMS_CheckItemTypeIdMem113c(m, edi, 0x2d) !== 0 && skillFlags !== 0) {
        esi = edi
      }
      break
    }
    case 2: {
      const flag26 = (m.get(unitPtr, D2UnitStrc.dwFlags2) >>> 26) & 1
      const seqFrame = sar32(m.u32((unitPtr + 0x38) >>> 0) | 0, 8)
      let ecx = 0
      if (flag26 !== 0) {
        ecx = seqFrame % 2
      } else {
        ecx = seqFrame > 5 ? 1 : 0
      }
      if (seqFrame !== 0 && ((bCheckSkill | 0) === 0 || ecx !== 0)) {
        esi = inventoryGetWeaponByHandSlotMem113c(m, pInventory, 6)
      } else {
        esi = inventoryGetWeaponByHandSlotMem113c(m, pInventory, 5)
      }
      break
    }
    case 3: {
      pActiveWeap = 0
      esi = 0
      break
    }
    default: {
      esi = inventoryGetWeaponByHandSlotMem113c(m, pInventory, 5)
      if (esi === 0 || ITEMS_CheckItemTypeIdMem113c(m, esi, 0x2d) === 0) {
        esi = inventoryGetWeaponByHandSlotMem113c(m, pInventory, 6)
      }
      break
    }
  }
  if (
    ITEMS_CheckItemTypeIdMem113c(m, esi, 0x2d) !== 0 &&
    checkNotBrokenOrUnequippingMem113c(m, esi) !== 0
  ) {
    return esi >>> 0
  }
  return pActiveWeap >>> 0
}

// ============================================================================
// Batch B049 — items.ts functions (B049-01..12, B049-14..15)
// ============================================================================

/**
 * `@va D2Common:0x6FD730F0` (`D2Common.#11088` `ITEMS_GetItemTypeFromItem`,
 * `__stdcall(pItem) -> i32`, `ret 4`).
 */
export function ITEMS_GetItemTypeFromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x67e)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  return ITEMS_IsTome113c(m, m.get(ptr, D2UnitStrc.dwClassId))
}

/**
 * `@va D2Common:0x6FD73CE0` (`D2Common.#10428` `ITEMS_EvalItemCalc`,
 * `__stdcall(pItem, pOwner, dwCalcOffset) -> i32`, `ret 0xC`).
 */
export function ITEMS_EvalItemCalc113c(
  m: Memory113c,
  pItem: number,
  pOwner: number,
  dwCalcOffset: number,
): number {
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const pCodeBuf = m.u32((sgpt + DATATABLES_ITEMS_CODE_BUF_OFF_113C) >>> 0)
  if (pCodeBuf === 0) return 0
  const nCodeSize = m.u32((sgpt + DATATABLES_ITEMS_CODE_SIZE_OFF_113C) >>> 0)
  const off = dwCalcOffset >>> 0
  if (off >= nCodeSize) return 0
  const fnCount = m.u32(ITEM_CALC_FN_COUNT_VA_113C) | 0
  return fogEvalItemPostFixExpression113c(
    m,
    (pCodeBuf + off) >>> 0,
    (nCodeSize - off) | 0,
    ITEM_CALC_FN_TABLE_VA_113C,
    fnCount,
    pItem >>> 0,
    pOwner >>> 0,
  )
}

/**
 * `@va D2Common:0x6FD745D0` (`D2Common.#10519` `ITEMS_GetGemApplyTypeFromItem`,
 * `__stdcall(pItem) -> u8`, `ret 4`).
 */
export function ITEMS_GetGemApplyTypeFromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xf3e)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0xf3f)
  }
  return ITEMS_GetGemApplyType113c(m, m.get(ptr, D2UnitStrc.dwClassId))
}

/**
 * `@va D2Common:0x6FD74710` (`D2Common.#11000` `ITEMS_GetMagicLevelFromItem`,
 * `__stdcall(pItem) -> i32`, `ret 4`).
 */
export function ITEMS_GetMagicLevelFromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xdad)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0xdae)
  }
  if (
    ITEMS_CheckItemTypeIdMem113c(m, ptr, 0x16) !== 0 ||
    ITEMS_CheckItemTypeIdMem113c(m, ptr, 0x12) !== 0
  ) {
    let wIdx = 0
    if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
      const pData = m.get(ptr, D2UnitStrc.pUnitData)
      if (pData !== 0) {
        wIdx = m.u16((pData + 0x3e) >>> 0)
      }
    }
    const pQual = DATATBLS_GetQualityItemsTxtRecord113c(m, wIdx)
    if (pQual === 0) return 0xffffffff
    return m.u8((pQual + 0x02) >>> 0)
  }
  const pRec = lookupItemsTxtRecord113c(m, m.get(ptr, D2UnitStrc.dwClassId))
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xdb9)
  }
  return m.u8((pRec + 0x134) >>> 0)
}

/**
 * `@va D2Common:0x6FD747C0` (`D2Common.#10432` `ITEMS_GetGambleCostFromItem`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_GetGambleCostFromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xd94)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0xd95)
  }
  return ITEMS_GetGambleCost113c(m, m.get(ptr, D2UnitStrc.dwClassId))
}

/**
 * `@va D2Common:0x6FD74800` (`D2Common.#11079` `ITEMS_GetBitField2FromItem`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_GetBitField2FromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xd7c)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0xd7d)
  }
  return ITEMS_GetBitField2113c(m, m.get(ptr, D2UnitStrc.dwClassId))
}

function lookupItemsTxtByCodeNoOut113c(m: Memory113c, dwCode: number): number {
  const idx = fogGetLinkIndex113c(m, m.u32(ITEMS_LINK_PTR_VA_113C), dwCode >>> 0)
  if ((idx >>> 0) >= m.u32(ITEMS_TXT_COUNT_VA_113C)) return 0
  const base = m.u32(ITEMS_TXT_PTR_VA_113C)
  if (base === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1ef)
  }
  return (base + imul32(idx, D2ItemsTxt_SIZE)) >>> 0
}

/**
 * `@va D2Common:0x6FD74840` (internal `ITEMS_ComputeGambleBaseCost`,
 * custom reg `eax = pItem`, stack `[esp+4] = nUnitLevel` -> `i32`, `ret 4`).
 */
export function ITEMS_ComputeGambleBaseCost113c(
  m: Memory113c,
  pItem: number,
  nUnitLevel: number,
): number {
  const dwCode = ITEMS_GetAltGfxOrBaseCode113c(m, pItem >>> 0)
  const idx = fogGetLinkIndex113c(m, m.u32(ITEMS_LINK_PTR_VA_113C), dwCode)
  if ((idx >>> 0) >= m.u32(ITEMS_TXT_COUNT_VA_113C)) {
    throw new D2CommonAssertError('Items.cpp', 0xb1b)
  }
  const base = m.u32(ITEMS_TXT_PTR_VA_113C)
  if (base === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1ef)
  }
  const esi = (base + imul32(idx, D2ItemsTxt_SIZE)) >>> 0
  if (esi === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xb1b)
  }
  const code = m.get(esi, D2ItemsTxt.dwCode)
  const ultraCode = m.u32((esi + 0x8c) >>> 0)
  const uberCode = m.u32((esi + 0x88) >>> 0)
  if (code === 0x206e6972 || code === 0x20756d61) {
    return m.u32((esi + 0xd4) >>> 0)
  }
  const sumStack = ((m.u32((esi + 0xe8) >>> 0) | 0) + (m.u32((esi + 0xe4) >>> 0) | 0)) | 0
  let avgStack = sar32((sumStack - (sumStack >> 31)) | 0, 1)
  if (avgStack < 1) avgStack = 1
  const baseVal = imul32(m.u32((esi + 0xe0) >>> 0) | 0, avgStack)
  const baseLvl = m.u8((esi + 0xfd) >>> 0)
  let ebx = 0
  let uberCost = 0
  let edi = 0
  let ultraCost = 0
  if (uberCode !== 0 && uberCode !== 0x20202030) {
    const pUber = lookupItemsTxtByCodeNoOut113c(m, uberCode)
    if (pUber !== 0) {
      const uberLvl = m.u8((pUber + 0xfd) >>> 0)
      const t = imul32(((nUnitLevel | 0) - uberLvl) | 0, 100)
      ebx = (sar32((t - (t >> 31)) | 0, 1) + 1) | 0
      if (ebx < 0) ebx = 0
      uberCost = m.u32((pUber + 0xe0) >>> 0) | 0
    }
  }
  if (ultraCode !== 0 && m.u32((esi + 0x8c) >>> 0) !== 0x20202030) {
    const pUltra = lookupItemsTxtByCodeNoOut113c(m, ultraCode)
    if (pUltra !== 0) {
      const ultraLvl = m.u8((pUltra + 0xfd) >>> 0)
      const t = imul32(((nUnitLevel | 0) - ultraLvl) | 0, 100)
      edi = (sar32((t + ((t >> 31) & 3)) | 0, 2) + 1) | 0
      if (edi < 0) edi = 0
      ultraCost = m.u32((pUltra + 0xe0) >>> 0) | 0
    }
  }
  const weighted = (imul32((10000 - edi - ebx) | 0, baseVal) + imul32(ultraCost, edi) + imul32(uberCost, ebx)) | 0
  const esiCost = Math.trunc(weighted / 10000) | 0
  const uLvl = (nUnitLevel | 0) <= 5 ? 5 : (nUnitLevel | 0)
  const diff2d = (baseLvl - 0x2d) | 0
  const clampedDiff2d = diff2d < 0 ? 0 : diff2d
  const halfBaseLvl = sar32((baseLvl - (baseLvl >> 31)) | 0, 1)
  const term1 = Math.trunc(imul32((clampedDiff2d - halfBaseLvl + uLvl) | 0, 250) / 3) | 0
  const term2 = (Math.trunc(((uLvl * 2 + 1) | 0) / 3) + 20) | 0
  const prod = imul32((term1 + esiCost) | 0, term2)
  return (Math.trunc(prod / 15) | 0) >>> 0
}

/**
 * `@va D2Common:0x6FD74F00` (internal `ITEMS_CanItemBePersonalizedOrRepaired`,
 * custom reg `esi = pItem` -> `BOOL`, `ret`).
 */
export function ITEMS_CanItemBePersonalizedOrRepaired113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x67e)
  }
  let wType1 = 0
  if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    wType1 = ITEMS_IsTome113c(m, m.get(ptr, D2UnitStrc.dwClassId)) | 0
    if (wType1 < 0) return 0
  }
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (wType1 >= (m.u32((sgpt + DATATABLES_ITEMTYPES_COUNT_OFF_113C) >>> 0) | 0)) return 0
  const pTypeRec = (m.u32((sgpt + DATATABLES_ITEMTYPES_TXT_OFF_113C) >>> 0) + imul32(wType1, D2ItemTypesTxt_SIZE)) >>> 0
  if (pTypeRec === 0) return 0
  if (m.u8((pTypeRec + 0x08) >>> 0) === 0) return 0
  if (checkIfThrowItemMem113c(m, ptr) === 0) return 0
  if (ITEMS_GetTwoHandedFlag113c(m, ptr) === 0) return 0
  if (ITEMS_CheckEtherealFlag113c(m, ptr) !== 0) return 0
  return 1
}

/**
 * `@va D2Common:0x6FD750B0` (`D2Common.#10185` `ITEMS_CheckIfImbueable`,
 * `__stdcall(pItem) -> BOOL`, `ret 4`).
 */
export function ITEMS_CheckIfImbueable113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x67e)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    if ((ITEMS_IsTome113c(m, m.get(ptr, D2UnitStrc.dwClassId)) | 0) === 4) return 0
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const pData = m.get(ptr, D2UnitStrc.pUnitData)
    if (pData !== 0 && (m.get(pData, D2ItemDataStrc.dwCommandFlags) & 0x1000) !== 0) return 0
  }
  const classId = m.get(ptr, D2UnitStrc.dwClassId)
  if (ITEMS_IsThrowableBit113c(m, classId) === 0) return 0
  if (((m.get(ptr, D2UnitStrc.dwFlags2) >>> 25) & 1) === 0) {
    if (checkIfThrowItemMem113c(m, ptr) !== 0) return 0
  }
  const pRec = lookupItemsTxtRecord113c(m, classId)
  if (m.get(pRec, D2ItemsTxt.nComponent) !== 0) {
    if (ITEMS_GetBaseCode113c(m, ptr) !== 0x2067656c) return 0
  }
  if (ITEMS_HasSocketedItems113c(m, ptr) !== 0) return 0
  if (ITEMS_CheckCommandFlags113c(m, ptr, 0x800, 0x12c8, 0x6fde4848) !== 0) return 0
  const qual = ITEMS_GetItemQuality113c(m, ptr) | 0
  if (qual === 5 || qual === 4 || qual === 6 || qual === 8 || qual === 7 || qual === 9) return 0
  return 1
}

/**
 * `@va D2Common:0x6FD75C10` (internal `ITEMS_EncodeCompactAndBasicItemStream`,
 * custom reg `ebx = pBitStream`, stack `[esp+4] = pItem`, `[esp+8] = bWriteAutoAffix`, `ret 8`, void).
 */
export function ITEMS_EncodeCompactAndBasicItemStream113c(
  m: Memory113c,
  pBitStream: number,
  pItem: number,
  bWriteAutoAffix: number,
): void {
  const bs = pBitStream >>> 0
  const ptr = pItem >>> 0
  const nItemId = ptr !== 0 ? m.get(ptr, D2UnitStrc.dwClassId) : 0xffffffff
  if ((nItemId >>> 0) >= m.u32(ITEMS_TXT_COUNT_VA_113C)) {
    throw new D2CommonAssertError('Items.cpp', 0x1c4d)
  }
  const base = m.u32(ITEMS_TXT_PTR_VA_113C)
  if (base === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1ef)
  }
  const pRec = (base + imul32(nItemId, D2ItemsTxt_SIZE)) >>> 0
  if (pRec === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1c4d)
  }
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1505)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x1506)
  }
  const pItemData = m.get(ptr, D2UnitStrc.pUnitData)
  if (pItemData === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1508)
  }
  let fmt = m.get(pItemData, D2ItemDataStrc.wItemFormat) | 0
  if (fmt <= 0) fmt = 0
  else if (fmt >= 0x3ff) fmt = 0x3ff
  fogWriteBits113c(m, bs, fmt, 0x0a)

  const animMode = m.get(ptr, D2UnitStrc.dwAnimMode) | 0
  let clampedMode = animMode
  if (clampedMode <= 0) clampedMode = 0
  else if (clampedMode >= 7) clampedMode = 7
  fogWriteBits113c(m, bs, clampedMode, 3)

  const curMode = m.get(ptr, D2UnitStrc.dwAnimMode) | 0
  if (curMode === 3 || curMode === 5) {
    const uType1 = m.get(ptr, D2UnitStrc.dwUnitType) | 0
    const pPath1 = m.get(ptr, D2UnitStrc.pPath)
    let posX = 0
    if (uType1 === 2 || (uType1 > 3 && uType1 <= 5)) {
      posX = m.u32((pPath1 + 0x0c) >>> 0) | 0
    } else if (pPath1 !== 0) {
      posX = m.u16((pPath1 + 0x02) >>> 0)
    }
    if (posX <= 0) posX = 0
    else if (posX >= 0xffff) posX = 0xffff
    fogWriteBits113c(m, bs, posX, 0x10)

    const uType2 = m.get(ptr, D2UnitStrc.dwUnitType) | 0
    const pPath2 = m.get(ptr, D2UnitStrc.pPath)
    let posY = 0
    if (uType2 === 2 || (uType2 > 3 && uType2 <= 5)) {
      posY = m.u32((pPath2 + 0x10) >>> 0) | 0
    } else if (pPath2 !== 0) {
      posY = m.u16((pPath2 + 0x06) >>> 0)
    }
    if (posY <= 0) posY = 0
    else if (posY >= 0xffff) posY = 0xffff
    fogWriteBits113c(m, bs, posY, 0x10)
  } else {
    let bodyLoc = 0
    if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
      const pData = m.get(ptr, D2UnitStrc.pUnitData)
      if (pData !== 0) bodyLoc = m.get(pData, D2ItemDataStrc.nBodyLoc)
    }
    if (bodyLoc <= 0) bodyLoc = 0
    else if (bodyLoc >= 0x0f) bodyLoc = 0x0f
    fogWriteBits113c(m, bs, bodyLoc, 4)

    const uType1 = m.get(ptr, D2UnitStrc.dwUnitType) | 0
    const pPath1 = m.get(ptr, D2UnitStrc.pPath)
    let posX = 0
    if (uType1 === 2 || (uType1 > 3 && uType1 <= 5)) {
      posX = m.u32((pPath1 + 0x0c) >>> 0) | 0
    } else if (pPath1 !== 0) {
      posX = m.u16((pPath1 + 0x02) >>> 0)
    }
    if (posX <= 0) posX = 0
    else if (posX >= 0x0f) posX = 0x0f
    fogWriteBits113c(m, bs, posX, 4)

    const uType2 = m.get(ptr, D2UnitStrc.dwUnitType) | 0
    const pPath2 = m.get(ptr, D2UnitStrc.pPath)
    let posY = 0
    if (uType2 === 2 || (uType2 > 3 && uType2 <= 5)) {
      posY = m.u32((pPath2 + 0x10) >>> 0) | 0
    } else if (pPath2 !== 0) {
      posY = m.u16((pPath2 + 0x06) >>> 0)
    }
    if (posY <= 0) posY = 0
    else if (posY >= 0x0f) posY = 0x0f
    fogWriteBits113c(m, bs, posY, 4)

    let rawPage = 0xff
    if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
      const pData = m.get(ptr, D2UnitStrc.pUnitData)
      if (pData !== 0) rawPage = m.get(pData, D2ItemDataStrc.nInvPage)
    }
    let page = (((rawPage + 1) & 0xff) << 24) >> 24
    if (page <= 0) page = 0
    else if (page >= 7) page = 7
    fogWriteBits113c(m, bs, page, 3)
  }

  let cmdFlags = 0
  if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const pData = m.get(ptr, D2UnitStrc.pUnitData)
    if (pData !== 0) cmdFlags = m.get(pData, D2ItemDataStrc.dwCommandFlags)
  }
  if ((cmdFlags & 0x10000) !== 0) {
    let namePtr = 0
    if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
      const pData = m.get(ptr, D2UnitStrc.pUnitData)
      if (pData !== 0) namePtr = (pData + D2ItemDataStrc.szPlayerName.off) >>> 0
    }
    let cell = ITEMS_GetItemCell113c(m, ptr) | 0
    if (cell <= 0) cell = 0
    else if (cell >= 7) cell = 7
    fogWriteBits113c(m, bs, cell, 3)

    let earLvl = 1
    if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
      const pData = m.get(ptr, D2UnitStrc.pUnitData)
      if (pData !== 0) earLvl = m.get(pData, D2ItemDataStrc.bEarLevel)
    }
    if (earLvl <= 0) earLvl = 0
    else if (earLvl >= 0x7f) earLvl = 0x7f
    fogWriteBits113c(m, bs, earLvl, 7)

    let curName = namePtr
    while (true) {
      let ch = (m.u8(curName) << 24) >> 24
      if (ch <= 0) ch = 0
      else if (ch >= 0x7f) ch = 0x7f
      fogWriteBits113c(m, bs, ch, 7)
      const rawCh = m.u8(curName)
      curName = (curName + 1) >>> 0
      if (rawCh === 0) break
    }
  } else {
    const code = ITEMS_GetBaseCode113c(m, ptr)
    fogWriteBits113c(m, bs, code, 0x20)
    if (ITEMS_CheckItemTypeIdMem113c(m, ptr, 4) !== 0) {
      const gold = statListGetUnitStatMem113c(m, ptr, 0x0e, 0) | 0
      const isBig = gold >= 0x1000 ? 1 : 0
      fogWriteBits113c(m, bs, isBig, 1)
      const goldBits = gold < 0x1000 ? 0x0c : 0x20
      let clampedGold = gold
      if (goldBits !== 0x20) {
        const maxGold = ((1 << goldBits) - 1) | 0
        const mask = gold <= 0 ? 0 : -1
        const masked = gold & mask
        clampedGold = masked >= maxGold ? maxGold : masked
      }
      fogWriteBits113c(m, bs, clampedGold, goldBits)
    }
  }

  if (m.get(pRec, D2ItemsTxt.nComponent) !== 0 && m.u8((pRec + 0x12b) >>> 0) !== 0) {
    const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
    if ((m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0) <= 0x164) {
      throw new D2CommonAssertError('Items.cpp', 0x1c7b)
    }
    const pIsc = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + 0x1c290) >>> 0
    if (pIsc === 0) {
      throw new D2CommonAssertError('Items.cpp', 0x1c7b)
    }
    const saveBits = m.u8((pIsc + 0x19) >>> 0)
    const qVal = statListGetUnitStatMem113c(m, ptr, 0x164, 0) | 0
    const shift = m.u8((pIsc + 0x18) >>> 0) & 31
    const saveAdd = m.u32((pIsc + 0x1c) >>> 0) | 0
    ITEMS_WriteBitsClamped113c(m, saveBits, (sar32(qVal, shift) + saveAdd) | 0, bs)
  }

  if ((bWriteAutoAffix | 0) !== 0) {
    let dwParam0 = 0
    let dwParam1 = 0
    if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
      const pData = m.get(ptr, D2UnitStrc.pUnitData)
      if (pData !== 0) {
        dwParam0 = m.get(pData, D2ItemDataStrc.dwActionStamp)
        dwParam1 = m.get(pData, D2ItemDataStrc.dwFileIndex)
      }
    }
    if (dwParam1 !== 0) {
      fogWriteBits113c(m, bs, 1, 1)
      fogWriteBits113c(m, bs, dwParam0, 0x20)
      fogWriteBits113c(m, bs, dwParam1, 0x20)
      fogWriteBits113c(m, bs, 0, 0x20)
    } else {
      fogWriteBits113c(m, bs, 0, 1)
    }
  }
}

/**
 * `@va D2Common:0x6FD760F0` (`D2Common.#10463` `ITEMS_GetTotalMaxStack`,
 * `__stdcall(pItem) -> i32`, `ret 4`).
 */
export function ITEMS_GetTotalMaxStack113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0xd5b)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0xd5c)
  }
  const baseStack = ITEMS_GetBaseSpeed113c(m, m.get(ptr, D2UnitStrc.dwClassId)) | 0
  const pStatList = m.get(ptr, D2UnitStrc.pStatListEx)
  let extraStack = 0
  if (pStatList !== 0) {
    const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
    if ((m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0) > 0xfe) {
      const pIsc = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + 0x14178) >>> 0
      if (pIsc !== 0) {
        extraStack = statListGetTotalStatWithMinMem113c(m, pStatList, 0xfe0000, pIsc)
      }
    }
  }
  let total = (baseStack + extraStack) | 0
  if (total >= 0x1ff) total = 0x1ff
  return total >>> 0
}

/**
 * Read-only form of `D2Common 0x6FD88410` (`STATLIST_CopyUnitFullStatsToBuffer113c`, statlist.ts) for callers
 * whose destination is a DLL stack buffer (no observable memory writes): `0` unless `pUnit != 0`,
 * `pUnit->pStatListEx (+0x5C) != 0` and its `dwFlags (+0x10)` is negative (0x6FD88410..0x6FD88424); otherwise
 * `count = min_signed(movsx(wFullStatCount (+0x4C)), nMax)` (0x6FD8842B..0x6FD88437) and the keys of the first
 * `count` `pFullStat (+0x48)` entries (none when `count <= 0`, 0x6FD88440 `jae`).
 */
function readUnitFullStatsMem113c(
  m: Memory113c,
  pUnit: number,
  nMax: number,
): { count: number; keys: number[] } {
  const u = pUnit >>> 0
  if (u === 0) return { count: 0, keys: [] }
  const pListEx = m.get(u, D2UnitStrc.pStatListEx)
  if (pListEx === 0) return { count: 0, keys: [] }
  if ((m.get(pListEx, D2StatListStrc.dwFlags) | 0) >= 0) return { count: 0, keys: [] }
  let count = (m.get(pListEx, D2StatListExStrc.wFullStatCount) << 16) >> 16
  if (count >= (nMax | 0)) count = nMax | 0
  const keys: number[] = []
  const pArr = m.get(pListEx, D2StatListExStrc.pFullStat) >>> 0
  for (let i = 0; i < count; i++) {
    keys.push(m.u32((pArr + i * 8) >>> 0))
  }
  return { count, keys }
}

/**
 * `@va D2Common:0x6FD78850` (internal `ITEMS_CalculateAdditionalCostsForBonusStats`,
 * custom reg `ecx = pItem`, stack `[esp+4] = pCost0`, `[esp+8] = pCost1`,
 * `[esp+0xC] = pCost2`, `[esp+0x10] = nDivisor`, `ret 0x10`, void).
 */
export function ITEMS_CalculateAdditionalCostsForBonusStats113c(
  m: Memory113c,
  pItem: number,
  pCost0: number,
  pCost1: number,
  pCost2: number,
  nDivisor: number,
): void {
  const ptr = pItem >>> 0
  // 0x6FD7885E..0x6FD78873: `0x6FD88410(pItem, stackBuf, 0x1FF)` (`STATLIST_CopyUnitFullStatsToBuffer`); the
  // returned count is tested with a signed `jle` (0x6FD78884), so `<= 0` (incl. a negative clamped count)
  // skips the loop.
  const fullStats = readUnitFullStatsMem113c(m, ptr, 0x1ff)
  const count = fullStats.count
  const statPairs: Array<{ wLayer: number; wStatId: number }> = fullStats.keys.map((key) => ({
    wLayer: key & 0xffff,
    wStatId: (key >>> 16) & 0xffff,
  }))

  let acc0 = 0
  let acc1 = 0
  let acc2 = 0

  if (count > 0) {
    const pStatList = m.get(ptr, D2UnitStrc.pStatListEx)
    for (let i = 0; i < count; i++) {
      const { wLayer, wStatId } = statPairs[i]!
      let diff = ITEMS_B043_GetStatDiffAfterClear113c(m, pStatList, wStatId, wLayer) | 0
      if (diff === 0 || wStatId < 0) continue
      const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
      if (wStatId >= (m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0)) continue
      const pIsc = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + imul32(wStatId, D2ItemStatCostTxt_SIZE)) >>> 0
      if (pIsc === 0) continue
      const shift = m.u8((pIsc + 0x18) >>> 0)
      if (shift !== 0) {
        diff = sar32(diff, shift & 31)
      }
      const bEncode = m.u8((pIsc + 0x30) >>> 0)
      switch ((bEncode - 1) >>> 0) {
        case 0: {
          if (wLayer < 0 || wLayer >= (m.u32((sgpt + DATATABLES_SKILLS_COUNT_OFF_113C) >>> 0) | 0)) continue
          const pSkillTxt = (m.u32((sgpt + DATATABLES_SKILLS_TXT_OFF_113C) >>> 0) + imul32(wLayer, D2SkillsTxt_SIZE)) >>> 0
          if (pSkillTxt === 0) continue
          const c0 = m.u32(pCost0 >>> 0) | 0
          const c1 = m.u32(pCost1 >>> 0) | 0
          const c2 = m.u32(pCost2 >>> 0) | 0
          const mult = m.u32((pSkillTxt + 0x234) >>> 0) | 0
          const add = m.u32((pSkillTxt + 0x238) >>> 0) | 0
          const prod0 = imul32(c0, diff)
          if (prod0 > 0xffff && mult !== 0) {
            acc0 = (acc0 + imul32(Math.trunc(prod0 / 1024) | 0, mult) + add) | 0
            acc1 = (acc1 + imul32(Math.trunc(imul32(c1, diff) / 4096) | 0, mult) + add) | 0
            acc2 = (acc2 + imul32(Math.trunc(imul32(c2, diff) / 1024) | 0, mult) + add) | 0
          } else {
            acc0 = (acc0 + (Math.trunc(imul32(imul32(mult, c0), diff) / 1024) | 0) + add) | 0
            acc1 = (acc1 + (Math.trunc(imul32(imul32(c1, mult), diff) / 4096) | 0) + add) | 0
            acc2 = (acc2 + (Math.trunc(imul32(imul32(c2, mult), diff) / 1024) | 0) + add) | 0
          }
          break
        }
        case 1:
        case 2: {
          const paramShift = m.u8((sgpt + DATATABLES_SKILL_PARAM_SHIFT_OFF_113C) >>> 0) & 31
          const skillId = sar32(wLayer, paramShift)
          const skLvl = (wLayer & m.u32((sgpt + DATATABLES_SKILL_PARAM_MASK_OFF_113C) >>> 0)) | 0
          let pSkillTxt = 0
          if (skillId >= 0 && skillId < (m.u32((sgpt + DATATABLES_SKILLS_COUNT_OFF_113C) >>> 0) | 0)) {
            pSkillTxt = (m.u32((sgpt + DATATABLES_SKILLS_TXT_OFF_113C) >>> 0) + imul32(skillId, D2SkillsTxt_SIZE)) >>> 0
          }
          const c0 = m.u32(pCost0 >>> 0) | 0
          const c1 = m.u32(pCost1 >>> 0) | 0
          const c2 = m.u32(pCost2 >>> 0) | 0
          const mult = m.u32((pSkillTxt + 0x234) >>> 0) | 0
          const add = m.u32((pSkillTxt + 0x238) >>> 0) | 0
          const prod0 = imul32(c0, skLvl)
          if (prod0 > 0xffff && mult !== 0) {
            acc0 = (acc0 + imul32(Math.trunc(prod0 / 1024) | 0, mult) + add) | 0
            acc1 = (acc1 + imul32(Math.trunc(imul32(c1, skLvl) / 4096) | 0, mult) + add) | 0
            acc2 = (acc2 + imul32(Math.trunc(imul32(c2, skLvl) / 1024) | 0, mult) + add) | 0
          } else {
            acc0 = (acc0 + (Math.trunc(imul32(imul32(mult, c0), skLvl) / 1024) | 0) + add) | 0
            acc1 = (acc1 + (Math.trunc(imul32(imul32(c1, mult), skLvl) / 4096) | 0) + add) | 0
            acc2 = (acc2 + (Math.trunc(imul32(imul32(c2, mult), skLvl) / 1024) | 0) + add) | 0
          }
          break
        }
        case 3: {
          const minVal = (((diff >> 2) & 0x3ff) - 0x100) | 0
          const maxVal = (((diff >> 12) & 0x3ff) - 0x100) | 0
          const avg = Math.trunc(((minVal + maxVal) | 0) / 2) | 0
          const c0 = m.u32(pCost0 >>> 0) | 0
          const c1 = m.u32(pCost1 >>> 0) | 0
          const c2 = m.u32(pCost2 >>> 0) | 0
          const mult = m.u32((pIsc + 0x10) >>> 0) | 0
          const add = m.u32((pIsc + 0x14) >>> 0) | 0
          const prod0 = imul32(c0, avg)
          if (prod0 > 0xffff && mult !== 0) {
            acc0 = (acc0 + imul32(Math.trunc(prod0 / 1024) | 0, mult) + add) | 0
            acc1 = (acc1 + imul32(Math.trunc(imul32(c1, avg) / 1024) | 0, mult) + add) | 0
            acc2 = (acc2 + imul32(Math.trunc(imul32(c2, avg) / 1024) | 0, mult) + add) | 0
          } else {
            acc0 = (acc0 + (Math.trunc(imul32(imul32(mult, c0), avg) / 1024) | 0) + add) | 0
            acc1 = (acc1 + (Math.trunc(imul32(imul32(c1, mult), avg) / 1024) | 0) + add) | 0
            acc2 = (acc2 + (Math.trunc(imul32(imul32(c2, mult), avg) / 1024) | 0) + add) | 0
          }
          break
        }
        default: {
          const c0 = m.u32(pCost0 >>> 0) | 0
          const c1 = m.u32(pCost1 >>> 0) | 0
          const c2 = m.u32(pCost2 >>> 0) | 0
          const mult = m.u32((pIsc + 0x10) >>> 0) | 0
          const add = m.u32((pIsc + 0x14) >>> 0) | 0
          const prod0 = imul32(c0, diff)
          if (prod0 > 0xffff && mult !== 0) {
            acc0 = (acc0 + imul32(Math.trunc(prod0 / 1024) | 0, mult) + add) | 0
            acc1 = (acc1 + imul32(Math.trunc(imul32(c1, diff) / 1024) | 0, mult) + add) | 0
            acc2 = (acc2 + imul32(Math.trunc(imul32(c2, diff) / 1024) | 0, mult) + add) | 0
          } else {
            acc0 = (acc0 + (Math.trunc(imul32(imul32(mult, c0), diff) / 1024) | 0) + add) | 0
            acc1 = (acc1 + (Math.trunc(imul32(imul32(c1, mult), diff) / 1024) | 0) + add) | 0
            acc2 = (acc2 + (Math.trunc(imul32(imul32(c2, mult), diff) / 1024) | 0) + add) | 0
          }
          break
        }
      }
    }
  }

  const div = nDivisor >>> 0
  const q0 = Math.floor((acc0 >>> 0) / div) >>> 0
  m.setU32(pCost0 >>> 0, (m.u32(pCost0 >>> 0) + q0) >>> 0)
  const q1 = Math.floor((acc1 >>> 0) / div) >>> 0
  m.setU32(pCost1 >>> 0, (m.u32(pCost1 >>> 0) + q1) >>> 0)
  const q2 = Math.floor((acc2 >>> 0) / div) >>> 0
  m.setU32(pCost2 >>> 0, (m.u32(pCost2 >>> 0) + q2) >>> 0)
}

/**
 * `@va D2Common:0x6FD95BE0` (`D2Common.#11094` `ITEMS_CheckQualityItemMatch`,
 * `__stdcall(pItem, pQualityItemTxt) -> BOOL`, `ret 8`).
 */
export function ITEMS_CheckQualityItemMatch113c(
  m: Memory113c,
  pItem: number,
  pQualityItemTxt: number,
): number {
  const ptr = pItem >>> 0
  const qPtr = pQualityItemTxt >>> 0
  const f0 = m.u8((qPtr + 2) >>> 0)
  const f1 = m.u8((qPtr + 3) >>> 0)
  const f2 = m.u8((qPtr + 4) >>> 0)
  const f3 = m.u8((qPtr + 5) >>> 0)
  const f4 = m.u8((qPtr + 6) >>> 0)
  const f6 = m.u8((qPtr + 7) >>> 0)
  const f7 = m.u8((qPtr + 8) >>> 0)
  const f8 = m.u8((qPtr + 9) >>> 0)
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x67e)
  }
  const wType1 =
    m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM
      ? (ITEMS_IsTome113c(m, m.get(ptr, D2UnitStrc.dwClassId)) | 0)
      : 0
  if (m.u8((qPtr + 1) >>> 0) !== 0) {
    if (ITEMS_CheckItemTypeIdMem113c(m, ptr, 0x2d) !== 0) {
      if (
        wType1 !== 0x1a &&
        wType1 !== 0x1b &&
        wType1 !== 0x23 &&
        wType1 !== 0x18 &&
        wType1 !== 0x19
      ) {
        return 1
      }
    }
  }
  if (m.u8(qPtr) !== 0) {
    if (ITEMS_CheckItemTypeIdMem113c(m, ptr, 0x32) !== 0) {
      if (wType1 !== 0x02 && wType1 !== 0x0f && wType1 !== 0x10 && wType1 !== 0x13) {
        return 1
      }
    }
  }
  const table: ReadonlyArray<readonly [number, number]> = [
    [f0, 0x02],
    [f1, 0x18],
    [f2, 0x19],
    [f3, 0x1a],
    [f4, 0x1b],
    [f4, 0x23],
    [f6, 0x0f],
    [f7, 0x10],
    [f8, 0x13],
  ]
  for (let i = 0; i < 9; i++) {
    const [flag, tId] = table[i]!
    if (wType1 === tId && flag !== 0) return 1
  }
  return 0
}

/**
 * `@va D2Common:0x6FD95D30` (`D2Common.#10110` `ITEMS_CheckAffixAssignableToItem`,
 * `__stdcall(pItem, pMagicAffixTxt) -> BOOL`, `ret 8`).
 */
export function ITEMS_CheckAffixAssignableToItem113c(
  m: Memory113c,
  pItem: number,
  pMagicAffixTxt: number,
): number {
  const ptr = pItem >>> 0
  if (ptr === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1505)
  }
  if (m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) {
    throw new D2CommonAssertError('Items.cpp', 0x1506)
  }
  const pItemData = m.get(ptr, D2UnitStrc.pUnitData)
  if (pItemData === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1508)
  }
  if (m.get(pItemData, D2ItemDataStrc.wItemFormat) < 0x64) {
    const pRec = lookupItemsTxtRecord113c(m, m.get(ptr, D2UnitStrc.dwClassId))
    if (pRec === 0) {
      throw new D2CommonAssertError('Items.cpp', 0x923)
    }
    if (m.get(pRec, D2ItemsTxt.nTwoHanded) !== 0) return 0
    if (checkIfThrowItemMem113c(m, ptr) !== 0) return 0
  }
  const affix = pMagicAffixTxt >>> 0
  if (m.u16((affix + 0x0e) >>> 0) >= 0x64) {
    if ((ITEMS_GetItemFormat113c(m, ptr) & 0xffff) < 0x64) return 0
  }
  for (let i = 0; i < 4; i++) {
    const eType = (m.u16((affix + 0x1e + i * 2) >>> 0) << 16) >> 16
    if (eType <= 0) break
    if (ITEMS_CheckItemTypeIdMem113c(m, ptr, eType) !== 0) return 0
  }
  for (let i = 0; i < 7; i++) {
    const iType = (m.u16((affix + 0x10 + i * 2) >>> 0) << 16) >> 16
    if (iType <= 0) return 0
    if (ITEMS_CheckItemTypeIdMem113c(m, ptr, iType) !== 0) return 1
  }
  return 0
}

// ============================================================================
// Batch B052 — items.ts functions (B052-01..17)
// ============================================================================

/**
 * `@va D2Common:0x6FD73D70` (`D2Common.#10550` `ITEMS_GetSetItemsSetId`,
 * `__stdcall(pItem) -> i32`, `ret 4`).
 */
export function ITEMS_GetSetItemsSetId113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0xffffffff
  const pItemData = m.get(ptr, D2UnitStrc.pUnitData)
  if (pItemData === 0 || m.get(pItemData, D2ItemDataStrc.dwQuality) !== 5) return 0xffffffff
  const idx = ITEMS_GetItemCell113c(m, ptr) | 0
  if (idx < 0) return 0xffffffff
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (idx >= (m.u32((sgpt + DATATABLES_SETITEMS_COUNT_OFF_113C) >>> 0) | 0)) return 0xffffffff
  const pSetItem = (m.u32((sgpt + DATATABLES_SETITEMS_TXT_OFF_113C) >>> 0) + imul32(idx, D2SetItemsTxt_SIZE)) >>> 0
  if (pSetItem === 0) return 0xffffffff
  return ((m.u16((pSetItem + 0x2e) >>> 0) << 16) >> 16) >>> 0
}

/**
 * `@va D2Common:0x6FD73F40` (`D2Common.#10218` `ITEMS_GetSetItemsTxtRecordFromItem`,
 * `__stdcall(pItem) -> ptr`, `ret 4`).
 */
export function ITEMS_GetSetItemsTxtRecordFromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(ptr, D2UnitStrc.pUnitData)
  if (pItemData === 0 || m.get(pItemData, D2ItemDataStrc.dwQuality) !== 5) return 0
  const idx = ITEMS_GetItemCell113c(m, ptr) | 0
  if (idx < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (idx >= (m.u32((sgpt + DATATABLES_SETITEMS_COUNT_OFF_113C) >>> 0) | 0)) return 0
  return (m.u32((sgpt + DATATABLES_SETITEMS_TXT_OFF_113C) >>> 0) + imul32(idx, D2SetItemsTxt_SIZE)) >>> 0
}

/**
 * `@va D2Common:0x6FD73F90` (`D2Common.#11161` `ITEMS_GetEquippedSetItemsMask`,
 * `__stdcall(pPlayer, pSetItem, bIncludeSelf) -> u32`, `ret 0xC`).
 */
export function ITEMS_GetEquippedSetItemsMask113c(
  m: Memory113c,
  pPlayer: number,
  pSetItem: number,
  bIncludeSelf: number,
): number {
  const plr = pPlayer >>> 0
  if (plr === 0) return 0
  const item = pSetItem >>> 0
  if (item === 0 || m.get(item, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pItemData = m.get(item, D2UnitStrc.pUnitData)
  if (pItemData === 0 || m.get(pItemData, D2ItemDataStrc.dwQuality) !== 5) return 0
  const pInv = m.get(plr, D2UnitStrc.pInventory)
  if (pInv === 0) return 0
  const setItemIdx = ITEMS_GetItemCell113c(m, item) | 0
  const pSetItemRec = DATATBLS_GetSetItemsTxtRecordInline113c(m, setItemIdx)
  if (pSetItemRec === 0) return 0
  const wSetId = (m.u16((pSetItemRec + 0x2c) >>> 0) << 16) >> 16
  if (DATATBLS_GetSetsTxtRecordInline113c(m, wSetId) === 0) return 0
  let mask = 0
  for (let pNode = INVENTORY_GetFirstItem113c(m, pInv); pNode !== 0; pNode = INVENTORY_GetNextItem113c(m, pNode)) {
    if (INVENTORY_GetItemNodePositionOther113c(m, pNode) !== 3) continue
    const pCur = INVENTORY_UnitIsItem113c(m, pNode)
    if (pCur === 0 || m.get(pCur, D2UnitStrc.dwUnitType) !== UNIT_ITEM) continue
    if ((bIncludeSelf | 0) === 0 && pCur === item) continue
    if (ITEMS_GetItemQuality113c(m, pCur) !== 5) continue
    if (ITEMS_CheckCommandFlags113c(m, pCur, 0x4000, 0x144f, 0x6fde4848) !== 0) continue
    if (ITEMS_CheckCommandFlags113c(m, pCur, 0x100, 0x1450, 0x6fde4848) !== 0) continue
    const curRec = DATATBLS_GetSetItemsTxtRecordInline113c(m, ITEMS_GetItemCell113c(m, pCur) | 0)
    if (curRec === 0) continue
    if (m.u16((curRec + 0x2c) >>> 0) !== m.u16((pSetItemRec + 0x2c) >>> 0)) continue
    const bitIdx = m.u8((curRec + 0x2e) >>> 0) & 31
    mask = (mask | (1 << bitIdx)) >>> 0
  }
  return mask >>> 0
}

/**
 * `@va D2Common:0x6FD741D0` (`D2Common.#10705` `ITEMS_CanItemBeShownInTradeOrStash`,
 * `__stdcall(pItem) -> BOOL`, `ret 4`).
 */
export function ITEMS_CanItemBeShownInTradeOrStash113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  let nItemId = 0xffffffff
  if (ptr !== 0) {
    if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
      const pData = m.get(ptr, D2UnitStrc.pUnitData)
      if (pData !== 0 && (m.get(pData, D2ItemDataStrc.dwCommandFlags) & 0x1000) !== 0) {
        return 0
      }
    }
    nItemId = m.get(ptr, D2UnitStrc.dwClassId)
  }
  return ITEMS_IsScrollOrTome113c(m, nItemId) !== 0 ? 1 : 0
}

/**
 * `@va D2Common:0x6FD74500` (`D2Common.#10517` `ITEMS_CheckItemIdMatchesItemType`,
 * `__stdcall(nItemId, nItemType) -> u32`, `ret 8`).
 */
export function ITEMS_CheckItemIdMatchesItemType113c(
  m: Memory113c,
  nItemId: number,
  nItemType: number,
): number {
  const t = nItemType | 0
  if (t < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  if (t >= (m.u32((sgpt + DATATABLES_ITEMTYPES_COUNT_OFF_113C) >>> 0) | 0)) return 0
  const pRec = lookupItemsTxtRecord113c(m, nItemId)
  if (pRec === 0) return 0
  const wType1 = ITEMS_IsTome113c(m, nItemId) | 0
  if (wType1 < 0) return 0
  const sgpt2 = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const typeCount = m.u32((sgpt2 + DATATABLES_ITEMTYPES_COUNT_OFF_113C) >>> 0) | 0
  if (wType1 >= typeCount) return 0
  const stride = m.u32((sgpt2 + DATATABLES_OFF_113C.nItemTypesEquivDwords) >>> 0) | 0
  const pEquiv = m.u32((sgpt2 + DATATABLES_OFF_113C.pItemTypesEquiv) >>> 0)
  const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
  const bitMask = m.u32((pBitMasks + ((t & 0x1f) << 2)) >>> 0)
  const wordOff = t >> 5
  const wordIdx1 = (imul32(stride, wType1) + wordOff) | 0
  if ((m.u32((pEquiv + ((wordIdx1 << 2) >>> 0)) >>> 0) & bitMask) !== 0) {
    return 1
  }
  const wType2 = (m.get(pRec, D2ItemsTxt.wType2) << 16) >> 16
  if (wType2 === 0 || wType2 >= typeCount) return 0
  const wordIdx2 = (imul32(stride, wType2) + wordOff) | 0
  return (m.u32((pEquiv + ((wordIdx2 << 2) >>> 0)) >>> 0) & bitMask) >>> 0
}

/**
 * `@va D2Common:0x6FD746F0` (`D2Common.#10757` `ITEMS_GetSubTypeFromItem`,
 * `__stdcall(pItem) -> u8`, `ret 4`).
 */
export function ITEMS_GetSubTypeFromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  return ITEMS_GetSubTypeByte113c(m, m.get(ptr, D2UnitStrc.dwClassId))
}

/**
 * `@va D2Common:0x6FD74BF0` (`D2Common.#10326` `ITEMS_GetInvWidthFromItem`,
 * `__stdcall(pItem) -> u8`, `ret 4`).
 */
export function ITEMS_GetInvWidthFromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  return ITEMS_GetInvWidthFromId113c(m, m.get(ptr, D2UnitStrc.dwClassId))
}

/**
 * `@va D2Common:0x6FD74F90` (internal `ITEMS_CountSocketedItemsInGemSocketable`,
 * custom reg `eax = pItem` -> `i32`, `ret`).
 */
export function ITEMS_CountSocketedItemsInGemSocketable113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  if (ITEMS_GetSubTypeByte113c(m, m.get(ptr, D2UnitStrc.dwClassId)) === 0) return 0
  const pInv = m.get(ptr, D2UnitStrc.pInventory)
  if (pInv === 0 || m.get(pInv, D2InventoryStrc.dwSignature) !== INVENTORY_SIGNATURE_113C) return 0
  let cur = m.get(pInv, D2InventoryStrc.pFirstItem)
  if (cur === 0) return 0
  let count = 0
  while (cur !== 0) {
    const uType = m.get(cur, D2UnitStrc.dwUnitType)
    count = (count + 1) | 0
    if (uType !== UNIT_ITEM) break
    const pData = m.get(cur, D2UnitStrc.pUnitData)
    if (pData === 0) break
    const pExtra = (pData + D2ItemDataStrc.pExtraOwnerInventory.off) >>> 0
    if (pExtra === 0) break
    cur = m.u32((pExtra + ITEM_EXTRA_NEXT_ITEM_OFF_113C) >>> 0)
  }
  return count >>> 0
}

/**
 * `@va D2Common:0x6FD766E0` (internal `ITEMS_SumStatAcrossSocketedItems`,
 * `__stdcall(pItem, nStatId, pOutSum) -> void`, `ret 0xC`).
 */
export function ITEMS_SumStatAcrossSocketedItems113c(
  m: Memory113c,
  pItem: number,
  nStatId: number,
  pOutSum: number,
): void {
  const outPtr = pOutSum >>> 0
  m.setU32(outPtr, 0)
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return
  if (ITEMS_GetSubTypeByte113c(m, m.get(ptr, D2UnitStrc.dwClassId)) === 0) return
  const pInv = m.get(ptr, D2UnitStrc.pInventory)
  if (pInv === 0 || m.get(pInv, D2InventoryStrc.dwSignature) !== INVENTORY_SIGNATURE_113C) return
  let cur = m.get(pInv, D2InventoryStrc.pFirstItem)
  const statId = nStatId | 0
  while (cur !== 0) {
    const curUnit = m.get(cur, D2UnitStrc.dwUnitType) === UNIT_ITEM ? cur : 0
    if (m.get(ptr, D2UnitStrc.dwAnimMode) === 1) {
      let val = 0
      if (curUnit !== 0) {
        const pStatList = m.get(curUnit, D2UnitStrc.pStatListEx)
        if (pStatList !== 0 && statId >= 0) {
          const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
          if (statId < (m.u32((sgpt + DATATABLES_OFF_113C.nItemStatCostTxtRecordCount) >>> 0) | 0)) {
            const pIsc = (m.u32((sgpt + DATATABLES_OFF_113C.pItemStatCostTxt) >>> 0) + imul32(statId, D2ItemStatCostTxt_SIZE)) >>> 0
            if (pIsc !== 0) {
              val = statListGetTotalStatWithMinMem113c(m, pStatList, (statId << 16) >>> 0, pIsc)
            }
          }
        }
      }
      m.setU32(outPtr, (m.u32(outPtr) + val) >>> 0)
    }
    if (m.get(cur, D2UnitStrc.dwUnitType) !== UNIT_ITEM) break
    const pData = m.get(cur, D2UnitStrc.pUnitData)
    if (pData === 0) break
    const pExtra = (pData + D2ItemDataStrc.pExtraOwnerInventory.off) >>> 0
    if (pExtra === 0) break
    cur = m.u32((pExtra + ITEM_EXTRA_NEXT_ITEM_OFF_113C) >>> 0)
  }
}

/**
 * `@va D2Common:0x6FD767C0` (internal `ITEMS_RollRandomInRangeCallback`,
 * `__fastcall(ecx = nMin, edx = nMax, [esp+4] = _u0, [esp+8] = ppItemCtx) -> i32`, `ret 8`).
 */
export function ITEMS_RollRandomInRangeCallback113c(
  m: Memory113c,
  nMin: number,
  nMax: number,
  _u0: number,
  ppItemCtx: number,
): number {
  const ctx = ppItemCtx >>> 0
  if (ctx === 0) return 0
  const pItem = m.u32(ctx)
  return SEED_RollLimitedRandomNumberInline113c(m, (pItem + 0x20) >>> 0, nMin, nMax)
}

/**
 * `@va D2Common:0x6FD76930` (`D2Common.#11102` `ITEMS_AreStackableWeaponsCompatible`,
 * `__stdcall(pItem1, pItem2) -> BOOL`, `ret 8`).
 */
export function ITEMS_AreStackableWeaponsCompatible113c(
  m: Memory113c,
  pItem1: number,
  pItem2: number,
): number {
  const p1 = pItem1 >>> 0
  const p2 = pItem2 >>> 0
  const id1 = p1 !== 0 ? m.get(p1, D2UnitStrc.dwClassId) : 0xffffffff
  const id2 = p2 !== 0 ? m.get(p2, D2UnitStrc.dwClassId) : 0xffffffff
  if (id1 !== id2) return 0

  let q1 = 2
  if (p1 !== 0 && m.get(p1, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const d1 = m.get(p1, D2UnitStrc.pUnitData)
    if (d1 !== 0) q1 = m.get(d1, D2ItemDataStrc.dwQuality)
  }
  let q2 = 2
  if (p2 !== 0 && m.get(p2, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const d2 = m.get(p2, D2UnitStrc.pUnitData)
    if (d2 !== 0) q2 = m.get(d2, D2ItemDataStrc.dwQuality)
  }
  if (q1 !== q2) return 0

  if (ITEMS_GetItemCell113c(m, p1) !== ITEMS_GetItemCell113c(m, p2)) return 0
  if (ITEMS_GetTwoHandedFlag113c(m, p1) === 0) return 0
  if (ITEMS_CheckEtherealFlag113c(m, p1) !== ITEMS_CheckEtherealFlag113c(m, p2)) return 0
  if (ITEMS_CheckQualityTradable113c(m, ITEMS_GetItemQuality113c(m, p1)) === 0) return 0
  if (ITEMS_CheckQualityTradable113c(m, ITEMS_GetItemQuality113c(m, p2)) === 0) return 0

  const dmgStats = [0x15, 0x16, 0x17, 0x18, 0x9f, 0xa0] as const
  for (let i = 0; i < dmgStats.length; i++) {
    const st = dmgStats[i]!
    if (statListGetUnitStatMem113c(m, p1, st, 0) !== statListGetUnitStatMem113c(m, p2, st, 0)) {
      return 0
    }
  }
  if ((ITEMS_GetMaxSockets113c(m, p1) & 0xff) > 0) return 0
  if ((ITEMS_GetMaxSockets113c(m, p2) & 0xff) > 0) return 0
  return 1
}

/**
 * `@va D2Common:0x6FD76BA0` (`D2Common.#10918` `ITEMS_FindMatchingRunesTxtRecord`,
 * `__stdcall(pItem) -> ptr`, `ret 4`).
 */
export function ITEMS_FindMatchingRunesTxtRecord113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0) return 0
  if (m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const pData = m.get(ptr, D2UnitStrc.pUnitData)
    if (pData !== 0) {
      const qual = m.get(pData, D2ItemDataStrc.dwQuality) | 0
      if (qual >= 4 && qual <= 9) return 0
    }
  }
  const pRec = lookupItemsTxtRecord113c(m, m.get(ptr, D2UnitStrc.dwClassId))
  if (m.get(pRec, D2ItemsTxt.nComponent) !== 0) return 0
  const pInv = m.get(ptr, D2UnitStrc.pInventory)
  if (pInv === 0 || m.get(pInv, D2InventoryStrc.dwSignature) !== INVENTORY_SIGNATURE_113C) return 0
  let cur = m.get(pInv, D2InventoryStrc.pFirstItem)
  if (cur === 0) return 0

  const socketClassIds: number[] = []
  while (cur !== 0) {
    if (m.get(cur, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
    socketClassIds.push(m.get(cur, D2UnitStrc.dwClassId) | 0)
    const pData = m.get(cur, D2UnitStrc.pUnitData)
    if (pData === 0) break
    const pExtra = (pData + D2ItemDataStrc.pExtraOwnerInventory.off) >>> 0
    if (pExtra === 0) break
    cur = m.u32((pExtra + ITEM_EXTRA_NEXT_ITEM_OFF_113C) >>> 0)
  }

  const maxSockets = ITEMS_GetMaxSockets113c(m, ptr) & 0xff
  const socketCount = socketClassIds.length
  if (maxSockets !== socketCount) return 0

  const runesCount = m.u32(RUNES_TXT_COUNT_VA_113C) | 0
  if (runesCount <= 0) return 0

  for (let row = 0; row < runesCount; row++) {
    const pRune = (m.u32(RUNES_TXT_PTR_VA_113C) + imul32(row, D2RUNESTXT_SIZE_113C)) >>> 0
    if (m.u8((pRune + 0x80) >>> 0) === 0) continue
    let k = 0
    let runesMatch = true
    for (; k < 6; k++) {
      const reqRuneId = m.u32((pRune + 0x98 + k * 4) >>> 0) | 0
      if (reqRuneId <= 0) break
      if (socketCount < k || socketClassIds[k] !== reqRuneId) {
        runesMatch = false
        break
      }
    }
    if (!runesMatch || k < maxSockets) continue

    let excluded = false
    for (let t = 0; t < 3; t++) {
      const eType = (m.u16((pRune + 0x92 + t * 2) >>> 0) << 16) >> 16
      if (eType === 0) break
      if (ITEMS_CheckItemTypeIdMem113c(m, ptr, eType) !== 0) {
        excluded = true
        break
      }
    }
    if (excluded) continue

    for (let t = 0; t < 6; t++) {
      const iType = (m.u16((pRune + 0x86 + t * 2) >>> 0) << 16) >> 16
      if (iType === 0) break
      if (ITEMS_CheckItemTypeIdMem113c(m, ptr, iType) !== 0) {
        return pRune >>> 0
      }
    }
  }
  return 0
}

/**
 * `@va D2Common:0x6FD76D40` (`D2Common.#10865` `ITEMS_CanItemLoseDurability`,
 * `__stdcall(pItem) -> BOOL`, `ret 4`).
 */
export function ITEMS_CanItemLoseDurability113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const pRec = lookupItemsTxtRecord113c(m, m.get(ptr, D2UnitStrc.dwClassId))
  if (pRec === 0) return 0
  if (m.u8((pRec + 0x113) >>> 0) !== 0) return 0
  if (m.u8((pRec + 0x112) >>> 0) === 0) return 0
  if (ITEMS_B043_GetMaxDurabilityFromUnit113c(m, ptr) === 0) return 0
  const indestruct = statListGetUnitStatMem113c(m, ptr, 0x98, 0) | 0
  return indestruct <= 0 ? 1 : 0
}

/**
 * `@va D2Common:0x6FD77120` (internal `ITEMS_EvalItemStatCallback`,
 * `__fastcall(ecx = nStatId, edx = nMode, [esp+4] = _u0, [esp+8] = ppItemCtx) -> i32`, `ret 8`).
 */
export function ITEMS_EvalItemStatCallback113c(
  m: Memory113c,
  nStatId: number,
  nMode: number,
  _u0: number,
  ppItemCtx: number,
): number {
  const ctx = ppItemCtx >>> 0
  if (ctx === 0) return 0
  const pUnit = m.u32(ctx)
  return evalItemStatDirect113c(m, nStatId, nMode, pUnit)
}

/**
 * `@va D2Common:0x6FD821C0` (`D2Common.#10076` `ITEMS_GetActiveWeaponClassCodeIdx`,
 * `__fastcall(ecx = pUnit) -> u16`, `ret`).
 */
export function ITEMS_GetActiveWeaponClassCodeIdx113c(m: Memory113c, pUnit: number): number {
  const pWeap = ITEMS_GetActiveWeaponForAttack113c(m, pUnit >>> 0, 1)
  if (pWeap === 0) return 0
  return ITEMS_GetWeaponClassCodeIdx113c(m, pWeap) & 0xffff
}

/**
 * `@va D2Common:0x6FD821E0` (`D2Common.#10862` `ITEMS_GetUnitHitClass`,
 * `__fastcall(ecx = pUnit) -> u8`, `ret`).
 */
export function ITEMS_GetUnitHitClass113c(m: Memory113c, pUnit: number): number {
  const ptr = pUnit >>> 0
  if (ptr === 0) return 0
  const uType = m.get(ptr, D2UnitStrc.dwUnitType)
  if (uType === 0) {
    const pWeap = ITEMS_GetActiveWeaponForAttack113c(m, ptr, 0)
    if (pWeap === 0) return 1
    return ITEMS_GetQuestItemByte113c(m, pWeap) & 0xff
  }
  if (uType === 1) {
    const pMonStats2 = DATATBLS_GetMonStats2TxtRecordFromMonStatsIdInline113c(
      m,
      m.get(ptr, D2UnitStrc.dwClassId) | 0,
    )
    if (pMonStats2 === 0) return 0
    return m.u8((pMonStats2 + 0x14) >>> 0)
  }
  return 0
}

/**
 * `@va D2Common:0x6FD965B0` (internal `ITEMS_RollItemOrUnitSeedRange`,
 * custom reg `eax = nMax`, `ecx = nMin`, `edx = pUnit` -> `i32`, `ret`).
 */
export function ITEMS_RollItemOrUnitSeedRange113c(
  m: Memory113c,
  nMax: number,
  nMin: number,
  pUnit: number,
): number {
  let maxVal = nMax | 0
  let minVal = nMin | 0
  if (maxVal === minVal) return minVal >>> 0
  if (maxVal < minVal) {
    const tmp = maxVal
    maxVal = minVal
    minVal = tmp
  }
  const ptr = pUnit >>> 0
  if (ptr !== 0 && m.get(ptr, D2UnitStrc.dwUnitType) === UNIT_ITEM) {
    const pData = m.get(ptr, D2UnitStrc.pUnitData)
    if (pData !== 0) {
      return SEED_RollLimitedRandomNumberInline113c(m, (pData + 0x04) >>> 0, minVal, maxVal)
    }
    return SEED_RollLimitedRandomNumberInline113c(m, 0, minVal, maxVal)
  }
  return SEED_RollLimitedRandomNumberInline113c(m, (ptr + 0x20) >>> 0, minVal, maxVal)
}

// ============================================================================
// Batch I9B-A — ItemTypes getters & body-location validators (A01..A18)
// ============================================================================

function lookupItemTypesTxtRecordFromItem113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const t = ITEMS_GetItemTypeFromItem113c(m, ptr) | 0
  if (t < 0) return 0
  const sgpt = m.u32(ITEMS_SGPT_DATATABLES_VA_113C)
  const count = m.u32((sgpt + DATATABLES_ITEMTYPES_COUNT_OFF_113C) >>> 0) | 0
  if (t >= count) return 0
  const base = m.u32((sgpt + DATATABLES_ITEMTYPES_TXT_OFF_113C) >>> 0)
  return (base + imul32(t, D2ItemTypesTxt_SIZE)) >>> 0
}

/**
 * `@va D2Common:0x6FD73130` (`D2Common.#10700` `ITEMS_GetAllowedBodyLocations`,
 * `__stdcall(pItem, pLoc1, pLoc2) -> void`, `ret 0xC`).
 */
export function ITEMS_GetAllowedBodyLocations113c(
  m: Memory113c,
  pItem: number,
  pLoc1: number,
  pLoc2: number,
): void {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) {
    m.setU8(pLoc1 >>> 0, 0)
    m.setU8(pLoc2 >>> 0, 0)
    return
  }
  const dl1 = m.get(rec, D2ItemTypesTxt.nBodyLoc1)
  m.setU8(pLoc1 >>> 0, dl1)
  const dl2 = m.get(rec, D2ItemTypesTxt.nBodyLoc2)
  m.setU8(pLoc2 >>> 0, dl2)
}

/**
 * `@va D2Common:0x6FD73360` (`D2Common.#10556` `ITEMS_IsNormalQualityAllowed`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_IsNormalQualityAllowed113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 1
  return m.get(rec, D2ItemTypesTxt.nNormalAllowed)
}

/**
 * `@va D2Common:0x6FD733B0` (`D2Common.#10710` `ITEMS_IsMagicQualityAllowed`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_IsMagicQualityAllowed113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return m.get(rec, D2ItemTypesTxt.nMagic)
}

/**
 * `@va D2Common:0x6FD73400` (`D2Common.#11036` `ITEMS_IsRareQualityAllowed`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_IsRareQualityAllowed113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return m.get(rec, D2ItemTypesTxt.nRare)
}

/**
 * `@va D2Common:0x6FD73450` (`D2Common.#10208` `ITEMS_GetVarInvGfxCount`,
 * `__stdcall(pItem) -> u8`, `ret 4`).
 */
export function ITEMS_GetVarInvGfxCount113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return m.get(rec, D2ItemTypesTxt.nVarInvGfx)
}

/**
 * `@va D2Common:0x6FD734A0` (`D2Common.#11075` `ITEMS_GetStorePage`,
 * `__stdcall(pItem) -> u8`, `ret 4`).
 */
export function ITEMS_GetStorePage113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0xff
  return m.get(rec, D2ItemTypesTxt.nStorePage)
}

/**
 * `@va D2Common:0x6FD734F0` (`D2Common.#11054` `ITEMS_IsReEquip`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_IsReEquip113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return m.get(rec, D2ItemTypesTxt.nReEquip)
}

/**
 * `@va D2Common:0x6FD73540` (`D2Common.#10905` `ITEMS_IsReload`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_IsReload113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return m.get(rec, D2ItemTypesTxt.nReload)
}

/**
 * `@va D2Common:0x6FD74280` (`D2Common.#10822` `ITEMS_GetClassOfClassSpecificItem`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_GetClassOfClassSpecificItem113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 7
  return Math.min(m.get(rec, D2ItemTypesTxt.nRarity), 7)
}

/**
 * `@va D2Common:0x6FD742D0` (`D2Common.#10089` `ITEMS_IsClassSpecific`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_IsClassSpecific113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return m.get(rec, D2ItemTypesTxt.nRarity) < 7 ? 1 : 0
}

/**
 * `@va D2Common:0x6FD74610` (`D2Common.#11151` `ITEMS_GetMaxSocketsFromItemType`,
 * `__stdcall(pItem) -> u8`, `ret 4`).
 */
export function ITEMS_GetMaxSocketsFromItemType113c(m: Memory113c, pItem: number): number {
  const ptr = pItem >>> 0
  const rec = lookupItemTypesTxtRecordFromItem113c(m, ptr)
  if (rec === 0) return 0
  const s = ITEMS_GetBeltTypeIndex113c(m, m.get(ptr, D2UnitStrc.dwClassId))
  const lvl = ITEMS_GetItemLevel113c(m, ptr) | 0
  const cap =
    lvl <= 25
      ? m.get(rec, D2ItemTypesTxt.nMaxSock1)
      : lvl <= 40
        ? m.get(rec, D2ItemTypesTxt.nMaxSock25)
        : m.get(rec, D2ItemTypesTxt.nMaxSock40)
  return Math.min(s, cap)
}

/**
 * `@va D2Common:0x6FD746A0` (`D2Common.#10957` `ITEMS_GetStaffModsClass`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_GetStaffModsClass113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 7
  return m.get(rec, D2ItemTypesTxt.nStaffMods)
}

/**
 * `@va D2Common:0x6FD74BA0` (`D2Common.#10792` `ITEMS_IsBeltable`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_IsBeltable113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return m.get(rec, D2ItemTypesTxt.nBeltable)
}

/**
 * `@va D2Common:0x6FD74E10` (`D2Common.#10955` `ITEMS_IsAutoStack`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_IsAutoStack113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return m.get(rec, D2ItemTypesTxt.nAutoStack)
}

/**
 * `@va D2Common:0x6FD74E60` (`D2Common.#11144` `ITEMS_GetItemTypeShootsFromItem`,
 * `__stdcall(pItem) -> i32`, `ret 4`).
 */
export function ITEMS_GetItemTypeShootsFromItem113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return ((m.get(rec, D2ItemTypesTxt.wShoots) << 16) >> 16) >>> 0
}

/**
 * `@va D2Common:0x6FD74EB0` (`D2Common.#10543` `ITEMS_GetItemTypeQuiverFromItem`,
 * `__stdcall(pItem) -> i32`, `ret 4`).
 */
export function ITEMS_GetItemTypeQuiverFromItem113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  return ((m.get(rec, D2ItemTypesTxt.wQuiver) << 16) >> 16) >>> 0
}

/**
 * `@va D2Common:0x6FD743B0` (`D2Common.#10523` `ITEMS_CanBeEquipped`,
 * `__stdcall(pItem) -> u32`, `ret 4`).
 */
export function ITEMS_CanBeEquipped113c(m: Memory113c, pItem: number): number {
  const rec = lookupItemTypesTxtRecordFromItem113c(m, pItem)
  if (rec === 0) return 0
  const b1 = m.get(rec, D2ItemTypesTxt.nBodyLoc1)
  const b2 = m.get(rec, D2ItemTypesTxt.nBodyLoc2)
  if (b1 === 0 && b2 === 0) {
    return 0
  }
  return m.get(rec, D2ItemTypesTxt.nBody)
}

/**
 * `@va D2Common:0x6FD74C80` (`D2Common.#10217` `ITEMS_CheckBodyLocation`,
 * `__stdcall(pItem, nBodyLoc) -> u32`, `ret 8`).
 */
export function ITEMS_CheckBodyLocation113c(
  m: Memory113c,
  pItem: number,
  nBodyLoc: number,
): number {
  const ptr = pItem >>> 0
  if (ptr === 0 || m.get(ptr, D2UnitStrc.dwUnitType) !== UNIT_ITEM) return 0
  const loc = nBodyLoc >>> 0
  const rec = lookupItemTypesTxtRecordFromItem113c(m, ptr)
  if (rec === 0) return loc === 0 ? 1 : 0
  const b1 = m.get(rec, D2ItemTypesTxt.nBodyLoc1)
  const b2 = m.get(rec, D2ItemTypesTxt.nBodyLoc2)
  if (b1 === loc || b2 === loc) return 1
  if (loc === 0x0b || loc === 0x0c) {
    if (b1 === 4 || b2 === 4 || b1 === 5 || b2 === 5) return 1
  }
  return 0
}


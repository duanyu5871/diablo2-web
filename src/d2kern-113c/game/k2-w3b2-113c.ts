/**
 * Milestone 33 [K2] Wave 3 Batch 2 (`w3b2`): 45 strictly ready `D2Game.dll` v1.13c functions
 * in the VA range `0x6FC3BCA0..0x6FC525C0`.
 *
 * Clean-room 1:1 binary-isomorphic translations from `D2Game.dll` v1.13c.
 */

import {
  COLLISION_CheckMaskWithPattern2_113c,
  COLLISION_CheckMaskWithSizeXY113c,
  COLLISION_FindFreePositionSimple113c,
  COLLISION_GetMaskWithPattern2_113c,
} from '../common/collision.js'
import { UNITS_SetObjectShrineTxt113c } from '../common/composit.js'
import { DRLG_GetActNoFromLevelId113c } from '../common/drlg/drlg.js'
import { DRLG_ResolveMonsterSubClassIdForRoom113c } from '../common/drlg/drlg-ver.js'
import { DRLGPRESET_MovePointerAndClear113c } from '../common/drlg/preset.js'
import { DUNGEON_GetLevelIdFromRoom113c, DUNGEON_GetRoomCoordinates113c } from '../common/dungeon.js'
import { D2CommonAssertError } from '../common/inline-helpers.js'
import { imul32 } from '../common/int-math.js'
import {
  INVENTORY_AllocInventory113c,
  INVENTORY_GetFirstItem113c,
  INVENTORY_GetNextItem113c,
  INVENTORY_PlaceItemInSocket113c,
  INVENTORY_RemoveItemFromInventory113c,
  INVENTORY_UnitIsItem113c,
  ITEMS_DecodeItemCompactBitstreamV96_113c,
  ITEMS_GetCellOverwrite113c,
} from '../common/inventory.js'
import {
  ITEMS_CalcWeaponAttackSpeed113c,
  ITEMS_GetSubTypeFromItem113c,
  ITEMS_SerializeItemToBuffer113c,
} from '../common/items.js'
import {
  SKILLS_GetUsedSkillMemPort113c,
  SKILLS_SetUsedSkillMemPort113c,
  STATLIST_AddUnitStatMemPort113c,
  STATLIST_GetStatListFromUnitAndStateMemPort113c,
} from '../common/k0-d2common-memports.js'
import {
  PATH_Compute113c,
  PATH_GetPosX113c,
  PATH_GetPosY113c,
  PATH_GetTargetTypeAndPosition113c,
  PATH_GetTargetUnit113c,
  PATH_GetUnitCollisionPattern113c,
  PATH_SetCollisionMask113c,
  PATH_SetMoveTestCollisionMask113c,
  PATH_SetTargetPos113c,
  PATH_SetType113c,
  PATH_SetVelocity113c,
  UNITS_GetDirectionToCoords113c,
} from '../common/path.js'
import {
  SKILLS_CheckLineOfSight113c,
  SKILLS_EvalCalcByOffset113c,
  SKILLS_EvaluateSkillLevel113c,
  SKILLS_GetHighestLevelSkillFromUnitAndIdFastcall113c,
  SKILLS_GetParam1113c,
  SKILLS_GetParam2113c,
  SKILLS_GetParam3113c,
  SKILLS_GetParam4113c,
  SKILLS_GetSkillById113c,
  SKILLS_IsSelectableCorpse10678_113c,
  SKILLS_IsSelectableCorpseWithFlag12_113c,
  SKILLS_IsSelectableCorpseWithVelocity113c,
  SKILLS_SetParam0C113c,
  SKILLS_SetParam3113c,
  SKILLS_SetParam4113c,
  UNITS_GetUnitDistanceToCoordinates113c,
} from '../common/skills.js'
import {
  STATES_CheckState113c,
  STATES_CheckStateMask33OnUnit113c,
  STATES_ClearGfxStateFlag113c,
  STATES_ToggleGfxStateFlag113c,
  STATLIST_AllocList113c,
  STATLIST_GetStatListFromUnitAndFlag113c,
  STATLIST_GetStatValue113c,
  STATLIST_GetUnitBaseStat113c,
  STATLIST_GetUnitLifePercent113c,
  STATLIST_GetUnitStat113c,
  STATLIST_MergeStatLists113c,
  STATLIST_SetExpireFrameEx113c,
  STATLIST_SetStat113c,
  STATLIST_SetStatRemoveProc113c,
  STATLIST_SetState113c,
  STATLIST_SetUnitStat113c,
} from '../common/statlist.js'
import {
  DATATBLS_GetObjectsTxtRecord113c,
  UNIT_Alloc113c,
  UNIT_GetAlignment113c,
  UNITROOM_RefreshUnit113c,
  UNITS_AllocStaticPath113c,
  UNITS_CanUnitMeleeAttackTarget113c,
  UNITS_GetApproximateDistance113c,
  UNITS_GetEquippedWeaponAdder113c,
  UNITS_GetRoom113c,
  UNITS_GetUnitSizeX113c,
} from '../common/unit.js'
import { UNITS_SetTargetUnitForDynamicUnit113c } from '../common/waypoint.js'
import type { Memory113c } from '../mem/sparse-memory.js'
import {
  DATATBLS_GetLevelMonsterLevel113c,
  DATATBLS_GetMonLvlTxtRecord113c,
  DATATBLS_GetObjGroupTxtRecord113c,
  DATATBLS_NormalizeDirection113c,
} from '../tables/datatbls-113c.js'
import { DATATBLS_CalcMissileSubLoopFrames113c } from '../tables/missile-tbls-113c.js'
import { DATATBLS_GetHirelingTxtRecordFromIdAndLevel113c } from '../tables/monster-tbls-113c.js'
import { SUNIT_AreUnitsHostileOrUnaligned113c } from './a1c-post150-f786-f1040-113c.js'
import {
  AIGENERAL_LinkMinionToLeader113c,
  AI_CastSkillWithMode113c,
  type AiFallenHooks113c,
  MONSTER_CheckTypeFlagsMask113c,
  SKILLS_CanMonsterCastAtTarget113c,
} from './ai-fallen-113c.js'
import { CLIENTS_ForEachInGameClient113c } from './boot-init-gap-a-113c.js'
import { AI_Stall113c, MONSTER_StartMode113c } from './combat-a1c-113c.js'
import { PLAYER_GetEquippedWeapon113c, AIGENERAL_CopyAiCommandParams113c } from './fallen-ai-113c.js'
import { SUNIT_GetServerUnit113c } from './game-strc.js'
import {
  AURA_ForEachUnitInRadius113c,
  ITEMS_ActivateEquippedItemStats113c,
  STATES_CreateOrUpdateAuraStatList113c,
} from './k2-gap-itemdef-113c.js'
import {
  type K2GapMeleeDotHooks113c,
  MISSILE_CreateServerProjectile113c,
  MISSILE_SpawnNova64Directions113c,
  SKILLS_AssignHandSkillAndSyncAura113c,
  STATES_OnTimedStateRemoved113c,
} from './k2-gap-melee-dot-113c.js'
import {
  D2GAME_MONUMOD_TABLE_VA_113C,
  MONUMOD_CopyMinionEligibleUMods113c,
  MONUMOD_GetConstantValue113c,
  MONUMOD_GetMinionClassIdForBoss113c,
  MONUMOD_RollBossOrMinionNameSeed113c,
} from './k2-items-tc-w1-113c.js'
import {
  CHARSTATS_GetRecordPtrFast_6FC210A0_113c,
  MONSTER_TestUnitMonTypeFlag_6FC22790_113c,
  SKILLS_GetParam3Fast_6FC21BF0_113c,
  SKILLS_GetParam4Fast_6FC21C20_113c,
  STORM_TSHashTableLookup_6FC22130_113c,
} from './k2-laneH-0x6fc2-w1-113c.js'
import {
  ITEMS_AllocAndLoadFromBitstream_6FC2EAE0_113c,
  ITEMS_CalcGroundExpireFrame_6FC2E0A0_113c,
  MONUMOD_ApplyBossLevelAndExpBonus_6FC41E80_113c,
  MONUMOD_ApplyExtraFastVelocity_6FC42880_113c,
  MONUMOD_ScaleMonsterMaxAndCurLife_6FC41EC0_113c,
} from './k2-laneI-0x6fc3-w1-113c.js'
import {
  CLIENT_SendUnitRemoveIfInNearRoom_6FC4A9F0_113c,
  MONUMOD_InitUMod41ScheduleEvent7_6FC469F0_113c,
  OBJECTS_CheckSpawnSpotClearMargin2_6FC4E5D0_113c,
  OBJECTS_CheckSpawnSpotClearMargin7_6FC4E660_113c,
  PLRMODE_IsDualWieldingClaws_6FC46A30_113c,
} from './k2-laneJ-0x6fc4-w1-113c.js'
import { MISSILES_InitChargedBoltPath_6FC61F50_113c } from './k2-laneK-0x6fc5-w1-113c.js'
import { SKILLS_ApplySkillAuraStatCalcs_6FC648E0_113c } from './k2-laneL-0x6fc6-w1-113c.js'
import { MONMODE_DropTreasureOnDeathWrapper_6FC958D0_113c } from './k2-w2b3-113c.js'
import { MONSTER_SpawnAtCoords_6FD0F450_113c } from './k2-w2b8-113c.js'
import { UNITS_ChangeAnimMode113c } from './monster-events.js'
import { OBJECTS_InitObjectUnit113c } from './objects-populate-113c.js'
import {
  D2GAME_IAT_SGPT_DATATABLES_VA_113C,
  MONSTATS2_CheckModeBit113c,
  MONSTATS2_GetRecordPtr113c,
  MONSTATS_CheckFlagBit113c,
  MONSTATS_GetRecordPtr113c,
  MONSTER_Create113c,
  MONSTER_GetBaseIdFromUnit113c,
  MONSTER_SpawnAtCoords113c,
  MONSTER_SpawnPackMember113c,
  MONSTER_SpawnPartyMinionInRing113c,
  REGPOP_FindPackSpawnCoords113c,
  type RegpopSpawnHooks113c,
  ROOM_FindRoomContainingSubtile113c,
  SEED_RollLimitedFast113c,
  SEED_RollRangeHalfOpen113c,
  SUNIT_InitUnitSeed113c,
  SUNIT_PlaceServerUnitInRoom113c,
  SUNIT_ValidatePathTargetUnit113c,
  UNIT_GetPosX113c,
  UNIT_GetPosY113c,
} from './regpop-spawn-113c.js'
import { SUNIT_FreeUnit113c } from './replay-final11-113c.js'
import { EVENT_FreeNode113c, EVENT_SetEventFull113c } from './timer-wheel.js'

export type D2KernMemory113c = Memory113c

/** Optional callback hooks for indirect function table entries in Wave 3 Batch 2. */
export interface K2W3B2Hooks113c {
  readonly aiFallen?: AiFallenHooks113c
  readonly regpop?: RegpopSpawnHooks113c
  readonly meleeDot?: K2GapMeleeDotHooks113c
  readonly onMonUMod?: (
    m: Memory113c,
    pfn: number,
    pMonster: number,
    nUModId: number,
    bBoss: number,
  ) => void
  readonly onPresetObjectHandler?: (
    m: Memory113c,
    pfn: number,
    pGame: number,
    pRoom: number,
    nObjectId: number,
    x: number,
    y: number,
    nInitMode: number,
  ) => number
  readonly onObjectPosValidate?: (
    m: Memory113c,
    nObjectId: number,
    pCtx: number,
    x: number,
    y: number,
  ) => number
}

/** Isolated reentrant scratch stack pointer for Wave 3 Batch 2 helpers on `Memory113c`. */
let w3b2ScratchSp = 0x7eb80000

function sx8(v: number): number {
  return (v << 24) >> 24
}

function sx16(v: number): number {
  return (v << 16) >> 16
}

function stepSeed64InMem113c(m: Memory113c, pSeed: number): number {
  const lo = m.u32(pSeed >>> 0) >>> 0
  const hi = m.u32((pSeed + 4) >>> 0) >>> 0
  const prod = BigInt(lo) * 0x6ac690c5n + BigInt(hi)
  const newLo = Number(prod & 0xffffffffn) >>> 0
  const newHi = Number((prod >> 32n) & 0xffffffffn) >>> 0
  m.setU32((pSeed + 4) >>> 0, newHi)
  m.setU32(pSeed >>> 0, newLo)
  return newLo
}

function rollLimitedSeed64InMem113c(m: Memory113c, pSeed: number, nMax: number): number {
  const limit = nMax | 0
  if (limit <= 0) return 0
  const lo = stepSeed64InMem113c(m, pSeed)
  const mask = (limit - 1) | 0
  if ((limit & mask) === 0) {
    return (lo & mask) >>> 0
  }
  return ((lo >>> 0) % (limit >>> 0)) | 0
}

function mod8Signed113c(v: number): number {
  let r = (v | 0) & -0x7ffffff9
  if (r < 0) {
    r = (((r - 1) | -8) + 1) | 0
  }
  return r
}

function getUnitPosXInline113c(m: Memory113c, pUnit: number): number {
  const uType = m.u32(pUnit >>> 0) | 0
  const pPath = m.u32((pUnit + 0x2c) >>> 0) >>> 0
  if (uType === 2 || (uType > 3 && uType <= 5)) {
    return m.u32((pPath + 0x0c) >>> 0) | 0
  }
  if (pPath !== 0) {
    return PATH_GetPosX113c(m, pPath) | 0
  }
  return 0
}

function getUnitPosYInline113c(m: Memory113c, pUnit: number): number {
  const uType = m.u32(pUnit >>> 0) | 0
  const pPath = m.u32((pUnit + 0x2c) >>> 0) >>> 0
  if (uType === 2 || (uType > 3 && uType <= 5)) {
    return m.u32((pPath + 0x10) >>> 0) | 0
  }
  if (pPath !== 0) {
    return PATH_GetPosY113c(m, pPath) | 0
  }
  return 0
}

/**
 * `.rdata` `0x6FD1CEF8..0x6FD1CF37`: 8 octant `(dx, dy)` step vectors.
 */
const DIR_OFFSET_TABLE_6FD1CEF8: readonly (readonly [number, number])[] = [
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
]

/**
 * `.rdata` `0x6FD1CF38..0x6FD1D037`: `8x8` octant turn-step matrix (`row = targetDir`, `col = curDir`).
 */
const DIR_TURN_MATRIX_6FD1CF38: readonly number[] = [
  0, 0, 1, 2, 5, 6, 7, 0,
  1, 1, 1, 2, 3, 6, 7, 0,
  1, 2, 2, 2, 3, 4, 7, 0,
  1, 2, 3, 3, 3, 4, 5, 6,
  1, 2, 3, 4, 4, 4, 5, 6,
  7, 2, 3, 4, 5, 5, 5, 6,
  7, 0, 3, 4, 5, 6, 6, 6,
  7, 0, 1, 4, 5, 6, 7, 7,
]

/**
 * `.rdata` `0x6FD1CE3C` / `0x6FD1CE5C` (`dx[4]`) and `0x6FD1CE4C` / `0x6FD1CE6C` (`dy[4]`).
 */
const BOLT_DIR_DX_6FD1CE3C: readonly number[] = [-1, 0, 1, 0]
const BOLT_DIR_DY_6FD1CE4C: readonly number[] = [0, 1, 0, -1]

/**
 * `.data` `0x6FD2E550`: default `monUModTable[0..42]` function pointers.
 */
const DEFAULT_MONUMOD_TABLE_6FD2E550: readonly number[] = [
  0, 0x6fc43020, 0x6fc42fa0, 0, 0x6fc41e80, 0x6fc42bc0, 0x6fc42880, 0,
  0x6fc41be0, 0x6fc42740, 0, 0, 0, 0, 0, 0,
  0x6fc42da0, 0x6fc42600, 0x6fc42490, 0, 0, 0, 0, 0x6fc42320,
  0, 0x6fc421d0, 0x6fc441b0, 0x6fc41be0, 0x6fc41be0, 0, 0x6fc44cd0, 0,
  0, 0, 0, 0, 0x6fc43850, 0x6fc43810, 0x6fc437c0, 0x6fc42d00,
  0, 0x6fc469f0, 0,
]

/**
 * `.data` `0x6FD2E3E8..0x6FD2E49B`: `5 acts * 3 difficulties * 3 item codes` (`hp`, `mp`, `rv`).
 */
const POTION_CODE_TABLE_6FD2E3E8: readonly (readonly [number, number, number])[] = [
  [0x20327068, 0x2032706d, 0x20737672],
  [0x20337068, 0x2033706d, 0x20737672],
  [0x20337068, 0x2033706d, 0x20737672],
  [0x20347068, 0x2034706d, 0x206c7672],
  [0x20347068, 0x2034706d, 0x206c7672],
  [0x20347068, 0x2034706d, 0x206c7672],
  [0x20347068, 0x2035706d, 0x206c7672],
  [0x20357068, 0x2035706d, 0x206c7672],
  [0x20357068, 0x2035706d, 0x206c7672],
  [0x20357068, 0x2035706d, 0x206c7672],
  [0x20357068, 0x2035706d, 0x206c7672],
  [0x20357068, 0x2035706d, 0x206c7672],
  [0x20357068, 0x2035706d, 0x206c7672],
  [0x20357068, 0x2035706d, 0x206c7672],
  [0x20357068, 0x2035706d, 0x206c7672],
]

/**
 * `.data` `0x6FD2E1BC` (`9` entries, count at `0x6FD2E1E0 = 9`): preset object spawner VAs for `0x23E..0x246`.
 */
const DEFAULT_PRESET_OBJ_TABLE_6FD2E1BC: readonly number[] = [
  0x6fc525c0, 0x6fc525c0, 0x6fc525c0, 0x6fc525c0, 0x6fc525c0, 0x6fc525c0,
  0x6fc531b0, 0x6fc522b0, 0x6fc52110,
]

/**
 * `.data` `0x6FD2E00C` (`dx[8]`) and `0x6FD2E02C` (`dy[8]`) neighbor offsets.
 */
const NEIGHBOR8_DX_6FD2E00C: readonly number[] = [-1, 0, 1, -1, 1, -1, 0, 1]
const NEIGHBOR8_DY_6FD2E02C: readonly number[] = [-1, -1, -1, 0, 0, 1, 1, 1]

/**
 * `.data` `0x6FD2E334` (`int32[4]`) and `0x6FD2E344` (`count = 2`).
 */
const DEFAULT_EDGE_OBJ_TABLE_6FD2E334: readonly number[] = [104, 105, 106, 107]

/**
 * `.data` `0x6FD2E1F8` (`int32[10]`) and `0x6FD2E224` (`count = 5`).
 */
const DEFAULT_CRATE_OBJ_TABLE_6FD2E1F8: readonly number[] = [4, 9, 52, 94, 95, 89, 284, 208, 209, 3]

/**
 * `.rdata` `0x6FD1CCC0`: 6 entries `(nObjClassId, nMinShrine, nMaxShrine)` for preset objects `0x23E..0x243`.
 */
const PRESET_SHRINE_GROUP_TABLE_6FD1CCC0: readonly (readonly [number, number, number])[] = [
  [136, 2, 6],
  [136, 7, 7],
  [136, 8, 11],
  [136, 12, 12],
  [136, 1, 5],
  [136, 14, 14],
]

/**
 * Common inlined object unit allocation, initialization, and room placement sequence
 * shared across `0x6FC4FA90..0x6FC525C0`.
 */
function allocInitAndPlaceObjectUnit113c(
  m: Memory113c,
  pGame: number,
  pRoom: number,
  nObjectId: number,
  x: number,
  y: number,
  nInitMode = 0,
): number {
  const pUnit = UNIT_Alloc113c(m, 2) >>> 0
  if (pUnit === 0) return 0
  m.setU32(pUnit, 2)
  m.setU32((pUnit + 0x04) >>> 0, nObjectId >>> 0)
  m.setU32((pUnit + 0x08) >>> 0, m.u32((pGame + 0x1c) >>> 0))
  m.setU32((pUnit + 0x80) >>> 0, pGame >>> 0)
  let flags2 = m.u32((pUnit + 0xc8) >>> 0) >>> 0
  if (m.u32((pGame + 0x70) >>> 0) !== 0) {
    flags2 = (flags2 | 0x2000000) >>> 0
  } else {
    flags2 = (flags2 & 0xfdffffff) >>> 0
  }
  m.setU32((pUnit + 0xc8) >>> 0, flags2)
  m.setU32((pUnit + 0xc8) >>> 0, (flags2 | 0x4000000) >>> 0)
  const nAct = DRLG_GetActNoFromLevelId113c(m, DUNGEON_GetLevelIdFromRoom113c(m, pRoom)) & 0xff
  m.setU8((pUnit + 0x18) >>> 0, nAct)
  m.setU32((pUnit + 0x1c) >>> 0, m.u32((pGame + 0xbc + nAct * 4) >>> 0))
  m.setU32((pUnit + 0x74) >>> 0, 0)
  SUNIT_InitUnitSeed113c(m, pUnit, (pGame + 0xd0) >>> 0)
  m.setU32((pUnit + 0xc4) >>> 0, (m.u32((pUnit + 0xc4) >>> 0) | 0x10) >>> 0)
  m.setU32((pUnit + 0xd0) >>> 0, 0x0b)
  let nUnitId = ((m.u32((pGame + 0x98) >>> 0) | 0) + 1) | 0
  if (nUnitId === -1) nUnitId = 1
  m.setU32((pGame + 0x98) >>> 0, nUnitId >>> 0)
  const pObjData = m.alloc(0x38) >>> 0
  m.setU32((pUnit + 0x14) >>> 0, pObjData)
  m.fill(pObjData, 0x38, 0)
  m.setU32(pObjData, DATATBLS_GetObjectsTxtRecord113c(m, nObjectId) >>> 0)
  m.setU32((pUnit + 0x10) >>> 0, nInitMode >>> 0)
  UNITS_AllocStaticPath113c(m, pUnit)
  OBJECTS_InitObjectUnit113c(m, pUnit, pGame, nUnitId >>> 0, pRoom, x, y)
  SUNIT_PlaceServerUnitInRoom113c(m, pRoom, y, pUnit, x, pGame, 1)
  return pUnit
}

// ============================================================================
// [1/45] .. [45/45]
// ============================================================================

/**
 * [1/45] Spawns a pack minion (`MonStatsTxt->wMinion[0]` at `+0x26`) near `pUnit` when
 * `pAiTickArgs->nDist >= 5` (`+0x0C`) and `pUnit->pMonsterData->bTypeFlags` (`+0x16`)
 * lacks `(pGame->nGameType != 0 ? 0x0F : 0x08)`, or clears used skill and starts mode `1`,
 * then stalls AI for `15` frames.
 *
 * @va D2Game:0x6FC3BCA0
 */
export function AI_SpawnPackMinionOrStartMode_6FC3BCA0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  pAiTickArgs: number,
  hooks?: K2W3B2Hooks113c,
): void {
  const bMask = m.u8((pGame + 0x6d) >>> 0) !== 0 ? 0x0f : 0x08
  let pMonData = 0
  if (pUnit !== 0 && (m.u32(pUnit >>> 0) >>> 0) === 1) {
    pMonData = m.u32((pUnit + 0x14) >>> 0) >>> 0
  }
  const bBlocked = (m.u8((pMonData + 0x16) >>> 0) & bMask) !== 0 ? 1 : 0
  if ((m.u32((pAiTickArgs + 0x0c) >>> 0) | 0) >= 5 && bBlocked === 0) {
    const pRoom = UNITS_GetRoom113c(m, pUnit) >>> 0
    if (pRoom !== 0) {
      const pMonStatsTxt = m.u32((pAiTickArgs + 0x10) >>> 0) >>> 0
      const wMinion0 = sx16(m.u16((pMonStatsTxt + 0x26) >>> 0))
      const nSubClassId = DRLG_ResolveMonsterSubClassIdForRoom113c(m, pRoom, wMinion0) | 0
      const sp = w3b2ScratchSp
      w3b2ScratchSp = (sp + 0x30) >>> 0
      try {
        const pOutY = sp
        const pOutX = (sp + 4) >>> 0
        const pCoordNode = (sp + 8) >>> 0
        m.fill(sp, 0x30, 0)
        const bFound = REGPOP_FindPackSpawnCoords113c(
          m,
          pRoom,
          pGame,
          pCoordNode,
          nSubClassId,
          pOutX,
          pOutY,
          0,
          hooks !== undefined ? hooks.regpop : undefined,
        )
        if (bFound !== 0) {
          const x = m.u32(pOutX) | 0
          const y = m.u32(pOutY) | 0
          const pSpawned = MONSTER_SpawnAtCoords113c(
            m,
            nSubClassId,
            8,
            pGame,
            pRoom,
            x,
            y,
            1,
            0,
            hooks !== undefined ? hooks.regpop : undefined,
          ) >>> 0
          if (pSpawned !== 0) {
            if ((m.u32(pSpawned) >>> 0) === 1) {
              const pSpMonData = m.u32((pSpawned + 0x14) >>> 0) >>> 0
              if (pSpMonData !== 0) {
                m.setU8((pSpMonData + 0x16) >>> 0, (m.u8((pSpMonData + 0x16) >>> 0) | 0x08) & 0xff)
              }
            }
            AI_Stall113c(m, pGame, pUnit, 0x0f)
            return
          }
        }
      } finally {
        w3b2ScratchSp = sp
      }
    }
  }
  SKILLS_SetUsedSkillMemPort113c(m, pUnit, 0)
  MONSTER_StartMode113c(m, pGame, pUnit, 1, 0, 0, 0)
  AI_Stall113c(m, pGame, pUnit, 0x0f)
}

/**
 * [2/45] Steps octant turn direction in `pAiControl->dwParam[4]` (`+0x1C`) via `0x6FD1CF38`
 * and casts `MonStatsTxt->wSkill[4]` (`+0x170`) with mode `MonStatsTxt->nSkillMode[4]` (`+0x180`).
 *
 * @va D2Game:0x6FC3C1E0
 */
export function AI_StepTurnAndCastSkill4_6FC3C1E0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  pAiTickArgs: number,
  hooks?: K2W3B2Hooks113c,
): void {
  const pAiControl = m.u32(pAiTickArgs >>> 0) >>> 0
  const pMonStatsTxt = m.u32((pAiTickArgs + 0x1c) >>> 0) >>> 0
  const pTarget = m.u32((pAiTickArgs + 0x08) >>> 0) >>> 0
  const nDist = m.u32((pAiTickArgs + 0x14) >>> 0) | 0
  const wSkill4 = sx16(m.u16((pMonStatsTxt + 0x170) >>> 0))

  if (wSkill4 >= 0 && m.u32((pAiControl + 0x14) >>> 0) === 0) {
    const nMode = sx8(m.u8((pMonStatsTxt + 0x180) >>> 0))
    AI_CastSkillWithMode113c(
      m,
      nMode,
      pUnit,
      pGame,
      wSkill4,
      0,
      0,
      0,
      undefined,
      hooks !== undefined ? hooks.aiFallen : undefined,
    )
    m.setU32((pAiControl + 0x1c) >>> 0, 0)
    m.setU32((pAiControl + 0x14) >>> 0, m.u32((pGame + 0xa8) >>> 0))
    return
  }

  const dwCurFrame = m.u32((pGame + 0xa8) >>> 0) | 0
  if (dwCurFrame >= (m.u32((pAiControl + 0x14) >>> 0) | 0)) {
    const nDiff = m.u8((pGame + 0x6d) >>> 0)
    const wMaxDist = sx16(m.u16((pMonStatsTxt + 0x68 + nDiff * 2) >>> 0))
    if (nDist > wMaxDist) {
      const nCount = m.u32((pAiControl + 0x18) >>> 0) | 0
      if (nCount > 0) {
        m.setU32((pAiControl + 0x18) >>> 0, (nCount - 1) >>> 0)
      }
      AI_Stall113c(m, pGame, pUnit, 0x0f)
      return
    }

    const targetX = getUnitPosXInline113c(m, pTarget)
    const targetY = getUnitPosYInline113c(m, pTarget)
    const unitX = getUnitPosXInline113c(m, pUnit)
    const unitY = getUnitPosYInline113c(m, pUnit)

    const rawDir = UNITS_GetDirectionToCoords113c(m, pUnit, targetX, targetY) & 0xff
    const oldDir = mod8Signed113c(m.u32((pAiControl + 0x1c) >>> 0) | 0)
    const normDir = mod8Signed113c(DATATBLS_NormalizeDirection113c(m, rawDir) & 0xff)
    const matIdx = (oldDir + (normDir << 3)) | 0
    const nextDir =
      matIdx >= 0 && matIdx < 64
        ? DIR_TURN_MATRIX_6FD1CF38[matIdx]!
        : m.u32((0x6fd1cf38 + imul32(matIdx, 4)) >>> 0) | 0
    m.setU32((pAiControl + 0x1c) >>> 0, nextDir >>> 0)

    const wStepMult = sx16(m.u16((pMonStatsTxt + 0x6e + nDiff * 2) >>> 0))
    const stepVec = DIR_OFFSET_TABLE_6FD1CEF8[nextDir & 7]!
    const destX = (unitX + imul32(stepVec[0], wStepMult)) | 0
    const destY = (unitY + imul32(stepVec[1], wStepMult)) | 0

    UNITS_SetTargetUnitForDynamicUnit113c(m, pUnit, pTarget)

    const wCurSkill = sx16(m.u16((pMonStatsTxt + 0x170) >>> 0))
    if (wCurSkill >= 0) {
      const canCastDest = SKILLS_CanMonsterCastAtTarget113c(
        m,
        destY,
        pGame,
        pTarget,
        wCurSkill,
        destX,
        hooks !== undefined ? hooks.aiFallen : undefined,
      )
      if (canCastDest !== 0) {
        const tY = UNIT_GetPosY113c(m, pTarget) | 0
        const tX = UNIT_GetPosX113c(m, pTarget) | 0
        const canCastTarget = SKILLS_CanMonsterCastAtTarget113c(
          m,
          tY,
          pGame,
          pTarget,
          sx16(m.u16((pMonStatsTxt + 0x170) >>> 0)),
          tX,
          hooks !== undefined ? hooks.aiFallen : undefined,
        )
        if (canCastTarget !== 0) {
          const nCastSkill = sx16(m.u16((pMonStatsTxt + 0x170) >>> 0))
          const nCastMode = sx8(m.u8((pMonStatsTxt + 0x180) >>> 0))
          AI_CastSkillWithMode113c(
            m,
            nCastMode,
            pUnit,
            pGame,
            nCastSkill,
            0,
            destX,
            destY,
            undefined,
            hooks !== undefined ? hooks.aiFallen : undefined,
          )
          PATH_SetTargetPos113c(m, m.u32((pUnit + 0x2c) >>> 0) >>> 0, destX, destY)
          const newCount = ((m.u32((pAiControl + 0x18) >>> 0) | 0) + 1) | 0
          m.setU32((pAiControl + 0x18) >>> 0, newCount >>> 0)
          const nDiffIdx = m.u8((pGame + 0x6d) >>> 0)
          const wMaxBursts = sx16(m.u16((pMonStatsTxt + 0x5c + nDiffIdx * 2) >>> 0))
          if (newCount > wMaxBursts) {
            const wCooldown = sx16(m.u16((pMonStatsTxt + 0x62 + nDiffIdx * 2) >>> 0))
            m.setU32((pAiControl + 0x14) >>> 0, ((m.u32((pGame + 0xa8) >>> 0) | 0) + wCooldown) >>> 0)
            m.setU32((pAiControl + 0x18) >>> 0, 0)
            return
          }
          const wShortDelay = sx16(m.u16((pMonStatsTxt + 0x56 + nDiffIdx * 2) >>> 0))
          m.setU32((pAiControl + 0x14) >>> 0, ((m.u32((pGame + 0xa8) >>> 0) | 0) + wShortDelay) >>> 0)
          return
        }
      }
    }

    const nCurBurst = m.u32((pAiControl + 0x18) >>> 0) | 0
    if (nCurBurst > 0) {
      m.setU32((pAiControl + 0x18) >>> 0, (nCurBurst - 1) >>> 0)
    }
  }

  AI_Stall113c(m, pGame, pUnit, 0x0a)
}

/**
 * [3/45] Evaluates hireling skill slots (`HirelingTxt + 0x78`), performs weighted random selection,
 * and either casts the selected skill or executes a melee attack / approach against `pTarget`.
 *
 * @va D2Game:0x6FC3C4E0
 */
export function AI_SelectAndCastHirelingSkill_6FC3C4E0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  pTarget: number,
  bAllowMove: number,
  hooks?: K2W3B2Hooks113c,
): number {
  const nUnitLevel = STATLIST_GetUnitStat113c(m, pUnit, 0x0c, 0) | 0
  let wSubTypeId = 0
  if (pUnit !== 0 && (m.u32(pUnit >>> 0) >>> 0) === 1) {
    const pMonData = m.u32((pUnit + 0x14) >>> 0) >>> 0
    if (pMonData !== 0) {
      wSubTypeId = m.u16((pMonData + 0x22) >>> 0)
    }
  }
  const pHirelingTxt = DATATBLS_GetHirelingTxtRecordFromIdAndLevel113c(
    m,
    m.u8((pGame + 0x70) >>> 0),
    wSubTypeId,
    nUnitLevel,
  ) >>> 0
  if (pHirelingTxt === 0) return 0

  let nTotalChance = m.u32((pHirelingTxt + 0x5c) >>> 0) | 0
  let nEligibleCount = 0
  const eligibleSkills: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]
  const eligibleChances: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]
  const eligibleModes: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]

  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  const nSkillsCount = m.u32((pDataTables + 0xbac) >>> 0) | 0
  const pSkillsBase = m.u32((pDataTables + 0xba8) >>> 0) >>> 0

  for (let i = 0; i < 6; i++) {
    const wSkillId = m.u16((pHirelingTxt + 0x78 + i * 2) >>> 0)
    if (wSkillId === 0) break
    const pSkill = SKILLS_GetSkillById113c(m, pUnit, wSkillId, -1) >>> 0
    if (pSkill === 0) continue
    if ((SKILLS_EvaluateSkillLevel113c(m, pUnit, pSkill, 1) | 0) <= 0) continue
    const nSkillIdx = wSkillId & 0xffff
    if (nSkillIdx >= nSkillsCount) continue
    const pSkillsTxt = (pSkillsBase + imul32(nSkillIdx, 0x23c)) >>> 0
    if (pSkillsTxt === 0) continue

    const nAuraState = sx16(m.u16((pSkillsTxt + 0x10) >>> 0))
    if (nAuraState > 0 && STATES_CheckState113c(m, pUnit, nAuraState) !== 0) {
      continue
    }

    const nRangeType = m.u8((pSkillsTxt + 0x18) >>> 0)
    if ((nRangeType === 1 || nRangeType === 3) && pTarget !== 0) {
      if ((UNITS_GetApproximateDistance113c(m, pUnit, pTarget) | 0) > 2) {
        continue
      }
    }

    const nMode = m.u8((pHirelingTxt + 0x90 + i) >>> 0)
    const nChance = m.u32((pHirelingTxt + 0x60 + i * 4) >>> 0) | 0
    eligibleSkills[nEligibleCount] = nSkillIdx
    eligibleChances[nEligibleCount] = nChance
    eligibleModes[nEligibleCount] = nMode
    nTotalChance = (nTotalChance + nChance) | 0
    nEligibleCount++
  }

  let nSelectedSlot = -1
  if (nEligibleCount > 0) {
    let nRoll = 0
    if (nTotalChance > 0) {
      nRoll = rollLimitedSeed64InMem113c(m, (pUnit + 0x20) >>> 0, nTotalChance)
    }
    let idx = 0
    for (; idx < nEligibleCount; idx++) {
      if (nRoll < eligibleChances[idx]!) break
      nRoll = (nRoll - eligibleChances[idx]!) | 0
    }
    if (idx < nEligibleCount) {
      nSelectedSlot = idx
    }
  }

  if (nSelectedSlot !== -1) {
    const nChosenMode = eligibleModes[nSelectedSlot]!
    const nChosenSkill = eligibleSkills[nSelectedSlot]!
    if (nChosenMode === 0x0e) {
      SKILLS_AssignHandSkillAndSyncAura113c(
        m,
        pUnit,
        0,
        nChosenSkill,
        -1,
        hooks !== undefined ? hooks.meleeDot : undefined,
      )
      return 1
    }
    if (pTarget !== 0) {
      let nAnimMode = nChosenMode
      if (nAnimMode < 4 || nAnimMode > 0x0f) {
        nAnimMode = 4
      }
      AI_CastSkillWithMode113c(
        m,
        nAnimMode & 0xff,
        pUnit,
        pGame,
        nChosenSkill,
        pTarget,
        0,
        0,
        undefined,
        hooks !== undefined ? hooks.aiFallen : undefined,
      )
      return 1
    }
  } else if (pTarget !== 0) {
    SKILLS_SetUsedSkillMemPort113c(m, pUnit, 0)
    if (UNITS_CanUnitMeleeAttackTarget113c(m, pUnit, pTarget, 0) !== 0) {
      let nAtkMode = 4
      const nClassId = pUnit !== 0 ? m.u32((pUnit + 0x04) >>> 0) | 0 : -1
      const pMonStats = (pDataTables !== 0 && nClassId >= 0 && nClassId < (m.u32((pDataTables + 0xa80) >>> 0) | 0))
        ? (m.u32((pDataTables + 0xa78) >>> 0) + imul32(nClassId, 0x1a8)) >>> 0
        : 0
      const pMonStats2 = pMonStats !== 0 ? MONSTATS2_GetRecordPtr113c(m, sx16(m.u16((pMonStats + 0x06) >>> 0))) >>> 0 : 0
      if (pMonStats2 !== 0 && (m.u8((pMonStats2 + 0x0c) >>> 0) & 0x20) !== 0) {
        const nA1ToHit = STATLIST_GetUnitStat113c(m, pUnit, 0x13, 0) | 0
        const nA2ToHit = STATLIST_GetUnitStat113c(m, pUnit, 0x14, 0) | 0
        const nSum = (nA1ToHit + nA2ToHit) | 0
        let nAtkRoll = 0
        if (nSum > 0) {
          nAtkRoll = rollLimitedSeed64InMem113c(m, (pUnit + 0x20) >>> 0, nSum)
        }
        nAtkMode = (nAtkRoll >= nA1ToHit ? 1 : 0) + 4
      }
      MONSTER_StartMode113c(m, pGame, pUnit, nAtkMode, pTarget, 0, 0)
      return 1
    }
    if (bAllowMove !== 0) {
      MONSTER_StartMode113c(m, pGame, pUnit, 2, pTarget, 0, 0)
      return 1
    }
  }

  AI_Stall113c(m, pGame, pUnit, 0x0a)
  return 1
}

/**
 * [4/45] Moves preset AI command node pointer via `DRLGPRESET_MovePointerAndClear113c`,
 * copies AI command parameters via `AIGENERAL_CopyAiCommandParams113c`, and configures
 * special boss/siege preset monsters (`0x44`, `0x21F`, `0x137`, `0x138`).
 *
 * @va D2Game:0x6FC3F2D0
 */
export function MONSTER_ApplyPresetAiCommands_6FC3F2D0_113c(
  m: D2KernMemory113c,
  pMonster: number,
  ppPresetNode: number,
): void {
  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 8) >>> 0
  try {
    m.setU32(sp, 0)
    DRLGPRESET_MovePointerAndClear113c(m, ppPresetNode, sp)
    let pNode = m.u32(sp) >>> 0
    while (pNode !== 0) {
      AIGENERAL_CopyAiCommandParams113c(
        m,
        pMonster,
        m.u32(pNode) | 0,
        m.u32((pNode + 0x04) >>> 0) | 0,
        m.u32((pNode + 0x08) >>> 0) | 0,
        m.u32((pNode + 0x0c) >>> 0) | 0,
        m.u32((pNode + 0x10) >>> 0) | 0,
      )
      DRLGPRESET_MovePointerAndClear113c(m, (pNode + 0x14) >>> 0, sp)
      pNode = m.u32(sp) >>> 0
    }
  } finally {
    w3b2ScratchSp = sp
  }

  if (pMonster === 0) return
  const nClassId = m.u32((pMonster + 0x04) >>> 0) | 0
  if (nClassId === 0x44 || nClassId === 0x21f) {
    const pGame = m.u32((pMonster + 0x80) >>> 0) >>> 0
    const pRoom = UNITS_GetRoom113c(m, pMonster) >>> 0
    const nLevelId = pRoom !== 0 ? DUNGEON_GetLevelIdFromRoom113c(m, pRoom) | 0 : 0
    const nAct = DRLG_GetActNoFromLevelId113c(m, nLevelId) & 0xff
    const nTargetX = m.u32(0x6fd2e5fc) | 0
    const nTargetY = m.u32(0x6fd2e600) | 0
    if (pGame !== 0 && nTargetX !== 0 && nTargetY !== 0 && nAct === (m.u8(0x6fd2e604) & 0xff)) {
      AIGENERAL_CopyAiCommandParams113c(m, pMonster, 2, nTargetX, nTargetY, 0, 0)
      return
    }
  } else if (nClassId === 0x137 || nClassId === 0x138) {
    const nX = getUnitPosXInline113c(m, pMonster)
    const nY = getUnitPosYInline113c(m, pMonster)
    if (nX !== 0 && nY !== 0) {
      m.setU32(0x6fd2e5fc, nX >>> 0)
      m.setU32(0x6fd2e600, nY >>> 0)
      const pRoom = UNITS_GetRoom113c(m, pMonster) >>> 0
      const nLevelId = pRoom !== 0 ? DUNGEON_GetLevelIdFromRoom113c(m, pRoom) | 0 : 0
      m.setU8(0x6fd2e604, DRLG_GetActNoFromLevelId113c(m, nLevelId) & 0xff)
    }
  }
}

/**
 * [5/45] Decodes an item and its socketed child items from a compact bitstream buffer,
 * places socketed items into the parent's inventory, and activates equipped stats.
 *
 * @va D2Game:0x6FC3F9F0
 */
export function ITEMS_LoadItemAndSocketsFromBitstream_6FC3F9F0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pBitstream: number,
  nRemainingSize: number,
  bHasVersionCoords: number,
  ppOutItem: number,
  pOutTotalBytesRead: number,
): number {
  m.setU32(ppOutItem >>> 0, 0)
  m.setU32(pOutTotalBytesRead >>> 0, 0)

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x60) >>> 0
  try {
    const pBytesRead = sp
    const pHeader = (sp + 4) >>> 0
    m.fill(sp, 0x60, 0)

    const nSaveVersion = ITEMS_DecodeItemCompactBitstreamV96_113c(
      m,
      pBitstream,
      nRemainingSize,
      1,
      pHeader,
    ) | 0
    if (nSaveVersion === 0) return 3
    if (nSaveVersion !== 0x60) return 2
    if ((m.u32((pHeader + 0x48) >>> 0) | 0) > (nRemainingSize | 0)) return 1

    const nHeaderBytes = m.u32((pHeader + 0x48) >>> 0) | 0
    const pCurStream = (pBitstream + nHeaderBytes) >>> 0
    const nCurRem = (nRemainingSize - nHeaderBytes) | 0

    const pParentItem = ITEMS_AllocAndLoadFromBitstream_6FC2EAE0_113c(
      m,
      pGame,
      pHeader,
      0,
      pCurStream,
      nCurRem,
      bHasVersionCoords,
      pBytesRead,
      0x60,
    ) >>> 0
    m.setU32(ppOutItem >>> 0, pParentItem)
    if (pParentItem === 0) return 3

    let nTotalConsumed = (m.u32(pBytesRead) + nHeaderBytes) | 0
    let pSocketStream = (pBitstream + nTotalConsumed) >>> 0
    let nSocketRem = (nRemainingSize - nTotalConsumed) | 0
    const nSocketedCount = m.u8((pHeader + 0x05) >>> 0)
    let nLoadedSockets = 0

    if (nSocketedCount > 0) {
      while (nSocketRem > 0) {
        const pChildItem = ITEMS_AllocAndLoadFromBitstream_6FC2EAE0_113c(
          m,
          pGame,
          pHeader,
          0,
          pSocketStream,
          nSocketRem,
          bHasVersionCoords,
          pBytesRead,
          0x60,
        ) >>> 0
        if (pChildItem === 0) return 3

        let pInv = m.u32((pParentItem + 0x60) >>> 0) >>> 0
        if (pInv === 0) {
          pInv = INVENTORY_AllocInventory113c(m, m.u32((pGame + 0x1c) >>> 0), pParentItem) >>> 0
          m.setU32((pParentItem + 0x60) >>> 0, pInv)
          if (pInv === 0) return 3
        }
        if (INVENTORY_PlaceItemInSocket113c(m, pInv, pChildItem, 1) === 0) {
          return 3
        }
        ITEMS_ActivateEquippedItemStats113c(m, pParentItem, pChildItem, 1)
        const nChildRead = m.u32(pBytesRead) | 0
        nTotalConsumed = (nTotalConsumed + nChildRead) | 0
        pSocketStream = (pSocketStream + nChildRead) >>> 0
        nSocketRem = (nSocketRem - nChildRead) | 0
        nLoadedSockets++
        if (nLoadedSockets >= nSocketedCount) break
      }
      if (nLoadedSockets < nSocketedCount) return 1
    }

    m.setU32(pOutTotalBytesRead >>> 0, nTotalConsumed >>> 0)
    return 0
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [6/45] Serializes `pItem` into `pSaveNode`, records ground expire metadata,
 * removes and frees any socketed child items, and frees `pItem`.
 *
 * @va D2Game:0x6FC403D0
 */
export function ITEMS_SaveItemToNodeAndFree_6FC403D0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pSaveNode: number,
  pItem: number,
): number {
  m.setU8((pSaveNode + 0x02) >>> 0, ITEMS_GetSubTypeFromItem113c(m, pItem) & 0xff)
  const nWritten = ITEMS_SerializeItemToBuffer113c(
    m,
    pItem,
    (pSaveNode + 0x29) >>> 0,
    0x7fff,
    1,
    1,
    0,
  ) | 0
  m.setU8((pSaveNode + 0x28) >>> 0, nWritten & 0xff)
  if ((nWritten & 0xff) === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x608)
  }
  const nExpire = ((ITEMS_CalcGroundExpireFrame_6FC2E0A0_113c(m, pGame, pItem) | 0) - (m.u32((pGame + 0xa8) >>> 0) | 0)) | 0
  m.setU32((pSaveNode + 0x1c) >>> 0, nExpire >>> 0)
  m.setU32((pSaveNode + 0x24) >>> 0, ITEMS_GetCellOverwrite113c(m, pItem) >>> 0)

  const pInv = m.u32((pItem + 0x60) >>> 0) >>> 0
  if (pInv !== 0) {
    let pChild = INVENTORY_GetFirstItem113c(m, pInv) >>> 0
    while (pChild !== 0) {
      const pNext = INVENTORY_GetNextItem113c(m, pChild) >>> 0
      if (INVENTORY_UnitIsItem113c(m, pChild) !== 0) {
        INVENTORY_RemoveItemFromInventory113c(m, pInv, pChild)
        SUNIT_FreeUnit113c(m, pGame, pChild)
      }
      pChild = pNext
    }
  }
  SUNIT_FreeUnit113c(m, pGame, pItem)
  return 1
}

/**
 * [7/45] Removes `pMinion` from the linked minion list (`+0x34`) of all pack members
 * in its leader's pack and clears `pMinion`'s own minion list pointer.
 *
 * @va D2Game:0x6FC416A0
 */
export function AIGENERAL_RemoveFromMinionList_6FC416A0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pMinion: number,
): void {
  if (pMinion === 0) return
  if ((m.u32(pMinion >>> 0) >>> 0) !== 1) return
  const pMonData = m.u32((pMinion + 0x14) >>> 0) >>> 0
  if (pMonData === 0) return
  const pAiGen = m.u32((pMonData + 0x28) >>> 0) >>> 0
  if (pAiGen === 0) return

  const pLeader = SUNIT_GetServerUnit113c(
    m,
    pGame,
    m.u32((pAiGen + 0x1c) >>> 0) | 0,
    m.u32((pAiGen + 0x20) >>> 0) | 0,
  ) >>> 0
  if (pLeader === 0 || (m.u32(pLeader) >>> 0) !== 1) return
  const pLeaderMonData = m.u32((pLeader + 0x14) >>> 0) >>> 0
  if (pLeaderMonData === 0) return
  const pLeaderAiGen = m.u32((pLeaderMonData + 0x28) >>> 0) >>> 0
  if (pLeaderAiGen === 0) return

  let pListHead = m.u32((pLeaderAiGen + 0x34) >>> 0) >>> 0
  if (pListHead === 0) return

  const dwMinionGuid = m.u32((pMinion + 0x0c) >>> 0) >>> 0
  let pPrevNode = 0
  let pCurNode = pListHead
  let pRemovedNode = 0

  while (pCurNode !== 0) {
    if ((m.u32(pCurNode) >>> 0) === dwMinionGuid) {
      pRemovedNode = pCurNode
      if (pPrevNode === 0) {
        pListHead = m.u32((pCurNode + 0x04) >>> 0) >>> 0
      } else {
        m.setU32((pPrevNode + 0x04) >>> 0, m.u32((pCurNode + 0x04) >>> 0))
      }
      break
    }
    pPrevNode = pCurNode
    pCurNode = m.u32((pCurNode + 0x04) >>> 0) >>> 0
  }

  for (let pNode = pListHead; pNode !== 0; pNode = m.u32((pNode + 0x04) >>> 0) >>> 0) {
    const pMember = SUNIT_GetServerUnit113c(m, pGame, 1, m.u32(pNode) | 0) >>> 0
    if (pMember !== 0 && (m.u32(pMember) >>> 0) === 1) {
      const pMemMonData = m.u32((pMember + 0x14) >>> 0) >>> 0
      if (pMemMonData !== 0) {
        const pMemAiGen = m.u32((pMemMonData + 0x28) >>> 0) >>> 0
        if (pMemAiGen !== 0) {
          m.setU32((pMemAiGen + 0x34) >>> 0, pListHead)
        }
      }
    }
  }

  if (pRemovedNode !== 0) {
    void m.u32((pGame + 0x1c) >>> 0)
  }
  m.setU32((pAiGen + 0x34) >>> 0, 0)
}

/**
 * [8/45] Sets monster level (`0x0C`), attack rating (`0x13`), and physical/elemental
 * damage stats on `pMonster`'s statlist for champion/sentry monsters (`0x146..0x171`).
 *
 * @va D2Game:0x6FC418A0
 */
export function MONUMOD_ApplyChampionBaseStats_6FC418A0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pMonster: number,
  _nUModId = 0,
  _bBoss = 0,
): void {
  let nMlvl = 2
  const pRoom = UNITS_GetRoom113c(m, pMonster) >>> 0
  const nLevelId = DUNGEON_GetLevelIdFromRoom113c(m, pRoom) | 0
  if (nLevelId !== 0) {
    const bExpansion = m.u32((pGame + 0x70) >>> 0)
    const nDifficulty = m.u8((pGame + 0x6d) >>> 0)
    nMlvl = DATATBLS_GetLevelMonsterLevel113c(m, nLevelId, nDifficulty, bExpansion) | 0
    if (nMlvl <= 1) {
      nMlvl = 1
    }
  }
  let nToHit = (nMlvl + 0x32) | 0
  if (nToHit >= 0x5a) {
    nToHit = 0x5a
  }
  STATLIST_SetUnitStat113c(m, pMonster, 0x0c, nMlvl, 0)
  STATLIST_SetUnitStat113c(m, pMonster, 0x13, nToHit, 0)

  if (pMonster === 0 || (m.u32(pMonster >>> 0) >>> 0) !== 1) {
    throw new D2CommonAssertError('MonUMod.cpp', 0xc42)
  }

  const pStatList = STATLIST_GetStatListFromUnitAndFlag113c(m, pMonster, 1) >>> 0
  const nIdx = ((m.u32((pMonster + 0x04) >>> 0) | 0) - 0x146) >>> 0
  if (nIdx > 0x2b) return

  if (nIdx === 0) {
    STATLIST_SetStat113c(m, pStatList, 0x15, 0, 0)
    STATLIST_SetStat113c(m, pStatList, 0x16, 0, 0)
    STATLIST_SetStat113c(m, pStatList, 0x30, nMlvl >> 1, 0)
    STATLIST_SetStat113c(m, pStatList, 0x31, imul32(nMlvl, 3) >> 1, 0)
  } else if (nIdx === 1 || nIdx === 2) {
    let nMin = ((nMlvl >> 1) + 1) | 0
    if (nMlvl < nMin) nMin = nMlvl
    STATLIST_SetStat113c(m, pStatList, 0x15, nMin, 0)
    STATLIST_SetStat113c(m, pStatList, 0x16, nMlvl, 0)
  } else if (nIdx === 3) {
    STATLIST_SetStat113c(m, pStatList, 0x15, 0, 0)
    STATLIST_SetStat113c(m, pStatList, 0x16, 0, 0)
    STATLIST_SetStat113c(m, pStatList, 0x39, nMlvl, 0)
    STATLIST_SetStat113c(m, pStatList, 0x3a, (nMlvl * 2) | 0, 0)
    STATLIST_SetStat113c(m, pStatList, 0x3b, (nMlvl * 2) | 0, 0)
  } else if (nIdx === 4 || nIdx === 0x2b) {
    STATLIST_SetStat113c(m, pStatList, 0x15, 0, 0)
    STATLIST_SetStat113c(m, pStatList, 0x16, 0, 0)
    STATLIST_SetStat113c(m, pStatList, 0x32, nMlvl >> 1, 0)
    STATLIST_SetStat113c(m, pStatList, 0x33, imul32(nMlvl, 3) >> 1, 0)
  }
}

/**
 * [9/45] Applies resistance bonuses for monster UMods (`0x08`, `0x09`, `0x11`, `0x12`, `0x17`,
 * `0x19`, `0x1B`, `0x1C`) while enforcing the 2-immunity (`>= 100`) cap.
 *
 * @va D2Game:0x6FC41BE0
 */
export function MONUMOD_ApplyResistanceBonus_6FC41BE0_113c(
  m: D2KernMemory113c,
  pMonster: number,
  nUModId: number,
  bBoss: number,
): void {
  if (bBoss === 0 || pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return

  const pGame = m.u32((pMonster + 0x80) >>> 0) >>> 0
  if (pGame === 0) return

  const statIds: [number, number, number, number, number, number] = [0x25, 0x27, 0x29, 0x2b, 0x2d, 0x24]
  const curRes: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]
  const addRes: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]
  let nImmuneCount = 0

  for (let i = 0; i < 6; i++) {
    const val = STATLIST_GetUnitStat113c(m, pMonster, statIds[i]!, 0) | 0
    curRes[i] = val
    if (val >= 100) {
      nImmuneCount++
    }
  }

  const bExpansion = m.u16((pGame + 0x70) >>> 0) !== 0
  const mod = nUModId | 0

  if (mod === 0x08) {
    if (!bExpansion) {
      addRes[0] = 0x4b
      addRes[1] = 0x4b
      addRes[2] = 0x4b
      addRes[3] = 0x4b
    } else {
      addRes[0] = 0x28
    }
  } else if (mod === 0x09) {
    addRes[1] = 0x4b
  } else if (mod === 0x11) {
    addRes[2] = 0x4b
  } else if (mod === 0x12) {
    addRes[3] = 0x4b
  } else if (mod === 0x17) {
    addRes[4] = 0x4b
  } else if (mod === 0x19) {
    addRes[0] = 0x4b
  } else if (mod === 0x1b) {
    if (!bExpansion) {
      addRes[1] = 0x32
      addRes[2] = 0x32
      addRes[3] = 0x32
    } else {
      const pSeed = (pMonster + 0x20) >>> 0
      const r0 = (stepSeed64InMem113c(m, pSeed) & 1) !== 0 ? 1 : 0
      addRes[r0] = 0x14
      addRes[1] = 0x28
      addRes[2] = 0x28
      addRes[3] = 0x28
    }
  } else if (mod === 0x1c) {
    addRes[5] = bExpansion ? 0x32 : 0x4b
  }

  for (let i = 0; i < 6; i++) {
    const bonus = addRes[i]!
    if (bonus !== 0 && nImmuneCount < 2) {
      const newVal = (curRes[i]! + bonus) | 0
      if (newVal >= 100) {
        nImmuneCount++
      }
      STATLIST_SetUnitStat113c(m, pMonster, statIds[i]!, newVal, 0)
    }
  }
}

/**
 * [10/45] Applies boss/minion elemental damage bonus stats (`nElemType`: `0`=fire,
 * `1`=lightning, `2`=cold, `3`=poison, `5`=cold length only) scaled from `MonLvl.txt`
 * and `MonUMod.txt` constants.
 *
 * @va D2Game:0x6FC41FE0
 */
export function MONUMOD_ApplyElementalDamageBonus_6FC41FE0_113c(
  m: D2KernMemory113c,
  pMonster: number,
  nElemType: number,
  bBoss: number,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return
  const pGame = m.u32((pMonster + 0x80) >>> 0) >>> 0
  if (pGame === 0) return

  const nMlvl = STATLIST_GetUnitStat113c(m, pMonster, 0x0c, 0) | 0
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if (nMlvl < 0 || nMlvl >= (m.u32((pDataTables + 0xb74) >>> 0) | 0)) return
  const pMonLvlBase = m.u32((pDataTables + 0xb70) >>> 0) >>> 0
  const pMonLvlRec = (pMonLvlBase + imul32(nMlvl, 0x48)) >>> 0
  if (pMonLvlRec === 0) return

  let nDiff = m.u8((pGame + 0x6d) >>> 0)
  if (nDiff < 0) nDiff = 0
  if (nDiff > 2) nDiff = 2

  const bExp = m.u16((pGame + 0x70) >>> 0) !== 0
  const nColIdx = (bExp ? (nDiff + 3) : nDiff) | 0
  const nBaseDmg = m.u32((pMonLvlRec + 0x24 + nColIdx * 4) >>> 0) | 0

  const nMinConstIdx = (bBoss === 0 ? 2 : 0) + 0x10 + nDiff * 4
  const nMaxConstIdx = (bBoss === 0 ? 2 : 0) + 0x11 + nDiff * 4
  const nMonUModCount = m.u32((pDataTables + 0xc54) >>> 0) | 0
  const pMonUModBase = m.u32((pDataTables + 0xc50) >>> 0) >>> 0

  const nMinPct =
    nMinConstIdx >= 0 && nMinConstIdx < nMonUModCount && pMonUModBase !== 0
      ? m.u32((pMonUModBase + (nMinConstIdx << 5) + 0x1c) >>> 0) | 0
      : 0
  const nMaxPct =
    nMaxConstIdx >= 0 && nMaxConstIdx < nMonUModCount && pMonUModBase !== 0
      ? m.u32((pMonUModBase + (nMaxConstIdx << 5) + 0x1c) >>> 0) | 0
      : 0

  let nMinVal = Math.trunc(imul32(nBaseDmg, nMinPct) / 100) | 0
  let nMaxVal = Math.trunc(imul32(nBaseDmg, nMaxPct) / 100) | 0

  const elem = nElemType | 0
  if (elem === 0) {
    STATLIST_SetUnitStat113c(
      m,
      pMonster,
      0x30,
      (STATLIST_GetUnitStat113c(m, pMonster, 0x30, 0) + nMinVal) | 0,
      0,
    )
    STATLIST_SetUnitStat113c(
      m,
      pMonster,
      0x31,
      (STATLIST_GetUnitStat113c(m, pMonster, 0x31, 0) + nMaxVal) | 0,
      0,
    )
  } else if (elem === 1) {
    STATLIST_SetUnitStat113c(
      m,
      pMonster,
      0x32,
      (STATLIST_GetUnitStat113c(m, pMonster, 0x32, 0) + nMinVal) | 0,
      0,
    )
    STATLIST_SetUnitStat113c(
      m,
      pMonster,
      0x33,
      (STATLIST_GetUnitStat113c(m, pMonster, 0x33, 0) + nMaxVal) | 0,
      0,
    )
  } else if (elem === 2) {
    STATLIST_SetUnitStat113c(
      m,
      pMonster,
      0x36,
      (STATLIST_GetUnitStat113c(m, pMonster, 0x36, 0) + nMinVal) | 0,
      0,
    )
    STATLIST_SetUnitStat113c(
      m,
      pMonster,
      0x37,
      (STATLIST_GetUnitStat113c(m, pMonster, 0x37, 0) + nMaxVal) | 0,
      0,
    )
    const pList = STATLIST_GetStatListFromUnitAndFlag113c(m, pMonster, 0) >>> 0
    if (pList !== 0) {
      STATLIST_SetStat113c(
        m,
        pList,
        0x38,
        (STATLIST_GetUnitStat113c(m, pMonster, 0x38, 0) + nBaseDmg) | 0,
        0,
      )
    }
  } else if (elem === 3) {
    const nPoisonLen = ((nBaseDmg << 1) + 0x4b) | 0
    nMinVal = Math.trunc((nMinVal << 8) / 100) | 0
    nMaxVal = Math.trunc((nMaxVal << 8) / 100) | 0
    STATLIST_SetUnitStat113c(
      m,
      pMonster,
      0x39,
      (STATLIST_GetUnitStat113c(m, pMonster, 0x39, 0) + nMinVal) | 0,
      0,
    )
    STATLIST_SetUnitStat113c(
      m,
      pMonster,
      0x3a,
      (STATLIST_GetUnitStat113c(m, pMonster, 0x3a, 0) + nMaxVal) | 0,
      0,
    )
    const pList = STATLIST_GetStatListFromUnitAndFlag113c(m, pMonster, 0) >>> 0
    if (pList !== 0) {
      STATLIST_SetStat113c(
        m,
        pList,
        0x3b,
        (STATLIST_GetUnitStat113c(m, pMonster, 0x3b, 0) + nPoisonLen) | 0,
        0,
      )
    }
  } else if (elem === 5) {
    const pList = STATLIST_GetStatListFromUnitAndFlag113c(m, pMonster, 0) >>> 0
    if (pList !== 0) {
      STATLIST_SetStat113c(
        m,
        pList,
        0x38,
        (STATLIST_GetUnitStat113c(m, pMonster, 0x38, 0) + nBaseDmg) | 0,
        0,
      )
    }
  }
}

/**
 * [11/45] Applies Strong UMod (`0x05`) enhanced damage (`stat 0x19`) and attack rating (`stat 0x77`)
 * bonuses from `MonLvl.txt` (`+0x18`) and `MonUMod.txt` constants (`0x0C..0x0F`).
 *
 * @va D2Game:0x6FC42BC0
 */
export function MONUMOD_ApplyStrongToHitAndDamageBonus_6FC42BC0_113c(
  m: D2KernMemory113c,
  pMonster: number,
  _nUModId: number,
  bBoss: number,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return
  const pGame = m.u32((pMonster + 0x80) >>> 0) >>> 0
  const nDiff = m.u8((pGame + 0x6d) >>> 0)
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  const nClassId = m.u32((pMonster + 0x04) >>> 0) | 0
  const pMonStatsTxt =
    nClassId >= 0 && nClassId < (m.u32((pDataTables + 0xa80) >>> 0) | 0)
      ? (m.u32((pDataTables + 0xa78) >>> 0) + imul32(nClassId, 0x1a8)) >>> 0
      : 0

  let nBaseTh = 0
  if (m.u16((pGame + 0x70) >>> 0) !== 0 && (m.u8((pMonStatsTxt + 0x18) >>> 0) & 0x08) === 0) {
    const pMonLvlRec = DATATBLS_GetMonLvlTxtRecord113c(m, sx16(m.u16((pMonStatsTxt + 0xaa + nDiff * 2) >>> 0))) >>> 0
    if (pMonLvlRec !== 0) {
      nBaseTh = m.u32((pMonLvlRec + 0x18 + nDiff * 4) >>> 0) | 0
    }
  } else {
    nBaseTh = sx16(m.u16((pMonStatsTxt + 0xe0 + nDiff * 2) >>> 0))
  }

  let nDmgConstIdx = 0x0e
  let nThConstIdx = 0x0f
  if (bBoss !== 0) {
    nDmgConstIdx = 0x0c
    nThConstIdx = 0x0d
  }

  const nMonUModCount = m.u32((pDataTables + 0xc54) >>> 0) | 0
  const pMonUModBase = m.u32((pDataTables + 0xc50) >>> 0) >>> 0
  const nDmgPct =
    nDmgConstIdx < nMonUModCount && pMonUModBase !== 0
      ? m.u32((pMonUModBase + (nDmgConstIdx << 5) + 0x1c) >>> 0) | 0
      : 0
  const nThPct =
    nThConstIdx < nMonUModCount && pMonUModBase !== 0
      ? m.u32((pMonUModBase + (nThConstIdx << 5) + 0x1c) >>> 0) | 0
      : 0

  let nThBonus = Math.trunc(imul32(nBaseTh, nThPct) / 100) | 0
  let nDmgBonus = nDmgPct
  if (MONSTER_GetBaseIdFromUnit113c(m, pMonster) === 0x76) {
    nThBonus = Math.trunc(nThBonus / 2) | 0
    nDmgBonus = Math.trunc(nDmgBonus / 2) | 0
  }
  STATLIST_AddUnitStatMemPort113c(m, pMonster, 0x19, nDmgBonus, 0)
  STATLIST_AddUnitStatMemPort113c(m, pMonster, 0x77, nThBonus, 0)
}

/**
 * [12/45] Applies Ghostly/Champion UMod (`0x27`) life scaling (`-75%`) and `+300%`
 * damage/attack rating bonus (halved for base class `0x76`).
 *
 * @va D2Game:0x6FC42D00
 */
export function MONUMOD_ApplyGhostlyStats_6FC42D00_113c(
  m: D2KernMemory113c,
  pMonster: number,
  _nUModId = 0,
  _bBoss = 0,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return

  MONUMOD_ScaleMonsterMaxAndCurLife_6FC41EC0_113c(m, pMonster, -0x4b)

  const pGame = m.u32((pMonster + 0x80) >>> 0) >>> 0
  const nDiff = m.u8((pGame + 0x6d) >>> 0)
  const pMonStatsTxt = MONSTATS_GetRecordPtr113c(m, m.u32((pMonster + 0x04) >>> 0) | 0) >>> 0

  let nBaseTh = 0
  if (m.u16((pGame + 0x70) >>> 0) !== 0 && (m.u8((pMonStatsTxt + 0x18) >>> 0) & 0x08) === 0) {
    const pMonLvlRec = DATATBLS_GetMonLvlTxtRecord113c(m, sx16(m.u16((pMonStatsTxt + 0xaa + nDiff * 2) >>> 0))) >>> 0
    if (pMonLvlRec !== 0) {
      nBaseTh = m.u32((pMonLvlRec + 0x18 + nDiff * 4) >>> 0) | 0
    }
  } else {
    nBaseTh = sx16(m.u16((pMonStatsTxt + 0xe0 + nDiff * 2) >>> 0))
  }

  let nThBonus = imul32(nBaseTh, 3)
  let nDmgBonus = 0x96
  if (MONSTER_GetBaseIdFromUnit113c(m, pMonster) === 0x76) {
    nThBonus = Math.trunc(nThBonus / 2) | 0
    nDmgBonus = 0x4b
  }
  STATLIST_AddUnitStatMemPort113c(m, pMonster, 0x19, nDmgBonus, 0)
  STATLIST_AddUnitStatMemPort113c(m, pMonster, 0x77, nThBonus, 0)
}

/**
 * [13/45] Applies Champion/Minion UMod (`0x10`) stat adjustments: decrements monster level by `1`,
 * scales experience by `3/5`, adds damage/tohit bonus from `MonUMod` constants `0x0A`/`0x0B`,
 * and boosts velocity (`stat 0x43`).
 *
 * @va D2Game:0x6FC42DA0
 */
export function MONUMOD_ApplyFanaticOrPossessedStats_6FC42DA0_113c(
  m: D2KernMemory113c,
  pMonster: number,
  _nUModId = 0,
  _bBoss = 0,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return

  const nCurLvl = STATLIST_GetUnitStat113c(m, pMonster, 0x0c, 0) | 0
  STATLIST_SetUnitStat113c(m, pMonster, 0x0c, (nCurLvl - 1) | 0, 0)

  const nCurExp = STATLIST_GetUnitBaseStat113c(m, pMonster, 0x1d, 0) | 0
  STATLIST_SetUnitStat113c(m, pMonster, 0x1d, Math.trunc(imul32(nCurExp, 3) / 5) | 0, 0)

  const pGame = m.u32((pMonster + 0x80) >>> 0) >>> 0
  const nDiff = m.u8((pGame + 0x6d) >>> 0)
  const pMonStatsTxt = MONSTATS_GetRecordPtr113c(m, m.u32((pMonster + 0x04) >>> 0) | 0) >>> 0

  let nBaseTh = 0
  if (m.u16((pGame + 0x70) >>> 0) !== 0 && (m.u8((pMonStatsTxt + 0x18) >>> 0) & 0x08) === 0) {
    const pMonLvlRec = DATATBLS_GetMonLvlTxtRecord113c(m, sx16(m.u16((pMonStatsTxt + 0xaa + nDiff * 2) >>> 0))) >>> 0
    if (pMonLvlRec !== 0) {
      nBaseTh = m.u32((pMonLvlRec + 0x18 + nDiff * 4) >>> 0) | 0
    }
  } else {
    nBaseTh = sx16(m.u16((pMonStatsTxt + 0xe0 + nDiff * 2) >>> 0))
  }

  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  const nMonUModCount = m.u32((pDataTables + 0xc54) >>> 0) | 0
  const pMonUModBase = m.u32((pDataTables + 0xc50) >>> 0) >>> 0

  const nDmgPct =
    nMonUModCount > 0x0a && pMonUModBase !== 0
      ? m.u32((pMonUModBase + (0x0a << 5) + 0x1c) >>> 0) | 0
      : 0
  const nThPct =
    nMonUModCount > 0x0b && pMonUModBase !== 0
      ? m.u32((pMonUModBase + (0x0b << 5) + 0x1c) >>> 0) | 0
      : 0

  let nThBonus = Math.trunc(imul32(nBaseTh, nThPct) / 100) | 0
  let nDmgBonus = nDmgPct
  if (MONSTER_GetBaseIdFromUnit113c(m, pMonster) === 0x76) {
    nThBonus = Math.trunc(nThBonus / 2) | 0
    nDmgBonus = Math.trunc(nDmgBonus / 2) | 0
  }
  STATLIST_AddUnitStatMemPort113c(m, pMonster, 0x19, nDmgBonus, 0)
  STATLIST_AddUnitStatMemPort113c(m, pMonster, 0x77, nThBonus, 0)

  const nClassId = m.u32((pMonster + 0x04) >>> 0) | 0
  if (nClassId >= 0 && nClassId < (m.u32((pDataTables + 0xa80) >>> 0) | 0)) {
    const pRec = (m.u32((pDataTables + 0xa78) >>> 0) + imul32(nClassId, 0x1a8)) >>> 0
    if (pRec !== 0) {
      const wWalkSpeed = sx16(m.u16((pRec + 0x2c) >>> 0))
      if (wWalkSpeed > 0) {
        const wRunSpeed = sx16(m.u16((pRec + 0x2e) >>> 0))
        const nVelPct = (Math.trunc((wRunSpeed << 7) / wWalkSpeed) - 0x60) | 0
        STATLIST_SetUnitStat113c(m, pMonster, 0x43, nVelPct, 0)
      }
    }
  }
  STATLIST_AddUnitStatMemPort113c(m, pMonster, 0x43, 0x14, 0)
}

/**
 * [14/45] Scales monster max and current life using `MONUMOD_GetConstantValue113c`,
 * and sets `stat 0x4A` (`hpregen`) to `0x28` for non-minion boss monsters.
 *
 * @va D2Game:0x6FC42FA0
 */
export function MONUMOD_ApplyExtraHealthBonus_6FC42FA0_113c(
  m: D2KernMemory113c,
  pMonster: number,
  _nUModId: number,
  bBoss: number,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return

  const pMonData = m.u32((pMonster + 0x14) >>> 0) >>> 0
  let nConstIdx: number
  if (bBoss === 0) {
    nConstIdx = ((m.u8((pMonData + 0x16) >>> 0) & 0x02) !== 0 ? -1 : 0) + 2
  } else {
    nConstIdx = 0
  }
  const nPct = MONUMOD_GetConstantValue113c(m, nConstIdx) | 0
  MONUMOD_ScaleMonsterMaxAndCurLife_6FC41EC0_113c(m, pMonster, nPct)
  if (MONSTER_CheckTypeFlagsMask113c(m, pMonster, 2) === 0) {
    STATLIST_SetUnitStat113c(m, pMonster, 0x4a, 0x28, 0)
  }
}

/**
 * [15/45] Checks whether `pMonster` is eligible for `nUModId` according to `MonUMod.txt`
 * exclusions, game expansion/difficulty, and monster flags/modes.
 *
 * @va D2Game:0x6FC43100
 */
export function MONUMOD_CheckModEligibility_6FC43100_113c(
  m: D2KernMemory113c,
  pMonster: number,
  pGame: number,
  nUModId: number,
  bCheckRandomPick: number,
): number {
  const idx = nUModId | 0
  if (idx <= 0) return 0
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if (idx >= (m.u32((pDataTables + 0xc54) >>> 0) | 0)) return 0
  const pMonUModBase = m.u32((pDataTables + 0xc50) >>> 0) >>> 0
  const pRec = (pMonUModBase + (idx << 5)) >>> 0
  if (pRec === 0) return 0

  if (m.u16((pRec + 0x08) >>> 0) === 0) return 0
  if (m.u16((pGame + 0x70) >>> 0) === 0 && m.u16((pRec + 0x04) >>> 0) >= 0x64) {
    return 0
  }
  if (bCheckRandomPick !== 0) {
    if (m.u16((pRec + 0x16) >>> 0) === 0) return 0
    let nMlvl = 0
    if (pMonster !== 0) {
      const nClassId = m.u32((pMonster + 0x04) >>> 0) | 0
      if (nClassId >= 0 && nClassId < (m.u32((pDataTables + 0xa80) >>> 0) | 0)) {
        const pMonStats = (m.u32((pDataTables + 0xa78) >>> 0) + imul32(nClassId, 0x1a8)) >>> 0
        if (pMonStats !== 0) {
          const nDiff = m.u8((pGame + 0x6d) >>> 0)
          nMlvl = sx16(m.u16((pMonStats + 0xaa + nDiff * 2) >>> 0))
        }
      }
    }
    if (nMlvl < (m.u8((pRec + 0x0a) >>> 0) & 0xff)) return 0
  }

  if (
    MONSTER_TestUnitMonTypeFlag_6FC22790_113c(m, pMonster, sx16(m.u16((pRec + 0x12) >>> 0))) !== 0 ||
    MONSTER_TestUnitMonTypeFlag_6FC22790_113c(m, pMonster, sx16(m.u16((pRec + 0x14) >>> 0))) !== 0
  ) {
    return 0
  }

  const nFPick = m.u16((pRec + 0x1a) >>> 0)
  if (nFPick === 1) {
    if (pMonster === 0) return 0
    return MONSTATS2_CheckModeBit113c(m, m.u32((pMonster + 0x04) >>> 0) | 0, 4)
  }
  if (nFPick === 2) {
    if (pMonster === 0) return 0
    if (MONSTATS_CheckFlagBit113c(m, m.u32((pMonster + 0x04) >>> 0) | 0, 0x16) === 0) {
      return 1
    }
    return 0
  }
  return 1
}

/**
 * [16/45] Handles the periodic self-revive / corpse check timer event (`event 7`)
 * for Reanimated Horde / self-resurrecting monsters (casting skill `0x125`).
 *
 * @va D2Game:0x6FC43E20
 */
export function MONUMOD_EventReviveOrCorpseCheck_6FC43E20_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  hooks?: K2W3B2Hooks113c,
): number {
  if (pUnit !== 0) {
    let pPrevPtr = (pUnit + 0xdc) >>> 0
    let pNode = m.u32(pPrevPtr) >>> 0
    while (pNode !== 0) {
      if ((m.u8(pNode) & 0xff) === 7 && m.u32((pNode + 0x14) >>> 0) === 0 && m.u32((pNode + 0x18) >>> 0) === 0) {
        const pNext = m.u32((pNode + 0x20) >>> 0) >>> 0
        m.setU32(pPrevPtr, pNext)
        EVENT_FreeNode113c(m, pGame, pNode)
        pNode = pNext
      } else {
        pPrevPtr = (pNode + 0x20) >>> 0
        pNode = m.u32(pPrevPtr) >>> 0
      }
    }
  }

  let bSkipRevive = false
  if (pUnit === 0 || (m.u32(pUnit >>> 0) >>> 0) !== 1) {
    bSkipRevive = true
  } else {
    const nMode = m.u32((pUnit + 0x10) >>> 0) | 0
    if (nMode !== 0 && nMode !== 0x0c) {
      bSkipRevive = true
    } else if (STATES_CheckStateMask33OnUnit113c(m, pUnit) !== 0) {
      bSkipRevive = true
    } else if (UNIT_GetAlignment113c(m, pUnit) === 2) {
      return 1
    }
  }

  if (!bSkipRevive) {
    let bCastDone = false
    const pRoom = UNITS_GetRoom113c(m, pUnit) >>> 0
    if (pRoom !== 0) {
      const nY = UNIT_GetPosY113c(m, pUnit) | 0
      const nX = UNIT_GetPosX113c(m, pUnit) | 0
      const wCol = COLLISION_GetMaskWithPattern2_113c(m, pRoom, nX, nY, 1, 0x80) & 0xffff
      if (wCol !== 0) {
        for (let pOther = m.u32((pRoom + 0x74) >>> 0) >>> 0; pOther !== 0; pOther = m.u32((pOther + 0xe8) >>> 0) >>> 0) {
          if (pOther !== pUnit && (m.u32(pOther) >>> 0) === 1) {
            const nOtherMode = m.u32((pOther + 0x10) >>> 0) | 0
            if (nOtherMode !== 0 && nOtherMode !== 0x0c) {
              const nDX = ((nX - (UNIT_GetPosX113c(m, pOther) | 0)) | 0) < 0
                ? -((nX - (UNIT_GetPosX113c(m, pOther) | 0)) | 0)
                : ((nX - (UNIT_GetPosX113c(m, pOther) | 0)) | 0)
              const nDY = ((nY - (UNIT_GetPosY113c(m, pOther) | 0)) | 0) < 0
                ? -((nY - (UNIT_GetPosY113c(m, pOther) | 0)) | 0)
                : ((nY - (UNIT_GetPosY113c(m, pOther) | 0)) | 0)
              if (nDX < 2 && nDY < 2) {
                AI_CastSkillWithMode113c(
                  m,
                  0x0b,
                  pUnit,
                  pGame,
                  0x125,
                  pUnit,
                  0,
                  0,
                  undefined,
                  hooks !== undefined ? hooks.aiFallen : undefined,
                )
                bCastDone = true
                break
              }
            }
          }
        }
      }
      if (!bCastDone && SKILLS_IsSelectableCorpseWithVelocity113c(m, pUnit, 0) !== 0) {
        AI_CastSkillWithMode113c(
          m,
          4,
          pUnit,
          pGame,
          0x125,
          pUnit,
          0,
          0,
          undefined,
          hooks !== undefined ? hooks.aiFallen : undefined,
        )
        return 1
      }
    }
  }

  let nDelay = 0x12c
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if ((m.u32((pDataTables + 0xc54) >>> 0) | 0) > 0x22) {
    const pMonUModBase = m.u32((pDataTables + 0xc50) >>> 0) >>> 0
    if (pMonUModBase !== 0) {
      const nConst = m.u32((pMonUModBase + (0x22 << 5) + 0x1c) >>> 0) | 0
      if (nConst > 0) nDelay = nConst
    }
  }
  const nNextFrame = ((m.u32((pGame + 0xa8) >>> 0) | 0) + nDelay) >>> 0
  EVENT_SetEventFull113c(m, pGame, pUnit, 7, nNextFrame, 0, 0, 0)
  return 1
}

/**
 * [17/45] Applies Cursed UMod Amplify Damage (`skill 0x42`) state/statlist to `pTarget`
 * when `pAttacker` and `pTarget` are hostile (`SUNIT_AreUnitsHostileOrUnaligned113c`).
 *
 * @va D2Game:0x6FC44030
 */
export function MONUMOD_ApplyCursedAmplifyDamage_6FC44030_113c(
  m: D2KernMemory113c,
  pGame: number,
  pAttacker: number,
  pTarget: number,
): void {
  if (pAttacker === 0 || pTarget === 0) return
  if (SUNIT_AreUnitsHostileOrUnaligned113c(m, pAttacker, pTarget, pGame) === 0) return

  const nRoll = (stepSeed64InMem113c(m, (pAttacker + 0x20) >>> 0) % 100) | 0
  if (nRoll >= 0x32) return

  let nSkillLvl = Math.trunc((STATLIST_GetUnitStat113c(m, pAttacker, 0x0c, 0) | 0) / 5) | 0
  if (nSkillLvl <= 1) nSkillLvl = 1

  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if ((m.u32((pDataTables + 0xbac) >>> 0) | 0) <= 0x42) return
  const pSkillsBase = m.u32((pDataTables + 0xba8) >>> 0) >>> 0
  const pSkillsTxt = (pSkillsBase + imul32(0x42, 0x23c)) >>> 0
  if (pSkillsTxt === 0) return

  const nAuraState = sx16(m.u16((pSkillsTxt + 0x10) >>> 0))
  const nStatesCount = m.u32((pDataTables + 0xbc8) >>> 0) | 0
  if (nAuraState < 0 || nAuraState >= nStatesCount) return

  const nLenCalc = m.u32((pSkillsTxt + 0x70) >>> 0) | 0
  let nDuration = 0
  if (nLenCalc !== -1) {
    nDuration = SKILLS_EvalCalcByOffset113c(m, pAttacker, nLenCalc, 0x42, nSkillLvl) | 0
  }

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x40) >>> 0
  try {
    m.fill(sp, 0x40, 0)
    m.setU32((sp + 0x04) >>> 0, pAttacker >>> 0)
    m.setU32((sp + 0x08) >>> 0, pTarget >>> 0)
    m.setU32((sp + 0x0c) >>> 0, 0x42)
    m.setU32((sp + 0x10) >>> 0, nSkillLvl >>> 0)
    m.setU32((sp + 0x14) >>> 0, nDuration >>> 0)
    m.setU32((sp + 0x18) >>> 0, nAuraState >>> 0)
    m.setU32((sp + 0x1c) >>> 0, 0x2d)
    m.setU32((sp + 0x20) >>> 0, 0x6fcbf870)

    const pStatList = STATES_CreateOrUpdateAuraStatList113c(m, sp) >>> 0
    if (pStatList !== 0) {
      let nStatVal = 0
      const nStatCalc = m.u32((pSkillsTxt + 0x80) >>> 0) | 0
      if (nStatCalc !== -1) {
        nStatVal = SKILLS_EvalCalcByOffset113c(m, pAttacker, nStatCalc, 0x42, nSkillLvl) | 0
      }
      STATLIST_SetStat113c(m, pStatList, sx16(m.u16((pSkillsTxt + 0x74) >>> 0)), nStatVal, 0)
    }
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [18/45] Spawns a boss monster's minion pack (`MONSTER_SpawnPackMember113c` /
 * `MONSTER_SpawnPartyMinionInRing113c`), copies minion-eligible UMods, and links each minion
 * to the boss leader.
 *
 * @va D2Game:0x6FC445A0
 */
export function MONUMOD_SpawnBossMinionPack_6FC445A0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  pCoordNode: number,
  pBoss: number,
  hooks?: K2W3B2Hooks113c,
): void {
  if (pBoss === 0) return
  if ((m.u32(pBoss >>> 0) >>> 0) !== 1) return

  const nMinionClassId = MONUMOD_GetMinionClassIdForBoss113c(m, pBoss) | 0
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if (nMinionClassId < 0 || nMinionClassId >= (m.u32((pDataTables + 0xa80) >>> 0) | 0)) return
  const pMonStatsTxt = (m.u32((pDataTables + 0xa78) >>> 0) + imul32(nMinionClassId, 0x1a8)) >>> 0
  if (pMonStatsTxt === 0) return
  if ((m.u8((pMonStatsTxt + 0x18) >>> 0) & 0x04) !== 0) return

  const nDiff = m.u8((pGame + 0x6d) >>> 0)
  const wPartyMin = sx16(m.u16((pMonStatsTxt + 0x22) >>> 0))
  const wPartyMax = sx16(m.u16((pMonStatsTxt + 0x24) >>> 0))
  if (wPartyMax <= 0) return

  const nRollRange = ((wPartyMax - wPartyMin) + 1) | 0
  const nRoll = SEED_RollLimitedFast113c(m, (pRoom + 0x6c) >>> 0, nRollRange) | 0
  const nTotalMinions = (wPartyMin + nDiff + nRoll) | 0
  if (nTotalMinions <= 0) return

  for (let i = 0; i < nTotalMinions; i++) {
    let pMinion = 0
    if (pCoordNode !== 0) {
      pMinion = MONSTER_SpawnPackMember113c(
        m,
        nMinionClassId,
        pBoss,
        1,
        pGame,
        pCoordNode,
        4,
        0x22,
        hooks !== undefined ? hooks.regpop : undefined,
      ) >>> 0
    } else {
      pMinion = MONSTER_SpawnPartyMinionInRing113c(
        m,
        nMinionClassId,
        pBoss,
        1,
        pGame,
        4,
        0x22,
        hooks !== undefined ? hooks.regpop : undefined,
      ) >>> 0
    }
    if (pMinion !== 0) {
      MONUMOD_CopyMinionEligibleUMods113c(m, pBoss, pMinion, 0)
      AIGENERAL_LinkMinionToLeader113c(m, pBoss, pMinion, pGame)
    }
  }
}

function invokeMonUModCallback113c(
  m: Memory113c,
  pfn: number,
  pMonster: number,
  nUModId: number,
  bBoss: number,
  hooks?: K2W3B2Hooks113c,
): void {
  if (pfn === 0) return
  if (pfn === 0x6fc43020) {
    MONUMOD_RollBossOrMinionNameSeed113c(m, pMonster, nUModId, bBoss)
  } else if (pfn === 0x6fc42fa0) {
    MONUMOD_ApplyExtraHealthBonus_6FC42FA0_113c(m, pMonster, nUModId, bBoss)
  } else if (pfn === 0x6fc41e80) {
    MONUMOD_ApplyBossLevelAndExpBonus_6FC41E80_113c(m, pMonster, nUModId, bBoss)
  } else if (pfn === 0x6fc42bc0) {
    MONUMOD_ApplyStrongToHitAndDamageBonus_6FC42BC0_113c(m, pMonster, nUModId, bBoss)
  } else if (pfn === 0x6fc42880) {
    MONUMOD_ApplyExtraFastVelocity_6FC42880_113c(m, pMonster, nUModId, bBoss)
  } else if (pfn === 0x6fc41be0) {
    MONUMOD_ApplyResistanceBonus_6FC41BE0_113c(m, pMonster, nUModId, bBoss)
  } else if (pfn === 0x6fc42da0) {
    MONUMOD_ApplyFanaticOrPossessedStats_6FC42DA0_113c(m, pMonster, nUModId, bBoss)
  } else if (pfn === 0x6fc42d00) {
    MONUMOD_ApplyGhostlyStats_6FC42D00_113c(m, pMonster, nUModId, bBoss)
  } else if (pfn === 0x6fc469f0) {
    MONUMOD_InitUMod41ScheduleEvent7_6FC469F0_113c(m, pMonster, bBoss)
  } else if (hooks !== undefined && hooks.onMonUMod !== undefined) {
    hooks.onMonUMod(m, pfn, pMonster, nUModId, bBoss)
  }
}

function getMonUModFnFromTable113c(m: Memory113c, nIdx: number): number {
  const idx = nIdx | 0
  if (idx < 0 || idx >= 43) return 0
  const inMem = m.u32((D2GAME_MONUMOD_TABLE_VA_113C + idx * 4) >>> 0) >>> 0
  if (inMem !== 0) return inMem
  return DEFAULT_MONUMOD_TABLE_6FD2E550[idx]! >>> 0
}

/**
 * [19/45] Spawns a unique/superunique boss monster via `MONSTER_Create113c` or
 * `MONSTER_SpawnAtCoords_6FD0F450_113c` and invokes its base (`1..4`) and UMod (`0..8`)
 * initialization callbacks in `0x6FD2E550`.
 *
 * @va D2Game:0x6FC446D0
 */
export function MONUMOD_SpawnSuperUniqueOrBoss_6FC446D0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  pCoordNode: number,
  nX: number,
  nY: number,
  nMaxRadius: number,
  nClassId: number,
  wFlags: number,
  pUModBytes: number,
  wSuperUniqueId: number,
  hooks?: K2W3B2Hooks113c,
): number {
  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x50) >>> 0
  let pBoss = 0
  try {
    m.fill(sp, 0x50, 0)
    if (pCoordNode === 0) {
      if ((wFlags & 0x02) !== 0) {
        m.setU32((sp + 0x08) >>> 0, pGame >>> 0)
        m.setU32((sp + 0x0c) >>> 0, pRoom >>> 0)
        m.setU32((sp + 0x10) >>> 0, 0)
        m.setU32((sp + 0x14) >>> 0, nClassId >>> 0)
        m.setU32((sp + 0x18) >>> 0, 1)
        m.setU32((sp + 0x1c) >>> 0, 0x2a)
        m.setU32((sp + 0x20) >>> 0, nX >>> 0)
        m.setU32((sp + 0x24) >>> 0, nY >>> 0)
        m.setU32((sp + 0x28) >>> 0, nMaxRadius >>> 0)
        m.setU16((sp + 0x2c) >>> 0, wFlags & 0xffff)
        for (let i = 0; i < 9; i++) {
          m.setU8((sp + 0x30 + i) >>> 0, m.u8((pUModBytes + i) >>> 0))
        }
        pBoss = MONSTER_Create113c(
          m,
          (sp + 0x08) >>> 0,
          hooks !== undefined ? hooks.regpop : undefined,
        ) >>> 0
      } else {
        pBoss = MONSTER_SpawnAtCoords_6FD0F450_113c(
          m,
          0x2a,
          nClassId,
          1,
          pGame,
          pRoom,
          nX,
          nY,
          nMaxRadius,
          wFlags,
          hooks !== undefined ? hooks.regpop : undefined,
        ) >>> 0
      }
    } else {
      const pOutY = sp
      const pOutX = (sp + 0x04) >>> 0
      const bFound = REGPOP_FindPackSpawnCoords113c(
        m,
        pRoom,
        pGame,
        pCoordNode,
        nClassId,
        pOutX,
        pOutY,
        1,
        hooks !== undefined ? hooks.regpop : undefined,
      )
      if (bFound === 0) return 0
      pBoss = MONSTER_SpawnAtCoords_6FD0F450_113c(
        m,
        0x2a,
        nClassId,
        1,
        pGame,
        pRoom,
        m.u32(pOutX) | 0,
        m.u32(pOutY) | 0,
        1,
        wFlags,
        hooks !== undefined ? hooks.regpop : undefined,
      ) >>> 0
    }
  } finally {
    w3b2ScratchSp = sp
  }

  if (pBoss === 0) return 0

  let pMonData = 0
  if ((m.u32(pBoss) >>> 0) === 1) {
    pMonData = m.u32((pBoss + 0x14) >>> 0) >>> 0
    if (pMonData !== 0) {
      m.setU8((pMonData + 0x16) >>> 0, (m.u8((pMonData + 0x16) >>> 0) | 0x08) & 0xff)
    }
  }
  const wNextBossCnt = (m.u16((pGame + 0x10f6) >>> 0) + 1) & 0xffff
  m.setU16((pGame + 0x10f6) >>> 0, wNextBossCnt)

  if ((m.u32(pBoss) >>> 0) === 1) {
    pMonData = m.u32((pBoss + 0x14) >>> 0) >>> 0
    if (pMonData !== 0) {
      m.setU16((pMonData + 0x26) >>> 0, wSuperUniqueId & 0xffff)
    }
  }

  for (let i = 0; i < 9; i++) {
    m.setU8((pMonData + 0x1c + i) >>> 0, m.u8((pUModBytes + i) >>> 0))
  }

  for (let baseIdx = 1; baseIdx <= 4; baseIdx++) {
    const pfn = getMonUModFnFromTable113c(m, baseIdx)
    if (pfn !== 0) {
      invokeMonUModCallback113c(m, pfn, pBoss, baseIdx, 1, hooks)
    }
  }

  for (let i = 0; i < 9; i++) {
    const nModId = m.u8((pMonData + 0x1c + i) >>> 0)
    if (nModId === 0) break
    const pfn = getMonUModFnFromTable113c(m, nModId)
    if (pfn !== 0) {
      invokeMonUModCallback113c(m, pfn, pBoss, nModId, 1, hooks)
    }
  }

  return pBoss
}

/**
 * [20/45] Spawns 8 Charged Bolt projectiles (`0x141`, 4 cardinal directions * 2 bolts)
 * when a Lightning Enchanted monster is hit.
 *
 * @va D2Game:0x6FC45CC0
 */
export function MONUMOD_SpawnLightningEnchantedBolts_6FC45CC0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pMonster: number,
  hooks?: K2W3B2Hooks113c,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return

  const nX = getUnitPosXInline113c(m, pMonster)
  const nY = getUnitPosYInline113c(m, pMonster)
  if (nX === 0 || nY === 0) return

  let nSkillLvl = Math.trunc((STATLIST_GetUnitStat113c(m, pMonster, 0x0c, 0) | 0) / 2) | 0
  if (nSkillLvl <= 1) nSkillLvl = 1

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x68) >>> 0
  try {
    let nSeedOff = 0
    for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
      const dx = BOLT_DIR_DX_6FD1CE3C[dirIdx]!
      const dy = BOLT_DIR_DY_6FD1CE4C[dirIdx]!
      for (let bolt = 0; bolt < 2; bolt++) {
        m.fill(sp, 0x60, 0)
        m.setU32((sp + 0x00) >>> 0, 0x21)
        m.setU32((sp + 0x04) >>> 0, pMonster >>> 0)
        m.setU32((sp + 0x10) >>> 0, 0x141)
        m.setU32((sp + 0x14) >>> 0, nX >>> 0)
        m.setU32((sp + 0x18) >>> 0, nY >>> 0)
        m.setU32((sp + 0x1c) >>> 0, (nX + dx) >>> 0)
        m.setU32((sp + 0x20) >>> 0, (nY + dy) >>> 0)
        m.setU32((sp + 0x30) >>> 0, nSkillLvl >>> 0)
        m.setU32((sp + 0x54) >>> 0, 0x6fc61f50)
        m.setU32((sp + 0x58) >>> 0, bolt >>> 0)
        const pMissile = MISSILE_CreateServerProjectile113c(
          m,
          pGame,
          sp,
          hooks !== undefined ? hooks.meleeDot : undefined,
        ) >>> 0
        if (pMissile !== 0) {
          MISSILES_InitChargedBoltPath_6FC61F50_113c(m, pMissile, bolt)
        }
        nSeedOff = (nSeedOff + 1) | 0
      }
    }
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [21/45] Spawns 8 missile projectiles (`0xE1`, 4 cardinal directions * 2 bolts)
 * around `pMonster`.
 *
 * @va D2Game:0x6FC460D0
 */
export function MONUMOD_SpawnFireEnchantedBolts_6FC460D0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pMonster: number,
  hooks?: K2W3B2Hooks113c,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return

  let nSkillLvl = Math.trunc((STATLIST_GetUnitStat113c(m, pMonster, 0x0c, 0) | 0) / 4) | 0
  if (nSkillLvl <= 1) nSkillLvl = 1

  const nX = getUnitPosXInline113c(m, pMonster)
  const nY = getUnitPosYInline113c(m, pMonster)

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x68) >>> 0
  try {
    let nSeedOff = 0
    for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
      const dx = BOLT_DIR_DX_6FD1CE3C[dirIdx]!
      const dy = BOLT_DIR_DY_6FD1CE4C[dirIdx]!
      for (let bolt = 0; bolt < 2; bolt++) {
        m.fill(sp, 0x60, 0)
        m.setU32((sp + 0x00) >>> 0, 0x21)
        m.setU32((sp + 0x04) >>> 0, pMonster >>> 0)
        m.setU32((sp + 0x10) >>> 0, 0xe1)
        m.setU32((sp + 0x14) >>> 0, nX >>> 0)
        m.setU32((sp + 0x18) >>> 0, nY >>> 0)
        m.setU32((sp + 0x1c) >>> 0, (nX + dx) >>> 0)
        m.setU32((sp + 0x20) >>> 0, (nY + dy) >>> 0)
        m.setU32((sp + 0x30) >>> 0, nSkillLvl >>> 0)
        m.setU32((sp + 0x54) >>> 0, 0x6fc61f50)
        m.setU32((sp + 0x58) >>> 0, bolt >>> 0)
        const pMissile = MISSILE_CreateServerProjectile113c(
          m,
          pGame,
          sp,
          hooks !== undefined ? hooks.meleeDot : undefined,
        ) >>> 0
        if (pMissile !== 0) {
          MISSILES_InitChargedBoltPath_6FC61F50_113c(m, pMissile, bolt)
        }
        nSeedOff = (nSeedOff + 1) | 0
      }
    }
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [22/45] Spawns a 64-direction Frost Nova (`0xC2`) on Cold Enchanted monster trigger.
 *
 * @va D2Game:0x6FC462D0
 */
export function MONUMOD_SpawnColdEnchantedFrostNova_6FC462D0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pMonster: number,
  hooks?: K2W3B2Hooks113c,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return

  let nSkillLvl = Math.trunc((STATLIST_GetUnitStat113c(m, pMonster, 0x0c, 0) | 0) / 2) | 0
  if (nSkillLvl <= 1) nSkillLvl = 1

  const nVelOverride = DATATBLS_CalcMissileSubLoopFrames113c(m, 0x77, 0) | 0
  MISSILE_SpawnNova64Directions113c(
    m,
    pMonster,
    nVelOverride,
    pGame,
    pMonster,
    0xc2,
    0x2c,
    nSkillLvl,
    hooks !== undefined ? hooks.meleeDot : undefined,
  )
}

/**
 * [23/45] Spawns 8 Scarab Charged Bolt projectiles (`0xC3`) with a 10-frame cooldown
 * stored in `pMonster->pMonsterData->dwLastScarabBoltFrame` (`+0x18`).
 *
 * @va D2Game:0x6FC46320
 */
export function MONUMOD_SpawnScarabChargedBolts_6FC46320_113c(
  m: D2KernMemory113c,
  pGame: number,
  pMonster: number,
  hooks?: K2W3B2Hooks113c,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return
  if (pGame === 0) return

  const pMonData = m.u32((pMonster + 0x14) >>> 0) >>> 0
  const dwNextAllowed = m.u32((pMonData + 0x18) >>> 0) >>> 0
  const dwCurFrame = m.u32((pGame + 0xa8) >>> 0) >>> 0
  if (dwNextAllowed > dwCurFrame) return

  const nX = getUnitPosXInline113c(m, pMonster)
  const nY = getUnitPosYInline113c(m, pMonster)
  if (nX === 0 || nY === 0) return

  m.setU32((pMonData + 0x18) >>> 0, (dwCurFrame + 0x0a) >>> 0)

  let nSkillLvl = Math.trunc((STATLIST_GetUnitStat113c(m, pMonster, 0x0c, 0) | 0) / 3) | 0
  if (nSkillLvl <= 1) nSkillLvl = 1

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x68) >>> 0
  try {
    let nSeedOff = 0
    for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
      const dx = BOLT_DIR_DX_6FD1CE3C[dirIdx]!
      const dy = BOLT_DIR_DY_6FD1CE4C[dirIdx]!
      for (let bolt = 0; bolt < 2; bolt++) {
        m.fill(sp, 0x60, 0)
        m.setU32((sp + 0x00) >>> 0, 0x21)
        m.setU32((sp + 0x04) >>> 0, pMonster >>> 0)
        m.setU32((sp + 0x10) >>> 0, 0xc3)
        m.setU32((sp + 0x14) >>> 0, nX >>> 0)
        m.setU32((sp + 0x18) >>> 0, nY >>> 0)
        m.setU32((sp + 0x1c) >>> 0, (nX + dx) >>> 0)
        m.setU32((sp + 0x20) >>> 0, (nY + dy) >>> 0)
        m.setU32((sp + 0x30) >>> 0, nSkillLvl >>> 0)
        m.setU32((sp + 0x54) >>> 0, 0x6fc61f50)
        m.setU32((sp + 0x58) >>> 0, bolt >>> 0)
        const pMissile = MISSILE_CreateServerProjectile113c(
          m,
          pGame,
          sp,
          hooks !== undefined ? hooks.meleeDot : undefined,
        ) >>> 0
        if (pMissile !== 0) {
          MISSILES_InitChargedBoltPath_6FC61F50_113c(m, pMissile, bolt)
        }
        nSeedOff = (nSeedOff + 1) | 0
      }
    }
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [24/45] Spawns a 64-direction Nova (`0x5A`, skill `0x30`) for `pMonster` using its
 * pack leader's skill `0x10C` level when life percentage is `<= 25%` (`nMode == 0`) or on death.
 *
 * @va D2Game:0x6FC46520
 */
export function MONUMOD_SpawnDeathNova_6FC46520_113c(
  m: D2KernMemory113c,
  pGame: number,
  pMonster: number,
  _pTarget: number,
  _nUModId: number,
  nMode: number,
  hooks?: K2W3B2Hooks113c,
): void {
  if (pMonster === 0) return
  if ((m.u32(pMonster >>> 0) >>> 0) !== 1) return

  let pAiGen = 0
  const pMonData = m.u32((pMonster + 0x14) >>> 0) >>> 0
  if (pMonData !== 0) {
    pAiGen = m.u32((pMonData + 0x28) >>> 0) >>> 0
  }
  const pLeader = SUNIT_GetServerUnit113c(
    m,
    pGame,
    m.u32((pAiGen + 0x1c) >>> 0) | 0,
    m.u32((pAiGen + 0x20) >>> 0) | 0,
  ) >>> 0
  if (pLeader === 0) return

  const pSkill = SKILLS_GetHighestLevelSkillFromUnitAndIdFastcall113c(m, pLeader, 0x10c) >>> 0
  if (pSkill === 0) return

  const nSkillLvl = SKILLS_EvaluateSkillLevel113c(m, pLeader, pSkill, 1) | 0
  if (nSkillLvl <= 0) return

  if (nMode === 0 && (STATLIST_GetUnitLifePercent113c(m, pMonster) | 0) > 0x19) {
    return
  }

  const nVelOverride = DATATBLS_CalcMissileSubLoopFrames113c(m, 0x5a, 0) | 0
  MISSILE_SpawnNova64Directions113c(
    m,
    pMonster,
    nVelOverride,
    pGame,
    pMonster,
    0x5a,
    0x30,
    nSkillLvl,
    hooks !== undefined ? hooks.meleeDot : undefined,
  )
}

/**
 * [25/45] Configures a Charge/Leap dynamic path (`type 9`, collision masks `0x1801` / `0x1C01`)
 * and computes the path via `PATH_Compute113c`.
 *
 * @va D2Game:0x6FC46A80
 */
export function SKILLS_SetupChargeOrLeapPath_6FC46A80_113c(
  m: D2KernMemory113c,
  pUnit: number,
  pSkill: number,
  nVelocityBonusPct: number,
): number {
  const pPath = m.u32((pUnit + 0x2c) >>> 0) >>> 0
  if (pPath === 0) return 0

  PATH_SetCollisionMask113c(m, pPath, 0x1801)
  PATH_SetMoveTestCollisionMask113c(m, pPath, 0x1c01)
  SKILLS_SetParam0C113c(m, pSkill, 1)

  const nTargetY = SKILLS_GetParam2113c(m, pSkill) | 0
  const nTargetX = SKILLS_GetParam1113c(m, pSkill) | 0
  PATH_SetTargetPos113c(m, pPath, nTargetX, nTargetY)

  const uType = m.u32(pUnit >>> 0) | 0
  let nBaseRunVel = 0
  if (uType === 0) {
    const pCharRec = CHARSTATS_GetRecordPtrFast_6FC210A0_113c(m, m.u32((pUnit + 0x04) >>> 0) | 0) >>> 0
    if (pCharRec !== 0) {
      nBaseRunVel = m.u8((pCharRec + 0x41) >>> 0) << 8
    }
  } else if (uType === 1) {
    const pMonRec = MONSTATS_GetRecordPtr113c(m, m.u32((pUnit + 0x04) >>> 0) | 0) >>> 0
    if (pMonRec !== 0) {
      nBaseRunVel = sx16(m.u16((pMonRec + 0x2e) >>> 0)) << 8
    }
  }

  PATH_SetType113c(m, pPath, 9)
  const nFinalVel = (nBaseRunVel + Math.trunc(imul32(nBaseRunVel, nVelocityBonusPct | 0) / 100)) | 0
  PATH_SetVelocity113c(m, pPath, nFinalVel)
  return PATH_Compute113c(m, pPath, pUnit, 0) | 0
}

/**
 * [26/45] Clamps target coordinates `(pInOutX, pInOutY)` to skill range (`SkillsTxt + 0x1C0`)
 * and finds a collision-free position with Line-of-Sight from `pUnit`.
 *
 * @va D2Game:0x6FC46BB0
 */
export function SKILLS_ClampTargetAndFindFreeLosPos_6FC46BB0_113c(
  m: D2KernMemory113c,
  pUnit: number,
  nSkillId: number,
  nSkillLevel: number,
  pInOutX: number,
  pInOutY: number,
  pOutRoom: number,
): number {
  const nSkillIdx = nSkillId | 0
  if (nSkillIdx < 0) return 0
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if (nSkillIdx >= (m.u32((pDataTables + 0xbac) >>> 0) | 0)) return 0
  const pSkillsBase = m.u32((pDataTables + 0xba8) >>> 0) >>> 0
  const pSkillsTxt = (pSkillsBase + imul32(nSkillIdx, 0x23c)) >>> 0
  if (pSkillsTxt === 0) return 0

  m.setU32(pOutRoom >>> 0, 0)
  const nOriginX = getUnitPosXInline113c(m, pUnit)
  const nOriginY = getUnitPosYInline113c(m, pUnit)
  const pOriginRoom = UNITS_GetRoom113c(m, pUnit) >>> 0

  let nMaxDist = 0
  const nCalc = m.u32((pSkillsTxt + 0x1c0) >>> 0) | 0
  if (nCalc !== -1) {
    nMaxDist = SKILLS_EvalCalcByOffset113c(m, pUnit, nCalc, nSkillIdx, nSkillLevel | 0) | 0
  }

  let nTargetX = m.u32(pInOutX >>> 0) | 0
  let nTargetY = m.u32(pInOutY >>> 0) | 0
  let nDist = UNITS_GetUnitDistanceToCoordinates113c(m, pUnit, nTargetX, nTargetY) | 0

  if (nDist === 0) {
    nTargetX = (nOriginX + 1) | 0
    m.setU32(pInOutX >>> 0, nTargetX >>> 0)
    nDist = 1
  }
  if (nDist > nMaxDist) {
    nTargetX = (nOriginX + Math.trunc(imul32((nTargetX - nOriginX) | 0, nMaxDist) / nDist)) | 0
    nTargetY = (nOriginY + Math.trunc(imul32((nTargetY - nOriginY) | 0, nMaxDist) / nDist)) | 0
    m.setU32(pInOutX >>> 0, nTargetX >>> 0)
    m.setU32(pInOutY >>> 0, nTargetY >>> 0)
    nDist = nMaxDist
  }

  let nStep = 1
  if (nDist > 0) {
    const sp = w3b2ScratchSp
    w3b2ScratchSp = (sp + 0x10) >>> 0
    try {
      while (true) {
        m.setU32(sp, nTargetX >>> 0)
        m.setU32((sp + 4) >>> 0, nTargetY >>> 0)
        const pDestRoom = ROOM_FindRoomContainingSubtile113c(m, pOriginRoom, nTargetX, nTargetY) >>> 0
        m.setU32(pOutRoom >>> 0, pDestRoom)
        if (pDestRoom !== 0) {
          const nSizeX = UNITS_GetUnitSizeX113c(m, pUnit) | 0
          const bFoundFree = COLLISION_FindFreePositionSimple113c(m, pDestRoom, sp, nSizeX, 0x1c09, 0)
          if (bFoundFree !== 0) {
            const freeX = m.u32(sp) | 0
            const freeY = m.u32((sp + 4) >>> 0) | 0
            const nPattern = PATH_GetUnitCollisionPattern113c(m, pUnit) | 0
            if (COLLISION_CheckMaskWithPattern2_113c(m, pDestRoom, freeX, freeY, nPattern, 0x1c09) === 0) {
              if (SKILLS_CheckLineOfSight113c(m, nOriginX, nOriginY, freeX, freeY, pOriginRoom, 0x0c01) !== 0) {
                const nFinalDist = UNITS_GetUnitDistanceToCoordinates113c(m, pUnit, freeX, freeY) | 0
                if (nFinalDist <= nMaxDist) {
                  m.setU32(pInOutX >>> 0, freeX >>> 0)
                  m.setU32(pInOutY >>> 0, freeY >>> 0)
                  return 1
                }
              }
            }
          }
        }
        const nRem = (nDist - nStep) | 0
        nStep = (nStep + 1) | 0
        if (nRem <= 0) break
        nTargetX = (nOriginX + Math.trunc(imul32((m.u32(pInOutX >>> 0) | 0) - nOriginX, nRem) / nDist)) | 0
        nTargetY = (nOriginY + Math.trunc(imul32((m.u32(pInOutY >>> 0) | 0) - nOriginY, nRem) / nDist)) | 0
      }
    } finally {
      w3b2ScratchSp = sp
    }
  }
  return 0
}

/**
 * [27/45] Computes Whirlwind / dual-wielding attack frame interval from weapon speed
 * (`ITEMS_CalcWeaponAttackSpeed113c`) and stores the next attack frame in `Skill->dwParam4`.
 *
 * @va D2Game:0x6FC46E40
 */
export function SKILLS_CalcWhirlwindFrameInterval_6FC46E40_113c(
  m: D2KernMemory113c,
  pUnit: number,
  pGame: number,
  pSkill: number,
): number {
  if (pUnit !== 0 && (m.u32(pUnit >>> 0) >>> 0) === 1) {
    const lo = stepSeed64InMem113c(m, (pUnit + 0x20) >>> 0)
    return (lo & 1) === 0 ? 1 : 0
  }
  if (m.u32((pGame + 0x70) >>> 0) === 0) {
    return 1
  }

  let nNextFrame = SKILLS_GetParam4113c(m, pSkill) | 0
  const dwCurFrame = m.u32((pGame + 0xa8) >>> 0) | 0
  if (nNextFrame === 0) {
    SKILLS_SetParam4113c(m, pSkill, (dwCurFrame + 4) | 0)
    return 1
  }
  if (dwCurFrame < nNextFrame) {
    return 0
  }

  let nHitCount = 1
  const pWeapon = PLAYER_GetEquippedWeapon113c(m, pUnit) >>> 0
  let nStepFrames = 10
  if (pWeapon !== 0) {
    const nFrames = ITEMS_CalcWeaponAttackSpeed113c(m, pUnit, pWeapon) | 0
    if (nFrames < 0x0c) {
      nStepFrames = 4
    } else if (nFrames < 0x0f) {
      nStepFrames = 6
    } else if (nFrames < 0x12) {
      nStepFrames = 8
    } else if (nFrames < 0x14) {
      nStepFrames = 10
    } else if (nFrames < 0x17) {
      nStepFrames = 12
    } else if (nFrames < 0x1a) {
      nStepFrames = 14
    } else {
      nStepFrames = 16
    }
  }

  if (PLRMODE_IsDualWieldingClaws_6FC46A30_113c(m, pUnit) !== 0) {
    nHitCount = 2
  }

  let nUpdatedFrame = (nNextFrame + nStepFrames) | 0
  if (nUpdatedFrame < ((dwCurFrame + nStepFrames) | 0)) {
    nUpdatedFrame = (dwCurFrame + nStepFrames) | 0
  }
  SKILLS_SetParam4113c(m, pSkill, nUpdatedFrame)
  return nHitCount
}

/**
 * [28/45] Selects a potion item code (`hp`, `mp`, or `rv`) from `0x6FD2E3E8` indexed by
 * act (`0..4`) and difficulty (`0..2`) using a random roll against `Skill` params 3 and 4.
 *
 * @va D2Game:0x6FC46F70
 */
export function SKILLS_SelectPotionCodeFromActAndDifficulty_6FC46F70_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  nSkillId: number,
): number {
  const pRoom = UNITS_GetRoom113c(m, pUnit) >>> 0
  if (pRoom === 0) return 0

  const nLevelId = DUNGEON_GetLevelIdFromRoom113c(m, pRoom) | 0
  const nAct = DRLG_GetActNoFromLevelId113c(m, nLevelId) & 0xff
  const nDiff = m.u8((pGame + 0x6d) >>> 0)

  const nRowIdx = (imul32(nAct, 3) + nDiff) | 0
  if (nRowIdx < 0 || nRowIdx >= 15) return 0

  const nRoll = (stepSeed64InMem113c(m, (pUnit + 0x20) >>> 0) % 100) | 0
  const nParam4 = SKILLS_GetParam4Fast_6FC21C20_113c(m, nSkillId) | 0

  let nCol = 0
  if (nRoll < nParam4) {
    nCol = 2
  } else {
    const nParam3 = SKILLS_GetParam3Fast_6FC21BF0_113c(m, nSkillId) | 0
    nCol = nRoll < ((nParam4 + nParam3) | 0) ? 1 : 0
  }

  const row = POTION_CODE_TABLE_6FD2E3E8[nRowIdx]!
  return row[nCol]!
}

/**
 * Helper callback `D2Game:0x6FCBED70` invoked by `0x6FC472C0` via `AURA_ForEachUnitInRadius113c`:
 * selects the first candidate unit other than `pCurrentTarget` (`[pCtx+0x00]`) that `pAttacker`
 * can melee-attack (`UNITS_CanUnitMeleeAttackTarget113c`), otherwise stores it as fallback at `[pCtx+0x08]`.
 */
function findMeleeTargetRadiusCallback_6FCBED70_113c(
  m: Memory113c,
  pAuraCtx: number,
  pCandidate: number,
): number {
  const pAttacker = m.u32((pAuraCtx + 0x04) >>> 0) >>> 0
  const pCtx = m.u32((pAuraCtx + 0x0c) >>> 0) >>> 0
  if (pCtx === 0 || m.u32((pCtx + 0x04) >>> 0) !== 0) {
    return 0
  }
  const nAdder = m.u32((pCtx + 0x0c) >>> 0) | 0
  if (UNITS_CanUnitMeleeAttackTarget113c(m, pAttacker, pCandidate, nAdder) !== 0) {
    if (pCandidate === (m.u32(pCtx >>> 0) >>> 0)) {
      m.setU32((pCtx + 0x08) >>> 0, pCandidate >>> 0)
      return 0
    }
    m.setU32((pCtx + 0x04) >>> 0, pCandidate >>> 0)
  }
  return 0
}

/**
 * [29/45] Finds the next melee target in radius around `pUnit` via `AURA_ForEachUnitInRadius113c`
 * (using callback `0x6FCBED70`) and stores its type/GUID in `Skill->dwParam3` / `dwParam4`.
 *
 * @va D2Game:0x6FC472C0
 */
export function SKILLS_FindNextMeleeTargetInRadius_6FC472C0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  pSkill: number,
): number {
  const nSavedGuid = SKILLS_GetParam4113c(m, pSkill) | 0
  const nSavedType = SKILLS_GetParam3113c(m, pSkill) | 0
  let pLastTarget = SUNIT_GetServerUnit113c(m, pGame, nSavedType, nSavedGuid) >>> 0

  if (pLastTarget === 0) {
    const pPath = pUnit !== 0 ? m.u32((pUnit + 0x2c) >>> 0) >>> 0 : 0
    if (pPath !== 0) {
      SUNIT_ValidatePathTargetUnit113c(m, pUnit, pGame)
      pLastTarget = PATH_GetTargetUnit113c(m, pPath) >>> 0
    }
  }

  let nRange = (UNITS_GetEquippedWeaponAdder113c(m, pUnit) + 1) | 0
  if (pUnit !== 0 && (m.u32(pUnit >>> 0) >>> 0) === 1) {
    nRange = (nRange + 2) | 0
  }

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x10) >>> 0
  let pChosen = 0
  try {
    m.setU32((sp + 0x00) >>> 0, pLastTarget >>> 0)
    m.setU32((sp + 0x04) >>> 0, 0)
    m.setU32((sp + 0x08) >>> 0, 0)
    m.setU32((sp + 0x0c) >>> 0, nRange >>> 0)

    AURA_ForEachUnitInRadius113c(
      m,
      pGame,
      pUnit,
      0,
      0,
      nRange + 4,
      0x583,
      0x6fcbed70,
      sp,
      1,
      findMeleeTargetRadiusCallback_6FCBED70_113c,
    )
    pChosen = m.u32((sp + 0x04) >>> 0) >>> 0
    if (pChosen === 0) {
      pChosen = m.u32((sp + 0x08) >>> 0) >>> 0
    }
  } finally {
    w3b2ScratchSp = sp
  }

  if (pChosen !== 0) {
    SKILLS_SetParam3113c(m, pSkill, m.u32(pChosen) | 0)
    SKILLS_SetParam4113c(m, pSkill, m.u32((pChosen + 0x0c) >>> 0) | 0)
    return pChosen
  }
  if (
    pLastTarget !== 0 &&
    UNITS_CanUnitMeleeAttackTarget113c(m, pUnit, pLastTarget, nRange) !== 0
  ) {
    SKILLS_SetParam3113c(m, pSkill, m.u32(pLastTarget) | 0)
    SKILLS_SetParam4113c(m, pSkill, m.u32((pLastTarget + 0x0c) >>> 0) | 0)
    return pLastTarget
  }
  SKILLS_SetParam3113c(m, pSkill, 6)
  SKILLS_SetParam4113c(m, pSkill, -1)
  return 0
}

/**
 * [30/45] Consumes a selectable monster corpse (setting state `0x76`) and rolls skill calc
 * (`SkillsTxt + 0x80`) to drop treasure via `MONMODE_DropTreasureOnDeathWrapper_6FC958D0_113c`.
 *
 * @va D2Game:0x6FC476D0
 */
export function SKILLS_SrvDo_FindItemCorpseDrop_6FC476D0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  nSkillId: number,
  nSkillLevel: number,
): number {
  const nSkillIdx = nSkillId | 0
  if (nSkillIdx < 0) return 0
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if (nSkillIdx >= (m.u32((pDataTables + 0xbac) >>> 0) | 0)) return 0
  const pSkillsBase = m.u32((pDataTables + 0xba8) >>> 0) >>> 0
  const pSkillsTxt = (pSkillsBase + imul32(nSkillIdx, 0x23c)) >>> 0
  if (pSkillsTxt === 0) return 0

  const pPath = pUnit !== 0 ? m.u32((pUnit + 0x2c) >>> 0) >>> 0 : 0
  if (pPath === 0) return 0
  SUNIT_ValidatePathTargetUnit113c(m, pUnit, pGame)
  const pCorpse = PATH_GetTargetUnit113c(m, pPath) >>> 0
  if (pCorpse === 0) return 0

  if (SKILLS_IsSelectableCorpse10678_113c(m, pCorpse) === 0) return 0
  if (STATES_CheckState113c(m, pCorpse, 0x76) !== 0) return 0

  let nChance = 0
  const nCalc = m.u32((pSkillsTxt + 0x80) >>> 0) | 0
  if (nCalc !== -1) {
    nChance = SKILLS_EvalCalcByOffset113c(m, pUnit, nCalc, nSkillIdx, nSkillLevel | 0) | 0
  }

  const nRoll = rollLimitedSeed64InMem113c(m, (pUnit + 0x20) >>> 0, 100)
  if (nRoll < nChance) {
    const pRoom = m.u32((pUnit + 0x2c) >>> 0) !== 0 ? UNITS_GetRoom113c(m, pCorpse) >>> 0 : 0
    if (pRoom !== 0 && (m.u8((pRoom + 0x45) >>> 0) & 0x08) !== 0) {
      MONMODE_DropTreasureOnDeathWrapper_6FC958D0_113c(m, pGame, pCorpse, pUnit, false)
    } else {
      MONMODE_DropTreasureOnDeathWrapper_6FC958D0_113c(m, pGame, pCorpse, pUnit, true)
    }
  }

  STATES_ToggleGfxStateFlag113c(m, pCorpse, 0x76, 1)
  UNITROOM_RefreshUnit113c(m, pCorpse)
  return 1
}

/**
 * [31/45] Consumes a selectable monster corpse (`SKILLS_IsSelectableCorpseWithFlag12_113c`),
 * toggles corpse states (`0x68` or `0x76`), and spawns `SkillsTxt->wSrvMissileA` (`+0x28`) at a free position.
 *
 * @va D2Game:0x6FC47C90
 */
export function SKILLS_SrvDo_SpawnCorpseMissile_6FC47C90_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  nSkillId: number,
  nSkillLevel: number,
  hooks?: K2W3B2Hooks113c,
): number {
  const nSkillIdx = nSkillId | 0
  if (nSkillIdx < 0) return 0
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if (nSkillIdx >= (m.u32((pDataTables + 0xbac) >>> 0) | 0)) return 0
  const pSkillsBase = m.u32((pDataTables + 0xba8) >>> 0) >>> 0
  const pSkillsTxt = (pSkillsBase + imul32(nSkillIdx, 0x23c)) >>> 0
  if (pSkillsTxt === 0) return 0

  const pPath = pUnit !== 0 ? m.u32((pUnit + 0x2c) >>> 0) >>> 0 : 0
  if (pPath === 0) return 0
  SUNIT_ValidatePathTargetUnit113c(m, pUnit, pGame)
  const pCorpse = PATH_GetTargetUnit113c(m, pPath) >>> 0
  if (pCorpse === 0) return 0

  if (SKILLS_IsSelectableCorpseWithFlag12_113c(m, pCorpse) === 0) return 0

  const nCorpseX = UNIT_GetPosX113c(m, pCorpse) | 0
  const nCorpseY = UNIT_GetPosY113c(m, pCorpse) | 0
  const pCasterRoom = UNITS_GetRoom113c(m, pUnit) >>> 0
  if (pCasterRoom === 0) return 0

  const pTargetRoom = ROOM_FindRoomContainingSubtile113c(m, pCasterRoom, nCorpseX, nCorpseY) >>> 0
  if (pTargetRoom === 0) return 0

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x48) >>> 0
  try {
    const pCoords = sp
    const pMissileParams = (sp + 8) >>> 0
    m.setU32(pCoords, nCorpseX >>> 0)
    m.setU32((pCoords + 4) >>> 0, nCorpseY >>> 0)
    if (COLLISION_FindFreePositionSimple113c(m, pTargetRoom, pCoords, 3, 0x3f11, 0) === 0) {
      return 0
    }
    const freeX = m.u32(pCoords) | 0
    const freeY = m.u32((pCoords + 4) >>> 0) | 0

    let pMonStats2 = 0
    const nClassId = m.u32((pCorpse + 0x04) >>> 0) | 0
    if (nClassId >= 0 && nClassId < (m.u32((pDataTables + 0xa80) >>> 0) | 0)) {
      const pMonStats = (m.u32((pDataTables + 0xa78) >>> 0) + imul32(nClassId, 0x1a8)) >>> 0
      if (pMonStats !== 0) {
        pMonStats2 = MONSTATS2_GetRecordPtr113c(m, sx16(m.u16((pMonStats + 0x06) >>> 0))) >>> 0
      }
    }
    if (pMonStats2 !== 0 && (m.u8((pMonStats2 + 0x0b) >>> 0) & 0x04) !== 0) {
      STATES_ToggleGfxStateFlag113c(m, pCorpse, 0x68, 1)
    } else {
      STATES_ToggleGfxStateFlag113c(m, pCorpse, 0x76, 1)
    }
    UNITROOM_RefreshUnit113c(m, pCorpse)

    const wMissileId = sx16(m.u16((pSkillsTxt + 0x28) >>> 0))
    if (wMissileId >= 0 && wMissileId < (m.u32((pDataTables + 0xbc0) >>> 0) | 0)) {
      m.fill(pMissileParams, 0x60, 0)
      m.setU32((pMissileParams + 0x00) >>> 0, 0x20)
      m.setU32((pMissileParams + 0x04) >>> 0, pUnit >>> 0)
      m.setU32((pMissileParams + 0x08) >>> 0, pUnit >>> 0)
      m.setU32((pMissileParams + 0x10) >>> 0, wMissileId >>> 0)
      m.setU32((pMissileParams + 0x14) >>> 0, freeX >>> 0)
      m.setU32((pMissileParams + 0x18) >>> 0, freeY >>> 0)
      m.setU32((pMissileParams + 0x28) >>> 0, nSkillIdx >>> 0)
      m.setU32((pMissileParams + 0x2c) >>> 0, nSkillLevel >>> 0)
      MISSILE_CreateServerProjectile113c(
        m,
        pGame,
        pMissileParams,
        hooks !== undefined ? hooks.meleeDot : undefined,
      )
    }
    return 1
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [32/45] Applies or increments a progressive charge-up skill state (`stat 0xA9` on
 * `SkillsTxt->nAuraState`) and refreshes its expiration timer and stat calcs.
 *
 * @va D2Game:0x6FC48E70
 */
export function SKILLS_ApplyProgressiveChargeState_6FC48E70_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
  nSkillId: number,
  nSkillLevel: number,
): number {
  const nSkillIdx = nSkillId | 0
  if (nSkillIdx < 0) return 0
  const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
  if (nSkillIdx >= (m.u32((pDataTables + 0xbac) >>> 0) | 0)) return 0
  const pSkillsBase = m.u32((pDataTables + 0xba8) >>> 0) >>> 0
  const pSkillsTxt = (pSkillsBase + imul32(nSkillIdx, 0x23c)) >>> 0
  if (pSkillsTxt === 0) return 0

  const nAuraState = sx16(m.u16((pSkillsTxt + 0x10) >>> 0))
  if (nAuraState < 0 || nAuraState >= (m.u32((pDataTables + 0xbc8) >>> 0) | 0)) return 0

  let nLen = 0
  const nLenCalc = m.u32((pSkillsTxt + 0x70) >>> 0) | 0
  if (nLenCalc !== -1) {
    nLen = SKILLS_EvalCalcByOffset113c(m, pUnit, nLenCalc, nSkillIdx, nSkillLevel | 0) | 0
  }
  if (nLen <= 0) return 0

  const nExpireFrame = ((m.u32((pGame + 0xa8) >>> 0) | 0) + nLen) | 0
  let pStatList = STATLIST_GetStatListFromUnitAndStateMemPort113c(m, pUnit, nAuraState) >>> 0
  if (pStatList === 0) {
    let dwPool = 0
    let uType = 6
    let uGuid = 0
    if (pUnit !== 0) {
      dwPool = m.u32((pUnit + 0x08) >>> 0) >>> 0
      uType = m.u32(pUnit) | 0
      uGuid = m.u32((pUnit + 0x0c) >>> 0) | 0
    }
    pStatList = STATLIST_AllocList113c(m, dwPool, 2, nExpireFrame, uType, uGuid) >>> 0
    if (pStatList === 0) return 0
    STATLIST_SetState113c(m, pStatList, nAuraState)
    STATLIST_SetStatRemoveProc113c(m, pStatList, 0x6fcbf7a0)
    STATLIST_MergeStatLists113c(m, pUnit, pStatList, 1)
    STATES_ToggleGfxStateFlag113c(m, pUnit, nAuraState, 1)
  } else {
    STATES_ClearGfxStateFlag113c(m, pUnit, nAuraState, 1)
    STATLIST_SetExpireFrameEx113c(m, pStatList, nExpireFrame)
  }

  EVENT_SetEventFull113c(m, pGame, pUnit, 9, nExpireFrame >>> 0, 0, 0, 0)

  const nCurCharge = STATLIST_GetStatValue113c(m, pStatList, 0xa9, nSkillIdx) | 0
  const pUsedSkill = SKILLS_GetUsedSkillMemPort113c(m, pUnit) >>> 0
  if (pUsedSkill === 0) return 0

  const nMaxCharge = SKILLS_GetParam1113c(m, pUsedSkill) | 0
  if (nCurCharge < nMaxCharge) {
    const nNextCharge = (nCurCharge + 1) | 0
    if (nNextCharge <= nMaxCharge) {
      STATLIST_SetStat113c(m, pStatList, 0xa9, nNextCharge, nSkillIdx)
      SKILLS_ApplySkillAuraStatCalcs_6FC648E0_113c(
        m,
        pSkillsTxt,
        pUnit,
        pStatList,
        nSkillIdx,
        nSkillLevel | 0,
      )
    }
  }
  return 1
}

/**
 * [33/45] Looks up a game entry by `wGameKey` (`uint16`) in the global game hash table
 * at `m.u32(0x6FD31C24)` via `STORM_TSHashTableLookup_6FC22130_113c` and increments its
 * lock/refcount (`+0x14`).
 *
 * @va D2Game:0x6FC4AAE0
 */
export function GAME_LookupAndLockGameByKey_6FC4AAE0_113c(
  m: D2KernMemory113c,
  wGameKey: number,
): number {
  const pTable = m.u32(0x6fd31c24) >>> 0
  if (pTable === 0) return 0
  const pGame = STORM_TSHashTableLookup_6FC22130_113c(m, pTable, wGameKey & 0xffff) >>> 0
  if (pGame !== 0) {
    const pLock = m.u32((pGame + 0x14) >>> 0) >>> 0
    if (pLock !== 0) {
      m.setU32(pLock, ((m.u32(pLock) | 0) + 1) >>> 0)
    }
    return pGame
  }
  return 0
}

/**
 * [34/45] Broadcasts unit removal to all in-game clients in nearby rooms via
 * `CLIENT_SendUnitRemoveIfInNearRoom_6FC4A9F0_113c` and frees `pUnit`.
 *
 * @va D2Game:0x6FC4CD10
 */
export function SUNIT_BroadcastRemoveAndFreeUnit_6FC4CD10_113c(
  m: D2KernMemory113c,
  pGame: number,
  pUnit: number,
): void {
  CLIENTS_ForEachInGameClient113c(
    m,
    pGame,
    0x6fc4a9f0,
    pUnit,
    (mem, pClient, pCtx) => {
      CLIENT_SendUnitRemoveIfInNearRoom_6FC4A9F0_113c(mem, pClient, pCtx)
    },
  )
  SUNIT_FreeUnit113c(m, pGame, pUnit)
}

/**
 * [35/45] Dispatches preset object spawner callbacks for preset object IDs `> 0x23D`
 * via the table at `0x6FD2E1BC` (count at `0x6FD2E1E0`).
 *
 * @va D2Game:0x6FC4E830
 */
export function OBJECTS_DispatchPresetObjectSpawner_6FC4E830_113c(
  m: D2KernMemory113c,
  nObjectId: number,
  pGame: number,
  pRoom: number,
  x: number,
  y: number,
  nInitMode: number,
  hooks?: K2W3B2Hooks113c,
): number {
  const objId = nObjectId | 0
  if (objId <= 0x23d) return 0

  let nCount = m.u32(0x6fd2e1e0) | 0
  if (nCount === 0) nCount = 9
  const idx = (objId - 0x23e) | 0
  if (idx >= nCount) return 0

  let pfn = m.u32((0x6fd2e1bc + idx * 4) >>> 0) >>> 0
  if (pfn === 0 && idx < DEFAULT_PRESET_OBJ_TABLE_6FD2E1BC.length) {
    pfn = DEFAULT_PRESET_OBJ_TABLE_6FD2E1BC[idx]! >>> 0
  }
  if (pfn === 0) {
    throw new D2CommonAssertError('Objects.cpp', 0x1ad)
  }

  if (pfn === 0x6fc525c0) {
    return OBJECTS_SpawnPresetShrineFromGroup_6FC525C0_113c(m, pGame, pRoom, objId, x, y, nInitMode)
  }
  if (pfn === 0x6fc522b0) {
    return OBJECTS_SpawnPresetTorchOrBrazier_6FC522B0_113c(m, pGame, pRoom, objId, x, y, nInitMode)
  }
  if (hooks !== undefined && hooks.onPresetObjectHandler !== undefined) {
    return hooks.onPresetObjectHandler(m, pfn, pGame, pRoom, objId, x, y, nInitMode) | 0
  }
  return 0
}

/**
 * [36/45] Populates clusters of trap/evil-urn monsters (`0x193` / `0x194`, anim mode `14`)
 * inside `pRoom`.
 *
 * @va D2Game:0x6FC4F690
 */
export function OBJECTS_PopulateEvilUrnMonstersInRoom_6FC4F690_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  nDensity: number,
  hooks?: K2W3B2Hooks113c,
): number {
  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x70) >>> 0
  try {
    const pPos = sp
    const pRoomCoords = (sp + 0x10) >>> 0
    const pSpawnArgs = (sp + 0x28) >>> 0
    m.fill(sp, 0x70, 0)

    DUNGEON_GetRoomCoordinates113c(m, pRoom, pRoomCoords)
    const subX = m.u32(pRoomCoords) | 0
    const subY = m.u32((pRoomCoords + 4) >>> 0) | 0
    const subW = m.u32((pRoomCoords + 8) >>> 0) | 0
    const subH = m.u32((pRoomCoords + 12) >>> 0) | 0

    const pSeed = pRoom !== 0 ? (pRoom + 0x6c) >>> 0 : 0
    const nClusters = (Math.trunc(imul32(nDensity | 0, imul32(subW, subH)) / 1500) + 1) | 0
    if (nClusters <= 0) return 1

    const pDataTables = m.u32(m.u32(D2GAME_IAT_SGPT_DATATABLES_VA_113C) >>> 0) >>> 0
    const pObjRec = DATATBLS_GetObjectsTxtRecord113c(m, 0x92) >>> 0
    const nSizeX = pObjRec !== 0 ? m.u32((pObjRec + 0xdc) >>> 0) | 0 : 0
    const nSizeY = pObjRec !== 0 ? m.u32((pObjRec + 0xe0) >>> 0) | 0 : 0

    for (let c = 0; c < nClusters; c++) {
      const nXRange = (subW - 0x0c) | 0
      const rX = rollLimitedSeed64InMem113c(m, pSeed, nXRange)
      const nYRange = (subH - 0x0c) | 0
      const rY = rollLimitedSeed64InMem113c(m, pSeed, nYRange)
      const baseX = (rX + subX + 6) | 0
      const baseY = (rY + subY + 6) | 0
      m.setU32(pPos, baseX >>> 0)
      m.setU32((pPos + 4) >>> 0, baseY >>> 0)

      if (OBJECTS_CheckSpawnSpotClearMargin7_6FC4E660_113c(m, pRoomCoords, pPos, nSizeX, pRoom, nSizeY) !== 0) {
        let nClassId = ((stepSeed64InMem113c(m, pSeed) & 1) + 0x193) | 0
        if (nClassId >= 0 && nClassId < (m.u32((pDataTables + 0xa80) >>> 0) | 0)) {
          const pMonRec = (m.u32((pDataTables + 0xa78) >>> 0) + imul32(nClassId, 0x1a8)) >>> 0
          if (pMonRec === 0 || (m.u8((pMonRec + 0x1a) >>> 0) & 0x80) === 0) {
            nClassId = -1
          }
        } else {
          nClassId = -1
        }
        m.fill(pSpawnArgs, 0x38, 0)
        m.setU32((pSpawnArgs + 0x00) >>> 0, pGame >>> 0)
        m.setU32((pSpawnArgs + 0x04) >>> 0, pRoom >>> 0)
        m.setU32((pSpawnArgs + 0x08) >>> 0, 0)
        m.setU32((pSpawnArgs + 0x0c) >>> 0, nClassId >>> 0)
        m.setU32((pSpawnArgs + 0x10) >>> 0, 1)
        m.setU32((pSpawnArgs + 0x14) >>> 0, 0x2a)
        m.setU32((pSpawnArgs + 0x18) >>> 0, m.u32(pPos))
        m.setU32((pSpawnArgs + 0x1c) >>> 0, m.u32((pPos + 4) >>> 0))
        m.setU32((pSpawnArgs + 0x20) >>> 0, 1)
        m.setU16((pSpawnArgs + 0x24) >>> 0, 2)
        const pMon = MONSTER_Create113c(
          m,
          pSpawnArgs,
          hooks !== undefined ? hooks.regpop : undefined,
        ) >>> 0
        if (pMon !== 0) {
          UNITS_ChangeAnimMode113c(m, pMon, 0x0e)
        }
      }

      const nExtraCount = ((stepSeed64InMem113c(m, pSeed) >>> 0) % 5) | 0
      for (let k = 0; k < nExtraCount; k++) {
        const nDir = stepSeed64InMem113c(m, pSeed) & 7
        const offX = (baseX + imul32(NEIGHBOR8_DX_6FD2E00C[nDir]!, nSizeX)) | 0
        const offY = (baseY + imul32(NEIGHBOR8_DY_6FD2E02C[nDir]!, nSizeY)) | 0
        m.setU32((pPos + 8) >>> 0, offX >>> 0)
        m.setU32((pPos + 12) >>> 0, offY >>> 0)
        if (OBJECTS_CheckSpawnSpotClearMargin7_6FC4E660_113c(m, pRoomCoords, (pPos + 8) >>> 0, nSizeX, pRoom, nSizeY) !== 0) {
          let nClassId = ((stepSeed64InMem113c(m, pSeed) & 1) + 0x193) | 0
          if (nClassId >= 0 && nClassId < (m.u32((pDataTables + 0xa80) >>> 0) | 0)) {
            const pMonRec = (m.u32((pDataTables + 0xa78) >>> 0) + imul32(nClassId, 0x1a8)) >>> 0
            if (pMonRec === 0 || (m.u8((pMonRec + 0x1a) >>> 0) & 0x80) === 0) {
              nClassId = -1
            }
          } else {
            nClassId = -1
          }
          m.fill(pSpawnArgs, 0x38, 0)
          m.setU32((pSpawnArgs + 0x00) >>> 0, pGame >>> 0)
          m.setU32((pSpawnArgs + 0x04) >>> 0, pRoom >>> 0)
          m.setU32((pSpawnArgs + 0x08) >>> 0, 0)
          m.setU32((pSpawnArgs + 0x0c) >>> 0, nClassId >>> 0)
          m.setU32((pSpawnArgs + 0x10) >>> 0, 1)
          m.setU32((pSpawnArgs + 0x14) >>> 0, 0x2a)
          m.setU32((pSpawnArgs + 0x18) >>> 0, offX >>> 0)
          m.setU32((pSpawnArgs + 0x1c) >>> 0, offY >>> 0)
          m.setU32((pSpawnArgs + 0x20) >>> 0, 1)
          m.setU16((pSpawnArgs + 0x24) >>> 0, 2)
          const pMon = MONSTER_Create113c(
            m,
            pSpawnArgs,
            hooks !== undefined ? hooks.regpop : undefined,
          ) >>> 0
          if (pMon !== 0) {
            UNITS_ChangeAnimMode113c(m, pMon, 0x0e)
          }
        }
      }
    }
    return 1
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [37/45] Populates a line of border objects (`0x6FD2E334[0..3]`) along a horizontal
 * (`nAxis == 0`) or vertical (`nAxis != 0`) edge of `pRoom`.
 *
 * @va D2Game:0x6FC4FA90
 */
export function OBJECTS_PopulateRoomEdgeObjects_6FC4FA90_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  pRoomCoords: number,
  nAxis: number,
  nFixedCoord: number,
  nDensity: number,
): number {
  const pSeed = pRoom !== 0 ? (pRoom + 0x6c) >>> 0 : 0
  const pFirstObjRec = DATATBLS_GetObjectsTxtRecord113c(m, DEFAULT_EDGE_OBJ_TABLE_6FD2E334[0]!) >>> 0
  const nSizeX = pFirstObjRec !== 0 ? m.u32((pFirstObjRec + 0xdc) >>> 0) | 0 : 1
  const nSizeY = pFirstObjRec !== 0 ? m.u32((pFirstObjRec + 0xe0) >>> 0) | 0 : 1

  let nMaxCount = m.u32(0x6fd2e344) | 0
  if (nMaxCount <= 0) nMaxCount = 2

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x10) >>> 0
  try {
    if (nAxis === 0) {
      let curX = (m.u32(pRoomCoords >>> 0) + 6) | 0
      const endX = ((m.u32((pRoomCoords + 8) >>> 0) | 0) - 0x0c + curX) | 0
      while (curX < endX) {
        if ((stepSeed64InMem113c(m, pSeed) % 100) < (nDensity | 0)) {
          const nRunLen = (rollLimitedSeed64InMem113c(m, pSeed, 6) + 1) | 0
          for (let i = 0; i < nRunLen && curX < endX; i++) {
            m.setU32(sp, curX >>> 0)
            m.setU32((sp + 4) >>> 0, nFixedCoord >>> 0)
            if (OBJECTS_CheckSpawnSpotClearMargin7_6FC4E660_113c(m, pRoomCoords, sp, nSizeX, pRoom, nSizeY) !== 0) {
              if (pRoom === 0) {
                throw new D2CommonAssertError('Objects.cpp', 0xa68)
              }
              const rIdx = rollLimitedSeed64InMem113c(m, pSeed, nMaxCount)
              const nObjId = DEFAULT_EDGE_OBJ_TABLE_6FD2E334[rIdx & 3]!
              allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjId, curX, nFixedCoord, 0)
            }
            curX = (curX + nSizeX) | 0
          }
        } else {
          const rSkip = rollLimitedSeed64InMem113c(m, pSeed, 6)
          curX = (curX + imul32(rSkip + 1, nSizeX)) | 0
        }
      }
    } else {
      let curY = (m.u32((pRoomCoords + 4) >>> 0) + 6) | 0
      const endY = ((m.u32((pRoomCoords + 12) >>> 0) | 0) - 0x0c + curY) | 0
      while (curY < endY) {
        if ((stepSeed64InMem113c(m, pSeed) % 100) < (nDensity | 0)) {
          const nRunLen = (rollLimitedSeed64InMem113c(m, pSeed, 6) + 1) | 0
          for (let i = 0; i < nRunLen && curY < endY; i++) {
            m.setU32(sp, nFixedCoord >>> 0)
            m.setU32((sp + 4) >>> 0, curY >>> 0)
            if (OBJECTS_CheckSpawnSpotClearMargin7_6FC4E660_113c(m, pRoomCoords, sp, nSizeX, pRoom, nSizeY) !== 0) {
              if (pRoom === 0) {
                throw new D2CommonAssertError('Objects.cpp', 0xa86)
              }
              const rIdx = rollLimitedSeed64InMem113c(m, pSeed, nMaxCount)
              const nObjId = DEFAULT_EDGE_OBJ_TABLE_6FD2E334[(rIdx + 2) & 3]!
              allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjId, nFixedCoord, curY, 0)
            }
            curY = (curY + nSizeY) | 0
          }
        } else {
          const rSkip = rollLimitedSeed64InMem113c(m, pSeed, 6)
          curY = (curY + imul32(rSkip + 1, nSizeY)) | 0
        }
      }
    }
  } finally {
    w3b2ScratchSp = sp
  }
  return 1
}

/**
 * [38/45] Populates a rectangular grid of objects (`7` or `11`) within `pRect` inside `pRoom`.
 *
 * @va D2Game:0x6FC4FEC0
 */
export function OBJECTS_PopulateGridObjectsInRect_6FC4FEC0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  pRoomCoords: number,
  pRect: number,
  nDensity: number,
): number {
  const pSeed = pRoom !== 0 ? (pRoom + 0x6c) >>> 0 : 0
  const pObjRec = DATATBLS_GetObjectsTxtRecord113c(m, 7) >>> 0
  const nSizeX = pObjRec !== 0 ? m.u32((pObjRec + 0xdc) >>> 0) | 0 : 1
  const nSizeY = pObjRec !== 0 ? m.u32((pObjRec + 0xe0) >>> 0) | 0 : 1

  const startX = m.u32(pRect >>> 0) | 0
  const endX = (startX + (m.u32((pRect + 8) >>> 0) | 0)) | 0

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x10) >>> 0
  try {
    for (let curX = startX; curX < endX; curX = (curX + nSizeX) | 0) {
      const startY = m.u32((pRect + 4) >>> 0) | 0
      const endY = (startY + (m.u32((pRect + 12) >>> 0) | 0)) | 0
      for (let curY = startY; curY < endY; curY = (curY + nSizeY) | 0) {
        if ((stepSeed64InMem113c(m, pSeed) % 100) < (nDensity | 0)) {
          m.setU32(sp, curX >>> 0)
          m.setU32((sp + 4) >>> 0, curY >>> 0)
          if (OBJECTS_CheckSpawnSpotClearMargin2_6FC4E5D0_113c(m, pRoomCoords, sp, pRoom, nSizeX, nSizeY) !== 0) {
            const bUseObj11 = (stepSeed64InMem113c(m, pSeed) % 100) < 0x14
            const nObjId = bUseObj11 ? 0x0b : 0x07
            if (pRoom === 0) {
              throw new D2CommonAssertError('Objects.cpp', 0xa05)
            }
            allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjId, curX, curY, 0)
          }
        }
      }
    }
  } finally {
    w3b2ScratchSp = sp
  }
  return 1
}

/**
 * [39/45] Populates clusters of crates/containers (`0x2E` or `0x6FD2E1F8`) in `pRoom`.
 *
 * @va D2Game:0x6FC50150
 */
export function OBJECTS_PopulateCrateClustersInRoom_6FC50150_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  nDensity: number,
): number {
  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x30) >>> 0
  try {
    const pPos = sp
    const pPos2 = (sp + 0x08) >>> 0
    const pRoomCoords = (sp + 0x10) >>> 0
    m.fill(sp, 0x30, 0)

    DUNGEON_GetRoomCoordinates113c(m, pRoom, pRoomCoords)
    const subX = m.u32(pRoomCoords) | 0
    const subY = m.u32((pRoomCoords + 4) >>> 0) | 0
    const subW = m.u32((pRoomCoords + 8) >>> 0) | 0
    const subH = m.u32((pRoomCoords + 12) >>> 0) | 0

    const pSeed = pRoom !== 0 ? (pRoom + 0x6c) >>> 0 : 0
    const nClusters = (Math.trunc(imul32(nDensity | 0, imul32(subW, subH)) / 2000) + 1) | 0
    if (nClusters <= 0) return 1

    const pObjRec = DATATBLS_GetObjectsTxtRecord113c(m, 0x2e) >>> 0
    const nSizeX = pObjRec !== 0 ? m.u32((pObjRec + 0xdc) >>> 0) | 0 : 1
    const nSizeY = pObjRec !== 0 ? m.u32((pObjRec + 0xe0) >>> 0) | 0 : 1

    let nTableMax = m.u32(0x6fd2e224) | 0
    if (nTableMax <= 0) nTableMax = 5

    for (let c = 0; c < nClusters; c++) {
      const rX = rollLimitedSeed64InMem113c(m, pSeed, (subW - 4) | 0)
      const rY = rollLimitedSeed64InMem113c(m, pSeed, (subH - 4) | 0)
      let baseX = (rX + subX + 2) | 0
      let baseY = (rY + subY + 2) | 0
      m.setU32(pPos, baseX >>> 0)
      m.setU32((pPos + 4) >>> 0, baseY >>> 0)

      if (OBJECTS_CheckSpawnSpotClearMargin2_6FC4E5D0_113c(m, pRoomCoords, pPos, pRoom, nSizeX, nSizeY) !== 0) {
        let nObjId = 0x2e
        if ((stepSeed64InMem113c(m, pSeed) % 100) < 0x1e) {
          const rIdx = rollLimitedSeed64InMem113c(m, pSeed, nTableMax)
          nObjId = DEFAULT_CRATE_OBJ_TABLE_6FD2E1F8[rIdx % DEFAULT_CRATE_OBJ_TABLE_6FD2E1F8.length]!
        }
        if (pRoom === 0) {
          throw new D2CommonAssertError('Objects.cpp', 0xa23)
        }
        allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjId, m.u32(pPos) | 0, m.u32((pPos + 4) >>> 0) | 0, 0)
        baseX = m.u32(pPos) | 0
        baseY = m.u32((pPos + 4) >>> 0) | 0
      }

      const nExtra = (((stepSeed64InMem113c(m, pSeed) >>> 0) % 5) + 2) | 0
      for (let k = 0; k < nExtra; k++) {
        const nDir = stepSeed64InMem113c(m, pSeed) & 7
        const offX = (baseX + imul32(NEIGHBOR8_DX_6FD2E00C[nDir]!, nSizeX)) | 0
        const offY = (baseY + imul32(NEIGHBOR8_DY_6FD2E02C[nDir]!, nSizeY)) | 0
        m.setU32(pPos2, offX >>> 0)
        m.setU32((pPos2 + 4) >>> 0, offY >>> 0)
        if (OBJECTS_CheckSpawnSpotClearMargin2_6FC4E5D0_113c(m, pRoomCoords, pPos2, pRoom, nSizeX, nSizeY) !== 0) {
          let nObjId = 0x2e
          if ((stepSeed64InMem113c(m, pSeed) % 100) < 0x1e) {
            const rIdx = rollLimitedSeed64InMem113c(m, pSeed, nTableMax)
            nObjId = DEFAULT_CRATE_OBJ_TABLE_6FD2E1F8[rIdx % DEFAULT_CRATE_OBJ_TABLE_6FD2E1F8.length]!
          }
          if (pRoom === 0) {
            throw new D2CommonAssertError('Objects.cpp', 0xa33)
          }
          allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjId, offX, offY, 0)
        }
      }
    }
    return 1
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [40/45] Populates clusters of barrel objects (`7` or `11`) in `pRoom`.
 *
 * @va D2Game:0x6FC50800
 */
export function OBJECTS_PopulateBarrelClustersInRoom_6FC50800_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  nDensity: number,
): number {
  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x30) >>> 0
  try {
    const pPos = sp
    const pPos2 = (sp + 0x08) >>> 0
    const pRoomCoords = (sp + 0x10) >>> 0
    m.fill(sp, 0x30, 0)

    DUNGEON_GetRoomCoordinates113c(m, pRoom, pRoomCoords)
    const subX = m.u32(pRoomCoords) | 0
    const subY = m.u32((pRoomCoords + 4) >>> 0) | 0
    const subW = m.u32((pRoomCoords + 8) >>> 0) | 0
    const subH = m.u32((pRoomCoords + 12) >>> 0) | 0

    const pSeed = pRoom !== 0 ? (pRoom + 0x6c) >>> 0 : 0
    const nClusters = (Math.trunc(imul32(nDensity | 0, imul32(subW, subH)) / 1000) + 1) | 0
    if (nClusters <= 0) return 1

    const pObjRec = DATATBLS_GetObjectsTxtRecord113c(m, 7) >>> 0
    const nSizeX = pObjRec !== 0 ? m.u32((pObjRec + 0xdc) >>> 0) | 0 : 1
    const nSizeY = pObjRec !== 0 ? m.u32((pObjRec + 0xe0) >>> 0) | 0 : 1

    for (let c = 0; c < nClusters; c++) {
      const rX = rollLimitedSeed64InMem113c(m, pSeed, (subW - 4) | 0)
      const rY = rollLimitedSeed64InMem113c(m, pSeed, (subH - 4) | 0)
      let baseX = (rX + subX + 2) | 0
      let baseY = (rY + subY + 2) | 0
      m.setU32(pPos, baseX >>> 0)
      m.setU32((pPos + 4) >>> 0, baseY >>> 0)

      if (OBJECTS_CheckSpawnSpotClearMargin2_6FC4E5D0_113c(m, pRoomCoords, pPos, pRoom, nSizeX, nSizeY) !== 0) {
        const bUseObj11 = (stepSeed64InMem113c(m, pSeed) % 100) < 0x1e
        const nObjId = bUseObj11 ? 0x0b : 0x07
        if (pRoom === 0) {
          throw new D2CommonAssertError('Objects.cpp', 0x9cf)
        }
        allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjId, m.u32(pPos) | 0, m.u32((pPos + 4) >>> 0) | 0, 0)
        baseX = m.u32(pPos) | 0
        baseY = m.u32((pPos + 4) >>> 0) | 0
      }

      const nExtra = (((stepSeed64InMem113c(m, pSeed) >>> 0) % 5) + 2) | 0
      for (let k = 0; k < nExtra; k++) {
        const nDir = stepSeed64InMem113c(m, pSeed) & 7
        const offX = (baseX + imul32(NEIGHBOR8_DX_6FD2E00C[nDir]!, nSizeX)) | 0
        const offY = (baseY + imul32(NEIGHBOR8_DY_6FD2E02C[nDir]!, nSizeY)) | 0
        m.setU32(pPos2, offX >>> 0)
        m.setU32((pPos2 + 4) >>> 0, offY >>> 0)
        if (OBJECTS_CheckSpawnSpotClearMargin2_6FC4E5D0_113c(m, pRoomCoords, pPos2, pRoom, nSizeX, nSizeY) !== 0) {
          const bUseObj11 = (stepSeed64InMem113c(m, pSeed) % 100) < 0x1e
          const nObjId = bUseObj11 ? 0x0b : 0x07
          if (pRoom === 0) {
            throw new D2CommonAssertError('Objects.cpp', 0x9dd)
          }
          allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjId, offX, offY, 0)
        }
      }
    }
    return 1
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [41/45] Rolls `pGame->pObjectControl->tSeed` (`> 0x46` out of `100`) to spawn object `0x67`
 * at `pUnit`'s path target position (`PATH_GetTargetTypeAndPosition113c`).
 *
 * @va D2Game:0x6FC50E50
 */
export function OBJECTS_TrySpawnTargetSpotObject67_6FC50E50_113c(
  m: D2KernMemory113c,
  pUnit: number,
  pGame: number,
): void {
  const pObjCtrl = m.u32((pGame + 0x10f0) >>> 0) >>> 0
  const nRoll = (stepSeed64InMem113c(m, pObjCtrl) >>> 0) % 100
  if (nRoll <= 0x46) return

  const pRoom = UNITS_GetRoom113c(m, pUnit) >>> 0
  if (pRoom === 0) return

  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x18) >>> 0
  try {
    m.fill(sp, 0x18, 0)
    PATH_GetTargetTypeAndPosition113c(m, pUnit, sp)
    const x = m.u32(sp) | 0
    const y = m.u32((sp + 4) >>> 0) | 0
    allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, 0x67, x, y, 0)
  } finally {
    w3b2ScratchSp = sp
  }
}

/**
 * [42/45] Spawns an object in `pRoom` along a wall side (`nWallSide`: `1`, `2`, or general)
 * after validating collision (`0x3F11`) and a caller-supplied placement predicate.
 *
 * @va D2Game:0x6FC517F0
 */
export function OBJECTS_SpawnWallAlignedObjectWithCallback_6FC517F0_113c(
  m: D2KernMemory113c,
  pGame: number,
  nObjectId: number,
  nSizeX: number,
  nSizeY: number,
  pRoom: number,
  nWallSide: number,
  pCallbackCtx: number,
  pfnCallback: number,
  hooks?: K2W3B2Hooks113c,
): number {
  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x20) >>> 0
  let subX = 0
  let subY = 0
  let subW = 0
  let subH = 0
  try {
    m.fill(sp, 0x20, 0)
    DUNGEON_GetRoomCoordinates113c(m, pRoom, sp)
    subX = m.u32(sp) | 0
    subY = m.u32((sp + 4) >>> 0) | 0
    subW = m.u32((sp + 8) >>> 0) | 0
    subH = m.u32((sp + 12) >>> 0) | 0
  } finally {
    w3b2ScratchSp = sp
  }

  if (subW < ((nSizeX + 2) | 0) || subH < ((nSizeY + 2) | 0)) {
    return 0
  }

  const pSeed = pRoom !== 0 ? (pRoom + 0x6c) >>> 0 : 0
  let x = 0
  let y = 0
  let attempt = 0

  for (; attempt < 5; attempt++) {
    if (nWallSide === 1) {
      const rX = SEED_RollLimitedFast113c(m, pSeed, Math.trunc(subW / 2)) | 0
      x = (subX + rX + Math.trunc(subW / 4)) | 0
      const rY = SEED_RollRangeHalfOpen113c(m, pSeed, 1, 2) | 0
      y = (subY + rY) | 0
    } else if (nWallSide === 2) {
      const rX = SEED_RollRangeHalfOpen113c(m, pSeed, 1, 2) | 0
      x = (subX + rX) | 0
      const rY = SEED_RollLimitedFast113c(m, pSeed, Math.trunc(subH / 2)) | 0
      y = (subY + rY + Math.trunc(subH / 4)) | 0
    } else {
      const rX = SEED_RollLimitedFast113c(m, pSeed, (subW - nSizeX - 1) | 0) | 0
      x = (subX + rX) | 0
      const rY = SEED_RollLimitedFast113c(m, pSeed, (subH - nSizeY - 1) | 0) | 0
      y = (subY + rY) | 0
    }

    if (x === 0 || y === 0) continue
    const x16 = x & 0xffff
    const y16 = y & 0xffff
    if (x16 < ((subX + 1) | 0)) continue
    if (y16 < ((subY + 1) | 0)) continue
    if (x16 >= ((subX + subW - 1) | 0)) continue
    if (y16 >= ((subY + subH - 1) | 0)) continue

    if (pfnCallback === 0 && (hooks === undefined || hooks.onObjectPosValidate === undefined)) {
      throw new D2CommonAssertError('Objects.cpp', 0x634)
    }
    const wHit = COLLISION_CheckMaskWithSizeXY113c(
      m,
      pRoom,
      x,
      y,
      (nSizeX + 6) | 0,
      (nSizeY + 6) | 0,
      0x3f11,
    ) & 0xffff
    if (wHit === 0) {
      const bOk =
        hooks !== undefined && hooks.onObjectPosValidate !== undefined
          ? hooks.onObjectPosValidate(m, nObjectId, pCallbackCtx, x, y) & 0xff
          : 1
      if (bOk !== 0) break
    }
  }

  if (attempt >= 5) return 0
  if (pRoom === 0) {
    throw new D2CommonAssertError('Objects.cpp', 0x64d)
  }
  return allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjectId, x, y, 0)
}

/**
 * [43/45] Spawns a random object in `pRoom` after validating collision (`0x3F11`)
 * and a caller-supplied placement predicate.
 *
 * @va D2Game:0x6FC51B40
 */
export function OBJECTS_SpawnRandomObjectWithCallback_6FC51B40_113c(
  m: D2KernMemory113c,
  pGame: number,
  nObjectId: number,
  nSizeX: number,
  nSizeY: number,
  pRoom: number,
  pCallbackCtx: number,
  pfnCallback: number,
  hooks?: K2W3B2Hooks113c,
): number {
  const sp = w3b2ScratchSp
  w3b2ScratchSp = (sp + 0x20) >>> 0
  let subX = 0
  let subY = 0
  let subW = 0
  let subH = 0
  try {
    m.fill(sp, 0x20, 0)
    DUNGEON_GetRoomCoordinates113c(m, pRoom, sp)
    subX = m.u32(sp) | 0
    subY = m.u32((sp + 4) >>> 0) | 0
    subW = m.u32((sp + 8) >>> 0) | 0
    subH = m.u32((sp + 12) >>> 0) | 0
  } finally {
    w3b2ScratchSp = sp
  }

  if (subW < 2 || subH < 2 || subW <= (nSizeX | 0) || subH <= (nSizeY | 0)) {
    return 0
  }

  const pSeed = pRoom !== 0 ? (pRoom + 0x6c) >>> 0 : 0
  let x = 0
  let y = 0
  let attempt = 0

  for (; attempt < 5; attempt++) {
    const rX = SEED_RollLimitedFast113c(m, pSeed, (subW - nSizeX - 1) | 0) | 0
    x = (subX + rX) | 0
    const rY = SEED_RollLimitedFast113c(m, pSeed, (subH - nSizeY - 1) | 0) | 0
    y = (subY + rY) | 0

    if (x === 0 || y === 0) continue
    const x16 = x & 0xffff
    const y16 = y & 0xffff
    if (x16 < ((subX + 1) | 0)) continue
    if (y16 < ((subY + 1) | 0)) continue
    if (x16 >= ((subX + subW - 1) | 0)) continue
    if (y16 >= ((subY + subH - 1) | 0)) continue

    if (pfnCallback === 0 && (hooks === undefined || hooks.onObjectPosValidate === undefined)) {
      throw new D2CommonAssertError('Objects.cpp', 0x588)
    }
    const wHit = COLLISION_CheckMaskWithSizeXY113c(
      m,
      pRoom,
      x,
      y,
      (nSizeX + 6) | 0,
      (nSizeY + 6) | 0,
      0x3f11,
    ) & 0xffff
    if (wHit === 0) {
      const bOk =
        hooks !== undefined && hooks.onObjectPosValidate !== undefined
          ? hooks.onObjectPosValidate(m, nObjectId, pCallbackCtx, x, y) & 0xff
          : 1
      if (bOk !== 0) break
    }
  }

  if (attempt >= 5) return 0
  if (pRoom === 0) {
    throw new D2CommonAssertError('Objects.cpp', 0x593)
  }
  return allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nObjectId, x, y, 0)
}

/**
 * [44/45] Spawns a preset torch/brazier object at `(x, y)` in `pRoom` by rolling
 * act/level-specific object IDs on `pGame->pObjectControl->tSeed` (or keeping `0x173`).
 *
 * @va D2Game:0x6FC522B0
 */
export function OBJECTS_SpawnPresetTorchOrBrazier_6FC522B0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  nObjectId: number,
  x: number,
  y: number,
  _nInitMode = 0,
): number {
  const nLevelId0 = DUNGEON_GetLevelIdFromRoom113c(m, pRoom) | 0
  const nAct = DRLG_GetActNoFromLevelId113c(m, nLevelId0) & 0xff
  const pSeed = m.u32((pGame + 0x10f0) >>> 0) >>> 0
  const nLevelId = DUNGEON_GetLevelIdFromRoom113c(m, pRoom) | 0

  let nChosenObjId: number
  if (nAct === 1) {
    if (nLevelId === 0x4a) {
      const r = stepSeed64InMem113c(m, pSeed) & 3
      const table4A: readonly [number, number, number, number] = [0x183, 0x185, 0x186, 0x187]
      nChosenObjId = table4A[r]!
    } else {
      const r = stepSeed64InMem113c(m, pSeed) & 1
      nChosenObjId = r === 0 ? 0x57 : 0x58
    }
  } else if (nAct === 2) {
    if (nLevelId === 0x53) {
      const r = stepSeed64InMem113c(m, pSeed) & 3
      const table53: readonly [number, number, number, number] = [0x149, 0x14a, 0x14b, 0x14c]
      nChosenObjId = table53[r]!
    } else {
      const r = stepSeed64InMem113c(m, pSeed) & 1
      nChosenObjId = r === 0 ? 0xb5 : 0xb7
    }
  } else {
    const r = (stepSeed64InMem113c(m, pSeed) >>> 0) % 13
    const tableDefault: readonly number[] = [
      0x05, 0x06, 0x8b, 0x8c, 0x8d, 0x90, 0xb0, 0xb1, 0xc6, 0xf0, 0xf1, 0xf2, 0xf3,
    ]
    nChosenObjId = tableDefault[r]!
  }

  if ((nObjectId | 0) === 0x173) {
    nChosenObjId = 0x173
  }
  if (pRoom === 0) {
    throw new D2CommonAssertError('Objects.cpp', 0x157)
  }
  return allocInitAndPlaceObjectUnit113c(m, pGame, pRoom, nChosenObjId, x, y, 0)
}

/**
 * [45/45] Spawns a preset shrine object (`0x23E..0x243`) at `(x, y)` in `pRoom` using
 * the shrine group range table at `0x6FD1CCC0` and attaches its shrine record via
 * `UNITS_SetObjectShrineTxt113c`.
 *
 * @va D2Game:0x6FC525C0
 */
export function OBJECTS_SpawnPresetShrineFromGroup_6FC525C0_113c(
  m: D2KernMemory113c,
  pGame: number,
  pRoom: number,
  nObjectId: number,
  x: number,
  y: number,
  nInitMode = 0,
): number {
  const objId = nObjectId | 0
  if (objId < 0x23e || objId > 0x243) {
    return 0
  }
  if (pRoom === 0) {
    throw new D2CommonAssertError('Objects.cpp', 0xde)
  }

  const entry = PRESET_SHRINE_GROUP_TABLE_6FD1CCC0[objId - 0x23e]!
  const nActualClassId = entry[0]
  const nMinShrine = entry[1]
  const nMaxShrine = entry[2]

  const pUnit = allocInitAndPlaceObjectUnit113c(
    m,
    pGame,
    pRoom,
    nActualClassId,
    x,
    y,
    nInitMode,
  ) >>> 0
  if (pUnit === 0) return 0

  const nRange = (nMaxShrine - nMinShrine) | 0
  const nRoll = SEED_RollLimitedFast113c(m, (pUnit + 0x20) >>> 0, nRange) | 0
  let nShrineId = (nMinShrine + nRoll) | 0
  if (nShrineId === 5 || nShrineId === 4) {
    nShrineId = 2
  }
  const pObjData = m.u32((pUnit + 0x14) >>> 0) >>> 0
  m.setU8((pObjData + 0x04) >>> 0, nShrineId & 0xff)
  const pShrineTxt = DATATBLS_GetObjGroupTxtRecord113c(m, nShrineId) >>> 0
  UNITS_SetObjectShrineTxt113c(m, pUnit, pShrineTxt)
  return pUnit
}

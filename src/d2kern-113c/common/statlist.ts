/**
 * Diablo II v1.13c `D2StatListStrc` (`0x3C` bytes), `D2StatListExStrc` (`0x64` bytes),
 * `EvalStatWithOps` (`0x6FD89530` `op 1..13`), and `STATES` bitvectors (`185` states).
 *
 * Binary evidence (`D2Common.dll`, image base `0x6FD50000`, `kb/stats/d2common-statlist-struct-113c.md`):
 * - `#11013` (`0x6FD88100`): `STATLIST_AllocStatList` (`0x3C` bytes)
 * - `#11166` (`0x6FD8AF00`): `STATLIST_AllocStatListEx` (`0x64` bytes + `48`-byte `pStateFlags`)
 * - `0x6FD88270` / `0x6FD882B0`: signed 32-bit binary search on `dwKey = (statId << 16) | (layer & 0xFFFF)`
 * - `0x6FD88640` / `0x6FD881A0`: `D2StatStrc` array growth (`+4`) and shrink (`-4` when `cap - count > 8`)
 * - `#10188` (`0x6FD8A7B0` -> `0x6FD8A280`): `STATLIST_SetBaseStat` (always removes `newValue == 0` from `BaseStats`)
 * - `#10887` (`0x6FD8A740`): `STATLIST_SetUnitStat`
 * - `#10973` (`0x6FD88B70` -> `0x6FD88A80`): `STATLIST_GetUnitStat` (with `fMin` floor clamp on player/monster)
 * - `#10587` (`0x6FD88C20` -> `0x6FD88B00`): `STATLIST_GetUnitBaseStat` (with `fMin` floor clamp on player/monster)
 * - `0x6FD89530`: `EvalStatWithOps` (`op 1..13` jump table at `0x6FD89AF0`)
 * - `#10494` (`0x6FD83CD0`): `STATES_CheckState` (`dwUnitType` in `{0, 1, 3}`, `0 <= stateId < 185`)
 * - `0x6FD88730`: `STATES_ToggleState` (active dwords `[0..5]` + dirty/gfx dwords `[6..11]`)
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import {
  D2ActStrc,
  D2ActiveRoomStrc,
  D2CharStatsTxt,
  D2CharStatsTxt_SIZE,
  D2DrlgStrc,
  D2EnvironmentStrc,
  D2ItemDataStrc,
  D2RoomExStrc,
  D2StatListExStrc,
  D2StatListExStrc_SIZE,
  D2StatListStrc,
  D2StatListStrc_SIZE,
  D2UnitStrc,
} from '../mem/layout.generated.ts'
import {
  D2COMMON_GDWBITMASKS_IAT_VA_113C,
  D2COMMON_SGPT_DATATABLES_VA_113C,
  D2CommonAssertError,
  DATATABLES_OFF_113C,
} from './inline-helpers.ts'
import { imul32, mulDiv113c, sar32, shl32 } from './int-math.ts'
import {
  ITEMS_SetMagicPrefix113c,
  ITEMS_SetMagicSuffix113c,
  ITEMS_SetRarePrefix113c,
  ITEMS_SetRareSuffix113c,
} from './items.ts'
import { UNITROOM_RefreshUnit113c } from './unit.ts'
import {
  CANONICAL_CHAR_GROWTH_113C,
  CANONICAL_ITEM_STAT_COST_113C,
  CHAR_STATS_BIN_STRIDE_113C,
  CHAR_STATS_COUNT_113C,
  ISC_FLAG_CSV_SIGNED,
  ISC_FLAG_DAMAGE_RELATED,
  ISC_FLAG_DIRECT,
  ISC_FLAG_FCALLBACK,
  ISC_FLAG_FMIN,
  ISC_FLAG_ITEM_SPECIFIC,
  ISC_FLAG_RUNTIME_MAXHP,
  ISC_FLAG_RUNTIME_MAXMANA,
  ISC_FLAG_RUNTIME_MAXSTAM,
  ISC_FLAG_RUNTIME_MAXSTAT,
  ISC_FLAG_SAVED,
  ISC_FLAG_SEND_OTHER,
  ISC_FLAG_SIGNED,
  ISC_FLAG_UPDATE_ANIM_RATE,
  ITEM_STAT_COST_BIN_STRIDE_113C,
  ITEM_STAT_COST_COUNT_113C,
  STAT_ID_NONE_113C,
  parseCharStatsBin113c,
  parseItemStatCostBin113c,
  type CharStatsGrowthMeta113c,
  type ItemStatCostMeta113c,
} from '../tables/item-stat-cost-113c.ts'

export {
  CANONICAL_CHAR_GROWTH_113C,
  CANONICAL_ITEM_STAT_COST_113C,
  CHAR_STATS_BIN_STRIDE_113C,
  CHAR_STATS_COUNT_113C,
  ISC_FLAG_CSV_SIGNED,
  ISC_FLAG_DAMAGE_RELATED,
  ISC_FLAG_DIRECT,
  ISC_FLAG_FCALLBACK,
  ISC_FLAG_FMIN,
  ISC_FLAG_ITEM_SPECIFIC,
  ISC_FLAG_RUNTIME_MAXHP,
  ISC_FLAG_RUNTIME_MAXMANA,
  ISC_FLAG_RUNTIME_MAXSTAM,
  ISC_FLAG_RUNTIME_MAXSTAT,
  ISC_FLAG_SAVED,
  ISC_FLAG_SEND_OTHER,
  ISC_FLAG_SIGNED,
  ISC_FLAG_UPDATE_ANIM_RATE,
  ITEM_STAT_COST_BIN_STRIDE_113C,
  ITEM_STAT_COST_COUNT_113C,
  STAT_ID_NONE_113C,
  parseCharStatsBin113c,
  parseItemStatCostBin113c,
  type CharStatsGrowthMeta113c,
  type ItemStatCostMeta113c,
}

export const STATLIST_FLAG_TIMED = 0x00000002
export const STATLIST_FLAG_SET = 0x00002000
export const STATLIST_FLAG_DYNAMIC_OP = 0x20000000
export const STATLIST_FLAG_MERGED = 0x40000000
export const STATLIST_FLAG_EXTENDED = 0x80000000

export const STATES_COUNT_113C = 185 // [sgptDataTables+0xC4] = 185 (States.txt rows 0..184, 184 = uberminion)
export const STATE_DWORDS_113C = 6 // ceil(185 / 32) = 6 active dwords + 6 dirty/gfx dwords = 48 bytes

export interface StatOpEntry113c {
  readonly op: number // 1..13
  readonly opParam: number // shift parameter (`bOpParam`)
  readonly opBase: number // base stat ID (`wOpBase`, 0xFFFF if unused)
  readonly sourceStat: number // source stat ID (`wSourceStat`)
}

export class StatTableRegistry113c {
  private readonly meta = new Map<number, ItemStatCostMeta113c>()
  private readonly reverseOps = new Map<number, StatOpEntry113c[]>()
  private readonly baseDeps = new Map<number, number[]>()
  private readonly charGrowth: readonly CharStatsGrowthMeta113c[]

  constructor(
    entries: readonly ItemStatCostMeta113c[] = CANONICAL_ITEM_STAT_COST_113C,
    charGrowth: readonly CharStatsGrowthMeta113c[] = CANONICAL_CHAR_GROWTH_113C,
  ) {
    this.charGrowth = charGrowth
    for (const e of entries) {
      this.register(e)
    }
  }

  private removeContributions(statId: number, prev: ItemStatCostMeta113c): void {
    if (prev.opBase !== undefined && prev.opBase >= 0 && prev.opBase !== 0xffff) {
      const deps = this.baseDeps.get(prev.opBase)
      if (deps) {
        const idx = deps.indexOf(statId)
        if (idx >= 0) deps.splice(idx, 1)
      }
    }
    if (prev.opStats) {
      for (const targetStat of prev.opStats) {
        if (targetStat < 0 || targetStat === 0xffff) continue
        const rev = this.reverseOps.get(targetStat)
        if (rev) {
          for (let i = rev.length - 1; i >= 0; i--) {
            if (rev[i]!.sourceStat === statId) rev.splice(i, 1)
          }
        }
      }
    }
  }

  register(entry: ItemStatCostMeta113c): void {
    const prev = this.meta.get(entry.statId)
    if (prev !== undefined) {
      this.removeContributions(entry.statId, prev)
    }
    let postLoadFlags = entry.flags !== undefined ? entry.flags >>> 0 : 0
    const op = entry.op !== undefined ? entry.op : 0
    if (op >= 1 && op <= 13) {
      // 0x6FDC3CE3..0x6FDC3D35: table[wOpBase].wBaseDepStats (+0x5E) stores `entry.statId` (NOT targetStat!)
      if (entry.opBase !== undefined && entry.opBase >= 0 && entry.opBase !== 0xffff) {
        let deps = this.baseDeps.get(entry.opBase)
        if (!deps) {
          deps = []
          this.baseDeps.set(entry.opBase, deps)
        }
        if (deps.length < 64 && !deps.includes(entry.statId)) {
          deps.push(entry.statId)
        }
      }
      if (entry.opStats) {
        for (const targetStat of entry.opStats) {
          if (targetStat < 0 || targetStat === 0xffff) continue
          let rev = this.reverseOps.get(targetStat)
          if (!rev) {
            rev = []
            this.reverseOps.set(targetStat, rev)
          }
          if (rev.length < 16) {
            rev.push({
              op,
              opParam: entry.opParam !== undefined ? entry.opParam : 0,
              opBase: entry.opBase !== undefined ? entry.opBase : 0xffff,
              sourceStat: entry.statId,
            })
            // 0x6FDC3DA8..0x6FDC3E7A: post-load runtime `dwFlags` bits 5..8 for maxhp(7), maxmana(9), maxstamina(11)
            if (entry.statId === 7 || targetStat === 7) {
              postLoadFlags =
                (postLoadFlags | ISC_FLAG_RUNTIME_MAXHP | ISC_FLAG_RUNTIME_MAXSTAT) >>> 0
            } else if (entry.statId === 9 || targetStat === 9) {
              postLoadFlags =
                (postLoadFlags | ISC_FLAG_RUNTIME_MAXMANA | ISC_FLAG_RUNTIME_MAXSTAT) >>> 0
            } else if (entry.statId === 11 || targetStat === 11) {
              postLoadFlags =
                (postLoadFlags | ISC_FLAG_RUNTIME_MAXSTAM | ISC_FLAG_RUNTIME_MAXSTAT) >>> 0
            }
          }
        }
      }
    }
    const normalized: ItemStatCostMeta113c =
      entry.flags === postLoadFlags
        ? entry
        : {
            ...entry,
            flags: postLoadFlags,
            runtimeMaxStat: (postLoadFlags & ISC_FLAG_RUNTIME_MAXSTAT) !== 0,
            runtimeMaxHp: (postLoadFlags & ISC_FLAG_RUNTIME_MAXHP) !== 0,
            runtimeMaxMana: (postLoadFlags & ISC_FLAG_RUNTIME_MAXMANA) !== 0,
            runtimeMaxStam: (postLoadFlags & ISC_FLAG_RUNTIME_MAXSTAM) !== 0,
          }
    this.meta.set(entry.statId, normalized)
  }

  get size(): number {
    return this.meta.size
  }

  get(statId: number): ItemStatCostMeta113c | undefined {
    return this.meta.get(statId)
  }

  getReverseOps(targetStatId: number): readonly StatOpEntry113c[] {
    const rev = this.reverseOps.get(targetStatId)
    return rev !== undefined ? rev : []
  }

  /** `+0x5E..+0xDD` `wBaseDepStats[0..63]`: stats whose `wOpBase == baseStatId` (`0x6FDC3D06`). */
  getBaseDependents(baseStatId: number): readonly number[] {
    const deps = this.baseDeps.get(baseStatId)
    return deps !== undefined ? deps : []
  }

  getDependents(changedStatId: number): readonly number[] {
    const entry = this.meta.get(changedStatId)
    const out: number[] = []
    if (entry?.opStats) {
      for (const t of entry.opStats) {
        if (t >= 0 && t !== 0xffff && !out.includes(t)) out.push(t)
      }
    }
    const bDeps = this.baseDeps.get(changedStatId)
    if (bDeps) {
      for (const t of bDeps) {
        if (!out.includes(t)) out.push(t)
      }
    }
    return out
  }

  getCharGrowth(classId: number): CharStatsGrowthMeta113c | undefined {
    return this.charGrowth[classId]
  }
}

/**
 * Complete canonical 1.13c `ItemStatCost.bin` (`Patch_D2.mpq`, 359 rows × `0x144` bytes)
 * definitions verified byte-for-byte against `ItemStatCost.bin`.
 */
export const CANONICAL_CORE_STATS_113C: readonly ItemStatCostMeta113c[] = CANONICAL_ITEM_STAT_COST_113C

export const DEFAULT_STAT_REGISTRY_113C = new StatTableRegistry113c(
  CANONICAL_ITEM_STAT_COST_113C,
  CANONICAL_CHAR_GROWTH_113C,
)

/** Pack `(statId, layer)` into 1.13c `D2StatStrc.dwKey` (`(statId << 16) | (layer & 0xFFFF)`). */
export function statKey113c(statId: number, layer = 0): number {
  return (((statId & 0xffff) << 16) | (layer & 0xffff)) | 0
}

/**
 * `D2Common 0x6FD882B0`: exact signed 32-bit binary search on a `D2StatsArrayStrc` (`pArrayHdr`: `+0 pStat`, `+4 wCount`, `+6 wCap`).
 * Returns index `>= 0` if found, `-1` if absent.
 */
export function STATLIST_FindStatIndex113c(m: Memory113c, pArrayHdr: number, dwKey: number): number {
  const count = (m.u16(pArrayHdr + 4) << 16) >> 16 // movsx ecx, word ptr [esi + 4]
  if (count <= 0) return -1
  const pStat = m.u32(pArrayHdr)
  const target = dwKey | 0
  let lo = 0
  let hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const curKey = m.u32(pStat + mid * 8) | 0
    if (target < curKey) {
      hi = mid
    } else if (target > curKey) {
      lo = mid + 1
    } else {
      return mid
    }
  }
  return -1
}

/** `D2Common 0x6FD88270`: lower-bound insertion index under signed 32-bit `dwKey` ordering. */
export function STATLIST_FindInsertPos113c(m: Memory113c, pArrayHdr: number, dwKey: number): number {
  const count = (m.u16(pArrayHdr + 4) << 16) >> 16
  if (count <= 0) return 0
  const pStat = m.u32(pArrayHdr)
  const target = dwKey | 0
  let lo = 0
  let hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const curKey = m.u32(pStat + mid * 8) | 0
    if (target <= curKey) {
      hi = mid
    } else {
      lo = mid + 1
    }
  }
  return lo
}

/** `D2Common 0x6FD88640`: insert `dwKey` at `insertIdx` with initial value `0`, growing capacity in steps of `+4`. */
function insertStatSlot(m: Memory113c, pArrayHdr: number, insertIdx: number, dwKey: number): number {
  const count = (m.u16(pArrayHdr + 4) << 16) >> 16
  let cap = (m.u16(pArrayHdr + 6) << 16) >> 16
  let pStat = m.u32(pArrayHdr)
  if (count >= cap) {
    const newCap = cap + 4
    const nextBuf = m.alloc(newCap * 8)
    for (let i = 0; i < count * 8; i += 4) {
      m.setU32(nextBuf + i, m.u32(pStat + i))
    }
    pStat = nextBuf
    cap = newCap
    m.setU32(pArrayHdr, pStat)
    m.setU16(pArrayHdr + 6, cap & 0xffff)
  }
  for (let i = count; i > insertIdx; i--) {
    m.setU32(pStat + i * 8, m.u32(pStat + (i - 1) * 8))
    m.setU32(pStat + i * 8 + 4, m.u32(pStat + (i - 1) * 8 + 4))
  }
  m.setU32(pStat + insertIdx * 8, dwKey >>> 0)
  m.setU32(pStat + insertIdx * 8 + 4, 0)
  m.setU16(pArrayHdr + 4, (count + 1) & 0xffff)
  return pStat + insertIdx * 8
}

/** `D2Common 0x6FD881A0`: remove entry at `idx`, shrinking capacity by `-4` if `(cap - newCount) > 8`. */
function removeStatSlot(m: Memory113c, pArrayHdr: number, idx: number): void {
  const count = (m.u16(pArrayHdr + 4) << 16) >> 16
  if (idx < 0 || idx >= count) return
  let pStat = m.u32(pArrayHdr)
  for (let i = idx; i < count - 1; i++) {
    m.setU32(pStat + i * 8, m.u32(pStat + (i + 1) * 8))
    m.setU32(pStat + i * 8 + 4, m.u32(pStat + (i + 1) * 8 + 4))
  }
  const newCount = count - 1
  m.setU16(pArrayHdr + 4, newCount & 0xffff)
  const cap = (m.u16(pArrayHdr + 6) << 16) >> 16
  if (cap - newCount > 8) {
    const newCap = cap - 4
    const nextBuf = newCap > 0 ? m.alloc(newCap * 8) : 0
    for (let i = 0; i < newCount * 8; i += 4) {
      m.setU32(nextBuf + i, m.u32(pStat + i))
    }
    m.setU32(pArrayHdr, nextBuf)
    m.setU16(pArrayHdr + 6, newCap & 0xffff)
  }
}

function readStatFromArray(m: Memory113c, pArrayHdr: number, dwKey: number): number {
  const idx = STATLIST_FindStatIndex113c(m, pArrayHdr, dwKey)
  if (idx < 0) return 0
  const pStat = m.u32(pArrayHdr)
  return m.u32(pStat + idx * 8 + 4) | 0
}

function writeFullStat(
  m: Memory113c,
  pListEx: number,
  dwKey: number,
  value: number,
  keepZero: boolean,
  hasItemDynamicOp = false,
): void {
  const pFullHdr = pListEx + D2StatListExStrc.pFullStat.off
  const idx = STATLIST_FindStatIndex113c(m, pFullHdr, dwKey)
  const val = value | 0
  if (val === 0 && !keepZero) {
    if (idx >= 0) removeStatSlot(m, pFullHdr, idx)
    return
  }
  if (idx >= 0) {
    const pStat = m.u32(pFullHdr)
    m.setU32(pStat + idx * 8 + 4, val >>> 0)
  } else {
    const ins = STATLIST_FindInsertPos113c(m, pFullHdr, dwKey)
    const entryPtr = insertStatSlot(m, pFullHdr, ins, dwKey)
    m.setU32(entryPtr + 4, val >>> 0)
  }
  if (val !== 0 && hasItemDynamicOp) {
    // 0x6FD88997..0x6FD8899E: if `isc[+0x53] != 0` (`op == 4 || op == 5`), set `0x20000000`
    m.set(
      pListEx,
      D2StatListStrc.dwFlags,
      (m.get(pListEx, D2StatListStrc.dwFlags) | STATLIST_FLAG_DYNAMIC_OP) >>> 0,
    )
  }
}

/**
 * `D2Common 0x6FD889E0` (`STATLIST_AddFullStatDelta`):
 * Direct additive fast-path on `pListEx->FullStats` (`+0x48`) used by `0x6FD89F70` when neither
 * `bHasOpStat` (`+0x51`) nor `bIsOpTarget` (`+0x52`) is set on the `ItemStatCostTxt` record.
 */
function addFullStatDelta(
  m: Memory113c,
  pListEx: number,
  dwKey: number,
  delta: number,
  keepZero: boolean,
  hasItemDynamicOp = false,
): void {
  const pFullHdr = pListEx + D2StatListExStrc.pFullStat.off
  let idx = STATLIST_FindStatIndex113c(m, pFullHdr, dwKey)
  let entryPtr = 0
  if (idx >= 0) {
    entryPtr = m.u32(pFullHdr) + idx * 8
  } else {
    const ins = STATLIST_FindInsertPos113c(m, pFullHdr, dwKey)
    entryPtr = insertStatSlot(m, pFullHdr, ins, dwKey)
    idx = ins
  }
  const prevVal = m.u32(entryPtr + 4) | 0
  const nextVal = (prevVal + (delta | 0)) | 0
  m.setU32(entryPtr + 4, nextVal >>> 0)
  if (nextVal > 0 && hasItemDynamicOp) {
    // 0x6FD88A17..0x6FD88A24: `jle` skips when `nextVal <= 0`
    m.set(
      pListEx,
      D2StatListStrc.dwFlags,
      (m.get(pListEx, D2StatListStrc.dwFlags) | STATLIST_FLAG_DYNAMIC_OP) >>> 0,
    )
  }
  if (nextVal === 0 && !keepZero) {
    removeStatSlot(m, pFullHdr, idx)
  }
}

/** `D2Common.#11013` (`0x6FD88100`): allocate base `D2StatListStrc` (`0x3C` bytes). */
export function STATLIST_AllocList113c(
  m: Memory113c,
  flags = 0,
  ownerType = 6,
  ownerId = 0,
  stateNo = 0,
  expireFrame = 0,
): number {
  const pList = m.alloc(D2StatListStrc_SIZE)
  let fl = flags >>> 0
  if (expireFrame > 0) fl = (fl | STATLIST_FLAG_TIMED) >>> 0
  m.set(pList, D2StatListStrc.eOwnerType, ownerType >>> 0)
  m.set(pList, D2StatListStrc.dwOwnerId, ownerId >>> 0)
  m.set(pList, D2StatListStrc.dwFlags, fl)
  m.set(pList, D2StatListStrc.dwStateNo, stateNo >>> 0)
  m.set(pList, D2StatListStrc.dwExpireFrame, expireFrame >>> 0)
  return pList
}

/** `D2Common.#11166` (`0x6FD8AF00`): allocate `D2StatListExStrc` (`0x64` bytes + `48`-byte `pStateFlags`) and attach to `pOwner`. */
export function STATLIST_CreateEx113c(
  m: Memory113c,
  pOwner: number,
  argFlags = 0,
  pGame = 0,
): number {
  const pListEx = m.alloc(D2StatListExStrc_SIZE)
  const pStateFlags = m.alloc(STATE_DWORDS_113C * 2 * 4) // 48 bytes: [0..5] active, [6..11] dirty/gfx
  const ownerType = pOwner !== 0 ? m.get(pOwner, D2UnitStrc.dwUnitType) : 6
  const ownerId = pOwner !== 0 ? m.get(pOwner, D2UnitStrc.dwUnitId) : 0
  const dwFlags = ((argFlags & 1) | STATLIST_FLAG_EXTENDED) >>> 0

  m.set(pListEx, D2StatListExStrc.eOwnerType, ownerType)
  m.set(pListEx, D2StatListExStrc.dwOwnerId, ownerId)
  m.set(pListEx, D2StatListExStrc.dwFlags, dwFlags)
  m.set(pListEx, D2StatListExStrc.pOwner, pOwner)
  m.set(pListEx, D2StatListExStrc.pStateFlags, pStateFlags)
  m.set(pListEx, D2StatListExStrc.pGame, pGame)
  if (pOwner !== 0) {
    m.set(pOwner, D2UnitStrc.pStatListEx, pListEx)
  }
  return pListEx
}

/**
 * `D2Common 0x6FD87470` (`ENVIRONMENT_GetTimeOfDayAndAngle`):
 * Reads `pEnv = pAct->pEnvironment` (`+0x04`), returns `nTimeOfDay` (`+0x04`) and `nAngle`
 * (`pEnv->dwCyclePeriod != 0 ? trunc(pEnv->dwTicks / pEnv->dwCyclePeriod) : 0`).
 */
export function ENVIRONMENT_GetTimeOfDayAndAngle113c(
  m: Memory113c,
  pAct: number,
): { readonly timeOfDay: number; readonly angle: number } {
  if (pAct === 0) return { timeOfDay: 0, angle: 0 }
  const pEnv = m.get(pAct, D2ActStrc.pEnvironment)
  if (pEnv === 0) return { timeOfDay: 0, angle: 0 }
  const period = m.get(pEnv, D2EnvironmentStrc.dwCyclePeriod) | 0
  const ticks = m.get(pEnv, D2EnvironmentStrc.dwTicks) | 0
  const angle = period !== 0 ? Math.trunc(ticks / period) | 0 : 0
  const timeOfDay = m.get(pEnv, D2EnvironmentStrc.nTimeOfDay) | 0
  return { timeOfDay, angle }
}

/**
 * `D2Common.#10449` (`0x6FD96330` `ITEMS_CalcByTimeStat`):
 * Unpacks packed `(period:2, min:10, max:10)` signed `[-256, 767]` range from `rawValue`,
 * snaps `|nAngle - period * 90|` to 15-degree steps (`(delta + 7) / 15 * 15`), clamps to `[0, 359]`,
 * folds `(180, 359]` via `360 - step`, and interpolates `max - trunc(((max - min) * step) / 180)`.
 */
export function ITEMS_CalcByTimeStat113c(
  rawValue: number,
  _nTimeOfDay: number,
  nAngle: number,
): number {
  const raw = rawValue | 0
  const period = raw & 3
  const minVal = (((raw >> 2) & 0x3ff) - 0x100) | 0
  const maxVal = (((raw >> 12) & 0x3ff) - 0x100) | 0
  let delta = ((nAngle | 0) - imul32(period, 90)) | 0
  if (delta < 0) delta = (-delta) | 0
  const plus7 = (delta + 7) | 0
  let step = imul32(Math.trunc(plus7 / 15) | 0, 15)
  if (step <= 0) {
    step = 0
  } else if (step >= 0x167) {
    step = 0x168 - 0x167
  } else if (step > 0xb4) {
    step = (0x168 - step) | 0
  }
  const prod = imul32((maxVal - minVal) | 0, step)
  const scaled = Math.trunc(prod / 180) | 0
  return (maxVal - scaled) | 0
}

/**
 * `D2Common 0x6FD88CD0`: sum `dwKey` across `pList`'s own `BaseStats` (`+0x24`) and, when extended,
 * all active sub-lists chained from `pMyLastList` (`+0x3C`) along `pPrevLink` (`+0x2C`), skipping
 * `STATLIST_FLAG_MERGED` (`0x40000000`, `bType == 0` non-active weapon/armor merge) when
 * `ISC_FLAG_DAMAGE_RELATED` (`0x04`, `gdwBitMasks[2]`) is set (`0x6FD88D04..0x6FD88D3B`).
 */
export function STATLIST_SumDirectAndSubLists113c(
  m: Memory113c,
  pList: number,
  dwKey: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): number {
  let sum = readStatFromArray(m, pList + D2StatListStrc.pStat.off, dwKey)
  const flags = m.get(pList, D2StatListStrc.dwFlags)
  if ((flags & STATLIST_FLAG_EXTENDED) === 0) {
    return sum | 0
  }
  const statId = (dwKey >>> 16) & 0xffff
  const meta = registry.get(statId)
  const metaFlags = meta !== undefined && meta.flags !== undefined ? meta.flags : 0
  const isDamageRelated = (metaFlags & ISC_FLAG_DAMAGE_RELATED) !== 0
  // Walk sub-lists (`pMyLastList` via `pPrevLink` `+0x2C` per `0x6FD88D23..0x6FD88D99`)
  for (
    let sub = m.get(pList, D2StatListExStrc.pMyLastList);
    sub !== 0;
    sub = m.get(sub, D2StatListStrc.pPrevLink)
  ) {
    const subFlags = m.get(sub, D2StatListStrc.dwFlags)
    if (isDamageRelated && (subFlags & STATLIST_FLAG_MERGED) !== 0) {
      continue
    }
    const pSubHdr =
      (subFlags & STATLIST_FLAG_EXTENDED) !== 0
        ? sub + D2StatListExStrc.pFullStat.off
        : sub + D2StatListStrc.pStat.off
    sum = (sum + readStatFromArray(m, pSubHdr, dwKey)) | 0
  }
  return sum | 0
}

/**
 * `D2Common 0x6FD89530` (`EvalStatWithOps`): exact implementation of the 13-entry jump table
 * at `0x6FD89AF0` (`op 1..13`).
 */
export function EvalStatWithOps113c(
  m: Memory113c,
  pList: number,
  dwKey: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): number {
  const statId = (dwKey >>> 16) & 0xffff
  const rawBaseSum = STATLIST_SumDirectAndSubLists113c(m, pList, dwKey, registry)
  const revOps = registry.getReverseOps(statId)
  if (revOps.length === 0) {
    return rawBaseSum | 0
  }

  let total = rawBaseSum | 0
  let baseRef = rawBaseSum | 0
  const isEx = (m.get(pList, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) !== 0
  const pOwner = isEx ? m.get(pList, D2StatListExStrc.pOwner) : 0
  const ownerType = m.get(pList, D2StatListStrc.eOwnerType)

  for (const r of revOps) {
    const srcKey = statKey113c(r.sourceStat, 0)
    switch (r.op) {
      case 1: {
        // 0x6FD895D0: mulDiv113c(srcVal, baseRef, 100)
        if (pOwner === 0) break
        if (m.get(pOwner, D2UnitStrc.dwUnitType) === 4) {
          baseRef = STATLIST_GetUnitBaseStat113c(m, pOwner, statId, 0, registry)
        }
        if (baseRef === 0) break
        const srcVal = EvalStatWithOps113c(m, pList, srcKey, registry)
        if (srcVal !== 0) {
          total = (total + mulDiv113c(srcVal, baseRef, 100)) | 0
        }
        break
      }
      case 2:
      case 3: {
        // 0x6FD8960D / 0x6FD896AA: (srcVal * (opBase >> valShift)) >> opParam
        if ((ownerType !== 0 && ownerType !== 1) || r.opBase === 0xffff) break
        const pArr = isEx
          ? pList + D2StatListExStrc.pFullStat.off
          : pList + D2StatListStrc.pStat.off
        // Read opBase (evaluate if not yet materialized in FullStats)
        let opBaseRaw = readStatFromArray(m, pArr, statKey113c(r.opBase, 0))
        if (opBaseRaw === 0 && isEx) {
          opBaseRaw = EvalStatWithOps113c(m, pList, statKey113c(r.opBase, 0), registry)
        }
        const opBaseMeta = registry.get(r.opBase)
        const bValShift =
          opBaseMeta !== undefined && opBaseMeta.valShift !== undefined ? opBaseMeta.valShift : 0
        const opBaseShifted = sar32(opBaseRaw, bValShift)
        if (opBaseShifted <= 0) break
        const srcVal = EvalStatWithOps113c(m, pList, srcKey, registry)
        if (srcVal === 0) break
        const scaled = sar32(imul32(srcVal, opBaseShifted), r.opParam)
        if (r.op === 2) {
          total = (total + scaled) | 0
        } else if (baseRef !== 0) {
          total = (total + mulDiv113c(scaled, baseRef, 100)) | 0
        }
        break
      }
      case 4:
      case 5: {
        // 0x6FD8974B / 0x6FD897DD: item sub-list attached via `pList->pUnit (+0x04)`
        const pAttachUnit = m.get(pList, D2StatListStrc.pUnit)
        if (pAttachUnit === 0 || r.opBase === 0xffff) break
        const uType = m.get(pAttachUnit, D2UnitStrc.dwUnitType)
        if (uType !== 0 && uType !== 1) break
        const opBaseRaw = STATLIST_GetUnitStat113c(m, pAttachUnit, r.opBase, 0, registry)
        const opBaseMeta = registry.get(r.opBase)
        const bValShift =
          opBaseMeta !== undefined && opBaseMeta.valShift !== undefined ? opBaseMeta.valShift : 0
        const opBaseShifted = sar32(opBaseRaw, bValShift)
        if (opBaseShifted <= 0) break
        const srcVal = EvalStatWithOps113c(m, pList, srcKey, registry)
        if (srcVal === 0) break
        const scaled = sar32(imul32(srcVal, opBaseShifted), r.opParam)
        if (r.op === 4) {
          total = (total + scaled) | 0
        } else if (baseRef !== 0) {
          total = (total + mulDiv113c(scaled, baseRef, 100)) | 0
        }
        break
      }
      case 6:
      case 7: {
        // 0x6FD89872 / 0x6FD898D2: by-time scaling via 0x6FD87470 + 0x6FD96330
        if (pOwner === 0) break
        const pAct = m.get(pOwner, D2UnitStrc.pAct)
        const srcMeta = registry.get(r.sourceStat)
        if (pAct === 0 && !srcMeta?.evalByTime) break
        const srcVal = EvalStatWithOps113c(m, pList, srcKey, registry)
        if (srcVal === 0) break
        let byTime: number
        if (pAct !== 0) {
          const env = ENVIRONMENT_GetTimeOfDayAndAngle113c(m, pAct)
          byTime = ITEMS_CalcByTimeStat113c(srcVal, env.timeOfDay, env.angle)
        } else {
          byTime = srcMeta!.evalByTime!(pOwner, srcVal)
        }
        if (r.op === 6) {
          total = (total + byTime) | 0
        } else {
          // 0x6FD8992C..0x6FD8993E: op 7 scales running `total` ([esp+0x10]), NOT `baseRef`!
          total = (total + mulDiv113c(byTime, total, 100)) | 0
        }
        break
      }
      case 8: {
        // 0x6FD89947: non-base energy -> maxmana (`(fullEnergy - baseEnergy) * ManaPerMagic << 6`)
        if (pOwner === 0 || m.get(pOwner, D2UnitStrc.dwUnitType) !== 0) break
        const growth = registry.getCharGrowth(m.get(pOwner, D2UnitStrc.dwClassId))
        if (!growth) break
        const baseEne = readStatFromArray(m, pList + D2StatListStrc.pStat.off, srcKey)
        const fullEne = EvalStatWithOps113c(m, pList, srcKey, registry)
        const nonBase = (fullEne - baseEne) | 0
        if (nonBase !== 0) {
          total = (total + shl32(imul32(growth.manaPerMagic, nonBase), 6)) | 0
        }
        break
      }
      case 9: {
        // 0x6FD899C3: non-base vitality -> maxstamina (statId==11) or maxhp (`<< 6`)
        if (pOwner === 0 || m.get(pOwner, D2UnitStrc.dwUnitType) !== 0) break
        const growth = registry.getCharGrowth(m.get(pOwner, D2UnitStrc.dwClassId))
        if (!growth) break
        const baseVit = readStatFromArray(m, pList + D2StatListStrc.pStat.off, srcKey)
        const fullVit = EvalStatWithOps113c(m, pList, srcKey, registry)
        const nonBase = (fullVit - baseVit) | 0
        if (nonBase !== 0) {
          const factor = statId === 11 ? growth.staminaPerVitality : growth.lifePerVitality
          total = (total + shl32(imul32(factor, nonBase), 6)) | 0
        }
        break
      }
      case 10:
      case 12:
        // 0x6FD89ACF: no-op in 1.13c
        break
      case 11: {
        // 0x6FD89A5C: player/monster percentage bonus
        if (baseRef === 0 || pOwner === 0) break
        const uType = m.get(pOwner, D2UnitStrc.dwUnitType)
        if (uType !== 0 && uType !== 1) break
        const srcVal = EvalStatWithOps113c(m, pList, srcKey, registry)
        if (srcVal !== 0) {
          total = (total + mulDiv113c(srcVal, baseRef, 100)) | 0
        }
        break
      }
      case 13: {
        // 0x6FD89A87: local item percentage bonus (`dwUnitType == 4`)
        if (pOwner === 0 || m.get(pOwner, D2UnitStrc.dwUnitType) !== 4) break
        baseRef = STATLIST_GetUnitBaseStat113c(m, pOwner, statId, 0, registry)
        if (baseRef === 0) break
        const srcVal = EvalStatWithOps113c(m, pList, srcKey, registry)
        if (srcVal !== 0) {
          total = (total + mulDiv113c(srcVal, baseRef, 100)) | 0
        }
        break
      }
    }
  }
  return total | 0
}

/**
 * `D2Common 0x6FD89CE0..0x6FD89F48` (`STATLIST_RecomputeExStat`):
 * Evaluates `dwKey` via `EvalStatWithOps` (`0x6FD89530`), propagates to `wOpStat[0..2]` (`+0x58`),
 * applies the exact carrier-suppression switch (`0x6FD89F48` / `0x6FD89F60`), and updates
 * `wBaseDepStats[0..63]` (`+0x5E`).
 */
export function STATLIST_RecomputeExStat113c(
  m: Memory113c,
  pListEx: number,
  statId: number,
  layer = 0,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
  visited = new Set<number>(),
): number {
  if ((m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) return 0
  const key = statKey113c(statId, layer)
  if (visited.has(key)) {
    return EvalStatWithOps113c(m, pListEx, key, registry)
  }
  visited.add(key)

  const val = EvalStatWithOps113c(m, pListEx, key, registry)
  const meta = registry.get(statId)
  const keepZero = meta !== undefined && meta.keepZero !== undefined ? meta.keepZero : false
  const op = meta !== undefined && meta.op !== undefined ? meta.op : 0
  const opStats = meta !== undefined && meta.opStats !== undefined ? meta.opStats : []
  const baseDeps = registry.getBaseDependents(statId)
  const hasOpStat = (op >= 1 && op <= 13 && opStats.length > 0) || baseDeps.length > 0

  const hasDynOp = op === 4 || op === 5
  if (!hasOpStat) {
    // 0x6FD89CFD: byte [esi + 0x51] == 0 -> write directly to FullStats and return
    writeFullStat(m, pListEx, key, val, keepZero, hasDynOp)
  } else {
    // 0x6FD89D1E: if evaluated carrier == 0, clear stale FullStats slot immediately
    if (val === 0) {
      writeFullStat(m, pListEx, key, 0, keepZero, hasDynOp)
    }
    let keepCarrier = true // [esp + 0x10] = 1 at 0x6FD89D38
    const flags = m.get(pListEx, D2StatListStrc.dwFlags)
    const ownerType = m.get(pListEx, D2StatListStrc.eOwnerType)
    const selfRevOps = registry.getReverseOps(statId)

    for (let i = 0; i < 3 && i < opStats.length; i++) {
      const targetStat = opStats[i]!
      if (targetStat < 0 || targetStat === 0xffff) break
      const targetKey = statKey113c(targetStat, 0)
      const targetVal = STATLIST_RecomputeExStat113c(m, pListEx, targetStat, 0, registry, visited)
      const targetMeta = registry.get(targetStat)
      const targetKeepZero =
        targetMeta !== undefined && targetMeta.keepZero !== undefined ? targetMeta.keepZero : false
      const targetDynOp = targetMeta !== undefined && (targetMeta.op === 4 || targetMeta.op === 5)
      writeFullStat(m, pListEx, targetKey, targetVal, targetKeepZero, targetDynOp)

      if (targetVal !== 0) {
        // 0x6FD89DBB..0x6FD89E65: jump table 0x6FD89F48 indexed by 0x6FD89F60[bOp]
        // Note 0x6FD89DEA / 0x6FD89E38: 1.13c reads `word [esi + 0xDE + i*6]` (`unk_DE[i].wOpBase`,
        // zero-initialized to stat 0 `strength` unless another stat targets this carrier).
        const revEntry = selfRevOps[i]
        const unkDeBase = revEntry !== undefined ? revEntry.opBase : 0
        switch (op) {
          case 1:
          case 12:
            keepCarrier = false
            break
          case 2:
          case 3: {
            if ((ownerType === 0 || ownerType === 1) && unkDeBase !== 0xffff) {
              const checkHdr =
                (flags & STATLIST_FLAG_EXTENDED) !== 0
                  ? pListEx + D2StatListExStrc.pFullStat.off
                  : pListEx + D2StatListStrc.pStat.off
              if (readStatFromArray(m, checkHdr, statKey113c(unkDeBase, 0)) > 0) {
                keepCarrier = false
              }
            }
            break
          }
          case 4:
          case 5: {
            const pEquipUnit = m.get(pListEx, D2StatListStrc.pUnit)
            if (pEquipUnit !== 0 && unkDeBase !== 0xffff) {
              const eqType = m.get(pEquipUnit, D2UnitStrc.dwUnitType)
              if (
                (eqType === 0 || eqType === 1) &&
                STATLIST_GetUnitStat113c(m, pEquipUnit, unkDeBase, 0, registry) > 0
              ) {
                keepCarrier = false
              }
            }
            break
          }
          case 6:
          case 7:
            if (ownerType === 0 || ownerType === 1) {
              keepCarrier = false
            }
            break
          case 13:
            if (ownerType === 4) {
              keepCarrier = false
            }
            break
        }
      }
    }

    // 0x6FD89E9D..0x6FD89F36: write carrier if unconsumed, then recompute wBaseDepStats[0..63] (+0x5E)
    if (keepCarrier && val !== 0) {
      writeFullStat(m, pListEx, key, val, keepZero, hasDynOp)
      for (const depStat of baseDeps) {
        const depKey = statKey113c(depStat, 0)
        const depVal = STATLIST_RecomputeExStat113c(m, pListEx, depStat, 0, registry, visited)
        const depMeta = registry.get(depStat)
        const depKeepZero =
          depMeta !== undefined && depMeta.keepZero !== undefined ? depMeta.keepZero : false
        const depDynOp = depMeta !== undefined && (depMeta.op === 4 || depMeta.op === 5)
        writeFullStat(m, pListEx, depKey, depVal, depKeepZero, depDynOp)
      }
    }
  }
  return val
}

/**
 * `D2Common 0x6FD89F70` (`STATLIST_PropagateDelta`):
 * Propagates `(dwKey, delta)` from `pStartList` up the `pParent` (`+0x34`) chain:
 * - If `bHasOpStat == 0` (`+0x51`) and `bIsOpTarget == 0` (`+0x52`), applies additive fast-path
 *   `0x6FD889E0` (`addFullStatDelta(cur, dwKey, delta)`).
 * - Otherwise calls `0x6FD89CE0` (`STATLIST_RecomputeExStat113c(cur, statId, layer)`).
 * - Stops climbing `pParent` when `STATLIST_FLAG_SET` (`0x2000`) or
 *   (`ISC_FLAG_DAMAGE_RELATED` (`0x04`) && `STATLIST_FLAG_MERGED` (`0x40000000`)) is set on `cur`.
 */
export function STATLIST_PropagateDelta113c(
  m: Memory113c,
  pStartList: number,
  statId: number,
  layer: number,
  delta: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): void {
  const d = delta | 0
  if (pStartList === 0 || d === 0 || statId < 0) return
  const meta = registry.get(statId)
  if (!meta) return
  const startFlags = m.get(pStartList, D2StatListStrc.dwFlags)
  if ((startFlags & STATLIST_FLAG_SET) !== 0) return

  const metaFlags = meta.flags !== undefined ? meta.flags : 0
  const isDamageRelated = (metaFlags & ISC_FLAG_DAMAGE_RELATED) !== 0
  const keepZero = meta.keepZero !== undefined ? meta.keepZero : false
  const op = meta.op !== undefined ? meta.op : 0
  const opStats = meta.opStats !== undefined ? meta.opStats : []
  const baseDeps = registry.getBaseDependents(statId)
  const bHasOpStat = (op >= 1 && op <= 13 && opStats.length > 0) || baseDeps.length > 0
  const bIsOpTarget = registry.getReverseOps(statId).length > 0
  const hasDynOp = op === 4 || op === 5
  const key = statKey113c(statId, layer)

  let cur =
    (startFlags & STATLIST_FLAG_EXTENDED) !== 0
      ? pStartList
      : m.get(pStartList, D2StatListStrc.pParent)

  while (cur !== 0) {
    if (!bHasOpStat && !bIsOpTarget) {
      addFullStatDelta(m, cur, key, d, keepZero, hasDynOp)
    } else {
      STATLIST_RecomputeExStat113c(m, cur, statId, layer, registry, new Set<number>())
    }
    const curFlags = m.get(cur, D2StatListStrc.dwFlags)
    cur = m.get(cur, D2StatListStrc.pParent)
    if ((curFlags & STATLIST_FLAG_SET) !== 0) break
    if (isDamageRelated && (curFlags & STATLIST_FLAG_MERGED) !== 0) break
  }
}

function collectSubListEntries113c(
  m: Memory113c,
  pSubList: number,
  registry: StatTableRegistry113c,
  skipDamageRelated: boolean,
): Array<readonly [number, number]> {
  const subFlags = m.get(pSubList, D2StatListStrc.dwFlags)
  const pHdr =
    (subFlags & STATLIST_FLAG_EXTENDED) !== 0
      ? pSubList + D2StatListExStrc.pFullStat.off
      : pSubList + D2StatListStrc.pStat.off
  const n = (m.u16(pHdr + 4) << 16) >> 16
  const p = m.u32(pHdr)
  const out: Array<readonly [number, number]> = []
  for (let i = 0; i < n; i++) {
    const k = m.u32(p + i * 8) | 0
    const v = m.u32(p + i * 8 + 4) | 0
    if (skipDamageRelated) {
      const sid = (k >>> 16) & 0xffff
      const sidMeta = registry.get(sid)
      const sidFlags = sidMeta !== undefined && sidMeta.flags !== undefined ? sidMeta.flags : 0
      if ((sidFlags & ISC_FLAG_DAMAGE_RELATED) !== 0) continue
    }
    out.push([k, v])
  }
  return out
}

function collectListStatKeys(
  m: Memory113c,
  pList: number,
  keys: Set<number>,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
  skipDamageRelated = false,
): void {
  const collectHdr = (pHdr: number): void => {
    const n = (m.u16(pHdr + 4) << 16) >> 16
    const p = m.u32(pHdr)
    for (let i = 0; i < n; i++) {
      const k = m.u32(p + i * 8) | 0
      if (skipDamageRelated) {
        const sid = (k >>> 16) & 0xffff
        const sidMeta = registry.get(sid)
        const sidFlags = sidMeta !== undefined && sidMeta.flags !== undefined ? sidMeta.flags : 0
        if ((sidFlags & ISC_FLAG_DAMAGE_RELATED) !== 0) continue
      }
      keys.add(k)
    }
  }
  collectHdr(pList + D2StatListStrc.pStat.off)
  if ((m.get(pList, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) !== 0) {
    collectHdr(pList + D2StatListExStrc.pFullStat.off)
  }
}

function recomputeItemDynamicOps113c(
  m: Memory113c,
  pSubList: number,
  registry: StatTableRegistry113c,
): void {
  const subFlags = m.get(pSubList, D2StatListStrc.dwFlags)
  if ((subFlags & STATLIST_FLAG_EXTENDED) === 0 || (subFlags & STATLIST_FLAG_DYNAMIC_OP) === 0) {
    return
  }
  const pFullHdr = pSubList + D2StatListExStrc.pFullStat.off
  const n = (m.u16(pFullHdr + 4) << 16) >> 16
  const p = m.u32(pFullHdr)
  const dynKeys: number[] = []
  for (let i = 0; i < n; i++) {
    const k = m.u32(p + i * 8) | 0
    const sid = (k >>> 16) & 0xffff
    const sidMeta = registry.get(sid)
    const op = sidMeta !== undefined && sidMeta.op !== undefined ? sidMeta.op : 0
    if (op === 4 || op === 5) {
      dynKeys.push(k)
    }
  }
  for (const k of dynKeys) {
    const sid = (k >>> 16) & 0xffff
    const layer = k & 0xffff
    STATLIST_RecomputeExStat113c(m, pSubList, sid, layer, registry, new Set<number>())
  }
}

/** Recompute all keys present on `pListEx` and its sub-lists (plus optional `extraKeys` from a detached sub-list). */
export function STATLIST_RebuildAllExStats113c(
  m: Memory113c,
  pListEx: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
  extraKeys?: Iterable<number>,
): void {
  if (pListEx === 0 || (m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) return
  const keys = new Set<number>(extraKeys)
  collectListStatKeys(m, pListEx, keys, registry, false)
  for (
    let sub = m.get(pListEx, D2StatListExStrc.pMyLastList);
    sub !== 0;
    sub = m.get(sub, D2StatListStrc.pPrevLink)
  ) {
    const subMerged = (m.get(sub, D2StatListStrc.dwFlags) & STATLIST_FLAG_MERGED) !== 0
    collectListStatKeys(m, sub, keys, registry, subMerged)
  }
  const plainKeys: number[] = []
  const opTargetKeys: number[] = []
  for (const k of keys) {
    const statId = (k >>> 16) & 0xffff
    if (registry.getReverseOps(statId).length === 0) {
      plainKeys.push(k)
    } else {
      opTargetKeys.push(k)
    }
  }
  for (const k of plainKeys) {
    STATLIST_RecomputeExStat113c(m, pListEx, (k >>> 16) & 0xffff, k & 0xffff, registry, new Set<number>())
  }
  for (const k of opTargetKeys) {
    STATLIST_RecomputeExStat113c(m, pListEx, (k >>> 16) & 0xffff, k & 0xffff, registry, new Set<number>())
  }
}

/**
 * `D2Common 0x6FD88160`: binary search `pModStat` (`pListEx + 0x50`: `+0 pModStat`, `+4 wModStatCount`, `+6 wModStatCap`)
 * under signed 32-bit `dwKey` ordering. Returns `-1` if `dwKey` is already present (`0x6FD88195`),
 * or the sorted insertion index `0 <= ins <= count` (`0x6FD88190`).
 */
export function STATLIST_FindModStatInsertPos113c(
  m: Memory113c,
  pModHdr: number,
  dwKey: number,
): number {
  const count = (m.u16(pModHdr + 4) << 16) >> 16
  if (count <= 0) return 0
  const pMod = m.u32(pModHdr)
  const target = dwKey | 0
  let lo = 0
  let hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const curKey = m.u32(pMod + mid * 4) | 0
    if (target > curKey) {
      lo = mid + 1
    } else if (target < curKey) {
      hi = mid
    } else {
      return -1
    }
  }
  return lo
}

/**
 * `@va D2Common:0x6FD88550` (`STATLIST_RecordModStat`, `ebx = pListEx`, `eax = dwKey`):
 * Records `dwKey` in `pListEx->pModStat` (`+0x50` ptr, `+0x54` `wModStatCount`, `+0x56` `wModStatCap`)
 * when `pListEx` is extended, `statId` is not in `{6, 8, 10, 13, 14}` (`0x6FD88568..0x6FD88577`),
 * `0 <= statId < 359`, and `ItemStatCost.bin[statId].dwFlags & ISC_FLAG_SAVED` (`0x1000`, `0x6FD885AA`) is set.
 * Grows `pModStat` by `+4` dwords (`newCap * 4` bytes) when `count >= cap` (`0x6FD885CB..0x6FD885F8`).
 */
export function STATLIST_RecordModStat113c(
  m: Memory113c,
  pListEx: number,
  dwKey: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): void {
  if (pListEx === 0) return
  if ((m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) return
  const statId = (dwKey >>> 16) & 0xffff
  // 0x6FD88568..0x6FD88577 jump table at 0x6FD88628 / 0x6FD88630: skip 6, 8, 10, 13, 14
  if (statId === 6 || statId === 8 || statId === 10 || statId === 13 || statId === 14) {
    return
  }
  if ((statId | 0) < 0 || statId >= ITEM_STAT_COST_COUNT_113C) return
  const meta = registry.get(statId)
  if (meta === undefined) return
  const metaFlags = meta.flags !== undefined ? meta.flags : 0
  if ((metaFlags & ISC_FLAG_SAVED) === 0) return

  const pModHdr = pListEx + D2StatListExStrc.pModStat.off
  const ins = STATLIST_FindModStatInsertPos113c(m, pModHdr, dwKey)
  if (ins < 0) return

  const count = (m.u16(pModHdr + 4) << 16) >> 16
  let cap = (m.u16(pModHdr + 6) << 16) >> 16
  let pMod = m.u32(pModHdr)
  if (count >= cap) {
    const newCap = (cap + 4) & 0xffff
    const nextBuf = m.alloc(((newCap << 16) >> 16) * 4)
    for (let i = 0; i < count * 4; i += 4) {
      m.setU32(nextBuf + i, m.u32(pMod + i))
    }
    if (pMod !== 0) {
      ;(m as { free?: (p: number) => void }).free?.(pMod)
    }
    pMod = nextBuf
    cap = (newCap << 16) >> 16
    m.setU32(pModHdr, pMod)
    m.setU16(pModHdr + 6, newCap)
  }
  for (let i = count; i > ins; i--) {
    m.setU32(pMod + i * 4, m.u32(pMod + (i - 1) * 4))
  }
  m.setU32(pMod + ins * 4, dwKey >>> 0)
  m.setU16(pModHdr + 4, (count + 1) & 0xffff)
}

/**
 * `D2Common.#10188` (`0x6FD8A7B0` -> `0x6FD8A280` `STATLIST_SetStatIfListIsValid`).
 * Returns `1` if the stat changed (`delta != 0`), `0` if unchanged.
 */
export function STATLIST_SetStat113c(
  m: Memory113c,
  pList: number,
  statId: number,
  value: number,
  layer = 0,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): number {
  if (pList === 0 || statId < 0) return 0
  const key = statKey113c(statId, layer)
  const pBaseHdr = pList + D2StatListStrc.pStat.off
  const newVal = value | 0
  const idx = STATLIST_FindStatIndex113c(m, pBaseHdr, key)

  let oldVal = 0
  if (idx >= 0) {
    const pStat = m.u32(pBaseHdr)
    oldVal = m.u32(pStat + idx * 8 + 4) | 0
    if (oldVal === newVal) return 0
    if (newVal === 0) {
      removeStatSlot(m, pBaseHdr, idx)
    } else {
      m.setU32(pStat + idx * 8 + 4, newVal >>> 0)
    }
  } else {
    if (newVal === 0) return 0
    const ins = STATLIST_FindInsertPos113c(m, pBaseHdr, key)
    const entryPtr = insertStatSlot(m, pBaseHdr, ins, key)
    m.setU32(entryPtr + 4, newVal >>> 0)
  }

  // 0x6FD8A2FC..0x6FD8A301: propagate `(dwKey, newVal - oldVal)` via `0x6FD89F70`
  STATLIST_PropagateDelta113c(m, pList, statId, layer, (newVal - oldVal) | 0, registry)
  // 0x6FD8A309..0x6FD8A316: when `eOwnerType == 0` (player), record modified stat key via `0x6FD88550`
  if (m.get(pList, D2StatListStrc.eOwnerType) === 0) {
    STATLIST_RecordModStat113c(m, pList, key, registry)
  }
  return 1
}

/** `D2Common 0x6FD8A330` (`STATLIST_AddStat`). */
export function STATLIST_AddStat113c(
  m: Memory113c,
  pList: number,
  statId: number,
  delta: number,
  layer = 0,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): number {
  if (pList === 0 || (delta | 0) === 0) return 0
  const key = statKey113c(statId, layer)
  const cur = readStatFromArray(m, pList + D2StatListStrc.pStat.off, key)
  const changed = STATLIST_SetStat113c(m, pList, statId, (cur + (delta | 0)) | 0, layer, registry)
  if (changed !== 0 && m.get(pList, D2StatListStrc.eOwnerType) === 0) {
    STATLIST_RecordModStat113c(m, pList, key, registry)
  }
  return changed
}

/**
 * `D2Common.#10887` (`0x6FD8A740` `STATLIST_SetUnitStat`).
 * Note: in native 1.13c `D2Common.dll`, `#10887` has C return type `void` (when `pUnit->dwUnitType == 0`
 * and `STATLIST_SetStat` returns `1`, `0x6FD8A775` calls `void 0x6FD88550` `STATLIST_RecordModStat`
 * which clobbers `eax`); `#10188` (`0x6FD8A7B0` -> `0x6FD8A280`) returns `BOOL` (`0` or `1`).
 */
export function STATLIST_SetUnitStat113c(
  m: Memory113c,
  pUnit: number,
  statId: number,
  value: number,
  layer = 0,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): number {
  if (pUnit === 0) return 0
  const pList = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pList === 0) return 0
  const changed = STATLIST_SetStat113c(m, pList, statId, value, layer, registry)
  if (changed !== 0 && m.get(pUnit, D2UnitStrc.dwUnitType) === 0) {
    STATLIST_RecordModStat113c(m, pList, statKey113c(statId, layer), registry)
  }
  return changed
}

/** `D2Common.#10551` (`0x6FD8A710` `STATLIST_AddUnitStat`). */
export function STATLIST_AddUnitStat113c(
  m: Memory113c,
  pUnit: number,
  statId: number,
  delta: number,
  layer = 0,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): number {
  if (pUnit === 0 || (delta | 0) === 0) return 0
  const pList = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pList === 0) return 0
  return STATLIST_AddStat113c(m, pList, statId, delta, layer, registry)
}

/**
 * `D2Common 0x6FD88AB9..0x6FD88AED` / `0x6FD88B2B..0x6FD88B62`:
 * Clamps a PRESENT stat slot (`idx >= 0`) on an extended player/monster `StatListEx` (`pOwner->dwUnitType` in `{0, 1}`):
 * `if (rawVal < dwMinAccr) rawVal = dwMinAccr << bValShift;`
 * Absent slots (`idx < 0`) return `0` BEFORE reaching this clamp (`0x6FD88A9C` / `0x6FD88B12`).
 */
function clampPresentMinStat113c(
  m: Memory113c,
  pList: number,
  statId: number,
  rawVal: number,
  registry: StatTableRegistry113c,
): number {
  const flags = m.get(pList, D2StatListStrc.dwFlags)
  if ((flags & STATLIST_FLAG_EXTENDED) === 0) return rawVal | 0
  const pOwner = m.get(pList, D2StatListExStrc.pOwner)
  if (pOwner === 0) return rawVal | 0
  const ownerType = m.get(pOwner, D2UnitStrc.dwUnitType)
  if (ownerType !== 0 && ownerType !== 1) return rawVal | 0
  const meta = registry.get(statId)
  if (meta === undefined || !meta.fMin) return rawVal | 0
  const minAccr = (meta.minAccr !== undefined ? meta.minAccr : 0) | 0
  const val = rawVal | 0
  if (val < minAccr) {
    return shl32(minAccr, meta.valShift !== undefined ? meta.valShift : 0)
  }
  return val
}

/** `D2Common.#10973` (`0x6FD88B70` -> `0x6FD88A80` `STATLIST_GetUnitStat`). */
export function STATLIST_GetUnitStat113c(
  m: Memory113c,
  pUnit: number,
  statId: number,
  layer = 0,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): number {
  if (pUnit === 0 || statId < 0) return 0
  const pList = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pList === 0) return 0
  const flags = m.get(pList, D2StatListStrc.dwFlags)
  const pHdr =
    (flags & STATLIST_FLAG_EXTENDED) !== 0
      ? pList + D2StatListExStrc.pFullStat.off
      : pList + D2StatListStrc.pStat.off
  const idx = STATLIST_FindStatIndex113c(m, pHdr, statKey113c(statId, layer))
  if (idx < 0) return 0
  const raw = m.u32(m.u32(pHdr) + idx * 8 + 4) | 0
  return clampPresentMinStat113c(m, pList, statId, raw, registry)
}

/** `D2Common.#10587` (`0x6FD88C20` -> `0x6FD88B00` `STATLIST_GetUnitBaseStat`). */
export function STATLIST_GetUnitBaseStat113c(
  m: Memory113c,
  pUnit: number,
  statId: number,
  layer = 0,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): number {
  if (pUnit === 0 || statId < 0) return 0
  const pList = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pList === 0) return 0
  const pHdr = pList + D2StatListStrc.pStat.off
  const idx = STATLIST_FindStatIndex113c(m, pHdr, statKey113c(statId, layer))
  if (idx < 0) return 0
  const raw = m.u32(m.u32(pHdr) + idx * 8 + 4) | 0
  return clampPresentMinStat113c(m, pList, statId, raw, registry)
}

/**
 * `D2Common.#10807` (`0x6FD8A7D0` `STATLIST_MergeStatLists`):
 * Unlinks `pSubList` if previously attached, links into `pMyStats` (`+0x40`) when `STATLIST_FLAG_SET` (`0x2000`),
 * otherwise links into `pMyLastList` (`+0x3C`), sets `pSubList->pUnit = pTargetUnit`, re-evaluates `op 4/5`
 * dynamic item stats (`STATLIST_FLAG_DYNAMIC_OP`), sets (`bType == 0`) or clears (`bType != 0`)
 * `STATLIST_FLAG_MERGED` (`0x40000000`), and propagates stats to `pTargetUnit`'s `D2StatListExStrc`.
 */
export function STATLIST_MergeStatLists113c(
  m: Memory113c,
  pTargetUnit: number,
  pSubList: number,
  bType: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): void {
  if (pTargetUnit === 0 || pSubList === 0) return
  const pParentEx = m.get(pTargetUnit, D2UnitStrc.pStatListEx)
  if (pParentEx === 0 || (m.get(pParentEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) {
    return
  }
  STATLIST_InsertSubList113c(m, pParentEx, pSubList, registry, bType, pTargetUnit)
}

/**
 * Attach `pSubList` onto `pParentEx` (`bType = 0` for equipped item with `ISC_FLAG_ITEM_SPECIFIC`
 * isolation; `bType = 1` default for state/aura/buff sub-list).
 */
export function STATLIST_InsertSubList113c(
  m: Memory113c,
  pParentEx: number,
  pSubList: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
  bType = 1,
  pTargetUnitOverride?: number,
): void {
  if (pParentEx === 0 || pSubList === 0) return
  if ((m.get(pParentEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) return
  if (m.get(pSubList, D2StatListStrc.pParent) !== 0) {
    STATLIST_RemoveSubList113c(m, pSubList, registry)
  }

  // 0x6FD8A800..0x6FD8A80D: cycle check up pParent chain
  for (let cur = pParentEx; cur !== 0; cur = m.get(cur, D2StatListStrc.pParent)) {
    if (cur === pSubList) return
  }

  const pTargetUnit =
    pTargetUnitOverride !== undefined ? pTargetUnitOverride : m.get(pParentEx, D2StatListExStrc.pOwner)
  const subFlags0 = m.get(pSubList, D2StatListStrc.dwFlags)
  if ((subFlags0 & 0x04) !== 0) {
    m.set(
      pParentEx,
      D2StatListStrc.dwFlags,
      (m.get(pParentEx, D2StatListStrc.dwFlags) | STATLIST_FLAG_TIMED) >>> 0,
    )
  }

  // 0x6FD8A81C..0x6FD8A844: STATLIST_FLAG_SET (0x2000) links into pMyStats (+0x40) without FullStats merge
  if ((subFlags0 & STATLIST_FLAG_SET) !== 0) {
    const oldSet = m.get(pParentEx, D2StatListExStrc.pMyStats)
    m.set(pSubList, D2StatListStrc.pPrevLink, oldSet)
    if (oldSet !== 0) m.set(oldSet, D2StatListStrc.pNextLink, pSubList)
    m.set(pSubList, D2StatListStrc.pNextLink, 0)
    m.set(pParentEx, D2StatListExStrc.pMyStats, pSubList)
    m.set(pSubList, D2StatListStrc.pParent, pParentEx)
    m.set(pSubList, D2StatListStrc.pUnit, pTargetUnit)
    return
  }

  const oldLast = m.get(pParentEx, D2StatListExStrc.pMyLastList)
  m.set(pSubList, D2StatListStrc.pPrevLink, oldLast)
  m.set(pSubList, D2StatListStrc.pNextLink, 0)
  if (oldLast !== 0) {
    m.set(oldLast, D2StatListStrc.pNextLink, pSubList)
  }
  m.set(pParentEx, D2StatListExStrc.pMyLastList, pSubList)
  m.set(pSubList, D2StatListStrc.pUnit, pTargetUnit)

  // 0x6FD8A87C..0x6FD8A91A: re-evaluate op 4/5 dynamic item stats on extended sub-list BEFORE setting pParent
  recomputeItemDynamicOps113c(m, pSubList, registry)

  m.set(pSubList, D2StatListStrc.pParent, pParentEx)
  const curFlags = m.get(pSubList, D2StatListStrc.dwFlags)
  const nextFlags =
    bType === 0
      ? (curFlags | STATLIST_FLAG_MERGED) >>> 0
      : (curFlags & ~STATLIST_FLAG_MERGED) >>> 0
  m.set(pSubList, D2StatListStrc.dwFlags, nextFlags)

  // 0x6FD8A91C..0x6FD8A9D5: propagate each sub-list entry via `0x6FD89F70`
  const entries = collectSubListEntries113c(m, pSubList, registry, bType === 0)
  for (const [k, v] of entries) {
    STATLIST_PropagateDelta113c(m, pParentEx, (k >>> 16) & 0xffff, k & 0xffff, v, registry)
  }
}

/** `D2Common.#11111` (`0x6FD8A5F0` `STATLIST_UnlinkSubList`). */
export function STATLIST_UnlinkSubList113c(
  m: Memory113c,
  _pTargetUnit: number,
  pSubList: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): void {
  STATLIST_RemoveSubList113c(m, pSubList, registry)
}

export const STATLIST_RemoveStatListFromUnit113c = STATLIST_UnlinkSubList113c

/**
 * `D2Common 0x6FD8A3B0` (`STATLIST_UnlinkSubListInternal`):
 * Unlinks `pSubList` from its parent `D2StatListExStrc`, clears `pUnit`, re-evaluates any active
 * `op 4/5` dynamic stats on `pSubList`, and subtracts each sub-list entry from parent `FullStats`
 * via `0x6FD89F70`.
 */
export function STATLIST_RemoveSubList113c(
  m: Memory113c,
  pSubList: number,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): void {
  if (pSubList === 0) return
  const pParentEx = m.get(pSubList, D2StatListStrc.pParent)
  const subFlags = m.get(pSubList, D2StatListStrc.dwFlags)
  const wasMerged = (subFlags & STATLIST_FLAG_MERGED) !== 0

  const prev = m.get(pSubList, D2StatListStrc.pPrevLink)
  const next = m.get(pSubList, D2StatListStrc.pNextLink)
  if (pParentEx !== 0 && (m.get(pParentEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) !== 0) {
    if (m.get(pParentEx, D2StatListExStrc.pMyLastList) === pSubList) {
      m.set(pParentEx, D2StatListExStrc.pMyLastList, prev)
    }
    if (m.get(pParentEx, D2StatListExStrc.pMyStats) === pSubList) {
      m.set(pParentEx, D2StatListExStrc.pMyStats, prev)
    }
  }
  if (next !== 0) m.set(next, D2StatListStrc.pPrevLink, prev)
  if (prev !== 0) m.set(prev, D2StatListStrc.pNextLink, next)

  m.set(pSubList, D2StatListStrc.pParent, 0)
  m.set(pSubList, D2StatListStrc.pPrevLink, 0)
  m.set(pSubList, D2StatListStrc.pNextLink, 0)
  m.set(pSubList, D2StatListStrc.pUnit, 0)

  if ((subFlags & STATLIST_FLAG_SET) !== 0) {
    return
  }

  // 0x6FD8A44E..0x6FD8A4EA: re-evaluate op 4/5 dynamic item stats after clearing pUnit
  recomputeItemDynamicOps113c(m, pSubList, registry)

  // 0x6FD8A4EF..0x6FD8A59D: propagate `-nVal` for each sub-list entry via `0x6FD89F70`
  if (pParentEx !== 0) {
    const entries = collectSubListEntries113c(m, pSubList, registry, wasMerged)
    for (const [k, v] of entries) {
      STATLIST_PropagateDelta113c(m, pParentEx, (k >>> 16) & 0xffff, k & 0xffff, (-v) | 0, registry)
    }
  }
}

/**
 * `@va D2Common:0x6FD87F80` (`STATLIST_FindSubListByStateAndFlags`, `__fastcall (ecx = pStatListEx, edx = stateId)`):
 * Returns `0` if `pStatListEx == 0`, `stateId == 0`, or `(pStatListEx->dwFlags (+0x10) & 0x80000000) == 0`;
 * otherwise walks `pMyLastList (+0x3C)` then `pMyStats (+0x40)` via `pPrevLink (+0x2C)` and returns the first
 * sublist with `dwStateNo (+0x14) == stateId` (`0` if not found).
 */
function findSubListByStateAndFlags113c(
  m: Memory113c,
  pStatListEx: number,
  stateId: number,
): number {
  if (pStatListEx === 0 || stateId === 0) return 0
  if ((m.get(pStatListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) {
    return 0
  }
  const target = stateId >>> 0
  for (
    let sub = m.get(pStatListEx, D2StatListExStrc.pMyLastList);
    sub !== 0;
    sub = m.get(sub, D2StatListStrc.pPrevLink)
  ) {
    if (m.get(sub, D2StatListStrc.dwStateNo) === target) return sub
  }
  for (
    let sub = m.get(pStatListEx, D2StatListExStrc.pMyStats);
    sub !== 0;
    sub = m.get(sub, D2StatListStrc.pPrevLink)
  ) {
    if (m.get(sub, D2StatListStrc.dwStateNo) === target) return sub
  }
  return 0
}

/** `D2Common.#10871` (`0x6FD88520` -> `0x6FD87F80` `STATLIST_GetStatListFromUnitAndState`). */
export function STATLIST_GetStatListFromUnitAndState113c(
  m: Memory113c,
  pUnit: number,
  stateId: number,
): number {
  if (pUnit === 0) return 0
  const pListEx = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pListEx === 0 || (m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) {
    return 0
  }
  return findSubListByStateAndFlags113c(m, pListEx, stateId)
}

/**
 * `D2Common.#10494` (`0x6FD83CD0` `STATES_CheckState`):
 * Valid only on `dwUnitType` in `{0, 1, 3}` (`player`, `monster`, `missile`) and `0 <= stateId < 185`.
 * Returns raw masked bit (`1 << (stateId & 31)` >>> 0) or `0`.
 */
export function STATES_CheckState113c(m: Memory113c, pUnit: number, stateId: number): number {
  if (pUnit === 0) return 0
  const uType = m.get(pUnit, D2UnitStrc.dwUnitType)
  if (uType !== 0 && uType !== 1 && uType !== 3) return 0
  if (stateId < 0 || stateId >= STATES_COUNT_113C) return 0
  const pListEx = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pListEx === 0 || (m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) {
    return 0
  }
  const pStateFlags = m.get(pListEx, D2StatListExStrc.pStateFlags)
  if (pStateFlags === 0) return 0
  const wordIdx = stateId >> 5
  const mask = (1 << (stateId & 31)) >>> 0
  return (m.u32(pStateFlags + wordIdx * 4) & mask) >>> 0
}

/**
 * `States.bin` (`185` states, stride `60` bytes) `+0x12` bit `0` (`disguise`, `fStateMasks[16]` at `[sgptDataTables+0x10C]`)
 * 6-dword bitmask: exact active states `{63, 93, 119, 139, 140, 176, 177}` extracted from 1.13c `states.bin`.
 */
export const DISGUISE_STATE_MASK_WORDS_113C: readonly [
  number,
  number,
  number,
  number,
  number,
  number,
] = [
  0x00000000, // states 0..31:   none
  0x80000000, // states 32..63:  63 (bit 31)
  0x20000000, // states 64..95:  93 (bit 29)
  0x00800000, // states 96..127: 119 (bit 23)
  0x00001800, // states 128..159: 139 (bit 11), 140 (bit 12)
  0x00030000, // states 160..184: 176 (bit 16), 177 (bit 17)
]

export const UNITFLAG2_DISGUISE_113C = 0x00000008

/**
 * `@va D2Common:0x6FD83C20` (`STATES_CheckStateMaskOnUnit`, `eax = pUnit`, `ecx = pMaskWords`):
 * Checks `pUnit != 0`, `pListEx = pUnit->pStatListEx (+0x5C)`, `(pListEx->dwFlags & 0x80000000) != 0`,
 * and `pStateFlags = pListEx->pStateFlags (+0x58) != 0`, then computes
 * `nDwords = ((nStatesTxtRecordCount + 31) + (((nStatesTxtRecordCount + 31) >> 31) & 31)) >> 5`
 * from `sgptDataTables+0xC4` (falling back to `STATE_DWORDS_113C = 6` when `sgptDataTables == 0`)
 * and scans `pStateFlags[0..nDwords-1]` against `maskWords[0..nDwords-1]`, returning `1` if any
 * `pStateFlags[i] & maskWords[i]` is non-zero, else `0`.
 */
export function STATES_CheckStateMaskOnUnit113c(
  m: Memory113c,
  pUnit: number,
  maskWords: number | ArrayLike<number>,
): number {
  if (pUnit === 0) return 0
  const pListEx = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pListEx === 0 || (m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) {
    return 0
  }
  const pStateFlags = m.get(pListEx, D2StatListExStrc.pStateFlags)
  if (pStateFlags === 0) return 0
  if (typeof maskWords === 'number') {
    const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
    let nDwords = STATE_DWORDS_113C
    if (sgpt !== 0) {
      const cnt = ((m.u32((sgpt + 0xc4) >>> 0) | 0) + 31) | 0
      nDwords = sar32((cnt + ((cnt >> 31) & 31)) | 0, 5)
    }
    if (nDwords <= 0) return 0
    const pMask = maskWords >>> 0
    for (let i = 0; i < nDwords; i++) {
      const stateWord = m.u32((pStateFlags + i * 4) >>> 0)
      const maskWord = m.u32((pMask + i * 4) >>> 0)
      if ((stateWord & maskWord) !== 0) {
        return 1
      }
    }
  } else {
    for (let i = 0; i < STATE_DWORDS_113C; i++) {
      const maskWord = (i < maskWords.length ? maskWords[i]! : 0) >>> 0
      if (maskWord !== 0 && (m.u32((pStateFlags + i * 4) >>> 0) & maskWord) !== 0) {
        return 1
      }
    }
  }
  return 0
}

/**
 * `@va D2Common:0x6FD83D60` (`D2Common.#10541` `STATES_CheckStateMask33OnUnit`,
 * stdcall `[esp+4] = pUnit`, `ret 4` -> `0` or `1`).
 *
 * Reads `pMask = [sgptDataTables + 0x150]` (`fStateMasks[33]`)
 * and delegates to `0x6FD83C20` (`STATES_CheckStateMaskOnUnit113c`).
 */
export function STATES_CheckStateMask33OnUnit113c(m: Memory113c, pUnit: number): number {
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  const pMask = m.u32((sgpt + 0x150) >>> 0)
  return STATES_CheckStateMaskOnUnit113c(m, pUnit, pMask)
}

/**
 * `@va D2Common:0x6FD88730` (`STATES_ToggleState`):
 * - Internal helper called by `D2Common.#10945` (`0x6FD84510`), `0x6FD83060`, `0x6FD8AE97`, and `0x6FDA1FA1`
 *   (caller enforces `0 <= stateId < 185`; we retain `0 <= stateId < STATES_COUNT_113C` array-bounds safety).
 * - Reads `pListEx = pUnit->pStatListEx (+0x5C)`: returns immediately when `0` or non-extended
 *   (NEVER allocates a `D2StatListExStrc`).
 * - Toggles `stateId` in `pStateFlags[0..5]`; if the bit actually flipped, sets the dirty/gfx bit
 *   in `pStateFlags[6..11]` (`wordIdx + 6`) and updates `pUnit->dwFlags2 (+0xC8)` bit `0x08`
 *   for `States.bin + 0x12` bit `0` (`disguise`: `{63, 93, 119, 139, 140, 176, 177}`) via `0x6FD83C20`.
 */
export function STATES_ToggleState113c(
  m: Memory113c,
  pUnit: number,
  stateId: number,
  bSet: boolean | number,
): void {
  if (pUnit === 0 || stateId < 0 || stateId >= STATES_COUNT_113C) return
  const pListEx = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pListEx === 0 || (m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) {
    return
  }
  const pStateFlags = m.get(pListEx, D2StatListExStrc.pStateFlags)
  if (pStateFlags === 0) return

  const setFlag = Boolean(bSet)
  const wordIdx = stateId >> 5
  const mask = (1 << (stateId & 31)) >>> 0
  const curWord = m.u32(pStateFlags + wordIdx * 4)
  const wasSet = (curWord & mask) !== 0
  if (wasSet === setFlag) return

  const nextWord = setFlag ? (curWord | mask) >>> 0 : (curWord & ~mask) >>> 0
  m.setU32(pStateFlags + wordIdx * 4, nextWord)

  // Dirty/gfx bitvector sits immediately after the 6 active dwords (`+6 * 4 = +0x18`)
  const dirtyAddr = pStateFlags + (wordIdx + STATE_DWORDS_113C) * 4
  m.setU32(dirtyAddr, (m.u32(dirtyAddr) | mask) >>> 0)

  // `0x6FD887E8..0x6FD88838`: `States.bin + 0x12` bit 0 (`disguise`) -> `pUnit->dwFlags2 (+0xC8)` bit `0x08`
  if (((DISGUISE_STATE_MASK_WORDS_113C[wordIdx] as number) & mask) !== 0) {
    const flags2 = m.get(pUnit, D2UnitStrc.dwFlags2)
    if (setFlag) {
      m.set(pUnit, D2UnitStrc.dwFlags2, (flags2 | UNITFLAG2_DISGUISE_113C) >>> 0)
    } else if (STATES_CheckStateMaskOnUnit113c(m, pUnit, DISGUISE_STATE_MASK_WORDS_113C) === 0) {
      m.set(pUnit, D2UnitStrc.dwFlags2, (flags2 & ~UNITFLAG2_DISGUISE_113C) >>> 0)
    }
  }
}

/**
 * `@va D2Common:0x6FD84510` (`D2Common.#10945` `STATES_ToggleGfxStateFlag`):
 * Checks `0 <= stateId < 185` (`[sgptDataTables+0xC4]`), calls `0x6FD88730` (`STATES_ToggleState113c`),
 * and calls `D2Common.#10158` (`0x6FDB65C0` `UNITROOM_RefreshUnit113c`) at `0x6FD84537`.
 */
export function STATES_ToggleGfxStateFlag113c(
  m: Memory113c,
  pUnit: number,
  stateId: number,
  bSet: number | boolean,
): void {
  if (stateId < 0 || stateId >= STATES_COUNT_113C) return
  STATES_ToggleState113c(m, pUnit, stateId, Boolean(bSet))
  UNITROOM_RefreshUnit113c(m, pUnit)
}

/** `D2Common.#10446` (`0x6FD843E0`): read dirty/gfx state bit (`pStateFlags[(stateId >> 5) + 6] & (1 << (stateId & 31))`). */
export function STATES_CheckGfxStateFlag113c(m: Memory113c, pUnit: number, stateId: number): number {
  if (pUnit === 0 || stateId < 0 || stateId >= STATES_COUNT_113C) return 0
  const pListEx = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pListEx === 0 || (m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) {
    return 0
  }
  const pStateFlags = m.get(pListEx, D2StatListExStrc.pStateFlags)
  if (pStateFlags === 0) return 0
  const wordIdx = (stateId >> 5) + STATE_DWORDS_113C
  const mask = (1 << (stateId & 31)) >>> 0
  return (m.u32(pStateFlags + wordIdx * 4) & mask) >>> 0
}

/**
 * `@va D2Common:0x6FD84450` (`D2Common.#11039` `STATES_ClearGfxStateFlag`):
 * Checks `pUnit != 0`, `pListEx != 0`, `(pListEx->dwFlags & 0x80000000) != 0`, `pStateFlags != 0`,
 * and `0 <= stateId < 185`. When `bSet == 0` (default), clears `pStateFlags[6 + (stateId >> 5)] &= ~mask`
 * (`0x6FD844DD`); when `bSet != 0`, sets `pStateFlags[6 + (stateId >> 5)] |= mask` (`0x6FD844BA`);
 * both paths then call `D2Common.#10158` (`0x6FDB65C0` `UNITROOM_RefreshUnit113c`) at `0x6FD844C0` / `0x6FD844E3`.
 */
export function STATES_ClearGfxStateFlag113c(
  m: Memory113c,
  pUnit: number,
  stateId: number,
  bSet: number | boolean = 0,
): void {
  if (pUnit === 0 || stateId < 0 || stateId >= STATES_COUNT_113C) return
  const pListEx = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pListEx === 0 || (m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) {
    return
  }
  const pStateFlags = m.get(pListEx, D2StatListExStrc.pStateFlags)
  if (pStateFlags === 0) return
  const wordIdx = (stateId >> 5) + STATE_DWORDS_113C
  const mask = (1 << (stateId & 31)) >>> 0
  const cur = m.u32(pStateFlags + wordIdx * 4)
  if (bSet) {
    m.setU32(pStateFlags + wordIdx * 4, (cur | mask) >>> 0)
  } else {
    m.setU32(pStateFlags + wordIdx * 4, (cur & ~mask) >>> 0)
  }
  UNITROOM_RefreshUnit113c(m, pUnit)
}

/**
 * `@va D2Common:0x6FD8AE60` (`STATLIST_ExpireStateListsOnModeChange`):
 * When `(pListEx->dwFlags & 0x02) != 0`, walks `pListEx->pMyLastList (+0x3C)` along `pPrevLink (+0x2C)`
 * and expires any sub-list with `(sub->dwFlags & 0x04) != 0` (clearing its `dwStateNo` in `pStateFlags`,
 * calling `UNITROOM_RefreshUnit113c`, and unlinking/freeing non-extended sub-lists), then clears bit `0x02`
 * on `pListEx->dwFlags`.
 */
export function STATLIST_ExpireStateListsOnModeChange113c(
  m: Memory113c,
  pUnit: number,
  _bIsClient = 0,
  registry: StatTableRegistry113c = DEFAULT_STAT_REGISTRY_113C,
): void {
  if (pUnit === 0) return
  const pListEx = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pListEx === 0 || (m.get(pListEx, D2StatListStrc.dwFlags) & 0x02) === 0) return

  let sub = m.get(pListEx, D2StatListExStrc.pMyLastList)
  while (sub !== 0) {
    let nextSub = m.get(sub, D2StatListStrc.pPrevLink)
    const subFlags = m.get(sub, D2StatListStrc.dwFlags)
    if ((subFlags & 0x04) !== 0) {
      const stateNo = m.get(sub, D2StatListStrc.dwStateNo) | 0
      if (stateNo > 0 && stateNo < STATES_COUNT_113C) {
        STATES_ToggleState113c(m, pUnit, stateNo, 0)
        UNITROOM_RefreshUnit113c(m, pUnit)
      }
      if ((subFlags & STATLIST_FLAG_EXTENDED) === 0) {
        STATLIST_RemoveSubList113c(m, sub, registry)
      }
      nextSub = m.get(pListEx, D2StatListExStrc.pMyLastList)
    }
    sub = nextSub
  }
  m.set(pListEx, D2StatListStrc.dwFlags, (m.get(pListEx, D2StatListStrc.dwFlags) & ~0x02) >>> 0)
}

export {
  ITEMS_SetMagicPrefix113c,
  ITEMS_SetMagicSuffix113c,
  ITEMS_SetRarePrefix113c,
  ITEMS_SetRareSuffix113c,
}

/** `D2DataTablesStrc` offsets read by `STATES_CheckStateMaskExpOnUnit` (`0x6FD83AB0`). */
export const DATATABLES_OFF_STATES_COUNT_113C = 0xc4
export const DATATABLES_OFF_PLAYER_STATE_MASK_EXP_113C = 0x100
export const DATATABLES_OFF_MONSTER_STATE_MASK_EXP_113C = 0x104

/**
 * `@va D2Common:0x6FD83AB0` (`D2Common.#11061` `STATES_CheckStateMaskExpOnUnit`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = nState`, `ret 8` -> masked bit or `0`).
 *
 * Checks `0 <= nState < sgptDataTables->nStatesTxtRecordCount (+0xC4)`, selects
 * `sgptDataTables->pMonsterStateMaskExp (+0x104)` when `pUnit != NULL && pUnit->dwUnitType == 1`
 * or `sgptDataTables->pPlayerStateMaskExp (+0x100)` otherwise, and returns
 * `pMask[nState >> 5] & gdwBitMasks[nState & 31]`.
 */
export function STATES_CheckStateMaskExpOnUnit113c(
  m: Memory113c,
  pUnit: number,
  nState: number,
): number {
  const state = nState | 0
  if (state < 0) return 0
  const dt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (state >= (m.u32((dt + DATATABLES_OFF_STATES_COUNT_113C) >>> 0) | 0)) return 0
  const pMask =
    pUnit !== 0 && m.get(pUnit, D2UnitStrc.dwUnitType) === 1
      ? m.u32((dt + DATATABLES_OFF_MONSTER_STATE_MASK_EXP_113C) >>> 0)
      : m.u32((dt + DATATABLES_OFF_PLAYER_STATE_MASK_EXP_113C) >>> 0)
  const word = m.u32((pMask + (sar32(state, 5) << 2)) >>> 0)
  const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
  const bit = m.u32((pBitMasks + ((state & 0x1f) << 2)) >>> 0)
  return (word & bit) >>> 0
}

/**
 * `@va D2Common:0x6FD87D30` (`D2Common.#10515` `STATLIST_GetSkillLevel`,
 * stdcall `[esp+4] = pStatList`, `ret 4` -> `pStatList->nSkillLevel (+0x20)`).
 */
export function STATLIST_GetSkillLevel113c(m: Memory113c, pStatList: number): number {
  return m.get(pStatList >>> 0, D2StatListStrc.nSkillLevel) >>> 0
}

/**
 * `@va D2Common:0x6FD87D40` (`D2Common.#11081` `STATLIST_SetSkillLevel`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = nSkillLevel`, `ret 8`, void).
 */
export function STATLIST_SetSkillLevel113c(
  m: Memory113c,
  pStatList: number,
  nSkillLevel: number,
): void {
  m.set(pStatList >>> 0, D2StatListStrc.nSkillLevel, nSkillLevel >>> 0)
}

/**
 * `@va D2Common:0x6FD87D50` (`D2Common.#10555` `STATLIST_GetSkillId`,
 * stdcall `[esp+4] = pStatList`, `ret 4` -> `pStatList->nSkillNo (+0x1C)`).
 */
export function STATLIST_GetSkillId113c(m: Memory113c, pStatList: number): number {
  return m.get(pStatList >>> 0, D2StatListStrc.nSkillNo) >>> 0
}

/**
 * `@va D2Common:0x6FD87D60` (`D2Common.#10725` `STATLIST_SetSkillId`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = nSkillNo`, `ret 8`, void).
 */
export function STATLIST_SetSkillId113c(m: Memory113c, pStatList: number, nSkillNo: number): void {
  m.set(pStatList >>> 0, D2StatListStrc.nSkillNo, nSkillNo >>> 0)
}

/**
 * `@va D2Common:0x6FD87D70` (`D2Common.#10911` `STATLIST_SetStatRemoveProc`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = pfOnRemove`, `ret 8`, void).
 */
export function STATLIST_SetStatRemoveProc113c(
  m: Memory113c,
  pStatList: number,
  pfOnRemove: number,
): void {
  if (pStatList === 0) return
  m.set(pStatList, D2StatListStrc.fpRemove, pfOnRemove >>> 0)
}

/**
 * `@va D2Common:0x6FD87DE0` (`D2Common.#10354` `STATLIST_CheckUnitStatListFlag100`,
 * stdcall `[esp+4] = pUnit`, `ret 4` -> `(pUnit->pStatListEx->dwFlags >> 8) & 1` or `0`).
 */
export function STATLIST_CheckUnitStatListFlag100113c(m: Memory113c, pUnit: number): number {
  if (pUnit === 0) return 0
  const pStatList = m.get(pUnit, D2UnitStrc.pStatListEx)
  if (pStatList === 0) return 0
  return ((m.get(pStatList, D2StatListStrc.dwFlags) >>> 8) & 1) >>> 0
}

/**
 * `@va D2Common:0x6FD87E70` (`D2Common.#11160` `STATLIST_GetOwnerAndDynamicFlag`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = pOutNotMerged`, `ret 8` -> `pParent->pOwner (+0x44)` or `0`).
 */
export function STATLIST_GetOwnerAndDynamicFlag113c(
  m: Memory113c,
  pUnit: number,
  pOutNotMerged: number,
): number {
  if (pUnit !== 0) {
    const pList = m.get(pUnit, D2UnitStrc.pStatListEx)
    if (pList !== 0) {
      const pParent = m.get(pList, D2StatListStrc.pParent)
      if (
        pParent !== 0 &&
        (m.get(pParent, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) !== 0
      ) {
        if (pOutNotMerged !== 0) {
          const notMerged = (~(m.get(pList, D2StatListStrc.dwFlags) >>> 30) & 1) >>> 0
          m.setU32(pOutNotMerged >>> 0, notMerged)
        }
        return m.get(pParent, D2StatListExStrc.pOwner) >>> 0
      }
    }
  }
  if (pOutNotMerged !== 0) {
    m.setU32(pOutNotMerged >>> 0, 0)
  }
  return 0
}

/**
 * `@va D2Common:0x6FD87EC0` (`D2Common.#10930` `STATLIST_GetStatListFromUnitStateAndFlag`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = nState`, `[esp+0xC] = dwFilterFlags`, `ret 0xC` -> `pSub` or `0`).
 */
export function STATLIST_GetStatListFromUnitStateAndFlag113c(
  m: Memory113c,
  pUnit: number,
  nState: number,
  dwFilterFlags: number,
): number {
  const pListEx = m.get(pUnit >>> 0, D2UnitStrc.pStatListEx)
  if (pListEx === 0) return 0
  if ((m.get(pListEx, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) === 0) return 0
  let mask = dwFilterFlags >>> 0
  let pCur: number
  if ((mask & 0x2000) !== 0) {
    pCur = m.get(pListEx, D2StatListExStrc.pMyStats)
    mask = (mask & 0xffffdfff) >>> 0
  } else {
    pCur = m.get(pListEx, D2StatListExStrc.pMyLastList)
  }
  const targetState = nState >>> 0
  while (pCur !== 0) {
    if (
      m.get(pCur, D2StatListStrc.dwStateNo) === targetState &&
      (mask === 0 || (m.get(pCur, D2StatListStrc.dwFlags) & mask) !== 0)
    ) {
      return pCur >>> 0
    }
    pCur = m.get(pCur, D2StatListStrc.pPrevLink)
  }
  return 0
}

/**
 * `@va D2Common:0x6FD87F40` (`STATLIST_GetStatListFromFlag`,
 * internal LTCG `eax = pStatList`, `ecx = dwFilterFlags`, `ret` -> `pSub` or `0`).
 */
export function STATLIST_GetStatListFromFlag113c(
  m: Memory113c,
  pStatList: number,
  dwFilterFlags: number,
): number {
  if (pStatList === 0) return 0
  let pCur = pStatList >>> 0
  if ((m.get(pStatList, D2StatListStrc.dwFlags) & STATLIST_FLAG_EXTENDED) !== 0) {
    pCur =
      (dwFilterFlags & 0x2000) !== 0
        ? m.get(pStatList, D2StatListExStrc.pMyStats)
        : m.get(pStatList, D2StatListExStrc.pMyLastList)
  }
  const mask = (dwFilterFlags & 0xffffdfff) >>> 0
  while (pCur !== 0) {
    if ((m.get(pCur, D2StatListStrc.dwFlags) & mask) !== 0) {
      return pCur >>> 0
    }
    pCur = m.get(pCur, D2StatListStrc.pPrevLink)
  }
  return 0
}

/**
 * `@va D2Common:0x6FD88000` (`D2Common.#10412` `STATLIST_GetExpireFrame`,
 * stdcall `[esp+4] = pStatList`, `ret 4` -> `pStatList->dwExpireFrame (+0x18)` or `0`).
 */
export function STATLIST_GetExpireFrame113c(m: Memory113c, pStatList: number): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  return m.get(s, D2StatListStrc.dwExpireFrame) >>> 0
}

/**
 * `@va D2Common:0x6FD88020` (`D2Common.#10161` `STATLIST_SetExpireFrame`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = nExpireFrame`, `ret 8`, void).
 *
 * If `pStatList != 0`: when signed `nExpireFrame > 0`, sets `STATLIST_FLAG_TIMED` (`0x02`) in
 * `pStatList->dwFlags (+0x10)` (`0x6FD8802C..0x6FD88030`), then writes `pStatList->dwExpireFrame (+0x18)`.
 */
export function STATLIST_SetExpireFrame113c(
  m: Memory113c,
  pStatList: number,
  nExpireFrame: number,
): void {
  const s = pStatList >>> 0
  if (s === 0) return
  const frame = nExpireFrame | 0
  if (frame > 0) {
    m.set(
      s,
      D2StatListStrc.dwFlags,
      (m.get(s, D2StatListStrc.dwFlags) | STATLIST_FLAG_TIMED) >>> 0,
    )
  }
  m.set(s, D2StatListStrc.dwExpireFrame, frame >>> 0)
}

/**
 * `@va D2Common:0x6FD88040` (`D2Common.#11132` `STATLIST_GetState`,
 * stdcall `[esp+4] = pStatList`, `ret 4` -> `pStatList->dwStateNo (+0x14)` or `0`).
 */
export function STATLIST_GetState113c(m: Memory113c, pStatList: number): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  return m.get(s, D2StatListStrc.dwStateNo) >>> 0
}

/**
 * `@va D2Common:0x6FD88060` (`D2Common.#10785` `STATLIST_SetState`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = nState`, `ret 8`, void).
 */
export function STATLIST_SetState113c(m: Memory113c, pStatList: number, nState: number): void {
  const s = pStatList >>> 0
  if (s === 0) return
  m.set(s, D2StatListStrc.dwStateNo, nState >>> 0)
}

/**
 * `@va D2Common:0x6FD88080` (`D2Common.#10473` `STATLIST_GetOwnerId`,
 * stdcall `[esp+4] = pStatList`, `ret 4` -> `pStatList->dwOwnerId (+0x0C)` or `0`).
 */
export function STATLIST_GetOwnerId113c(m: Memory113c, pStatList: number): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  return m.get(s, D2StatListStrc.dwOwnerId) >>> 0
}

/**
 * `@va D2Common:0x6FD880A0` (`D2Common.#11165` `STATLIST_GetUnitFullStatsCount`,
 * stdcall `[esp+4] = pUnit`, `ret 4` -> `movsx eax, word [pListEx+0x4C]` or `0`).
 */
export function STATLIST_GetUnitFullStatsCount113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  const pListEx = m.get(u, D2UnitStrc.pStatListEx)
  if (pListEx === 0) return 0
  return ((m.get(pListEx, D2StatListExStrc.wFullStatCount) << 16) >> 16) >>> 0
}

/**
 * `@va D2Common:0x6FD880E0` (`D2Common.#11131` `STATLIST_GetOwnerType`,
 * stdcall `[esp+4] = pStatList`, `ret 4` -> `pStatList->eOwnerType (+0x08)` or `6` if NULL).
 */
export function STATLIST_GetOwnerType113c(m: Memory113c, pStatList: number): number {
  const s = pStatList >>> 0
  if (s === 0) return 6
  return m.get(s, D2StatListStrc.eOwnerType) >>> 0
}

/**
 * `@va D2Common:0x6FD88220` (`STATLIST_FindStatFirstIndexOrLowerBound`,
 * internal LTCG `eax = pStatArrayHdr`, `ebx = dwKey`, plain `ret` -> index `>= 0` or `-1` (`0xFFFFFFFF`)).
 *
 * Binary search on `D2StatsArrayStrc` (`+0x00 pStat`, `+0x04 wStatCount`):
 * - `0x6FD88221 movsx ebp, word [eax+4]; mov esi, ebp; xor ecx, ecx; test esi, esi; mov edi, [eax]; jle`
 * - Loop (`0x6FD88231..0x6FD8824E`): `mid = lo + trunc((hi - lo) / 2)`, `cur = [edi + mid*8]`.
 *   If `(dwKey | 0) > (cur | 0)`: `lo = mid + 1`.
 *   Else if `(dwKey | 0) >= (cur | 0)`: returns `mid` immediately (`jge 0x6FD8825D`).
 *   Else: `hi = mid`.
 * - Post-loop (`0x6FD88250..0x6FD88260`): if `lo < count`, returns `lo`; otherwise returns `-1` (`0xFFFFFFFF`).
 */
export function STATLIST_FindStatFirstIndexOrLowerBound113c(
  m: Memory113c,
  pStatArrayHdr: number,
  dwKey: number,
): number {
  const hdr = pStatArrayHdr >>> 0
  const count = (m.u16((hdr + 4) >>> 0) << 16) >> 16
  let hi = count
  let lo = 0
  const pStat = m.u32(hdr)
  const key = dwKey | 0
  if (hi > 0) {
    while (lo < hi) {
      const diff = (hi - lo) | 0
      const mid = (lo + ((diff - (diff >> 31)) >> 1)) | 0
      const cur = m.u32((pStat + mid * 8) >>> 0) | 0
      if (key > cur) {
        lo = (mid + 1) | 0
      } else if (key >= cur) {
        return mid >>> 0
      } else {
        hi = mid
      }
    }
  }
  if (lo < count) {
    return lo >>> 0
  }
  return 0xffffffff
}

/**
 * `@va D2Common:0x6FD88380` (`D2Common.#11043` `STATLIST_SetExpireFrameEx`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = nExpireFrame`, `ret 8`, void).
 *
 * Byte-for-byte identical in machine code to `STATLIST_SetExpireFrame` (`0x6FD88020`).
 */
export function STATLIST_SetExpireFrameEx113c(
  m: Memory113c,
  pStatList: number,
  nExpireFrame: number,
): void {
  const s = pStatList >>> 0
  if (s === 0) return
  const frame = nExpireFrame | 0
  if (frame > 0) {
    m.set(
      s,
      D2StatListStrc.dwFlags,
      (m.get(s, D2StatListStrc.dwFlags) | STATLIST_FLAG_TIMED) >>> 0,
    )
  }
  m.set(s, D2StatListStrc.dwExpireFrame, frame >>> 0)
}

/**
 * `@va D2Common:0x6FD883A0` (`D2Common.#10959` `STATLIST_GetExpireFrameEx`,
 * stdcall `[esp+4] = pStatList`, `ret 4` -> `pStatList->dwExpireFrame (+0x18)` or `0`).
 *
 * Byte-for-byte identical in machine code to `STATLIST_GetExpireFrame` (`0x6FD88000`).
 */
export function STATLIST_GetExpireFrameEx113c(m: Memory113c, pStatList: number): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  return m.get(s, D2StatListStrc.dwExpireFrame) >>> 0
}

/**
 * `@va D2Common:0x6FD883C0` (`D2Common.#10658` `STATLIST_CopyBaseStatsToBuffer`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = pOutStats`, `[esp+0xC] = nMaxStats`, `ret 0xC` -> copied count).
 *
 * Reads `count = movsx(pStatList->wStatCount (+0x28))`, clamps `if (count >= nMaxStats) count = nMaxStats`
 * (`0x6FD883CD..0x6FD883D9`, signed `jl`), copies `8`-byte `D2StatStrc` records from `pStatList->pStat (+0x24)`
 * to `pOutStats` while `src < (src + count * 8) >>> 0` (`0x6FD883DF..0x6FD88402`, unsigned `jae`/`jb`),
 * and returns `count`.
 */
export function STATLIST_CopyBaseStatsToBuffer113c(
  m: Memory113c,
  pStatList: number,
  pOutStats: number,
  nMaxStats: number,
): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  let count = (m.get(s, D2StatListStrc.wStatCount) << 16) >> 16
  const maxStats = nMaxStats | 0
  if (count >= maxStats) {
    count = maxStats
  }
  let src = m.get(s, D2StatListStrc.pStat) >>> 0
  const end = (src + imul32(count, 8)) >>> 0
  if (src < end) {
    let dst = pOutStats >>> 0
    do {
      m.setU32(dst, m.u32(src))
      m.setU32((dst + 4) >>> 0, m.u32((src + 4) >>> 0))
      src = (src + 8) >>> 0
      dst = (dst + 8) >>> 0
    } while (src < end)
  }
  return count >>> 0
}

/**
 * `@va D2Common:0x6FD88410` (`D2Common.#10790` `STATLIST_CopyUnitFullStatsToBuffer`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = pOutStats`, `[esp+0xC] = nMaxStats`, `ret 0xC` -> copied count).
 *
 * Checks `pUnit != 0`, `pListEx = pUnit->pStatListEx (+0x5C) != 0`, and `(pListEx->dwFlags & 0x80000000) != 0`
 * (`0x6FD88410..0x6FD88424 test eax, eax; js`); otherwise returns `0`.
 * Clamps `count = min_signed(movsx(pListEx->wFullStatCount (+0x4C)), nMaxStats)` and copies `8`-byte
 * `D2StatStrc` records from `pListEx->pFullStat (+0x48)` into `pOutStats`.
 */
export function STATLIST_CopyUnitFullStatsToBuffer113c(
  m: Memory113c,
  pUnit: number,
  pOutStats: number,
  nMaxStats: number,
): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  const pListEx = m.get(u, D2UnitStrc.pStatListEx)
  if (pListEx === 0) return 0
  if ((m.get(pListEx, D2StatListStrc.dwFlags) | 0) >= 0) return 0
  let count = (m.get(pListEx, D2StatListExStrc.wFullStatCount) << 16) >> 16
  const maxStats = nMaxStats | 0
  if (count >= maxStats) {
    count = maxStats
  }
  let src = m.get(pListEx, D2StatListExStrc.pFullStat) >>> 0
  const end = (src + imul32(count, 8)) >>> 0
  if (src < end) {
    let dst = pOutStats >>> 0
    do {
      m.setU32(dst, m.u32(src))
      m.setU32((dst + 4) >>> 0, m.u32((src + 4) >>> 0))
      src = (src + 8) >>> 0
      dst = (dst + 8) >>> 0
    } while (src < end)
  }
  return count >>> 0
}

/**
 * `@va D2Common:0x6FD8B080` (`D2Common.#10518` `DRLGLOGIC_GetBossTombLevel`,
 * stdcall `[esp+4] = pAct`, `ret 4` -> `pAct->pDrlg->nBossTombLevel (+0x94)` or `0`).
 */
export function DRLGLOGIC_GetBossTombLevel113c(m: Memory113c, pAct: number): number {
  const a = pAct >>> 0
  if (a === 0) return 0
  const pDrlg = m.get(a, D2ActStrc.pDrlg)
  if (pDrlg === 0) return 0
  return m.get(pDrlg, D2DrlgStrc.nBossTombLevel) >>> 0
}

/** `.data` VA of the 5-dword Act start level ID table `[1, 40, 75, 103, 109]` (`0x6FD8B1E0`). */
export const D2COMMON_ACT_LEVEL_IDS_VA_113C = 0x6fde4084

/** `.data` VAs for the random item graphic cell table (`0x6FD96920`). */
export const D2COMMON_ITEM_GRAPHIC_CELL_COUNT_VA_113C = 0x6fdeefa0
export const D2COMMON_ITEM_GRAPHIC_CELL_TABLE_VA_113C = 0x6fdeefa4

/**
 * `@va D2Common:0x6FD725F0` (`D2Common.#10483` `ITEMS_SetItemCell`,
 * stdcall `[esp+4] = pItem`, `[esp+8] = nItemCell`, `ret 8`, void).
 *
 * Asserts `pItem != NULL` (`0x107D`), `pItem->dwUnitType == 4` (`0x107E`), and
 * `pItem->pItemData (+0x14) != NULL` (`0x1080`), then stores `pItemData->dwItemCell (+0x28) = nItemCell`.
 */
export function ITEMS_SetItemCell113c(m: Memory113c, pItem: number, nItemCell: number): void {
  const item = pItem >>> 0
  if (item === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x107d)
  }
  if (m.get(item, D2UnitStrc.dwUnitType) !== 4) {
    throw new D2CommonAssertError('Items.cpp', 0x107e)
  }
  const pItemData = m.get(item, D2UnitStrc.pUnitData)
  if (pItemData === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1080)
  }
  m.set(pItemData, D2ItemDataStrc.dwItemCell, nItemCell >>> 0)
}

/**
 * `@va D2Common:0x6FD82E10` (`UNITS_ApplyRunWalkStatListInline`,
 * custom LTCG `eax = nCharClassId`, `[esp+4] = pUnit`, `ret 4`, void).
 *
 * Allocates a `0x3C`-byte `D2StatListStrc` with `dwFlags = 4`, looks up `CharStats.txt[nCharClassId]`,
 * and when `nWalkSpeed (+0x40) != 0`, sets stat `0x43` (`item_fastermovevelocity`) to
 * `trunc((nRunSpeed * 100) / nWalkSpeed) - 100` via `0x6FD8A280` (`STATLIST_SetStat113c`) and merges
 * the sub-list onto `pUnit` with `bType = 1` via `0x6FD8A7D0` (`STATLIST_MergeStatLists113c`).
 */
export function UNITS_ApplyRunWalkStatListInline113c(
  m: Memory113c,
  nCharClassId: number,
  pUnit: number,
): void {
  const u = pUnit >>> 0
  let dwOwnerId: number
  let eOwnerType: number
  let pMemPool: number
  if (u === 0) {
    dwOwnerId = 0xffffffff
    eOwnerType = 6
    pMemPool = 0
  } else {
    dwOwnerId = m.get(u, D2UnitStrc.dwUnitId)
    eOwnerType = m.get(u, D2UnitStrc.dwUnitType)
    pMemPool = m.get(u, D2UnitStrc.pMemPool)
  }

  const pStatList = m.alloc(D2StatListStrc_SIZE)
  for (let i = 0; i < 15; i++) {
    m.setU32((pStatList + i * 4) >>> 0, 0)
  }
  m.set(pStatList, D2StatListStrc.pMemPool, pMemPool)
  m.set(pStatList, D2StatListStrc.eOwnerType, eOwnerType)
  m.set(pStatList, D2StatListStrc.dwOwnerId, dwOwnerId)
  m.set(pStatList, D2StatListStrc.dwFlags, 4)
  m.set(pStatList, D2StatListStrc.dwExpireFrame, 0)

  let pCharStatsTxt = 0
  const cls = nCharClassId | 0
  if (cls >= 0) {
    const dt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
    if (cls < (m.u32((dt + DATATABLES_OFF_113C.nCharStatsTxtRecordCount) >>> 0) | 0)) {
      pCharStatsTxt =
        (m.u32((dt + DATATABLES_OFF_113C.pCharStatsTxt) >>> 0) +
          imul32(cls, D2CharStatsTxt_SIZE)) >>>
        0
    }
  }

  const nWalkSpeed = m.u8((pCharStatsTxt + D2CharStatsTxt.nWalkSpeed.off) >>> 0)
  if (nWalkSpeed !== 0) {
    const nRunSpeed = m.u8((pCharStatsTxt + D2CharStatsTxt.nRunSpeed.off) >>> 0)
    const nVelPercent = (Math.trunc(imul32(nRunSpeed, 100) / nWalkSpeed) - 100) | 0
    STATLIST_SetStat113c(m, pStatList, 0x43, nVelPercent, 0)
    STATLIST_MergeStatLists113c(m, u, pStatList, 1)
  }
}

/**
 * `@va D2Common:0x6FD87E20` (`D2Common.#10561` `STATLIST_FreeModStats`,
 * stdcall `[esp+4] = pUnit`, `ret 4`, void).
 *
 * When `pUnit != 0`, `pStatListEx = pUnit->pStatListEx (+0x5C) != 0`, and `(pStatListEx->dwFlags & 0x80000000) != 0`:
 * frees `pStatListEx->pModStat (+0x50)` if non-NULL, zeroes `pModStat`, and zeroes `wModStatCapacity (+0x56)` and `wModStatCount (+0x54)`.
 */
export function STATLIST_FreeModStats113c(m: Memory113c, pUnit: number): void {
  const u = pUnit >>> 0
  if (u === 0) return
  const pStatListEx = m.get(u, D2UnitStrc.pStatListEx)
  if (pStatListEx === 0) return
  if ((m.get(pStatListEx, D2StatListStrc.dwFlags) | 0) >= 0) return
  const pModStat = m.get(pStatListEx, D2StatListExStrc.pModStat)
  if (pModStat !== 0) {
    const pMemPool = m.get(pStatListEx, D2StatListStrc.pMemPool)
    void pMemPool
    ;(m as { free?: (p: number) => void }).free?.(pModStat)
    m.set(pStatListEx, D2StatListExStrc.pModStat, 0)
  }
  m.set(pStatListEx, D2StatListExStrc.wModStatCapacity, 0)
  m.set(pStatListEx, D2StatListExStrc.wModStatCount, 0)
}

/**
 * `@va D2Common:0x6FD8A9F0` (`STATLIST_FreeStatListImpl`,
 * custom LTCG `ecx = pStatList`, plain `ret`, void).
 *
 * Unlinks `pStatList` via `0x6FD8A3B0` (`STATLIST_RemoveSubList113c`), frees `pStat (+0x24)` if non-NULL,
 * and if extended (`(dwFlags & 0x80000000) != 0`), walks `pMyLastList (+0x3C)` along `pPrevLink (+0x2C)`
 * detaching child sub-lists and recursively freeing non-extended children, frees `pFullStat (+0x48)` and
 * `pModStat (+0x50)` if non-NULL, frees `pStateFlags (+0x58)`, and finally frees `pStatList`.
 */
export function STATLIST_FreeStatListImpl113c(m: Memory113c, pStatList: number): void {
  const esi = pStatList >>> 0
  STATLIST_RemoveSubList113c(m, esi)
  const pStat = m.get(esi, D2StatListStrc.pStat)
  if (pStat !== 0) {
    const pMemPool = m.get(esi, D2StatListStrc.pMemPool)
    void pMemPool
    ;(m as { free?: (p: number) => void }).free?.(pStat)
  }
  if ((m.get(esi, D2StatListStrc.dwFlags) | 0) < 0) {
    let ecx = m.get(esi, D2StatListExStrc.pMyLastList)
    while (ecx !== 0) {
      const edx = m.get(ecx, D2StatListStrc.dwFlags) | 0
      let eax = m.get(ecx, D2StatListStrc.pPrevLink)
      m.set(ecx, D2StatListStrc.pParent, 0)
      m.set(ecx, D2StatListStrc.pUnit, 0)
      if (edx >= 0) {
        if (m.get(esi, D2StatListExStrc.pMyLastList) === ecx) {
          m.set(esi, D2StatListExStrc.pMyLastList, eax)
        }
        STATLIST_FreeStatListImpl113c(m, ecx)
        eax = m.get(esi, D2StatListExStrc.pMyLastList)
      }
      ecx = eax
    }
    const pFullStat = m.get(esi, D2StatListExStrc.pFullStat)
    if (pFullStat !== 0) {
      const pMemPool = m.get(esi, D2StatListStrc.pMemPool)
      void pMemPool
      ;(m as { free?: (p: number) => void }).free?.(pFullStat)
    }
    const pModStat = m.get(esi, D2StatListExStrc.pModStat)
    if (pModStat !== 0) {
      const pMemPool = m.get(esi, D2StatListStrc.pMemPool)
      void pMemPool
      ;(m as { free?: (p: number) => void }).free?.(pModStat)
    }
    const pStateFlags = m.get(esi, D2StatListExStrc.pStateFlags)
    const pMemPoolEx = m.get(esi, D2StatListStrc.pMemPool)
    void pMemPoolEx
    if (pStateFlags !== 0) {
      ;(m as { free?: (p: number) => void }).free?.(pStateFlags)
    }
  }
  const pMemPoolSelf = m.get(esi, D2StatListStrc.pMemPool)
  void pMemPoolSelf
  ;(m as { free?: (p: number) => void }).free?.(esi)
}

/**
 * `@va D2Common:0x6FD8B0A0` (`D2Common.#10018` `STATLIST_GetUnitType`,
 * stdcall `[esp+4] = pStatList`, `ret 4` -> `pStatList->eOwnerType (+0x08)`).
 *
 * Asserts `pStatList != NULL` (`line 0x634`) and returns `pStatList->eOwnerType (+0x08)`.
 */
export function STATLIST_GetUnitType113c(m: Memory113c, pStatList: number): number {
  const s = pStatList >>> 0
  if (s === 0) {
    throw new D2CommonAssertError('Dungeon.cpp', 0x634)
  }
  return m.get(s, D2StatListStrc.eOwnerType) >>> 0
}

/**
 * `@va D2Common:0x6FD8B1A0` (`DUNGEON_GetRoomTileSubtypesPtr`,
 * stdcall `[esp+4] = pRoom`, `ret 4` -> `&pRoom->pRoomEx->pLevel->pTileSubtypes (+0x1E0)`).
 *
 * Asserts `pRoom != NULL` (`line 0x5B9`) and returns `(pRoom->pRoomEx (+0x10)->pLevel (+0x58) + 0x1E0) >>> 0`.
 */
export function DUNGEON_GetRoomTileSubtypesPtr113c(m: Memory113c, pRoom: number): number {
  const r = pRoom >>> 0
  if (r === 0) {
    throw new D2CommonAssertError('Dungeon.cpp', 0x5b9)
  }
  const pRoomEx = m.get(r, D2ActiveRoomStrc.pRoomEx)
  const pLevel = m.get(pRoomEx, D2RoomExStrc.pLevel)
  return (pLevel + 0x1e0) >>> 0
}

/**
 * `@va D2Common:0x6FD8B1E0` (`D2Common.#10691` `DUNGEON_GetActLevelId`,
 * stdcall `[esp+4] = nAct`, `ret 4` -> `dword [0x6FDE4084 + (nAct & 0xFF) * 4]`).
 *
 * Zero-extends `nAct & 0xFF`, asserts `(nAct & 0xFF) < 5` (`line 0x59A`), and returns
 * `m.u32(0x6FDE4084 + (nAct & 0xFF) * 4)`.
 */
export function DUNGEON_GetActLevelId113c(m: Memory113c, nAct: number): number {
  const actByte = nAct & 0xff
  if (actByte >= 5) {
    throw new D2CommonAssertError('Dungeon.cpp', 0x59a)
  }
  return m.u32((D2COMMON_ACT_LEVEL_IDS_VA_113C + actByte * 4) >>> 0) >>> 0
}

/**
 * `@va D2Common:0x6FD95780` (`STATLIST_UnpackSkillStatParam`,
 * stdcall `[esp+4] = nParam`, `[esp+8] = pOutDiv3`, `[esp+0xC] = pOutRem3`, `[esp+0x10] = pOutSkillIdx`, `ret 0x10`, void).
 *
 * Asserts `pOutDiv3 != 0 && pOutRem3 != 0 && pOutSkillIdx != 0` (`line 0x1AA`), unpacks
 * `low5 = nParam & 0x1F`, writes `*pOutDiv3 = trunc(low5 / 3)`, `*pOutRem3 = low5 % 3`,
 * and `*pOutSkillIdx = (nParam >> 5) & 0x1F`.
 */
export function STATLIST_UnpackSkillStatParam113c(
  m: Memory113c,
  nParam: number,
  pOutDiv3: number,
  pOutRem3: number,
  pOutSkillIdx: number,
): void {
  const outDiv = pOutDiv3 >>> 0
  const outRem = pOutRem3 >>> 0
  const outIdx = pOutSkillIdx >>> 0
  if (outDiv === 0 || outRem === 0 || outIdx === 0) {
    throw new D2CommonAssertError('SkillStat.cpp', 0x1aa)
  }
  const low5 = nParam & 0x1f
  const q = Math.trunc(low5 / 3) | 0
  const r = (low5 - q * 3) | 0
  m.setU32(outDiv, q >>> 0)
  m.setU32(outRem, r >>> 0)
  m.setU32(outIdx, ((nParam >> 5) & 0x1f) >>> 0)
}

/**
 * `@va D2Common:0x6FD96920` (`STATLIST_RollRandomItemGraphicStat`,
 * stdcall `[esp+4] = pItem`, `ret 4`, void).
 *
 * Rolls an item graphic cell from `.data` table `0x6FDEEFA0` (`nCount`) / `0x6FDEEFA4` (`dwCells[]`)
 * using `pItem->pItemData->dwSeed (+0x04)`, sets `pItem->pItemData->dwItemCell (+0x28)`, rolls a
 * secondary graphic value `((seed & 3) + 1) << 8` when `cell == 9 || cell == 7` (or `1` otherwise),
 * writes stat `0x47` via `0x6FD8A280` (`STATLIST_SetStat113c`), and if changed on `dwUnitType == 0`,
 * records `0x00470000` via `0x6FD88550` (`STATLIST_RecordModStat113c`).
 */
export function STATLIST_RollRandomItemGraphicStat113c(m: Memory113c, pItem: number): void {
  const item = pItem >>> 0
  let pSeed = 0
  if (item !== 0 && m.get(item, D2UnitStrc.dwUnitType) === 4) {
    const pItemData0 = m.get(item, D2UnitStrc.pUnitData)
    if (pItemData0 !== 0) {
      pSeed = (pItemData0 + D2ItemDataStrc.dwSeed.off) >>> 0
    }
  }

  const nCount = m.u32(D2COMMON_ITEM_GRAPHIC_CELL_COUNT_VA_113C) | 0
  let idx = 0
  if (nCount > 0) {
    const hi0 = m.u32((pSeed + 4) >>> 0)
    const lo0 = m.u32(pSeed)
    const next = BigInt(lo0) * 0x6ac690c5n + BigInt(hi0)
    const nextLo = Number(next & 0xffffffffn) >>> 0
    const nextHi = Number((next >> 32n) & 0xffffffffn) >>> 0
    m.setU32((pSeed + 4) >>> 0, nextHi)
    m.setU32(pSeed, nextLo)
    if ((nCount & (nCount - 1)) === 0) {
      idx = (nextLo & (nCount - 1)) >>> 0
    } else {
      idx = ((nextLo >>> 0) % (nCount >>> 0)) >>> 0
    }
  }

  const cellVal = m.u32((D2COMMON_ITEM_GRAPHIC_CELL_TABLE_VA_113C + idx * 4) >>> 0)
  if (item === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x107d)
  }
  if (m.get(item, D2UnitStrc.dwUnitType) !== 4) {
    throw new D2CommonAssertError('Items.cpp', 0x107e)
  }
  const pItemData = m.get(item, D2UnitStrc.pUnitData)
  if (pItemData === 0) {
    throw new D2CommonAssertError('Items.cpp', 0x1080)
  }
  m.set(pItemData, D2ItemDataStrc.dwItemCell, cellVal >>> 0)

  const cellVal2 = m.u32((D2COMMON_ITEM_GRAPHIC_CELL_TABLE_VA_113C + idx * 4) >>> 0)
  let statVal: number
  if (cellVal2 === 9 || cellVal2 === 7) {
    let pSeed2 = 0
    if (m.get(item, D2UnitStrc.dwUnitType) === 4) {
      const pData2 = m.get(item, D2UnitStrc.pUnitData)
      if (pData2 !== 0) {
        pSeed2 = (pData2 + D2ItemDataStrc.dwSeed.off) >>> 0
      }
    }
    const lo1 = m.u32(pSeed2)
    const hi1 = m.u32((pSeed2 + 4) >>> 0)
    const next2 = BigInt(lo1) * 0x6ac690c5n + BigInt(hi1)
    const nextLo2 = Number(next2 & 0xffffffffn) >>> 0
    const nextHi2 = Number((next2 >> 32n) & 0xffffffffn) >>> 0
    m.setU32((pSeed2 + 4) >>> 0, nextHi2)
    m.setU32(pSeed2, nextLo2)
    statVal = (((nextLo2 & 3) + 1) << 8) | 0
  } else {
    statVal = 1
  }

  const changed = STATLIST_SetStat113c(m, m.get(item, D2UnitStrc.pStatListEx), 0x47, statVal, 0)
  if (changed !== 0 && m.get(item, D2UnitStrc.dwUnitType) === 0) {
    STATLIST_RecordModStat113c(m, m.get(item, D2UnitStrc.pStatListEx), 0x00470000)
  }
}

function getTotalStatWithMinFromList113c(
  m: Memory113c,
  pStatList: number,
  dwKey: number,
  pIscRec: number,
): number {
  const isEx = (m.u32((pStatList + 0x10) >>> 0) & 0x80000000) !== 0
  const pHdr = isEx ? (pStatList + 0x48) >>> 0 : (pStatList + 0x24) >>> 0
  const idx = STATLIST_FindStatIndex113c(m, pHdr, dwKey)
  if (idx < 0) return 0
  const pEntry = (m.u32(pHdr) + idx * 8) >>> 0
  if (pEntry === 0) return 0
  let val = m.u32((pEntry + 4) >>> 0) | 0
  if (pIscRec !== 0) {
    const dl = m.u8((pIscRec + 5) >>> 0)
    const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
    if ((m.u8((pBitMasks + 8) >>> 0) & dl) !== 0 && isEx) {
      const pOwner = m.u32((pStatList + 0x44) >>> 0)
      if (pOwner !== 0) {
        const ownerType = m.u32(pOwner)
        if (ownerType === 0 || ownerType === 1) {
          const minVal = m.u32((pIscRec + 0x2c) >>> 0) | 0
          if (val < minVal) {
            const shift = m.u8((pIscRec + 0x18) >>> 0) & 0x1f
            val = (minVal << shift) | 0
          }
        }
      }
    }
  }
  return val >>> 0
}

function getBaseStatWithMinFromList113c(
  m: Memory113c,
  pStatList: number,
  dwKey: number,
  pIscRec: number,
): number {
  const pHdr = (pStatList + 0x24) >>> 0
  const idx = STATLIST_FindStatIndex113c(m, pHdr, dwKey)
  if (idx < 0) return 0
  const pEntry = (m.u32(pHdr) + idx * 8) >>> 0
  if (pEntry === 0) return 0
  let val = m.u32((pEntry + 4) >>> 0) | 0
  if (pIscRec !== 0) {
    const dl = m.u8((pIscRec + 5) >>> 0)
    const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
    if ((m.u8((pBitMasks + 8) >>> 0) & dl) !== 0) {
      if ((m.u32((pStatList + 0x10) >>> 0) | 0) < 0) {
        const pOwner = m.u32((pStatList + 0x44) >>> 0)
        if (pOwner !== 0) {
          const ownerType = m.u32(pOwner)
          if (ownerType === 0 || ownerType === 1) {
            const minVal = m.u32((pIscRec + 0x2c) >>> 0) | 0
            if (val < minVal) {
              const shift = m.u8((pIscRec + 0x18) >>> 0) & 0x1f
              val = (minVal << shift) | 0
            }
          }
        }
      }
    }
  }
  return val >>> 0
}

function propagateDeltaMem113c(
  m: Memory113c,
  pStartList: number,
  dwKey: number,
  delta: number,
  _pUnit: number,
): void {
  const d = delta | 0
  if (d === 0) return
  const statId = (dwKey >> 16) & 0xffff
  if ((statId | 0) < 0) return
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + 0xbd4) >>> 0) | 0)) return
  const iscBase = m.u32((sgpt + 0xbcc) >>> 0)
  const pIscRec = (iscBase + imul32(statId, 0x144)) >>> 0
  if (pIscRec === 0) return
  const startFlags = m.u32((pStartList + 0x10) >>> 0)
  if ((startFlags & 0x2000) !== 0) return
  const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
  const isDmgRelated = (m.u8((pIscRec + 4) >>> 0) & m.u32((pBitMasks + 8) >>> 0)) >>> 0
  let cur = (startFlags | 0) < 0 ? pStartList : m.u32((pStartList + 0x34) >>> 0)
  while (cur !== 0) {
    const bHasOpStat = m.u8((pIscRec + 0x51) >>> 0)
    const bIsOpTarget = bHasOpStat === 0 ? m.u8((pIscRec + 0x52) >>> 0) : 1
    if (bHasOpStat === 0 && bIsOpTarget === 0) {
      const pFullHdr = (cur + 0x48) >>> 0
      let idx = STATLIST_FindStatIndex113c(m, pFullHdr, dwKey)
      let entryPtr = idx >= 0 ? (m.u32(pFullHdr) + idx * 8) >>> 0 : 0
      if (entryPtr === 0) {
        m.u32(cur)
        const ins = STATLIST_FindInsertPos113c(m, pFullHdr, dwKey)
        entryPtr = insertStatSlot(m, pFullHdr, ins, dwKey)
        idx = ins
      }
      const prevVal = m.u32((entryPtr + 4) >>> 0) | 0
      const nextVal = (prevVal + d) | 0
      m.setU32((entryPtr + 4) >>> 0, nextVal >>> 0)
      if (nextVal > 0 && m.u8((pIscRec + 0x53) >>> 0) !== 0) {
        m.setU32((cur + 0x10) >>> 0, (m.u32((cur + 0x10) >>> 0) | 0x20000000) >>> 0)
      }
      if (m.u32((entryPtr + 4) >>> 0) === 0 && m.u8((pIscRec + 0x50) >>> 0) === 0) {
        m.u32(cur)
        removeStatSlot(m, pFullHdr, idx)
      }
      const pfOnValue = m.u32((cur + 0x5c) >>> 0)
      if (pfOnValue !== 0) {
        m.u8((pIscRec + 5) >>> 0)
        m.u8((m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C) + 0x0c) >>> 0)
      }
    } else {
      // 0x6FD89FFD..0x6FD8A003: op-stat source/target -> `0x6FD89CE0` (`STATLIST_RecomputeExStat`).
      STATLIST_RecomputeExStat113c(m, cur, statId, dwKey & 0xffff)
    }
    const curFlags = m.u32((cur + 0x10) >>> 0)
    cur = m.u32((cur + 0x34) >>> 0)
    if ((curFlags & 0x2000) !== 0) break
    if (isDmgRelated !== 0 && (curFlags & 0x40000000) !== 0) break
  }
}

function recordModStatMem113c(m: Memory113c, pListEx: number, dwKey: number): void {
  if ((m.u32((pListEx + 0x10) >>> 0) | 0) >= 0) return
  const statId = (dwKey >> 16) & 0xffff
  if (statId === 6 || statId === 8 || statId === 10 || statId === 13 || statId === 14) return
  if ((statId | 0) < 0) return
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + 0xbd4) >>> 0) | 0)) return
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + imul32(statId, 0x144)) >>> 0
  if (pIscRec === 0) return
  const dl = m.u8((pIscRec + 5) >>> 0)
  const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
  if ((m.u8((pBitMasks + 0x10) >>> 0) & dl) === 0) return
  const pModHdr = (pListEx + 0x50) >>> 0
  const ins = STATLIST_FindModStatInsertPos113c(m, pModHdr, dwKey)
  if (ins < 0) return
  const cap = (m.u16((pListEx + 0x56) >>> 0) << 16) >> 16
  const count = (m.u16((pListEx + 0x54) >>> 0) << 16) >> 16
  if (count >= cap) {
    const newCap = (cap + 4) & 0xffff
    const nextBuf = m.alloc(((newCap << 16) >> 16) * 4)
    const oldMod = m.u32(pModHdr)
    for (let i = 0; i < count * 4; i += 4) {
      m.setU32((nextBuf + i) >>> 0, m.u32((oldMod + i) >>> 0))
    }
    m.setU16((pListEx + 0x56) >>> 0, newCap)
    m.setU32(pModHdr, nextBuf)
  }
  const curCount = (m.u16((pListEx + 0x54) >>> 0) << 16) >> 16
  const pMod = m.u32(pModHdr)
  for (let i = curCount; i > ins; i--) {
    m.setU32((pMod + i * 4) >>> 0, m.u32((pMod + (i - 1) * 4) >>> 0))
  }
  m.setU32((pMod + ins * 4) >>> 0, dwKey >>> 0)
  m.setU16((pListEx + 0x54) >>> 0, (curCount + 1) & 0xffff)
}

/**
 * `@va D2Common:0x6FD88FF0` (`D2Common.#11116` `STATLIST_GetMaxDurabilityFromUnit`,
 * stdcall `[esp+4] = pUnit`, `ret 4` -> total stat `0x49` if base stat `0x49 != 0`, else `0`).
 */
export function STATLIST_GetMaxDurabilityFromUnit113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if ((m.u32((sgpt + 0xbd4) >>> 0) | 0) <= 0x49) return 0
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + 0x5c64) >>> 0
  if (pIscRec === 0) return 0
  const pStatList = m.u32((u + 0x5c) >>> 0)
  if (pStatList === 0) return 0
  if (getBaseStatWithMinFromList113c(m, pStatList, 0x00490000, pIscRec) === 0) return 0
  return getTotalStatWithMinFromList113c(m, pStatList, 0x00490000, pIscRec)
}

/**
 * `@va D2Common:0x6FD89050` (`D2Common.#10578` `STATLIST_GetMaxStaminaFromUnit`,
 * stdcall `[esp+4] = pUnit`, `ret 4` -> total stat `0x0B` or `0`).
 */
export function STATLIST_GetMaxStaminaFromUnit113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  const pStatList = m.u32((u + 0x5c) >>> 0)
  if (pStatList === 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if ((m.u32((sgpt + 0xbd4) >>> 0) | 0) <= 0x0b) return 0
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + 0xdec) >>> 0
  if (pIscRec === 0) return 0
  return getTotalStatWithMinFromList113c(m, pStatList, 0x000b0000, pIscRec)
}

/**
 * `@va D2Common:0x6FD890A0` (`D2Common.#10186` `STATLIST_GetMaxManaFromUnit`,
 * stdcall `[esp+4] = pUnit`, `ret 4` -> total stat `0x09` or `0`).
 */
export function STATLIST_GetMaxManaFromUnit113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  const pStatList = m.u32((u + 0x5c) >>> 0)
  if (pStatList === 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if ((m.u32((sgpt + 0xbd4) >>> 0) | 0) <= 0x09) return 0
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + 0xb64) >>> 0
  if (pIscRec === 0) return 0
  return getTotalStatWithMinFromList113c(m, pStatList, 0x00090000, pIscRec)
}

/**
 * `@va D2Common:0x6FD890F0` (`D2Common.#10913` `STATLIST_GetMaxLifeFromUnit`,
 * stdcall `[esp+4] = pUnit`, `ret 4` -> total stat `0x07` or `0`).
 */
export function STATLIST_GetMaxLifeFromUnit113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  const pStatList = m.u32((u + 0x5c) >>> 0)
  if (pStatList === 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if ((m.u32((sgpt + 0xbd4) >>> 0) | 0) <= 0x07) return 0
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + 0x8dc) >>> 0
  if (pIscRec === 0) return 0
  return getTotalStatWithMinFromList113c(m, pStatList, 0x00070000, pIscRec)
}

/**
 * `@va D2Common:0x6FD89140` (`D2Common.#10680` `STATLIST_GetStatValue`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = nStatId`, `[esp+0xC] = nLayer`, `ret 0xC`).
 */
export function STATLIST_GetStatValue113c(
  m: Memory113c,
  pStatList: number,
  nStatId: number,
  nLayer: number,
): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  const statId = nStatId | 0
  if (statId < 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + 0xbd4) >>> 0) | 0)) return 0
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + imul32(statId, 0x144)) >>> 0
  if (pIscRec === 0) return 0
  const dwKey = ((statId << 16) + (nLayer & 0xffff)) >>> 0
  return getBaseStatWithMinFromList113c(m, s, dwKey, pIscRec)
}

/**
 * `@va D2Common:0x6FD891A0` (`D2Common.#10848` `STATLIST_GetTotalStatValueLayer0`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = nStatId`, `ret 8`).
 */
export function STATLIST_GetTotalStatValueLayer0_113c(
  m: Memory113c,
  pStatList: number,
  nStatId: number,
): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  const statId = nStatId | 0
  if (statId < 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + 0xbd4) >>> 0) | 0)) return 0
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + imul32(statId, 0x144)) >>> 0
  if (pIscRec === 0) return 0
  return getTotalStatWithMinFromList113c(m, s, (statId << 16) >>> 0, pIscRec)
}

/**
 * `@va D2Common:0x6FD89380` (`STATLIST_GetStatBonusFromListInline`,
 * custom LTCG `eax = pStatList`, `esi = nStatId`, `[esp+4] = nLayer`, `ret 4`).
 */
export function STATLIST_GetStatBonusFromListInline113c(
  m: Memory113c,
  pStatList: number,
  nStatId: number,
  nLayer: number,
): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  const statId = nStatId | 0
  let totalVal = 0
  if (statId >= 0) {
    const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
    if (statId < (m.u32((sgpt + 0xbd4) >>> 0) | 0)) {
      const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + imul32(statId, 0x144)) >>> 0
      if (pIscRec !== 0) {
        const dwKey = ((statId << 16) + (nLayer & 0xffff)) >>> 0
        totalVal = getTotalStatWithMinFromList113c(m, s, dwKey, pIscRec) | 0
      }
    }
  }
  let baseVal = 0
  if (statId >= 0) {
    const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
    if (statId < (m.u32((sgpt + 0xbd4) >>> 0) | 0)) {
      const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + imul32(statId, 0x144)) >>> 0
      if (pIscRec !== 0) {
        const dwKey = ((statId << 16) + (nLayer & 0xffff)) >>> 0
        baseVal = getBaseStatWithMinFromList113c(m, s, dwKey, pIscRec) | 0
      }
    }
  }
  return ((totalVal - baseVal) | 0) >>> 0
}

/**
 * `@va D2Common:0x6FD89430` (`D2Common.#10910` `STATLIST_GetUnitStatWithLayer`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = nStatId`, `[esp+0xC] = nLayer`, `ret 0xC`).
 */
export function STATLIST_GetUnitStatWithLayer113c(
  m: Memory113c,
  pUnit: number,
  nStatId: number,
  nLayer: number,
): number {
  const pStatList = m.u32(((pUnit >>> 0) + 0x5c) >>> 0)
  if (pStatList === 0) return 0
  const statId = nStatId | 0
  if (statId < 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + 0xbd4) >>> 0) | 0)) return 0
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + imul32(statId, 0x144)) >>> 0
  if (pIscRec === 0) return 0
  const dwKey = ((statId << 16) + (nLayer & 0xffff)) >>> 0
  return getTotalStatWithMinFromList113c(m, pStatList, dwKey, pIscRec)
}

/**
 * `@va D2Common:0x6FD894E0` (`STATLIST_GetBaseStatFromListInline`,
 * custom LTCG `ecx = pStatList`, `eax = nStatId`, `[esp+4] = nLayer`, `ret 4`).
 */
export function STATLIST_GetBaseStatFromListInline113c(
  m: Memory113c,
  pStatList: number,
  nStatId: number,
  nLayer: number,
): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  const statId = nStatId | 0
  if (statId < 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (statId >= (m.u32((sgpt + 0xbd4) >>> 0) | 0)) return 0
  const pIscRec = (m.u32((sgpt + 0xbcc) >>> 0) + imul32(statId, 0x144)) >>> 0
  if (pIscRec === 0) return 0
  const dwKey = ((statId << 16) + (nLayer & 0xffff)) >>> 0
  return getBaseStatWithMinFromList113c(m, s, dwKey, pIscRec)
}

/**
 * `@va D2Common:0x6FD8A1D0` (`D2Common.#10745` `STATLIST_SetBaseStatEx`,
 * stdcall `[esp+4] = pStatList`, `[esp+8] = nStatId`, `[esp+0xC] = nValue`, `[esp+0x10] = nLayer`, `[esp+0x14] = pUnit`, `ret 0x14`).
 */
export function STATLIST_SetBaseStatEx113c(
  m: Memory113c,
  pStatList: number,
  nStatId: number,
  nValue: number,
  nLayer: number,
  pUnit: number,
): number {
  const s = pStatList >>> 0
  if (s === 0) return 0
  const dwKey = ((nStatId << 16) + (nLayer & 0xffff)) >>> 0
  const pBaseHdr = (s + 0x24) >>> 0
  let idx = STATLIST_FindStatIndex113c(m, pBaseHdr, dwKey)
  let pEntry = idx >= 0 ? (m.u32(pBaseHdr) + idx * 8) >>> 0 : 0
  const val = nValue | 0
  if (pEntry === 0) {
    if (val === 0) return 0
    m.u32(s)
    const ins = STATLIST_FindInsertPos113c(m, pBaseHdr, dwKey)
    pEntry = insertStatSlot(m, pBaseHdr, ins, dwKey)
    idx = ins
  }
  const oldVal = m.u32((pEntry + 4) >>> 0) | 0
  const delta = (val - oldVal) | 0
  if (delta === 0) return 0
  if (val === 0) {
    m.u32(s)
    removeStatSlot(m, pBaseHdr, idx)
  } else {
    m.setU32((pEntry + 4) >>> 0, val >>> 0)
  }
  propagateDeltaMem113c(m, s, dwKey, delta, pUnit >>> 0)
  if ((m.u32((s + 0x10) >>> 0) | 0) < 0 && m.u32((s + 0x08) >>> 0) === 0) {
    recordModStatMem113c(m, s, dwKey)
  }
  return 1
}

/** `D2Common 0x6FD517A0` (`eax = statId`): ItemStatCost record or `0` (signed range check vs `+0xBD4`). */
function getIscRecordOrZeroMem113c(m: Memory113c, statId: number): number {
  const id = statId | 0
  if (id < 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (id >= (m.u32((sgpt + 0xbd4) >>> 0) | 0)) return 0
  return (m.u32((sgpt + 0xbcc) >>> 0) + imul32(id, 0x144)) >>> 0
}

/**
 * Dynamic-op refresh shared by 0x6FD8A442..0x6FD8A4ED and 0x6FD8A87C..0x6FD8A91A: for an extended list with
 * `0x20000000` set, collects the `pFullStat (+0x48)` keys whose ItemStatCost `+0x53` byte is non-zero, then
 * re-evaluates each through `0x6FD89CE0` (`STATLIST_RecomputeExStat`).
 */
function refreshDynamicOpStatsMem113c(m: Memory113c, s: number): void {
  const flags = m.u32((s + 0x10) >>> 0)
  if ((flags | 0) >= 0 || (flags & 0x20000000) === 0) return
  const pArr = m.u32((s + 0x48) >>> 0)
  const count = (m.u16((s + 0x4c) >>> 0) << 16) >> 16
  const keys: number[] = []
  for (let i = 0; i < count; i++) {
    const k = m.u32((pArr + i * 8) >>> 0)
    const pRec = getIscRecordOrZeroMem113c(m, (k >> 16) & 0xffff)
    if (pRec !== 0 && m.u8((pRec + 0x53) >>> 0) !== 0) keys.push(k)
  }
  for (const k of keys) {
    if (getIscRecordOrZeroMem113c(m, (k >> 16) & 0xffff) !== 0) {
      STATLIST_RecomputeExStat113c(m, s, (k >> 16) & 0xffff, k & 0xffff)
    }
  }
}

/**
 * Propagates every entry of `s` (`pFullStat` when extended, else `pStat`) into `pTarget` via `0x6FD89F70`
 * with `sign * value`; when `bSkipDamageRelated`, entries whose ItemStatCost `+0x04` byte hits
 * `gdwBitMasks[2]` (`[0x6FDD90B0] + 8`) are skipped (0x6FD8A552..0x6FD8A55D / 0x6FD8A9AD..0x6FD8A9B8).
 */
function propagateSubListEntriesMem113c(
  m: Memory113c,
  s: number,
  pTarget: number,
  sign: number,
  bSkipDamageRelated: boolean,
): void {
  const flags = m.u32((s + 0x10) >>> 0)
  const pHdr = (flags | 0) < 0 ? (s + 0x48) >>> 0 : (s + 0x24) >>> 0
  const pArr = m.u32(pHdr)
  const count = (m.u16((pHdr + 4) >>> 0) << 16) >> 16
  for (let i = 0; i < count; i++) {
    const k = m.u32((pArr + i * 8) >>> 0)
    if (bSkipDamageRelated) {
      const pRec = getIscRecordOrZeroMem113c(m, (k >> 16) & 0xffff)
      if (pRec === 0) continue
      const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
      if ((m.u8((pBitMasks + 8) >>> 0) & m.u8((pRec + 4) >>> 0)) !== 0) continue
    }
    const v = m.u32((pArr + i * 8 + 4) >>> 0) | 0
    propagateDeltaMem113c(m, pTarget, k, imul32(sign, v), 0)
  }
}

/**
 * Memory port of `D2Common 0x6FD8A3B0` (`STATLIST_UnlinkSubListInternal`): unlinks `s` from its parent's
 * `pMyLastList (+0x3C)` / `pMyStats (+0x40)` and from the `+0x2C/+0x30` chain, clears `pPrev/pNext/pOwner`,
 * stops for `0x2000` lists, refreshes dynamic-op stats, then removes its entries from the parent (skipping
 * damage-related stats when `0x40000000` is set, 0x6FD8A50F). The trailing `pfnCallback (+0x38)` call
 * (0x6FD8A5A7..0x6FD8A5B6) is a host callback and is not modelled.
 */
function unlinkSubListMem113c(m: Memory113c, pSub: number): void {
  const s = pSub >>> 0
  if (s === 0) return
  const pParent = m.u32((s + 0x34) >>> 0)
  if (pParent !== 0) {
    if ((m.u32((pParent + 0x10) >>> 0) | 0) < 0) {
      if (m.u32((pParent + 0x3c) >>> 0) === s) {
        m.setU32((pParent + 0x3c) >>> 0, m.u32((s + 0x2c) >>> 0))
      }
      if (m.u32((pParent + 0x40) >>> 0) === s) {
        m.setU32((pParent + 0x40) >>> 0, m.u32((s + 0x2c) >>> 0))
      }
    }
    m.setU32((s + 0x34) >>> 0, 0)
  }
  const pNext = m.u32((s + 0x30) >>> 0)
  if (pNext !== 0) {
    m.setU32((pNext + 0x2c) >>> 0, m.u32((s + 0x2c) >>> 0))
  }
  const pPrev = m.u32((s + 0x2c) >>> 0)
  if (pPrev !== 0) {
    m.setU32((pPrev + 0x30) >>> 0, m.u32((s + 0x30) >>> 0))
  }
  m.u32((s + 0x04) >>> 0)
  const subFlags = m.u32((s + 0x10) >>> 0)
  m.setU32((s + 0x2c) >>> 0, 0)
  m.setU32((s + 0x30) >>> 0, 0)
  m.setU32((s + 0x04) >>> 0, 0)
  if ((subFlags & 0x2000) !== 0) return
  refreshDynamicOpStatsMem113c(m, s)
  if (pParent !== 0) {
    const bMerged = (m.u32((s + 0x10) >>> 0) & 0x40000000) !== 0
    propagateSubListEntriesMem113c(m, s, pParent, -1, bMerged)
  }
}

/**
 * Memory port of `D2Common 0x6FD8A7D0` (`STATLIST_MergeStatLists`, stdcall `(pUnit, pSub, bType)`): requires an
 * extended `pUnit->pStatListEx`, unlinks `pSub` (0x6FD8A7F8), returns if it is already in the parent chain,
 * links it as `pMyStats` (`0x2000` lists) or `pMyLastList`, refreshes dynamic-op stats (0x6FD8A87C), then
 * adds its entries into the parent: `bType != 0` clears `0x40000000` and adds all; `bType == 0` sets it and
 * skips damage-related stats (0x6FD8A973..0x6FD8A9D5).
 */
function mergeSubListMem113c(m: Memory113c, pTargetUnit: number, pSub: number, bType: number): void {
  const u = pTargetUnit >>> 0
  const s = pSub >>> 0
  const pParentEx = m.u32((u + 0x5c) >>> 0)
  if (pParentEx === 0 || (m.u32((pParentEx + 0x10) >>> 0) | 0) >= 0) return
  unlinkSubListMem113c(m, s)
  for (let cur = pParentEx; cur !== 0; cur = m.u32((cur + 0x34) >>> 0)) {
    if (cur === s) return
  }
  if ((m.u8((s + 0x10) >>> 0) & 0x04) !== 0) {
    m.setU32((pParentEx + 0x10) >>> 0, (m.u32((pParentEx + 0x10) >>> 0) | 0x02) >>> 0)
  }
  if ((m.u32((s + 0x10) >>> 0) & 0x2000) !== 0) {
    m.setU32((s + 0x2c) >>> 0, m.u32((pParentEx + 0x40) >>> 0))
    const oldSet = m.u32((pParentEx + 0x40) >>> 0)
    if (oldSet !== 0) {
      m.setU32((oldSet + 0x30) >>> 0, s)
    }
    m.setU32((s + 0x30) >>> 0, 0)
    m.setU32((pParentEx + 0x40) >>> 0, s)
    m.setU32((s + 0x34) >>> 0, pParentEx)
    m.setU32((s + 0x04) >>> 0, u)
    return
  }
  const oldLast = m.u32((pParentEx + 0x3c) >>> 0)
  m.setU32((s + 0x2c) >>> 0, oldLast)
  if (oldLast !== 0) {
    m.setU32((oldLast + 0x30) >>> 0, s)
  }
  m.setU32((s + 0x34) >>> 0, pParentEx)
  m.setU32((pParentEx + 0x3c) >>> 0, s)
  m.setU32((s + 0x04) >>> 0, u)
  refreshDynamicOpStatsMem113c(m, s)
  const flags = m.u32((s + 0x10) >>> 0)
  if (bType !== 0) {
    m.setU32((s + 0x10) >>> 0, (flags & 0xbfffffff) >>> 0)
    propagateSubListEntriesMem113c(m, s, pParentEx, 1, false)
  } else {
    m.setU32((s + 0x10) >>> 0, (flags | 0x40000000) >>> 0)
    propagateSubListEntriesMem113c(m, s, pParentEx, 1, true)
  }
}

/**
 * `@va D2Common:0x6FD8A5D0` (`D2Common.#11127` `STATLIST_UnlinkUnitStatList`,
 * stdcall `[esp+4] = pUnusedUnit`, `[esp+8] = pTargetUnit`, `ret 8`, void).
 */
export function STATLIST_UnlinkUnitStatList113c(
  m: Memory113c,
  _pUnusedUnit: number,
  pTargetUnit: number,
): void {
  const u = pTargetUnit >>> 0
  if (u === 0) return
  const pStatList = m.u32((u + 0x5c) >>> 0)
  if (pStatList === 0) return
  unlinkSubListMem113c(m, pStatList)
}

/**
 * `@va D2Common:0x6FD8A650` (`D2Common.#10343` `STATLIST_ClearBaseStats`,
 * stdcall `[esp+4] = pStatList`, `ret 4`, void).
 */
export function STATLIST_ClearBaseStats113c(m: Memory113c, pStatList: number): void {
  const s = pStatList >>> 0
  if (s === 0) return
  if ((m.u16((s + 0x28) >>> 0) << 16) >> 16 <= 0) return
  const pBaseHdr = (s + 0x24) >>> 0
  while ((m.u16((s + 0x28) >>> 0) << 16) >> 16 > 0) {
    const pArr0 = m.u32(pBaseHdr)
    const statId = m.u16((pArr0 + 2) >>> 0)
    const layer = m.u16(pArr0)
    const dwKey = ((statId << 16) + layer) >>> 0
    const idx = STATLIST_FindStatIndex113c(m, pBaseHdr, dwKey)
    if (idx >= 0) {
      const pEntry = (m.u32(pBaseHdr) + idx * 8) >>> 0
      if (pEntry !== 0) {
        const negVal = -(m.u32((pEntry + 4) >>> 0) | 0) | 0
        if (negVal !== 0) {
          m.u32(s)
          removeStatSlot(m, pBaseHdr, idx)
          propagateDeltaMem113c(m, s, dwKey, negVal, 0)
          if ((m.u32((s + 0x10) >>> 0) | 0) < 0 && m.u32((s + 0x08) >>> 0) === 0) {
            recordModStatMem113c(m, s, dwKey)
          }
        }
      }
    }
  }
}

/**
 * `@va D2Common:0x6FD8AAB0` (`D2Common.#10656` `STATLIST_UpdateUnitStateSetFlag`,
 * stdcall `[esp+4] = pUnit`, `[esp+8] = nState`, `[esp+0xC] = bSet`, `ret 0xC`).
 */
export function STATLIST_UpdateUnitStateSetFlag113c(
  m: Memory113c,
  pUnit: number,
  nState: number,
  bSet: number,
): number {
  const state = nState | 0
  if (state === 0) return 0
  const u = pUnit >>> 0
  const pListEx = m.u32((u + 0x5c) >>> 0)
  if (pListEx === 0) return 0
  if ((m.u32((pListEx + 0x10) >>> 0) | 0) >= 0) return 0
  const pSub = findSubListByStateAndFlags113c(m, pListEx, state)
  if (pSub === 0) return 0
  const subFlags = m.u32((pSub + 0x10) >>> 0)
  if (bSet !== 0) {
    if ((subFlags & 0x2000) !== 0) return 0
    unlinkSubListMem113c(m, pSub)
    m.setU32((pSub + 0x10) >>> 0, (m.u32((pSub + 0x10) >>> 0) | 0x2000) >>> 0)
    mergeSubListMem113c(m, u, pSub, 1)
    return 1
  }
  if ((subFlags & 0x2000) === 0) return 0
  unlinkSubListMem113c(m, pSub)
  m.setU32((pSub + 0x10) >>> 0, (m.u32((pSub + 0x10) >>> 0) & ~0x2000) >>> 0)
  mergeSubListMem113c(m, u, pSub, 1)
  return 1
}

/**
 * `@va D2Common:0x6FD96D50` (`STATLIST_RemoveItemDurabilityStatsModHandler`,
 * stdcall `[esp+4] = pItem`, `[esp+8..0x18] = a1..a5`, `[esp+0x1C] = pTargetUnit`, `ret 0x1C`).
 */
export function STATLIST_RemoveItemDurabilityStatsModHandler113c(
  m: Memory113c,
  pItem: number,
  _a1: number,
  _a2: number,
  _a3: number,
  _a4: number,
  _a5: number,
  pTargetUnit: number,
): number {
  const target = pTargetUnit >>> 0
  const u = target !== 0 && m.u32(target) === 4 ? target : pItem >>> 0
  for (const statKey of [0x00490000, 0x00480000]) {
    const pStatList = m.u32((u + 0x5c) >>> 0)
    if (pStatList !== 0) {
      const pBaseHdr = (pStatList + 0x24) >>> 0
      const idx = STATLIST_FindStatIndex113c(m, pBaseHdr, statKey)
      if (idx >= 0) {
        const pEntry = (m.u32(pBaseHdr) + idx * 8) >>> 0
        if (pEntry !== 0) {
          const negVal = -(m.u32((pEntry + 4) >>> 0) | 0) | 0
          if (negVal !== 0) {
            m.u32(pStatList)
            removeStatSlot(m, pBaseHdr, idx)
            propagateDeltaMem113c(m, pStatList, statKey, negVal, 0)
            if ((m.u32((pStatList + 0x10) >>> 0) | 0) < 0 && m.u32((pStatList + 0x08) >>> 0) === 0) {
              recordModStatMem113c(m, pStatList, statKey)
            }
            if (m.u32(u) === 0) {
              recordModStatMem113c(m, m.u32((u + 0x5c) >>> 0), statKey)
            }
          }
        }
      }
    }
  }
  return 1
}

/**
 * `@va D2Common:0x6FDA4A00` (`D2Common.#11089` `DATATBLS_CalculateMonsterStatsByLevel`,
 * stdcall `(nMonsterId, nGameType, nDifficulty, nLevel, nFlags, pOutStats) -> BOOL`, `ret 0x18`).
 */
export function DATATBLS_CalculateMonsterStatsByLevel113c(
  m: Memory113c,
  nMonsterId: number,
  nGameType: number,
  nDifficulty: number,
  nLevel: number,
  nFlags: number,
  pOutStats: number,
): number {
  const monId = nMonsterId | 0
  if (monId < 0) return 0
  const sgpt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  if (monId >= (m.u32((sgpt + 0xa80) >>> 0) | 0)) return 0
  const pMonStatsTxt = (m.u32((sgpt + 0xa78) >>> 0) + imul32(monId, 0x1a8)) >>> 0
  if (pMonStatsTxt === 0) return 0

  const monLvlCount = m.u32((sgpt + 0xb74) >>> 0) | 0
  const maxLvlIdx = (monLvlCount - 1) | 0
  let lvl = nLevel | 0
  if (lvl >= maxLvlIdx) lvl = maxLvlIdx
  if (lvl < 0 || lvl >= monLvlCount) return 0
  const pMonLvlTxt = (m.u32((sgpt + 0xb70) >>> 0) + imul32(lvl, 0x78)) >>> 0
  if (pMonLvlTxt === 0) return 0

  let diff = nDifficulty | 0
  if (diff <= 0) diff = 0
  else if (diff >= 2) diff = 2

  const bExp = (nGameType | 0) !== 0 ? 1 : 0
  const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
  const bNoRatio = (m.u8((pMonStatsTxt + 0x0c) >>> 0) & m.u8((pBitMasks + 8) >>> 0)) !== 0
  const flags = nFlags | 0
  const out = pOutStats >>> 0

  if ((flags & 0x01) !== 0) {
    let minHp = (m.u16((pMonStatsTxt + 0xb0 + diff * 2) >>> 0) << 16) >> 16
    let maxHp = (m.u16((pMonStatsTxt + 0xb6 + diff * 2) >>> 0) << 16) >> 16
    if (!bNoRatio) {
      const ratio = m.u32((pMonLvlTxt + (diff + (bExp + 4) * 3) * 4) >>> 0) | 0
      minHp = mulDiv113c(minHp, ratio, 100)
      maxHp = mulDiv113c(maxHp, ratio, 100)
    }
    m.setU32(out, minHp >>> 0)
    m.setU32((out + 0x04) >>> 0, maxHp >>> 0)
  }

  if ((flags & 0x02) !== 0) {
    let ac = (m.u16((pMonStatsTxt + 0xbc + diff * 2) >>> 0) << 16) >> 16
    if (!bNoRatio) {
      const ratio = m.u32((pMonLvlTxt + (diff + bExp * 3) * 4) >>> 0) | 0
      ac = mulDiv113c(ac, ratio, 100)
    }
    m.setU32((out + 0x08) >>> 0, ac >>> 0)
  }

  if ((flags & 0x04) !== 0) {
    let exp = (m.u16((pMonStatsTxt + 0xd4 + diff * 2) >>> 0) << 16) >> 16
    if (!bNoRatio) {
      const ratio = m.u32((pMonLvlTxt + (diff + (bExp + 8) * 3) * 4) >>> 0) | 0
      exp = mulDiv113c(exp, ratio, 100)
    }
    m.setU32((out + 0x10) >>> 0, exp >>> 0)
  }

  if ((flags & 0x08) !== 0) {
    let th = (m.u16((pMonStatsTxt + 0xc2 + diff * 2) >>> 0) << 16) >> 16
    let minD = (m.u16((pMonStatsTxt + 0xda + diff * 2) >>> 0) << 16) >> 16
    let maxD = (m.u16((pMonStatsTxt + 0xe0 + diff * 2) >>> 0) << 16) >> 16
    if (!bNoRatio) {
      const thRatio = m.u32((pMonLvlTxt + (diff + (bExp + 2) * 3) * 4) >>> 0) | 0
      const dmRatio = m.u32((pMonLvlTxt + (diff + (bExp + 6) * 3) * 4) >>> 0) | 0
      th = mulDiv113c(th, thRatio, 100)
      minD = mulDiv113c(minD, dmRatio, 100)
      maxD = mulDiv113c(maxD, dmRatio, 100)
    }
    m.setU32((out + 0x0c) >>> 0, th >>> 0)
    m.setU32((out + 0x14) >>> 0, minD >>> 0)
    m.setU32((out + 0x18) >>> 0, maxD >>> 0)
  }

  if ((flags & 0x10) !== 0) {
    let th = (m.u16((pMonStatsTxt + 0xc8 + diff * 2) >>> 0) << 16) >> 16
    let minD = (m.u16((pMonStatsTxt + 0xe6 + diff * 2) >>> 0) << 16) >> 16
    let maxD = (m.u16((pMonStatsTxt + 0xec + diff * 2) >>> 0) << 16) >> 16
    if (!bNoRatio) {
      const thRatio = m.u32((pMonLvlTxt + (diff + (bExp + 2) * 3) * 4) >>> 0) | 0
      const dmRatio = m.u32((pMonLvlTxt + (diff + (bExp + 6) * 3) * 4) >>> 0) | 0
      th = mulDiv113c(th, thRatio, 100)
      minD = mulDiv113c(minD, dmRatio, 100)
      maxD = mulDiv113c(maxD, dmRatio, 100)
    }
    m.setU32((out + 0x0c) >>> 0, th >>> 0)
    m.setU32((out + 0x1c) >>> 0, minD >>> 0)
    m.setU32((out + 0x20) >>> 0, maxD >>> 0)
  }

  if ((flags & 0x20) !== 0) {
    let th = (m.u16((pMonStatsTxt + 0xce + diff * 2) >>> 0) << 16) >> 16
    let minD = (m.u16((pMonStatsTxt + 0xf2 + diff * 2) >>> 0) << 16) >> 16
    let maxD = (m.u16((pMonStatsTxt + 0xf8 + diff * 2) >>> 0) << 16) >> 16
    if (!bNoRatio) {
      const thRatio = m.u32((pMonLvlTxt + (diff + (bExp + 2) * 3) * 4) >>> 0) | 0
      const dmRatio = m.u32((pMonLvlTxt + (diff + (bExp + 6) * 3) * 4) >>> 0) | 0
      th = mulDiv113c(th, thRatio, 100)
      minD = mulDiv113c(minD, dmRatio, 100)
      maxD = mulDiv113c(maxD, dmRatio, 100)
    }
    m.setU32((out + 0x0c) >>> 0, th >>> 0)
    m.setU32((out + 0x24) >>> 0, minD >>> 0)
    m.setU32((out + 0x28) >>> 0, maxD >>> 0)
  }

  const elSlots: Array<readonly [number, number, number, number]> = [
    [0x40, 0x10e, 0x120, 0x132],
    [0x80, 0x114, 0x126, 0x138],
    [0x100, 0x11a, 0x12c, 0x13e],
  ]
  for (const [bit, minOff, maxOff, lenOff] of elSlots) {
    if ((flags & bit) !== 0) {
      const minEl = (m.u16((pMonStatsTxt + minOff + diff * 2) >>> 0) << 16) >> 16
      const maxEl = (m.u16((pMonStatsTxt + maxOff + diff * 2) >>> 0) << 16) >> 16
      if (bNoRatio) {
        m.setU32((out + 0x24) >>> 0, minEl >>> 0)
        m.setU32((out + 0x28) >>> 0, maxEl >>> 0)
      } else {
        const elRatio = m.u32((pMonLvlTxt + (diff + (bExp + 6) * 3) * 4) >>> 0) | 0
        m.setU32((out + 0x2c) >>> 0, mulDiv113c(minEl, elRatio, 100) >>> 0)
        m.setU32((out + 0x30) >>> 0, mulDiv113c(maxEl, elRatio, 100) >>> 0)
      }
      const lenEl = (m.u16((pMonStatsTxt + lenOff + diff * 2) >>> 0) << 16) >> 16
      m.setU32((out + 0x34) >>> 0, lenEl >>> 0)
    }
  }

  return 1
}

/**
 * `@va D2Common:0x6FDBAB20` (`MISSILE_CalculateMasteryBonus`,
 * custom LTCG `eax = pUnit`, `ecx = nElemType`, `esi = nDamage`, plain `ret`).
 */
export function MISSILE_CalculateMasteryBonus113c(
  m: Memory113c,
  pUnit: number,
  nElemType: number,
  nDamage: number,
): number {
  const u = pUnit >>> 0
  const dmg = nDamage | 0
  if (u === 0 || dmg === 0) return 0
  let statId = -1
  switch (nElemType | 0) {
    case 1:
      statId = 0x149
      break
    case 2:
      statId = 0x14a
      break
    case 4:
    case 12:
      statId = 0x14b
      break
    case 5:
      statId = 0x14c
      break
    default:
      return 0
  }
  const pct = STATLIST_GetUnitStatWithLayer113c(m, u, statId, 0) | 0
  if (pct === 0) return 0
  return mulDiv113c(pct, dmg, 100) >>> 0
}

const ITEMMODS_ASSERT_FILE_113C = '..\\Source\\D2Common\\ITEMS\\ItemMods.cpp'

/**
 * `@va D2Common:0x6FD97020` (`ITEMMODS_GetOrCreateStatList`,
 * custom LTCG `ecx = pItem`, `eax = pUnit`, `[esp+4] = nStateId`, `[esp+8] = nFlags`, `ret 8` -> `D2StatListStrc*`).
 *
 * Selects `pTarget = pItem != 0 ? pItem : pUnit`. If `pTarget->pStatListEx (+0x5C)` is non-null and
 * extended (`dwFlags < 0`), searches via `0x6FD87F80` (`findSubListByStateAndFlags113c`) when `nStateId != 0`
 * or `0x6FD87F40` (`STATLIST_GetStatListFromFlag113c`) when `nStateId == 0`, returning any existing match.
 * Otherwise allocates a new `0x3C`-byte `D2StatListStrc` via `D2Common.#11013` (`0x6FD88100`) with
 * `(pMemPool = pTarget->pMemPool (+0x08), fFlags = nFlags, dwExpireFrame = 0, nUnitType = 4, dwUnitGuid = pTarget->dwUnitId (+0x0C))`,
 * merges it onto `pTarget` with `bType = 1` via `D2Common.#10807` (`0x6FD8A7D0`), asserts `pStatList != NULL`
 * at `ItemMods.cpp:0x201` (`513`), writes `pStatList->dwStateNo (+0x14) = nStateId`, and returns `pStatList`.
 */
export function ITEMMODS_GetOrCreateStatList113c(
  m: Memory113c,
  pItem: number,
  pUnit: number,
  nStateId: number,
  nFlags: number,
): number {
  const pTarget = (pItem >>> 0) !== 0 ? pItem >>> 0 : pUnit >>> 0
  const pStatListEx = m.u32((pTarget + D2UnitStrc.pStatListEx.off) >>> 0)
  if (pStatListEx !== 0 && (m.u32((pStatListEx + D2StatListStrc.dwFlags.off) >>> 0) | 0) < 0) {
    const pExisting =
      (nStateId | 0) !== 0
        ? findSubListByStateAndFlags113c(m, pStatListEx, nStateId)
        : STATLIST_GetStatListFromFlag113c(m, pStatListEx, nFlags)
    if (pExisting !== 0) {
      return pExisting >>> 0
    }
  }
  const dwUnitId = m.u32((pTarget + D2UnitStrc.dwUnitId.off) >>> 0)
  const pMemPool = m.u32((pTarget + D2UnitStrc.pMemPool.off) >>> 0)
  const pStatList = m.alloc(D2StatListStrc_SIZE)
  if (pStatList !== 0) {
    m.set(pStatList, D2StatListStrc.pMemPool, pMemPool)
    m.set(pStatList, D2StatListStrc.eOwnerType, 4)
    m.set(pStatList, D2StatListStrc.dwOwnerId, dwUnitId)
    m.set(pStatList, D2StatListStrc.dwFlags, nFlags >>> 0)
    m.set(pStatList, D2StatListStrc.dwExpireFrame, 0)
  }
  mergeSubListMem113c(m, pTarget, pStatList, 1)
  if (pStatList === 0) {
    throw new D2CommonAssertError(ITEMMODS_ASSERT_FILE_113C, 0x201)
  }
  m.set(pStatList, D2StatListStrc.dwStateNo, nStateId >>> 0)
  return pStatList >>> 0
}


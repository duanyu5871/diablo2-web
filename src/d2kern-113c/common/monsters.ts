/**
 * Diablo II v1.13c `D2Common.dll` monster helper leaf functions (`Monsters.cpp` block, image base `0x6FD50000`).
 *
 * Binary evidence (`objdump -d -M intel` on 1.13c `D2Common.dll`):
 * - `0x6FD6A660`: `MONSTERS_IsTownOrFriendlyUnit` (LTCG `edx = pUnit`, plain `ret` -> `0` or `1`)
 */
import type { Memory113c } from '../mem/sparse-memory.ts'
import { D2MonStatsTxt, D2MonStatsTxt_SIZE, D2UnitStrc } from '../mem/layout.generated.ts'
import {
  D2COMMON_GDWBITMASKS_IAT_VA_113C,
  D2COMMON_SGPT_DATATABLES_VA_113C,
  DATATABLES_OFF_113C,
} from './inline-helpers.ts'
import { imul32 } from './int-math.ts'

const UNIT_MONSTER = 1

/**
 * `@va D2Common:0x6FD6A660` (`MONSTERS_IsTownOrFriendlyUnit`,
 * internal LTCG `edx = pUnit`, plain `ret` -> `0` or `1`).
 *
 * Checks `pUnit != NULL && pUnit->dwUnitType == 1` (`0x6FD6A660..0x6FD6A669`), looks up the
 * `D2MonStatsTxt` record for `pUnit->dwClassId` via `sgptDataTables` (`+0xA78` / `+0xA80`, stride `0x1A8`),
 * tests `bFlags1 (+0x0D)` against `gdwBitMasks[0]` (`0x01`, `isSpawn`) and `gdwBitMasks[2]` (`0x04`, `inTown`)
 * (`0x6FD6A69A..0x6FD6A6B2`), and otherwise returns `(pUnit->dwFlags (+0xC4) >>> 31) !== 0 ? 1 : 0`.
 */
export function MONSTERS_IsTownOrFriendlyUnit113c(m: Memory113c, pUnit: number): number {
  const u = pUnit >>> 0
  if (u === 0) return 0
  if (m.get(u, D2UnitStrc.dwUnitType) !== UNIT_MONSTER) return 0

  const classId = m.get(u, D2UnitStrc.dwClassId) | 0
  if (classId < 0) return 0

  const dt = m.u32(D2COMMON_SGPT_DATATABLES_VA_113C)
  const count = m.u32((dt + DATATABLES_OFF_113C.nMonStatsTxtRecordCount) >>> 0) | 0
  if (classId >= count) return 0

  const pMonStatsBase = m.u32((dt + DATATABLES_OFF_113C.pMonStatsTxt) >>> 0)
  const pMonStats = (pMonStatsBase + imul32(classId, D2MonStatsTxt_SIZE)) >>> 0
  if (pMonStats === 0) return 0

  const bFlags1 = m.get(pMonStats, D2MonStatsTxt.nMonStatsFlags) & 0xff
  const pBitMasks = m.u32(D2COMMON_GDWBITMASKS_IAT_VA_113C)
  if ((m.u32(pBitMasks) & bFlags1) !== 0) return 1
  if ((m.u32((pBitMasks + 8) >>> 0) & bFlags1) !== 0) return 1

  const flag31 = m.get(u, D2UnitStrc.dwFlags) >>> 31
  return flag31 !== 0 ? 1 : 0
}

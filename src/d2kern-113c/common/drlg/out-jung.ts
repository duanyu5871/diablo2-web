/**
 * Diablo II v1.13c `D2Common.dll` unit component choice helper (`0x6FDD4C30`),
 * image base `0x6FD50000`.
 */
import type { Memory113c } from '../../mem/sparse-memory.ts';
import { DATATBLS_GetMonStats2TxtRecordFromMonStatsIdInline113c } from '../inline-helpers.ts';

/**
 * `@va D2Common:0x6FDD4C30` (`D2Common.#10035` `UNITS_GetMonStats2ComponentChoice113c`,
 * `__stdcall(pUnit, nComponent) -> uint8`, `ret 8`).
 *
 * Returns `pMonStats2Txt->nComponentChoice[nComponent]` (`+0x15 + nComponent`) for a valid
 * monster unit (`pUnit != 0 && pUnit->dwUnitType == 1`) and `nComponent < 16`, or `0` otherwise.
 */
export function UNITS_GetMonStats2ComponentChoice113c(
  m: Memory113c,
  pUnit: number,
  nComponent: number,
): number {
  const unit = pUnit >>> 0;
  if (unit === 0 || (m.u32(unit) | 0) !== 1) {
    return 0;
  }
  const comp = nComponent >>> 0;
  if (comp >= 0x10) {
    return 0;
  }
  const pMonStats2Txt = DATATBLS_GetMonStats2TxtRecordFromMonStatsIdInline113c(
    m,
    m.u32((unit + 0x04) >>> 0) | 0,
  );
  if (pMonStats2Txt === 0) {
    return 0;
  }
  return m.u8((pMonStats2Txt + comp + 0x15) >>> 0);
}

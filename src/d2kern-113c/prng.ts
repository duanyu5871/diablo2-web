/**
 * Diablo II v1.13c 64-bit LCG PRNG (D2SeedStrc).
 *
 * Ground truth from D2Common.dll / D2Game.dll:
 *   SEED_Next(D2SeedStrc* pSeed) -> int32:
 *     uint64_t v = (uint64_t)pSeed->lo * 0x6AC690C5ULL + pSeed->hi;
 *     pSeed->lo = (uint32_t)v;
 *     pSeed->hi = (uint32_t)(v >> 32);
 *     return (int32_t)pSeed->lo;
 *
 *   SEED_Roll(D2SeedStrc* pSeed, uint32_t nMax) -> uint32_t:
 *     if (nMax == 0) return 0;
 *     uint32_t raw = (uint32_t)SEED_Next(pSeed);
 *     return raw % nMax;
 */

import type { Memory113c } from './mem/sparse-memory.ts'
import { D2CommonAssertError, SEED_RollRandomNumberInline113c } from './common/inline-helpers.ts'

export interface D2SeedStrc {
  lo: number // uint32
  hi: number // uint32
}

const MULT = 0x6ac690c5n

export function seedInit(lo: number, hi: number = 0): D2SeedStrc {
  return {
    lo: lo >>> 0,
    hi: hi >>> 0,
  }
}

export function seedNext(seed: D2SeedStrc): number {
  const loBig = BigInt(seed.lo >>> 0)
  const hiBig = BigInt(seed.hi >>> 0)
  const prod = loBig * MULT + hiBig
  seed.lo = Number(prod & 0xffffffffn) >>> 0
  seed.hi = Number((prod >> 32n) & 0xffffffffn) >>> 0
  return (seed.lo | 0) // signed 32-bit int
}

/**
 * `SEED_RollLimited` (`D2Game:0x6FC21180` / `D2Common.#10920 @ 0x6FD510B0`).
 * @va D2Game:0x6FC21180
 * @va D2Common:0x6FD510B0
 */
export function seedRoll(seed: D2SeedStrc, nMax: number): number {
  const max = nMax | 0
  if (max <= 0) return 0
  const raw = seedNext(seed) >>> 0
  return (raw % (max >>> 0)) >>> 0
}

export const seedRollLimited113c = seedRoll

/**
 * `@va D2Common:0x6FD86740` (`D2Common.#10614` `SEED_InitLowSeed`,
 * fastcall `ecx = pSeed`, `edx = nLowSeed`, plain `ret`, void).
 *
 * Writes `pSeed->nLowSeed = nLowSeed` (`+0x00`) and `pSeed->nHighSeed = 0x29A` (`666`, `+0x04`).
 */
export function SEED_InitLowSeed113c(m: Memory113c, pSeed: number, nLowSeed: number): void {
  const s = pSeed >>> 0
  m.setU32(s, nLowSeed >>> 0)
  m.setU32((s + 4) >>> 0, 0x29a)
}

/**
 * `@va D2Common:0x6FD86750` (`D2Common.#10936` `SEED_InitSeed`,
 * fastcall `ecx = pSeed`, plain `ret`, void).
 *
 * Writes `pSeed->nLowSeed = 1` (`+0x00`) and `pSeed->nHighSeed = 0x29A` (`666`, `+0x04`).
 */
export function SEED_InitSeed113c(m: Memory113c, pSeed: number): void {
  const s = pSeed >>> 0
  m.setU32(s, 1)
  m.setU32((s + 4) >>> 0, 0x29a)
}

const PATH_WF_ASSERT_FILE_113C = '..\\Source\\D2Common\\PATH\\PathWF.cpp'

/**
 * `@va D2Common:0x6FD69A50` (`SEED_PickRandomListNode`,
 * custom LTCG `eax = pOwner`, plain `ret` -> `pNode`).
 *
 * Asserts `pOwner != NULL` (`PathWF.cpp:0x13E`) and `pOwner->pFirst (+0x10) != NULL` (`PathWF.cpp:0x13F`),
 * rolls `k = SEED_RollRandomNumberInline(&pOwner->seed (+0x1C4), pOwner->nCount (+0x08))`,
 * and advances `pNode = pOwner->pFirst (+0x10)` via `pNode = pNode->pNext (+0x24)` `k` times
 * (`while (k != 0) { pNode = [pNode + 0x24]; k--; }`).
 */
export function SEED_PickRandomListNode113c(m: Memory113c, pOwner: number): number {
  const owner = pOwner >>> 0
  if (owner === 0) {
    throw new D2CommonAssertError(PATH_WF_ASSERT_FILE_113C, 0x13e)
  }
  if (m.u32((owner + 0x10) >>> 0) === 0) {
    throw new D2CommonAssertError(PATH_WF_ASSERT_FILE_113C, 0x13f)
  }
  const nMax = m.u32((owner + 0x08) >>> 0) | 0
  let k = SEED_RollRandomNumberInline113c(m, (owner + 0x1c4) >>> 0, nMax) | 0
  let pNode = m.u32((owner + 0x10) >>> 0)
  while (k !== 0) {
    pNode = m.u32((pNode + 0x24) >>> 0)
    k = (k - 1) | 0
  }
  return pNode >>> 0
}


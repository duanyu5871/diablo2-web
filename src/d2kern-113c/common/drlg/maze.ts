import {
  D2DrlgLevelStrc,
  D2DrlgStrc,
} from '../../mem/layout.generated.js'
import type { Memory113c } from '../../mem/sparse-memory.js'
import { D2CommonAssertError, SEED_RollRandomNumberInline113c } from '../inline-helpers.js'
import { smod32 } from '../int-math.js'

/**
 * 0x6FD5E3E0 — DRLGMAZE_HasMapDS1 (73 bytes).
 * Custom register ABI: `ecx = pLevel` (`D2DrlgLevelStrc*`), plain `ret`.
 *
 * @va D2Common:0x6FD5E3E0
 */
export function DRLGMAZE_HasMapDS1113c(m: Memory113c, pLevel: number): number {
  if (pLevel === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Maze.cpp', 28)
  }
  const pMaze = m.get(pLevel, D2DrlgLevelStrc.pOutdoors)
  if (pMaze === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Maze.cpp', 30)
  }
  const pDrlg = m.get(pLevel, D2DrlgLevelStrc.pDrlg)
  const nDiff = m.get(pDrlg, D2DrlgStrc.nDifficulty)
  const val = m.u32((pMaze + nDiff * 4 + 0x04) >>> 0) | 0
  return val === 1 ? 1 : 0
}

const MAZE_LVLT_SWITCH_6FD5E6D0 = Uint8Array.from([
  0, 1, 20, 20, 2, 3, 20, 4, 20, 20, 5, 6, 7, 20, 8, 9,
  10, 20, 20, 11, 12, 13, 14, 20, 20, 15, 20, 20, 20, 16, 17, 18, 19,
])

const TABLE_6FDE6DF0 = Int32Array.from([
  0, 0, 0, 0, 0, 356, 355, 0, 0, 357, 354, 0, 0, 0, 0, 0,
])
const TABLE_6FDE6DF4 = Int32Array.from([
  0, 0, 0, 0, 0, 360, 359, 0, 0, 361, 358, 0, 0, 0, 0, 0,
])
const TABLE_6FDE6DF8 = Int32Array.from([
  0, 0, 0, 0, 0, 659, 660, 0, 0, 661, 662, 0, 0, 0, 0, 0,
])
const TABLE_6FDE6D70 = Int32Array.from([
  0, 0, 0, 0, 0, 1045, 1044, 0, 0, 1043, 1042, 0, 0, 0, 0, 0,
])
const TABLE_6FDE6D74 = Int32Array.from([
  0, 1056, 1055, 1057, 1054, 0, 0, 0, 1053, 0, 0, 0, 1058, 0, 0, 0,
])

/**
 * `@va D2Common:0x6FD5E490` (`DRLGMAZE_AssignMazeRoomPrestId113c`,
 * custom register ABI `ebx = pRoomEx`, `[esp+4] = bClearFlag2`, `ret 4 -> eax = pRoomEx`).
 */
export function DRLGMAZE_AssignMazeRoomPrestId113c(
  m: Memory113c,
  pRoomEx: number,
  bClearFlag2: number,
): number {
  const roomEx = pRoomEx >>> 0
  let esi = 0
  let edi = -1

  let pOrth = m.u32(roomEx)
  while (pOrth !== 0) {
    const dir = m.u32((pOrth + 0x04) >>> 0)
    if (dir === 0) esi |= 1
    else if (dir === 1) esi |= 8
    else if (dir === 2) esi |= 2
    else if (dir === 3) esi |= 4
    pOrth = m.u32((pOrth + 0x14) >>> 0)
  }

  const pLevel = m.u32((roomEx + 0x58) >>> 0)
  const nDrlgType = m.u32((pLevel + 0x1c0) >>> 0) | 0
  const idx = (nDrlgType - 3) >>> 0
  if (idx > 32) {
    throw new D2CommonAssertError('DrlgMaze.cpp', 0x160) // Fog.#10265: unhandled level type (line 352)
  }

  const caseId = MAZE_LVLT_SWITCH_6FD5E6D0[idx]!
  switch (caseId) {
    case 0:
      esi = (esi + 0x34) | 0
      break
    case 1:
      esi = (esi + 0x6c) | 0
      break
    case 2:
      esi = (esi + 0xa7) | 0
      break
    case 3:
      esi = (esi + 0xcd) | 0
      break
    case 4:
      esi = (esi + 0x101) | 0
      break
    case 5:
      esi = (esi + 0x12d) | 0
      break
    case 6:
      esi = TABLE_6FDE6DF0[esi]!
      break
    case 7: {
      const nLevelId = m.u32((pLevel + 0x1d0) >>> 0) | 0
      esi = TABLE_6FDE6DF4[esi]!
      if (nLevelId === 0x34) {
        if (esi === 0x169) edi = 2
      } else if (nLevelId === 0x36) {
        if (esi === 0x169 || esi === 0x167) edi = 3
      }
      break
    }
    case 8:
      esi = (esi + 0x19d) | 0
      break
    case 9:
      esi = (esi + 0x1e1) | 0
      break
    case 10:
      esi = (esi + 0x1fd) | 0
      break
    case 11:
      esi = (esi + 0x2f1) | 0
      break
    case 12: {
      const nLevelId = m.u32((pLevel + 0x1d0) >>> 0) | 0
      esi = TABLE_6FDE6DF8[esi]!
      if (nLevelId === 0x54) {
        if (esi === 0x296) esi = 0x298
      } else if (nLevelId === 0x55) {
        if (esi === 0x295) esi = 0x297
      }
      break
    }
    case 13:
      esi = (esi + 0x298) | 0
      break
    case 14:
      esi = (esi + 0x2c0) | 0
      break
    case 15:
      esi = (esi + 0x344) | 0
      break
    case 16:
      esi = TABLE_6FDE6D70[esi]!
      break
    case 17:
      if (DRLGMAZE_HasMapDS1113c(m, pLevel) === 0) {
        esi = (esi + 0x3ea) | 0
      }
      break
    case 18:
      esi = (esi + 0x422) | 0
      break
    case 19:
      esi = TABLE_6FDE6D74[esi]!
      break
    default:
      throw new D2CommonAssertError('DrlgMaze.cpp', 0x160) // Fog.#10265: unhandled level type (line 352)
  }

  if (esi !== 0) {
    const pPreset = m.u32((roomEx + 0x20) >>> 0)
    m.setU32(pPreset, esi >>> 0)
    m.setU32((pPreset + 0x04) >>> 0, edi >>> 0)
    const curFlags = m.u32((pPreset + 0x0c) >>> 0)
    if ((bClearFlag2 | 0) !== 0) {
      m.setU32((pPreset + 0x0c) >>> 0, (curFlags & ~2) >>> 0)
    } else {
      m.setU32((pPreset + 0x0c) >>> 0, (curFlags | 2) >>> 0)
    }
  }
  return roomEx
}

const MAZE_SPECIAL_SWITCH_6FD5EE24 = Uint8Array.from([
  0, 1, 15, 15, 2, 3, 15, 4, 15, 15, 5, 15, 15, 15, 6, 7,
  15, 15, 15, 8, 15, 9, 10, 15, 15, 11, 15, 15, 15, 15, 12, 13, 14,
])

const MAZE_SPECIAL_BASE_DEF = Int32Array.from([
  0x34, 0x6c, 0xa7, 0xcd, 0x101, 0x12d, 0x19d, 0x1e1,
  0x2f1, 0x298, 0x2c0, 0x344, 0x3ea, 0x422, 0x41c,
])

/**
 * `@va D2Common:0x6FD5ECB0` (`DRLGMAZE_PickSequentialSpecialPresetFileIndex113c`,
 * custom register ABI `eax = nPickedFile`, `ebx = pLevel`, `[esp+4] = pDrlgMap`, `ret 4`).
 */
export function DRLGMAZE_PickSequentialSpecialPresetFileIndex113c(
  m: Memory113c,
  nPickedFile: number,
  pLevel: number,
  pDrlgMap: number,
): void {
  const lvl = pLevel >>> 0
  const map = pDrlgMap >>> 0
  void m.u32((m.u32((lvl + 0x1b4) >>> 0) + 0x478) >>> 0)

  if ((nPickedFile | 0) !== -1) {
    m.setU32((map + 0x04) >>> 0, nPickedFile >>> 0)
    return
  }

  const pLvlPrestTxt = m.u32((map + 0x08) >>> 0)
  const nFiles = m.u32((pLvlPrestTxt + 0x40) >>> 0) | 0
  const nDef = m.u32(pLvlPrestTxt) | 0
  const idx = ((m.u32((lvl + 0x1c0) >>> 0) | 0) - 3) >>> 0
  if (idx > 32) {
    return
  }

  const caseId = MAZE_SPECIAL_SWITCH_6FD5EE24[idx]!
  if (caseId >= 15) {
    return
  }
  const baseDef = MAZE_SPECIAL_BASE_DEF[caseId]!
  if (nDef <= baseDef || nDef >= ((baseDef + 16) | 0)) {
    return
  }

  let pNode = m.u32((lvl + 0x1cc) >>> 0)
  while (pNode !== 0) {
    if ((m.u32(pNode) | 0) === nDef) {
      break
    }
    pNode = m.u32((pNode + 0x0c) >>> 0)
  }

  if (pNode === 0) {
    pNode = m.alloc(0x10)
    m.setU32(pNode, 0)
    m.setU32((pNode + 0x04) >>> 0, 0)
    m.setU32((pNode + 0x08) >>> 0, 0)
    m.setU32((pNode + 0x0c) >>> 0, 0)
    m.setU32(pNode, nDef >>> 0)
    m.setU32((pNode + 0x04) >>> 0, nFiles >>> 0)
    const randInit = SEED_RollRandomNumberInline113c(m, (lvl + 0x1c4) >>> 0, nFiles)
    m.setU32((pNode + 0x08) >>> 0, randInit >>> 0)
    m.setU32((pNode + 0x0c) >>> 0, m.u32((lvl + 0x1cc) >>> 0))
    m.setU32((lvl + 0x1cc) >>> 0, pNode)
  }

  const nextVal = smod32(((m.u32((pNode + 0x08) >>> 0) | 0) + 1) | 0, m.u32((pNode + 0x04) >>> 0) | 0)
  m.setU32((pNode + 0x08) >>> 0, nextVal >>> 0)
  m.setU32((map + 0x04) >>> 0, nextVal >>> 0)
}


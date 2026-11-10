/**
 * Diablo II v1.13c `D2Common.dll` preset-map (`Drlg\Preset.cpp` block) leaf functions, image base `0x6FD50000`.
 *
 * 1:1 ports of the cited disassembly. Neither function calls anything. Offsets come from
 * `mem/layout.generated.ts` (`D2DrlgMapStrc`, `D2DrlgCoordStrc` in `docs/oracle/route2-layout.json`).
 */
import type { Memory113c } from '../../mem/sparse-memory.ts'
import { D2DrlgCoordStrc, D2DrlgCoordStrc_SIZE, D2DrlgMapStrc } from '../../mem/layout.generated.ts'
import { D2CommonAssertError } from '../inline-helpers.ts'
import { sdiv32 } from '../int-math.ts'
import { STATLIST_FindStatIndex113c } from '../statlist.ts'
import { DRLGPRESET_FreePresetRoomGrids113c } from './drlg-grid.ts'

/**
 * `@va D2Common:0x6FD59C60` (`DRLGPRESET_FinalizePopsLocations`, not exported; LTCG `esi = pDrlgMap` + 1 stack arg `nPops`, `ret 4`).
 * Sole caller `0x6FD5C060` (`0x6FD5C562 push ecx; mov esi, ebp; call 0x6fd59c60`).
 *
 * - `0x6FD59C6C mov [esi+0x40], eax`: `pDrlgMap->nPops = nPops`; `jle` (signed) -> done when `nPops <= 0`.
 * - For `i` in `0 .. nPops)` (signed `jl`), `R = pDrlgMap->pPopsLocation (+0x50) + 0x10 * i` (re-read every iteration):
 *   - reads `R.x1 (+8)`, `R.x0 (+0)`, `R.y0 (+4)`, `R.y1 (+0xC)`; signed min/max (`jl` / `jg`);
 *   - `R.x0 = pDrlgMap->nPosX (+0x10) + xmin` (`0x6FD59CC0`), `R.y0 = pDrlgMap->nPosY (+0x14) + ymin` (`0x6FD59CCB`),
 *     `R.x1 = xmax - xmin + 1` (`0x6FD59CD5`), `R.y1 = ymax - ymin + 1` (`0x6FD59CD9`), all 32-bit wrapping;
 *   - `pDrlgMap->pPopsIndex (+0x44)[i] = idx / 4 - 1` with C truncating division (`0x6FD59CE4 cdq; and edx, 3;
 *     add eax, edx; sar eax, 2; dec eax`), i.e. `sdiv32(idx, 4) - 1`, NOT a flooring `>> 2`.
 */
export function DRLGPRESET_FinalizePopsLocations113c(m: Memory113c, pDrlgMap: number, nPops: number): void {
  const n = nPops | 0
  m.set(pDrlgMap, D2DrlgMapStrc.nPops, n >>> 0)
  if (n <= 0) return
  for (let i = 0; i < n; i++) {
    const pR = (m.get(pDrlgMap, D2DrlgMapStrc.pPopsLocation) + D2DrlgCoordStrc_SIZE * i) >>> 0
    const x1 = m.get(pR, D2DrlgCoordStrc.nWidth) | 0
    const x0 = m.get(pR, D2DrlgCoordStrc.nPosX) | 0
    const xmin = x0 < x1 ? x0 : x1
    const y0 = m.get(pR, D2DrlgCoordStrc.nPosY) | 0
    const y1 = m.get(pR, D2DrlgCoordStrc.nHeight) | 0
    const ymin = y0 < y1 ? y0 : y1
    const xmax = x0 > x1 ? x0 : x1
    const ymax = y0 > y1 ? y0 : y1
    m.set(pR, D2DrlgCoordStrc.nPosX, (m.get(pDrlgMap, D2DrlgMapStrc.nPosX) + xmin) >>> 0)
    m.set(pR, D2DrlgCoordStrc.nPosY, (m.get(pDrlgMap, D2DrlgMapStrc.nPosY) + ymin) >>> 0)
    m.set(pR, D2DrlgCoordStrc.nWidth, (xmax - xmin + 1) >>> 0)
    m.set(pR, D2DrlgCoordStrc.nHeight, (ymax - ymin + 1) >>> 0)
    const pIdx = (m.get(pDrlgMap, D2DrlgMapStrc.pPopsIndex) + i * 4) >>> 0
    m.setU32(pIdx, (sdiv32(m.u32(pIdx) | 0, 4) - 1) >>> 0)
  }
}

/**
 * `@va D2Common:0x6FD59DD0` (`D2Common.#10171` `DRLGPRESET_MovePointerAndClear`, fastcall `ecx = ppSrc`, `edx = ppDst`, plain `ret`).
 *
 * `mov eax, [ecx]; mov [edx], eax; mov dword [ecx], 0; mov eax, [edx]; ret`: moves ownership of a pointer and returns
 * the value re-read from `*ppDst` (so `ppSrc == ppDst` returns `0`).
 */
export function DRLGPRESET_MovePointerAndClear113c(m: Memory113c, ppSrc: number, ppDst: number): number {
  m.setU32(ppDst, m.u32(ppSrc))
  m.setU32(ppSrc, 0)
  return m.u32(ppDst)
}

/**
 * `D2Common.dll` `.data` pointer to `sgptDataTables`.
 *
 * `@va D2Common:0x6FDE9E1C`
 */
export const SGPT_DATA_TABLES_PTR_VA_6FDE9E1C = 0x6fde9e1c

/**
 * `D2Common.dll` `.bss` `sgptDataTables.pLvlPrestTxt` (`D2LvlPrestTxt*`).
 *
 * `@va D2Common:0x6FDF0B3C`
 */
export const SGPT_LVLPREST_TXT_VA_6FDF0B3C = 0x6fdf0b3c

/**
 * `@va D2Common:0x6FD59610` (`DRLGPRESET_ReadFileData113c`, not exported;
 * custom LTCG `esi = hFile`, `edi = nSize`, stack `[esp+4] = pBuffer`, `ret 4`).
 *
 * - Asserts `hFile != 0` (`line 135`, `0x87`).
 * - Calls `Fog.#10104` (`FOG_MPQReadFile(ecx=hFile, edx=pBuffer, nSize, &dwRead, 0, 0, 0)`):
 *   asserts non-zero return (`line 143`, `0x8F`) and `dwRead == nSize` (`line 146`, `0x92`),
 *   copying `nSize` bytes from `hFile` into `pBuffer`.
 */
export function DRLGPRESET_ReadFileData113c(
  m: Memory113c,
  hFile: number,
  nSize: number,
  pBuffer: number,
): void {
  if (hFile === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Preset.cpp', 135)
  }
  if (pBuffer === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Preset.cpp', 143)
  }
  if ((nSize | 0) < 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Preset.cpp', 146)
  }
  const len = nSize >>> 0
  for (let i = 0; i < len; i++) {
    m.setU8((pBuffer + i) >>> 0, m.u8((hFile + i) >>> 0))
  }
}

/**
 * `@va D2Common:0x6FD59700` (`DRLGPRESET_GetFileSize113c`, not exported;
 * custom LTCG `esi = hFile`, stack `[esp+4] = lpFileSizeHigh`, `ret 4`).
 *
 * - Asserts `hFile != 0` (`line 89`, `0x59`).
 * - Calls `Fog.#10105` (`FOG_MPQGetFileSize(ecx=hFile, edx=lpFileSizeHigh)`):
 *   reads `dwSizeLow = *(u32*)hFile`, optionally writes `*(u32*)(hFile + 4)` to `*lpFileSizeHigh`
 *   when `lpFileSizeHigh != 0`, asserts `dwSizeLow != 0` (`line 95`, `0x5F`), and returns `dwSizeLow`.
 */
export function DRLGPRESET_GetFileSize113c(
  m: Memory113c,
  hFile: number,
  lpFileSizeHigh: number,
): number {
  if (hFile === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Preset.cpp', 89)
  }
  const sizeLow = m.u32(hFile >>> 0)
  if (lpFileSizeHigh !== 0) {
    const sizeHigh = m.u32((hFile + 4) >>> 0)
    m.setU32(lpFileSizeHigh >>> 0, sizeHigh)
  }
  if (sizeLow === 0) {
    throw new D2CommonAssertError('..\\Source\\D2Common\\DRLG\\Preset.cpp', 95)
  }
  return sizeLow | 0
}

/**
 * `@va D2Common:0x6FD59D90` (`D2Common.#10850` `DRLGPRESET_FreeSaveHeaderBlock113c`,
 * fastcall `ecx = pMemPool`, `edx = pBlock`, plain `ret`).
 *
 * Reads `pData = pBlock->pData (+0x04)`, frees `pData` via `Fog.#10046`, then frees `pBlock` via `Fog.#10046`.
 */
export function DRLGPRESET_FreeSaveHeaderBlock113c(
  m: Memory113c,
  _pMemPool: number,
  pBlock: number,
): void {
  const freeFn = (m as { free?: (p: number) => void }).free
  const pData = m.u32((pBlock + 4) >>> 0)
  if (pData !== 0) {
    freeFn?.call(m, pData)
  }
  if (pBlock !== 0) {
    freeFn?.call(m, pBlock >>> 0)
  }
}

/**
 * `@va D2Common:0x6FD59DE0` (`D2Common.#10496` `DRLGPRESET_CloneSaveHeaderBlock113c`,
 * fastcall `ecx = pMemPool`, `edx = pSrcBlock`, plain `ret`).
 *
 * Allocates an 8-byte `D2SaveHeaderBlockStrc`, zeroes `[0, +4]`, copies `nCount = pSrcBlock->nCount (+0x00)`,
 * allocates `(nCount * 3) << 2` (`12 * nCount`) bytes at `pDstBlock->pData (+0x04)`, copies `(nCount * 3) << 2`
 * bytes from `pSrcBlock->pData (+0x04)`, and returns `pDstBlock`.
 */
export function DRLGPRESET_CloneSaveHeaderBlock113c(
  m: Memory113c,
  _pMemPool: number,
  pSrcBlock: number,
): number {
  const pDst = m.alloc(8)
  m.setU32(pDst, 0)
  m.setU32((pDst + 4) >>> 0, 0)
  const nCount = m.u32(pSrcBlock >>> 0)
  const allocBytes = (Math.imul(nCount | 0, 3) << 2) >>> 0
  m.setU32(pDst, nCount)
  const pBuf = m.alloc(allocBytes)
  const copyBytes = (Math.imul(m.u32(pDst) | 0, 3) << 2) >>> 0
  m.setU32((pDst + 4) >>> 0, pBuf)
  const pSrcData = m.u32((pSrcBlock + 4) >>> 0)
  const dwords = copyBytes >>> 2
  for (let i = 0; i < dwords; i++) {
    m.setU32((pBuf + i * 4) >>> 0, m.u32((pSrcData + i * 4) >>> 0))
  }
  for (let i = dwords << 2; i < copyBytes; i++) {
    m.setU8((pBuf + i) >>> 0, m.u8((pSrcData + i) >>> 0))
  }
  return pDst >>> 0
}

/**
 * `@va D2Common:0x6FD59FA0` (`DRLGPRESET_FreeDrlgFile113c`, not exported;
 * stdcall `(pDrlgFile)`, `ret 4`).
 *
 * - If `pDrlgFile->pBuffer (+0x04) != 0`, frees it via `Fog.#10043` (`0x6FD5922E`).
 * - If `pDrlgFile->pTileData (+0x50) != 0`, frees it via `Fog.#10046` (`0x6FD59228`).
 * - Walks `pDrlgFile->pPresetUnit (+0x54)` (next at `+0x0C`): if `pUnit->pSaveChain (+0x10) != 0`,
 *   frees `pSaveChain->pData (+0x04)` and `pSaveChain`, then frees `pUnit`.
 * - Finally frees `pDrlgFile` via `Fog.#10046`.
 */
export function DRLGPRESET_FreeDrlgFile113c(m: Memory113c, pDrlgFile: number): void {
  const freeFn = (m as { free?: (p: number) => void }).free
  const pBuffer = m.u32((pDrlgFile + 0x04) >>> 0)
  if (pBuffer !== 0) {
    freeFn?.call(m, pBuffer)
  }
  const pTileData = m.u32((pDrlgFile + 0x50) >>> 0)
  if (pTileData !== 0) {
    freeFn?.call(m, pTileData)
  }
  let pUnit = m.u32((pDrlgFile + 0x54) >>> 0)
  while (pUnit !== 0) {
    const curUnit = pUnit
    const pSaveChain = m.u32((curUnit + 0x10) >>> 0)
    pUnit = m.u32((curUnit + 0x0c) >>> 0)
    if (pSaveChain !== 0) {
      const pSaveData = m.u32((pSaveChain + 0x04) >>> 0)
      if (pSaveData !== 0) {
        freeFn?.call(m, pSaveData)
      }
      freeFn?.call(m, pSaveChain)
    }
    freeFn?.call(m, curUnit)
  }
  if (pDrlgFile !== 0) {
    freeFn?.call(m, pDrlgFile >>> 0)
  }
}

/**
 * `@va D2Common:0x6FD5AA80` (`DRLGPRESET_BuildRoomTombCoords113c`, not exported;
 * stdcall `(pRoomEx)`, `ret 4`).
 *
 * - Reads `pPresetRoom = pRoomEx->pTypeData (+0x20)`; if `pPresetRoom->pTombCoords (+0xF0) != 0`, returns immediately.
 * - Allocates `0x30` (`48`) bytes (`6` `D2CoordStrc` entries) at `pPresetRoom->pTombCoords (+0xF0)`.
 * - Scans `y = 0 .. pRoomEx->nTileHeight (+0x40) - 1`, `x = 0 .. pRoomEx->nTileWidth (+0x3C) - 1`
 *   in `pPresetRoom->pWallGrid0` (`pCells` at `+0x10`, `pRowOffsets` at `+0x14`):
 *   when `style == ((cell >>> 20) & 0x3F) == 10` and `0x17 <= ((cell >>> 8) & 0xFF) <= 0x1B` and `count < 6`,
 *   writes `subX = (pRoomEx->nTileXPos (+0x34) + x) * 5 + 2` and `subY = (pRoomEx->nTileYPos (+0x38) + y) * 5 + 2`
 *   into `pTombCoords[count++]`.
 * - Stores `count` at `pPresetRoom->nTombCoords (+0xF4)`.
 */
export function DRLGPRESET_BuildRoomTombCoords113c(m: Memory113c, pRoomEx: number): void {
  const pPresetRoom = m.u32((pRoomEx + 0x20) >>> 0)
  if (m.u32((pPresetRoom + 0xf0) >>> 0) !== 0) {
    return
  }
  const pBuf = m.alloc(0x30)
  m.setU32((pPresetRoom + 0xf0) >>> 0, pBuf)
  let count = 0
  const h0 = m.u32((pRoomEx + 0x40) >>> 0) | 0
  if (h0 > 0) {
    for (let y = 0; ; ) {
      const w0 = m.u32((pRoomEx + 0x3c) >>> 0) | 0
      if (w0 > 0) {
        for (let x = 0; ; ) {
          const pRowOffsets = m.u32((pPresetRoom + 0x14) >>> 0)
          const rowOff = m.u32((pRowOffsets + y * 4) >>> 0) | 0
          const pCells = m.u32((pPresetRoom + 0x10) >>> 0)
          const cell = m.u32((pCells + (((rowOff + x) | 0) << 2)) >>> 0)
          const style = (cell >>> 20) & 0x3f
          const seq = (cell >>> 8) & 0xff
          if (style === 10 && seq >= 0x17 && seq <= 0x1b && count < 6) {
            const subY = (Math.imul(((m.u32((pRoomEx + 0x38) >>> 0) | 0) + y) | 0, 5) + 2) | 0
            const pCoordsX = m.u32((pPresetRoom + 0xf0) >>> 0)
            const subX = (Math.imul(((m.u32((pRoomEx + 0x34) >>> 0) | 0) + x) | 0, 5) + 2) | 0
            m.setU32((pCoordsX + count * 8) >>> 0, subX >>> 0)
            const pCoordsY = m.u32((pPresetRoom + 0xf0) >>> 0)
            m.setU32((pCoordsY + count * 8 + 4) >>> 0, subY >>> 0)
            count = (count + 1) | 0
          }
          const curW = m.u32((pRoomEx + 0x3c) >>> 0) | 0
          x = (x + 1) | 0
          if (x >= curW) break
        }
      }
      const curH = m.u32((pRoomEx + 0x40) >>> 0) | 0
      y = (y + 1) | 0
      if (y >= curH) break
    }
  }
  m.setU32((pPresetRoom + 0xf4) >>> 0, count >>> 0)
}

/**
 * `@va D2Common:0x6FD5BC60` (`DRLGPRESET_AllocDrlgMap113c`, not exported;
 * custom LTCG `ebx = pSeed`, stack `[esp+4] = pLevel`, `[esp+8] = nLvlPrestId`, `[esp+0xC] = pBox`, `ret 0xC`).
 *
 * Allocates and zero-initializes a `0x58`-byte `D2DrlgMapStrc`, looks up `D2LvlPrestTxt` record `nLvlPrestId`
 * via `sgptDataTables` (`0x6FDE9E1C` `+0xC68` count, `0x6FDF0B3C` base, stride `0x1B0`), rolls `nPickedFile`
 * against `pPrest->dwFiles (+0x40)` using `pSeed`, initializes coordinates/dimensions from `pPrest` or `pBox`,
 * sets `bInited (+0x3C) = 1`, prepends to `pLevel->pPresetMaps (+0x1B0)`, and returns `pMap`.
 */
export function DRLGPRESET_AllocDrlgMap113c(
  m: Memory113c,
  pSeed: number,
  pLevel: number,
  nLvlPrestId: number,
  pBox: number,
): number {
  const pDrlg = m.u32((pLevel + 0x1b4) >>> 0)
  void m.u32((pDrlg + 0x478) >>> 0)
  const pMap = m.alloc(0x58)
  m.fill(pMap, 0x58, 0)

  let pPrest = 0
  const prestId = nLvlPrestId | 0
  if (prestId >= 0) {
    const pDataTables = m.u32(SGPT_DATA_TABLES_PTR_VA_6FDE9E1C)
    const dwRecs = m.u32((pDataTables + 0xc68) >>> 0) | 0
    if (prestId < dwRecs) {
      const pBase = m.u32(SGPT_LVLPREST_TXT_VA_6FDF0B3C)
      pPrest = (pBase + Math.imul(prestId, 0x1b0)) >>> 0
    }
  }
  m.setU32((pMap + 0x08) >>> 0, pPrest)
  m.setU32(pMap, prestId >>> 0)

  const nFiles = m.u32((pPrest + 0x40) >>> 0) | 0
  let pickedFile = 0
  if (nFiles > 0) {
    const hi0 = m.u32((pSeed + 4) >>> 0) >>> 0
    const lo0 = m.u32(pSeed >>> 0) >>> 0
    const prod = BigInt(lo0) * 0x6ac690c5n + BigInt(hi0)
    const newLo = Number(prod & 0xffffffffn) >>> 0
    const newHi = Number((prod >> 32n) & 0xffffffffn) >>> 0
    m.setU32((pSeed + 4) >>> 0, newHi)
    m.setU32(pSeed >>> 0, newLo)
    if ((nFiles & (nFiles - 1)) !== 0) {
      pickedFile = ((newLo >>> 0) % (nFiles >>> 0)) | 0
    } else {
      pickedFile = (newLo & (nFiles - 1)) | 0
    }
  }
  m.setU32((pMap + 0x04) >>> 0, pickedFile >>> 0)
  m.setU32((pMap + 0x10) >>> 0, m.u32(pBox >>> 0))
  const boxY = m.u32((pBox + 0x04) >>> 0)
  const pPrestCur = m.u32((pMap + 0x08) >>> 0)
  m.setU32((pMap + 0x14) >>> 0, boxY)

  const sizeX = m.u32((pPrestCur + 0x28) >>> 0)
  if (sizeX !== 0 && m.u32((pPrestCur + 0x2c) >>> 0) !== 0) {
    m.setU32((pMap + 0x18) >>> 0, sizeX)
    m.setU32((pMap + 0x1c) >>> 0, m.u32((pPrestCur + 0x2c) >>> 0))
  } else {
    m.setU32((pMap + 0x18) >>> 0, m.u32((pBox + 0x08) >>> 0))
    m.setU32((pMap + 0x1c) >>> 0, m.u32((pBox + 0x0c) >>> 0))
  }

  m.setU32((pMap + 0x3c) >>> 0, 1)
  m.setU32((pMap + 0x54) >>> 0, m.u32((pLevel + 0x1b0) >>> 0))
  m.setU32((pLevel + 0x1b0) >>> 0, pMap)
  return pMap >>> 0
}

export type StatEnumCallbackFn113c = (
  m: Memory113c,
  pUnit: number,
  nStatId: number,
  nValue: number,
  pArg: number,
) => void

/**
 * `@va D2Common:0x6FD88850` (`D2Common.#10984` `STATLIST_EnumerateCopyListStats113c`,
 * `__stdcall(pUnit, pArg, pfCallback)`, `ret 0xC`).
 *
 * Enumerates the `wCopyListCount` (`pStatListEx + 0x54`) packed stat keys in `pStatListEx->pCopyListKeys (+0x50)`
 * when `pUnit != 0`, `!(pArg == 0 && pfCallback != 0)`, `pStatListEx != 0`, `(pStatListEx->dwFlags & 0x80000000) != 0`,
 * and `wCopyListCount > 0`. For each key, looks up the stat in `&pStatListEx->FullStats (+0x24)` via `0x6FD882B0`
 * (`STATLIST_FindStatIndex113c`) and invokes `pfCallback(ecx=pUnit, edx=nStatId, nValue, pArg)` (passing `nValue = 0`
 * and `nStatId = (dwKey >> 16) & 0xFFFF` if absent).
 */
export function STATLIST_EnumerateCopyListStats113c(
  m: Memory113c,
  pUnit: number,
  pArg: number,
  pfCallback: number,
  customCallback?: StatEnumCallbackFn113c,
): void {
  if (pUnit === 0) return
  if (pArg === 0 && pfCallback !== 0) return

  const unit = pUnit >>> 0
  const pStatListEx = m.u32((unit + 0x5c) >>> 0)
  if (pStatListEx === 0) return
  if ((m.u32((pStatListEx + 0x10) >>> 0) | 0) >= 0) return
  if (((m.u16((pStatListEx + 0x54) >>> 0) << 16) >> 16) <= 0) return

  const pFullStats = (pStatListEx + 0x24) >>> 0
  let i = 0
  do {
    const pKeyArray = m.u32((pStatListEx + 0x50) >>> 0)
    const dwPackedKey = m.u32((pKeyArray + i * 4) >>> 0) | 0
    const idx = STATLIST_FindStatIndex113c(m, pFullStats, dwPackedKey)

    let nStatId: number
    let nValue: number
    const pStat = idx >= 0 ? (m.u32(pFullStats) + idx * 8) >>> 0 : 0
    if (idx >= 0 && pStat !== 0) {
      nValue = m.u32((pStat + 0x04) >>> 0) | 0
      nStatId = m.u16((pStat + 0x02) >>> 0)
    } else {
      nValue = 0
      nStatId = (dwPackedKey >> 16) & 0xffff
    }

    if (customCallback !== undefined) {
      customCallback(m, unit, nStatId, nValue, pArg)
    } else if (pfCallback !== 0 && pArg !== 0) {
      const arg = pArg >>> 0
      const nCalls = m.u32(arg)
      const base = (arg + 0x04 + nCalls * 12) >>> 0
      m.setU32(base, unit)
      m.setU32((base + 0x04) >>> 0, nStatId >>> 0)
      m.setU32((base + 0x08) >>> 0, nValue >>> 0)
      m.setU32(arg, (nCalls + 1) >>> 0)
    }

    i = (i + 1) | 0
  } while (i < ((m.u16((pStatListEx + 0x54) >>> 0) << 16) >> 16))
}

/**
 * `D2Common.dll` `.bss` `gpCachedPresetFileListHead` (`D2PresetFileCacheNodeStrc*`).
 *
 * `@va D2Common:0x6FDF147C`
 */
export const GP_CACHED_PRESET_FILE_LIST_HEAD_VA_6FDF147C = 0x6fdf147c

/**
 * `@va D2Common:0x6FD59900` (`DRLGPRESET_LoadFileFromArchive113c`, not exported;
 * custom LTCG `eax = szFileName`, stack `[esp+4] = pMemPool`, `[esp+8] = pdwSize`, `ret 8`).
 *
 * Opens `szFileName` via `Fog.#10102` (`FOG_MPQOpenFile(ecx=szFileName, edx=&hFile)`),
 * queries file size via `DRLGPRESET_GetFileSize113c(hFile, &dwSizeHigh)` (`0x6FD59700`),
 * allocates `dwSize + 0x320` (`dwSize + 800`) bytes via `Fog.#10042`, reads `dwSize` bytes
 * via `DRLGPRESET_ReadFileData113c(hFile, dwSize, pBuf)` (`0x6FD59610`), asserts `hFile != 0`
 * (`line 73`, `0x49`), closes `hFile` via `Fog.#10103`, writes `*pdwSize = dwSize` when `pdwSize != 0`,
 * and returns `pBuf`.
 */
export function DRLGPRESET_LoadFileFromArchive113c(
  m: Memory113c,
  szFileName: number,
  _pMemPool: number,
  pdwSize: number,
): number {
  const fileNamePtr = szFileName >>> 0
  if (fileNamePtr === 0) {
    return 0
  }
  const hFile = m.u32((fileNamePtr + 0x10) >>> 0)
  if (hFile === 0) {
    return 0
  }
  const dwSize = DRLGPRESET_GetFileSize113c(m, hFile, 0)
  const allocSize = ((dwSize | 0) + 0x320) >>> 0
  if (allocSize === 0) {
    return 0
  }
  const pBuf = m.alloc(allocSize)
  if (pBuf === 0) {
    return 0
  }
  DRLGPRESET_ReadFileData113c(m, hFile, dwSize, pBuf)
  if (pdwSize !== 0) {
    m.setU32(pdwSize >>> 0, dwSize >>> 0)
  }
  return pBuf >>> 0
}

/**
 * `@va D2Common:0x6FD59EA0` (`DRLGPRESET_CopyMapPresetUnitNode113c`, not exported;
 * custom LTCG `eax = pSrcNode`, `ebx = nOffsetY`, stack `[esp+4] = pMemPool`, `[esp+8] = nOffsetX`, `ret 8`).
 *
 * Allocates and zeroes a `0x20`-byte `D2PresetUnitStrc` via `Fog.#10045`, copies fields from `pSrcNode`
 * translating `nXPos (+0x08) += nOffsetX` and `nYPos (+0x18) += nOffsetY`, and when `pSrcNode->pSaveHdr (+0x10) != 0`,
 * clones it via `DRLGPRESET_CloneSaveHeaderBlock113c` (`0x6FD59DE0`) and offsets each 12-byte entry's
 * `(+0x04, +0x08)` coordinates by `(nOffsetX, nOffsetY)`.
 */
export function DRLGPRESET_CopyMapPresetUnitNode113c(
  m: Memory113c,
  pSrcNode: number,
  nOffsetY: number,
  pMemPool: number,
  nOffsetX: number,
): number {
  const src = pSrcNode >>> 0
  const offX = nOffsetX | 0
  const offY = nOffsetY | 0
  const pNew = m.alloc(0x20)
  m.fill(pNew, 0x20, 0)

  m.setU32((pNew + 0x14) >>> 0, m.u32((src + 0x14) >>> 0))
  m.setU32((pNew + 0x04) >>> 0, m.u32((src + 0x04) >>> 0))
  m.setU32(pNew, m.u32(src))
  m.setU32((pNew + 0x08) >>> 0, ((m.u32((src + 0x08) >>> 0) | 0) + offX) >>> 0)
  m.setU32((pNew + 0x18) >>> 0, ((m.u32((src + 0x18) >>> 0) | 0) + offY) >>> 0)
  m.setU32((pNew + 0x1c) >>> 0, m.u32((src + 0x1c) >>> 0))

  const pSrcSaveHdr = m.u32((src + 0x10) >>> 0)
  if (pSrcSaveHdr !== 0) {
    const pCloned = DRLGPRESET_CloneSaveHeaderBlock113c(m, pMemPool, pSrcSaveHdr) >>> 0
    m.setU32((pNew + 0x10) >>> 0, pCloned)
    const count0 = m.u32(pCloned) >>> 0
    if (count0 > 0) {
      let idx = 0
      let byteOff = 0
      do {
        const pHdr1 = m.u32((pNew + 0x10) >>> 0)
        const pArr1 = m.u32((pHdr1 + 0x04) >>> 0)
        const pX = (pArr1 + byteOff + 0x04) >>> 0
        m.setU32(pX, ((m.u32(pX) | 0) + offX) >>> 0)

        const pHdr2 = m.u32((pNew + 0x10) >>> 0)
        const pArr2 = m.u32((pHdr2 + 0x04) >>> 0)
        const pY = (pArr2 + byteOff + 0x08) >>> 0
        m.setU32(pY, ((m.u32(pY) | 0) + offY) >>> 0)

        const pHdr3 = m.u32((pNew + 0x10) >>> 0)
        const curCount = m.u32(pHdr3) >>> 0
        idx = (idx + 1) >>> 0
        byteOff = (byteOff + 0x0c) >>> 0
        if (idx >= curCount) {
          break
        }
      } while (true)
    }
  }
  return pNew >>> 0
}

/**
 * `@va D2Common:0x6FD5A5B0` (`DRLGPRESET_ReleaseCachedPresetFile113c`, not exported;
 * `__stdcall(ppFileData)`, `ret 4`).
 *
 * Searches `gpCachedPresetFileListHead` (`0x6FDF147C`) for the cache node whose `pDrlgFile (+0x108)`
 * matches `*ppFileData`, decrements `nRefCount (+0x104)`, and when `nRefCount <= 0`, unlinks the node,
 * frees `*ppFileData` via `DRLGPRESET_FreeDrlgFile113c` (`0x6FD59FA0`), frees the cache node via `Fog.#10046`,
 * and zeroes `*ppFileData`.
 */
export function DRLGPRESET_ReleaseCachedPresetFile113c(
  m: Memory113c,
  ppFileData: number,
): void {
  const ppFile = ppFileData >>> 0
  const pTarget = m.u32(ppFile)
  if (pTarget === 0) {
    return
  }

  let pCurr = m.u32(GP_CACHED_PRESET_FILE_LIST_HEAD_VA_6FDF147C)
  let pPrev = 0
  while (pCurr !== 0) {
    if (m.u32((pCurr + 0x108) >>> 0) === pTarget) {
      break
    }
    pPrev = pCurr
    pCurr = m.u32((pCurr + 0x10c) >>> 0)
  }

  const nextRef = ((m.u32((pCurr + 0x104) >>> 0) | 0) - 1) | 0
  m.setU32((pCurr + 0x104) >>> 0, nextRef >>> 0)
  if (pCurr === 0 || nextRef > 0) {
    return
  }

  const pNext = m.u32((pCurr + 0x10c) >>> 0)
  if (pPrev !== 0) {
    m.setU32((pPrev + 0x10c) >>> 0, pNext)
  } else {
    m.setU32(GP_CACHED_PRESET_FILE_LIST_HEAD_VA_6FDF147C, pNext)
  }

  DRLGPRESET_FreeDrlgFile113c(m, m.u32(ppFile))
  const freeFn = (m as { free?: (p: number) => void }).free
  freeFn?.call(m, pCurr)
  m.setU32(ppFile, 0)
}

/**
 * `@va D2Common:0x6FD5AEC0` (`DRLGPRESET_FreePresetRoomData113c`, not exported;
 * custom LTCG `esi = pRoomEx`, plain `ret`).
 *
 * Reads `pMemPool = pRoomEx->pLevel (+0x58)->pDrlg (+0x1B4)->pMemPool (+0x478)` and `pPreset = pRoomEx->pTypeData (+0x20)`.
 * When `pPreset != 0`, calls `DRLGPRESET_FreePresetRoomGrids113c(pRoomEx, pMemPool)` (`0x6FD5A440`), frees non-NULL
 * `pPreset->pMazeData (+0xF0)` and `pPreset` via `Fog.#10046`, and zeroes `pRoomEx->pTypeData (+0x20)`.
 */
export function DRLGPRESET_FreePresetRoomData113c(
  m: Memory113c,
  pRoomEx: number,
): void {
  const roomEx = pRoomEx >>> 0
  const pLevel = m.u32((roomEx + 0x58) >>> 0)
  const pDrlg = m.u32((pLevel + 0x1b4) >>> 0)
  const pMemPool = m.u32((pDrlg + 0x478) >>> 0)
  const pPreset = m.u32((roomEx + 0x20) >>> 0)
  if (pPreset !== 0) {
    DRLGPRESET_FreePresetRoomGrids113c(m, roomEx, pMemPool)
    const freeFn = (m as { free?: (p: number) => void }).free
    const pMazeData = m.u32((pPreset + 0xf0) >>> 0)
    if (pMazeData !== 0) {
      freeFn?.call(m, pMazeData)
    }
    freeFn?.call(m, pPreset)
    m.setU32((roomEx + 0x20) >>> 0, 0)
  }
}



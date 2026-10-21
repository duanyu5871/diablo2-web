/**
 * Issue #1357 — vendor stock cache: no reroll on window open/close, refresh after
 * leaving town, gamble preview ilvl reused, and required RNG.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'
import {
  generateGambleInventory,
  resolveGambledItem,
} from '../../src/common/items/vendor-generator.ts'
import { VendorNpcId } from '../../src/common/units/npc-table.ts'
import { getEmbeddedDropTables } from '../../src/common/items/embedded-drop-tables.ts'
import { D2Rng } from '../../src/common/rng/d2-rng.ts'

interface Entry {
  unitId: number
  code: string
  level: number
  ilvl?: number
  rawItemData?: { ilvl?: number; level?: number }
}
interface PlayerRecord {
  areaId: number
  gold: number
  activeNpcId: number | undefined
  activeVendorMode: 'trade' | 'gamble' | null
  vendorPools: Map<number, Entry[]>
  vendorPoolModes: Map<number, 'trade' | 'gamble'>
  items: Entry[]
}

function setup(seed: number): {
  game: GameInstance
  playerId: number
  record: PlayerRecord
  npcId: number
} {
  const game = new GameInstance({ seed, areaId: 1 })
  const playerId = game.connectPlayer({ charClass: 'pal', name: 'Shopper', x: 10, y: 10, areaId: 1 })
  const record = (game as unknown as { players: Map<number, PlayerRecord> }).players.get(playerId)!
  record.activeNpcId = undefined
  record.gold = 1_000_000
  const npcId = game.spawnMonster({
    classId: 154,
    name: 'Charsi',
    x: 11,
    y: 10,
    areaId: 1,
    isNpc: true,
    isVendor: true,
  })
  return { game, playerId, record, npcId }
}

describe('issue #1357 vendor refresh and gamble rolls', () => {
  it('keeps the generated shop across window open/close', () => {
    const { game, playerId, record, npcId } = setup(1357)
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'trade' } as never)
    game.stepFrames(1)
    const first = record.vendorPools.get(npcId)!.map((entry) => entry.unitId)
    game.enqueueCommand(playerId, { type: 'NpcCancel' })
    game.stepFrames(1)
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'trade' } as never)
    game.stepFrames(1)
    const second = record.vendorPools.get(npcId)!.map((entry) => entry.unitId)
    expect(second).toEqual(first)
  })

  it('refreshes the shop after leaving and returning to town', () => {
    const { game, playerId, record, npcId } = setup(1358)
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'trade' } as never)
    game.stepFrames(1)
    const first = record.vendorPools.get(npcId)!.map((entry) => entry.unitId)
    const transition = (game as unknown as {
      transitionPlayerArea: (p: PlayerRecord, area: number, arrival: { kind: string }) => boolean
    }).transitionPlayerArea.bind(game)
    transition(record, 2, { kind: 'townPortal' })
    transition(record, 1, { kind: 'townPortal' })
    record.activeNpcId = npcId
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'trade' } as never)
    game.stepFrames(1)
    const second = record.vendorPools.get(npcId)!.map((entry) => entry.unitId)
    expect(second).not.toEqual(first)
  })

  it('reuses the trade pool but refreshes the gamble pool on each open', () => {
    const { game, playerId, record } = setup(1360)
    const npcId = game.spawnMonster({
      classId: 147,
      name: 'Gheed',
      x: 12,
      y: 10,
      areaId: 1,
      isNpc: true,
      isVendor: true,
    })
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'trade' } as never)
    game.stepFrames(1)
    const tradeFirst = record.vendorPools.get(npcId)!.map((e) => e.unitId)
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'gamble' } as never)
    game.stepFrames(1)
    const gambleFirst = record.vendorPools.get(npcId)!.map((e) => e.unitId)
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'trade' } as never)
    game.stepFrames(1)
    expect(record.vendorPools.get(npcId)!.map((e) => e.unitId)).toEqual(tradeFirst)
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'gamble' } as never)
    game.stepFrames(1)
    expect(record.vendorPools.get(npcId)!.map((e) => e.unitId)).not.toEqual(gambleFirst)
  })

  it('reuses the gamble preview ilvl when the item is revealed', () => {
    const { game, playerId, record } = setup(1359)
    const npcId = game.spawnMonster({
      classId: 147,
      name: 'Gheed',
      x: 12,
      y: 10,
      areaId: 1,
      isNpc: true,
      isVendor: true,
    })
    record.activeNpcId = npcId
    game.enqueueCommand(playerId, { type: 'NpcAction', npcId, action: 'gamble' } as never)
    game.stepFrames(1)
    const preview = record.vendorPools.get(npcId)![0]!
    const previewIlvl = preview.rawItemData?.ilvl ?? preview.rawItemData?.level ?? preview.level
    game.enqueueCommand(playerId, { type: 'NpcBuy', npcId, itemId: preview.unitId, gamble: true } as never)
    game.stepFrames(1)
    const purchased = record.items[record.items.length - 1]!
    expect(purchased.level).toBe(previewIlvl)
  })

  it('requires an explicit RNG for generation and reveal', () => {
    const tables = getEmbeddedDropTables()
    expect(() =>
      generateGambleInventory({ vendorId: 0 as VendorNpcId, cLvl: 20, tables } as never),
    ).toThrow()
    const grid = generateGambleInventory({
      vendorId: 0 as VendorNpcId,
      cLvl: 20,
      tables,
      rng: new D2Rng(1),
    })
    const mystery = grid.list()[0]!.item
    expect(() =>
      resolveGambledItem({ mysteryItem: mystery, cLvl: 20, tables } as never),
    ).toThrow()
    expect(
      resolveGambledItem({ mysteryItem: mystery, cLvl: 20, tables, rng: new D2Rng(2) }).identified,
    ).toBe(true)
  })
})
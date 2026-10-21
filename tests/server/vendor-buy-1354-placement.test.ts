/**
 * Issue #1354 follow-up — potions go to the belt and stacks merge.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

function entry(id: number, code: string) {
  return {
    unitId: id, code, name: code, quality: 2, level: 1, location: 'vendor',
    x: 0, y: 0, width: 1, height: 1, areaId: 1, ownerId: 0, bodyLoc: 0,
    storePage: 1, cost: 50, gamble: false, identified: true, ethereal: false,
    socketed: false, totalSockets: 0, durability: 0, maxDurability: 0,
    quantity: 1, stats: new Map(), socketedItems: [], permStore: true,
  }
}

function setup(seed: number) {
  const game = new GameInstance({ seed, areaId: 1 })
  const playerId = game.connectPlayer({ charClass: 'pal', name: 'Buyer', x: 10, y: 10, areaId: 1 })
  const player = (game as unknown as {
    players: Map<number, {
      gold: number
      activeNpcId: number | undefined
      activeVendorMode: 'trade' | 'gamble' | null
      items: any[]
      vendorPools: Map<number, any[]>
    }>
  }).players.get(playerId)!
  const npcId = game.spawnMonster({
    classId: 154, name: 'Charsi', x: 11, y: 10, areaId: 1, isNpc: true, isVendor: true,
  })
  player.gold = 1000
  player.activeNpcId = npcId
  player.activeVendorMode = 'trade'
  player.items = []
  return { game, playerId, player, npcId }
}

describe('issue #1354 purchase placement', () => {
  it('puts a potion into a free belt slot', () => {
    const { game, playerId, player, npcId } = setup(1354)
    player.vendorPools.set(npcId, [entry(9901, 'hp1')])
    game.enqueueCommand(playerId, { type: 'NpcBuy', npcId, itemId: 9901, cost: 0 } as never)
    game.stepFrames(1)
    expect(player.items.some((it) => it.code === 'hp1' && it.location === 'belt')).toBe(true)
  })

  it('keeps potions as independent items instead of stacking them', () => {
    const { game, playerId, player, npcId } = setup(1355)
    const pile = { ...entry(9902, 'hp1'), unitId: 9903, location: 'inventory', quantity: 1 }
    player.items.push(pile)
    player.vendorPools.set(npcId, [entry(9902, 'hp1')])
    game.enqueueCommand(playerId, { type: 'NpcBuy', npcId, itemId: 9902, cost: 0 } as never)
    game.stepFrames(1)
    expect(pile.quantity).toBe(1)
    expect(player.items.filter((it) => it.code === 'hp1')).toHaveLength(2)
  })

  it('merges a purchased scroll into an unfilled tome instead of stacking scrolls', () => {
    const { game, playerId, player, npcId } = setup(13541)
    const tome = { ...entry(9911, 'tbk'), unitId: 9912, location: 'inventory', permStore: false, quantity: 7 }
    player.items.push(tome)
    player.vendorPools.set(npcId, [entry(9911, 'tsc')])
    game.enqueueCommand(playerId, { type: 'NpcBuy', npcId, itemId: 9911, cost: 0 } as never)
    game.stepFrames(1)
    expect(tome.quantity).toBe(8)
    expect(player.items.filter((it) => it.code === 'tsc')).toHaveLength(0)
    expect(player.items.filter((it) => it.code === 'tbk')).toHaveLength(1)
  })
})

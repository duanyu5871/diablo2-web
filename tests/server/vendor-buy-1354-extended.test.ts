/**
 * Issue #1354 follow-up — closed trade window must reject NpcBuy.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

interface Entry {
  unitId: number
  code: string
  name: string
  quality: number
  level: number
  location: string
  x: number
  y: number
  width: number
  height: number
  areaId: number
  ownerId: number
  bodyLoc: number
  storePage: number
  cost: number
  gamble: boolean
  identified: boolean
  ethereal: boolean
  socketed: boolean
  totalSockets: number
  durability: number
  maxDurability: number
  quantity: number
  stats: Map<number, number>
  socketedItems: unknown[]
}

function item(id: number): Entry {
  return {
    unitId: id, code: 'cap', name: 'Cap', quality: 2, level: 1,
    location: 'vendor', x: 0, y: 0, width: 1, height: 1, areaId: 1,
    ownerId: 0, bodyLoc: 0, storePage: 1, cost: 100, gamble: false,
    identified: true, ethereal: false, socketed: false, totalSockets: 0,
    durability: 10, maxDurability: 10, quantity: 1,
    stats: new Map(), socketedItems: [],
  }
}

describe('issue #1354 trade window validation', () => {
  it('rejects NpcBuy while the vendor window is closed', () => {
    const game = new GameInstance({ seed: 1354, areaId: 1 })
    const playerId = game.connectPlayer({ charClass: 'pal', name: 'Buyer', x: 10, y: 10, areaId: 1 })
    const player = (game as unknown as {
      players: Map<number, {
        gold: number
        activeNpcId: number | undefined
        activeVendorMode: 'trade' | 'gamble' | null
        vendorPools: Map<number, Entry[]>
      }>
    }).players.get(playerId)!
    const npcId = game.spawnMonster({
      classId: 154, name: 'Charsi', x: 11, y: 10, areaId: 1, isNpc: true, isVendor: true,
    })
    player.gold = 1000
    player.vendorPools.set(npcId, [item(9501)])

    game.enqueueCommand(playerId, { type: 'NpcBuy', npcId, itemId: 9501, cost: 0 })
    game.stepFrames(1)
    expect(player.gold).toBe(1000)
    expect(player.vendorPools.get(npcId)).toHaveLength(1)

    player.activeNpcId = npcId
    player.activeVendorMode = 'trade'
    game.enqueueCommand(playerId, { type: 'NpcBuy', npcId, itemId: 9501, cost: 0 })
    game.stepFrames(1)
    expect(player.gold).toBeLessThan(1000)
  })
})
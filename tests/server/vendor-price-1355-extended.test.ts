/**
 * Issue #1355 follow-up — repair-all uses D2Common #10071 and reduced-price
 * context matches the client's active weapon set.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'
import {
  computeRepairAllCost113c,
  type TransactionCostInput,
} from '../../src/common/items/transaction-cost.ts'

function equip(unitId: number, bodyLoc: number, durability: number, maxDurability: number, reduced = 0) {
  return {
    unitId, code: 'cap', name: 'Cap', quality: 2, level: 1, location: 'equipped',
    x: 0, y: 0, width: 1, height: 1, areaId: 1, ownerId: 1, bodyLoc,
    storePage: 0, cost: 100, gamble: false, identified: true, ethereal: false,
    socketed: false, totalSockets: 0, durability, maxDurability, quantity: 1,
    stats: new Map(reduced > 0 ? [[87, reduced]] : []), socketedItems: [],
  }
}

describe('issue #1355 repair-all and reduced prices', () => {
  it('charges exactly the #10071 repair-all total and repairs every equipped item', () => {
    const game = new GameInstance({ seed: 1355, areaId: 1 })
    const playerId = game.connectPlayer({ charClass: 'pal', name: 'Repair', x: 10, y: 10, areaId: 1 })
    const player = (game as unknown as {
      players: Map<number, {
        gold: number
        activeNpcId: number | undefined
        activeVendorMode: 'trade' | 'gamble' | null
        items: ReturnType<typeof equip>[]
      }>
    }).players.get(playerId)!
    const npcId = game.spawnMonster({
      classId: 154, name: 'Charsi', x: 11, y: 10, areaId: 1, isNpc: true, isVendor: true,
    })
    const weapon = equip(9001, 4, 0, 10)
    const shield = equip(9002, 5, 5, 10)
    player.items.push(weapon, shield)
    player.gold = 100_000
    player.activeNpcId = npcId
    player.activeVendorMode = 'trade'

    const internal = game as unknown as {
      transactionInputFromEntry: (item: unknown) => TransactionCostInput
      transactionCostContext: (player: unknown, npcClass: number) => unknown
    }
    const slots: (TransactionCostInput | null)[] = new Array(13).fill(null)
    for (const item of player.items) {
      if (item.location === 'equipped' && item.bodyLoc > 0 && item.bodyLoc < slots.length) {
        slots[item.bodyLoc] = internal.transactionInputFromEntry(item)
      }
    }
    const expected = computeRepairAllCost113c(
      slots,
      internal.transactionCostContext(player, 154) as never,
    )
    expect(expected).toBeGreaterThan(0)

    game.enqueueCommand(playerId, { type: 'NpcRepairAll', npcId })
    game.stepFrames(1)
    expect(player.gold).toBe(100_000 - expected)
    expect(weapon.durability).toBe(10)
    expect(shield.durability).toBe(10)
  })

  it('counts reduced-price stats from the active weapon set only', () => {
    const game = new GameInstance({ seed: 1356, areaId: 1 })
    const playerId = game.connectPlayer({ charClass: 'pal', name: 'Prices', x: 10, y: 10, areaId: 1 })
    const player = (game as unknown as {
      players: Map<number, { items: ReturnType<typeof equip>[] }>
    }).players.get(playerId)!
    player.items.push(equip(1, 4, 10, 10, 10))
    player.items.push(equip(2, 11, 10, 10, 50))
    const reduced = (game as unknown as {
      transactionCostContext: (player: unknown, npcClass: number) => { playerReducedPricesPct: number }
    }).transactionCostContext(player, 154).playerReducedPricesPct
    expect(reduced).toBe(10)
  })
})
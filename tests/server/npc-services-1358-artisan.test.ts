/**
 * Issue #1358 follow-up — artisan quest rewards.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

function item(unitId: number, code = 'cap', quality = 2, level = 20) {
  return {
    unitId, code, name: code, quality, level, location: 'inventory',
    x: 0, y: 0, width: 1, height: 1, areaId: 1, ownerId: 1, bodyLoc: 0,
    storePage: 0, cost: 100, gamble: false, identified: true, ethereal: false,
    socketed: false, totalSockets: 0, durability: 10, maxDurability: 10,
    quantity: 1, stats: new Map(), socketedItems: [],
  }
}

function setup(seed: number, npcClass: number) {
  const game = new GameInstance({ seed, areaId: 1 })
  const playerId = game.connectPlayer({ charClass: 'pal', name: 'Hero', x: 10, y: 10, areaId: 1 })
  const player = (game as unknown as {
    players: Map<number, { questFlags: Uint16Array; activeNpcId: number | undefined; items: any[] }>
  }).players.get(playerId)!
  const npcId = game.spawnMonster({
    classId: npcClass, name: 'NPC', x: 11, y: 10, areaId: 1, isNpc: true,
  })
  player.activeNpcId = npcId
  return { game, playerId, player, npcId }
}

describe('issue #1358 artisan quest rewards', () => {
  it('requires and consumes a1q5 for Charsi imbue, and rolls rare affixes', () => {
    const { game, playerId, player, npcId } = setup(1358, 154)
    const target = item(9701)
    player.items.push(target)
    game.enqueueCommand(playerId, { type: 'NpcEntityAction', npcId, action: 0, complement: 9701 } as never)
    game.stepFrames(1)
    expect(player.items.find((i) => i.code === 'cap').quality).toBe(2)
    expect(player.questFlags[3]! & 1).toBe(0)

    player.questFlags[3] |= 1
    game.enqueueCommand(playerId, { type: 'NpcEntityAction', npcId, action: 0, complement: 9701 } as never)
    game.stepFrames(1)
    expect(String(player.items.find((i) => i.code === 'cap').quality)).toBe('rare')
    expect(player.questFlags[3]! & 1).toBe(1)
  })

  it('requires a5q1 and grants Larzuk ilvl-tier max sockets', () => {
    const { game, playerId, player, npcId } = setup(1359, 511)
    const target = item(9702, 'cap', 2, 50)
    player.items.push(target)
    game.enqueueCommand(playerId, { type: 'NpcEntityAction', npcId, action: 0, complement: 9702 } as never)
    game.stepFrames(1)
    expect(target.totalSockets).toBe(0)

    player.questFlags[35] |= 1
    game.enqueueCommand(playerId, { type: 'NpcEntityAction', npcId, action: 0, complement: 9702 } as never)
    game.stepFrames(1)
    expect(target.totalSockets).toBeGreaterThan(0)
    expect(target.totalSockets).toBeLessThanOrEqual(6)
    expect(player.questFlags[35]! & 1).toBe(1)
  })

  it('Cain identify updates rawItemData so vendor pricing sees the item as identified', () => {
    const { game, playerId, player, npcId } = setup(1360, 146)
    const target = { ...item(9703, 'cap', 4, 10), identified: false, rawItemData: { identified: false } }
    player.items.push(target as never)
    const internal = game as unknown as {
      handleNpcIdentifyAll: (player: unknown, npcId: number) => void
      players: Map<number, unknown>
    }
    internal.handleNpcIdentifyAll(internal.players.get(playerId), npcId)
    expect(target.identified).toBe(true)
    expect((target.rawItemData as { identified?: boolean }).identified).toBe(true)
  })
})

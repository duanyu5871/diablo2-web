/**
 * Issue #1359 — drop context: SuperUniques TC, per-player act-boss quest kill,
 * and full MF/GF aggregation (charms / sockets).
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

interface Entry {
  unitId: number
  code: string
  location: string
  stats: Map<number, number>
  socketedItems: Entry[]
}
interface PlayerRecord {
  questFlags: Uint16Array
  items: Entry[]
}

function connect(game: GameInstance, name = 'Farmer'): number {
  return game.connectPlayer({ charClass: 'pal', name, x: 10, y: 10, areaId: 1 })
}

function record(game: GameInstance, id: number): PlayerRecord {
  return (game as unknown as { players: Map<number, PlayerRecord> }).players.get(id)!
}

function statEntry(unitId: number, location: string, mf: number, children: Entry[] = []): Entry {
  return {
    unitId,
    code: location === 'inventory' ? 'cm1' : 'cap',
    location,
    stats: new Map([[80, mf]]),
    socketedItems: children,
  }
}

describe('issue #1359 drop context', () => {
  it('stores the SuperUniques id on the boss record', () => {
    const game = new GameInstance({ seed: 1359, areaId: 1 })
    connect(game)
    const [bossId] = game.spawnSuperUnique({ superUniqueIndex: 6, x: 30, y: 30, areaId: 1 })
    const boss = (game as unknown as {
      monsters: Map<number, { superUniqueId?: string }>
    }).monsters.get(bossId)!
    expect(boss.superUniqueId?.toLowerCase()).toContain('countess')
  })

  it('marks the act-boss quest flag on the killer for the first kill', () => {
    const game = new GameInstance({ seed: 1360, areaId: 1 })
    const playerId = connect(game, 'BossKiller')
    const bossId = game.spawnMonster({
      defId: 'andariel',
      x: 12,
      y: 10,
      areaId: 1,
      hp: 10,
      maxHp: 10,
      experience: 1,
    })
    game.applyDamageToMonster(bossId, 1000, playerId)
    // a1q6 title qstsa1q6 -> word 6, bit 0 completed.
    expect(record(game, playerId).questFlags[6]! & 1).toBe(1)
  })

  it('counts equipped, charm and socketed MF in the drop context', () => {
    const game = new GameInstance({ seed: 1361, areaId: 1 })
    const playerId = connect(game, 'MfFarmer')
    const r = record(game, playerId)
    r.items.push(statEntry(9001, 'equipped', 25))
    r.items.push(statEntry(9002, 'inventory', 10, [statEntry(9003, 'socket', 15)]))
    const total = (game as unknown as {
      sumPlayerItemStat: (p: PlayerRecord, statId: number) => number
    }).sumPlayerItemStat(r, 80)
    expect(total).toBe(50)
  })
})
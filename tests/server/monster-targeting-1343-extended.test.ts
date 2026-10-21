/**
 * Issue #1343 — room sleep, line of sight, last-attacker threat and
 * mercenary/summon combat.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

function connect(game: GameInstance, x: number, y: number, name = 'Target'): number {
  return game.connectPlayer({ charClass: 'bar', name, x, y, areaId: 2 })
}

describe('issue #1343 monster targeting', () => {
  it('does not aggro through a wall (strict LOS, no path fallback)', () => {
    const game = new GameInstance({ seed: 1343, areaId: 2 })
    connect(game, 14, 10)
    const monsterId = game.spawnMonster({
      defId: 'fallen1',
      x: 10,
      y: 10,
      areaId: 2,
      aggroRadius: 40,
    })
    game.setTerrainWalkableCheck((_areaId, x) => x !== 12)
    game.stepFrames(30)
    expect(game.getMonster(monsterId)!.x).toBe(10)
  })

  it('sleeps monsters outside the player AOI even with a large aggro radius', () => {
    const game = new GameInstance({ seed: 1344, areaId: 2 })
    connect(game, 10, 10)
    const monsterId = game.spawnMonster({
      defId: 'fallen1',
      x: 100,
      y: 10,
      areaId: 2,
      aggroRadius: 200,
    })
    const before = game.getMonster(monsterId)!.x
    game.stepFrames(30)
    expect(game.getMonster(monsterId)!.x).toBe(before)
  })

  it('retaliates against the last attacker outside its normal aggro radius', () => {
    const game = new GameInstance({ seed: 1345, areaId: 2 })
    const playerId = connect(game, 10, 10)
    const monsterId = game.spawnMonster({
      defId: 'fallen1',
      x: 30,
      y: 10,
      areaId: 2,
      aggroRadius: 5,
      hp: 500,
      maxHp: 500,
      aiDisabled: false,
    })
    game.applyDamageToMonster(monsterId, 1, playerId)
    const before = game.getMonster(monsterId)!.x
    game.stepFrames(20)
    expect(game.getMonster(monsterId)!.x).toBeLessThan(before)
  })

  it('melee attacks on mercenaries use the combat pipeline and broadcast the swing', () => {
    const game = new GameInstance({ seed: 1346, areaId: 2 })
    const playerId = connect(game, 10, 30)
    const mercId = game.hireMercenary(playerId, {
      x: 12,
      y: 10,
      level: 5,
      hp: 500,
      maxHp: 500,
    })
    game.spawnMonster({
      defId: 'fallen1',
      x: 10,
      y: 10,
      areaId: 2,
      level: 99,
      ar: 100_000,
      minDmg: 20,
      maxDmg: 20,
      aggroRadius: 40,
    })
    game.drainEvents(playerId)
    const internal = game as unknown as {
      mercenaries: Map<number, { hp: number }>
    }
    const before = internal.mercenaries.get(mercId)!.hp
    game.stepFrames(15)
    const events = game.drainEvents(playerId)
    expect(internal.mercenaries.get(mercId)!.hp).toBeLessThan(before)
    expect(
      events.some(
        (e) => e.type === 'UnitMode' && (e as { unitType?: unknown }).unitType === 1,
      ),
    ).toBe(true)
  })
})
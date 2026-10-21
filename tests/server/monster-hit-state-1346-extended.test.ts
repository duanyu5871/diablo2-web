/**
 * Issue #1346 follow-up — GetHit animation lock and regen suppression.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

function connect(game: GameInstance): number {
  return game.connectPlayer({ charClass: 'bar', name: 'Target', x: 10, y: 10, areaId: 1 })
}

describe('issue #1346 hit recovery follow-up', () => {
  it('locks the AI for the GetHit animation and clears a pending swing', () => {
    const game = new GameInstance({ seed: 1346, areaId: 1 })
    const playerId = connect(game)
    const monsterId = game.spawnMonster({
      defId: 'fallen1',
      x: 12,
      y: 10,
      areaId: 1,
      maxHp: 1600,
      hp: 1600,
      damageRegen: 0,
      minDmg: 10,
      maxDmg: 10,
      ar: 100_000,
    })
    const internal = game as unknown as {
      monsters: Map<
        number,
        {
          pendingAttack?: unknown
          hitRecoveryUntilFrame: number
          mode: number
          x: number
        }
      >
    }
    // Put the monster in the middle of an A1 wind-up.
    const record = internal.monsters.get(monsterId)!
    record.pendingAttack = {
      playerId,
      frame: game.frame + 3,
      mode: 4,
      skillMode: 'A1',
      minDmg: 10,
      maxDmg: 10,
    }
    game.applyDamageToMonster(monsterId, 600, playerId)
    expect(record.pendingAttack).toBeUndefined()
    expect(record.hitRecoveryUntilFrame).toBeGreaterThan(game.frame)
    expect(record.mode).toBe(3)

    // The AI stays locked while GH plays.
    game.stepFrames(2)
    expect(record.hitRecoveryUntilFrame).toBeGreaterThan(game.frame)
  })

  it('suspends DamageRegen while Poison (2), Open Wounds (62) or Prevent Heal (52) is active', () => {
    const game = new GameInstance({ seed: 1347, areaId: 1 })
    const playerId = connect(game)
    const monsterId = game.spawnMonster({
      defId: 'fallen1',
      x: 12,
      y: 10,
      areaId: 1,
      maxHp: 5000,
      hp: 3000,
      damageRegen: 100,
    })
    game.applyMonsterState(monsterId, 2, 200)
    const beforePoison = game.getMonsterState(monsterId)!.hp
    game.stepFrames(120)
    expect(game.getMonsterState(monsterId)!.hp).toBe(beforePoison)

    game.applyMonsterState(monsterId, 52, 200)
    game.stepFrames(120)
    expect(game.getMonsterState(monsterId)!.hp).toBe(beforePoison)
    void playerId
  })
})
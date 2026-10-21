/**
 * Issue #1347 follow-up — resurrection action frame and Mind Blast conversion.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

function connect(game: GameInstance, x = 80, y = 80): number {
  return game.connectPlayer({ charClass: 'bar', name: 'Target', x, y, areaId: 1 })
}

describe('issue #1347 special AI follow-up', () => {
  it('revives on the S1 action frame, not on the cast frame', () => {
    const game = new GameInstance({ seed: 1347, areaId: 1 })
    const playerId = connect(game)
    game.spawnMonster({
      defId: 'fallenshaman1',
      x: 30,
      y: 30,
      areaId: 1,
      aiParams: [45, 60, 100, 24, 15],
    })
    const corpse = game.spawnMonster({
      defId: 'fallen1',
      x: 31,
      y: 30,
      areaId: 1,
      maxHp: 50,
      hp: 50,
    })
    game.applyDamageToMonster(corpse, 1000, playerId)
    game.drainEvents(playerId)

    game.stepFrames(1)
    expect(game.getMonsterState(corpse)!.dead).toBe(true)
    game.stepFrames(8)
    expect(game.getMonsterState(corpse)!.dead).toBe(false)
  })

  it('Mind Blast converts its targets to the caster while stunned', () => {
    const game = new GameInstance({ seed: 1348, areaId: 2 })
    const playerId = game.connectPlayer({
      charClass: 'ass',
      name: 'Sin',
      x: 100,
      y: 100,
      areaId: 2,
      level: 30,
      skills: { 273: 5 },
    })
    const targetId = game.spawnMonster({
      defId: 'fallen1',
      x: 101,
      y: 100,
      areaId: 2,
      hp: 5000,
      maxHp: 5000,
      damageRegen: 0,
    })
    game.enqueueCommand(playerId, {
      type: 'CastSkillAtLocation',
      skillId: 273,
      x: 101,
      y: 100,
      hand: 'right',
    })
    const pRec = (game as unknown as {
      players: Map<number, { skills: Map<number, number>; mana: number; manaFixed: number }>
    }).players.get(playerId)!
    expect([...pRec.skills.keys()]).toContain(273)
    pRec.mana = 500
    pRec.manaFixed = 500 * 256
    ;(pRec as unknown as { rightSkill: number }).rightSkill = 273
    game.stepFrames(5)
    const internal = game as unknown as {
      monsters: Map<
        number,
        { convertedUntilFrame: number; convertedByPlayerId: number; states: Set<number> }
      >
    }
    const target = internal.monsters.get(targetId)!
    expect(game.getMonsterState(targetId)!.states.has(21)).toBe(true)
    expect(target.convertedByPlayerId).toBe(playerId)
    expect(target.convertedUntilFrame).toBeGreaterThan(game.frame)
  })
})
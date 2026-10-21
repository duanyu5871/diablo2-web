/**
 * Issue #1344 — complete melee parity: action-frame damage, A2/S1 selection,
 * MonStats elemental riders and player block stats.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

interface MonsterRecord {
  mode: number
  pendingAttack?: { frame: number; mode: number; skillMode: string; minDmg: number; maxDmg: number }
  hasAttack2: boolean
  attack2MinDmg: number
  attack2MaxDmg: number
  elementalAttacks: unknown[]
}

function setup(seed: number): {
  game: GameInstance
  playerId: number
  monsterId: number
  player: { hp: number; hpFixed: number; items: unknown[] }
  monster: MonsterRecord
} {
  const game = new GameInstance({ seed, areaId: 1 })
  const playerId = game.connectPlayer({ charClass: 'pal', name: 'Target', x: 10, y: 10, areaId: 1 })
  const player = (game as unknown as {
    players: Map<number, { hp: number; hpFixed: number; items: unknown[] }>
  }).players.get(playerId)!
  const monsterId = game.spawnMonster({
    defId: 'fallen1',
    x: 11,
    y: 10,
    areaId: 1,
    minDmg: 10,
    maxDmg: 10,
    ar: 100000,
  })
  const monster = (game as unknown as { monsters: Map<number, MonsterRecord> }).monsters.get(monsterId)!
  return { game, playerId, monsterId, player, monster }
}

describe('issue #1344 melee attack completeness', () => {
  it('broadcasts the mode first and applies damage on the action frame', () => {
    const { game, playerId, player, monster } = setup(1344)
    ;(game as unknown as { rng: { rand: (n: number) => number } }).rng.rand = () => 50
    const hpBefore = player.hp
    game.drainEvents(playerId)
    game.stepFrames(1)
    expect(monster.pendingAttack).toBeDefined()
    expect([4, 5]).toContain(monster.mode)
    expect(player.hp).toBe(hpBefore)
    game.stepFrames(20)
    expect(player.hp).toBeLessThan(hpBefore)
  })

  it('selects A2 (mode 5) when the monster has an attack2 and the roll picks it', () => {
    const { game, monster } = setup(1345)
    monster.hasAttack2 = true
    monster.attack2MinDmg = 20
    monster.attack2MaxDmg = 20
    ;(game as unknown as { rng: { rand: (n: number) => number } }).rng.rand = () => 0
    game.stepFrames(1)
    expect(monster.mode).toBe(5)
    expect(monster.pendingAttack?.skillMode).toBe('A2')
  })

  it('adds MonStats elemental damage to the melee hit', () => {
    const plain = setup(1346)
    const elemental = setup(1346)
    plain.game.drainEvents(plain.playerId)
    elemental.game.drainEvents(elemental.playerId)
    elemental.monster.elementalAttacks = [
      { mode: 'A1', type: 'fire', chancePct: 100, minDamage: 30, maxDamage: 30, durationFrames: 0 },
    ]
    const plainHp = plain.player.hp
    const elementalHp = elemental.player.hp
    for (const ctx of [plain, elemental]) {
      ;(ctx.game as unknown as { rng: { rand: (n: number) => number } }).rng.rand = () => 50
      ctx.game.stepFrames(20)
    }
    expect(plainHp - plain.player.hp).toBeGreaterThan(0)
    expect(elementalHp - elemental.player.hp).toBeGreaterThan(plainHp - plain.player.hp)
  })
})
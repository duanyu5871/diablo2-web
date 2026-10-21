/**
 * Issue #1336 — server-side 1.13c stamina drain/recovery and life/mana regeneration.
 *
 * The authoritative GameInstance must step the same per-frame vitals the client HUD sees:
 * running drains stamina, walking/idle recovers it, mana regenerates over CharStats
 * `ManaRegen` seconds, and life regenerates from `maxhp/65536` + `hpregen`.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../src/server/engine/game-instance.ts'

interface MutablePlayer {
  maxStaminaFixed: number
  staminaFixed: number
  stamina: number
  maxStamina: number
  maxManaFixed: number
  manaFixed: number
  mana: number
  maxMana: number
  maxHpFixed: number
  hpFixed: number
  hp: number
  maxHp: number
  run: boolean
  targetX: number
  targetY: number
}

function playerRecord(game: GameInstance, id: number): MutablePlayer {
  return (game as unknown as { players: Map<number, MutablePlayer> }).players.get(id)!
}

function makeRunner(): { game: GameInstance; id: number; record: MutablePlayer } {
  const game = new GameInstance({ seed: 1336, difficulty: 0, areaId: 1 })
  const id = game.connectPlayer({ charClass: 'bar', name: 'Runner', x: 100, y: 100, areaId: 1 })
  game.drainEvents(id)
  const record = playerRecord(game, id)
  record.maxStaminaFixed = 200 * 256
  record.staminaFixed = 200 * 256
  record.stamina = 200
  record.maxStamina = 200
  record.maxManaFixed = 500 * 256
  record.manaFixed = 0
  record.mana = 0
  record.maxMana = 500
  record.maxHpFixed = 1000 * 256
  record.hpFixed = 500 * 256
  record.hp = 500
  record.maxHp = 1000
  return { game, id, record }
}

describe('issue #1336: server player vitals', () => {
  it('drains stamina while running and regenerates life/mana every tick', () => {
    const { game, id } = makeRunner()
    game.enqueueCommand(id, { type: 'Move', to: { x: 300, y: 100 }, run: true })
    game.stepFrames(100)

    const after = game.getPlayerState(id)!
    expect(after.stamina).toBeLessThan(200)
    expect(after.mana).toBeGreaterThan(0)
    expect(after.hp).toBeGreaterThan(500)
  })

  it('recovers stamina when walking/idle after the run stops', () => {
    const { game, id } = makeRunner()
    game.enqueueCommand(id, { type: 'Move', to: { x: 140, y: 100 }, run: true })
    game.stepFrames(80)
    const drained = game.getPlayerState(id)!.stamina
    expect(drained).toBeLessThan(200)

    game.stepFrames(100)
    expect(game.getPlayerState(id)!.stamina).toBeGreaterThan(drained)
  })
})
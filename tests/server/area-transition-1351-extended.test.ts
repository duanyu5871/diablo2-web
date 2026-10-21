/**
 * Issue #1351 follow-up — NPC travel is gated by quest flags, not waypoints.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

function connect(game: GameInstance): number {
  return game.connectPlayer({ charClass: 'sor', name: 'Traveler', x: 20, y: 20, areaId: 1 })
}

describe('issue #1351 NPC travel quest gating', () => {
  it('rejects Warriv east travel before Andariel and accepts it after a1q6', () => {
    const game = new GameInstance({ seed: 1351, areaId: 1 })
    const playerId = connect(game)
    const player = (game as unknown as {
      players: Map<number, { areaId: number; questFlags: Uint16Array }>
    }).players.get(playerId)!
    const npcId = game.spawnMonster({ defId: 'warriv1', x: 21, y: 20, areaId: 1, isNpc: true })

    game.enqueueCommand(playerId, { type: 'NpcEntityAction', npcId, action: 0, complement: 40 })
    game.stepFrames(1)
    expect(player.areaId).toBe(1)

    player.questFlags[6] |= 0x0001
    game.enqueueCommand(playerId, { type: 'NpcEntityAction', npcId, action: 0, complement: 40 })
    game.stepFrames(1)
    expect(player.areaId).toBe(40)
  })
})
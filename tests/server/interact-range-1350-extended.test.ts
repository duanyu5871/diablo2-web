/**
 * Issue #1350 follow-up — interaction line-of-sight for objects, warps, NPCs
 * and corpses.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

function connect(game: GameInstance, x: number, y: number): number {
  return game.connectPlayer({ charClass: 'sor', name: 'Actor', x, y, areaId: 1 })
}

function record(game: GameInstance, id: number): {
  x: number
  y: number
  activeNpcId: number | undefined
  corpseId: number | undefined
  corpseX: number
  corpseY: number
} {
  return (game as unknown as { players: Map<number, never> }).players.get(id) as never
}

describe('issue #1350 interaction line of sight', () => {
  it('rejects a waypoint behind a wall and accepts it once the ray is clear', () => {
    const game = new GameInstance({ seed: 1350, areaId: 1 })
    const playerId = connect(game, 50, 10)
    const p = record(game, playerId)
    const wpId = game.spawnObject({ classId: 119, x: 53, y: 10, areaId: 1, isWaypoint: true })
    game.setTerrainWalkableCheck((_areaId, x) => Math.round(x) !== 52)
    game.drainEvents(playerId)
    game.enqueueCommand(playerId, { type: 'OperateObject', objectId: wpId })
    game.stepFrames(1)
    expect(game.drainEvents(playerId).some((e) => e.type === 'WaypointMenu')).toBe(false)
    p.x = 53
    game.enqueueCommand(playerId, { type: 'OperateObject', objectId: wpId })
    game.stepFrames(1)
    expect(game.drainEvents(playerId).some((e) => e.type === 'WaypointMenu')).toBe(true)
  })

  it('blocks corpse recovery through a wall', () => {
    const game = new GameInstance({ seed: 1351, areaId: 1 })
    const playerId = connect(game, 50, 10)
    const p = record(game, playerId)
    p.corpseId = 777
    p.corpseX = 53
    p.corpseY = 10
    game.setTerrainWalkableCheck((_areaId, x) => Math.round(x) !== 52)
    game.enqueueCommand(playerId, { type: 'Interact', target: { unitType: 0, id: 777 } } as never)
    game.stepFrames(1)
    expect(p.corpseId).toBe(777)
    p.x = 53
    game.enqueueCommand(playerId, { type: 'Interact', target: { unitType: 0, id: 777 } } as never)
    game.stepFrames(1)
    expect(p.corpseId).toBeUndefined()
  })

  it('blocks NPC interaction through a wall', () => {
    const game = new GameInstance({ seed: 1352, areaId: 1 })
    const playerId = connect(game, 50, 10)
    const p = record(game, playerId)
    const npcId = game.spawnMonster({ defId: 'fallen1', x: 52, y: 10, areaId: 1, isNpc: true })
    game.setTerrainWalkableCheck((_areaId, x) => Math.round(x) !== 51)
    game.enqueueCommand(playerId, { type: 'NpcInit', target: { unitType: 1, id: npcId } })
    game.stepFrames(1)
    expect(p.activeNpcId).toBeUndefined()
    p.x = 52
    game.enqueueCommand(playerId, { type: 'NpcInit', target: { unitType: 1, id: npcId } })
    game.stepFrames(1)
    expect(p.activeNpcId).toBe(npcId)
  })
})
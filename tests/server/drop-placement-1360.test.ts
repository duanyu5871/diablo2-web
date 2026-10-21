/**
 * Issue #1360 — 1.13c drop placement: walkable spiral search, no overlap,
 * and drop at the death-animation frame.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'

interface GroundEntry {
  x: number
  y: number
}
interface MonsterRecord {
  pendingDropItems?: readonly unknown[]
  pendingDropFrame: number
}

describe('issue #1360 drop placement and timing', () => {
  it('delays the drop until the death-animation frame', () => {
    const game = new GameInstance({ seed: 1360, areaId: 1 })
    const playerId = game.connectPlayer({ charClass: 'pal', name: 'Farmer', x: 10, y: 10, areaId: 1 })
    const monsterId = game.spawnMonster({
      defId: 'andariel',
      x: 11,
      y: 10,
      areaId: 1,
      hp: 1,
      maxHp: 1,
    })
    game.applyDamageToMonster(monsterId, 1000, playerId)
    const monster = (game as unknown as { monsters: Map<number, MonsterRecord> }).monsters.get(monsterId)!
    expect(monster.pendingDropItems).toBeDefined()
    const before = game.getGroundItems().length
    game.stepFrames(1)
    expect(game.getGroundItems().length).toBe(before)
    game.stepFrames(120)
    expect(game.getGroundItems().length).toBeGreaterThan(before)
  })

  it('only places drops on walkable cells', () => {
    const game = new GameInstance({ seed: 1361, areaId: 1 })
    const playerId = game.connectPlayer({ charClass: 'pal', name: 'WallFarmer', x: 10, y: 10, areaId: 1 })
    game.setWalkabilityCallback((x: number, y: number) => x >= 8 && x <= 10 && y >= 8 && y <= 10)
    const monsterId = game.spawnMonster({
      defId: 'fallen1',
      x: 10,
      y: 10,
      areaId: 1,
      hp: 1,
      maxHp: 1,
    })
    game.applyDamageToMonster(monsterId, 1000, playerId)
    game.stepFrames(12)
    for (const item of game.getGroundItems() as unknown as GroundEntry[]) {
      expect(item.x >= 8 && item.x <= 10 && item.y >= 8 && item.y <= 10).toBe(true)
    }
  })

  it('spiral search gives every drop a distinct free cell', () => {
    const game = new GameInstance({ seed: 1362, areaId: 1 })
    const used = new Set<string>()
    const positions: string[] = []
    for (let i = 0; i < 12; i++) {
      const position = (game as unknown as {
        findDropPosition: (
          area: number,
          x: number,
          y: number,
          used: ReadonlySet<string>,
        ) => { x: number; y: number }
      }).findDropPosition(1, 50, 50, used)
      const key = `${position.x}:${position.y}`
      expect(used.has(key)).toBe(false)
      used.add(key)
      positions.push(key)
    }
    expect(new Set(positions).size).toBe(12)
  })
})
/**
 * Issue #1335 — seamless outdoor area seams in GameInstance.
 *
 * Two touching synthetic levels (Rogue Encampment → Blood Moor shape) share a world-space
 * border. Walking across it must composite collision from both loaded areas, switch
 * `player.areaId` in place, and reveal the neighbour's rooms without LoadAct/warp.
 */
import { describe, expect, it } from 'vitest'
import { GameInstance } from '../../src/server/engine/game-instance.ts'
import { createAreaBootstrapResolver } from '../../src/server/world/area-bootstrap.ts'
import { createMapServiceAreaLevelSource } from '../../src/client/map/map-service-area-source.ts'
import type {
  LocalAreaLevelGeometry,
  LocalAreaLevelSource,
  ServerEvent,
} from '../../src/netproto/index.ts'

function flatLevel(
  areaId: number,
  ox: number,
  oy: number,
  adjacentAreaIds: readonly number[],
): LocalAreaLevelGeometry {
  const w = 60
  const h = 60
  return {
    areaId,
    originX: ox,
    originY: oy,
    subWidth: w,
    subHeight: h,
    blocked: new Uint8Array(w * h),
    spawnTileX: 5,
    spawnTileY: 5,
    rooms: [{ areaId, tileX: ox / 5, tileY: oy / 5 }],
    roomRects: [{ index: 0, x: ox, y: oy, w, h, seed: 1 }],
    adjacentAreaIds,
    presetUnits: [],
    warps: [],
  }
}

function makeGame(): { game: GameInstance; source: LocalAreaLevelSource } {
  const source: LocalAreaLevelSource = (request) => {
    if (request.areaId === 1) return flatLevel(1, 1000, 1000, [2])
    if (request.areaId === 2) return flatLevel(2, 1060, 1000, [1])
    return null
  }
  const game = new GameInstance({
    seed: 1335,
    difficulty: 0,
    areaId: 1,
    resolveAreaBootstrap: createAreaBootstrapResolver(source),
  })
  return { game, source }
}

function eventTypes(events: readonly ServerEvent[]): string[] {
  return events.map(e => e.type)
}

describe('issue #1335: seamless outdoor area seams', () => {
  it('loads the neighbour, composites collision and switches area in place', () => {
    const { game } = makeGame()
    const playerId = game.connectPlayer({
      charClass: 'pal',
      name: 'Walker',
      x: 1058,
      y: 1030,
      areaId: 1,
    })
    game.drainEvents(playerId)
    expect(game.getPlayerState(playerId)!.areaId).toBe(1)
    expect(game.isAreaLoaded(2)).toBe(false)

    game.enqueueCommand(playerId, { type: 'Move', to: { x: 1065, y: 1030 }, run: false })
    game.stepFrames(30)

    const player = game.getPlayerState(playerId)!
    expect(player.areaId).toBe(2)
    expect(player.x).toBeGreaterThanOrEqual(1064)
    expect(game.isAreaLoaded(2)).toBe(true)

    const events = game.drainEvents(playerId)
    const types = eventTypes(events)
    // Seamless: no act reload; the neighbour's rooms are revealed instead.
    expect(types).not.toContain('LoadAct')
    expect(
      events.some(e => e.type === 'RoomReveal' && e.areaId === 2),
    ).toBe(true)
    expect(types).toContain('UnitReassign')
  })

  it('forwards the level graph neighbours into the server area geometry', () => {
    const view = {
      areaId: 1,
      originX: 0,
      originY: 0,
      subWidth: 1,
      subHeight: 1,
      blocked: new Uint8Array(1),
      spawnX: 0,
      spawnY: 0,
      rooms: [],
      presetUnits: [],
      entrances: [],
    }
    const mapService = {
      isLoaded: () => true,
      getActiveAct: () => 0,
      getActiveSeed: () => 1,
      getActiveDifficulty: () => 0,
      peekLevelView: () => view,
      getLevelPreloadPlan: () => ({ neighborAreaIds: [2, 3] }),
    }
    const source = createMapServiceAreaLevelSource(mapService as never)
    const geo = source({ act: 0, areaId: 1, mapSeed: 1, difficulty: 0 })!
    expect(geo.adjacentAreaIds).toEqual([2, 3])
  })

  it('does not switch into an adjacent area the player never reaches', () => {
    const { game } = makeGame()
    const playerId = game.connectPlayer({
      charClass: 'pal',
      name: 'Idle',
      x: 1040,
      y: 1030,
      areaId: 1,
    })
    game.drainEvents(playerId)
    game.enqueueCommand(playerId, { type: 'Move', to: { x: 1050, y: 1030 }, run: false })
    game.stepFrames(40)
    expect(game.getPlayerState(playerId)!.areaId).toBe(1)
  })
})
/**
 * Objects.txt `OperateFn` classification used by the authoritative GameInstance.
 *
 * The 1.13c server dispatch table (D2Game.dll 0x6fd27bb8) has one function per OperateFn.
 * The web server groups them into the handful of observable behaviours it implements:
 * shrine, door, portal, stash, well, trap, destructible, container and a generic
 * mode-only operate. Every Objects.txt row classifies to exactly one kind (never an
 * implicit no-op).
 */
import { CANONICAL_113C_OBJECTS } from './objects-meta.ts'
import { getObjectsTxtRecord113c } from './objects-txt-113c.ts'

export type ObjectOperateKind113c =
  | 'shrine'
  | 'door'
  | 'portal'
  | 'stash'
  | 'well'
  | 'trap'
  | 'destructible'
  | 'container'
  | 'mode'

/** `CONTAINER_OPERATE_DROP_CHANCE_113C` keys (server-item-data.ts). */
const CONTAINER_OPERATE_FNS_113C: ReadonlySet<number> = new Set([1, 3, 4, 5, 14, 48, 68])

function nameHas(name: string, tokens: readonly string[]): boolean {
  const lower = name.toLowerCase()
  return tokens.some((token) => lower.includes(token))
}

/** Classify one Objects.txt row by its canonical OperateFn/name/door/shrine metadata. */
export function classifyObjectOperate113c(classId: number): ObjectOperateKind113c {
  const record = getObjectsTxtRecord113c(classId)
  const meta = CANONICAL_113C_OBJECTS[classId]
  if (meta?.isShrine || record.operateFn === 2) return 'shrine'
  if (record.isDoor === 1) return 'door'
  if (record.operateFn === 15 || nameHas(record.name, ['portal'])) return 'portal'
  // Objects.txt: Bank/Stash is OperateFn 14; 31/32 are Armor Stand / Weapon Rack.
  if (classId === 267 || nameHas(record.name, ['bank'])) return 'stash'
  if (record.operateFn === 31 || record.operateFn === 32) return 'container'
  if (nameHas(record.name, ['well'])) return 'well'
  if (nameHas(record.name, ['trap'])) return 'trap'
  if (CONTAINER_OPERATE_FNS_113C.has(record.operateFn)) return 'container'
  if (
    nameHas(record.name, [
      'barrel',
      'urn',
      'crate',
      'casket',
      'chest',
      'jug',
      'vase',
      'basket',
      'rack',
      'shelf',
      'corpse',
      'sarcophagus',
      'grave',
    ])
  ) {
    return 'destructible'
  }
  return 'mode'
}
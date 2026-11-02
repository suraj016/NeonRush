import { BOOST } from './config.ts'
import { clamp, damp } from '../utils/math.ts'

export type BoostTickState = {
  charge: number
  blend: number
}

export function combinedSpeedMultiplier(manualBlend: number, turboActive: boolean): number {
  const manual = 1 + (BOOST.maxMultiplier - 1) * clamp(manualBlend, 0, 1)
  const turbo = turboActive ? BOOST.turboMultiplier : 1
  return Math.min(BOOST.maxCombinedMultiplier, Math.max(manual, turbo))
}

export function tickBoostEnergy(
  state: BoostTickState,
  dt: number,
  wantBoost: boolean,
): BoostTickState {
  let { charge, blend } = state
  const canUse = charge > 0
  const active = wantBoost && canUse
  const target = active ? 1 : 0
  const lambda = active ? BOOST.accel : BOOST.decel
  blend = damp(blend, target, lambda, dt)

  if (blend > 0.02 && active) {
    charge = Math.max(0, charge - BOOST.drainPerSecond * BOOST.chargeMax * dt)
  }
  if (charge <= 0) blend = damp(blend, 0, BOOST.decel * 1.4, dt)

  return { charge: clamp(charge, 0, BOOST.chargeMax), blend: clamp(blend, 0, 1) }
}

export function rechargeBoost(charge: number, amount: number): number {
  return clamp(charge + amount, 0, BOOST.chargeMax)
}

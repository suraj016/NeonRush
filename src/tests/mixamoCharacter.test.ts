import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  classifyClipName,
  clipHasMotion,
  computeFit,
  createMixamoAvatar,
  inferGenericState,
  makeInPlace,
} from '../game/mixamoCharacter.ts'

function movingClip(name: string, duration = 0.5): THREE.AnimationClip {
  return new THREE.AnimationClip(name, duration, [
    new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, duration], [0, 95, 0, 0, 92, 18]),
    new THREE.QuaternionKeyframeTrack(
      'mixamorigLeftUpLeg.quaternion',
      [0, duration],
      [0, 0, 0, 1, 0.2, 0, 0, 0.98],
    ),
  ])
}

describe('mixamo clip mapping', () => {
  it('classifies named Mixamo takes and leaves untitled exports generic', () => {
    expect(classifyClipName('Idle')).toBe('idle')
    expect(classifyClipName('Walking')).toBe('walk')
    expect(classifyClipName('Running')).toBe('run')
    expect(classifyClipName('Jump')).toBe('jump')
    expect(classifyClipName('Falling')).toBe('fall')
    expect(classifyClipName('Landing')).toBe('land')
    expect(classifyClipName('Sliding')).toBe('slide')
    expect(classifyClipName('mixamo.com')).toBe('generic')
    expect(classifyClipName('Take 001')).toBe('generic')
  })

  it('scales a Mixamo centimeter character onto the runner height', () => {
    const fit = computeFit(180, 0, 1.68)
    expect(fit.scale).toBeCloseTo(1.68 / 180)
    expect(fit.lift).toBeCloseTo(0)
    expect(computeFit(180, -2, 1.68).lift).toBeCloseTo(2 * (1.68 / 180))
  })

  it('ignores static Mixamo takes that are only a T-pose', () => {
    const still = new THREE.AnimationClip('Take 001', 0.4, [
      new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 0.4], [0, 95, 2, 0, 95, 2]),
    ])
    const moving = movingClip('mixamo.com')
    expect(clipHasMotion(still)).toBe(false)
    expect(clipHasMotion(moving)).toBe(true)
    expect(inferGenericState(still)).toBeNull()
    expect(inferGenericState(moving)).toBe('run')
  })

  it('strips hip travel so locomotion stays in place', () => {
    const inplace = makeInPlace(movingClip('mixamo.com'))
    const track = inplace.tracks.find((item) => item.name.endsWith('Hips.position'))
    expect(track).toBeTruthy()
    const values = track!.values
    expect(values[0]).toBe(values[3])
    expect(values[2]).toBe(values[5])
    expect(values[1]).not.toBe(values[4])
  })
})

describe('mixamo avatar', () => {
  it('maps a moving untitled clip to run and leaves the other states missing', () => {
    const fbx = new THREE.Group()
    fbx.add(new THREE.Mesh(new THREE.BoxGeometry(20, 180, 20), new THREE.MeshPhongMaterial({ color: 0xab3e36 })))
    fbx.animations = [new THREE.AnimationClip('Take 001', 0, []), movingClip('mixamo.com')]
    const avatar = createMixamoAvatar(fbx)
    expect(avatar.available).toEqual(['run'])
    expect(avatar.missing).toContain('idle')
    expect(avatar.missing).toContain('walk')
    expect(avatar.missing).toContain('jump')
    expect(avatar.play('run', 0.016, 1)).toBe(true)
    expect(avatar.play('idle', 0.016, 1)).toBe(false)
    avatar.holdStill()
    avatar.animateProcedural('idle', 0.016, 0)
    avatar.pose(0.1, 0, 0, 1)
    avatar.update(0.016)
    avatar.applySkin('volt')
    avatar.reset()
    avatar.dispose()
  })
})

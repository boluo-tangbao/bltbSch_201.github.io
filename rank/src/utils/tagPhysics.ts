import Matter from 'matter-js'

export interface TagShape { element: HTMLElement; width: number; height: number }
export interface TagPhysics {
  grab(index: number, x: number, y: number): void
  move(x: number, y: number): void
  release(vx?: number, vy?: number): void
  pause(): void
  resume(): void
  dispose(): void
}

/** A small, bounded world. DOM anchors remain the renderer and navigation surface. */
export function createTagPhysics(shapes: TagShape[], width: number, height: number, onRest: () => void, options: { narrow?: boolean } = {}): TagPhysics {
  const { Engine, Bodies, Body, Composite, Constraint, Sleeping, Vector } = Matter
  const engine = Engine.create({ enableSleeping: true, gravity: { x: 0, y: 1.1, scale: 0.001 } })
  const walls = [Bodies.rectangle(width / 2, height + 24, width + 96, 48, { isStatic: true }),
    Bodies.rectangle(-24, height / 2 - 300, 48, height + 700, { isStatic: true }),
    Bodies.rectangle(width + 24, height / 2 - 300, 48, height + 700, { isStatic: true })]
  const tiltLimits = shapes.map(shape => options.narrow && shape.width > width - 8
    ? Math.max(0, Math.asin(Math.min(1, (width - 8) / Math.hypot(shape.width, shape.height))) - Math.atan2(shape.height, shape.width)) : undefined)
  const bodies = shapes.map((shape, i) => {
    const angle = tiltLimits[i] === undefined ? (Math.random() - 0.5) * 1.8 : (Math.random() < 0.5 ? -1 : 1) * Math.PI / 2 + (Math.random() - 0.5) * tiltLimits[i]!
    const margin = Math.min(width / 2, (options.narrow ? Math.abs(Math.cos(angle)) * shape.width + Math.abs(Math.sin(angle)) * shape.height : Math.hypot(shape.width, shape.height)) / 2 + 4)
    const body = Bodies.rectangle(margin + Math.random() * Math.max(0, width - margin * 2), -50 - i * 28, shape.width, shape.height, {
      chamfer: { radius: Math.min(shape.height / 2, 20) }, restitution: 0.32,
      friction: 0.35, frictionAir: 0.045, sleepThreshold: 45,
      angle,
    })
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.035)
    return body
  })
  Composite.add(engine.world, [...walls, ...bodies])
  let frame = 0, previous = 0, accumulator = 0, disposed = false, paused = false
  let quietSteps = 0, awakeTime = 0
  let ceilingAdded = false
  let tether: Matter.Constraint | undefined, grabbed: Matter.Body | undefined
  const entered = new Set<Matter.Body>()
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
  const render = () => bodies.forEach((body, i) => {
    const shape = shapes[i]!
    shape.element.style.transform = `translate3d(${body.position.x - shape.width / 2}px,${body.position.y - shape.height / 2}px,0) rotate(${body.angle}rad)`
  })
  const contain = (body: Matter.Body) => {
    const index = bodies.indexOf(body), tilt = tiltLimits[index]
    if (tilt !== undefined) {
      const vertical = Math.PI / 2 + Math.round((body.angle - Math.PI / 2) / Math.PI) * Math.PI
      const angle = vertical + clamp(body.angle - vertical, -tilt, tilt)
      if (Math.abs(angle - body.angle) > 0.0001) { Body.setAngle(body, angle); Body.setAngularVelocity(body, -body.angularVelocity * 0.25) }
    }
    if (body.bounds.min.y >= 0) entered.add(body)
    // Leave the solver its tiny contact overlap; correcting every subpixel can
    // otherwise keep a settled stack awake indefinitely.
    const shape = shapes[index]!
    const half = (Math.abs(Math.cos(body.angle)) * shape.width + Math.abs(Math.sin(body.angle)) * shape.height) / 2
    const dx = options.narrow ? clamp(body.position.x, half + 1, width - half - 1) - body.position.x
      : body.bounds.min.x < -3 ? -body.bounds.min.x : body.bounds.max.x > width + 3 ? width - body.bounds.max.x : 0
    const dy = body.bounds.max.y > height + 3 ? height - body.bounds.max.y : (ceilingAdded || entered.has(body)) && body.bounds.min.y < -3 ? -body.bounds.min.y : 0
    if (dx || dy) Body.translate(body, { x: dx, y: dy })
  }
  const step = 1000 / 60
  function tick(now: number) {
    frame = 0
    if (disposed || paused) return
    accumulator += previous ? Math.min(now - previous, 64) : step
    previous = now
    let steps = 0
    while (accumulator >= step && steps++ < 4) {
      Engine.update(engine, step)
      for (const body of bodies) contain(body)
      accumulator -= step
      awakeTime += step
      if (!ceilingAdded && awakeTime >= 3000) {
        // Let the initial rain enter from above, then close the toy shelf so a
        // crowded stack cannot leave labels half hidden outside the top edge.
        ceilingAdded = true
        Composite.add(engine.world, Bodies.rectangle(width / 2, -24, width + 96, 48, { isStatic: true }))
        for (const body of bodies) { contain(body); Sleeping.set(body, false) }
        quietSteps = 0
      }
      if (!tether && bodies.every(body => body.bounds.max.y > 0 && body.speed < 0.25 && Math.abs(body.angularVelocity) < 0.012)) quietSteps++
      else quietSteps = 0
      // A crowded pile may retain imperceptible solver jitter. Bound the idle
      // work as well as detecting rest; grabbing wakes the whole pile again.
      if (ceilingAdded && !tether && (quietSteps > 40 || awakeTime > 10000)) {
        for (const body of bodies) { Body.setVelocity(body, { x: 0, y: 0 }); Body.setAngularVelocity(body, 0); Sleeping.set(body, true) }
      }
    }
    render()
    if (!ceilingAdded || tether || bodies.some(body => !body.isSleeping)) frame = requestAnimationFrame(tick)
    else { previous = 0; accumulator = 0; onRest() }
  }
  function resume() {
    if (disposed) return
    paused = false
    if (!frame) { previous = 0; accumulator = 0; frame = requestAnimationFrame(tick) }
  }
  function release(vx = 0, vy = 0) {
    if (!grabbed) return
    if (tether) Composite.remove(engine.world, tether)
    Body.setVelocity(grabbed, { x: clamp(vx, -12, 12), y: clamp(vy, -12, 12) })
    tether = undefined; grabbed = undefined
    quietSteps = 0; awakeTime = 0
    resume()
  }
  render(); resume()
  return {
    grab(index, x, y) {
      release()
      grabbed = bodies[index]
      if (!grabbed) return
      quietSteps = 0; awakeTime = 0
      entered.add(grabbed)
      for (const body of bodies) Sleeping.set(body, false)
      tether = Constraint.create({ pointA: { x, y }, bodyB: grabbed, pointB: Vector.sub({ x, y }, grabbed.position), length: 0, stiffness: 0.18, damping: 0.12 })
      Composite.add(engine.world, tether); resume()
    },
    move(x, y) { if (tether) { tether.pointA.x = clamp(x, 4, width - 4); tether.pointA.y = clamp(y, 4, height - 4); resume() } },
    release,
    pause() { release(); paused = true; cancelAnimationFrame(frame); frame = 0; previous = 0 },
    resume,
    dispose() { disposed = true; cancelAnimationFrame(frame); Composite.clear(engine.world, false); Engine.clear(engine) },
  }
}

//Debug
function log(o) {
  var props = ""
  Object.keys(o).forEach(function (k) {
    props = props + k + ":" + o[k] + ", "
  })
  trace("{" + props + "}")
}

//Constants
const TILE_SCALE = 2
const TILE_SIZE = 8
const ANIMATIONS: AnimationData = {
  WALKER: {
    DOWN: {sprites: [288, 290, 288, 292]},
    UP: {sprites:[294, 296, 294, 298]},
    RIGHT: {sprites:[300, 302, 300, 320]},
    LEFT: {sprites:[322, 324, 322, 326]}
  },
  BARRIER: {
    DOWN: {sprites:[42]},
    RIGHT: {sprites:[40]},
    UP: {sprites:[42], flip:3},
    LEFT: {sprites:[40], flip:3},
  }
}
const COLLISION_DELAY = 50;

// Utils
function isPointInRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh
}

function areCollidingFull(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.floor(ax) === Math.floor(bx) && Math.floor(ay) === Math.floor(by)
}

//Globals
let t: number = 0
let delta: number = 0
let mouseData: MouseData = {
  x: 0,
  y: 0,
  p: 0,
  lastClickStamp: 0
}
const scene: Scene = {
  tilemap: {
    x: 0,
    y: 0
  },
  walkers: [{
    type: "WALKER",
    speed: 30,
    x: 32,
    y: 40,
    velocityX: 30,
    velocityY: 0,
    sprite: 0,
    animationId: "RIGHT",
    animationFrameIndex: 0,
    animationSpeed: 11,
    animationTimestamp: 0,
    lastCollisionTimestamp: 0
  }],
  barriers: [{
    type: "BARRIER",
    x: 112,
    y: 40,
    directions: [
      { animationId: "RIGHT", bounce: "DOWN" },
      { animationId: "DOWN", bounce: "RIGHT" }
    ]
  },
  {
    type: "BARRIER",
    x: 160,
    y: 104,
    directions: [
      { animationId: "LEFT", bounce: "UP" },
      { animationId: "UP", bounce: "LEFT" }
    ]
  }],
  bends: [],
  cursor: {
    x: 0,
    y: 0,
    sprite: 44
  }
}

function initScene(scene: Scene): void {
  //Get scene data from map
  const mapPadding: Padding = {
    top: 3,
    bottom: 1,
    left: 2,
    right: 2
  }
  const mapW = 30
  const mapH = 17
  const spriteEntityMap = {
    6: { type: "BEND", directions: { xvPositive: true, yvPositive: false } },
    8: { type: "BEND", directions: { xvPositive: true, yvPositive: true } },
    10: { type: "BEND", directions: { xvPositive: false, yvPositive: false } },
    12: { type: "BEND", directions: { xvPositive: false, yvPositive: true } },
    64: { type: "HOME", color: "GREEN" },
    66: { type: "HOME", color: "BLUE" },
    68: { type: "HOME", color: "ORANGE" },
    76: { type: "SPAWNER" }
  }
  for (let x = mapPadding.left; x < mapW - mapPadding.right; x++) {
    for (let y = mapPadding.top; y < mapH - mapPadding.bottom; y++) {
      const entityData = spriteEntityMap[mget(x, y)]
      if (entityData) {
        switch (entityData.type) {
          case "BEND":
            scene.bends.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, directions: entityData.directions, type: entityData.type })
            break;
        }
      }
    }
  }
  //Init entities
  scene.barriers = scene.barriers.map(function (barrier) {
    barrier.directionIndex = 0
    barrier.animationId = barrier.directions[0].animationId
    barrier.bounce = barrier.directions[0].bounce
    barrier.animationFrameIndex = 0
    barrier.animationSpeed = 0
    barrier.animationTimestamp = 0
    return barrier
  })
}

function getInput(mouseData: MouseData): MouseData {
  const mData = mouse()
  const timestamp = time()
  return {
    x: mData[0],
    y: mData[1],
    p: mData[2] && (mouseData.lastClickStamp === 0 || timestamp - mouseData.lastClickStamp > 50) ? 1 : 0,
    lastClickStamp: mData[2] ? timestamp : mouseData.lastClickStamp
  }

}

function update(input: MouseData, scene: Scene, delta: number): void {

  function updateCursor(mouseData: MouseData, cursor: Cursor): void {
    cursor.x = Math.floor((mouseData.x) / 16) * 16,
    cursor.y = Math.floor((mouseData.y + 8) / 16) * 16 - 8
  }

  function onBarrierClick(mouseData: MouseData, barriers): void {
    barriers.forEach(function (barrier) {
      if (mouseData.p && isPointInRect(mouseData.x, mouseData.y, barrier.x, barrier.y, TILE_SCALE * TILE_SIZE, TILE_SCALE * TILE_SIZE)) {
        barrier.directionIndex = barrier.directionIndex + 1 < barrier.directions.length
          ? barrier.directionIndex + 1
          : 0
        const direction: { animationId: string, bounce: string } = barrier.directions[barrier.directionIndex]
        barrier.animationId = direction.animationId
        barrier.bounce = direction.bounce
      }
    })
  }

  function move(walkers, barriers, bends, delta: number): void {

    function isCollisionDelayOver(timestamp: number): boolean {
      return time() - timestamp > COLLISION_DELAY;
    }

    function bounceWalker(walker, bounceDirection: string): void {
      walker.velocityX = 0
      walker.velocityY = 0
      walker.lastCollisionTimestamp = time()
      switch (bounceDirection) {
        case "UP":
          walker.velocityY = -walker.speed
          break;
        case "RIGHT":
          walker.velocityX = walker.speed
          break;
        case "DOWN":
          walker.velocityY = walker.speed
          break;
        case "LEFT":
          walker.velocityX = -walker.speed
          break;
      }
      walker.animationId = bounceDirection
    }

    walkers.forEach(function (walker) {
      //Future positions (applying movement)
      bends.forEach(function (bend) {
        if (areCollidingFull(bend.x, bend.y, walker.x, walker.y) && isCollisionDelayOver(walker.lastCollisionTimestamp)) {
          walker.lastCollisionTimestamp = time()
          let bounce: string
          if (walker.velocityX !== 0) {
            bounce = bend.directions.yvPositive ? "UP" : "DOWN"
          }
          else if (walker.velocityY !== 0) {
            bounce = bend.directions.XvPositive ? "RIGHT" : "LEFT"
          }
          bounceWalker(walker,bounce)
        }
      })

      //Check for barrier collision and redirect walker
      barriers.forEach(function (barrier) {
        if (areCollidingFull(barrier.x, barrier.y, walker.x, walker.y) && isCollisionDelayOver(walker.lastCollisionTimestamp)) {
          bounceWalker(walker,barrier.bounce)
        }
      })
      walker.x = walker.x + walker.velocityX * delta
      walker.y = walker.y + walker.velocityY * delta
    })
  }

  function animate(scene: Scene, delta: number): void {
    function animateEntity(entity, delta) {
      const a = ANIMATIONS[entity.type][entity.animationId]
      const aDelta = delta * 100
      const isNewFrame = entity.animationTimestamp + aDelta >= entity.animationSpeed
      entity.animationFrameIndex = isNewFrame
        ? (entity.animationFrameIndex + 1 < a.sprites.length ? entity.animationFrameIndex + 1 : 0)
        : entity.animationFrameIndex
      entity.animationTimestamp = isNewFrame ? 0 : entity.animationTimestamp + aDelta
      entity.sprite = a.sprites[entity.animationFrameIndex]
      entity.spriteFlip = a.flip ? a.flip : 0
    }

    scene.walkers.forEach(function (walker) {
      animateEntity(walker, delta)
    })
    scene.barriers.forEach(function (barrier) {
      animateEntity(barrier, delta)
    })
  }

  updateCursor(input, scene.cursor)
  onBarrierClick(input, scene.barriers)
  move(scene.walkers, scene.barriers, scene.bends, delta)
  animate(scene, delta)
}

function draw(scene): void {
  //Draw map
  map(scene.tilemap.x, scene.tilemap.y)
  //Draw walkers
  scene.walkers.forEach(function (walker) {
    spr(walker.sprite, walker.x, walker.y - 8, 0, 1, 0, 0, TILE_SCALE, TILE_SCALE)
  })
  //Draw barriers
  scene.barriers.forEach(function (barrier) {
    spr(barrier.sprite, barrier.x, barrier.y, 0, 1, barrier.spriteFlip, 0, TILE_SCALE, TILE_SCALE)
  })
  //Draw cursor
  let cursorSpr: number = 44
  scene.barriers.forEach(function (barrier) {
    if (isPointInRect(scene.cursor.x, scene.cursor.y, barrier.x, barrier.y, TILE_SCALE, TILE_SCALE)) {
      cursorSpr = 46
    }
  })
  spr(cursorSpr, scene.cursor.x, scene.cursor.y, 0, 1, 0, 0, TILE_SCALE, TILE_SCALE)
}

initScene(scene)
function TIC() {
  const nt = time()
  delta = (nt - t) / 1000
  t = nt
  mouseData = getInput(mouseData)
  update(mouseData, scene, delta)
  draw(scene)
}
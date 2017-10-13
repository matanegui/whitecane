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
const ANIMATIONS = {
  WALKER: {
    DOWN: [288, 290, 288, 292],
    UP: [294, 296, 294, 298],
    RIGHT: [300, 302, 300, 320],
    LEFT: [322, 324, 322, 326]
  },
  BARRIER: {
    DOWN: [42],
    RIGHT: [40]
  }
}
const COLLISION_DELAY = 30;

// Utils
function isPointInRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh
}

function areCollidingFull(ax, ay, bx, by) {
  return Math.floor(ax) === Math.floor(bx) && Math.floor(ay) === Math.floor(by)
}

//Globals
let t = 0
let delta = 0
const mouseData = {
  x: 0,
  y: 0,
  p: 0,
  lastClickStamp: 0
}

const scene = {
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
      {animationId: "RIGHT", bounce: "DOWN"},
      {animationId: "DOWN", bounce: "RIGHT"}
    ]
  }],
  bends: [],
  cursor: {
    x: 0,
    y: 0,
    sprite: 44
  }
}

function initScene(scene) {
  //Get scene data from map
  const mapPadding = {
    top: 3,
    bottom: 1,
    left: 2,
    right: 2
  }
  const mapW = 30
  const mapH = 17
  const spriteEntityMap = {
    6: { type: "BEND", directions: { up: true, right: false } },
    8: { type: "BEND", directions: { up: true, right: true } },
    10: { type: "BEND", directions: { up: false, right: false } },
    12: { type: "BEND", directions: { up: false, right: true } },
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
            scene.bends.push({ x: x * TILE_SIZE, y: entityData.directions.up ? y * TILE_SIZE + 16 : y * TILE_SIZE - 16, directions: entityData.directions, type: entityData.type })
            scene.bends.push({ x: entityData.directions.right ? x * TILE_SIZE - 16 : x * TILE_SIZE + 16, y: y * TILE_SIZE, directions: entityData.directions, type: entityData.type })
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

function getInput(mouseData) {
  const mData = mouse()
  const timestamp = time()
  mouseData.x = mData[0]
  mouseData.y = mData[1]
  mouseData.p = mData[2] && (mouseData.lastClickStamp === 0 || timestamp - mouseData.lastClickStamp > 50) ? 1 : 0
  mouseData.lastClickStamp = mData[2] ? timestamp : mouseData.lastClickStamp
}

function update(input, scene, delta) {

  function updateCursorPosition(mouseData, cursor) {
    cursor.x = Math.floor((mouseData.x) / 16) * 16
    cursor.y = Math.floor((mouseData.y + 8) / 16) * 16 - 8
  }

  function onBarrierClick(mouseData, barriers) {
    barriers.forEach(function (barrier) {
      if (mouseData.p && isPointInRect(mouseData.x, mouseData.y, barrier.x, barrier.y, TILE_SCALE * TILE_SIZE, TILE_SCALE * TILE_SIZE)) {
        barrier.directionIndex = barrier.directionIndex + 1 < barrier.directions.length
          ? barrier.directionIndex + 1
          : 0
        const direction = barrier.directions[barrier.directionIndex]
        barrier.animationId = direction.animationId
        barrier.bounce = direction.bounce      
      }
    })
  }

  function move(walkers, barriers, bends, delta) {

    function isCollisionDelayOver(timestamp){
      return time() - timestamp > COLLISION_DELAY;
    }

    walkers.forEach(function (walker) {
      //Future positions (applying movement)
      const mx = walker.x + walker.velocityX * delta
      const my = walker.y + walker.velocityY * delta
      //Check for bend collision and redirect walker
      bends.forEach(function (bend) {
        if (areCollidingFull(mx + 16 * (walker.velocityX ? walker.velocityX < 0 ? -1 : 1 : 0), my + 16 * (walker.velocityY ? walker.velocityY < 0 ? -1 : 1 : 0), bend.x, bend.y)) {
          if (walker.velocityX !== 0) {
            walker.velocityY = walker.speed * (bend.directions.up ? -1 : 1)
            walker.velocityX = 0
            walker.animationId = bend.directions.up ? "UP" : "DOWN"
            walker.y = my
          }
          else if (walker.velocityY !== 0) {
            walker.velocityX = walker.speed * (bend.directions.right ? 1 : -1)
            walker.velocityY = 0
            walker.animationId = bend.directions.right ? "RIGHT" : "LEFT"
            walker.x = mx
          }
        }
        else {
          walker.x = mx
          walker.y = my
        }
      })
      //Check for barrier collision and redirect walker
      barriers.forEach(function (barrier) {
        if (areCollidingFull(barrier.x, barrier.y, walker.x, walker.y) && isCollisionDelayOver(walker.lastCollisionTimestamp)) {
          walker.velocityX = 0
          walker.velocityY = 0
          walker.lastCollisionTimestamp = time()
          switch (barrier.bounce) {
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
          walker.animationId = barrier.bounce
        }
      })
    })
  }

  function animate(scene, delta) {
    function animateEntity(entity, delta) {
      const a = ANIMATIONS[entity.type][entity.animationId]
      const aDelta = delta * 100
      const isNewFrame = entity.animationTimestamp + aDelta >= entity.animationSpeed
      entity.animationFrameIndex = isNewFrame
        ? (entity.animationFrameIndex + 1 < a.length ? entity.animationFrameIndex + 1 : 0)
        : entity.animationFrameIndex
      entity.animationTimestamp = isNewFrame ? 0 : entity.animationTimestamp + aDelta
      entity.sprite = a[entity.animationFrameIndex]
    }

    scene.walkers.forEach(function (walker) {
      animateEntity(walker, delta)
    })
    scene.barriers.forEach(function (barrier) {
      animateEntity(barrier, delta)
    })
  }

  updateCursorPosition(input, scene.cursor)
  onBarrierClick(input, scene.barriers)
  move(scene.walkers, scene.barriers, scene.bends, delta)
  animate(scene, delta)
}

function draw(scene) {
  map(scene.tilemap.x, scene.tilemap.y)
  scene.walkers.forEach(function (walker) {
    spr(walker.sprite, walker.x, walker.y - 8, 0, 1, 0, 0, TILE_SCALE, TILE_SCALE)
  })
  scene.barriers.forEach(function (barrier) {
    spr(barrier.sprite, barrier.x, barrier.y, 0, 1, 0, 0, TILE_SCALE, TILE_SCALE)
  })
  //Draw cursor
  let cursorSpr = 44
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
  getInput(mouseData)
  update(mouseData, scene, delta)
  draw(scene)
}
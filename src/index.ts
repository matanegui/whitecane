//Debug
function log(o){
	var props = ""
	Object.keys(o).forEach(function(k){
		props=props+k+":"+o[k]+", "
	})
	trace("{"+props+"}")
}

//Constants
var TILE_SCALE = 2
var TILE_SIZE = 8
var ANIMATIONS = {
	WALKER : {
		DOWN: [288, 290, 288, 292],
		UP: [294,296,294,298],
		RIGHT: [300, 302, 300, 320],
		LEFT: [322, 324, 322, 326]
 },
 BARRIER: {
  DOWN: [42],
		RIGHT: [40]
 }
}

// Utils
function isPointInRect(x,y,rx,ry,rw,rh){
	return x >= rx && x < rx+rw && y >= ry && y < ry+rh
}

function areCollidingFull(ax,ay,bx,by){
	return Math.floor(ax) === Math.floor(bx) && Math.floor(ay) === Math.floor(by)
}

//Globals
var t = 0
var delta = 0
var mouseData = {
	x: 0,
	y: 0,
	p: 0,
	lastClickStamp: 0
}

var scene = {
	tilemap: {
		x: 0,
		y: 0
	},
	walkers:[{
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
		animationTimestamp : 0
	}],
	barriers: [{
		type: "BARRIER",
		x: 112,
		y: 40,
	 directions: ["RIGHT","DOWN"]
	}],
	bends: [],
	cursor: {
		x: 0,
		y: 0,
		sprite: 44
	}
}

function initScene(scene){
 //Get scene data from map
 var mapPadding = {
    top: 3,
    bottom: 1,
    left: 2,
    right: 2
 }
 var mapW = 30
 var mapH = 17
 var spriteEntityMap = {
  6: {type: "BEND", directions:{up: true, right:false}},
  8: {type: "BEND", directions:{up: true, right: true}},
  10: {type: "BEND", directions:{up: false, right: false}},
  12: {type: "BEND", directions: {up: false, right: true}},
  64: {type: "HOME", color: "GREEN"},
  66: {type: "HOME", color: "BLUE"},
  68: {type: "HOME", color: "ORANGE"},
  76: {type: "SPAWNER"}
 }
 for (x=mapPadding.left; x<mapW-mapPadding.right;x++){
  for (y=mapPadding.top; y<mapH-mapPadding.bottom;y++){
   var entityData = spriteEntityMap[mget(x,y)]
   if (entityData){
    switch (entityData.type){
    	case "BEND": 
						scene.bends.push({x: x*TILE_SIZE,y: entityData.directions.up ? y*TILE_SIZE+16 : y*TILE_SIZE-16,directions:entityData.directions,type: entityData.type})
    		scene.bends.push({x: entityData.directions.right ? x*TILE_SIZE-16 : x*TILE_SIZE+16,y: y*TILE_SIZE,directions:entityData.directions,type: entityData.type})
    }
   }
  }
 }
 //Init entities
 scene.barriers = scene.barriers.map(function(barrier){
		barrier.animationId = barrier.directions[0]
		barrier.animationFrameIndex = 0
		barrier.animationSpeed = 0
		barrier.animationTimestamp = 0
		//Create colliders for each direction
		barrier.bends = barrier.directions.map(function(direction){
			switch (direction){
				case "RIGHT":
					return {x: barrier.x+16,y: barrier.y,directions:{right:false},type:"BEND"}
				case "LEFT":
					return {x: barrier.x-16,y: barrier.y,directions:{right:true},type:"BEND"}
				case "UP":
					return {x: barrier.x,y: barrier.y-16,directions:{up:false},type:"BEND"}
				case "DOWN":
					return {x: barrier.x,y: barrier.y+16,directions:{up:false},type:"BEND"}
			}
		})
		return barrier
 })
}

function getInput(mouseData){
	var mData = mouse()
 var timestamp = time()
	mouseData.x = mData[0]
 mouseData.y = mData[1]
 mouseData.p = mData[2] && (mouseData.lastClickStamp === 0 || timestamp - mouseData.lastClickStamp > 50) ? 1 : 0
 mouseData.lastClickStamp = mData[2] ? timestamp : mouseData.lastClickStamp	
}

function update(input,scene,delta){
	updateCursorPosition(input, scene.cursor)
 onBarrierClick(input, scene.barriers)
	move(scene.walkers,scene.barriers,scene.bends,delta)
	animate(scene,delta)
}

function updateCursorPosition(mouseData,cursor){
 cursor.x = Math.floor((mouseData.x)/16)*16
	cursor.y = Math.floor((mouseData.y+8)/16)*16-8
}

function onBarrierClick(mouseData,barriers){ 
	barriers.forEach(function(barrier){
		if (mouseData.p && isPointInRect(mouseData.x, mouseData.y,barrier.x,barrier.y,TILE_SCALE*TILE_SIZE, TILE_SCALE*TILE_SIZE)) {
			var directionIndex = barrier.directions.indexOf(barrier.animationId)
			barrier.animationId = directionIndex + 1 < barrier.directions.length
				? barrier.directions[directionIndex+1]
			 : barrier.directions[0]
 	}
	})
}

function move(walkers,barriers,bends,delta){
	walkers.forEach(function(walker){
		//Future positions (applying movement)
		var mx = walker.x + walker.velocityX*delta  
		var my = walker.y + walker.velocityY*delta
		//Check for bend collision and redirect walker
		bends.forEach(function(bend){
			if (areCollidingFull(mx+16*(walker.velocityX?walker.velocityX<0?-1:1:0),my+16*(walker.velocityY?walker.velocityY<0?-1:1:0),bend.x,bend.y)){
				if (walker.velocityX !== 0){
					walker.velocityY = walker.speed * (bend.directions.up?-1:1)
					walker.velocityX = 0
					walker.animationId = bend.directions.up?"UP":"DOWN" 
					walker.y=my
				}
				else if (walker.velocityY !== 0){
					walker.velocityX = walker.speed * (bend.directions.right?1:-1)
					walker.velocityY = 0
					walker.animationId = bend.directions.right?"RIGHT":"LEFT"
					walker.x=mx
				}
			}
			else{
				walker.x=mx
				walker.y=my
			}
		})

		barriers.forEach(function(barrier){
			if (areCollidingFull(barrier.x,barrier.y,walker.x,walker.y)){
				trace("ola")
				barrier.bends.forEach(function(bend){
					if (areCollidingFull(mx+16*(walker.velocityX?walker.velocityX<0?-1:1:0),my+16*(walker.velocityY?walker.velocityY<0?-1:1:0),bend.x,bend.y)){
						if (walker.velocityX !== 0){
							walker.velocityY = walker.speed * (bend.directions.up?-1:1)
							walker.velocityX = 0
							walker.animationId = bend.directions.up?"UP":"DOWN" 
							walker.y=my
						}
						else if (walker.velocityY !== 0){
							walker.velocityX = walker.speed * (bend.directions.right?1:-1)
							walker.velocityY = 0
							walker.animationId = bend.directions.right?"RIGHT":"LEFT"
							walker.x=mx
						}
					}
					else{
						walker.x=mx
						walker.y=my
					}
				})
			}
		})
	})
}

function animateEntity(entity,delta){
	var a = ANIMATIONS[entity.type][entity.animationId]
	var aDelta = delta * 100
	var isNewFrame = entity.animationTimestamp + aDelta >= entity.animationSpeed 
	entity.animationFrameIndex = isNewFrame 
		? (entity.animationFrameIndex + 1 < a.length ? entity.animationFrameIndex + 1 : 0) 
		: entity.animationFrameIndex
	entity.animationTimestamp = isNewFrame ? 0 : entity.animationTimestamp + aDelta
	entity.sprite = a[entity.animationFrameIndex] 	 	
}

function animate(scene,delta){
	scene.walkers.forEach(function(walker){
		animateEntity(walker,delta)
	})
	scene.barriers.forEach(function(barrier){
		animateEntity(barrier,delta)
	})		
}

function draw(scene){
	map(scene.tilemap.x,scene.tilemap.y)
	scene.walkers.forEach(function(walker){
		spr(walker.sprite,walker.x,walker.y-8,0,1,0,0,TILE_SCALE,TILE_SCALE)
	})
	scene.barriers.forEach(function(barrier){
		spr(barrier.sprite,barrier.x,barrier.y,0,1,0,0,TILE_SCALE,TILE_SCALE)
	})
	//Draw cursor
	var cursorSpr = 44
	scene.barriers.forEach(function(barrier){
		if (isPointInRect(scene.cursor.x, scene.cursor.y,barrier.x,barrier.y,TILE_SCALE, TILE_SCALE)){
			cursorSpr = 46
		}
	})
	spr(cursorSpr,scene.cursor.x,scene.cursor.y,0,1,0,0,TILE_SCALE,TILE_SCALE)
}

initScene(scene)
function TIC(){
	var nt = time()
	delta = (nt - t)/1000
	t = nt
	getInput(mouseData)
 update(mouseData,scene,delta)
	draw(scene)
}
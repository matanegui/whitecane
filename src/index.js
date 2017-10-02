// title:  White cane
// author: Misteki
// desc:   TIC test project
// script: js
// input: mouse

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
	walker : {
		DOWN: [288, 290, 288, 292],
		UP: [294,296,294,298],
		RIGHT: [300, 302, 300, 320],
		LEFT: [322, 324, 322, 326]
 },
 barrier: {
  DOWN: [42],
		RIGHT: [40]
 }
}

// Utils
function isPointInRect(x,y,rx,ry,rw,rh){
	return x >= rx && x < rx+rw && y >= ry && y < ry+rh
}

function areCollidingFull(a,b){
	return Math.floor(a.position.x) === Math.floor(b.position.x) && Math.floor(a.position.y) === Math.floor(b.position.y)
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
		type: "walker",
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
	barrier: {
		type: "barrier",
		x: 112,
		y: 40,
	 sprite: 0,
	 directions: ["RIGHT","DOWN"],
		animationId: "RIGHT",
		animationFrameIndex: 0,
		animationSpeed: 0,
		animationTimestamp : 0
	},
	cursor: {
		x: 0,
		y: 0,
		sprite: 44
	}
}

function getMapData(){
 //In map units
 var mapPadding = {
    top: 3,
    bottom: 1,
    left: 2,
    right: 2
 }
 var mapW = 30
 var mapH = 17
 var spriteEntityMap = {
  6: {type: "BEND", directions: ["UP","LEFT"]},
  8: {type: "BEND", directions: ["UP","RIGHT"]},
  10: {type: "BEND", directions: ["DOWN","LEFT"]},
  12: {type: "BEND", directions: ["DOWN","RIGHT"]},
  14: {type: "BEND", directions: ["UP","LEFT","RIGHT"]},
  32: {type: "BEND", directions: ["DOWN","LEFT","RIGHT"]},
  34: {type: "BEND", directions: ["UP","DOWN","RIGHT"]},
  36: {type: "BEND", directions: ["UP","DOWN","LEFT"]},
  64: {type: "HOME", color: "GREEN"},
  66: {type: "HOME", color: "BLUE"},
  68: {type: "HOME", color: "ORANGE"},
  76: {type: "SPAWNER"}
 }
 for (x=mapPadding.left; x<mapW-mapPadding.right;x++){
  for (y=mapPadding.top; y<mapH-mapPadding.bottom;y++){
   var entityData = spriteEntityMap[mget(x,y)]
   if (entityData){
    trace("it is!");
    log(entityData)
   }
  }
 }
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
 checkBarrierClick(input, scene.barrier)
	move(scene.walkers,delta)
	animate(scene,delta)
}

function updateCursorPosition(mouseData,cursor){
 cursor.x = Math.floor((mouseData.x)/16)*16
	cursor.y = Math.floor((mouseData.y+8)/16)*16-8
}

function checkBarrierClick(mouseData,barrier){ 
	if (mouseData.p && isPointInRect(mouseData.x, mouseData.y,barrier.x,barrier.y,TILE_SCALE*TILE_SIZE, TILE_SCALE*TILE_SIZE)) {
		var directionIndex = barrier.directions.indexOf(barrier.animationId)
		barrier.animationId = directionIndex + 1 < barrier.directions.length
			? barrier.directions[directionIndex+1]
		 : barrier.directions[0]
 }
}

function move(walkers,delta){
	walkers.forEach(function(walker){
		walker.x += walker.velocityX*delta
		walker.y += walker.velocityY*delta
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
	animateEntity(scene.barrier,delta)
}

function draw(scene){
	map(scene.tilemap.x,scene.tilemap.y)
	scene.walkers.forEach(function(walker){
		spr(walker.sprite,walker.x+8,walker.y-8,0,1,0,0,TILE_SCALE,TILE_SCALE)
	})
	spr(scene.barrier.sprite,scene.barrier.x,scene.barrier.y,0,1,0,0,TILE_SCALE,TILE_SCALE)
	//Draw cursor
 var cursorSpr = isPointInRect(scene.cursor.x, scene.cursor.y,scene.barrier.x,scene.barrier.y,TILE_SCALE, TILE_SCALE)
  ? 46
  : 44
	spr(cursorSpr,scene.cursor.x,scene.cursor.y,0,1,0,0,TILE_SCALE,TILE_SCALE)
}

getMapData()
function TIC(){
	var nt = time()
	delta = (nt - t)/1000
	t = nt
	getInput(mouseData)
 update(mouseData,scene,delta)
	draw(scene)
}
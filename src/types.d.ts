interface Point {
  x: number,
  y: number
}

interface MouseData {
  x: number,
  y: number,
  p: number,
  lastClickStamp: number
}

interface Padding {
  top: 3,
  bottom: 1,
  left: 2,
  right: 2
}

interface Cursor {
  x: number,
  y: number,
  sprite: number
}

interface Scene {
  tilemap: {
    x: number,
    y: number
  },
  walkers: any[],
  barriers: any[],
  bends: any[],
  cursor: Cursor
}

interface AnimationData {
  [entityKey:string] : {
    [id:string] : {
      sprites: number[],
      scale?:number,
      flip?:number,
      rotate?:number
    }
  }
}
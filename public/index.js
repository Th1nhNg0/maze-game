var socket = io();
let playerList;
socket.on("connect", (e) => {
  console.log("Connected");
  socket.on("gameData", (gameData) => {
    runPixi(gameData);
  });
  console.log(socket.id);
});

function runPixi(gameData) {
  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
  const tileSize = gameData.tileSize;
  const SCALE = gameData.SCALE;
  const height = gameData.height;
  const width = gameData.width;
  const speed = gameData.speed;
  const maxSpeed = gameData.maxSpeed;
  let app = new PIXI.Application({
    antialias: true,
    transparent: false,
  });
  app.renderer.view.style.position = "absolute";
  app.renderer.view.style.display = "block";
  app.renderer.autoResize = true;
  app.renderer.resize(window.innerWidth, window.innerHeight);
  document.body.appendChild(app.view);
  app.view.setAttribute("tabindex", 0);

  app.loader.add("tileset", "images/character and tileset/Dungeon_Tileset.png");
  app.loader.add("character", "images/character and tileset/Dungeon_Character_2.png");
  app.loader.on("progress", (loader, resource) => {
    console.log("loading: " + resource.url);
    console.log("progress: " + loader.progress + "%");
  });
  app.loader.load(setup);

  let tileTextures = [];
  let character;

  class Maze {
    constructor(maze) {
      this.width = maze[0].length;
      this.height = maze.length;
      this.maze = maze;
      this.pixi = new PIXI.Container();
      for (let y = 0; y < height * 2 + 1; y++) {
        for (let x = 0; x < width * 2 + 1; x++) {
          let sprite = new PIXI.Sprite(tileTextures[this.maze[y][x]]);
          sprite.x = x * tileSize;
          sprite.y = y * tileSize;
          this.pixi.addChild(sprite);
        }
      }
      this.pixi.scale.x = this.pixi.scale.y = SCALE;
    }
  }
  function setup(loader, resources) {
    tileTextures = [];
    for (let i = 0; i < 10 * 10; i++) {
      let x = i % 10;
      let y = Math.floor(i / 10);
      tileTextures[i] = new PIXI.Texture(resources.tileset.texture, new PIXI.Rectangle(x * tileSize, y * tileSize, tileSize, tileSize));
    }
    let charTextures = [];
    for (let i = 0; i < 7; i++) {
      let x = i % 10;
      let y = Math.floor(i / 10);
      charTextures[i] = new PIXI.Texture(resources.character.texture, new PIXI.Rectangle(x * tileSize, y * tileSize, tileSize, tileSize));
    }
    let skin = Math.floor(Math.random() * 7);
    character = new PIXI.Sprite(charTextures[skin]);
    character.x = tileSize * SCALE * 1.5;
    character.y = tileSize * SCALE * 1.5;
    character.vx = 0;
    character.anchor.x = 0.5;
    character.anchor.y = 0.8;
    character.vy = 0;
    character.scale.x = character.scale.y = (SCALE * 5) / 10;
    socket.emit("newPlayer", { skin, pos: { x: character.x, y: character.y }, scale: { x: character.scale.x, y: character.scale.y } });
    let kb = new Keyboard();
    kb.watch(app.view);
    let maze = new Maze(gameData.maze);

    function collision(x, y) {
      let posx = Math.floor(x / SCALE / tileSize);
      let posy = Math.floor(y / SCALE / tileSize);
      return maze.maze[posy][posx] == 2;
    }
    setInterval(() => {
      socket.emit("playerpos", { pos: { x: character.x, y: character.y }, scale: { x: character.scale.x, y: character.scale.y } });
    }, 1000 / 60);
    playerList = {};
    app.stage.addChild(maze.pixi);
    app.stage.addChild(character);
    socket.on("playerLeave", (data) => {
      app.stage.removeChild(playerList[data.id]);
      delete playerList[data.id];
    });
    socket.on("playerspos", (data) => {
      for (let id in data) {
        if (id == socket.id) continue;
        if (!playerList[id]) {
          let char = new PIXI.Sprite(charTextures[data[id].skin]);
          char.x = data[id].pos.x;
          char.y = data[id].pos.y;
          char.anchor.x = 0.5;
          char.anchor.y = 0.8;
          char.scale.x = data[id].scale.x;
          char.scale.y = data[id].scale.y;
          playerList[id] = char;
          app.stage.addChild(char);
        } else {
          playerList[id].x = data[id].pos.x;
          playerList[id].scale.x = data[id].scale.x;
          playerList[id].scale.y = data[id].scale.y;
          playerList[id].y = data[id].pos.y;
        }
      }
    });
    app.ticker.add((time) => {
      if (!collision(character.x + character.vx, character.y)) {
        character.x += character.vx;
      }
      if (!collision(character.x, character.y + character.vy)) {
        character.y += character.vy;
      }
      if (character.vx > 0) {
        character.vx -= speed / 2;
      }
      if (character.vx < 0) {
        character.vx += speed / 2;
      }
      if (character.vy > 0) {
        character.vy -= speed / 2;
      }
      if (character.vy < 0) {
        character.vy += speed / 2;
      }
      app.stage.position.set(app.screen.width / 2, app.screen.height / 2);
      app.stage.pivot.copy(character.position);
      if (kb.pressed.ArrowRight || kb.pressed.d) {
        character.vx = Math.min(maxSpeed, character.vx + speed);
        if (character.scale.x < 0) character.scale.x *= -1;
      }
      if (kb.pressed.ArrowLeft || kb.pressed.a) {
        character.vx = Math.max(-maxSpeed, character.vx - speed);
        if (character.scale.x > 0) character.scale.x *= -1;
      }
      if (kb.pressed.ArrowUp || kb.pressed.w) {
        character.vy = Math.max(-maxSpeed, character.vy - speed);
      }
      if (kb.pressed.ArrowDown || kb.pressed.s) {
        character.vy = Math.min(maxSpeed, character.vy + speed);
      }
    });
  }
  app.loader.onError.add((error) => console.error(error));

  class Keyboard {
    constructor() {
      this.pressed = {};
    }

    watch(el) {
      el.addEventListener("keydown", (e) => {
        this.pressed[e.key] = true;
      });
      el.addEventListener("keyup", (e) => {
        this.pressed[e.key] = false;
      });
    }
  }
}

var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

app.use(express.static("public"));

http.listen(3000, () => {
  console.log("listening on *:3000");
});

function genMaze(width, height) {
  let maps = [];
  let check = [];
  let temp = [];
  let dirs = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];
  for (let i = 0; i < width * 2 + 1; i++) temp.push(true);
  for (let i = 0; i < height * 2 + 1; i++) check.push([...temp]);

  for (let i = 0; i < height * 2 + 1; i++) {
    temp = [];
    for (let j = 0; j < width * 2 + 1; j++)
      if ((i * j) % 2) temp.push(getRandomFloor());
      else temp.push(2);
    maps.push([...temp]);
  }

  function getRandomFloor() {
    let x = Math.floor(Math.random() * 4);
    let y = Math.floor(Math.random() * 3);
    return 6 + y * 10 + x;
  }
  function shuffle(array) {
    var currentIndex = array.length,
      temporaryValue,
      randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  function dfs(x, y) {
    dirs = shuffle(dirs);
    for (let i = 0; i < 4; i++) {
      let u = x + dirs[i][0] * 2,
        v = y + dirs[i][1] * 2;
      if (u < width * 2 + 1 && v < width * 2 + 1 && u >= 0 && v >= 0 && check[u][v]) {
        check[u][v] = false;
        maps[x + dirs[i][0]][y + dirs[i][1]] = getRandomFloor();
        if (u == width * 2 && v == height * 2) break;
        dfs(u, v);
      }
    }
  }
  dfs(1, 1);

  return maps;
}

let gameData = {
  width: 6,
  height: 6,
  tileSize: 16,
  SCALE: 7,
  speed: 2,
  maxSpeed: 8,
  players: {},
};
gameData.maze = genMaze(gameData.width, gameData.height);
io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("newPlayer", (data) => {
    gameData.players[socket.id] = data;
  });
  socket.emit("gameData", gameData);
  socket.on("playerpos", (data) => {
    if (gameData.players[socket.id]) {
      gameData.players[socket.id].pos = data.pos;
      gameData.players[socket.id].scale = data.scale;
    }
  });
  setInterval(() => {
    io.emit("playerspos", gameData.players);
  }, 1000 / 60);
  socket.on("disconnect", () => {
    console.log("a user disconnected", socket.id);
    delete gameData.players[socket.id];
    io.emit("playerLeave", { id: socket.id });
  });
});

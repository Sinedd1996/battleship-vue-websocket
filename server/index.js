const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: ["http://localhost", 'http://localhost:4173'],
    methods: ["GET", "POST"],
  },
});

// Хранилище игровых комнат
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("Новое подключение:", socket.id);

  // Создание новой комнаты для игры
  socket.on("createGame", (playerId) => {
    const roomId = generateRoomId();

    rooms.set(roomId, {
      players: [playerId],
      gameScores: { [playerId]: {} },
      currentPlayer: playerId,
      gameStarted: false,
      winnerId: undefined,
    });

    socket.join(roomId);
    socket.emit("gameCreated", roomId);
    console.log(`Игра создана, комната: ${roomId}`);
  });

  socket.on("setGameScoresShipsPosition", ({ roomId, playerId, listShip }) => {
    if (roomId && playerId && listShip?.length) {
      const room = rooms.get(roomId);

      room.gameScores[playerId] = {
        shots: [],
        damages: [],
        ships: listShip,
        miss: [],
        opponentMiss: [],
      };

      const roomScoresKeys = Object.keys(room.gameScores);
      // первый игрок
      const firstPlayer = room.gameScores[roomScoresKeys[0]];
      // второй игрок
      const lastPlayer = room.gameScores[roomScoresKeys[1]];

      // если 2 игрока готовы играть, стартуем
      if (firstPlayer?.ships?.length && lastPlayer?.ships?.length) {
        console.log("Все игроки готовы, запускаем игру");
        room.gameStarted = true;
        io.to(roomId).emit("gameStart", room.currentPlayer);
      }
    }
  });

  socket.on("setGameScoresPlayerShot", ({ roomId, playerId, cellId }) => {
    if (roomId && playerId) {
      const room = rooms.get(roomId);
      const roomScoresKeys = Object.keys(room.gameScores);
      const opponentKey = roomScoresKeys.find((item) => item !== playerId);
      const currentPlayerKey = roomScoresKeys.find((item) => item === playerId);

      if (room.gameScores[currentPlayerKey] && room.gameScores[opponentKey]) {
        let successfulShotShip = undefined;
        let successfulShotShipId = undefined;

        room.gameScores[opponentKey].ships.forEach((elem) => {
          const hasSuccess = elem?.cells?.find(
            (shipIndex) => shipIndex === cellId
          );

          if (hasSuccess || hasSuccess === 0) {
            successfulShotShipId = elem.id;
          }
        });

        if (successfulShotShipId) {
          successfulShotShip = room.gameScores[opponentKey].ships.find(
            (item) => item.id === successfulShotShipId
          );
        }

        // если есть попадание
        if (successfulShotShip) {
          console.log("Есть попадание!");
          let damageInfo = undefined;
          const currentOpponentDamagesIndex = room.gameScores[
            opponentKey
          ].damages.findIndex((item) => item?.id === successfulShotShip.id);

          // если мы попали уже в раненый корабль
          if (currentOpponentDamagesIndex >= 0) {
            console.log("данный корабль уже есть в damages");

            const currentCells = [
              ...new Set(
                room.gameScores[opponentKey].damages[
                  currentOpponentDamagesIndex
                ].cells
              ),
              cellId,
            ];

            // состояние корабля в который попали после попадания в него
            const currentStatus =
              currentCells.length === successfulShotShip.cells.length
                ? "kill"
                : "hit";

            damageInfo = {
              id: successfulShotShip.id,
              cells: currentCells,
              status: currentStatus,
            }

            const opponentShip = room.gameScores[opponentKey].damages[
              currentOpponentDamagesIndex
            ]

            const playerShip = room.gameScores[currentPlayerKey].shots[
              currentOpponentDamagesIndex
            ]

            // актуализируем damages и shots
            if (opponentShip && playerShip) {
              [opponentShip, playerShip].forEach((itemShip) => {
                itemShip.cells = currentCells;
                itemShip.status = currentStatus;
              })
            }

          } else {
            // если это самое первое попадание в корабль
            damageInfo = {
              id: successfulShotShip.id,
              cells: [cellId],
              status: successfulShotShip.cells.length === 1 ? "kill" : "hit",
            };

            room.gameScores[opponentKey].damages.push(damageInfo);
            room.gameScores[currentPlayerKey].shots.push(damageInfo);
          }

          if (damageInfo) {
            console.log('Отправляем информацию о попадании игрокам')
            io.to(roomId).emit("gameScoresDamagesUpdate", {
              damageInfo,
              currentPlayerId: room.currentPlayer,
              cellId,
            });

            // если текущий игрок уничтожил все корабли, заканчиваем игру
            const currentPlayerKills = room.gameScores[currentPlayerKey].shots.filter((ship) => ship?.status === 'kill');
            
            if (currentPlayerKills.length === room.gameScores[currentPlayerKey]?.ships?.length) {
              room.gameScores[opponentKey]
              room.winnerId = currentPlayerKey;
              io.to(roomId).emit("gameOver", currentPlayerKey);
            }
          }
        } else {
          console.log("Вы не попали!");
          room.gameScores[currentPlayerKey].miss.push(cellId);
          // на всякий случай, записываем только уникальные id
          const uniqueList = [
            ...new Set(room.gameScores[currentPlayerKey].miss),
          ];

          room.gameScores[opponentKey].opponentMiss = [...uniqueList];
          room.gameScores[currentPlayerKey].miss = [...uniqueList];

          // после промаха переключаем ход на сеперника
          room.currentPlayer = opponentKey;

          io.to(roomId).emit("gameScoresMissUpdate", {
            cellId,
            currentPlayerId: room.currentPlayer,
          });
        }
      }
    }
  });

  socket.on("getGameScoresPlayer", ({ roomId, playerId }) => {
    if (roomId && playerId) {
      const room = rooms.get(roomId);

      if (room.gameScores[playerId]?.ships?.length) {
        socket.emit("gameScoresPlayerUpdate", {
          gameScoresPlayer: room.gameScores[playerId],
          currentPlayerId: room.currentPlayer,
          winnerId: room.winnerId,
        });
      }
    }
  });

  // Присоединение к игре
  socket.on("joinGame", ({ roomId, playerId }) => {
    const room = rooms.get(roomId);

    if (!room) {
      console.log("Комната не найдена");
      socket.emit("roomNotFound", "Комната не найдена");
      return;
    }

    // если в комната не заполнена
    if (room.players.length <= 2) {
      console.log("В данной комнате есть игроки", room.players);

      // для игроков комнаты отправляем данные
      if (room.players.includes(playerId)) {
        socket.join(roomId);
        io.to(roomId).emit("playerJoined", room);
        return;
      }
    }

    // если комната занята
    if (room.players.length === 2) {
      console.log("Комната занята");
      socket.emit("roomAccessError");
      return;
    }

    room.players.push(playerId);
    room.gameScores[playerId] = {};
    room.gameStarted = false;

    socket.join(roomId);

    io.to(roomId).emit("playerJoined", room);
    io.to(roomId).emit("gameUpdate", {
      gameScores: room.gameScores,
      currentPlayer: room.currentPlayer,
    });
  });

  socket.on("disconnectGame", (roomId) => {
    const room = rooms.get(roomId);

    console.log("Пользователь отключился: ", socket.id);

    io.to(roomId).emit("disconnectedGame");

    if (room && room?.players) {
      room.players = [];
    }

    // Очищаем комнату при отключении хотя бы одного игрока
    cleanUpRooms();
  });
});

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function cleanUpRooms() {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.length === 0) {
      rooms.delete(roomId);
    }
  }
}

const PORT = 4000;

server.listen(PORT, () => {
  console.log("Server is running on port 4000");
});

// server.listen(PORT, '0.0.0.0', () => {
//   console.log("Server is running on port 4000");
// });

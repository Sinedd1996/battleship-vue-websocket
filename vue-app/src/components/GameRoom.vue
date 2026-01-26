<template>
  <GameBoard
    v-if="gameStarted"
    :session-id="sessionId"
    :room-id="roomId"
  />
  <GameCreateShipPositions
    v-else
    @ready-to-play="(event) => handleAddShipsToServer(event)"
  />
</template>

<script setup>
import { watch } from "vue";
import GameCreateShipPositions from "./GameCreateShipPositions.vue";
import GameBoard from "./GameBoard.vue";
import socket from "../socket";

const { sessionId, roomId, gameStarted } = defineProps([
  "sessionId",
  "roomId",
  "gameStarted",
]);

const handleAddShipsToServer = (listShip) => {
  console.log("Отправляем на сервер позиции кораблей", listShip);
  socket.emit("setGameScoresShipsPosition", {
    roomId,
    playerId: sessionId,
    listShip,
  });
};

watch(
  () => gameStarted,
  (newValue) => {
    // если игра стартовала запрашиванм актуальные данные текущего игрока
    if (newValue) {
      socket.emit("getGameScoresPlayer", { roomId, playerId: sessionId });
    }
  },
  { immediate: true }
);
</script>

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

<script setup lang="ts">
import { watch } from "vue";
import GameCreateShipPositions from "./GameCreateShipPositions.vue";
import GameBoard from "./GameBoard.vue";
import socket from "../socket";
import type { ListOfShip } from "../types/game";

const { sessionId, roomId, gameStarted } = defineProps<{
  sessionId: string,
  roomId: string,
  gameStarted: boolean
}>();

const handleAddShipsToServer = (listOfShip: ListOfShip) => {
  console.log("Отправляем на сервер позиции кораблей", listOfShip);
  socket.emit("setGameScoresShipsPosition", {
    roomId,
    playerId: sessionId,
    listOfShip,
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

<template>
  <div v-if="isLoading">Загрузка...</div>
  <div v-else-if="isRoomAccessError || isRoomNotFound">
    <p>
      {{
        isRoomAccessError
          ? "Эта комната занята."
          : "Такой комнаты не существует."
      }}<br />
      Перейдите на главную страницу и создайте свою игру
    </p>
    <button @click="resetGameState">Перейти на главную</button>
  </div>
  <template v-else>
    <div v-if="stepGame === 0">
      <h1>Морской бой</h1>
      <button type="button" @click="createGame(sessionId)">
        Сыграть с другом
      </button>
    </div>
    <div v-if="stepGame === 1">
      <FieldForCopy />
      <button @click="goToCreateGame">Отмена</button>
    </div>
    <div v-if="stepGame === 2">
      <template v-if="isOpponentLeft">
        <p v-if="isOpponentLeft">Ваш соперник покинул игру, игра отменена</p>
        <button @click="goToCreateGame">Перейти на главную</button>
      </template>
      <GameRoom
        v-else
        :session-id="sessionId"
        :room-id="pageQueryRoomId"
        :game-started="isGameStarted"
      />
    </div>
  </template>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { ref, onMounted, onBeforeMount } from "vue";
import socket from "../socket";
import GameRoom from "./GameRoom.vue";
import FieldForCopy from "./FieldForCopy.vue";
import { randomUUID } from "../utils/uuid";

const stepGame = ref(0);
const router = useRouter();
const route = useRoute();
const isLoading = ref(false);
const pageQueryRoomId = ref(String(route.query.room || ''));
const isOpponentLeft = ref(false);
const isRoomAccessError = ref(false);
const isRoomNotFound = ref(false);

const sessionId = ref(randomUUID());
const isGameStarted = ref(false);

const createGame = (playerId: string) => {
  socket.emit("createGame", playerId);
};

const pushQueryRoomId = (id: string) => {
  router.replace({ query: { room: id } });
  pageQueryRoomId.value = id;
};

const resetGameState = () => {
  router.replace({});
  stepGame.value = 0;
  isOpponentLeft.value = false;
  isRoomAccessError.value = false;
  isRoomNotFound.value = false;
};

const goToCreateGame = () => {
  socket.emit("disconnectGame", pageQueryRoomId.value);
  resetGameState();
};

onBeforeMount(() => {
  if (window.localStorage.getItem("sessionId")) {
    sessionId.value = window.localStorage.getItem("sessionId") || "";
  } else {
    window.localStorage.setItem("sessionId", sessionId.value);
  }

  if (route.query.room) {
    stepGame.value = 1;
    isLoading.value = true;
  }

  console.log("is before mounted");
});

onMounted(() => {
  socket.on("gameCreated", (roomId) => {
    console.log("Игра создана, id комнаты - ", roomId);
    pushQueryRoomId(roomId);
    stepGame.value = 1;
  });

  if (isLoading.value) {
    // если загрузка при открытии подключаемся к игре
    socket.emit("joinGame", {
      roomId: pageQueryRoomId.value,
      playerId: sessionId.value,
    });
  }

  socket.on("playerJoined", ({ players, gameStarted }) => {
    if (players && players?.length && players.includes(sessionId.value)) {
      stepGame.value = players.length;
      isLoading.value = false;
      isGameStarted.value = gameStarted;
    }
    console.log("Пользователь подключился к комнате ");
  });

  socket.on("disconnectedGame", () => {
    isOpponentLeft.value = true;
  });

  socket.on("roomAccessError", () => {
    isRoomAccessError.value = true;
    isLoading.value = false;
  });

  socket.on("roomNotFound", () => {
    isRoomNotFound.value = true;
    isLoading.value = false;
  });

  // когда игра началась
  socket.on("gameStart", () => {
    isGameStarted.value = true;
  });
});
</script>

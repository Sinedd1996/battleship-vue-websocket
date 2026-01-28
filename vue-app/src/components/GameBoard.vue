<template>
  <template v-if="gameWinnerId && sessionId">
    <h2>
      Игра закончилась!<br />
      Вы
      {{ gameWinnerId === sessionId ? "выиграли!" : "проиграли!" }}
    </h2>
  </template>
  <h2 v-else>{{ isMyCurrentPlayerId ? "Ваш ход" : "Ход соперника" }}</h2>
  <div class="game-boards flex">
    <div class="game-boards__col">
      <p v-if="!gameWinnerId" class="game-boards__text">
        Вы уничтожили: {{ myScores }} из {{ playerShips.length }}
      </p>
      <div class="board">
        <div
          v-for="(item, index) in playerBoard"
          :key="index"
          class="board-item"
          :class="{
            'is-ship': item === 1,
            'is-miss': item === 9,
            'is-hit-icon': item === 2 || item === 3,
          }"
        />
      </div>
    </div>
    <div class="game-boards__col">
      <p v-if="!gameWinnerId" class="game-boards__text">
        Соперник уничтожил: {{ oppenentScores }} из {{ playerShips.length }}
      </p>
      <div
        class="board"
        :class="{ 'board-with-hover': isMyCurrentPlayerId && !gameWinnerId }"
        @click="handleClickBoard"
      >
        <div
          v-for="(item, index) in opponentBoard"
          :key="index"
          :data-index="index"
          class="board-item"
          :class="{
            'is-ship': item === 1,
            'is-miss': item === 9,
            'is-hit': item === 2,
            'is-kill': item === 3,
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, ref } from "vue";
import socket from "../socket";
import { addCellsDisabled } from "../utils/helper";

const { sessionId, roomId } = defineProps(["sessionId", "roomId"]);

const playerBoard = ref(Array.from({ length: 100 }, () => 0));
const opponentBoard = ref(Array.from({ length: 100 }, () => 0));

const isMyCurrentPlayerId = computed(() => currentPlayer.value === sessionId);
const indexLastClickCell = ref(-1);

const currentPlayer = ref();
const playerShips = ref([]);

const myScores = ref(0);
const oppenentScores = ref(0);

const gameWinnerId = ref(undefined);

watch(
  () => playerShips.value,
  (currentShips) => {
    // устанавливаем положение наших кораблей
    currentShips?.forEach(({ cells }) => {
      changePlayerBoard(cells || []);
    });
  },
  { immediate: true }
);

const changePlayerBoard = (listIndex) => {
  for (let i = 0; i < listIndex.length; i++) {
    if (playerBoard.value[listIndex[i]] === 0) {
      playerBoard.value[listIndex[i]] = 1;
    }
  }
};

const handleClickBoard = (event) => {
  // если есть победитель не реагируем на клик
  if (gameWinnerId.value) {
    return;
  }

  if (currentPlayer.value !== sessionId) {
    return alert("Сейчас ход соперника!");
  }
  const cellId = Number(event.target.dataset?.index);

  if ((cellId || cellId === 0) && indexLastClickCell.value !== cellId) {
    socket.emit("setGameScoresPlayerShot", {
      roomId,
      playerId: sessionId,
      cellId,
    });

    indexLastClickCell.value = cellId;
  }
};

// при загрузке актуализируем состояние подбитых кораблей
const setBoardCellsOnLoad = (
  currentCells = [],
  boardList = [],
  isMyBoard = false
) => {
  currentCells?.forEach(({ cells, status }) => {
    cells.forEach((index) => {
      boardList[index] = status === "kill" ? 3 : 2;
    });

    // если корабль уничтожен, вокруг него ставим клетки промахов
    if (status === "kill") {
      addCellsDisabled(cells.sort(), boardList);

      isMyBoard ? (myScores.value += 1) : (oppenentScores.value += 1);
    }
  });
};

// после обновления damageInfo актуализируем состояние подбитого корабля
const setBoardCellsOnUpdateDamageInfo = ({
  cells = [],
  status,
  boardList,
  isMyBoard = false,
}) => {
  cells.forEach((index) => {
    boardList[index] = status === "kill" ? 3 : 2;
  });

  // если корабль уничтожен, вокруг него ставим клетки промахов
  if (status === "kill") {
    addCellsDisabled(cells.sort(), boardList);

    isMyBoard ? (myScores.value += 1) : (oppenentScores.value += 1);
  }
};

onMounted(() => {
  socket.on(
    "gameScoresPlayerUpdate",
    ({ gameScoresPlayer, currentPlayerId, winnerId }) => {
      currentPlayer.value = currentPlayerId;
      // при монтировании записываем позицию кораблей
      if (!playerShips.value.length) {
        playerShips.value = [...gameScoresPlayer.ships];
      }

      gameScoresPlayer.miss?.forEach((index) => {
        opponentBoard.value[index] = 9;
      });

      gameScoresPlayer.opponentMiss?.forEach((index) => {
        playerBoard.value[index] = 9;
      });

      // попадания по кораблям соперника
      setBoardCellsOnLoad(gameScoresPlayer.shots, opponentBoard.value, true);
      // попадания по моим кораблям
      setBoardCellsOnLoad(gameScoresPlayer.damages, playerBoard.value);

      gameWinnerId.value = winnerId;
    }
  );

  socket.on("gameScoresMissUpdate", ({ cellId, currentPlayerId }) => {
    if (typeof cellId === "number" && currentPlayerId) {
      if (currentPlayerId !== sessionId) {
        opponentBoard.value[cellId] = 9;

        console.log("Я промахнулся");
      } else {
        playerBoard.value[cellId] = 9;

        console.log("Соперник промахнулся");
      }
      currentPlayer.value = currentPlayerId;
    }
  });

  socket.on(
    "gameScoresDamagesUpdate",
    ({ damageInfo, cellId, currentPlayerId }) => {
      const { cells, status } = damageInfo;

      if (typeof cellId === "number" && currentPlayerId) {
        const boardList =
          currentPlayerId === sessionId
            ? opponentBoard.value
            : playerBoard.value;

        // на игровом поле отрисуем состояние подбитого корабля
        setBoardCellsOnUpdateDamageInfo({
          cells,
          status,
          boardList,
          isMyBoard: currentPlayerId === sessionId,
        });
      }
    }
  );

  socket.on("gameOver", (winnerId) => {
    gameWinnerId.value = winnerId;
  });
});
</script>

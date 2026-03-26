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

<script setup lang="ts">
import { computed, watch, onMounted, ref } from "vue";
import socket from "../socket";
import { addCellsDisabled } from "../utils/helper";
import type { Cell, DamageInfo, GameScoresDamages, GameScoresMiss, GameScoresPlayer, SessionId, Shots } from "../types/game";

const { sessionId, roomId } = defineProps<{
  sessionId: SessionId,
  roomId: SessionId
}>();

const playerBoard = ref(Array.from({ length: 100 }, () => 0));
const opponentBoard = ref(Array.from({ length: 100 }, () => 0));

const isMyCurrentPlayerId = computed(() => currentPlayer.value === sessionId);
const indexLastClickCell = ref(-1);

const currentPlayer = ref<SessionId>();
const playerShips = ref<Shots[]>([]);

const myScores = ref(0);
const oppenentScores = ref(0);

const gameWinnerId = ref<SessionId>();

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

const changePlayerBoard = (listIndex: Cell[]) => {
  for (let i = 0; i < listIndex.length; i++) {
    const cellIndex = listIndex[i];
    if (cellIndex !== undefined && playerBoard.value[cellIndex] === 0) {
      playerBoard.value[cellIndex] = 1;
    }
  }
};

const handleClickBoard = (event: MouseEvent) => {
  // если есть победитель не реагируем на клик
  if (gameWinnerId.value) {
    return;
  }

  if (currentPlayer.value !== sessionId) {
    return alert("Сейчас ход соперника!");
  }

  const target = event.target as HTMLDivElement
  const cellId = Number(target.dataset?.index);

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
  currentCells: Shots[] = [],
  boardList: Cell[] = [],
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
}: DamageInfo) => {
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
    ({ gameScoresPlayer, currentPlayerId, winnerId }: GameScoresPlayer) => {
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

  socket.on("gameScoresMissUpdate", ({ cellId, currentPlayerId }: GameScoresMiss) => {
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
    ({ damageInfo, cellId, currentPlayerId }: GameScoresDamages) => {
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

  socket.on("gameOver", (winnerId: string) => {
    gameWinnerId.value = winnerId;
  });
});
</script>

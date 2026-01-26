<template>
  <div v-if="isVisibleWaiting">
    <h2>
      Вы готовы к игре.<br />
      Как только соперник будет готов игра начнется!
    </h2>
  </div>
  <template v-else>
    <h2>
      Выберите расположение кораблей!<br />
      Подтвердите готовность нажав кнопку "В бой"
    </h2>
    <button @click="handleReadyToPlay">В бой</button>
    <div class="game-boards flex">
      <div
        class="board ships"
        :class="{ 'theme-vertical': isPositionVertical }"
      >
        <div
          v-for="(item, index) of SHIPS"
          :key="item.id"
          :id="item.id"
          :class="`ship ship-${item.size}`"
          draggable="true"
          @dragstart="(event) => dragstartHandler(event, item.size)"
          @dragend="(event) => dragEndHandler(event)"
        >
          <span v-if="item.size > 0 && item.size < 5"
            >x{{ getNumberOfShips(item.size, index) }}</span
          >
        </div>
        <button
          v-if="countAddedShips < SHIPS.length"
          class="board-button__rotate"
          @click="() => (isPositionVertical = !isPositionVertical)"
        >
          Повернуть {{ isPositionVertical ? "горизонтально" : "вертикально" }}
        </button>
      </div>
      <div
        class="board"
        @drop="(event) => dropHandler(event)"
        @dragover="(event) => dragoverHandler(event)"
      >
        <div
          v-for="(item, index) in playerBoard"
          :key="index"
          :data-index="index"
          class="board-item"
          :class="{ 'is-ship': item === 1, 'is-disabled': item === 9 }"
        />
      </div>
    </div>
  </template>
</template>

<script setup>
import { ref } from "vue";
import { SHIPS } from "../consts";
import { addCellsDisabled } from "../utils/helper";

const emit = defineEmits(["readyToPlay"]);

const playerBoard = ref(Array.from({ length: 100 }, () => 0));
const currentShipSize = ref(0);
const countAddedShips = ref(0);
const playerShips = [];
const isVisibleWaiting = ref(false);
const isPositionVertical = ref(false);

function dragstartHandler(event, shipSize) {
  event.dataTransfer.setData("text", event.target.id);
  currentShipSize.value = shipSize;
  // console.log(event, " ---- dragstartHandler");
}

function dragEndHandler(event) {
  event.dataTransfer.setData("text", event.target.id);
  // console.log(event, " ---- dragEndHandler");
}

function dragoverHandler(event) {
  event.preventDefault();

  console.log('event target', event?.target)
}

function dropHandler(event) {
  event.preventDefault();

  const dataId = event.dataTransfer.getData("text");
  const elem = document.getElementById(dataId);
  const index = Number(event.target.dataset.index);

  if (playerBoard.value[index] === 1 || playerBoard.value[index] === 9) {
    console.log("клетка заблокирована");
    return;
  }
  addShipOnBoard(index, currentShipSize.value, elem, Number(dataId));
}

const addShipOnBoard = (index, shipSize, elemById, shipId) => {
  const cellIndex = index % 10;
  const rowIndex = index < 10 ? 0 : Math.floor(index / 10);
  const listIndexNewCells = [index];
  let positionIndex = 1;

  for (let i = 1; i < shipSize; i++) {
    // условие добавления вертикально либо горизонтально
    const conditionIndex = isPositionVertical.value ? rowIndex : cellIndex;
    // условие если клетки помещаются в ряд (горизонтально либо вертикально)
    const conditionAddedDefault = isPositionVertical.value
      ? index - positionIndex * 10
      : index - positionIndex;
    // условие если клетки не помещаются в ряд (горизонтально либо вертикально), то выводим их в обратном направлении
    const conditionAddedReverse = isPositionVertical.value
      ? index + i * 10
      : index + i;

    if (conditionIndex + i > 9) {
      listIndexNewCells.push(conditionAddedDefault);
      positionIndex++;
    } else {
      listIndexNewCells.push(conditionAddedReverse);
    }
  }

  // проверка впереди идущих клеток на свободность
  for (let i = 0; i < listIndexNewCells.length; i++) {
    // если хотя бы одна из клеток занята прерываем добавление корабля
    if (playerBoard.value[listIndexNewCells[i]] !== 0) {
      console.log("Ошибка, не правильное расположение корабля");
      return;
    }
  }

  changePlayerBoard(listIndexNewCells);
  addCellsDisabled(listIndexNewCells.sort(), playerBoard.value);

  playerShips.push({
    id: shipId,
    cells: listIndexNewCells,
  });

  elemById?.remove();
  countAddedShips.value += 1;

  currentShipSize.value = 0;
};

const changePlayerBoard = (listIndex) => {
  for (let i = 0; i < listIndex.length; i++) {
    playerBoard.value[listIndex[i]] = 1;
  }
};

const getNumberOfShips = (size, index) => {
  return [0, 4, 7, 9, 10][size] - index;
};

const handleReadyToPlay = () => {
  if (countAddedShips.value < SHIPS.length) {
    return alert("Сперва расставьте все корабли");
  }
  emit("readyToPlay", playerShips);
  isVisibleWaiting.value = true;
  console.log("Я готов играть");
};
</script>

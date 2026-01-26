// добавление задисабленных полей вокруг корабля
export const addCellsDisabled = (listCells = [], boardList = []) => {
  listCells.forEach((elem) => {
    const cellIndex = elem % 10;

    // добавим сверху
    setCellDisabled({ index: elem - 10, boardList });

    // добавим снизу
    setCellDisabled({ index: elem + 10, boardList });

    // добавим справа
    setCellDisabled({ index: elem + 1, additionalCheck: cellIndex !== 9, boardList });

    // добавим справа сверху
    setCellDisabled({ index: elem - 9, additionalCheck: cellIndex !== 9, boardList });

    // добавим справа снизу
    setCellDisabled({ index: elem + 11, additionalCheck: cellIndex !== 9, boardList });

    // добавим слева
    setCellDisabled({ index: elem - 1, additionalCheck: cellIndex !== 0, boardList });

    // добавим слева сверху
    setCellDisabled({ index: elem - 11, additionalCheck: cellIndex !== 0, boardList });

    // добавим слева снизу
    setCellDisabled({ index: elem + 9, additionalCheck: cellIndex !== 0, boardList });
  });
};

export const setCellDisabled = ({ index, additionalCheck = true, boardList = [] }) => {
  // если клетка пустая, и если ей можно поменять состояние, тогда меняем на задисабленный код
  if (boardList[index] === 0 && additionalCheck) {
    boardList[index] = 9;
  }
};

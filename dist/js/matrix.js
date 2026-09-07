export function createMatrix(rows, columns, value = 0) {
  return Array.from({ length: rows }, () => Array(columns).fill(value));
}

export function rotateClockwise(matrix) {
  const height = matrix.length;
  const width = matrix[0].length;
  return Array.from({ length: width }, (_, y) =>
    Array.from({ length: height }, (_, x) => matrix[height - 1 - x][y])
  );
}

export function occupiedCells(matrix) {
  const cells = [];
  matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value) cells.push({ x, y });
  }));
  return cells;
}

export function cloneMatrix(matrix) {
  return matrix.map(row => [...row]);
}

export const LESSONS = {
  representation: {
    index: 1,
    title: 'Two ways to store the same game',
    description: 'Switch engines to see whether the active piece lives in the main matrix or in its own layer with a separate position.',
    formula: 'Board: 20 × 10 · Piece: a small local matrix',
    note: 'Both engines return the same normalized view even though their internal memory differs.',
    question: 'Which engine moves a piece without writing to the board?',
    answers: [{ text: 'Single matrix' }, { text: 'Separate layers', correct: true }],
    algorithm: 'collision'
  },
  collision: {
    index: 2,
    title: 'A collision is a bounded query',
    description: 'Both engines inspect only occupied piece cells, but the single matrix must first remove its negative values temporarily.',
    formula: 'collision = out of bounds OR board value > 0',
    note: 'Positive values are fixed. In the single matrix, negative values represent the piece that is still moving.',
    question: 'Which values can the active piece collide with?',
    answers: [{ text: 'With 0' }, { text: 'With positive values', correct: true }, { text: 'With negative values' }],
    algorithm: 'collision'
  },
  rotation: {
    index: 3,
    title: 'The transformation is the same; where it is written changes',
    description: 'Both engines rotate a small matrix by 90 degrees. The single matrix erases and paints again; the layered engine replaces piece.matrix.',
    formula: 'rotated[r][c] = original[n - 1 - c][r]',
    note: 'Wall kicks try lateral offsets before accepting the candidate matrix.',
    question: 'What happens before a rotation is accepted?',
    answers: [{ text: 'It is validated', correct: true }, { text: 'It is locked' }, { text: 'A row is cleared' }],
    algorithm: 'rotation'
  },
  clear: {
    index: 4,
    title: 'Shift in place or build a new matrix',
    description: 'The single matrix copies every upper row downward. The layered model filters completed rows and creates a new composition.',
    formula: 'O(rows × columns) = at most 200 inspected cells',
    note: 'Both strategies scan at most the board’s 200 cells: O(rows × columns).',
    question: 'What does the number 0 represent in both engines?',
    answers: [{ text: 'Empty', correct: true }, { text: 'I piece' }, { text: 'Collision' }],
    algorithm: 'clear'
  }
};

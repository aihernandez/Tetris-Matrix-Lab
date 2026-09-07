export function extractClassMethod(source, methodName) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const signature = new RegExp(`^\\s{2}${methodName}\\(`);
  const startIndex = lines.findIndex(line => signature.test(line));

  if (startIndex === -1) return null;

  let depth = 0;
  let foundOpeningBrace = false;
  let endIndex = startIndex;

  for (let index = startIndex; index < lines.length; index++) {
    for (const character of lines[index]) {
      if (character === '{') {
        depth++;
        foundOpeningBrace = true;
      } else if (character === '}') {
        depth--;
      }
    }

    endIndex = index;
    if (foundOpeningBrace && depth === 0) break;
  }

  return {
    startLine: startIndex + 1,
    lines: lines.slice(startIndex, endIndex + 1)
  };
}

export function selectExecutionLines(method, highlights = [], contextLines = 1) {
  if (!method?.lines?.length) return [];

  const lastIndex = method.lines.length - 1;
  const selectedIndexes = new Set([0, lastIndex]);
  const statementIndexes = highlights
    .map(hint => method.lines.findIndex(line => (
      line.includes(hint) && !line.trimStart().startsWith('highlights:')
    )))
    .filter(index => index >= 0);

  if (statementIndexes.length === 0) {
    for (let index = 1; index < Math.min(lastIndex, 7); index++) selectedIndexes.add(index);
  } else {
    for (const statementIndex of statementIndexes) {
      const from = Math.max(1, statementIndex - contextLines);
      const to = Math.min(lastIndex - 1, statementIndex + contextLines);
      for (let index = from; index <= to; index++) selectedIndexes.add(index);
    }
  }

  const orderedIndexes = [...selectedIndexes].sort((a, b) => a - b);
  const result = [];
  let previousIndex = -1;

  for (const index of orderedIndexes) {
    if (previousIndex >= 0 && index > previousIndex + 1) {
      result.push({ lineNumber: '', text: '  ⋮', omitted: true });
    }
    result.push({
      lineNumber: method.startLine + index,
      text: method.lines[index] || ' ',
      omitted: false
    });
    previousIndex = index;
  }

  return result;
}

export function buildAnnotatedSourceLines(source, notes = []) {
  const sourceLines = source.replace(/\r\n/g, '\n').split('\n');
  const notesByLine = new Map();

  for (const note of notes) {
    const index = sourceLines.findIndex(line => line.includes(note.before));
    if (index < 0) continue;
    const lineNotes = notesByLine.get(index) ?? [];
    lineNotes.push(note.text);
    notesByLine.set(index, lineNotes);
  }

  return sourceLines.flatMap((text, index) => {
    const annotations = (notesByLine.get(index) ?? []).map(note => ({
      lineNumber: '',
      text: `// ${note}`,
      annotation: true
    }));
    return [
      ...annotations,
      { lineNumber: index + 1, text: text || ' ', annotation: false }
    ];
  });
}

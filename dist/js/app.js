import { LESSONS } from './content.js';
import { COLORS_BY_ID } from './pieces.js';
import { occupiedCells } from './matrix.js';
import {
  buildAnnotatedSourceLines,
  extractClassMethod,
  selectExecutionLines
} from './source-view.js';
import { createEngine } from './engines/engine-factory.js';
import { ENGINE_METADATA, ENGINE_TYPES } from './engines/engine-contract.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const DEFAULT_METHODS = Object.freeze({
  collision: 'checkPlacement',
  rotation: 'rotate',
  clear: 'clearCompletedRows'
});

const ACTION_CODE_VIEW = Object.freeze({
  spawn: { algorithm: 'collision', method: 'spawn' },
  gameover: { algorithm: 'collision', method: 'spawn' },
  step: { algorithm: 'collision', method: 'step' },
  move: { algorithm: 'collision', method: 'move' },
  rotate: { algorithm: 'rotation', method: 'rotate' },
  hardDrop: { algorithm: 'collision', method: 'hardDrop' },
  clear: { algorithm: 'clear', method: 'clearCompletedRows' }
});

const SOURCE_LIBRARY = Object.freeze([
  {
    id: 'single-matrix',
    group: 'ENGINES',
    label: 'Engine · Single matrix',
    path: 'dist/js/engines/single-matrix-engine.js',
    url: new URL('./engines/single-matrix-engine.js', import.meta.url).href,
    description: 'Stores fixed blocks and the active piece in the same 20 × 10 matrix.',
    notes: [
      { before: 'export class SingleMatrixEngine', text: 'This engine stores the whole game in one matrix.' },
      { before: 'spawn(preserveOutcome', text: 'Creates a piece and checks whether it can appear.' },
      { before: 'checkPlacement(pieceMatrix', text: 'Reads only the occupied cells of the piece.' },
      { before: 'move(dx)', text: 'Erases, validates, and paints the piece again.' },
      { before: 'rotate()', text: 'Rotates the matrix and tries short lateral adjustments.' },
      { before: 'clearCompletedRows()', text: 'Compacts completed rows from the bottom upward.' }
    ]
  },
  {
    id: 'layered-matrix',
    group: 'ENGINES',
    label: 'Engine · Separate layers',
    path: 'dist/js/engines/layered-matrix-engine.js',
    url: new URL('./engines/layered-matrix-engine.js', import.meta.url).href,
    description: 'Keeps the fixed board and active piece as separate states.',
    notes: [
      { before: 'export class LayeredMatrixEngine', text: 'This engine separates board, piece, and position.' },
      { before: 'spawn(preserveOutcome', text: 'The piece starts outside board and receives a position.' },
      { before: 'checkPlacement(pieceMatrix', text: 'Compares the piece against bounds and fixed blocks.' },
      { before: 'move(dx)', text: 'Moving changes piece.x only when the position is valid.' },
      { before: 'rotate()', text: 'Rotation is accepted only when it fits in board.' },
      { before: 'clearCompletedRows()', text: 'Filters completed rows and adds empty rows above.' }
    ]
  },
  {
    id: 'matrix',
    group: 'CORE',
    label: 'Matrix operations',
    path: 'dist/js/matrix.js',
    url: new URL('./matrix.js', import.meta.url).href,
    description: 'Pure functions to create, rotate, scan, and copy matrices.',
    notes: [
      { before: 'export function createMatrix', text: 'Every row is an independent array.' },
      { before: 'export function rotateClockwise', text: 'Swaps rows for columns and reverses one axis.' },
      { before: 'export function occupiedCells', text: 'Ignores zeros and returns only real blocks.' },
      { before: 'export function cloneMatrix', text: 'Copies every row to avoid shared references.' }
    ]
  },
  {
    id: 'pieces',
    group: 'CORE',
    label: 'Pieces and 7-bag',
    path: 'dist/js/pieces.js',
    url: new URL('./pieces.js', import.meta.url).href,
    description: 'Defines the seven tetrominoes and generates a bag without repeats.',
    notes: [
      { before: 'export const PIECES', text: 'Each piece has an id, color, and local matrix.' },
      { before: 'export class PieceBag', text: 'The bag delivers all seven pieces before repeating.' },
      { before: 'next()', text: 'Shuffles a new bag only after the previous one ends.' }
    ]
  },
  {
    id: 'engine-contract',
    group: 'CORE',
    label: 'Engine contract',
    path: 'dist/js/engines/engine-contract.js',
    url: new URL('./engines/engine-contract.js', import.meta.url).href,
    description: 'Names the engines and checks that both expose the same operations.',
    notes: [
      { before: 'export const ENGINE_TYPES', text: 'These ids switch engines without changing the interface.' },
      { before: 'export const ENGINE_METADATA', text: 'The interface gets each representation description here.' },
      { before: 'export function assertEngineContract', text: 'Fails early when an engine misses an operation.' }
    ]
  },
  {
    id: 'engine-factory',
    group: 'CORE',
    label: 'Engine factory',
    path: 'dist/js/engines/engine-factory.js',
    url: new URL('./engines/engine-factory.js', import.meta.url).href,
    description: 'Creates the selected implementation and validates its shared contract.',
    notes: [
      { before: 'export function createEngine', text: 'The factory hides which concrete class is created.' },
      { before: 'if (type === ENGINE_TYPES', text: 'The selected type decides which representation runs.' }
    ]
  },
  {
    id: 'application',
    group: 'INTERFACE',
    label: 'Main application',
    path: 'dist/js/app.js',
    url: new URL('./app.js', import.meta.url).href,
    description: 'Connects the engine, board, controls, lessons, and viewers.',
    notes: [
      { before: 'function render(state)', text: 'Converts the current state into visible elements.' },
      { before: 'function playCodeExecution', text: 'Moves the cursor through executed lines.' },
      { before: 'function selectEngine', text: 'Stops the previous engine before creating the next one.' },
      { before: 'function handleGameAction', text: 'Maps each button to an engine operation.' }
    ]
  },
  {
    id: 'source-view',
    group: 'INTERFACE',
    label: 'Viewer tools',
    path: 'dist/js/source-view.js',
    url: new URL('./source-view.js', import.meta.url).href,
    description: 'Extracts methods, selects paths, and adds teaching comments.',
    notes: [
      { before: 'export function extractClassMethod', text: 'Counts braces to extract one complete method.' },
      { before: 'export function selectExecutionLines', text: 'Keeps the executed path and a little context.' },
      { before: 'export function buildAnnotatedSourceLines', text: 'Adds visible comments without changing the real file.' }
    ]
  },
  {
    id: 'lesson-content',
    group: 'INTERFACE',
    label: 'Lesson content',
    path: 'dist/js/content.js',
    url: new URL('./content.js', import.meta.url).href,
    description: 'Keeps explanations and questions separate from visual logic.',
    notes: [
      { before: 'export const LESSONS', text: 'Each key describes one learning-path stage.' }
    ]
  }
]);

const boardElement = $('#board');
const cells = Array.from({ length: 200 }, (_, index) => {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.setAttribute('role', 'gridcell');
  cell.dataset.x = index % 10;
  cell.dataset.y = Math.floor(index / 10);
  boardElement.appendChild(cell);
  return cell;
});

$('#runtimeNotice').hidden = true;

let timer = null;
let activeAlgorithm = 'collision';
let currentLesson = 'representation';
let selectedEngineType = ENGINE_TYPES.SINGLE_MATRIX;
let soundEnabled = false;
let audioContext = null;
let previousLines = 0;
let sourceRequestId = 0;
let codePlaybackTimer = null;
let codePlaybackRunId = 0;
const completedLessons = new Set();
const sourceCache = new Map();
const sourceErrors = new Map();
const explorerSourceCache = new Map();
let syntaxHighlighterPromise = null;
let explorerRequestId = 0;
let selectedSourceFileId = 'single-matrix';
let explorerRawSource = '';
let explorerRenderedLines = [];
let explorerSearchMatches = [];
let explorerSearchIndex = -1;
let explorerCurrentLineNumber = null;
let explorerExecutionLineNumbers = new Set();
let sourceViewMode = 'execution';
let currentCodeSelection = { methodName: 'spawn', highlights: [], engineType: selectedEngineType };
let engine = createEngine(selectedEngineType, render);

void loadEngineSource(engine);

function render(state) {
  const visibleMatrix = state.getVisibleMatrix();
  cells.forEach(cell => {
    cell.className = 'cell';
    cell.style.backgroundColor = '';
    cell.textContent = '';
  });

  visibleMatrix.forEach((row, y) => row.forEach((value, x) => {
    if (value === 0) return;
    paintCell(x, y, value < 0 ? 'filled active-value' : 'filled locked-value', COLORS_BY_ID[Math.abs(value)], value);
  }));

  if (!state.isGameOver) {
    const ghostY = state.ghostY();
    occupiedCells(state.piece.matrix).forEach(({ x, y }) => {
      const boardX = state.piece.x + x;
      const boardY = ghostY + y;
      if (visibleMatrix[boardY]?.[boardX] === 0) paintCell(boardX, boardY, 'ghost');
    });
  }

  state.lastDecision.probes.forEach(probe => {
    if (probe.y >= 0 && probe.y < state.rows && probe.x >= 0 && probe.x < state.columns) {
      paintCell(probe.x, probe.y, probe.collision ? 'probed' : 'probed-safe');
    }
  });

  const metadata = ENGINE_METADATA[state.type];
  $('#score').textContent = String(state.score).padStart(6, '0');
  $('#lines').textContent = String(state.lines).padStart(2, '0');
  $('#level').textContent = String(state.level).padStart(2, '0');
  $('#cellsRead').textContent = state.metrics.reads;
  $('#boardWrites').textContent = state.metrics.writes;
  $('#decisionResult').textContent = String(state.lastDecision.collision);
  $('#decisionBadge').textContent = state.lastDecision.collision ? 'COLLISION' : 'NO COLLISION';
  $('#decisionText').textContent = state.lastDecision.label;
  $('#decisionCard').classList.toggle('collision', state.lastDecision.collision);
  $('#gameStatus').textContent = state.isGameOver ? 'GAME OVER' : state.isRunning ? 'RUNNING' : 'PAUSED';
  $('#statusDot').className = `status-dot ${state.isGameOver ? 'over' : state.isRunning ? 'running' : ''}`;
  $('#toggleButton').innerHTML = state.isRunning ? '<span>Ⅱ</span> PAUSE' : '<span>▶</span> RUN';
  $('#engineClassName').textContent = metadata.className;
  $('#engineFile').textContent = metadata.fileName;
  $('#memoryModel').textContent = metadata.memory;
  $('#encodingModel').textContent = metadata.activeEncoding;
  if (state.lines > previousLines) beep(660, 0.12);
  previousLines = state.lines;
  renderPieceMatrix(state.piece);
  renderExecutionTrace(state.lastTrace);
  showCodeForAction(state);
}

function paintCell(x, y, classNames, color, value = '') {
  if (x < 0 || x >= 10 || y < 0 || y >= 20) return;
  const cell = cells[y * 10 + x];
  classNames.split(' ').filter(Boolean).forEach(className => cell.classList.add(className));
  if (color) cell.style.backgroundColor = color;
  if (value !== '') cell.textContent = value;
}

function renderPieceMatrix(piece) {
  const container = $('#pieceMatrix');
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${piece.matrix[0].length}, 28px)`;
  piece.matrix.forEach(row => row.forEach(value => {
    const cell = document.createElement('div');
    cell.className = `mini-cell ${value ? 'filled' : ''}`;
    cell.textContent = value ? piece.id : 0;
    container.appendChild(cell);
  }));
  $('#pieceName').textContent = `${piece.name} = ${piece.id}`;
  $('#matrixLiteral').textContent = JSON.stringify(piece.matrix.map(row => row.map(value => value ? piece.id : 0)));
}

function renderExecutionTrace(trace) {
  const list = $('#executionTrace');
  list.replaceChildren();
  const steps = trace?.steps?.length ? trace.steps : ['Waiting for the first operation'];
  for (const step of steps) {
    const item = document.createElement('li');
    item.textContent = step;
    list.appendChild(item);
  }
}

function showCodeForAction(state) {
  const view = ACTION_CODE_VIEW[state.lastAction] ?? {
    algorithm: activeAlgorithm,
    method: state.lastTrace?.method ?? DEFAULT_METHODS[activeAlgorithm]
  };
  activeAlgorithm = view.algorithm;
  updateAlgorithmTabs();
  renderCode(view.method, state.lastTrace?.highlights ?? [], state.type);
}

function stopCodePlayback() {
  if (codePlaybackTimer !== null) window.clearTimeout(codePlaybackTimer);
  codePlaybackTimer = null;
  codePlaybackRunId++;
  $$('.code-line.current').forEach(line => {
    line.classList.remove('current');
    line.removeAttribute('aria-current');
  });
  $$('#executionTrace li.current-step').forEach(step => step.classList.remove('current-step'));
  $('#currentLineIndicator').hidden = true;
}

function playCodeExecution(highlightedLines) {
  stopCodePlayback();
  if (sourceViewMode !== 'execution' || highlightedLines.length === 0) return;

  const playbackId = codePlaybackRunId;
  const indicator = $('#currentLineIndicator');
  const traceSteps = $$('#executionTrace li');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay = Math.max(100, Math.floor(480 / Math.max(1, highlightedLines.length - 1)));

  indicator.hidden = false;

  const showLine = index => {
    if (playbackId !== codePlaybackRunId) return;
    highlightedLines.forEach(line => {
      line.classList.remove('current');
      line.removeAttribute('aria-current');
    });
    traceSteps.forEach(step => step.classList.remove('current-step'));

    const line = highlightedLines[index];
    line.classList.add('current');
    line.setAttribute('aria-current', 'step');
    const lineNumber = String(Number(line.dataset.number));
    indicator.textContent = `▶ LINE ${lineNumber}`;
    const traceIndex = highlightedLines.length === 1
      ? traceSteps.length - 1
      : Math.round(index * (traceSteps.length - 1) / (highlightedLines.length - 1));
    if (traceSteps[traceIndex]) traceSteps[traceIndex].classList.add('current-step');

    if (!reduceMotion && index < highlightedLines.length - 1) {
      codePlaybackTimer = window.setTimeout(() => showLine(index + 1), delay);
    }
  };

  showLine(reduceMotion ? highlightedLines.length - 1 : 0);
}

function renderCode(methodName, highlights = [], engineType = selectedEngineType) {
  const codeView = $('#codeView');
  currentCodeSelection = { methodName, highlights, engineType };
  const effectiveMode = sourceViewMode;
  const modeLabels = {
    execution: { context: 'EXECUTION PATH', action: 'VIEW METHOD' },
    method: { context: 'COMPLETE METHOD', action: 'VIEW FILE' },
    file: { context: 'COMPLETE FILE', action: 'VIEW EXECUTION' }
  };
  $('#sourceContextLabel').textContent = effectiveMode === 'execution' && highlights.length === 0
    ? 'ALGORITHM VIEW'
    : modeLabels[effectiveMode].context;
  $('#engineMethod').textContent = effectiveMode === 'file'
    ? ENGINE_METADATA[engineType].fileName
    : `${methodName}()`;
  $('#sourceModeButton').textContent = modeLabels[sourceViewMode].action;
  codeView.classList.toggle('expanded-source', effectiveMode !== 'execution');
  stopCodePlayback();

  if (sourceErrors.has(engineType)) {
    codeView.textContent = sourceErrors.get(engineType);
    return;
  }

  const source = sourceCache.get(engineType);
  if (!source) {
    codeView.textContent = 'Loading real engine source code…';
    return;
  }

  const method = effectiveMode === 'file'
    ? { startLine: 1, lines: source.replace(/\r\n/g, '\n').split('\n') }
    : extractClassMethod(source, methodName);
  if (!method) {
    codeView.textContent = `The ${methodName}() method was not found in the selected engine.`;
    return;
  }

  const displayLines = effectiveMode === 'execution'
    ? selectExecutionLines(method, highlights)
    : method.lines.map((text, index) => ({
      lineNumber: method.startLine + index,
      text: text || ' ',
      omitted: false
    }));
  const fragment = document.createDocumentFragment();
  let firstHighlighted = null;
  const highlightedLines = [];
  displayLines.forEach(({ lineNumber, text, omitted }) => {
    const line = document.createElement('span');
    const isHighlighted = !omitted
      && highlights.some(hint => text.includes(hint))
      && !text.trimStart().startsWith('highlights:');
    line.className = `code-line${isHighlighted ? ' highlight' : ''}${omitted ? ' omitted' : ''}`;
    line.dataset.number = omitted ? '' : String(lineNumber).padStart(3, '0');
    line.textContent = text || ' ';
    if (isHighlighted) {
      firstHighlighted ??= line;
      highlightedLines.push(line);
    }
    fragment.appendChild(line);
  });
  codeView.replaceChildren(fragment);
  playCodeExecution(highlightedLines);

  if (effectiveMode !== 'execution' && firstHighlighted) {
    codeView.scrollTop = Math.max(0, firstHighlighted.offsetTop - codeView.clientHeight / 2);
  } else {
    codeView.scrollTop = 0;
  }
}

function activeEngineSourceId() {
  return selectedEngineType === ENGINE_TYPES.SINGLE_MATRIX
    ? 'single-matrix'
    : 'layered-matrix';
}

function createSourceLibraryNavigation() {
  const navigation = $('#sourceFileList');
  const fragment = document.createDocumentFragment();
  let currentGroup = '';

  for (const file of SOURCE_LIBRARY) {
    if (file.group !== currentGroup) {
      const group = document.createElement('span');
      group.className = 'source-library-group';
      group.textContent = file.group;
      fragment.appendChild(group);
      currentGroup = file.group;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sourceFile = file.id;
    const label = document.createElement('strong');
    label.textContent = file.label;
    const path = document.createElement('small');
    path.textContent = file.path.replace('dist/js/', '');
    button.append(label, path);
    fragment.appendChild(button);
  }

  navigation.replaceChildren(fragment);
}

function loadSyntaxHighlighter() {
  syntaxHighlighterPromise ??= Promise.all([
    import('../vendor/highlight/core.min.js'),
    import('../vendor/highlight/javascript.min.js')
  ]).then(([coreModule, javascriptModule]) => {
    const highlighter = coreModule.default;
    if (!highlighter.getLanguage('javascript')) {
      highlighter.registerLanguage('javascript', javascriptModule.default);
    }
    return highlighter;
  }).catch(error => {
    console.warn('Highlight.js could not load; plain text will be used.', error);
    $('#highlighterBadge').textContent = 'PLAIN TEXT MODE';
    return null;
  });
  return syntaxHighlighterPromise;
}

function sourceFileById(fileId) {
  return SOURCE_LIBRARY.find(file => file.id === fileId) ?? SOURCE_LIBRARY[0];
}

async function fetchExplorerSource(file) {
  if (explorerSourceCache.has(file.id)) return explorerSourceCache.get(file.id);
  const response = await fetch(file.url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const source = await response.text();
  explorerSourceCache.set(file.id, source);
  return source;
}

function focusExplorerMatch(index) {
  explorerRenderedLines.forEach(line => line.classList.remove('active-search-match'));
  if (explorerSearchMatches.length === 0) return;
  explorerSearchIndex = (index + explorerSearchMatches.length) % explorerSearchMatches.length;
  const line = explorerRenderedLines[explorerSearchMatches[explorerSearchIndex]];
  line.classList.add('active-search-match');
  line.scrollIntoView({ block: 'center' });
  $('#sourceSearchStatus').textContent = `${explorerSearchIndex + 1} DE ${explorerSearchMatches.length}`;
}

function applyExplorerSearch() {
  const query = $('#sourceSearchInput').value.trim().toLocaleLowerCase('es');
  explorerRenderedLines.forEach(line => line.classList.remove('search-match', 'active-search-match'));
  explorerSearchMatches = [];
  explorerSearchIndex = -1;

  if (!query) {
    $('#sourceSearchStatus').textContent = 'NO SEARCH';
    return;
  }

  explorerRenderedLines.forEach((line, index) => {
    if (!line.dataset.searchText.includes(query)) return;
    line.classList.add('search-match');
    explorerSearchMatches.push(index);
  });

  if (explorerSearchMatches.length === 0) {
    $('#sourceSearchStatus').textContent = '0 RESULTS';
    return;
  }
  focusExplorerMatch(0);
}

function renderExplorerSource(file, source, highlighter) {
  const codeView = $('#fullCodeView');
  const annotatedLines = buildAnnotatedSourceLines(source, file.notes);
  const engineFileIsActive = file.id === activeEngineSourceId();
  const fragment = document.createDocumentFragment();
  explorerRawSource = source;
  explorerRenderedLines = [];

  for (const sourceLine of annotatedLines) {
    const line = document.createElement('span');
    const number = document.createElement('span');
    const text = document.createElement('span');
    const actualLineNumber = Number(sourceLine.lineNumber);
    line.className = `full-code-line${sourceLine.annotation ? ' teaching-comment' : ''}`;
    line.dataset.searchText = sourceLine.text.toLocaleLowerCase('es');
    number.className = 'full-code-number';
    number.textContent = sourceLine.annotation ? '·' : String(sourceLine.lineNumber).padStart(3, '0');
    text.className = 'full-code-text';

    if (highlighter) {
      text.innerHTML = highlighter.highlight(sourceLine.text, {
        language: 'javascript',
        ignoreIllegals: true
      }).value || ' ';
    } else {
      text.textContent = sourceLine.text || ' ';
    }

    if (engineFileIsActive && explorerExecutionLineNumbers.has(actualLineNumber)) {
      line.classList.add('execution-line');
    }
    if (engineFileIsActive && explorerCurrentLineNumber === actualLineNumber) {
      line.classList.add('execution-current');
      line.setAttribute('aria-current', 'step');
    }

    line.append(number, text);
    fragment.appendChild(line);
    explorerRenderedLines.push(line);
  }

  codeView.replaceChildren(fragment);
  $('#fullSourceGroup').textContent = file.group;
  $('#fullSourcePath').textContent = file.path;
  $('#fullSourceDescription').textContent = file.description;
  $('#fullSourceLineCount').textContent = `${source.replace(/\r\n/g, '\n').split('\n').length} LINES`;
  $('#fullSourceExecutionStatus').textContent = engineFileIsActive
    ? 'CURRENT PATH MARKED'
    : 'SUPPORTING FILE';
  $$('#sourceFileList button').forEach(button => {
    const active = button.dataset.sourceFile === file.id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'true' : 'false');
  });

  applyExplorerSearch();
  const currentLine = codeView.querySelector('.execution-current');
  if (currentLine) requestAnimationFrame(() => currentLine.scrollIntoView({ block: 'center' }));
}

async function selectExplorerSource(fileId) {
  const file = sourceFileById(fileId);
  const requestId = ++explorerRequestId;
  selectedSourceFileId = file.id;
  $('#fullCodeView').textContent = 'Loading source code…';
  $('#fullSourcePath').textContent = file.path;
  $('#fullSourceDescription').textContent = file.description;
  $$('#sourceFileList button').forEach(button => button.classList.toggle('active', button.dataset.sourceFile === file.id));

  try {
    const [source, highlighter] = await Promise.all([
      fetchExplorerSource(file),
      loadSyntaxHighlighter()
    ]);
    if (requestId !== explorerRequestId) return;
    renderExplorerSource(file, source, highlighter);
  } catch (error) {
    if (requestId !== explorerRequestId) return;
    $('#fullCodeView').textContent = `Could not load ${file.path}: ${error.message}`;
    $('#fullSourceLineCount').textContent = 'LOAD ERROR';
  }
}

function openSourceExplorer() {
  if (engine.isRunning) {
    stopTimer();
    engine.emit();
  }

  const highlighted = $$('.code-line.highlight');
  explorerExecutionLineNumbers = new Set(
    highlighted.map(line => Number(line.dataset.number)).filter(Number.isFinite)
  );
  explorerCurrentLineNumber = Number(highlighted.at(-1)?.dataset.number) || null;
  selectedSourceFileId = activeEngineSourceId();
  const dialog = $('#sourceExplorer');
  if (!dialog.open) dialog.showModal();
  $('#sourceSearchInput').value = '';
  void selectExplorerSource(selectedSourceFileId);
}

async function loadEngineSource(state) {
  const engineType = state.type;
  if (sourceCache.has(engineType)) {
    showCodeForAction(state);
    return;
  }

  const requestId = ++sourceRequestId;
  const metadata = ENGINE_METADATA[engineType];
  try {
    const sourceUrl = new URL(`./engines/${metadata.fileName}`, import.meta.url);
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    sourceCache.set(engineType, await response.text());
    sourceErrors.delete(engineType);
    if (requestId === sourceRequestId && engine?.type === engineType) showCodeForAction(engine);
  } catch (error) {
    const message = `Could not load ${metadata.fileName}: ${error.message}. Run npm start and open http://localhost:8080.`;
    sourceErrors.set(engineType, message);
    if (requestId === sourceRequestId) renderCode(state.lastTrace?.method ?? 'spawn', [], engineType);
  }
}

function selectEngine(type) {
  if (type === selectedEngineType) return;
  stopTimer();
  selectedEngineType = type;
  previousLines = 0;
  $$('.engine-option').forEach(button => {
    const active = button.dataset.engine === type;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  engine = createEngine(type, render);
  selectLesson('representation');
  void loadEngineSource(engine);
}

function clearScheduledStep() {
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
}

function scheduleNextStep() {
  clearScheduledStep();
  if (!engine.isRunning || engine.isGameOver) return;
  const delay = Math.max(160, 650 - engine.level * 45);
  timer = window.setTimeout(() => {
    timer = null;
    if (!engine.isRunning || engine.isGameOver) return;
    engine.step();
    if (!engine.isGameOver && engine.isRunning) scheduleNextStep();
  }, delay);
}

function toggleRun() {
  if (engine.isGameOver) {
    clearScheduledStep();
    engine.reset();
  }

  if (engine.isRunning) {
    stopTimer();
  } else {
    engine.isRunning = true;
    scheduleNextStep();
  }
  engine.emit();
}

function stopTimer() {
  clearScheduledStep();
  if (engine) engine.isRunning = false;
}

function updateAlgorithmTabs() {
  $$('.algorithm-tab').forEach(tab => {
    const active = tab.dataset.algorithm === activeAlgorithm;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) $('#codeView').setAttribute('aria-labelledby', tab.id);
  });
}

function selectAlgorithm(name) {
  activeAlgorithm = name;
  updateAlgorithmTabs();
  renderCode(DEFAULT_METHODS[name], [], engine.type);
}

function updateLessonProgress() {
  $$('.lesson').forEach(button => {
    const indicator = button.querySelector('i');
    if (completedLessons.has(button.dataset.lesson)) indicator.textContent = '●';
    else indicator.textContent = button.dataset.lesson === currentLesson ? '◉' : '○';
  });
  $('#progressLabel').textContent = `${completedLessons.size} / 4`;
  $('#progressBar').style.width = `${completedLessons.size * 25}%`;
}

function selectLesson(name) {
  currentLesson = name;
  const lesson = LESSONS[name];
  $$('.lesson').forEach(button => button.classList.toggle('active', button.dataset.lesson === name));
  $('#lessonKicker').textContent = `CONCEPT ${String(lesson.index).padStart(2, '0')}`;
  $('#lessonTitle').textContent = lesson.title;
  $('#lessonDescription').textContent = lesson.description;
  $('#formula').textContent = lesson.formula;
  $('#formulaNote').textContent = lesson.note;
  $('#challengeQuestion').textContent = lesson.question;
  $('#challengeFeedback').textContent = 'Choose an answer to complete this concept.';
  $('#challengeOptions').innerHTML = lesson.answers.map(answer => `<button type="button" data-answer="${answer.correct ? 'correct' : 'wrong'}">${answer.text}</button>`).join('');
  updateLessonProgress();
  selectAlgorithm(lesson.algorithm);
}

function handleGameAction(action) {
  const actions = {
    left: () => engine.move(-1),
    right: () => engine.move(1),
    down: () => engine.step(),
    rotate: () => engine.rotate(),
    drop: () => {
      engine.hardDrop();
      beep(180, 0.06);
    }
  };
  actions[action]?.();
}

function beep(frequency, duration) {
  if (!soundEnabled) return;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioContext ??= new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.045, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

$$('.engine-option').forEach(button => button.addEventListener('click', () => selectEngine(button.dataset.engine)));
$('#toggleButton').addEventListener('click', toggleRun);
$('#stepButton').addEventListener('click', () => {
  if (engine.isRunning) stopTimer();
  engine.step();
});
$('#resetButton').addEventListener('click', () => {
  stopTimer();
  previousLines = 0;
  engine.reset();
});
$('#soundButton').addEventListener('click', event => {
  const on = event.currentTarget.getAttribute('aria-pressed') === 'true';
  event.currentTarget.setAttribute('aria-pressed', String(!on));
  event.currentTarget.textContent = `SOUND: ${on ? 'OFF' : 'ON'}`;
  soundEnabled = !on;
  if (soundEnabled) beep(440, 0.08);
});
$('#sourceModeButton').addEventListener('click', () => {
  const nextMode = { execution: 'method', method: 'file', file: 'execution' };
  sourceViewMode = nextMode[sourceViewMode];
  renderCode(
    currentCodeSelection.methodName,
    currentCodeSelection.highlights,
    currentCodeSelection.engineType
  );
});
$('#openSourceExplorerButton').addEventListener('click', openSourceExplorer);
$('#closeSourceExplorerButton').addEventListener('click', () => $('#sourceExplorer').close());
$('#sourceExplorer').addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
$('#sourceFileList').addEventListener('click', event => {
  const button = event.target.closest('[data-source-file]');
  if (button) void selectExplorerSource(button.dataset.sourceFile);
});
$('#sourceSearchInput').addEventListener('input', applyExplorerSearch);
$('#sourceSearchInput').addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  focusExplorerMatch(explorerSearchIndex + 1);
});
$('#nextSourceMatchButton').addEventListener('click', () => focusExplorerMatch(explorerSearchIndex + 1));
$('#copySourceButton').addEventListener('click', async event => {
  try {
    await navigator.clipboard.writeText(explorerRawSource);
    event.currentTarget.textContent = 'CODE COPIED';
  } catch {
    event.currentTarget.textContent = 'COPY FAILED';
  }
  window.setTimeout(() => { event.currentTarget.textContent = 'COPY CODE'; }, 1400);
});
$$('.piece-controls [data-game-action]').forEach(button => {
  button.addEventListener('click', () => handleGameAction(button.dataset.gameAction));
});
$$('.lesson').forEach(button => button.addEventListener('click', () => selectLesson(button.dataset.lesson)));
$$('.algorithm-tab').forEach(button => {
  button.addEventListener('click', () => selectAlgorithm(button.dataset.algorithm));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const tabs = $$('.algorithm-tab');
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (tabs.indexOf(button) + direction + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  });
});
$('#challengeOptions').addEventListener('click', event => {
  const answer = event.target.closest('button');
  if (!answer) return;
  $$('#challengeOptions button').forEach(button => button.classList.remove('correct', 'wrong'));
  answer.classList.add(answer.dataset.answer);
  if (answer.dataset.answer === 'correct') {
    completedLessons.add(currentLesson);
    updateLessonProgress();
    $('#challengeFeedback').textContent = 'Correct. Concept completed.';
  } else {
    $('#challengeFeedback').textContent = 'Almost. Inspect the state, run an operation, and try again.';
  }
});

document.addEventListener('keydown', event => {
  if ($('#sourceExplorer').open) return;
  if (event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
  const key = event.key.toLowerCase();
  const actions = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowUp: 'rotate',
    x: 'rotate',
    ' ': 'drop'
  };
  const action = actions[event.key] ?? actions[key];
  if (action) {
    event.preventDefault();
    handleGameAction(action);
  } else if (key === 'p') {
    event.preventDefault();
    toggleRun();
  }
});

createSourceLibraryNavigation();
selectLesson('representation');
render(engine);

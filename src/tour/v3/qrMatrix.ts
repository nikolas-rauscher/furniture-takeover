/**
 * A QR code for a short link: byte mode, error correction level M, versions 1 to 10
 * (ISO/IEC 18004). Returns the modules as rows of booleans, dark = true, without the
 * quiet zone.
 */

type Version = {
  /** Error correction codewords per block. */
  ecc: number;
  /** Data codewords of each block, in order. */
  blocks: readonly number[];
  /** Centres of the alignment patterns along each axis. */
  align: readonly number[];
};

const VERSIONS: readonly Version[] = [
  { ecc: 10, blocks: [16], align: [] },
  { ecc: 16, blocks: [28], align: [6, 18] },
  { ecc: 26, blocks: [44], align: [6, 22] },
  { ecc: 18, blocks: [32, 32], align: [6, 26] },
  { ecc: 24, blocks: [43, 43], align: [6, 30] },
  { ecc: 16, blocks: [27, 27, 27, 27], align: [6, 34] },
  { ecc: 18, blocks: [31, 31, 31, 31], align: [6, 22, 38] },
  { ecc: 22, blocks: [38, 38, 39, 39], align: [6, 24, 42] },
  { ecc: 22, blocks: [36, 36, 36, 37, 37], align: [6, 26, 46] },
  { ecc: 26, blocks: [43, 43, 43, 43, 44], align: [6, 28, 50] },
];

/** Level M in the format information. */
const LEVEL_M = 0b00;

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);
const bit = (value: number, index: number) => ((value >>> index) & 1) === 1;

function gfMultiply(x: number, y: number) {
  let product = 0;
  for (let index = 7; index >= 0; index -= 1) {
    product = (product << 1) ^ ((product >>> 7) * 0x11d);
    product ^= ((y >>> index) & 1) * x;
  }
  return product;
}

function rsDivisor(degree: number) {
  const divisor = new Array<number>(degree).fill(0);
  divisor[degree - 1] = 1;
  let root = 1;
  for (let round = 0; round < degree; round += 1) {
    for (let index = 0; index < degree; index += 1) {
      divisor[index] = gfMultiply(divisor[index], root);
      if (index + 1 < degree) divisor[index] ^= divisor[index + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return divisor;
}

function rsRemainder(data: readonly number[], divisor: readonly number[]) {
  const remainder = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (remainder.shift() ?? 0);
    remainder.push(0);
    divisor.forEach((coefficient, index) => {
      remainder[index] ^= gfMultiply(coefficient, factor);
    });
  }
  return remainder;
}

function chooseVersion(length: number) {
  const index = VERSIONS.findIndex((version, at) => {
    const countBits = at + 1 < 10 ? 8 : 16;
    return 4 + countBits + length * 8 <= sum(version.blocks) * 8;
  });
  if (index === -1)
    throw new Error(`A link of ${length} bytes is too long for this QR code.`);
  return index + 1;
}

/** Mode, length, the bytes, terminator and padding, as data codewords. */
function dataCodewords(bytes: Uint8Array, version: number) {
  const capacity = sum(VERSIONS[version - 1].blocks);
  const bits: boolean[] = [];
  const push = (value: number, length: number) => {
    for (let index = length - 1; index >= 0; index -= 1)
      bits.push(bit(value, index));
  };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((byte) => push(byte, 8));
  push(0, Math.min(4, capacity * 8 - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  const codewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8)
    codewords.push(
      bits
        .slice(index, index + 8)
        .reduce((byte, on) => (byte << 1) | (on ? 1 : 0), 0),
    );
  for (let pad = 0; codewords.length < capacity; pad += 1)
    codewords.push(pad % 2 === 0 ? 0xec : 0x11);
  return codewords;
}

/** Splits into blocks, adds error correction and interleaves, as the standard orders it. */
function finalCodewords(data: readonly number[], version: number) {
  const { ecc, blocks } = VERSIONS[version - 1];
  const divisor = rsDivisor(ecc);
  let offset = 0;
  const dataBlocks = blocks.map((length) => {
    const block = data.slice(offset, offset + length);
    offset += length;
    return block;
  });
  const eccBlocks = dataBlocks.map((block) => rsRemainder(block, divisor));
  const result: number[] = [];
  const longest = Math.max(...blocks);
  for (let index = 0; index < longest; index += 1)
    dataBlocks.forEach((block) => {
      if (index < block.length) result.push(block[index]);
    });
  for (let index = 0; index < ecc; index += 1)
    eccBlocks.forEach((block) => result.push(block[index]));
  return result;
}

type Grid = {
  size: number;
  modules: boolean[][];
  /** Function patterns and format areas, which data and masks leave alone. */
  reserved: boolean[][];
  set: (row: number, column: number, dark: boolean) => void;
};

function createGrid(size: number): Grid {
  const square = () =>
    Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const modules = square();
  const reserved = square();
  return {
    size,
    modules,
    reserved,
    set(row, column, dark) {
      modules[row][column] = dark;
      reserved[row][column] = true;
    },
  };
}

function drawFinder(grid: Grid, row: number, column: number) {
  for (let dy = -4; dy <= 4; dy += 1)
    for (let dx = -4; dx <= 4; dx += 1) {
      const y = row + dy;
      const x = column + dx;
      if (y < 0 || x < 0 || y >= grid.size || x >= grid.size) continue;
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      grid.set(y, x, ring !== 2 && ring !== 4);
    }
}

function drawAlignment(grid: Grid, row: number, column: number) {
  for (let dy = -2; dy <= 2; dy += 1)
    for (let dx = -2; dx <= 2; dx += 1)
      grid.set(
        row + dy,
        column + dx,
        Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
      );
}

function formatBits(mask: number) {
  const data = (LEVEL_M << 3) | mask;
  let remainder = data;
  for (let index = 0; index < 10; index += 1)
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  return ((data << 10) | remainder) ^ 0x5412;
}

function drawFormat(grid: Grid, mask: number) {
  const bits = formatBits(mask);
  const { size } = grid;
  for (let index = 0; index <= 5; index += 1)
    grid.set(index, 8, bit(bits, index));
  grid.set(7, 8, bit(bits, 6));
  grid.set(8, 8, bit(bits, 7));
  grid.set(8, 7, bit(bits, 8));
  for (let index = 9; index < 15; index += 1)
    grid.set(8, 14 - index, bit(bits, index));
  for (let index = 0; index < 8; index += 1)
    grid.set(8, size - 1 - index, bit(bits, index));
  for (let index = 8; index < 15; index += 1)
    grid.set(size - 15 + index, 8, bit(bits, index));
  grid.set(size - 8, 8, true);
}

function drawVersion(grid: Grid, version: number) {
  if (version < 7) return;
  let remainder = version;
  for (let index = 0; index < 12; index += 1)
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  const bits = (version << 12) | remainder;
  for (let index = 0; index < 18; index += 1) {
    const a = grid.size - 11 + (index % 3);
    const b = Math.floor(index / 3);
    grid.set(b, a, bit(bits, index));
    grid.set(a, b, bit(bits, index));
  }
}

function drawFunctionPatterns(grid: Grid, version: number) {
  const { size } = grid;
  for (let index = 0; index < size; index += 1) {
    grid.set(6, index, index % 2 === 0);
    grid.set(index, 6, index % 2 === 0);
  }
  drawFinder(grid, 3, 3);
  drawFinder(grid, 3, size - 4);
  drawFinder(grid, size - 4, 3);
  const { align } = VERSIONS[version - 1];
  const last = align.length - 1;
  align.forEach((row, i) =>
    align.forEach((column, j) => {
      const onFinder =
        (i === 0 && j === 0) ||
        (i === 0 && j === last) ||
        (i === last && j === 0);
      if (!onFinder) drawAlignment(grid, row, column);
    }),
  );
  drawFormat(grid, 0);
  drawVersion(grid, version);
}

function drawData(grid: Grid, codewords: readonly number[]) {
  const { size } = grid;
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vertical = 0; vertical < size; vertical += 1)
      for (let offset = 0; offset < 2; offset += 1) {
        const column = right - offset;
        const row = upward ? size - 1 - vertical : vertical;
        if (grid.reserved[row][column] || index >= codewords.length * 8)
          continue;
        grid.modules[row][column] = bit(
          codewords[index >>> 3],
          7 - (index & 7),
        );
        index += 1;
      }
  }
}

const MASKS: readonly ((row: number, column: number) => boolean)[] = [
  (y, x) => (x + y) % 2 === 0,
  (y) => y % 2 === 0,
  (_y, x) => x % 3 === 0,
  (y, x) => (x + y) % 3 === 0,
  (y, x) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (y, x) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (y, x) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (y, x) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(grid: Grid, mask: number) {
  for (let row = 0; row < grid.size; row += 1)
    for (let column = 0; column < grid.size; column += 1)
      if (!grid.reserved[row][column] && MASKS[mask](row, column))
        grid.modules[row][column] = !grid.modules[row][column];
}

/** Runs of five or more alike, and finder-like patterns, along one line. */
function linePenalty(line: readonly boolean[]) {
  let penalty = 0;
  let run = 1;
  for (let index = 1; index <= line.length; index += 1) {
    if (index < line.length && line[index] === line[index - 1]) run += 1;
    else {
      if (run >= 5) penalty += run - 2;
      run = 1;
    }
  }
  const text = line.map((dark) => (dark ? "1" : "0")).join("");
  for (const pattern of ["10111010000", "00001011101"])
    for (
      let at = text.indexOf(pattern);
      at !== -1;
      at = text.indexOf(pattern, at + 1)
    )
      penalty += 40;
  return penalty;
}

function penalty(modules: readonly boolean[][]) {
  const size = modules.length;
  let score = 0;
  for (let index = 0; index < size; index += 1) {
    score += linePenalty(modules[index]);
    score += linePenalty(modules.map((row) => row[index]));
  }
  for (let row = 0; row + 1 < size; row += 1)
    for (let column = 0; column + 1 < size; column += 1) {
      const dark = modules[row][column];
      if (
        modules[row][column + 1] === dark &&
        modules[row + 1][column] === dark &&
        modules[row + 1][column + 1] === dark
      )
        score += 3;
    }
  const darkCount = sum(modules.map((row) => row.filter(Boolean).length));
  const percent = (darkCount * 100) / (size * size);
  return score + 10 * Math.floor(Math.abs(percent - 50) / 5);
}

function build(codewords: readonly number[], version: number, mask: number) {
  const grid = createGrid(17 + version * 4);
  drawFunctionPatterns(grid, version);
  drawData(grid, codewords);
  applyMask(grid, mask);
  drawFormat(grid, mask);
  return grid.modules;
}

export function qrModules(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length);
  const codewords = finalCodewords(dataCodewords(bytes, version), version);
  const candidates = MASKS.map((_, mask) => build(codewords, version, mask));
  const scores = candidates.map(penalty);
  return candidates[scores.indexOf(Math.min(...scores))];
}

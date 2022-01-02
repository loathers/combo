import {
  abort,
  cliExecute,
  fileToBuffer,
  gamedayToInt,
  handlingChoice,
  myId,
  runChoice,
} from "kolmafia";
import { get, property, set } from "libram";

type BeachTile = { minute: number; row: number; column: number };

const rareTiles: BeachTile[] = JSON.parse(fileToBuffer("raretiles.json"));

function _comb(tile: BeachTile): void {
  const { minute, row, column } = tile;
  cliExecute(`beach wander ${minute};`);
  const layout = new Map<number, string[]>(
    property
      .getString("_beachLayout")
      .split(",")
      .map((element) => element.split(":"))
      .map((rowLayout) => [parseInt(rowLayout[0]), rowLayout[1].split("")] as [number, string[]])
  );

  const whaleRow = Array.from(layout.entries()).find((rowLayout) => rowLayout[1].includes("W"));
  if (whaleRow) {
    const column = whaleRow[1].find((x) => x === "W");
    cliExecute(`beach comb ${whaleRow} ${column}`);
    return;
  }

  const rareRow = layout.get(row);
  if (rareRow) {
    if (rareRow[column] !== "c") cliExecute(`beach comb ${row} ${column}`);
  }

  const firstTwinkleRow = Array.from(layout.entries()).find((rowLayout) =>
    rowLayout[1].includes("t")
  );
  if (firstTwinkleRow) {
    const column = firstTwinkleRow[1].find((x) => x === "t");
    cliExecute(`beach comb ${firstTwinkleRow} ${column}`);
    return;
  }

  cliExecute(`beach comb ${row} ${column}`);
}

let seed = parseInt(myId());
function deterministicRandom(): number {
  seed++;
  return Math.sin(seed);
}

function deterministicShuffle<T>(array: T[]): T[] {
  const returnValue: T[] = [];
  while (array.length > 0) {
    const index = Math.floor(deterministicRandom() * array.length);
    returnValue.push(...array.splice(index));
  }
  return returnValue;
}

let shuffledArray: BeachTile[];

function getShuffledArray(): BeachTile[] {
  if (!shuffledArray) {
    shuffledArray = deterministicShuffle(rareTiles);
  }
  return shuffledArray;
}

function comb(): boolean {
  const tileList = getShuffledArray();
  const index = (get("combo_lastTileCombed", 0) + 1) % tileList.length;
  const tile = tileList[index];
  const dayOfMonth = 1 + (gamedayToInt() % 8);
  const rowsHidden = 4 - Math.abs(4 - dayOfMonth);
  const shouldComb = tile.row > rowsHidden;
  if (shouldComb) _comb(tile);
  set("combo_lastTileCombed", index);
  return shouldComb;
}

export function main(args: string | number): void {
  const combs = typeof args === "string" ? parseInt(args) : args;
  if (combs < 0 || Math.floor(combs) !== combs) abort("Invalid argument!");

  let n = 1;
  while (n <= combs) {
    if (comb()) n++;
  }
  if (handlingChoice()) runChoice(5);
}

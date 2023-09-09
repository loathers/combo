import {
  abort,
  cliExecute,
  fileToBuffer,
  gamedayToInt,
  handlingChoice,
  historicalPrice,
  isDarkMode,
  Item,
  myId,
  print,
  runChoice,
} from "kolmafia";
import { get, property, Session, set, sinceKolmafiaRevision } from "libram";

// Gotta print in a legible colour.
const HIGHLIGHT = isDarkMode() ? "yellow" : "blue";

type BeachTile = { minute: number; row: number; column: number };

// This is too big a data set to cram into a file
// JSON or "JavaScript Object Notation" is a way of storing JS objects in strings
// fileToBuffer is a mafia ASH function that reads .txt files into a "buffer"
// JS doesn't have buffers, so this is coered into a string
// We assert that rareTiles will be an array of BeachTiles, because this script doesn't otherwise know.
// If we didn't make this assertion, a lot of things would explode.
// Unfortunately, this can mean some bad things could happen were our data file to get messed up
const rareTiles: BeachTile[] = JSON.parse(fileToBuffer("raretiles.json"));

// We precede the function name with an underscore to show that it's not a front, user-facing function
// In this script, really only main is, but we may port this code into libram at some point
// We'd want to export the comb function, but not _comb
function _comb(tile: BeachTile): void {
  // Here, we destructure the BeachTile object into three separate variables
  // It's going to be really tedious to write tile.minute and tile.row all the time
  // So this is nice looking
  const { minute, row, column } = tile;
  cliExecute(`beach wander ${minute};`);

  // Mafia's _beachLayout property generates strings that look like
  // 4:rrrrrrrrrr,5:rrrrrrrrrr,6:rrcrrrrrcr,7:crrrrrrrrr,8:rrrrrrrrrr,9:rrrrrrrrrr,10:rrrrrrcrrr
  // We start by turning this into a multidimensional array, and then parse it as a map
  // We use maps because we want to be able to "look up" a row using its index
  const layout = new Map<number, string[]>(
    property
      .getString("_beachLayout")
      .split(",")
      .map((element) => element.split(":"))
      // While you and I both know, looking at the property, that every element at this point will look like [3, ["r","r","r","r","r","r","r","r","r","r"]]
      // TypeScript doesn't know that! the "as" called a "Type Assertion", which is exactly what it sounds like
      // This way, our compiler and our IDE don't start shouting at us for things that we, the reader, know are fine.
      .map((rowLayout) => [parseInt(rowLayout[0]), rowLayout[1].split("")] as [number, string[]])
  );

  // the Array.find() method returnns either an element of the array that fits, or undefined
  // We convert our Map to an Array here to use the .find() method
  // We check for a whale here just because wouldn't it be neat if we had a whale?
  const whaleRow = Array.from(layout.entries()).find((rowLayout) => rowLayout[1].includes("W"));
  if (whaleRow) {
    // Mafia inexplicably indexes columns starting at 0, and rows starting at 1
    // This is beneficial to us! Arrays are indexed starting at 1, so .findIndex() gets us just what we want
    const whaleColumn = whaleRow[1].findIndex((x) => x === "W");
    print("We found a whale. To hey deze's heart, we'll stab at it.", "red");
    cliExecute(`beach comb ${whaleRow[0]} ${whaleColumn}`);
    // By returning partway through, we avoid needing to use "else"
    // With the exception of try...finally shenanigans, using the return keyword will just immediately terminate the function
    return;
  }

  const rareRow = layout.get(row);
  if (rareRow) {
    // Here we make sure that the tile we were going to comb wasn't already combed
    if (rareRow[column] !== "c") {
      print("Our rare tile is uncombed, so let's go ahead and change that.", "red");
      cliExecute(`beach comb ${row} ${column}`);
      return;
    }
  }

  const firstTwinkleRow = Array.from(layout.entries()).find((rowLayout) =>
    rowLayout[1].includes("t")
  );
  if (firstTwinkleRow) {
    print("Our rare tile is combed, but we found a twinkle!", HIGHLIGHT);
    const twinkleColumn = firstTwinkleRow[1].findIndex((x) => x === "t");
    cliExecute(`beach comb ${firstTwinkleRow[0]} ${twinkleColumn}`);
    return;
  }

  const firstRoughRow = Array.from(layout.entries()).find((rowLayout) =>
    rowLayout[1].includes("r")
  );
  if (firstRoughRow) {
    print(
      "Our rare tile is combed, but we found some rough sand. So I guess there's that.",
      HIGHLIGHT
    );
    const roughcolumn = firstRoughRow[1].findIndex((x) => x === "r");
    cliExecute(`beach comb ${firstRoughRow[0]} ${roughcolumn}`);
    return;
  }

  print("We've exhausted all other options, so we're combing an already-combed tile.", HIGHLIGHT);
  cliExecute(`beach comb ${row} ${column}`);
}

// Alright now this is pretty cool
// We need a way to shuffle the array deterministically--we want it to have the same order for every player every time
// Obviously what that means is that we seed it by player id.
// Have you ever shoved an integer into the sine function? It's nasty
// This isn't super duper random. But it's random enough!
let seed = parseInt(myId());
function deterministicRandom(): number {
  seed++;
  return Math.sin(seed);
}

// Here, we disassemble the old array while constructing a new one.
// We pull a random card from the deck, put it on top of the new stack.
// Repeat ad infinitum
// If this was a more rigorous script, maybe we'd want to copy the input array so we don't destroy it
// For this script, meh
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

// This comb function returns a boolean value based on whether we actually end up coming
// We predict whether the tile in question will be hidden by the tides, and if it will, we just don't go!
function comb(): boolean {
  const tileList = getShuffledArray();
  const index = (get("combo_lastTileCombed", 0) + 1) % tileList.length;
  const tile = tileList[index];

  // This little bit of tech comes from SSBBHax
  // The tides are on an 8-day cycle
  // We have 8-day months on the in-game calendar
  // Turns out to work out nicely!
  const dayOfMonth = 1 + (gamedayToInt() % 8);
  const rowsHidden = 4 - Math.abs(4 - dayOfMonth);
  const shouldComb = tile.row > rowsHidden;

  if (shouldComb) _comb(tile);

  // We increment our lastTileCombed regardless of whether we actually comb it
  // This isn't best beheavior, but it isn't worst!
  set("combo_lastTileCombed", index);
  return shouldComb;
}

function printSession(session: Session) {
  const items: [Item, number][] = [...session.items];

  // Sorts the items to be printed from most profitable, to least
  items.sort(([item1, amount1], [item2, amount2]) => {
    return historicalPrice(item2) * amount2 - historicalPrice(item1) * amount1;
  });

  print(`-Found ${session.meat} meat`);
  for (const [item, quantity] of items) {
    print(`-Found ${quantity} ${item}`);
  }
}

// When called from the CLI, this will only ever have string inputs
// We use string | number so that people can call this directly from other scripts, should they so desire
// Realistically, everyone will do the CLI option. But it costs us nothing!
export function main(args?: string | number): void {
  // Sometimes people try to run things with insanely old mafia versions and run into problems
  // Think of this as babyproofing
  sinceKolmafiaRevision(26118);

  if (args === "lifetime") {
    const lifetime = Session.fromFile("combo_results.json");
    print("===LIFETIME RESULTS ===");
    printSession(lifetime);
    return;
  }

  // Use a wrapper around session tracking to record our results
  // We do this by first tracking what the session results are right now
  // Later, we will subtract these items and meat from our final results
  const baseline = Session.current();

  // Here we collapse our two possibilities into one
  // If args is already a number, combs is a number
  // If args is a string, we convert it to a number
  const combs = typeof args === "string" ? parseInt(args) : args ?? 11 - get("_freeBeachWalksUsed");
  if (!Number.isInteger(combs) || isNaN(combs)) abort("Invalid argument!");
  if (combs <= 0) return;
  const oldFilter = get("logPreferenceChangeFilter");
  set(
    "logPreferenceChangeFilter",
    [
      ...new Set([
        ...oldFilter.split(","),
        "spadingData",
        "combo_lastTileCombed",
        "_beachLayout",
        "_beachMinutes",
        "_beachCombing",
      ]),
    ]
      .filter((x) => x)
      .join(",")
  );
  let n = 1;
  while (n <= combs) {
    // Comb returns a boolean based on whether we actually comb the tile
    if (comb()) n++;
  }

  // We have to escape the beach combat choice at the end of the session
  // So we do
  if (handlingChoice()) runChoice(5);
  if (get("spadingScript").toLowerCase().includes("excavator")) cliExecute("spade autoconfirm");
  set("logPreferenceChangeFilter", oldFilter);

  // Subtract the original session from our current session
  // the resulting session will only have what we found during combo
  const final = Session.current().diff(baseline);
  print("=== RESULTS ===");
  printSession(final);

  const lifetime = Session.add(final, Session.fromFile("combo_results.json"));
  lifetime.toFile("combo_results.json");
}

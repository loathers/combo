# Combo

## Introduction

Combo is an automated [beach combing](https://kol.coldfront.net/thekolwiki/index.php/Comb_the_Beach) script that harvests known rare tiles. The position of said tiles never changes, and Combo features a list of over 800 known locations. 

## Setup

To install the script, use the following command in the KoLMafia CLI.
```text
git checkout https://github.com/loathers/combo.git release
```

## Usage

To run the script, call `combo N` in the KoLMafia CLI, where `N` is the number of combs you wish to perform. Combo does not differentiate between free and non-free combs, so call `combo 11` to do your free daily combs.

## NEW PROJECT: Finding New Tiles!

There is an active community effort attemptng to find the remaining ~200 or so that Combo doesn't know about. Veracity, a KoLMafia dev, has been working on a BeachComber script with spading functionality to help serve this purpose. Veracity's script is located [here](https://kolmafia.us/threads/beachcomber-fast-and-efficient-beach-combing.23993/). In order to assist with spading the beach, a user would install Veracity's script as described in the Kolmafia.us thread and then runs either `BeachComber free spade` or `BeachComber NNN spade`, putting a number in for NNN defining how many turns you'd like to throw at the spading effort. Big thanks to Veracity; we are looking forward to having all the rare tiles around at some point! (Note: BeachComber also contains all of Combo's tiles; to replicate Combo behavior, you can run it with `BeachComber free rare` in order to have BeachComber simply search for rares, without actively spading new tiles.)  

## Details

### Rare tile data

The list of rare tiles used by combo can be accessed [here](mafia/data/raretiles.json). The formatting adheres to Mafia's internal beach formatting - the rows are 1-indexed, the columns are 0-indexed; the bottom left tile is 1,0 while the top right tile is 10,9.

### How does combo work?

In order to avoid having all users combing the same tiles in sequence, whenever combo is called, it shuffles the order of the rare tiles using your user ID as a seed. This way, you obtain a rare tile order unique to you, which will persist until the data is updated. Combo then proceeds to go over these tiles in sequence, skipping any inaccessible submerged ones, and stores how far it got into `combo_lastTileCombed`. This way, next time you call combo it can pick up where it left.

### Frequently Asked Questions

> COMBO printed out "Our rare tile is combed, but we found a twinkle!" -- what does that mean?

This text means that the scarce beach comb tile that COMBO was targeting has already been combed, so instead of taking the already-combed tile (which will always generate common items) it has found a "twinkly" spot. Twinkly spots mean you get uncommon items instead of the common ones, so COMBO snagged those instead!

### Credits

Thank you so much to the following players who have provided data for this script:  
- Tadpoleloop 
- SSBBHax 
- DanceCommander6
- Disco Stew  
- Grushvak  
- Veracity
- The Dictator
- Playultm8

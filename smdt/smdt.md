# Swedish Musical Discrimination Test

A *bad* implementation of the Swedish Musical Discrimination Test.

The test has 3 parts:

## Melody
We play a series of tones from C4-B5, and then play it again with 1 note changed, and the user must identify the changed tone.

## Rhythm
We play a 500Hz tone with a specific rhythm, i.e. each tone is played on an interval of a 150/300/450/600ms interval with 5-7 tones.
We play the same rhythm again, possibly with modifications: e.g. one note was moved in time or a different starting point is used.

Note, 7/18 tests (maybe I'll do 9?) would be the same.

## Pitch
The user has to distinguish between a 500Hz and a 500+(1,2,3,4,5,8,12,17)Hz tone.

## Some Notes
Melody and Rhythm tests are supposed to have 36 tests and then they use a restricted set of 18
that more closely aligns with the overall test score (i.e. removes outliers of extremely hard or easy tests).

However, we don't have the ability to do that, so we'll just randomly throw them at you.

# Links
- See https://www.sciencedirect.com/science/article/pii/S0191886914000841

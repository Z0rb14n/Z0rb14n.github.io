addEventListener('keydown', onKeyPressForTesting);

function onKeyPressForTesting(e) {
    if (e.key === "c") playRandomMelody();
}

async function playRandomMelody() {
    const melody = MelodyTest.generateRandomMelody(9);
    await melodyTest.playMelody(melody);
}

function testABunchOfRandomMelodies(numMelodies, len) {
    let successful = 0;
    for (let i = 0; i < numMelodies; i++) {
        const melody = MelodyTest.generateRandomMelody(len);
        if (MelodyTest.isValidMelody(melody)) {
            successful++;
        }
    }
    console.log(`Length ${len}, ${successful}/${numMelodies} tried, ${successful/numMelodies} success rate`);
    // len 4: 19502/100000 tried, 0.19502 success rate
    // len 5: 43497/100000 tried, 0.43497 success rate
    // len 6: 67088/100000 tried, 0.67088 success rate
    // len 7: 83523/100000 tried, 0.83523 success rate
    // len 8: 92704/100000 tried, 0.92704 success rate
    // len 9: 97130/100000 tried, 0.9713 success rate
}

console.assert(!MelodyTest.isValidMelody([0,0,1,2,3,4,5,6,7,8,9,10,11])); // duplicate note
console.assert(!MelodyTest.isValidMelody([0,2,4,5,7,9,11])); // same scale (C major)
console.assert(!MelodyTest.isValidMelody([0,13,2,3,4,5,6,7,8,9,10,11])); // intervals must be smaller than one octave

for (let i = 4; i <= 9; i++) testABunchOfRandomMelodies(1000, i);

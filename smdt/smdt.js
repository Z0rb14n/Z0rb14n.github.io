const audioContext = new AudioContext();
const volumeControl = document.querySelector("input[name='volume']");
/**
 * @type {OscillatorNode}
 */
let activeOscillator = null;

/**
 * @type {GainNode}
 */
let mainGainNode = null;
/**
 * @type {GainNode}
 */
let subGainNode = null;

function changeVolume(_) {
    mainGainNode.gain.value = volumeControl.value;
}

function onKeyPress(e) {
    if (pitchTestOnKeyPress(e)) return;
    if (e.key === "c") playRandomMelody();
}

function setup() {
    volumeControl.addEventListener("change", changeVolume);

    mainGainNode = audioContext.createGain();
    mainGainNode.connect(audioContext.destination);
    mainGainNode.gain.value = volumeControl.value;
    subGainNode = audioContext.createGain();
    subGainNode.connect(mainGainNode);
    subGainNode.gain.value = 1;
    initMelodyTest();
    initPitchTest();
    addEventListener('keydown', onKeyPress);
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

//#region tone playing util

function playTone(freq) {
    if (activeOscillator !== null) {
        console.warn("existing tone is already playing!");
        stopTone();
    }
    const osc = audioContext.createOscillator();
    osc.connect(subGainNode);
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.start();
    activeOscillator = osc;
}

async function playToneWithRamp(freq, durationMs, rampUpMs, rampDownMs) {
    if (rampUpMs > 0) {
        subGainNode.gain.value = 0;
        playTone(freq);
        subGainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + rampUpMs / 1000);
        await delay(rampUpMs + durationMs);
    } else {
        subGainNode.gain.value = 1;
        playTone(freq);
        await delay(durationMs);
    }
    if (rampDownMs > 0) {
        subGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampDownMs / 1000);
        await delay(rampDownMs);
    }
    stopTone();
}

function stopTone() {
    if (activeOscillator) activeOscillator.stop();
    activeOscillator = null;
}

//#endregion

//#region melody test
const melodyTestLengths = [4, 5, 6, 7, 8, 9];
const melodyTestCounts = [3, 3, 3, 3, 3, 3];
const melodyTestToneIntervalMs = 650;
// they don't actually say how long the duration is, we just give them one
const melodyTestToneDurationMs = melodyTestToneIntervalMs;
const melodyTestTimeBetweenStimuliMs = 1300;

const noteFreq = {
    C4: 261.6256,
    "C#4": 277.1826,
    D4: 293.6648,
    "D#4": 311.1270,
    E4: 329.6276,
    F4: 349.2282,
    "F#4": 369.9944,
    G4: 391.9954,
    "G#4": 415.3047,
    A4: 440.0000,
    "A#4": 466.1638,
    B4: 493.8833,
    C5: 261.6256 * 2,
    "C#5": 277.1826 * 2,
    D5: 293.6648 * 2,
    "D#5": 311.1270 * 2,
    E5: 329.6276 * 2,
    F5: 349.2282 * 2,
    "F#5": 369.9944 * 2,
    G5: 391.9954 * 2,
    "G#5": 415.3047 * 2,
    A5: 440.0000 * 2,
    "A#5": 466.1638 * 2,
    B5: 493.8833 * 2,
};

/**
 * @type {number[]}
 */
const semitonesAboveC4Freq = Object.values(noteFreq);

const semitonesAboveC = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
}

const octaveSemitones = 12;

/**
 * @type {Set[]}
 */
const noteScaleLookup = new Array(12);

/**
 * @param {number[]} array
 * @returns {number[]}
 */
function simplePrefixSum(array) {
    /**
     * @type {number[]}
     */
    const retVal = new Array(array.length+1);
    retVal[0] = 0;
    for (let i = 0; i < array.length; i++) {
        retVal[i+1] = array[i]+retVal[i];
    }
    return retVal;
}
const majorScale = [2, 2, 1, 2, 2, 2, 1];
const majorScalePrefixSum = simplePrefixSum(majorScale);
const naturalMinorScale = [2, 1, 2, 2, 1, 2, 2];
const naturalMinorScalePrefixSum = simplePrefixSum(naturalMinorScale);
const harmonicMinorScale = [2, 1, 2, 2, 1, 3, 1];
const harmonicMinorScalePrefixSum = simplePrefixSum(harmonicMinorScale);
const melodicMinorAscendingScale = [2, 1, 2, 2, 2, 2, 1];
const melodicMinorAscendingScalePrefixSum = simplePrefixSum(melodicMinorAscendingScale);

/**
 * @param {number[]} stimulus
 */
function isValidMelody(stimulus) {
    // (i) each pitch occurred only once
    if (new Set(stimulus).size !== stimulus.length) return false;
    // (ii) not all pitches in the sequence belonged to the same tonal (i.e., major, ascending minor, descending minor, or harmonic minor) scale
    let scaleSet = noteScaleLookup[(stimulus[0] % 12)];
    for (let i = 1; i < stimulus.length; i++) {
        scaleSet = scaleSet.intersection(noteScaleLookup[(stimulus[i] % 12)]);
    }
    if (scaleSet.size > 0) return false;
    let prevNote = stimulus[0];
    for (let i = 1; i < stimulus.length; i++) {
        let currNote = stimulus[i];
        // (iii) all intervals between consecutive tones were smaller than one octave
        if (Math.abs(currNote - prevNote) >= octaveSemitones) return false;
        prevNote = currNote;
    }
    return true;
}

/**
 * @param {number} len
 * @returns {number[]}
 */
function generateRandomMelody(len) {
    /**
     * @type {number[]}
     */
    let retVal = new Array(len);
    const globalMax = semitonesAboveC4Freq.length;
    /**
     * @type {Set<number>}
     */
    const used = new Set();
    retVal[0] = Math.floor(Math.random()*globalMax);
    used.add(retVal[0]);
    for (let i = 1; i < len; i++) {
        let min = Math.max(0, retVal[i-1] - (octaveSemitones-1));
        let max = Math.min(globalMax, retVal[i-1] + (octaveSemitones-1));
        /**
         * @type {number[]}
         */
        let allowedVals = [];
        for (let i = min; i <= max; i++) {
            if (!used.has(i)) allowedVals.push(i);
        }
        if (allowedVals.length === 0) throw new Error("AAAAAAAA");
        retVal[i] = allowedVals[Math.floor(Math.random() * allowedVals.length)];
        used.add(retVal[i]);
    }
    return retVal;
}

function testABunchOfRandomMelodies(numMelodies, len) {
    let successful = 0;
    for (let i = 0; i < numMelodies; i++) {
        const melody = generateRandomMelody(len);
        if (isValidMelody(melody)) {
            successful++;
        }
    }
    console.log(`${successful}/${numMelodies} tried, ${successful/numMelodies} success rate`);
    // len 4: 19502/100000 tried, 0.19502 success rate
    // len 5: 43497/100000 tried, 0.43497 success rate
    // len 6: 67088/100000 tried, 0.67088 success rate
    // len 7: 83523/100000 tried, 0.83523 success rate
    // len 8: 92704/100000 tried, 0.92704 success rate
    // len 9: 97130/100000 tried, 0.9713 success rate
}

// console.assert(!isValidMelody([0,0,1,2,3,4,5,6,7,8,9,10,11])); // duplicate note
// console.assert(!isValidMelody([0,2,4,5,7,9,11])); // same scale (C major)
// console.assert(!isValidMelody([0,13,2,3,4,5,6,7,8,9,10,11])); // intervals must be smaller than one octave

/**
 * @param {number[]} stimulusOne
 * @param {number[]} stimulusTwo
 * @returns {boolean}
 */
function areValidMelodies(stimulusOne, stimulusTwo) {
    if (stimulusOne.length !== stimulusTwo.length) return false;
    if (!isValidMelody(stimulusOne) || !isValidMelody(stimulusTwo)) return false;
    let prevNoteOne = stimulusOne[0];
    let prevNoteTwo = stimulusTwo[0];
    let hasFoundDifference = prevNoteOne !== prevNoteTwo;
    for (let i = 1; i < stimulusOne.length; i++) {
        let currOne = stimulusOne[i];
        let currTwo = stimulusTwo[i];
        // random alteration of a single note in the second stimulus should not change the melodic contour of the original sequence
        if (Math.sign(currOne - prevNoteOne) !== Math.sign(currTwo - prevNoteTwo)) return false;
        // check that only one difference is present
        if (currOne !== currTwo) {
            if (hasFoundDifference) return false;
            hasFoundDifference = true;
        }
        prevNoteOne = currOne;
        prevNoteTwo = currTwo;
    }
    return hasFoundDifference;

}

async function playMelody(melody) {
    for (let i = 0; i < melody.length; i++) {
        await playToneWithRamp(semitonesAboveC4Freq[melody[i]], melodyTestToneIntervalMs, 0, 0);
        await delay(melodyTestToneIntervalMs - melodyTestToneDurationMs);
    }
}

async function playRandomMelody() {
    const melody = generateRandomMelody(9);
    await playMelody(melody);
}

function initMelodyTest() {
    function addArrayEntry(index, entry) {
        if (noteScaleLookup[index] === undefined) noteScaleLookup[index] = new Set();
        noteScaleLookup[index].add(entry);
    }
    // each major scale (C -> G -> D -> A -> E -> B -> F# -> C#) is +7 % 12
    // in other direction (C -> F -> Bb -> Eb -> Ab -> Db -> Gb -> Cb) is +5 % 12
    // to get minor do +9 % 12 (C major -> A minor)
    for (let numScales = 0; numScales < 8; ++numScales) {
        const majorSharpStartingNote = (numScales * 7) % 12;
        const minorSharpStartingNote = (majorSharpStartingNote + 9) % 12;
        const majorFlatStartingNote = (numScales * 5) % 12;
        const minorFlatStartingNote = (majorFlatStartingNote + 9) % 12;
        for (let numNotes = 0; numNotes < 8; numNotes++) {
            let majorSharpNote = (majorSharpStartingNote + majorScalePrefixSum[numNotes]) % 12;
            let naturalMinorSharpNote = (minorSharpStartingNote + naturalMinorScalePrefixSum[numNotes]) % 12;
            let harmonicMinorSharpNote = (minorSharpStartingNote + harmonicMinorScalePrefixSum[numNotes]) % 12;
            let melodicMinorSharpNote = (minorSharpStartingNote + melodicMinorAscendingScalePrefixSum[numNotes]) % 12;
            addArrayEntry(majorSharpNote, `${majorSharpStartingNote}-major (pos)`);
            addArrayEntry(naturalMinorSharpNote, `${minorSharpStartingNote}-nat minor (pos)`);
            addArrayEntry(harmonicMinorSharpNote, `${minorSharpStartingNote}-harmonic minor (pos)`);
            addArrayEntry(melodicMinorSharpNote, `${minorSharpStartingNote}-melodic minor (pos)`);
            if (majorSharpStartingNote !== majorFlatStartingNote) {
                let majorFlatNote = (majorFlatStartingNote + majorScalePrefixSum[numNotes]) % 12;
                let naturalMinorFlatNote = (minorFlatStartingNote + naturalMinorScalePrefixSum[numNotes]) % 12;
                let harmonicMinorFlatNote = (minorFlatStartingNote + harmonicMinorScalePrefixSum[numNotes]) % 12;
                let melodicMinorFlatNote = (minorFlatStartingNote + melodicMinorAscendingScalePrefixSum[numNotes]) % 12;
                addArrayEntry(majorFlatNote, `${majorFlatStartingNote}-major (neg)`);
                addArrayEntry(naturalMinorFlatNote, `${minorFlatStartingNote}-nat minor (neg)`);
                addArrayEntry(harmonicMinorFlatNote, `${minorFlatStartingNote}-harmonic minor (neg)`);
                addArrayEntry(melodicMinorFlatNote, `${minorFlatStartingNote}-melodic minor (neg)`);
            }
        }
    }
}

//#endregion

//#region rhythm test
const rhythmTestFrequency = 500;
const rhythmTestTimeBetweenStimuliMs = 1000;
const rhythmTestToneLengthMs = 30;
const rhythmTestToneRampDownMs = 30;
const rhythmTestToneIntervalMs = [150, 300, 450, 600];
const rhythmTestLengths = [5, 6, 7];
const rhythmTestCounts = [6, 6, 6];
const rhythmTestNumIdenticalTests = 7;
//#endregion

//#region Pitch Test
const pitchTestFrequency = 500;
const pitchTestRampUpMs = 30;
const pitchTestDurationMs = 530;
const pitchTestRampDownMs = 30;
const pitchTestSilenceMs = 1000;
const pitchTestDifferences = [17, 12, 8, 5, 4, 3, 2, 1];
const pitchTestCounts = [3, 3, 3, 4, 4, 4, 4, 2];
let pitchTestIndex = 0;
let pitchTestCount = 0;
let pitchTestNumTests = 0;
let pitchTestNumPassedTests = 0;
let pitchTestBasePlayedFirst = false;
const pitchTestNowPlaying = document.querySelector("div[id='pitch-test-now-playing']");
const pitchTestStartButton = document.querySelector("button[id='pitch-test-start']");
const pitchTestHigherButton = document.querySelector("button[id='pitch-test-higher']");
const pitchTestLowerButton = document.querySelector("button[id='pitch-test-lower']");
const pitchTestTotalTests = document.querySelector("span[id='pitch-test-total-tests']");
const pitchTestPassedTests = document.querySelector("span[id='pitch-test-passed-tests']");
const pitchTestFailedTestDetails = document.querySelector("ol[id='pitch-test-fail-details']");

function initPitchTest() {
    pitchTestHigherButton.disabled = true;
    pitchTestLowerButton.disabled = true;
}

async function runNextPitchTest() {
    if (pitchTestIndex >= pitchTestDifferences.length) {
        pitchTestStartButton.disabled = false;
        pitchTestHigherButton.disabled = true;
        pitchTestLowerButton.disabled = true;
        return;
    }
    if (pitchTestCount >= pitchTestCounts[pitchTestIndex]) {
        pitchTestIndex++;
        pitchTestCount = 0;
        if (pitchTestIndex >= pitchTestDifferences.length) {
            pitchTestStartButton.disabled = false;
            pitchTestHigherButton.disabled = true;
            pitchTestLowerButton.disabled = true;
            return;
        }
    }
    pitchTestHigherButton.disabled = true;
    pitchTestLowerButton.disabled = true;
    pitchTestCount++;
    const difference = pitchTestDifferences[pitchTestIndex];
    pitchTestBasePlayedFirst = Math.random() < 0.5;
    const firstPitch = pitchTestBasePlayedFirst ? pitchTestFrequency : pitchTestFrequency + difference;
    const secondPitch = pitchTestBasePlayedFirst ? pitchTestFrequency + difference : pitchTestFrequency;
    await delay(pitchTestSilenceMs);
    pitchTestNowPlaying.innerHTML = "Playing Pitch 1";
    await playToneWithRamp(firstPitch, pitchTestDurationMs, pitchTestRampUpMs, pitchTestRampDownMs);
    pitchTestNowPlaying.innerHTML = "";
    await delay(pitchTestSilenceMs);
    pitchTestNowPlaying.innerHTML = "Playing Pitch 2";
    await playToneWithRamp(secondPitch, pitchTestDurationMs, pitchTestRampUpMs, pitchTestRampDownMs);
    pitchTestNowPlaying.innerHTML = "";
    pitchTestHigherButton.disabled = false;
    pitchTestLowerButton.disabled = false;
}

function pitchTestPassedTest() {
    console.log("Correct!");
    pitchTestNumPassedTests++;
    pitchTestNumTests++;
    pitchTestTotalTests.innerHTML = pitchTestNumTests;
    pitchTestPassedTests.innerHTML = pitchTestNumPassedTests;
}

function pitchTestFailedTest() {
    console.log("rip");
    pitchTestNumTests++;
    pitchTestTotalTests.innerHTML = pitchTestNumTests;
    const difference = pitchTestDifferences[pitchTestIndex];
    const firstPitch = pitchTestBasePlayedFirst ? pitchTestFrequency : pitchTestFrequency + difference;
    const secondPitch = pitchTestBasePlayedFirst ? pitchTestFrequency + difference : pitchTestFrequency;
    const noteLi = document.createElement("li");
    let text = `Test ${pitchTestNumTests} failed, frequencies were ${firstPitch}/${secondPitch}, was marked ${pitchTestBasePlayedFirst ? "Lower" : "Higher"}`;
    noteLi.appendChild(document.createTextNode(text));
    pitchTestFailedTestDetails.appendChild(noteLi);
}

function higherClicked() {
    if (pitchTestBasePlayedFirst) {
        pitchTestPassedTest();
    } else {
        pitchTestFailedTest();
    }
    runNextPitchTest();
}

function lowerClicked() {
    if (pitchTestBasePlayedFirst) {
        pitchTestFailedTest();
    } else {
        pitchTestPassedTest();
    }
    runNextPitchTest();
}

function pitchTestStarted() {
    pitchTestIndex = 0;
    pitchTestCount = 0;
    pitchTestNumTests = 0;
    pitchTestNumPassedTests = 0;
    pitchTestStartButton.disabled = true;
    pitchTestFailedTestDetails.innerHTML = "";
    pitchTestTotalTests.innerHTML = pitchTestNumTests;
    pitchTestPassedTests.innerHTML = pitchTestNumPassedTests;
    runNextPitchTest();
}

function pitchTestOnKeyPress(e) {
    if (!pitchTestHigherButton.disabled && e.key === 'h') {
        higherClicked();
        return true;
    } else if (!pitchTestLowerButton.disabled && e.key === 'l') {
        lowerClicked();
        return true;
    }
    return false;
}

//#endregion

setup();

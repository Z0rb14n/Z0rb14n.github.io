const audioContext = new AudioContext();
const volumeControl = document.querySelector("input[name='volume']");
const pitchTestStartButton = document.querySelector("button[id='pitch-test-start']");
const pitchTestHigherButton = document.querySelector("button[id='pitch-test-higher']");
const pitchTestLowerButton = document.querySelector("button[id='pitch-test-lower']");
let activeOscillator = null;

let mainGainNode = null;
let subGainNode = null;

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

function changeVolume(event) {
    mainGainNode.gain.value = volumeControl.value;
}

function setup() {
    volumeControl.addEventListener("change", changeVolume);

    mainGainNode = audioContext.createGain();
    mainGainNode.connect(audioContext.destination);
    mainGainNode.gain.value = volumeControl.value;
    subGainNode = audioContext.createGain();
    subGainNode.connect(mainGainNode);
    subGainNode.gain.value = 1;

    pitchTestHigherButton.disabled = true;
    pitchTestLowerButton.disabled = true;
}

setup();

// https://www.sciencedirect.com/science/article/pii/S0191886914000841

const melodyTestLengths = [4, 5, 6, 7, 8, 9];
const melodyTestCounts = [3, 3, 3, 3, 3, 3];
const melodyTestToneIntervalMs = 650;
const melodyTestTimeBetweenStimuliMs = 1300;

const rhythmTestFrequency = 500;
const rhythmTestTimeBetweenStimuliMs = 1000;
const rhythmTestToneLengthMs = 30;
const rhythmTestToneRampDownMs = 30;
const rhythmTestToneIntervalMs = [150, 300, 450, 600];
const rhythmTestLengths = [5, 6, 7];
const rhythmTestCounts = [6, 6, 6];
const rhythmTestNumIdenticalTests = 7;
// they apparently do 36 tests for rhythm and melody
// and then remove the outlier tests where the overall failure percentage that don't match total score
// skipping that cuz

const pitchTestFrequency = 500;
const pitchTestRampUpMs = 30;
const pitchTestDurationMs = 530;
const pitchTestRampDownMs = 30;
const pitchTestSilenceMs = 1000;
const pitchTestDifferences = [17, 12, 8, 5, 4, 3, 2, 1];
const pitchTestCounts = [3, 3, 3, 4, 4, 4, 4, 2];
let pitchTestIndex = 0;
let pitchTestCount = 0;
let pitchTestBasePlayedFirst = false;

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
    subGainNode.gain.value = 0;
    playTone(freq);
    subGainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + rampUpMs/1000);
    await delay(rampUpMs + durationMs);
    subGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampDownMs/1000);
    await delay(rampDownMs);
    stopTone();
}

async function playToneWithDuration(freq, durationMs) {
    subGainNode.gain.value = 1;
    playTone(freq);
    await delay(durationMs);
    stopTone();
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopTone() {
    if (activeOscillator) activeOscillator.stop();
    activeOscillator = null;
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
    await playToneWithRamp(firstPitch, pitchTestDurationMs, pitchTestRampUpMs, pitchTestRampDownMs);
    await delay(pitchTestSilenceMs);
    await playToneWithRamp(secondPitch, pitchTestDurationMs, pitchTestRampUpMs, pitchTestRampDownMs);
    pitchTestHigherButton.disabled = false;
    pitchTestLowerButton.disabled = false;
}


function higherClicked() {
    if (pitchTestBasePlayedFirst) {
        console.log("Correct!");
    } else {
        console.log("rip");
    }
    runNextPitchTest();
}

function lowerClicked() {
    if (pitchTestBasePlayedFirst) {
        console.log("rip");
    } else {
        console.log("Correct!");
    }
    runNextPitchTest();
}

function pitchTestStarted() {
    pitchTestIndex = 0;
    pitchTestCount = 0;
    pitchTestStartButton.disabled = true;
    runNextPitchTest();
}

//testThing();

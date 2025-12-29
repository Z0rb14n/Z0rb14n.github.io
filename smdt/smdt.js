const audioContext = new AudioContext();
const volumeControl = document.querySelector("input[name='volume']");
let activeOscillator = null;

let mainGainNode = null;
let subGainNode = null;

function changeVolume(event) {
    mainGainNode.gain.value = volumeControl.value;
}

function onKeyPress(e) {
    if (pitchTestOnKeyPress(e)) return;
}

function setup() {
    volumeControl.addEventListener("change", changeVolume);

    mainGainNode = audioContext.createGain();
    mainGainNode.connect(audioContext.destination);
    mainGainNode.gain.value = volumeControl.value;
    subGainNode = audioContext.createGain();
    subGainNode.connect(mainGainNode);
    subGainNode.gain.value = 1;
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
        subGainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + rampUpMs/1000);
        await delay(rampUpMs + durationMs);
    } else {
        subGainNode.gain.value = 1;
        playTone(freq);
        await delay(durationMs);
    }
    if (rampDownMs > 0) {
        subGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampDownMs/1000);
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

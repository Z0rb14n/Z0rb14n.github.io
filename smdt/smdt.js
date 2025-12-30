"use strict";
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
    if (pitchTest.onKeyPress(e)) return;
    if (melodyTest.onKeyPress(e)) return;
    rhythmTest.onKeyPress(e);
}

class AbstractTest {
    /**
     * @type {number[]}
     */
    tests;
    /**
     * @type {number[]}
     */
    testCounts;
    testIndex = 0;
    testCount = 0;
    numPassedTests = 0;
    numTests = 0;
    stopping = false;
    awaitingInput = false;
    /**
     * @type {Element}
     */
    startButton;
    /**
     * @type {Element}
     */
    stopButton;
    /**
     * @type {Element}
     */
    nowPlayingDisplay;
    /**
     * @type {Element}
     */
    passedTestsDisplay;
    /**
     * @type {Element}
     */
    totalTestsDisplay;
    /**
     * @type {Element}
     */
    failedTestDetails;
    constructor(tests, counts) {
        this.tests = tests;
        this.testCounts = counts;
    }
    onTestPass() {
        console.log("Correct!");
        this.numPassedTests++;
        this.numTests++;
        this.passedTestsDisplay.innerHTML = this.numPassedTests.toString();
        this.totalTestsDisplay.innerHTML = this.numTests.toString();
        this.awaitingInput = false;
    }
    onTestFail(details) {
        console.log("rip");
        this.numTests++;
        this.totalTestsDisplay.innerHTML = this.numTests.toString();
        const noteLi = document.createElement("li");
        noteLi.appendChild(document.createTextNode(details));
        this.failedTestDetails.appendChild(noteLi);
        this.awaitingInput = false;
    }

    onTestChanged() {
    }

    onTestFinish() {
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
    }

    async runNextTest() {
        if (this.testIndex >= this.tests.length) {
            this.onTestFinish();
            return false;
        }
        if (this.testCount >= this.testCounts[this.testIndex]) {
            this.testIndex++;
            this.testCount = 0;
            if (this.testIndex >= this.tests.length) {
                this.onTestFinish();
                return false;
            }
            this.onTestChanged();
        }
        this.testCount++;
        this.awaitingInput = false;
        return true;
    }

    startTest() {
        this.testIndex = 0;
        this.testCount = 0;
        this.numTests = 0;
        this.numPassedTests = 0;
        this.startButton.disabled = true;
        this.failedTestDetails.innerHTML = "";
        this.passedTestsDisplay.innerHTML = "0";
        this.totalTestsDisplay.innerHTML = "0";
        this.stopButton.disabled = false;
        this.stopping = false;

        this.runNextTest();
    }

    stopTest() {
        pitchTest.startButton.disabled = false;
        rhythmTest.startButton.disabled = false;
        melodyTest.startButton.disabled = false;
        this.onTestFinish();
        this.stopping = true;
        stopTone();
    }
}

function setup() {
    volumeControl.addEventListener("change", changeVolume);

    mainGainNode = audioContext.createGain();
    mainGainNode.connect(audioContext.destination);
    mainGainNode.gain.value = volumeControl.value;
    subGainNode = audioContext.createGain();
    subGainNode.connect(mainGainNode);
    subGainNode.gain.setValueAtTime(1.0, 0);
    addEventListener('keydown', onKeyPress);
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        subGainNode.gain.setValueAtTime(0.0, 0);
        playTone(freq);
        subGainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + rampUpMs / 1000);
        await delay(rampUpMs + durationMs);
    } else {
        subGainNode.gain.setValueAtTime(1.0, 0);
        playTone(freq);
        await delay(durationMs);
    }
    if (rampDownMs > 0) {
        subGainNode.gain.setValueAtTime(1.0, 0);
        subGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampDownMs / 1000);
        await delay(rampDownMs);
    }
    stopTone();
}

function stopTone() {
    if (activeOscillator) activeOscillator.stop();
    activeOscillator = null;
}

class MelodyTest extends AbstractTest {
    static #noteFreq = {
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
    static #semitonesAboveC4Freq = Object.values(MelodyTest.#noteFreq);

    static #octaveSemitones = 12;

    static #noteScaleLookup = MelodyTest.#createNoteScaleLookup();

    static #createNoteScaleLookup() {
        /**
         * @type {Set[]}
         */
        const noteScaleLookup = new Array(12);
        function addArrayEntry(index, entry) {
            if (noteScaleLookup[index] === undefined) noteScaleLookup[index] = new Set();
            noteScaleLookup[index].add(entry);
        }
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
        return noteScaleLookup;
    }

    /**
     * @param {number[]} stimulus
     * @returns {boolean}
     */
    static isValidMelody(stimulus) {
        // (i) each pitch occurred only once
        if (new Set(stimulus).size !== stimulus.length) return false;
        // (ii) not all pitches in the sequence belonged to the same tonal (i.e., major, ascending minor, descending minor, or harmonic minor) scale
        let scaleSet = MelodyTest.#noteScaleLookup[(stimulus[0] % 12)];
        for (let i = 1; i < stimulus.length; i++) {
            scaleSet = scaleSet.intersection(MelodyTest.#noteScaleLookup[(stimulus[i] % 12)]);
        }
        if (scaleSet.size > 0) return false;
        let prevNote = stimulus[0];
        for (let i = 1; i < stimulus.length; i++) {
            let currNote = stimulus[i];
            // (iii) all intervals between consecutive tones were smaller than one octave
            if (Math.abs(currNote - prevNote) >= MelodyTest.#octaveSemitones) return false;
            prevNote = currNote;
        }
        return true;
    }

    /**
     * @param {number} len
     * @returns {number[]}
     */
    static generateRandomMelody(len) {
        /**
         * @type {number[]}
         */
        let retVal = new Array(len);
        const globalMax = MelodyTest.#semitonesAboveC4Freq.length;
        /**
         * @type {Set<number>}
         */
        const used = new Set();
        retVal[0] = Math.floor(Math.random()*globalMax);
        used.add(retVal[0]);
        for (let i = 1; i < len; i++) {
            let min = Math.max(0, retVal[i-1] - (MelodyTest.#octaveSemitones-1));
            let max = Math.min(globalMax-1, retVal[i-1] + (MelodyTest.#octaveSemitones-1));
            /**
             * @type {number[]}
             */
            let allowedVals = [];
            for (let i = min; i <= max; i++) {
                if (!used.has(i)) allowedVals.push(i);
            }
            if (allowedVals.length === 0) throw new Error("Ran out of allowed values for generating random melody");
            retVal[i] = allowedVals[Math.floor(Math.random() * allowedVals.length)];
            used.add(retVal[i]);
        }
        return retVal;
    }

    static #ellipseRadiusX = 20;
    static #ellipseRadiusY = 10;
    static #ellipseColor = "black";
    static #ellipseSpacing = 20;
    static #ellipsePlayColor = "green";
    static #circleRadius = 8;
    static #circleColor = "white";

    /**
     * @param {number[]} stimulusOne
     * @param {number[]} stimulusTwo
     * @returns {boolean}
     */
    static #areValidMelodies(stimulusOne, stimulusTwo) {
        if (stimulusOne.length !== stimulusTwo.length) return false;
        if (!MelodyTest.isValidMelody(stimulusOne) || !MelodyTest.isValidMelody(stimulusTwo)) return false;
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
    /**
     * @param {number[]} melody
     * @returns {undefined|number[]}
     */
    static #modifyMelody(melody) {
        const retVal = melody.slice();

        /**
         * @param {number[]} arr
         * @returns {number}
         */
        function randRemove(arr) {
            const rand = Math.floor(Math.random() * arr.length);
            const v = arr[rand];
            arr[rand] = arr[arr.length-1];
            arr.pop();
            return v;
        }
        /**
         * @type {number[]}
         */
        let allowedIndices = new Array(melody.length);
        for (let i = 0; i < melody.length; i++) allowedIndices[i] = i;
        while (allowedIndices.length > 0) {
            const index = randRemove(allowedIndices);

            const curr = melody[index];
            let min = 0;
            let max = MelodyTest.#semitonesAboveC4Freq.length-1;
            if (index > 0) {
                const prev = melody[index-1];
                if (prev > curr) {
                    max = Math.min(max, prev-1);
                    min = Math.max(min, prev - MelodyTest.#octaveSemitones+1);
                } else {
                    min = Math.max(min, prev+1);
                    max = Math.min(max, prev + MelodyTest.#octaveSemitones-1);
                }
            }
            if (index < melody.length-1) {
                const successor = melody[index+1];
                if (successor > curr) {
                    max = Math.min(max, successor-1);
                    min = Math.max(min, successor-MelodyTest.#octaveSemitones+1);
                } else {
                    min = Math.max(min, successor+1);
                    max = Math.min(max, successor+MelodyTest.#octaveSemitones-1);
                }
            }
            /**
             * @type {number[]}
             */
            let allowedValues = [];
            for (let i = min; i <= max; i++) {
                if (i !== curr) allowedValues.push(i);
            }
            while (allowedValues.length > 0) {
                retVal[index] = randRemove(allowedValues);
                if (MelodyTest.#areValidMelodies(melody, retVal)) return retVal;
            }
            retVal[index] = curr;
        }
        return undefined;
    }

    /**
     * @param {number} len
     * @returns {number[][]}
     */
    static #generateMelodyPair(len) {
        while (true) {
            try {
                let firstMelody = MelodyTest.generateRandomMelody(len);
                while (!MelodyTest.isValidMelody(firstMelody)) firstMelody = MelodyTest.generateRandomMelody(len);
                let secondMelody = MelodyTest.#modifyMelody(firstMelody);
                if (secondMelody === undefined) continue;
                return [firstMelody, secondMelody];
            } catch (e) {
            }
        }
    }
    /**
     * @type {number[]}
     */
    originalMelody = [];
    /**
     * @type {number[]}
     */
    modifiedMelody = [];
    /**
     * @type {Element}
     */
    testVisual;
    /**
     * @type {number}
     */
    toneIntervalMs;
    /**
     * @type {number}
     */
    toneDurationMs;
    /**
     * @type {number}
     */
    timeBetweenStimuliMs;
    constructor(lengths, counts, toneIntervalMs, toneDurationMs, timeBetweenStimuliMs) {
        super(lengths, counts);
        this.toneIntervalMs = toneIntervalMs;
        this.toneDurationMs = toneDurationMs;
        this.toneIntervalMs = toneIntervalMs;
        this.timeBetweenStimuliMs = timeBetweenStimuliMs;
        this.testVisual = document.querySelector("svg[id='melody-test-visual']");
        this.nowPlayingDisplay = document.querySelector("div[id='melody-test-now-playing']");
        this.startButton = document.querySelector("button[id='melody-test-start']");
        this.stopButton = document.querySelector("button[id='melody-test-stop']");
        this.totalTestsDisplay = document.querySelector("span[id='melody-test-total-tests']");
        this.passedTestsDisplay = document.querySelector("span[id='melody-test-passed-tests']");
        this.failedTestDetails = document.querySelector("ol[id='melody-test-fail-details']");
    }

    #ensureExactNumberOfNotes(len) {
        const ellipses = this.testVisual.querySelectorAll("ellipse[id^='melody-test-ellipse']");
        if (ellipses.length === len) return;
        if (ellipses.length < len) {
            for (let i = ellipses.length; i < len; i++) {
                this.#createNote(i);
            }
        } else {
            for (let i = len; i < ellipses.length; i++) {
                this.testVisual.removeChild(ellipses[i]);
                this.testVisual.removeChild(this.testVisual.querySelector(`circle[id='melody-test-circle-${i}']`));
            }
        }
    }

    #createNote(index) {
        const ellipse = document.createElementNS("http://www.w3.org/2000/svg","ellipse");
        ellipse.id = `melody-test-ellipse-${index}`;
        ellipse.style.fill = MelodyTest.#ellipseColor;
        const posX = 3 + MelodyTest.#ellipseRadiusX + (index * (2*MelodyTest.#ellipseRadiusX + MelodyTest.#ellipseSpacing));
        ellipse.setAttribute("rx", MelodyTest.#ellipseRadiusX.toString());
        ellipse.setAttribute("ry", MelodyTest.#ellipseRadiusY.toString());
        ellipse.setAttribute("cy", "20");
        ellipse.setAttribute("cx", posX.toString());
        ellipse.onclick = () => this.onUserInput(index);
        this.testVisual.appendChild(ellipse);
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.id = `melody-test-circle-${index}`;
        circle.setAttribute("r", MelodyTest.#circleRadius.toString());
        circle.style.fill = MelodyTest.#circleColor;
        circle.setAttribute("cy", "20");
        circle.setAttribute("cx", posX.toString());
        circle.onclick = () => this.onUserInput(index);
        this.testVisual.appendChild(circle);
    }

    #markNotePlayStatus(index, status) {
        const ellipse = this.testVisual.querySelector(`ellipse[id='melody-test-ellipse-${index}']`);
        if (!ellipse) {
            console.warn("bruv");
            return;
        }
        ellipse.style.fill = status ? MelodyTest.#ellipsePlayColor : MelodyTest.#ellipseColor;
    }

    async playMelody(melody) {
        for (let i = 0; i < melody.length; i++) {
            if (this.stopping) return;
            this.#markNotePlayStatus(i, true);
            await playToneWithRamp(MelodyTest.#semitonesAboveC4Freq[melody[i]], this.toneIntervalMs, 0, 0);
            this.#markNotePlayStatus(i, false);

            if (this.stopping) return;
            await delay(this.toneIntervalMs - this.toneDurationMs);
        }
    }

    onUserInput(index) {
        if (!this.awaitingInput) return;
        let diffIndex = -1;
        for (let i = 0; i < this.originalMelody.length; i++) {
            if (this.originalMelody[i] !== this.modifiedMelody[i]) {
                diffIndex = i;
                break;
            }
        }
        if (diffIndex === -1) {
            alert("yeah no the dev screwed up lol i'll mark it as correct");
            this.onTestPass();
            return;
        }
        if (index !== diffIndex) {
            this.onTestFail(`Test ${this.numTests} failed, different note was ${diffIndex}, was marked ${index}`);
        }
        else {
            this.onTestPass();
        }
        this.runNextTest();
    }

    onTestFinish() {
        super.onTestFinish();
        pitchTest.startButton.disabled = false;
        rhythmTest.startButton.disabled = false;
    }

    onTestChanged() {
        super.onTestChanged();
        this.#ensureExactNumberOfNotes(this.tests[this.testIndex]);
    }

    async runNextTest() {
        if (!await super.runNextTest()) return false;
        let pair = MelodyTest.#generateMelodyPair(this.tests[this.testIndex]);
        this.originalMelody = pair[0];
        this.modifiedMelody = pair[1];
        if (this.stopping) return false;
        await delay(this.timeBetweenStimuliMs);
        if (this.stopping) return false;
        this.nowPlayingDisplay.innerHTML = "Playing Melody 1";
        await this.playMelody(this.originalMelody);
        this.nowPlayingDisplay.innerHTML = "";
        if (this.stopping) return false;
        await delay(this.timeBetweenStimuliMs);
        if (this.stopping) return false;
        this.nowPlayingDisplay.innerHTML = "Playing Melody 2";
        await this.playMelody(this.modifiedMelody);
        this.nowPlayingDisplay.innerHTML = "";
        this.awaitingInput = true;
        return true;
    }

    onKeyPress(e) {
        if (!this.awaitingInput) return false;
        const numKeys = this.originalMelody.length;
        for (let i = 1; i <= numKeys; i++) {
            if (e.key === `${i}`) {
                this.onUserInput(i-1);
                return true;
            }
        }
        return false;
    }

    startTest() {
        this.#ensureExactNumberOfNotes(this.tests[0]);
        pitchTest.startButton.disabled = true;
        rhythmTest.startButton.disabled = true;
        super.startTest();
    }
}
const melodyTestDefaultLengths = [4, 5, 6, 7, 8, 9];
const melodyTestDefaultCounts = [3, 3, 3, 3, 3, 3];
const melodyTestDefaultToneIntervalMs = 650;
// they don't actually say how long the duration is, we just give them one
const melodyTestDefaultToneDurationMs = melodyTestDefaultToneIntervalMs;
const melodyTestDefaultTimeBetweenStimuliMs = 1300;

const melodyTest = new MelodyTest(melodyTestDefaultLengths,
    melodyTestDefaultCounts, melodyTestDefaultToneIntervalMs, melodyTestDefaultToneDurationMs, melodyTestDefaultTimeBetweenStimuliMs);

class RhythmTest extends AbstractTest {
    static #rhythmModifyAttempts = 10;
    static #areRhythmsEqual(rhythmOne, rhythmTwo) {
        if (rhythmOne.length !== rhythmTwo.length) return false;
        for (let i = 0; i < rhythmOne.length; i++) {
            if (rhythmOne[i] !== rhythmTwo[i]) return false;
        }
        return true;
    }
    toneFreq = 500;
    timeBetweenStimuliMs = 1000;
    toneLengthMs = 30;
    toneRampDownMs = 30;
    toneIntervalsMs = [150, 300, 450, 600];
    sameProb = 0.5;
    startPointChangeOnlyProb = 0.4;
    noteSwapOnlyProb = 0.4;
    /**
     * @type {number[]}
     */
    originalRhythm = [];
    /**
     * @type {number[]}
     */
    modifiedRhythm = [];
    /**
     * @type {Element}
     */
    identicalButton;
    /**
     * @type {Element}
     */
    differentButton;

    constructor(lengths, counts, toneRampDownMs, toneLengthMs, timeBetweenStimuliMs, toneFreq, toneIntervals, sameProb, startPointChangeOnlyProb, noteSwapOnlyProb) {
        super(lengths, counts);
        this.toneRampDownMs = toneRampDownMs;
        this.toneLengthMs = toneLengthMs;
        this.timeBetweenStimuliMs = timeBetweenStimuliMs;
        this.toneFreq = toneFreq;
        this.toneIntervalsMs = toneIntervals;
        this.sameProb = sameProb;
        this.startPointChangeOnlyProb = startPointChangeOnlyProb;
        this.noteSwapOnlyProb = noteSwapOnlyProb;
        this.nowPlayingDisplay = document.querySelector("div[id='rhythm-test-now-playing']");
        this.startButton = document.querySelector("button[id='rhythm-test-start']");
        this.stopButton = document.querySelector("button[id='rhythm-test-stop']");
        this.identicalButton = document.querySelector("button[id='rhythm-test-identical']");
        this.differentButton = document.querySelector("button[id='rhythm-test-different']");
        this.totalTestsDisplay = document.querySelector("span[id='rhythm-test-total-tests']");
        this.passedTestsDisplay = document.querySelector("span[id='rhythm-test-passed-tests']");
        this.failedTestDetails = document.querySelector("ol[id='rhythm-test-fail-details']");
        this.identicalButton.disabled = true;
        this.differentButton.disabled = true;
    }

    /**
     * @param {number} len
     * @returns {number[]}
     */
    #generateRhythm(len) {
        /**
         * @type {number[]}
         */
        let retVal = new Array(len);
        for (let i = 0; i < len; i++) retVal[i] = this.toneIntervalsMs[Math.floor(Math.random() * this.toneIntervalsMs.length)];
        return retVal;
    }

    /**
     * @param {number[]} rhythm
     * @returns {undefined|number[]}
     */
    #modifyRhythm(rhythm) {
        for (let attempt = 0; attempt < RhythmTest.#rhythmModifyAttempts; attempt++) {
            const rand = Math.random();
            const doStartingPointChange = rand < this.startPointChangeOnlyProb ||
                rand > (this.startPointChangeOnlyProb + this.noteSwapOnlyProb);
            const doNoteSwap = rand < this.noteSwapOnlyProb ||
                rand > (this.startPointChangeOnlyProb + this.noteSwapOnlyProb);
            function swapRandomNotes(arr) {
                let indexOne = Math.floor(Math.random() * arr.length);
                let indexTwo = Math.floor(Math.random() * arr.length);
                let temp = arr[indexOne];
                arr[indexOne] = arr[indexTwo];
                arr[indexTwo] = temp;
                return arr;
            }
            function rotateStartingPoint(arr) {
                let newStartingPoint = Math.floor(Math.random() * (arr.length-1))+1;
                return arr.slice(newStartingPoint).concat(arr.slice(0, newStartingPoint));
            }
            let retVal = rhythm.slice();
            if (doNoteSwap) retVal = swapRandomNotes(retVal);
            if (doStartingPointChange) retVal = rotateStartingPoint(retVal);
            if (!RhythmTest.#areRhythmsEqual(rhythm, retVal)) return retVal;
        }
        return undefined;
    }

    #generateRhythmPair(len) {
        const isSame = Math.random() < this.sameProb;
        if (isSame) {
            const rhythm = this.#generateRhythm(len);
            return [rhythm, rhythm];
        }
        while (true) {
            const original = this.#generateRhythm(len);
            const modified = this.#modifyRhythm(original);
            if (modified !== undefined) return [original, modified];
        }
    }

    startTest() {
        melodyTest.startButton.disabled = true;
        pitchTest.startButton.disabled = true;
        this.identicalButton.disabled = true;
        this.differentButton.disabled = true;
        super.startTest();
    }

    async playRhythm(rhythm) {
        for (let i = 0; i < rhythm.length; i++) {
            if (this.stopping) return;
            await playToneWithRamp(this.toneFreq, this.toneLengthMs, 0, this.toneRampDownMs);
            if (this.stopping) return;
            await delay(rhythm[i] -  this.toneLengthMs - this.toneRampDownMs);
        }
    }

    onTestFinish(){
        super.onTestFinish();
        melodyTest.startButton.disabled = false;
        pitchTest.startButton.disabled = false;
        this.identicalButton.disabled = true;
        this.differentButton.disabled = true;
    }

    onUserInput(different) {
        if (!this.awaitingInput) return;
        const hasDifference = !RhythmTest.#areRhythmsEqual(this.originalRhythm, this.modifiedRhythm);
        if (different !== hasDifference) {
            console.log(this.originalRhythm + "," + this.modifiedRhythm);
            this.onTestFail(`Test ${this.numTests} failed, sequences were ${hasDifference ? "" : "not"} different, was marked as ${different ? "" : "not"} different`);
        } else {
            this.onTestPass();
        }
        this.runNextTest();
    }

    async runNextTest() {
        if (!await super.runNextTest()) return false;
        this.identicalButton.disabled = true;
        this.differentButton.disabled = true;
        const rhythmPair = this.#generateRhythmPair(this.tests[this.testIndex]);
        this.originalRhythm = rhythmPair[0];
        this.modifiedRhythm = rhythmPair[1];
        if (this.stopping) return false;
        await delay(this.timeBetweenStimuliMs);
        if (this.stopping) return false;
        this.nowPlayingDisplay.innerHTML = "Playing Rhythm 1";
        await this.playRhythm(this.originalRhythm);
        this.nowPlayingDisplay.innerHTML = "";
        if (this.stopping) return false;
        await delay(this.timeBetweenStimuliMs);
        if (this.stopping) return false;
        this.nowPlayingDisplay.innerHTML = "Playing Rhythm 2";
        await this.playRhythm(this.modifiedRhythm);
        this.nowPlayingDisplay.innerHTML = "";
        if (this.stopping) return false;
        this.awaitingInput = true;
        this.identicalButton.disabled = false;
        this.differentButton.disabled = false;
        return true;
    }

    onKeyPress(e) {
        if (!this.awaitingInput) return;
        if (e.key === 'd') {
            this.onUserInput(true);
            return true;
        } else if (e.key === 'i') {
            this.onUserInput(false);
            return true;
        }
        return false;
    }
}
const rhythmTestDefaultFrequency = 500;
const rhythmTestDefaultTimeBetweenStimuliMs = 1000;
const rhythmTestDefaultToneLengthMs = 30;
const rhythmTestDefaultToneRampDownMs = 30;
const rhythmTestDefaultToneIntervalMs = [150, 300, 450, 600];
const rhythmTestDefaultLengths = [5, 6, 7];
const rhythmTestDefaultCounts = [6, 6, 6];
const rhythmTestDefaultProbabilityOfSame = 0.5;
const rhythmTestDefaultStartPointChangeOnlyProb = 0.4;
const rhythmTestDefaultNoteSwapOnlyProb = 0.4;

const rhythmTest = new RhythmTest(rhythmTestDefaultLengths, rhythmTestDefaultCounts,
    rhythmTestDefaultToneRampDownMs, rhythmTestDefaultToneLengthMs, rhythmTestDefaultTimeBetweenStimuliMs,
    rhythmTestDefaultFrequency, rhythmTestDefaultToneIntervalMs, rhythmTestDefaultProbabilityOfSame,
    rhythmTestDefaultStartPointChangeOnlyProb, rhythmTestDefaultNoteSwapOnlyProb);

const pitchTestDefaultFrequency = 500;
const pitchTestDefaultRampUpMs = 30;
const pitchTestDefaultDurationMs = 530;
const pitchTestDefaultRampDownMs = 30;
const pitchTestDefaultSilenceMs = 1000;
const pitchTestDefaultDifferences = [17, 12, 8, 5, 4, 3, 2, 1];
const pitchTestDefaultCounts = [3, 3, 3, 4, 4, 4, 4, 2];

class PitchTest extends AbstractTest {
    rampUpMs = 30;
    rampDownMs = 30;
    durationMs = 530;
    silenceMs = 1000;
    toneFreq = 500;
    basePlayedFirst = false;
    /**
     * @type {Element}
     */
    higherButton;
    /**
     * @type {Element}
     */
    lowerButton;
    constructor(differences, counts, rampUpMs, rampDownMs, durationMs, silenceMs, toneFreq) {
        super(differences, counts);
        this.rampUpMs = rampUpMs;
        this.rampDownMs = rampDownMs;
        this.durationMs = durationMs;
        this.silenceMs = silenceMs;
        this.toneFreq = toneFreq;
        this.basePlayedFirst = false;
        this.nowPlayingDisplay = document.querySelector("div[id='pitch-test-now-playing']");
        this.startButton = document.querySelector("button[id='pitch-test-start']");
        this.stopButton = document.querySelector("button[id='pitch-test-stop']");
        this.higherButton = document.querySelector("button[id='pitch-test-higher']");
        this.lowerButton = document.querySelector("button[id='pitch-test-lower']");
        this.totalTestsDisplay = document.querySelector("span[id='pitch-test-total-tests']");
        this.passedTestsDisplay = document.querySelector("span[id='pitch-test-passed-tests']");
        this.failedTestDetails = document.querySelector("ol[id='pitch-test-fail-details']");
        this.higherButton.disabled = true;
        this.lowerButton.disabled = true;
    }

    onUserInput(higher) {
        if (!this.awaitingInput) return;

        if (higher === this.basePlayedFirst) {
            this.onTestPass();
        } else {
            const difference = this.tests[this.testIndex];
            const firstPitch = this.basePlayedFirst ? this.toneFreq : this.toneFreq + difference;
            const secondPitch = this.basePlayedFirst ? this.toneFreq + difference : this.toneFreq;
            this.onTestFail(`Test ${this.numTests} failed, frequencies were ${firstPitch}/${secondPitch}, was marked ${this.basePlayedFirst ? "Lower" : "Higher"}`);
        }
        this.runNextTest();
    }

    onTestFinish(){
        super.onTestFinish();
        this.higherButton.disabled = true;
        this.lowerButton.disabled = true;
        melodyTest.startButton.disabled = false;
        rhythmTest.startButton.disabled = false;
    }

    async runNextTest() {
        if (!await super.runNextTest()) return false;
        this.higherButton.disabled = true;
        this.lowerButton.disabled = true;
        const difference = this.tests[this.testIndex];
        this.basePlayedFirst = Math.random() < 0.5;
        const firstPitch = this.basePlayedFirst ? this.toneFreq : this.toneFreq + difference;
        const secondPitch = this.basePlayedFirst ? this.toneFreq + difference : this.toneFreq;
        if (this.stopping) return false;
        await delay(this.silenceMs);
        if (this.stopping) return false;
        this.nowPlayingDisplay.innerHTML = "Playing Pitch 1";
        await playToneWithRamp(firstPitch, this.durationMs, this.rampUpMs, this.rampDownMs);
        this.nowPlayingDisplay.innerHTML = "";
        if (this.stopping) return false;
        await delay(this.silenceMs);
        if (this.stopping) return false;
        this.nowPlayingDisplay.innerHTML = "Playing Pitch 2";
        await playToneWithRamp(secondPitch, this.durationMs, this.rampUpMs, this.rampDownMs);
        this.nowPlayingDisplay.innerHTML = "";
        if (this.stopping) return false;
        this.awaitingInput = true;
        this.higherButton.disabled = false;
        this.lowerButton.disabled = false;
        return true;
    }

    startTest() {
        melodyTest.startButton.disabled = true;
        rhythmTest.startButton.disabled = true;
        this.higherButton.disabled = true;
        this.lowerButton.disabled = true;
        super.startTest();
    }

    onKeyPress(e) {
        if (!this.awaitingInput) return false;
        if (e.key === 'h') {
            this.onUserInput(true);
            return true;
        } else if (e.key === 'l') {
            this.onUserInput(false);
            return true;
        }
        return false;
    }
}

const pitchTest = new PitchTest(pitchTestDefaultDifferences, pitchTestDefaultCounts,
    pitchTestDefaultRampUpMs, pitchTestDefaultRampDownMs, pitchTestDefaultDurationMs, pitchTestDefaultSilenceMs, pitchTestDefaultFrequency);

setup();

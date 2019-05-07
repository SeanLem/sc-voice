(typeof describe === 'function') && describe("sound-store", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const { execSync } = require('child_process');
    const tmp = require('tmp');
    const { MerkleJson } = require("merkle-json");
    const { logger } = require('rest-bundle');
    const {
        GuidStore,
        SoundStore,
        SuttaStore,
        Voice,
        VsmStore,
    } = require("../index");
    const LOCAL = path.join(__dirname, '..', 'local');
    const TEST_TEXT = [
        "That’s how you should train.",
        "So you should train like this:",
    ].join("\n");
    const TEST_VOLUME = "test-volume";
    const VOICE_OPTS = {
        usage: "recite",
        volume: 'other_en_sujato_aditi',
    };
    var mj = new MerkleJson();
    logger.level = 'warn';
    var storePath = tmp.tmpNameSync();
    var suttaStore = new SuttaStore();
    suttaStore.initialize();

    it("TESTTESTVsmStore() creates VSM", function() {
        var vsm = new VsmStore();
        should(vsm).instanceof(VsmStore);
        should(vsm).instanceof(SoundStore);
        should(vsm).instanceof(GuidStore);
        should(vsm.voice).instanceof(Voice);
        should(vsm.soundStore).instanceof(SoundStore);
        should(fs.existsSync(vsm.storePath)).equal(true);
        should(vsm.type).equal('VsmStore');
        should(vsm.storeName).equal('vsm');
        should(vsm.storePath).equal(path.join(LOCAL, 'vsm'));
        should(vsm.volume).equal('common');
        should(vsm.audioSuffix).equal('.mp3');
        should(vsm.audioFormat).equal('mp3');
        should(vsm.audioMIME).equal('audio/mp3');
    });
    it("TESTTESTVsmStore() creates custom VSM", function() {
        var aditi = Voice.createVoice({
            name: "aditi",
            usage: 'recite',
            languageUnknown: "pli",
            language: 'hi-IN',
            stripNumbers: true,
            stripQuotes: true,
        });
        var vsm = new VsmStore({
            voice: aditi,
        });
        should(vsm.storeName).equal('vsm');
        should(vsm.storePath).equal(path.join(LOCAL, 'vsm'));
        should(vsm.voice).equal(aditi);
    });
    it("TESTTESTimport(speakResult) copies resource files into VSM", function(done) {
        (async function() { try {
            var vsm = new VsmStore();
            var voice = vsm.voice;

            // Vsm.speak() returns similar result as voice.speak()
            var speakResult = await voice.speak(TEST_TEXT, VOICE_OPTS);
            var guid = speakResult.signature.guid;
            var importResult = await vsm.import(speakResult);
            should(importResult).properties({
                segments: speakResult.segments,
                signature: speakResult.signature,
            });
            var reFile = new RegExp(`${vsm.storePath}`,'u');
            should(importResult.file).match(reFile);
            should(fs.existsSync(importResult.file)).equal(true);

            // the importMap has all imported guids
            var guid = importResult.signature.guid;
            should(vsm.importMap[guid]).equal(importResult);

            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTspeak(text,opts) decorates voice.speak()", function(done) {
        (async function() { try {
            var vsm = new VsmStore();
            var voice = vsm.voice;

            // Vsm.speak() returns similar result as voice.speak()
            var resultVoice = await voice.speak(TEST_TEXT, VOICE_OPTS);
            var resultVsm = await vsm.speak(TEST_TEXT, VOICE_OPTS);
            should.deepEqual(resultVsm.signature, resultVoice.signature); 
            should.deepEqual(Object.keys(resultVsm).sort(),
                Object.keys(resultVoice).sort());

            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTimportSutta(sutta) imports sutta segments", function(done) {
        this.timeout(5*1000);
        (async function() { try {
            var vsm = new VsmStore();
            var results = await suttaStore.search("thig1.2");
            var {
                sutta,
                author_uid,
                lang,
                signature,
            } = results.results[0];
            var volume = "kn_pli_mahasangiti_aditi";
            vsm.clearVolume(volume);
            var sutta_uid = sutta.sutta_uid;
            var guidsOld = Object.assign({},vsm.importMap);
            var importResult = await vsm.importSutta(sutta);
            var guids = Object.keys(vsm.importMap).filter(guid => !guidsOld[guid]);
            should.deepEqual(importResult, {
                sutta_uid,
                volume,
                guids, // newly added guids
            });
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTarchiveVsm(volume) serializes Vsm", function(done) {
        (async function() { try {
            var vsm = new VsmStore();
            var voice = vsm.voice;
            var resultVsm = await vsm.speak(TEST_TEXT, VOICE_OPTS);

            var result = await vsm.archiveVsm(TEST_VOLUME);
            done();
        } catch(e) {done(e);} })();
    });
})

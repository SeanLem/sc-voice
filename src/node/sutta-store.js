(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
    } = require('rest-bundle');
    const Words = require('./words');
    const SuttaCentralApi = require('./sutta-central-api');
    const SuttaCentralId = require('./sutta-central-id');
    const SuttaFactory = require('./sutta-factory');
    const ROOT = path.join(__dirname, '..', '..', 'local', 'suttas');
    const SUTTAIDS_PATH = path.join(__dirname, '..', '..', 'src', 'node', 'sutta-ids.json');
    const COLLECTIONS = {
        an: {
            folder: 'an',
        },
        mn: {
            folder: 'mn',
        },
        dn: {
            folder: 'dn',
        },
        sn: {
            folder: 'sn',
        },
        thig: {
            folder: 'kn',
        },
        thag: {
            folder: 'kn',
        }
    }

    class SuttaStore {
        constructor(opts={}) {
            this.suttaCentralApi = opts.suttaCentralApi || new SuttaCentralApi();
            this.suttaFactory = opts.suttaFactory || new SuttaFactory({
                suttaCentralApi: this.suttaCentralApi,
            });
            this.suttaIds = opts.suttaIds || SuttaCentralId.supportedSuttas;
            this.root = opts.root || ROOT;
            Object.defineProperty(this, 'isInitialized', {
                writable: true,
                value: false,
            });
        }

        initialize() {
            if (this.isInitialized) {
                return Promise.resolve(this);
            }
            this.isInitialized = true;
            var that = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    await that.suttaFactory.initialize();
                    if (!fs.existsSync(that.root)) {
                        fs.mkdirSync(that.root);
                    }
                    //if (that.suttaIds == null) {
                        //if (fs.existsSync(SUTTAIDS_PATH)) {
                            //logger.debug(`SuttaStore.initialize() loading:${SUTTAIDS_PATH}`);
                            //that.suttaIds = JSON.parse(fs.readFileSync(SUTTAIDS_PATH));
                        //} else {
                            //that.suttaIds = [];
                        //}
                    //}
                    resolve(that);
                } catch(e) {reject(e);} })();
            });
        }

        *collectionIterator(collection=null) {
            const n = 10;
            for (let i=0; i<n; i++) {
                yield i;
            }
            return n;
        }

        updateSuttas(suttaIds, opts={}) {
            var that = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var maxAge = opts.maxAge || 0;
                    suttaIds = suttaIds || that.suttaIds;
                    for (let i = 0; i < suttaIds.length; i++) {
                        var id = suttaIds[i];
                        var sutta = await that.suttaCentralApi.loadSutta(id);
                        var translation = sutta.translation;
                        if (translation == null) {
                            logger.info(`SuttaStore.updateSuttas() ${id} NO TRANSLATION`);
                        } else {
                            var language = translation.lang;
                            var author_uid = translation.author_uid;
                            var spath = that.suttaPath(id, language, author_uid);
                            var updateFile = !fs.existsSync(spath) || maxAge === 0;
                            if (!updateFile) {
                                var stats = fs.statSync(spath);
                                var age = (Date.now() - stats.mtime)/1000;
                                updateFile = age > maxAge;
                            }
                            if (updateFile) {
                                fs.writeFileSync(spath, JSON.stringify(sutta, null, 2));
                                logger.info(`SuttaStore.updateSuttas() ${id}`);
                            }
                        }
                    };
                    resolve(suttaIds);
                } catch(e) {reject(e);} })();
            });
        }

        suttaFolder(sutta_uid) {
            var group = sutta_uid.replace(/[^a-z]*/gu,'');
            var folder = Object.keys(COLLECTIONS).reduce((acc,key) => {
                var c = COLLECTIONS[key];
                return acc || c.folder===group && c.folder;
            }, null);
            if (!folder) {
                throw new Error(`unsupported sutta: ${sutta_uid}`);
            }
            var fpath = path.join(this.root, folder);
            if (!fs.existsSync(fpath)) {
                logger.info(`SuttaStore.suttsFolder() mkdir:${fpath}`);
                fs.mkdirSync(fpath);
            }
            return fpath;
        }

        suttaPath(...args) {
            if (!this.isInitialized) {
                throw new Error("SuttaStore.initialize() is required");
            }
            if (typeof args[0] === 'string') {
                var opts = {
                    sutta_uid: args[0],
                    language: args[1],
                    author_uid: args[2],
                }
            } else {
                var opts = args[0];
            }
            var sutta_uid = SuttaCentralId.normalizeSuttaId(opts.sutta_uid);
            if (!sutta_uid) {
                throw new Error('sutta_uid is required');
            }
            var folder = this.suttaFolder(sutta_uid);
            var language = opts.language || 'en';
            var langPath = path.join(folder, language);
            if (!fs.existsSync(langPath)) {
                fs.mkdirSync(langPath);
            }
            var author_uid = opts.author_uid;
            if (!author_uid) {
                throw new Error(`author_uid is required for: ${sutta_uid}`);
            }
            var authorPath = path.join(langPath, author_uid);
            if (!fs.existsSync(authorPath)) {
                fs.mkdirSync(authorPath);
            }
            var fname = this.suttaIds.filter(id => {
                return 0 === SuttaCentralId.compare(sutta_uid, id);
            })[0] || sutta_uid;
            return path.join(authorPath, `${fname}.json`);
        }

    }

    module.exports = exports.SuttaStore = SuttaStore;
})(typeof exports === "object" ? exports : (exports = {}));

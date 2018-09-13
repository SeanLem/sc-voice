(function(exports) {
    const fs = require('fs');
    const path = require('path');

    class Words { 
        constructor(json, opts={}) {
            this.language = opts.language || 'en';
            if (json == null) {
                var filePath = opts.filePath 
                    || path.join(__dirname, `../../words/${this.language}.json`);
                if (!fs.existsSync(filePath)) {
                    var filePath = path.join(__dirname, `../../words/en.json`);
                }
                json = fs.existsSync(filePath)
                    ? JSON.parse(fs.readFileSync(filePath))
                    : {
                        symbols: {},
                        words: {},
                    };
            } 
            this.symbols = json.symbols;
            this.words = json.words;
            this._ipa = opts.ipa || json.ipa || {};
            this._ipa.vowels == null && (this._ipa.vowels = "aeiou");
            this._romanize = json.romanize || {};
            this.wordEnd = json.wordEnd;
            this.altMap = null;
            this.alphabet = new RegExp(json.alphabet || '[a-z]*', "iu");
            var symAcc= Object.keys(this.symbols).reduce((acc,text) => {
                if (text === ']') {
                    text = '\\' + text;
                }
                acc.text += text;
                return acc;
            }, { text: '' });
            this.symbolPat = new RegExp(`[${symAcc.text}]`);
        }

        static get U_LSQUOTE() { return '\u2018'; }
        static get U_RSQUOTE() { return '\u2019'; }
        static get U_LDQUOTE() { return '\u201C'; }
        static get U_RDQUOTE() { return '\u201D'; }
        static get U_HYPHEN() { return '\u2010'; }
        static get U_ENDASH() { return '\u2013'; }
        static get U_EMDASH() { return '\u2014'; }
        static get U_ELLIPSIS() { return '\u2026'; }
        static get U_A_MACRON() { return '\u0100'; }
        static get U_a_MACRON() { return '\u0101'; }
        static get U_u_MACRON() { return '\u016d'; /* UTF-8 c5ab */ }

        static levenshtein(s,t) {
            if (s.length == 0) {
                return t.length;
            }
            if (t.length == 0) {
                return s.length;
            }
            var d = new Array(s.length+1).fill(null).map(() => new Array(t.length+1).fill(null));
            for (var i = 0; i <= s.length; i++) {
                d[i][0] = i;
            }
            for (var j = 0; j <= t.length; j++) {
                d[0][j] = j;
            }

            for (var i = 1; i <= s.length; i++) {
                var si = s.charAt(i - 1);
                for (var j = 1; j <= t.length; j++) {
                    var tj = t.charAt(j - 1);
                    var cost = si === tj ? 0 : 1;
                    d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + cost);
                }
            }
            return d[s.length][t.length];
        }
        
        static commonPhrase(a,b, minLength=0) {
            var re = new RegExp(`[ ${Words.U_EMDASH}]`);
            var x = a.split(re);
            var y = b.split(re);
            var c = new Array(x.length+1).fill(null).map(() => new Array(y.length+1).fill(null));
            for (var i = 0; i <= x.length; i++) {
                c[i][0] = 0;
            }
            for (var j = 0; j <= y.length; j++) {
                c[0][j] = 0;
            }
            var lcs = []
            for (var i = 1; i <= x.length; i++) {
                for (var j = 1; j <= y.length; j++) {
                    if (x[i-1] === y[j-1]) {
                        c[i][j] = c[i-1][j-1] + 1;
                        lcs[c[i][j]] = x[i-1];
                    } else if (c[i][j-1] > c[i-1][j]) {
                        c[i][j] = c[i][j-1];
                    } else {
                        c[i][j] = c[i-1][j];
                    }
                }
            }
            while (1 < lcs.length) {
                if (a.indexOf(`${lcs[0]} ${lcs[1]}`) < 0) {
                    lcs.shift();
                } else if (a.indexOf`${lcs[lcs.length-2]} ${lcs[lcs.length-1]}` < 0) {
                    lcs.pop();
                }
                var pat = lcs.join(' ');
                if (a.indexOf(pat) >= 0 && b.indexOf(pat) >= 0) {
                    if (pat.length < minLength) {
                        return '';
                    }
                    return pat;
                }
            }
            return '';
        }
                            
        isWord(token) {
            return !this.symbolPat.test(token) && !/^[0-9]*$/.test(token);
        }

        isForeignWord(token) {
            return !this.symbolPat.test(token) && !this.alphabet.test(token);
        }

        romanize(text) {
            if (this.romanizePats == null) {
                var srcChars = Object.keys(this._romanize);
                this.romanizePats = srcChars.map(c => ({
                    rep: this._romanize[c],
                    pat: new RegExp(c, "gui"),
                }));
            }
            var result = text.toLowerCase();
            this.romanizePats.forEach((pat,i) => {
                result = result.replace(pat.pat, pat.rep);
            });
            return result;
        }

        tokenize(text) {
            return text.split(' ').reduce((acc,t) => {
                for (var matches;  (matches = this.symbolPat.exec(t)); ) {
                    if (matches.index) {
                        var c = matches[0];
                        if (matches.index < t.length-1 && (
                            c === Words.U_RSQUOTE || c === Words.U_RDQUOTE
                            || c === "'" || c === '"')) {
                            acc.push(t);
                            t = "";
                        } else {

                            acc.push(t.substring(0, matches.index));
                            acc.push(t.substring(matches.index,matches.index+1));
                            t = t.substring(matches.index+1);
                        }
                    } else {
                        acc.push(t.substring(matches.index,matches.index+1));
                        t = t.substring(matches.index+1);
                    }
                }
                t && acc.push(t);
                return acc;
            }, []);
        }

        canonical(word) {
            return this.words[word] || null;
        }

        lookup(word) {
            word = word.toLowerCase();
            var value = this.words[word];
            if (typeof value === 'string') {
                value = this.lookup(value);
            }
            return value && Object.assign({ word }, value) || null;
        }

        add(word, opts={}) {
            word = word.toLowerCase();
            var value = this.words[word];
            var language = opts.language || this.language;
            if (value == null) {
                var def = {};
                if (opts.ipa) {
                    def.ipa = opts.ipa;
                } else if (language !== this.language) {
                    def.ipa = this.ipa(word, opts.language);
                }
            } else if (typeof value == 'string') {
                var def = this.words[value];
            } else {
                var def = value;
            }
            var alternates = opts.alternates || [word];
            if (value == null) {
                alternates.forEach(alt => {
                    alt !== word && (this.words[alt] = word);
                    if (language !== this.language) {
                        var roman = this.romanize(alt);
                        roman !== word && (this.words[roman] = word);
                    }
                });
                this.words[word] = def;
            } else if (typeof value === 'string') {
                // TODO
            } else {
                // TODO
            }
        }

        alternates(word) {
            word = word.toLowerCase();
            if (this.altMap == null) {
                this.altMap = {};
                Object.keys(this.words).forEach(key => {
                    var value = this.words[key];
                    if (value == null) {
                        // undefined word
                    } else if (typeof value === 'string') { // key is alternate
                        let keyAlts = this.altMap[value];
                        if (keyAlts) {
                            keyAlts.push(key); // key is alternate
                            this.altMap[key] = keyAlts;
                        } else {
                            this.altMap[value] = 
                            this.altMap[key] = [value,key];
                        }
                    } else { // key is canonical
                        let keyAlts = this.altMap[key];
                        if (keyAlts == null) {
                            this.altMap[key] = [key];
                        }
                    }
                });
            }

            return this.altMap[word] || [word];
        }

        static utf16(text,minCode=0) {
            var result = "";
            for (var i=0; i < text.length; i++) {
                var code = text.charCodeAt(i);
                var c = text.charAt(i);
                if (code > minCode) {
                    var hex  = '000' + code.toString(16).toUpperCase();
                    c = `\\u${hex.substring(hex.length-4)}`;
                }
                result += c;
            }
            return result;
        }

        ipa(text,language='pli') {
            text = text.toLowerCase();
            var map = this._ipa[language];
            if (map == null) {
                return text;
            }
            var result = String(text);
            var keys = Object.keys(map).sort((a,b) => {
                var c = a.length - b.length;
                if (c) {
                    return -c;
                }
                return a.localeCompare(b);
            });
            var pats = keys.map(key => {
                var value = Words.utf16(map[key]).toUpperCase();
                var pat = new RegExp(`${key}`,"ug");
                result = result.replace(pat, value);
            });
            result = result.replace(/U/g,'u').replace("\n", " ");
            return eval(`"${result}"`);
        }

        alternatesRegExp(text) {
            var words = this.tokenize(text);
            var pat = words.reduce((acc,word) => {
                var alts = this.alternates(word);
                var wordPat = (alts.length === 1)
                    ? alts[0]
                    : `(${alts.join('|')})`;
                acc = acc ? `${acc} ${wordPat}` : wordPat;
                return acc;
            }, "");
            var wordEnd = this.wordEnd || "";
            return new RegExp(`${pat}${wordEnd}`, "iu");
        }


    }

    module.exports = exports.Words = Words;
})(typeof exports === "object" ? exports : (exports = {}));

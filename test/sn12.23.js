(typeof describe === 'function') && describe("sn12.23", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const { logger } = require('rest-bundle');
    const {
        Section,
        Sutta,
        SuttaFactory,
        SuttaCentralId,
        SuttaCentralApi,
        Voice,
        Words,
    } = require("../index");
    const LOCAL = path.join(__dirname, '../local');
    const SC = path.join(LOCAL, 'sc');

    it("expandSutta(sutta) expands sn12.23", function(done) {
        done();return; //TODO
        this.timeout(10*1000);
        (async function() { try {
            var suttaCentralApi = await new SuttaCentralApi().initialize();
            var factory = new SuttaFactory({
                suttaCentralApi,
            });
            var sutta = await factory.loadSutta('sn12.23');
            should.deepEqual(Object.keys(sutta).sort(), [
                'translation', 'suttaCode', 'sutta_uid', 'author_uid', 
                'sections', 'support', 'suttaplex'].sort());
            should(sutta.sutta_uid).equal('sn12.23');
            var sutta2 = factory.expandSutta(sutta);
            should(sutta2).instanceOf(Sutta);
            should(sutta2.author_uid).match('sujato');
            var sections = sutta2.sections;
            should(sections.length).equal(2);
            should.deepEqual(sections.map(section => section.expandable), [
                false, true, 
            ]);
            should.deepEqual(sections.map(section => section.segments.length), [
                2, 10, 98, 97, 97, 97, 97, 97, 97, 148,
            ]);
            should.deepEqual(sections.map(section => section.expanded), [
                false, false, true, true, true, true, true, true, true, true,
            ]);
            var sectSegs = sections.reduce((acc,section) => {
                section.segments.forEach(seg => acc.push(seg));
                return acc;
            }, []);
            should.deepEqual(sectSegs, sutta2.segments);

            var jsonPath = path.join(__dirname, '../public/sutta/test1/en/sujato');
            fs.writeFileSync(jsonPath, JSON.stringify(sutta2, null, 2));

            done();
        } catch(e) { done(e); } })();
    });
});


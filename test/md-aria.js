(typeof describe === 'function') && describe("md-aria", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        MdAria,
    } = require('../index');

    it("TESTTESTcreates <detail> from headings", function(){
        var mdAria = new MdAria();
        var html = mdAria.toHtml([
            'a',
            '# b',
            'b1',
            '## c',
            'c1',
        ].join('\n'));
        should.deepEqual(html.split('\n'), [
            'a',
            '<detail>',
            '<summary>b</summary>',
            'b1',
            '</detail>',
            '<detail>',
            '<summary>c</summary>',
            'c1',
            '</detail>',
        ]);
    });
    it("TESTTESTcreates <ul> from starred lines", function(){
        var mdAria = new MdAria();
        var html = mdAria.toHtml([
            'a',
            '* b1',
            '* b2',
            '',
            'c',
        ].join('\n'));
        should.deepEqual(html.split('\n'), [
            'a',
            '<ul>',
            '<li>b1</li>',
            '<li>b2</li>',
            '</ul>',
            '<p>',
            'c',
            '</p>',
        ]);
    });
    it("TESTTESTcreates <p> from blank lines", function(){
        var mdAria = new MdAria();
        var html = mdAria.toHtml([
            '',
            'a',
            'a1',
            '',
            'b',
            'b1',
            '',
            '',
            'c',
            'c1',
            '',
        ].join('\n'));
        should.deepEqual(html.split('\n'), [
            '<p>',
            'a',
            'a1',
            '</p>',
            '<p>',
            'b',
            'b1',
            '</p>',
            '<p>',
            'c',
            'c1',
            '</p>',
        ]);
    });
    it("TESTTESTcreates <p> from blank lines", function(){
        var mdAria = new MdAria();
        var html = mdAria.toHtml([
            'x [x1](x2) x3',
            '* y [y1](y2) y3',
        ].join('\n'));
        should.deepEqual(html.split('\n'), [
            `x <a href="x2">x1</a> x3`,
            '<ul>',
            `<li>y <a href="y2">y1</a> y3</li>`,
            '</ul>',
        ]);
    });
})

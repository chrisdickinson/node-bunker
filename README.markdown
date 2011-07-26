bunker
======

Bunker is a module to calculate code coverage using native javascript
[burrito](https://github.com/substack/node-burrito) AST trickery.

![code coverage](http://substack.net/images/code_coverage.png)

examples
========

tiny
----

````javascript
var bunker = require('bunker');
var b = bunker('var x = 0; for (var i = 0; i < 30; i++) { x++ }');

var counts = {};

b.on('node', function (node) {
    if (!counts[node.id]) {
        counts[node.id] = { times : 0, node : node };
    }
    counts[node.id].times ++;
});

b.run();

Object.keys(counts).forEach(function (key) {
    var count = counts[key];
    console.log(count.times + ' : ' + count.node.source());
});
````

output:

    $ node example/tiny.js 
    1 : var x=0;
    31 : i<30
    30 : i++
    30 : x++;
    30 : x++

methods
=======

var bunker = require('bunker');

var b = bunker(src)
-------------------

Create a new bunker code coverageifier with some source `src`.

The bunker object `b` is an `EventEmitter` that emits `'node'` events with two
parameters:

* `node` - the [burrito](https://github.com/substack/node-burrito) node object
* `stack` - the stack, [stackedy](https://github.com/substack/node-stackedy) style

b.include(src)
--------------

Include some source into the bunker.

b.compile()
-----------

Return the source wrapped with burrito.

b.run(context={})
-----------------

Run the source using `vm.runInNewContext()` with some `context`.

statics
=======
var bunker = require('bunker');

var coverage = bunker.cover([RegExp | path]);
-------

Attach bunker to the global `require` object and patch `require.extensions['.js']` to
provide coverage metadata for all files required after this point. Returns a function
object that can be called to obtain a object keying files to `CoverageData` objects, with 
a method for releasing control back to vanilla `require`. Usage:

````javascript

var coverage = bunker.cover(/.*/g);

require('some/library');

coverage(function(coverageData) {
    // coverageData is an object keyed by filename.
    var stats = coverageData['/full/path/to/file.js'].stats()

    // the percentage of lines run versus total lines in file
    console.log(stats.percentage);

    // the number of missing lines
    console.log(stats.missing);

    // the number of lines run (seen)
    console.log(stats.seen);

    // an array of line objects representing 'missed' lines
    stats.lines;

    stats.lines.forEach(function(line) {
        // the line number of the line:
        console.log(line.number);

        // returns a string containing the source data for the line:
        console.log(line.source());   
    }); 
   
    // return control back to the original require function
    coverage.release(); 
});
````


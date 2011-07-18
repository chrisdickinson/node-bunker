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
    if (!counts[node.range]) {
        counts[node.range] = { times : 0, node : node };
    }
    counts[node.range].times ++;
});

b.run();

Object.keys(counts).forEach(function (key) {
    var count = counts[key];
    console.log(count.times + ' : ' + count.node.source());
});
````

output:

    $ node example/tiny.js 
    31 : i<30
    60 : x++;
    30 : i++

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

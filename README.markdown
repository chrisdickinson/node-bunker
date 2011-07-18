bunker
======

Bunker is a module to calculate code coverage using native javascript
[burrito](https://github.com/substack/node-burrito) AST trickery.

![code coverage](http://substack.net/images/code_coverage.png)

examples
========

top
---

example/top/run.js:

````javascript

var bunker = require('../../');
var fs = require('fs');
var src = fs.readFileSync(__dirname + '/src.js', 'utf8');

var counts = {};

var b = bunker(src);
b.on('node', function (node) {
    if (!counts[node.range]) {
        counts[node.range] = { times : 0, node : node };
    }
    counts[node.range].times ++;
});

b.run({
    setInterval : setInterval,
    clearInterval : clearInterval,
    end : function () {
        Object.keys(counts)
            .sort(function (a, b) {
                return counts[b].times - counts[a].times
            })
            .forEach(function (key) {
                var count = counts[key];
                console.log(count.times + ' ' + count.node.source());
            })
        ;
    }
});
````

example/top/src.js:

````javascript
function boop () {
    for (var i = 0; i < 30; i++) {
        nop();
    }
}

function nop () {
    return undefined;
}

var times = 0;
var iv = setInterval(function () {
    if (++times === 10) {
        clearInterval(iv);
        end();
    }
    else boop()
}, 100);
````

output:


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

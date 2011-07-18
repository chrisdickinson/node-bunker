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

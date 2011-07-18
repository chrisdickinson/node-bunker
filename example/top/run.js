var bunker = require('../../');
var fs = require('fs');
var src = fs.readFileSync(__dirname + '/src.js', 'utf8');

var counts = {};

var b = bunker(src);
b.on('node', function (node) {
    var key = [ node.start.line, node.start.col ].join(':')
        + '-' + [ node.end.line, node.end.col ].join(':')
    ;
    if (!counts[key]) {
        counts[key] = { times : 0, node : node };
    }
    counts[key].times ++;
});

b.run({
    setInterval : setInterval,
    clearInterval : clearInterval,
    end : function () {
        console.dir(counts);
    }
});

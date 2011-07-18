var burrito = require('burrito');
var vm = require('vm');
var EventEmitter = require('events').EventEmitter;

module.exports = function (src) {
    var b = new Bunker();
    if (src) b.include(src);
    return b;
};

function Bunker () {
    this.sources = [];
    this.nodes = [];
    
    this.names = {
        call : burrito.generateName(6),
        expr : burrito.generateName(6),
        stat : burrito.generateName(6)
    };
}

Bunker.prototype = new EventEmitter;

Bunker.prototype.include = function (src) {
    this.sources.push(src);
    this.source = null;
    return this;
};

Bunker.prototype.compile = function () {
    var src = this.sources.join('\n');
    var nodes = this.nodes;
    var names = this.names;
    
    return burrito(src, function (node) {
        var i = nodes.length;
        
        if (node.name === 'call') {
            nodes.push(node);
            node.wrap(names.call + '(' + i + ')(%s)');
        }
        else if (node.name === 'stat' || node.name === 'throw') {
            nodes.push(node);
            node.wrap('{' + names.stat + '(' + i + ');%s}');
        }
        else if (node.name === 'binary') {
            nodes.push(node);
            node.wrap(names.expr + '(' + i + ')(%s)');
        }
        else if (node.name === 'unary-postfix' || node.name === 'unary-prefix') {
            nodes.push(node);
            node.wrap(names.expr + '(' + i + ')(%s)');
        }
        
        if (i !== nodes.length) {
            node.range = [ node.start.line, node.start.col ].join(':')
                + '-' + [ node.end.line, node.end.col ].join(':')
            ;
        }
    });
};

Bunker.prototype.run = function (context) {
    if (!context) context = {};
    
    var self = this;
    var stack = [];
    var src = self.compile();
    
    context[self.names.call] = function (i) {
        var node = self.nodes[i];
        stack.unshift(node);
        self.emit('node', node, stack);
        
        return function (expr) {
            stack.shift();
            return expr;
        };
    };
    
    context[self.names.expr] = function (i) {
        var node = self.nodes[i];
        self.emit('node', node, stack);
        
        return function (expr) {
            return expr;
        };
    };
    
    context[self.names.stat] = function (i) {
        var node = self.nodes[i];
        self.emit('node', node, stack);
    };
    
    vm.runInNewContext(src, context);
    
    return self;
};

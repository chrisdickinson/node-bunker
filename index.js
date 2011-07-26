var burrito = require('burrito');
var vm = require('vm');
var EventEmitter = require('events').EventEmitter;
var Module = require('module');
var path = require('path');
var fs = require('fs');

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
        else if (node.name === 'stat' || node.name === 'throw'
        || node.name === 'var') {
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
            node.id = i;
        }
    });
};

Bunker.prototype.contributeToContext = function(context) {
  context = context || {};
  var self = this;
  var stack = [];
  
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

  return context;
};

Bunker.prototype.run = function (context) {
    var src = this.compile();
    context = this.contributeToContext(context);

    vm.runInNewContext(src, context);

    return this;

    if(Module._contextLoad) { 
    } else {
      var wrapped = Moudle.wrap(src);
      wrapped = 'function(ctxt) { with(ctxt) { return '+wrapped+'; } }';

      return vm.runInThisContext(src, context);
    }
    return self;
};

function CoverageData (filename, bunker) {
  this.bunker = bunker;
  this.filename = filename;
  this.nodes = {};
};

CoverageData.prototype.visit = function(node) {
  ++(this.nodes[node.id] = this.nodes[node.id] || {node:node, count:0}).count;
};

CoverageData.prototype.missing = function() {
  var nodes = this.nodes,
      missing = this.bunker.nodes.filter(function(node) {
        return !nodes[node.id];
      });

  return missing;
};

CoverageData.prototype.stats = function() {
  var missing = this.missing(),
      filedata = fs.readFileSync(this.filename, 'utf8').split('\n');

  var seenLines = [],
      lines = 
      missing.sort(function(lhs, rhs) {
        return lhs.node[0].start.line < rhs.node[0].start.line ? -1 :
               lhs.node[0].start.line > rhs.node[0].start.line ? 1  :
               0;
      }).filter(function(node) {
        var okay = (seenLines.indexOf(node.node[0].start.line) < 0);
        if(okay)
          seenLines.push(node.node[0].start.line);
        return okay;

      }).map(function(node) {
        return {
          line:node.node[0].start.line,
          source:function() { return filedata[node.node[0].start.line]; }
        };
      });

  return {
    percentage:(filedata.length-seenLines.length)/filedata.length,
    lines:lines,
    missing:seenLines.length,
    seen:(filedata.length-seenLines.length)
  };
};

module.exports.createEnvironment = function(module, filename) {
    var req = function(path) {
      return Module._load(path, module);
    };
    req.resolve = function(request) {
      return Module._resolveFilename(request, module)[1];
    }
    req.paths = Module._paths;
    req.main = process.mainModule;
    req.extensions = Module._extensions;
    req.registerExtension = function() {
      throw new Error('require.registerExtension() removed. Use ' +
                      'require.extensions instead.');
    }
    require.cache = Module._cache;

    var ctxt = {};
    for(var k in global)
      ctxt[k] = global[k];

    ctxt.require = req;
    ctxt.exports = module.exports;
    ctxt.__filename = filename;
    ctxt.__dirname = path.dirname(filename);
    ctxt.process = process;
    ctxt.console = console;
    ctxt.module = module;
    ctxt.global = ctxt;

    return ctxt;
};

module.exports.cover = function(fileRegex) {
  var originalRequire = require.extensions['.js'],
      coverageData = {},
      match = fileRegex instanceof RegExp ?
        fileRegex : new RegExp(
            fileRegex ? fileRegex.replace(/\//g, '\\/').replace(/\./g, '\\.') : '.*'
        , 'g'),
      bunker = this;

  require.extensions['.js'] = function(module, filename) {
    if(!match.test(filename)) return originalRequire(module, filename);

    var context = bunker.createEnvironment(module, filename),
        data = fs.readFileSync(filename, 'utf8'),
        bunkerized = new Bunker(),
        coverage = coverageData[filename] = new CoverageData(filename, bunkerized);

    bunkerized.include(data); 
    bunkerized.on('node', coverage.visit.bind(coverage));
    bunkerized.contributeToContext(context);

    var wrapper = '(function(ctxt) { with(ctxt) { return '+Module.wrap(bunkerized.compile())+'; } })',
        compiledWrapper = vm.runInThisContext(wrapper, filename, true)(context);

    var args = [context.exports, context.require, module, filename, context.__dirname];
    return compiledWrapper.apply(module.exports, args);
  };

  var retval = function(ready) {
    ready(coverageData);
  };

  retval.release = function() {
    require.extensions['.js'] = originalRequire;
  };

  return retval;
};


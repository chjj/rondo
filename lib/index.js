/**
 * Rondo (github.com/chjj/rondo)
 * Copyright (c) 2011, Christopher Jeffrey
 */

#include "head.js"

/**
 * Module Loading
 */

var require = function(name) {
  var path = require.resolve(name)
    , module = require.cache[path]
    , func
    , ret;

  if (!module) {
    throw new
      Error('Cannot find module \'' + name + '\'');
  }

  if (!module.exports) {
    func = module;
    module = { exports: {} };
    require.cache[path] = module;
    ret = func(require, module.exports, module);
    if (ret !== undefined) module.exports = ret;
  }

  return module.exports;
};

require.cache = {};
require.main = require;

require.resolve = function(path) {
  return path.replace(/^\.?\//, '')
             .replace(/\.js$/, '');
};

require.define = function(name, func) {
  name = require.resolve(name);
  func.id = name;
  func.require = require;
  require.cache[name] = func;
};

window.require = require;

/**
 * Module Definition
 */

// TODO write a new build script
require.define('dom', function(require, exports, module) {
  #include "dom.js"
  #include "select.js"
  #include "ev.js"
});

require.define('io', function(require, exports, module) {
  #include "io.js"
});

require.define('app', function(require, exports, module) {
  #include "app.js"
});

require.define('router', function(require, exports, module) {
  #include "router.js"
});

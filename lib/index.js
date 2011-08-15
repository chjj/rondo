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
    module = { 
      exports: {}, 
      id: path, 
      require: require 
    };
    require.cache[path] = module;
    ret = func(require, module.exports, module);
    if (ret !== undefined) module.exports = ret;
  }

  return module.exports;
};

require.cache = 
require.modules = {};
require.main = require;

require.resolve = function(path) {
  return path.replace(/^\.?\//, '')
             .replace(/\.js$/, '');
};

require.define = function(name, func) {
  name = require.resolve(name);
  require.cache[name] = func;
};

var require_ = window.require;
if (require_) {
  window.require = function(path) {
    try {
      return require(path);
    } catch(e_) {
      try {
        return require_(path);
      } catch(e) {
        throw e_;
      }
    }
  };
} else {
  window.require = require;
}

/**
 * Module Definition
 */

// TODO write a new build script
require.define('dom', function(require, exports, module) {
  #include "dom.js"
  #include "select.js"
  #include "ev.js"
  #include "proto.js"
});

require.define('io', function(require, exports, module) {
  #include "io.js"
});

require.define('app', function(require, exports, module) {
  #include "app.js"
});

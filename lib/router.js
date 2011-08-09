/**
 * Modified Vanilla Router
 * Copyright (c) 2011, Christopher Jeffrey
 */

var slice = [].slice;

var router = (function() {
  var methods = [ 
    'get', 
    'post', 
    'head', 
    'put', 
    'delete' 
  ];

  methods.each = function(func) {
    var i = this.length;
    while (i--) func(this[i]);
  };

  var flatten = function(obj) {
    var out = [];
    (function flatten(obj) {
      var i = 0
        , l = obj.length;
      for (; i < l; i++) {
        if (typeof obj[i] === 'object') {
          flatten(obj[i]);
        } else {
          out.push(obj[i]);
        }
      }
    })(obj);
    return out;
  };

  // compile an expression
  var compile = function(path, handler) {
    if (typeof handler === 'function') {
      handler = [handler];
    }

    if (!handler.length) {
      throw new
        Error('Handler expected.');
    } else if (handler.length === 1) {
      handler = handler[0];
    } else {
      var stack = handler;
      handler = function(req, res, out) {
        var i = 0;
        (function next(err) {
          if (err) return out(err);
          var handler = stack[i++];
          if (!handler) return out();
          try {
            handler(req, res, next);
          } catch(e) {
            out(e);
          }
        })();
      };
    }

    if (!path || path === '*') {
      return handler;
    }
    handler.map = [];
    if (typeof path !== 'string') {
      handler.route = path;
      return handler;
    }

    if (path[0] !== '/') {
      path = '/' + path + '/*$|^/' + path;
    }

    path = path
      .replace(/([^\/]+)\?/g, '(?:$1)?')
      .replace(/\.(?!\+)/g, '\\.')
      .replace(/\*/g, '.*?')
      .replace(/%/g, '\\')
      .replace(/:(\w+)/g, function(__, name) {
        handler.map.push(name);
        return '([^/]+)';
      }
    );

    handler.route = new RegExp('^' + path + '$');

    return handler;
  };

  return function(app) {
    var routes = app.routes = {};

    // add a route, ensure methods existence
    var add = function(method, route) {
      method = method.toUpperCase();
      if (!routes[method]) routes[method] = [];
      routes[method].push(route);
    };

    // the actual function to designate routes
    var route = function() { 
      var handlers = slice.call(arguments)
        , route
        , method
        , path;

      if (typeof handlers[handlers.length-1] === 'string') {
        method = handlers.pop();
      }
      // string or regex
      if (handlers[0].match || handlers[0].test) {
        path = handlers.shift();
      }

      handlers = flatten(handlers);
      route = compile(path, handlers);

      if (!method) {
        methods.each(function(method) {
          add(method, route);
        });
      } else {
        add(method, route);
        if (method === 'get') {
          add('head', route);
        }
      }

      return app;
    };

    // all the route functions
    methods.each(function(method) {
      app[method] = function() {
        var args = slice.call(arguments);
        args.push(method);
        return route.apply(this, args);
      };
    });

    app.del = app['delete'];
    app.all = route;

    var match = function(handler, req) {
      var route = handler.route;
      if (!route || (cap = route.exec(req.pathname))) {
        if (cap) {
          var i = 1
            , l = cap.length;
          for (; i < l; i++) {
            req.params[route.map[i] || i-1] = cap[i];
          }
        }
        return true;
      }
    };

    /**
     * Modifications
     */

    var request = require('io').Request
      , entry;

    // XXX although we optimize the stack
    // entry point here, its still not ideal
    // because the regex is matched twice.
    var find = function(uri, method) {
      entry = 0;

      var stack = routes[method || 'GET']
        , i = 0
        , l = stack.length
        , route;

      for (; i < l; i++) {
        route = stack[i].route;
        if (!route || route.test(uri)) {
          entry = i;
          return true;
        }
      }
    };

    var dispatch = function(uri, method, form) {
      var req = new request(uri, method, form);

      method = req.method;
      uri = req.pathname;
      req.next = next;

      var i = entry || 0
        , stack = routes[method];

      if (!stack) {
        return console.error('Bad method.');
      }

      function next(err) {
        var handler = stack[i++];

        if (!handler) {
          if (!err) err = new Error('Bottom of stack.');
          console.error(err.stack || err + '');
          return;
        }

        if (!match(handler, req)) {
          return next(err);
        }

        try {
          if (err) {
            if (handler.length === 3) {
              handler(err, req, next);
            } else {
              next(err);
            }
          } else if (handler.length < 3) {
            handler(req, next);
          } else {
            next();
          }
        } catch(e) {
          next(e);
        }
      }

      next();
    };

    dispatch.find = find;
    dispatch.dispatch = dispatch;

    return dispatch;
  };
})();

module.exports = router;

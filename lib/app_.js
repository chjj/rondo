/**
 * Application
 */

var DOM = require('dom')
  , app = exports;

app.settings = {
  env: window.ENV
       || 'production'
};

app.set = function(key, val) {
  if (val === undefined) return app.settings[key];
  app.settings[key] = val;
};

app.configure = function(env, func) {
  if (!func || env === app.settings.env) (func || env)();
};

app.render = (function() {
  var compile = (function() {
    var cache = {};
    return function(id) {
      if (!cache[id]) {
        var template = app.settings.engine
          , el = DOM.select(id)[0];
        if (template.compile) {
          app.settings.engine =
            template = template.compile;
        }
        cache[id] = template(DOM.getContent(el));
      }
      return cache[id];
    };
  })();
  return function(el, id, locals) {
    if (!locals) return compile(el)(id);
    DOM.setContent(el, compile(id)(locals));
  };
})();

DOM.implement('render', app.render);

/**
 * Router
 */

(function() {
var routes = {}
  , methods = ['get', 'post', 'put', 'delete'];

each(methods.concat('all'), function(method) {
  if (method !== 'all') {
    routes[method.toUpperCase()] = [];
  }
  app[method] = function(route) {
    var handler = slice.call(arguments, 1);
    if (typeof route === 'function') {
      handler.unshift(route);
      route = '*';
    }
    // dirty way to flatten the array
    handler = (function() {
      var fn = [];
      each(handler, function(handle) {
        fn = fn.concat(handle);
      });
      return fn;
    })();
    add(route, method, handler);
  };
});
app.del = app['delete'];
app.use = app.all;

var add = function(route, method, handler) {
  if (typeof handler !== 'function') {
    return each(handler, function(handle) {
      add(route, method, handle);
    });
  }
  if (method === 'all') {
    var i = methods.length;
    while (i--) add(route, methods[i], handler);
  } else {
    handler.route = route; 
    routes[method.toUpperCase()].push(handler);
  }
};

var match = function(uri, route) {
  if (route[0] !== '/' && uri.indexOf(route) === 1) {
    var ch = uri[route.length + 1];
    return ch === '/' || !ch;
  }
  return route === '*' || route === uri;
};

/**
 * Request (OutgoingMessage)
 */

var Request = function(uri, method, form) {
  this.method = method = method || 'GET';
  this.headers = {};
  this.url = uri;
  this.pathname = uri;
  this.cookies = {};

  if (document.cookie) {
    this.headers['Cookie'] = document.cookie;
    this.cookies = DOM.getCookies();
  }

  if (form) {
    var serial = DOM.serialize(form) || {};
    this.headers['Content-Type'] =
      form.enctype || 'application/x-www-form-urlencoded';
    if (method === 'GET') {
      this.query = serial.data;
      this.rawQuery = serial.encoded;
    } else {
      this.body = serial.data;
      this.rawBody = serial.encoded;
    }
    // method override
    if (serial.data & serial.data._method) {
      this.method = method = serial.data._method.toUpperCase();
    }
  }

  if (~uri.indexOf('?')) {
    uri = uri.split('?');
    this.query = parsePairs(uri[1], '&');
    this.rawQuery = uri[1];
    this.pathname = uri = uri[0];
  }
};

Request.prototype.setHeader = function(name, val) {
  this.headers[name] = val;
};

Request.prototype.getHeader = function(name, val) {
  return this.headers[name];
};

Request.prototype.removeHeader = function(name, val) {
  delete this.headers[name];
};

Request.prototype.header = function(name, val) {
  if (val !== undefined) {
    this.setHeader(name, val);
  } else {
    return this.getHeader(name);
  }
};

Request.prototype.cookie = 
Request.prototype.setCookie = function(name, val, opt) {
  DOM.setCookie(name, val, opt);
  this.cookies[name] = val;
};

Request.prototype.uncookie = 
Request.prototype.clearCookie = function(name, opt) {
  DOM.clearCookie(name, opt);
  delete this.cookies[name];
};

Request.prototype.redirect = function(url) {
  if (~url.indexOf('//')) {
    return window.location = url;
  }
  this.url = url;
  this.pathname = url;
  path.set(url);
  //require('app').setPath(url);
};

Request.prototype.send = function(body, func) {
  if (typeof body === 'function') {
    func = body;
    body = undefined;
  }

  if (body) req.data = body;

  require('io').request(this, func);
};

Request.prototype.render = function(id, locals) {
  //var app = require('app');
  app.render(app.settings.view || 'body', id, locals);
};

/**
 * Dispatcher
 */

var dispatch = function(uri, method, form) {
  var req = new Request(uri, method, form);

  method = req.method;
  uri = req.pathname;
  req.next = next;

  var i = 0
    , stack = routes[method];

  function next(err) {
    var handler = stack[i++];

    if (!handler) {
      if (!err) err = new Error('Bottom of stack.');
      console.error(err.stack || err + '');
      return;
    }

    if (!match(uri, handler.route)) {
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

/**
 * Path Management
 */

var path = {};

var update = function() {
  var cur = path.get();
  if (!find(cur)) return;
  dispatch(cur);
};

var pathname = function(url) {
  url = decodeURI((url + '').replace(/\+/g, ' '));
  return '/' + url.replace(/^([^:\/]+:)?(\/\/[^\/]+)?\/?/, '');
};

if (window.history.pushState) {
  var changed;

  path.get = function getPath() {
    return pathname(window.location);
  };

  path.set = function setPath(url) {
    url = pathname(url);
    history.pushState({}, window.title || '', url);
    // direct call to dispatch is faster than update
    return dispatch(url);
  };

  // hook to monitor changes
  path.set = (function() {
    var set = path.set;
    return function(url) {
      path.set = set;
      changed = true; 
      return path.set(url);
    };
  })();

  // if popstate fired and the location
  // hasnt even changed once, that means
  // were probably in a webkit browser.
  // ignore this first popstate to be
  // consistent with other browsers.
  DOM.on(window, 'popstate', function() {
    if (!changed) return;
    update();
  });
} else {
  path.get = function getHash() {
    var hash = (window.location + '').replace(/^[^#]+/, '');
    hash = hash.replace(/^#!/, '') || '/';
    // firefox already has the location.hash decoded
    // if the raw location.hash is used, firefox
    // needs to be explicitly excluded here
    hash = decodeURI(hash).replace(/\+/g, ' ');
    return hash;
  };
  path.set = function setHash(url) {
    url = pathname(url);
    // if the hash location is already
    // set to the desired url, an onhashchange
    // wont be fired, we need to do it ourselves
    if (path.get() === url) {
      // direct call to dispatch is faster than update
      return dispatch(url);
    }
    window.location.hash = '#!' + url;
  };
  if ('onhashchange' in window) {
    DOM.on(window, 'hashchange', update);
  } else {
    // poll for hash changes
    (function(last) {
      setInterval(function() {
        if (last !== window.location.hash) {
          update();
          last = window.location.hash;
        }
      }, 10);
    })(window.location.hash);
  }
}

// test a path to make sure it has
// at least one handler.
// have to do this because handlers
// can be async, and it will be 
// impossible to kill prevent 
// default after a certain point.
var find = function(uri, method) {
  var stack = routes[method || 'GET']
    , i = 0
    , l = stack.length;

  for (; i < l; i++) {
    if (match(uri, stack[i].route)) {
      return true;
    }
  }
};

/**
 * Bind Events
 */

// override all links, ignore external links
DOM.live('a', 'click', function(ev) {
  if (ev.target.host === window.location.host) {
    if (!find(pathname(ev.target))) return;
    ev.kill();
    path.set(ev.target);
    ev.target.blur();
  }
});

// watch form submission
DOM.live('form', 'submit', function(ev) {
  var form = ev.target
    , action = form.action
    , method
    , uri;

  if (~action.indexOf(window.location.host) 
      || !~action.indexOf('://')) {
    method = (form.method || 'GET').toUpperCase();
    uri = pathname(action);

    if (!find(uri, method)) return;

    ev.kill();
    if (method === 'GET') {
      // this is technically less performant than just
      // creating a dispatch, but it is also closer to
      // a browser's regular behavior in this situation
      uri = uri.split('?')[0];
      path.set(uri + '?' + DOM.serialize(form).encoded);
    } else {
      dispatch(uri, method, form);
    }
  }
});

// emit a update on pageload
// onhashchange isnt fired on pageload
// and we muted the onpopstate event for webkit
DOM.ready(update);

// expose location methods
app.setPath = path.set;
app.getPath = path.get;

})();

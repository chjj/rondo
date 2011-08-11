/**
 * Application
 */

#include "router.js"

var DOM = require('dom')
  , app = exports;

/**
 * Settings
 */

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

/**
 * Template Rendering
 */

app.render = (function() {
  var compile = (function() {
    var cache = {};
    return function(id) {
      if (!cache[id]) {
        var engine = app.settings.engine
          , el = DOM.select(id)[0];
        if (engine.compile) {
          app.settings.engine =
            engine = engine.compile;
        }
        cache[id] = engine(DOM.getContent(el));
      }
      return cache[id];
    };
  })();
  return function(el, id, locals) {
    if (typeof el === 'string') {
      return compile(el)(id);
    }
    DOM.setContent(el, compile(id)(locals));
  };
})();

DOM.implement('render', app.render);

/**
 * Router
 */

router = router(app);

/**
 * Path Management
 */

var path = function(url) {
  url = decodeURI(url + '')
    .replace(/\+/g, ' ')
    .replace(/^([^:\/]+:)?(\/\/[^\/]+)?\/?/, '');
  return '/' + url;
};

path.update = function() {
  var cur = path.get();
  if (!router.test(cur)) return;
  router.dispatch(cur);
};

if (window.history.pushState) {
  path.changed = false;

  path.get = function getPath() {
    return path(window.location);
  };

  path.set = function setPath(url) {
    url = path(url);
    history.pushState({}, window.title || '', url);
    // direct call to dispatch is faster than update
    return router.dispatch(url);
  };

  // hook to monitor changes
  path.set = (function() {
    var set = path.set;
    return function(url) {
      path.set = set;
      path.changed = true; 
      return path.set(url);
    };
  })();

  // if popstate fired and the location
  // hasnt even changed once, that means
  // were probably in a webkit browser.
  // ignore this first popstate to be
  // consistent with other browsers.
  DOM.on(window, 'popstate', function() {
    if (!path.changed) return;
    path.update();
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
    url = path(url);
    // if the hash location is already
    // set to the desired url, an onhashchange
    // wont be fired, we need to do it ourselves
    if (path.get() === url) {
      // direct call to dispatch is faster than update
      return router.dispatch(url);
    }
    window.location.hash = '#!' + url;
  };

  if ('onhashchange' in window) {
    DOM.on(window, 'hashchange', path.update);
  } else {
    // poll for hash changes
    (function(last) {
      setInterval(function() {
        if (last !== window.location.hash) {
          path.update();
          last = window.location.hash;
        }
      }, 10);
    })(window.location.hash);
  }
}

// expose path methods
app.setPath = path.set;
app.getPath = path.get;

/**
 * Bind Events
 */

// override all links, ignore external links
DOM.live('a', 'click', function(ev) {
  if (ev.target.host === window.location.host) {
    if (!router.test(path(ev.target))) return;
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
    uri = path(action);

    if (!router.test(uri, method)) return;

    ev.kill();

    if (method === 'GET') {
      // this is technically less performant than just
      // creating a dispatch, but it is also closer to
      // a browser's regular behavior in this situation
      uri = uri.split('?')[0];
      path.set(uri + '?' + DOM.serialize(form).encoded);
    } else {
      router.dispatch(uri, method, form);
    }
  }
});

// emit an update on pageload
// onhashchange isnt fired on pageload
// and we muted the onpopstate event for webkit
DOM.ready(path.update);

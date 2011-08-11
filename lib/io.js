/**
 * I/O
 */

var DOM = require('dom')
  , io = exports;

/**
 * Options
 */

io.timeout = 3000;
io.eval = false;
io.charset = 'utf-8';
io.accept = [
  'application/javascript',
  'application/json',
  'text/html',
  'text/plain'
];

// # verify responses
// responses will be discarded if 
// they are 304's, 400+, etc. this 
// is contrary to node-like behavior, 
// so it is disabled by default.
io.verify = false;

/**
 * Helpers
 */

var encode = function(data) {
  var out = [];
  each(data, function(val, key) {
    out.push(
      escape(key) + '=' 
      + (val != null ? escape(val) : '')
    );
  });
  return out.join('&');
};

var byteLength = function(data) {
  return data.length 
    + data.replace(/[\u0000-\u00ff]+/g, '').length;
};

var resolve = function(path) {
  var loc = window.location;

  if (path[path.length-1] === '/') {
    path = path.slice(0, -1);
  }

  if (~path.indexOf('//')) { 
    return path;
  }

  var auth = /^[^:\/]+:\/\/[^\/]+/.exec(loc.href)[0];

  if (path[0] === '/') {
    path = auth + path;
  } else {
    path = path.replace(/^\.?\//, '');
    loc = loc.pathname.replace(/^\/|\/$/g, '');
    path = [auth, loc, path].join('/');
  }

  return path;
};

/**
 * Request (OutgoingMessage)
 * TODO Move to IO
 */

var Request = function(uri, method, form) {
  this.method = method = method || 'GET';
  this.headers = {};
  this.url = uri;
  this.pathname = uri;
  this.cookies = {};
  this.params = [];

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
  require('app').setPath(url);
};

Request.prototype.send = function(body, func) {
  if (typeof body === 'function') {
    func = body;
    body = undefined;
  }

  if (body) req.data = body;

  io.request(this, func);
};

Request.prototype.render = function(id, locals) {
  var app = require('app');
  app.render(app.settings.view || 'body', id, locals);
};

io.Request = Request;

/**
 * Response (IncomingMessage)
 */

var Response = function(xhr, req) {
  var data = xhr.responseText || ''
    , status = +xhr.status
    , headers = {};

  if (status === 1223) status = 204;

  (xhr.getAllResponseHeaders() || '').replace(
    /(?:\r?\n|^)([^:\r\n]+): *([^\r\n]+)/g, 
    function($0, $1, $2) {
      headers[$1.toLowerCase()] = $2;
    }
  );

  this.rawBody = data;

  var type = headers['content-type'];
  if (type) {
    if (~type.indexOf('html')) {
      data = DOM(data);
    } else if (~type.indexOf('json')) {
      try {
        data = JSON.parse(data);
      } catch(e) {
        data = {};
        this._error = true;
      }
    } else if (~type.indexOf('javascript') && io.eval) {
      var script = document.createElement('script');
      DOM.setText(script, data);
      head.insertBefore(script, head.firstChild);
      data = null;
    }
  }

  this.url = req.url;
  this.statusCode = status;
  this.headers = headers;
  this.body = data;
};

Response.verify = function(res) {
  if (!io.verify) { 
    delete res._error; 
    return true;
  }

  var status = res.statusCode;
  if (res._error) return;
  if (!status 
      || ((status < 200 
      || status >= 300) 
      && status !== 304)) return;

  return true;
};

io.Response = Response;

/**
 * Client Request
 */

io.request = function(req, func) {
  var xhr = io.request.xhr();

  if (typeof req === 'string') {
    req = { url: req };
  }

  var time = req.timeout || io.timeout
    , head = req.headers || {}
    , body = req.body || req.data || ''
    , method;

  method = req.method
    ? req.method.toUpperCase()
    : (body ? 'POST' : 'GET');

  head['X-Requested-With'] = 'XMLHttpRequest';
  head['Accept'] = head['Accept'] || io.accept.join(',') + ';q=1.0';

  if (body) {
    var charset = req.charset || io.charset
      , type;

    type = req.type 
      || head['Content-Type'] 
      || 'application/x-www-form-urlencoded';

    // drop charset
    type = type.split(';')[0];

    if (method === 'GET') {
      method = 'POST';
    } else if (method !== 'POST') {
      body._method = method;
      method = 'POST';
    }

    if (body && typeof body === 'object') {
      if ((~type.indexOf('json') || req.data) && window.JSON) {
        body = JSON.stringify(body);
      } else {
        type = 'application/x-www-form-urlencoded';
        body = encode(body);
      }
    }

    head['Content-Type'] = type + '; charset=' + charset;
    head['Content-Length'] = byteLength(body);
  }

  xhr.open(method, resolve(req.url), !!func);

  each(head, function(val, key) {
    xhr.setRequestHeader(key, val);
  });

  if (!func) {
    xhr.send(body);
    if (xhr.readyState == 4) {
      var res = new Response(xhr, req);
      if (!Response.verify(res)) {
        throw new 
          Error('Bad response.');
      }
      return res;
    }
  } else {
    var timeout = setTimeout(function() {
      xhr.onreadystatechange = function() {};
      xhr.abort();
      func(new Error('Timeout.'));
    }, time);

    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        clearTimeout(timeout);

        var res = new Response(xhr, req);
        if (!Response.verify(res)) {
          return func(new Error('Bad response.'));
        }
        func(null, res);
      }
    };

    xhr.send(body);
  }
};

io.request.xhr = function() {
  try {
    return new XMLHttpRequest();
  } catch(e) {
    try {
      return new ActiveXObject('Microsoft.XMLHTTP');
    } catch(e) {
      try {
        return new ActiveXObject('MSXML2.XMLHTTP.4.0'); // or 5-6?
      } catch(e) {
        try {
          return new ActiveXObject('MSXML2.XMLHTTP'); 
        } catch(e) {
          throw new
            Error('No client request capabilities found.');
        }
      }
    }
  }
};

io.get = function(req, func) {
  if (typeof req === 'string') {
    req = { url: req };
  }
  req.method = 'GET';
  return io.request(req, function(err, res) {
    if (func) func(err, res.body);
  });
};

io.post = function(req, body, func) {
  if (!func) {
    func = body;
    body = undefined;
  }
  if (typeof req === 'string') {
    req = { url: req };
  }
  req.method = 'POST';
  req.body = body;
  return io.request(req, function(err, res) {
    if (func) func(err, res.body);
  });
};

/**
 * JSONP
 */

io.jsonp = function(url, func) {
  var cb = 'jsonp_' + (+new Date()).toString(36)
    , script = document.createElement('script')
    , timeout
    , done;

  done = function(err, data) {
    delete window[cb];
    clearTimeout(timeout);
    head.removeChild(script);
    script.onerror = null;
    func(err, data);
  };

  window[cb] = function(data) {
    done(null, data);
  };

  script.onerror = function() {
    done(new Error('Bad response.'));
  };

  timeout = setTimeout(function() {
    done(new Error('Timeout.'));
  }, io.timeout);

  script.src = resolve(url)
             + (~url.indexOf('?') ? '&' : '?')
             + 'callback=' + cb;
  script.async = true;

  head.insertBefore(script, head.firstChild);
};

/**
 * Script Insertion
 */

io.script = function(url, func) {
  if (typeof url === 'object') {
    var pending = url.length;
    return each(url, function(url) {
      io.script(url, function() {
        if (!--pending) func && func();
      });
    });
  }

  var script = document.createElement('script')
    , done
    , timeout;

  done = function(err) {
    clearTimeout(timeout);
    head.removeChild(script);
    script.onerror = null;
    script.onload = null;
    script.onreadystatechange = null;
    if (func) func(err);
  };

  timeout = setTimeout(function() {
    done(new Error('Timeout'));
  }, io.timeout);

  script.onload = function(ev) {
    done();
  };

  script.onerror = function(ev) {
    done(new Error('Error.'));
  };

  // opera bug:
  // http://stackoverflow.com/questions/1929742/
  // can-script-readystate-be-trusted-to-
  // detect-the-end-of-dynamic-script-loading
  if (!DOM.env.opera) {
    script.onreadystatechange = function(ev) {
      var state = script.readyState;
      if (state === 'loaded' 
          || state === 'complete') {
        done();
      }
    };
  }

  script.async = true;
  script.src = resolve(url);
  head.insertBefore(script, head.firstChild);
};

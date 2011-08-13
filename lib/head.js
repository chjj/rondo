/**
 * Header
 */

//var undefined; 
// ...just kidding

var window = this
  , document = this.document
  , history = this.history
  , location = this.location
  , root = document.documentElement
  , head = document.getElementsByTagName('head')[0]
  , slice = [].slice
  , toString = Object.prototype.toString
  , hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Helpers
 */

var each = function(obj, func, con) {
  if (!obj) return;

  if (typeof obj.length === 'number' 
      && typeof obj !== 'function') {
    for (var i = 0, l = obj.length; i < l; i++) {
      if (func.call(con, obj[i], i, obj) === false) 
        break;
    }
  } else {
    for (var k in obj) {
      if (hasOwnProperty.call(obj, k)) 
        if (func.call(con, obj[k], k, obj) === false) 
          break;
    }
  }
};

var has = function(obj, item) {
  var included = false;
  each(obj, function(val) {
    if (val === item) {
      included = true;
      return false;
    }
  });
  return included;
};

var indexOf = function(obj, el, start) {
  var i = start || 0
    , l = obj.length;

  for (; i < l; i++) {
    if (obj[i] === el) return i;
  }

  return -1;
};

var extend = function(a, b) {
  each(b, function(val, key) { 
    a[key] = val; 
  });
};

var isArray = function(obj) {
  return toString.call(obj) === '[object Array]';
};

var escape = function(str) {
  return encodeURIComponent(str).replace(/%20/g, '+');
};

var unescape = function(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch(e) {
    return str;
  }
};

var parsePairs = function(qs, del, eq) {
  if (!qs) return {};

  var out = {}
    , s = qs.split(del || '&')
    , i = s.length
    , $;

  while (i--) {
    $ = s[i].split(eq || '=');
    if ($[0]) {
      $[0] = unescape($[0]);
      $[1] = $[1] ? unescape($[1]) : '';
      out[$[0]] = $[1];
    }
  }

  return out;
};

var trim = function(str) {
  return str ? str.replace(/^\s+|\s+$/g, '') : '';
};

/**
 * Shims
 */

if (!window.console) window.console = {};
if (!console.log) console.log = function() {};
if (!console.error) console.error = function(err) {
  setTimeout(function() { throw new Error(err); }, 1);
};

if (!window.JSON) window.JSON = (function() {
  var lead = function(n) {
    return n < 10 ? '0' + '' + n : n;
  };
  var bad = /[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/
    , strings = /"(\\.|[^"\\])*"/g;
  return {
    toString: function() {
      return '[object JSON]';
    },
    parse: function(str) {
      if (bad.test(str.replace(strings, ''))) {
        throw new
          SyntaxError('Parse error.');
      }
      try {
        str = 'return (' + str + ');';
        return new Function('', str).call(null);
      } catch(e) {
        throw new
          SyntaxError('Parse error.');
      }
    },
    stringify: function stringify(obj) {
      var type = typeof obj
        , out = []
        , val;

      if (type === 'object') {
        // null
        if (!obj) return 'null';

        // array
        if (toString.call(obj) === '[object Array]') {
          for (var i = 0, l = obj.length; i < l; i++) {
            val = stringify(obj[i]);
            if (val) out.push(val);
          }
          return '[' + out.join(',') + ']';
        }

        // regexp
        if ('ignoreCase' in obj) return;

        // date
        if (obj.getUTCFullYear) {
          if (isNaN(obj) || obj.toString() === 'Invalid Date') {
            return stringify(null);
          }
          return stringify(
            obj.getUTCFullYear()
            + '-' + lead(obj.getUTCMonth() + 1)
            + '-' + lead(obj.getUTCDate())
            + 'T' + lead(obj.getUTCHours())
            + ':' + lead(obj.getUTCMinutes())
            + ':' + lead(obj.getUTCSeconds())
            + '.' + obj.getUTCMilliseconds()
            + 'Z'
          );
        }

        // "regular" object
        for (var k in obj) {
          if (hasOwnProperty.call(obj, k)) {
            val = stringify(obj[k]);
            if (val) out.push('"' + k + '":' + val);
          }
        }

        return '{' + out.join(',') + '}';
      } else if (type === 'number') {
        // NaN or Infinity
        if (!isFinite(obj)) return stringify(null);
        // number
        return obj + '';
      } else if (type === 'string') {
        // string
        obj = obj
          .replace(/(\\|")/g, '\\$1')
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t')
          .replace(/[\u0000-\u0019\u007e-\uffff]/g, function(s) {
            s = s.charCodeAt(0).toString(16);
            while (s.length < 4) s = '0' + '' + s;
            return '\\u' + s;
          });

        return '"' + obj + '"';
      } else if (type === 'boolean') {
        // bool
        return obj ? 'true' : 'false';
      }
      // functions and undefined return undefined
    }
  };
})();

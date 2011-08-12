/**
 * DOM
 */

var DOM = function(input, context) {
  if (!input || input instanceof DOM) {
    return input;
  }

  if (typeof input === 'function') {
    return DOM.ready(input);
  }

  if (!(this instanceof DOM)) {
    return new DOM(input, context);
  }

  if (typeof input === 'string') {
    input = trim(input);
    if (input[0] === '<') {
      input = DOM.create(input, context);
    } else {
      this.selector = input;
      this.context = context;
      input = DOM.select(input, context);
    }
  } else if (typeof input.length !== 'number') { 
    input = [input];
  }

  this.dom = input;
};

/**
 * Prototype Implementation
 */

DOM.prototype._execute = function(args_, func) {
  var args = slice.call(args_)
    , dom = this.dom
    , i = 0
    , l = dom.length
    , ret;

  args.unshift(null);

  for (; i < l; i++) {
    args[0] = dom[i];
    ret = func.apply(this, args);
    if (ret !== undefined) return ret;
  }

  return this;
};

DOM.prototype.__execute = function(args_, func) {
  var args = slice.call(args_)
    , dom = this.dom
    , i = 1
    , l = dom.length
    , ret
    , out;

  if (!l) return this;

  if (dom[1] && dom[1].dom) {
    dom[1] = normalize(dom[1]);
  }

  args.unshift(null);

  args[0] = dom[0];
  ret = func.apply(this, args);

  if (ret !== undefined) {
    // temporary HACK
    if (ret) {
      if (ret.dom) ret = ret.dom;
      else if (ret.nodeType) ret = [].concat(ret);
    }
    if (isArray(ret)) {
      out = ret;
      for (; i < l; i++) {
        args[0] = dom[i];
        ret = func.apply(this, args);
        out = out.concat(ret.dom || ret); // hack
      }
      this.dom = out;
    } else {
      return ret;
    }
  } else {
    for (; i < l; i++) {
      args[0] = dom[i];
      func.apply(this, args);
    }
  }

  return this;
};

// add a method to the prototype with
// special iterative behavior and 
// normalization for class methods
DOM.implement = function implement(key, func) {
  if (typeof key === 'object') {
    return each(key, function(val, key) {
      implement(key, val);
    });
  }

  DOM.prototype[key] = function() {
    return this._execute(arguments, func);
  };

  DOM[key] = func;
};

var normalize = function(el) {
  if (typeof el === 'string') {
    el = DOM(el);
  }
  return el && el.dom ? el.dom[0] : el;
};

/**
 * Environment Detection
 */

// some of these from: thespanner.co.uk
// some of them from my own discoveries
DOM.env = (function() {
  // i think everything here is a much better way to
  // go about browser detection, i.e. testing for a particular
  // JS engine rather than a rendering engine or browser UA string

  // this may look strange at first...
  // most js engines aside from spider/jaegermonkey 
  // get toString(undefined) wrong. instead of 
  // outputting the Undefined type, they output 
  // the name of their global object.
  // (although, v8 has recently fixed this).

  var env = {}
    , noop = function x() {}
    , undef = toString.call(undefined)
    , rx = /x/;

  var tests = {
    // spider/jaegermonkey or mozilla
    firefox: function() {
      return rx[-1] === 'x'                 // ff2/3
        || noop[-5] === 'x'                 // ff3
        || noop[-6] === 'x'                 // ff2
        // this is bad fallback for ff4+
        // still looking for better jaegermonkey detection
        // suggestions welcome
        || !!window.XULElement
        || !!window.netscape;
    },
    ie: function() {
      // ie's caught error leaks into the parent scope, 
      // as discovered by thespanner.co.uk
      return (function(e) { try { e(); } catch(e) {} return !!e; })()
        || '\v' === 'v'
        || undef === '[object Object]';
    },
    // v8 or chrome
    chrome: function() {
      return undef === '[object global]'
        || (noop.__proto__ || '').name === 'Empty'
        // fallback if we cant detect v8
        || (!!window.chrome && !!window.chrome.app);
    },
    // js core
    safari: function() {
      return rx.__proto__ == '//'
        || undef === '[object DOMWindow]';
    },
    opera: function() {
      return Array.prototype.sort.name === '' 
        || (noop.__proto__ || '').name === 'Function.prototype'
        || undef === '[object Window]'
        // fallback if we cant detect the engine
        || toString.call(window.opera) === '[object Opera]';
    }
  };

  each(tests, function(test, browser) {
    if (test()) {
      env[browser] = true;
      return false;
    }
  });

  return env;
})();

/**
 * Traversal
 */

each({
  next: function(el) {
    while ((el = el.nextSibling) 
           && el.nodeType !== 1);
    return el;
  },
  previous: function(el) {
    while ((el = el.previousSibling) 
           && el.nodeType !== 1);
    return el;
  },
  child: function(el) {
    if (el = el.firstChild) {
      while (el.nodeType !== 1 
             && (el = el.nextSibling));
    }
    return el;
  },
  last: function(el) {
    if (el = el.lastChild) {
      while (el.nodeType !== 1 
             && (el = el.previousSibling));
    }
    return el;
  },
  parent: function(el) {
    return el.parentNode;
  }
}, function(func, name) {
  DOM.implement(name, function(el) {
    var args = arguments
      , index = 1
      , type;

    switch (typeof args[1]) {
      case 'number': index = args[1]; break;
      case 'string': type = args[1]; break;
    }

    switch (typeof args[2]) {
      case 'number': index = args[2]; break;
      case 'string': type = args[2]; break;
    }

    if (!type) {
      while (index-- && (el = func(el)));
    } else {
      while (index) {
        if (!(el = func(el))) break;
        if (DOM.matches(el, type)) index--;
      }
    }

    return el ? DOM(el) : null; 
  });
});

each({
  descendant: function(el, test) {
    return DOM.descendants(el, test).dom;
  },
  ancestor: function(el, test) {
    return DOM.ancestors(el, test).dom;
  }
}, function(func, name) {
  DOM.implement(name, function(el) {
    var args = arguments
      , index = 0
      , type;

    switch (typeof args[1]) {
      case 'number': index = args[1]; break;
      case 'string': type = args[1]; break;
    }

    switch (typeof args[2]) {
      case 'number': index = args[2]; break;
      case 'string': type = args[2]; break;
    }

    var dom = func(el, type)
      , el = dom[index];

    return el ? DOM(el) : null;
  });
});

DOM.implement({
  children: function(el, test) {
    var out = [];

    el = el.firstChild;
    while (el) {
      if (el.nodeType === 1) out.push(el);
      el = el.nextSibling;
    }

    out = DOM(out);
    if (test) out = out.filter(test);
    return out;
  },
  descendants: function(el, test) {
    el = el.getElementsByTagName('*');

    var out = []
      , i = 0
      , l = el.length;

    for (; i < l; i++) {
      if (el[i].nodeType === 1) out.push(el[i]);
    }

    out = DOM(out);
    if (test) out = out.filter(test);
    return out;
  },
  parents: function(el, test) {
    var out = [];
    while ((el = el.parentNode) 
           && el.nodeType === 1) out.push(el);
    out = DOM(out);
    if (test) out = out.filter(test);
    return out;
  },
  ancestors: function(el, test) {
    var out = [];

    while (el = el.parentNode) {
      el = el.parentNode 
        ? el.parentNode.firstChild 
        : el;
      while (el) {
        out.push(el);
        if (!el.nextSibling) break;
        el = el.nextSibling;
      }
    }

    out = DOM(out);
    if (test) out = out.filter(test);
    return out;
  },
  above: function(el, test) {
    var out = [];
    while (el = el.previousSibling) {
      if (el.nodeType === 1) out.push(el);
    }

    out = DOM(out);
    if (test) out = out.filter(test);
    return out;
  },
  below: function(el, test) {
    var out = [];
    while (el = el.nextSibling) {
      if (el.nodeType === 1) out.push(el);
    }

    out = DOM(out);
    if (test) out = out.filter(test);
    return out;
  },
  siblings: function(el, test) {
    var out = []
      , el_ = el;

    el = el.parentNode.firstChild;
    while (el = el.nextSibling) {
      if (el.nodeType === 1 
          && el !== el_) out.push(el);
    }

    out = DOM(out);
    if (test) out = out.filter(test);
    return out;
  },
  hasParent: function(el, sub) {
    return !!~DOM.parents(el).indexOf(sub);
  },
  hasChild: function(el, sub) {
    return !!~DOM.children(el).indexOf(sub);
  },
  hasAncestor: function(el, sub) {
    return !!~DOM.ancestors(el).indexOf(sub);
  },
  hasDescendant: function(el, sub) {
    return !!~DOM.descendants(el).indexOf(sub);
  },
  hasAboveSibling: function(el, sub) {
    return !!~DOM.above(el).indexOf(sub);
  },
  hasBelowSibling: function(el, sub) {
    return !!~DOM.below(el).indexOf(sub);
  },
  hasSibling: function(el, sub) {
    return DOM.hasAboveSibling(el, sub) 
        || DOM.hasBelowSibling(el, sub);
  }
});

/**
 * Utility and Manipulation
 */

DOM.implement({
  focus: function(el) {
    try { el.focus(); } catch(e) {}
  },
  blur: function(el) {
    try { el.blur(); } catch(e) {}
  },
  submit: function(el) {
    try { el.submit(); } catch(e) {}
  },
  // this gives a clean "userspace" clone
  // with no events or data.
  // .cloneNode is so damn buggy 
  // i dont even want to touch it.
  userClone: function(el, deep) {
    var sub = document.createElement(el.nodeName)
      , attr = el.attributes
      , i = attr.length;

    while (i--) {
      if (attr[i].nodeValue) {
        sub.setAttribute(attr[i].name, attr[i].value);
      }
    }

    if (el.namespaceURI) {
      sub.namespaceURI = el.namespaceURI;
    }

    if (el.baseURI) {
      sub.baseURI = el.baseURI;
    }

    if (deep) {
      DOM.setContent(sub, DOM.getContent(el));
    }

    return DOM(clone);
  },
  // the above was originally used for clones.
  // bits and pieces of the below functions 
  // were scavenged from jquery/mootools. 
  // cloneNode is a mess. still deciding
  // on how to do it best.
  copyEvents: function(el, sub) {
    var events = DOM.getData(el, 'events');
    if (!events) return;
    each(events, function(func, type) {
      DOM.on(sub, type, func);
    });
  },
  fixClone: function(el, sub) {
    var type = el.nodeName.toLowerCase();

    delete sub[DOM.prop];
    DOM.removeAttribute(sub, DOM.prop);
    DOM.removeAttribute(sub, 'id');

    if (sub.clearAttributes) {
      sub.clearAttributes();
      sub.mergeAttributes(el);
    }

    if (sub.attachEvent) {
      var events = DOM.getData(el, 'events');
      each(events, function(func, type) {
        sub.detachEvent('on' + type, func);
      });
    }

    // ie doesnt copy state
    switch (type) {
      case 'input':
        sub.checked = el.checked;
        break;
      case 'option':
        sub.selected = el.selected;
        break;
      case 'textarea':
        sub.value = el.value;
        break;
      case 'object':
        sub.outerHTML = el.outerHTML;
        break;
    }
  },
  clone: function(el, deep, events) {
    var sub = el.cloneNode(deep)
      , el_ = el.getElementsByTagName('*')
      , sub_ = sub.getElementsByTagName('*')
      , i = el_.length;

    DOM.fixClone(el, sub);
    if (events) DOM.copyEvents(el, sub);

    while (i--) {
      DOM.fixClone(el_[i], sub_[i]);
      if (events) DOM.copyEvents(el_[i], sub_[i]);
    }
  },
  setText: function(el, str) {
    if (el.parentNode) {
      DOM.setContent(el, '');
      str = el.ownerDocument.createTextNode(str);
      el.parentNode.appendChild(str);
    }
  },
  getText: function(el) {
    return el.textContent 
           || el.innerText 
           || el.nodeValue
           || el + '';
  },
  addClass: function(el, name) {
    var className = DOM.getProperty(el, 'className') || '';
    className += className 
      ? ' ' + name 
      : name;
    DOM.setProperty(el, 'className', className);
  },
  hasClass: function(el, name) {
    name = new RegExp('(^| )' + name + '( |$)');
    return name.test(DOM.getProperty(el, 'className'));
  },
  removeClass: function(el, name) {
    var className = DOM.getProperty(el, 'className') || '';
    className = className
      .replace(name, '')
      .replace(/^ | $|( ){2,}/g, '$1');
    DOM.setProperty(el, 'className', className);
  },
  toggleClass: function(el, name) {
    if (DOM.hasClass(el, name)) {
      DOM.removeClass(el, name);
    } else {
      DOM.addClass(el, name);
    }
  },
  show: function(el, val) {
    val = val || DOM.getData(el, 'display') || 'block';
    DOM.setStyle(el, 'display', val);
    DOM.setData(el, 'display', undefined);
  },
  hide: function(el) {
    DOM.setData(el, 'display', DOM.getStyle(el, 'display'));
    DOM.setStyle(el, 'display', 'none');
  },
  setContent: function(el, sub) {
    if (typeof sub === 'string') {
      DOM.clean(el);
      el.innerHTML = sub;
    } else {
      DOM.setContent(el, '');
      DOM.append(el, sub);
    }
  },
  clean: function(el) {
    var clear = el.getElementsByTagName('*') 
      , i = clear.length;

    while (i--) { 
      if (clear[i].nodeType !== 1) continue;
      DOM.removeAllListeners(clear[i]);
      DOM.clearData(clear[i]);
    }
  },
  getContent: function(el) {
    return el.innerHTML || '';
  },
  value: function(el, val) {
    if (val === undefined) {
      val = DOM.getProperty(el, 'value');
      return val !== undefined ? val : el.nodeValue;
    } else {
      DOM.setProperty(el, 'value', val);
    }
  },
  append: function(el, sub) {
    el.appendChild(normalize(sub));
  },
  appendTo: function(el, sub) {
    DOM.append(normalize(sub), el);
  },
  prepend: function(el, sub) {
    sub = normalize(sub);
    el.insertBefore(sub, el.firstChild);
  },
  prependTo: function(el, sub) {
    DOM.prepend(normalize(sub), el);
  },
  // "replace this with that"
  replaceWith: function(el, sub) {
    sub = normalize(sub);

    DOM.removeAllListeners(el);
    DOM.clearData(el);
    DOM.clean(el);

    //el.parentNode.replaceChild(sub, el);
    el.parentNode.insertBefore(sub, el);
    el.parentNode.removeChild(el);

    return DOM(sub);
  },
  replace: function(el, sub) {
    DOM.replaceWith(normalize(sub), el);
  },
  // "insert that before this"
  before: function(el, sub) {
    sub = normalize(sub);

    el.parentNode.insertBefore(sub, el);
    return DOM(sub);
  },
  after: function(el, sub) {
    sub = normalize(sub);

    if (!el.nextSibling) {
      el.parentNode.insertBefore(sub, el.nextSibling);
    } else {
      el.parentNode.appendChild(sub);
    }

    return DOM(sub);
  },
  // "this should precede that"
  precede: function(el, sub) {
    DOM.before(normalize(sub), el);
  },
  follow: function(el, sub) {
    DOM.after(normalize(sub), el);
  },
  wrap: function(el, sub) {
    sub = normalize(sub);

    DOM.before(el, sub);
    DOM.appendTo(el, sub);
  },
  destroy: function(el) {
    el.parentNode.removeChild(el);
    DOM.removeAllListeners(el);
    DOM.clearData(el);
    DOM.clean(el);
  },
  detach: function(el) {
    el.parentNode.removeChild(el);
  },
  serialize: function(el) {
    var out = []
      , data = {};

    el = el.getElementsByTagName('*'); 
    if (!el) return;

    each(el, function(el) {
      var name = el.name
        , val = el.value;
      if (!name) return;
      out.push(escape(name) + '='
        + (val ? escape(val) : '')
      );
      data[name] = val;
    });

    return { 
      encoded: out.join('&'), 
      data: data 
    };
  },
  getWindow: function(el) {
    el = DOM.getDocument(el);
    return el.defaultView || el.parentWindow || window;
  },
  getDocument: function(el) {
    return el.nodeType === 9 
      ? el 
      : el.document 
        || el.ownerDocument 
        || document;
  },
  getRoot: function(el) {
    return DOM.getDocument(el).documentElement || root;
  },
  getHead: function(el) {
    return DOM.getDocument(el).getElementsByTagName('head')[0] || head;
  },
  getBody: function(el) {
    return DOM.getDocument(el).body || document.body;
  },
  isWindow: function(el) {
    //!!el.eval && !!el.isNaN && !!el.encodeURI && !!el.parseFloat;
    return !!el.parseFloat;
  },
  isDocument: function(el) {
    return el.nodeType === 9;
  },
  isRoot: function(el) {
    return el === DOM.getRoot(el);
  },
  isHead: function(el) {
    return el === DOM.getHead(el);
  },
  isBody: function(el) {
    return el === DOM.getBody(el);
  },
  isXML: function(el) {
    var root = DOM.getRoot(el)
      , name = root.nodeName.toLowerCase();
    return name !== 'html' || !!root.getAttribute('xmlns');
  }
});

/**
 * Attributes and Properties
 */

(function() {
  var bool = {
    checked: true,
    selected: true, 
    defer: true,
    async: true,
    autofocus: true,
    readonly: true, 
    disabled: true,
    hidden: true, 
    required: true,
    scoped: true
  };

  DOM.implement({
    getAttribute: function(el, key, val) {
      if (bool[key]) {
        return !!el.getAttribute(key);
      } else if (el.getAttribute) {
        switch (key) {
          case 'for': 
            return el.htmlFor;
          case 'class': 
            return el.className;
          case 'href': 
            return el.getAttribute('href', 2);
        }
        return el.getAttribute(key);
      }
    },
    setAttribute: function(el, key, val) {
      if (typeof key === 'object') {
        return each(key, function(v, k) {
          DOM.setAttribute(el, k, v);
        });
      }
      if (bool[key]) {
        if (val) {
          el.setAttribute(key, key.toLowerCase());
        } else {
          el.removeAttribute(key);
        }
        el[key] = !!val;
      } else if (el.setAttribute) {
        el.setAttribute(key, val);
      }
    },
    hasAttribute: function(el, name) {
      return DOM.getAttribute(el, name) != null;
    },
    removeAttribute: function(el, key) {
      if (el.removeAttribute) {
        el.removeAttribute(key);
      }
    }
  });

  DOM.implement({
    getProperty: function(el, key, val) {
      if (bool[key]) {
        return el[key] != null && el[key] !== false;
      } else {
        switch (key) {
          case 'nodeName': 
            return el.nodeName.toLowerCase();
          case 'href': 
            return el + '';
        }
        return el[key];
      }
    },
    setProperty: function(el, key, val) {
      if (typeof key === 'object') {
        return each(key, function(v, k) {
          DOM.setProperty(el, k, v);
        });
      }
      if (bool[key]) {
        el[key] = !!val;
      } else {
        el[key] = val;
      }
    },
    hasProperty: function(el, name) {
      return DOM.getProperty(el, name) != null;
    },
    removeProperty: function(el, key) {
      if (bool[key]) {
        el[key] = false;
      } else {
        el[key] = null;
      }
    }
  });
})();

/**
 * Dimensions
 */

var flstyle = function(el, name) {
  return parseFloat(DOM.getStyle(el, name));
};

each({
  Height: ['top', 'bottom'],
  Width: ['left', 'right']
}, function(side, type) {
  // offset - border box by default
  // client - padding box by default
  var prop = 'offset' + type;
  var total = function(el, prop) {
    return (flstyle(el, prop + '-' + side[0]) || 0)
           + (flstyle(el, prop + '-' + side[1]) || 0);
  };
  DOM.implement(type.toLowerCase(), function(el, box) {
    box = box || 'content';

    var val = +el[prop] || 0; // border-box

    if (box === 'margin') val += total(el, 'margin');
    if (box === 'padding' 
        || box === 'content') val -= total(el, 'border');
    if (box === 'content') val -= total(el, 'padding');

    return val || 0;
  });
});

/**
 * Offsets and Positioning
 */

DOM.implement({
  top: function(el) {
    return DOM.offset(el).top;
  },
  left: function(el) {
    return DOM.offset(el).left;
  }
});

each({
  right: ['left', 'width'],
  bottom: ['top', 'height']
}, function(val, type) {
  var side = val[0]  // top for bottom
    , unit = val[1]; // height for bottom

  DOM.implement(type, function(el) {
    var offset = DOM.offset(el)[side]
      , op = DOM.offsetParent(el)
      , opval = DOM[unit](op, 'content')
      , elval = DOM[unit](el, 'border');

    return opval - elval - offset;
  });
});

DOM.implement({
  offsetParent: function(el) {
    if (!el) return;

    var pos
      , doc = el.ownerDocument
      , body = doc.body;

    if (!doc // detached or window/doc?
        || el === doc.documentElement // root?
        || el === body // body?
    ) return body || window.document.body;

    while (el = el.parentNode) {
      if (!el || el === body) break;
      pos = DOM.getStyle(el, 'position');
      if (pos && pos !== 'static') break;
    }

    return el || body || window.document.body;
  },
  offset: function(el) {
    var body = el.ownerDocument.body
      , left = el.offsetLeft - flstyle(el, 'margin-left')
      , top = el.offsetTop - flstyle(el, 'margin-top');

    while (el = DOM.offsetParent(el)) {
      left += el.offsetLeft || 0;
      top += el.offsetTop || 0;
      if (el === body) break;
    }

    return { left: left, top: top };
  }
});

/**
 * Scrolling and Viewport
 */

DOM.implement({
  viewport: function(el) {
    if (!el) el = window;
    el = DOM.getDocument(el).documentElement;
    return { 
      width: el.clientWidth, 
      height: el.clientHeight 
    };
  },
  setScroll: function(el, scroll) {
    if (!scroll) {
      scroll = el;
      el = window;
    }

    if (el.document || el.nodeType === 9) {
      var env = el.defaultView || el.parentWindow || el
        , cur = DOM.getScroll(env);

      if (scroll.left == null) scroll.left = cur.left;
      if (scroll.top == null) scroll.top = cur.top;

      env.scrollTo(scroll.left || 0, scroll.top || 0);
    } else {
      el.scrollLeft = scroll.left || 0;
      el.scrollTop = scroll.top || 0;
    }
  },
  getScroll: function(el) {
    if (!el) el = window;

    if (el.nodeType !== 1) { // doc or window?
      var env = el.defaultView 
        || el.parentWindow 
        || el;

      var doc = env.document
        , root = doc.documentElement;

      return {
        left: env.pageXOffset 
          || root.scrollLeft 
          || doc.body.scrollLeft,
        top: env.pageYOffset 
          || root.scrollTop 
          || doc.body.scrollLeft
      };
    } else {
      return {
        left: el.scrollLeft,
        top: el.scrollTop
      };
    }
  },
  scrollIntoView: function(el, top) {
    if (el.scrollIntoView) {
      el.scrollIntoView(top);
      return;
    }
    DOM.setScroll(DOM.getScroll(el));
  }
});

/**
 * Style API
 */

(function() {
  // IE uses `styleFloat`
  var floatName = (function() {
    var el = document.createElement('div');
    el.innerHTML = '<div style="float:left"></div>';
    return el.firstChild.style.cssFloat 
      ? 'cssFloat' 
      : 'styleFloat';
  })();

  var unitless = {
    'zIndex': true,
    'fontWeight': true, 
    'opacity': true,
    'zoom': true,
    'lineHeight': true,
    'kerning': true, 
    'strokeWidth': true
  };

  var camel = function(str) {
    return str.replace(/-(\w)/g, function(_, s) {
      return s.toUpperCase();
    });
  };

  var dash = function(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  };

  DOM.implement({
    getStyle: function(el, prop, val) {
      prop = prop === 'float' 
        ? floatName 
        : camel(prop);

      if (window.getComputedStyle) {
        val = el.style[prop] || el
          .ownerDocument.defaultView
          .getComputedStyle(el, null)
          .getPropertyValue(prop === floatName
                            ? 'float' : dash(prop));
      } else {
        val = el.currentStyle 
            ? el.currentStyle[prop] 
            : el.style[prop];

        if (prop === 'opacity') {
          try {
            val = el.currentStyle.filter || el.style.filter;
            val = (val.match(/opacity=([^)]*)/)[1] / 100) + '';
          } catch(e) {
            val = '1';
          }
          val = val.substring(0, 4);
        }

        // dean edwards' hack
        if (!isNaN(parseFloat(val)) 
            && !/^-?[\d.]+(px)?$/i.test(val)) {
          var left = el.style.left
            , rleft = el.runtimeStyle.left;

          el.runtimeStyle.left = el.currentStyle.left;
          el.style.left = val || 0;
          val = el.style.pixelLeft + '';
          el.style.left = left;
          el.runtimeStyle.left = rleft;
        }
        val = (val || 0) + '';
      }

      if (/^-?[\d.]+$/.test(val) 
          && !unitless[prop]) {
        val += 'px';
      }

      return val || '';
    },
    setStyle: function(el, prop, val) {
      if (typeof prop === 'object') {
        for (var k in prop) {
          DOM.setStyle(el, k, prop[k]);
        }
        return;
      }

      if (prop === 'opacity' && el.currentStyle) {
        el.style.zoom = el.style.zoom || 1;
        el.style.filter = (el.style.filter || '').replace(
          /(alpha\([^)]*\))?/i, 
          'alpha(opacity=' + (val * 100) + ')'
        );
      }

      prop = prop === 'float' 
        ? floatName 
        : camel(prop);
      el.style[prop] = val;
    }
  });
})();

/**
 * Data Storage
 */

(function() {
  var uid = 0
    , store = {}
    , prop = 'uid ' + (+new Date()).toString(16);

  DOM.prop = prop;

  DOM.implement({
    getData: function(el, key, fallback) {
      var data = store[el[prop] || 0];

      data = key 
        ? (data ? data[key] : undefined) 
        : data;

      if (key && data === undefined 
          && fallback !== undefined) {
        DOM.setData(el, key, data = fallback);
      }

      return data != null ? data : null;
    },
    setData: function(el, key, data) {
      var id = el[prop] || (el[prop] = ++uid);
      store[id] = store[id] || {};
      store[id][key] = data;
    },
    removeData: function(el, key) {
      var id = el[prop];
      if (!id) return;
      delete store[id][key];
    },
    clearData: function(el) {
      if (!el[prop]) return;
      delete store[el[prop]];
      delete el[prop];
    }
  });
})();

/**
 * The set/get interface
 */

each(['get', 'set', 'has', 'remove'], function(name) {
  var property = DOM[name + 'Property']
    , attribute = DOM[name + 'Attribute']
    , style = DOM[name + 'Style']
    , data = DOM[name + 'Data'];

  DOM.implement(name, function func(el, key, val) {
    if (name === 'set' && typeof key === 'object') {
      return each(key, function(val, key) {
        func(el, key, val);
      });
    }
    switch (key[0]) {
      case '@': return attribute(el, key.substring(1), val);
      case '.': return data(el, key.substring(1), val);
      case ':': return style(el, key.substring(1), val);
      default: return property(el, key, val);
    }
  });
});

/**
 * Instance Methods
 */

/**
 * Animation and Transitions
 * Just like the Zepto.js interface
 * until I write something more robust.
 */

DOM.prototype.animate = (function() {
  var vendors = [ 
    'ms', 
    'moz', 
    'webkit', 
    'o', 
    'khtml' 
  ];

  var events = [
    'transitionend', 
    'webkitTransitionEnd', 
    'OTransitionEnd'
  ].join(' ');

  var prefix = function(el, prop, val) {
    var pre = prop.replace(/(?:^|-)(\w)/g, function(_, s) {
      return s.toUpperCase();
    });
    each(vendors, function(vendor) {
      el.setStyle(vendor + pre, val);
    });
    el.setStyle(prop, val);
  };

  var transforms = {
    'scale': true,
    'scaleX': true,
    'scaleY': true,
    'translate': true,
    'translateX': true,
    'translateY': true,
    'translate3d': true,
    'skew': true,
    'skewX': true,
    'skewY': true,
    'rotate': true,
    'rotateX': true,
    'rotateY': true,
    'rotateZ': true,
    'rotate3d': true,
    'matrix': true
  };

  return function(opt, func) {
    var self = this
      , cb = func
      , duration = opt.duration || '0.5'
      , timing = opt.timing || 'ease'
      , delay = opt.delay || '0s'
      , transform = [];

    delete opt.duration;
    delete opt.timing;
    delete opt.delay;

    each(opt, function(val, key) {
      if (transforms[key]) {
        transform.push(key + '(' + val + ')');
        delete opt[key];
      }
    });

    setTimeout(function() {
      prefix(self, 'transition', 
             'all ' 
             + duration + 's ' 
             + timing 
             + ' ' + delay);

      self.setStyle(opt);
      if (transform.length) {
        prefix(self, 'transform', transform.join(' '));
      }
    }, 1);

    var pending = this.dom.length;
    func = function() {
      prefix(self, 'transition', 'none');
      if (!--pending) cb && cb();
    };

    // ensure listeners are unbound, 
    // this is to prevent memory leaks.
    // it may be better to test for 
    // which events are supported.
    this.off(events);

    // bind
    this.once(events, func);
  };
})();

DOM.prototype.load = function(url) {
  var self = this;
  require('io').get(url, function(err, data) {
    if (!err) self.setContent(data);
  });
  return this;
};

DOM.prototype.indexOf = function(el, start) {
  el = normalize(el);

  var dom = this.dom
    , i = start || 0
    , l = dom.length;

  for (; i < l; i++) {
    if (dom[i] === el) return i;
  }

  return -1;
};

DOM.prototype.copy = function() {
  return DOM(this.dom);
};

DOM.prototype.pluck = function(prop) {
  var res = [];
  this.each(function(el) {
    res.push(el.get(prop));
  });
  return res;
};

DOM.prototype.each = function(func) {
  var i = 0
    , l = this.dom.length;

  for (; i < l; i++) {
    func.call(this, DOM(this.dom[i]), i);
  }

  return this;
};

DOM.prototype.map = function(func) {
  var dom = [];
  this.each(function(el, i) {
    el = normalize(func(el));
    if (el) dom.push(el);
  });
  this.dom = dom;
  return this;
};

DOM.prototype.filter = function(func) {
  if (typeof func === 'string') {
    var selector = func;
    func = function(el) {
      return DOM.matches(el, selector);
    };
  }
  var dom = [];
  each(this.dom, function(el, i) { //this.each(function(el, i) {
    if (func(el, i)) dom.push(el);
  });
  this.dom = dom;
  return this;
};

DOM.prototype.concat = function() {
  var args = slice.call(arguments);
  each(args, function(el, i) {
    args[i] = normalize(el);
  });
  this.dom = this.dom.concat.apply(this.dom, args);
  return this;
};

DOM.prototype.slice = function(a, b) {
  this.dom = this.dom.slice(a, b);
  return this;
};

DOM.prototype.pop = function() {
  return DOM(this.dom.pop());
};

DOM.prototype.shift = function() {
  return DOM(this.dom.shift());
};

DOM.prototype.push = function(el) {
  return this.dom.push(normalize(el));
};

DOM.prototype.unshift = function(el) {
  return this.dom.unshift(normalize(el));
};

DOM.prototype.refresh = function() {
  this.dom = DOM.select(this.selector, this.context);
  return this;
};

DOM.prototype.toString = function() {
  return '[object DOM]';
};

/**
 * Static Methods
 */

DOM.create = (function() {
  var div = document.createElement('div');
  return function(str, attr) {
    var el
      , out
      , child;

    str = trim(str);

    if (str[0] !== '<') {
      el = document.createElement(str);
      if (attr) DOM.set(el, attr);
    } else {
      div.innerHTML = str;
      out = [];
      child = el = div.firstChild;
      while (child) {
        if (child.nodeType === 1) {
          out.push(child);
          if (attr) DOM.set(child, attr);
        }
        child = child.nextSibling;
      }
    }

    return out || [el];
  };
})();

/**
 * Cookie Management
 */

DOM.setCookie = function(name, val, opt) {
  opt = opt || {};

  if (opt.getTime || (opt && typeof opt !== 'object')) {
    opt = { expires: opt };
  }
  opt.expires = opt.expires || opt.maxage || opt.maxAge;

  document.cookie = 
    escape(name) + '=' + escape(val)
    + (opt.expires != null ? '; expires='
      +(!opt.expires.toUTCString
        ? new Date(new Date() + opt.expires)
        : opt.expires
      ).toUTCString()
    : '')
    + '; path=' + (opt.path || '/')
    + (opt.domain ? '; domain=' + opt.domain : '')
    + (opt.secure ? '; secure' : '');
};

DOM.getCookies = function() {
  var cookies = document.cookie;
  if (cookies) {
    cookies = cookies.replace(/ *[,;] */g, ';');
    return parsePairs(cookies, ';');
  }
  return {};
};

DOM.getCookie = function(name) {
  return DOM.getCookies()[name];
};

DOM.clearCookie = function(name, opt) {
  opt = opt || {};
  opt.expires = new Date(new Date() - 24 * 60 * 60 * 1000);

  DOM.setCookie(name, '0', opt);
};

/**
 * HTML5 Shim for pre & post-load
 */

if (function() {
  var el = document.createElement('b');
  el.innerHTML = '<nav></nav>';
  return el.childNodes.length === 0;
}()) (function() {
  var HTML5 = [
    'article', 
    'aside', 
    'audio', 
    'canvas', 
    'details', 
    'figcaption',
    'figure', 
    'footer', 
    'header', 
    'hgroup', 
    'mark', 
    'meter', 
    'nav', 
    'output',
    'progress', 
    'section', 
    'summary', 
    'time', 
    'video'
  ];

  var state = document.readyState;
  if (state !== 'loaded' 
      && state !== 'complete') {
    return each(HTML5, function(el) {
      document.createElement(el);
    });
  }

  var body = document.body
    , names = new RegExp('^(' + HTML5.join('|') + ')$', 'i');

  // move any html5 elements out of the head
  while (names.test(head.lastChild.nodeName)) {
    body.insertBefore(head.lastChild, body.firstChild);
  }

  var all = body.getElementsByTagName('*')
    , i = 0
    , el;

  // walk the dom tree and 
  // fix the structure accordingly
  while (el = all[i++]) {
    if (!names.test(el.nodeName) 
        || el.firstChild) continue;

    // turn all the bugged "start-tag" 
    // elements into their real counterparts
    var sub = doc.createElement(el.nodeName) 
      , at = el.attributes
      , l = at.length;

    while (l--) if (at[l].nodeValue) { 
      sub.setAttribute(at[l].name, at[l].value);
    }

    el.parentNode.replaceChild(sub, el);

    // append all elements until the corresponding 
    // bugged "close-tag" element is found
    var start = sub.nodeName
      , close = '/' + start
      , depth = 0
      , next;

    while (next = sub.nextSibling) {
      if (next.nodeName === start) {
        depth++;
      } else if (next.nodeName === close) {
        if (!depth--) break;
      }
      sub.appendChild(next);
    }

    // get rid of the bugged "close-tag" element
    sub.parentNode.removeChild(sub.nextSibling); 
  }
})();

module.exports = DOM;

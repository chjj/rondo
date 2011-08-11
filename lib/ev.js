/**
 * Events
 */

;(function() {

/**
 * DOM Ready
 */

// do this separately, the logic is a bit 
// different from regular event binding
var ready = (function() {
  var load = [];

  var handle = function() {
    if (!load) return;

    var i = 0
      , l = load.length;

    for (; i < l; i++) {
      try {
        load[i]();
      } catch(e) {
        console.error(e.stack || e + '');
      }
    }

    load = null;
  };

  if (window.attachEvent && !window.addEventListener) {
    var check = function() {
      if (document.readyState !== 'complete') return;
      window.detachEvent('onreadystatechange', check);
      handle();
    };
    window.attachEvent('onreadystatechange', check);
    window.attachEvent('onload', check);
    window.attachEvent('onunload', function unload() {
      window.detachEvent('onreadystatechange', check);
      window.detachEvent('onload', check);
      window.detachEvent('onunload', unload);
    });
  } else {
    window.addEventListener('DOMContentLoaded', handle, false);
    window.addEventListener('load', handle, false);
  }

  // diego perini's polling method
  // window == top needs to be double equal,
  // could also check window.frameElement
  if (root.doScroll && window == window.top) {
    (function poll() {
      try {
        root.doScroll('left');
      } catch(e) {
        return setTimeout(poll, 10);
      }
      check();
    })();
  }

  return function(func) {
    var state = document.readyState;
    if (!load || (state === 'complete' 
                  || state === 'loaded')) {
      setTimeout(func, 1);
    } else {
      load.push(func);
    }
  };
})();

/**
 * Event Management
 */

// fix the event object
var wrap = function(src) {
  if (src.__src) return src;
  if (typeof src === 'string') src = { type: src };

  var event = { __src: src }
    , target;

  target = src.target || src.srcElement || document;
  event.target = target.nodeType !== 3 
               ? target 
               : target.parentNode;
  event.currentTarget = src.currentTarget || target;
  event.type = src.type;

  event.key = function() {
    // mozilla may use .which
    return src.which || src.keyCode
      || src.charCode || src.key
      || src.char || 0;
  };

  event.button = function() {
    // webkit uses .which
    var button = src.button != null
      ? +src.button
      : src.which != null
        ? src.which - 1
        : undefined;

    if (DOM.env.ie) {
      // IE needs fixing: 1 -> 0, 4 -> 1, 2 -> 2
      button = button === 1 ? 0 : button === 4 ? 1 : button;
    }

    return {
      left: button === 0,
      middle: button === 1,
      right: button === 2
    };
  };

  event.cursor = function(x, y) {
    if (typeof src.clientX === 'number') {
      var doc = DOM.getDocument(target)
        , root = doc.documentElement
        , body = doc.body;

      x = src.clientX
        + (doc.scrollLeft || root.scrollLeft || body.scrollLeft || 0)
        - (doc.clientLeft || root.clientLeft || body.clientLeft || 0);
      y = src.clientY
        + (doc.scrollTop || root.scrollTop || body.scrollTop || 0)
        - (doc.clientTop || root.clientTop || body.clientTop || 0);
    } else if (typeof src.pageX === 'number') {
      x = src.pageX;
      y = src.pageY;
    }
    return { x: x, y: y };
  };

  if (src.type === 'mouseover' 
      || src.type === 'mouseout') {
    if (!src.relatedTarget) {
      event.relatedTarget = src.type === 'mouseover'
                          ? src.fromTarget 
                          : src.toTarget;
    } else {
      event.relatedTarget = src.relatedTarget;
    }
  }

  //event.returnValue = src.returnValue;
  event.preventDefault = function() {
    if (src.preventDefault) {
      src.preventDefault();
    }
    src.returnValue = false;
  };
  event.stopPropagation = function() {
    if (src.stopPropagation) {
      src.stopPropagation();
    }
    src.cancelBubble = true;
  };
  event.stop = function() {
    event.stopPropagation();
    event.preventDefault();
  };
  event.kill = function() {
    event.stop();
    event.dead = true;
  };

  return event;
};

// IE is too good at making messes
if (window.attachEvent && !window.addEventListener) {
  var __bound = [];
  window.attachEvent('onunload', function unload() {
    var i = __bound.length;
    while (i--) {
      removeListener(__bound[i]);
    }
    window.detachEvent('onunload', unload);
  });
}

var addListener = function(el, type, func) {
  if (typeof type === 'object') {
    return each(type, function(func, type) {
      addListener(el, type, func);
    });
  }

  if (~type.indexOf(' ')) {
    type = type.split(' ');
    var i = type.length;
    while (i--) {
      addListener(el, type[i], func);
    }
    return;
  }

  // special behavior
  switch (type) {
    case 'mouseenter':
    case 'mouseleave':
    case 'hover':
      type = type !== 'mouseleave' 
        ? 'mouseover' 
        : 'mouseout';

      var func_ = func;
      func = function(ev) {
        ev.stopPropagation();
        // LOGIC:
        // if the element that is entered contains 
        // the element that the cursor originated from, 
        // do not enter
        // if the element that is left contains the 
        // element that the cursor has gone to, do not leave
        if (DOM.hasDescendant(el, ev.relatedTarget)) return; 
        //if (ev.relatedTarget !== el.parentNode) return; 
        func_(ev);
      };
      break;
    case 'mousewheel':
      if (DOM.env.firefox) type = 'DOMMouseScroll';
      break;
  }

  var data = DOM.getData(el, 'events');

  if (!data) {
    DOM.setData(el, 'events', data = {});
    if (__bound) __bound.push(el);
  }

  var handle = data[type];

  if (!handle) {
    handle = function(event) {
      event = wrap(event);
      var last
        , ret
        , i = 0
        , l = handle.func.length;

      for (; i < l; i++) {
        try {
          last = handle.func[i].call(el, event);
          if (last !== undefined) ret = last;
          if (event.dead) break;
        } catch(e) {
          console.error(e.stack || e + '');
        }
      }

      return ret;
    };
    handle.func = [];
    if (!~type.indexOf('.')) {
      if (el.attachEvent) {
        el.attachEvent('on' + type, handle);
      } else {
        el.addEventListener(type, handle, false);
      }
    }
    data[type] = handle;
  }

  handle.func.push(func);
};

var once = function(el, type, func) {
  addListener(el, type, function handle() {
    var ret = func.apply(this, slice.call(arguments));
    removeListener(el, type, handle);
    return ret;
  });
};

var removeListener = function(el, type, func) {
  var data = DOM.getData(el, 'events');
  if (!data) return;

  if (!type) {
    for (type in data) {
      removeListener(el, type);
    }
    DOM.setData(el, 'events', undefined);

    if (__bound) {
      var i = __bound.length;
      while (i--) if (__bound[i] === el) {
        __bound.splice(i, 1);
        break;
      }
    }
    return;
  }

  if (~type.indexOf(' ')) {
    type = type.split(' ');
    var i = type.length;
    while (i--) {
      removeListener(el, type[i], func);
    }
    return;
  }

  switch (type) {
    case 'mouseenter':
      type = 'mouseover';
      break;
    case 'mouseleave':
      type = 'mouseout';
      break;
    case 'mousewheel':
      if (DOM.env.firefox) type = 'DOMMouseScroll';
      break;
  }

  var handle = data[type];
  if (!handle) return;

  if (!func) {
    if (!~type.indexOf('.')) {
      if (el.detachEvent) {
        el.detachEvent('on' + type, handle);
      } else {
        el.removeEventListener(type, handle, false);
      }
    }
    data[type] = undefined;
    return;
  }

  var i = handle.func.length;
  while (i--) {
    if (handle.func[i] === func) {
      handle.func.splice(i, 1);
      break;
    }
  }

  if (handle.func.length === 0) {
    removeListener(el, type);
  }
};

var listeners = function(el, type) {
  var data = DOM.getData(el, 'events');
  if (!data || !data[type]) return [];
  return data[type].func;
};

// emit a custom or native event, 
// simulate bubbling
var emit = function(el, type, event) {
  if (!el) {
    // emit for ALL elements
    el = document.getElementsByTagName('*');
    var i = el.length;
    while (i--) if (el[i].nodeType === 1) {
      emit(el[i], type, event);
    }
    return;
  }

  event = event || {};
  event.target = event.target || el;
  event.type = event.type || type;

  // simulate bubbling
  while (el) {
    var data = DOM.getData(el, 'events')
      , handle = data && data[type];

    if (handle) {
      event.currentTarget = el;
      var ret = handle.call(el, event);
      if (ret === false || event.cancelBubble) break;
    }

    el = el.parentNode 
      || el.ownerDocument
      || el.defaultView 
      || el.parentWindow;
  }
};

/**
 * Delegation
 */

var live = function(sel, type, func) {
  return delegate(root, sel, type, func);
};

var kill = function(sel, type, func) {
  return undelegate(root, sel, type, func);
};

var delegate = function(el, sel, type, func) {
  if (typeof type === 'object') {
    return each(type, function(func, type) {
      delegate(el, sel, type, func);
    });
  }

  var data = DOM.getData(el, 'delegated');
  if (!data) {
    DOM.setData(el, 'delegated', data = []);
  }

  var handle = function(event) {
    if (event.target === el) return;
    if (DOM.matches(event.target, sel)) {
      event.currentTarget = event.target;
      return func.call(this, event);
    }
  };

  handle.func = func;
  handle.sel = sel;
  handle.type = type;

  addListener(el, type, handle);
  data.push(handle);
};

var undelegate = function(el, sel, type, func) {
  var data = DOM.getData(el, 'delegated')
    , i = data && data.length;

  if (!data) return;

  while (i--) {
    if (data[i].func === func
        && data[i].type === type
        && data[i].sel === sel) {
      removeListener(el, type, data[i]);
    }
  }
};

/**
 * Expose
 */

DOM.implement({
  emit: emit,
  once: once,
  addListener: addListener,
  removeListener: removeListener,
  removeAllListeners: removeListener,
  listeners: listeners,
  delegate: delegate,
  undelegate: undelegate
});

DOM.on = DOM.addListener;
DOM.prototype.on = DOM.prototype.addListener;
DOM.off = DOM.removeListener;
DOM.prototype.off = DOM.prototype.removeListener;

DOM.ready = ready;
DOM.live = live;
DOM.kill = kill;

/**
 * Bubble Submit
 */

if (function() {
  var el = document.createElement('div');
  if ('onsubmit' in el) return;
  el.setAttribute('onsubmit', '');
  return typeof el.onsubmit !== 'function';
}()) {
  DOM.live('button, input', 'click keypress', function(event) {
    var type = event.target.type
      , form;

    if (type 
        && type !== 'submit' 
        && type !== 'image') return;

    if (event.type === 'keypress' 
        && event.key() !== 13) return;
    
    form = event.target;
    while (form.nodeName.toLowerCase() !== 'form' 
           && (form = form.parentNode));
    if (!form) return;

    event.target = form;
    event.type = 'submit';
    DOM.emit(form.parentNode, 'submit', event);
  });
}
})();

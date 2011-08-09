/**
 * Drop-in selector engine
 */

DOM.select = function select(selector, context) {
  // parse groups
  if (~selector.indexOf(',')) {
    selector = selector.split(/\s*,\s*/);
    var out = [];
    each(selector, function(selector) {
      each(select(selector, context), function(el) {
        if (!has(out, el)) out.push(el);
      });
    });
    return out;
  }

  // select by tagName/id
  context = normalize(context || document);
  if (selector[0] === '#') {
    return [context.getElementById(selector.substring(1))];
  } else {
    selector = context.getElementsByTagName(selector);
    try {
      return slice.call(selector);
    } catch(e) {
      var a = []
        , i = 0
        , l = selector.length;

      for (; i < l; i++) 
        if (selector[i].nodeType === 1) 
          a.push(selector[i]);

      return a;
    }
  }
};

DOM.matches = function(el, selector) {
  var res = DOM.select(selector)
    , i = res.length;

  while (i--) 
    if (el === res[i])
      return true;
};

DOM.prototype.matches = function(selector) {
  var res = DOM.select(selector)
    , i = res.length
    , el
    , dom = this.dom
    , l;

  while (i--) {
    el = res[i];
    l = dom.length;
    while (l--) 
      if (dom[l] === el) 
        return true;
  }
};

DOM.prototype.select = function(selector) {
  var res = [];
  each(this.dom, function(el) {
    each(DOM.select(selector, el), function(el) {
      var i = 0
        , l = res.length;

      for (; i < l; i++) 
        if (res[i] === el) 
          return;

      res.push(el);
    });
  });
  return DOM(res);
};

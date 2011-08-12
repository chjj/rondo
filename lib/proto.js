/**
 * Prototype Iterative Behavior
 */

/** 
 * How this works:
 * The purely procedural methods have
 * no knowledge of DOM objects, they only
 * acknowledge the raw DOM, the only collection
 * is an array, etc.
 * This makes code more portable, the iterative
 * behavior is layered on top unobtrusively.
 */

DOM._execute = function(key, type) {
  var obj;

  if (typeof key === 'object') {
    obj = key;
    return each(obj, function(type, key) {
      execute(key, type);
    });
  } else if (typeof type === 'object') {
    obj = type;
    type = key;
    return each(obj, function(func, key) {
      DOM[key] = func;
      execute(key, type);
    });
  } else {
    return execute(key, type);
  }
};

function execute(key, type) {
  var exec = DOM._execute[type];

  if (!exec) return;

  DOM.prototype[key] = function() {
    return exec.call(this, arguments, DOM[key]);
  };
}

DOM._execute.set = function(args_, func) {
  var args = slice.call(args_)
    , dom = this.dom
    , i = 0
    , l = dom.length
    , ret;

  args.unshift(null);

  for (; i < l; i++) {
    args[0] = dom[i];
    func.apply(this, args);
  }

  return this;
};

DOM._execute.set_all = DOM._execute.set;

// experimental, for appendTo, append, etc
DOM._execute.set_dom = function(args_, func) {
  var args = slice.call(args_)
    , sub = args[1].dom ? args[1] : DOM(args[1])
    , first = true;

  return DOM._execute.set_all(args_, function(el) {
    args[0] = el;
    args[1] = first 
      ? (first = false) || sub
      : sub.clone(true);
    func.apply(this, args);
  });
};

DOM._execute.set_single = function(args_, func) {
  var args = slice.call(args_);
  args.unshift(this.dom[0]);
  func.apply(this, args);
  return this;
};

DOM._execute.get_element = function(args_, func) {
  var args = slice.call(args_)
    , dom = this.dom
    , i = 0
    , l = dom.length
    , ret
    , out = [];

  args.unshift(null);

  for (; i < l; i++) {
    args[0] = dom[i];
    ret = func.apply(this, args);
    if (ret && !has(out, ret)) out.push(ret);
  }

  return DOM(out);
};

DOM._execute.get_array = function(args_, func) {
  var args = slice.call(args_)
    , dom = this.dom
    , i = 0
    , l = dom.length
    , ret
    , out = [];

  args.unshift(null);

  for (; i < l; i++) {
    args[0] = dom[i];
    if (ret = func.apply(this, args)) {
      each(ret, function(el) {
        if (!has(out, el)) out.push(el);
      });
    }
  }

  return DOM(out);
};

DOM._execute.get_single = function(args_, func) {
  var args = slice.call(args_);
  args.unshift(this.dom[0]);
  return func.apply(this, args);
};

DOM._execute({
  next: 'get_element',
  previous: 'get_element',
  child: 'get_element',
  last: 'get_element',
  parent: 'get_element',
  descendant: 'get_element',
  ancestor: 'get_element',
  children: 'get_array',
  descendants: 'get_array',
  parents: 'get_array',
  ancestors: 'get_array',
  above: 'get_array',
  below: 'get_array',
  siblings: 'get_array',
  hasParent: 'get_single',
  hasChild: 'get_single',
  hasAncestor: 'get_single',
  hasDescendant: 'get_single',
  hasAboveSibling: 'get_single',
  hasBelowSibling: 'get_single',
  hasSibling: 'get_single',
  focus: 'set_all',
  blur: 'set_all',
  submit: 'set_all',
  userClone: 'get_element',
  copyEvents: 'none',
  fixClone: 'none',
  clone: 'get_element',
  setText: 'set_all',
  getText: 'get_single',
  addClass: 'set_all',
  hasClass: 'get_single',
  removeClass: 'set_all',
  toggleClass: 'set_all',
  show: 'set_all',
  hide: 'set_all',
  setContent: 'set_all',
  clean: 'set_all',
  getContent: 'get_single',
  value: 'get_single',
  append: 'set_all',
  appendTo: 'set_all',
  prepend: 'set_all',
  prependTo: 'set_all',
  replaceWith: 'set_all',
  replace: 'set_all',
  before: 'set_all',
  after: 'get_element',
  precede: 'set_all',
  follow: 'set_all',
  wrap: 'set_all',
  destroy: 'set_all',
  detach: 'set_all',
  serialize: 'get_single',
  getWindow: 'get_single',
  getDocument: 'get_single',
  getRoot: 'get_single',
  getHead: 'get_single',
  getBody: 'get_single',
  isWindow: 'get_single',
  isDocument: 'get_single',
  isRoot: 'get_single',
  isHead: 'get_single',
  isBody: 'get_single',
  isXML: 'get_single',
  getAttribute: 'get_single',
  setAttribute: 'set_all',
  hasAttribute: 'get_single',
  removeAttribute: 'set_all',
  getProperty: 'get_single',
  setProperty: 'set_all',
  hasProperty: 'get_single',
  removeProperty: 'set_all',
  height: 'get_single',
  width: 'get_single',
  top: 'get_single',
  left: 'get_single',
  right: 'get_single',
  bottom: 'get_single',
  offsetParent: 'get_single',
  offset: 'get_single',
  viewport: 'get_single',
  setScroll: 'set_single',
  getScroll: 'get_single',
  scrollIntoView: 'set_single',
  getStyle: 'get_single',
  setStyle: 'set_all',
  getData: 'get_single',
  setData: 'set_all',
  removeData: 'set_all',
  clearData: 'set_all',
  get: 'get_single',
  set: 'set_all',
  has: 'get_single',
  remove: 'set_all',
  select: 'get_array', // test
  matches: 'get_single',
  emit: 'set_all',
  once: 'set_all',
  addListener: 'set_single',
  on: 'set_single', // shouldnt have to do this
  removeListener: 'set_all',
  off: 'set_all', // shouldnt have to do this
  removeAllListeners: 'set_all',
  listeners: 'get_single',
  delegate: 'set_all',
  undelegate: 'set_all',
  render: 'set_all'
});

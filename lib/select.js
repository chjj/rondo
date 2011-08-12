/**
 * Selector Engine
 */

#include "zest.js"

var zest = window.zest;
delete window.zest;

DOM.select = function(selector, context) {
  return zest(selector, normalize(context));
};

DOM.implement('matches', zest.matches);

/*DOM.prototype.select = function(selector) {
  var results = [];
  each(this.dom, function(el) {
    each(DOM.select(selector, el), function(el) {
      if (!has(results, el)) results.push(el);
    });
  });
  return DOM(results);
};*/


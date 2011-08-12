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

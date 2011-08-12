# rondo

The browser is not node. __Rondo__ is an attempt at fixing this problem. 

Rondo is a client-side DOM library and application suite. The API is modeled 
after the modules and conventions of __node.js__, to give a more node-like 
feel to the frontend. It comes included with three core modules: a dom 
library (`dom`), an api for doing network io (`io`), and an application 
framework and router (`app`).

The DOM module is built on top of the high speed and extensible
[Zest selector engine](https://github.com/chjj/zest).

This has been a project and experiment of mine for some time. I felt like 
reinventing the wheel. This is an early release. The API is unstable. Tests 
still need to be polished. 

## What it looks like

``` js
var $ = require('dom')
  , io = require('io')
  , app = require('app');

app.set('engine', mustache);
app.set('view', '#content');

app.get('/:foo', function(req, next) {
  req.setCookie('hello', 'world');
  req.setHeader('Content-Type', 'application/json');
  req.send({ hello: req.params.foo }, function(err, res) {
    if (err) return req.redirect('/404');
    req.render('#template1', {
      hello: !req.query.world ? 'mars' : 'world',
      data: res.body
    });
    setTimeout(next, 2000);
  });
});

$.ready(function() {
  if (app.getPath() !== '/') {
    $('#content').render('#template2', {
      another: 'page',
      and: 'more locals'
    });
    setTimeout(function() {
      app.setPath('/');
    }, 2000);
  }

  $('<a>hello</a>', {
    '@href': '/foo',
    '@title': 'click me!',
    ':margin-left': '-20px',
    ':color': 'red',
    'className': 'foo'
  }).appendTo('#content');
});

$.live('button', 'click', function(ev) {
  var el = $(ev.target);
  el.setContent('<b>thanks for clicking me</b>');
  el.set(':color', '#000');
  el.animate({scale:1.5});
  ev.preventDefault();
});

io.script('/foo.js', function(err) {
  if (!err) console.log('loaded');
});
```

The app's router was intended to act like the connect/express router. It will 
wrap your handlers in a try/catch, and pass a caught error down the stack.

## Installation and Build

``` bash
$ npm install rondo
$ cd rondo
$ make
```

## Browser Support

I don't want to support every browser ever made. I'm currently (and 
reluctantly) supporting IE7. I maybe want to drop IE support in the 
future, once the stranglehold IE has on the web loses even more of its grip.

## API

### DOM (defined in dom.js)

- Numerous. Consult lib/dom.js for now.

### Request (defined in io.js)

- `req.method`
- `req.headers`
- `req.url` - The URL of the request.
- `req.pathname`
- `req.query` - The query object.
- `req.rawQuery` - The query string.
- `req.cookies`
- `req.body` - The body's object.
- `req.rawBody` - The body's data.
- `req.setHeader`
- `req.getHeader`
- `req.header`
- `req.setCookie`
- `req.getCookie`
- `req.send` - Send a request using the current `req.url`.

### Response (defined in io.js)

- `res.url`
- `res.statusCode`
- `res.headers`
- `res.body`
- `res.rawBody`

### IO (defined in io.js)

- `io.request` - Send an XHR.
- `io.get`
- `io.post`
- `io.jsonp` - A JSONP request.
- `io.script` - Dynamically insert and load a script.

### Application (defined in app.js)

- `app.settings` - The configuration of the app.
- `app.set` - Set or get a setting.
- `app.render` - Render a template.
- `app.get`, `app.put`, `app.post`, `app.del` - Router API.
- `app.setPath` - Set's the current path.
- `app.getPath` - Get the current path.

## License

MIT Licensed.  
See LICENSE for more info.

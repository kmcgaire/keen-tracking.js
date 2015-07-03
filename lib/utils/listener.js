var Emitter = require('component-emitter');
var Sizzle = require('sizzle');

var each = require('./each');

/*

  // Create a new element listner
  var myClickerCatcher = Keen.utils.listener(".nav li > a");

  // Listen for a given event
  myClicker.on("click", function(e){
    // do stuff!
  });

  // Listen for event once
  myClicker.once("click", function(e){ });

  // Cancel a given event listener
  myClicker.off("click");

  // Cancel all event listners
  myClicker.off();

*/

module.exports = function(ctx){

  // Make sure this object exists
  ctx.domListeners = ctx.domListeners || {
    /*
    'click': {
      '.nav li > a': [fn, fn, fn]
    }
    */
  };

  // Define .listenTo() function
  ctx.listenTo = ctx.listenTo || function(listenerHash){
    each(listenerHash, function(callback, key){
      var split = key.split(' ');
      var eventType = split[0],
          selector = split.splice(1).join(' ');
      // Create an unassigned listener
      return listener(selector).on(eventType, callback);
    });
  };

  function eventHandler(eventType){
    return function(e){
      var evt, target;

      evt = e || window.event;
      target = evt.target || evt.srcElement;

      // If nothing assigned to this event type, let it go
      if ('undefined' === ctx.domListeners[eventType]) return;

      each(ctx.domListeners[eventType], function(handlers, key){
        if (Sizzle.matches(key, [target]).length) {

          // Call all handlers for this eventType + node
          each(handlers, function(fn, i){
            if ('click' === eventType && 'A' === target.nodeName) {
              deferClickEvent(evt, target, fn);
            }
            else if ('submit' === eventType && 'FORM' === target.nodeName) {
              deferFormSubmit(evt, target, fn);
            }
            else {
              fn(evt);
            }
          });
        }
        else if ('window' === key) {
          // Call all handlers
          each(handlers, function(fn, i){
            fn(evt);
          });
        }
        return;
      });
    };
  }

  function listener(str){
    if (!str) return;
    if (this instanceof listener === false) {
      return new listener(str);
    }
    this.selector = str;
    return this;
  }

  listener.prototype.on = function(str, fn){
    var self = this;

    if (arguments.length !== 2 || 'string' !== typeof str || 'function' !== typeof fn) return this;

    // Set each listener on a parent dictionary, indexed by event:
    if ('undefined' === typeof ctx.domListeners[str]) {
      addListener(str, eventHandler(str));
      ctx.domListeners[str] = {};
    }
    ctx.domListeners[str][self.selector] = ctx.domListeners[str][self.selector] || [];
    ctx.domListeners[str][self.selector].push(fn);
    return self;
  };

  listener.prototype.once = function(str, fn){
    var self = this;
    function on() {
      self.off(str, on);
      return fn.apply(self, arguments);
    }
    on.fn = fn;
    self.on(str, on);
    return self;
  };

  listener.prototype.off = function(str, fn){
    var self = this, survivors = [];
    if (arguments.length === 2) {
      each(ctx.domListeners[str][self.selector], function(handler, i){
        if (handler === fn || handler.fn === fn) return;
        survivors.push(handler);
      });
      ctx.domListeners[str][self.selector] = survivors;
    }
    else if (arguments.length === 1) {
      try {
        delete ctx.domListeners[str][self.selector];
      }
      catch(e){
        ctx.domListeners[str][self.selector] = [];
      }
    }
    else {
      // loop over every eventType and delete handlers
      each(ctx.domListeners, function(hash, eventType){
        // if ('undefined' === typeof hash[str]) return;
        try {
          delete ctx.domListeners[eventType][self.selector];
        }
        catch(e){
          ctx.domListeners[eventType][self.selector] = function(){};
        }
      });
    }
    return self;
  };

  return listener;
}


// ------------------------------
// Attach global event listener
// ------------------------------

function addListener(eventType, fn){
  if (document.addEventListener) {
    document.addEventListener(eventType, fn, false);
  } else {
    document.attachEvent("on" + eventType, fn);
  }
}


// ------------------------------
// Handle 'click' events (A)
// ------------------------------

function deferClickEvent(evt, anchor, callback){
  var timeout = 500,
      targetAttr,
      cbResponse;

  // Get 'target' attribute from anchor
  if (anchor.getAttribute !== void 0) {
    targetAttr = anchor.getAttribute("target");
  } else if (anchor.target) {
    targetAttr = anchor.target;
  }

  // Fire listener and catch possible response (return false)
  cbResponse = callback(evt);

  // If prevented within callback, bail:
  if (('boolean' === typeof cbResponse && cbResponse === false) || evt.defaultPrevented || evt.returnValue === false) {
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    evt.returnValue = false;
    return false;
  }
  // Else if anchor doesn't kick off a new window or tab.. defer and replay the event:
  else if (targetAttr !== '_blank' && targetAttr !== 'blank' && !evt.metaKey) {
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    evt.returnValue = false;
    setTimeout(function(){
      window.location = anchor.href;
    }, timeout);
  }

  return false;
}


// ------------------------------
// Handle 'submit' events (FORM)
// ------------------------------

function deferFormSubmit(evt, form, callback){
  var timeout = 500;

  // Fire listener and catch possible response (return false)
  cbResponse = callback(evt);

  // If prevented within callback, bail
  if (('boolean' === typeof cbResponse && cbResponse === false) || evt.defaultPrevented || evt.returnValue === false) {
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    evt.returnValue = false;
    return false;
  }
  // Defer and replay event
  else {
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    evt.returnValue = false;
    setTimeout(function(){
      form.submit();
    }, timeout);
  }

  return false;
}
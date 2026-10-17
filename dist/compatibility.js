(function () {
  "use strict";

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
      return window.setTimeout(function () { callback(Date.now()); }, 16);
    };
    window.cancelAnimationFrame = window.clearTimeout;
  }

  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, "at", {
      value: function (index) {
        index = Number(index) || 0;
        index = index < 0 ? Math.ceil(index) : Math.floor(index);
        if (index < 0) index += this.length;
        return this[index];
      },
    });
  }

  if (!Array.prototype.flatMap) {
    Object.defineProperty(Array.prototype, "flatMap", {
      value: function (callback, thisArg) {
        return this.reduce(function (result, value, index, array) {
          return result.concat(callback.call(thisArg, value, index, array));
        }, []);
      },
    });
  }

  if (!Object.fromEntries) {
    Object.fromEntries = function (entries) {
      return Array.prototype.reduce.call(entries, function (result, pair) {
        result[pair[0]] = pair[1];
        return result;
      }, {});
    };
  }

  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }

  if (window.Element && !Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  }

  if (window.Element && !Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      var element = this;
      while (element && element.nodeType === 1) {
        if (element.matches(selector)) return element;
        element = element.parentElement;
      }
      return null;
    };
  }

  if (window.Promise && !Promise.allSettled) {
    Promise.allSettled = function (promises) {
      return Promise.all(Array.prototype.map.call(promises, function (promise) {
        return Promise.resolve(promise).then(function (value) {
          return { status: "fulfilled", value: value };
        }, function (reason) {
          return { status: "rejected", reason: reason };
        });
      }));
    };
  }

  var canvasPrototype = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (canvasPrototype && !canvasPrototype.roundRect) {
    canvasPrototype.roundRect = function (x, y, width, height, radii) {
      var radius = Array.isArray(radii) ? Number(radii[0]) : Number(radii);
      radius = Math.max(0, Math.min(isFinite(radius) ? radius : 0, Math.abs(width) / 2, Math.abs(height) / 2));
      this.moveTo(x + radius, y);
      this.arcTo(x + width, y, x + width, y + height, radius);
      this.arcTo(x + width, y + height, x, y + height, radius);
      this.arcTo(x, y + height, x, y, radius);
      this.arcTo(x, y, x + width, y, radius);
      this.closePath();
      return this;
    };
  }

  var memory = Number(navigator.deviceMemory || 0);
  var cores = Number(navigator.hardwareConcurrency || 0);
  var userAgent = String(navigator.userAgent || "");
  var ios = /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints || 0) > 1);
  var mobileSafari = ios && /AppleWebKit/.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  var lowPower = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
  var cssPixels = Math.max(1, Number(screen.width || 0) * Number(screen.height || 0));
  // Safari often reports only a few CPU cores, which used to force the game
  // down to a 1x canvas without antialiasing. Keep its scene budget modest,
  // but render an iPhone canvas sharply at 2x. Large iPads use 1.5x.
  var pixelRatioCap = mobileSafari ? (cssPixels > 700000 ? 1.5 : 2) : (lowPower ? 1.25 : 1.75);
  window.EmiliaCompatibility = {
    lowPower: lowPower,
    mobileSafari: mobileSafari,
    antialias: mobileSafari || !lowPower,
    pixelRatioCap: pixelRatioCap,
    touch: "ontouchstart" in window || Number(navigator.maxTouchPoints || 0) > 0,
  };
  document.documentElement.classList.toggle("low-power", lowPower);
})();

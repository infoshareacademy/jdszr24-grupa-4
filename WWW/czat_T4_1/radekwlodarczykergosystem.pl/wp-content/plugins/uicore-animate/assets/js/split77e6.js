'use strict';

var root = document;
var createText = root.createTextNode.bind(root);

/**
 * # setProperty
 * Apply a CSS var
 * @param {HTMLElement} el
 * @param {string} varName
 * @param {string|number} value
 */
function setProperty(el, varName, value) {
  el.style.setProperty(varName, value);
}

/**
 *
 * @param {!HTMLElement} el
 * @param {!HTMLElement} child
 */
function appendChild(el, child) {
  return el.appendChild(child);
}

/**
 *
 * @param {!HTMLElement} parent
 * @param {string} key
 * @param {string} text
 * @param {boolean} whitespace
 */
function createElement(parent, key, text, whitespace) {
  var el = root.createElement('span');
  key && (el.className = key);
  if (text) {
    !whitespace && el.setAttribute("data-" + key, text);
    el.textContent = text;
  }
  return parent && appendChild(parent, el) || el;
}

/**
 *
 * @param {!HTMLElement} el
 * @param {string} key
 */
function getData(el, key) {
  return el.getAttribute("data-" + key);
}

/**
 *
 * @param {import('../types').Target} e
 * @param {!HTMLElement} parent
 * @returns {!Array<!HTMLElement>}
 */
function $(e, parent) {
  return !e || e.length == 0 ?
  // null or empty string returns empty array
  [] : e.nodeName ?
  // a single element is wrapped in an array
  [e] :
  // selector and NodeList are converted to Element[]
  [].slice.call(e[0].nodeName ? e : (parent || root).querySelectorAll(e));
}

/**
 * Creates and fills an array with the value provided
 * @param {number} len
 * @param {() => T} valueProvider
 * @return {T}
 * @template T
 */
function Array2D(len) {
  var a = [];
  for (; len--;) {
    a[len] = [];
  }
  return a;
}

/**
 * A for loop wrapper used to reduce js minified size.
 * @param {!Array<T>} items
 * @param {function(T):void} consumer
 * @template T
 */
function each(items, consumer) {
  items && items.some(consumer);
}

/**
 * @param {T} obj
 * @return {function(string):*}
 * @template T
 */
function selectFrom(obj) {
  return function (key) {
    return obj[key];
  };
}

/**
 * # Splitting.index
 * Index split elements and add them to a Splitting instance.
 *
 * @param {HTMLElement} element
 * @param {string} key
 * @param {!Array<!HTMLElement> | !Array<!Array<!HTMLElement>>} items
 */
function index(element, key, items) {
  var prefix = '--' + key;
  var cssVar = prefix + "-index";
  each(items, function (items, i) {
    if (Array.isArray(items)) {
      each(items, function (item) {
        setProperty(item, cssVar, i);
      });
    } else {
      setProperty(items, cssVar, i);
    }
  });
  setProperty(element, prefix + "-total", items.length);
}

/**
 * @type {Record<string, import('./types').ISplittingPlugin>}
 */
var plugins = {};

/**
 * @param {string} by
 * @param {string} parent
 * @param {!Array<string>} deps
 * @return {!Array<string>}
 */
function resolvePlugins(by, parent, deps) {
  // skip if already visited this dependency
  var index = deps.indexOf(by);
  if (index == -1) {
    // if new to dependency array, add to the beginning
    deps.unshift(by);

    // recursively call this function for all dependencies
    var plugin = plugins[by];
    if (!plugin) {
      throw new Error("plugin not loaded: " + by);
    }
    each(plugin.depends, function (p) {
      resolvePlugins(p, by, deps);
    });
  } else {
    // if this dependency was added already move to the left of
    // the parent dependency so it gets loaded in order
    var indexOfParent = deps.indexOf(parent);
    deps.splice(index, 1);
    deps.splice(indexOfParent, 0, by);
  }
  return deps;
}

/**
 * Internal utility for creating plugins... essentially to reduce
 * the size of the library
 * @param {string} by
 * @param {string} key
 * @param {string[]} depends
 * @param {Function} split
 * @returns {import('./types').ISplittingPlugin}
 */
function createPlugin(by, depends, key, split) {
  return {
    by: by,
    depends: depends,
    key: key,
    split: split
  };
}

/**
 *
 * @param {string} by
 * @returns {import('./types').ISplittingPlugin[]}
 */
function resolve(by) {
  return resolvePlugins(by, 0, []).map(selectFrom(plugins));
}

/**
 * Adds a new plugin to splitting
 * @param {import('./types').ISplittingPlugin} opts
 */
function add(opts) {
  plugins[opts.by] = opts;
}

/**
 * # Splitting.split
 * Split an element's textContent into individual elements
 * @param {!HTMLElement} el  Element to split
 * @param {string} key
 * @param {string} splitOn
 * @param {boolean} includePrevious
 * @param {boolean} preserveWhitespace
 * @return {!Array<!HTMLElement>}
 */
function splitText(el, key, splitOn, includePrevious, preserveWhitespace, isCut = false) {
  // Combine any strange text nodes or empty whitespace.
  el.normalize();

  // Use fragment to prevent unnecessary DOM thrashing.
  var elements = [];
  var F = document.createDocumentFragment();
  if (includePrevious) {
    elements.push(el.previousSibling);
  }
  var allElements = [];
  $(el.childNodes).some(function (next) {
    /* Split images too*/
    if (next.nodeType === 1 && (next.classList.contains('ui-e-highlight-image') || next.classList.contains('ui-e-highlight-icon') || next.nodeName == 'IMG')) {
      elements.push(next);
    }
    /* Split images too*/

    if (next.tagName && !next.hasChildNodes()) {
      // keep elements without child nodes (no text and no children)
      allElements.push(next);
      return;
    }
    // Recursively run through child nodes
    if (next.childNodes && next.childNodes.length) {
      allElements.push(next);
      elements.push.apply(elements, splitText(next, key, splitOn, includePrevious, preserveWhitespace));
      return;
    }

    // Get the text to split, trimming out the whitespace
    /** @type {string} */
    var wholeText = next.wholeText || '';
    var contents = wholeText.trim();

    // If there's no text left after trimming whitespace, continue the loop
    if (contents.length) {
      // insert leading space if there was one
      if (wholeText[0] === ' ') {
        allElements.push(createText(' '));
      }
      // Concatenate the split text children back into the full array
      each(contents.split(splitOn), function (splitText, i) {
        if (i && preserveWhitespace) {
          allElements.push(createElement(F, "whitespace", " ", preserveWhitespace));
        }
        var splitEl = createElement(F, key, splitText);
        if (isCut && key === 'char') {
          let wrap = root.createElement('span');
          wrap.className = 'ui-e-cut';
          wrap.appendChild(splitEl);
          splitEl = wrap;
        }
        elements.push(splitEl);
        allElements.push(splitEl);
      });
      // insert trailing space if there was one
      if (wholeText[wholeText.length - 1] === ' ') {
        allElements.push(createText(' '));
      }
    }
  });
  each(allElements, function (el) {
    appendChild(F, el);
  });

  // Clear out the existing element
  el.innerHTML = "";
  appendChild(el, F);
  return elements;
}
function copy(dest, src) {
  for (var k in src) {
    dest[k] = src[k];
  }
  return dest;
}
var WORDS = 'words';
var wordPlugin = createPlugin(/* by= */WORDS, /* depends= */0, /* key= */'word', /* split= */function (el, options) {
  return splitText(el, 'word', /\s+/, 0, 1, options.isCut);
});
var CHARS = "chars";
var charPlugin = createPlugin(/* by= */CHARS, /* depends= */[WORDS], /* key= */"char", /* split= */function (el, options, ctx) {
  var results = [];
  each(ctx[WORDS], function (word, i) {
    results.push.apply(results, splitText(word, "char", "", false, options.whitespace && i, options.isCut));
  });
  return results;
});

/**
 * # Splitting
 *
 * @param {import('./types').ISplittingOptions} opts
 * @return {!Array<*>}
 */
function Splitting(opts) {
  opts = opts || {};
  var key = opts.key;
  return $(opts.target || '[data-splitting]').map(function (el) {
    var ctx = el['🍌'];
    if (!opts.force && ctx) {
      return ctx;
    }
    ctx = el['🍌'] = {
      el: el
    };
    var by = opts.by || getData(el, 'splitting');
    if (!by || by == 'true') {
      by = CHARS;
    }
    var items = resolve(by);
    var opts2 = copy({}, opts);
    each(items, function (plugin) {
      if (plugin.split) {
        var pluginBy = plugin.by;
        var key2 = (key ? '-' + key : '') + plugin.key;
        var results = plugin.split(el, opts2, ctx);
        key2 && index(el, key2, results);
        ctx[pluginBy] = results;
        el.classList.add(pluginBy);
      }
    });
    el.classList.add('splitting');
    return ctx;
  });
}

/**
 * # Splitting.html
 *
 * @param {import('./types').ISplittingOptions} opts
 */
function html(opts) {
  opts = opts || {};
  var parent = opts.target = createElement();
  parent.innerHTML = opts.content;
  Splitting(opts);
  return parent.outerHTML;
}
Splitting.html = html;
Splitting.add = add;

/**
 * Detects the grid by measuring which elements align to a side of it.
 * @param {!HTMLElement} el
 * @param {import('../core/types').ISplittingOptions} options
 * @param {*} side
 */
function detectGrid(el, options, side) {
  var items = $(options.matching || el.children, el);
  var c = {};
  each(items, function (w) {
    var val = Math.round(w[side]);
    (c[val] || (c[val] = [])).push(w);
  });
  return Object.keys(c).map(Number).sort(byNumber).map(selectFrom(c));
}

/**
 * Sorting function for numbers.
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function byNumber(a, b) {
  return a - b;
}
var linePlugin = createPlugin(/* by= */'lines', /* depends= */[WORDS], /* key= */'line', /* split= */function (el, options, ctx) {
  return detectGrid(el, {
    matching: ctx[WORDS]
  }, 'offsetTop', options.isCut);
});

// install plugins
// word/char plugins
add(wordPlugin);
add(charPlugin);
add(linePlugin);
window.addEventListener('DOMContentLoaded', () => {
  class SPLIT extends elementorModules.frontend.handlers.Base {
    bindEvents() {
      if (this.getElementSettings('ui_animate_split') === 'ui-split-animate') {
        jQuery(this.$element).css('opacity', 0);
        this.processAnimation();
      }
    }
    processAnimation() {
      if (elementorFrontend.isEditMode()) {
        this.unsplit();
        setTimeout(() => {
          this.split();
        }, 20);
        setTimeout(() => {
          this.animate();
        }, 80);
      } else {
        this.split();
        this.animate();

        // Retriggers on language change (currently supporting only GTranslate)
        if (!!document.querySelector('script[src*="/gtranslate/js"]')) {
          const observer = new MutationObserver(mutationsList => {
            for (const mutation of mutationsList) {
              if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
                observer.disconnect();
                // Wait a little since the html lang apparently changes before the text
                setTimeout(() => {
                  this.split();
                  this.animate();
                }, 750);
              }
            }
          });
          observer.observe(document.documentElement, {
            attributes: true
          });
        }
      }
    }

    /**
     * Check if the optimized markup experiment is enabled and return it, or return the proper class for the inner widget container if requested
     *
     * @param {boolean} classname If true, return the inner widget container class instead of the experiment status
     *
     * @return {string|boolean} The experiment value or the class name
     */
    isMarkupOptimized(classname = false) {
      const experiment = elementorFrontend.config.experimentalFeatures.e_optimized_markup;
      if (classname) {
        return experiment ? '' : '.elementor-widget-container';
      }
      return experiment;
    }
    onElementChange(prop) {
      var is_split = this.getElementSettings('ui_animate_split') === 'ui-split-animate';
      if (prop === 'ui_animate_split' && is_split) {
        this.unsplit();
        setTimeout(() => {
          this.split();
        }, 80);
      }
      if (prop === 'ui_animate_split_by' && is_split) {
        this.unsplit();
        setTimeout(() => {
          this.split();
        }, 80);
      }
      if (is_split) {
        if (prop.indexOf('ui_animate') !== -1) {
          this.unsplit();
          setTimeout(() => {
            this.split();
          }, 80);
          this.$element.find('.' + this.get_split(false)).attr('class', this.get_split(false) + '');
          setTimeout(() => {
            this.animate();
          }, 100);
        }
      } else if (prop === 'ui_animate_split') {
        this.unsplit();
      }
      return;
    }
    split() {
      // If `googtrans` cookie is set, it means the GTranslate plugin is already translating
      // the page texts, forcing us to not split text so it can be properly translated
      if (document.querySelector('script[src*="/gtranslate/js"]') && document.cookie.split('; ').find(cookie => cookie.startsWith('googtrans' + '='))) {
        return;
      }
      let isCut = false;
      const split = this.get_split();
      const container = this.isMarkupOptimized(true);
      let el = this.isMarkupOptimized ? this.$element.find(`${container} > *:not(style):not(.ui-e-highlight-icon):not(.ui-e-highlight-image)`) : this.$element.find('*:not(style):not(.ui-e-highlight-icon):not(.ui-e-highlight-image)');
      if (el.length == 0) {
        if (this.isMarkupOptimized) {
          this.$element.wrapInner('<div class=\"elementor-text-editor\"></div>');
        } else {
          this.$element.find(container).wrapInner('<div class=\"elementor-text-editor\"></div>');
        }
        el = this.isMarkupOptimized ? this.$element.find('*:not(style)') : this.$element.find(`${container} > *:not(style)`);
      }
      let animation = this.getElementSettings('ui_animate_split_style');
      if (animation.indexOf('cut') !== -1) {
        animation = animation.replace(' cut', '');
        el.addClass('ui-e-cut');
        isCut = true;
      }
      Splitting({
        target: el,
        by: split,
        key: 'ui-',
        isCut
      });
      el.addClass('ui-e-' + animation);
    }
    unsplit() {
      const avoidTargets = '*:not(style)';
      const container = this.isMarkupOptimized(true);
      const content = this.isMarkupOptimized ? this.$element.find(`${container} > ${avoidTargets}`)[0] : this.$element.find(`${avoidTargets}`)[0];
      const transformedMarkup = content.innerHTML;
      if (!content) {
        return;
      }
      if (content.classList.contains('splitting')) {
        content.innerHTML = transformedMarkup.replace(/<span class="whitespace">(\s)<\/span>/g, '$1').replace(/<span class="char" data-char="\S+" style="--char-index:\s?\d+;">(\S+)<\/span>/g, '$1').replace(/ aria-hidden="true"/g, '').replace(/<span class="word" data-word="\S+" style="--word-index:\s?\d+;( --line-index:\s?\d+;)?">(\S+)<\/span>/g, '$2');
        content.classList.remove('splitting');
      }
    }
    animate() {
      const $el = jQuery(this.$element);
      const animation = this.getElementSettings('ui_animate_split_style');
      const animateChild = this.$element.find('.' + this.get_split(false));
      const el = this.$element.find('.elementor-widget-container > *:not(style)');
      animateChild.removeClass(animation);
      el.addClass('ui-e-' + animation);
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            $el.css('opacity', 1);
            setTimeout(() => {
              el.removeClass('ui-e-' + animation);
            }, 100);
            animateChild.addClass('ui-e-animated');
            animateChild.addClass(animation);
            observer.unobserve(this.$element[0]);
          }
        });
      }, {
        rootMargin: '0px 0px -10% 0px'
      });
      observer.observe(this.$element[0]);
      setTimeout(() => {
        jQuery(this.$element).removeClass('elementor-invisible');
      }, 1);
    }
    get_split(asClass = true) {
      let split = this.getElementSettings('ui_animate_split_by');
      if (!asClass) {
        split = split === 'lines' ? 'words' : split;
        return split.slice(0, -1);
      }
      return split;
    }
  }
  jQuery(window).on('elementor/frontend/init', () => {
    const addHandler = $element => {
      elementorFrontend.elementsHandler.addHandler(SPLIT, {
        $element
      });
    };
    elementorFrontend.hooks.addAction('frontend/element_ready/heading.default', addHandler);
    elementorFrontend.hooks.addAction('frontend/element_ready/text-editor.default', addHandler);
    elementorFrontend.hooks.addAction('frontend/element_ready/uicore-the-title.default', addHandler);
    elementorFrontend.hooks.addAction('frontend/element_ready/uicore-page-description.default', addHandler);
    elementorFrontend.hooks.addAction('frontend/element_ready/highlighted-text.default', addHandler);
  });
}, false);
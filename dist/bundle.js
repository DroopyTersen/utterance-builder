/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }
	
	var utterances = __webpack_require__(1);
	
	var dom = {
	    find: function find(selector) {
	        return [].concat(_toConsumableArray(document.querySelectorAll(selector)));
	    },
	    findOne: function findOne(selector) {
	        return document.querySelector(selector);
	    }
	};
	
	var buildUtterances = function buildUtterances(templates) {
	    return templates.map(function (t) {
	        return utterances(t).map(function (r) {
	            return r.trim();
	        }).join("\n");
	    }).join("\n");
	};
	
	var formSubmit = function formSubmit(e) {
	    e.preventDefault();
	    var value = dom.findOne("#workspace textarea").value;
	    if (value) {
	        var utterancesStr = buildUtterances(value.split("\n"));
	        dom.findOne("#utterance-output textarea").value = utterancesStr;
	    }
	};
	
	dom.findOne("#workspace form").addEventListener("submit", formSubmit);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var Combinatorics = __webpack_require__(2);
	var Numbered      = __webpack_require__(3);
	
	
	// Util functions for generating schema and utterances
	// ===================================================
	// Convert a number range like 5-10 into an array of english words
	function expandNumberRange(start, end, by) {
	  by = by || 1; //incrementing by 0 is a bad idea
	  var converted = [];
	  for (var i=start; i<=end; i+=by) {
	    converted.push( Numbered.stringify(i).replace(/-/g,' ') );
	  }
	  return converted;
	}
	
	// Determine if a curly brace expression is a Slot name literal
	// Returns true if expression is of the form {-|Name}, false otherwise
	function isSlotLiteral(braceExpression) {
	  return braceExpression.substring(0, 3) == "{-|";
	}
	
	// Recognize shortcuts in utterance definitions and swap them out with the actual values
	function expandShortcuts(str, slots, dictionary) {
	  // If the string is found in the dictionary, just provide the matching values
	  if (typeof dictionary=="object" && typeof dictionary[str]!="undefined") {
	    return dictionary[str];
	  }
	  // Numbered ranges, ex: 5-100 by 5
	  var match = str.match(/(\d+)\s*-\s*(\d+)(\s+by\s+(\d+))?/);
	  if (match) {
	    return expandNumberRange(+match[1],+match[2],+match[4]);
	  }
	  return [str];
	}
	
	var slotIndexes = [];
	function expandSlotValues (variations, slotSampleValues) {
	  var i;
	
	  var slot;
	  for (slot in slotSampleValues) {
	
	    var sampleValues = slotSampleValues[slot];
	
	    var idx = -1;
	    if (typeof slotIndexes[slot] !== "undefined") {
	      idx = slotIndexes[slot];
	    }
	
	    var newVariations = [];
	
	    // make sure we have enough variations that we can get through the sample values
	    // at least once for each alexa-app utterance...  this isn't strictly as
	    // minimalistic as it could be.
	    //
	    // our *real* objective is to make sure that each sampleValue gets used once per
	    // intent, but each intent spans multiple utterances; it would require heavy
	    // restructuring of the way the utterances are constructed to keep track of
	    // whether every slot was given each sample value once within an Intent's set
	    // of utterances.  So we take the easier route, which generates more utterances
	    // in the output (but still many less than we would get if we did the full
	    // cartesian product).
	    if (variations.length < sampleValues.length) {
	      var mod = variations.length;
	      var xtraidx = 0;
	      while (variations.length < sampleValues.length) {
	        variations.push (variations[xtraidx]);
	        xtraidx = (xtraidx + 1) % mod;
	      }
	    }
	
	    variations.forEach (function (variation, j) {
	      var newVariation = [];
	      variation.forEach (function (value, k) {
	        if (value == "slot-" + slot) {
	          idx = (idx + 1) % sampleValues.length;
	          slotIndexes[slot] = idx;
	
	          value = sampleValues[idx];
	        }
	
	        newVariation.push (value);
	      });
	      newVariations.push (newVariation);
	    });
	
	    variations = newVariations;
	  }
	
	  return variations;
	}
	
	// Generate a list of utterances from a template
	function generateUtterances(str, slots, dictionary, exhaustiveUtterances) {
	  var placeholders=[], utterances=[], slotmap={}, slotValues=[];
	  // First extract sample placeholders values from the string
	  str = str.replace(/\{([^\}]+)\}/g, function(match,p1) {
	
	    if (isSlotLiteral(match)) {
	      return match;
	    }
	
	    var expandedValues=[], slot, values = p1.split("|");
	    // If the last of the values is a SLOT name, we need to keep the name in the utterances
	    if (values && values.length && values.length>1 && slots && typeof slots[values[values.length-1]]!="undefined") {
	      slot = values.pop();
	    }
	    values.forEach(function(val,i) {
	      Array.prototype.push.apply(expandedValues,expandShortcuts(val,slots,dictionary));
	    });
	    if (slot) {
	      slotmap[slot] = placeholders.length;
	    }
	
	    // if we're dealing with minimal utterances, we will delay the expansion of the
	    // values for the slots; all the non-slot expansions need to be fully expanded
	    // in the cartesian product
	    if (!exhaustiveUtterances && slot)
	    {
	      placeholders.push( [ "slot-" + slot ] );
	      slotValues[slot] = expandedValues;
	    }
	    else
	    {
	      placeholders.push( expandedValues );
	    }
	
	    return "{"+(slot || placeholders.length-1)+"}";
	  });
	  // Generate all possible combinations using the cartesian product
	  if (placeholders.length>0) {
	    var variations = Combinatorics.cartesianProduct.apply(Combinatorics,placeholders).toArray();
	
	    if (!exhaustiveUtterances)
	    {
	      variations = expandSlotValues (variations, slotValues);
	    }
	
	    // Substitute each combination back into the original string
	    variations.forEach(function(values) {
	      // Replace numeric placeholders
	      var utterance = str.replace(/\{(\d+)\}/g,function(match,p1){ 
	        return values[p1]; 
	      });
	      // Replace slot placeholders
	      utterance = utterance.replace(/\{(.*?)\}/g,function(match,p1){ 
	        return (isSlotLiteral(match)) ? match : "{"+values[slotmap[p1]]+"|"+p1+"}";
	      });
	      utterances.push( utterance );
	    });
	  }
	  else {
	    utterances = [str];
	  }
	
	  // Convert all {-|Name} to {Name} to accomodate slot literals
	  for (var idx in utterances) {
	    utterances[idx] = utterances[idx].replace(/\{\-\|/g, "{");
	  }
	
	  return utterances;
	}
	
	
	module.exports = generateUtterances;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
	 * $Id: combinatorics.js,v 0.25 2013/03/11 15:42:14 dankogai Exp dankogai $
	 *
	 *  Licensed under the MIT license.
	 *  http://www.opensource.org/licenses/mit-license.php
	 *
	 *  References:
	 *    http://www.ruby-doc.org/core-2.0/Array.html#method-i-combination
	 *    http://www.ruby-doc.org/core-2.0/Array.html#method-i-permutation
	 *    http://en.wikipedia.org/wiki/Factorial_number_system
	 */
	(function (root, factory) {
	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof exports === 'object') {
	        module.exports = factory();
	    } else {
	        root.Combinatorics = factory();
	    }
	}(this, function () {
	    'use strict';
	    var version = "0.5.2";
	    /* combinatory arithmetics */
	    var P = function(m, n) {
	        var p = 1;
	        while (n--) p *= m--;
	        return p;
	    };
	    var C = function(m, n) {
	        if (n > m) {
	            return 0;
	        }
	        return P(m, n) / P(n, n);
	    };
	    var factorial = function(n) {
	        return P(n, n);
	    };
	    var factoradic = function(n, d) {
	        var f = 1;
	        if (!d) {
	            for (d = 1; f < n; f *= ++d);
	            if (f > n) f /= d--;
	        } else {
	            f = factorial(d);
	        }
	        var result = [0];
	        for (; d; f /= d--) {
	            result[d] = Math.floor(n / f);
	            n %= f;
	        }
	        return result;
	    };
	    /* common methods */
	    var addProperties = function(dst, src) {
	        Object.keys(src).forEach(function(p) {
	            Object.defineProperty(dst, p, {
	                value: src[p],
	                configurable: p == 'next'
	            });
	        });
	    };
	    var hideProperty = function(o, p) {
	        Object.defineProperty(o, p, {
	            writable: true
	        });
	    };
	    var toArray = function(f) {
	        var e, result = [];
	        this.init();
	        while (e = this.next()) result.push(f ? f(e) : e);
	        this.init();
	        return result;
	    };
	    var common = {
	        toArray: toArray,
	        map: toArray,
	        forEach: function(f) {
	            var e;
	            this.init();
	            while (e = this.next()) f(e);
	            this.init();
	        },
	        filter: function(f) {
	            var e, result = [];
	            this.init();
	            while (e = this.next()) if (f(e)) result.push(e);
	            this.init();
	            return result;
	        },
	        lazyMap: function(f) {
	            this._lazyMap = f;
	            return this;
	        },
	        lazyFilter: function(f) {
	            Object.defineProperty(this, 'next', {
	                writable: true
	            });
	            if (typeof f !== 'function') {
	                this.next = this._next;
	            } else {
	                if (typeof (this._next) !== 'function') {
	                    this._next = this.next;
	                }
	                var _next = this._next.bind(this);
	                this.next = (function() {
	                    var e;
	                    while (e = _next()) {
	                        if (f(e))
	                            return e;
	                    }
	                    return e;
	                }).bind(this);
	            }
	            Object.defineProperty(this, 'next', {
	                writable: false
	            });
	            return this;
	        }
	
	    };
	    /* power set */
	    var power = function(ary, fun) {
	        var size = 1 << ary.length,
	            sizeOf = function() {
	                return size;
	            },
	            that = Object.create(ary.slice(), {
	                length: {
	                    get: sizeOf
	                }
	            });
	        hideProperty(that, 'index');
	        addProperties(that, {
	            valueOf: sizeOf,
	            init: function() {
	                that.index = 0;
	            },
	            nth: function(n) {
	                if (n >= size) return;
	                var i = 0,
	                    result = [];
	                for (; n; n >>>= 1, i++) if (n & 1) result.push(this[i]);
	                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	            },
	            next: function() {
	                return this.nth(this.index++);
	            }
	        });
	        addProperties(that, common);
	        that.init();
	        return (typeof (fun) === 'function') ? that.map(fun) : that;
	    };
	    /* combination */
	    var nextIndex = function(n) {
	        var smallest = n & -n,
	            ripple = n + smallest,
	            new_smallest = ripple & -ripple,
	            ones = ((new_smallest / smallest) >> 1) - 1;
	        return ripple | ones;
	    };
	    var combination = function(ary, nelem, fun) {
	        if (!nelem) nelem = ary.length;
	        if (nelem < 1) throw new RangeError;
	        if (nelem > ary.length) throw new RangeError;
	        var first = (1 << nelem) - 1,
	            size = C(ary.length, nelem),
	            maxIndex = 1 << ary.length,
	            sizeOf = function() {
	                return size;
	            },
	            that = Object.create(ary.slice(), {
	                length: {
	                    get: sizeOf
	                }
	            });
	        hideProperty(that, 'index');
	        addProperties(that, {
	            valueOf: sizeOf,
	            init: function() {
	                this.index = first;
	            },
	            next: function() {
	                if (this.index >= maxIndex) return;
	                var i = 0,
	                    n = this.index,
	                    result = [];
	                for (; n; n >>>= 1, i++) {
	                    if (n & 1) result[result.length] = this[i];
	                }
	
	                this.index = nextIndex(this.index);
	                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	            }
	        });
	        addProperties(that, common);
	        that.init();
	        return (typeof (fun) === 'function') ? that.map(fun) : that;
	    };
	    /* bigcombination */
	    var bigNextIndex = function(n, nelem) {
	
	        var result = n;
	        var j = nelem;
	        var i = 0;
	        for (i = result.length - 1; i >= 0; i--) {
	            if (result[i] == 1) {
	                j--;
	            } else {
	                break;
	            }
	        } 
	        if (j == 0) {
	            // Overflow
	            result[result.length] = 1;
	            for (var k = result.length - 2; k >= 0; k--) {
	                result[k] = (k < nelem-1)?1:0;
	            }
	        } else {
	            // Normal
	
	            // first zero after 1
	            var i1 = -1;
	            var i0 = -1;
	            for (var i = 0; i < result.length; i++) {
	                if (result[i] == 0 && i1 != -1) {
	                    i0 = i;
	                }
	                if (result[i] == 1) {
	                    i1 = i;
	                }
	                if (i0 != -1 && i1 != -1) {
	                    result[i0] = 1;
	                    result[i1] = 0;
	                    break;
	                }
	            }
	
	            j = nelem;
	            for (var i = result.length - 1; i >= i1; i--) {
	                if (result[i] == 1)
	                    j--;
	            }
	            for (var i = 0; i < i1; i++) {
	                result[i] = (i < j)?1:0;
	            }
	        }
	
	        return result;
	
	    };
	    var buildFirst = function(nelem) {
	        var result = [];
	        for (var i = 0; i < nelem; i++) {
	            result[i] = 1;
	        }
	        result[0] = 1;
	        return result;
	    };
	    var bigCombination = function(ary, nelem, fun) {
	        if (!nelem) nelem = ary.length;
	        if (nelem < 1) throw new RangeError;
	        if (nelem > ary.length) throw new RangeError;
	        var first = buildFirst(nelem),
	            size = C(ary.length, nelem),
	            maxIndex = ary.length,
	            sizeOf = function() {
	                return size;
	            },
	            that = Object.create(ary.slice(), {
	                length: {
	                    get: sizeOf
	                }
	            });
	        hideProperty(that, 'index');
	        addProperties(that, {
	            valueOf: sizeOf,
	            init: function() {
	                this.index = first.concat();
	            },
	            next: function() {
	                if (this.index.length > maxIndex) return;
	                var i = 0,
	                    n = this.index,
	                    result = [];
	                for (var j = 0; j < n.length; j++, i++) {
	                    if (n[j])
	                        result[result.length] = this[i];
	                }
	                bigNextIndex(this.index, nelem);
	                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	            }
	        });
	        addProperties(that, common);
	        that.init();
	        return (typeof (fun) === 'function') ? that.map(fun) : that;
	    };
	    /* permutation */
	    var _permutation = function(ary) {
	        var that = ary.slice(),
	            size = factorial(that.length);
	        that.index = 0;
	        that.next = function() {
	            if (this.index >= size) return;
	            var copy = this.slice(),
	                digits = factoradic(this.index, this.length),
	                result = [],
	                i = this.length - 1;
	            for (; i >= 0; --i) result.push(copy.splice(digits[i], 1)[0]);
	            this.index++;
	            return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	        };
	        return that;
	    };
	    // which is really a permutation of combination
	    var permutation = function(ary, nelem, fun) {
	        if (!nelem) nelem = ary.length;
	        if (nelem < 1) throw new RangeError;
	        if (nelem > ary.length) throw new RangeError;
	        var size = P(ary.length, nelem),
	            sizeOf = function() {
	                return size;
	            },
	            that = Object.create(ary.slice(), {
	                length: {
	                    get: sizeOf
	                }
	            });
	        hideProperty(that, 'cmb');
	        hideProperty(that, 'per');
	        addProperties(that, {
	            valueOf: function() {
	                return size;
	            },
	            init: function() {
	                this.cmb = combination(ary, nelem);
	                this.per = _permutation(this.cmb.next());
	            },
	            next: function() {
	                var result = this.per.next();
	                if (!result) {
	                    var cmb = this.cmb.next();
	                    if (!cmb) return;
	                    this.per = _permutation(cmb);
	                    return this.next();
	                }
	                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	            }
	        });
	        addProperties(that, common);
	        that.init();
	        return (typeof (fun) === 'function') ? that.map(fun) : that;
	    };
	
	    var PC = function(m) {
	        var total = 0;
	        for (var n = 1; n <= m; n++) {
	            var p = P(m,n);
	            total += p;
	        };
	        return total;
	    };
	    // which is really a permutation of combination
	    var permutationCombination = function(ary, fun) {
	        // if (!nelem) nelem = ary.length;
	        // if (nelem < 1) throw new RangeError;
	        // if (nelem > ary.length) throw new RangeError;
	        var size = PC(ary.length),
	            sizeOf = function() {
	                return size;
	            },
	            that = Object.create(ary.slice(), {
	                length: {
	                    get: sizeOf
	                }
	            });
	        hideProperty(that, 'cmb');
	        hideProperty(that, 'per');
	        hideProperty(that, 'nelem');
	        addProperties(that, {
	            valueOf: function() {
	                return size;
	            },
	            init: function() {
	                this.nelem = 1;
	                // console.log("Starting nelem: " + this.nelem);
	                this.cmb = combination(ary, this.nelem);
	                this.per = _permutation(this.cmb.next());
	            },
	            next: function() {
	                var result = this.per.next();
	                if (!result) {
	                    var cmb = this.cmb.next();
	                    if (!cmb) {
	                        this.nelem++;
	                        // console.log("increment nelem: " + this.nelem + " vs " + ary.length);
	                        if (this.nelem > ary.length) return;
	                        this.cmb = combination(ary, this.nelem);
	                        cmb = this.cmb.next();
	                        if (!cmb) return;
	                    }
	                    this.per = _permutation(cmb);
	                    return this.next();
	                }
	                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	            }
	        });
	        addProperties(that, common);
	        that.init();
	        return (typeof (fun) === 'function') ? that.map(fun) : that;
	    };
	    /* Cartesian Product */
	    var arraySlice = Array.prototype.slice;
	    var cartesianProduct = function() {
	        if (!arguments.length) throw new RangeError;
	        var args = arraySlice.call(arguments),
	            size = args.reduce(function(p, a) {
	                return p * a.length;
	            }, 1),
	            sizeOf = function() {
	                return size;
	            },
	            dim = args.length,
	            that = Object.create(args, {
	                length: {
	                    get: sizeOf
	                }
	            });
	        if (!size) throw new RangeError;
	        hideProperty(that, 'index');
	        addProperties(that, {
	            valueOf: sizeOf,
	            dim: dim,
	            init: function() {
	                this.index = 0;
	            },
	            get: function() {
	                if (arguments.length !== this.length) return;
	                var result = [],
	                    d = 0;
	                for (; d < dim; d++) {
	                    var i = arguments[d];
	                    if (i >= this[d].length) return;
	                    result.push(this[d][i]);
	                }
	                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	            },
	            nth: function(n) {
	                var result = [],
	                    d = 0;
	                for (; d < dim; d++) {
	                    var l = this[d].length;
	                    var i = n % l;
	                    result.push(this[d][i]);
	                    n -= i;
	                    n /= l;
	                }
	                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	            },
	            next: function() {
	                if (this.index >= size) return;
	                var result = this.nth(this.index);
	                this.index++;
	                return result;
	            }
	        });
	        addProperties(that, common);
	        that.init();
	        return that;
	    };
	    /* baseN */
	    var baseN = function(ary, nelem, fun) {
	                if (!nelem) nelem = ary.length;
	        if (nelem < 1) throw new RangeError;
	        var base = ary.length,
	                size = Math.pow(base, nelem);
	        var sizeOf = function() {
	                return size;
	            },
	            that = Object.create(ary.slice(), {
	                length: {
	                    get: sizeOf
	                }
	            });
	        hideProperty(that, 'index');
	        addProperties(that, {
	            valueOf: sizeOf,
	            init: function() {
	                that.index = 0;
	            },
	            nth: function(n) {
	                if (n >= size) return;
	                var result = [];
	                for (var i = 0; i < nelem; i++) {
	                    var d = n % base;
	                    result.push(ary[d])
	                    n -= d; n /= base
	                }
	                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
	            },
	            next: function() {
	                return this.nth(this.index++);
	            }
	        });
	        addProperties(that, common);
	        that.init();
	        return (typeof (fun) === 'function') ? that.map(fun) : that;
	    };
	
	    /* export */
	    var Combinatorics = Object.create(null);
	    addProperties(Combinatorics, {
	        C: C,
	        P: P,
	        factorial: factorial,
	        factoradic: factoradic,
	        cartesianProduct: cartesianProduct,
	        combination: combination,
	        bigCombination: bigCombination,
	        permutation: permutation,
	        permutationCombination: permutationCombination,
	        power: power,
	        baseN: baseN,
	        VERSION: version
	    });
	    return Combinatorics;
	}));


/***/ },
/* 3 */
/***/ function(module, exports) {

	var numbers = {
	  '.': 'point',
	  '-': 'negative',
	  0: 'zero',
	  1: 'one',
	  2: 'two',
	  3: 'three',
	  4: 'four',
	  5: 'five',
	  6: 'six',
	  7: 'seven',
	  8: 'eight',
	  9: 'nine',
	  10: 'ten',
	  11: 'eleven',
	  12: 'twelve',
	  13: 'thirteen',
	  14: 'fourteen',
	  15: 'fifteen',
	  16: 'sixteen',
	  17: 'seventeen',
	  18: 'eighteen',
	  19: 'nineteen',
	  20: 'twenty',
	  30: 'thirty',
	  40: 'forty',
	  50: 'fifty',
	  60: 'sixty',
	  70: 'seventy',
	  80: 'eighty',
	  90: 'ninety'
	};
	
	// http://en.wikipedia.org/wiki/English_numerals#Cardinal_numbers
	var helpers = {};
	// Store the helpers in the power of tens
	helpers[2]   = 'hundred';
	helpers[3]   = 'thousand';
	helpers[6]   = 'million';
	helpers[9]   = 'billion';
	helpers[12]  = 'trillion';
	helpers[15]  = 'quadrillion';
	helpers[18]  = 'quintillion';
	helpers[21]  = 'sextillion';
	helpers[24]  = 'septillion';
	helpers[27]  = 'octillion';
	helpers[30]  = 'nonillion';
	helpers[33]  = 'decillion';
	helpers[36]  = 'undecillion';
	helpers[39]  = 'duodecillion';
	helpers[42]  = 'tredecillion';
	helpers[45]  = 'quattuordecillion';
	helpers[48]  = 'quindecillion';
	helpers[51]  = 'sexdecillion';
	helpers[54]  = 'septendecillion';
	helpers[57]  = 'octodecillion';
	helpers[60]  = 'novemdecillion';
	helpers[63]  = 'vigintillion';
	helpers[100] = 'googol';
	helpers[303] = 'centillion';
	
	// Make a hash of the numbers and helper numbers reversed
	// E.g. The key as the word and value as the number
	var numbersMap = {};
	numbersMap.nil     = 0;
	numbersMap.naught  = 0;
	numbersMap.period  = '.';
	numbersMap.decimal = '.';
	
	Object.keys(numbers).forEach(function (num) {
	  numbersMap[numbers[num]] = isNaN(+num) ? num : +num;
	});
	
	Object.keys(helpers).forEach(function (num) {
	  numbersMap[helpers[num]] = isNaN(+num) ? num : Math.pow(10, +num);
	});
	
	/**
	 * Returns the number of significant figures for the number
	 * @param  {number} num
	 * @return {number}
	 */
	var intervals = function (num) {
	  var match;
	  if ((match = ('' + num).match(/e\+(\d+)/))) {
	    return match[1];
	  }
	
	  return ('' + num).length - 1;
	};
	
	/**
	 * Accepts both a string and number type - and return the opposite
	 * @param  {string|number} num
	 * @return {string|number}
	 */
	var numberWords = module.exports = function (num) {
	  if (typeof num === 'string') {
	    return numberWords.parse(num);
	  }
	  if (typeof num === 'number') {
	    return numberWords.stringify(num);
	  }
	  throw new Error('Number words can handle handle numbers and/or strings');
	};
	
	/**
	 * Turn a number into a string representation
	 * @param  {number} num
	 * @return {string}
	 */
	numberWords.stringify = function (num) {
	  var word = [],
	      interval,
	      remaining;
	
	  num = isNaN(+num) ? num : +num;
	
	  // Numbers are super buggy in JS over 10^20
	  if (typeof num !== 'number') { return false; }
	  // If the number is in the numbers object, we can quickly return
	  if (numbers[num]) { return numbers[num]; }
	  // If the number is a negative value
	  if (num < 0) {
	    return numbers['-'] + ' ' + numberWords.stringify(num * -1);
	  }
	
	  // Check if we have decimals
	  if (num % 1) {
	    word.push(numberWords.stringify(Math.floor(num)));
	    word.push(numbers['.']);
	    word = word.concat(('' + num).split('.')[1].split('').map(numberWords.stringify));
	    return word.join(' ');
	  }
	
	  interval = intervals(num);
	  // It's below one hundred, but greater than nine
	  if (interval === 1) {
	    word.push(numbers[Math.floor(num / 10) * 10] + '-' + numberWords.stringify(Math.floor(num % 10)));
	  }
	  // Simple check to find the closest full number helper
	  while (interval > 3 && !helpers[interval]) {
	    interval -= 1;
	  }
	
	  if (helpers[interval]) {
	    remaining = Math.floor(num % Math.pow(10, interval));
	    word.push(numberWords.stringify(Math.floor(num / Math.pow(10, interval))));
	    word.push(helpers[interval] + (remaining > 99 ? ',' : ''));
	    if (remaining) {
	      if (remaining < 100) { word.push('and'); }
	      word.push(numberWords.stringify(remaining));
	    }
	  }
	
	  return word.join(' ');
	};
	
	/**
	 * Turns a string representation of a number into a number type
	 * @param  {string} num
	 * @return {number}
	 */
	numberWords.parse = function (num) {
	  if (typeof num !== 'string') { return false; }
	
	  var modifier        = 1,
	      largest         = 0,
	      largestInterval = 0,
	      zeros           = 0, // Keep track of the number of leading zeros in the decimal
	      stack           = [];
	
	  var totalStack = function () {
	    var total = stack.reduceRight(function (memo, num, index, array) {
	      if (num > array[index + 1]) {
	        return memo * num;
	      }
	      return memo + num;
	    }, 0);
	
	    return total * largest;
	  };
	
	  var total = num.split(/\W+/g).map(function (num) {
	    num = num.toLowerCase(); // Make life easier
	    return numbersMap[num] != null ? numbersMap[num] : num;
	  }).filter(function (num) {
	    if (num === '-') {
	      modifier = -1;
	    }
	    if (num === '.') {
	      return true; // Decimal points are a special case
	    }
	    return isFinite(num); // Remove numbers we don't understand
	  }).reduceRight(function (memo, num) {
	    var interval = intervals(num),
	        decimals,
	        output;
	
	    // Check the interval is smaller than the largest one, then create a stack
	    if (typeof num === 'number' && interval < largestInterval) {
	      if (!stack.length) { memo = memo - largest; }
	      stack.push(num);
	      return memo;
	    }
	
	    memo  = memo + totalStack();
	    stack = []; // Reset the stack for more computations
	
	    // If the number is a decimal, transform everything we were just working with
	    if (num === '.') {
	      decimals = zeros + ('' + memo).length;
	      zeros    = 0;
	      // Reset the largest intervals and stuff
	      largest         = 0;
	      largestInterval = 0;
	      return memo * Math.pow(10, decimals * -1);
	    }
	
	    // Keep a count of zeros we encountered
	    if (num === 0) {
	      zeros += 1;
	      return memo;
	    }
	
	    // Shove the number on the front if the intervals match and the number is a whole
	    if (memo >= 1 && interval === largestInterval) {
	      output = '' + memo;
	      // Decrement the zeros count while adding zeros to the front of the number
	      while (zeros && zeros--) {
	        output = '0' + output;
	      }
	      return +(num + output);
	    }
	
	    // Store the largest number for future use
	    largest         = num;
	    largestInterval = intervals(largest);
	
	    return (memo + num) * Math.pow(10, zeros);
	  }, 0);
	
	  return modifier * (total + totalStack());
	};


/***/ }
/******/ ]);
//# sourceMappingURL=bundle.js.map
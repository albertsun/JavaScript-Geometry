//Copyright 2010 Thomas Stjernegaard Jeppesen. All Rights Reserved.

//Licensed under the Apache License, Version 2.0 (the "License");
//you may not use this file except in compliance with the License.
//You may obtain a copy of the License at

//http://www.apache.org/licenses/LICENSE-2.0

//Unless required by applicable law or agreed to in writing, software
//distributed under the License is distributed on an "AS-IS" BASIS,
//WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//See the License for the specific language governing permissions and
//limitations under the License.



/**
 * @fileoverview Bootstrap for the js_cols Library.
 * The code in this file, base.js, is adopted partly from googles base.js,
 * and partly from structs.js.
 * It has been modified to suit the needs of the js_cols Library.
 * The js_cols collections should be easily integratable in projets
 * using google closure library, as they generally use the same method names,
 * code style and use of closures.
 *
 */

/**
 * Declaring a global js_cols variable
 */
js_cols = {};


/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
js_cols.global = this;


/**
 * Implements a system for the dynamic resolution of dependencies
 * @param {string} rule Rule to include, in the form js_cols.part.
 */
js_cols.require = function(rule) {


    if (js_cols.getObjectByName(rule)) {
      return;
    }
    var path = js_cols.getPathFromDeps_(rule);
    if (path) {
      js_cols.included_[path] = true;
      js_cols.writeScripts_();
    } else {
      var errorMessage = 'js_cols.require could not find: ' + rule;
      
        throw Error(errorMessage);
    }
  
};

/**
 * Creates object stubs for a namespace. When present in a file, goog.provide
 * also indicates that the file defines the indicated object. 
 * @param {string} name name of the object that this file defines.
 */
js_cols.provide = function(name) {
 
    // Ensure that the same namespace isn't provided twice. 
    if (js_cols.getObjectByName(name) && !js_cols.implicitNamespaces_[name]) {
      throw Error('Namespace "' + name + '" already declared.');
    }

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      js_cols.implicitNamespaces_[namespace] = true;
    }
 

  js_cols.exportPath_(name);
};

js_cols.implicitNamespaces_ = {};
/**
 * Path for included scripts
 * @type {string}
 */
js_cols.basePath = '';

/**
   * Tries to detect whether is in the context of an HTML document.
   * @return {boolean} True if it looks like HTML document.
   * @private
   */
  js_cols.inHtmlDocument_ = function() {
    var doc = js_cols.global.document;
    return typeof doc != 'undefined' &&
           'write' in doc;  // XULDocument misses write.
  }; 
  
  
  /**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {*=} opt_object the object to expose at the end of the path.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |js_cols.global|.
 * @private
 */
js_cols.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || js_cols.global;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  // Certain browsers cannot parse code in the form for((a in b); c;);
  // This pattern is produced by the JSCompiler when it collapses the
  // statement above into the conditional loop below. To prevent this from
  // happening, use a for-loop and reserve the init logic as below.

  // Parentheses added to eliminate strict JS warning in Firefox.
  for (var part; parts.length && (part = parts.shift());) {
    if (!parts.length && opt_object !== undefined) {
      // last part and we have an object; use it
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};

/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object=} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {Object} The object or, if not found, null.
 */
js_cols.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || js_cols.global;
  for (var part; part = parts.shift(); ) {
    if (cur[part]) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};

 js_cols.included_ = {};
  /**
   * This object is used to keep track of dependencies and other data that is
   * used for loading scripts
   * @private
   * @type {Object}
   */
  js_cols.dependencies_ = {
    pathToNames: {}, // 1 to many
    nameToPath: {}, // 1 to 1
    requires: {}, // 1 to many
    // used when resolving dependencies to prevent us from
    // visiting the file twice
    visited: {},
    written: {} // used to keep track of script files we have written
  };
  
  /**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {Array} provides An array of strings with the names of the objects
 *                         this file provides.
 * @param {Array} requires An array of strings with the names of the objects
 *                         this file requires.
 */
js_cols.addDependency = function(relPath, provides, requires) {

    var provide, require;
    var path = relPath.replace(/\\/g, '/');
    var deps = js_cols.dependencies_;
    for (var i = 0; provide = provides[i]; i++) {
      deps.nameToPath[provide] = path;
      if (!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {};
      }
      deps.pathToNames[path][provide] = true;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  
};

/**
   * Resolves dependencies based on the dependencies added using addDependency
   * and calls importScript_ in the correct order.
   * @private
   */
  js_cols.writeScripts_ = function() {
    // the scripts we need to write this time
    var scripts = [];
    var seenScript = {};
    var deps = js_cols.dependencies_;

    function visitNode(path) {
      if (path in deps.written) {
        return;
      }

      // we have already visited this one. We can get here if we have cyclic
      // dependencies
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }

      deps.visited[path] = true;

      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          if (requireName in deps.nameToPath) {
            visitNode(deps.nameToPath[requireName]);
          } else if (!js_cols.getObjectByName(requireName)) {
            // If the required name is defined, we assume that this
            // dependency was bootstapped by other means. Otherwise,
            // throw an exception.
            throw Error('Undefined nameToPath for ' + requireName);
          }
        }
      }

      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }

    for (var path in js_cols.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i]) {
        js_cols.importScript_(js_cols.basePath + scripts[i]);
      } else {
        throw Error('Undefined script input');
      }
    }
  };

 /**
   * Imports a script if, and only if, that script hasn't already been imported.
   * (Must be called at execution time)
   * @param {string} src Script source.
   * @private
   */
  js_cols.importScript_ = function(src) {
    var importScript =  js_cols.writeScriptTag_;
    if (!js_cols.dependencies_.written[src] && importScript(src)) {
      js_cols.dependencies_.written[src] = true;
    }
  };
  
   /**
   * The default implementation of the import function. Writes a script tag to
   * import the script.
   *
   * @param {string} src The script source.
   * @return {boolean} True if the script was imported, false otherwise.
   * @private
   */
  js_cols.writeScriptTag_ = function(src) {
    if (js_cols.inHtmlDocument_()) {
      var doc = js_cols.global.document;
      doc.write(
          '<script type="text/javascript" src="' + src + '"></' + 'script>');
      return true;
    } else {
      return false;
    }
  };
/**
   * Looks at the dependency rules and tries to determine the script file that
   * fulfills a particular rule.
   * @param {string} rule In the form js_cols.Class or project.script.
   * @return {?string} Url corresponding to the rule, or null.
   * @private
   */
 js_cols.getPathFromDeps_ = function(rule) {
    if (rule in js_cols.dependencies_.nameToPath) {
      return js_cols.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };
  
  /**
 * Gets a unique ID for an object. This mutates the object so that further
 * calls with the same object as a parameter returns the same value. The unique
 * ID is guaranteed to be unique across the current session amongst objects that
 * are passed into {@code getUid}. There is no guarantee that the ID is unique
 * or consistent across sessions. It is unsafe to generate unique ID for
 * function prototypes.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 * @public
 */
js_cols.getUid = function(obj) {
  // TODO(user): Make the type stricter, do not accept null.

  // In Opera window.hasOwnProperty exists but always returns false so we avoid
  // using it. As a consequence the unique ID generated for BaseClass.prototype
  // and SubClass.prototype will be the same.
  return obj[js_cols.UID_PROPERTY_] ||
      (obj[js_cols.UID_PROPERTY_] = ++js_cols.uidCounter_);
};

/**
 * Removes the unique ID from an object. This is useful if the object was
 * previously mutated using {@code js_cols.getUid} in which case the mutation is
 * undone.
 * @param {Object} obj The object to remove the unique ID field from.
 * @public
 */
js_cols.removeUid = function(obj) {
  // TODO(user): Make the type stricter, do not accept null.

  // DOM nodes in IE are not instance of Object and throws exception
  // for delete. Instead we try to use removeAttribute
  if ('removeAttribute' in obj) {
    obj.removeAttribute(js_cols.UID_PROPERTY_);
  }
  /** @preserveTry */
  try {
    delete obj[js_cols.UID_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * Name for unique ID property. Initialized in a way to help avoid collisions
 * with other closure javascript on the same page.
 * @type {string}
 * @private
 */

 
js_cols.UID_PROPERTY_ = 'js_cols_uid_' +
    Math.floor(Math.random() * 2147483648).toString(36);


/**
 * Counter for UID.
 * @type {number}
 * @private
 */
js_cols.uidCounter_ = 0;

/**
 * Returns the values of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the values.
 * @return {!Array} The values in the object/map/hash.
 * @public
 */
js_cols.getValues = function(obj) {

	if (js_cols.typeOf(obj) == 'array'){
		return obj;
	}
	else if(!obj.getValues){
    var res = [];
    var i = 0;
    for (var key in obj) {
    res[i++] = obj[key];
   }
  }
  else{
   var res = obj.getValues();
  }
  return res;
};


/**
 * Returns the keys of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the keys.
 * @return {!Array.<string>} Array of property keys.
 * @public
 */
js_cols.getKeys = function(obj) {

	if (obj.getKeys){
		return obj.getKeys();
		}
	else if (js_cols.typeOf(obj) == 'array'){
		var res = [];
			for (var i = 0; i < obj.length; i++){
			res.push(i);
			}
		return res;
		}
	else if (js_cols.typeOf(obj) == 'object'){
  		var res = [];
 		 var i = 0;
 		 for (var key in obj) {
   			 res[i++] = key;
  			}
  		return res;
  		}
  
};

/**
 * Calls a function for each element in an object/map/hash. If
 * all calls return true, returns true. If any call returns false, returns
 * false at this point and does not continue to check the remaining elements.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {boolean} false if any element fails the test.
 * @public
 */


js_cols.every = function(obj, f, opt_obj) {

		if (js_cols.typeOf(obj.every) == 'function'){
			return obj.every(f, opt_obj);
		}
else	if (js_cols.typeOf(obj.getValues) == 'function'){
		var col = obj.getValues();
  		for (var i =0; i< col.length; i++ ) {
    		if (!f.call(opt_obj, col[i], i, col)) {
      			return false;
    			}
    		}
    		return true;
 		 }
 else	if (js_cols.typeOf(obj) == 'array'){
 		for (var i =0; i< obj.length; i++ ) {
    		if (!f.call(opt_obj, obj[i], i, obj)) {
      			return false;
    			}
    		}
    		return true;
 		}
else 	if (js_cols.typeOf(obj) == 'object'){
 		for (var key in obj) {
   			 if (!f.call(opt_obj, obj[key], key, obj)) {
      			return false;
    		}
 		}
 		return true;
 	}
 
};

/**
 * Calls a function for each element in an object/map/hash. 
 * @param {Object} obj The object to traverse.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) 
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @public
 */


js_cols.forEach = function(obj, f, opt_obj) {

		if (js_cols.typeOf(obj.forEach) == 'function'){
			obj.forEach(f, opt_obj);
		}
else	if (js_cols.typeOf(obj.getValues) == 'function'){
		var col = obj.getValues();
  		for (var i =0; i< col.length; i++ ) {
    		f.call(opt_obj, col[i], i, col)
 		 }
 		 }
 else	if (js_cols.typeOf(obj) == 'array'){
 		for (var i =0; i< obj.length; i++ ) {
    		f.call(opt_obj, obj[i], i, obj)
 		}
 		}
else 	if (js_cols.typeOf(obj) == 'object'){
 		for (var key in obj) {
   			f.call(opt_obj, obj[key], key, obj)
 	}
 	}
 
};

/**
 * Returns the number of values in the collection-like object.
 * @param {Object} col The collection-like object.
 * @return {number} The number of values in the collection-like object.
 * @public
 */
js_cols.getCount = function(col) {
  if (typeof col.getCount == 'function') {
    return col.getCount();
  }
 else if (col.length && typeof col.length == "number") {
    return col.length;
  }
  else{
  var rv = 0;
  for (var key in col) {
    rv++;
  }
  return rv;
  }
};


/**
 * Whether the collection contains the given value. This is O(n) and uses
 * equals (==) to test the existence.
 * @param {Object} col The collection-like object.
 * @param {*} val The value to check for.
 * @return {boolean} True if the map contains the value.
 * @public
 */
js_cols.contains = function(col, val) {
  if (typeof col.contains == 'function') {
    return col.contains(val);
  }
  if (typeof col.containsValue == 'function') {
    return col.containsValue(val);
  }
  if (js_cols.typeOf(col) == 'array') {
    for (var i=0; i<col.length;i++){
    	if (col[i] == val) return true;
    }
    return false;
  }
   for (var key in col) {
    if (col[key] == val) {
      return true;
    }
  }
  return false;
};



/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {*} value The value to get the type of.
 * @return {string} The name of the type.
 * @public
 */
js_cols.typeOf = function(value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {
      // We cannot use constructor == Array or instanceof Array because
      // different frames have different Array objects. In IE6, if the iframe
      // where the array was created is destroyed, the array loses its
      // prototype. Then dereferencing val.splice here throws an exception, so
      // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
      // so that will work. In this case, this function will return false and
      // most array functions will still work because the array is still
      // array-like (supports length and []) even though it has lost its
      // prototype.
      // Mark Miller noticed that Object.prototype.toString
      // allows access to the unforgeable [[Class]] property.
      //  15.2.4.2 Object.prototype.toString ( )
      //  When the toString method is called, the following steps are taken:
      //      1. Get the [[Class]] property of this object.
      //      2. Compute a string value by concatenating the three strings
      //         "[object ", Result(1), and "]".
      //      3. Return Result(2).
      // and this behavior survives the destruction of the execution context.
      if (value instanceof Array ||  // Works quickly in same execution context.
          // If value is from a different execution context then
          // !(value instanceof Object), which lets us early out in the common
          // case when value is from the same context but not an array.
          // The {if (value)} check above means we don't have to worry about
          // undefined behavior of Object.prototype.toString on null/undefined.
          //
          // HACK: In order to use an Object prototype method on the arbitrary
          //   value, the compiler requires the value be cast to type Object,
          //   even though the ECMA spec explicitly allows it.
          (!(value instanceof Object) &&
           (Object.prototype.toString.call(
               /** @type {Object} */ (value)) == '[object Array]') ||

           // In IE all non value types are wrapped as objects across window
           // boundaries (not iframe though) so we have to do object detection
           // for this edge case
           typeof value.length == 'number' &&
           typeof value.splice != 'undefined' &&
           typeof value.propertyIsEnumerable != 'undefined' &&
           !value.propertyIsEnumerable('splice')

          )) {
        return 'array';
      }
      // HACK: There is still an array case that fails.
      //     function ArrayImpostor() {}
      //     ArrayImpostor.prototype = [];
      //     var impostor = new ArrayImpostor;
      // this can be fixed by getting rid of the fast path
      // (value instanceof Array) and solely relying on
      // (value && Object.prototype.toString.vall(value) === '[object Array]')
      // but that would require many more function calls and is not warranted
      // unless closure code is receiving objects from untrusted sources.

      // IE in cross-window calls does not correctly marshal the function type
      // (it appears just as an object) so we cannot use just typeof val ==
      // 'function'. However, if the object has a call property, it is a
      // function.
      if (!(value instanceof Object) &&
          (Object.prototype.toString.call(
              /** @type {Object} */ (value)) == '[object Function]' ||
          typeof value.call != 'undefined' &&
          typeof value.propertyIsEnumerable != 'undefined' &&
          !value.propertyIsEnumerable('call'))) {
        return 'function';
      }


    } else {
      return 'null';
    }

  } else if (s == 'function' && typeof value.call == 'undefined') {
    // In Safari typeof nodeList returns 'function', and on Firefox
    // typeof behaves similarly for HTML{Applet,Embed,Object}Elements
    // and RegExps.  We would like to return object for those and we can
    // detect an invalid function by making sure that the function
    // object has a call method.
    return 'object';
  }
  return s;
};

/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   ParentClass.call(this, a, b);
 * }
 *
 * js_cols.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 * </pre>
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * <pre>
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass_.foo.call(this, a);
 *   // other code
 * };
 * </pre>
 *
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
js_cols.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};




js_cols.addDependency("js_cols/ABItem.js", ['js_cols.ABItem'], []);
js_cols.addDependency("js_cols/ABTreeBag.js", ['js_cols.ABTreeBag'], ['js_cols.ABTreeSet']);
js_cols.addDependency("js_cols/ABTreeMap.js", ['js_cols.ABTreeMap'], ['js_cols.LinkedList', 'js_cols.ABItem']);
js_cols.addDependency("js_cols/ABTreeMultiMap.js", ['js_cols.ABTreeMultiMap'], ['js_cols.ABTreeMap']);
js_cols.addDependency("js_cols/ABTreeSet.js", ['js_cols.ABTreeSet'], ['js_cols.LinkedList', 'js_cols.ABItem']);
js_cols.addDependency("js_cols/HashBag.js", ['js_cols.HashBag'], ['js_cols.HashMultiMap']);
js_cols.addDependency("js_cols/HashMap.js", ['js_cols.HashMap'], []);
js_cols.addDependency("js_cols/HashMultiMap.js", ['js_cols.HashMultiMap'], []);
js_cols.addDependency("js_cols/HashSet.js", ['js_cols.HashSet'], ['js_cols.HashMap']);
js_cols.addDependency("js_cols/IntervalHeap.js", ['js_cols.IntervalHeap'], []);
js_cols.addDependency("js_cols/LinkedHashMap.js", ['js_cols.LinkedHashMap'], ['js_cols.LinkedList', 'js_cols.HashMap']);
js_cols.addDependency("js_cols/LinkedList.js", ['js_cols.LinkedList'], []);
js_cols.addDependency("js_cols/Queue.js", ['js_cols.Queue'], ['js_cols.LinkedList']);
js_cols.addDependency("js_cols/RBnode.js", ['js_cols.RBnode'], []);
js_cols.addDependency("js_cols/RedBlackBag.js", ['js_cols.RedBlackBag'], ['js_cols.RedBlackSet', 'js_cols.RBnode']);
js_cols.addDependency("js_cols/RedBlackMap.js", ['js_cols.RedBlackMap'], ['js_cols.RBnode']);
js_cols.addDependency("js_cols/RedBlackMultiMap.js", ['js_cols.RedBlackMultiMap'], ['js_cols.RedBlackMap']);
js_cols.addDependency("js_cols/RedBlackSet.js", ['js_cols.RedBlackSet'], ['js_cols.RBnode']);
js_cols.addDependency("js_cols/Stack.js", ['js_cols.Stack'], ['js_cols.LinkedList']);


//Copyright Thomas Stjernegaard Jeppesen. All Rights Reserved.

//Licensed under the Apache License, Version 2.0 (the "License");
//you may not use this file except in compliance with the License.
//You may obtain a copy of the License at

//http://www.apache.org/licenses/LICENSE-2.0

//Unless required by applicable law or agreed to in writing, software
//distributed under the License is distributed on an "AS-IS" BASIS,
//WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//See the License for the specific language governing permissions and
//limitations under the License.
js_cols.provide('js_cols.RBnode');

js_cols.RBnode = function(tree){
		this.tree = tree;
		this.right = this.tree.sentinel;
		this.left = this.tree.sentinel;	
	};


//Copyright Thomas Stjernegaard Jeppesen. All Rights Reserved.

//Licensed under the Apache License, Version 2.0 (the "License");
//you may not use this file except in compliance with the License.
//You may obtain a copy of the License at

//http://www.apache.org/licenses/LICENSE-2.0

//Unless required by applicable law or agreed to in writing, software
//distributed under the License is distributed on an "AS-IS" BASIS,
//WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//See the License for the specific language governing permissions and
//limitations under the License.
js_cols.require('js_cols.RBnode');
js_cols.provide('js_cols.RedBlackMap');


/**
 * 
 *
 *
 * js_cols.RedBlackMap provides the implementation of a Red Black Tree map datastructure. The tree
 * maintains a set of values, sorted by their corresponding keys. The key/value pairs can be
 * inserted and deleted efficiently in their sorted order as the tree enforces a logn
 * maximum height. This implementation provides guaranteed log(n) time cost for the
 * <tt>contains</tt>, <tt>insert</tt> and <tt>remove</tt>
 * operations.  Algorithms are adaptations of those in Thomas H. Cormen, Charles E. Leiserson, 
 * Ronald L. Rivest, Clifford Stein <I>Introduction to Algorithms, second edition</I>.<p>
 *
 * The assymptotic running time for important operations are below:
 * <pre>
 *   Method                 big-O
 * ----------------------------------------------------------------------------
 * - clear                  O(1)
 * - clone                  O(n logn)
 * - contains               O(logn)
 * - containsAll            O(m logn) m is the cardinality of the supplied collection
 * - every                  O(n * O(f)) f is the function supplied as argument
 * - filter                 O(n * O(f)) f is the function supplied as argument
 * - forEach                O(n * O(f)) f is the function supplied as argument
 * - get                    O(logn)
 * - getValues              O(n)
 * - insert                 O(logn)
 * - insertAll              O(m logn) m is the cardinality of the supplied collection
 * - map                    O(n * O(f)) f is the function supplied as argument
 * - remove                 O(logn)
 * - removeAll              O(m logn) m is the cardinality of the supplied collection
 * - some                   O(n * O(f)) f is the function supplied as argument
 * - contains               O(n * O(f)) f is the function supplied as argument
 * </pre>
 * 
 *
 * Constructs a new Red Black map
 * @param {Function=} compare_func an optional compare function to compare the keys. This function should
 * take two values, a and b, and return x where:
 * <pre>
 *  x < 0 if a < b,
 *  x > 0 if a > b,
 *  x = 0 otherwise
 * </pre>
 * if not defined, a default compare function for <tt>numbers</tt> will be used
 * @constructor
 * @public
 */
js_cols.RedBlackMap = function(compare_func) {

    this.RED = true; 
    this.BLACK = false;
    this.size = 0;
    this.sentinel = new js_cols.RBnode(this);
    this.sentinel.color = this.BLACK;
    this.root = this.sentinel; // when the tree is empty, root = sentinel 
    this.root.parent = this.sentinel;
    /**
     * Comparison function used to compare values in the tree. This function should
     * take two values, a and b, and return x where:
     * <pre>
     *  x < 0 if a < b,
     *  x > 0 if a > b,
     *  x = 0 otherwise
     * </pre>
     *
     * @type {Function}
     * @private
     */
    this.compare = compare_func || this.default_compare;
};
/**
 * A default compare function, if compare_func is not specified.
 * @private
 */
js_cols.RedBlackMap.prototype.default_compare = function (a,b) {
    if (a < b) return -1;
    else if (b < a) return 1;
    else return 0;
};


/**
 * Clones a set and returns a new set.
 * @return {!js_cols.RedBlackMap} A new map with the same key-value pairs.
 */
js_cols.RedBlackMap.prototype.clone = function() {
    var rv = new js_cols.RedBlackMap(this.compare);
    rv.insertAll(this);
    return rv;

};

/**
 * Removes all elements from this set
 * 
 */
js_cols.RedBlackMap.prototype.clear = function() {
    this.size = 0;
    this.sentinel = new js_cols.RBnode(this);
    this.sentinel.color = this.BLACK;
    this.root = this.sentinel; // when the tree is empty, root = sentinel 
    this.root.parent = this.sentinel;

};


/**
 * A helper function, used for tree balancing
 * @param x {js_cols.RBnode} the node to rotate about
 * @private
 */
js_cols.RedBlackMap.prototype.leftRotate = function(x) {
    
    var y = x.right;
    x.right = y.left;
    if (y.left != this.sentinel) y.left.parent= x;
    y.parent = x.parent;
    if (x.parent == this.sentinel) {
	this.root = y;
    }
    else if(x==x.parent.left) {
	x.parent.left = y;
    }
    else {
	x.parent.right = y;
    }
    y.left = x;
    x.parent = y;

};
/**
 * A helper function, used for tree balancing
 * @param x {js_cols.RBnode} the node to rotate about
 * @private
 */
js_cols.RedBlackMap.prototype.rightRotate= function(x) {
    
    var y = x.left;
    x.left = y.right;
    if (y.right != this.sentinel) y.right.parent= x;
    y.parent = x.parent;
    if (x.parent == this.sentinel) {
	this.root = y;
    }
    else if(x==x.parent.right) {
	x.parent.right = y;
    }
    else {
	x.parent.left = y;
    }
    y.right = x;
    x.parent = y;

};
/**
 * Inserts a key/value pair into the tree
 * @param {*} key the key used for ordering and location
 * @param {*} element the value associated with the key
 * @public
 */
js_cols.RedBlackMap.prototype.insert = function(key, value) {
    
    if (!this.contains(key)) {
	
	var z = new js_cols.RBnode(this);
	z.key = key;
	z.value = value;
	var y = this.sentinel;
	var x = this.root;
	while (x != this.sentinel) {
	    y=x;
	    //if (z.key < x.key) x = x.left;
	    if (this.compare(z.key, x.key) <0) x = x.left;
	    else x=x.right;
	}
	z.parent = y;
	if (y == this.sentinel) {
	    this.root = z;
	}
	//else if(z.key < y.key) {
	else if(this.compare(z.key, y.key) < 0) {
	    y.left = z;
	}
	else {
	    y.right = z;
	}
	z.left = this.sentinel;
	z.right = this.sentinel;
	z.color = this.RED;
	this.insertFixup(z);
	this.size++;
    }
    else {
	var node = this.get_(key);
	node.value = value;
    }
};

/**
 * Helper method for insertAll	
 * @private
 */
js_cols.RedBlackMap.prototype.insertSwapped = function(value, key) {
    this.insert(key, value);
};


/**
 * A helper function, used to reestablish the tree invariants after insertion of a node
 * @private
 */
js_cols.RedBlackMap.prototype.insertFixup = function(z) {

    while (z != this.sentinel && z != this.root && z.parent.color == this.RED) {
        if (z.parent == z.parent.parent.left) {
            var y = z.parent.parent.right;
            if (y.color == this.RED) {
        	z.parent.color = this.BLACK;
        	y.color = this.BLACK;
        	z.parent.parent.color = this.RED;
        	z = z.parent.parent;
            } else {
        	if (z == z.parent.right) {
        	    z = z.parent;
        	    this.leftRotate(z);
        	}
        	z.parent.color = this.BLACK;
        	z.parent.parent.color = this.RED;
        	if (z.parent.parent != this.sentinel) this.rightRotate(z.parent.parent);
            }
        } else {
            var y = z.parent.parent.left;
            if (y.color == this.RED) {
        	z.parent.color = this.BLACK;
        	y.color = this.BLACK;
        	z.parent.parent.color = this.RED;
        	z = z.parent.parent;
            } else {
        	if (z == z.parent.left) {
        	    z=z.parent;
        	    this.rightRotate(z);
        	}
        	z.parent.color = this.BLACK;
        	z.parent.parent.color = this.RED;
        	if (z.parent.parent != this.sentinel) this.leftRotate(z.parent.parent);
            }
        }
    }
    this.root.color = this.BLACK;
};

/**
 *	Deletes a node in the tree
 * @param z {js_cols.RBnode} the node to delete
 * @private
 */

js_cols.RedBlackMap.prototype.delete_ = function(z) {
    var y;
    var x;
    
    if (z.left == this.sentinel || z.right == this.sentinel) {
	y = z;
	
    }
    else {
	y = this.successor_(z);
	
    }
    
    if (y.left != this.sentinel) {
	x = y.left;
	
    }
    else {
	x = y.right;
	
    }
    x.parent = y.parent;
    if (y.parent == this.sentinel) {
	this.root = x;
	
    }
    else if (y == y.parent.left) {
	y.parent.left = x;
	
    }
    else {
	y.parent.right = x;
	
    }

    if (y != z) {
	z.key = y.key;
	z.value = y.value;
	
    }
    if (y.color == this.BLACK) {
	this.deleteFixup(x);
	
    }
    this.size--;
    //return y;

};


/**
 * A helper function, used to reestablish the tree invariants after deletion of a node
 * @param x {js_cols.RBnode}
 * @private
 */
js_cols.RedBlackMap.prototype.deleteFixup = function(x) {
    
    while (x != this.root && x.color == this.BLACK) {
        if (x == x.parent.left) {
            var w = x.parent.right;

            if (w.color == this.RED) {
                w.color = this.BLACK;
                x.parent.color = this.RED;
                this.leftRotate(x.parent);
                w = x.parent.right;
            }

            if (w.left.color  == this.BLACK &&
                w.right.color == this.BLACK) {
                w.color = this.RED;
                x = x.parent;
            } else {
                if (w.right.color == this.BLACK) {
                    w.left.color = this.BLACK;
                    w.color = this.RED;
                    this.rightRotate(w);
                    w = x.parent.right;
                }
                w.color = x.parent.color;
                x.parent.color = this.BLACK;
                w.right.color = this.BLACK;
                this.leftRotate(x.parent);
                x = this.root;
            }
        } else { 
            var w = x.parent.left;

            if (w.color == this.RED) {
                w.color = this.BLACK;
                x.parent.color = this.RED;
                this.rightRotate(x.parent);
                w = x.parent.left;
            }

            if (w.right.color == this.BLACK &&
                w.left.color == this.BLACK) {
                w.color =  this.RED;
                x = x.parent;
            } else {
                if (w.left.color == this.BLACK) {
                    w.right.color = this.BLACK;
                    w.color = this.RED;
                    this.leftRotate(w);
                    w = x.parent.left;
                }
                w.color = x.parent.color;
                x.parent.color = this.BLACK;
                w.left.color = this.BLACK;
                this.rightRotate(x.parent);
                x = this.root;
            }
        }
    }

    x.color = this.BLACK;
    
    
};
/**
 * Remove the key and the value associated with it,
 * and returns the value
 * @param {*} key
 * @return {*} the value
 * @public
 */
js_cols.RedBlackMap.prototype.remove = function(key) {
    var x = this.get_(key);
    if (x != this.sentinel) {
	var retval = x.value;
	this.delete_(x);
	return retval;
    }
    else return null;
};

/**
 * helper function for removeAll
 * @param {*} key
 * @param {*} value
 * @private
 */
js_cols.RedBlackMap.prototype.removeSwapped = function(value,key) {
    this.remove(key);
};

/**
 * Retrieve the node with the minimum key
 * @param {js_cols.RBnode} x the node from which to retrieve the minimum key
 * @return {js_cols.RBnode} the node with the minimum key
 * @private
 */
js_cols.RedBlackMap.prototype.min = function(x) {
    while (x.left != this.sentinel) {
	x = x.left;
    }
    return x;
};

/**
 * Retrieve the node with the maximum key
 * @param {js_cols.RBnode} x the node from which to retrieve the maximum key
 * @return {js_cols.RBnode} the node with the maximum key
 * @private
 */
js_cols.RedBlackMap.prototype.max = function(x) {
    while (x.right != this.sentinel) {
	x = x.right;
    }
    return x;
};

/**
 * Finds and returns the succeeding node of that passed to the function
 * @param {js_cols.RBnode} x
 * @return {js_cols.RBnode} the succeeding node
 * @private
 */
js_cols.RedBlackMap.prototype.successor_ = function(x) {
    if (x.right != this.sentinel) return this.min(x.right);
    var y = x.parent;
    while (y != this.sentinel && x==y.right) {
	x = y;
	y = y.parent;
    }
    return y;
};

/**
 * Finds and returns the preceeding node of that passed to the function
 * @param {js_cols.RBnode} x
 * @return {js_cols.RBnode} the preceeding node
 * @private
 */
js_cols.RedBlackMap.prototype.predecessor_ = function(x) {
    
    if (x.left != this.sentinel) return this.max(x.left);
    var y = x.parent;
    while (y != this.sentinel && x==y.left) {
	x = y;
	y = y.parent;
    }
    return y;
};
/**
 * Finds and returns the value associated with the succeeding key to that passed to the function
 * @param {*} key
 * @return {*} the value associated with the succeeding key
 * @public
 */
js_cols.RedBlackMap.prototype.successor = function(key) {
    // TODO if key not in tree, throw exception?
    if(this.size >0) {
	var x = this.get_(key);
	if (x == this.sentinel) return null;
	if (x.right != this.sentinel) return this.min(x.right).value;
	var y = x.parent;
	while (y != this.sentinel && x==y.right) {
	    x = y;
	    y = y.parent;
	}
	if (y != this.sentinel)return y.value;
	else return null;
    }
    else {
	return null;
    }
};
/**
 * Finds and returns the value associated with the preceeding key to that passed to the function
 * @param {*} key
 * @return {*} the value associated with the preceeding key, or null if the tree is not in the map
 * @public
 */
js_cols.RedBlackMap.prototype.predecessor = function(key) {
    
    if(this.size >0) {
	var x = this.get_(key);
	if (x == this.sentinel) return null;
	if (x.left != this.sentinel) return this.max(x.left).value;
	var y = x.parent;
	while (y != this.sentinel && x==y.left) {
	    x = y;
	    y = y.parent;
	}
	if (y != this.sentinel)return y.value;
	else return null;
    }
    else {
	return null;
    }

};

/**
 * Returns the value associated with the minimum key in this tree
 * @return {*} the value associated with the minimum key in this tree 
 * @public
 */
js_cols.RedBlackMap.prototype.getMin = function() {
    return this.min(this.root).value;
};

/**
 * Returns the value associated with the maximum key in this tree
 * @return {*} the value associated with the maximum key in this tree 
 * @public
 */
js_cols.RedBlackMap.prototype.getMax = function() {
    return this.max(this.root).value;
};

/**
 * Returns the value associated with the minimum key in this tree
 * @return {*} the key and value associated with the minimum key in this tree 
 * @public
 */
js_cols.RedBlackMap.prototype.popMin = function() {
    var min = this.min(this.root);
    var retkey = min.key, retval = min.value;
    this.delete_(min);
    return {"key": retkey, "value": retval };
};


/**
 * Returns the value associated with the maximum key in this tree
 * @return {*} the key and value associated with the maximum key in this tree 
 * @public
 */
js_cols.RedBlackMap.prototype.popMax = function() {
    var max = this.max(this.root);
    var retkey = max.key, retval = max.value;
    this.delete_(max);
    return {"key": retkey, "value": retval };
};



/**
 * @return {js_cols.RBnode} the node with the given key
 * @private
 */
js_cols.RedBlackMap.prototype.get_ = function(key) {
    var x = this.root;
    while (x !== this.sentinel && this.compare(x.key, key) !== 0) {
	if (this.compare(key, x.key)<0) x = x.left;
	else x= x.right;
    }
    return x;
};


/**
 * Finds and returns the value associated with the key that is passed to the function
 * @param {*} key
 * @return {*} the value associated with the key if it exists in this tree, otherwise null
 * @public
 */
js_cols.RedBlackMap.prototype.get = function(key) {
    return this.get_(key).value;
};

/**
 * Returns true if the key is associated with a value in this tree
 * @param {*} key
 * @return {Boolean} 
 * @public
 */
js_cols.RedBlackMap.prototype.contains = function(key) {
    return this.get_(key).key != null;
};

/**
 * Whether the map contains the given key.
 * @param {*} key The key to check for.
 * @return {boolean} Whether the map contains the key.
 * @private
 */
js_cols.RedBlackMap.prototype.containsSwapped = function(value, key) {
    return this.contains(key);
};

/**
 * Inserts the values stored in the tree into a new Array and returns the Array.
 *
 * @return {Array} An array containing all of the trees values in sorted order.
 */
js_cols.RedBlackMap.prototype.getValues = function() {
    var ret = [];
    this.traverse(function(x) {
        ret.push(x);
    });
    return ret;
};

/**
 * Inserts the keys stored in the tree into a new Array and returns the Array.
 *
 * @return {Array} An array containing all of the trees values in sorted order.
 */
js_cols.RedBlackMap.prototype.getKeys = function() {
    var ret = [];
    if (this.isEmpty()) return ret;
    var node = this.min(this.root);
    while (node != this.sentinel) {
        ret.push(node.key);
        node = node = this.successor_(node);
    };
    return ret;
};

/**
 * Inserts a collection of key/value pairs into the map
 * If the collection has no notion of keys (i.e. an Array or Set) each element
 * is inserted as both key and value (mapping to it self)
 * @param {js_cols.Collection || Object || Array} col the collection to insert
 * @public
 */
js_cols.RedBlackMap.prototype.insertAll = function(col) {
    if (js_cols.typeOf(col) == "array") {
	for (var i = 0; i < col.length; i++) {
	    this.insert(col[i],col[i]);
	};
    }
    else if (js_cols.typeOf(col.forEach) == "function") {
	col.forEach(this.insertSwapped, this);
    }
    else if (js_cols.typeOf(col.getValues) == "function" && js_cols.typeOf(col.getKeys) == "function" ) {
	var vals = col.getValues();
	var keys = col.getKeys();
	for (var i = 0; i < keys.length; i++) {
	    this.insert(keys[i], vals[i]);
	};
    }
    else if (js_cols.typeOf(col) == "object") {
	for (var key in col) {
	    this.insert(key, col[key]);
	}
    }
};



/**
 * Removes a all values contained in the collection from the tree
 * The values in the collection are treated as keys in the tree,
 * and the values associated with those keys are removed.
 * @param {js_cols.Collection || Array || Object} col the collection of values to remove
 * @public
 */
js_cols.RedBlackMap.prototype.removeAll = function(col) {
    if (js_cols.typeOf(col) == "array") {
	for (var i = 0; i < col.length; i++) {
	    this.remove(col[i]);
	};
    }
    else if (js_cols.typeOf(col.forEach) == "function") {
	col.forEach(this.removeSwapped, this);
    }
    else if (js_cols.typeOf(col.getValues) == "function") {
	var arr = col.getValues();
	for (var i = 0; i < arr.length; i++) {
	    this.remove(arr[i]);
	};
    }
    else if (js_cols.typeOf(col) == "object") {
	for (var key in col) {
	    this.remove(col[key]);
	}
    }
};

/**
 * Checks that all values contained in the collection are also contained as keys in the tree
 * @param {js_cols.Collection || Array || Object} col the collection of values to check
 * @return {Boolean}
 * @public
 */
js_cols.RedBlackMap.prototype.containsAll = function(col) {
    if (js_cols.typeOf(col) == "array") {
	for (var i = 0; i < col.length; i++) {
	    if (!this.contains(col[i]))
	    { return false;
	    };
	};
	return true;
    }
    else if (js_cols.typeOf(col.every) == "function") {
	return col.every(this.containsSwapped, this);
    }
    else if (js_cols.typeOf(col.getValues) == "function") {
	var arr = col.getValues();
	for (var i = 0; i < arr.length; i++) {
	    if (!this.contains(arr[i])) {
		return false;
	    };
	};
	return true;
    }
    else if (js_cols.typeOf(col) == "object") {
	for (var key in col) {
	    if (!this.contains(key)) {
		return false;
	    };
	}
	return true;
    }
};


/**
 * Calls a function on each item in the RedBlackMap.
 *
 * @param {Function} f The function to call for each item. The function takes
 *     three arguments: tha value, the key, and the RedBlackMap.
 * @param {Object=} opt_obj The object context to use as "this" for the
 *     function.
 */
js_cols.RedBlackMap.prototype.forEach = function(f, opt_obj) {
    if (this.isEmpty()) return;
    for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
  	
        f.call(opt_obj, n.value, n.key, this);
    }
};

/**
 * Calls a function on each item in the RedBlackMap and returns true if any of
 * those function calls returns a true-like value.
 *
 * @param {Function} f The function to call for each item. The function takes
 *     three arguments: the value, the key and the RedBlackMap, and returns a
 *     boolean.
 * @param {Object=} opt_obj The object context to use as "this" for the
 *     function.
 * @return {boolean} Whether f evaluates to true for at least one item in the
 *     RedBlackSet.
 */
js_cols.RedBlackMap.prototype.some = function(f, opt_obj) {
    if (this.isEmpty()) return false;
    for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
        if (f.call(opt_obj,n.value, n.key, this)) {
            return true;
        }
    }
    return false;
};


/**
 * Calls a function on each item in the RedBlackMap and returns true only if every
 * function call returns a true-like value.
 *
 * @param {Function} f The function to call for each item. The function takes
 *     three arguments: the value, the key, and the RedBlackMap, and returns a
 *     boolean.
 * @param {Object=} opt_obj The object context to use as "this" for the
 *     function.
 * @return {boolean} Whether f evaluates to true for every item in the RedBlackMap.
 */
js_cols.RedBlackMap.prototype.every = function(f, opt_obj) {
    if (this.isEmpty()) return false;
    for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
        if (!f.call(opt_obj,n.value, n.key, this)) {
            return false;
        }
    }
    return true;
};

/**
 * Calls a function on each item in the RedBlackMap and returns the results of
 * those calls in an array.
 *
 * @param {!Function} f The function to call for each item. The function takes
 *     three arguments: the value, the key, and the RedBlackMap.
 * @param {Object=} opt_obj The object context to use as "this" for the
 *     function.
 * @return {!Array} The results of the function calls for each item in the
 *     RedBlackMap.
 */
js_cols.RedBlackMap.prototype.map = function(f, opt_obj) {
    var rv = [];
    if (this.isEmpty()) return rv;
    for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
        rv.push(f.call(opt_obj, n.value, n.key, this));
    }
    return rv;
};

/**
 * Calls a function on each item in the RedBlackMap, if the function returns true, the key/value pair
 * is inserted into a new RedBlackMap that is returned when the tree is fully traversed
 *
 * @param {!Function} f The function to call for each item. The function takes
 *     three arguments: the value, the key, and the RedBlackMap.
 * @param {Object=} opt_obj The object context to use as "this" for the
 *     function.
 * @return {js_cols.RedBlackMap} The key / value pairs that evaluated to true in the function calls are returned in 
 *    a new RedBlackMap.
 */
js_cols.RedBlackMap.prototype.filter = function(f, opt_obj) {
    var rv = new js_cols.RedBlackMap(this.compare);
    if (this.isEmpty()) return rv;
    for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
        if (f.call(opt_obj, n.value, n.key, this)) {
    	    rv.insert(n.key, n.value);
        }
    }
    return rv;
};

/**
 * Finds all key/value pairs that are present in both this map and the given collection.
 * If the collection has no notion of keys (i.e. a Set or an Array), each element of the collection
 * will be treated as key, and it will be inserted to the returned map with its corresponding value from this map.
 * This operation is O(n * O(col.contains)).
 * Example: if col is another RedBlackMap of size m, running time is O(n log(m)),
 * if col is an Array or LinkedList, running time is O(n * m),
 * if col is a HashSet, running time is O(n).
 * @param {js_cols.Collection || Object} col A collection.
 * @return {js_cols.RedBlackMap} A new set containing all the key/value pairs (primitives
 *     or objects) present in both this set and the given collection.
 */
js_cols.RedBlackMap.prototype.intersection = function(col) {
    var rv = new js_cols.RedBlackMap(this.compare);
    if (this.isEmpty()) return rv;
    if (js_cols.typeOf(col.get) == 'function') {
  	for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
            if (col.get.call(col, n.key) == n.value) {
    	        rv.insert(n.key, n.value);
            }
        }
    }
    else{
        for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
            if (js_cols.contains.call(col, col, n.key)) {
    	        rv.insert(n.key, n.value);
            }
        }
    }
    return rv;
};

/**
 * Detects wheter all key/value pairs present in this map are also present in the given collection.
 * If the collection has no notion of keys (i.e. a Set or an Array), the result will be whether the keys 
 * in this map is a subset of the elements in the collection.
 * This operation is O(n * O(col.contains)).
 * Example: if col is another RedBlackMap of size m, running time is O(n log(m)),
 * if col is an Array or LinkedList, running time is O(n * m),
 * if col is a HashSet, running time is O(n).
 * @param {js_cols.Collection || Object} col A collection.
 * @return {Boolean} wheter this map is a submap of col
 *     
 */
js_cols.RedBlackMap.prototype.isSubmapOf = function(col) {
    var colCount = js_cols.getCount(col);
    if (this.getCount() > colCount) {
        return false;
    }
    var i =0;
    if (this.isEmpty()) return true;
    if (js_cols.typeOf(col.get) == 'function') {
  	for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
            if (col.get.call(col, n.key) == n.value) {
    	        i++;
            }
        }
    }
    else{
        for (var n = this.min(this.root); n != this.sentinel; n = this.successor_(n)) {
            if (js_cols.contains.call(col, col, n.key)) {
    	        i++;
            }
        }
    }
    return i == this.getCount();
};

/**
 * Returns an array of the values in a given key range in this tree. 
 * The 'from' key is inclusive, the 'to' key exclusive
 * @param {*} from the smallest key in the range
 * @param {*} to the successor of the largest key in the range
 * @return {Array} an array of values 
 * @public
 */

js_cols.RedBlackMap.prototype.range = function(from, to) {
    
    var retArray = [];
    var f = function(x) {
	retArray.push(x);
    };
    this.traverseFromTo(f, from, to);
    return retArray;
    
};
/**
 * Performs an in-order traversal of the tree and calls {@code func} with the value of each
 * traversed node. The traversal ends after traversing the tree's
 * maximum node or when {@code func} returns a value that evaluates to true.
 *
 * @param {Function} func Function to call on the value of each traversed node.
 * @public
 */	
js_cols.RedBlackMap.prototype.traverse = function(func) {
    if (this.isEmpty()) return;
    var node = this.min(this.root);
    while (node != this.sentinel) {
	
	if (func(node.value)) return;
	node = this.successor_(node);
    }
};

/**
 * Performs an in-order traversal of the tree and calls {@code func} with the value of each
 * traversed node, starting on the node with a key = to
 * the specified start key. The traversal ends after traversing the tree's
 * maximum node or when {@code func} returns a value that evaluates to true.
 *
 * @param {Function} func Function to call on the value of each traversed node.
 * @param {Object=} fromKey Traversal will begin on the
 *    node with key = fromKey.
 * @public
 */
js_cols.RedBlackMap.prototype.traverseFrom = function(func, fromKey) {
    if (this.isEmpty()) return;
    var node = this.get_(fromKey);
    while (node != this.sentinel) {
	
	if (func(node.value)) return;
	node = this.successor_(node);
    }
};

/**
 * Performs an in-order traversal of the tree and calls {@code func} with the value of each
 * traversed node. The traversal ends before the node with key = toKey
 * or when {@code func} returns a value that evaluates to true.
 * @param {Function} func Function to call the value of on each traversed node.
 * @param {Object=} toKey Traversal will end before the
 *    node with the smallest key < toKey.
 * @public
 */
js_cols.RedBlackMap.prototype.traverseTo = function(func, toKey) {
    if (this.isEmpty()) return;
    var node = this.min(this.root);
    var toNode = this.get_(toKey);
    while (node != toNode) {
	
	if (func(node.value)) return;
	node = this.successor_(node);
    }
};

/**
 * Performs an in-order traversal of the tree and calls {@code func} with the value of each
 * traversed node, starting on the node with a key = to
 * the specified start key. The traversal ends before the node with key = toKey
 * or when {@code func} returns a value that evaluates to true.
 *
 * @param {Function} func Function to call on the value of each traversed node.
 * @param {Object=} fromKey Traversal will begin on the
 *    node with key = fromKey.
 * @param {Object=} toKey Traversal will end before the
 *    node with the smallest key < toKey.
 * @public
 */
js_cols.RedBlackMap.prototype.traverseFromTo = function(func, fromKey, toKey) {
    if (this.isEmpty()) return;
    var node = this.get_(fromKey);
    var toNode = this.get_(toKey);
    while (node != toNode) {
	if (func(node.value)) return;
	node = this.successor_(node);
    }
};

/**
 * Performs a reverse-order traversal of the tree and calls {@code f} with the value of
 * each traversed node, optionally starting from the largest node with a value
 * <= to the specified start value. The traversal ends after traversing the
 * tree's minimum node or when func returns a value that evaluates to true.
 *
 * @param {Function} f Function to call on the value of each traversed node.
 * @param {Object=} opt_startValue If specified, traversal will begin on the
 *    node with the largest value <= opt_startValue.
 * @public
 */
js_cols.RedBlackMap.prototype.traverseBackwards = function(f) {
    if (this.isEmpty()) return;
    var node = this.max(this.root);
    while (node != this.sentinel) {
	
	if (f(node.value)) return;
	node = this.predecessor_(node);
    }
};

/**
 * Returns the current size of the tree (number of elements)
 * @return {Integer} 
 * @public
 */

js_cols.RedBlackMap.prototype.getCount = function() {
    return this.size;
};

/**
 * Returns true current size of the tree is zero
 * @return {Boolean} 
 * @public
 */

js_cols.RedBlackMap.prototype.isEmpty = function() {
    return this.size ==0;
};





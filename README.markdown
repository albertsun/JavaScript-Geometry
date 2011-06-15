JavaScript-Geometry
===================

JavaScript-Geometry is (the start) of a collection of computation geometry algorithms implemented in JavaScript and designed to run in any modern browser. To use it, include the javascript files in the datastructures folder, and the javascript file of the algorithm you want to use. Licensed under the Apache License, Version 2.0


For now it only implements one algorithm to find all intersections in a set of line segments in 2D.

* findintersections.js

    Find all intersections in a set of lines in O(n logn) time using a plane sweep algorithm as described in _Computational Geometry - Algorithms and Applications_ Third Edition, by Mark de Berg, Otfried Cheong, Marc van Kreveld and Mark Overmars.
This file implements just one method, findIntersections( segments ) which takes as input an array of segments and returns an array of the intersection points, along with lines which intersect at that point.


        >>> findIntersections([ [[1,0], [1,2]], [[0,1], [2,1]] ])
        [ { "loc": [1, 1], "segments": [ [[1,0],[1,2]], [[0,1],[2,1]] ] } ]




As I work through the book, more will hopefully come.

The implementations of the Red Black Tree used as a data structure is a modified version of code from the js_cols library by Thomas Stjernegaard Jeppesen http://code.google.com/p/jscols/

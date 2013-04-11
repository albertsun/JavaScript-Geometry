/* 
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS-IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
*/

/*
  depends on
  -underscore
    http://documentcloud.github.io/underscore/
  -sylvester
    https://github.com/jcoglan/sylvester
*/
// Sylvester.precision = 1e-12;

/* takes a regular n-simplex and returns a set of (n+1)! n-simplices
   whose union equals the original n-simplex

  a simplex is defined as an array of it's vertices

  a 0-simplex looks like
  [
    [0]
  ]

  a 1-simplex looks like
  [
    [0],
    [1]
  ]

  a 2-simplex looks like (equilateral triangle)
  [
    [0,0],
    [1,0],
    [0.5, (Math.sqrt(3)/2)]
  ]

  a 3-simplex looks like (regular tetrahedron)
  [
    [0, 0, 0],
    [1, 0, 0],
    [0.5, (Math.sqrt(3)/2), 0],
    [0.5, (Math.sqrt(3)/6), (Math.sqrt(6)/3)],
  ]
*/
var barycentricSubdivision = function(simplex) {
  var n = simplex.length - 1;

  /* a 0-simplex's subdivision is itself. return a 1-deep copy. */
  if (n === 0) return [_.clone(simplex[0])];

  var barycenter = calculateBarycenter(simplex);
  return _(simplex).reduce(function(subdivision, vertex, index, simplex) {


  },[]);
};

var calculateMidpoint = function(v1, v2) {
  var n = v1.length;
  var midpoint = [];
  for (var i=0; i<n; i++) {
    midpoint[i] = ((v2[i] - v1[i])/2) + v1[i];
  }
  return midpoint;
};
var calculateBarycenter = function(vertices) {
  /* convert to sylvester vertexes */
  vertices = _.map(vertices, function(vertex) {
    return $V(vertex);
  });
  /* sum the vectors */
  var n = vertices[0].elements.length;
  var sum = _(vertices).reduce(function(memo, vertex){
    return memo.add(vertex);
  }, Vector.Zero(n));
  /* divide by number of vertices */
  var barycenter = sum.multiply(1/vertices.length);
  return barycenter.elements;
};

/* a facet is an (n-1)-face
  or a collection of n vertices.
*/
var findFacets = function(simplex) {

};

if (!_.isEqual(calculateMidpoint([0,0],[1,0]), calculateBarycenter([[0,0],[1,0]]))) {
  throw new Error("calculateMidpoint and calculateBarycenter should be the same for 2D vectors.");
}

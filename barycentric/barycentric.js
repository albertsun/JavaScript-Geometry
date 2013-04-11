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

/* 
  a simplex is defined as an array of it's vertices

  a 0-simplex looks like
  [
    $V([0])
  ]

  a 1-simplex looks like
  [
    $V([0]),
    $V([1])
  ]

  a 2-simplex looks like (equilateral triangle)
  [
    $V([0,0]),
    $V([1,0]),
    $V([0.5, (Math.sqrt(3)/2)])
  ]

  a 3-simplex looks like (regular tetrahedron)
  [
    $V([0, 0, 0]),
    $V([1, 0, 0]),
    $V([0.5, (Math.sqrt(3)/2), 0]),
    $V([0.5, (Math.sqrt(3)/6), (Math.sqrt(6)/3)])
  ]

  barycentricSubdivision takes a regular n-simplex and returns an array of (n+1)! n-simplices
  whose union equals the original n-simplex. 
*/
var barycentricSubdivision = function(simplex) {
  var n = simplex.length - 1;

  /* a 0-simplex's subdivision is itself. return an array with a 1-deep copy. */
  if (n === 0) return [ [_.clone(simplex[0])] ];

  /* otherwise find the simplex's facets, i.e. a triangle's edges, a tetrahedron's faces */
  var facets = findFacets(simplex);
  var subdivided_facets = _.map(facets, function(facet) { return barycentricSubdivision(facet); });
  subdivided_facets = _.flatten(subdivided_facets, true);
  var barycenter = calculateBarycenter(simplex);
  var simplices = _.map(subdivided_facets, function(facet) {
    facet.push(barycenter.dup());
    return facet;
  });
  return simplices;
};
/* repeat barycentric subdivision n-times */
var repeatedBarycentricSubdivision = function(simplex, n) {
  function subdivideMultiple(simplex_array) {
    return _.flatten(_.map(simplex_array, barycentricSubdivision), true);
  }
  var subdivision = [simplex];
  for (var i=0; i<n; i++) {
    subdivision = subdivideMultiple(subdivision);
  }
  return subdivision;
};

/*
  takes an array of vectors and turns it to an array of arrays.
  TODO: do the scaling to 2D of non 2D vectors 
*/
var vectorsTo2DArrays = function(vectors) {
  return _.map(vectors, function(v) { return v.elements; });
};

/* takes plain arrays, NOT sylvester vectors */
var calculateMidpoint = function(v1, v2) {
  var n = v1.length;
  var midpoint = [];
  for (var i=0; i<n; i++) {
    midpoint[i] = ((v2[i] - v1[i])/2) + v1[i];
  }
  return midpoint;
};
/* operates on sylvester vectors */
var calculateBarycenter = function(vertices) {
  /* sum the vectors */
  var n = vertices[0].elements.length;
  var sum = _(vertices).reduce(function(memo, vertex){
    return memo.add(vertex);
  }, Vector.Zero(n));
  /* divide by number of vertices */
  var barycenter = sum.multiply(1/vertices.length);
  return barycenter;
};

/*
  for a given simplex, return it's facets

  a facet is an (n-1)-face
  or a collection of n vertices

  essentially (n choose n-1) if n is the number of vertices in the simplex
*/
var findFacets = function(simplex) {
  var facet_size = simplex.length - 1;
  var indexes = sets(facet_size, _.range(0,simplex.length));
  var get_at = function(idx) { return simplex[idx]; };
  var facets = _.map(indexes, function(index_set) {
    return _.map(index_set, get_at);
  });
  return facets;
};
/* for a numeric array, return all unique subsets (combinations) with cardinality k
   aka, return the indexes in the simplex of the faces.

  TODO: try caching results of the recursion
*/
function sets(k, set) {
  if (k===0) return [{}];
  // console.log(set);
  if (_.isArray(set)) { set = _.reduce(set, function(memo, i) { memo[i]=true; return memo; }, {}); }
  return _.chain( _.reduce(sets(k-1, set), function(memo, subset) {
    // console.log(subset,memo);
    if (_.isArray(subset)) { subset = _.reduce(subset, function(memo, i) { memo[i]=true; return memo; }, {}); }
    memo = memo.concat(
      _.map(set, function(v, el) {
        // console.log(el);
        new_subset = _.clone(subset);
        if (new_subset[el] !== true) {
          new_subset[el] = true;
        }
        return new_subset; 
      })
    );
    // filter out subsets that are just reorderings
    memo = _.uniq(memo, false, function(o) { return _.keys(o).sort().join("_"); });
    return memo;
  }, []) ).map(function(subset) {
    return _.keys(subset);
  }).filter(function(subset) {
    if (subset.length === k) return true;
  }).value();
}

if (!_.isEqual(
            calculateMidpoint([0,0],[1,0]),
            calculateBarycenter([$V([0,0]),$V([1,0])]).elements
          )
          ) {
  throw new Error("calculateMidpoint and calculateBarycenter should be the same for 2D vectors.");
}

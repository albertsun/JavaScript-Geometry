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

/*global _: false, js_cols: false, barycentricSubdivision: false*/


/* test barycentricSubdivision */

var canvas,ctx;

var point = [
  $V([0])
];
var line = [
  $V([0]),
  $V([1])
];
var triangle = [
  $V([0,0]),
  $V([1,0]),
  $V([0.5, (Math.sqrt(3)/2)])
];
var tetrahedron = [
  $V([0, 0, 0]),
  $V([1, 0, 0]),
  $V([0.5, (Math.sqrt(3)/2), 0]),
  $V([0.5, (Math.sqrt(3)/6), (Math.sqrt(6)/3)])
];

function runTest() {

  // for (var i=0,len=segments.length; i<len; i++) {
  //     ctx.beginPath();
  //     ctx.moveTo(100*segments[i][0][0], 100*segments[i][0][1]);
  //     ctx.lineTo(100*segments[i][1][0], 100*segments[i][1][1]);
  //     ctx.stroke();
  // }
  
  drawTriangle(flattenVectors(triangle), 200, 10, 10);
  var subdvision = barycentricSubdivision(triangle);
  _.each(subdvision, function(triangle) {
    drawTriangle(triangle, 200, 10, 10);
  });
}

$(document).ready(function() {

  canvas = $("#basic")[0];
  ctx = canvas.getContext('2d');

  runTest();
});


// triangle should be an
// array with 3 elements
// with each element being an array with two numbers
// representing the x,y coordinates of each vertex
function drawTriangle(triangle, scalefactor, x_offset, y_offset, clear) {
  if (!scalefactor) scalefactor = 1;
  if (!x_offset) x_offset = 0;
  if (!y_offset) y_offset = 0;
  if (clear === true) canvas.width = canvas.width; //clear canvas contents

  ctx.beginPath();
  ctx.moveTo(x_offset+triangle[0][0]*scalefactor, y_offset+triangle[0][1]*scalefactor);
  ctx.lineTo(x_offset+triangle[1][0]*scalefactor, y_offset+triangle[1][1]*scalefactor);
  ctx.lineTo(x_offset+triangle[2][0]*scalefactor, y_offset+triangle[2][1]*scalefactor);
  ctx.lineTo(x_offset+triangle[0][0]*scalefactor, y_offset+triangle[0][1]*scalefactor);
  ctx.stroke();
  _.each(triangle, function(vertex) {
    drawPoint(x_offset+vertex[0]*scalefactor, y_offset+vertex[1]*scalefactor, 3);
  });
}
function drawPoint(x,y,size) {
  if (!size) size = 1;
  // ctx.fillRect(x*scalefactor, y*scalefactor, x+size, y+size);
  ctx.beginPath();
  ctx.arc(x, y, size, 0, 2*Math.PI, true);
  ctx.fill();
}

/* 
Copyright Dow Jones & Company, Inc. All Rights Reserved
Author: Albert Sun
WSJ.com News Graphics

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS-IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
*/


/*jslint white: false, debug: false, devel: true, onevar: false, plusplus: false, browser: true, bitwise: false */
/*global jQuery: false, $: false, WSJNG: false, js_cols: false, window: false */



function handleNextPoint() {
    eventpoint = event_points.popMin();
    window.sweep_position = eventpoint.key[1];
    handleEventPoint(eventpoint);
    console.log("#event_points: "+event_points.getCount());
    console.log("#sweep_segments: "+sweep_segments.getCount());
}

function runTest(segments, b) {
    canvas.width = canvas.width; //clear canvas contents

    for (var i=0,len=segments.length; i<len; i++) {
        ctx.beginPath();
        ctx.moveTo(100*segments[i][0][0], 100*segments[i][0][1]);
        ctx.lineTo(100*segments[i][1][0], 100*segments[i][1][1]);
        ctx.stroke();
    }

    var intersections = findIntersections(segments);
    var num = intersections.length
    console.log("found "+num+" intersections");
    console.log(intersections);
    if (num === b) {
        return {"intersections": intersections, "num": num};
    } else {
        throw new Error("TEST FAILED! Expected to find "+b+" intersections, instead found "+num);
    }
}

var canvas,ctx;

$(document).ready(function() {

    canvas = $("#basic")[0];
    ctx = canvas.getContext('2d');

    var segments = [];

    //segments.push({"a":[ [[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0]], [[1,0],[0,0]] ], "b":4});

    // TODO: make it work with vertical and horizontal segments
    
    segments.push({"a":[ [[0,0], [1,1]], [[0, 0.5], [1.5, 1]] ],"b":1});
    segments.push({"a":[ [[0,0], [1,1]], [[0, 0.5], [1.5, 1]], [[2.1,0.1], [1.9,0.9]] ],"b":1});
    segments.push({"a":[ [[1.456, 4.23], [0.12, 3.223]], [[1.2, 2.5], [0.1, 0.3]] ],"b":0});
    segments.push({"a":[ [[1.456, 4.23], [0.12, 3.223]], [[1.2, 2.5], [0.1, 0.3]], [[0.1, 3.1234], [2, 1]] ],"b":1});
    segments.push({"a":[ [[1.456, 4.23], [0.12, 3.223]], [[1.2, 2.5], [0.1, 0.3]], [[0.1, 3.1234], [2, 1]], [[.4,4], [1.2,0.2]] ],"b":4});
    segments.push({"a":[ [[0.12, 3.223], [1.456, 4.23]], [[1.2, 2.5], [0.1, 0.3]], [[0.1, 3.1234], [2, 1]], [[1.2,0.2], [.4,4]], [[1.8,0], [1.9,5]] ],"b":5});
    segments.push({"a":[ [[1.456, 4.23], [0.12, 3.223]], [[1.2, 2.5], [0.1, 0.3]], [[0.1, 3.1234], [2, 1]], [[.4,4], [1.2,0.2]], [[1.9,0], [1.9,5]] ],"b":5});
    segments.push({"a":[ [[1.456, 4.23], [0.12, 3.223]], [[1.2, 2.5], [0.1, 0.3]], [[0.1, 3.1234], [2, 1]], [[.4,4], [1.2,0.2]], [[2,0], [2,5]], [[0,0.1], [2,0]], [[3,4], [3,4.4]] ],"b":6});
    segments.push({"a":[ [[1.456, 4.23], [0.12, 3.223]], [[1.2, 2.5], [0.1, 0.3]], [[0.1, 3.1234], [2, 1]], [[.4,4], [1.2,0.2]], [[2,0], [2,5]], [[0,0.1], [2,0]], [[0,0.2], [2,0]] ],"b":6});
    segments.push({"a":[ [[0,0], [1,1]], [[0.25,0], [0.5,0.5]], [[0, 0.5], [1.5, 1]], [[0,1], [1,0]], [[.5, 0], [.5, 1]] ],"b":4});
    segments.push({"a":[ [[0,0], [1,1]], [[0.25,0], [0.5,0.5]], [[0, 0.5], [1.5, 1]], [[0,1], [1,0]], [[.5, 0], [.5, 1]], [[.5,.5], [.55,.65]] ],"b":4});
    segments.push({"a":[ [[0,0], [1,1]], [[1,1], [2,2]], [[1,1],[2,3]], [[2,3],[1,3]], [[1,3],[1,1]], [[2,2],[2,3]] ],"b":4});
    segments.push({"a":[ [[0,0], [1,1]], [[0,.5], [1,.5]], [[.2,.2], [1.2,.2]] ],"b":2}); // test horizontal line
    segments.push({"a":[ [[1,0], [1,1]], [[0,.5], [1,.5]], [[1,1], [1.2,1]] ],"b":2});
    segments.push({"a":[ [[1,0], [1,2]], [[0,1], [2,1]] ],"b":1});
    segments.push({"a":[ [[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0]], [[1,0],[0,0]] ], "b":4});
    segments.push({"a":[ [[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0]], [[1,0],[0,0]],[[1,1],[1,2]], [[1,2],[2,2]], [[2,2],[2,1]], [[2,1],[1,1]], [[0,1], [1,2]] ], "b":7});
    segments.push({"a":[ [[0,0], [2,2]], [[1,1], [3,3]] ],"b":2});
    segments.push({"a":[ [[0,0], [2,2]], [[1,1], [3,3]], [[3,0],[0,3]] ],"b":3});
    segments.push({"a":[ [[0,0], [2,2]], [[2,2], [0,0]] ],"b":2});
    segments.push({"a":[ [[0,0], [2,2]], [[0,0], [2,2]] ],"b":2});
    segments.push({"a":[ [[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0]], [[1,0],[0,0]], [[1,1],[1,0]], [[1,1],[2,1]], [[2,1], [2,0]], [[2,0],[1,0]] ], "b":6});


    var result, num = 0;
    for (var i=0, len=segments.length; i<len; i++) {
        console.log("+++++++++++ running test "+i+" ++++++ expecting "+segments[i].b+" intersections ++++++");
        console.log(segments[i].a);
        result = runTest(segments[i].a, segments[i].b);
        num += result.num;
    }
    console.log("passed "+i+" tests and found "+num+" intersections");
});

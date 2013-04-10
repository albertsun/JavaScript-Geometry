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

/*jslint white: false, debug: false, devel: true, onevar: false, plusplus: false, browser: true, bitwise: false */
/*global jQuery: false, $: false, WSJNG: false, js_cols: false, window: false */


// given a list of segments [ [[x1,y1],[x2,y2]], ...] find all intersection points
var findIntersections = function(segments) {

    // returns -1 if a above b, 1 if a below b, 0 otherwise
    var comparePoints = function(a, b) {
        // assume a and b are points [x,y]
        // a lexicographic ordering with smaller going up and to the left
        if (Number(a[1]) < Number(b[1])) { return -1; }
        else if (Number(a[1]) > Number(b[1])) { return 1; }
        else {
            if (Number(a[0]) < Number(b[0])) { return -1; }
            else if (Number(a[0]) > Number(b[0])) { return 1; }
            else { return 0; }
        }
    };

    // returns magnitude of the cross product of two 2-D vectors
    var crossProduct = function(v1, v2) {
        return ((v1[0]*v2[1]) - (v1[1]*v2[0]));
    };
    
    // returns < 0 if the point is left of the line, > 0 if the point is right of the line
    // and 0 if the point is on the line (extended to infinity)
    var leftOrRight = function(line, point) {
        if (comparePoints(line[0],line[1]) <= 0) {
            line = [line[1],line[0]];
        }
        return crossProduct([line[1][0] - line[0][0], line[1][1] - line[0][1]], [point[0] - line[0][0], point[1] - line[0][1]]);
    };

    // returns an intersection point if one exists, or null
    var findIntersection = function(seg1, seg2) {
        var p = seg1[0], r = [seg1[1][0]-seg1[0][0], seg1[1][1]-seg1[0][1]],
        q = seg2[0], s = [seg2[1][0]-seg2[0][0], seg2[1][1]-seg2[0][1]];

        if (crossProduct(r,s) === 0) {
            //if crossProduct(r,s)===0 then lines are parallel
            if (crossProduct([q[0]-p[0], q[1],p[1]], r) === 0) {
                //TODO: handle lines being collinear
                //if crossProduct((q-p), r)===0 then they are collinear
                throw new Error("Handling collinear lines not implemented yet!");
            } else {
                return null; //lines are parallel and not collinear
            }
        } else {
            var t = crossProduct([q[0]-p[0], q[1]-p[1]], s)/crossProduct(r, s),
            u = crossProduct([q[0]-p[0], q[1]-p[1]], r)/crossProduct(r,s);
            if ((t >= 0) && (t <= 1) && (u >= 0) && (u <= 1)) {
                return [p[0] + (t*r[0]), p[1] + (t*r[1])];
            } else {
                return null; //lines do not intersect on either segment
            }
        }
        return null;
    };

    var handleEventPoint = function(eventpoint) {
        var p = eventpoint.key;
        var U_p = eventpoint.value;
        //console.log("handling event point: "+p);

        var temp = sweep_segments.findSegments(p);
        var L_p = temp.LowerEndPoint;
        var C_p = temp.InteriorPoint;

        // get the set unions of U_p, L_p, C_p
        var segmentset = new WSJNG.Dictionary(),
        L_pC_p = new WSJNG.Dictionary(),
        U_pC_p = new WSJNG.Dictionary();
        for (var i=0,len=U_p.length; i<len; i++) {
            segmentset[U_p[i].join('_')] = U_p[i];
            U_pC_p[U_p[i].join('_')] = U_p[i];
        }
        for (i=0,len=L_p.length; i<len; i++) {
            segmentset[L_p[i].join('_')] = L_p[i];
            L_pC_p[L_p[i].join('_')] = L_p[i];
        }
        for (i=0,len=C_p.length; i<len; i++) {
            segmentset[C_p[i].join('_')] = C_p[i];
            U_pC_p[C_p[i].join('_')] = C_p[i];
            L_pC_p[C_p[i].join('_')] = C_p[i];
        }
        //console.log("segmentset.length: "+segmentset.length);
        
        // if there's more than one segment at this point, it's an intersection point
        if (segmentset.length > 1) {
            intersections.push({"loc": p, "segments": segmentset.values()});
        }

        var L_pC_p_values = L_pC_p.values(),
        U_pC_p_values = U_pC_p.values();
        sweep_segments.inserting = false;
        for (i=0,len=L_pC_p_values.length; i<len; i++) {
	    //console.log("remove "+L_pC_p_values[i]);
            sweep_segments.remove(L_pC_p_values[i]);
            //console.log(sweep_segments.getKeys());
        }
        sweep_segments.inserting = true;
        for (i=0,len=U_pC_p_values.length; i<len; i++) {

	    //console.log("insert "+U_pC_p_values[i]);
            sweep_segments.insert(U_pC_p_values[i], U_pC_p_values[i]);
            //console.log(sweep_segments.getKeys());
        }

        // if union of U_p and C_p is null
        var lr, s_prime, s_doubleprime, s_l, s_r;
        if (len == 0) {
            // find the left and right neighbors of p in sweep_segments
            if (sweep_segments.getCount() > 1) {
                [s_l, s_r] = sweep_segments.findLRNeighbors(p);
                if (s_l && s_r && s_l.value && s_r.value) {
                    findNewEvent(s_l.value, s_r.value, p);
                }
            }
        } else {
            // find leftmost segment in U_pC_p in sweep_segments, s_prime
            // find that segment's left neighbor, s_l
            var s_prime = sweep_segments.min(sweep_segments.root), s_l = null;
            while (U_pC_p[s_prime.value.join('_')] === undefined) {
                s_l = s_prime;
                s_prime = sweep_segments.successor_(s_prime);
            }
            if (s_l !== null && s_prime !== null) {
                findNewEvent(s_l.value,s_prime.value,p);
            }

            // find rightmost segment in U_pC_p in sweep_segments, s_doubleprime
            // find that segment's right neighbor, s_r
            var s_doubleprime = sweep_segments.max(sweep_segments.root), s_r = null;
            while (U_pC_p[s_doubleprime.value.join('_')] === undefined) {
                s_r = s_doubleprime;
                s_doubleprime = sweep_segments.predecessor_(s_doubleprime);
            }
            if (s_doubleprime !== null && s_r !== null) {
                findNewEvent(s_doubleprime.value,s_r.value,p);
            }
        }
    };

    var findNewEvent = function(seg1, seg2, p) {
        var intersectionpoint = findIntersection(seg1, seg2);
        if (intersectionpoint === null) { return null; }
        if ((intersectionpoint[1] > p[1]) || (intersectionpoint[1] === p[1] && intersectionpoint[0] > p[0])) {
            // insert the new point into the event_points queue
            var newevent = event_points.get(intersectionpoint);
            if (newevent === undefined) {
                //console.log("inserting neweventpoint: "+intersectionpoint);
                event_points.insert(intersectionpoint, []);
            }
            return intersectionpoint;
        } else {
            return null; //the point has already been handled
        }
    };

    
    // status structure for segments currently intersecting sweepline
    var sweep_segments = new js_cols.RedBlackMap(function(a, b) {
        // assume a and b are segments [[x1, y1], [x2, y2]]
        // compares the order segments are crossed by the sweep line, sweep_position;
        // returns -1 if a left of b, 1 if a to the right of b
        if (a === b) {
            return 0;
        }

        var a_upper, a_lower, b_upper, b_lower;
        if (comparePoints(a[0], a[1]) <= 0) {
            a_upper = a[0];
            a_lower = a[1];
        } else {
            a_upper = a[1];
            a_lower = a[0];
        }
        if (comparePoints(b[0], b[1]) <= 0) {
            b_upper = b[0];
            b_lower = b[1];
        } else {
            b_upper = b[1];
            b_lower = b[0];
        }

        // handle horizontal lines differently. always put any horizontal line all the way to the right.
        if (a_lower[1] === a_upper[1]) {
            return 1;
        } else if (b_lower[1] === b_upper[1]) {
            return -1;
        }

        var a_sweep_pos = (sweep_position - a_upper[1]) * ((a_lower[0] - a_upper[0])/(a_lower[1] - a_upper[1])) + a_upper[0],
        b_sweep_pos = (sweep_position - b_upper[1]) * ((b_lower[0] - b_upper[0])/(b_lower[1] - b_upper[1])) + b_upper[0];

        // hackish thing to deal with floating point error
        a_sweep_pos = Math.round(1e14*(a_sweep_pos))/1e14;
        b_sweep_pos = Math.round(1e14*(b_sweep_pos))/1e14;

        if (a_sweep_pos < b_sweep_pos) { return -1; }
        else if (a_sweep_pos > b_sweep_pos) { return 1; }
        else {
            // the two segments intersect on the sweepline
            if (((a_lower[0] - a_upper[0])/(a_lower[1] - a_upper[1])) > ((b_lower[0] - b_upper[0])/(b_lower[1] - b_upper[1]))) {
                if (this.inserting === true) { return 1; } else { return -1; }
            } else if (((a_lower[0] - a_upper[0])/(a_lower[1] - a_upper[1])) < ((b_lower[0] - b_upper[0])/(b_lower[1] - b_upper[1]))) {
                if (this.inserting === true) { return -1; } else { return 1; }
            } else {
                // console.log("__________ dumping sweep_segments.compare ___________");
                // console.log(a);
                // console.log(b);
                // console.log(a_sweep_pos);
                // console.log(b_sweep_pos);
                if (comparePoints(a_upper, b_upper) <= 0) { return -1; }
                else { return 1; }
            }
        }
    });
    // a flag determining if points are being inserted or removed.
    // if sweep_segments.inserting == false, we're taking points out of the status structure.
    // this is important to keep track of for event_points where multiple segments intersect, as while removing segments
    // we need to compare them as if the sweepline were epsilon above than the event point
    // and while inserting segments we need to think of the sweepline as epsilon below the event point
    sweep_segments.inserting = true;
    sweep_segments.findSegments = function(point) {
        var self = this;

        // given a point, return segments in the status structure which contain it as an interior point
        // OR which contain it as the lower end point
        var collectSegments = function(node, segment_lep, segments_interior) {
            if (node !== self.sentinel) {
                var pos = leftOrRight(node.value, point);

                // hack to test if it's "close enough" to 0
                if (Math.round(1e14*pos)/1e14 == 0) {
                    // test if it's the lower end point OR an interior point
                    // and add to the appropriate list
                    var node_lower, node_upper;
                    if (comparePoints(node.value[0], node.value[1]) <= 0) {
                        node_upper = node.value[0]
                        node_lower = node.value[1];
                    } else {
                        node_upper = node.value[1];
                        node_lower = node.value[0];
                    }
                    if (node_lower[0] === point[0] && node_lower[1] === point[1]) {
                        segment_lep.push(node.value);
                    } else if ( ((node_upper[0] <= point[0] && node_lower[0] >= point[0]) ||
                                (node_lower[0] <= point[0] && node_upper[0] >= point[0])) &&
                                ((node_upper[1] <= point[1] && node_lower[1] >= point[1]) ||
                                 (node_lower[1] <= point[1] && node_upper[1] >= point[1])) &&
                                (node_upper != point) ) {
                        segments_interior.push(node.value);
                    } else {
                        // this will sometimes happen if some horizontal segments aren't properly removed
                        // if there are collinear and horizontal points, a segment can get stranded on the right of the status structure such that a point intersects it, but does not intersect it's parent
                        // console.log("_____ dumping _____");
                        // console.log(node.value);
                        // console.log(point);
                        //throw new Error("point should be either interior or end point....");
                    }

                    var leftSegments = collectSegments(node.left, segment_lep, segments_interior);
                    var rightSegments = collectSegments(node.right, [], []);
                    return { "LowerEndPoint": leftSegments.LowerEndPoint.concat(rightSegments.LowerEndPoint), "InteriorPoint": leftSegments.InteriorPoint.concat(rightSegments.InteriorPoint) };
                } else if (pos < 0) {
                    return collectSegments(node.left, segment_lep, segments_interior);
                } else if (pos > 0) {
                    return collectSegments(node.right, segment_lep, segments_interior);
                }
            } else {
                return { "LowerEndPoint": segment_lep, "InteriorPoint": segments_interior };
            }
        };
        return collectSegments(this.root, [], []);
    };
    // given a point, return the two segments which are closest to it on the left and right 
    sweep_segments.findLRNeighbors = function(point) {
        var node = this.root, left, right;

        // traverse down to the leaves
        while (node !== this.sentinel) {
            var pos = leftOrRight(node.value, point);
            if (pos == 0) {
                // console.log("_____ dumping _______");
                // console.log(sweep_segments.getKeys());
                throw new Error("findLRNeighbors should never get called when the point is actually on a line in the status structure!");
            } else {
                if (pos < 0) {
                    if (node.left === this.sentinel) {
                        right = node;
                        left = this.successor_(right);
                    }
                    node = node.left;
                } else {
                    if (node.right === this.sentinel) {
                        left = node;
                        right = this.predecessor_(left);
                    }
                    node = node.right;
                }
            }
        }
        return [left, right];
    };


    var intersections = [];
    var sweep_position;

    // event queue of event points
    var event_points = new js_cols.RedBlackMap(comparePoints);

    // insert the end points of each segment into event_points
    var upper, lower,
    upperval, lowerval;
    for (var i=0,len=segments.length; i<len; i++) {
        if (comparePoints(segments[i][0], segments[i][1]) <= 0) {
            upper = segments[i][0];
            lower = segments[i][1];
        } else {
            upper = segments[i][1];
            lower = segments[i][0];
        }

        upperval = event_points.get(upper);
        if (upperval !== undefined) {
            //make each segment unique.... needed so that putting in multiple identical segments will be different in WSJNG.Dictionary
            segments[i].push(i);
            upperval.push(segments[i]);
            event_points.insert(upper, upperval);
        } else {
            event_points.insert(upper, [segments[i]]);
        }
        lowerval = event_points.get(lower);
        if (lowerval === undefined) {
            event_points.insert(lower, []);
        } //else, lowerval is already in the event queue and nothing needs to be done
    }

    var eventpoint;
    while (event_points.getCount() > 0) {
        eventpoint = event_points.popMin();
        sweep_position = eventpoint.key[1]; //setting a global
        handleEventPoint(eventpoint);
    }

    return intersections;
};


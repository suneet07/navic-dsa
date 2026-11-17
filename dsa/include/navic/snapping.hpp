// Maps arbitrary lat/lon points onto graph nodes.
#pragma once

#include "navic/graph.hpp"

namespace navic {

struct Snap {
    NodeId node = 0;
    double distance = 0.0; // metres between the requested point and the node
};

struct SnapPair {
    Snap source;
    Snap destination;
};

// Finds the nearest source/destination nodes, preferring a pair that lies on
// the same connected component (so isolated parking loops are not chosen).
// Linear scan: O(V) per request.
SnapPair snap_pair(const Graph& graph, Point source, Point destination, Mode mode, double limit_m);

} // namespace navic

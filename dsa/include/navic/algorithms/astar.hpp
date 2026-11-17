#pragma once

#include "navic/search_result.hpp"

namespace navic {

// A* search: Dijkstra ordered by f(n) = g(n) + h(n), where h is the
// great-circle (haversine) distance to the target. h never overestimates
// road distance, so the result is still optimal while far fewer nodes are expanded.
SearchResult astar(const Graph& graph, NodeId source, NodeId target, Mode mode);

} // namespace navic

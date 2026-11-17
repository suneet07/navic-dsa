#pragma once

#include "navic/search_result.hpp"

namespace navic {

// Depth-First Search (iterative, explicit stack — recursion would overflow on
// a 300k-node graph). Neighbours are pushed so the one geographically closest
// to the target is explored first, which keeps the path from wandering across
// the whole city. DFS finds *a* path, not the shortest one. Time O(V + E).
SearchResult dfs(const Graph& graph, NodeId source, NodeId target, Mode mode);

} // namespace navic

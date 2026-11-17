#include "navic/search_result.hpp"

#include <algorithm>

namespace navic {

void measure_path(const Graph& graph, Mode mode, SearchResult& result) {
    result.distance = 0;
    result.duration = 0;
    for (EdgeId id : result.edges) {
        result.distance += graph.edges[id].length;
        result.duration += graph.edges[id].seconds[mode_index(mode)];
    }
}

bool reconstruct_path(const Graph& graph, NodeId source, NodeId target,
                      const std::vector<EdgeId>& parent_edge, Mode mode, SearchResult& result) {
    result.edges.clear();
    for (NodeId node = target; node != source;) {
        const EdgeId id = parent_edge[node];
        if (id == kNone) return false;
        result.edges.push_back(id);
        node = graph.edges[id].from;
        if (result.edges.size() > graph.nodes.size()) return false; // cycle guard
    }
    std::reverse(result.edges.begin(), result.edges.end());
    measure_path(graph, mode, result);
    return true;
}

} // namespace navic

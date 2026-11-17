#include "navic/algorithms/bfs.hpp"

#include <queue>

namespace navic {

SearchResult bfs(const Graph& graph, NodeId source, NodeId target, Mode mode) {
    Stopwatch timer;
    SearchResult result;

    std::vector<bool> seen(graph.nodes.size(), false);
    std::vector<EdgeId> parent_edge(graph.nodes.size(), kNone);
    std::queue<NodeId> frontier;

    seen[source] = true;
    frontier.push(source);

    while (!frontier.empty()) {
        const NodeId u = frontier.front();
        frontier.pop();

        ++result.visited;
        result.visit_order.push_back(u);
        if (u == target) { result.found = true; break; }

        for (EdgeId id : graph.nodes[u].outgoing) {
            if (!graph.edge_allows(id, mode)) continue;
            const NodeId v = graph.edges[id].to;
            ++result.relaxations;
            if (seen[v]) continue;
            seen[v] = true; // mark on enqueue so each node enters the queue once
            parent_edge[v] = id;
            frontier.push(v);
        }
    }

    if (result.found) reconstruct_path(graph, source, target, parent_edge, mode, result);
    result.note = "Fewest road segments (" + std::to_string(result.edges.size()) +
                  " hops); edge lengths are ignored, so distance may be longer than optimal.";
    result.search_ms = timer.elapsed_ms();
    return result;
}

} // namespace navic

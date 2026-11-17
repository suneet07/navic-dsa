#include "navic/algorithms/dijkstra.hpp"

#include <functional>
#include <queue>
#include <utility>

namespace navic {

SearchResult dijkstra(const Graph& graph, NodeId source, NodeId target, Mode mode) {
    Stopwatch timer;
    SearchResult result;

    std::vector<double> dist(graph.nodes.size(), kInfinity);
    std::vector<EdgeId> parent_edge(graph.nodes.size(), kNone);

    // (distance, node) — std::greater turns priority_queue into a min-heap.
    using Item = std::pair<double, NodeId>;
    std::priority_queue<Item, std::vector<Item>, std::greater<Item>> heap;

    dist[source] = 0;
    heap.push({0.0, source});

    while (!heap.empty()) {
        const Item top = heap.top();
        heap.pop();
        const double d = top.first;
        const NodeId u = top.second;
        if (d > dist[u]) continue; // stale entry, a shorter one was already processed

        ++result.visited;
        result.visit_order.push_back(u);
        if (u == target) { result.found = true; break; }

        for (EdgeId id : graph.nodes[u].outgoing) {
            if (!graph.edge_allows(id, mode)) continue;
            const Edge& e = graph.edges[id];
            ++result.relaxations;
            const double candidate = d + e.length;
            if (candidate < dist[e.to]) {
                dist[e.to] = candidate;
                parent_edge[e.to] = id;
                heap.push({candidate, e.to});
            }
        }
    }

    if (result.found) reconstruct_path(graph, source, target, parent_edge, mode, result);
    result.note = "Optimal: guarantees the shortest road distance.";
    result.search_ms = timer.elapsed_ms();
    return result;
}

} // namespace navic

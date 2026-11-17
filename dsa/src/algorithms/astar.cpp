#include "navic/algorithms/astar.hpp"

#include <queue>

namespace navic {

namespace {
struct OpenEntry {
    double f;     // g + h, the heap priority
    double g;     // exact distance from the source
    NodeId node;
};
struct ByLowestF {
    bool operator()(const OpenEntry& a, const OpenEntry& b) const {
        if (a.f != b.f) return a.f > b.f;
        return a.node > b.node; // deterministic tie-break
    }
};
} // namespace

SearchResult astar(const Graph& graph, NodeId source, NodeId target, Mode mode) {
    Stopwatch timer;
    SearchResult result;

    const Point goal = graph.nodes[target].point;
    auto heuristic = [&](NodeId n) { return haversine(graph.nodes[n].point, goal); };

    std::vector<double> g_score(graph.nodes.size(), kInfinity);
    std::vector<EdgeId> parent_edge(graph.nodes.size(), kNone);
    std::priority_queue<OpenEntry, std::vector<OpenEntry>, ByLowestF> open;

    g_score[source] = 0;
    open.push({heuristic(source), 0.0, source});

    while (!open.empty()) {
        const OpenEntry current = open.top();
        open.pop();
        if (current.g > g_score[current.node]) continue; // stale

        ++result.visited;
        result.visit_order.push_back(current.node);
        if (current.node == target) { result.found = true; break; }

        for (EdgeId id : graph.nodes[current.node].outgoing) {
            if (!graph.edge_allows(id, mode)) continue;
            const Edge& e = graph.edges[id];
            ++result.relaxations;
            const double tentative = current.g + e.length;
            if (tentative < g_score[e.to]) {
                g_score[e.to] = tentative;
                parent_edge[e.to] = id;
                open.push({tentative + heuristic(e.to), tentative, e.to});
            }
        }
    }

    if (result.found) reconstruct_path(graph, source, target, parent_edge, mode, result);
    result.note = "Optimal: haversine heuristic is admissible, so A* matches Dijkstra's distance.";
    result.search_ms = timer.elapsed_ms();
    return result;
}

} // namespace navic

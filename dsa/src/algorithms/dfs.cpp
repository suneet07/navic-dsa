#include "navic/algorithms/dfs.hpp"

#include <algorithm>
#include <stack>
#include <utility>

namespace navic {

SearchResult dfs(const Graph& graph, NodeId source, NodeId target, Mode mode) {
    Stopwatch timer;
    SearchResult result;

    const Point goal = graph.nodes[target].point;
    std::vector<bool> visited(graph.nodes.size(), false);
    std::vector<EdgeId> parent_edge(graph.nodes.size(), kNone);

    // Each stack frame: (node, edge used to reach it).
    std::stack<std::pair<NodeId, EdgeId>> stack;
    stack.push({source, kNone});

    std::vector<std::pair<double, EdgeId>> neighbours;
    while (!stack.empty()) {
        const std::pair<NodeId, EdgeId> top = stack.top();
        stack.pop();
        const NodeId u = top.first;
        if (visited[u]) continue;
        visited[u] = true;
        parent_edge[u] = top.second;

        ++result.visited;
        result.visit_order.push_back(u);
        if (u == target) { result.found = true; break; }

        neighbours.clear();
        for (EdgeId id : graph.nodes[u].outgoing) {
            if (!graph.edge_allows(id, mode)) continue;
            ++result.relaxations;
            const NodeId v = graph.edges[id].to;
            if (!visited[v]) neighbours.push_back({haversine(graph.nodes[v].point, goal), id});
        }
        // Push farthest first so the closest neighbour sits on top of the stack.
        std::sort(neighbours.begin(), neighbours.end(),
                  [](const std::pair<double, EdgeId>& a, const std::pair<double, EdgeId>& b) { return a.first > b.first; });
        for (const auto& item : neighbours) stack.push({graph.edges[item.second].to, item.second});
    }

    if (result.found) reconstruct_path(graph, source, target, parent_edge, mode, result);
    result.note = "Finds a valid path, not the shortest: DFS commits to one branch until it dead-ends.";
    result.search_ms = timer.elapsed_ms();
    return result;
}

} // namespace navic

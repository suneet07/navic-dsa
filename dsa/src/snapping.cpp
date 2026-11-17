#include "navic/snapping.hpp"
#include "navic/search_result.hpp"

#include <unordered_map>

namespace navic {

SnapPair snap_pair(const Graph& graph, Point source, Point destination, Mode mode, double limit_m) {
    const auto& component = graph.components[mode_index(mode)];
    const int bit = mode_bit(mode);

    Snap nearest_source{0, kInfinity};
    Snap nearest_destination{0, kInfinity};
    // Best candidate per component, within the snapping limit.
    std::unordered_map<NodeId, Snap> sources, destinations;

    for (NodeId i = 0; i < graph.nodes.size(); ++i) {
        const Node& node = graph.nodes[i];
        if (node.out_modes & bit) {
            const double d = haversine(source, node.point);
            if (d < nearest_source.distance) nearest_source = {i, d};
            if (d <= limit_m) {
                auto found = sources.find(component[i]);
                if (found == sources.end() || d < found->second.distance) sources[component[i]] = {i, d};
            }
        }
        if (node.in_modes & bit) {
            const double d = haversine(destination, node.point);
            if (d < nearest_destination.distance) nearest_destination = {i, d};
            if (d <= limit_m) {
                auto found = destinations.find(component[i]);
                if (found == destinations.end() || d < found->second.distance) destinations[component[i]] = {i, d};
            }
        }
    }

    SnapPair result{nearest_source, nearest_destination};
    double best_gap = kInfinity;
    for (const auto& candidate : sources) {
        const auto other = destinations.find(candidate.first);
        if (other == destinations.end()) continue;
        const double gap = candidate.second.distance + other->second.distance;
        if (gap < best_gap) {
            best_gap = gap;
            result.source = candidate.second;
            result.destination = other->second;
        }
    }
    return result;
}

} // namespace navic

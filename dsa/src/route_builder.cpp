#include "navic/route_builder.hpp"

#include <cmath>

namespace navic {

namespace {

void write_coordinate(JsonWriter& json, Point p) {
    json.begin_array().value(p.lon).value(p.lat).end_array();
}

std::string maneuver_for(std::size_t index, double change) {
    if (index == 0) return "depart";
    if (std::abs(change) > 150) return "uturn";
    if (change > 35) return "right";
    if (change < -35) return "left";
    return "continue";
}

std::string instruction_for(const std::string& maneuver, const std::string& road) {
    if (maneuver == "depart") return "Head onto " + road;
    if (maneuver == "uturn") return "Make a U-turn onto " + road;
    if (maneuver == "right") return "Turn right onto " + road;
    if (maneuver == "left") return "Turn left onto " + road;
    return "Continue on " + road;
}

struct Step {
    std::string maneuver, road;
    double distance = 0, duration = 0;
    Point at;
};

std::vector<Step> build_steps(const Graph& graph, const SearchResult& result, Mode mode) {
    std::vector<Step> steps;
    double previous_bearing = 0;
    std::string previous_name;
    for (std::size_t i = 0; i < result.edges.size(); ++i) {
        const Edge& edge = graph.edges[result.edges[i]];
        const std::string& name = graph.names[edge.name];
        const double heading = bearing(graph.nodes[edge.from].point, graph.nodes[edge.to].point);
        const double change = std::remainder(heading - previous_bearing, 360.0);
        if (i == 0 || name != previous_name || std::abs(change) > 35) {
            Step step;
            step.maneuver = maneuver_for(i, change);
            step.road = name;
            step.at = graph.nodes[edge.from].point;
            steps.push_back(step);
        }
        steps.back().distance += edge.length;
        steps.back().duration += edge.seconds[mode_index(mode)];
        previous_bearing = heading;
        previous_name = name;
    }
    return steps;
}

void write_snap(JsonWriter& json, const Graph& graph, const Snap& snap) {
    const Node& node = graph.nodes[snap.node];
    json.begin_object()
        .field("lat", node.point.lat)
        .field("lon", node.point.lon)
        .field("osm_id", static_cast<long long>(node.osm_id))
        .field("distance_m", snap.distance)
        .end_object();
}

} // namespace

void write_route(JsonWriter& json, const RouteContext& context, const std::string& algorithm,
                 const SearchResult& result, bool include_steps) {
    const Graph& graph = context.graph;
    const NodeId start = context.snap.source.node;

    json.begin_object();
    json.field("algorithm", algorithm);
    json.field("found", result.found);
    json.field("distance_m", result.distance);
    json.field("duration_s", result.duration);
    json.field("hops", result.edges.size());
    json.field("visited_nodes", result.visited);
    json.field("relaxations", result.relaxations);
    json.field("search_ms", result.search_ms);
    json.field("note", result.note);

    // GeoJSON LineString (needs >= 2 positions even for a zero-length route).
    json.key("geometry").begin_object().field("type", "LineString").key("coordinates").begin_array();
    write_coordinate(json, graph.nodes[start].point);
    for (EdgeId id : result.edges) write_coordinate(json, graph.nodes[graph.edges[id].to].point);
    if (result.edges.empty()) write_coordinate(json, graph.nodes[start].point);
    json.end_array().end_object();

    if (include_steps) {
        json.key("steps").begin_array();
        for (const Step& step : build_steps(graph, result, context.mode)) {
            json.begin_object()
                .field("maneuver", step.maneuver)
                .field("instruction", instruction_for(step.maneuver, step.road))
                .field("road", step.road)
                .field("distance_m", step.distance)
                .field("duration_s", step.duration);
            json.key("coordinate");
            write_coordinate(json, step.at);
            json.end_object();
        }
        const NodeId end = result.edges.empty() ? start : graph.edges[result.edges.back()].to;
        json.begin_object()
            .field("maneuver", "arrive")
            .field("instruction", "Arrive at the snapped destination")
            .field("road", "")
            .field("distance_m", 0)
            .field("duration_s", 0);
        json.key("coordinate");
        write_coordinate(json, graph.nodes[end].point);
        json.end_object();
        json.end_array();
    }

    // Evenly sampled explored nodes so the UI can show how far each search spread.
    json.key("explored").begin_array();
    const std::size_t total = result.visit_order.size();
    const std::size_t limit = context.explore_limit;
    const std::size_t count = total < limit ? total : limit;
    for (std::size_t k = 0; k < count; ++k)
        write_coordinate(json, graph.nodes[result.visit_order[k * total / count]].point);
    json.end_array();

    json.key("snapped").begin_object();
    json.key("source");
    write_snap(json, graph, context.snap.source);
    json.key("destination");
    write_snap(json, graph, context.snap.destination);
    json.end_object();

    json.end_object();
}

} // namespace navic

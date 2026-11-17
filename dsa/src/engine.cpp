#include "navic/engine.hpp"
#include "navic/json_writer.hpp"
#include "navic/route_builder.hpp"
#include "navic/snapping.hpp"

#include <cmath>
#include <sstream>
#include <utility>

namespace navic {

namespace {

struct RouteRequest {
    Mode mode = Mode::driving;
    Point source, destination;
    std::size_t explore_limit = 0;
};

double read_coordinate(std::istream& in, double bound, const char* what) {
    double value = 0;
    if (!(in >> value) || !std::isfinite(value) || std::abs(value) > bound)
        throw EngineError(422, "INVALID_COORDINATE", std::string("Invalid ") + what);
    return value;
}

RouteRequest read_request(std::istream& in, std::size_t default_explore) {
    RouteRequest request;
    std::string mode;
    in >> mode;
    if (!parse_mode(mode, request.mode))
        throw EngineError(422, "INVALID_MODE", "mode must be driving, walking or cycling");
    request.source.lat = read_coordinate(in, 90, "source latitude");
    request.source.lon = read_coordinate(in, 180, "source longitude");
    request.destination.lat = read_coordinate(in, 90, "destination latitude");
    request.destination.lon = read_coordinate(in, 180, "destination longitude");
    long long explore = static_cast<long long>(default_explore);
    if (in >> explore) {
        if (explore < 0 || explore > 20000) throw EngineError(422, "INVALID_EXPLORE", "explore_limit must be 0..20000");
    }
    request.explore_limit = static_cast<std::size_t>(explore);
    return request;
}

SnapPair snap_or_throw(const Graph& graph, const RouteRequest& request, double limit) {
    if (!graph.bbox.contains(request.source) || !graph.bbox.contains(request.destination))
        throw EngineError(422, "OUTSIDE_COVERAGE", "Both points must be inside the bundled Delhi road graph");
    SnapPair snap = snap_pair(graph, request.source, request.destination, request.mode, limit);
    if (haversine(request.source, request.destination) < 0.001) snap.destination = snap.source;
    if (snap.source.distance > limit || snap.destination.distance > limit)
        throw EngineError(422, "SNAP_TOO_FAR", "No usable road node within 800 m; choose a point closer to a road");
    return snap;
}

std::string ok(const std::string& id, const std::string& result_json) {
    return "{\"id\":" + id + ",\"ok\":true,\"result\":" + result_json + "}";
}

std::string fail(const std::string& id, int status, const std::string& code, const std::string& message) {
    JsonWriter json;
    json.begin_object().field("status", status).field("code", code).field("message", message).end_object();
    return "{\"id\":" + id + ",\"ok\":false,\"error\":" + json.str() + "}";
}

bool is_number(const std::string& text) {
    if (text.empty() || text.size() > 18) return false;
    for (char c : text) if (c < '0' || c > '9') return false;
    return true;
}

} // namespace

Engine::Engine(Graph graph, EngineOptions options) : graph_(std::move(graph)), options_(options) {}

std::string Engine::handle(const std::string& line) {
    std::istringstream in(line);
    std::string id, command;
    in >> id >> command;
    if (!is_number(id)) return fail("0", 400, "BAD_REQUEST", "Request must start with a numeric id");
    try {
        if (command == "ping") return ok(id, "\"pong\"");
        if (command == "info") return ok(id, info());
        if (command == "route") return ok(id, route(in));
        if (command == "compare") return ok(id, compare(in));
        return fail(id, 400, "UNKNOWN_COMMAND", "Unknown engine command: " + command);
    } catch (const EngineError& error) {
        return fail(id, error.status, error.code, error.what());
    } catch (const std::bad_alloc&) {
        return fail(id, 507, "OUT_OF_MEMORY", "The engine ran out of memory for this request");
    } catch (const std::exception& error) {
        return fail(id, 500, "ENGINE_ERROR", error.what());
    }
}

std::string Engine::info() const {
    JsonWriter json;
    json.begin_object()
        .field("nodes", graph_.nodes.size())
        .field("edges", graph_.edges.size())
        .field("floyd_max_nodes", options_.run.floyd.max_nodes);
    json.key("bbox").begin_array()
        .value(graph_.bbox.south).value(graph_.bbox.west).value(graph_.bbox.north).value(graph_.bbox.east)
        .end_array();
    json.key("algorithms").begin_array();
    for (Algorithm a : all_algorithms()) json.value(algorithm_name(a));
    json.end_array();
    json.end_object();
    return json.str();
}

std::string Engine::route(std::istream& args) {
    std::string algorithm_text;
    args >> algorithm_text;
    Algorithm algorithm;
    if (!parse_algorithm(algorithm_text, algorithm))
        throw EngineError(422, "INVALID_ALGORITHM", "algorithm must be dijkstra, astar, bfs, dfs or floyd");

    const RouteRequest request = read_request(args, options_.default_explore_limit);
    const SnapPair snap = snap_or_throw(graph_, request, options_.snap_limit_m);
    const SearchResult result =
        run_algorithm(algorithm, graph_, snap.source.node, snap.destination.node, request.mode, options_.run);

    if (!result.found) {
        if (algorithm == Algorithm::floyd_warshall)
            throw EngineError(422, "FLOYD_CORRIDOR_TOO_SMALL",
                              "Floyd–Warshall is O(V^3), so it only runs on a corridor of up to " +
                                  std::to_string(options_.run.floyd.max_nodes) +
                                  " road nodes. Choose two points closer together (roughly 3 km or less) or use Dijkstra/A*.");
        throw EngineError(404, "NO_ROUTE", "No route connects these road nodes for the selected mode");
    }

    JsonWriter json;
    RouteContext context{graph_, request.mode, snap, request.explore_limit};
    write_route(json, context, algorithm_name(algorithm), result, true);
    return json.str();
}

std::string Engine::compare(std::istream& args) {
    const RouteRequest request = read_request(args, 600);
    const SnapPair snap = snap_or_throw(graph_, request, options_.snap_limit_m);
    RouteContext context{graph_, request.mode, snap, request.explore_limit};

    JsonWriter json;
    json.begin_object().key("results").begin_array();
    for (Algorithm algorithm : all_algorithms()) {
        const SearchResult result =
            run_algorithm(algorithm, graph_, snap.source.node, snap.destination.node, request.mode, options_.run);
        write_route(json, context, algorithm_name(algorithm), result, false);
    }
    json.end_array().end_object();
    return json.str();
}

} // namespace navic

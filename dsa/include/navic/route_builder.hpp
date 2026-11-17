// Turns a SearchResult into the JSON route object the frontend renders:
// GeoJSON geometry, turn-by-turn steps and search statistics.
#pragma once

#include "navic/json_writer.hpp"
#include "navic/search_result.hpp"
#include "navic/snapping.hpp"

namespace navic {

struct RouteContext {
    const Graph& graph;
    Mode mode;
    SnapPair snap;
    std::size_t explore_limit; // max explored points returned for the map overlay
};

void write_route(JsonWriter& json, const RouteContext& context, const std::string& algorithm,
                 const SearchResult& result, bool include_steps);

} // namespace navic

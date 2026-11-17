#include "navic/geo.hpp"

#include <algorithm>
#include <cmath>

namespace navic {

double radians(double degrees) { return degrees * kPi / 180.0; }

double haversine(Point a, Point b) {
    const double dlat = radians(b.lat - a.lat);
    const double dlon = radians(b.lon - a.lon);
    const double h = std::pow(std::sin(dlat / 2), 2) +
                     std::cos(radians(a.lat)) * std::cos(radians(b.lat)) * std::pow(std::sin(dlon / 2), 2);
    const double clamped = std::min(1.0, std::max(0.0, h));
    return 2 * kEarthRadiusMeters * std::asin(std::sqrt(clamped));
}

double bearing(Point a, Point b) {
    const double dlon = radians(b.lon - a.lon);
    const double y = std::sin(dlon) * std::cos(radians(b.lat));
    const double x = std::cos(radians(a.lat)) * std::sin(radians(b.lat)) -
                     std::sin(radians(a.lat)) * std::cos(radians(b.lat)) * std::cos(dlon);
    return std::atan2(y, x) * 180.0 / kPi;
}

} // namespace navic

// Geographic helpers shared by every algorithm.
#pragma once

namespace navic {

struct Point {
    double lat = 0.0;
    double lon = 0.0;
};

constexpr double kEarthRadiusMeters = 6371008.8;
constexpr double kPi = 3.14159265358979323846;

double radians(double degrees);

// Great-circle distance in metres. Used as A*'s admissible heuristic.
double haversine(Point a, Point b);

// Initial compass bearing from a to b in degrees (-180..180].
double bearing(Point a, Point b);

} // namespace navic

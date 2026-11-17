// Tiny streaming JSON writer — avoids pulling a JSON library into the engine.
#pragma once

#include <sstream>
#include <string>
#include <vector>

namespace navic {

class JsonWriter {
public:
    JsonWriter& begin_object();
    JsonWriter& end_object();
    JsonWriter& begin_array();
    JsonWriter& end_array();
    JsonWriter& key(const std::string& name);

    JsonWriter& value(const std::string& text);
    JsonWriter& value(const char* text);
    JsonWriter& value(double number);
    JsonWriter& value(long long number);
    JsonWriter& value(std::size_t number);
    JsonWriter& value(int number);
    JsonWriter& value(bool flag);
    JsonWriter& null();
    JsonWriter& raw(const std::string& json); // pre-serialised JSON fragment

    // Convenience: key + value in one call.
    template <typename T>
    JsonWriter& field(const std::string& name, const T& v) { key(name); return value(v); }

    std::string str() const { return out_.str(); }

private:
    void separator();
    static std::string escape(const std::string& text);

    std::ostringstream out_;
    std::vector<bool> first_; // per nesting level: is the next item the first one?
    bool after_key_ = false;
};

} // namespace navic

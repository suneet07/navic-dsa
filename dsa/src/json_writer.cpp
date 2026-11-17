#include "navic/json_writer.hpp"

#include <cmath>
#include <cstdio>
#include <iomanip>

namespace navic {

void JsonWriter::separator() {
    if (after_key_) { after_key_ = false; return; }
    if (!first_.empty()) {
        if (!first_.back()) out_ << ',';
        first_.back() = false;
    }
}

JsonWriter& JsonWriter::begin_object() { separator(); out_ << '{'; first_.push_back(true); return *this; }
JsonWriter& JsonWriter::end_object() { out_ << '}'; first_.pop_back(); return *this; }
JsonWriter& JsonWriter::begin_array() { separator(); out_ << '['; first_.push_back(true); return *this; }
JsonWriter& JsonWriter::end_array() { out_ << ']'; first_.pop_back(); return *this; }

JsonWriter& JsonWriter::key(const std::string& name) {
    separator();
    out_ << '"' << escape(name) << "\":";
    after_key_ = true;
    return *this;
}

JsonWriter& JsonWriter::value(const std::string& text) { separator(); out_ << '"' << escape(text) << '"'; return *this; }
JsonWriter& JsonWriter::value(const char* text) { return value(std::string(text)); }
JsonWriter& JsonWriter::value(long long number) { separator(); out_ << number; return *this; }
JsonWriter& JsonWriter::value(std::size_t number) { separator(); out_ << number; return *this; }
JsonWriter& JsonWriter::value(int number) { separator(); out_ << number; return *this; }
JsonWriter& JsonWriter::value(bool flag) { separator(); out_ << (flag ? "true" : "false"); return *this; }
JsonWriter& JsonWriter::null() { separator(); out_ << "null"; return *this; }
JsonWriter& JsonWriter::raw(const std::string& json) { separator(); out_ << json; return *this; }

JsonWriter& JsonWriter::value(double number) {
    separator();
    if (!std::isfinite(number)) { out_ << "null"; return *this; }
    char buffer[32];
    std::snprintf(buffer, sizeof buffer, "%.7g", number);
    out_ << buffer;
    return *this;
}

std::string JsonWriter::escape(const std::string& text) {
    std::string result;
    result.reserve(text.size() + 2);
    for (unsigned char ch : text) {
        switch (ch) {
            case '"': result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:
                if (ch < 0x20) {
                    char buffer[8];
                    std::snprintf(buffer, sizeof buffer, "\\u%04x", ch);
                    result += buffer;
                } else {
                    result += static_cast<char>(ch); // UTF-8 bytes pass through unchanged
                }
        }
    }
    return result;
}

} // namespace navic

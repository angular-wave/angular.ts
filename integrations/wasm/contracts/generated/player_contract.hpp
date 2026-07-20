// Generated from the Player AngularTS Wasm contract for C++. Do not edit.
#pragma once

#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

namespace angular_ts::contracts::Player {
  inline constexpr std::string_view PositionXPath = "position.x";
  using PositionXValue = double;
  inline constexpr std::string_view PositionYPath = "position.y";
  using PositionYValue = double;
  inline constexpr std::string_view HealthPath = "health";
  using HealthValue = std::uint32_t;
  inline constexpr std::string_view NamePath = "name";
  using NameValue = std::string;
  inline constexpr std::string_view FramePath = "frame";
  using FrameValue = std::vector<std::uint8_t>;
}

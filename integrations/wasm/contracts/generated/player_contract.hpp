// Generated from the Player AngularTS Wasm contract for C++. Do not edit.
#pragma once

#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

/// Reactive player state shared between AngularTS and WebAssembly runtimes.
namespace angular_ts::contracts::Player {
  /// Horizontal world position.
  inline constexpr std::string_view PositionXPath = "position.x";
  using PositionXValue = double;
  /// Vertical world position.
  inline constexpr std::string_view PositionYPath = "position.y";
  using PositionYValue = double;
  /// Current player health.
  inline constexpr std::string_view HealthPath = "health";
  using HealthValue = std::uint32_t;
  /// Player display name.
  inline constexpr std::string_view NamePath = "name";
  using NameValue = std::string;
  /// Optional binary frame payload.
  inline constexpr std::string_view FramePath = "frame";
  using FrameValue = std::vector<std::uint8_t>;
}

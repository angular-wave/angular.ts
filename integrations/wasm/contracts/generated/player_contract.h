// Generated from the Player AngularTS Wasm contract for C. Do not edit.
#ifndef PLAYER_CONTRACT_H
#define PLAYER_CONTRACT_H

#include "angular_ts_wasm.h"

/** @file
 * Reactive player state shared between AngularTS and WebAssembly runtimes.
 */

/** Horizontal world position. */
static const ng_f64_field_t PLAYER_POSITION_X = NG_F64_FIELD("position.x");

/** Vertical world position. */
static const ng_f64_field_t PLAYER_POSITION_Y = NG_F64_FIELD("position.y");

/** Current player health. */
static const ng_u32_field_t PLAYER_HEALTH = NG_U32_FIELD("health");

/** Player display name. */
static const ng_string_field_t PLAYER_NAME = NG_STRING_FIELD("name");

/** Optional binary frame payload. */
static const ng_binary_field_t PLAYER_FRAME = NG_OPTIONAL_BINARY_FIELD("frame");

#endif

package angular.ts

import scala.scalajs.js

class GeolocationSuite extends munit.FunSuite:
  test("geolocation values expose nullable coordinates"):
    val value = js.Dynamic
      .literal(
        latitude = 56.9496,
        longitude = 24.1052,
        accuracy = 4.5,
        altitude = null,
        altitudeAccuracy = 8,
        heading = 90,
        speed = null,
        timestamp = 1788192000000.0,
      )
      .asInstanceOf[GeolocationValue]

    assertEquals(value.latitude, 56.9496)
    assertEquals(value.altitude, null)
    assertEquals(value.altitudeAccuracy, 8.0)

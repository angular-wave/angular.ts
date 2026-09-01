package angular.ts

import scala.scalajs.js

/** Plain location snapshot written by the AngularTS `geolocation` directive. */
@js.native
trait GeolocationValue extends js.Object:
  val latitude: Double = js.native
  val longitude: Double = js.native
  val accuracy: Double = js.native
  val altitude: Double | Null = js.native
  val altitudeAccuracy: Double | Null = js.native
  val heading: Double | Null = js.native
  val speed: Double | Null = js.native
  val timestamp: Double = js.native

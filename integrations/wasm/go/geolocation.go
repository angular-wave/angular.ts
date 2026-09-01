package angularwasm

// GeolocationValue is the serializable snapshot written by the AngularTS
// geolocation directive.
type GeolocationValue struct {
	Latitude         float64  `json:"latitude"`
	Longitude        float64  `json:"longitude"`
	Accuracy         float64  `json:"accuracy"`
	Altitude         *float64 `json:"altitude"`
	AltitudeAccuracy *float64 `json:"altitudeAccuracy"`
	Heading          *float64 `json:"heading"`
	Speed            *float64 `json:"speed"`
	Timestamp        float64  `json:"timestamp"`
}

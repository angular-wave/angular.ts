package angularwasm

import (
	"encoding/json"
	"testing"
)

func TestGeolocationValueDecodesNullableCoordinates(t *testing.T) {
	var value GeolocationValue
	err := json.Unmarshal([]byte(`{
		"latitude":56.9496,
		"longitude":24.1052,
		"accuracy":4.5,
		"altitude":null,
		"altitudeAccuracy":8,
		"heading":90,
		"speed":null,
		"timestamp":1788192000000
	}`), &value)
	if err != nil {
		t.Fatal(err)
	}

	if value.Latitude != 56.9496 || value.Altitude != nil {
		t.Fatalf("unexpected geolocation value: %#v", value)
	}
	if value.AltitudeAccuracy == nil || *value.AltitudeAccuracy != 8 {
		t.Fatalf("unexpected altitude accuracy: %#v", value.AltitudeAccuracy)
	}
}

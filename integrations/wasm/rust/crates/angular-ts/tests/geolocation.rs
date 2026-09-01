use angular_ts::GeolocationValue;

#[test]
fn geolocation_value_preserves_nullable_coordinates() {
    let value = GeolocationValue {
        latitude: 56.9496,
        longitude: 24.1052,
        accuracy: 4.5,
        altitude: None,
        altitude_accuracy: Some(8.0),
        heading: Some(90.0),
        speed: None,
        timestamp: 1_788_192_000_000.0,
    };

    assert_eq!(value.latitude, 56.9496);
    assert_eq!(value.altitude, None);
    assert_eq!(value.altitude_accuracy, Some(8.0));
}

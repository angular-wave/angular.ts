/// Serializable location snapshot written by the AngularTS `geolocation`
/// directive.
#[derive(Debug, Clone, Copy, PartialEq)]
#[cfg_attr(target_arch = "wasm32", derive(serde::Deserialize, serde::Serialize))]
#[cfg_attr(target_arch = "wasm32", serde(rename_all = "camelCase"))]
pub struct GeolocationValue {
    pub latitude: f64,
    pub longitude: f64,
    pub accuracy: f64,
    pub altitude: Option<f64>,
    pub altitude_accuracy: Option<f64>,
    pub heading: Option<f64>,
    pub speed: Option<f64>,
    pub timestamp: f64,
}

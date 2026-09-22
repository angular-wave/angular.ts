use angular_ts::{native_capabilities, NativeCapabilityName, NATIVE_CAPABILITIES};
use std::collections::BTreeSet;

#[test]
fn generated_native_capabilities_are_unique_and_typed() {
    let names = NATIVE_CAPABILITIES
        .iter()
        .map(|capability| capability.name)
        .collect::<BTreeSet<_>>();

    assert_eq!(names.len(), NATIVE_CAPABILITIES.len());
    for capability in NATIVE_CAPABILITIES {
        assert_eq!(capability.threading, "main");
        assert_eq!(capability.lifecycle, "destination");
        assert_eq!(capability.error_protocol, "native-bridge-v1");
    }
    assert_eq!(NativeCapabilityName::Connectivity.as_str(), "connectivity");
    assert_eq!(
        native_capabilities::connectivity::WATCH,
        NativeCapabilityName::Connectivity.methods()[1]
    );
}

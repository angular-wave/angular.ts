# ServiceLoader instantiates application providers by their metadata names.
-keep,allowoptimization class * implements io.github.angularwave.android.navigation.elements.NativeElementProvider {
    public <init>();
}
-keep,allowoptimization class * implements io.github.angularwave.android.navigation.routing.RouteDecisionHandlerProvider {
    public <init>();
}
-keep,allowoptimization class * implements io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider {
    public <init>();
}

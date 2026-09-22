package io.github.angularwave.android.consumer;

import io.github.angularwave.android.browser.BrowserRouteDecisionHandlerProvider;
import io.github.angularwave.android.core.config.AngularNative;
import io.github.angularwave.android.credentials.CredentialCapabilityProvider;
import io.github.angularwave.android.maps.MapElementProvider;
import io.github.angularwave.android.media.MediaCapabilityProvider;
import io.github.angularwave.android.navigation.bridge.AngularNativeBridge;
import io.github.angularwave.android.navigation.elements.NativeElementCatalog;
import io.github.angularwave.android.paging.NativePagingAdapter;
import io.github.angularwave.android.sample.elements.TaskCardProvider;

/** Compile-time proof that every published artifact exposes its public API transitively. */
public final class MavenArtifactContract {
  private MavenArtifactContract() {}

  public static final Class<?>[] PUBLIC_TYPES = {
    AngularNative.class,
    AngularNativeBridge.class,
    NativeElementCatalog.class,
    BrowserRouteDecisionHandlerProvider.class,
    CredentialCapabilityProvider.class,
    MapElementProvider.class,
    MediaCapabilityProvider.class,
    NativePagingAdapter.class,
    TaskCardProvider.class
  };
}

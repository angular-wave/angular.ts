package io.github.angularwave.android.consumer;

import static org.junit.Assert.assertTrue;

import androidx.startup.InitializationProvider;
import io.github.angularwave.android.browser.BrowserRouteDecisionHandlerProvider;
import io.github.angularwave.android.credentials.CredentialCapabilityProvider;
import io.github.angularwave.android.maps.MapElementProvider;
import io.github.angularwave.android.media.MediaCapabilityProvider;
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders;
import io.github.angularwave.android.navigation.elements.NativeElementProvider;
import io.github.angularwave.android.sample.elements.TaskCardProvider;
import java.util.ServiceLoader;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 36)
public final class MavenArtifactRuntimeContractTest {
  @Test
  public void optionalArtifactsRegisterTheirProvidersAtApplicationStartup() {
    Robolectric.buildContentProvider(InitializationProvider.class).create().get();

    assertTrue(
        AndroidNativeProviders.capabilityProviders().stream()
            .anyMatch(CredentialCapabilityProvider.class::isInstance));
    assertTrue(
        AndroidNativeProviders.capabilityProviders().stream()
            .anyMatch(MediaCapabilityProvider.class::isInstance));
    assertTrue(
        AndroidNativeProviders.elementProviders().stream()
            .anyMatch(MapElementProvider.class::isInstance));
    assertTrue(
        AndroidNativeProviders.routeDecisionHandlerProviders().stream()
            .anyMatch(BrowserRouteDecisionHandlerProvider.class::isInstance));
    assertTrue(taskCardProviderIsDiscoverable());
  }

  private static boolean taskCardProviderIsDiscoverable() {
    for (NativeElementProvider provider : ServiceLoader.load(NativeElementProvider.class)) {
      if (provider instanceof TaskCardProvider) {
        return true;
      }
    }
    return false;
  }
}

package io.github.angularwave.android.consumer;

import androidx.annotation.NonNull;
import io.github.angularwave.android.navigation.bridge.NativeCapability;
import io.github.angularwave.android.navigation.bridge.NativeCapabilityContext;
import io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider;
import io.github.angularwave.android.navigation.bridge.RegisterNativeCapabilityProvider;
import java.util.Collection;
import java.util.List;

@RegisterNativeCapabilityProvider(targets = {"consumer"})
public final class ConsumerCapabilityProvider implements NativeCapabilityProvider {
  @Override
  @NonNull
  public Collection<NativeCapability> capabilities(@NonNull NativeCapabilityContext context) {
    return List.of();
  }
}

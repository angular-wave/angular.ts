package io.github.angularwave.android.samples.pulse;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Rect;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import io.github.angularwave.android.navigation.activities.AngularNativeHostActivity;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class PulseLaunchTest {
    @Test
    public void nativeShellNavigatesEveryDestinationAndKeepsChromeFixed() throws Exception {
        Context context = ApplicationProvider.getApplicationContext();
        UiDevice device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
        device.wakeUp();
        KeyguardManager keyguard = context.getSystemService(KeyguardManager.class);
        if (keyguard.isKeyguardLocked()) {
            try (ParcelFileDescriptor ignored =
                    InstrumentationRegistry.getInstrumentation()
                            .getUiAutomation()
                            .executeShellCommand("wm dismiss-keyguard")) {
                // Closing the descriptor also releases the command output pipe.
            }
            long unlockDeadline = SystemClock.uptimeMillis() + 5_000;
            while (keyguard.isKeyguardLocked() && SystemClock.uptimeMillis() < unlockDeadline) {
                SystemClock.sleep(100);
            }
        }
        assertFalse(
                "Unlock the physical device before running instrumentation tests",
                keyguard.isKeyguardLocked());
        device.waitForIdle();
        Intent intent =
                context.getPackageManager()
                        .getLaunchIntentForPackage("io.github.angularwave.android.samples.pulse");
        assertTrue("Pulse must expose a launcher activity", intent != null);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        try (ActivityScenario<AngularNativeHostActivity> scenario = ActivityScenario.launch(intent)) {
            scenario.onActivity(
                    activity ->
                            activity.getWindow()
                                    .addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
            assertTrue(
                    "The Pulse native shell did not render after the host loaded",
                    waitForView(scenario, "Pulse") != null);
            View initialNavigation = waitForView(scenario, "Pulse navigation");
            assertTrue("Pulse navigation did not render", initialNavigation != null);
            BottomNavigationView bottomNavigation = (BottomNavigationView) initialNavigation;
            assertEquals("Home", bottomNavigation.getMenu().getItem(0).getTitle().toString());
            assertEquals("Explore", bottomNavigation.getMenu().getItem(1).getTitle().toString());
            clickAndWait(scenario, device, "Home", By.desc("Pulse feed"));
            assertTrue(device.wait(Until.hasObject(By.text("Following")), 20_000));
            assertTrue(
                    "The feed must load before interaction",
                    device.wait(
                            Until.hasObject(
                                    By.desc(
                                            "Temple in Transition, photographed by Maya Chen")),
                            20_000));
            View avatar = waitForView(scenario, "Maya Chen");
            assertTrue("The feed avatar must render natively", avatar != null);
            scenario.onActivity(
                    activity -> {
                        float density = activity.getResources().getDisplayMetrics().density;
                        assertTrue("The feed avatar must be visible", avatar.isShown());
                        assertEquals("The feed avatar must remain square", avatar.getWidth(), avatar.getHeight());
                        assertTrue(
                                "Safe-area insets must not inflate nested feed avatars",
                                avatar.getHeight() <= Math.round(64 * density));
                    });

            UiObject2 appBar = device.findObject(By.desc("Pulse app bar"));
            UiObject2 navigation = device.findObject(By.desc("Pulse navigation"));
            assertTrue("The app bar must be native", appBar != null);
            assertTrue("The bottom navigation must be native", navigation != null);
            Rect appBarBounds = new Rect(appBar.getVisibleBounds());
            Rect navigationBounds = new Rect(navigation.getVisibleBounds());
            AtomicReference<View> appBarView = new AtomicReference<>();
            AtomicReference<View> navigationView = new AtomicReference<>();
            AtomicReference<View> feedView = new AtomicReference<>();
            scenario.onActivity(
                    activity -> {
                        appBarView.set(findView(activity.getWindow().getDecorView(), "Pulse app bar"));
                        navigationView.set(findView(activity.getWindow().getDecorView(), "Pulse navigation"));
                        feedView.set(findView(activity.getWindow().getDecorView(), "Pulse feed"));
                    });

            UiObject2 feed = device.findObject(By.desc("Pulse feed"));
            assertTrue("The feed must be scrollable", feed != null);
            feed.swipe(androidx.test.uiautomator.Direction.UP, 0.8f);
            device.waitForIdle();
            assertTrue("The app bar must remain fixed while content scrolls", appBarBounds.equals(appBar.getVisibleBounds()));
            assertTrue("The navigation must remain fixed while content scrolls", navigationBounds.equals(navigation.getVisibleBounds()));

            clickAndWait(scenario, device, "Explore", By.desc("Explore photos"));
            assertChromeRetained(scenario, appBarView.get(), navigationView.get());
            clickAndWait(scenario, device, "Activity", By.desc("Pulse activity"));
            assertChromeRetained(scenario, appBarView.get(), navigationView.get());
            clickAndWait(scenario, device, "Profile", By.text("@elena"));
            assertChromeRetained(scenario, appBarView.get(), navigationView.get());
            clickAndWait(scenario, device, "Home", By.desc("Pulse feed"));
            assertChromeRetained(scenario, appBarView.get(), navigationView.get());
            scenario.onActivity(
                    activity ->
                            assertSame(
                                    "Feed must be retained between tabs",
                                    feedView.get(),
                                    findView(activity.getWindow().getDecorView(), "Pulse feed")));

            UiObject2 retainedFeed = device.findObject(By.desc("Pulse feed"));
            assertTrue("The retained feed must remain available", retainedFeed != null);
            retainedFeed.swipe(androidx.test.uiautomator.Direction.DOWN, 0.8f);
            UiObject2 postImage =
                    device.wait(
                            Until.findObject(
                                    By.desc(
                                            "Temple in Transition, photographed by Maya Chen")),
                            20_000);
            assertTrue("The feed image must be clickable", postImage != null);
            postImage.click();
            assertTrue(
                    "The post destination did not render",
                    device.wait(Until.hasObject(By.text("Post")), 20_000));

            UiObject2 back = device.wait(Until.findObject(By.text("Back")), 20_000);
            assertTrue("The post destination must expose back navigation", back != null);
            back.click();
            assertTrue(
                    "Back navigation did not restore the feed",
                    device.wait(Until.hasObject(By.desc("Pulse feed")), 20_000));
            scenario.onActivity(
                    activity -> {
                        BottomNavigationView restoredNavigation =
                                (BottomNavigationView)
                                        findView(
                                                activity.getWindow().getDecorView(),
                                                "Pulse navigation");
                        assertEquals(
                                "Back navigation must restore the selected Home tab",
                                "Home",
                                restoredNavigation
                                        .getMenu()
                                        .findItem(restoredNavigation.getSelectedItemId())
                                        .getTitle()
                                        .toString());
                    });
            device.waitForIdle();

            UiObject2 create =
                    device.wait(
                            Until.findObject(By.desc("Create").clickable(true)),
                            20_000);
            assertTrue("The Create navigation item must be accessible", create != null);
            create.click();
            assertTrue(
                    "A physical Create tap did not render its destination",
                    device.wait(Until.hasObject(By.text("Share a moment")), 20_000));
        }
    }

    private static void assertChromeRetained(
            ActivityScenario<AngularNativeHostActivity> scenario,
            View appBar,
            View navigation) {
        scenario.onActivity(
                activity -> {
                    assertSame(
                            "The app bar must be retained between tabs",
                            appBar,
                            findView(activity.getWindow().getDecorView(), "Pulse app bar"));
                    assertSame(
                            "The bottom navigation must be retained between tabs",
                            navigation,
                            findView(activity.getWindow().getDecorView(), "Pulse navigation"));
                });
    }

    private static View findView(View view, String description) {
        if (description.equals(view.getContentDescription())) return view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int index = 0; index < group.getChildCount(); index += 1) {
                View match = findView(group.getChildAt(index), description);
                if (match != null) return match;
            }
        }
        return null;
    }

    private static View waitForView(
            ActivityScenario<AngularNativeHostActivity> scenario, String description) {
        AtomicReference<View> match = new AtomicReference<>();
        long deadline = SystemClock.uptimeMillis() + 20_000;
        do {
            scenario.onActivity(
                    activity ->
                            match.set(
                                    findView(
                                            activity.getWindow().getDecorView(), description)));
            if (match.get() != null) return match.get();
            SystemClock.sleep(100);
        } while (SystemClock.uptimeMillis() < deadline);
        return null;
    }

    private static void clickAndWait(
            ActivityScenario<AngularNativeHostActivity> scenario,
            UiDevice device,
            String label,
            androidx.test.uiautomator.BySelector destination) {
        AtomicReference<Boolean> selected = new AtomicReference<>(false);
        scenario.onActivity(
                activity -> {
                    View view = findView(activity.getWindow().getDecorView(), "Pulse navigation");
                    if (!(view instanceof BottomNavigationView)) return;
                    BottomNavigationView navigation = (BottomNavigationView) view;
                    for (int index = 0; index < navigation.getMenu().size(); index += 1) {
                        android.view.MenuItem item = navigation.getMenu().getItem(index);
                        if (label.contentEquals(item.getTitle())) {
                            selected.set(true);
                            navigation.setSelectedItemId(item.getItemId());
                            return;
                        }
                    }
                });
        assertTrue("Missing navigation item " + label, selected.get());
        assertTrue("Navigation to " + label + " did not render its destination", device.wait(Until.hasObject(destination), 20_000));
        device.waitForIdle();
    }
}

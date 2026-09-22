package io.github.angularwave.android.navigation.transitions

import android.os.Bundle
import android.os.Build
import android.os.SystemClock
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.BackEventCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.commitNow
import androidx.navigation.NavController
import androidx.navigation.createGraph
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.fragment.fragment
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeNavigationInstrumentedTest {
    @Test
    fun restoresTheCurrentDestinationAndBackStackAfterRecreation() {
        ActivityScenario.launch(NativeNavigationTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                activity.navigateToDetail()
            }
            waitForNavigation()
            scenario.onActivity { activity ->
                assertEquals(DETAIL_ROUTE, activity.navController.currentDestination?.route)
            }

            scenario.recreate()
            waitForNavigation()

            scenario.onActivity { activity ->
                assertEquals(DETAIL_ROUTE, activity.navController.currentDestination?.route)
                activity.navController.popBackStack()
                activity.supportFragmentManager.executePendingTransactions()
                assertEquals(ROOT_ROUTE, activity.navController.currentDestination?.route)
            }
        }
    }

    @Test
    fun androidXNavigationHandlesBackAndPredictiveCancellation() {
        ActivityScenario.launch(NativeNavigationTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                activity.navigateToDetail()
            }
            waitForNavigation()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                scenario.onActivity { activity ->
                    val dispatcher = activity.onBackPressedDispatcher

                    dispatcher.dispatchOnBackStarted(backEvent(0f))
                    dispatcher.dispatchOnBackProgressed(backEvent(0.5f))
                    dispatcher.dispatchOnBackCancelled()
                }
                waitForNavigation()
                scenario.onActivity { activity ->
                    assertEquals(DETAIL_ROUTE, activity.navController.currentDestination?.route)
                }
            }

            InstrumentationRegistry
                .getInstrumentation()
                .sendKeyDownUpSync(KeyEvent.KEYCODE_BACK)
            waitForNavigation()
            scenario.onActivity { activity ->
                assertEquals(ROOT_ROUTE, activity.navController.currentDestination?.route)
            }
        }
    }

    private fun backEvent(progress: Float): BackEventCompat =
        BackEventCompat(
            touchX = 0f,
            touchY = 400f,
            progress = progress,
            swipeEdge = BackEventCompat.EDGE_LEFT,
        )

    private fun waitForNavigation() {
        SystemClock.sleep(TRANSITION_SETTLE_MILLIS)
        InstrumentationRegistry.getInstrumentation().waitForIdleSync()
    }

    private companion object {
        const val TRANSITION_SETTLE_MILLIS = 400L
    }
}

class NativeNavigationTestActivity : FragmentActivity() {
    val navController: NavController
        get() =
            checkNotNull(supportFragmentManager.findFragmentByTag(NAV_HOST_TAG) as? NavHostFragment)
                .navController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(FrameLayout(this).apply { id = NAV_HOST_ID })
        val host =
            if (savedInstanceState == null) {
                NavHostFragment().also {
                    supportFragmentManager.commitNow {
                        replace(NAV_HOST_ID, it, NAV_HOST_TAG)
                        setPrimaryNavigationFragment(it)
                    }
                }
            } else {
                checkNotNull(
                    supportFragmentManager.findFragmentByTag(NAV_HOST_TAG) as? NavHostFragment
                )
            }
        if (host.navController.currentDestination == null) {
            host.navController.graph =
                host.navController.createGraph(startDestination = ROOT_ROUTE) {
                    fragment<NativeNavigationRootFragment>(ROOT_ROUTE)
                    fragment<NativeNavigationDetailFragment>(DETAIL_ROUTE)
                }
        }
    }

    fun navigateToDetail() {
        val destinationId = checkNotNull(navController.graph.findNode(DETAIL_ROUTE)).id
        navController.navigate(
            destinationId,
            null,
            checkNotNull(NativeNavigationTransition.SLIDE.navigationOptions()),
        )
        supportFragmentManager.executePendingTransactions()
    }

    private companion object {
        const val NAV_HOST_ID = 8_201
        const val NAV_HOST_TAG = "native-navigation-test-host"
    }
}

class NativeNavigationRootFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = FrameLayout(requireContext())
}

class NativeNavigationDetailFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = FrameLayout(requireContext())
}

private const val ROOT_ROUTE = "root"
private const val DETAIL_ROUTE = "detail"

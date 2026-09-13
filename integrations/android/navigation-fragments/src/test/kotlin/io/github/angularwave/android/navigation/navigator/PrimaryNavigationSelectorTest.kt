package io.github.angularwave.android.navigation.navigator

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PrimaryNavigationSelectorTest {
    @Test
    fun `moves Android back handling between navigator hosts`() {
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        val manager = activity.supportFragmentManager
        val first = Fragment()
        val second = Fragment()
        manager.beginTransaction().add(first, "first").add(second, "second").commitNow()
        val selector = PrimaryNavigationSelector(manager)

        selector.select(first)
        manager.executePendingTransactions()
        assertSame(first, selector.selected)

        selector.select(second)
        manager.executePendingTransactions()
        assertSame(second, selector.selected)

        selector.select(null)
        manager.executePendingTransactions()
        assertNull(selector.selected)
        activity.finish()
    }

    @Test
    fun `ignores selection after the fragment manager is destroyed`() {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java).setup()
        val activity = controller.get()
        val selector = PrimaryNavigationSelector(activity.supportFragmentManager)
        controller.destroy()

        selector.select(Fragment())

        assertNull(selector.selected)
    }
}

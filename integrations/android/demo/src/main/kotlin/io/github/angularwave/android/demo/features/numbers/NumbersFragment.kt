package io.github.angularwave.android.demo.features.numbers

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import io.github.angularwave.android.demo.Demo
import io.github.angularwave.android.demo.R
import io.github.angularwave.android.navigation.destinations.AngularNativeDestinationDeepLink
import io.github.angularwave.android.navigation.fragments.AngularNativeFragment

@AngularNativeDestinationDeepLink(uri = "angularNative://fragment/numbers")
class NumbersFragment : AngularNativeFragment(), NumbersFragmentCallback {
    private val numbersAdapter = NumbersAdapter(this)

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_numbers, container, false)

    override fun onViewCreated(
        view: View,
        savedInstanceState: Bundle?,
    ) {
        super.onViewCreated(view, savedInstanceState)
        initView(view)
    }

    private fun initView(view: View) {
        view.findViewById<RecyclerView>(R.id.recycler_view).apply {
            layoutManager = LinearLayoutManager(view.context)
            adapter = numbersAdapter.apply {
                val itemCount = 100
                setData((1..itemCount).toList())
            }
        }
    }

    override fun onItemClicked(number: Int) {
        navigator.route("${Demo.current.url}/numbers/$number")
    }
}

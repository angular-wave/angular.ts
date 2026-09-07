package io.github.angularwave.android.navigation.util

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

internal data class AngularNativeDispatcherProvider(
    val main: CoroutineDispatcher,
    var io: CoroutineDispatcher
)

internal val dispatcherProvider = AngularNativeDispatcherProvider(
    main = Dispatchers.Main,
    io = Dispatchers.IO
)

package io.github.angularwave.android.navigation.session

import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import io.github.angularwave.android.core.ng.visit.VisitAction
import io.github.angularwave.android.core.ng.visit.VisitOptions

/**
 * Serves as a shared ViewModel to exchange data between [Session] and various other internal
 * classes. Typically used to share navigational events.
 */
internal class SessionViewModel(private val savedState: SavedStateHandle) : ViewModel() {
    /**
     * Represents visit options for the current visit. Typically consumed by a delegate to execute a
     * navigation action. Can only be consumed once.
     */
    var visitOptions: SessionEvent<VisitOptions>? = restoreVisitOptions()
        private set

    /**
     * A one-time event that can be observed to determine if a closing modal has returned a result
     * to be proceed. Can only be consumed once.
     */
    val modalResult =
        MutableLiveData<SessionEvent<SessionModalResult>>().apply {
            restoreModalResult()?.let { value = it }
        }

    /** Convenience method to check if the modal result has already been consumed. */
    val modalResultExists: Boolean
        get() = modalResult.value?.hasBeenHandled == false

    /** A one-time event that can be observed to determine when a dialog has been cancelled. */
    val dialogResult: MutableLiveData<SessionEvent<SessionDialogResult>> by lazy {
        MutableLiveData<SessionEvent<SessionDialogResult>>()
    }

    /** Wraps the visit options in a [SessionEvent] to ensure it can only be consumed once. */
    fun saveVisitOptions(options: VisitOptions) {
        savedState[VISIT_ACTION_KEY] = options.action.name
        visitOptions = visitEvent(options)
    }

    /** Wraps a modal result in a [SessionEvent] and updates the LiveData value. */
    fun sendModalResult(result: SessionModalResult) {
        savedState[MODAL_RESULT_KEY] =
            Bundle().apply {
                putString(MODAL_LOCATION_KEY, result.location)
                putString(MODAL_ACTION_KEY, result.options.action.name)
                putBundle(MODAL_ARGUMENTS_KEY, result.bundle?.let(::Bundle))
            }
        modalResult.value = modalEvent(result)
    }

    /** Wraps a dialog result in a [SessionEvent] and updates the LiveData value. */
    fun sendDialogResult() {
        dialogResult.value = SessionEvent(SessionDialogResult(true))
    }

    private fun restoreVisitOptions(): SessionEvent<VisitOptions>? {
        val action = savedAction(savedState[VISIT_ACTION_KEY]) ?: return null
        return visitEvent(VisitOptions(action = action))
    }

    private fun restoreModalResult(): SessionEvent<SessionModalResult>? {
        val state = savedState.get<Bundle>(MODAL_RESULT_KEY) ?: return null
        val location = state.getString(MODAL_LOCATION_KEY)
        val action = savedAction(state.getString(MODAL_ACTION_KEY))
        if (location == null || action == null) {
            savedState.remove<Bundle>(MODAL_RESULT_KEY)
            return null
        }
        return modalEvent(
            SessionModalResult(
                location = location,
                options = VisitOptions(action = action),
                bundle = state.getBundle(MODAL_ARGUMENTS_KEY),
            )
        )
    }

    private fun visitEvent(options: VisitOptions) =
        SessionEvent(options) { savedState.remove<String>(VISIT_ACTION_KEY) }

    private fun modalEvent(result: SessionModalResult) =
        SessionEvent(result) { savedState.remove<Bundle>(MODAL_RESULT_KEY) }

    private fun savedAction(value: String?): VisitAction? =
        VisitAction.entries.firstOrNull { it.name == value }

    companion object {
        private const val VISIT_ACTION_KEY = "angularNative.visitAction"
        private const val MODAL_RESULT_KEY = "angularNative.modalResult"
        private const val MODAL_LOCATION_KEY = "location"
        private const val MODAL_ACTION_KEY = "action"
        private const val MODAL_ARGUMENTS_KEY = "arguments"

        fun get(
            sessionName: String,
            activity: FragmentActivity,
        ): SessionViewModel =
            ViewModelProvider(activity)
                .get(
                    sessionName,
                    SessionViewModel::class.java,
                )
    }
}

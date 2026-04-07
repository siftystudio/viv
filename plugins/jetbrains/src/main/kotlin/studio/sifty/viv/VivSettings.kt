package studio.sifty.viv

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

/**
 * Application-level persistent settings for the Viv plugin.
 *
 * Registered via `<applicationService>` in plugin.xml (required for [PersistentStateComponent]).
 */
@State(name = "VivSettings", storages = [Storage("viv.xml")])
class VivSettings : PersistentStateComponent<VivSettings.State> {

    private var state = State()

    data class State(
        var pythonPath: String = "",
        var compileOnSave: Boolean = true,
        var compileTimeout: Int = 120,
    )

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    var pythonPath: String
        get() = state.pythonPath
        set(value) { state.pythonPath = value }

    var compileOnSave: Boolean
        get() = state.compileOnSave
        set(value) { state.compileOnSave = value }

    var compileTimeout: Int
        get() = state.compileTimeout
        set(value) { state.compileTimeout = value }

    companion object {
        fun getInstance(): VivSettings =
            ApplicationManager.getApplication().getService(VivSettings::class.java)
    }
}

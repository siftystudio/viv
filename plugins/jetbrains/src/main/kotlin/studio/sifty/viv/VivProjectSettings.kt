package studio.sifty.viv

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project

/**
 * Project-level persistent settings for the Viv plugin (entry file and output path).
 *
 * Registered via `<projectService>` in plugin.xml (required for [PersistentStateComponent]).
 */
@State(name = "VivProjectSettings", storages = [Storage("viv.xml")])
class VivProjectSettings : PersistentStateComponent<VivProjectSettings.State> {

    private var state = State()

    data class State(
        var entryFile: String = "",
        var outputPath: String = "",
    )

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    var entryFile: String
        get() = state.entryFile
        set(value) { state.entryFile = value }

    var outputPath: String
        get() = state.outputPath
        set(value) { state.outputPath = value }

    companion object {
        fun getInstance(project: Project): VivProjectSettings =
            project.getService(VivProjectSettings::class.java)
    }
}

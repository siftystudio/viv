package studio.sifty.viv

import com.intellij.lang.Language

/** The Viv language definition singleton, registered with the IntelliJ platform. */
class VivLanguage private constructor() : Language("Viv") {
    companion object {
        @JvmField
        val INSTANCE = VivLanguage()
    }
}

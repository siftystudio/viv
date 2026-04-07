package studio.sifty.viv

import com.intellij.extapi.psi.PsiFileBase
import com.intellij.openapi.fileTypes.FileType
import com.intellij.psi.FileViewProvider

/** PSI file implementation for Viv source files. */
class VivFile(viewProvider: FileViewProvider) : PsiFileBase(viewProvider, VivLanguage.INSTANCE) {

    override fun getFileType(): FileType = VivFileType.INSTANCE
}

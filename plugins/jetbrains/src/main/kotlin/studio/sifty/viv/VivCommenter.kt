package studio.sifty.viv

import com.intellij.lang.Commenter

/** Configures `//` as the line comment prefix for Viv. No block comments. */
class VivCommenter : Commenter {

    override fun getLineCommentPrefix(): String = "// "

    override fun getBlockCommentPrefix(): String? = null

    override fun getBlockCommentSuffix(): String? = null

    override fun getCommentedBlockCommentPrefix(): String? = null

    override fun getCommentedBlockCommentSuffix(): String? = null
}

package studio.sifty.viv

import com.intellij.ide.structureView.*
import com.intellij.ide.util.treeView.smartTree.TreeElement
import com.intellij.lang.PsiStructureViewFactory
import com.intellij.navigation.ItemPresentation
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiFile
import javax.swing.Icon

/**
 * Provides the Structure tool window view for .viv files.
 * Shows constructs, their roles, scratch variables, and plan phases.
 */
class VivStructureViewFactory : PsiStructureViewFactory {

    override fun getStructureViewBuilder(psiFile: PsiFile): StructureViewBuilder? {
        if (psiFile !is VivFile) return null
        return object : TreeBasedStructureViewBuilder() {
            override fun createStructureViewModel(editor: Editor?): StructureViewModel =
                VivStructureViewModel(psiFile, editor)
        }
    }
}

private class VivStructureViewModel(
    file: VivFile,
    editor: Editor?,
) : StructureViewModelBase(file, editor, VivFileStructureElement(file)),
    StructureViewModel.ElementInfoProvider {

    override fun isAlwaysShowsPlus(element: StructureViewTreeElement): Boolean = false
    override fun isAlwaysLeaf(element: StructureViewTreeElement): Boolean =
        element is VivRoleElement || element is VivVarElement || element is VivPhaseElement
}

private class VivFileStructureElement(
    private val file: VivFile,
) : StructureViewTreeElement {

    override fun getPresentation(): ItemPresentation = object : ItemPresentation {
        override fun getPresentableText(): String = file.name
        override fun getLocationString(): String? = null
        override fun getIcon(unused: Boolean): Icon? = VivFileType.INSTANCE.icon
    }

    override fun getChildren(): Array<TreeElement> {
        val project = file.project
        val idx = VivProjectIndex.getInstance(project)
        val vFile = file.virtualFile ?: return emptyArray()

        val fileIndex = idx.getFileIndex(vFile) ?: return emptyArray()
        return fileIndex.constructs.map { VivConstructElement(it, project) }.toTypedArray()
    }

    override fun getValue(): Any = file
    override fun navigate(requestFocus: Boolean) {}
    override fun canNavigate(): Boolean = false
    override fun canNavigateToSource(): Boolean = false
}

private class VivConstructElement(
    private val info: ConstructInfo,
    private val project: Project,
) : StructureViewTreeElement {

    override fun getPresentation(): ItemPresentation = object : ItemPresentation {
        override fun getPresentableText(): String {
            val prefix = buildString {
                if (info.isReserved) append("reserved ")
                if (info.isTemplate) append("template ")
            }
            val parent = if (info.parent != null) " from ${info.parent}" else ""
            return "$prefix${info.type.keyword} ${info.name}$parent"
        }
        override fun getLocationString(): String? = null
        override fun getIcon(unused: Boolean): Icon? = null
    }

    override fun getChildren(): Array<TreeElement> {
        val children = mutableListOf<TreeElement>()
        for (role in info.roles) children.add(VivRoleElement(role))
        for (v in info.scratchVars) children.add(VivVarElement(v))
        for (phase in info.phases) children.add(VivPhaseElement(phase))
        return children.toTypedArray()
    }

    override fun getValue(): Any = info
    override fun navigate(requestFocus: Boolean) {
        com.intellij.openapi.fileEditor.OpenFileDescriptor(
            project, info.file, info.nameOffset
        ).navigate(requestFocus)
    }
    override fun canNavigate(): Boolean = true
    override fun canNavigateToSource(): Boolean = true
}

private class VivRoleElement(private val role: RoleInfo) : StructureViewTreeElement {
    override fun getPresentation(): ItemPresentation = object : ItemPresentation {
        override fun getPresentableText(): String {
            val star = if (role.isGroup) "*" else ""
            val labels = if (role.labels.isNotEmpty()) " (${role.labels.joinToString(", ")})" else ""
            return "${role.fullName}$star$labels"
        }
        override fun getLocationString(): String? = null
        override fun getIcon(unused: Boolean): Icon? = null
    }
    override fun getChildren(): Array<TreeElement> = emptyArray()
    override fun getValue(): Any = role
    override fun navigate(requestFocus: Boolean) {}
    override fun canNavigate(): Boolean = false
    override fun canNavigateToSource(): Boolean = false
}

private class VivVarElement(private val v: VarInfo) : StructureViewTreeElement {
    override fun getPresentation(): ItemPresentation = object : ItemPresentation {
        override fun getPresentableText(): String = v.fullName
        override fun getLocationString(): String? = null
        override fun getIcon(unused: Boolean): Icon? = null
    }
    override fun getChildren(): Array<TreeElement> = emptyArray()
    override fun getValue(): Any = v
    override fun navigate(requestFocus: Boolean) {}
    override fun canNavigate(): Boolean = false
    override fun canNavigateToSource(): Boolean = false
}

private class VivPhaseElement(private val phaseName: String) : StructureViewTreeElement {
    override fun getPresentation(): ItemPresentation = object : ItemPresentation {
        override fun getPresentableText(): String = ">$phaseName"
        override fun getLocationString(): String? = null
        override fun getIcon(unused: Boolean): Icon? = null
    }
    override fun getChildren(): Array<TreeElement> = emptyArray()
    override fun getValue(): Any = phaseName
    override fun navigate(requestFocus: Boolean) {}
    override fun canNavigate(): Boolean = false
    override fun canNavigateToSource(): Boolean = false
}

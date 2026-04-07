package studio.sifty.viv

import com.intellij.lang.cacheBuilder.DefaultWordsScanner
import com.intellij.lang.cacheBuilder.WordsScanner
import com.intellij.lang.findUsages.FindUsagesProvider
import com.intellij.psi.PsiElement
import com.intellij.psi.tree.TokenSet
import studio.sifty.viv.psi.*

/**
 * Provides metadata for the Find Usages system.
 * Recognizes [VivNamedElement] instances (construct headers, reference elements)
 * and falls back to accepting any element in a Viv file.
 */
class VivFindUsagesProvider : FindUsagesProvider {

    override fun getWordsScanner(): WordsScanner = DefaultWordsScanner(
        VivLexerAdapter(),
        TokenSet.create(VivTypes.IDENTIFIER),
        VivParserDefinition.COMMENTS,
        VivParserDefinition.STRINGS,
    )

    override fun canFindUsagesFor(psiElement: PsiElement): Boolean =
        psiElement is VivNamedElement || psiElement.containingFile is VivFile

    override fun getHelpId(psiElement: PsiElement): String? = null

    override fun getType(element: PsiElement): String = when (element) {
        is VivActionHeader -> "action"
        is VivPlanHeader -> "plan"
        is VivQueryHeader -> "query"
        is VivSiftingPatternHeader -> "pattern"
        is VivTropeHeader -> "trope"
        is VivSelectorHeader -> "selector"
        is VivReactionTarget -> "construct reference"
        is VivParentActionDeclaration -> "parent reference"
        is VivActionSearch -> "query reference"
        is VivSiftingHeader -> "pattern reference"
        is VivTropeFit, is VivTropeFitSugared -> "trope reference"
        is VivVivReference -> "reference"
        is VivPropertyName -> "property"
        is VivCustomFunctionCall -> "function call"
        else -> "identifier"
    }

    override fun getDescriptiveName(element: PsiElement): String =
        (element as? VivNamedElement)?.name ?: element.containingFile?.name ?: ""

    override fun getNodeText(element: PsiElement, useFullName: Boolean): String =
        (element as? VivNamedElement)?.name ?: element.text.take(80)
}

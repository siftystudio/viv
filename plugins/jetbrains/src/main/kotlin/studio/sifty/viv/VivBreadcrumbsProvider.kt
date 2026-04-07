package studio.sifty.viv

import com.intellij.lang.Language
import com.intellij.psi.PsiElement
import com.intellij.ui.breadcrumbs.BreadcrumbsProvider
import studio.sifty.viv.psi.*

/**
 * Provides breadcrumbs showing the current scope path within a .viv file.
 *
 * IntelliJ walks up the PSI tree from the caret and calls [acceptElement] at
 * each ancestor. Accepted elements become segments of a clickable breadcrumb
 * chain, with [getElementInfo] providing the display text for each segment.
 *
 * Examples:
 * - `test.viv > action greet > conditions`
 * - `test.viv > action greet > roles > @greeter`
 * - `test.viv > plan heist > phases > >reconnaissance`
 * - `test.viv > pattern love-triangle > actions`
 */
class VivBreadcrumbsProvider : BreadcrumbsProvider {

    override fun getLanguages(): Array<Language> = arrayOf(VivLanguage.INSTANCE)

    override fun acceptElement(element: PsiElement): Boolean = when (element) {
        is VivFile -> true

        // Top-level constructs
        is VivAction,
        is VivPlan,
        is VivQuery,
        is VivSiftingPattern,
        is VivTrope,
        is VivSelector -> true

        // Action sections
        is VivActionRoles,
        is VivActionConditions,
        is VivActionEffects,
        is VivActionReactions,
        is VivActionScratch,
        is VivActionEmbargoes,
        is VivActionSaliences,
        is VivActionAssociations,
        is VivActionTags,
        is VivActionGloss,
        is VivActionImportance,
        is VivActionReport -> true

        // Plan sections
        is VivPlanPhases,
        is VivPlanConditions,
        is VivPlanRoles -> true

        // Plan phase
        is VivPlanPhase -> true

        // Query sections
        is VivQueryRoles,
        is VivQueryConditions,
        is VivQueryActionName,
        is VivQueryAncestors,
        is VivQueryDescendants,
        is VivQueryImportance,
        is VivQueryTags,
        is VivQuerySalience,
        is VivQueryAssociations,
        is VivQueryLocation,
        is VivQueryTime,
        is VivQueryInitiator,
        is VivQueryPartners,
        is VivQueryRecipients,
        is VivQueryBystanders,
        is VivQueryActive,
        is VivQueryPresent -> true

        // Sifting pattern sections
        is VivSiftingPatternRoles,
        is VivSiftingPatternActions,
        is VivSiftingPatternConditions -> true

        // Trope sections
        is VivTropeRoles,
        is VivTropeConditions -> true

        // Selector sections
        is VivSelectorRoles,
        is VivSelectorConditions,
        is VivSelectorTargetGroup -> true

        // Roles and reactions (nested within sections)
        is VivRole -> true
        is VivReaction -> true

        else -> false
    }

    override fun getElementInfo(element: PsiElement): String = when (element) {
        is VivFile -> element.name

        // Constructs: show "keyword name"
        // Use .name (from VivNamedElement mixin, returns last IDENTIFIER) rather than
        // .identifier?.text (GrammarKit-generated, returns first IDENTIFIER — which is
        // the keyword itself for context-sensitive keywords like 'action', 'plan', etc.)
        is VivAction -> {
            val name = element.actionHeader.name
            "action ${name ?: "?"}"
        }
        is VivPlan -> {
            val name = element.planHeader.name
            "plan ${name ?: "?"}"
        }
        is VivQuery -> {
            val name = element.queryHeader.name
            "query ${name ?: "?"}"
        }
        is VivSiftingPattern -> {
            val name = element.siftingPatternHeader.name
            "pattern ${name ?: "?"}"
        }
        is VivTrope -> {
            val name = element.tropeHeader.name
            "trope ${name ?: "?"}"
        }
        is VivSelector -> {
            val typeText = element.selectorHeader.selectorType.text
            val name = element.selectorHeader.name
            "$typeText ${name ?: "?"}"
        }

        // Action sections
        is VivActionRoles -> joinPrefix(element.childJoinOperator) + "roles"
        is VivActionConditions -> joinPrefix(element.childJoinOperator) + "conditions"
        is VivActionEffects -> joinPrefix(element.childJoinOperator) + "effects"
        is VivActionReactions -> joinPrefix(element.childJoinOperator) + "reactions"
        is VivActionScratch -> joinPrefix(element.childJoinOperator) + "scratch"
        is VivActionEmbargoes -> joinPrefix(element.childJoinOperator) + "embargoes"
        is VivActionSaliences -> "saliences"
        is VivActionAssociations -> "associations"
        is VivActionTags -> joinPrefix(element.childJoinOperator) + "tags"
        is VivActionGloss -> "gloss"
        is VivActionImportance -> "importance"
        is VivActionReport -> "report"

        // Plan sections
        is VivPlanPhases -> "phases"
        is VivPlanConditions -> "conditions"
        is VivPlanRoles -> "roles"

        // Plan phase
        is VivPlanPhase -> ">${element.planPhaseName.identifier.text}"

        // Query sections
        is VivQueryRoles -> "roles"
        is VivQueryConditions -> "conditions"
        is VivQueryActionName -> "action"
        is VivQueryAncestors -> "ancestors"
        is VivQueryDescendants -> "descendants"
        is VivQueryImportance -> "importance"
        is VivQueryTags -> "tags"
        is VivQuerySalience -> "salience"
        is VivQueryAssociations -> "associations"
        is VivQueryLocation -> "location"
        is VivQueryTime -> "time"
        is VivQueryInitiator -> "initiator"
        is VivQueryPartners -> "partners"
        is VivQueryRecipients -> "recipients"
        is VivQueryBystanders -> "bystanders"
        is VivQueryActive -> "active"
        is VivQueryPresent -> "present"

        // Sifting pattern sections
        is VivSiftingPatternRoles -> "roles"
        is VivSiftingPatternActions -> "actions"
        is VivSiftingPatternConditions -> "conditions"

        // Trope sections
        is VivTropeRoles -> "roles"
        is VivTropeConditions -> "conditions"

        // Selector sections
        is VivSelectorRoles -> "roles"
        is VivSelectorConditions -> "conditions"
        is VivSelectorTargetGroup -> "target"

        // Role: show "@rolename" or "&groupname"
        is VivRole -> {
            val ref = element.roleReference
            val sigil = ref.bindingType.text
            val name = ref.identifier.text
            val decorator = ref.groupRoleDecorator?.text ?: ""
            "$sigil$name$decorator"
        }

        // Reaction: show "queue action foo"
        is VivReaction -> {
            val target = element.reactionHeader.reactionTarget
            if (target != null) {
                "queue ${target.reactionTargetType.text} ${target.identifier.text}"
            } else {
                "queue ?"
            }
        }

        else -> element.containingFile?.name ?: ""
    }

    override fun getElementTooltip(element: PsiElement): String? = null

    private fun joinPrefix(joinOp: VivChildJoinOperator?): String =
        if (joinOp != null) "join " else ""
}

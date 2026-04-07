package studio.sifty.viv

import com.intellij.openapi.vfs.VirtualFile

/** Type of a Viv construct (top-level definition). */
enum class ConstructType(val keyword: String) {
    ACTION("action"),
    PLAN("plan"),
    ACTION_SELECTOR("action-selector"),
    PLAN_SELECTOR("plan-selector"),
    QUERY("query"),
    PATTERN("pattern"),
    TROPE("trope");

    companion object {
        fun fromKeyword(keyword: String): ConstructType? = entries.find { it.keyword == keyword }
    }
}

/** Structural data for a single plan phase, parsed from the phase body. */
data class PhaseInfo(
    val name: String,
    val hasSucceed: Boolean = false,
    val hasFail: Boolean = false,
    val hasAdvance: Boolean = false,
    val hasWait: Boolean = false,
    val reactionCount: Int = 0,
)

/** A single top-level construct definition parsed from a .viv file. */
data class ConstructInfo(
    val name: String,
    val type: ConstructType,
    val file: VirtualFile,
    val nameOffset: Int,
    val headerOffset: Int,
    val bodyEnd: Int,
    val parent: String?,
    val comment: String?,
    val isReserved: Boolean,
    val isTemplate: Boolean,
    val roles: List<RoleInfo>,
    val scratchVars: List<VarInfo>,
    val phaseInfos: List<PhaseInfo>,
    /** Action-variable roles from a sifting pattern's `actions:` section. */
    val actionRoles: List<RoleInfo> = emptyList(),
    /** Text of the gloss: field (a string literal). */
    val gloss: String? = null,
    /** Tags from the construct-level tags: field. */
    val tags: List<String> = emptyList(),
    /** Raw text of the importance value. */
    val importance: String? = null,
    /** Whether the construct terminates with ';' (stub definition). */
    val isStub: Boolean = false,
    /** Parsed predicates from a query construct's body. */
    val predicates: List<QueryPredicate> = emptyList(),
    /** Number of expressions in the conditions: section. */
    val conditionCount: Int = 0,
    /** Number of expressions in the effects: section. */
    val effectCount: Int = 0,
    /** Number of reaction blocks in the reactions: section. */
    val reactionCount: Int = 0,
    /** Number of embargo blocks in the embargoes: section. */
    val embargoCount: Int = 0,
    /** Role names with per-role salience entries. */
    val salienceRoles: List<String> = emptyList(),
    /** Whether the saliences section has a default: entry. */
    val hasDefaultSalience: Boolean = false,
    /** Whether the saliences section has a custom (for _@) field. */
    val hasCustomSalience: Boolean = false,
    /** Role names with per-role association entries. */
    val associationRoles: List<String> = emptyList(),
    /** Whether the associations section has a default: entry. */
    val hasDefaultAssociation: Boolean = false,
    /** Whether the associations section has a custom (for _@) field. */
    val hasCustomAssociation: Boolean = false,
    /** Target policy for selectors ("randomly", "with weights", "in order"). */
    val targetPolicy: String? = null,
    /** Candidate construct names from the target section. */
    val candidates: List<String> = emptyList(),
) {
    val key: String get() = "${type.keyword}:$name"

    /** Phase names (convenience accessor for backward compatibility). */
    val phases: List<String> get() = phaseInfos.map { it.name }
}

/** A single predicate from a query construct (e.g., `action: any: fight, argue`). */
data class QueryPredicate(
    val field: String,
    val operator: String,
    val values: List<String>,
)

/** A role definition from a construct's `roles:` section. */
data class RoleInfo(
    val name: String,
    val fullName: String,
    val offset: Int,
    val labels: List<String>,
    val isGroup: Boolean,
    val isSymbol: Boolean,
    /** "is" or "from", or null if no casting-pool directive. */
    val castingDirective: String? = null,
    /** Raw text of the is:/from: expression (e.g., "@leader.allies"). */
    val castingExpression: String? = null,
    /** Raw text of the spawn: directive (e.g., "~createCharacter(@parent)"). */
    val spawnExpression: String? = null,
    /** Role reference from the renames: field (e.g., "@recipient"). */
    val renamesTarget: String? = null,
    /** Raw text of the n: field (e.g., "0-5 [60%]"). */
    val slotRange: String? = null,
    /** Comment block immediately above the role definition. */
    val comment: String? = null,
)

/** A scratch variable declaration from a construct's `scratch:` section. */
data class VarInfo(
    val name: String,
    val fullName: String,
    val offset: Int,
    /** Raw RHS text of the `$@var = expr` assignment. */
    val initialValue: String? = null,
)

/** An include statement at the file level. */
data class IncludeInfo(
    val path: String,
    val offset: Int,
    val pathOffset: Int,
)

/** Indexed data for a single .viv file. */
data class FileIndex(
    val constructs: List<ConstructInfo>,
    val includes: List<IncludeInfo>,
    val enumTokens: Set<String>,
    val functionNames: Set<String>,
    val tagNames: Set<String>,
)

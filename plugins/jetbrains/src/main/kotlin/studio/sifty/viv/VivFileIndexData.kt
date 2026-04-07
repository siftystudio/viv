package studio.sifty.viv

import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.util.io.DataExternalizer
import java.io.DataInput
import java.io.DataOutput

/**
 * Serializable wrapper around [FileIndex] for use with [VivFileBasedIndex].
 * The [VivFileIndexDataExternalizer] handles binary serialization of all fields.
 */
data class VivFileIndexData(val fileIndex: FileIndex)

/**
 * Serializes and deserializes [VivFileIndexData] for the IntelliJ file-based index.
 *
 * Every field of [FileIndex], [ConstructInfo], [RoleInfo], [VarInfo], [PhaseInfo],
 * [QueryPredicate], and [IncludeInfo] is written/read explicitly. Nullable fields
 * are prefixed with a boolean presence flag.
 */
class VivFileIndexDataExternalizer : DataExternalizer<VivFileIndexData> {

    override fun save(out: DataOutput, value: VivFileIndexData) {
        val idx = value.fileIndex

        // Constructs
        out.writeInt(idx.constructs.size)
        for (c in idx.constructs) {
            writeConstruct(out, c)
        }

        // Includes
        out.writeInt(idx.includes.size)
        for (inc in idx.includes) {
            writeInclude(out, inc)
        }

        // Enum tokens
        out.writeInt(idx.enumTokens.size)
        for (token in idx.enumTokens) {
            out.writeUTF(token)
        }

        // Function names
        out.writeInt(idx.functionNames.size)
        for (name in idx.functionNames) {
            out.writeUTF(name)
        }

        // Tag names
        out.writeInt(idx.tagNames.size)
        for (name in idx.tagNames) {
            out.writeUTF(name)
        }
    }

    override fun read(input: DataInput): VivFileIndexData {
        // Constructs
        val constructCount = input.readInt()
        val constructs = ArrayList<ConstructInfo>(constructCount)
        for (i in 0 until constructCount) {
            val c = readConstruct(input) ?: continue
            constructs.add(c)
        }

        // Includes
        val includeCount = input.readInt()
        val includes = ArrayList<IncludeInfo>(includeCount)
        for (i in 0 until includeCount) {
            includes.add(readInclude(input))
        }

        // Enum tokens
        val enumCount = input.readInt()
        val enumTokens = LinkedHashSet<String>(enumCount)
        for (i in 0 until enumCount) {
            enumTokens.add(input.readUTF())
        }

        // Function names
        val funcCount = input.readInt()
        val functionNames = LinkedHashSet<String>(funcCount)
        for (i in 0 until funcCount) {
            functionNames.add(input.readUTF())
        }

        // Tag names
        val tagCount = input.readInt()
        val tagNames = LinkedHashSet<String>(tagCount)
        for (i in 0 until tagCount) {
            tagNames.add(input.readUTF())
        }

        return VivFileIndexData(FileIndex(
            constructs = constructs,
            includes = includes,
            enumTokens = enumTokens,
            functionNames = functionNames,
            tagNames = tagNames,
        ))
    }

    // ========================================================================
    // ConstructInfo serialization
    // ========================================================================

    private fun writeConstruct(out: DataOutput, c: ConstructInfo) {
        out.writeUTF(c.name)
        out.writeUTF(c.type.keyword)
        out.writeUTF(c.file.url)
        out.writeInt(c.nameOffset)
        out.writeInt(c.headerOffset)
        out.writeInt(c.bodyEnd)
        writeNullableString(out, c.parent)
        writeNullableString(out, c.comment)
        out.writeBoolean(c.isReserved)
        out.writeBoolean(c.isTemplate)
        out.writeBoolean(c.isStub)

        // Roles
        out.writeInt(c.roles.size)
        for (role in c.roles) {
            writeRole(out, role)
        }

        // Scratch vars
        out.writeInt(c.scratchVars.size)
        for (v in c.scratchVars) {
            writeVar(out, v)
        }

        // Phase infos
        out.writeInt(c.phaseInfos.size)
        for (phase in c.phaseInfos) {
            writePhase(out, phase)
        }

        // Action roles
        out.writeInt(c.actionRoles.size)
        for (role in c.actionRoles) {
            writeRole(out, role)
        }

        // Scalar/nullable fields
        writeNullableString(out, c.gloss)
        writeStringList(out, c.tags)
        writeNullableString(out, c.importance)

        // Predicates
        out.writeInt(c.predicates.size)
        for (pred in c.predicates) {
            writePredicate(out, pred)
        }

        // Counts
        out.writeInt(c.conditionCount)
        out.writeInt(c.effectCount)
        out.writeInt(c.reactionCount)
        out.writeInt(c.embargoCount)

        // Salience fields
        writeStringList(out, c.salienceRoles)
        out.writeBoolean(c.hasDefaultSalience)
        out.writeBoolean(c.hasCustomSalience)

        // Association fields
        writeStringList(out, c.associationRoles)
        out.writeBoolean(c.hasDefaultAssociation)
        out.writeBoolean(c.hasCustomAssociation)

        // Selector fields
        writeNullableString(out, c.targetPolicy)
        writeStringList(out, c.candidates)
    }

    private fun readConstruct(input: DataInput): ConstructInfo? {
        val name = input.readUTF()
        val typeKeyword = input.readUTF()
        val fileUrl = input.readUTF()
        val nameOffset = input.readInt()
        val headerOffset = input.readInt()
        val bodyEnd = input.readInt()
        val parent = readNullableString(input)
        val comment = readNullableString(input)
        val isReserved = input.readBoolean()
        val isTemplate = input.readBoolean()
        val isStub = input.readBoolean()

        // Roles — must always be fully consumed regardless of validity
        val roleCount = input.readInt()
        val roles = ArrayList<RoleInfo>(roleCount)
        for (i in 0 until roleCount) {
            roles.add(readRole(input))
        }

        // Scratch vars
        val varCount = input.readInt()
        val scratchVars = ArrayList<VarInfo>(varCount)
        for (i in 0 until varCount) {
            scratchVars.add(readVar(input))
        }

        // Phase infos
        val phaseCount = input.readInt()
        val phaseInfos = ArrayList<PhaseInfo>(phaseCount)
        for (i in 0 until phaseCount) {
            phaseInfos.add(readPhase(input))
        }

        // Action roles
        val actionRoleCount = input.readInt()
        val actionRoles = ArrayList<RoleInfo>(actionRoleCount)
        for (i in 0 until actionRoleCount) {
            actionRoles.add(readRole(input))
        }

        // Scalar/nullable fields
        val gloss = readNullableString(input)
        val tags = readStringList(input)
        val importance = readNullableString(input)

        // Predicates
        val predCount = input.readInt()
        val predicates = ArrayList<QueryPredicate>(predCount)
        for (i in 0 until predCount) {
            predicates.add(readPredicate(input))
        }

        // Counts
        val conditionCount = input.readInt()
        val effectCount = input.readInt()
        val reactionCount = input.readInt()
        val embargoCount = input.readInt()

        // Salience fields
        val salienceRoles = readStringList(input)
        val hasDefaultSalience = input.readBoolean()
        val hasCustomSalience = input.readBoolean()

        // Association fields
        val associationRoles = readStringList(input)
        val hasDefaultAssociation = input.readBoolean()
        val hasCustomAssociation = input.readBoolean()

        // Selector fields
        val targetPolicy = readNullableString(input)
        val candidates = readStringList(input)

        // Resolve type and file — if either is missing, skip this construct
        // but all bytes have been consumed so the stream stays in sync.
        val type = ConstructType.fromKeyword(typeKeyword) ?: return null
        val file = VirtualFileManager.getInstance().findFileByUrl(fileUrl) ?: return null

        return ConstructInfo(
            name = name,
            type = type,
            file = file,
            nameOffset = nameOffset,
            headerOffset = headerOffset,
            bodyEnd = bodyEnd,
            parent = parent,
            comment = comment,
            isReserved = isReserved,
            isTemplate = isTemplate,
            isStub = isStub,
            roles = roles,
            scratchVars = scratchVars,
            phaseInfos = phaseInfos,
            actionRoles = actionRoles,
            gloss = gloss,
            tags = tags,
            importance = importance,
            predicates = predicates,
            conditionCount = conditionCount,
            effectCount = effectCount,
            reactionCount = reactionCount,
            embargoCount = embargoCount,
            salienceRoles = salienceRoles,
            hasDefaultSalience = hasDefaultSalience,
            hasCustomSalience = hasCustomSalience,
            associationRoles = associationRoles,
            hasDefaultAssociation = hasDefaultAssociation,
            hasCustomAssociation = hasCustomAssociation,
            targetPolicy = targetPolicy,
            candidates = candidates,
        )
    }

    // ========================================================================
    // RoleInfo serialization
    // ========================================================================

    private fun writeRole(out: DataOutput, role: RoleInfo) {
        out.writeUTF(role.name)
        out.writeUTF(role.fullName)
        out.writeInt(role.offset)
        writeStringList(out, role.labels)
        out.writeBoolean(role.isGroup)
        out.writeBoolean(role.isSymbol)
        writeNullableString(out, role.castingDirective)
        writeNullableString(out, role.castingExpression)
        writeNullableString(out, role.spawnExpression)
        writeNullableString(out, role.renamesTarget)
        writeNullableString(out, role.slotRange)
        writeNullableString(out, role.comment)
    }

    private fun readRole(input: DataInput): RoleInfo {
        return RoleInfo(
            name = input.readUTF(),
            fullName = input.readUTF(),
            offset = input.readInt(),
            labels = readStringList(input),
            isGroup = input.readBoolean(),
            isSymbol = input.readBoolean(),
            castingDirective = readNullableString(input),
            castingExpression = readNullableString(input),
            spawnExpression = readNullableString(input),
            renamesTarget = readNullableString(input),
            slotRange = readNullableString(input),
            comment = readNullableString(input),
        )
    }

    // ========================================================================
    // VarInfo serialization
    // ========================================================================

    private fun writeVar(out: DataOutput, v: VarInfo) {
        out.writeUTF(v.name)
        out.writeUTF(v.fullName)
        out.writeInt(v.offset)
        writeNullableString(out, v.initialValue)
    }

    private fun readVar(input: DataInput): VarInfo {
        return VarInfo(
            name = input.readUTF(),
            fullName = input.readUTF(),
            offset = input.readInt(),
            initialValue = readNullableString(input),
        )
    }

    // ========================================================================
    // PhaseInfo serialization
    // ========================================================================

    private fun writePhase(out: DataOutput, phase: PhaseInfo) {
        out.writeUTF(phase.name)
        out.writeBoolean(phase.hasSucceed)
        out.writeBoolean(phase.hasFail)
        out.writeBoolean(phase.hasAdvance)
        out.writeBoolean(phase.hasWait)
        out.writeInt(phase.reactionCount)
    }

    private fun readPhase(input: DataInput): PhaseInfo {
        return PhaseInfo(
            name = input.readUTF(),
            hasSucceed = input.readBoolean(),
            hasFail = input.readBoolean(),
            hasAdvance = input.readBoolean(),
            hasWait = input.readBoolean(),
            reactionCount = input.readInt(),
        )
    }

    // ========================================================================
    // QueryPredicate serialization
    // ========================================================================

    private fun writePredicate(out: DataOutput, pred: QueryPredicate) {
        out.writeUTF(pred.field)
        out.writeUTF(pred.operator)
        writeStringList(out, pred.values)
    }

    private fun readPredicate(input: DataInput): QueryPredicate {
        return QueryPredicate(
            field = input.readUTF(),
            operator = input.readUTF(),
            values = readStringList(input),
        )
    }

    // ========================================================================
    // IncludeInfo serialization
    // ========================================================================

    private fun writeInclude(out: DataOutput, inc: IncludeInfo) {
        out.writeUTF(inc.path)
        out.writeInt(inc.offset)
        out.writeInt(inc.pathOffset)
    }

    private fun readInclude(input: DataInput): IncludeInfo {
        return IncludeInfo(
            path = input.readUTF(),
            offset = input.readInt(),
            pathOffset = input.readInt(),
        )
    }

    // ========================================================================
    // Primitive helpers
    // ========================================================================

    private fun writeNullableString(out: DataOutput, value: String?) {
        out.writeBoolean(value != null)
        if (value != null) out.writeUTF(value)
    }

    private fun readNullableString(input: DataInput): String? {
        return if (input.readBoolean()) input.readUTF() else null
    }

    private fun writeStringList(out: DataOutput, list: List<String>) {
        out.writeInt(list.size)
        for (s in list) out.writeUTF(s)
    }

    private fun readStringList(input: DataInput): List<String> {
        val count = input.readInt()
        val list = ArrayList<String>(count)
        for (i in 0 until count) list.add(input.readUTF())
        return list
    }
}

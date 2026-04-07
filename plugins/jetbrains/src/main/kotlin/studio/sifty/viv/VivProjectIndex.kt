package studio.sifty.viv

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.util.indexing.FileBasedIndex

/**
 * Project-level query facade over the [VivFileBasedIndex]. Provides lookups for
 * constructs, roles, variables, and their relationships — including inheritance
 * resolution.
 *
 * All data is sourced from the platform's file-based index, which updates
 * automatically when file content changes. No manual reindexing is needed.
 */
class VivProjectIndex(private val project: Project) {

    // ========================================================================
    // Internal helpers
    // ========================================================================

    /** Returns the [FileIndex] for a single file, or null if not indexed. */
    private fun getFileIndexByUrl(fileUrl: String): FileIndex? {
        val values = FileBasedIndex.getInstance().getValues(
            VivFileBasedIndex.NAME, fileUrl, GlobalSearchScope.projectScope(project)
        )
        return values.firstOrNull()?.fileIndex
    }

    /** Returns the [FileIndex] for a VirtualFile, or null if not indexed. */
    private fun getFileIndexForFile(file: VirtualFile): FileIndex? {
        return getFileIndexByUrl(file.url)
    }

    /** Iterates all indexed [FileIndex] entries across the project. */
    private fun forEachFileIndex(action: (FileIndex) -> Unit) {
        val fbi = FileBasedIndex.getInstance()
        val scope = GlobalSearchScope.projectScope(project)
        val allKeys = fbi.getAllKeys(VivFileBasedIndex.NAME, project)
        for (key in allKeys) {
            val values = fbi.getValues(VivFileBasedIndex.NAME, key, scope)
            for (data in values) {
                action(data.fileIndex)
            }
        }
    }

    /** Collects all [FileIndex] entries across the project into a list. */
    private fun allFileIndices(): List<FileIndex> {
        val result = mutableListOf<FileIndex>()
        forEachFileIndex { result.add(it) }
        return result
    }

    // ========================================================================
    // Construct queries
    // ========================================================================

    /** Returns the construct whose body contains [offset], or null. */
    fun getConstructAt(file: VirtualFile, offset: Int): ConstructInfo? {
        return getFileIndexForFile(file)?.constructs
            ?.filter { offset >= it.headerOffset && offset <= it.bodyEnd }
            ?.maxByOrNull { it.headerOffset }
    }

    /** Looks up a construct by exact type and name across the entire project. */
    fun getConstruct(type: ConstructType, name: String): ConstructInfo? {
        val fbi = FileBasedIndex.getInstance()
        val scope = GlobalSearchScope.projectScope(project)
        val allKeys = fbi.getAllKeys(VivFileBasedIndex.NAME, project)
        for (key in allKeys) {
            val values = fbi.getValues(VivFileBasedIndex.NAME, key, scope)
            for (data in values) {
                val found = data.fileIndex.constructs.find { it.type == type && it.name == name }
                if (found != null) return found
            }
        }
        return null
    }

    /** Returns all constructs with the given name (possibly different types). */
    fun getConstructsByName(name: String): List<ConstructInfo> {
        val result = mutableListOf<ConstructInfo>()
        forEachFileIndex { idx ->
            result.addAll(idx.constructs.filter { it.name == name })
        }
        return result
    }

    /** Returns every construct across the entire project. */
    fun getAllConstructs(): List<ConstructInfo> {
        val result = mutableListOf<ConstructInfo>()
        forEachFileIndex { idx -> result.addAll(idx.constructs) }
        return result
    }

    /** Returns all constructs of a specific type across the project. */
    fun getAllConstructsOfType(type: ConstructType): List<ConstructInfo> {
        val result = mutableListOf<ConstructInfo>()
        forEachFileIndex { idx ->
            result.addAll(idx.constructs.filter { it.type == type })
        }
        return result
    }

    // ========================================================================
    // Role queries (with inheritance resolution)
    // ========================================================================

    /**
     * Resolves a role by name in the given construct, walking the parent chain
     * if the role is inherited. Returns the defining construct and the role info,
     * or null if the role is not found anywhere in the chain.
     *
     * When [isSymbol] is non-null, matches are filtered to roles whose [RoleInfo.isSymbol]
     * flag matches, distinguishing `@thing` (character) from `&thing` (symbol).
     */
    @JvmOverloads
    fun resolveRole(
        construct: ConstructInfo, roleName: String, isSymbol: Boolean? = null
    ): Pair<ConstructInfo, RoleInfo>? {
        val visited = mutableSetOf<String>()
        return resolveRoleInternal(construct, roleName, isSymbol, visited)
    }

    private fun resolveRoleInternal(
        construct: ConstructInfo,
        roleName: String,
        isSymbol: Boolean?,
        visited: MutableSet<String>,
    ): Pair<ConstructInfo, RoleInfo>? {
        if (!visited.add(construct.key)) return null
        val role = construct.roles.find { matchesRole(it, roleName, isSymbol) }
        if (role != null) return construct to role
        // For sifting patterns, also check action-variable roles
        val actionRole = construct.actionRoles.find { matchesRole(it, roleName, isSymbol) }
        if (actionRole != null) return construct to actionRole
        if (construct.parent != null && construct.type == ConstructType.ACTION) {
            val parent = getConstruct(ConstructType.ACTION, construct.parent) ?: return null
            return resolveRoleInternal(parent, roleName, isSymbol, visited)
        }
        return null
    }

    private fun matchesRole(role: RoleInfo, roleName: String, isSymbol: Boolean?): Boolean {
        if (role.name != roleName && role.fullName != roleName) return false
        if (isSymbol != null && role.isSymbol != isSymbol) return false
        return true
    }

    /**
     * Returns all roles for a construct, including inherited roles from parents.
     * Own roles take precedence — inherited roles with the same name are excluded.
     */
    fun getAllRoles(construct: ConstructInfo): List<RoleInfo> {
        val roles = construct.roles.toMutableList()
        // For sifting patterns, include action-variable roles
        for (ar in construct.actionRoles) {
            roles.add(ar)
        }
        val seen = roles.map { it.name }.toMutableSet()
        val visited = mutableSetOf(construct.key)
        var current = construct
        while (current.parent != null && current.type == ConstructType.ACTION) {
            val parent = getConstruct(ConstructType.ACTION, current.parent!!) ?: break
            if (!visited.add(parent.key)) break
            for (role in parent.roles) {
                if (seen.add(role.name)) roles.add(role)
            }
            current = parent
        }
        return roles
    }

    /**
     * Returns the full parent chain for a construct (excluding the construct itself).
     * Empty for non-actions or actions with no parent.
     */
    fun getParentChain(construct: ConstructInfo): List<ConstructInfo> {
        val chain = mutableListOf<ConstructInfo>()
        val visited = mutableSetOf(construct.key)
        var current = construct
        while (current.parent != null && current.type == ConstructType.ACTION) {
            val parent = getConstruct(ConstructType.ACTION, current.parent!!) ?: break
            if (!visited.add(parent.key)) break
            chain.add(parent)
            current = parent
        }
        return chain
    }

    // ========================================================================
    // File-wide identifier queries
    // ========================================================================

    /** All enum tokens (#NAME) across every .viv file in the project. */
    fun getAllEnumTokens(): Set<String> {
        val result = mutableSetOf<String>()
        forEachFileIndex { result.addAll(it.enumTokens) }
        return result
    }

    /** All custom function names (~name) across every .viv file in the project. */
    fun getAllFunctionNames(): Set<String> {
        val result = mutableSetOf<String>()
        forEachFileIndex { result.addAll(it.functionNames) }
        return result
    }

    /** Returns all files whose index contains the given function name (e.g., `~myFunc`). */
    fun getFilesWithFunction(name: String): List<VirtualFile> {
        val result = mutableListOf<VirtualFile>()
        val fbi = FileBasedIndex.getInstance()
        val scope = GlobalSearchScope.projectScope(project)
        val allKeys = fbi.getAllKeys(VivFileBasedIndex.NAME, project)
        for (key in allKeys) {
            val values = fbi.getValues(VivFileBasedIndex.NAME, key, scope)
            for (data in values) {
                if (name in data.fileIndex.functionNames) {
                    // Reconstruct the VirtualFile from the key (URL)
                    val vFile = com.intellij.openapi.vfs.VirtualFileManager.getInstance().findFileByUrl(key)
                    if (vFile != null) result.add(vFile)
                }
            }
        }
        return result
    }

    /** All tag names (bare identifiers from `tags:` sections) across every .viv file. */
    fun getAllTagNames(): Set<String> {
        val result = mutableSetOf<String>()
        forEachFileIndex { result.addAll(it.tagNames) }
        return result
    }

    /** Returns all files whose index contains the given tag name. */
    fun getFilesWithTag(name: String): List<VirtualFile> {
        val result = mutableListOf<VirtualFile>()
        val fbi = FileBasedIndex.getInstance()
        val scope = GlobalSearchScope.projectScope(project)
        val allKeys = fbi.getAllKeys(VivFileBasedIndex.NAME, project)
        for (key in allKeys) {
            val values = fbi.getValues(VivFileBasedIndex.NAME, key, scope)
            for (data in values) {
                if (name in data.fileIndex.tagNames) {
                    val vFile = com.intellij.openapi.vfs.VirtualFileManager.getInstance().findFileByUrl(key)
                    if (vFile != null) result.add(vFile)
                }
            }
        }
        return result
    }

    /** Returns all files whose index contains the given enum token (e.g., "#HAPPY"). */
    fun getFilesWithEnum(name: String): List<VirtualFile> {
        val result = mutableListOf<VirtualFile>()
        val fbi = FileBasedIndex.getInstance()
        val scope = GlobalSearchScope.projectScope(project)
        val allKeys = fbi.getAllKeys(VivFileBasedIndex.NAME, project)
        for (key in allKeys) {
            val values = fbi.getValues(VivFileBasedIndex.NAME, key, scope)
            for (data in values) {
                if (name in data.fileIndex.enumTokens) {
                    val vFile = com.intellij.openapi.vfs.VirtualFileManager.getInstance().findFileByUrl(key)
                    if (vFile != null) result.add(vFile)
                }
            }
        }
        return result
    }

    /** Returns constructs that have the given tag in their construct-level tags field. */
    fun getConstructsWithTag(tagName: String): List<ConstructInfo> {
        val result = mutableListOf<ConstructInfo>()
        forEachFileIndex { idx ->
            result.addAll(idx.constructs.filter { tagName in it.tags })
        }
        return result
    }

    /** Returns all constructs defined in the given file. */
    fun getConstructsInFile(file: VirtualFile): List<ConstructInfo> {
        return getFileIndexForFile(file)?.constructs ?: emptyList()
    }

    // ========================================================================
    // Include queries
    // ========================================================================

    /** Returns include statements for a specific file. */
    fun getIncludes(file: VirtualFile): List<IncludeInfo> {
        return getFileIndexForFile(file)?.includes ?: emptyList()
    }

    // ========================================================================
    // Diagnostics
    // ========================================================================

    /** Returns constructs that share the same type:name key (duplicates). */
    fun getDuplicateConstructs(): Map<String, List<ConstructInfo>> {
        val allConstructs = mutableListOf<ConstructInfo>()
        forEachFileIndex { idx ->
            allConstructs.addAll(idx.constructs.filter { it.file.isValid })
        }
        return allConstructs
            .groupBy { it.key }
            .filter { it.value.size > 1 }
    }

    // ========================================================================
    // Raw access
    // ========================================================================

    /** Returns the raw file index, or null if the file hasn't been indexed. */
    fun getFileIndex(file: VirtualFile): FileIndex? {
        return getFileIndexForFile(file)
    }

    companion object {
        fun getInstance(project: Project): VivProjectIndex =
            project.getService(VivProjectIndex::class.java)
    }
}

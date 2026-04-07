package studio.sifty.viv

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.util.indexing.FileBasedIndex

/**
 * Unit tests for [VivFileIndexer] and [VivProjectIndex].
 * Each test configures a .viv source, indexes it, and asserts on the resulting model.
 */
class VivIndexerTest : BasePlatformTestCase() {

    // ========================================================================
    // Construct detection
    // ========================================================================

    fun testIndexesSimpleAction() {
        val index = index("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
        """)
        assertEquals(1, index.constructs.size)
        val c = index.constructs[0]
        assertEquals("greet", c.name)
        assertEquals(ConstructType.ACTION, c.type)
        assertNull(c.parent)
        assertFalse(c.isReserved)
        assertFalse(c.isTemplate)
    }

    fun testIndexesActionWithParent() {
        val index = index("""
            action greet from social-exchange:
                roles:
                    @greeter:
                        as: character, initiator
        """)
        val c = index.constructs[0]
        assertEquals("greet", c.name)
        assertEquals("social-exchange", c.parent)
    }

    fun testIndexesStubAction() {
        val index = index("""
            action idle from haha;
        """)
        assertEquals(1, index.constructs.size)
        val c = index.constructs[0]
        assertEquals("idle", c.name)
        assertEquals("haha", c.parent)
        assertTrue(c.roles.isEmpty())
        assertTrue(c.scratchVars.isEmpty())
    }

    fun testIndexesReservedAction() {
        val index = index("""
            reserved action system-tick from haha;
        """)
        val c = index.constructs[0]
        assertTrue(c.isReserved)
        assertFalse(c.isTemplate)
        assertEquals("system-tick", c.name)
    }

    fun testIndexesTemplateAction() {
        val index = index("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator
                    @recipient:
                        as: character, recipient
        """)
        val c = index.constructs[0]
        assertTrue(c.isTemplate)
        assertFalse(c.isReserved)
        assertEquals("social-exchange", c.name)
    }

    fun testIndexesAllConstructTypes() {
        val index = index("""
            action greet:
                roles:
                    @a:
                        as: character
            plan wave:
                roles:
                    @b:
                        as: character
                phases:
                    >only:
                        succeed;
            action-selector pick:
                target randomly:
                    greet;
            plan-selector choose:
                target randomly:
                    wave;
            query find-stuff:
                roles:
                    @c:
                        as: character
            pattern love-triangle:
                roles:
                    @d:
                        as: character
            trope forbidden-love:
                roles:
                    @e:
                        as: character
        """)
        assertEquals(7, index.constructs.size)
        assertEquals(ConstructType.ACTION, index.constructs[0].type)
        assertEquals(ConstructType.PLAN, index.constructs[1].type)
        assertEquals(ConstructType.ACTION_SELECTOR, index.constructs[2].type)
        assertEquals(ConstructType.PLAN_SELECTOR, index.constructs[3].type)
        assertEquals(ConstructType.QUERY, index.constructs[4].type)
        assertEquals(ConstructType.PATTERN, index.constructs[5].type)
        assertEquals(ConstructType.TROPE, index.constructs[6].type)
    }

    fun testIndexesMultipleConstructs() {
        val index = index("""
            action first:
                roles:
                    @a:
                        as: character

            action second:
                roles:
                    @b:
                        as: character
        """)
        assertEquals(2, index.constructs.size)
        assertEquals("first", index.constructs[0].name)
        assertEquals("second", index.constructs[1].name)
    }

    // ========================================================================
    // Construct boundaries
    // ========================================================================

    fun testConstructBoundariesAreCorrect() {
        val source = """
            action first:
                roles:
                    @a:
                        as: character

            action second:
                roles:
                    @b:
                        as: character
        """.trimIndent()
        val index = indexRaw(source)
        val first = index.constructs[0]
        val second = index.constructs[1]

        // first.bodyEnd should equal second.headerOffset
        assertEquals(second.headerOffset, first.bodyEnd)

        // second.bodyEnd should equal text length
        assertEquals(source.length, second.bodyEnd)

        // The block for "first" should not contain "second"
        val firstBlock = source.substring(first.headerOffset, first.bodyEnd)
        assertTrue(firstBlock.contains("@a"))
        assertFalse(firstBlock.contains("@b"))
    }

    // ========================================================================
    // Name offset
    // ========================================================================

    fun testNameOffsetIsAccurate() {
        val source = "action greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        val c = index.constructs[0]
        assertEquals("greet", source.substring(c.nameOffset, c.nameOffset + c.name.length))
    }

    fun testNameOffsetWithModifier() {
        val source = "reserved action system-tick from haha;\n"
        val index = indexRaw(source)
        val c = index.constructs[0]
        assertEquals("system-tick", source.substring(c.nameOffset, c.nameOffset + c.name.length))
    }

    fun testNameOffsetForActionSelector() {
        val source = "action-selector pick-response:\n    target randomly:\n        greet;\n"
        val index = indexRaw(source)
        val c = index.constructs[0]
        assertEquals("pick-response", source.substring(c.nameOffset, c.nameOffset + c.name.length))
    }

    // ========================================================================
    // Roles
    // ========================================================================

    fun testIndexesRoles() {
        val index = index("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                    @target:
                        as: character, recipient
        """)
        val roles = index.constructs[0].roles
        assertEquals(2, roles.size)

        assertEquals("greeter", roles[0].name)
        assertEquals("@greeter", roles[0].fullName)
        assertFalse(roles[0].isGroup)
        assertFalse(roles[0].isSymbol)
        assertEquals(listOf("character", "initiator"), roles[0].labels)

        assertEquals("target", roles[1].name)
        assertEquals("@target", roles[1].fullName)
        assertEquals(listOf("character", "recipient"), roles[1].labels)
    }

    fun testIndexesGroupRole() {
        val index = index("""
            action rally:
                roles:
                    @followers*:
                        as: character, recipient
        """)
        val role = index.constructs[0].roles[0]
        assertEquals("followers", role.name)
        assertEquals("@followers", role.fullName)
        assertTrue(role.isGroup)
    }

    fun testIndexesSymbolRole() {
        val index = index("""
            action place-item:
                roles:
                    &item:
                        as: symbol
        """)
        val role = index.constructs[0].roles[0]
        assertEquals("item", role.name)
        assertEquals("&item", role.fullName)
        assertTrue(role.isSymbol)
        assertEquals(listOf("symbol"), role.labels)
    }

    fun testIndexesJoinRoles() {
        val index = index("""
            action argue from social-exchange:
                join roles:
                    @bystanders*:
                        as: character, bystander
                    &topic:
                        as: symbol
        """)
        val roles = index.constructs[0].roles
        assertEquals(2, roles.size)
        assertEquals("bystanders", roles[0].name)
        assertTrue(roles[0].isGroup)
        assertEquals("topic", roles[1].name)
        assertTrue(roles[1].isSymbol)
    }

    fun testRolesNotConfusedWithSalienceRoles() {
        val index = index("""
            action confide:
                roles:
                    @speaker:
                        as: character, initiator
                    @listener:
                        as: character, recipient
                saliences:
                    roles:
                        @speaker: 10
                        @listener: 8
        """)
        // Should only find the construct-level roles, not the salience role entries
        val roles = index.constructs[0].roles
        assertEquals(2, roles.size)
        assertEquals("speaker", roles[0].name)
        assertEquals(listOf("character", "initiator"), roles[0].labels)
    }

    fun testRoleOffsetIsAccurate() {
        val source = "action greet:\n    roles:\n        @greeter:\n            as: character\n"
        val index = indexRaw(source)
        val role = index.constructs[0].roles[0]
        assertEquals("@greeter", source.substring(role.offset, role.offset + role.fullName.length))
    }

    fun testRolesWithNoLabels() {
        val index = index("""
            action greet:
                roles:
                    @actor:
                        is: @someone
        """)
        val role = index.constructs[0].roles[0]
        assertEquals("actor", role.name)
        assertTrue(role.labels.isEmpty())
    }

    // ========================================================================
    // Scratch variables
    // ========================================================================

    fun testIndexesScratchVars() {
        val index = index("""
            action accumulate:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@count = 0
                    ${'$'}@total = 100
        """)
        val vars = index.constructs[0].scratchVars
        assertEquals(2, vars.size)
        assertEquals("count", vars[0].name)
        assertEquals("\$@count", vars[0].fullName)
        assertEquals("total", vars[1].name)
        assertEquals("\$@total", vars[1].fullName)
    }

    fun testIndexesJoinScratchVars() {
        val index = index("""
            action argue from social-exchange:
                join scratch:
                    ${'$'}@intensity = 0
        """)
        val vars = index.constructs[0].scratchVars
        assertEquals(1, vars.size)
        assertEquals("intensity", vars[0].name)
    }

    fun testIndexesSymbolScratchVars() {
        val index = index("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}&flag = &marker
        """)
        val vars = index.constructs[0].scratchVars
        assertEquals(1, vars.size)
        assertEquals("flag", vars[0].name)
        assertEquals("\$&flag", vars[0].fullName)
    }

    // ========================================================================
    // Plan phases
    // ========================================================================

    fun testIndexesPlanPhases() {
        val index = index("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >reconnaissance:
                        succeed;
                    >assembly:
                        succeed;
                    >execution:
                        succeed;
        """)
        val phases = index.constructs[0].phases
        assertEquals(3, phases.size)
        assertEquals("reconnaissance", phases[0])
        assertEquals("assembly", phases[1])
        assertEquals("execution", phases[2])
    }

    fun testNonPlanHasNoPhases() {
        val index = index("""
            action greet:
                roles:
                    @actor:
                        as: character
        """)
        assertTrue(index.constructs[0].phases.isEmpty())
    }

    // ========================================================================
    // Includes
    // ========================================================================

    fun testIndexesDoubleQuotedInclude() {
        val source = "include \"base-actions.viv\"\n\naction greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        assertEquals(1, index.includes.size)
        assertEquals("base-actions.viv", index.includes[0].path)
        assertEquals(0, index.includes[0].offset)
        assertEquals("base-actions.viv", source.substring(
            index.includes[0].pathOffset,
            index.includes[0].pathOffset + index.includes[0].path.length
        ))
    }

    fun testIndexesSingleQuotedInclude() {
        val source = "include 'my-tropes.viv'\n\naction greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        assertEquals(1, index.includes.size)
        assertEquals("my-tropes.viv", index.includes[0].path)
    }

    fun testIndexesMultipleIncludes() {
        val index = index("""
            include "a.viv"
            include 'b.viv'

            action greet:
                roles:
                    @x:
                        as: character
        """)
        assertEquals(2, index.includes.size)
        assertEquals("a.viv", index.includes[0].path)
        assertEquals("b.viv", index.includes[1].path)
    }

    fun testIncludeWithPath() {
        val index = index("""
            include "lib/actions/base.viv"

            action greet:
                roles:
                    @a:
                        as: character
        """)
        assertEquals("lib/actions/base.viv", index.includes[0].path)
    }

    // ========================================================================
    // Enum tokens
    // ========================================================================

    fun testCollectsEnumTokens() {
        val index = index("""
            action greet:
                importance: #MODERATE
                roles:
                    @actor:
                        as: character
                conditions:
                    @actor.mood == #HAPPY
                effects:
                    @actor.mood = #ELATED
        """)
        assertTrue(index.enumTokens.containsAll(setOf("#MODERATE", "#HAPPY", "#ELATED")))
    }

    fun testEnumTokensAreDeduped() {
        val index = index("""
            action greet:
                importance: #MODERATE
                roles:
                    @actor:
                        as: character
                conditions:
                    @actor.mood == #MODERATE
        """)
        // #MODERATE appears twice but should be in the set once
        assertEquals(1, index.enumTokens.count { it == "#MODERATE" })
    }

    // ========================================================================
    // Function names
    // ========================================================================

    fun testCollectsFunctionNames() {
        val index = index("""
            action greet:
                roles:
                    @actor:
                        as: character
                conditions:
                    ~is-friendly(@actor)
                    ~calculate-threat(@actor, @actor.enemies)
        """)
        assertTrue(index.functionNames.containsAll(setOf("~is-friendly", "~calculate-threat")))
    }

    // ========================================================================
    // Comment blocks
    // ========================================================================

    fun testExtractsCommentBlock() {
        val index = index("""
            // This is a greeting action
            // It models one character greeting another
            action greet:
                roles:
                    @actor:
                        as: character
        """)
        assertEquals("This is a greeting action\nIt models one character greeting another",
            index.constructs[0].comment)
    }

    fun testNoCommentReturnsNull() {
        val index = index("""
            action greet:
                roles:
                    @actor:
                        as: character
        """)
        assertNull(index.constructs[0].comment)
    }

    fun testCommentBlockSeparatedByBlankLine() {
        val source = "// Comment for greet\n\naction greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        // A blank line between comment and header stops collection — comment does NOT attach
        assertNull(index.constructs[0].comment)
    }

    fun testCommentBlockDoesNotCrossConstructs() {
        val source = "action first:\n    roles:\n        @a:\n            as: character\n\n// Comment for second\naction second:\n    roles:\n        @b:\n            as: character\n"
        val index = indexRaw(source)
        assertNull(index.constructs[0].comment)
        assertEquals("Comment for second", index.constructs[1].comment)
    }

    fun testSeparatorLinesNotPickedUp() {
        val source = "// --------------------------------------------------------------------------\n// Actions: stubs, templates, inheritance, reserved\n// --------------------------------------------------------------------------\n\naction stand-nervously from mansion-encounter;\n"
        val index = indexRaw(source)
        // Blank line between separator block and header stops collection
        assertNull(index.constructs[0].comment)
    }

    fun testCommentDirectlyAboveHeader() {
        val source = "// A simple greeting\naction greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        assertEquals("A simple greeting", index.constructs[0].comment)
    }

    // ========================================================================
    // Role comments
    // ========================================================================

    fun testRoleCommentExtracted() {
        val index = index("""
            action greet:
                roles:
                    // The person doing the greeting
                    @greeter:
                        as: character, initiator
                    @target:
                        as: character, recipient
        """)
        val roles = index.constructs[0].roles
        assertEquals("The person doing the greeting", roles[0].comment)
        assertNull(roles[1].comment)
    }

    fun testRoleCommentMultiLine() {
        val index = index("""
            action greet:
                roles:
                    // The primary actor
                    // who initiates the greeting
                    @greeter:
                        as: character, initiator
        """)
        assertEquals("The primary actor\nwho initiates the greeting",
            index.constructs[0].roles[0].comment)
    }

    fun testRoleCommentStopsAtBlankLine() {
        val index = index("""
            action greet:
                roles:
                    // Unrelated comment

                    // The greeter
                    @greeter:
                        as: character
        """)
        assertEquals("The greeter", index.constructs[0].roles[0].comment)
    }

    fun testRoleCommentNotPickedUpFromPreviousRole() {
        val index = index("""
            action greet:
                roles:
                    // The greeter
                    @greeter:
                        as: character, initiator
                    // The target
                    @target:
                        as: character, recipient
        """)
        val roles = index.constructs[0].roles
        assertEquals("The greeter", roles[0].comment)
        assertEquals("The target", roles[1].comment)
    }

    // ========================================================================
    // Project index: inheritance resolution
    // ========================================================================

    fun testResolveOwnRole() {
        configureMultiConstruct("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
        """)
        val idx = VivProjectIndex.getInstance(project)
        val construct = idx.getAllConstructs().find { it.name == "greet" }!!
        val resolved = idx.resolveRole(construct, "greeter")
        assertNotNull(resolved)
        assertEquals("greeter", resolved!!.second.name)
        assertEquals("greet", resolved.first.name)
    }

    fun testResolveInheritedRole() {
        configureMultiConstruct("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator
                    @recipient:
                        as: character, recipient

            action greet from social-exchange:
                join roles:
                    @audience*:
                        as: character, bystander
        """)
        val idx = VivProjectIndex.getInstance(project)

        val greet = idx.getAllConstructs().find { it.name == "greet" }!!

        // Own role
        val audience = idx.resolveRole(greet, "audience")
        assertNotNull(audience)
        assertEquals("greet", audience!!.first.name)

        // Inherited role
        val initiator = idx.resolveRole(greet, "initiator")
        assertNotNull(initiator)
        assertEquals("social-exchange", initiator!!.first.name)
        assertEquals(listOf("character", "initiator"), initiator.second.labels)
    }

    fun testGetAllRolesIncludesInherited() {
        configureMultiConstruct("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator
                    @recipient:
                        as: character, recipient

            action greet from social-exchange:
                join roles:
                    @audience*:
                        as: character, bystander
        """)
        val idx = VivProjectIndex.getInstance(project)

        val greet = idx.getAllConstructs().find { it.name == "greet" }!!
        val allRoles = idx.getAllRoles(greet)

        assertEquals(3, allRoles.size)
        val roleNames = allRoles.map { it.name }
        assertTrue(roleNames.containsAll(listOf("audience", "initiator", "recipient")))
    }

    fun testOwnRoleOverridesInherited() {
        configureMultiConstruct("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator
                    @recipient:
                        as: character, recipient

            action greet from social-exchange:
                join roles:
                    @initiator:
                        as: character, initiator, precast
        """)
        val idx = VivProjectIndex.getInstance(project)

        val greet = idx.getAllConstructs().find { it.name == "greet" }!!
        val allRoles = idx.getAllRoles(greet)

        // Own @initiator should override inherited, so only 2 total
        assertEquals(2, allRoles.size)
        val ownInitiator = allRoles.find { it.name == "initiator" }!!
        assertTrue(ownInitiator.labels.contains("precast"))
    }

    fun testGetParentChain() {
        configureMultiConstruct("""
            template action base:
                roles:
                    @actor:
                        as: character

            action middle from base:
                join roles:
                    @target:
                        as: character

            action leaf from middle:
                join roles:
                    @bystander:
                        as: character
        """)
        val idx = VivProjectIndex.getInstance(project)

        val leaf = idx.getAllConstructs().find { it.name == "leaf" }!!
        val chain = idx.getParentChain(leaf)

        assertEquals(2, chain.size)
        assertEquals("middle", chain[0].name)
        assertEquals("base", chain[1].name)
    }

    fun testInheritanceCycleDetection() {
        configureMultiConstruct("""
            action a from b:
                roles:
                    @x:
                        as: character

            action b from a:
                roles:
                    @y:
                        as: character
        """)
        val idx = VivProjectIndex.getInstance(project)

        val a = idx.getAllConstructs().find { it.name == "a" }!!
        // Should not infinite loop
        val chain = idx.getParentChain(a)
        assertTrue(chain.size <= 2)
    }

    // ========================================================================
    // Project index: construct queries
    // ========================================================================

    fun testGetConstructByTypeAndName() {
        configureMultiConstruct("""
            action greet:
                roles:
                    @a:
                        as: character

            plan greet:
                roles:
                    @b:
                        as: character
                phases:
                    >only:
                        succeed;
        """)
        val idx = VivProjectIndex.getInstance(project)


        val actionGreet = idx.getConstruct(ConstructType.ACTION, "greet")
        assertNotNull(actionGreet)
        assertEquals(ConstructType.ACTION, actionGreet!!.type)

        val planGreet = idx.getConstruct(ConstructType.PLAN, "greet")
        assertNotNull(planGreet)
        assertEquals(ConstructType.PLAN, planGreet!!.type)

        assertNull(idx.getConstruct(ConstructType.QUERY, "greet"))
    }

    fun testGetConstructAt() {
        val source = """
            action first:
                roles:
                    @a:
                        as: character

            action second:
                roles:
                    @b:
                        as: character
        """.trimIndent()
        myFixture.configureByText("test.viv", source)
        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)

        val file = myFixture.file.virtualFile

        val firstOffset = source.indexOf("@a")
        val first = idx.getConstructAt(file, firstOffset)
        assertNotNull(first)
        assertEquals("first", first!!.name)

        val secondOffset = source.indexOf("@b")
        val second = idx.getConstructAt(file, secondOffset)
        assertNotNull(second)
        assertEquals("second", second!!.name)
    }

    fun testDuplicateConstructDetection() {
        configureMultiConstruct("""
            action greet:
                roles:
                    @a:
                        as: character

            action greet:
                roles:
                    @b:
                        as: character
        """)
        val idx = VivProjectIndex.getInstance(project)

        val dupes = idx.getDuplicateConstructs()
        assertTrue(dupes.containsKey("action:greet"))
        assertEquals(2, dupes["action:greet"]!!.size)
    }

    // ========================================================================
    // Multi-construct role parsing (regression)
    // ========================================================================

    fun testRolesInSecondConstructViaHelper() {
        val index = index("""
            action first:
                roles:
                    @a:
                        as: character

            action second:
                roles:
                    @b:
                        as: character
        """)
        assertEquals("first.roles", 1, index.constructs[0].roles.size)
        assertEquals("second.roles: ${index.constructs[1].roles.map{it.name}}", 1, index.constructs[1].roles.size)
    }

    fun testRolesInSecondConstructWithBlankLine() {
        val index = index("""
            action first:
                roles:
                    @a:
                        as: character

            action second:
                roles:
                    @b:
                        as: character
        """)
        assertEquals(1, index.constructs[0].roles.size)
        assertEquals(1, index.constructs[1].roles.size)
        assertEquals("b", index.constructs[1].roles[0].name)
    }

    // ========================================================================
    // Edge cases
    // ========================================================================

    fun testEmptyFile() {
        val index = index("")
        assertTrue(index.constructs.isEmpty())
        assertTrue(index.includes.isEmpty())
        assertTrue(index.enumTokens.isEmpty())
        assertTrue(index.functionNames.isEmpty())
    }

    fun testFileWithOnlyIncludes() {
        val index = index("""
            include "a.viv"
            include "b.viv"
        """)
        assertTrue(index.constructs.isEmpty())
        assertEquals(2, index.includes.size)
    }

    fun testFileWithOnlyComments() {
        val index = index("""
            // This file is empty
            // Nothing to see here
        """)
        assertTrue(index.constructs.isEmpty())
    }

    fun testConstructWithNoBody() {
        val index = index("""
            action empty:
        """)
        assertEquals(1, index.constructs.size)
        assertTrue(index.constructs[0].roles.isEmpty())
    }

    fun testRoleNameSubstring() {
        // @a should not be confused with @actor
        val index = index("""
            action test:
                roles:
                    @a:
                        as: character
                    @actor:
                        as: character, initiator
        """)
        val roles = index.constructs[0].roles
        assertEquals(2, roles.size)
        assertEquals("a", roles[0].name)
        assertEquals("actor", roles[1].name)
    }

    fun testIdentifierWithHyphens() {
        val index = index("""
            action my-complex-action from base-parent:
                roles:
                    @first-actor:
                        as: character
        """)
        val c = index.constructs[0]
        assertEquals("my-complex-action", c.name)
        assertEquals("base-parent", c.parent)
        assertEquals("first-actor", c.roles[0].name)
    }

    // ========================================================================
    // Multi-file project index (coverage gap 7)
    // ========================================================================

    fun testMultiFileConstructAggregation() {
        myFixture.configureByText("a.viv", """
            action greet:
                roles:
                    @greeter:
                        as: character
        """.trimIndent())

        myFixture.configureByText("b.viv", """
            action wave:
                roles:
                    @waver:
                        as: character
        """.trimIndent())

        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)

        val all = idx.getAllConstructs()
        val names = all.map { it.name }.toSet()
        assertTrue("Should aggregate constructs from both files: got $names",
            names.contains("greet") && names.contains("wave"))
    }

    fun testMultiFileCrossFileInheritance() {
        myFixture.configureByText("parent.viv", """
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator
                    @recipient:
                        as: character, recipient
        """.trimIndent())

        myFixture.configureByText("child.viv", """
            action greet from social-exchange:
                join roles:
                    @audience*:
                        as: character, bystander
        """.trimIndent())

        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)

        val greet = idx.getAllConstructs().find { it.name == "greet" }!!
        val allRoles = idx.getAllRoles(greet)
        val roleNames = allRoles.map { it.name }
        assertEquals("Should have 3 roles (1 own + 2 inherited)", 3, allRoles.size)
        assertTrue("Should include inherited roles", roleNames.containsAll(listOf("audience", "initiator", "recipient")))
    }

    fun testMultiFileCrossFileParentChain() {
        myFixture.configureByText("base.viv", """
            template action base:
                roles:
                    @actor:
                        as: character
        """.trimIndent())

        myFixture.configureByText("leaf.viv", """
            action leaf from base:
                join roles:
                    @target:
                        as: character
        """.trimIndent())

        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)

        val leaf = idx.getAllConstructs().find { it.name == "leaf" }!!
        val chain = idx.getParentChain(leaf)
        assertEquals("Chain should have 1 parent", 1, chain.size)
        assertEquals("base", chain[0].name)
    }

    fun testMultiFileDuplicateDetection() {
        myFixture.configureByText("a.viv", """
            action greet:
                roles:
                    @a:
                        as: character
        """.trimIndent())

        myFixture.configureByText("b.viv", """
            action greet:
                roles:
                    @b:
                        as: character
        """.trimIndent())

        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)

        val dupes = idx.getDuplicateConstructs()
        assertTrue("Should detect cross-file duplicates", dupes.containsKey("action:greet"))
        assertEquals(2, dupes["action:greet"]!!.size)
    }

    fun testMultiFileConstructByTypeAndName() {
        myFixture.configureByText("actions.viv", """
            action greet:
                roles:
                    @a:
                        as: character
        """.trimIndent())

        myFixture.configureByText("plans.viv", """
            plan greet:
                roles:
                    @b:
                        as: character
                phases:
                    >only:
                        succeed;
        """.trimIndent())

        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)

        assertNotNull("Should find action greet", idx.getConstruct(ConstructType.ACTION, "greet"))
        assertNotNull("Should find plan greet", idx.getConstruct(ConstructType.PLAN, "greet"))
        assertEquals(ConstructType.ACTION, idx.getConstruct(ConstructType.ACTION, "greet")!!.type)
        assertEquals(ConstructType.PLAN, idx.getConstruct(ConstructType.PLAN, "greet")!!.type)
    }

    fun testMultiFileEnumTokenAggregation() {
        myFixture.configureByText("a.viv", """
            action greet:
                importance: #RARE
                roles:
                    @a:
                        as: character
        """.trimIndent())

        myFixture.configureByText("b.viv", """
            action wave:
                importance: #COMMON
                roles:
                    @b:
                        as: character
        """.trimIndent())

        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)

        val allEnums = idx.getAllEnumTokens()
        assertTrue("Should aggregate enums from both files", allEnums.containsAll(setOf("#RARE", "#COMMON")))
    }

    fun testMultiFileFunctionNameAggregation() {
        myFixture.configureByText("a.viv", """
            action greet:
                roles:
                    @a:
                        as: character
                conditions:
                    ~is-friendly(@a)
        """.trimIndent())

        myFixture.configureByText("b.viv", """
            action wave:
                roles:
                    @b:
                        as: character
                conditions:
                    ~is-nearby(@b)
        """.trimIndent())

        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)

        val allFuncs = idx.getAllFunctionNames()
        assertTrue("Should aggregate function names from both files",
            allFuncs.containsAll(setOf("~is-friendly", "~is-nearby")))
    }

    // ========================================================================
    // Adversarial edge cases (coverage gap 8)
    // ========================================================================

    fun testTabIndentedConstruct() {
        val source = "action greet:\n\troles:\n\t\t@greeter:\n\t\t\tas: character, initiator\n"
        val index = indexRaw(source)
        assertEquals(1, index.constructs.size)
        assertEquals("greet", index.constructs[0].name)
        assertEquals(1, index.constructs[0].roles.size)
        assertEquals("greeter", index.constructs[0].roles[0].name)
        assertEquals(listOf("character", "initiator"), index.constructs[0].roles[0].labels)
    }

    fun testDeepNestedPlanPhases() {
        val index = index("""
            plan deep-plan:
                roles:
                    @actor:
                        as: character
                phases:
                    >phase-one:
                        succeed;
                    >phase-two:
                        succeed;
                    >phase-three:
                        succeed;
        """)
        assertEquals(1, index.constructs.size)
        assertEquals(3, index.constructs[0].phases.size)
        assertEquals("phase-one", index.constructs[0].phases[0])
        assertEquals("phase-two", index.constructs[0].phases[1])
        assertEquals("phase-three", index.constructs[0].phases[2])
    }

    fun testRoleNameThatIsSubstringOfAnother() {
        // Ensure @a and @actor are both independently detected
        val source = "action test:\n    roles:\n        @a:\n            as: character\n        @actor:\n            as: character, initiator\n"
        val index = indexRaw(source)
        val roles = index.constructs[0].roles
        assertEquals(2, roles.size)
        assertEquals("a", roles[0].name)
        assertEquals("actor", roles[1].name)
        // Verify offsets are distinct
        assertFalse("Offsets should be distinct", roles[0].offset == roles[1].offset)
        // Verify the source at each offset matches
        assertEquals("@a", source.substring(roles[0].offset, roles[0].offset + roles[0].fullName.length))
        assertEquals("@actor", source.substring(roles[1].offset, roles[1].offset + roles[1].fullName.length))
    }

    fun testMaxLengthHyphenatedIdentifier() {
        val longName = "my-very-long-hyphenated-action-name-that-tests-limits"
        val index = index("""
            action $longName:
                roles:
                    @first-person-involved:
                        as: character
        """)
        assertEquals(longName, index.constructs[0].name)
        assertEquals("first-person-involved", index.constructs[0].roles[0].name)
    }

    fun testMultipleIncludesFollowedByConstructs() {
        val index = index("""
            include "base.viv"
            include "shared/common.viv"
            include 'tropes.viv'

            action greet:
                roles:
                    @actor:
                        as: character
        """)
        assertEquals(3, index.includes.size)
        assertEquals(1, index.constructs.size)
        assertEquals("greet", index.constructs[0].name)
    }

    fun testConstructWithAllSections() {
        val index = index("""
            action complex-action from base:
                roles:
                    @initiator:
                        as: character, initiator
                    @target:
                        as: character, recipient
                    &item:
                        as: symbol
                scratch:
                    ${'$'}@count = 0
                conditions:
                    @initiator.mood > 3
                    ~is-friendly(@initiator)
                effects:
                    @target.mood += 1
                    @initiator.karma += 1
                reactions:
                    queue action greet:
                        with:
                            @greeter: @initiator
                importance: #MODERATE
                gloss: "A complex test action"
        """)
        val c = index.constructs[0]
        assertEquals("complex-action", c.name)
        assertEquals("base", c.parent)
        assertEquals(3, c.roles.size)
        assertEquals(1, c.scratchVars.size)
        assertTrue(index.enumTokens.contains("#MODERATE"))
        assertTrue(index.functionNames.contains("~is-friendly"))
    }

    fun testStubConstructsInSequence() {
        val index = index("""
            action idle from base;
            action wait from base;
            action greet:
                roles:
                    @actor:
                        as: character
        """)
        assertEquals(3, index.constructs.size)
        assertEquals("idle", index.constructs[0].name)
        assertTrue("Stub should have no roles", index.constructs[0].roles.isEmpty())
        assertEquals("wait", index.constructs[1].name)
        assertTrue("Stub should have no roles", index.constructs[1].roles.isEmpty())
        assertEquals("greet", index.constructs[2].name)
        assertEquals(1, index.constructs[2].roles.size)
    }

    fun testReservedTemplateModifier() {
        // "reserved" and "template" are mutually exclusive in real Viv,
        // but the indexer should still handle a template modifier
        val index = index("""
            template action base-template:
                roles:
                    @actor:
                        as: character
        """)
        val c = index.constructs[0]
        assertTrue(c.isTemplate)
        assertFalse(c.isReserved)
        assertEquals("base-template", c.name)
    }

    fun testCommentAttachmentWithMultipleBlankLines() {
        // Blank lines between comment and header stop collection — comment does NOT attach
        val source = "// Comment for greet\n\n\naction greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        assertNull(index.constructs[0].comment)
    }

    fun testSymbolRoleIsNotGroup() {
        val index = index("""
            action test:
                roles:
                    &item:
                        as: symbol
        """)
        val role = index.constructs[0].roles[0]
        assertTrue(role.isSymbol)
        assertFalse(role.isGroup)
    }

    fun testGroupSymbolRole() {
        // Group symbol roles use &name*
        val index = index("""
            action test:
                roles:
                    &items*:
                        as: symbol
        """)
        val role = index.constructs[0].roles[0]
        assertEquals("items", role.name)
        assertEquals("&items", role.fullName)
        assertTrue(role.isSymbol)
        assertTrue(role.isGroup)
    }

    // ========================================================================
    // Adversarial edge cases: construct parsing
    // ========================================================================

    /** Edge case 1: Construct with NO body — just header + colon, nothing else. */
    fun testConstructWithEmptyBodyNoTrailingNewline() {
        val source = "action empty:"
        val index = indexRaw(source)
        assertEquals(1, index.constructs.size)
        val c = index.constructs[0]
        assertEquals("empty", c.name)
        assertTrue(c.roles.isEmpty())
        assertTrue(c.scratchVars.isEmpty())
        assertNull(c.gloss)
        assertNull(c.importance)
        assertTrue(c.tags.isEmpty())
    }

    /** Edge case 2: Construct with every possible section present. */
    fun testConstructWithEverySectionPresent() {
        val index = index("""
            action kitchen-sink from base-parent:
                roles:
                    @initiator:
                        as: character, initiator
                    @target:
                        as: character, recipient
                    &item:
                        as: symbol
                conditions:
                    @initiator.mood > 3
                    ~is-friendly(@initiator, @target)
                effects:
                    @target.mood += 2
                scratch:
                    ${'$'}@count = 0
                    ${'$'}@total = (@initiator.mood + @target.mood) / 2
                reactions:
                    queue action celebrate:
                        with:
                            @actor: @initiator
                saliences:
                    roles:
                        @initiator: 10
                        @target: 8
                associations:
                    roles:
                        @initiator: @target
                embargoes:
                    roles:
                        @initiator: 3
                tags: dramatic, intense, pivotal
                gloss: "A complex action that tests every section"
                importance: #CRITICAL
        """)
        val c = index.constructs[0]
        assertEquals("kitchen-sink", c.name)
        assertEquals("base-parent", c.parent)
        // roles: should only capture construct-level roles, not salience/association/embargo roles
        assertEquals(3, c.roles.size)
        assertEquals(2, c.scratchVars.size)
        assertEquals("A complex action that tests every section", c.gloss)
        assertEquals("#CRITICAL", c.importance)
        assertEquals(listOf("dramatic", "intense", "pivotal"), c.tags)
        assertTrue(index.enumTokens.contains("#CRITICAL"))
        assertTrue(index.functionNames.contains("~is-friendly"))
    }

    /** Edge case 3: Role with ALL body fields simultaneously. */
    fun testRoleWithAllBodyFields() {
        val index = index("""
            action full-role-test:
                roles:
                    @leader:
                        as: character, initiator
                        is: @someone
                    @follower:
                        as: character, recipient
                        from: ~getPool(@leader)
                        spawn: ~createCharacter(@leader)
                        renames: @old-follower
                        n: 2-5 [60%]
        """)
        val roles = index.constructs[0].roles
        assertEquals(2, roles.size)

        val leader = roles[0]
        assertEquals("leader", leader.name)
        assertEquals(listOf("character", "initiator"), leader.labels)
        assertEquals("is", leader.castingDirective)
        assertEquals("@someone", leader.castingExpression)

        val follower = roles[1]
        assertEquals("follower", follower.name)
        assertEquals("from", follower.castingDirective)
        assertEquals("~getPool(@leader)", follower.castingExpression)
        assertEquals("~createCharacter(@leader)", follower.spawnExpression)
        assertEquals("@old-follower", follower.renamesTarget)
        assertEquals("2-5 [60%]", follower.slotRange)
    }

    /** Edge case 4: Role n: field with various formats. */
    fun testRoleSlotRangeFormats() {
        val index = index("""
            action slot-test:
                roles:
                    @a:
                        as: character
                        n: 3
                    @b:
                        as: character
                        n: 0-5
                    @c:
                        as: character
                        n: 2-5 [~3]
                    @d:
                        as: character
                        n: 0-5 [60%]
        """)
        val roles = index.constructs[0].roles
        assertEquals(4, roles.size)
        assertEquals("3", roles[0].slotRange)
        assertEquals("0-5", roles[1].slotRange)
        assertEquals("2-5 [~3]", roles[2].slotRange)
        assertEquals("0-5 [60%]", roles[3].slotRange)
    }

    /** Edge case 5: Gloss with single quotes vs double quotes. */
    fun testGlossSingleQuotes() {
        val index = index("""
            action greet:
                roles:
                    @actor:
                        as: character
                gloss: 'A friendly greeting'
        """)
        assertEquals("A friendly greeting", index.constructs[0].gloss)
    }

    fun testGlossDoubleQuotes() {
        val index = index("""
            action greet:
                roles:
                    @actor:
                        as: character
                gloss: "A friendly greeting"
        """)
        assertEquals("A friendly greeting", index.constructs[0].gloss)
    }

    fun testGlossNoQuotes() {
        // Unquoted gloss is invalid Viv syntax (gloss: requires a string literal).
        // The PSI parser correctly returns null for unparseable gloss values.
        val index = index("""
            action greet:
                roles:
                    @actor:
                        as: character
                gloss: A friendly greeting
        """)
        assertNull(index.constructs[0].gloss)
    }

    /** Edge case 6: Comment immediately above header (no blank line) — should work. */
    fun testCommentImmediatelyAboveHeaderWorks() {
        val source = "// This action does greet\naction greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        assertEquals("This action does greet", index.constructs[0].comment)
    }

    /** Edge case 7: Comment with blank line before header — should return null. */
    fun testCommentWithBlankLineReturnsNull() {
        val source = "// Detached comment\n\naction greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        assertNull(index.constructs[0].comment)
    }

    /** Edge case 8: Construct at line 0 (no preceding lines) — should return null. */
    fun testConstructAtLine0ReturnsNullComment() {
        val source = "action greet:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        assertNull(index.constructs[0].comment)
    }

    /** Edge case 9: Role comment extraction — comment directly above @role: */
    fun testRoleCommentDirectlyAboveRole() {
        val index = index("""
            action greet:
                roles:
                    // The main greeter
                    @greeter:
                        as: character
                    // The target of the greeting
                    @target:
                        as: character
        """)
        assertEquals("The main greeter", index.constructs[0].roles[0].comment)
        assertEquals("The target of the greeting", index.constructs[0].roles[1].comment)
    }

    /** Edge case 10: Multiple constructs — body boundaries split correctly. */
    fun testMultipleConstructsBodiesDoNotOverlap() {
        val source = "action first:\n    roles:\n        @a:\n            as: character\n    scratch:\n        \$@x = 1\n\naction second:\n    roles:\n        @b:\n            as: character\n    scratch:\n        \$@y = 2\n"
        val index = indexRaw(source)
        assertEquals(2, index.constructs.size)
        val first = index.constructs[0]
        val second = index.constructs[1]
        // First construct should have @a and $@x, not @b or $@y
        assertEquals(1, first.roles.size)
        assertEquals("a", first.roles[0].name)
        assertEquals(1, first.scratchVars.size)
        assertEquals("x", first.scratchVars[0].name)
        // Second construct should have @b and $@y, not @a or $@x
        assertEquals(1, second.roles.size)
        assertEquals("b", second.roles[0].name)
        assertEquals(1, second.scratchVars.size)
        assertEquals("y", second.scratchVars[0].name)
    }

    /** Edge case 11: Construct name with hyphens. */
    fun testConstructNameWithHyphens() {
        val index = index("""
            action my-cool-action:
                roles:
                    @my-cool-role:
                        as: character
        """)
        assertEquals("my-cool-action", index.constructs[0].name)
        assertEquals("my-cool-role", index.constructs[0].roles[0].name)
    }

    /** Edge case 12: reserved template action — both modifiers simultaneously.
     *  The regex only captures one modifier, so this construct should be invisible. */
    fun testReservedTemplateActionIsNotCrash() {
        val source = "reserved template action dual-mod:\n    roles:\n        @a:\n            as: character\n"
        val index = indexRaw(source)
        // The regex can only capture one modifier. "reserved" is captured, then
        // the parser expects a type keyword but sees "template". The regex does
        // not match, so the construct is silently skipped.
        // This is acceptable behavior — just verify no crash.
        // If it IS parsed, check what we get.
        // (The interesting question is: does the regex engine backtrack and find
        // "template action" instead?)
        for (c in index.constructs) {
            // Whatever the parser does, it should not crash
            assertNotNull(c.name)
        }
    }

    /** Edge case 13: Tags with trailing commas, extra whitespace. */
    fun testTagsWithTrailingCommasAndWhitespace() {
        val index = index("""
            action test:
                roles:
                    @a:
                        as: character
                tags:  dramatic ,  intense ,
        """)
        val tags = index.constructs[0].tags
        assertTrue("Should contain 'dramatic': $tags", tags.contains("dramatic"))
        assertTrue("Should contain 'intense': $tags", tags.contains("intense"))
        assertEquals("Should have exactly 2 tags: $tags", 2, tags.size)
    }

    /** Edge case 14: Query predicate — field, operator, and values. */
    fun testQueryPredicateBasic() {
        val index = index("""
            query find-greetings:
                action:
                    any: greet, wave
        """)
        val c = index.constructs[0]
        assertEquals(ConstructType.QUERY, c.type)
        assertEquals(1, c.predicates.size)
        val pred = c.predicates[0]
        assertEquals("action", pred.field)
        assertEquals("any", pred.operator)
        assertEquals(listOf("greet", "wave"), pred.values)
    }

    /** Edge case 15: Query predicate with >= operator and enum value. */
    fun testQueryPredicateGeOperatorWithEnum() {
        val index = index("""
            query find-important:
                importance:
                    >=: #MODERATE
        """)
        val c = index.constructs[0]
        assertEquals(1, c.predicates.size)
        val pred = c.predicates[0]
        assertEquals("importance", pred.field)
        assertEquals(">=", pred.operator)
        assertEquals(listOf("#MODERATE"), pred.values)
    }

    /** Edge case 15b: Query predicate with importance: as the field.
     *  "importance" is in the knownSections set, so it's excluded from
     *  predicate parsing. This tests whether that's a bug or intentional. */
    fun testQueryPredicateImportanceFieldIsExcluded() {
        val index = index("""
            query find-important:
                importance:
                    >=: #MODERATE
        """)
        val c = index.constructs[0]
        // importance is in knownSections, so this predicate should be LOST.
        // This is arguably a bug: in a query, "importance:" is a predicate field,
        // not the construct-level importance metadata.
        // Record what actually happens:
        val predicateCount = c.predicates.size
        val importance = c.importance
        // If importance: is on its own line with no value, extractImportance won't match either.
        // So both paths lose the data.
        // This assertion documents the behavior:
        assertEquals("importance predicate should be parsed", 1, predicateCount)
    }

    /** Edge case 16: Multiple predicates in one query using valid Viv query fields. */
    fun testQueryMultiplePredicates() {
        val index = index("""
            query complex-query:
                action:
                    any: greet, wave, argue
                tags:
                    all: dramatic, intense
                location:
                    none: @dungeon
        """)
        val preds = index.constructs[0].predicates
        assertEquals(3, preds.size)
        assertEquals("action", preds[0].field)
        assertEquals("any", preds[0].operator)
        assertEquals(listOf("greet", "wave", "argue"), preds[0].values)
        assertEquals("tags", preds[1].field)
        assertEquals("all", preds[1].operator)
        assertEquals(listOf("dramatic", "intense"), preds[1].values)
        assertEquals("location", preds[2].field)
        assertEquals("none", preds[2].operator)
        assertEquals(listOf("@dungeon"), preds[2].values)
    }

    /** Edge case 17: Sifting pattern with both roles: and actions: sections. */
    fun testSiftingPatternWithRolesAndActions() {
        val index = index("""
            pattern love-triangle:
                roles:
                    @lover-a:
                        as: character
                    @lover-b:
                        as: character
                    @rival:
                        as: character
                actions:
                    @flirt:
                        as: action
                    @betray:
                        as: action
        """)
        val c = index.constructs[0]
        assertEquals(ConstructType.PATTERN, c.type)
        assertEquals(3, c.roles.size)
        assertEquals("lover-a", c.roles[0].name)
        assertEquals("lover-b", c.roles[1].name)
        assertEquals("rival", c.roles[2].name)
        assertEquals(2, c.actionRoles.size)
        assertEquals("flirt", c.actionRoles[0].name)
        assertEquals("betray", c.actionRoles[1].name)
    }

    /** Edge case 18: Plan phases — three phases in sequence. */
    fun testPlanThreePhases() {
        val index = index("""
            plan escape-plan:
                roles:
                    @escapee:
                        as: character
                phases:
                    >gather:
                        succeed;
                    >confront:
                        succeed;
                    >escape:
                        succeed;
        """)
        val phases = index.constructs[0].phases
        assertEquals(3, phases.size)
        assertEquals("gather", phases[0])
        assertEquals("confront", phases[1])
        assertEquals("escape", phases[2])
    }

    /** Edge case 19: Scratch variable with complex initial value expression. */
    fun testScratchVarComplexInitialValue() {
        val index = index("""
            action test:
                roles:
                    @a:
                        as: character
                    @b:
                        as: character
                scratch:
                    ${'$'}@x = (@a.health + @b.mood) / 2
        """)
        val vars = index.constructs[0].scratchVars
        assertEquals(1, vars.size)
        assertEquals("x", vars[0].name)
        assertEquals("(@a.health + @b.mood) / 2", vars[0].initialValue)
    }

    /** Edge case 20: FileBasedIndex returns consistent results on repeated queries. */
    fun testConsistentResultsOnRepeatedQuery() {
        val source = "action greet:\n    roles:\n        @a:\n            as: character\n"
        myFixture.configureByText("test.viv", source)
        ensureIndexUpToDate()
        val idx = VivProjectIndex.getInstance(project)
        val vFile = myFixture.file.virtualFile
        val first = idx.getFileIndex(vFile)
        val second = idx.getFileIndex(vFile)
        // Both should return non-null and have the same construct count
        assertNotNull(first)
        assertNotNull(second)
        assertEquals(first!!.constructs.size, second!!.constructs.size)
        assertEquals(first.constructs[0].name, second.constructs[0].name)
    }

    /** Edge case 21: File with no constructs — just comments and blank lines. */
    fun testFileWithOnlyCommentsAndBlankLines() {
        val index = index("""
            // This is a comment
            // Another comment

            // Yet another comment
        """)
        assertTrue(index.constructs.isEmpty())
        assertTrue(index.includes.isEmpty())
        assertTrue(index.enumTokens.isEmpty())
        assertTrue(index.functionNames.isEmpty())
    }

    /** Edge case 22: File with only include statements. */
    fun testFileWithOnlyIncludeStatements() {
        val index = index("""
            include "actions/base.viv"
            include 'shared/common.viv'
            include "tropes/romance.viv"
        """)
        assertTrue(index.constructs.isEmpty())
        assertEquals(3, index.includes.size)
        assertEquals("actions/base.viv", index.includes[0].path)
        assertEquals("shared/common.viv", index.includes[1].path)
        assertEquals("tropes/romance.viv", index.includes[2].path)
    }

    /** Edge case 23: Stub construct — should have no roles/scratch parsed. */
    fun testStubConstructHasNoRolesOrScratch() {
        val index = index("""
            action greet from parent;
        """)
        val c = index.constructs[0]
        assertEquals("greet", c.name)
        assertEquals("parent", c.parent)
        assertTrue(c.isStub)
        assertTrue(c.roles.isEmpty())
        assertTrue(c.scratchVars.isEmpty())
        assertTrue(c.phases.isEmpty())
        assertNull(c.gloss)
        assertNull(c.importance)
        assertTrue(c.tags.isEmpty())
    }

    /** Edge case 24: Deeply nested indentation — roles at 8+ spaces. */
    fun testDeeplyIndentedConstruct() {
        val source = "        action deep:\n            roles:\n                @actor:\n                    as: character\n            scratch:\n                \$@x = 42\n"
        val index = indexRaw(source)
        assertEquals(1, index.constructs.size)
        assertEquals("deep", index.constructs[0].name)
        assertEquals(1, index.constructs[0].roles.size)
        assertEquals("actor", index.constructs[0].roles[0].name)
        assertEquals(1, index.constructs[0].scratchVars.size)
        assertEquals("x", index.constructs[0].scratchVars[0].name)
    }

    /** Edge case 25: Role with from: casting directive containing complex expression. */
    fun testRoleFromComplexExpression() {
        val index = index("""
            action appoint:
                roles:
                    @leader:
                        as: character, initiator
                    @delegate:
                        as: character, recipient
                        from: ~getPool(@leader)
        """)
        val delegate = index.constructs[0].roles[1]
        assertEquals("from", delegate.castingDirective)
        assertEquals("~getPool(@leader)", delegate.castingExpression)
    }

    /** Regression: action-selector roles: section should not contain role defs
     *  (action-selectors use target: not roles:). Verify no crash. */
    fun testActionSelectorNoCrash() {
        val index = index("""
            action-selector pick-response:
                target randomly:
                    greet;
                    wave;
                    argue;
        """)
        assertEquals(1, index.constructs.size)
        assertEquals(ConstructType.ACTION_SELECTOR, index.constructs[0].type)
        assertTrue(index.constructs[0].roles.isEmpty())
    }

    /** Query with roles: section — should parse roles AND predicates independently. */
    fun testQueryWithRolesAndPredicates() {
        val index = index("""
            query find-social:
                roles:
                    @actor:
                        as: character
                action:
                    any: greet, argue, confide
        """)
        val c = index.constructs[0]
        assertEquals(1, c.roles.size)
        assertEquals("actor", c.roles[0].name)
        assertEquals(1, c.predicates.size)
        assertEquals("action", c.predicates[0].field)
    }

    /** Construct followed immediately by another (no blank line separator). */
    fun testConstructsWithNoBlankLineBetween() {
        val source = "action first:\n    roles:\n        @a:\n            as: character\naction second:\n    roles:\n        @b:\n            as: character\n"
        val index = indexRaw(source)
        assertEquals(2, index.constructs.size)
        assertEquals("first", index.constructs[0].name)
        assertEquals("second", index.constructs[1].name)
        assertEquals(1, index.constructs[0].roles.size)
        assertEquals("a", index.constructs[0].roles[0].name)
        assertEquals(1, index.constructs[1].roles.size)
        assertEquals("b", index.constructs[1].roles[0].name)
    }

    /** Enum tokens should not be captured from comments. */
    fun testEnumTokensInComments() {
        val index = index("""
            // This references #COMMENTED_ENUM
            action greet:
                roles:
                    @a:
                        as: character
                effects:
                    @a.mood = #REAL_ENUM
        """)
        assertTrue("Real enum should be captured", index.enumTokens.contains("#REAL_ENUM"))
        // PSI-based indexing correctly excludes enums inside comments
        val commentedEnumCaptured = index.enumTokens.contains("#COMMENTED_ENUM")
        assertFalse("Commented enum should NOT be captured (PSI is comment-aware)", commentedEnumCaptured)
    }

    /** Tags collection at file level (collectTagNames) vs construct level (extractConstructTags). */
    fun testTagsFileVsConstructLevel() {
        val index = index("""
            action first:
                roles:
                    @a:
                        as: character
                tags: alpha, beta

            action second:
                roles:
                    @b:
                        as: character
                tags: gamma, delta
        """)
        // File-level tags should have all four
        assertEquals(setOf("alpha", "beta", "gamma", "delta"), index.tagNames)
        // Construct-level tags should be scoped
        assertEquals(listOf("alpha", "beta"), index.constructs[0].tags)
        assertEquals(listOf("gamma", "delta"), index.constructs[1].tags)
    }

    /** Role with as: label containing trailing comment. */
    fun testRoleLabelsWithTrailingComment() {
        val index = index("""
            action test:
                roles:
                    @actor:
                        as: character, initiator // the main actor
        """)
        val labels = index.constructs[0].roles[0].labels
        assertEquals(listOf("character", "initiator"), labels)
    }

    /** Scratch var with trailing comment on initial value. */
    fun testScratchVarWithTrailingComment() {
        val index = index("""
            action test:
                roles:
                    @a:
                        as: character
                scratch:
                    ${'$'}@x = 42 // the answer
        """)
        assertEquals("42", index.constructs[0].scratchVars[0].initialValue)
    }

    /** Construct with only a gloss field and nothing else. */
    fun testConstructWithOnlyGloss() {
        val index = index("""
            action minimal:
                gloss: "Just a gloss, nothing else"
        """)
        assertEquals(1, index.constructs.size)
        assertEquals("Just a gloss, nothing else", index.constructs[0].gloss)
        assertTrue(index.constructs[0].roles.isEmpty())
    }

    /** Role is: directive with entity reference. */
    fun testRoleIsDirective() {
        val index = index("""
            action test:
                roles:
                    @actor:
                        as: character
                        is: @protagonist
        """)
        val role = index.constructs[0].roles[0]
        assertEquals("is", role.castingDirective)
        assertEquals("@protagonist", role.castingExpression)
    }

    /** Importance field with inline comment. */
    fun testImportanceWithInlineComment() {
        val index = index("""
            action test:
                roles:
                    @a:
                        as: character
                importance: #HIGH // very important
        """)
        assertEquals("#HIGH", index.constructs[0].importance)
    }

    /** Query with "join" in knownSections — ensure "join roles:" is not a predicate. */
    fun testQueryJoinRolesNotTreatedAsPredicate() {
        val index = index("""
            query find-stuff:
                roles:
                    @a:
                        as: character
                action:
                    any: greet
        """)
        // "roles" and "join" are in knownSections, so they should not appear as predicates
        val predFields = index.constructs[0].predicates.map { it.field }
        assertFalse("roles should not be a predicate field", predFields.contains("roles"))
        assertFalse("join should not be a predicate field", predFields.contains("join"))
        assertEquals(1, index.constructs[0].predicates.size)
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private fun index(source: String): FileIndex {
        myFixture.configureByText("test.viv", source.trimIndent())
        return VivFileIndexer.indexFile(myFixture.file as VivFile)
    }

    private fun indexRaw(source: String): FileIndex {
        myFixture.configureByText("test.viv", source)
        return VivFileIndexer.indexFile(myFixture.file as VivFile)
    }

    private fun configureMultiConstruct(source: String) {
        myFixture.configureByText("test.viv", source.trimIndent())
        ensureIndexUpToDate()
    }

    private fun ensureIndexUpToDate() {
        FileBasedIndex.getInstance().ensureUpToDate(VivFileBasedIndex.NAME, project, null)
    }
}

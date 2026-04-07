package studio.sifty.viv

import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import studio.sifty.viv.psi.VivTypes

/**
 * Tests for Diagnostics, Structure View, Code Folding, Breadcrumbs,
 * Inheritance Gutter Icons, and Hover Documentation.
 *
 * Sections 16.5-16.10 of the spec.
 */
class VivFeaturesTest : BasePlatformTestCase() {

    // ========================================================================
    // 16.5 Diagnostics via myFixture.doHighlighting()
    // ========================================================================

    // -- Undefined references (expect WARNING) --

    fun testDiagnosticUndefinedQueueAction() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                reactions:
                    queue action nonexistent:
                        with:
                            @greeter: @greeter
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Should flag undefined action 'nonexistent'",
            diagnostics.any { it.message.contains("nonexistent") })
    }

    fun testDiagnosticUndefinedQueuePlan() {
        configure("""
            action greet:
                roles:
                    @actor:
                        as: character
                reactions:
                    queue plan nonexistent-plan:
                        with:
                            @mastermind: @actor
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Should flag undefined plan 'nonexistent-plan'",
            diagnostics.any { it.message.contains("nonexistent-plan") })
    }

    fun testDiagnosticUndefinedFromParent() {
        configure("""
            action greet from nonexistent-parent:
                roles:
                    @actor:
                        as: character
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Should flag undefined 'from' reference",
            diagnostics.any { it.message.contains("nonexistent-parent") })
    }

    fun testDiagnosticUndefinedSearchQuery() {
        configure("""
            action look:
                roles:
                    @actor:
                        as: character
                effects:
                    search query ghost-query:
                        with:
                            @searcher: @actor
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Should flag undefined query 'ghost-query'",
            diagnostics.any { it.message.contains("ghost-query") })
    }

    fun testDiagnosticUndefinedSiftPattern() {
        configure("""
            action detect:
                roles:
                    @actor:
                        as: character
                conditions:
                    sift pattern ghost-pattern:
                        with:
                            @a: @actor
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Should flag undefined pattern 'ghost-pattern'",
            diagnostics.any { it.message.contains("ghost-pattern") })
    }

    fun testDiagnosticUndefinedFitTrope() {
        configure("""
            action scene:
                roles:
                    @actor:
                        as: character
                effects:
                    fit trope ghost-trope:
                        with:
                            @lover: @actor
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Should flag undefined trope 'ghost-trope'",
            diagnostics.any { it.message.contains("ghost-trope") })
    }

    // -- Valid references (expect NO warnings) --

    fun testNoDiagnosticValidQueueAction() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                reactions:
                    queue action greet:
                        with:
                            @greeter: @greeter
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Valid queue action should produce no diagnostics, got: ${diagnostics.map{it.message}}",
            diagnostics.isEmpty())
    }

    fun testNoDiagnosticValidQueuePlan() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >only:
                        queue plan heist:
                            with:
                                @mastermind: @mastermind
                        succeed;
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Valid queue plan should produce no diagnostics, got: ${diagnostics.map{it.message}}",
            diagnostics.isEmpty())
    }

    fun testNoDiagnosticValidFromParent() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character

            action greet from social-exchange:
                conditions:
                    @initiator.friendliness > 5
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Valid 'from' reference should produce no diagnostics, got: ${diagnostics.map{it.message}}",
            diagnostics.isEmpty())
    }

    fun testNoDiagnosticValidSearchQuery() {
        configure("""
            action look:
                roles:
                    @actor:
                        as: character
                effects:
                    search query find-stuff:
                        with:
                            @searcher: @actor

            query find-stuff:
                roles:
                    @searcher:
                        as: character
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Valid search query should produce no diagnostics, got: ${diagnostics.map{it.message}}",
            diagnostics.isEmpty())
    }

    fun testNoDiagnosticValidSiftPattern() {
        configure("""
            pattern love-triangle:
                roles:
                    @a:
                        as: character

            action detect:
                roles:
                    @actor:
                        as: character
                conditions:
                    sift pattern love-triangle:
                        with:
                            @a: @actor
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Valid sift pattern should produce no diagnostics, got: ${diagnostics.map{it.message}}",
            diagnostics.isEmpty())
    }

    fun testNoDiagnosticValidFitTrope() {
        configure("""
            trope forbidden-love:
                roles:
                    @lover:
                        as: character

            action scene:
                roles:
                    @actor:
                        as: character
                effects:
                    fit trope forbidden-love:
                        with:
                            @lover: @actor
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Valid fit trope should produce no diagnostics, got: ${diagnostics.map{it.message}}",
            diagnostics.isEmpty())
    }

    // -- Duplicate definitions --

    fun testDiagnosticDuplicateAction() {
        configure("""
            action greet:
                roles:
                    @a:
                        as: character

            action greet:
                roles:
                    @b:
                        as: character
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Should flag duplicate action 'greet'",
            diagnostics.any { it.message.contains("Duplicate") })
    }

    fun testDiagnosticDuplicatePlan() {
        configure("""
            plan heist:
                roles:
                    @a:
                        as: character
                phases:
                    >only:
                        succeed;

            plan heist:
                roles:
                    @b:
                        as: character
                phases:
                    >only:
                        succeed;
        """)
        val diagnostics = getDiagnostics()
        assertTrue("Should flag duplicate plan 'heist'",
            diagnostics.any { it.message.contains("Duplicate") })
    }

    // ========================================================================
    // 16.6 Structure View
    // ========================================================================

    fun testStructureViewShowsConstructs() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            plan wave:
                roles:
                    @waver:
                        as: character
                phases:
                    >only:
                        succeed;
        """)
        val model = buildStructureModel()
        val children = model.root.children
        assertEquals("Should show 2 constructs", 2, children.size)
    }

    fun testStructureViewShowsRoles() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                    @target:
                        as: character, recipient
        """)
        val model = buildStructureModel()
        val actionChildren = model.root.children[0].children
        assertEquals("Should show 2 roles", 2, actionChildren.size)
        val text = actionChildren[0].presentation.presentableText!!
        assertTrue("Role should include labels", text.contains("character"))
    }

    fun testStructureViewShowsScratchVars() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@count = 0
                    ${'$'}@total = 100
        """)
        val model = buildStructureModel()
        val children = model.root.children[0].children
        // 1 role + 2 scratch vars
        assertEquals("Should show 3 children (1 role + 2 vars)", 3, children.size)
    }

    fun testStructureViewShowsPlanPhases() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >reconnaissance:
                        succeed;
                    >execution:
                        succeed;
        """)
        val model = buildStructureModel()
        val children = model.root.children[0].children
        // 1 role + 2 phases
        assertEquals("Should show 3 children (1 role + 2 phases)", 3, children.size)
        val phaseText = children.last().presentation.presentableText!!
        assertTrue("Phase should show >name", phaseText.startsWith(">"))
    }

    fun testStructureViewShowsModifiers() {
        configure("""
            reserved action system-tick:
                roles:
                    @actor:
                        as: character
        """)
        val model = buildStructureModel()
        val text = model.root.children[0].presentation.presentableText!!
        assertTrue("Should show 'reserved': got '$text'", text.contains("reserved"))
    }

    fun testStructureViewShowsParent() {
        configure("""
            action greet from social-exchange:
                roles:
                    @greeter:
                        as: character
        """)
        val model = buildStructureModel()
        val text = model.root.children[0].presentation.presentableText!!
        assertTrue("Should show parent: got '$text'", text.contains("from social-exchange"))
    }

    fun testStructureViewEmptyFile() {
        configure("")
        val model = buildStructureModel()
        assertEquals("Empty file should have no children", 0, model.root.children.size)
    }

    // ========================================================================
    // 16.7 Code Folding via foldingModel after doHighlighting()
    // ========================================================================

    fun testFoldingConstructBody() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    @greeter.friendliness > 5
        """)
        myFixture.doHighlighting()
        val regions = myFixture.editor.foldingModel.allFoldRegions
        assertTrue("Should produce fold regions for construct body", regions.isNotEmpty())
    }

    fun testFoldingSectionBlock() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    @greeter.friendliness > 5
                effects:
                    @greeter.karma += 1
        """)
        myFixture.doHighlighting()
        val regions = myFixture.editor.foldingModel.allFoldRegions
        // Should have folds for the construct body AND for each section
        assertTrue("Should have multiple fold regions (body + sections)", regions.size >= 2)
    }

    fun testFoldingPlaceholderText() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    @greeter.friendliness > 5
        """)
        myFixture.doHighlighting()
        val regions = myFixture.editor.foldingModel.allFoldRegions
        for (region in regions) {
            assertEquals("Placeholder should be '...'", "...", region.placeholderText)
        }
    }

    fun testFoldingNotCollapsedByDefault() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    @greeter.friendliness > 5
        """)
        myFixture.doHighlighting()
        val regions = myFixture.editor.foldingModel.allFoldRegions
        for (region in regions) {
            assertTrue("Should not be collapsed by default", region.isExpanded)
        }
    }

    fun testFoldingMultipleConstructs() {
        configure("""
            action first:
                roles:
                    @a:
                        as: character
                conditions:
                    @a.x > 0

            action second:
                roles:
                    @b:
                        as: character
                effects:
                    @b.y += 1
        """)
        myFixture.doHighlighting()
        val regions = myFixture.editor.foldingModel.allFoldRegions
        assertTrue("Multiple constructs should produce multiple fold regions", regions.size >= 2)
    }

    // ========================================================================
    // 16.8 Breadcrumbs
    // ========================================================================

    fun testBreadcrumbsConstructName() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    @gree<caret>ter.friendliness > 5
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain 'action greet': got $chain",
            chain.any { it.contains("action greet") })
    }

    fun testBreadcrumbsSection() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    @gree<caret>ter.friendliness > 5
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain 'conditions': got $chain",
            chain.any { it == "conditions" })
    }

    fun testBreadcrumbsJoinSection() {
        configure("""
            action argue from social-exchange:
                join conditions:
                    @ini<caret>tiator.mood == 5
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain 'join conditions': got $chain",
            chain.any { it == "join conditions" })
    }

    fun testBreadcrumbsRoleInRolesSection() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, init<caret>iator
                    @target:
                        as: character, recipient
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain '@greeter': got $chain",
            chain.any { it == "@greeter" })
        assertTrue("Chain should contain 'roles': got $chain",
            chain.any { it == "roles" })
    }

    fun testBreadcrumbsPlanPhase() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >reconnaissance:
                        succeed<caret>;
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain '>reconnaissance': got $chain",
            chain.any { it == ">reconnaissance" })
    }

    fun testBreadcrumbsSecondConstruct() {
        configure("""
            action first:
                roles:
                    @a:
                        as: character

            action second:
                effects:
                    @b.mood<caret> += 1
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Should show 'action second': got $chain",
            chain.any { it.contains("action second") })
        assertFalse("Should not show 'action first': got $chain",
            chain.any { it.contains("action first") })
    }

    fun testBreadcrumbsOutsideConstruct() {
        configure("""
            <caret>
            action greet:
                roles:
                    @greeter:
                        as: character
        """)
        val chain = getBreadcrumbChain()
        assertEquals("Outside construct should only show filename", 1, chain.size)
        assertEquals("Should show filename", myFixture.file.name, chain.first())
    }

    fun testBreadcrumbsChainOrder() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, init<caret>iator
                    @target:
                        as: character, recipient
        """)
        val chain = getBreadcrumbChain()
        // Chain should be: filename, action greet, roles, @greeter (outermost to innermost)
        assertTrue("Chain should have at least 4 segments: got $chain", chain.size >= 4)
        assertEquals("First segment should be filename", myFixture.file.name, chain.first())
        assertTrue("Second segment should be the construct",
            chain[1].contains("action greet"))
        assertEquals("Third segment should be section", "roles", chain[2])
        assertEquals("Fourth segment should be role", "@greeter", chain[3])
    }

    // ========================================================================
    // 16.9 Inheritance Gutter Icons via myFixture.findAllGutters()
    // ========================================================================

    fun testInheritanceGutterIconPresent() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character

            action greet from social-exchange:
                conditions:
                    @initiator.friendliness > 5
        """)
        val gutters = myFixture.findAllGutters()
        val inheritanceMarker = gutters.find { it.tooltipText?.contains("Inherits from") == true }
        if (inheritanceMarker != null) {
            assertNotNull("Should have inheritance gutter icon", inheritanceMarker)
        } else {
            // Fallback: test line marker provider directly
            val provider = VivInheritanceLineMarkerProvider()
            val markers = mutableListOf<com.intellij.codeInsight.daemon.LineMarkerInfo<*>>()
            provider.collectSlowLineMarkers(listOf(myFixture.file), markers)
            assertTrue("Should produce inheritance markers", markers.isNotEmpty())
        }
    }

    fun testInheritanceGutterIconTooltip() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character

            action greet from social-exchange:
                conditions:
                    @initiator.friendliness > 5
        """)
        val provider = VivInheritanceLineMarkerProvider()
        val markers = mutableListOf<com.intellij.codeInsight.daemon.LineMarkerInfo<*>>()
        provider.collectSlowLineMarkers(listOf(myFixture.file), markers)
        assertEquals("Should produce exactly 1 marker", 1, markers.size)
        val tooltip = markers[0].lineMarkerTooltip
        assertNotNull("Marker should have a tooltip", tooltip)
        assertTrue("Tooltip should mention 'social-exchange': got '$tooltip'",
            tooltip!!.contains("social-exchange"))
    }

    fun testNoGutterIconForParentlessAction() {
        configure("""
            action standalone:
                roles:
                    @actor:
                        as: character
        """)
        val provider = VivInheritanceLineMarkerProvider()
        val markers = mutableListOf<com.intellij.codeInsight.daemon.LineMarkerInfo<*>>()
        provider.collectSlowLineMarkers(listOf(myFixture.file), markers)
        assertTrue("Parentless action should produce no markers", markers.isEmpty())
    }

    fun testInheritanceGutterIconDeepChain() {
        configure("""
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
        val provider = VivInheritanceLineMarkerProvider()
        val markers = mutableListOf<com.intellij.codeInsight.daemon.LineMarkerInfo<*>>()
        provider.collectSlowLineMarkers(listOf(myFixture.file), markers)
        assertTrue("Should produce markers for child constructs", markers.size >= 2)
        val leafMarker = markers.find { it.lineMarkerTooltip?.contains("chain") == true }
        assertNotNull("Leaf construct should have a chain tooltip", leafMarker)
    }

    // ========================================================================
    // 16.10 Hover Documentation
    // ========================================================================

    fun testHoverDocConstruct() {
        configure("""
            action gre<caret>et:
                roles:
                    @greeter:
                        as: character
        """)
        val provider = VivDocumentationProvider()
        val contextElement = myFixture.file.findElementAt(myFixture.caretOffset)
        val customElement = provider.getCustomDocumentationElement(
            myFixture.editor, myFixture.file, contextElement, myFixture.caretOffset
        )
        assertNotNull("Should return a custom element for construct", customElement)
        val doc = provider.generateDoc(customElement, contextElement)
        assertNotNull("Should generate documentation", doc)
        assertTrue("Doc should contain construct name: got '$doc'", doc!!.contains("greet"))
    }

    fun testHoverDocConstructWithComment() {
        configure("""
            // A friendly greeting
            action gre<caret>et:
                roles:
                    @greeter:
                        as: character
        """)
        val provider = VivDocumentationProvider()
        val contextElement = myFixture.file.findElementAt(myFixture.caretOffset)
        val customElement = provider.getCustomDocumentationElement(
            myFixture.editor, myFixture.file, contextElement, myFixture.caretOffset
        )
        assertNotNull("Should return a custom element", customElement)
        val doc = provider.generateDoc(customElement, contextElement)
        assertNotNull("Should generate documentation", doc)
        assertTrue("Doc should contain comment text: got '$doc'", doc!!.contains("friendly greeting"))
    }

    fun testHoverDocConstructWithParentChain() {
        configure("""
            template action base:
                roles:
                    @actor:
                        as: character

            action middle from base:
                join roles:
                    @target:
                        as: character

            action lea<caret>f from middle:
                join roles:
                    @bystander:
                        as: character
        """)
        val provider = VivDocumentationProvider()
        val contextElement = myFixture.file.findElementAt(myFixture.caretOffset)
        val customElement = provider.getCustomDocumentationElement(
            myFixture.editor, myFixture.file, contextElement, myFixture.caretOffset
        )
        assertNotNull("Should return a custom element", customElement)
        val doc = provider.generateDoc(customElement, contextElement)
        assertNotNull("Should generate documentation", doc)
        assertTrue("Doc should contain parent chain info: got '$doc'",
            doc!!.contains("middle") || doc.contains("Inherits"))
    }

    fun testHoverDocRole() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                conditions:
                    @gree<caret>ter.friendliness > 5
        """)
        val provider = VivDocumentationProvider()
        val contextElement = myFixture.file.findElementAt(myFixture.caretOffset)
        val customElement = provider.getCustomDocumentationElement(
            myFixture.editor, myFixture.file, contextElement, myFixture.caretOffset
        )
        assertNotNull("Should return a custom element for role", customElement)
        val doc = provider.generateDoc(customElement, contextElement)
        assertNotNull("Should generate documentation", doc)
        assertTrue("Doc should contain role name: got '$doc'", doc!!.contains("greeter"))
    }

    fun testHoverDocInheritedRole() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator

            action greet from social-exchange:
                conditions:
                    @initi<caret>ator.friendliness > 5
        """)
        val provider = VivDocumentationProvider()
        val contextElement = myFixture.file.findElementAt(myFixture.caretOffset)
        val customElement = provider.getCustomDocumentationElement(
            myFixture.editor, myFixture.file, contextElement, myFixture.caretOffset
        )
        assertNotNull("Should return a custom element for inherited role", customElement)
        val doc = provider.generateDoc(customElement, contextElement)
        assertNotNull("Should generate documentation", doc)
        assertTrue("Doc should indicate inheritance: got '$doc'",
            doc!!.contains("inherited") || doc.contains("social-exchange"))
    }

    fun testHoverDocScratchVar() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@count = 0
                effects:
                    ${'$'}@cou<caret>nt += 1
        """)
        val provider = VivDocumentationProvider()
        val contextElement = myFixture.file.findElementAt(myFixture.caretOffset)
        val customElement = provider.getCustomDocumentationElement(
            myFixture.editor, myFixture.file, contextElement, myFixture.caretOffset
        )
        assertNotNull("Should return a custom element for scratch var", customElement)
        val doc = provider.generateDoc(customElement, contextElement)
        assertNotNull("Should generate documentation", doc)
        assertTrue("Doc should contain scratch var info: got '$doc'",
            doc!!.contains("count") || doc.contains("Scratch"))
    }

    // ========================================================================
    // 16.10a Hover Documentation — Construct popups
    // ========================================================================

    fun testHoverDocActionContainsDefinitionBlock() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc for action", doc)
        assertTrue("Doc should contain definition block with class='definition': got '$doc'",
            doc!!.contains("definition"))
        assertTrue("Doc should contain 'action greet': got '$doc'",
            doc.contains("action greet"))
    }

    fun testHoverDocActionContainsRoles() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                    @target:
                        as: character, recipient
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should contain role 'greeter': got '$doc'", doc!!.contains("greeter"))
        assertTrue("Doc should contain role 'target': got '$doc'", doc.contains("target"))
        assertTrue("Doc should contain label 'initiator': got '$doc'", doc.contains("initiator"))
    }

    fun testHoverDocActionContainsComment() {
        configure("""
            // A friendly greeting between two people
            action greet:
                roles:
                    @greeter:
                        as: character
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should contain content block: got '$doc'", doc!!.contains("content"))
        assertTrue("Doc should contain comment text: got '$doc'", doc.contains("friendly greeting"))
    }

    fun testHoverDocActionInheritedRolesMarked() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character
            action greet from social-exchange:
                join roles:
                    @target:
                        as: character
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should show inherited role annotation '(from': got '$doc'",
            doc!!.contains("(from"))
    }

    fun testHoverDocActionShowsGloss() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                gloss: "A warm greeting"
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should show Gloss section: got '$doc'", doc!!.contains("Gloss:"))
        assertTrue("Doc should contain gloss text: got '$doc'", doc.contains("warm greeting"))
    }

    fun testHoverDocActionShowsTags() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                tags: social, friendly
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should show Tags section: got '$doc'", doc!!.contains("Tags:"))
        assertTrue("Doc should contain 'social': got '$doc'", doc.contains("social"))
        assertTrue("Doc should contain 'friendly': got '$doc'", doc.contains("friendly"))
    }

    fun testHoverDocActionShowsSectionCounts() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    @greeter.friendliness > 5
                effects:
                    @greeter.karma += 1
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should show Conditions count: got '$doc'", doc!!.contains("Conditions:"))
        assertTrue("Doc should show Effects count: got '$doc'", doc.contains("Effects:"))
    }

    fun testHoverDocActionShowsChildren() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character
            action greet from social-exchange:
                conditions:
                    @initiator.friendliness > 5
        """)
        val doc = getHoverDoc("social-exchange")
        assertNotNull("Should generate doc for parent", doc)
        assertTrue("Doc should show Children section with 'greet': got '$doc'",
            doc!!.contains("Children:") && doc.contains("greet"))
    }

    fun testHoverDocPlanShowsPhases() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >reconnaissance:
                        advance;
                    >execution:
                        succeed;
        """)
        val doc = getHoverDoc("heist")
        assertNotNull("Should generate doc for plan", doc)
        assertTrue("Doc should show Phases section: got '$doc'", doc!!.contains("Phases:"))
        assertTrue("Doc should contain 'reconnaissance': got '$doc'", doc.contains("reconnaissance"))
        assertTrue("Doc should contain 'execution': got '$doc'", doc.contains("execution"))
    }

    fun testHoverDocQueryShowsPredicates() {
        configure("""
            query find-fights:
                roles:
                    @searcher:
                        as: character
                action: any: fight, argue
        """)
        val doc = getHoverDoc("find-fights")
        assertNotNull("Should generate doc for query", doc)
        assertTrue("Doc should show Action predicate: got '$doc'", doc!!.contains("Action:"))
        assertTrue("Doc should contain 'any' operator: got '$doc'", doc.contains("any"))
    }

    fun testHoverDocSelectorShowsPolicy() {
        configure("""
            action-selector pick:
                target randomly:
                    greet;
                    farewell;
            action greet:
                roles:
                    @a:
                        as: character
            action farewell:
                roles:
                    @a:
                        as: character
        """)
        val doc = getHoverDoc("pick")
        assertNotNull("Should generate doc for selector", doc)
        assertTrue("Doc should show Policy section: got '$doc'", doc!!.contains("Policy:"))
        assertTrue("Doc should contain 'random': got '$doc'", doc.contains("random"))
        assertTrue("Doc should show Candidates: got '$doc'", doc.contains("Candidates:"))
    }

    // ========================================================================
    // 16.10b Hover Documentation — Role popups
    // ========================================================================

    fun testHoverDocRoleShowsLabels() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                conditions:
                    @gree<caret>ter.friendliness > 5
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for role", doc)
        assertTrue("Doc should contain definition block with labels: got '$doc'",
            doc!!.contains("character") && doc.contains("initiator"))
    }

    fun testHoverDocRoleShowsCastingDirective() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                    @location:
                        is: @greeter.location
                conditions:
                    @loc<caret>ation.size > 0
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for role", doc)
        assertTrue("Doc should contain Is: section: got '$doc'", doc!!.contains("Is:"))
    }

    fun testHoverDocRoleInheritedShowsSource() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator

            action greet from social-exchange:
                conditions:
                    @initi<caret>ator.friendliness > 5
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for inherited role", doc)
        assertTrue("Doc should show '(from' annotation: got '$doc'", doc!!.contains("(from"))
        assertTrue("Doc should reference parent construct: got '$doc'", doc.contains("social-exchange"))
    }

    fun testHoverDocRoleShowsComment() {
        configure("""
            action greet:
                roles:
                    // The person doing the greeting
                    @greeter:
                        as: character
                conditions:
                    @gree<caret>ter.friendliness > 5
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for role", doc)
        assertTrue("Doc should contain role comment: got '$doc'", doc!!.contains("person doing the greeting"))
    }

    fun testHoverDocRoleShowsInheritedBy() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character
            action greet from social-exchange:
                conditions:
                    @initiator.friendliness > 5
        """)
        // Hover on the role in the parent construct
        myFixture.configureByText("test.viv", """
            template action social-exchange:
                roles:
                    @init<caret>iator:
                        as: character
            action greet from social-exchange:
                conditions:
                    @initiator.friendliness > 5
        """.trimIndent())
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for role", doc)
        assertTrue("Doc should show Inherited by section: got '$doc'",
            doc!!.contains("Inherited by:") && doc.contains("greet"))
    }

    // ========================================================================
    // 16.10c Hover Documentation — Other identifiers
    // ========================================================================

    fun testHoverDocScratchVarShowsScopeAndNote() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@count = 0
                effects:
                    ${'$'}@cou<caret>nt += 1
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for scratch var", doc)
        assertTrue("Doc should contain 'scratch variable': got '$doc'", doc!!.contains("scratch variable"))
        assertTrue("Doc should show Scope section: got '$doc'", doc.contains("Scope:"))
    }

    fun testHoverDocLocalVarShowsScopeAndNote() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                effects:
                    loop @actor.items as _@item:
                        _@it<caret>em.weight += 1
                    end
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for local var", doc)
        assertTrue("Doc should contain 'local variable': got '$doc'", doc!!.contains("local variable"))
    }

    fun testHoverDocFunctionCall() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                effects:
                    @actor.mood = ~cal<caret>culate(@actor.karma)
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for function call", doc)
        assertTrue("Doc should contain 'Custom function': got '$doc'", doc!!.contains("Custom function"))
    }

    fun testHoverDocEnumToken() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                effects:
                    @actor.mood = #hap<caret>py
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for enum", doc)
        assertTrue("Doc should contain 'Enum value': got '$doc'", doc!!.contains("Enum value"))
    }

    fun testHoverDocTagName() {
        configure("""
            action greet:
                roles:
                    @actor:
                        as: character
                tags: soc<caret>ial
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for tag", doc)
        assertTrue("Doc should contain 'Used in': got '$doc'", doc!!.contains("Used in:"))
    }

    fun testHoverDocPlanPhase() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >reconnaiss<caret>ance:
                        advance;
                    >execution:
                        succeed;
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should generate doc for phase", doc)
        assertTrue("Doc should contain Position section: got '$doc'", doc!!.contains("Position:"))
        assertTrue("Doc should contain 'Plan:': got '$doc'", doc.contains("Plan:"))
        assertTrue("Doc should show next phase info: got '$doc'",
            doc.contains("Previous:") || doc.contains("Next:"))
    }

    // ========================================================================
    // 16.10d Hover Documentation — Cross-reference link formats
    // ========================================================================

    fun testHoverDocConstructLinkFormat() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character
            action greet from social-exchange:
                conditions:
                    @initiator.friendliness > 5
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should contain psi_element://construct: link: got '$doc'",
            doc!!.contains("psi_element://construct:"))
    }

    fun testHoverDocRoleLinkFormat() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                    @target:
                        as: character
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should contain psi_element://role: link: got '$doc'",
            doc!!.contains("psi_element://role:"))
    }

    fun testHoverDocFileLinkFormat() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
        """)
        val doc = getHoverDoc("greet")
        assertNotNull("Should generate doc", doc)
        assertTrue("Doc should contain psi_element://file: link: got '$doc'",
            doc!!.contains("psi_element://file:"))
    }

    // ========================================================================
    // 16.10e Hover Documentation — Keyword tooltips
    // ========================================================================

    fun testKeywordTooltipReserved() {
        configure("""
            reser<caret>ved action greet:
                roles:
                    @a:
                        as: character
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should show tooltip for 'reserved' keyword", doc)
        assertTrue("Tooltip should describe 'reserved': got '$doc'",
            doc!!.contains("reserved") || doc.contains("Marks this construct"))
    }

    fun testKeywordTooltipConditions() {
        configure("""
            action greet:
                roles:
                    @a:
                        as: character
                condit<caret>ions:
                    @a.mood > 0
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should show tooltip for 'conditions:' keyword", doc)
        assertTrue("Tooltip should describe conditions: got '$doc'",
            doc!!.contains("conditions") || doc.contains("evaluate to true"))
    }

    fun testKeywordTooltipActionRoleLabel() {
        configure("""
            action greet:
                roles:
                    @a:
                        as: charac<caret>ter
        """)
        val doc = getHoverDocAtCaret()
        assertNotNull("Should show tooltip for 'character' role label", doc)
        assertTrue("Tooltip should describe 'character' label: got '$doc'",
            doc!!.contains("character"))
    }

    // ========================================================================
    // 16.12 Syntax Highlighting — Token classification
    // ========================================================================

    fun testHighlightingReservedKeywords() {
        val highlighter = VivSyntaxHighlighter()
        val keywordTokens = listOf(
            VivTypes.IF_KW, VivTypes.ELIF_KW, VivTypes.ELSE_KW,
            VivTypes.END_KW, VivTypes.LOOP_KW, VivTypes.INCLUDE_KW,
        )
        for (token in keywordTokens) {
            val keys = highlighter.getTokenHighlights(token)
            assertTrue("Token $token should map to KEYWORD, got: ${keys.toList()}",
                keys.any { matchesKey(it, VivHighlightingColors.KEYWORD) })
        }
    }

    fun testHighlightingComments() {
        val highlighter = VivSyntaxHighlighter()
        val keys = highlighter.getTokenHighlights(VivTypes.LINE_COMMENT)
        assertTrue("LINE_COMMENT should map to COMMENT, got: ${keys.toList()}",
            keys.any { matchesKey(it, VivHighlightingColors.COMMENT) })
    }

    fun testHighlightingStrings() {
        val highlighter = VivSyntaxHighlighter()
        val stringTokens = listOf(
            VivTypes.TEMPLATE_STRING_START, VivTypes.TEMPLATE_STRING_END,
            VivTypes.TEMPLATE_STRING_PART,
        )
        for (token in stringTokens) {
            val keys = highlighter.getTokenHighlights(token)
            assertTrue("Token $token should map to STRING, got: ${keys.toList()}",
                keys.any { matchesKey(it, VivHighlightingColors.STRING) })
        }
    }

    fun testHighlightingNumbers() {
        val highlighter = VivSyntaxHighlighter()
        val keys = highlighter.getTokenHighlights(VivTypes.NUMBER)
        assertTrue("NUMBER should map to NUMBER color, got: ${keys.toList()}",
            keys.any { matchesKey(it, VivHighlightingColors.NUMBER) })
    }

    fun testHighlightingOperators() {
        val highlighter = VivSyntaxHighlighter()
        val operatorTokens = listOf(
            VivTypes.ARROW, VivTypes.EQ_EQ, VivTypes.EXCL_EQ,
            VivTypes.LT_EQ, VivTypes.GT_EQ, VivTypes.PLUS_EQ,
            VivTypes.MINUS_EQ, VivTypes.OR_OR, VivTypes.AND_AND,
            VivTypes.PLUS, VivTypes.MINUS, VivTypes.SLASH,
            VivTypes.EQ, VivTypes.GT, VivTypes.LT,
        )
        for (token in operatorTokens) {
            val keys = highlighter.getTokenHighlights(token)
            assertTrue("Token $token should map to KEYWORD (operator), got: ${keys.toList()}",
                keys.any { matchesKey(it, VivHighlightingColors.KEYWORD) })
        }
    }

    fun testHighlightingSigils() {
        val highlighter = VivSyntaxHighlighter()
        val sigilTokens = listOf(
            VivTypes.AT, VivTypes.AMP, VivTypes.DOLLAR,
            VivTypes.HASH, VivTypes.TILDE, VivTypes.STAR,
        )
        for (token in sigilTokens) {
            val keys = highlighter.getTokenHighlights(token)
            assertTrue("Token $token should map to KEYWORD (sigil), got: ${keys.toList()}",
                keys.any { matchesKey(it, VivHighlightingColors.KEYWORD) })
        }
    }

    fun testHighlightingBrackets() {
        val highlighter = VivSyntaxHighlighter()
        val bracketTokens = listOf(
            VivTypes.LBRACE, VivTypes.RBRACE,
            VivTypes.LBRACKET, VivTypes.RBRACKET,
        )
        for (token in bracketTokens) {
            val keys = highlighter.getTokenHighlights(token)
            assertTrue("Token $token should map to BRACKETS, got: ${keys.toList()}",
                keys.any { matchesKey(it, VivHighlightingColors.BRACKETS) })
        }
    }

    fun testHighlightingParentheses() {
        val highlighter = VivSyntaxHighlighter()
        val parenTokens = listOf(VivTypes.LPAREN, VivTypes.RPAREN)
        for (token in parenTokens) {
            val keys = highlighter.getTokenHighlights(token)
            assertTrue("Token $token should map to PARENTHESES, got: ${keys.toList()}",
                keys.any { matchesKey(it, VivHighlightingColors.PARENTHESES) })
        }
    }

    fun testHighlightingPunctuation() {
        val highlighter = VivSyntaxHighlighter()
        val dotKeys = highlighter.getTokenHighlights(VivTypes.DOT)
        assertTrue("DOT should map to PUNCTUATION, got: ${dotKeys.toList()}",
            dotKeys.any { matchesKey(it, VivHighlightingColors.PUNCTUATION) })
        val colonKeys = highlighter.getTokenHighlights(VivTypes.COLON)
        assertTrue("COLON should map to COLON, got: ${colonKeys.toList()}",
            colonKeys.any { matchesKey(it, VivHighlightingColors.COLON) })
        val commaKeys = highlighter.getTokenHighlights(VivTypes.COMMA)
        assertTrue("COMMA should map to COMMA, got: ${commaKeys.toList()}",
            commaKeys.any { matchesKey(it, VivHighlightingColors.COMMA) })
        val semiKeys = highlighter.getTokenHighlights(VivTypes.SEMICOLON)
        assertTrue("SEMICOLON should map to SEMICOLON, got: ${semiKeys.toList()}",
            semiKeys.any { matchesKey(it, VivHighlightingColors.SEMICOLON) })
    }

    fun testHighlightingIdentifiersGetNoColor() {
        val highlighter = VivSyntaxHighlighter()
        val keys = highlighter.getTokenHighlights(VivTypes.IDENTIFIER)
        assertTrue("IDENTIFIER should map to empty (handled by annotator), got: ${keys.toList()}",
            keys.isEmpty())
    }

    // ========================================================================
    // 16.13 Block Keyword Highlighting
    // ========================================================================

    fun testBlockMatchIfEnd() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    i<caret>f true:
                        @greeter.friendliness > 5
                    end
        """)
        val keywords = findBlockKeywordsAtCaret()
        assertNotNull("Should find block keywords for if", keywords)
        assertTrue("Should have at least 2 keywords (if + end), got ${keywords!!.size}",
            keywords.size >= 2)
        val texts = keywords.map { it.text }
        assertTrue("Should contain 'if': got $texts", texts.contains("if"))
        assertTrue("Should contain 'end': got $texts", texts.contains("end"))
    }

    fun testBlockMatchIfElifElseEnd() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    i<caret>f true:
                        @greeter.friendliness > 5
                    elif false:
                        @greeter.friendliness > 3
                    else:
                        @greeter.friendliness > 0
                    end
        """)
        val keywords = findBlockKeywordsAtCaret()
        assertNotNull("Should find block keywords", keywords)
        assertTrue("Should have 4 keywords (if + elif + else + end), got ${keywords!!.size}",
            keywords.size == 4)
        val texts = keywords.map { it.text }
        assertTrue("Should contain 'if': got $texts", texts.contains("if"))
        assertTrue("Should contain 'elif': got $texts", texts.contains("elif"))
        assertTrue("Should contain 'else': got $texts", texts.contains("else"))
        assertTrue("Should contain 'end': got $texts", texts.contains("end"))
    }

    fun testBlockMatchLoopEnd() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                effects:
                    loo<caret>p @greeter.friends as _@friend:
                        _@friend.mood += 1
                    end
        """)
        val keywords = findBlockKeywordsAtCaret()
        assertNotNull("Should find block keywords for loop", keywords)
        assertTrue("Should have 2 keywords (loop + end), got ${keywords!!.size}",
            keywords.size == 2)
        val texts = keywords.map { it.text }
        assertTrue("Should contain 'loop': got $texts", texts.contains("loop"))
        assertTrue("Should contain 'end': got $texts", texts.contains("end"))
    }

    fun testBlockMatchNestedBlocks() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    if true:
                        i<caret>f false:
                            @greeter.friendliness > 5
                        end
                    end
        """)
        val keywords = findBlockKeywordsAtCaret()
        assertNotNull("Should find block keywords for inner if", keywords)
        // Inner block should only have 2 keywords (inner if + inner end)
        assertTrue("Should have exactly 2 keywords for inner block, got ${keywords!!.size}",
            keywords.size == 2)
    }

    fun testBlockMatchPlanSucceedFailHighlightsPlanName() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >recon:
                        suc<caret>ceed;
        """)
        val targets = findPlanHighlightTargetsAtCaret()
        assertNotNull("Should find plan highlight targets for succeed", targets)
        assertTrue("Should have at least 2 targets (succeed + plan name), got ${targets!!.size}",
            targets.size >= 2)
        val texts = targets.map { it.text }
        assertTrue("Should contain plan name 'heist': got $texts", texts.contains("heist"))
        assertTrue("Should contain 'succeed': got $texts", texts.contains("succeed"))
    }

    fun testBlockMatchAdvanceHighlightsPhase() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >recon:
                        adv<caret>ance;
                    >execution:
                        succeed;
        """)
        val targets = findPlanHighlightTargetsAtCaret()
        assertNotNull("Should find plan highlight targets for advance", targets)
        assertTrue("Should have 2 targets (advance + phase name), got ${targets!!.size}",
            targets.size == 2)
        val texts = targets.map { it.text }
        assertTrue("Should contain 'advance': got $texts", texts.contains("advance"))
        assertTrue("Should contain phase name 'recon': got $texts", texts.contains("recon"))
    }

    fun testBlockMatchPhaseHighlightsControlKeywords() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >rec<caret>on:
                        advance;
                    >execution:
                        succeed;
        """)
        val targets = findPlanHighlightTargetsAtCaret()
        assertNotNull("Should find plan highlight targets for phase name", targets)
        assertTrue("Should have at least 2 targets, got ${targets!!.size}", targets.size >= 2)
        val texts = targets.map { it.text }
        assertTrue("Should contain phase name 'recon': got $texts", texts.contains("recon"))
        assertTrue("Should contain 'advance' keyword: got $texts", texts.contains("advance"))
    }

    // ========================================================================
    // 16.8a Breadcrumb Chain — Additional coverage
    // ========================================================================

    fun testBreadcrumbChainInEffects() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                effects:
                    @gree<caret>ter.karma += 1
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should have at least 3 segments: got $chain", chain.size >= 3)
        assertTrue("Chain should contain 'effects': got $chain",
            chain.any { it == "effects" })
        assertTrue("Chain should contain 'action greet': got $chain",
            chain.any { it.contains("action greet") })
    }

    fun testBreadcrumbChainInReaction() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                reactions:
                    queue action gre<caret>et:
                        with:
                            @greeter: @greeter
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain 'reactions': got $chain",
            chain.any { it == "reactions" })
        assertTrue("Chain should contain reaction target: got $chain",
            chain.any { it.contains("queue") })
    }

    fun testBreadcrumbChainInRole() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, init<caret>iator
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain 'roles': got $chain",
            chain.any { it == "roles" })
        assertTrue("Chain should contain '@greeter': got $chain",
            chain.any { it == "@greeter" })
    }

    fun testBreadcrumbChainInPlanPhase() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >reconnaissance:
                        succ<caret>eed;
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain 'plan heist': got $chain",
            chain.any { it.contains("plan heist") })
        assertTrue("Chain should contain 'phases': got $chain",
            chain.any { it == "phases" })
        assertTrue("Chain should contain '>reconnaissance': got $chain",
            chain.any { it == ">reconnaissance" })
    }

    fun testBreadcrumbChainInScratch() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@cou<caret>nt = 0
        """)
        val chain = getBreadcrumbChain()
        assertTrue("Chain should contain 'action test': got $chain",
            chain.any { it.contains("action test") })
        assertTrue("Chain should contain 'scratch': got $chain",
            chain.any { it == "scratch" })
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private fun configure(source: String) {
        myFixture.configureByText("test.viv", source.trimIndent())
    }

    private fun buildStructureModel(): com.intellij.ide.structureView.StructureViewModel {
        val builder = VivStructureViewFactory().getStructureViewBuilder(myFixture.file)
            as com.intellij.ide.structureView.TreeBasedStructureViewBuilder
        return builder.createStructureViewModel(myFixture.editor)
    }

    private fun getDiagnostics(): List<VivIndexDiagnosticAnnotator.Diagnostic> {
        val highlights = myFixture.doHighlighting()
        val warnings = highlights.filter { it.severity == HighlightSeverity.WARNING }
        return warnings.map {
            VivIndexDiagnosticAnnotator.Diagnostic(
                it.startOffset, it.endOffset - it.startOffset,
                it.description ?: "", HighlightSeverity.WARNING
            )
        }
    }

    /**
     * Walks up the PSI tree from the caret position, collecting breadcrumb
     * segments for every element accepted by [VivBreadcrumbsProvider].
     * Returns the chain from outermost (file) to innermost (deepest accepted ancestor).
     */
    private fun getBreadcrumbChain(): List<String> {
        val provider = VivBreadcrumbsProvider()
        val caretElement = myFixture.file.findElementAt(myFixture.caretOffset)
        val chain = mutableListOf<String>()
        var current: com.intellij.psi.PsiElement? = caretElement
        while (current != null) {
            if (provider.acceptElement(current)) {
                chain.add(provider.getElementInfo(current))
            }
            current = current.parent
        }
        chain.reverse()
        return chain
    }

    /**
     * Gets hover doc HTML for the construct with the given [name] by finding
     * its header via the PSI tree and calling [VivDocumentationProvider.generateDoc].
     */
    private fun getHoverDoc(name: String): String? {
        val provider = VivDocumentationProvider()
        // Walk all elements to find the construct header
        val elements = com.intellij.psi.util.PsiTreeUtil.findChildrenOfType(
            myFixture.file, com.intellij.psi.PsiElement::class.java
        )
        for (element in elements) {
            if (element.text == name) {
                // Walk up to find the header
                var current: com.intellij.psi.PsiElement? = element
                while (current != null && current !is com.intellij.psi.PsiFile) {
                    val doc = provider.generateDoc(current, element)
                    if (doc != null) return doc
                    current = current.parent
                }
            }
        }
        return null
    }

    /**
     * Gets hover doc HTML for the element at the caret position, using the
     * documentation provider's [getCustomDocumentationElement] resolution.
     */
    private fun getHoverDocAtCaret(): String? {
        val provider = VivDocumentationProvider()
        val contextElement = myFixture.file.findElementAt(myFixture.caretOffset)
        val customElement = provider.getCustomDocumentationElement(
            myFixture.editor, myFixture.file, contextElement, myFixture.caretOffset
        )
        if (customElement != null) {
            return provider.generateDoc(customElement, contextElement)
        }
        return null
    }

    /**
     * Finds block keywords (if/elif/else/end, loop/end) for the element at the
     * caret using [VivBlockMatchHighlighter]'s static [findBlockKeywords] method.
     */
    private fun findBlockKeywordsAtCaret(): List<com.intellij.psi.PsiElement>? {
        val element = myFixture.file.findElementAt(myFixture.caretOffset) ?: return null
        return VivBlockMatchHighlighter.findBlockKeywords(element)
    }

    /**
     * Finds plan control flow highlight targets (succeed/fail/advance vs. plan/phase name)
     * using [VivBlockMatchHighlighter]'s static [findPlanHighlightTargets] method.
     */
    private fun findPlanHighlightTargetsAtCaret(): List<com.intellij.psi.PsiElement>? {
        val element = myFixture.file.findElementAt(myFixture.caretOffset) ?: return null
        return VivBlockMatchHighlighter.findPlanHighlightTargets(element)
    }

    /**
     * Checks if [actual] is the same key as [expected] (by identity or by external name).
     */
    private fun matchesKey(actual: TextAttributesKey, expected: TextAttributesKey): Boolean {
        return actual == expected || actual.externalName == expected.externalName
    }
}

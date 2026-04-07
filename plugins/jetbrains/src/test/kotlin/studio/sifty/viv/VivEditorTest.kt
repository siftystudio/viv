package studio.sifty.viv

import com.intellij.codeInsight.completion.CompletionType
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.util.indexing.FileBasedIndex
import studio.sifty.viv.psi.*

/**
 * Tests for Go to Declaration (PsiReference.resolve), Declaration site detection,
 * Rename (PsiNamedElement), Completion, and Auto-closing/Indentation.
 *
 * Sections 16.1-16.4 and 16.11 of the spec.
 */
class VivEditorTest : BasePlatformTestCase() {

    // ========================================================================
    // 16.1 Go to Declaration via PsiReference.resolve()
    // ========================================================================

    // -- Construct references --

    fun testResolveQueueAction() {
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
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the action header", resolved)
        assertTrue("Should resolve to the name identifier in the header",
            resolved!!.text == "greet" || resolved.parent?.text?.contains("action greet") == true)
    }

    fun testResolveQueuePlan() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >only:
                        queue plan hei<caret>st:
                            with:
                                @mastermind: @mastermind
                        succeed;
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the plan header", resolved)
        assertResolvedTo(resolved!!, "heist", "testResolveQueuePlan")
    }

    fun testResolveQueueActionSelector() {
        configure("""
            action-selector pick:
                target randomly:
                    greet;

            action greet:
                roles:
                    @actor:
                        as: character
                reactions:
                    queue action-selector pi<caret>ck;
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the action-selector header", resolved)
        assertResolvedTo(resolved!!, "pick", "testResolveQueueActionSelector")
    }

    fun testResolveQueuePlanSelector() {
        configure("""
            plan-selector choose:
                target randomly:
                    heist;

            plan heist:
                roles:
                    @actor:
                        as: character
                phases:
                    >only:
                        queue plan-selector choo<caret>se;
                        succeed;
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the plan-selector header", resolved)
        assertResolvedTo(resolved!!, "choose", "testResolveQueuePlanSelector")
    }

    fun testResolveFromParent() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character

            action greet from social-exc<caret>hange:
                conditions:
                    @initiator.friendliness > 5
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the parent action header", resolved)
        assertTrue("Resolved element should contain 'social-exchange'",
            resolved!!.text == "social-exchange" || resolved.parent?.text?.contains("social-exchange") == true)
    }

    fun testResolveSearchQuery() {
        // Put query AFTER action to avoid parser greedily absorbing 'action' into query body
        configure("""
            action look:
                roles:
                    @actor:
                        as: character
                effects:
                    search query find-st<caret>uff:
                        with:
                            @searcher: @actor

            query find-stuff:
                roles:
                    @searcher:
                        as: character
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("SearchQuery: no PsiReference. Chain: ${psiChainAtCaret()}", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the query header", resolved)
        assertResolvedTo(resolved!!, "find-stuff", "testResolveSearchQuery")
    }

    fun testResolveSiftPattern() {
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
                    sift pattern love-tri<caret>angle:
                        with:
                            @a: @actor
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the pattern header", resolved)
        assertResolvedTo(resolved!!, "love-triangle", "testResolveSiftPattern")
    }

    fun testResolveFitTrope() {
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
                    fit trope forbidden-lo<caret>ve:
                        with:
                            @lover: @actor
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the trope header", resolved)
    }

    fun testResolveFitsTropeSugared() {
        configure("""
            trope forbidden-love:
                roles:
                    @lover:
                        as: character

            action scene:
                roles:
                    @actor:
                        as: character
                conditions:
                    <@lover: @actor> fits trope forbidden-lo<caret>ve
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the trope header", resolved)
    }

    fun testResolveSelectorCandidateBare() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action-selector pick:
                target randomly:
                    gre<caret>et;
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Bare selector candidate should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the action header", resolved)
        assertTrue("Should resolve to 'greet'",
            resolved!!.text == "greet" || resolved.parent?.text?.contains("action greet") == true)
    }

    fun testResolveSelectorCandidateWithSelectorPrefix() {
        configure("""
            action-selector pick-social:
                target randomly:
                    greet;

            action-selector meta-pick:
                target randomly:
                    selector pick-soc<caret>ial;
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Selector-prefixed candidate should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the named selector's header", resolved)
        assertResolvedTo(resolved!!, "pick-social", "testResolveSelectorCandidateWithSelectorPrefix")
    }

    fun testResolveSelectorCandidateWithBindings() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action-selector pick:
                target randomly:
                    gre<caret>et:
                        with:
                            @greeter: @greeter
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Candidate with bindings should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the action header", resolved)
        assertResolvedTo(resolved!!, "greet", "testResolveSelectorCandidateWithBindings")
    }

    fun testResolveQueryActionField() {
        // query_action_name tags are action names inside set_predicate_tags
        // This tests that the tag resolves to the action header via PsiReference
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            query find-greets:
                action:
                    any: gre<caret>et
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Tag in query action field should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the action header", resolved)
        assertTrue("Should resolve to the name identifier in the header",
            resolved!!.text == "greet" || resolved.parent?.text?.contains("action greet") == true)
    }

    // -- Role references --

    fun testResolveRoleInConditions() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                conditions:
                    @gree<caret>ter.friendliness > 5
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("@greeter in conditions should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to role definition", resolved)
        assertResolvedTo(resolved!!, "greeter", "testResolveRoleInConditions")
    }

    fun testResolveRoleInEffects() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                    @target:
                        as: character, recipient
                effects:
                    @targ<caret>et.mood += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("@target in effects should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to role definition", resolved)
        assertResolvedTo(resolved!!, "target", "testResolveRoleInEffects")
    }

    fun testResolveGroupRoleReference() {
        configure("""
            action rally:
                roles:
                    @followers*:
                        as: character, recipient
                effects:
                    @follow<caret>ers*.morale += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("@followers* in effects should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Group role should resolve to definition", resolved)
        assertResolvedTo(resolved!!, "followers", "testResolveGroupRoleReference")
    }

    fun testResolveSymbolRoleReference() {
        configure("""
            action place:
                roles:
                    &topic:
                        as: symbol
                conditions:
                    &top<caret>ic.name == "test"
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("&topic in conditions should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Symbol role should resolve to definition", resolved)
        assertResolvedTo(resolved!!, "topic", "testResolveSymbolRoleReference")
    }

    fun testResolveGroupSymbolRoleReference() {
        configure("""
            action collect:
                roles:
                    &items*:
                        as: symbol
                effects:
                    &ite<caret>ms*.count += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("&items* should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Group symbol role should resolve to definition", resolved)
        assertResolvedTo(resolved!!, "items", "testResolveGroupSymbolRoleReference")
    }

    fun testResolveInheritedRole() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator
                    @recipient:
                        as: character, recipient

            action greet from social-exchange:
                conditions:
                    @initi<caret>ator.friendliness > 5
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Inherited role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Inherited role should resolve to parent's role definition", resolved)
        assertResolvedTo(resolved!!, "initiator", "testResolveInheritedRole")
    }

    fun testResolveDeeplyInheritedRole() {
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
                conditions:
                    @act<caret>or.x > 0
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Deeply inherited role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Deeply inherited role should resolve to grandparent's definition", resolved)
    }

    fun testResolveRoleInTemplateString() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character, initiator
                gloss: '{@initi<caret>ator.name} greets someone'
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        assertNotNull("Should find element at caret in template string", element)
        val ref = element?.parent?.reference ?: element?.parent?.parent?.reference
        assertNotNull("Role in template string should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to role definition", resolved)
        assertResolvedTo(resolved!!, "initiator", "testResolveRoleInTemplateString")
    }

    fun testResolveBindingRhsRole() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                    @target:
                        as: character, recipient
                reactions:
                    queue action respond:
                        with:
                            @actor: @gree<caret>ter
        """)
        // Dump the full tree to understand the parse structure
        val tree = dumpPsiTree(myFixture.file)
        val ref = findReferenceAtCaret()
        assertNotNull("BindingRHS: no PsiReference. Chain: ${psiChainAtCaret()}\n\nFull tree:\n$tree", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Binding RHS should resolve to current construct's role", resolved)
        assertResolvedTo(resolved!!, "greeter", "testResolveBindingRhsRole")
    }

    fun testResolveBindingLhsRole() {
        configure("""
            action respond:
                roles:
                    @actor:
                        as: character, initiator

            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                reactions:
                    queue action respond:
                        with:
                            @act<caret>or: @greeter
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("BindingLHS: no PsiReference. Chain: ${psiChainAtCaret()}", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Binding LHS should resolve to target construct's role", resolved)
        assertResolvedTo(resolved!!, "actor", "testResolveBindingLhsRole")
    }

    fun testResolveSalienceRolesEntry() {
        configure("""
            action greet:
                roles:
                    @speaker:
                        as: character, initiator
                saliences:
                    roles:
                        @spea<caret>ker: 10
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Salience roles entry should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to role definition", resolved)
        assertResolvedTo(resolved!!, "speaker", "testResolveSalienceRolesEntry")
    }

    fun testResolveAssociationsRolesEntry() {
        configure("""
            action betray:
                roles:
                    @traitor:
                        as: character, initiator
                associations:
                    roles:
                        @trai<caret>tor: guilt, deception
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Associations roles entry should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to role definition", resolved)
        assertResolvedTo(resolved!!, "traitor", "testResolveAssociationsRolesEntry")
    }

    fun testResolveEmbargoRole() {
        configure("""
            action greet:
                roles:
                    @challenger:
                        as: character
                    @defender:
                        as: character
                embargoes:
                    embargo:
                        roles: @challen<caret>ger, @defender
                        time: forever
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Embargo role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to role definition", resolved)
        assertResolvedTo(resolved!!, "challenger", "testResolveEmbargoRole")
    }

    fun testResolveRenamesClauseRole() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                    @recipient:
                        as: character
                        renames: @initi<caret>ator
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Renames clause role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the renamed role's definition", resolved)
        assertResolvedTo(resolved!!, "initiator", "testResolveRenamesClauseRole")
    }

    fun testResolveRoleCastingPoolIs() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                    @target:
                        is: @initi<caret>ator
        """)
        // The is: expression contains a viv_reference, which should resolve
        val ref = findReferenceAtCaret()
        assertNotNull("Role casting pool 'is' should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the role definition", resolved)
        assertResolvedTo(resolved!!, "initiator", "testResolveRoleCastingPoolIs")
    }

    fun testResolveRoleCastingPoolFrom() {
        configure("""
            action greet:
                roles:
                    @leader:
                        as: character
                    @follower:
                        from: @lead<caret>er.allies
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Role casting pool 'from' should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the role definition", resolved)
        assertResolvedTo(resolved!!, "leader", "testResolveRoleCastingPoolFrom")
    }

    fun testResolveRoleInSpawnDirective() {
        configure("""
            action greet:
                roles:
                    @leader:
                        as: character
                    @scribe:
                        spawn: ~create-scribe(@lead<caret>er.location)
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Role in spawn directive should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the role definition", resolved)
        assertResolvedTo(resolved!!, "leader", "testResolveRoleInSpawnDirective")
    }

    fun testResolveSiftingPatternCharacterRole() {
        configure("""
            pattern love-triangle:
                roles:
                    @betrayer:
                        as: character
                conditions:
                    @betra<caret>yer.loyalty < 3
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Sifting pattern character role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the pattern's roles section", resolved)
        assertResolvedTo(resolved!!, "betrayer", "testResolveSiftingPatternCharacterRole")
    }

    fun testResolveSiftingPatternActionVariable() {
        configure("""
            pattern betrayal:
                roles:
                    @betrayer:
                        as: character
                actions:
                    @trust:
                        is: @betrayer
                    @betrayal:
                        is: @betrayer
                conditions:
                    @tru<caret>st preceded @betrayal
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Sifting pattern action variable should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the actions section definition", resolved)
        assertResolvedTo(resolved!!, "trust", "testResolveSiftingPatternActionVariable")
    }

    fun testResolveSiftingPatternGroupActionVariable() {
        configure("""
            pattern escalation:
                roles:
                    @antagonist:
                        as: character
                actions:
                    @setup*:
                        is: @antagonist
                    @climax:
                        is: @antagonist
                conditions:
                    loop @setu<caret>p* as _@s:
                        _@s preceded @climax
                    end
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Group action variable should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the actions section definition", resolved)
        assertResolvedTo(resolved!!, "setup", "testResolveSiftingPatternGroupActionVariable")
    }

    fun testResolveSiftingPatternActionVariableFrom() {
        configure("""
            pattern betrayal:
                roles:
                    @avenger:
                        as: character
                actions:
                    @strike:
                        from: @aven<caret>ger.memories
        """)
        // The @avenger is a viv_reference inside role_casting_pool_from, resolving to pattern roles
        val ref = findReferenceAtCaret()
        assertNotNull("Action variable 'from' role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the pattern's roles section", resolved)
        assertResolvedTo(resolved!!, "avenger", "testResolveSiftingPatternActionVariableFrom")
    }

    // -- Scratch variable references --

    fun testResolveScratchEntityVar() {
        configure("""
            action accumulate:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@count = 0
                effects:
                    ${'$'}@cou<caret>nt += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Scratch entity var should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to scratch declaration", resolved)
        assertResolvedTo(resolved!!, "count", "testResolveScratchEntityVar")
    }

    fun testResolveScratchSymbolVar() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}&flag = false
                effects:
                    ${'$'}&fl<caret>ag = true
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Scratch symbol var should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to scratch declaration", resolved)
        assertResolvedTo(resolved!!, "flag", "testResolveScratchSymbolVar")
    }

    fun testResolveScratchInConditions() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@intensity = 0
                conditions:
                    ${'$'}@intens<caret>ity > 7
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Scratch in conditions should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to scratch declaration", resolved)
        assertResolvedTo(resolved!!, "intensity", "testResolveScratchInConditions")
    }

    fun testResolveScratchInTemplateString() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@count = 0
                gloss: '{${'$'}@cou<caret>nt} items'
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        assertNotNull("Should find element at caret", element)
        val ref = element?.parent?.reference ?: element?.parent?.parent?.reference
        assertNotNull("Scratch in template string should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to scratch declaration", resolved)
        assertResolvedTo(resolved!!, "count", "testResolveScratchInTemplateString")
    }

    // -- Local variable references --

    fun testResolveLocalEntityVar() {
        configure("""
            action test:
                roles:
                    @witnesses*:
                        as: character
                effects:
                    loop @witnesses* as _@witness:
                        _@witn<caret>ess.stress += 1
                    end
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Local entity var should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the 'as _@witness' introduction", resolved)
        assertResolvedTo(resolved!!, "witness", "testResolveLocalEntityVar")
    }

    fun testResolveLocalSymbolVar() {
        configure("""
            action test:
                roles:
                    &items*:
                        as: symbol
                effects:
                    loop &items* as _&item:
                        _&it<caret>em.weight += 1
                    end
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Local symbol var should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the 'as _&item' introduction", resolved)
        assertResolvedTo(resolved!!, "item", "testResolveLocalSymbolVar")
    }

    fun testResolveLocalInSalienceFor() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                saliences:
                    for _@observer:
                        _@obser<caret>ver.location == @actor.location
                    end
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("SalienceFor: no PsiReference. Chain: ${psiChainAtCaret()}", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the 'for _@observer' introduction", resolved)
        assertResolvedTo(resolved!!, "observer", "testResolveLocalInSalienceFor")
    }

    fun testResolveLocalInAssociationFor() {
        // Association for bodies contain tags and conditionals, not bare expressions.
        // The local variable reference must be inside a conditional expression.
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                associations:
                    for _@witness:
                        if _@witn<caret>ess.loyalty > 5:
                            sympathetic
                        else:
                            neutral
                        end
                    end
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("AssocFor: no PsiReference. Chain: ${psiChainAtCaret()}", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the introduction", resolved)
        assertResolvedTo(resolved!!, "witness", "testResolveLocalInAssociationFor")
    }

    fun testResolveLocalInSiftingPatternLoop() {
        configure("""
            pattern escalation:
                roles:
                    @antagonist:
                        as: character
                actions:
                    @setup*:
                        is: @antagonist
                    @climax:
                        is: @antagonist
                conditions:
                    loop @setup* as _@s:
                        _@<caret>s preceded @climax
                    end
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Local in sifting pattern loop should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the 'as _@s' introduction", resolved)
        assertResolvedTo(resolved!!, "s", "testResolveLocalInSiftingPatternLoop")
    }

    // -- Function call references --

    fun testResolveFunctionCall() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    ~is-frien<caret>dly(@greeter)
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Function call should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Function reference should resolve to first occurrence in project", resolved)
        assertTrue("Resolved element should contain 'is-friendly'",
            resolved!!.text.contains("is-friendly"))
    }

    fun testResolveFunctionInSpawn() {
        configure("""
            action greet:
                roles:
                    @leader:
                        as: character
                    @scribe:
                        spawn: ~create-scr<caret>ibe(@leader.location)
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Function in spawn should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Function reference should resolve to first occurrence in project", resolved)
        assertTrue("Resolved element should contain 'create-scribe'",
            resolved!!.text.contains("create-scribe"))
    }

    // -- Include path references --

    fun testResolveIncludeDoubleQuoted() {
        myFixture.addFileToProject("base-actions.viv", "action base:\n    roles:\n        @a:\n            as: character\n")
        myFixture.configureByText("test.viv", """include "base-<caret>actions.viv"
action greet:
    roles:
        @greeter:
            as: character
""")
        // Walk up from leaf to find an element with a PsiReference (file_path or include_statement)
        var current: PsiElement? = myFixture.file.findElementAt(myFixture.caretOffset)
        var ref: com.intellij.psi.PsiReference? = null
        while (current != null && current !is PsiFile) {
            ref = current.reference
            if (ref != null) break
            current = current.parent
        }
        assertNotNull("Include path should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the included file", resolved)
        assertTrue("Resolved element should be a PsiFile", resolved is PsiFile)
    }

    fun testResolveIncludeSingleQuoted() {
        myFixture.addFileToProject("my-tropes.viv", "trope test:\n    roles:\n        @a:\n            as: character\n")
        myFixture.configureByText("test.viv", "include 'my-<caret>tropes.viv'\n")
        var current: PsiElement? = myFixture.file.findElementAt(myFixture.caretOffset)
        var ref: com.intellij.psi.PsiReference? = null
        while (current != null && current !is PsiFile) {
            ref = current.reference
            if (ref != null) break
            current = current.parent
        }
        assertNotNull("Include path should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the included file", resolved)
    }

    fun testResolveIncludeWithPath() {
        myFixture.addFileToProject("lib/actions/base.viv", "action base:\n    roles:\n        @a:\n            as: character\n")
        myFixture.configureByText("test.viv", "include \"lib/actions/<caret>base.viv\"\n")
        var current: PsiElement? = myFixture.file.findElementAt(myFixture.caretOffset)
        var ref: com.intellij.psi.PsiReference? = null
        while (current != null && current !is PsiFile) {
            ref = current.reference
            if (ref != null) break
            current = current.parent
        }
        assertNotNull("Include path should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the nested path file", resolved)
    }

    // -- Include rename --

    fun testIncludeRenameUpdatesPath() {
        val otherFile = myFixture.addFileToProject("base-actions.viv",
            "action base:\n    roles:\n        @a:\n            as: character\n")
        myFixture.configureByText("test.viv", "include \"base-<caret>actions.viv\"\n")
        var current: PsiElement? = myFixture.file.findElementAt(myFixture.caretOffset)
        var ref: com.intellij.psi.PsiReference? = null
        while (current != null && current !is PsiFile) {
            ref = current.reference
            if (ref != null) break
            current = current.parent
        }
        assertNotNull("Include path should have a PsiReference", ref)
        // Rename the referenced element via handleElementRename (needs write action)
        var renamed: PsiElement? = null
        com.intellij.openapi.command.WriteCommandAction.runWriteCommandAction(project) {
            renamed = ref!!.handleElementRename("renamed-actions.viv")
        }
        assertTrue("Include path should contain new name",
            renamed!!.text.contains("renamed-actions.viv"))
    }

    fun testIncludeRenamePreservesDirectory() {
        myFixture.addFileToProject("lib/actions/base.viv",
            "action base:\n    roles:\n        @a:\n            as: character\n")
        myFixture.configureByText("test.viv", "include \"lib/actions/<caret>base.viv\"\n")
        var current: PsiElement? = myFixture.file.findElementAt(myFixture.caretOffset)
        var ref: com.intellij.psi.PsiReference? = null
        while (current != null && current !is PsiFile) {
            ref = current.reference
            if (ref != null) break
            current = current.parent
        }
        assertNotNull("Include path should have a PsiReference", ref)
        var renamed: PsiElement? = null
        com.intellij.openapi.command.WriteCommandAction.runWriteCommandAction(project) {
            renamed = ref!!.handleElementRename("renamed.viv")
        }
        assertTrue("Include path should preserve directory prefix",
            renamed!!.text.contains("lib/actions/renamed.viv"))
    }

    // -- Property references --

    fun testResolvePropertyReference() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                conditions:
                    @initiator.mo<caret>od > 5
                effects:
                    @initiator.mood += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Property 'mood' should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Property reference should resolve", resolved)
    }

    fun testPropertyReferenceIsReferenceTo() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                conditions:
                    @initiator.mo<caret>od > 5
                effects:
                    @initiator.mood += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Property 'mood' should have a PsiReference", ref)

        // Verify isReferenceTo recognizes both occurrences
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve", resolved)
        assertTrue("Reference should be-to its resolved target", ref.isReferenceTo(resolved!!))
    }

    fun testPropertyFindReferenceAtOffset() {
        // This tests the IntelliJ-native findReferenceAt pipeline (not our manual walker)
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                conditions:
                    @initiator.mood > 5
        """)
        val text = myFixture.file.text
        val moodOffset = text.indexOf("mood")
        assertTrue("Should find 'mood' in text", moodOffset >= 0)

        // Test IntelliJ's native findReferenceAt on the file
        val nativeRef = myFixture.file.findReferenceAt(moodOffset)
        assertNotNull(
            "file.findReferenceAt() must find VivPropertyReference at 'mood' offset " +
            "(PSI chain: ${psiChainAt(moodOffset)})",
            nativeRef
        )
    }

    fun testPropertyNameIsPsiNamedElement() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                conditions:
                    @initiator.mo<caret>od > 5
        """)
        val leaf = myFixture.file.findElementAt(myFixture.caretOffset)
        assertNotNull("Should find leaf element at caret", leaf)

        // The leaf's parent should be a PsiNamedElement (property_name)
        val parent = leaf!!.parent
        assertTrue(
            "Leaf parent should be VivNamedElement (property_name), got ${parent?.javaClass?.simpleName}",
            parent is VivNamedElement
        )

        // The named element's name identifier should be the leaf
        val named = parent as VivNamedElement
        assertEquals("mood", named.name)
        assertSame(
            "nameIdentifier should be the IDENTIFIER leaf",
            leaf, named.nameIdentifier
        )
    }

    fun testPropertyRenameViaSetName() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                conditions:
                    @initiator.mo<caret>od > 5
        """)
        val leaf = myFixture.file.findElementAt(myFixture.caretOffset)
        val propName = leaf?.parent as? VivNamedElement
        assertNotNull("Should find property_name VivNamedElement", propName)

        com.intellij.openapi.command.WriteCommandAction.runWriteCommandAction(project) {
            propName!!.setName("feeling")
        }
        assertEquals("feeling", propName!!.name)
        assertTrue("File text should contain .feeling",
            myFixture.file.text.contains(".feeling"))
    }

    fun testPropertyRenameAtCaret() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                conditions:
                    @initiator.mo<caret>od > 5
                effects:
                    @initiator.mood += 1
        """)
        // Verify TargetElementUtil finds the PsiNamedElement (not the leaf token)
        val elementAtCaret = myFixture.elementAtCaret
        assertTrue(
            "elementAtCaret should be VivNamedElement, got ${elementAtCaret.javaClass.simpleName}" +
            " (PSI chain: ${psiChainAtCaret()})",
            elementAtCaret is VivNamedElement
        )
        myFixture.renameElementAtCaret("feeling")
        val text = myFixture.file.text
        assertFalse("Old property name 'mood' should not appear", text.contains(".mood"))
        assertTrue("New property name 'feeling' should appear in conditions", text.contains(".feeling > 5"))
        assertTrue("New property name 'feeling' should appear in effects", text.contains(".feeling += 1"))
    }

    fun testPropertyFindUsagesViaReferencesSearch() {
        configure("""
            action greet:
                roles:
                    @initiator:
                        as: character
                conditions:
                    @initiator.mo<caret>od > 5
                effects:
                    @initiator.mood += 1
        """)
        // Get the property_name PsiNamedElement
        val leaf = myFixture.file.findElementAt(myFixture.caretOffset)
        val propName = leaf?.parent as? VivNamedElement
        assertNotNull("Should find property_name VivNamedElement", propName)

        // Use ReferencesSearch to find usages — this is what highlight-usages uses
        val usages = com.intellij.psi.search.searches.ReferencesSearch
            .search(propName!!, com.intellij.psi.search.LocalSearchScope(myFixture.file))
            .findAll()
        assertTrue(
            "Should find at least 1 usage of @initiator.mood (besides the target), found ${usages.size}",
            usages.isNotEmpty()
        )
    }

    // -- Unresolvable references --

    fun testUnresolvedConstructReference() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                reactions:
                    queue action nonexist<caret>ent:
                        with:
                            @greeter: @greeter
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference even for undefined", ref)
        assertNull("resolve() should return null for undefined construct", ref!!.resolve())
    }

    fun testUnresolvedRoleReference() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                conditions:
                    @nonexist<caret>ent.x > 0
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference even for undefined", ref)
        assertNull("resolve() should return null for undefined role", ref!!.resolve())
    }

    fun testUnresolvedScratchReference() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                effects:
                    ${'$'}@nonexist<caret>ent += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference even for undefined", ref)
        assertNull("resolve() should return null for undefined scratch", ref!!.resolve())
    }

    // ========================================================================
    // 16.2 Declaration site detection
    // ========================================================================

    fun testConstructHeaderIsDeclarationSite() {
        configure("""
            action gre<caret>et:
                roles:
                    @greeter:
                        as: character
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        val header = findParentOfType(element, VivActionHeader::class.java)
        assertNotNull("Should find VivActionHeader", header)
        assertTrue("Header should be VivNamedElement", header is VivNamedElement)
        // Declaration sites should NOT have a reference (or reference resolves to self)
        val ref = header?.reference
        // The header uses VivNamedElementMixin which has no getReference override, so ref should be null
        assertNull("Declaration site should not have a PsiReference", ref)
    }

    fun testRoleDefinitionIsDeclarationSite() {
        configure("""
            action greet:
                roles:
                    @gree<caret>ter:
                        as: character
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        // The role_reference inside a role definition is a declaration site
        val roleRef = findParentOfType(element, VivRoleReference::class.java)
        assertNotNull("Should find VivRoleReference", roleRef)
        // In a role definition context, the mixin should NOT return a PsiReference
        val ref = roleRef?.reference
        assertNull("Role definition should not have a PsiReference (declaration site)", ref)
    }

    fun testScratchDeclarationIsDeclarationSite() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@cou<caret>nt = 0
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        // In scratch declarations, the identifier is part of an assignment expression
        assertNotNull("Should find element at caret", element)
        // The scratch declaration is identified by $@name = value syntax
        // Verify the element text
        assertTrue("Should be on 'count' identifier", element!!.text == "count")
    }

    // ========================================================================
    // 16.3 Rename via PsiNamedElement
    // ========================================================================

    fun testConstructHeaderGetName() {
        configure("""
            action gre<caret>et:
                roles:
                    @greeter:
                        as: character
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        val header = findParentOfType(element, VivActionHeader::class.java)
        assertNotNull("Should find VivActionHeader", header)
        assertEquals("greet", (header as VivNamedElement).name)
    }

    fun testConstructHeaderSetName() {
        configure("""
            action gre<caret>et:
                roles:
                    @greeter:
                        as: character
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        val header = findParentOfType(element, VivActionHeader::class.java) as VivNamedElement
        com.intellij.openapi.command.WriteCommandAction.runWriteCommandAction(project) {
            header.setName("wave")
        }
        assertEquals("wave", header.name)
    }

    fun testRoleDefinitionGetName() {
        configure("""
            action greet:
                roles:
                    @gree<caret>ter:
                        as: character
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        val roleRef = findParentOfType(element, VivRoleReference::class.java)
        assertNotNull("Should find VivRoleReference", roleRef)
        assertEquals("greeter", (roleRef as VivNamedElement).name)
    }

    fun testScratchDeclarationGetName() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@cou<caret>nt = 0
        """)
        val element = myFixture.file.findElementAt(myFixture.caretOffset)
        // The scratch variable is a viv_reference in an assignment
        val vivRef = findParentOfType(element, VivVivReference::class.java)
        assertNotNull("Should find VivVivReference for scratch var", vivRef)
        assertEquals("count", (vivRef as VivNamedElement).name)
    }

    // ========================================================================
    // 16.4 Completion
    // ========================================================================

    fun testCompleteRoleAfterAt() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator
                    @target:
                        as: character, recipient
                conditions:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "@greeter", "@target")
    }

    fun testCompleteSymbolRoleAfterAmp() {
        configure("""
            action place:
                roles:
                    @placer:
                        as: character
                    &item:
                        as: symbol
                    &tool:
                        as: symbol
                effects:
                    &<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "&item", "&tool")
        assertDoesntContain(items, "@placer")
    }

    fun testCompleteInheritedRoles() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character, initiator
                    @recipient:
                        as: character, recipient

            action greet from social-exchange:
                conditions:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "@initiator", "@recipient")
    }

    fun testCompleteScratchAfterDollar() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@count = 0
                effects:
                    ${'$'}@<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "${'$'}@count")
    }

    fun testCompleteLocalAfterUnderscore() {
        configure("""
            action test:
                roles:
                    @witnesses*:
                        as: character
                effects:
                    loop @witnesses* as _@witness:
                        _@<caret>
                    end
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "_@witness")
    }

    fun testCompleteLocalAfterBareUnderscore() {
        configure("""
            action test:
                roles:
                    @witnesses*:
                        as: character
                    &items*:
                        as: symbol
                effects:
                    loop @witnesses* as _@witness:
                        for &items* as _&item:
                            _<caret>
                        end
                    end
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "_@witness", "_&item")
    }

    fun testCompleteEnumAfterHash() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                importance: #MODERATE
                effects:
                    @actor.status = #ACTIVE
                conditions:
                    @actor.mood == #<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "#MODERATE", "#ACTIVE")
    }

    fun testCompleteEnumProjectWide() {
        configure("""
            action first:
                importance: #RARE
                roles:
                    @a:
                        as: character
                effects:
                    @a.status = #ACTIVE

            action second:
                roles:
                    @b:
                        as: character
                conditions:
                    @b.mood == #<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "#RARE", "#ACTIVE")
    }

    fun testCompleteFunctionAfterTilde() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                conditions:
                    ~is-friendly(@actor)
                    ~is-hostile(@actor)
                effects:
                    ~<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "~is-friendly", "~is-hostile")
    }

    fun testCompleteFunctionProjectWide() {
        configure("""
            action first:
                roles:
                    @a:
                        as: character
                conditions:
                    ~check-status(@a)
                    ~validate(@a)

            action second:
                roles:
                    @b:
                        as: character
                effects:
                    ~<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "~check-status", "~validate")
    }

    fun testCompleteConstructAfterQueueAction() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action wave:
                roles:
                    @waver:
                        as: character
                reactions:
                    queue action <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "greet")
    }

    fun testCompleteConstructAfterQueuePlan() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >only:
                        queue plan <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "heist")
    }

    fun testCompleteConstructAfterFrom() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character

            action greet from <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "social-exchange")
    }

    fun testCompleteConstructAfterSearchQuery() {
        configure("""
            query find-stuff:
                roles:
                    @searcher:
                        as: character

            action look:
                roles:
                    @actor:
                        as: character
                effects:
                    search query <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "find-stuff")
    }

    fun testCompleteConstructAfterSiftPattern() {
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
                    sift pattern <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "love-triangle")
    }

    fun testCompleteConstructAfterFitTrope() {
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
                    fit trope <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "forbidden-love")
    }

    fun testCompleteSiftingPatternRolesAndActions() {
        configure("""
            pattern betrayal:
                roles:
                    @betrayer:
                        as: character
                actions:
                    @trust:
                        is: @betrayer
                conditions:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // Should offer both character roles and action variables
        assertContainsElements(items, "@betrayer", "@trust")
    }

    fun testCompleteDoesNotOfferCrossConstructRoles() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action wave:
                roles:
                    @waver:
                        as: character
                    @audience:
                        as: character
                conditions:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "@waver", "@audience")
        assertDoesntContain(items, "@greeter")
    }

    fun testCompleteDoesNotOfferWrongSigilRoles() {
        configure("""
            action place:
                roles:
                    @placer:
                        as: character
                    @helper:
                        as: character
                    &item:
                        as: symbol
                effects:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "@placer", "@helper")
        assertDoesntContain(items, "&item")
    }

    fun testCompleteSelectorTargetCandidateAction() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action wave:
                roles:
                    @waver:
                        as: character

            action-selector pick:
                target randomly:
                    <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "greet")
        assertContainsElements(items, "wave")
    }

    fun testCompleteSelectorTargetCandidatePlan() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >only:
                        succeed;

            plan-selector choose:
                target randomly:
                    <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "heist")
    }

    fun testCompleteConstructAfterFromWithHyphenatedName() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character

            action my-action from <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "social-exchange")
    }

    fun testCompleteSelectorTargetDoesNotOfferConstructsOnSigil() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action wave:
                roles:
                    @waver:
                        as: character

            action-selector pick:
                target randomly:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // @ inside a selector target should NOT trigger construct name completion
        assertDoesntContain(items, "greet")
        assertDoesntContain(items, "wave")
    }

    fun testCompleteFromTriggerDoesNotMatchInsideCastingPool() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                        from: <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // "from:" inside a role casting pool should NOT trigger construct name completion
        assertDoesntContain(items, "greet")
    }

    // ========================================================================
    // Adversarial completion edge cases
    // ========================================================================

    /** Edge case 1: `$` alone (not `$@` or `$&`) — should it offer scratch vars? */
    fun testCompleteBareDollarOffersScratch() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@count = 0
                    ${'$'}&flag = #FALSE
                effects:
                    ${'$'}<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // A bare $ should offer scratch vars since findScratchPrefix returns a prefix for bare $
        assertContainsElements(items, "${'$'}@count", "${'$'}&flag")
    }

    /** Edge case 2: `@` inside a string literal — should NOT offer roles. */
    fun testCompleteAtInsideStringDoesNotOfferRoles() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                gloss: "Hello @<caret> world"
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // @ inside a string literal should NOT trigger role completion
        assertDoesntContain(items, "@greeter")
    }

    /** Edge case 3: `@` in a comment line — should NOT offer roles. */
    fun testCompleteAtInCommentDoesNotOfferRoles() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                // Check @<caret> here
                conditions:
                    @greeter.friendly
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // @ in a comment should NOT trigger role completion
        assertDoesntContain(items, "@greeter")
    }

    /** Edge case 4: `queue action-selector ` — should offer action-selector names, NOT action names. */
    fun testCompleteQueueActionSelectorOffersOnlySelectorNames() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action-selector pick-greeting:
                target randomly:
                    greet;

            action wave:
                roles:
                    @waver:
                        as: character
                reactions:
                    queue action-selector <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // Should offer action-selector names, NOT action names
        assertContainsElements(items, "pick-greeting")
        assertDoesntContain(items, "greet")
        assertDoesntContain(items, "wave")
    }

    /** Edge case 5: Caret at the very start of an empty-ish file (offset 0) — no crash. */
    fun testCompleteAtFileStart() {
        myFixture.configureByText("test.viv", "<caret>action greet:")
        myFixture.complete(CompletionType.BASIC)
        // Should not crash — we just care that it doesn't throw
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertNotNull("Completion should return without crashing", items)
    }

    /** Edge case 6: Caret in a completely empty file — no crash. */
    fun testCompleteInEmptyFile() {
        myFixture.configureByText("test.viv", "<caret>")
        myFixture.complete(CompletionType.BASIC)
        // Should not crash
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertNotNull("Completion should return without crashing", items)
    }

    /** Edge case 7: `from` at line start, not in action header context — should NOT offer actions. */
    fun testCompleteFromAtLineStartNotInHeaderContext() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                effects:
                    from <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // "from" indented inside an effects section is not a header-level trigger —
        // but the trigger detection uses trimmed line ending, so it WILL match.
        // This test probes whether `from` in a non-header position incorrectly triggers.
        assertDoesntContain(items, "greet")
    }

    /** Edge case 8: `#` inside a string — should NOT offer enums. */
    fun testCompleteHashInsideStringDoesNotOfferEnums() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                importance: #HIGH
                gloss: "Priority is #<caret>"
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // # inside a string should NOT trigger enum completion
        assertDoesntContain(items, "#HIGH")
    }

    /** Edge case 9: Role completion when construct has NO roles section — should return empty. */
    fun testCompleteRolesWhenNoRolesSection() {
        configure("""
            action bare-action:
                conditions:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // No roles defined, so no role completions should appear
        assertTrue("Expected empty completion list, got: $items", items.isEmpty())
    }

    /** Edge case 10: Inherited roles — child action should see parent's roles. */
    fun testCompleteInheritedRolesFromGrandparent() {
        configure("""
            template action base:
                roles:
                    @originator:
                        as: character

            action middle from base:
                roles:
                    @helper:
                        as: character

            action child from middle:
                conditions:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // Should see own roles (none defined), parent's roles, AND grandparent's roles
        assertContainsElements(items, "@helper", "@originator")
    }

    /** Edge case 11: `_` when NOT inside a loop — should return empty. */
    fun testCompleteUnderscoreOutsideLoopReturnsEmpty() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                effects:
                    _<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // No loop/for block means no local variables introduced via `as`
        assertTrue("Expected empty completion list for _ outside loop, got: $items", items.isEmpty())
    }

    /** Edge case 12: `queue plan ` — should offer plan names only, NOT action names. */
    fun testCompleteQueuePlanOffersOnlyPlanNames() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >only:
                        queue plan <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "heist")
        assertDoesntContain(items, "greet")
    }

    /** Edge case 13: Sifting pattern `@` should offer roles from BOTH roles: and actions: sections. */
    fun testCompleteSiftingPatternOffersRolesAndActionRoles() {
        configure("""
            pattern love-triangle:
                roles:
                    @lover-a:
                        as: character
                    @lover-b:
                        as: character
                actions:
                    @confession:
                        is: @lover-a
                    @rejection:
                        is: @lover-b
                conditions:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // Should offer character roles AND action-variable roles
        assertContainsElements(items, "@lover-a", "@lover-b", "@confession", "@rejection")
    }

    /** Edge case 14: Construct name trigger with extra whitespace: `queue  action  ` (double spaces). */
    fun testCompleteConstructTriggerWithDoubleSpaces() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action wave:
                roles:
                    @waver:
                        as: character
                reactions:
                    queue  action  <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // Double spaces between "queue" and "action" — should this still trigger?
        // The trigger detection uses trimmed line endsWith, so "queue  action" won't match "queue action".
        // This tests whether the system gracefully handles non-normalized whitespace.
        assertContainsElements(items, "greet", "wave")
    }

    /** Edge case 15: `@` completion when construct is a stub (`;` terminator) — no roles to offer. */
    fun testCompleteRolesInStubConstruct() {
        configure("""
            action greet;

            action wave:
                roles:
                    @waver:
                        as: character
                conditions:
                    @<caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // Should offer @waver from wave, NOT anything from the stub
        assertContainsElements(items, "@waver")
        // And the stub action name should not appear as a role
        assertDoesntContain(items, "@greet")
    }

    // -- Tag completion --

    fun testCompleteTagsInActionTagsSection() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                tags: dramatic, intense

            action wave:
                roles:
                    @waver:
                        as: character
                tags: <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "dramatic", "intense")
    }

    fun testCompleteTagsInQueryTagsPredicate() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                tags: dramatic, social

            query find-dramatic:
                tags:
                    any: <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "dramatic", "social")
    }

    fun testCompleteTagsInAssociationsDefault() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                tags: dramatic
                associations:
                    default: guilt, shame

            action wave:
                roles:
                    @waver:
                        as: character
                associations:
                    default: <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // Tags from both tags: sections and associations are in the tag pool
        assertContainsElements(items, "guilt", "shame", "dramatic")
    }

    fun testCompleteActionNamesInQueryActionPredicate() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action wave:
                roles:
                    @waver:
                        as: character

            query find-actions:
                action:
                    any: <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        assertContainsElements(items, "greet", "wave")
    }

    fun testNoTagCompletionOutsideTagContext() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                tags: dramatic
                conditions:
                    <caret>
        """)
        myFixture.complete(CompletionType.BASIC)
        val items = myFixture.lookupElementStrings ?: emptyList()
        // "dramatic" is a tag — should NOT appear in conditions context
        assertDoesntContain(items, "dramatic")
    }

    // ========================================================================
    // 16.11 Auto-closing and Indentation
    // ========================================================================

    fun testBracketAutoCloses() {
        configure("""
            action greet:
                conditions:
                    <caret>
        """)
        myFixture.type("{")
        val text = myFixture.editor.document.text
        assertTrue("Should auto-close brace", text.contains("{}"))
    }

    fun testQuoteAutoCloses() {
        configure("""
            action greet:
                gloss: <caret>
        """)
        myFixture.type("\"")
        val text = myFixture.editor.document.text
        val quoteCount = text.count { it == '"' }
        assertTrue("Should auto-close quote (expect >=2 quotes)", quoteCount >= 2)
    }

    fun testParenAutoCloses() {
        configure("""
            action greet:
                conditions:
                    ~test<caret>
        """)
        myFixture.type("(")
        val text = myFixture.editor.document.text
        assertTrue("Should auto-close paren", text.contains("()"))
    }

    // Note: The spec lists testBracketAutoCloses twice in 16.11.
    // We only define it once since duplicate test method names are not allowed.

    // ========================================================================
    // Helpers
    // ========================================================================

    fun testSearchSiftParsesCleanly() {
        configure("""
            action look:
                roles:
                    @actor:
                        as: character
                conditions:
                    search query find-stuff:
                        over: @actor
                        with:
                            @person: @actor
                    search:
                        over: chronicle
                    search:
                        over: @actor
                    sift pattern love-tri:
                        over: chronicle
                        with partial:
                            @a: @actor

            query find-stuff:
                roles:
                    @person:
                        as: character

            pattern love-tri:
                roles:
                    @a:
                        as: character
        """)
        val errors = com.intellij.psi.util.PsiTreeUtil.findChildrenOfType(
            myFixture.file, com.intellij.psi.PsiErrorElement::class.java
        )
        val errorDetails = errors.take(10).map { err ->
            val line = myFixture.editor.document.getLineNumber(err.textOffset) + 1
            val text = myFixture.editor.document.text.substring(
                maxOf(0, err.textOffset - 10), minOf(err.textOffset + 30, myFixture.editor.document.textLength)
            ).replace("\n", "\\n")
            "L$line: '${err.errorDescription}' near '$text'"
        }
        assertTrue(
            "Parser errors (${errors.size}):\n${errorDetails.joinToString("\n")}",
            errors.isEmpty()
        )
    }

    fun testSyntaxShowcaseParsesCleanly() {
        val showcaseFile = java.io.File(System.getProperty("user.dir")).resolve("../../syntax/examples/syntax-showcase.viv")
        org.junit.Assume.assumeTrue("Syntax showcase file not found (expected in local dev)", showcaseFile.exists())
        val source = showcaseFile.readText()
        myFixture.configureByText("syntax-showcase.viv", source)
        val errors = com.intellij.psi.util.PsiTreeUtil.findChildrenOfType(
            myFixture.file, com.intellij.psi.PsiErrorElement::class.java
        )
        val errorDetails = errors.take(20).map { err ->
            val line = myFixture.editor.document.getLineNumber(err.textOffset) + 1
            val text = myFixture.editor.document.text.substring(
                maxOf(0, err.textOffset - 10), minOf(err.textOffset + 20, myFixture.editor.document.textLength)
            ).replace("\n", "\\n")
            "L$line: '${err.errorDescription}' near '$text'"
        }
        assertTrue(
            "Parser errors on syntax-showcase.viv (${errors.size} total):\n${errorDetails.joinToString("\n")}",
            errors.isEmpty()
        )
    }

    // ========================================================================
    // Adversarial PsiReference.resolve() edge-case tests
    // ========================================================================

    /**
     * Adversarial #1: Three-level inheritance chain.
     * leaf -> middle -> base.  @actor is defined only in base.
     * VivProjectIndex.resolveRoleInternal must walk two parent hops.
     */
    fun testResolveRoleGrandparentInheritance() {
        configure("""
            template action base:
                roles:
                    @actor:
                        as: character

            action middle from base:
                join roles:
                    @sidekick:
                        as: character

            action leaf from middle:
                conditions:
                    @act<caret>or.health > 0
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Grandparent role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Grandparent role should resolve through 2-level parent chain", resolved)
        assertResolvedTo(resolved!!, "actor", "testResolveRoleGrandparentInheritance")
    }

    /**
     * Adversarial #2: Child overrides a parent role (same name).
     * resolve() should find the child's own definition, not the parent's.
     */
    fun testResolveRoleOverridesParent() {
        configure("""
            template action base:
                roles:
                    @actor:
                        as: character, initiator

            action child from base:
                join roles:
                    @actor:
                        as: character, recipient
                conditions:
                    @act<caret>or.mood > 0
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Overriding role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the child's own definition", resolved)
        // The resolved element should be in the child action, not the parent.
        // We verify by checking the text around the resolved element includes "recipient"
        // (the child's label) rather than "initiator" (the parent's label).
        val construct = studio.sifty.viv.psi.references.VivPropertyReference.findEnclosingConstruct(resolved!!)
        assertNotNull("Resolved element should be inside a construct", construct)
        assertTrue("Resolved @actor should be in the child (containing 'recipient'), not the parent. " +
            "Construct text: ${construct!!.text.take(200)}",
            construct.text.contains("recipient"))
    }

    /**
     * Adversarial #3: Two constructs with the same type and name (duplicates).
     * getConstruct returns whichever it finds first in the ConcurrentHashMap.
     * The reference should still resolve (not crash or return null).
     */
    fun testResolveConstructWhenDuplicateExists() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character, initiator

            action greet:
                roles:
                    @greeter:
                        as: character, recipient

            action wave:
                roles:
                    @waver:
                        as: character
                reactions:
                    queue action gre<caret>et:
                        with:
                            @greeter: @waver
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Duplicate construct should still have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to one of the duplicate constructs (not crash)", resolved)
        assertResolvedTo(resolved!!, "greet", "testResolveConstructWhenDuplicateExists")
    }

    /**
     * Adversarial #4: Multi-file construct resolution.
     * Target construct is in a different file than the reference site.
     */
    fun testResolveConstructCrossFile() {
        myFixture.addFileToProject("actions.viv",
            "action greet:\n    roles:\n        @greeter:\n            as: character\n")
        // Ensure the file-based index picks up the newly added file
        FileBasedIndex.getInstance().ensureUpToDate(VivFileBasedIndex.NAME, project, null)
        myFixture.configureByText("test.viv", """action wave:
    roles:
        @waver:
            as: character
    reactions:
        queue action gre${CARET}et:
            with:
                @greeter: @waver
""".replace(CARET, "<caret>"))
        val ref = findReferenceAtCaret()
        assertNotNull("Cross-file construct should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the construct in another file", resolved)
        assertResolvedTo(resolved!!, "greet", "testResolveConstructCrossFile")
    }

    /**
     * Adversarial #5: Function call when the function appears in multiple files.
     * Should resolve to the first occurrence found.
     */
    fun testResolveFunctionCrossFile() {
        myFixture.addFileToProject("utils.viv",
            "action use-helper:\n    roles:\n        @a:\n            as: character\n    conditions:\n        ~helper-func(@a)\n")
        myFixture.configureByText("test.viv", """action test:
    roles:
        @b:
            as: character
    conditions:
        ~helper-fu${CARET}nc(@b)
""".replace(CARET, "<caret>"))
        val ref = findReferenceAtCaret()
        assertNotNull("Cross-file function should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the function occurrence in some file", resolved)
        assertTrue("Resolved element should contain 'helper-func'",
            resolved!!.text.contains("helper-func"))
    }

    /**
     * Adversarial #6: Enum token that exists only in the current unsaved file.
     * VivEnumReference uses FileTypeIndex.getFiles(GlobalSearchScope.projectScope)
     * which may not include in-memory-only files in the test fixture.
     */
    fun testResolveEnumInCurrentFileOnly() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                effects:
                    @actor.status = #UNIQUE_ENUM_TOKEN
                conditions:
                    @actor.status == #UNIQUE_ENUM_TO<caret>KEN
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Enum in current file should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Enum token appearing only in current unsaved file should still resolve", resolved)
        assertResolvedTo(resolved!!, "UNIQUE_ENUM_TOKEN", "testResolveEnumInCurrentFileOnly")
    }

    /**
     * Adversarial #7: Binding LHS role when the target is a selector candidate.
     * Tests VivBindingLhsRoleReference.findTargetConstruct for the selector path.
     */
    fun testResolveBindingLhsRoleInSelector() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character

            action-selector pick:
                target randomly:
                    greet:
                        with:
                            @gree<caret>ter: @greeter
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("BindingLHS in selector should have a PsiReference. Chain: ${psiChainAtCaret()}", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the target action's role definition", resolved)
        assertResolvedTo(resolved!!, "greeter", "testResolveBindingLhsRoleInSelector")
    }

    /**
     * Adversarial #8: Selector candidate name resolves to the correct construct type.
     * A plan-selector's bare candidate should resolve to a plan, not an action.
     */
    fun testResolveSelectorCandidatePlan() {
        configure("""
            plan heist:
                roles:
                    @mastermind:
                        as: character
                phases:
                    >only:
                        succeed;

            plan-selector choose:
                target randomly:
                    hei<caret>st;
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Plan selector candidate should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the plan header", resolved)
        assertResolvedTo(resolved!!, "heist", "testResolveSelectorCandidatePlan")
    }

    /**
     * Adversarial #9: Role reference inside an embargo roles: section.
     * The VivRoleRefContextMixin should dispatch to VivRoleReference (not LHS binding).
     */
    fun testResolveRoleInEmbargoRolesSection() {
        configure("""
            action duel:
                roles:
                    @attacker:
                        as: character
                    @defender:
                        as: character
                embargoes:
                    embargo:
                        roles: @attack<caret>er
                        time: forever
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Embargo role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Embargo role should resolve to its definition in roles:", resolved)
        assertResolvedTo(resolved!!, "attacker", "testResolveRoleInEmbargoRolesSection")
    }

    /**
     * Adversarial #10: Role reference in a sifting pattern's conditions.
     * Should be able to resolve both character roles (from roles:) and
     * action-variable roles (from actions:).
     */
    fun testResolveSiftingPatternActionRoleInConditions() {
        configure("""
            pattern test-pattern:
                roles:
                    @hero:
                        as: character
                actions:
                    @deed:
                        is: @hero
                conditions:
                    @dee<caret>d preceded @deed
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Action role in sifting conditions should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the action-variable definition in the actions: section", resolved)
        assertResolvedTo(resolved!!, "deed", "testResolveSiftingPatternActionRoleInConditions")
    }

    /**
     * Adversarial #11: Property reference where the owning role is inherited.
     * @initiator is defined in the parent; `@initiator.mood` appears in the child.
     * VivPropertyReference scopes to the enclosing construct's PSI subtree,
     * so it should still find a match in the child.
     */
    fun testResolvePropertyOnInheritedRole() {
        configure("""
            template action social-exchange:
                roles:
                    @initiator:
                        as: character

            action greet from social-exchange:
                conditions:
                    @initiator.mo<caret>od > 5
                effects:
                    @initiator.mood += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Property on inherited role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Property should resolve even when the role is inherited", resolved)
    }

    /**
     * Adversarial #12a: Tag in a construct's tags: section.
     * Should resolve via VivTagNameReference.
     */
    fun testResolveTagInTagsSection() {
        configure("""
            action greet:
                tags: social, friendly
                roles:
                    @greeter:
                        as: character

            action wave:
                tags: soc<caret>ial
                roles:
                    @waver:
                        as: character
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Tag in tags: section should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Tag should resolve to first occurrence in project", resolved)
        assertResolvedTo(resolved!!, "social", "testResolveTagInTagsSection")
    }

    /**
     * Adversarial #12b: Tag in a query's `tags:` predicate.
     * VivTagReferenceMixin dispatches to VivTagNameReference for VivSetPredicateTags
     * whose parent is VivQueryTags.
     */
    fun testResolveTagInQueryTagsPredicate() {
        configure("""
            action greet:
                tags: dramatic
                roles:
                    @greeter:
                        as: character

            query find-dramatic:
                roles:
                    @searcher:
                        as: character
                tags:
                    any: dramat<caret>ic
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Tag in query tags: predicate should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Query tag should resolve to the same global tag", resolved)
        assertResolvedTo(resolved!!, "dramatic", "testResolveTagInQueryTagsPredicate")
    }

    /**
     * Adversarial #13: Local variable defined in an outer loop, referenced in a nested loop.
     * VivLocalVarReference scans the whole construct body for the `as _@name` pattern,
     * so it should find the outer loop's introduction.
     */
    fun testResolveLocalVarFromOuterLoop() {
        configure("""
            action test:
                roles:
                    @witnesses*:
                        as: character
                    &items*:
                        as: symbol
                effects:
                    loop @witnesses* as _@witness:
                        loop &items* as _&item:
                            _@witn<caret>ess.stress += 1
                        end
                    end
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Outer loop variable should have a PsiReference in nested loop", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the outer loop's 'as _@witness' introduction", resolved)
        assertResolvedTo(resolved!!, "witness", "testResolveLocalVarFromOuterLoop")
    }

    /**
     * Adversarial #14: Construct with empty body (just header and colon, no sections).
     * Role reference inside should still get a construct context from getConstructAt,
     * even though there are no roles.
     */
    fun testResolveRoleInEmptyBodyConstruct() {
        configure("""
            action empty:
                roles:
                    @solo:
                        as: character
                conditions:
                    @sol<caret>o.health > 0
        """)
        // This isn't truly "empty body" since we need a role to reference.
        // The real test is whether getConstructAt works with minimal body.
        val ref = findReferenceAtCaret()
        assertNotNull("Role in minimal construct should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve in minimal construct", resolved)
        assertResolvedTo(resolved!!, "solo", "testResolveRoleInEmptyBodyConstruct")
    }

    /**
     * Adversarial #14b: Unresolved role in a construct that has NO roles section at all.
     * getConstructAt should still return the construct, and resolve should return null.
     */
    fun testResolveRoleInConstructWithNoRolesSection() {
        configure("""
            action truly-empty:
                conditions:
                    @ghost<caret>ly.health > 0
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should still have a PsiReference even with no roles section", ref)
        val resolved = ref!!.resolve()
        assertNull("Should return null because the role doesn't exist anywhere", resolved)
    }

    /**
     * Adversarial #15: Role name with hyphens.
     * Viv identifiers allow hyphens (e.g., my-role), but the grammar's IDENTIFIER
     * token must support this. Tests that the parser and reference resolver handle it.
     */
    fun testResolveHyphenatedRoleName() {
        configure("""
            action test:
                roles:
                    @my-role:
                        as: character
                conditions:
                    @my-ro<caret>le.x > 0
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Hyphenated role name should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Hyphenated role name should resolve", resolved)
        assertResolvedTo(resolved!!, "my-role", "testResolveHyphenatedRoleName")
    }

    /**
     * Adversarial #16: Four-level inheritance chain.
     * a -> b -> c -> d.  @deep-role defined in 'd'.
     * Tests that cycle detection (visited set) doesn't cut off legitimate deep chains.
     */
    fun testResolveFourLevelInheritanceChain() {
        configure("""
            template action d:
                roles:
                    @deep-role:
                        as: character

            action c from d:
                join roles:
                    @c-role:
                        as: character

            action b from c:
                join roles:
                    @b-role:
                        as: character

            action a from b:
                conditions:
                    @deep-ro<caret>le.x > 0
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("4-level inherited role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve through 3 parent hops to the root ancestor", resolved)
        assertResolvedTo(resolved!!, "deep-role", "testResolveFourLevelInheritanceChain")
    }

    /**
     * Adversarial #17: Circular inheritance (a -> b -> a).
     * resolveRoleInternal uses a visited set.  With circular parents,
     * it should return null (not infinite loop or stack overflow).
     */
    fun testResolveRoleCircularInheritanceDoesNotHang() {
        configure("""
            action a from b:
                join roles:
                    @a-role:
                        as: character
                conditions:
                    @nonexist<caret>ent.x > 0

            action b from a:
                join roles:
                    @b-role:
                        as: character
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Should have a PsiReference even with circular inheritance", ref)
        // Must not hang or stack-overflow
        val resolved = ref!!.resolve()
        assertNull("Should return null for role not found in circular chain", resolved)
    }

    /**
     * Adversarial #18: Binding LHS role for a trope fit.
     * Tests VivBindingLhsRoleReference.findTargetConstruct via the tropeFit path.
     */
    fun testResolveBindingLhsRoleInTropeFit() {
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
                            @lov<caret>er: @actor
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("BindingLHS in trope fit should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the trope's role definition", resolved)
        assertResolvedTo(resolved!!, "lover", "testResolveBindingLhsRoleInTropeFit")
    }

    /**
     * Adversarial #19: Binding LHS role for a sift pattern.
     * Tests VivBindingLhsRoleReference.findTargetConstruct via the siftingHeader path.
     */
    fun testResolveBindingLhsRoleInSiftPattern() {
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
                            @<caret>a: @actor
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("BindingLHS in sift pattern should have a PsiReference. Chain: ${psiChainAtCaret()}", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the pattern's role definition", resolved)
        assertResolvedTo(resolved!!, "a", "testResolveBindingLhsRoleInSiftPattern")
    }

    /**
     * Adversarial #20: Resolve same-file construct reference where the target
     * is defined AFTER the reference site (forward reference).
     */
    fun testResolveForwardConstructReference() {
        configure("""
            action greet:
                roles:
                    @greeter:
                        as: character
                reactions:
                    queue action respo<caret>nd:
                        with:
                            @actor: @greeter

            action respond:
                roles:
                    @actor:
                        as: character
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Forward construct reference should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the forward-declared construct", resolved)
        assertResolvedTo(resolved!!, "respond", "testResolveForwardConstructReference")
    }

    /**
     * Adversarial #21: Scratch var with property access: $@count.value
     * The $@ variable reference should resolve independently of property access.
     */
    fun testResolveScratchVarWithPropertyAccess() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                scratch:
                    ${'$'}@data = 0
                effects:
                    ${'$'}@da<caret>ta += 1
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Scratch var should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to the scratch declaration", resolved)
        assertResolvedTo(resolved!!, "data", "testResolveScratchVarWithPropertyAccess")
    }

    /**
     * Adversarial #22: Enum self-resolution.
     * When the caret is ON the first occurrence of an enum, resolve() should
     * return itself (self-resolution).
     */
    fun testResolveEnumSelfResolution() {
        configure("""
            action test:
                roles:
                    @actor:
                        as: character
                effects:
                    @actor.status = #FIRST_EVER_US<caret>AGE
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Enum on first occurrence should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Enum first occurrence should self-resolve", resolved)
        assertResolvedTo(resolved!!, "FIRST_EVER_USAGE", "testResolveEnumSelfResolution")
    }

    /**
     * Adversarial #23: Multiple role sigils in the same construct.
     * @ vs & should be distinguished by the resolver.
     */
    fun testResolveDistinguishesSigils() {
        configure("""
            action test:
                roles:
                    @thing:
                        as: character
                    &thing:
                        as: symbol
                conditions:
                    &thi<caret>ng.name == "x"
        """)
        val ref = findReferenceAtCaret()
        assertNotNull("Symbol role should have a PsiReference", ref)
        val resolved = ref!!.resolve()
        assertNotNull("Should resolve to &thing (symbol), not @thing (character)", resolved)
        // Verify it resolved to the symbol role by checking the parent text contains "&"
        val resolvedText = resolved!!.text
        assertTrue("Resolved text '$resolvedText' should be the &thing symbol role definition",
            resolvedText == "thing" || resolved.parent?.text?.contains("&thing") == true)
    }

    companion object {
        private const val CARET = "<caret>"
    }

    private fun configure(source: String) {
        myFixture.configureByText("test.viv", source.trimIndent())
    }

    /**
     * Find the PsiReference at the caret position by walking up from the leaf element.
     */
    private fun findReferenceAtCaret(): com.intellij.psi.PsiReference? {
        val element = myFixture.file.findElementAt(myFixture.caretOffset) ?: return null
        // Walk up to find a PsiReference
        var current: PsiElement? = element
        while (current != null && current !is PsiFile) {
            val ref = current.reference
            if (ref != null) return ref
            current = current.parent
        }
        return null
    }

    private fun psiChainAtCaret(): String = psiChainAt(myFixture.caretOffset)

    private fun psiChainAt(offset: Int): String {
        val element = myFixture.file.findElementAt(offset) ?: return "null"
        val parts = mutableListOf<String>()
        var cur: PsiElement? = element
        while (cur != null && cur !is PsiFile) {
            parts.add("${cur.javaClass.simpleName}(${cur.node?.elementType}, ref=${cur.reference != null})")
            cur = cur.parent
        }
        return parts.joinToString(" → ")
    }

    private fun dumpPsiTree(root: PsiElement, indent: Int = 0): String {
        val sb = StringBuilder()
        val prefix = " ".repeat(indent)
        val text = root.text.take(30).replace("\n", "\\n")
        sb.appendLine("$prefix${root.javaClass.simpleName}(${root.node?.elementType}) '$text'")
        for (child in root.children) {
            sb.append(dumpPsiTree(child, indent + 2))
        }
        return sb.toString()
    }

    private fun <T> findParentOfType(element: PsiElement?, clazz: Class<T>): T? {
        var current = element
        while (current != null) {
            if (clazz.isInstance(current)) {
                @Suppress("UNCHECKED_CAST")
                return current as T
            }
            current = current.parent
        }
        return null
    }

    /**
     * Asserts that a resolved element or one of its ancestors contains the expected name.
     *
     * resolve() may return a leaf token (e.g. the `@` sigil for roles, `$` for scratches,
     * `_` for locals). The actual name identifier is typically a sibling or cousin in the
     * PSI tree. This helper walks up to 4 ancestors checking:
     *   (a) the element's text exactly matches [expectedName], OR
     *   (b) the element is a VivNamedElement whose name matches, OR
     *   (c) the element's text contains the expected name.
     */
    private fun assertResolvedTo(resolved: PsiElement, expectedName: String, context: String) {
        var cur: PsiElement? = resolved
        for (depth in 0..4) {
            if (cur == null) break
            if (cur.text == expectedName) return
            if (cur is VivNamedElement && cur.name == expectedName) return
            if (depth > 0 && cur.text.contains(expectedName)) return
            cur = cur.parent
        }
        fail("$context: expected resolved element to contain '$expectedName', " +
            "but got text='${resolved.text}', class=${resolved.javaClass.simpleName}, " +
            "parent.text='${resolved.parent?.text?.take(80)}', parent.class=${resolved.parent?.javaClass?.simpleName}, " +
            "gp.text='${resolved.parent?.parent?.text?.take(80)}', gp.class=${resolved.parent?.parent?.javaClass?.simpleName}")
    }

    private fun <T> findFirstOfType(root: PsiElement, clazz: Class<T>): T? {
        if (clazz.isInstance(root)) {
            @Suppress("UNCHECKED_CAST")
            return root as T
        }
        var child = root.firstChild
        while (child != null) {
            val found = findFirstOfType(child, clazz)
            if (found != null) return found
            child = child.nextSibling
        }
        return null
    }
}

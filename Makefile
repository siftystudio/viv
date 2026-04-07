# Viv monorepo build automation

MONOREPO_ROOT_DIR := $(CURDIR)
TSCONFIG_PATH := ${MONOREPO_ROOT_DIR}/runtimes/js/tsconfig.json
SOURCE_TYPES_PATH := ${MONOREPO_ROOT_DIR}/runtimes/js/src/**/*.ts
COMPILER_BUNDLE_SCHEMA_PATH := $(MONOREPO_ROOT_DIR)/compiler/src/viv_compiler/schemas/content-bundle.schema.json
RUNTIME_BUNDLE_SCHEMA_PATH := $(MONOREPO_ROOT_DIR)/runtimes/js/src/schemas/content-bundle.schema.json
RUNTIME_API_SCHEMA_PATH := $(MONOREPO_ROOT_DIR)/runtimes/js/src/schemas/api.schema.json
HELLO_VIV_TS_CONTENT_DIR := $(MONOREPO_ROOT_DIR)/examples/hello-viv-ts/src/content
HELLO_VIV_JS_CONTENT_DIR := $(MONOREPO_ROOT_DIR)/examples/hello-viv-js/src/content
LIVE_VIVC := $(MONOREPO_ROOT_DIR)/compiler/.venv/bin/vivc  # Live monorepo compiler code

.PHONY: preflight schemas clean help

# Default target: show available commands
help:
	@echo "Available targets:"
	@echo "  make preflight"
	@echo "    - Run all CI checks locally before pushing"
	@echo "  make schemas BUMP=<none|patch|minor|major>"
	@echo "  make schemas VERSION=x.y.z"
	@echo "    - Generate JSON schemas from TypeScript types and recompile content bundles in example projects"
	@echo "    - BUMP/VERSION controls the content-bundle schema version (stamped into compiled bundles)"
	@echo "  make clean"
	@echo "    - Remove all generated schemas"

# Run all CI checks locally.
#
# The procedure here mirrors the `check` job in ci.yml, except that it's missing the
# Sublime syntax test, which requires a Linux binary.
#
# If this passes here, CI will pass on GitHub.
#
# If a step fails:
#   Lock file        →  cd compiler && poetry lock
#   Sync checks      →  heed the FAIL message indicating which invariant drifted
#   TextMate tests   →  fix the assertion in syntax/tests/syntax_test_viv.viv
#   Compile runtime  →  fix the TypeScript compilation error
#   API surface      →  npm --workspace runtimes/js run build (regenerates the report)
#   Compiler tests   →  fix the failing test or the code it exercises
#   Runtime tests    →  fix the failing test or the code it exercises
#   Build runtime    →  fix the build error
preflight:
	@echo "◌ Checking compiler lock file..." && \
	cd compiler && poetry check --lock && cd .. && \
	echo "  ✓ Lock file current" && \
	echo "◌ Running sync checks..." && \
	python3 scripts/run_sync_checks.py && \
	echo "  ✓ Sync checks passed" && \
	echo "◌ Running TextMate grammar tests..." && \
	npm --workspace syntax test && \
	echo "  ✓ TextMate grammar tests passed" && \
	echo "◌ Compiling runtime..." && \
	npm --workspace runtimes/js run build:compile && \
	echo "  ✓ Runtime compiled" && \
	echo "◌ Checking API surface..." && \
	npm --workspace runtimes/js run check:api && \
	echo "  ✓ API surface current" && \
	echo "◌ Running compiler tests..." && \
	cd compiler && poetry run pytest -q && cd .. && \
	echo "  ✓ Compiler tests passed" && \
	echo "◌ Running runtime tests..." && \
	npm --workspace runtimes/js test && \
	echo "  ✓ Runtime tests passed" && \
	echo "◌ Building runtime..." && \
	npm --workspace runtimes/js run build && \
	echo "  ✓ Runtime built" && \
	echo "◌ Testing JetBrains plugin..." && \
	cd plugins/jetbrains && ./gradlew test -q && cd ../.. && \
	echo "  ✓ JetBrains plugin tests passed" && \
	echo "◌ Building JetBrains plugin..." && \
	cd plugins/jetbrains && ./gradlew buildPlugin -q && cd ../.. && \
	echo "  ✓ JetBrains plugin built" && \
	echo "◌ Running example projects..." && \
	npm --workspace examples/hello-viv-ts run start && \
	npm --workspace examples/hello-viv-js run start && \
	echo "  ✓ Example projects ran successfully" && \
	echo "" && \
	echo "✓ Preflight complete. Safe to push!"

# Generate both JSON schemas from TypeScript types.
#
# Because the JSON Schema formalism doesn't support functions, we rely on `ts-json-schema-generator`
# outputting a special `$comment` field for functions (and only for functions), which we detect here
# to replace all schema values for functions with `{"isFunction": true}`. At runtime, we equip `ajv`
# with a special keyword handler for `isFunction`.
schemas:
	@if [ -n "$(VERSION)" ]; then \
		SCHEMA_VERSION="$(VERSION)"; \
	elif [ -n "$(BUMP)" ]; then \
		if [ ! -f $(COMPILER_BUNDLE_SCHEMA_PATH) ]; then \
			echo "Error: schema file not found (did you run 'make clean'?). Use VERSION=x.y.z instead." && exit 1; \
		fi; \
		SCHEMA_VERSION=$$(./scripts/bump-semver-string.sh "$(BUMP)" $$(jq -r '.version' $(COMPILER_BUNDLE_SCHEMA_PATH))); \
	else \
		echo "Usage: make schemas BUMP=none|patch|minor|major  or  VERSION=x.y.z" && exit 1; \
	fi && \
	echo "◌ Generating content-bundle schema..." && \
	npx ts-json-schema-generator \
		--tsconfig $(TSCONFIG_PATH) \
		--path '$(SOURCE_TYPES_PATH)' \
		--type ContentBundle \
		--out $(COMPILER_BUNDLE_SCHEMA_PATH) && \
	jq --arg v "$$SCHEMA_VERSION" '{version: $$v} + . ' $(COMPILER_BUNDLE_SCHEMA_PATH) \
		| sponge $(COMPILER_BUNDLE_SCHEMA_PATH) && \
	cp $(COMPILER_BUNDLE_SCHEMA_PATH) $(RUNTIME_BUNDLE_SCHEMA_PATH) && \
	echo "  ✓ Generated content-bundle schema (v$$SCHEMA_VERSION)" && \
	echo "◌ Generating runtime API schema..." && \
	npx ts-json-schema-generator \
		--tsconfig $(TSCONFIG_PATH) \
		--path '$(SOURCE_TYPES_PATH)' \
		--type HostApplicationAdapter \
		--type AttemptActionArgs \
		--type SelectActionArgs \
		--type QueuePlanArgs \
		--type RunSearchQueryArgs \
		--type RunSiftingPatternArgs \
		--functions comment \
		--out $(RUNTIME_API_SCHEMA_PATH) && \
	jq \
		'walk(if type == "object" and has("$$comment") then {"isFunction": true} else . end)' \
		$(RUNTIME_API_SCHEMA_PATH) | sponge $(RUNTIME_API_SCHEMA_PATH) && \
	echo "  ✓ Generated API schema" && \
	echo "◌ Recompiling content bundles in example projects..." && \
	$(LIVE_VIVC) -q \
		-i $(HELLO_VIV_TS_CONTENT_DIR)/source.viv \
		-o $(HELLO_VIV_TS_CONTENT_DIR)/compiled_content_bundle.json && \
	$(LIVE_VIVC) -q \
		-i $(HELLO_VIV_JS_CONTENT_DIR)/source.viv \
		-o $(HELLO_VIV_JS_CONTENT_DIR)/compiled_content_bundle.json && \
	echo "  ✓ Recompiled content bundles"; \

# Remove all generated artifacts
clean:
	@echo "◌ Cleaning generated files..."
	@rm -f $(COMPILER_BUNDLE_SCHEMA_PATH)
	@rm -f $(RUNTIME_BUNDLE_SCHEMA_PATH)
	@rm -f $(RUNTIME_API_SCHEMA_PATH)
	@echo "  ✓ Completed clean process"

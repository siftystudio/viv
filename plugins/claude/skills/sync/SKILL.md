---
name: sync
description: Synchronize the Viv ecosystem — compiler version, runtime version, and local monorepo copy. Handles upgrades, downgrades, and initial cloning.
user-invocable: false
---

# Viv Sync

You are tasked with synchronizing the Viv ecosystem. This means ensuring the compiler, runtime, monorepo copy, and editor plugins are all in harmony.


## What to check

1. **Compiler version:** Run `vivc --version`. Check `viv-plugin-read-state` for the compiler path if not on PATH.

2. **Runtime version:** Run `viv-plugin-install-runtime --check`.

3. **Monorepo copy:** Run `viv-plugin-fetch-monorepo --check`. If installed, check its version — look at `compiler/pyproject.toml` or `runtimes/js/package.json` in the monorepo.

4. **Compatibility:** The compiler and runtime must be compatible. If they're not, the tools themselves will produce errors telling you what's wrong. Compatible versions ship from the same monorepo commit.

5. **Editor plugins:** Run `--check` on all three editor install scripts to detect installed editors missing the Viv plugin. If an editor is installed but the Viv plugin isn't, offer to install it.


## Actions

**If the monorepo copy doesn't exist:**

```bash
viv-plugin-fetch-monorepo
```

If you know the specific release tag for the user's installed version (format: `compiler-v<version>`), pass it:

```bash
viv-plugin-fetch-monorepo compiler-v0.10.4
```

**If the monorepo copy is behind the installed compiler/runtime:**

Update it by running `viv-plugin-fetch-monorepo` with the matching release tag.

**If the monorepo copy is ahead of the installed versions:**

Either:
- Suggest the user update their compiler (conversational — Python environments vary)
- Update the runtime: `viv-plugin-install-runtime`
- Or downgrade the monorepo copy to match (run `viv-plugin-fetch-monorepo` with the older tag)

**If the compiler and runtime are incompatible:**

Report the mismatch to the user. Suggest they update whichever component is behind. The tools' own error messages will indicate which direction the mismatch goes.

**If editor plugins are missing:**

Install them using the corresponding scripts:
- `viv-plugin-install-vscode-extension`
- `viv-plugin-install-webstorm-plugin`
- `viv-plugin-install-sublime-package`


## After syncing

Update state using `viv-plugin-write-state`:

```bash
viv-plugin-write-state --set monorepo_tag <tag>
viv-plugin-write-state --set monorepo_cloned_at <date>
viv-plugin-write-state --set compiler_version <version>
viv-plugin-write-state --project <path> runtime_version <version>
viv-plugin-write-state --project <path> last_checked <date>
```

Report what you did back to the user.

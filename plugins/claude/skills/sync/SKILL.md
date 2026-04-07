---
name: sync
description: Synchronize the Viv ecosystem — compiler version, runtime version, and local monorepo copy. Handles upgrades, downgrades, and initial cloning.
user-invocable: false
---

# Viv Sync

You are tasked with synchronizing the Viv ecosystem. This means ensuring the compiler, runtime, and local monorepo copy are all in harmony.


## What to check

1. **Compiler version:** Run `vivc --version` (check `${CLAUDE_PLUGIN_DATA}/toolchain.md` for the path if not on PATH).

2. **Runtime version:** Run `npm list @siftystudio/viv-runtime` in the user's project, or check their `package.json`.

3. **Monorepo copy:** Check if `${CLAUDE_PLUGIN_DATA}/viv-monorepo/` exists. If it does, check its version — look at `compiler/pyproject.toml` or `runtimes/js/package.json` in the copy.

4. **Compatibility:** The compiler and runtime must be compatible. If they're not, the tools themselves will produce errors telling you what's wrong. Compatible versions ship from the same monorepo commit.


## Actions

**If the monorepo copy doesn't exist:**

Clone it:
```bash
mkdir -p ${CLAUDE_PLUGIN_DATA}/viv-monorepo
curl -sL https://github.com/siftystudio/viv/archive/refs/heads/main.tar.gz | tar xz --strip-components=1 -C ${CLAUDE_PLUGIN_DATA}/viv-monorepo/
```

If you know the specific release tag for the user's installed version, use that instead of `main`:
```bash
curl -sL https://github.com/siftystudio/viv/archive/refs/tags/{TAG}.tar.gz | tar xz --strip-components=1 -C ${CLAUDE_PLUGIN_DATA}/viv-monorepo/
```

**If the monorepo copy is behind the installed compiler/runtime:**

Update it by downloading the matching release tag tarball and replacing the directory.

**If the monorepo copy is ahead of the installed versions:**

Either:
- Suggest the user update their compiler/runtime: `pip install --upgrade viv-compiler`, `npm install @siftystudio/viv-runtime@latest`
- Or downgrade the monorepo copy to match (download the older tag)

**If the compiler and runtime are incompatible:**

Report the mismatch to the calling agent. Suggest the user update whichever component is behind. The tools' own error messages will indicate which direction the mismatch goes.


## After syncing

Update `${CLAUDE_PLUGIN_DATA}/toolchain.md` with current paths and versions.

Update `${CLAUDE_PLUGIN_DATA}/status.json` with the current state — monorepo tag, clone date, and the current project's compiler/runtime versions. If `status.json` already exists, merge updates into the existing data (preserve other projects' entries).

Report what you did back to the calling agent or user.

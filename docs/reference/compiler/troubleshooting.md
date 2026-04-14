---
title: Troubleshooting
description: How to diagnose and fix Viv compilation failures — installation issues, parse errors, semantic errors, and the Claude Code plugin.
next: false
---

This page covers the most common issues you may encounter when installing or using the Viv compiler, including [installation problems](#installation-issues), [syntax errors](#debugging-a-syntax-error), and [semantic errors](#debugging-a-semantic-error). The compiler's error messages are designed to be descriptive and actionable, so in most cases, reading the message carefully will point you directly at the fix. That said, the easiest way to troubleshoot Viv is by using the [Claude Code plugin](https://github.com/siftystudio/viv/blob/main/plugins/claude/README.md), as illustrated [below](#phoning-a-friend).

## Installation issues

Once you install the compiler, the `vivc` command should be available for use. If this is not the case:

* **Check your Python version.** The Viv compiler requires Python 3.11 or later. Run `python3 --version` to confirm.

* **Check your PATH.** If you installed into a virtual environment, make sure that environment is activated. If you installed with `pip install --user`, the `vivc` script may be in `~/.local/bin`, which may not be on your PATH.

* **Check which `pip` you used.** Running `pip install viv-compiler` installs into whichever Python `pip` is linked to. If you have multiple Python installations, you may have installed into the wrong one. Try `python3 -m pip install viv-compiler` to ensure you're installing into the Python you intend to use.

* **Confirm the installation.** Run `python3 -m viv_compiler --test` to invoke the compiler directly via Python, bypassing any PATH issues. If this works but `vivc` doesn't, the issue is PATH configuration.

* **Deeper issues.** For truly gnarly compiler setups, consider using 

## Compilation issues

There are two distinct classes of problems that can prevent Viv source files from being compiled:

* **Syntax errors.** These occur when a source file cannot be parsed due to malformed syntax, such as a typo in a field name. In such cases, a `VivParseError` will be emitted. When invoked via the CLI or an editor plugin, the compiler will display some helpful debugging data (see [Debugging a syntax error](#debugging-a-syntax-error)). For an extremely detailed parsing trace, set the `--verbose-parser` flag, but note that this will write debug files to your working directory.

* **Semantic errors.** These occur when a source file is parsed, but the compiler's validation module detects an issue in the compiled content bundle, such as an action with no initiator role. In such cases, a `VivCompileError` will be emitted, with an informative message. When invoked via the CLI or an editor plugin, the compiler may also display (alongside an error message) the offending file, line, column, and source code. For the full traceback, pass the `--traceback` CLI flag, though note that this is generally intended to aid development of the compiler, not authoring.

## Debugging a syntax error

To illustrate troubleshooting in the face of a syntax issue, consider the following example error message:

```
Source file could not be parsed:

- File: /Users/vivian/hamlet.viv
- Position: line 21, col 13
- Context (failed at *): ...queue [*]plot-reven...
- Viable next tokens: action, action-selector, plan, plan-selector
```

Some critical information is included in this message:

 - The issue occurs in this file: `/Users/vivian/hamlet.viv`.

 - The issue occurs specifically at line 21, column 13.

 - The position marker `[*]` marks the exact spot at which the parser could proceed no further: `queue [*]plot-reven`.

 - The parser could have proceeded had one of these tokens appeared at that position: `action`, `action-selector`, `plan`, or `plan-selector`.

In this case, the parser got through a token `queue` before getting stuck upon encountering a token beginning `plot-reven` (it was `plot-revenge`). This is because the reaction was missing the keyword `action`. That is, the author should have typed `queue action plot-revenge`, rather than just `queue plot-revenge`.

Note that the error message does hint at this exact solution, in that it indicates that one of the tokens that would have worked here was `action`. In other cases, there will be too many expected tokens for the error message to be much help, but at least you'll know exactly where the parser tripped up.

## Debugging a semantic error

Unlike syntax errors, semantic errors are caught by the compiler's validation module after parsing succeeds. Their messages are designed to be self-explanatory—they name the offending construct, describe the issue, and often suggest the fix. Here are a few representative examples.

An action missing its required initiator role:

```
* Compilation failed:

Action 'greet' has no 'initiator' role (every action requires exactly one role
labeled 'as: initiator')

- File: hamlet.viv
- Line: 14, Col: 1
```

A reaction that queues a construct that doesn't exist (likely a typo):

```
* Compilation failed:

Action 'write-gossip-note' has reaction that queues undefined plan:
'plot-revennge'

- File: hamlet.viv
- Line: 37, Col: 13
```

A role label that isn't valid for the construct type:

```
* Compilation failed:

Sifting pattern 'revenge' has role '@offense' with invalid role label 'spawn'
(only these labels are allowed in a sifting pattern: character, action, item,
location, precast)

- File: hamlet.viv
- Line: 52, Col: 9
```

In each case, the message tells you exactly what went wrong and where. If the fix isn't obvious from the message alone, the [Viv Claude Code plugin](https://github.com/siftystudio/viv/blob/main/plugins/claude/README.md) can help—see [Phoning a friend](#phoning-a-friend) below.

## Phoning a friend

If you're stuck on a compiler error, the [Viv Claude Code plugin](https://github.com/siftystudio/viv/blob/main/plugins/claude/README.md) can diagnose the issue, explain what went wrong, walk you through the fix, and implement it for you.

Here's an illustrative example showing a user who merely points to a file that won't compile:

```diff frame="terminal" 
❯ /viv:fix the compiler error in haunted-house.viv                                                    
                                                                                                      
⏺ Let me compile it to see the error.                                                             
                                                                                                      
⏺ Bash(vivc --input haunted-house.viv)                                                           
  ⎿  Error: Exit code 1                                                                               
                                                                                                      
     * Compiling source file: haunted-house.viv                                                       
                                                                                                      
     * Compilation failed:                                                                            
   
     Plan selector 'choose-retreat' precasts role 'escapee' in bindings for candidate 'calm-nerves',  
     but candidate has no role by that name                                                         

⏺ The error is clear. The plan-selector choose-retreat (line 71) binds @escapee: @escapee for
  candidate calm-nerves, but calm-nerves (line 64) has a role called @comforter, not @escapee. The
  left side of a with binding names a role on the candidate, and calm-nerves has no @escapee role.    
   
  The fix: change the binding so the candidate's @comforter role receives the selector's @escapee.    
                                                                                                    
⏺ Update(haunted-house.viv)                                                                           
                  
──────────────────────────────────────────────────────────────────────────────────────────────────────
 Edit file
 haunted-house.viv                                                                                    
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 75      target randomly:                                                                             
 76          calm-nerves:                                                                             
 77              with partial:                      
- 78                  @escapee: @escapee                                                               
+ 78                  @comforter: @escapee                                                             
 79     
 80  
 81  // --------------------------------------------------------------------------
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Do you want to make this edit to haunted-house.viv?
 ❯ 1. Yes
   2. Yes, allow all edits during this session (shift+tab)
   3. No
```

The Claude Code plugin can also handle installing the compiler into gnarly Python situations:

```text frame="terminal" 
❯ /viv:fix I can't install the compiler

⏺ Bash(vivc --version 2>&1 || echo "NOT_INSTALLED")
  ⎿  (eval):1: command not found: vivc
     NOT_INSTALLED

⏺ Confirmed — vivc isn't on your PATH yet. Python environments vary a lot. I 
  need to make sure I pick the right install command:

⏺ User answered Claude's questions:
  ⎿  · How do you prefer to install Python CLI tools? → pip3 (user or global)

⏺ Bash(which pip3 && pip3 --version)
  ⎿  /usr/local/bin/pip3
     pip 25.2 from /usr/local/lib/python3.10/site-packages/pip (python 3.10
     )

⏺ Bash(pip3 install viv-compiler 2>&1 | tail -30)
  ⎿  ERROR: Ignored the following versions that require a different python
     version: 0.10.0 Requires-Python <4.0,>=3.11; 0.10.1 Requires-Python <4
     .0,>=3.11; 0.10.2 Requires-Python >=3.11; 0.10.3 Requires-Python >=3.1
     … +9 lines (ctrl+o to expand)
⏺ Found a snag: your default pip3 points to Python 3.10, but viv-compiler
  requires Python 3.11+. Let me see what else is available.

  Listed 1 directory (ctrl+o to expand)

⏺ You have Python 3.12 and 3.13 available. I'll use 3.13 since it's newest.

⏺ Bash(python3.13 -m pip install viv-compiler 2>&1 | tail -20)
  ⎿      If you wish to install a Python application that isn't in Homebrew
     ,
         it may be easiest to use 'pipx install xyz', which will manage a
     … +21 lines (ctrl+o to expand)

⏺ Python 3.13 is externally managed by Homebrew (PEP 668). The safe path is pip 
  install --user. Checking you're okay with that before running it:

⏺ User answered Claude's questions:
  ⎿  · Your Homebrew Python blocks global pip installs. How should I install 
     viv-compiler? → pip install --user

⏺ Bash(python3.13 -m pip install --user viv-compiler 2>&1 | tail -15)
  ⎿      brew install pipx

         You may restore the old behavior of pip by passing
     … +19 lines (ctrl+o to expand)

⏺ PEP 668 blocks even --user on this Python. The only clean options are pipx or
  --break-system-packages. Quickest fix:

⏺ User answered Claude's questions:
  ⎿  · Homebrew also blocks --user. How should we proceed? → Use 
     --break-system-packages --user

⏺ Bash(python3.13 -m pip install --user --break-system-packages viv-compiler
      2>&1 | tail -20)
  ⎿  Collecting viv-compiler
       Downloading viv_compiler-0.10.4-py3-none-any.whl.metadata (16 kB)
     Requirement already satisfied: arpeggio<3.0,>=2.0 in /usr/local/lib/py
     … +10 lines (ctrl+o to expand)

⏺ Permission denied on ~/Library/Python/3.13, which is odd for a path in your
  home dir. Let me check what's going on there.

  Listed 2 directories (ctrl+o to expand)

⏺ Found it: ~/Library/Python/ is owned by root from back in 2018 (probably a
  stray sudo install). I can't fix that without sudo, and I'd rather not chain
  sudo operations without your say-so. Pivoting to pipx is the cleanest path
  forward — it sidesteps the broken directory entirely by using its own isolated
   virtualenv.

⏺ User answered Claude's questions:
  ⎿  · Your ~/Library/Python/ is root-owned (likely from a 2018 sudo install). 
     Switch approach? → Fix ownership with sudo

⏺ Running sudo chown will prompt for your password. If the tool hangs or fails
  on the password prompt, I'll ask you to run it yourself with the ! prefix.

⏺ Bash(sudo -n chown -R jamesryan:staff /Users/jamesryan/Library/Python 2>&1)
  ⎿  Error: Exit code 1
     sudo: a password is required

⏺ As expected — I can't pass a sudo password. Could you run this yourself? Type
  the following into the prompt (with the ! prefix so it runs in your shell and
  I see the output):

  ! sudo chown -R jamesryan:staff /Users/jamesryan/Library/Python

  Once that completes, I'll retry the pip install.

✻ Worked for 2m 22s

!  sudo chown -R jamesryan:staff /Users/jamesryan/Library/Python                
  ⎿  sudo: a terminal is required to read the password; either use the -S option
      to read from standard input or configure an askpass helper
     sudo: a password is required

❯ Done.                                                                         

⏺ The ! prefix doesn't give sudo a TTY to prompt for the password, so that won't
   work. Two options:

  1. Run sudo chown -R jamesryan:staff ~/Library/Python in a separate Terminal
  window, then tell me when it's done and I'll retry the pip install.
  2. Skip the chown entirely and install into a fresh virtualenv instead — no
  sudo needed, no touching broken dirs. I'd create ~/.venvs/viv, install
  viv-compiler there, and symlink vivc into /usr/local/bin (which you already
  own).

  Which do you want?

❯ #1. Done.                                                                         

⏺ Retrying the install.

  Listed 1 directory (ctrl+o to expand)

⏺ Ownership fixed. Installing viv-compiler.

⏺ Bash(python3.13 -m pip install --user --break-system-packages viv-compiler
      2>&1 | tail -15)
  ⎿  Collecting viv-compiler
       Using cached viv_compiler-0.10.4-py3-none-any.whl.metadata (16 kB)
     Requirement already satisfied: arpeggio<3.0,>=2.0 in /usr/local/lib/py
     … +11 lines (ctrl+o to expand)

⏺ Installed to ~/Library/Python/3.13/bin, which isn't on your PATH yet. Let me
  verify it works, then get it on PATH.

⏺ Bash(/Users/jamesryan/Library/Python/3.13/bin/vivc --version 2>&1)
  ⎿  * Installed versions:

       - Compiler Package: 0.10.4
     … +4 lines (ctrl+o to expand)

  Listed 1 directory (ctrl+o to expand)

⏺ You own /usr/local/bin. I'll symlink vivc there so it's on your PATH without
  any shell config changes.

⏺ Bash(ln -s /Users/jamesryan/Library/Python/3.13/bin/vivc /usr/local/bin/vivc
      && vivc --version 2>&1)
  ⎿  * Installed versions:

       - Compiler Package: 0.10.4
     … +4 lines (ctrl+o to expand)

⏺ vivc 0.10.4 is on your PATH. Running the smoke test.

⏺ Bash(vivc --test 2>&1)
  ⎿  * Compiling sample file...

     * Smoke test passed
     … +2 lines (ctrl+o to expand)

⏺ Smoke test passed. You're good to go.
```


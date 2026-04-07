# Viv Plugin Map

## Plugin directory (`${CLAUDE_PLUGIN_ROOT}`)

```
plugins/claude/
├── .claude-plugin/
│   └── plugin.json                  Plugin manifest (name: "viv", version, metadata)
├── docs/
│   ├── primer.md                    Viv primer — shared foundation for all agents
│   ├── monorepo-map.md              Detailed file map of the Viv monorepo
│   ├── plugin-map.md                This file
│   └── agents/
│       ├── main.md                  Orchestrator guide — main Claude only (via CLAUDE.md)
│       ├── writer.md                Instructions for the writer sub-agent
│       ├── fixer.md                 Instructions for the fixer sub-agent
│       ├── designer.md              Instructions for the designer sub-agent
│       ├── researcher.md            Instructions for the researcher sub-agent
│       ├── engineer.md              Instructions for the engineer sub-agent
│       └── critic.md                Instructions for the critic sub-agent
├── skills/
│   ├── setup/SKILL.md               /viv:setup — onboard a project
│   ├── ask/SKILL.md                 /viv:ask — session-only Viv awareness
│   ├── write/SKILL.md               /viv:write — dispatch writer sub-agent
│   ├── fix/SKILL.md                 /viv:fix — dispatch fixer sub-agent
│   ├── design/SKILL.md              /viv:design — dispatch designer sub-agent
│   ├── study/SKILL.md               /viv:study — dispatch researcher sub-agent
│   ├── build/SKILL.md               /viv:build — dispatch engineer sub-agent
│   ├── critique/SKILL.md            /viv:critique — dispatch critic sub-agent
│   ├── feedback/SKILL.md            /viv:feedback — send feedback to Viv team
│   └── sync/SKILL.md                /viv:sync — ecosystem version harmony (hidden)
├── hooks/
│   └── hooks.json                   Auto-approves `vivc` commands (no permission prompt)
├── CHANGELOG.md
├── LICENSE.txt
└── README.md


## Plugin data (`${CLAUDE_PLUGIN_DATA}`)

Written at runtime by /viv:setup and /viv:sync. Not shipped with the plugin.

```
~/.claude/plugins/data/viv/
├── viv-monorepo/                    Tarball of the Viv monorepo at matching release tag
├── toolchain.md                     Local compiler/runtime paths and versions
└── status.json                      Ecosystem state — monorepo tag, per-project versions
```


## User's project

The only footprint in the user's project:

```
my-project/
└── CLAUDE.md                        Small "## Viv" section appended by /viv:setup
```

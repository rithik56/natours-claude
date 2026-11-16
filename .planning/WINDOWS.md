---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 1
total_count: 1
last_updated: 2026-11-16T12:05:14.308Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 04 | stub | scripts/seed.ts |  | The today option is parsed and validated by parseSeedArgs but not applied, since runSeed takes no today; the date roll is wired in plan 04-03 | fixed |  | 2026-11-16T11:16:30.832Z | 2026-11-16T12:05:14.308Z |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "04",
    "file": "scripts/seed.ts",
    "line": null,
    "description": "The today option is parsed and validated by parseSeedArgs but not applied, since runSeed takes no today; the date roll is wired in plan 04-03",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-16T11:16:30.832Z",
    "resolved_at": "2026-11-16T12:05:14.308Z",
    "milestone": null
  }
]
````

# 0008. Plan-review findings are handled per phase

Status: Accepted
Date: 9 Nov 2026
Requirements: Q10
Plan review: DEL-20

## Context

The plan review (`docs/plan-review/`) had five reviewers: architect, security, qa, design and delivery. Round 1 logged 127 findings: 8 Blockers, 80 Majors and 39 Minors. Round 2 stopped part-way and no `report.md` was written. The Blockers were settled while the project was initialised. Most Majors and Minors are local to one requirement or one phase.

## Decision

Plan-review Majors and Minors are handled when each phase is planned. `.planning/REQUIREMENTS.md`, under "Known Issues from the Plan Review", lists them against the requirements they affect, and the planner of each phase reads the ones for its own requirements.

Review rounds 2 and 3 are not resumed.

## Consequences

- Each phase's plans cite the findings they address, and the finding IDs resolve to files in `docs/plan-review/`, which are committed.
- A finding that is never attached to a requirement, or never read by the planner of its phase, is not handled.
- Findings that only concern the agent-team process are dropped, as ADR 0002 records.

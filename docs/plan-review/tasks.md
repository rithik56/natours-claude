# Plan review: shared task list

Kept by the lead. This session has no task-list tool, so the list lives here. Teammates report
progress to the lead, and the lead updates the status column. Claude Code blocks teammates from
writing report files, so with the user's approval the lead saves each findings file verbatim from
the teammate's reply and applies their Round 2 revisions the same way.

| ID | Round | Task | Owner | Depends on | Status |
|---|---|---|---|---|---|
| R1-ARC | 1 | Independent review → `findings-architect.md` | architect | none | done: 2 Blocker, 16 Major, 8 Minor |
| R1-SEC | 1 | Independent review → `findings-security.md` | security | none | done: 1 Blocker, 18 Major, 8 Minor |
| R1-QA | 1 | Independent review → `findings-qa.md` | qa | none | done: 1 Blocker, 18 Major, 6 Minor |
| R1-DES | 1 | Independent review → `findings-design.md` | design | none | done: 0 Blocker, 12 Major, 10 Minor |
| R1-DEL | 1 | Independent review → `findings-delivery.md` | delivery | none | done: 4 Blocker, 16 Major, 7 Minor |
| R2-ARC | 2 | Challenge security and qa; answer challenges from design and delivery | architect | all R1 | in progress |
| R2-SEC | 2 | Challenge qa and design; answer challenges from architect and delivery | security | all R1 | in progress |
| R2-QA | 2 | Challenge design and delivery; answer challenges from architect and security | qa | all R1 | in progress |
| R2-DES | 2 | Challenge delivery and architect; answer challenges from security and qa | design | all R1 | in progress |
| R2-DEL | 2 | Challenge architect and security; answer challenges from qa and design | delivery | all R1 | in progress |
| R3-1 | 3 | Check every Blocker and Major against plan.md and cited sources | lead | all R2 | waiting |
| R3-2 | 3 | Merge duplicates, settle or list disputes | lead | R3-1 | waiting |
| R3-3 | 3 | Write `report.md` | lead | R3-2 | waiting |
| R3-4 | 3 | Shut down teammates and clean up the team | lead | R3-3 | waiting |

# CLAUDE.md - SVNHUB

This file guides Claude Code when working in this repository.

---

## 📥 REQUEST CLASSIFIER

Before taking any action, classify the request type:

| Request Type | Active Tiers | Action / Result |
|---|---|---|
| **QUESTION** | TIER 0 | Answer via text response. |
| **SURVEY/INTEL** | TIER 0 + Explorer | Session intelligence, no file edits. |
| **SIMPLE CODE** | TIER 0 + TIER 1 (lite) | Surgical inline edit of a single file. |
| **COMPLEX CODE** | TIER 0 + TIER 1 (full) | **Requires plan file** at `docs/PLAN-{task-slug}.md` first. |
| **CROSS_IDE_PLAN** | TIER 0 + Bridge | Run MCP `plan_with_claude` to generate `docs/PLAN-{slug}.md` (no code edits). |
| **CROSS_IDE_EXECUTE** | TIER 0 + Bridge | Run MCP `execute_with_cursor` to implement the approved plan via Cursor SDK. |

---

## 🛠️ CROSS-IDE BRIDGE FLOW

When `ag-kit-bridge` MCP is enabled, use the following sequence for complex tasks:

1. **Classify & Route**: Run `classify_and_route`.
2. **Plan**: Run `plan_with_claude` to create `docs/PLAN-{slug}.md`.
3. **Approve**: Wait for user review/approval of the plan.
4. **Handoff**: State is synchronized at `.cursor/handoff/active.json`.
5. **Execute**: Run `execute_with_cursor` to implement via Cursor.

---

## 🧠 STRATEGIC COGNITIVE RULES

### 1. Socratic Gate (Ask Before Code)
If a task is complex, ambiguous, or lacks detailed specifications, **STOP** and ask at least **3 strategic questions** before writing any code. Clarify edge cases, data structures, and trade-offs.

### 2. Clean Code & Karpathy Guidelines
- **Pragmatic Simplicity**: Do not over-engineer. Write concise, self-documenting code.
- **Surgical Edits**: Make precise diffs. Do not rewrite whole files when a line-level edit suffices.
- **Test-Driven Design**: Write unit/integration tests following the AAA (Arrange, Act, Assert) pattern.
- **No Narrating Comments**: Do not add comments explaining *what* the code does (e.g., "Import module", "Increment index"). Only document *why* non-obvious trade-offs were made.

### 3. Conventional Commits
All commits must follow the format: `<type>(<scope>): <subject>` (e.g., `feat(auth): add Google provider` or `fix(cart): resolve race condition`).

---

## 📁 RULES & SKILLS INDEX

The complete toolkit is fully available in the following paths:
- **Detailed Rules**: Located at `.claude/rules/`
- **Modular Skills**: Located at `.claude/skills/`
- **Kit Reference**: Connected to the Antigravity Kit at `D:/cursorKit`


Please consult `.claude/rules/` and `.claude/skills/` when executing tasks to leverage domain-specific expertise.

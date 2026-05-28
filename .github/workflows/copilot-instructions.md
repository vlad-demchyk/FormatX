# Instructions for Copilot Agent

## 1. Architectural Integrity
- Always inspect the directory structure before suggesting files or refactoring.
- If a requested change violates the existing architecture (e.g., MVC, Hexagonal), block the action, explain the conflict, and suggest a compliant alternative.

## 2. Planning & Sync Workflow
- For any new feature/refactoring:
    - First, create a `PLAN.md` file in the root.
    - Structure: Goal, Strategy, Step-by-step checklist (using `[ ]`).
- After every coding session, update the `PLAN.md` by marking completed steps as `[x]`.

## 3. Decision-Making & Research
- When you see multiple ways to solve a problem:
    - Halt implementation.
    - Provide a short summary of options (pros/cons).
    - Ask for my approval to proceed.
- When working with new technologies, research current best practices before writing the code.

## 4. Documentation
- Every new function or class must include appropriate JSDoc/Docstrings.
- Update `README.md` or relevant `docs/` files whenever a major feature is added or logic changes.

## 5. Communication Style
- Be concise.
- If a task requires multiple steps, show the plan first.
- Always provide a brief explanation of *why* you chose a specific implementation pattern.
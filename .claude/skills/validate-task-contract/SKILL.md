---
name: validate-task-contract
description: Validate Offload Task Contract (MD/JSON) for completeness, consistency, and executability before delegation.
---

# Validate Task Contract

This skill validates whether an Offload Task Contract can be safely
consumed by a Target Agent without inference or ambiguity.

## Inputs (REQUIRED)
- task_contract.json
- task_contract.md

Both inputs MUST be present.

## Validation Scope (STRICT)

### 1. Structural Validation (JSON)
The JSON contract MUST include:
- task_id (string)
- schema_version (string)
- steps (non-empty array)

Each step MUST include:
- action (enum: Edit | Write | Bash | Read)
- target (string)
- instruction (string)
- expected_outcome (string)
- fix_hint (string)

### 2. Scope & Safety Validation
- steps MUST NOT reference files outside declared scope
- forbidden actions (if present) MUST NOT appear in steps
- action MUST match allowed tools for the Target Agent

### 3. MD ↔ JSON Consistency
- Task ID in MD MUST match task_id in JSON
- Number of steps described in MD MUST match steps.length in JSON
- Objective in MD MUST NOT contradict JSON instructions

### 4. Determinism Rules
- No optional or inferred fields
- No ambiguous language (e.g., “maybe”, “if needed”, “consider”)
- No missing execution parameters

## Output (STRICT JSON ONLY)

```json
{
  "valid": true,
  "errors": [],
  "fix_hints": []
}

## Failure Output Example

{
  "valid": false,
  "errors": [
    "Missing required field: steps[0].expected_outcome",
    "MD/JSON task_id mismatch"
  ],
  "fix_hints": [
    "Add expected_outcome to each step",
    "Ensure task_id matches in both MD and JSON"
  ]
}
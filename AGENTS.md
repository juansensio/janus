# Constraints

When two of these collide, pick the one that cuts future cost in this codebase and say so in the commit. They are constraints, not a checklist: violate a slogan when judgment says so. Invariants 10–12 are the hard form and never yield.

## Work order

Refactor to the principle first, then change behavior. A behaviour-preserving refactor with tests green (plus an output dump for pricing-sized domains), then the change. Never both in one unverifiable diff.

Gates, not promises. A prompted "never" does not protect the source of truth; a rule that matters is enforced by CI or a hook.

## Invariants 10–12 (never violate)

**10. One owning module per domain.** Each business domain's logic (pricing, valuation, pedigree reading, sharing, imports, analytics…) lives in one module with its rules doc; everyone else calls it. Pricing: `services/pricing/` + `docs/PRICING_RULES.md`. Consolidate a scattered domain before adding to it. Extend the existing module; create a new one only when you can say why the old one cannot own it. A new rule goes in its domain's owner, not in the first feature that needs it. A function-level import to dodge a cycle means the logic is in the wrong module.

**11. Never duplicate logic.** On the second use: (1) move it to a shared module, (2) switch the original caller, tests green, no behaviour change, (3) then build the new use. First grep the expression (the arithmetic, the format string, the threshold) and list every copy; the move switches them all, or the commit names each one left and why. A new helper beside old copies is one more duplicate. The move keeps each caller's exact results (guards, rounding, clamps); any behaviour change is its own commit. Same for schemas (one fact, one column) and UX (one partial per repeated piece).

**12. No business logic in rendering.** Templates, JS, routes, and view builders only display values; they never compute prices, rules, or classifications. Arithmetic or rules on business data there is a bug; move it to the owning module. Who sees a value is decided in Python, not by a template `if`.

## Principles

These yield to invariants 10–12 and to future cost in this codebase.

1. **Separation of concerns** (root) — one kind of work per part (UI / domain / persistence / infra). Here: domain `services/<domain>/`, persistence `models.py` and `alembic/`, presentation `templates` and `static/`, routing `pocket/` and `app.py`. Name the one concern of the file you edit.
2. **Encapsulation** — small stable contract; hide internals. Public contracts only. Read another module's tables and caches through its functions.
3. **High cohesion, loose coupling** — change-together lives together; independents talk narrow. One rule change touches one module.
4. **DRY** — one authoritative representation of each piece of *knowledge*, not every similar line. Avoid over-DRY. Grep before writing logic. One home per rule, threshold, format, or schema fact. Do not abstract coincidental similarity.
5. **KISS** — simplest design that works; complexity is the long-term tax. Simplest working shape; function over class.
6. **Single responsibility** — one reason to change. If you describe it with "and", split it. Names say intent; comments say why.
7. **Depend on contracts** — policy doesn't depend on details; both depend on contracts. Domain code takes and returns plain values; never imports Flask, request, or templates.
8. **YAGNI** — no speculative features, frameworks, flags, or "later" hooks.
9. **Composition over inheritance** — assemble pieces; don't grow fragile hierarchies.
10. **Open/closed, with discipline** — extend at stable boundaries, only where the same change has shown up twice.

Law of Demeter (no `a.b.c.d`). Fail fast and make illegal states unrepresentable: validate at edges, never swallow errors. Optimize for deletion. Do one thing and compose. Boring tech.

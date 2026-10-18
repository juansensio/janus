# Janus

`Janus` es una herramienta de escritura creativa con asistencia por IA.

Inspirada en otras herramientas como https://hughhowey.com/neo/, añade funcionalidades como:

- herramienta es español (veremos si soporte inglés más adelante)
- integración IA para escritura creativa colaborativa

Janus es, además, un experimento abierto de desarrollo de software para probar diferentes paquetes de `skills` (https://www.youtube.com/watch?v=sU9MW8Ycq2M) y `AGENTS.md`.

- addy osmani agent-skills https://github.com/addyosmani/agent-skills
- mat pocock skills https://github.com/mattpocock/skills 
- pstack https://github.com/cursor/plugins/tree/main/pstack

Empezamos probando agent-skills https://github.com/addyosmani/agent-skills/blob/main/docs/cursor-setup.md 

```
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

9 slash commands that map to the development lifecycle. Each one activates the right skills automatically.

What you're doing	Command	Key principle
Define what to build	/spec	Spec before code
Plan how to build it	/plan	Small, atomic tasks
Build incrementally	/build	One slice at a time
Prove it works	/test	Tests are proof
Set the quality bar	/constraints	Decide it once, enforce it everywhere
Review before merge	/review	Improve code health
Audit web performance	/webperf	Measure before you optimize
Simplify the code	/code-simplify	Clarity over cleverness
Ship to production	/ship	Faster is safer
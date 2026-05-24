# 02_ARCHITECTURE_SKILL

## Objective

This skill defines the architectural standards, modularization rules, dependency control and structural organization principles for the ERP ecosystem.

The entire system must maintain:

* clean architecture
* modular scalability
* predictable structure
* low coupling
* high maintainability
* enterprise-grade organization

---

## Core Architecture Principles

Always prioritize:

* modularization
* separation of responsibilities
* isolated modules
* reusable structures
* predictable navigation
* scalability
* maintainability

Architecture quality must always take priority over temporary shortcuts.

---

## Modular Architecture Rules

Every major ERP area must be isolated into independent modules.

Example:

```txt id="w2t6f4"
RH/
ESTOQUE/
FINANCEIRO/
LOGISTICA/
CHECKLIST/
DOCUMENTOS/
CONFIGURACOES/
CENTRAL_OPERACIONAL/
```

Each module must behave as an isolated ecosystem.

---

## Required Module Structure

Every module must follow this structure:

```txt id="u4x9k1"
MODULE/
├── pages/
├── components/
├── modals/
├── forms/
├── tables/
├── services/
├── state/
├── events/
├── validations/
├── constants/
├── types/
└── styles/
```

Never place unrelated responsibilities inside the same folder.

---

## Responsibility Separation Rules

Always separate:

* UI
* business logic
* state
* events
* validations
* services
* constants
* types

Never:

* place API logic inside UI
* mix rendering with business rules
* mix validations with rendering
* create hidden dependencies

---

## Dependency Rules

Modules must remain loosely coupled.

Allowed communication:

* services
* shared interfaces
* centralized state
* approved integrations

Avoid:

* direct module-to-module manipulation
* circular dependencies
* hidden cross-module logic

---

## Shared Structure Rules

Reusable structures must be centralized.

Example:

```txt id="k6q2v7"
UI/
SERVICES/
SHARED/
UTILS/
```

Never duplicate reusable logic across modules.

---

## File Size Rules

Never allow oversized files.

When files become too large:

* split components
* separate logic
* isolate services
* modularize rendering
* extract reusable functions

Avoid giant:

* app files
* render files
* service files
* component files

---

## Navigation Optimization Rules

Architecture must optimize AI navigation.

Every structure must allow instant identification of:

* module ownership
* component ownership
* service ownership
* routes
* dependencies

Project-wide searching should be minimized.

---

## Folder Organization Rules

Folders must always reflect responsibility.

Correct examples:

```txt id="r9m4j2"
components/
services/
validations/
events/
state/
```

Incorrect examples:

```txt id="e7v1x9"
misc/
temp/
new/
random/
test/
```

---

## Route Architecture Rules

Routes must reflect module hierarchy.

Pattern:

```txt id="m8n2k5"
/module/function
```

Examples:

```txt id="y5r8w1"
/rh/funcionarios
/estoque/entradas
/financeiro/fluxo-caixa
/logistica/entregas
```

Avoid inconsistent route patterns.

---

## Component Architecture Rules

Components must:

* be reusable
* have isolated responsibility
* avoid excessive nesting
* avoid business logic overload

Always prefer:

* small components
* composable structures
* reusable UI blocks

---

## State Management Rules

State must remain organized and scalable.

Separate:

* global state
* module state
* local component state

Avoid:

* uncontrolled shared state
* duplicated state
* state mutations outside control layers

---

## Service Layer Rules

All business logic and integrations must pass through services.

Services are responsible for:

* API communication
* data transformation
* external integrations
* business operations

Never place service logic directly inside UI components.

---

## Scalability Rules

All architecture decisions must consider:

* future modules
* future integrations
* future scaling
* maintainability
* ERP growth

Never create temporary architecture solutions.

---

## Documentation Rules

Architecture changes must update:

* ERP_STRUCTURE.md
* MODULES_MAP.md
* ROUTES_MAP.md
* COMPONENTS_MAP.md
* MODULE_NETWORK_MAP.md
* DEPENDENCY_RULES.md

Architecture documentation must remain synchronized with the project.

---

## Architecture Consistency Rules

Always maintain:

* consistent folder structure
* consistent naming
* consistent module separation
* consistent service organization
* consistent route organization

Architecture must remain predictable across the entire ERP.

---

## Final Objective

Transform the ERP into:

* a scalable enterprise architecture
* an AI-friendly ecosystem
* a highly modular system
* a predictable development environment
* a maintainable long-term platform

The ERP architecture must support continuous growth without structural degradation.

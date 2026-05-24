# 04_ERP_NAVIGATION_SKILL

## Objective

This skill defines the navigation, indexing, structural mapping and AI location standards for the ERP ecosystem.

The objective is to make the entire project:

* instantly navigable
* AI-optimized
* structurally predictable
* easy to search
* easy to maintain
* easy to expand

The ERP must minimize unnecessary project-wide searching.

---

## Core Navigation Principles

Always prioritize:

* predictable structure
* fast module location
* clear folder hierarchy
* explicit ownership
* indexed architecture
* AI-friendly navigation

Every structure must be easy to identify instantly.

---

## Global Navigation Structure

The ERP must remain organized by isolated business areas.

Example:

```txt id="n4q2w1"
AUTH/
DASHBOARD/
RH/
ESTOQUE/
FINANCEIRO/
LOGISTICA/
CHECKLIST/
DOCUMENTOS/
CONFIGURACOES/
CENTRAL_OPERACIONAL/
```

Each area must behave as an isolated navigation ecosystem.

---

## Required Module Structure

Every module must follow the same navigation structure:

```txt id="t7m5k8"
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

Navigation structure must remain predictable across the entire ERP.

---

## Folder Naming Rules

Folders must always clearly describe their responsibility.

Correct examples:

```txt id="v9k1x4"
components/
services/
state/
events/
validations/
tables/
```

Incorrect examples:

```txt id="r2j8w6"
misc/
temp/
new/
random/
test/
other/
```

Avoid ambiguous folder naming.

---

## File Naming Rules

All files must follow enterprise naming patterns.

Pattern:

```txt id="m8c3q5"
MODULE_FUNCTION_DETAIL
```

Examples:

```txt id="y4p7v2"
SCREEN_STOCK_ENTRY
TABLE_EMPLOYEES
BTN_SAVE_PRODUCT
SERVICE_AUTH_LOGIN
MODAL_EDIT_USER
```

Never use:

* button1
* page2
* tempFile
* testComponent
* random names

---

## Screen Organization Rules

All screens must remain isolated inside their modules.

Example:

```txt id="x5n9k3"
RH/pages/
ESTOQUE/pages/
FINANCEIRO/pages/
```

Never place screens outside their responsible module.

---

## Route Navigation Rules

Routes must directly reflect module hierarchy.

Pattern:

```txt id="d6w2m8"
/module/function
```

Examples:

```txt id="c1q7r4"
/rh/funcionarios
/estoque/entradas
/logistica/rotas
/financeiro/fluxo-caixa
```

Avoid inconsistent routing patterns.

---

## Component Navigation Rules

Components must clearly indicate:

* ownership
* responsibility
* module relationship

Shared components must remain centralized.

Example:

```txt id="p8x4t6"
UI/
SHARED/
COMMON/
```

Avoid duplicated shared structures.

---

## Navigation Indexing Rules

The ERP must maintain active navigation indexes.

Required indexes:

* AI_PROJECT_INDEX.md
* MODULE_INDEX.md
* SCREEN_INDEX.md
* COMPONENT_INDEX.md
* SERVICE_INDEX.md
* ROUTE_INDEX.md
* STYLE_INDEX.md
* EVENT_INDEX.md

Indexes must remain synchronized with the project.

---

## Structural Mapping Rules

The ERP must maintain updated architecture maps.

Required maps:

* ERP_STRUCTURE.md
* MODULES_MAP.md
* ROUTES_MAP.md
* COMPONENTS_MAP.md
* MODULE_NETWORK_MAP.md
* DATA_FLOW_MAP.md

All maps must reflect the real project structure.

---

## Search Optimization Rules

The project must optimize AI searching.

Always make it possible to identify instantly:

* module ownership
* route ownership
* service ownership
* component ownership
* state ownership

Avoid hidden structures and unpredictable organization.

---

## Dependency Visibility Rules

Navigation must expose:

* module dependencies
* shared structures
* integrations
* communication layers

Architecture relationships must remain visible and predictable.

---

## Scalability Navigation Rules

Navigation structure must support:

* future modules
* future integrations
* future teams
* future AI automation
* enterprise growth

Never create temporary navigation structures.

---

## Documentation Synchronization Rules

When navigation changes occur, always update:

* AI_PROJECT_INDEX.md
* ERP_STRUCTURE.md
* MODULES_MAP.md
* ROUTES_MAP.md
* COMPONENTS_MAP.md

Navigation documentation must remain synchronized with the ERP.

---

## Navigation Consistency Rules

Always maintain:

* predictable hierarchy
* consistent folder patterns
* consistent module separation
* consistent naming
* consistent route structure

The ERP must remain structurally readable for both humans and AI.

---

## Final Objective

Transform the ERP into:

* an instantly navigable ecosystem
* an AI-optimized structure
* a highly searchable architecture
* a scalable enterprise platform
* a predictable development environment

The ERP must allow fast and reliable navigation without requiring deep project-wide searching.

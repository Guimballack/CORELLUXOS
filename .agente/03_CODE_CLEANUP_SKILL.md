# 03_CODE_CLEANUP_SKILL

## Objective

This skill defines the global standards for code cleanup, refactoring, organization and maintainability across the ERP ecosystem.

The objective is to continuously maintain:

* clean code
* organized structure
* scalable modules
* low complexity
* high readability
* maintainable architecture
* reusable logic

Cleanup operations must never alter existing functionality unless explicitly requested.

---

## Core Cleanup Principles

Always prioritize:

* readability
* maintainability
* modularization
* simplicity
* low coupling
* code reuse
* predictable organization

Never prioritize quick cleanup over architectural safety.

---

## Cleanup Safety Rules

Never:

* alter business rules
* change workflows
* modify permissions
* break integrations
* remove required dependencies
* change expected system behavior

Cleanup must preserve:

* functionality
* architecture compatibility
* module behavior
* route behavior
* permission behavior

---

## Dead Code Removal Rules

Always remove:

* unused imports
* unused variables
* unused functions
* unused styles
* duplicated code
* obsolete structures
* unreachable code

Never remove code without validating dependencies.

---

## Giant File Prevention Rules

Never allow oversized files.

When files become too large:

* split responsibilities
* isolate business logic
* extract reusable components
* separate services
* modularize rendering

Avoid giant:

* components
* services
* render files
* utility files
* state files

---

## Responsibility Cleanup Rules

Always separate:

* rendering
* business logic
* API communication
* validations
* events
* state management
* reusable helpers

Never mix:

* UI and business logic
* validations and rendering
* API logic and components
* unrelated responsibilities

---

## Duplication Prevention Rules

Avoid duplication of:

* business rules
* services
* validations
* styles
* constants
* components
* event handlers

Always reuse existing structures before creating new ones.

---

## Import Organization Rules

Always organize imports logically.

Recommended order:

1. external libraries
2. shared modules
3. services
4. components
5. styles
6. local files

Remove:

* duplicated imports
* unused imports
* inconsistent import paths

---

## Component Cleanup Rules

Components must remain:

* small
* reusable
* isolated
* readable
* maintainable

Always:

* reduce nesting
* simplify rendering
* extract reusable blocks
* isolate logic

Avoid:

* massive JSX blocks
* duplicated UI
* excessive conditionals
* overloaded components

---

## CSS Cleanup Rules

Always:

* centralize variables
* reuse style patterns
* remove duplicated styles
* organize styles by responsibility

Avoid:

* inline style abuse
* inconsistent spacing
* duplicated media queries
* random color usage

Maintain design system consistency.

---

## Naming Cleanup Rules

Always maintain predictable naming.

Pattern:

```txt id="y6p2w8"
MODULE_FUNCTION_DETAIL
```

Examples:

```txt id="w1m7k3"
BTN_SAVE_EMPLOYEE
TABLE_PRODUCTS
SERVICE_AUTH_LOGIN
MODAL_EDIT_USER
```

Never allow:

* random names
* temporary names
* unclear abbreviations
* duplicated identifiers

---

## State Cleanup Rules

Always:

* isolate state responsibilities
* remove duplicated state
* centralize shared state
* simplify state mutations

Avoid:

* uncontrolled shared state
* unnecessary global state
* duplicated state logic

---

## Service Cleanup Rules

Services must:

* remain reusable
* remain isolated
* centralize business operations
* centralize API communication

Avoid:

* duplicated API calls
* repeated transformation logic
* service logic inside UI

---

## Performance Cleanup Rules

Always optimize:

* rendering
* listeners
* loops
* calculations
* state updates

Avoid:

* unnecessary re-renders
* duplicated listeners
* repeated calculations
* oversized render trees

---

## Cleanup Documentation Rules

When structural cleanup occurs, update:

* COMPONENTS_MAP.md
* ERP_STRUCTURE.md
* MODULES_MAP.md
* ROUTES_MAP.md

Documentation must remain synchronized with cleanup operations.

---

## Architectural Preservation Rules

Cleanup must preserve:

* architecture integrity
* module isolation
* route consistency
* permission consistency
* design system consistency

Never break architectural standards during cleanup.

---

## Final Objective

Transform the ERP into:

* a continuously maintainable ecosystem
* a clean enterprise architecture
* a scalable codebase
* an AI-friendly structure
* a low-complexity development environment

The ERP must remain clean and organized during long-term growth without structural degradation.

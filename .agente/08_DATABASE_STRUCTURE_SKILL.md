# 08_DATABASE_STRUCTURE_SKILL

## Objective

This skill defines the global database architecture, relational structure, naming standards and scalability rules for the ERP ecosystem.

The objective is to maintain:

* scalable database architecture
* predictable relational structures
* optimized data organization
* maintainable schemas
* secure database operations
* enterprise-grade data consistency

The database must remain organized, scalable and AI-friendly.

---

## Core Database Principles

Always prioritize:

* normalization when appropriate
* relational clarity
* scalable schemas
* predictable naming
* optimized querying
* data integrity
* maintainability

Database architecture must support long-term ERP growth.

---

## Database Organization Rules

The database structure must remain modular and predictable.

Organize data by business domains.

Examples:

```txt id="x8m2q4"
rh_
estoque_
financeiro_
logistica_
documentos_
configuracoes_
```

Avoid unrelated table grouping.

---

## Table Naming Rules

All table names must remain:

* descriptive
* predictable
* scalable
* lowercase
* standardized

Pattern:

```txt id="k6v3p1"
module_entity
```

Examples:

```txt id="u5t9m7"
rh_funcionarios
estoque_itens
financeiro_movimentacoes
logistica_rotas
```

Avoid:

* vague names
* abbreviations without meaning
* inconsistent naming

---

## Column Naming Rules

Column names must remain:

* descriptive
* predictable
* standardized

Examples:

```txt id="q2r8v5"
employee_id
created_at
updated_at
status
user_permission_level
```

Avoid:

* random abbreviations
* unclear identifiers
* inconsistent patterns

---

## Primary Key Rules

Every table must contain:

* a primary key
* predictable identifiers
* scalable ID strategy

Recommended:

```txt id="p7m1x4"
id
```

Avoid inconsistent primary key naming.

---

## Timestamp Rules

All major tables must include:

```txt id="n4q7w2"
created_at
updated_at
```

When necessary:

```txt id="y1k5m8"
deleted_at
```

Timestamps must remain standardized across the ERP.

---

## Relationship Rules

Relationships must remain explicit and traceable.

Always define:

* foreign keys
* ownership relationships
* relational integrity

Avoid:

* hidden relationships
* duplicated relational logic
* uncontrolled references

---

## Normalization Rules

Normalize data when appropriate.

Avoid:

* duplicated data
* uncontrolled redundancy
* oversized tables
* inconsistent relational structures

Denormalization should only occur for justified performance reasons.

---

## Indexing Rules

Always optimize:

* search operations
* filtering
* sorting
* relational access

Create indexes for:

* frequently queried fields
* foreign keys
* high-volume operations

Avoid unnecessary indexing.

---

## Migration Rules

All database changes must be versioned.

Always:

* create migrations
* document schema changes
* preserve rollback capability

Never modify production schemas manually without controlled migrations.

---

## Query Structure Rules

Queries must remain:

* optimized
* readable
* maintainable
* scalable

Avoid:

* duplicated queries
* unbounded queries
* excessive joins
* inefficient filtering

---

## Data Integrity Rules

Always protect:

* relational integrity
* transaction consistency
* business rule consistency
* referential integrity

Never allow uncontrolled mutations.

---

## Sensitive Data Rules

Sensitive data must remain protected.

Always secure:

* employee information
* financial information
* authentication data
* internal permissions

Avoid exposing sensitive data unnecessarily.

---

## Database Modularity Rules

Database structures must reflect ERP modularization.

Each ERP module should maintain:

* isolated entities
* predictable ownership
* clear relationships

Avoid chaotic cross-module structures.

---

## Soft Delete Rules

When required, use:

```txt id="v8r2k6"
deleted_at
```

instead of permanent deletion.

Critical ERP data should remain recoverable whenever possible.

---

## Auditability Rules

Critical operations must remain traceable.

Always maintain:

* operation history
* ownership tracking
* timestamps
* modification tracking

ERP operations must remain auditable.

---

## Performance Rules

Always optimize for:

* scalability
* large datasets
* concurrent operations
* future growth

Avoid:

* oversized relational complexity
* unoptimized filtering
* repetitive heavy operations

---

## Documentation Rules

Always maintain updated:

* DATABASE_MAP.md
* DATA_FLOW_MAP.md
* ENTITY_RELATIONSHIPS.md
* MIGRATION_HISTORY.md

Database documentation must remain synchronized with the ERP.

---

## Scalability Rules

Database architecture must support:

* future modules
* future integrations
* larger datasets
* enterprise growth
* long-term maintainability

Never create temporary schema structures.

---

## Architecture Preservation Rules

Database implementations must:

* respect ERP modularization
* preserve architectural consistency
* avoid hidden dependencies
* remain maintainable

Database growth must never compromise architecture quality.

---

## Final Objective

Transform the ERP database into:

* a scalable enterprise data platform
* a maintainable relational ecosystem
* an AI-friendly database architecture
* a secure operational foundation
* a long-term sustainable structure

The database must remain organized, optimized and scalable during continuous ERP evolution.

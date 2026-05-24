# 07_SECURITY_SKILL

## Objective

This skill defines the global security, permission control, authentication and protection standards for the ERP ecosystem.

The objective is to maintain:

* secure authentication
* protected business rules
* permission isolation
* secure data handling
* route protection
* enterprise-grade security standards
* scalable access control

Security must always remain integrated with architecture and maintainability.

---

## Core Security Principles

Always prioritize:

* permission isolation
* authentication security
* data protection
* secure communication
* predictable access control
* centralized validation

Never sacrifice security for convenience.

---

## Authentication Rules

Authentication must remain centralized.

Always:

* validate user sessions
* protect authentication flows
* isolate authentication services
* secure login operations
* validate access tokens

Avoid:

* insecure authentication logic
* duplicated auth validation
* exposing authentication internals
* insecure session handling

---

## Permission Management Rules

Permissions must remain centralized and scalable.

Always:

* isolate permission logic
* validate permissions before actions
* protect sensitive operations
* maintain role-based access control

Avoid:

* hardcoded permissions
* duplicated permission logic
* client-only permission validation
* hidden permission dependencies

---

## Route Protection Rules

All protected routes must validate:

* authentication
* permissions
* session validity
* access hierarchy

Never expose restricted routes without validation.

Protected routes must remain centralized.

---

## User Access Isolation Rules

Users must only access:

* authorized modules
* authorized actions
* authorized data
* authorized screens

Never expose unauthorized structures or operations.

---

## Sensitive Data Rules

Always protect:

* user credentials
* authentication tokens
* financial data
* employee data
* internal identifiers
* permission structures

Never expose sensitive information unnecessarily.

---

## Validation Rules

All validations must remain centralized.

Always validate:

* inputs
* permissions
* API requests
* business operations
* route access
* state mutations

Never trust client-side validation alone.

---

## API Security Rules

All APIs must:

* validate authentication
* validate permissions
* sanitize inputs
* protect sensitive responses
* prevent unauthorized access

Avoid:

* unsecured endpoints
* exposed internal operations
* unrestricted data access

---

## Database Security Rules

Always:

* validate database operations
* sanitize queries
* isolate sensitive tables
* control relational access

Avoid:

* unsafe query patterns
* unrestricted database access
* direct uncontrolled mutations

---

## State Security Rules

Never expose:

* sensitive tokens
* protected identifiers
* restricted permissions
* confidential data

Sensitive state must remain protected and isolated.

---

## Logging Security Rules

Logs must never expose:

* passwords
* tokens
* confidential user data
* sensitive business data

Logging must remain secure and controlled.

---

## File Upload Security Rules

All uploads must:

* validate file types
* validate size limits
* isolate storage access
* prevent malicious uploads

Never trust uploaded files automatically.

---

## Security Architecture Rules

Security must remain:

* modular
* centralized
* scalable
* maintainable

Avoid:

* scattered security logic
* duplicated validations
* hidden access rules

---

## Session Management Rules

Sessions must:

* expire securely
* validate continuously
* prevent unauthorized reuse
* isolate user context

Avoid insecure session persistence.

---

## Security Event Rules

Always monitor:

* login attempts
* permission changes
* critical operations
* sensitive access events

Security-critical actions must remain traceable.

---

## Error Exposure Rules

Never expose:

* internal stack traces
* internal architecture
* database structures
* sensitive backend details

Error handling must remain controlled and safe.

---

## Security Scalability Rules

Security architecture must support:

* future modules
* future users
* future integrations
* future scaling
* enterprise growth

Never create temporary security solutions.

---

## Security Documentation Rules

Always maintain updated:

* PERMISSIONS_MAP.md
* DEPENDENCY_RULES.md
* API_SECURITY_RULES.md
* AUTH_STRUCTURE.md

Security documentation must remain synchronized with the ERP.

---

## Architecture Preservation Rules

Security implementation must never:

* break modularization
* bypass architecture standards
* create hidden dependencies
* compromise maintainability

Maintain architecture integrity during security implementation.

---

## Final Objective

Transform the ERP into:

* a secure enterprise ecosystem
* a scalable access-control platform
* a protected operational environment
* an AI-friendly secure architecture
* a maintainable long-term system

The ERP must remain secure, scalable and protected during continuous growth.

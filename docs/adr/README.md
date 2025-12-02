# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the EchoMail project.

## What is an ADR?

An Architecture Decision Record is a document that captures an important architectural decision made along with its context and consequences.

## ADR Template

Each ADR follows this structure:

- **Title**: Short descriptive title
- **Status**: Draft, Proposed, Accepted, Deprecated, Superseded
- **Context**: What is the issue that we're seeing that is motivating this decision or change?
- **Decision**: What is the change that we're proposing and/or doing?
- **Consequences**: What becomes easier or more difficult to do because of this change?

## Index

| ID                                       | Title                                         | Status   | Date    |
| ---------------------------------------- | --------------------------------------------- | -------- | ------- |
| [001](001-api-route-architecture.md)     | API Route Architecture                        | Accepted | 2024-01 |
| [002](002-authentication-strategy.md)    | Authentication Strategy with NextAuth + Gmail | Accepted | 2024-01 |
| [003](003-database-architecture.md)      | Appwrite as Primary Database                  | Accepted | 2024-01 |
| [004](004-state-management.md)           | Zustand for Client-Side State                 | Accepted | 2024-01 |
| [005](005-email-sending-architecture.md) | Sequential Email Sending with Gmail API       | Accepted | 2024-01 |
| [006](006-attachment-handling.md)        | Attachment Storage and Delivery               | Accepted | 2024-01 |
| [007](007-repository-pattern.md)         | Repository Pattern for Data Access            | Accepted | 2024-01 |

## How to Create a New ADR

1. Copy the template from `000-template.md`
2. Create a new file with the next sequential number
3. Fill in all sections
4. Submit for review
5. Update status to "Accepted" once approved

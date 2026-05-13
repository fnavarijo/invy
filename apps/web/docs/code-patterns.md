# Code Patterns

## Base Standards

- Prefer camelCase over other casing when naming variables, functions, object properties,
  - exceptions: CONSTANTS

## API Interactions

### /lib/api

All the operations that performs a fetch to get any type of information should be stored in `/lib/api/*`. Each operation should belong to a entity like invoices, batches, analytics. And each function should be in a separate file.

Shared types should exist in a `types.ts` file and unique types for each request can stay in the same file where is being used.

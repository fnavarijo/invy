# Code Patterns

## Base Standards

- Prefer camelCase over other casing when naming variables, functions, object properties,
  - exceptions: CONSTANTS

## API Interactions

### /lib/api

All the operations that performs a fetch to get any type of information should be stored in `/lib/api/*`. Each operation should belong to a entity like invoices, batches, analytics. And each function should be in a separate file.

Shared types should exist in a `types.ts` file and unique types for each request can stay in the same file where is being used.

#### Writing unit tests

Unit tests for `/lib/api` functions live in a `__tests__/` folder next to the file under test.

**Use MSW to intercept requests, not fetch mocks.**
Tests import `setRequest`, `captureRequest`, and `URLS` from `tests/http-mock-setup.ts`. That file owns the MSW server lifecycle (`beforeAll` / `afterEach` / `afterAll`) so individual test files never repeat it. Registering `onUnhandledRequest: 'error'` catches unexpected calls early.

**Control the response with `setRequest`.**
When a test only cares about the return value, call `setRequest({ url, body })` to override what the server returns for that test. The override is automatically torn down after each test.

```ts
setRequest({ url: URLS.INVOICES, body: { data: [RAW_ITEM], next_cursor: null } });
const result = await listInvoices({});
expect(result.data[0].invoiceId).toBe('inv-1');
```

**Inspect the outgoing request with `captureRequest`.**
When a test needs to verify what the function sent (query params, headers), call `captureRequest(url)` before the function call. Read from the returned object *after* the `await` — never destructure it up front, or you'll capture the initial `null` instead of the populated value.

```ts
const captured = captureRequest(URLS.INVOICES);
await listInvoices({ issuerNit: '1234567' });
expect(captured.params!.get('issuer_nit')).toBe('1234567');
```

**Group tests by concern.**
Each `describe` block covers one axis: filter parameters, auth propagation, return value shape. This makes failures immediately point to which contract broke.

**API functions must return camelCase.**
Raw snake_case API responses are mapped inside the function before returning. Tests validate this by asserting camelCase keys are present and snake_case keys are absent on the result.

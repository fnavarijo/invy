# Auth

The auth provider for the app is Clerk.

## Generate a session token for testing

> This tokens live only for 60 seconds. We need to create new one for each test. Or update the "expires_in_seconds"

1. Create a session

```bash
curl https://api.clerk.com/v1/sessions \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <CLERK_SECRET>' \
  --data '{
  "user_id": "<USER_ID>"
}'
```

2. Create a session token
   Use the session ID generated from above request.

```bash
curl https://api.clerk.com/v1/sessions/<SESSION_ID>/tokens \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <CLERK_SECRET>' \
  --data '{
  "expires_in_seconds": 600
}'
```

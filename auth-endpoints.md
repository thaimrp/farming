# Auth Endpoints

Base URL: `/api/authen`

## 1) Register
- Method: `POST`
- Path: `/register`
- Auth: No
- Rate limit: Yes

Request body:
```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "displayName": "Smart User"
}
```

Success response (`201`):
```json
{
  "result": true,
  "message": "Register successful. Please verify your email.",
  "data": {
    "userId": "...",
    "email": "user@example.com",
    "previewUrl": "https://ethereal.email/message/..."
  }
}
```

## 2) Verify Email
- Method: `GET`
- Path: `/vf/:token`
- Auth: No
- Rate limit: Yes

Success response (`200`):
```json
{
  "result": true,
  "message": "Email verified successfully",
  "data": null
}
```

## 3) Login
- Method: `POST`
- Path: `/login`
- Auth: No
- Rate limit: Yes

Request body:
```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

Success response (`200`):
```json
{
  "result": true,
  "message": "Login successful",
  "data": {
    "accessToken": "...",
    "tokenType": "Bearer",
    "expiresIn": "15m",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "roles": ["customer"],
      "profile": {
        "displayName": "Smart User",
        "avatarUrl": "",
        "locale": "th-TH",
        "timezone": "Asia/Bangkok"
      }
    }
  }
}
```

## 4) Refresh Token
- Method: `POST`
- Path: `/rf`
- Auth: No (uses refresh cookie)
- Rate limit: Yes

Success response (`200`):
```json
{
  "result": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "...",
    "tokenType": "Bearer",
    "expiresIn": "15m"
  }
}
```

## 5) Logout
- Method: `POST`
- Path: `/logout`
- Auth: Bearer token required

Success response (`200`):
```json
{
  "result": true,
  "message": "Logged out",
  "data": null
}
```

## 6) Logout All Devices
- Method: `POST`
- Path: `/loa`
- Auth: Bearer token required

Success response (`200`):
```json
{
  "result": true,
  "message": "Logged out from all devices",
  "data": null
}
```

## 7) Change Password
- Method: `POST`
- Path: `/cpw`
- Auth: Bearer token required

Request body:
```json
{
  "currentPassword": "StrongPass123",
  "newPassword": "StrongPass456"
}
```

Success response (`200`):
```json
{
  "result": true,
  "message": "Password changed. Please login again.",
  "data": null
}
```

## 8) Get Current User
- Method: `GET`
- Path: `/me`
- Auth: Bearer token required

Success response (`200`):
```json
{
  "result": true,
  "message": "Current user loaded",
  "data": {
    "id": "...",
    "email": "user@example.com",
    "roles": ["customer"],
    "status": "ACTIVE",
    "emailVerified": true,
    "profile": {
      "displayName": "Smart User",
      "avatarUrl": "",
      "locale": "th-TH",
      "timezone": "Asia/Bangkok"
    }
  }
}
```

## Error format
All errors use this format:
```json
{
  "result": false,
  "code": "E_AUTH_INVALID_CREDENTIALS",
  "message": "Invalid credentials",
  "data": null
}
```

## Frontend notes
1. Send `Authorization: Bearer <accessToken>` for protected endpoints.
2. Enable `withCredentials: true` (or `credentials: 'include'`) for refresh/logout flows.
3. Base auth route is `/api/authen/*`.

# Authentication Setup - NextAuth with SQL Server

## Overview
The application now uses NextAuth.js for authentication, connecting directly to your existing SQL Server database (`cmp_dtls` table) instead of Supabase.

## Files Created/Modified

### New Files
1. **`lib/db.ts`** - SQL Server connection helper
   - Handles connection pooling
   - Provides `executeQuery()` function for running SQL queries

2. **`app/api/auth/[...nextauth]/route.ts`** - NextAuth configuration
   - Credentials provider for username/password authentication
   - Queries `cmp_dtls` table for user validation
   - Checks account expiry (`cmp_datelimit`)
   - Returns user role (`SA` or `KPI`) and authority

3. **`middleware.ts`** - Route protection
   - Protects all dashboard routes (`/dashboard`, `/financials`, `/environmental`, `/fleet`, `/reports`, `/chat`)
   - Redirects unauthenticated users to `/login`

4. **`components/providers.tsx`** - NextAuth SessionProvider wrapper
   - Provides session context to all components

5. **`types/next-auth.d.ts`** - TypeScript definitions
   - Extends NextAuth types to include `role` and `authority` fields

### Modified Files
1. **`app/login/page.tsx`**
   - Updated to use `signIn()` from `next-auth/react`
   - Changed from email/password to username/password
   - Added error handling

2. **`app/layout.tsx`**
   - Added `Providers` component to wrap app with SessionProvider

3. **`app/actions.ts`**
   - Updated to use session-based filtering
   - Super Admin (SA) sees all data
   - KPI users see data filtered by their username/authority

4. **`app/chat/page.tsx`**
   - Removed dead Supabase code

### Deleted Files
1. **`lib/supabase.ts`** - No longer needed

## Environment Variables Required

Add these to your `.env.local` file:

```env
# SQL Server Database Connection
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
DB_SERVER=your_server_address

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
```

### Generating NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

## Database Schema Expected

The authentication queries the `cmp_dtls` table with these columns:
- `cmp_usercode` - User ID
- `cmp_username` - Username (used for login)
- `cmp_password` - Password (plain text in legacy DB)
- `fullname` - User's full name
- `RoleType` - User role ('SA' for Super Admin, 'KPI' for client users)
- `cmp_datelimit` - Account expiry date
- `authority` - Permission string

## Authentication Flow

1. User enters username and password on `/login`
2. NextAuth calls `authorize()` function
3. Query runs: `SELECT * FROM cmp_dtls WHERE cmp_username = @p0 AND cmp_password = @p1`
4. If found, checks `cmp_datelimit` for expiry
5. Returns user object with `role` and `authority`
6. Session is created and stored
7. User is redirected to `/dashboard`

## Role-Based Access Control (RBAC)

### Super Admin (SA)
- Can see all shipments/data
- No filtering applied

### KPI Users
- Data filtered by their username/authority
- Only see shipments where `CONNAME` matches their username

## Protected Routes

The following routes require authentication (enforced by `middleware.ts`):
- `/dashboard`
- `/financials`
- `/environmental`
- `/fleet`
- `/reports`
- `/chat`

Unauthenticated users are automatically redirected to `/login`.

## Next Steps

1. Set up environment variables
2. Test authentication with real database credentials
3. Verify role-based filtering works correctly
4. Consider implementing password hashing for production (currently uses plain text from legacy DB)

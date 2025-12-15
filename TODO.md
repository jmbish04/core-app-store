# Core App Store - Remaining Tasks

## ✅ Completed (2025-12-15)

1. **Upgraded wrangler** from 3.96.0 to 4.54.0
2. **Converted wrangler.toml to wrangler.jsonc**
   - Added `observability.enabled = true`
   - Updated D1 database_id: `1a5b8cf8-afaf-49e8-b7d7-095ea3eec041`
   - Updated KV namespace id: `1366c4a4bddb4a7c96c0e9201270d16d`
3. **Integrated Prisma ORM with D1 adapter**
   - Created `prisma/schema.prisma` with all 8 tables
   - Generated migration with `CREATE TABLE IF NOT EXISTS`
   - Replaced `DatabaseService` with `PrismaDatabaseService`
   - Removed all raw SQL from database service layer
4. **Updated package.json deployment workflow**
   - `deploy`: `npm run build && cd src && wrangler deploy`
   - `deploy:dry-run`: `npm run build && cd src && wrangler deploy --dry-run`
   - Added Prisma scripts: `prisma:generate`, `prisma:migrate`, `prisma:deploy`
5. **Installed dependencies**
   - `@prisma/client@^6.1.0`
   - `@prisma/adapter-d1@^6.1.0`
   - `prisma@^6.1.0`
   - `wrangler@^4.54.0`

## 🔧 Critical Issues to Fix

### 1. Workflow Files Still Have Raw SQL

**Files to update:**
- `src/workflows/health-checker.ts:18` - `SELECT * FROM apps`
- `src/workflows/log-insights.ts:19` - `SELECT * FROM apps WHERE...`
- `src/workflows/refresh-inventory.ts:21,26` - `INSERT/UPDATE refresh_jobs`

**Solution**: Replace with Prisma queries:
```typescript
// Instead of: const result = await env.DB.prepare('SELECT * FROM apps').all();
const prisma = getPrismaClient(env.DB);
const apps = await prisma.app.findMany();
```

### 2. TypeScript Build Errors

**Frontend errors:**
```
src/App.tsx(6,31): error TS6133: 'Menu' is declared but its value is never read.
src/lib/api.ts(16,29): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
src/pages/AllApps.tsx(5,29): error TS6133: 'CardDescription' is declared but its value is never read.
src/pages/AppDetail.tsx(3,21): error TS6133: 'Link' is declared but its value is never read.
src/pages/Landing.tsx(13,28): error TS6133: 'refetch' is declared but its value is never read.
```

**Shared package errors:**
```
../shared/src/types.ts(21,7): error TS2552: Cannot find name 'D1Database'.
../shared/src/types.ts(22,10): error TS2304: Cannot find name 'KVNamespace'.
../shared/src/types.ts(23,7): error TS2304: Cannot find name 'Ai'.
../shared/src/types.ts(25,15): error TS2304: Cannot find name 'AnalyticsEngineDataset'.
```

**Solutions:**

A. Remove unused imports in frontend files

B. Fix `shared/src/types.ts` - add Cloudflare types:
```typescript
// Add at top of file
/// <reference types="@cloudflare/workers-types" />

// Or import from @cloudflare/workers-types
```

C. Fix `import.meta.env` typing in `frontend/src/lib/api.ts`:
```typescript
// Add to frontend/src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

D. Add build script to `shared/package.json`:
```json
"scripts": {
  "build": "tsc"
}
```

### 3. Prisma Client Generation

**Issue**: Cannot download Prisma binaries in current environment (403 Forbidden)

**Solutions**:
- Option A: Generate Prisma client during CI/CD deployment (recommended)
- Option B: Use `PRISMA_SKIP_POSTINSTALL_GENERATE=1` and generate in deployment
- Option C: Bundle Prisma engines with deployment package

**Deployment script should:**
```bash
# In CI/CD or deployment environment:
npm install
npx prisma generate --schema=./prisma/schema.prisma
npx prisma migrate deploy --schema=./prisma/schema.prisma
npm run build
cd src && wrangler deploy
```

### 4. Code Comments / TODOs

**Files with TODO comments to address:**
- `src/routes/api.ts:65` - "TODO: Implement single app refresh logic"
- `src/routes/api.ts:222` - "TODO: Implement Cloudflare app creation"
- `src/routes/api.ts:244` - "TODO: Trigger workflow for background refresh"

Replace these with actual implementations or remove if not needed.

## 📋 Next Steps (Priority Order)

1. **Fix TypeScript errors** (required for build)
   - [ ] Remove unused imports
   - [ ] Add Cloudflare types to shared package
   - [ ] Add vite-env.d.ts for import.meta.env
   - [ ] Add build script to shared/package.json

2. **Convert workflow raw SQL to Prisma** (required per spec)
   - [ ] Update `health-checker.ts`
   - [ ] Update `log-insights.ts`
   - [ ] Update `refresh-inventory.ts`

3. **Test build locally**
   - [ ] Run `npm run build` and verify no errors
   - [ ] Run `npm run deploy:dry-run` and check output

4. **Address TODOs in code**
   - [ ] Implement or remove placeholder comments
   - [ ] Add proper error handling where marked

5. **CI/CD Configuration**
   - [ ] Ensure Prisma client generation works in deployment
   - [ ] Test full deployment workflow
   - [ ] Verify migrations run correctly

## 🎯 Deployment Readiness Checklist

- [x] wrangler.jsonc configured with correct bindings
- [x] Prisma schema created with D1 adapter
- [x] Database service uses Prisma ORM (no raw SQL in service layer)
- [ ] All workflow files use Prisma (no raw SQL anywhere)
- [ ] TypeScript builds without errors
- [ ] Prisma client can generate in deployment environment
- [ ] `wrangler deploy --dry-run` passes
- [ ] All code comments/TODOs addressed

## 📝 Notes

- **Database migrations** use `CREATE TABLE IF NOT EXISTS` for idempotent deployment
- **Deployment script** simplified to: `build → deploy` (Prisma runs in CI/CD)
- **Observability** enabled in wrangler.jsonc
- **No raw SQL** in database service - all Prisma ORM
- **Remaining raw SQL** only in workflow files (3 locations to fix)

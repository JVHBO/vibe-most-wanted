# Claude Code Instructions for VIBE Most Wanted

## Convex Deployments

**IMPORTANT:** This project has TWO Convex deployments:

| Environment | Deployment | URL |
|-------------|------------|-----|
| Development | `dev:dazzling-hedgehog-496` | dazzling-hedgehog-496.convex.cloud |
| **Production** | `prod:agile-orca-761` | agile-orca-761.convex.cloud |

### Deploy to Production

**ALWAYS use `--env-file .env.prod` for production operations!**

```bash
# Deploy to production
npx convex deploy --env-file .env.prod

# Run queries in production
npx convex run <function> --env-file .env.prod

# Example
npx convex run profiles:getProfile '{"address": "0x..."}' --env-file .env.prod
```

### Why this matters

The `.env.local` file points to DEV (`dazzling-hedgehog-496`). If you run `npx convex deploy` without `--env-file .env.prod`, it will deploy to DEV instead of PROD!

## Known Issues (Bugs)

### Bug #1: `.env.local` overrides environment variables
- Setting `CONVEX_DEPLOYMENT=prod:...` before commands does NOT work
- The `.env.local` file always takes precedence
- Solution: Use `--env-file .env.prod` flag

### Bug #2: Vercel env vars with `\n`
- Fixed on Dec 21, 2025
- If vars get corrupted again, fix with:
```bash
npx vercel env rm CONVEX_DEPLOYMENT production -y
npx vercel env add CONVEX_DEPLOYMENT production <<< "prod:agile-orca-761"
```

## Security

- Blacklist is in `convex/blacklist.ts`
- 106 exploiters currently banned
- Security report: `SECURITY_INCIDENT_REPORT.md`

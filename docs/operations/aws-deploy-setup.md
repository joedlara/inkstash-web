# AWS + GitHub Actions Deploy Setup

End-to-end runbook for setting up three deploy environments (dev / staging / production) on AWS, with GitHub Actions deploying via OIDC federated roles (no static keys).

**Read top to bottom.** Each section assumes the previous one is done. The whole thing is ~2-4 hours of click-ops the first time.

When everything in this doc is done, ping the assistant — the GitHub Actions workflow files get generated against the real ARNs / IDs you collect along the way.

---

## Architecture overview

| Piece | Choice | Why |
|---|---|---|
| Frontend hosting | **S3 + CloudFront** | Scales for livestream traffic spikes; cheap; pairs cleanly with WAF |
| Auth (GitHub → AWS) | **OIDC federated IAM roles** | No long-lived secrets in repo; short-lived tokens scoped to specific branches |
| Account strategy | **One AWS account, three sets of resources** | Right scale for now; document path to multi-account later |
| Supabase | **Three separate projects** (`dev` / `staging` / `prod`) | Migrations on dev can never break prod data |
| Domains | **Route 53 + ACM** | Apex `inkstash.com` → prod, `staging.inkstash.com` → staging, `dev.inkstash.com` → dev |
| Stripe | Test mode dev+staging, live mode prod | Stripe's own boundary |
| LiveKit | One project per env, OR one project with separate API keys per env | Keep credentials separate from prod's room namespace |

### Branch → environment mapping

| Branch | Triggers | Deploys to | Approval gate |
|---|---|---|---|
| `dev` | push | dev env | none — auto |
| `staging` | push | staging env | none — auto |
| `main` | push | production | yes — manual approve via GitHub Environment |

---

## Section 1 — AWS account + billing

If you already have an AWS account skip to Section 2.

1. Create an AWS account at https://aws.amazon.com.
2. Enable MFA on the root account immediately.
3. **Do not use the root account for anything else.** Create an IAM user for yourself (Identity Center / SSO is fine too) and give it `AdministratorAccess`. Do all subsequent work as that user.
4. Set up a billing alarm at ~$50/month so a misconfigured CloudFront doesn't surprise you.
5. Pick a region. Recommended: **`us-east-1`** for production (some AWS services like CloudFront ACM certs must be created there regardless of where you deploy). Use `us-east-1` for everything in this doc unless noted.

Verify:
- [ ] Root account MFA enabled
- [ ] IAM admin user created, MFA enabled
- [ ] Billing alarm configured
- [ ] You're working in `us-east-1` in the console

---

## Section 2 — Three Supabase projects

Currently `uhstjindafnvlrjkpggx` is your only Supabase project. It becomes **dev**.

1. Go to https://supabase.com/dashboard and create two new projects:
   - `inkstash-staging`
   - `inkstash-prod`
2. For each new project, capture:
   - **Project ref** (the random subdomain like `uhstjindafnvlrjkpggx`)
   - **Project URL** (`https://<ref>.supabase.co`)
   - **Anon public key** (Settings → API → `anon` key)
   - **Service role key** (Settings → API → `service_role` key — used only by edge fns, never in client builds)
3. Apply your current migrations to the new projects:
   ```bash
   # for staging
   npx supabase link --project-ref <staging-ref>
   npx supabase db push

   # for prod
   npx supabase link --project-ref <prod-ref>
   npx supabase db push
   ```
4. Deploy edge fns to each:
   ```bash
   npx supabase functions deploy --project-ref <ref>
   ```
5. **Re-link to dev** so your local CLI stays pointed at dev:
   ```bash
   npx supabase link --project-ref uhstjindafnvlrjkpggx
   ```

Record:

| Env | Project ref | URL | Anon key |
|---|---|---|---|
| dev | `uhstjindafnvlrjkpggx` | https://uhstjindafnvlrjkpggx.supabase.co | (capture) |
| staging | `___________` | https://___.supabase.co | (capture) |
| prod | `___________` | https://___.supabase.co | (capture) |

Service role keys — do NOT record these in this doc. They live only in each Supabase project's edge fn env (`Settings → Edge Functions → Add new secret`).

Verify:
- [ ] All three Supabase projects exist
- [ ] Migrations applied to all three
- [ ] Edge fns deployed to all three
- [ ] You have the URL + anon key for each (kept somewhere secure, NOT in this doc)

---

## Section 3 — Route 53 hosted zone + ACM cert

You have a domain. Let's call it `inkstash.com` — substitute throughout this doc.

### 3.1 Create hosted zone

1. **Route 53 → Hosted zones → Create hosted zone**
2. Domain: `inkstash.com`
3. Type: Public hosted zone
4. Create.

Route 53 gives you 4 nameservers (e.g., `ns-123.awsdns-12.com`, etc.). **Go to your domain registrar and update the nameservers to those four.** DNS propagation takes 1-48 hours; you can continue setup in parallel.

### 3.2 Request ACM cert (must be in us-east-1)

CloudFront only accepts certs from `us-east-1` regardless of distribution region.

1. **AWS Certificate Manager (in us-east-1) → Request → Public certificate**
2. Add domains:
   - `inkstash.com`
   - `*.inkstash.com` (wildcard so `dev.` and `staging.` work)
3. Validation: DNS validation
4. Request.
5. ACM gives you CNAME records to add. Click "Create records in Route 53" — it auto-adds them.
6. Wait ~5-10 minutes for status to become "Issued."

Record:

- **ACM cert ARN**: `_________________`

Verify:
- [ ] Route 53 hosted zone exists for `inkstash.com`
- [ ] Nameservers updated at registrar
- [ ] ACM cert status: Issued
- [ ] Cert covers `inkstash.com` and `*.inkstash.com`

---

## Section 4 — S3 buckets per env

Three buckets, each holds the built `dist/` output for one env.

For each env (`dev`, `staging`, `prod`):

1. **S3 → Buckets → Create bucket**
2. Name: `inkstash-web-{env}` (e.g., `inkstash-web-dev`)
   - Must be globally unique; if taken, add a suffix
3. Region: `us-east-1`
4. **Block ALL public access**: leave all 4 checkboxes ON. The bucket stays private; CloudFront reads it via Origin Access Control.
5. Versioning: enabled (lets you roll back a bad deploy by re-promoting an old version)
6. Default encryption: SSE-S3 (default)
7. Create.

Record:

| Env | Bucket name |
|---|---|
| dev | `_______________` |
| staging | `_______________` |
| prod | `_______________` |

Verify:
- [ ] Three buckets exist
- [ ] All three have "Block all public access" ON
- [ ] All three have versioning enabled

---

## Section 5 — CloudFront distributions per env

For each env:

1. **CloudFront → Create distribution**
2. Origin:
   - Origin domain: pick the bucket from the dropdown (e.g., `inkstash-web-dev.s3.us-east-1.amazonaws.com`)
   - Origin access: **Origin access control settings (recommended)**
   - Create new OAC with the bucket's name
3. Default cache behavior:
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP methods: `GET, HEAD, OPTIONS`
   - Cache policy: `CachingOptimized`
   - Origin request policy: `CORS-S3Origin`
   - Response headers policy: `SimpleCORS` (optional; helpful for some Stripe / Supabase flows)
4. Settings:
   - Price class: `Use only North America and Europe` (cheaper; expand later if you have international users)
   - Alternate domain (CNAME): the env's hostname (`dev.inkstash.com` / `staging.inkstash.com` / `inkstash.com`)
   - SSL cert: pick the ACM cert from Section 3
   - Default root object: `index.html`
5. **Custom error pages** (critical for SPAs):
   - Add: HTTP error code `403`, customize response: yes, response page path: `/index.html`, HTTP response code: `200`
   - Add same for `404`
   - These let React Router handle routes that don't have static files
6. Web Application Firewall: skip for now; revisit when prod traffic ramps
7. Create distribution
8. **After creation** — copy the auto-generated bucket policy ACL CloudFront prompts you to add to S3. Click "Copy policy" and apply it to the S3 bucket via S3 → bucket → Permissions → Bucket policy.

Record:

| Env | Distribution ID | Distribution domain |
|---|---|---|
| dev | `_______________` | `dXXXXXXXX.cloudfront.net` |
| staging | `_______________` | `dXXXXXXXX.cloudfront.net` |
| prod | `_______________` | `dXXXXXXXX.cloudfront.net` |

### 5.1 Route 53 A records → CloudFront

For each env, add a Route 53 record pointing the env's hostname at the CloudFront distribution:

1. **Route 53 → Hosted zones → inkstash.com → Create record**
2. Record name: `dev` (or `staging`, or leave blank for apex)
3. Record type: A
4. Alias: ON
5. Alias target: the CloudFront distribution domain (e.g., `dXXXXXX.cloudfront.net`)
6. Create.

Verify:
- [ ] Three CloudFront distributions exist
- [ ] Each has its alternate domain set
- [ ] Each is using the ACM cert from Section 3
- [ ] Each S3 bucket has the CloudFront OAC bucket policy applied
- [ ] Three Route 53 A records exist (one per env)
- [ ] `https://dev.inkstash.com` resolves (may take 15-60 min for DNS to propagate)

---

## Section 6 — GitHub OIDC provider in AWS IAM (one-time)

This is the foundation of the secure auth model. Done once per AWS account.

1. **IAM → Identity providers → Add provider**
2. Provider type: OpenID Connect
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. Click "Get thumbprint" → Add provider.

Record:

- **OIDC provider ARN**: `arn:aws:iam::ACCT_ID:oidc-provider/token.actions.githubusercontent.com`

Verify:
- [ ] OIDC provider exists in IAM

---

## Section 7 — IAM roles per env (the trust + permission policies)

Three IAM roles, one per env. Each has:
- A **trust policy** that says "GitHub Actions can assume this role IF the workflow is from `joedlara/inkstash-web` AND on the right branch / GH environment"
- A **permissions policy** that says "this role can sync to one specific S3 bucket and invalidate one specific CloudFront distribution — nothing else"

### 7.1 Dev role

1. **IAM → Roles → Create role**
2. Trusted entity: Web identity
3. Identity provider: `token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. GitHub organization: `joedlara`
6. GitHub repository: `inkstash-web`
7. GitHub branch: `dev`
8. Click Next.
9. Skip "Add permissions" for now (we attach a policy in the next step).
10. Role name: `InkStashDeployDev`
11. Create.

Then edit the role's trust policy to look like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:joedlara/inkstash-web:ref:refs/heads/dev"
        }
      }
    }
  ]
}
```

Substitute `ACCT_ID` with your real account ID.

### 7.2 Dev permissions policy

Attach this inline policy to the role (IAM → Roles → InkStashDeployDev → Add permissions → Create inline policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3SyncDev",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::inkstash-web-dev",
        "arn:aws:s3:::inkstash-web-dev/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidateDev",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::ACCT_ID:distribution/<dev-distribution-id>"
    }
  ]
}
```

Substitute the bucket name and distribution ID with your actuals.

### 7.3 Staging role

Same as dev, with these substitutions:
- Role name: `InkStashDeployStaging`
- Trust policy `:sub` condition: `"repo:joedlara/inkstash-web:ref:refs/heads/staging"`
- Permissions policy: same shape, scoped to `inkstash-web-staging` bucket + staging distribution ID

### 7.4 Prod role — different trust pattern

Prod uses the GitHub **Environment** constraint instead of a branch constraint. This is what enforces the manual approval gate.

- Role name: `InkStashDeployProd`
- Trust policy `:sub` condition: `"repo:joedlara/inkstash-web:environment:production"`
- Permissions policy: same shape, scoped to `inkstash-web-prod` bucket + prod distribution ID

Why this matters: a workflow can only present a GitHub OIDC token with `:environment:production` if it explicitly declares `environment: production` in the workflow YAML. That declaration triggers the approval gate. So even a malicious PR that merges to `main` cannot directly assume the prod role without going through the approval.

Record:

| Env | Role ARN |
|---|---|
| dev | `arn:aws:iam::ACCT_ID:role/InkStashDeployDev` |
| staging | `arn:aws:iam::ACCT_ID:role/InkStashDeployStaging` |
| prod | `arn:aws:iam::ACCT_ID:role/InkStashDeployProd` |

Verify:
- [ ] Three IAM roles exist
- [ ] Each trust policy has the right `:sub` condition
- [ ] Each permissions policy is scoped to ONE bucket + ONE distribution

---

## Section 8 — GitHub Environments + secrets

### 8.1 Create the `production` Environment in GitHub

1. Repo → Settings → Environments → New environment
2. Name: `production`
3. **Required reviewers**: add yourself (and any teammates who should be able to approve prod deploys)
4. **Wait timer**: 0 minutes (optional — set to e.g. 5 minutes if you want a "did I really mean to do this" cooling-off period)
5. **Deployment branches**: Selected branches → `main`
6. Save.

Optionally create `staging` and `dev` environments too — useful for env-specific secrets, but no required reviewers needed.

### 8.2 Repository secrets

Repo → Settings → Secrets and variables → Actions → New repository secret

Add these (used by all three workflows; the workflow picks per env via variable interpolation):

| Secret name | Value source |
|---|---|
| `AWS_ACCOUNT_ID` | Your AWS account number (12 digits) |

Add these per-environment (use **Environment secrets** under `dev`, `staging`, `production` GitHub Environments — better isolation than repo secrets):

| Secret name | Used for |
|---|---|
| `AWS_DEPLOY_ROLE` | The full IAM role ARN for that env |
| `AWS_S3_BUCKET` | The bucket name for that env |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | The distribution ID for that env |
| `VITE_SUPABASE_URL` | The Supabase URL for that env |
| `VITE_SUPABASE_ANON_KEY` | The Supabase anon key for that env |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe pk_test_ (dev/staging) or pk_live_ (prod) |
| `VITE_LIVEKIT_URL` | LiveKit websocket URL for that env (only the URL — the key/secret stay on the server) |

The `VITE_*` prefixed values get baked into the build by Vite. They are not server-side secrets — `anon` keys and publishable keys are designed to be public. The secret-storage is just hygiene + per-env separation.

Server-side secrets (Supabase service role key, Stripe secret key, LiveKit API key+secret) do NOT go in GitHub. They live in each Supabase project's edge function env config.

Verify:
- [ ] `production` GitHub Environment exists with required reviewer
- [ ] `AWS_ACCOUNT_ID` repo secret set
- [ ] All 7 environment secrets set for `dev`
- [ ] All 7 environment secrets set for `staging`
- [ ] All 7 environment secrets set for `production`

---

## Section 9 — Final manual smoke test (before workflows)

Confirm the deploy path works manually before letting CI do it.

From your laptop, with AWS CLI configured:

```bash
# 1. Build with dev env vars
VITE_SUPABASE_URL=<dev_url> \
VITE_SUPABASE_ANON_KEY=<dev_anon_key> \
VITE_STRIPE_PUBLISHABLE_KEY=<dev_pk_test> \
VITE_LIVEKIT_URL=<dev_livekit_ws> \
npm run build

# 2. Sync to S3
aws s3 sync dist/ s3://inkstash-web-dev --delete

# 3. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <dev-distribution-id> \
  --paths '/*'

# 4. Visit https://dev.inkstash.com — should serve the built app
```

If this works manually, the GitHub Actions workflows are basically scripted versions of these four steps.

Verify:
- [ ] Manual deploy to dev works
- [ ] `https://dev.inkstash.com` serves the built app correctly
- [ ] Supabase calls succeed against the dev project

---

## When this is all done

Ping the assistant with:
- The three role ARNs
- The three bucket names
- The three distribution IDs

The assistant will generate the three workflow YAML files referencing the real ARNs. Then we commit + push.

---

## Things deferred (do later when ready)

- **AWS WAF** in front of CloudFront — protect against scraper bots and credential-stuffing on the auction surface
- **Multi-account split** — when you have a team, move prod into its own AWS account with cross-account role assumption. Required for SOC2/HIPAA/etc.
- **Preview deploys per PR** — Supabase preview branches + a CloudFront + Lambda@Edge router, OR switch to Amplify just for previews. Nice-to-have, not required.
- **CloudWatch alarms + dashboards** — page hit rate, error rate, S3 sync failures
- **GitHub OIDC token thumbprint refresh** — the thumbprint you set in Section 6 occasionally needs updating. AWS now auto-detects; older docs may say to manually rotate
- **Per-env LiveKit projects** vs. one project with namespace separation — decide when traffic justifies it
- **CDN cache header tuning** — for HTML (short TTL) vs. JS/CSS (long TTL with content-hash filenames). Vite's output is already hashed, so this is mostly a CloudFront cache-policy tweak

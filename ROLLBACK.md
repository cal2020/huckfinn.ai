# Rollback Plan for HuckFinn.ai

## Quick Rollback Commands

### Option 1: Revert the merge commit (Recommended)
```bash
# Find the merge commit that introduced the problem
git log --oneline -10

# Revert the merge commit (replace COMMIT_HASH with actual hash)
git revert -m 1 COMMIT_HASH
git push origin main
```

### Option 2: Reset to a previous known-good commit
```bash
# Find the last known good commit
git log --oneline -20

# Reset to that commit (CAUTION: destructive)
git reset --hard COMMIT_HASH
git push --force origin main
```

### Option 3: Cloudflare Dashboard Rollback
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** > **huckfinn**
3. Click on **Deployments**
4. Find a previous successful deployment
5. Click the **three dots menu** > **Rollback to this deployment**

---

## Rollback for Breaking News Page Changes

If the breaking news page improvements cause issues, here are specific rollback steps:

### Revert just the breaking news changes
```bash
# Find the commit hash for "Enhance breaking news page with interactive features"
git log --oneline --all | grep -i "breaking news"

# Revert that specific commit
git revert COMMIT_HASH
git push origin main
```

### Files affected by breaking news changes
- `huckfinn-article-index.html` - Contains all new features:
  - Breaking news ticker (lines 712-738)
  - Search/filter section (lines 762-781)
  - Editor's Picks section (lines 783-805)
  - Back-to-top button (line 1140)
  - JavaScript functionality (lines 1143-1267)
  - Associated CSS styles (lines 372-696)

---

## Pre-Rollback Checklist

- [ ] Confirm the issue is with the new deployment (not DNS, CDN cache, etc.)
- [ ] Document what's broken (screenshots, error messages)
- [ ] Notify team members before rolling back
- [ ] Test the rollback in preview environment if possible

## Post-Rollback Actions

1. **Clear Cloudflare cache** (if needed):
   - Dashboard > huckfinn.ai > Caching > Purge Everything

2. **Verify rollback worked**:
   - Check https://huckfinn.ai loads correctly
   - Test critical user flows

3. **Create issue for the bug**:
   - Document what went wrong
   - Include steps to reproduce
   - Tag with `rollback` label

---

## Emergency Contacts

- Cloudflare Status: https://www.cloudflarestatus.com
- GitHub Status: https://www.githubstatus.com

## Previous Stable Commits

| Date | Commit | Description |
|------|--------|-------------|
| Pre-breaking-news | `6d5696c` | Before breaking news page enhancements |

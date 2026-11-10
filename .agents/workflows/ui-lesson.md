---
description: Turn a reported UI defect into a permanent fix across the whole app. Usage /ui-lesson <describe the defect or attach a screenshot>.
---

# /ui-lesson

1. **Reproduce** on the reported page and screenshot it.
2. **Classify the root cause**: token, primitive, shell, data/format, copy, i18n, responsive or a11y. Search the codebase and the routes in `docs/ui/BACKLOG.md` for every other place with the same pattern (grep + screenshots).
3. **Fix at the source**: change the token, primitive or formatter, not the page. Migrate any page still using the old pattern.
4. **Make it permanent.** Add one line to the right section of `.agents/rules/ui-contract.md` (keep the file under 12,000 characters; compress older lines if needed). If the defect is mechanically detectable, add a static scan or browser check to `/ui-verify`.
5. **Re-verify** every affected page with `/ui-verify` and list them with before/after screenshots.
6. **Log** in `docs/ui/LOG.md` under "Lessons": defect, root cause, fix, pages touched, rule added.

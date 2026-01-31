# 🐛 Website Bug Report
**Date**: January 31, 2026
**Status**: Critical bugs found that break user experience

---

## Critical Bugs (Fix Immediately)

### 🔴 BUG #1: Broken Presentation Link - "Future of Work" Session
**File**: `data.json` line 9
**Issue**: Filename mismatch
**Impact**: Users clicking on "The Future of Work with AI" presentation get a 404 error

**Current (Broken)**:
```json
"url": "presentations/smp-future-of-work-jan26.html",
"viewerUrl": "presentations/smp-future-of-work-jan26.html",
```

**Actual filename**: `presentations/smp-future-work-jan26.html` (missing "of")

**Fix**:
```json
"url": "presentations/smp-future-work-jan26.html",
"viewerUrl": "presentations/smp-future-work-jan26.html",
```

**How to reproduce**:
1. Go to index.html#sessions
2. Filter by "SMP" program or "AI" function
3. Click on "The Future of Work with AI: Strategic Implications"
4. Results in 404 error

---

### 🟡 BUG #2: External URL May Be Broken - AI Sales Workshop
**File**: `data.json` line 113
**Issue**: Uses old WordPress hosting path that may not exist
**Impact**: External link might be broken; local file exists but isn't used as fallback

**Current**:
```json
"url": "https://adityavj.com/wp-content/uploads/presentations/ai-sales-workshop-presentation_5.html",
"viewerUrl": "presentations/ai-sales-workshop-presentation_5.html",
```

**Issue**: The `adityavj.com/wp-content/uploads/` path suggests old WordPress hosting. If the site isn't using WordPress anymore, this link is broken.

**Recommendation**:
- Test if `https://adityavj.com/wp-content/uploads/presentations/ai-sales-workshop-presentation_5.html` loads
- If broken, change to relative path:
```json
"url": "presentations/ai-sales-workshop-presentation_5.html",
```

---

## Medium Priority Bugs (User Experience Issues)

### 🟡 BUG #3: Blog Section Hidden by Default
**File**: `index.html` line 188
**Issue**: Blog section has `class="hidden"` which hides 3 good articles from users
**Impact**: Valuable content (blog posts) is invisible unless JavaScript runs successfully

**Current**:
```html
<section id="writings" class="writings-section hidden">
```

**Note**: JavaScript does remove the `hidden` class (script.js:477), BUT if JavaScript fails to load or there's an error, the blog remains invisible.

**Why this is a problem**:
- SEO: Search engines may not index hidden content
- JavaScript errors: If any JS error occurs before `renderWritings()` runs, blog stays hidden
- Accessibility: Screen readers might skip hidden sections

**Fix**: Remove `hidden` class from HTML, let JavaScript add it if needed:
```html
<section id="writings" class="writings-section">
```

Then in `script.js`, modify the `renderWritings` function to handle visibility differently.

---

### 🟢 BUG #4: Clutter - Duplicate/Backup Files in Root
**Files**:
- `autoregressive-playground copy.html`
- `blog-autoregressive-playground-BACKUP.html`

**Issue**: Backup and duplicate files cluttering the root directory
**Impact**: Confusion, accidental editing of wrong files, larger git repo

**Fix**:
1. Create a `_backups/` or `_archive/` folder
2. Move these files there
3. Add `_backups/` to `.gitignore`

Or simply delete if no longer needed.

---

## Testing Summary

### ✅ Working Correctly
- All navigation links (top nav, footer)
- Hash navigation (#sessions, #lab, #writings, #book)
- Social links (LinkedIn, GitHub, Email)
- External Google Docs/Drive links (tested structure, not actual URLs)
- Blog post files exist and are accessible
- Presentation files (except Bug #1) exist
- Viewer.html and viewer.css exist
- Modal functionality (not tested interactively, but code looks correct)
- Resource prompts with `link: "#"` (intentional for modal display)
- Filter system code structure
- Calendly booking link

### ⚠️ Not Fully Tested (Requires Browser)
- JavaScript execution (would need to run in browser to catch runtime errors)
- Modal interactivity
- Copy-to-clipboard functionality
- Confetti animation
- Filter buttons
- Show More/Less accordions
- Prompt modal display
- Share functionality
- Deep linking with URL parameters

---

## Recommendations

### Immediate Actions (Before Next Deploy)
1. ✅ Fix Bug #1 (broken presentation link) - **CRITICAL**
2. ⚠️ Test Bug #2 (external URL) - verify if WordPress path works
3. 🧹 Clean up backup files (Bug #4)

### Next Sprint
4. 📝 Reconsider Bug #3 approach (blog section visibility)
5. 🧪 Add automated link checker to CI/CD
6. 📊 Set up monitoring for 404 errors

---

## Files to Modify

### data.json
- Line 9: Change `smp-future-of-work-jan26.html` → `smp-future-work-jan26.html`
- Line 10: Change `smp-future-of-work-jan26.html` → `smp-future-work-jan26.html`
- Line 113: Verify/fix AI Sales Workshop URL

### Root Directory Cleanup
- Delete or archive: `autoregressive-playground copy.html`
- Delete or archive: `blog-autoregressive-playground-BACKUP.html`

---

## Testing Checklist

Before deploying, manually test:
- [ ] Click "Future of Work with AI" presentation → should load
- [ ] Click "AI Sales Workshop" → should load (test both URL and viewerUrl)
- [ ] Scroll to Blog section → should be visible
- [ ] Click on each blog post → should load
- [ ] Test on mobile device
- [ ] Test with JavaScript disabled → critical content still visible?

---

**Report Generated**: Automatically by systematic file and link checking
**Priority**: Fix Bug #1 before next deployment
**Estimated Fix Time**: 2 minutes

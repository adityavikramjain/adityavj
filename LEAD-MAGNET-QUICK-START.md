# 🚀 Lead Magnet Quick Start Guide

## What You Have Now

✅ **Beautiful lead magnet modal** that appears before premium content
✅ **Email capture form** with validation
✅ **Thank you page** with toolkit overview
✅ **Google Sheets integration** (ready to configure)
✅ **localStorage tracking** (won't show twice to same user)

---

## 3-Minute Setup

### Step 1: Create Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create new sheet: **"Lead Magnet Emails"**
3. Add headers in row 1:
   ```
   Timestamp | Email | Source | Page URL | User Agent
   ```

### Step 2: Deploy Apps Script
1. In your sheet: **Extensions > Apps Script**
2. Copy the code from `google-sheets-integration.md` (the `doPost` function)
3. Save, then **Deploy > New deployment > Web app**
4. Set "Who has access" to **Anyone**
5. Copy the Web App URL

### Step 3: Add URL to Your Website
1. Open `script.js`
2. Line 2-3, paste your URL:
   ```javascript
   const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/YOUR_ID_HERE/exec';
   ```
3. Save and push to GitHub

### Step 4: Test It!
1. Open your website
2. Click any **featured** AI prompt (orange border)
3. Enter an email in the modal
4. Check your Google Sheet - email should appear!

---

## How It Works

```
User clicks featured prompt
        ↓
Lead magnet modal appears
        ↓
User enters email
        ↓
Form submits to Google Sheets
        ↓
Thank you page opens in new tab
        ↓
Original prompt unlocks
```

---

## Files Modified

- ✅ `index.html` - Added lead magnet modal HTML (line 271-305)
- ✅ `style.css` - Added lead magnet styles (line 2198-2349)
- ✅ `script.js` - Added form logic and Google Sheets integration (line 962-1078)
- ✅ `ai-sales-toolkit.html` - Created thank you page
- ✅ `google-sheets-integration.md` - Full setup guide
- ✅ `data.json` - No changes (featured prompts already marked)

---

## What Triggers the Lead Magnet?

Only **featured** resources trigger the modal. These are marked with:
```json
"featured": true
```

Currently featured prompts:
- B2B Sales Intelligence Analyzer
- Ideation Engine
- Professional Report Formatter
- AI Consultant for Sales & Marketing
- Presentation Design System
- Deep Research Sales Agent (India)
- Market Scan & Listing Generator
- And 5 more research agents

To change which prompts are "gated":
1. Open `data.json`
2. Set `"featured": true` for premium content
3. Set `"featured": false` for free content

---

## Troubleshooting

**Modal not appearing?**
- Check browser console for errors
- Make sure you're clicking a **featured** resource
- Try clearing localStorage: `localStorage.clear()`

**Email not saving to Google Sheets?**
- Check that GOOGLE_SHEETS_URL is set in script.js
- Verify Apps Script deployment is set to "Anyone"
- Check Apps Script > Executions for errors

**Want to test again?**
```javascript
// Run in browser console:
localStorage.removeItem('lead_email_provided');
location.reload();
```

---

## Next Actions

### Option A: Go Live Now
1. Complete the 3-minute setup above
2. Push to GitHub
3. Deploy to production
4. Watch emails roll in! 📧

### Option B: Customize First
- **Change the offer**: Edit `index.html` line 278-281
- **Adjust design**: Modify `style.css` line 2198+
- **Add more gated content**: Set `featured: true` in `data.json`

### Option C: Add Analytics
Track conversion rates by adding to script.js:
```javascript
// After successful submission
gtag('event', 'lead_magnet_conversion', {
  'event_category': 'lead_generation',
  'event_label': email
});
```

---

## Pro Tips

💡 **Best conversion rates**: Gate your most popular content
💡 **A/B test the copy**: Try different value propositions
💡 **Follow up fast**: Check Google Sheets daily and email leads within 24hrs
💡 **Export weekly**: Download CSV and import to your CRM
💡 **Monitor bounce rate**: If >70% skip, reduce friction

---

## Support

Questions? Email: aditya1384@gmail.com

Ready to launch! 🚀

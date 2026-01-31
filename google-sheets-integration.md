# Google Sheets Lead Magnet Integration Setup

This guide shows you how to connect your lead magnet form to Google Sheets to automatically collect and store email addresses.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it: **"Lead Magnet - AI Sales Toolkit"**
4. In the first row, add these headers:
   - Column A: **Timestamp**
   - Column B: **Email**
   - Column C: **Source**
   - Column D: **Page URL**
   - Column E: **User Agent**

Your sheet should look like this:

```
| Timestamp           | Email                    | Source                 | Page URL              | User Agent    |
|---------------------|--------------------------|------------------------|-----------------------|---------------|
| 2026-01-31 10:30:00 | john@example.com         | AI Sales Toolkit       | adityavj.com/#lab     | Chrome/Mac    |
```

## Step 2: Create Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code
3. Paste the following code:

```javascript
/**
 * Lead Magnet Email Collection Script
 * Captures emails from adityavj.com lead magnet form
 */

function doPost(e) {
  try {
    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);

    // Extract fields
    const timestamp = new Date();
    const email = data.email || '';
    const source = data.source || 'Unknown';
    const pageUrl = data.pageUrl || '';
    const userAgent = data.userAgent || '';

    // Validate email
    if (!email || !isValidEmail(email)) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Invalid email address'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Check for duplicates (optional - prevents same email multiple times)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const emails = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      const emailExists = emails.some(row => row[0] === email);

      if (emailExists) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Email already registered',
            duplicate: true
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Append new row
    sheet.appendRow([
      timestamp,
      email,
      source,
      pageUrl,
      userAgent
    ]);

    // Send success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Email saved successfully'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Log error and return failure
    Logger.log('Error: ' + error.toString());

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Server error: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Simple email validation
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Test function - run this to verify setup
 */
function testScript() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        email: 'test@example.com',
        source: 'Test Run',
        pageUrl: 'http://localhost:8000',
        userAgent: 'Test Browser'
      })
    }
  };

  const result = doPost(testData);
  Logger.log(result.getContent());
}
```

4. Click **Save** (💾 icon)
5. Name the project: **"Lead Magnet Collector"**

## Step 3: Deploy as Web App

1. Click **Deploy > New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure:
   - **Description**: "Lead Magnet Email Collection API"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
5. Click **Deploy**
6. **IMPORTANT**: Copy the **Web app URL** - it will look like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
7. Click **Done**

## Step 4: Test the Script

1. In Apps Script, click **Run > testScript**
2. You may need to authorize:
   - Click "Review Permissions"
   - Choose your Google account
   - Click "Advanced" > "Go to Lead Magnet Collector (unsafe)"
   - Click "Allow"
3. Check your Google Sheet - you should see a test entry!
4. If successful, delete the test row

## Step 5: Update Your Website Code

I've already prepared the code update. Just paste your **Web app URL** into the configuration:

1. Open `script.js`
2. Find line 3-5 (at the very top of the file)
3. Add this configuration:

```javascript
// CONFIGURATION: Google Sheets Integration
const GOOGLE_SHEETS_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';
```

Replace `PASTE_YOUR_WEB_APP_URL_HERE` with the URL you copied in Step 3.

Example:
```javascript
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec';
```

## Step 6: Test the Live Form

1. Open your website: `http://localhost:8000/index.html`
2. Click on any **featured** AI prompt (has colored border)
3. Lead magnet modal should appear
4. Enter a test email (use your real email to verify it works)
5. Click "Get Free Toolkit + Access Resource"
6. Check your Google Sheet - the email should appear!

## Troubleshooting

### "Error saving email" message
- Make sure the Web App URL is correct
- Redeploy the Apps Script (Deploy > Manage deployments > Edit > Deploy)
- Check that "Who has access" is set to "Anyone"

### Emails not appearing in sheet
- Open Apps Script and click **Executions** (left sidebar)
- Check for error messages
- Run `testScript()` to verify basic functionality

### CORS errors in browser console
- This is normal and expected
- The form will still work - Google Sheets returns a redirect
- The JavaScript handles this gracefully

## Optional: Set Up Email Notifications

Want to get notified when someone submits?

Add this function to your Apps Script:

```javascript
function sendEmailNotification(email) {
  const recipient = 'aditya1384@gmail.com'; // Your email
  const subject = '🎯 New Lead Magnet Signup!';
  const body = `
    New email captured from adityavj.com lead magnet:

    Email: ${email}
    Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

    View all leads: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
  `;

  GmailApp.sendEmail(recipient, subject, body);
}
```

Then add this line in `doPost()` after the email is saved (around line 52):

```javascript
sheet.appendRow([...]);
sendEmailNotification(email); // Add this line
```

## Data Privacy Note

The collected data is stored in your personal Google Sheet and is not shared with any third parties. Make sure to:
- Keep your spreadsheet private (don't share the link)
- Comply with applicable data privacy laws (GDPR, etc.)
- Provide a privacy policy if collecting from EU visitors

---

## Next Steps

Once this is working, you can:

1. **Export to your CRM** - Download CSV and import to Salesforce/HubSpot
2. **Create a mailing list** - Use Google Sheets add-ons like Mailchimp
3. **Set up automation** - Use Zapier to auto-add to your email service
4. **Analyze trends** - Add charts to track signups over time

Need help? Email me at aditya1384@gmail.com

# Bike Calculator with Netlify Functions

This is a protected version of the XY Bike Calculator that uses Netlify Functions to secure API keys and calculations.

## Features

- **Protected API Keys**: Google Sheets API key is stored server-side
- **Server-side Calculations**: All calculations are performed on the server
- **Client-side Fallback**: If server calculations fail, the app falls back to client-side calculations
- **CORS Support**: Properly configured for cross-origin requests

## Setup Instructions

### 1. Deploy to Netlify

1. Connect this repository to Netlify
2. Set the build command to: `echo 'No build command needed'`
3. Set the publish directory to: `.` (root directory)

### 2. Set Environment Variables

In your Netlify dashboard, go to Site Settings > Environment Variables and add:

```
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
```

### 3. Get Your Google Sheets API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create credentials (API Key)
5. Copy the API key and paste it as `GOOGLE_SHEETS_API_KEY`

### 4. Get Your Spreadsheet ID

1. Open your Google Sheets document
2. The ID is in the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Copy the `SPREADSHEET_ID` part and paste it as `GOOGLE_SHEETS_ID`

## File Structure

```
bike-calculator-netlify/
├── netlify/
│   └── functions/
│       ├── sheets-api.js      # Google Sheets API proxy
│       ├── calculator.js      # Server-side calculations
│       └── package.json       # Dependencies
├── js/
│   ├── api-client.js          # Client-side API helper
│   ├── bike-search.js         # Modified to use API client
│   ├── calculator.js          # Main calculator (unchanged)
│   ├── seatpost-calculator.js # Modified to use API client
│   ├── stack-reach-calculator.js # Modified to use API client
│   ├── stem-calculator.js     # Modified to use API client
│   └── firebase-auth.js       # Firebase authentication (unchanged)
├── netlify.toml               # Netlify configuration
└── README.md                  # This file
```

## How It Works

### API Protection

1. **Google Sheets API**: The `sheets-api.js` function acts as a proxy, making requests to Google Sheets with the protected API key
2. **Calculations**: The `calculator.js` function performs all bike geometry calculations server-side
3. **Client-side**: The `api-client.js` provides a simple interface for making requests to these functions

### Fallback System

If the server-side calculations fail (network issues, server errors, etc.), the application automatically falls back to client-side calculations to ensure the app continues to work.

## Development

To test locally with Netlify CLI:

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run: `netlify dev`
3. The functions will be available at `http://localhost:8888/netlify/functions/`

## Security Benefits

- **API Key Protection**: Your Google Sheets API key is never exposed to the client
- **Rate Limiting**: Server-side functions can implement rate limiting
- **Input Validation**: Server-side validation of all inputs
- **Error Handling**: Centralized error handling and logging

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your Netlify site is properly deployed and the functions are accessible
2. **API Key Errors**: Verify your environment variables are set correctly in Netlify
3. **Calculation Errors**: Check the Netlify function logs for detailed error messages

### Debugging

1. Check Netlify function logs in the Netlify dashboard
2. Use browser developer tools to inspect network requests
3. Verify environment variables are set correctly

## Migration from Original

The original calculator files have been minimally modified:
- API keys removed from client-side code
- Direct API calls replaced with function calls
- Fallback calculations added for reliability
- No changes to UI or user experience

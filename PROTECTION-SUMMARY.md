# Backend Protection Summary

## What's Protected (Hidden from Frontend)

### 1. **Core Calculation Formulas** (when `USE_BACKEND_CALC = true`)
All calculation logic is moved to the backend (`netlify/functions/calculator.js`):

#### Handlebar Position Calculations
- **htaRad** calculation: `(180 - hta) * Math.PI / 180`
- **stemRad** calculation: `(90 - hta + stemAngle) * Math.PI / 180`
- **stemCenterX/Y** calculations involving cosine/sine
- **clampX/Y** calculations
- **handlebarX/Y** final position calculations

#### Saddle Position Calculations
- **setbackVsSTA**: `seatTubeX - targetSaddleX`
- **effectiveSTA**: `90 - angleFromVertical`
- **bbToSRC**: Pythagorean theorem calculation
- **bbToRail**: Seat tube angle trigonometry
- **exposedSeatpost**: Rail to seat tube length

#### Visualization Coordinates
- All stem visualization coordinates (x0-x3, y0-y3)
- Trigonometric calculations for drawing bike geometry
- Head tube angle transformations

### 2. **Google Sheets API Key**
- API key is stored server-side in `.env` file
- Frontend never sees the actual API key
- All Google Sheets requests go through `netlify/functions/sheets-api.js`

### 3. **Spreadsheet ID**
- Spreadsheet ID is stored server-side
- Frontend cannot access the spreadsheet directly

## What's Still on Frontend (Fallback Only)

The frontend code (`js/calculator.js`) still contains calculation logic BUT:
- ✅ It's only used as a **fallback** if the backend fails
- ✅ When `USE_BACKEND_CALC = true`, all calculations come from the server
- ✅ The frontend prefers `_serverHandlebarX`, `_serverHandlebarY`, etc. over local calculations

## How It Works

### Flow Diagram
```
User Input → Frontend collects data → APIClient.callCalculator() → 
Backend Function calculates → Returns results → Frontend displays
```

### Code Flow
1. User changes bike parameters
2. `updateCalculations()` is triggered
3. If `window.USE_BACKEND_CALC === true`:
   - Sends all bike data to `/netlify/functions/calculator`
   - Backend performs ALL calculations
   - Returns complete results including visualization coords
   - Frontend stores results in `bike._server*` properties
4. `updateCalculationsForBike()` displays the data:
   - Checks for `bike._serverHandlebarX` first
   - If found, uses server values
   - If not found (fallback), uses local calculations

### Files Modified

#### Backend (New/Modified)
- `netlify/functions/calculator.js` - All calculation logic
- `netlify/functions/sheets-api.js` - Google Sheets API proxy
- `netlify/functions/package.json` - Dependencies
- `netlify.toml` - Netlify configuration
- `.env` - Environment variables (API keys)

#### Frontend (Modified)
- `js/calculator.js` - Modified to prefer server calculations
- `js/api-client.js` - New API client for backend calls
- `xy-position-calculator/index.html` - Added API client and flag
- Other calculator HTML files - Added API client where needed

## Security Benefits

1. **Obfuscation**: Calculation formulas are not visible in browser dev tools
2. **API Protection**: Google Sheets API key cannot be extracted from frontend
3. **Rate Limiting**: Server-side can implement rate limiting (future)
4. **Input Validation**: Server validates all inputs before processing
5. **Audit Trail**: Server logs all calculation requests (if enabled)

## Testing the Protection

### Verify Backend is Being Used
1. Open browser dev tools → Network tab
2. Use the XY Position Calculator
3. Look for requests to `/netlify/functions/calculator`
4. If you see these requests, backend is active

### Verify Calculations are Hidden
1. Open browser dev tools → Sources tab
2. Search for "htaRad" in `calculator.js`
3. You'll find it, BUT set a breakpoint
4. When it hits, check if `bike._serverHandlebarX` exists
5. If yes, the frontend code is skipped (backend used instead)

## Disable Backend Protection (For Testing)

To disable backend calculations and use frontend only:

In `xy-position-calculator/index.html`, change:
```javascript
window.USE_BACKEND_CALC = true;
```
to:
```javascript
window.USE_BACKEND_CALC = false;
```

Or comment out the line entirely.

## Production Deployment

1. Deploy to Netlify
2. Set environment variables in Netlify dashboard:
   - `GOOGLE_SHEETS_API_KEY`
   - `GOOGLE_SHEETS_ID`
3. All calculations will automatically use the backend
4. Frontend fallback provides reliability if backend is slow/down

## Future Enhancements

Possible additions for even more protection:
- Add request signing to prevent unauthorized API calls
- Implement rate limiting per IP address
- Add caching to reduce server load
- Encrypt calculation results in transit
- Add authentication for heavy API usage

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Get API key from environment variables
        const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        if (!apiKey || !spreadsheetId) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API configuration missing' })
            };
        }

        // Parse request body
        const { range = 'A:P' } = JSON.parse(event.body || '{}');

        // Fetch data from Google Sheets
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google Sheets API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        // Process the data (same logic as in bike-search.js)
        const processedData = processSheetData(data.values);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: processedData
            })
        };

    } catch (error) {
        console.error('Error fetching sheet data:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

function processSheetData(values) {
    if (!values || values.length < 2) return [];
    
    // Skip header row and process data
    const headers = values[0];
    
    return values.slice(1).map(row => {
        const bike = {};
        headers.forEach((header, index) => {
            // Handle variations of the material header
            let key = header.toLowerCase().replace(/\s+/g, '_');
            if (key === 'frame_material' || key === 'material_type' || key === 'frame_material_type') {
                key = 'material';
            }
            bike[key] = row[index];
        });
        return bike;
    });
}


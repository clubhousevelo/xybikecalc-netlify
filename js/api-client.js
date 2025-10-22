// API Client for communicating with Netlify functions
class APIClient {
    static async callCalculator(calculationType, data) {
        try {
            const response = await fetch('/secret_sauce/functions/calculator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    calculationType,
                    data
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown calculation error');
            }

            return result.result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    static async getBikeData(range = 'A:P') {
        try {
            const response = await fetch('/secret_sauce/functions/sheets-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ range })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }

            return result.data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
}

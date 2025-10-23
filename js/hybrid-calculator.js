// Hybrid calculator that uses frontend for simple calculations and backend for complex ones
class HybridCalculator {
    static async calculateStackReach(data) {
        // Simple calculations can be done on frontend for immediate response
        const { handlebarX, handlebarY, headTubeAngle, stemHeight, stemLength, stemAngle, spacerHeight, headsetHeight } = data;
        
        // Basic validation
        if ([handlebarX, handlebarY, headTubeAngle, stemLength, stemAngle, stemHeight, spacerHeight, headsetHeight].some(isNaN)) {
            return { frameReach: '-- mm', frameStack: '-- mm' };
        }

        // For now, use backend for all calculations
        // In the future, we could move simple calculations here for instant response
        try {
            const result = await APIClient.callCalculator('stack-reach', data);
            return result;
        } catch (error) {
            console.error('Calculation error:', error);
            return { frameReach: '-- mm', frameStack: '-- mm' };
        }
    }

    static async calculateStem(data) {
        // Stem calculations could potentially be done on frontend
        // since they're mostly trigonometric
        try {
            const result = await APIClient.callCalculator('stem', data);
            return result;
        } catch (error) {
            console.error('Calculation error:', error);
            return { effectiveReach: null, effectiveStack: null };
        }
    }
}

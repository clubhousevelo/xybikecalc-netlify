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
        const { calculationType, data } = JSON.parse(event.body || '{}');

        let result;

        switch (calculationType) {
            case 'xy-position':
                result = calculateXYPosition(data);
                break;
            case 'position-simulator':
                result = calculatePositionSimulator(data);
                break;
            case 'seatpost':
                result = calculateSeatpost(data);
                break;
            case 'stack-reach':
                result = calculateStackReach(data);
                break;
            case 'stem':
                result = calculateStem(data);
                break;
            default:
                throw new Error('Unknown calculation type');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                result
            })
        };

        } catch (error) {
        console.error('Calculation error:', error);
        
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

// XY Position Calculator calculations
function calculateXYPosition(data) {
    const { bikes, targetReach, targetStack, targetSaddleX, targetSaddleY } = data;
    
    if (!bikes || !Array.isArray(bikes)) {
        throw new Error('Invalid bikes data');
    }

    const results = bikes.map(bike => {
        const reach = parseFloat(bike.reach) || 0;
        const stack = parseFloat(bike.stack) || 0;
        const hta = parseFloat(bike.hta) || 0;
        const sta = parseFloat(bike.sta) || 0;
        const stl = parseFloat(bike.stl) || 0;
        const stemLength = bike.stemLength !== undefined && bike.stemLength !== '' ? parseFloat(bike.stemLength) : 100;
        const stemAngle = bike.stemAngle !== undefined && bike.stemAngle !== '' ? parseFloat(bike.stemAngle) : -6;
        const spacersHeight = bike.spacersHeight !== undefined && bike.spacersHeight !== '' ? parseFloat(bike.spacersHeight) : 20;
        const stemHeight = bike.stemHeight !== undefined && bike.stemHeight !== '' ? parseFloat(bike.stemHeight) : 40;
        const headsetHeight = bike.headsetHeight !== undefined && bike.headsetHeight !== '' ? parseFloat(bike.headsetHeight) : 10;
        
        // Debug logging
        console.log('Bike ID:', bike.id);
        console.log('Raw stem values:', {
            stemLength: bike.stemLength,
            stemAngle: bike.stemAngle,
            spacersHeight: bike.spacersHeight,
            stemHeight: bike.stemHeight,
            headsetHeight: bike.headsetHeight
        });
        console.log('Parsed stem values:', {
            stemLength,
            stemAngle,
            spacersHeight,
            stemHeight,
            headsetHeight
        });
        const handlebarReach = parseFloat(bike.handlebarReach) || 80;
        const saddleSetback = parseFloat(bike.saddleSetback) || 0;
        const saddleHeight = parseFloat(bike.saddleHeight) || 0;

        // Calculate handlebar position
        const htaRad = (180 - hta) * Math.PI / 180;
        const stemRad = (90 - hta + stemAngle) * Math.PI / 180;

        const stemCenterX = (headsetHeight + spacersHeight + stemHeight/2) * Math.cos(htaRad);
        const stemCenterY = (headsetHeight + spacersHeight + stemHeight/2) * Math.sin(htaRad);

            const clampX = stemLength * Math.cos(stemRad);
            const clampY = stemLength * Math.sin(stemRad);
            
        const handlebarX = reach + stemCenterX + clampX;
        const handlebarY = stack + stemCenterY + clampY;

        // Calculate saddle position
        const saddleX = reach + handlebarReach + saddleSetback;
        const saddleY = stack + saddleHeight;

        // Calculate differences from target
        const reachDiff = handlebarX - targetReach;
        const stackDiff = handlebarY - targetStack;

        // Calculate saddle position metrics
        let setbackVsSTA = null;
        let effectiveSTA = null;
        let bbToSRC = null;
        let bbToRail = null;
        let exposedSeatpost = null;

        if (targetSaddleX && targetSaddleY && sta) {
            const seatTubeX = targetSaddleY * Math.tan((90 - sta) * Math.PI / 180);
            setbackVsSTA = Math.round(seatTubeX - targetSaddleX);
            
            const angleFromVertical = Math.atan2(targetSaddleX, targetSaddleY) * 180 / Math.PI;
            effectiveSTA = parseFloat((90 - angleFromVertical).toFixed(1));
            
            bbToSRC = Math.round(Math.sqrt(targetSaddleX * targetSaddleX + targetSaddleY * targetSaddleY));
            
            const seatTubeLengthToSaddleY = targetSaddleY / Math.sin((90 - sta + 90) * Math.PI / 180);
            bbToRail = Math.round(seatTubeLengthToSaddleY);
            
            if (stl) {
                exposedSeatpost = Math.round(bbToRail - stl);
            }
        }

        // Calculate visualization coordinates (for stem comparison graph)
        const visualX0 = reach;
        const visualY0 = stack;
        const visualX1 = visualX0 + Math.cos(htaRad) * (headsetHeight + spacersHeight);
        const visualY1 = visualY0 + Math.sin(htaRad) * (headsetHeight + spacersHeight);
        const visualX2 = visualX1 + Math.cos(htaRad) * (stemHeight / 2);
        const visualY2 = visualY1 + Math.sin(htaRad) * (stemHeight / 2);
        const stemRadVis = (180 - hta + stemAngle - 90) * Math.PI / 180;
        const visualX3 = visualX2 + Math.cos(stemRadVis) * stemLength;
        const visualY3 = visualY2 + Math.sin(stemRadVis) * stemLength;

                return {
                    ...bike,
            handlebarX: Math.round(handlebarX),
            handlebarY: Math.round(handlebarY),
            saddleX: Math.round(saddleX),
            saddleY: Math.round(saddleY),
            reachDiff: Math.round(reachDiff),
            stackDiff: Math.round(stackDiff),
            totalDiff: Math.abs(reachDiff) + Math.abs(stackDiff),
            setbackVsSTA,
            effectiveSTA,
            bbToSRC,
            bbToRail,
            exposedSeatpost,
            // Visualization coordinates
            visualCoords: {
                x0: visualX0,
                y0: visualY0,
                x1: visualX1,
                y1: visualY1,
                x2: visualX2,
                y2: visualY2,
                x3: visualX3,
                y3: visualY3
            }
        };
    });

    return { results };
}

// Seatpost Calculator calculations
function calculateSeatpost(data) {
    const { saddleX, saddleY, seatTubeAngle, seatTubeLength } = data;

    if (!saddleX || !saddleY) {
        return {
            setbackVsSTA: '--',
            effectiveSTA: '--',
            bbToRail: '--',
            bbToSRC: '--',
            exposedSeatpost: '--'
        };
    }

        let setbackVsSTA = '--';
        let effectiveSTA = '--';
        let bbToRail = '--';
    let bbToSRC = '--';
        let exposedSeatpost = '--';

    // Effective STA calculation
    const angleFromVertical = Math.atan2(saddleX, saddleY) * 180 / Math.PI;
            effectiveSTA = (90 - angleFromVertical).toFixed(1);
            
    // BB to Rail calculation
    if (seatTubeAngle) {
        const seatTubeLengthToSaddleY = saddleY / Math.sin((90 - seatTubeAngle + 90) * Math.PI / 180);
        bbToRail = Math.round(seatTubeLengthToSaddleY);
                } else {
        const dx = saddleX;
        const dy = saddleY;
        bbToRail = Math.round(Math.sqrt(dx * dx + dy * dy));
    }

    // BB to Saddle Rail Center calculation
    const dx = saddleX;
    const dy = saddleY;
    bbToSRC = Math.round(Math.sqrt(dx * dx + dy * dy));

    if (seatTubeAngle) {
        // Setback vs STA calculation
        const seatTubeX = saddleY * Math.tan((90 - seatTubeAngle) * Math.PI / 180);
        setbackVsSTA = Math.round(seatTubeX - saddleX);

        // Exposed Seatpost calculation
        if (seatTubeLength) {
            exposedSeatpost = Math.round(bbToRail - seatTubeLength);
        }
    }


    return {
        setbackVsSTA,
        effectiveSTA,
        bbToRail,
        bbToSRC,
        exposedSeatpost
    };
}

// Stack/Reach Calculator calculations
function calculateStackReach(data) {
    const {
        handlebarX,
        handlebarY,
        headTubeAngle,
        stemHeight,
        stemLength,
        stemAngle,
        spacerHeight,
        headsetHeight
    } = data;

    if (!handlebarX || !handlebarY) {
                return {
            frameReach: '-- mm',
            frameStack: '-- mm'
        };
    }

    // Convert angles to radians
    const htaRad = (180 - headTubeAngle) * Math.PI / 180;
    const stemRad = (90 - headTubeAngle + stemAngle) * Math.PI / 180;

    // Calculate stem center position
    const stemCenterX = (headsetHeight + spacerHeight + stemHeight/2) * Math.cos(htaRad);
    const stemCenterY = (headsetHeight + spacerHeight + stemHeight/2) * Math.sin(htaRad);

    // Calculate stem clamp position
    const clampX = stemLength * Math.cos(stemRad);
    const clampY = stemLength * Math.sin(stemRad);

    // Calculate frame coordinates
    const frameReachValue = Math.round(handlebarX - (stemCenterX + clampX));
    const frameStackValue = Math.round(handlebarY - (stemCenterY + clampY));

        return {
        frameReach: `${frameReachValue} mm`,
        frameStack: `${frameStackValue} mm`
    };
}

// Stem Calculator calculations
function calculateStem(data) {
    const {
        headTubeAngle,
        stemHeight,
        stemLength,
        stemAngle,
        spacerHeight
    } = data;

    // Convert angles to radians
            const htaRad = (180 - headTubeAngle) * Math.PI / 180;
    const stemRad = (90 - headTubeAngle + stemAngle) * Math.PI / 180;

    // Calculate stem center position
    const stemCenterX = (spacerHeight + stemHeight/2) * Math.cos(htaRad);
    const stemCenterY = (spacerHeight + stemHeight/2) * Math.sin(htaRad);

    // Calculate clamp position
    const clampX = stemLength * Math.cos(stemRad);
    const clampY = stemLength * Math.sin(stemRad);

    // Calculate total X and Y positions
    const totalX = stemCenterX + clampX;
    const totalY = stemCenterY + clampY;
        
        return {
        effectiveReach: totalX,
        effectiveStack: totalY
    };
}

// Position Simulator calculations (single bike)
function calculatePositionSimulator(data) {
    const { 
        bike, 
        saddleX, 
        saddleY, 
        targetHandlebarX, 
        targetHandlebarY, 
        handlebarReachUsed,
        isSaddleValid 
    } = data;
    
    // Parse bike geometry values
    const reach = parseFloat(bike.reach) || 0;
    const stack = parseFloat(bike.stack) || 0;
    const hta = parseFloat(bike.hta) || 0;
    const sta = parseFloat(bike.sta) || 0;
    const stl = parseFloat(bike.stl) || 0;
    const stemLength = bike.stemLength !== undefined && bike.stemLength !== '' ? parseFloat(bike.stemLength) : 0;
    const stemAngle = bike.stemAngle !== undefined && bike.stemAngle !== '' ? parseFloat(bike.stemAngle) : 0;
    const spacersHeight = bike.spacersHeight !== undefined && bike.spacersHeight !== '' ? parseFloat(bike.spacersHeight) : 0;
    const stemHeight = bike.stemHeight !== undefined && bike.stemHeight !== '' ? parseFloat(bike.stemHeight) : 0;
    const headsetHeight = bike.headsetHeight !== undefined && bike.headsetHeight !== '' ? parseFloat(bike.headsetHeight) : 0;

    // Initialize result object
    let result = {
        handlebarX: '-- ',
        handlebarY: '-- ',
        barReachNeeded: '-- ',
        handlebarXDiff: '',
        handlebarYDiff: '',
        setbackVsSTA: '--',
        effectiveSTA: '--',
        bbToRail: '--',
        bbToSRC: '--',
        exposedSeatpost: '--'
    };

    // Check if we have required geometry for handlebar calculations
    const hasRequiredGeometry = reach && stack && hta;

    if (hasRequiredGeometry) {
        // Calculate handlebar position
        const htaRad = (180 - hta) * Math.PI / 180;
        const stemRad = (90 - hta + stemAngle) * Math.PI / 180;
        
        const stemHeightHalf = stemHeight / 2;
        const stemCenterX = (headsetHeight + spacersHeight + stemHeightHalf) * Math.cos(htaRad);
        const stemCenterY = (headsetHeight + spacersHeight + stemHeightHalf) * Math.sin(htaRad);
        
        const clampX = stemLength * Math.cos(stemRad);
        const clampY = stemLength * Math.sin(stemRad);
        
        const handlebarX = reach + stemCenterX + clampX;
        const handlebarY = stack + stemCenterY + clampY;

        result.handlebarX = Math.round(handlebarX);
        result.handlebarY = Math.round(handlebarY);

        // Calculate bar reach needed
        if (targetHandlebarX && handlebarReachUsed) {
            result.barReachNeeded = targetHandlebarX + handlebarReachUsed - Math.round(handlebarX);
        }

        // Calculate differences between target and actual handlebar positions
        if (targetHandlebarX) {
            const xDiff = Math.round(handlebarX) - targetHandlebarX;
            result.handlebarXDiff = xDiff > 0 ? `+${xDiff}` : `${xDiff}`;
        }
        
        if (targetHandlebarY) {
            const yDiff = Math.round(handlebarY) - targetHandlebarY;
            result.handlebarYDiff = yDiff > 0 ? `+${yDiff}` : `${yDiff}`;
        }
    }

    // Calculate saddle position metrics
    if ((saddleX !== 0 || saddleY !== 0) && isSaddleValid) {
        const hasSTA = !!sta;
        
        if (hasSTA) {
            // Calculate setback vs STA (horizontal distance from seat tube extended)
            const seatTubeX = saddleY * Math.tan((90 - sta) * Math.PI / 180);
            result.setbackVsSTA = Math.round(seatTubeX - saddleX);
        }
        
        // Calculate effective STA (angle from BB to saddle)
        const angleFromVertical = Math.atan2(saddleX, saddleY) * 180 / Math.PI;
        result.effectiveSTA = (90 - angleFromVertical).toFixed(1);
        
        // Calculate BB to Rail distance only when STA exists
        if (hasSTA) {
            const seatTubeLengthToSaddleYScale = saddleY / Math.sin((90 - sta + 90) * Math.PI / 180);
            result.bbToRail = Math.round(seatTubeLengthToSaddleYScale);
        }
        
        // Calculate BB to SRC (hypotenuse of Saddle X and Y values)
        result.bbToSRC = Math.round(Math.sqrt(saddleX * saddleX + saddleY * saddleY));
        
        // Calculate exposed seatpost
        if (hasSTA && stl) {
            result.exposedSeatpost = Math.round(result.bbToRail - stl);
        }
    }

    return result;
}
        
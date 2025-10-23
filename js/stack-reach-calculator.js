class HXHYCalculator {
    constructor() {
        this.handlebarX = document.getElementById('handlebarX');
        
        // Create debounced calculator (300ms delay)
        this.debouncedCalculate = OptimizedAPIClient.createDebouncedCalculator(300);
        this.handlebarY = document.getElementById('handlebarY');
        this.headTubeAngle = document.getElementById('headTubeAngle');
        this.stemHeight = document.getElementById('stemHeight');
        this.stemLength = document.getElementById('stemLength');
        this.stemAngle = document.getElementById('stemAngle');
        this.spacerHeight = document.getElementById('spacerHeight');
        this.headsetHeight = document.getElementById('headsetHeight');
        this.frameReach = document.getElementById('frameReach');
        this.frameStack = document.getElementById('frameStack');
        
        // Initialize canvas
        this.canvas = document.getElementById('stackReachCanvas');
        this.ctx = null;
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.initializeCanvas();
        }

        // Check if there's saved data and a valid session
        const savedData = localStorage.getItem('hxhyCalculatorData');
        const sessionStart = sessionStorage.getItem('calculatorSession');
        
        if (savedData && sessionStart) {
            const data = JSON.parse(savedData);
            // Only load data if it's from the current session
            if (data.sessionTimestamp === sessionStart) {
                this.loadSavedData();
            }
        } else if (!sessionStart) {
            // Only set a new session if there isn't one at all
            sessionStorage.setItem('calculatorSession', Date.now().toString());
        }

        // Initialize sliders with default values if no saved data
        if (!savedData || !sessionStart) {
            this.initializeSlidersWithDefaults();
            // Calculate results immediately with default values
            setTimeout(() => {
                this.calculate();
            }, 100);
        }

        this.initializeEventListeners();
    }

    initializeSlidersWithDefaults() {
        // Set default values for inputs and sliders
        this.handlebarX.value = '469';
        this.handlebarY.value = '618';
        this.headTubeAngle.value = '72.4';
        this.stemHeight.value = '40';
        this.stemLength.value = '100';
        this.stemAngle.value = '-6';
        this.spacerHeight.value = '28';
        this.headsetHeight.value = '10';
        
        // Update slider values
        document.getElementById('handlebarXSlider').value = '469';
        document.getElementById('handlebarYSlider').value = '618';
        document.getElementById('headTubeAngleSlider').value = '72.4';
        document.getElementById('stemHeightSlider').value = '40';
        document.getElementById('stemLengthSlider').value = '100';
        document.getElementById('stemAngleSlider').value = '-6';
        document.getElementById('spacerHeightSlider').value = '20';
        document.getElementById('headsetHeightSlider').value = '10';
    }

    initializeEventListeners() {
        const inputs = [
            this.handlebarX,
            this.handlebarY,
            this.headTubeAngle,
            this.stemHeight,
            this.stemLength,
            this.stemAngle,
            this.spacerHeight,
            this.headsetHeight
        ];

        // Get slider elements
        const sliders = [
            document.getElementById('handlebarXSlider'),
            document.getElementById('handlebarYSlider'),
            document.getElementById('headTubeAngleSlider'),
            document.getElementById('stemHeightSlider'),
            document.getElementById('stemLengthSlider'),
            document.getElementById('stemAngleSlider'),
            document.getElementById('spacerHeightSlider'),
            document.getElementById('headsetHeightSlider')
        ];

        // Add event listeners for input fields
        inputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                // Update corresponding slider
                if (sliders[index]) {
                    sliders[index].value = input.value;
                }
                this.calculate();
                this.updateVisualization();
                this.saveData();
            });
        });

        // Add event listeners for sliders
        sliders.forEach((slider, index) => {
            if (slider) {
                slider.addEventListener('input', () => {
                    // Update corresponding input field
                    inputs[index].value = slider.value;
                    // Use debounced calculation for better performance
                    this.debouncedCalculate('stack-reach', this.getCalculationData());
                    this.updateVisualization();
                    this.saveData();
                });
            }
        });

        // Add reset button event listener
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }
    }

    initializeCanvas() {
        if (!this.canvas || !this.ctx) return;
        
        // Set canvas size to match display size
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        // Enable high-quality rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.drawEmptyState();
    }

    drawEmptyState() {
        if (!this.canvas || !this.ctx) return;
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set background
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card-background') || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw placeholder text
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Enter values to see visualization', canvas.width / 2, canvas.height / 2);
    }

    updateVisualization() {
        if (!this.canvas || !this.ctx) return;
        
        const handlebarX = parseFloat(this.handlebarX.value);
        const handlebarY = parseFloat(this.handlebarY.value);
        
        if (!handlebarX || !handlebarY) {
            this.drawEmptyState();
            return;
        }
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set background
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card-background') || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale to ensure handlebar circle is always fully visible
        const padding = 25; // Increased padding to ensure circle visibility
        const handlebarRadius = 15.9; // Radius in mm
        
        // Calculate the required space for the handlebar circle
        const requiredWidth = handlebarX + handlebarRadius + padding;
        const requiredHeight = handlebarY + handlebarRadius + padding;
        
        const scale = Math.min(
            (canvas.width - padding * 2) / requiredWidth,
            (canvas.height - padding * 2) / requiredHeight
        );
        
        // Calculate origin (bottom left corner)
        const originX = padding;
        const originY = canvas.height - padding;
        
        // Draw grid lines for every 10mm to fill the entire canvas
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Calculate grid range to fill the entire canvas
        const gridMaxX = Math.ceil(canvas.width / scale);
        const gridMaxY = Math.ceil(canvas.height / scale);
        
        // Vertical grid lines (fill entire canvas width)
        for (let x = 0; x <= gridMaxX; x += 10) {
            const canvasX = x * scale;
            ctx.beginPath();
            ctx.moveTo(canvasX, 0);
            ctx.lineTo(canvasX, canvas.height);
            ctx.stroke();
        }
        
        // Horizontal grid lines (fill entire canvas height)
        for (let y = 0; y <= gridMaxY; y += 10) {
            const canvasY = y * scale;
            ctx.beginPath();
            ctx.moveTo(0, canvasY);
            ctx.lineTo(canvas.width, canvasY);
            ctx.stroke();
        }
        

        
        // Calculate handlebar position (needed for stem and steerer tube)
        const handlebarCanvasX = originX + handlebarX * scale;
        const handlebarCanvasY = originY - handlebarY * scale;
        const handlebarRadiusScaled = handlebarRadius * scale;
        
        // Draw stem (rectangle connecting to handlebar)
        const stemLength = parseFloat(this.stemLength.value);
        const stemAngle = parseFloat(this.stemAngle.value);
        const headTubeAngle = parseFloat(this.headTubeAngle.value);
        
        if (stemLength && !isNaN(stemLength)) {
            // Calculate stem end position (where it connects to the steerer tube)
            const stemAngleRad = (-90 + headTubeAngle - stemAngle) * Math.PI / 180;
            const stemEndX = handlebarCanvasX - stemLength * scale * Math.cos(stemAngleRad);
            const stemEndY = handlebarCanvasY - stemLength * scale * Math.sin(stemAngleRad);
            
            // Draw stem as a line from handlebar center to stem end
            ctx.strokeStyle = '#bbb';
            ctx.lineWidth = 31.8 * scale; // 25mm wide stem line
            ctx.beginPath();
            ctx.moveTo(handlebarCanvasX, handlebarCanvasY);
            ctx.lineTo(stemEndX, stemEndY);
            ctx.stroke();
        }
        
        // Draw steerer tube components separately
        if (headTubeAngle && !isNaN(headTubeAngle) && stemLength && !isNaN(stemLength)) {
            // Calculate stem end position (where it connects to the steerer tube)
            const stemAngleRad = (-90 + headTubeAngle - stemAngle) * Math.PI / 180;
            const stemEndX = handlebarCanvasX - stemLength * scale * Math.cos(stemAngleRad);
            const stemEndY = handlebarCanvasY - stemLength * scale * Math.sin(stemAngleRad);
            
            // Get component heights
            const spacerHeight = parseFloat(this.spacerHeight.value) || 0;
            const headsetHeight = parseFloat(this.headsetHeight.value) || 0;
            const stemHeight = parseFloat(this.stemHeight.value) || 0;
            
            const steererTubeAngleRad = (0 + headTubeAngle) * Math.PI / 180;
            
            // Calculate positions for each component
            let currentX = stemEndX;
            let currentY = stemEndY;
            
            // 1. Draw stem height segment (one continuous line from bottom to top)
            if (stemHeight > 0) {
                const halfStemHeight = (stemHeight / 2) * scale;
                
                // Calculate bottom and top positions
                const stemHeightBottomX = currentX - halfStemHeight * Math.cos(steererTubeAngleRad);
                const stemHeightBottomY = currentY - halfStemHeight * Math.sin(steererTubeAngleRad);
                const stemHeightTopX = currentX + halfStemHeight * Math.cos(steererTubeAngleRad);
                const stemHeightTopY = currentY + halfStemHeight * Math.sin(steererTubeAngleRad);
                
                // Draw as one continuous line from bottom to top
                ctx.strokeStyle = '#bbb'; // Dark gray for stem height
                ctx.lineWidth = 31.8 * scale;
                ctx.beginPath();
                ctx.moveTo(stemHeightBottomX, stemHeightBottomY);
                ctx.lineTo(stemHeightTopX, stemHeightTopY);
                ctx.stroke();
                
                // Update current position to the top of stem height for next component
                currentX = stemHeightTopX;
                currentY = stemHeightTopY;
            }
            
            // 2. Draw spacer segment
            if (spacerHeight > 0) {
                const spacerStartX = currentX;
                const spacerStartY = currentY;
                const spacerEndX = currentX + spacerHeight * scale * Math.cos(steererTubeAngleRad);
                const spacerEndY = currentY + spacerHeight * scale * Math.sin(steererTubeAngleRad);
                
                ctx.strokeStyle = '#a0a0a0'; // Light gray for spacers
                ctx.lineWidth = 28.6 * scale;
                ctx.beginPath();
                ctx.moveTo(spacerStartX, spacerStartY);
                ctx.lineTo(spacerEndX, spacerEndY);
                ctx.stroke();
                
                currentX = spacerEndX;
                currentY = spacerEndY;
            }
            
            // 3. Draw headset height segment as a trapezoid
            if (headsetHeight > 0) {
                const headsetStartX = currentX;
                const headsetStartY = currentY;
                const headsetEndX = currentX + headsetHeight * scale * Math.cos(steererTubeAngleRad);
                const headsetEndY = currentY + headsetHeight * scale * Math.sin(steererTubeAngleRad);
                
                // Calculate perpendicular angle for width
                const perpAngle = steererTubeAngleRad + Math.PI / 2;
                
                // Top width (matching head tube width)
                const topWidth = 28.6 * scale;
                // Bottom width (matching spacer width)
                const bottomWidth = 34 * scale;
                
                // Calculate the four corners of the trapezoid
                const topLeftX = headsetStartX - (topWidth / 2) * Math.cos(perpAngle);
                const topLeftY = headsetStartY - (topWidth / 2) * Math.sin(perpAngle);
                const topRightX = headsetStartX + (topWidth / 2) * Math.cos(perpAngle);
                const topRightY = headsetStartY + (topWidth / 2) * Math.sin(perpAngle);
                
                const bottomLeftX = headsetEndX - (bottomWidth / 2) * Math.cos(perpAngle);
                const bottomLeftY = headsetEndY - (bottomWidth / 2) * Math.sin(perpAngle);
                const bottomRightX = headsetEndX + (bottomWidth / 2) * Math.cos(perpAngle);
                const bottomRightY = headsetEndY + (bottomWidth / 2) * Math.sin(perpAngle);
                
                // Draw the trapezoid
                ctx.fillStyle = '#555555'; // Medium gray for headset
                ctx.beginPath();
                ctx.moveTo(topLeftX, topLeftY);
                ctx.lineTo(topRightX, topRightY);
                ctx.lineTo(bottomRightX, bottomRightY);
                ctx.lineTo(bottomLeftX, bottomLeftY);
                ctx.closePath();
                ctx.fill();
            }
        }
        
        // Draw handlebar position (31.8mm diameter circle) - after stem
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007aff';
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007aff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(handlebarCanvasX, handlebarCanvasY, handlebarRadiusScaled, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw circle around handlebar
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(handlebarCanvasX, handlebarCanvasY, handlebarRadiusScaled, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw dot in center of handlebar
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#000000';
        ctx.beginPath();
        ctx.arc(handlebarCanvasX, handlebarCanvasY, 3 * scale, 0, 2 * Math.PI);
        ctx.fill();
        
        // Calculate Reach and Stack position
        const reachText = this.frameReach.textContent;
        const stackText = this.frameStack.textContent;
        const reach = parseFloat(reachText);
        const stack = parseFloat(stackText);
        
        // Calculate Reach and Stack coordinates (needed for multiple components)
        const reachStackX = originX + reach * scale;
        const reachStackY = originY - stack * scale;
        
        if (!isNaN(reach) && !isNaN(stack) && reachText !== '-- mm' && stackText !== '-- mm') {
            
            // Draw Reach and Stack line perpendicular to head tube angle
            const htaForLine = parseFloat(this.headTubeAngle.value);
            if (htaForLine && !isNaN(htaForLine)) {
                const htaRadForLine = (360 + htaForLine) * Math.PI / 180;
                const perpendicularAngleRad = htaRadForLine + Math.PI / 2; // Perpendicular angle
                const lineLength = 17 * scale; // 20mm line length
                
                const lineStartX = reachStackX - lineLength * Math.cos(perpendicularAngleRad);
                const lineStartY = reachStackY - lineLength * Math.sin(perpendicularAngleRad);
                const lineEndX = reachStackX + lineLength * Math.cos(perpendicularAngleRad);
                const lineEndY = reachStackY + lineLength * Math.sin(perpendicularAngleRad);
                
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 1.5*scale;
                ctx.beginPath();
                ctx.moveTo(lineStartX, lineStartY);
                ctx.lineTo(lineEndX, lineEndY);
                ctx.stroke();
            }
            
                    // Draw X and Y axes
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#000000';
        ctx.lineWidth = 0.6;
        ctx.setLineDash([]);
        
        // X axis (horizontal line)
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(canvas.width, originY);
        ctx.stroke();
        
        // Y axis (vertical line)
        ctx.beginPath();
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, canvas.height);
        ctx.stroke();
        
        
            

            
            // Draw dummy bike frame head tube
            const headTubeAngle = parseFloat(this.headTubeAngle.value);
            if (headTubeAngle && !isNaN(headTubeAngle)) {
                const headTubeWidth = 35 * scale; // 35mm head tube width
                const headTubeAngleRad = (360 + headTubeAngle) * Math.PI / 180;
                
                // Calculate head tube end position (bottom of head tube at Y = 410)
                const headTubeEndY = originY - 410 * scale; // Locked to Y = 410
                const headTubeEndX = reachStackX + (headTubeEndY - reachStackY) / Math.tan(headTubeAngleRad);
                
                // Draw head tube as a thick line
                ctx.strokeStyle = '#cccccc';
                ctx.lineWidth = headTubeWidth;
                ctx.beginPath();
                ctx.moveTo(reachStackX, reachStackY);
                ctx.lineTo(headTubeEndX, headTubeEndY);
                ctx.stroke();
                
                
                // Draw down tube from bottom of head tube to BB center
                const downTubeStartX = headTubeEndX - 35 * scale * Math.cos(headTubeAngleRad);
                const downTubeStartY = headTubeEndY - 35 * scale * Math.sin(headTubeAngleRad);
                
                ctx.strokeStyle = '#cccccc';
                ctx.lineWidth = 35 * scale; // 35mm line width (same as head tube)
                ctx.beginPath();
                ctx.moveTo(downTubeStartX, downTubeStartY);
                ctx.lineTo(originX, originY);
                ctx.stroke();
                
                // Draw top tube extending with 6° downward slope from head tube
                const topTubeStartX = reachStackX + 35 * scale * Math.cos(headTubeAngleRad);
                const topTubeStartY = reachStackY + 35 * scale * Math.sin(headTubeAngleRad);
                const topTubeLength = Math.abs(originX - 100 * scale - topTubeStartX); // Distance to X = -100
                const topTubeAngleRad = (180 - 4) * Math.PI / 180; // 6° downward slope
                const topTubeEndX = originX - 100 * scale; // -100mm in X coordinate
                const topTubeEndY = topTubeStartY + topTubeLength * Math.sin(topTubeAngleRad); // 6° downward slope
                
                ctx.strokeStyle = '#cccccc';
                ctx.lineWidth = 35 * scale; // 35mm line width (same as other frame tubes)
                ctx.beginPath();
                ctx.moveTo(topTubeStartX, topTubeStartY);
                ctx.lineTo(topTubeEndX, topTubeEndY);
                ctx.stroke();
                
                // Draw seat tube with 73° STA
                const seatTubeAngle = 73; // 73° seat tube angle
                const seatTubeLength = 500 * scale; // 500mm seat tube length
                const seatTubeAngleRad = (180 - seatTubeAngle) * Math.PI / 180;
                
                // Calculate seat tube end position (top of seat tube)
                const seatTubeEndX = originX + seatTubeLength * Math.cos(seatTubeAngleRad);
                const seatTubeEndY = originY - seatTubeLength * Math.sin(seatTubeAngleRad);
                
                ctx.strokeStyle = '#cccccc';
                ctx.lineWidth = 35 * scale; // 35mm line width (same as other frame tubes)
                ctx.beginPath();
                ctx.moveTo(originX, originY);
                ctx.lineTo(seatTubeEndX, seatTubeEndY);
                ctx.stroke();
            }
        }
        
        // Draw dashed lines from axes to Reach and Stack point (after frame tubes)
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#000000';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Vertical dashed line from X axis to Reach/Stack point
        ctx.beginPath();
        ctx.moveTo(reachStackX, originY);
        ctx.lineTo(reachStackX, reachStackY);
        ctx.stroke();
        
        // Horizontal dashed line from Y axis to Reach/Stack point
        ctx.beginPath();
        ctx.moveTo(originX, reachStackY);
        ctx.lineTo(reachStackX, reachStackY);
        ctx.stroke();
        
        // Reset line dash
        ctx.setLineDash([]);
        
        // Draw Reach and Stack labels near axes
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        
        // Stack label centered and to the right of vertical dashed line, rotated 90° clockwise
        ctx.save();
        ctx.translate((originX + reachStackX), (originY + reachStackY) / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.fillText(`Stack: ${stack}mm`, 0, +10);
        ctx.restore();
        
        // Reach label centered above horizontal dashed line
        ctx.fillText(`Reach: ${reach}mm`, (originX + reachStackX) / 2, reachStackY - 10);
        
        // Draw bottom bracket (47mm diameter circle at origin) - after frame tubes
        const bbRadius = 47 * scale / 2;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card-background').trim() || '#ffffff';
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(originX, originY, bbRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw BB label
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('BB', originX + bbRadius + 5, originY + 14);
        
        // Draw handlebar label
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`HX: ${handlebarX}mm`, handlebarCanvasX, handlebarCanvasY - 34);
        ctx.fillText(`HY: ${handlebarY}mm`, handlebarCanvasX, handlebarCanvasY - 20);
    }

    saveData() {
        const data = {
            sessionTimestamp: sessionStorage.getItem('calculatorSession'),
            handlebarX: this.handlebarX.value,
            handlebarY: this.handlebarY.value,
            headTubeAngle: this.headTubeAngle.value,
            stemHeight: this.stemHeight.value,
            stemLength: this.stemLength.value,
            stemAngle: this.stemAngle.value,
            spacerHeight: this.spacerHeight.value,
            headsetHeight: this.headsetHeight.value
        };
        localStorage.setItem('hxhyCalculatorData', JSON.stringify(data));
    }

    loadSavedData() {
        const savedData = localStorage.getItem('hxhyCalculatorData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.handlebarX.value = data.handlebarX || '469';
            this.handlebarY.value = data.handlebarY || '618';
            this.headTubeAngle.value = data.headTubeAngle || '72.4';
            this.stemHeight.value = data.stemHeight || '40';
            this.stemLength.value = data.stemLength || '100';
            this.stemAngle.value = data.stemAngle || '-6';
            this.spacerHeight.value = data.spacerHeight || '28';
            this.headsetHeight.value = data.headsetHeight || '0'; // Default to 0 for existing profiles
            
            // Update slider values to match input values
            document.getElementById('handlebarXSlider').value = this.handlebarX.value;
            document.getElementById('handlebarYSlider').value = this.handlebarY.value;
            document.getElementById('headTubeAngleSlider').value = this.headTubeAngle.value;
            document.getElementById('stemHeightSlider').value = this.stemHeight.value;
            document.getElementById('stemLengthSlider').value = this.stemLength.value;
            document.getElementById('stemAngleSlider').value = this.stemAngle.value;
            document.getElementById('spacerHeightSlider').value = this.spacerHeight.value;
            document.getElementById('headsetHeightSlider').value = this.headsetHeight.value;
            
            this.calculate();
        }
    }

    resetToDefaults() {
        // Reset all inputs to default values
        this.handlebarX.value = '469';
        this.handlebarY.value = '618';
        this.headTubeAngle.value = '72.4';
        this.stemHeight.value = '40';
        this.stemLength.value = '100';
        this.stemAngle.value = '-6';
        this.spacerHeight.value = '28';
        this.headsetHeight.value = '10';
        
        // Reset all sliders to default values
        document.getElementById('handlebarXSlider').value = '469';
        document.getElementById('handlebarYSlider').value = '618';
        document.getElementById('headTubeAngleSlider').value = '72.4';
        document.getElementById('stemHeightSlider').value = '40';
        document.getElementById('stemLengthSlider').value = '100';
        document.getElementById('stemAngleSlider').value = '-6';
        document.getElementById('spacerHeightSlider').value = '28';
        document.getElementById('headsetHeightSlider').value = '10';
        
        // Clear saved data from localStorage
        localStorage.removeItem('hxhyCalculatorData');
        
        // Calculate results with default values
        this.calculate();
        
        // Update visualization
        this.updateVisualization();
        
        // Save the default values
        this.saveData();
    }

    getCalculationData() {
        // Check if handlebar coordinates are empty
        if (!this.handlebarX.value || !this.handlebarY.value) {
            return null;
        }

        // Get all input values
        const handlebarX = parseFloat(this.handlebarX.value);
        const handlebarY = parseFloat(this.handlebarY.value);
        const hta = parseFloat(this.headTubeAngle.value);
        const stemHeight = parseFloat(this.stemHeight.value);
        const stemLength = parseFloat(this.stemLength.value);
        const stemAngle = parseFloat(this.stemAngle.value);
        const spacerHeight = parseFloat(this.spacerHeight.value);
        const headsetHeight = parseFloat(this.headsetHeight.value);

        // Check if any value is NaN
        if ([handlebarX, handlebarY, hta, stemLength, stemAngle, stemHeight, spacerHeight, headsetHeight].some(isNaN)) {
            return null;
        }

        return {
            handlebarX,
            handlebarY,
            headTubeAngle: hta,
            stemHeight,
            stemLength,
            stemAngle,
            spacerHeight,
            headsetHeight
        };
    }

    async calculate() {
        const data = this.getCalculationData();
        
        if (!data) {
            this.frameReach.textContent = '-- mm';
            this.frameStack.textContent = '-- mm';
            return;
        }

        try {
            // Use server-side calculation only
            const result = await APIClient.callCalculator('stack-reach', data);

            // Update display
            this.frameReach.textContent = result.frameReach;
            this.frameStack.textContent = result.frameStack;
            
            // Update visualization
            this.updateVisualization();
        } catch (error) {
            console.error('Server error:', error);
            this.frameReach.textContent = '-- mm';
            this.frameStack.textContent = '-- mm';
        }
    }
}

// Initialize calculator when page loads
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new HXHYCalculator();
    
    // Expose calculator globally for dark mode toggle
    window.calculator = calculator;
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (calculator.canvas) {
            calculator.initializeCanvas();
            calculator.updateVisualization();
        }
    });
}); 
class SeatpostCalculator {
    constructor() {
        // Create debounced update function using centralized config
        this.debouncedUpdate = DebounceUtils.debounce(async () => {
            await this.calculateResults();
        }, DebounceUtils.getDelay('seatpost'));
        
        this.initialize();
    }

    initialize() {
        this.initializeEventListeners();
        this.loadSavedValues();
        this.initializeCanvas();
        // Initialize theme after DOM is ready
        this.initializeTheme();
    }

    initializeEventListeners() {
        // Input field event listeners for real-time calculation
        const inputs = ['saddleX', 'saddleY', 'seatTubeAngle', 'seatTubeLength'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            const slider = document.getElementById(inputId + 'Slider');
            
            if (input) {
                input.addEventListener('input', () => {
                    // Validate Saddle X and Y to prevent negative values
                    if (inputId === 'saddleX' || inputId === 'saddleY') {
                        const value = parseFloat(input.value);
                        if (value < 0) {
                            input.value = 0;
                        }
                    }
                    
                    // Update corresponding slider
                    if (slider) {
                        slider.value = input.value;
                    }
                    
                    this.saveValues();
                    // Trigger debounced update (waits 300ms after last input)
                    this.debouncedUpdate();
                });
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.calculateResults();
                    }
                });
            }
            
            // Slider event listeners
            if (slider) {
                slider.addEventListener('input', () => {
                    if (input) {
                        input.value = slider.value;
                        this.saveValues();
                        // Trigger debounced update (waits 300ms after last slider movement)
                        this.debouncedUpdate();
                    }
                });
            }
        });





        // Clear button event listener
        const clearButton = document.getElementById('clearButton');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearAllValues();
            });
        }

        // Handle canvas resize
        window.addEventListener('resize', () => {
            if (this.canvas) {
                this.canvas.width = this.canvas.offsetWidth;
                this.canvas.height = this.canvas.offsetHeight;
                
                // Enable high-quality rendering
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                
                // Redraw current state by recalculating via backend
                this.calculateResults();
            }
        });
    }

    async calculateResults() {
        // Get input values
        const saddleX = parseFloat(document.getElementById('saddleX').value) || 0;
        const saddleY = parseFloat(document.getElementById('saddleY').value) || 0;
        const seatTubeAngle = parseFloat(document.getElementById('seatTubeAngle').value) || 0;
        const seatTubeLength = parseFloat(document.getElementById('seatTubeLength').value) || 0;

        try {
            // Use server-side calculation only
            const result = await APIClient.callCalculator('seatpost', {
                saddleX,
                saddleY,
                seatTubeAngle,
                seatTubeLength
            });


            // Update display
            this.updateDisplay(result.setbackVsSTA, result.effectiveSTA, result.bbToRail, result.bbToSRC, result.exposedSeatpost);
            
            // Update visualization
            this.updateVisualization(saddleX, saddleY, seatTubeAngle, seatTubeLength, result.bbToRail, result.bbToSRC, result.exposedSeatpost, result.effectiveSTA);
        } catch (error) {
            console.error('Server error:', error);
            this.updateDisplay('--', '--', '--', '--', '--');
        }
    }

    updateDisplay(setbackVsSTA, effectiveSTA, bbToRail, bbToSRC, exposedSeatpost) {
        // Update Setback vs STA
        const setbackElement = document.getElementById('setbackVsSTA');
        if (setbackElement) {
            setbackElement.textContent = typeof setbackVsSTA === 'number' ? 
                `${setbackVsSTA > 0 ? '+' : ''}${setbackVsSTA} mm` : setbackVsSTA;
        }

        // Update Effective STA
        const effectiveSTAElement = document.getElementById('effectiveSTA');
        if (effectiveSTAElement) {
            effectiveSTAElement.textContent = effectiveSTA !== '--' ? `${effectiveSTA}°` : effectiveSTA;
        }

        // Update BB to Rail
        const bbToRailElement = document.getElementById('bbToRail');
        if (bbToRailElement) {
            bbToRailElement.textContent = bbToRail !== '--' ? `~${bbToRail} mm` : bbToRail;
        }

        // Update BB to Saddle Rail Center (SRC)
        const bbToSRCElement = document.getElementById('bbToSRC');
        if (bbToSRCElement) {
            bbToSRCElement.textContent = bbToSRC !== '--' ? `${bbToSRC} mm` : bbToSRC;
        }

        // Update Exposed Seatpost
        const exposedSeatpostElement = document.getElementById('exposedSeatpost');
        if (exposedSeatpostElement) {
            exposedSeatpostElement.textContent = exposedSeatpost !== '--' ? `${exposedSeatpost} mm` : exposedSeatpost;
        }
    }

    saveValues() {
        const values = {
            saddleX: document.getElementById('saddleX').value,
            saddleY: document.getElementById('saddleY').value,
            seatTubeAngle: document.getElementById('seatTubeAngle').value,
            seatTubeLength: document.getElementById('seatTubeLength').value
        };
        localStorage.setItem('seatpostCalculatorValues', JSON.stringify(values));
    }

    loadSavedValues() {
        const savedValues = localStorage.getItem('seatpostCalculatorValues');
        if (savedValues) {
            try {
                const values = JSON.parse(savedValues);
                if (values.saddleX) {
                    document.getElementById('saddleX').value = values.saddleX;
                    document.getElementById('saddleXSlider').value = values.saddleX;
                }
                if (values.saddleY) {
                    document.getElementById('saddleY').value = values.saddleY;
                    document.getElementById('saddleYSlider').value = values.saddleY;
                }
                if (values.seatTubeAngle) {
                    document.getElementById('seatTubeAngle').value = values.seatTubeAngle;
                    document.getElementById('seatTubeAngleSlider').value = values.seatTubeAngle;
                }
                if (values.seatTubeLength) {
                    document.getElementById('seatTubeLength').value = values.seatTubeLength;
                    document.getElementById('seatTubeLengthSlider').value = values.seatTubeLength;
                }
            } catch (e) {
                console.error('Error loading saved values:', e);
            }
        } else {
            // Set default seat tube angle to 73 if no saved values
            document.getElementById('seatTubeAngle').value = '73';
            document.getElementById('seatTubeAngleSlider').value = '73';
        }
        
        // Always calculate results to ensure visualization is drawn
        setTimeout(() => {
            this.calculateResults();
        }, 100);
    }

    clearAllValues() {
        // Clear saddle X, saddle Y, and seat tube length
        const inputsToClear = ['saddleX', 'saddleY', 'seatTubeLength'];
        inputsToClear.forEach(id => {
            const input = document.getElementById(id);
            const slider = document.getElementById(id + 'Slider');
            if (input) {
                input.value = '';
            }
            if (slider) {
                slider.value = slider.min || 0;
            }
        });

        // Set seat tube angle to default 73
        document.getElementById('seatTubeAngle').value = '73';
        document.getElementById('seatTubeAngleSlider').value = '73';

        // Clear saved values from localStorage
        localStorage.removeItem('seatpostCalculatorValues');

        // Reset results display
        this.updateDisplay('--', '--', '--', '--', '--');

        // Clear visualization
        this.drawEmptyState();
    }

    initializeCanvas() {
        this.canvas = document.getElementById('seatpostCanvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            
            // Set canvas size to match display size
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            
            // Enable high-quality rendering
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            this.drawEmptyState();
        }
    }

    drawEmptyState() {
        if (!this.canvas || !this.ctx) {
            return;
        }
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set background
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color') || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw placeholder text
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Enter values to see visualization', canvas.width / 2, canvas.height / 2);
    }

    updateVisualization(saddleX, saddleY, seatTubeAngle, seatTubeLength, bbToRail, bbToSRC, exposedSeatpost, effectiveSTA) {
        if (!this.canvas || !this.ctx) {
            return;
        }
        
        if (!saddleX || !saddleY) {
            this.drawEmptyState();
            return;
        }

        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set background
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color') || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale to fit everything in canvas with padding
        const saddleDistanceScale = Math.sqrt(saddleX * saddleX + saddleY * saddleY);
        
        // Calculate seat tube length to reach saddle Y position
        const seatTubeLengthToSaddleYScale = saddleY / Math.sin((90 - seatTubeAngle + 90) * Math.PI / 180);
        const displaySeatTubeLengthScale = seatTubeLength || seatTubeLengthToSaddleYScale; // Use calculated length as default if not provided

        const seatTubeX = displaySeatTubeLengthScale * Math.cos((90 - seatTubeAngle + 90) * Math.PI / 180);
        const seatTubeY = displaySeatTubeLengthScale * Math.sin((90 - seatTubeAngle + 90) * Math.PI / 180);
        const exposedX = exposedSeatpost && exposedSeatpost > 0 && seatTubeLength ? exposedSeatpost * Math.cos((90 - seatTubeAngle + 90) * Math.PI / 180) : 0;
        const exposedY = exposedSeatpost && exposedSeatpost > 0 && seatTubeLength ? exposedSeatpost * Math.sin((90 - seatTubeAngle + 90) * Math.PI / 180) : 0;
        
        const maxX = Math.max(saddleX, seatTubeX + exposedX);
        const maxY = Math.max(saddleY, seatTubeY + exposedY);
        
        // Maximize size while ensuring all points and labels are visible
        // Add minimum scale to prevent oversized elements for small values
        const scaleX = (canvas.width * 0.85) / Math.max(maxX, 100); // Minimum 100mm for scale calculation
        const scaleY = (canvas.height * 0.85) / Math.max(maxY, 100); // Minimum 100mm for scale calculation
        const scale = Math.min(scaleX, scaleY, 2.5); // Allow larger scale for better readability
        
        // Origin point (bottom bracket) - fixed position 100px from right edge
        const originX = canvas.width * 0.88;
        const originY = canvas.height * 0.95;
        
        // Draw grid lines for every 10mm
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#e0e0e0';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([1, 1]);
        
        // Calculate grid spacing based on scale
        const gridSpacing = 10 * scale; // 10mm in canvas units
        
        // Draw vertical grid lines
        for (let x = 0; x <= canvas.width; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y <= canvas.height; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Reset line style
        ctx.setLineDash([]);
        
        // Draw X and Y axes
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 0.6;
        
        // Draw X-axis (horizontal line through origin) - extended beyond canvas
        ctx.beginPath();
        ctx.moveTo(-1000, originY); // Extend 1000px left of canvas
        ctx.lineTo(canvas.width + 1000, originY); // Extend 1000px right of canvas
        ctx.stroke();
        
        // Draw Y-axis (vertical line through origin) - extended beyond canvas
        ctx.beginPath();
        ctx.moveTo(originX, -1000); // Extend 1000px above canvas
        ctx.lineTo(originX, canvas.height + 1000); // Extend 1000px below canvas
        ctx.stroke();
        
        // Colors
        const colors = {
            seatTube: getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007bff',
            exposedSeatpost: '#cccccc',
            saddle: '#28a745',
            bb: '#6c757d',
            text: getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333'
        };
        
        // Scale line widths and sizes for better visibility
        const lineWidth = Math.max(2, scale * 0.8);
        const bbRadius = 47 * scale / 2; // Make BB diameter represent 47mm
        const saddleRadius = Math.max(4, scale * 0.8);
        
        // Draw seat tube (rotated 90° counterclockwise)
        // Use backend-calculated values for seat tube length
        const displaySeatTubeLength = displaySeatTubeLengthScale;
        const seatTubeEndX = originX + displaySeatTubeLength * Math.cos((180 - seatTubeAngle) * Math.PI / 180) * scale;
        const seatTubeEndY = originY - displaySeatTubeLength * Math.sin((180 - seatTubeAngle) * Math.PI / 180) * scale;
        
        // If no ST length provided, draw as trapezoid with horizontal top edge
        if (!seatTubeLength) {
            // Calculate the angle of the seat tube (simplified)
            const seatTubeAngleRad = (180 - seatTubeAngle) * Math.PI / 180;
            
            // Calculate perpendicular angle for width
            const perpAngleRad = seatTubeAngleRad + Math.PI / 2;
            
            // Calculate the width of the seat tube (31.8mm)
            const seatTubeWidth = 27.2 * scale;
            
            // Calculate the four corners of the seat tube
            // Bottom left (where it meets the BB) - horizontal bottom edge
            const bottomLeftX = originX - (seatTubeWidth / 2);
            const bottomLeftY = originY;
            
            // Bottom right (where it meets the BB) - horizontal bottom edge
            const bottomRightX = originX + (seatTubeWidth / 2);
            const bottomRightY = originY;
            
            // Calculate the saddle Y position in canvas coordinates
            const saddleCanvasY = originY - saddleY * scale;
            
            // Calculate the top corners with horizontal top edge at Saddle Y
            // The top edge should be parallel to the X axis and stop at Saddle Y
            
            // Calculate the distance from bottom to top along the seat tube
            const seatTubeLength = displaySeatTubeLength * scale;
            
            // Calculate the center point of the top edge
            const topCenterX = originX + seatTubeLength * Math.cos(seatTubeAngleRad);
            const topCenterY = saddleCanvasY; // Horizontal line at Saddle Y
            
            // Top left - extend from center with constant width
            const topLeftX = topCenterX - (seatTubeWidth / 2);
            const topLeftY = saddleCanvasY;
            
            // Top right - extend from center with constant width
            const topRightX = topCenterX + (seatTubeWidth / 2);
            const topRightY = saddleCanvasY;
            
            // Draw the trapezoid
            ctx.fillStyle = colors.seatTube;
            ctx.beginPath();
            ctx.moveTo(bottomLeftX, bottomLeftY);
            ctx.lineTo(topLeftX, topLeftY);
            ctx.lineTo(topRightX, topRightY);
            ctx.lineTo(bottomRightX, bottomRightY);
            ctx.closePath();
            ctx.fill();
        } else {
            // If ST length provided, draw as simple line
            ctx.strokeStyle = colors.seatTube;
            ctx.lineWidth = 31.8 * scale; // Make line thickness represent 31.8mm wide
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(seatTubeEndX, seatTubeEndY);
            ctx.stroke();
        }
        
        // Draw exposed seatpost if applicable
        if (exposedSeatpost && exposedSeatpost > 0 && seatTubeLength) {
            const exposedEndX = originX + (seatTubeLength + exposedSeatpost) * Math.cos((90 - seatTubeAngle + 90) * Math.PI / 180) * scale;
            const exposedEndY = originY - (seatTubeLength + exposedSeatpost) * Math.sin((90 - seatTubeAngle + 90) * Math.PI / 180) * scale;
            
            // Calculate the angle of the exposed seatpost
            const exposedAngleRad = Math.atan2(exposedEndY - seatTubeEndY, exposedEndX - seatTubeEndX);
            
            // Calculate perpendicular angle for width
            const perpAngleRad = exposedAngleRad + Math.PI / 2;
            
            // Calculate the width of the seatpost (27.2mm)
            const seatpostWidth = 27.2 * scale;
            
            // Calculate the four corners of the seatpost
            // Bottom left (where it meets the seat tube)
            const bottomLeftX = seatTubeEndX - Math.cos(perpAngleRad) * seatpostWidth / 2;
            const bottomLeftY = seatTubeEndY - Math.sin(perpAngleRad) * seatpostWidth / 2;
            
            // Bottom right (where it meets the seat tube)
            const bottomRightX = seatTubeEndX + Math.cos(perpAngleRad) * seatpostWidth / 2;
            const bottomRightY = seatTubeEndY + Math.sin(perpAngleRad) * seatpostWidth / 2;
            
            // Calculate the top corners by extending parallel lines from bottom corners
            // The seatpost sides should be parallel to the seat tube angle
            const seatTubeAngleRad = (90 - seatTubeAngle + 90) * Math.PI / 180;
            
            // Calculate the distance from bottom to top along the seatpost
            const seatpostLength = exposedSeatpost * scale;
            
            // Calculate the saddle Y position in canvas coordinates
            const saddleCanvasY = originY - saddleY * scale;
            
            // Calculate the top edge width based on STA
            // The top edge width varies based on the seat tube angle
            // Slacker STA = wider top edge, Steeper STA = narrower top edge
            const topEdgeWidth = seatpostWidth / Math.cos((90 - seatTubeAngle) * Math.PI / 180);
            
            // Calculate the center point of the top edge
            const topCenterX = exposedEndX;
            const topCenterY = saddleCanvasY;
            
            // Top left - extend up to Saddle Y with variable width
            const topLeftX = topCenterX - (topEdgeWidth / 2);
            const topLeftY = saddleCanvasY;
            
            // Top right - shorten down to Saddle Y with variable width
            const topRightX = topCenterX + (topEdgeWidth / 2);
            const topRightY = saddleCanvasY;
            
            // Draw the trapezoid
            ctx.fillStyle = colors.exposedSeatpost;
            ctx.beginPath();
            ctx.moveTo(bottomLeftX, bottomLeftY);
            ctx.lineTo(bottomRightX, bottomRightY);
            ctx.lineTo(topRightX, topRightY);
            ctx.lineTo(topLeftX, topLeftY);
            ctx.closePath();
            ctx.fill();
            
            
            // Add rotated label for exposed seatpost
            // Calculate midpoint of the exposed seatpost line
            const exposedMidX = (seatTubeEndX + exposedEndX) / 2;
            const exposedMidY = (seatTubeEndY + exposedEndY) / 2;
            
            // Use the already calculated exposedAngleRad from above
            
            // Determine label position based on eSTA vs STA comparison
            const effectiveSTANum = parseFloat(effectiveSTA);
            const seatTubeAngleNum = parseFloat(seatTubeAngle);
            let offsetDistance = 0 * scale;
            let perpAngle = exposedAngleRad + Math.PI / 2; // Perpendicular angle
            
            // If eSTA < STA, move label to the other side of the line
            if (effectiveSTANum < seatTubeAngleNum) {
                offsetDistance = 0;
            }
            
            const offsetX = Math.cos(perpAngle) * offsetDistance;
            const offsetY = Math.sin(perpAngle) * offsetDistance;
            
            // Save current context
            ctx.save();
            
            // Move to offset position and rotate
            ctx.translate(exposedMidX + offsetX, exposedMidY + offsetY);
            ctx.rotate(exposedAngleRad + Math.PI); // Add 180 degrees to flip the label
            
            // Draw the text
            ctx.fillStyle = colors.text;
            ctx.textAlign = 'center';
            ctx.font = `${Math.max(15, scale * 2)}px Arial`;
            ctx.fillText(`${exposedSeatpost} mm`, 0, +5);
            
            // Restore context
            ctx.restore();
        }
        
        // Draw bottom bracket (on top of everything)
        ctx.fillStyle = '#ffffff'; // White fill
        ctx.strokeStyle = '#000000'; // Black edge
        ctx.lineWidth = Math.max(1, scale * 0.5); // Edge thickness
        ctx.beginPath();
        ctx.arc(originX, originY, bbRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Calculate saddle canvas position
        const saddleCanvasX = originX - saddleX * scale;
        const saddleCanvasY = originY - saddleY * scale;
        
        // Helper function to draw dashed reference lines with labels
        const drawDashedReferenceLines = () => {
            // Draw dashed reference lines with labels (matching Bike Position Simulator style)
            ctx.strokeStyle = '#666'; // Gray color like BPS
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]); // Dashed pattern like BPS
            
            // Draw horizontal dashed line from Y-axis to SRC point
            ctx.beginPath();
            ctx.moveTo(originX, saddleCanvasY);
            ctx.lineTo(saddleCanvasX, saddleCanvasY);
            ctx.stroke();
            
            // Draw vertical dashed line from X-axis to SRC point
            ctx.beginPath();
            ctx.moveTo(saddleCanvasX, originY);
            ctx.lineTo(saddleCanvasX, saddleCanvasY);
            ctx.stroke();
            
            // Draw small reference point at SRC
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(saddleCanvasX, saddleCanvasY, 2, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add axis labels for SRC (matching BPS style)
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333';
            ctx.font = `${Math.max(14, scale * 1.5)}px Arial`;
            ctx.textAlign = 'center';
            
            // Horizontal line label (centered along the dashed line)
            const horizontalMidX = (originX + saddleCanvasX) / 2;
            ctx.fillText(`${Math.abs(saddleX)} mm`, horizontalMidX, saddleCanvasY + 14);
            
            // Vertical line label (centered along the dashed line, rotated 270° clockwise)
            const verticalMidY = (originY + saddleCanvasY) / 2;
            ctx.save();
            ctx.translate(saddleCanvasX - 6, verticalMidY);
            ctx.rotate(-Math.PI/2); // 270° clockwise (or 90° counterclockwise)
            ctx.fillText(`${saddleY} mm`, 0, 0);
            ctx.restore();
            
            // Reset line dash
            ctx.setLineDash([]);
        };
        
        // Draw saddle image with high resolution
        const saddleImage = new Image();
        saddleImage.onload = () => {
            // Scale the image so 250mm represents the saddle length
            const saddleLengthPixels = 250 * scale;
            const imageAspectRatio = saddleImage.width / saddleImage.height;
            const saddleWidth = saddleLengthPixels;
            const saddleHeight = saddleLengthPixels / imageAspectRatio;
            
            // Position the image so the red "+" aligns with saddle X/Y coordinates
            // The red "+" is at the center of the saddle image
            const saddleCanvasX = originX - (saddleX - 8) * scale;
            const saddleCanvasY = originY - (saddleY + 27) * scale;
            
            // Enable high-quality image rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw the saddle image with crisp rendering, centered on the red "+"
            ctx.drawImage(saddleImage, 
                saddleCanvasX - saddleWidth / 2, 
                saddleCanvasY - saddleHeight / 2, 
                saddleWidth, 
                saddleHeight
            );
            
            // Draw dashed reference lines on top of the saddle image
            drawDashedReferenceLines();
        };
        saddleImage.onerror = () => {
            console.log('Saddle image failed to load, using fallback circle');
        };
        saddleImage.src = '../images/saddle.png';
        
        // Draw saddle position (fallback circle if image fails to load)
        // Note: saddleCanvasX and saddleCanvasY already calculated above for dotted lines
        
        ctx.fillStyle = colors.saddle;
        ctx.beginPath();
        ctx.arc(saddleCanvasX, saddleCanvasY, saddleRadius, 0, 0 * Math.PI);
        ctx.fill();
        
        // Draw dashed reference lines on top (fallback if image doesn't load)
        drawDashedReferenceLines();
        
        // Add Setback vs STA label beneath the saddle dot
        if (setbackVsSTA && setbackVsSTA !== '--' && seatTubeAngle) {
            // Get the actual numeric value, handling both string and element cases
            let setbackValue;
            if (typeof setbackVsSTA === 'string') {
                setbackValue = setbackVsSTA.replace(' mm', '').replace('+', '');
            } else if (setbackVsSTA.textContent) {
                setbackValue = setbackVsSTA.textContent.replace(' mm', '').replace('+', '');
            } else {
                setbackValue = setbackVsSTA;
            }
            
            const effectiveSTANum = parseFloat(effectiveSTA);
            const seatTubeAngleNum = parseFloat(seatTubeAngle);
            
            // Determine horizontal offset based on eSTA vs STA comparison
            let horizontalOffset = 0;
            if (effectiveSTANum > seatTubeAngleNum) {
                horizontalOffset = 40 * scale; // Position more to the right
            } else if (effectiveSTANum < seatTubeAngleNum) {
                horizontalOffset = -30 * scale; // Position more to the left
            }
            
            ctx.fillStyle = colors.saddle; // Green color
            ctx.textAlign = 'center';
            ctx.font = `${Math.max(14, scale * 2)}px Arial`;
            
            // Add + sign for positive values
            const displayValue = parseFloat(setbackValue) > 0 ? `+${setbackValue} mm` : `${setbackValue} mm`;
            ctx.fillText(displayValue, saddleCanvasX + horizontalOffset, saddleCanvasY + 25 * scale);
        }
        
        // Draw line from BB to saddle (Effective STA)
        ctx.strokeStyle = colors.saddle;
        ctx.lineWidth = lineWidth * 1.5;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(saddleCanvasX, saddleCanvasY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add label for BB to Saddle XY distance
        if (bbToSRC && bbToSRC !== '--') {
            // Calculate midpoint of the BB to saddle line
            const bbToSaddleMidX = (originX + saddleCanvasX) / 2;
            const bbToSaddleMidY = (originY + saddleCanvasY) / 2;
            
            // Calculate angle of the BB to saddle line
            const bbToSaddleAngle = Math.atan2(saddleCanvasY - originY, saddleCanvasX - originX);
            
            // Calculate perpendicular offset to position label
            const perpAngle = bbToSaddleAngle + Math.PI / 2;
            const offsetDistance = 30 * scale;
            const offsetX = Math.cos(perpAngle) * offsetDistance;
            const offsetY = Math.sin(perpAngle) * offsetDistance;
            
            // Determine vertical offset based on eSTA vs STA comparison
            const effectiveSTANum = parseFloat(effectiveSTA);
            const seatTubeAngleNum = parseFloat(seatTubeAngle);
            const seatTubeWidth = 31.8 * scale; // Scaled seat tube width
            let verticalOffset = seatTubeWidth / 2 + 45 * scale; // Default for eSTA < STA (above seat tube)
            
            if (effectiveSTANum > seatTubeAngleNum) {
                verticalOffset = -(seatTubeWidth / 2 - 28 * scale); // For eSTA > STA (below seat tube)
            }
            
            // Save current context
            ctx.save();
            
            // Move to offset position and rotate
            ctx.translate(bbToSaddleMidX + offsetX, bbToSaddleMidY + offsetY);
            ctx.rotate(bbToSaddleAngle + Math.PI); // Add 180 degrees to flip the label
            
            // Draw the text
            ctx.fillStyle = colors.saddle;
            ctx.textAlign = 'center';
            ctx.font = `${Math.max(15, scale * 2)}px Arial`;
            ctx.fillText(`BB to SRC: ${bbToSRC} mm`, 0, verticalOffset);
            
            // Restore context
            ctx.restore();
        }
        
       
        
        // Draw effective STA arc from horizontal (only above Y axis)
        const arcRadius = 80 * scale; // Much larger radius for visibility
        const startAngle = Math.PI; // Start at 180 degrees (negative X axis)
        const endAngle = Math.PI + (parseFloat(effectiveSTA) * Math.PI / 180); // End at effective STA angle
        
        console.log('Effective STA:', effectiveSTA, 'Start Angle:', startAngle, 'End Angle:', endAngle, 'Arc Radius:', arcRadius);
        
        // Only draw if we have a valid effective STA value
        if (effectiveSTA && effectiveSTA !== '--' && !isNaN(parseFloat(effectiveSTA))) {
            ctx.strokeStyle = colors.saddle; // Green color to match effective STA line
            ctx.lineWidth = lineWidth * 1.5;
            ctx.setLineDash([5, 5]); // Dashed pattern
            ctx.beginPath();
            ctx.arc(originX, originY, arcRadius, startAngle, endAngle);
            ctx.stroke();
            ctx.setLineDash([]);
            
                           // Add label for effective STA arc - positioned just beyond the arc radius, halfway between the angle
               const eSTAMidAngle = Math.PI + (parseFloat(effectiveSTA) * Math.PI / 180) / 2; // Halfway between 180° and the effective STA angle
               const eSTALabelX = originX + (arcRadius + 60 * scale) * Math.cos(eSTAMidAngle);
               const eSTALabelY = originY + (arcRadius + 20 * scale) * Math.sin(eSTAMidAngle);
               
               ctx.fillStyle = colors.saddle;
               ctx.textAlign = 'center';
               ctx.font = `${Math.max(14, scale * 2)}px Arial`;
               ctx.fillText(`eSTA: ${effectiveSTA}°`, eSTALabelX, eSTALabelY);
               ctx.textAlign = 'left'; // Reset to default alignment
        }
        
        // Draw STA arc from horizontal (only above Y axis)
        if (seatTubeAngle) {
            const staArcRadius = 200 * scale;
            const staStartAngle = Math.PI; // Start at 180 degrees (negative X axis)
            const staEndAngle = Math.PI + (parseFloat(seatTubeAngle) * Math.PI / 180); // End at STA angle
            
            ctx.strokeStyle = colors.seatTube; // Blue color to match seat tube line
            ctx.lineWidth = lineWidth * 1.5;
            ctx.setLineDash([5, 5]); // Dashed pattern
            ctx.beginPath();
            ctx.arc(originX, originY, staArcRadius, staStartAngle, staEndAngle);
            ctx.stroke();
            ctx.setLineDash([]);
            
                           // Add label for STA arc - positioned just beyond the arc radius, halfway between the angle
               const staMidAngle = Math.PI + (parseFloat(seatTubeAngle) * Math.PI / 180) / 2; // Halfway between 180° and the STA angle
               const staLabelX = originX + (staArcRadius + 40 * scale) * Math.cos(staMidAngle);
               const staLabelY = originY + (staArcRadius + 30 * scale) * Math.sin(staMidAngle);
               
               ctx.fillStyle = colors.seatTube;
               ctx.textAlign = 'center';
               ctx.font = `${Math.max(14, scale * 2)}px Arial`;
               ctx.fillText(`STA: ${seatTubeAngle}°`, staLabelX, staLabelY);
               ctx.textAlign = 'left'; // Reset to default alignment
        }
        
        // Draw labels
        ctx.fillStyle = colors.text;
        const fontSize = Math.max(15, scale * 2.5);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'left';
        
        if (bbToRail && bbToRail !== '--' && seatTubeAngle) {
            // Calculate midpoint along the combined seat tube + exposed section
            let midX, midY;
            let angleForRotation;
            
            if (exposedSeatpost && exposedSeatpost > 0 && seatTubeLength) {
                // When exposed seatpost is present, center along the full length (seat tube + exposed)
                const exposedEndX = originX + (seatTubeLength + exposedSeatpost) * Math.cos((90 - seatTubeAngle + 90) * Math.PI / 180) * scale;
                const exposedEndY = originY - (seatTubeLength + exposedSeatpost) * Math.sin((90 - seatTubeAngle + 90) * Math.PI / 180) * scale;
                midX = (originX + exposedEndX) / 2;
                midY = (originY + exposedEndY) / 2;
                angleForRotation = Math.atan2(exposedEndY - originY, exposedEndX - originX);
            } else {
                // When no exposed seatpost, center along just the seat tube
                midX = (originX + seatTubeEndX) / 2;
                midY = (originY + seatTubeEndY) / 2;
                angleForRotation = Math.atan2(seatTubeEndY - originY, seatTubeEndX - originX);
            }
            
            // Calculate offset to flip to other side of line
            const offsetDistance = 20 * scale;
            const perpAngle = angleForRotation + Math.PI / 2; // Perpendicular angle
            const offsetX = Math.cos(perpAngle) * offsetDistance;
            const offsetY = Math.sin(perpAngle) * offsetDistance;
            
            // Determine vertical offset based on eSTA vs STA comparison (opposite of BB to Saddle XY)
            const effectiveSTANum = parseFloat(effectiveSTA);
            const seatTubeAngleNum = parseFloat(seatTubeAngle);
            const seatTubeWidth = 31.8 * scale; // Scaled seat tube width
            let verticalOffset = (seatTubeWidth / 2 - 20 * scale); // Default for eSTA < STA (below seat tube)
            
            if (effectiveSTANum > seatTubeAngleNum) {
                verticalOffset = (seatTubeWidth / 2 + 35 * scale); // For eSTA > STA (above seat tube)
            }
            
            // Save current context
            ctx.save();
            
            // Move to offset position and rotate
            ctx.translate(midX + offsetX, midY + offsetY);
            ctx.rotate(angleForRotation + Math.PI); // Add 180 degrees
            
            // Draw the text
            ctx.fillStyle = colors.text;
            ctx.textAlign = 'center';
            ctx.fillText(`BB to Rail: ~${bbToRail} mm`, 0, verticalOffset);
            
            // Restore context
            ctx.restore();
        }
        

    }

    initializeTheme() {
        // Check if user has previously set a theme preference
        const storedTheme = localStorage.getItem('theme');
        
        // If no stored preference, check system preference
        if (!storedTheme) {
            // Check if user prefers dark mode
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            // Set theme based on system preference
            document.documentElement.setAttribute('data-theme', prefersDarkMode ? 'dark' : 'light');
            
            // Update toggle buttons to match
            this.updateThemeToggleButtons(prefersDarkMode ? 'dark' : 'light');
        } else {
            // Apply stored user preference
            document.documentElement.setAttribute('data-theme', storedTheme);
            this.updateThemeToggleButtons(storedTheme);
        }
        
        // Add listener for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            // Only apply system changes if user hasn't manually set a preference
            if (!localStorage.getItem('theme')) {
                const newTheme = event.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                this.updateThemeToggleButtons(newTheme);
            }
        });
    }

    updateThemeToggleButtons(theme) {
        const darkModeToggle = document.getElementById('darkModeToggle');
        const mobileDarkModeToggle = document.getElementById('mobileDarkModeToggle');
        
        if (darkModeToggle) {
            const toggleIcon = darkModeToggle.querySelector('.toggle-icon');
            const toggleText = darkModeToggle.querySelector('.toggle-text');
            
            if (toggleIcon) toggleIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
            if (toggleText) toggleText.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
        }
        
        if (mobileDarkModeToggle) {
            const mobileToggleIcon = mobileDarkModeToggle.querySelector('.toggle-icon');
            const mobileToggleText = mobileDarkModeToggle.querySelector('.toggle-text');
            
            if (mobileToggleIcon) mobileToggleIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
            if (mobileToggleText) mobileToggleText.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
        }
    }

    redrawOnThemeChange() {
        // Wait a brief moment for the theme to be applied
        setTimeout(() => {
            // Redraw current state by recalculating via backend
            this.calculateResults();
        }, 50); // Small delay to ensure theme is applied
    }
}

// Initialize the calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const seatpostCalculator = new SeatpostCalculator();
    // Expose calculator globally for dark mode toggle
    window.seatpostCalculator = seatpostCalculator;
});

 
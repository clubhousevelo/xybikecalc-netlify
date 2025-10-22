// Define default values for stems
const DEFAULT_VALUES = {
    headTubeAngle: 73.0,
    stemHeight: 40,
    stemLength: 100,
    stemAngle: -6,
    spacerHeight: 20
}

const DEFAULT_VALUES_ADDTL = {
    headTubeAngle: 73.0,
    stemHeight: 40,
    stemLength: 100,
    stemAngle: 6,
    spacerHeight: 20
}
;

let stemCount = 1; // Start with one stem
let baseX = 0;
let baseY = 0;


// Real-world component dimensions (in mm)
const STEERER_TUBE_DIAMETER = 28.6; // 1-1/8" steerer tube
const SPACER_DIAMETER = 30; // Standard spacer diameter
const STEM_CLAMP_DIAMETER = 31.8; // Standard stem clamp diameter
const HANDLEBAR_DIAMETER = 31.8; // Standard handlebar diameter (matches stem clamp)

async function calculateStemDimensions(stemId) {
    const id = stemId || 0;
    
    // Get input values
    const headTubeAngle = parseFloat(document.getElementById(`headTubeAngle-${id}`).value);
    const stemHeight = parseFloat(document.getElementById(`stemHeight-${id}`).value);
    const stemLength = parseFloat(document.getElementById(`stemLength-${id}`).value);
    const stemAngle = parseFloat(document.getElementById(`stemAngle-${id}`).value);
    const spacerHeight = parseFloat(document.getElementById(`spacerHeight-${id}`).value);

    let totalX = 0;
    let totalY = 0;
    
    try {
        // Use server-side calculation only
        const result = await APIClient.callCalculator('stem', {
            headTubeAngle,
            stemHeight,
            stemLength,
            stemAngle,
            spacerHeight
        });

        totalX = result.effectiveReach;
        totalY = result.effectiveStack;
    } catch (error) {
        console.error('Server error:', error);
        return { x: 0, y: 0 };
    }
    
    // Use rounded values for calculating differences
    const roundedTotalX = Math.round(totalX);
    const roundedTotalY = Math.round(totalY);
    const roundedBaseX = Math.round(baseX);
    const roundedBaseY = Math.round(baseY);
    
    // Calculate differences using rounded values
    const diffXInitial = roundedTotalX - roundedBaseX;
    const diffYInitial = roundedTotalY - roundedBaseY;
    
    // Create descriptive text for X (Run)
    let diffXText = '';
    if (diffXInitial > 0 && diffXInitial !== 0) {
        diffXText = `+${diffXInitial}mm longer →`;
    } else if (diffXInitial < 0 && diffXInitial !== 0) {
        diffXText = `${diffXInitial}mm shorter ←`;
    }
    
    // Create descriptive text for Y (Rise)
    let diffYText = '';
    if (diffYInitial > 0 && diffYInitial !== 0) {
        diffYText = `+${diffYInitial}mm higher ↑`;
    } else if (diffYInitial < 0 && diffYInitial !== 0) {
        diffYText = `${diffYInitial}mm lower ↓`;
    }
    
    // Update results
    document.getElementById(`effectiveReach-${id}`).innerHTML = 
        `Run (X): ${totalX.toFixed(0)}mm${id === 0 || !diffXText ? '' : 
        `<br><span class="diff-text ${diffXInitial > 0 ? 'negative' : 'positive'}">${diffXText}</span>`}`;
    document.getElementById(`effectiveStack-${id}`).innerHTML = 
        `Rise (Y): ${totalY.toFixed(0)}mm${id === 0 || !diffYText ? '' : 
        `<br><span class="diff-text ${diffYInitial > 0 ? 'positive' : 'negative'}">${diffYText}</span>`}`;
    
    // If this is the first stem, store its values as the base for comparison
    if (id === 0) {
        baseX = totalX;
        baseY = totalY;
        
        // Recalculate all other stems to update their differences
        for (let i = 1; i < stemCount; i++) {
            if (document.getElementById(`headTubeAngle-${i}`)) {
                calculateStemDimensions(i);
                highlightDifferences(i); // Highlight differences after recalculation
            }
        }
    } 
    // For other stems, show the difference from the first stem
    else {
        // Use rounded values for calculating differences
        const roundedTotalX = Math.round(totalX);
        const roundedTotalY = Math.round(totalY);
        const roundedBaseX = Math.round(baseX);
        const roundedBaseY = Math.round(baseY);
        
        // Calculate differences using rounded values
        const diffX = roundedTotalX - roundedBaseX;
        const diffY = roundedTotalY - roundedBaseY;
        
        // Create descriptive text for X (Run)
        let diffXText = '';
        if (diffX > 0 && diffX !== 0) {
            diffXText = `+${diffX}mm longer →`;
        } else if (diffX < 0 && diffX !== 0) {
            diffXText = `${diffX}mm shorter ←`;
        }
        
        // Create descriptive text for Y (Rise)
        let diffYText = '';
        if (diffY > 0 && diffY !== 0) {
            diffYText = `+${diffY}mm higher ↑`;
        } else if (diffY < 0 && diffY !== 0) {
            diffYText = `${diffY}mm lower ↓`;
        }
        
        document.getElementById(`effectiveReach-${id}`).innerHTML = 
            `Run (X): ${totalX.toFixed(0)}mm${!diffXText ? '' : 
            `<br><span class="diff-text ${diffX > 0 ? 'negative' : 'positive'}">${diffXText}</span>`}`;
        document.getElementById(`effectiveStack-${id}`).innerHTML = 
            `Rise (Y): ${totalY.toFixed(0)}mm${!diffYText ? '' : 
            `<br><span class="diff-text ${diffY > 0 ? 'positive' : 'negative'}">${diffYText}</span>`}`;
        
        // Highlight differences after calculation
        highlightDifferences(id);
    }
    
    // Update the overlay canvas with all stems
    drawStemOverlay();
    
    // Update the realistic visualization
    drawRealisticStemVisualization();
    
    return { x: totalX, y: totalY };
}

// New function to highlight differences between stems
function highlightDifferences(stemId) {
    if (stemId === 0) return; // Don't highlight the first stem
    
    // Get values from the first stem (reference)
    const refHeadTubeAngle = parseFloat(document.getElementById('headTubeAngle-0').value);
    const refStemHeight = parseFloat(document.getElementById('stemHeight-0').value);
    const refStemLength = parseFloat(document.getElementById('stemLength-0').value);
    const refStemAngle = parseFloat(document.getElementById('stemAngle-0').value);
    const refSpacerHeight = parseFloat(document.getElementById('spacerHeight-0').value);
    
    // Get values from the current stem
    const headTubeAngle = parseFloat(document.getElementById(`headTubeAngle-${stemId}`).value);
    const stemHeight = parseFloat(document.getElementById(`stemHeight-${stemId}`).value);
    const stemLength = parseFloat(document.getElementById(`stemLength-${stemId}`).value);
    const stemAngle = parseFloat(document.getElementById(`stemAngle-${stemId}`).value);
    const spacerHeight = parseFloat(document.getElementById(`spacerHeight-${stemId}`).value);
    
    // Get the input fields for the current stem
    const headTubeAngleField = document.getElementById(`headTubeAngle-${stemId}`).parentElement;
    const stemHeightField = document.getElementById(`stemHeight-${stemId}`).parentElement;
    const stemLengthField = document.getElementById(`stemLength-${stemId}`).parentElement;
    const stemAngleField = document.getElementById(`stemAngle-${stemId}`).parentElement;
    const spacerHeightField = document.getElementById(`spacerHeight-${stemId}`).parentElement;
    
    // Remove existing highlight classes
    headTubeAngleField.classList.remove('highlight-different');
    stemHeightField.classList.remove('highlight-different');
    stemLengthField.classList.remove('highlight-different');
    stemAngleField.classList.remove('highlight-different');
    spacerHeightField.classList.remove('highlight-different');
    
    // Compare values and highlight differences
    if (headTubeAngle !== refHeadTubeAngle) {
        headTubeAngleField.classList.add('highlight-different');
    }
    
    if (stemHeight !== refStemHeight) {
        stemHeightField.classList.add('highlight-different');
    }
    
    if (stemLength !== refStemLength) {
        stemLengthField.classList.add('highlight-different');
    }
    
    if (stemAngle !== refStemAngle) {
        stemAngleField.classList.add('highlight-different');
    }
    
    if (spacerHeight !== refSpacerHeight) {
        spacerHeightField.classList.add('highlight-different');
    }
}

function saveStemData() {
    const stems = [];
    const stemBoxes = document.querySelectorAll('.stem-box');
    
    stemBoxes.forEach((box, index) => {
        const stemId = parseInt(box.dataset.stemId.split('-')[1]);
        const data = {
            headTubeAngle: parseFloat(document.getElementById(`headTubeAngle-${stemId}`).value),
            stemHeight: parseFloat(document.getElementById(`stemHeight-${stemId}`).value),
            stemLength: parseFloat(document.getElementById(`stemLength-${stemId}`).value),
            stemAngle: parseFloat(document.getElementById(`stemAngle-${stemId}`).value),
            spacerHeight: parseFloat(document.getElementById(`spacerHeight-${stemId}`).value)
        };
        stems.push(data);
    });
    
    localStorage.setItem('stemCalculatorData', JSON.stringify(stems));
}

function loadStemData() {
    const savedData = localStorage.getItem('stemCalculatorData');
    if (!savedData) return;
    
    const stems = JSON.parse(savedData);
    
    // Remove all existing stems except the first one
    const stemBoxes = document.querySelectorAll('.stem-box');
    stemBoxes.forEach((box, index) => {
        if (index > 0) box.remove();
    });
    
    // Update first stem
    if (stems.length > 0) {
        const firstStem = stems[0];
        document.getElementById('headTubeAngle-0').value = firstStem.headTubeAngle;
        document.getElementById('stemHeight-0').value = firstStem.stemHeight;
        document.getElementById('stemLength-0').value = firstStem.stemLength;
        document.getElementById('stemAngle-0').value = firstStem.stemAngle;
        document.getElementById('spacerHeight-0').value = firstStem.spacerHeight;
    }
    
    // Add additional stems
    for (let i = 1; i < stems.length; i++) {
        addNewStem(stems[i]);
    }
    
    // If there's no Stem 2, add it with default values
    if (stems.length === 1) {
        addNewStem();
    }
    
    // Recalculate all stems
    calculateStemDimensions(0);
    
    // Apply highlighting to all stems
    const updatedStemBoxes = document.querySelectorAll('.stem-box');
    updatedStemBoxes.forEach((box, index) => {
        if (index > 0) {
            const stemId = parseInt(box.dataset.stemId.split('-')[1]);
            highlightDifferences(stemId);
        }
    });
}

function addNewStem(initialData = null) {
    const stemId = stemCount;
    stemCount++;
    
    const stemContainer = document.getElementById('stemContainer');
    
    // Create a new stem box
    const stemBox = document.createElement('div');
    stemBox.className = 'stem-box';
    stemBox.dataset.stemId = `stem-${stemId}`;
    
    // Create title container with title and close button
    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';
    
    // Add stem title
    const stemTitle = document.createElement('h3');
    stemTitle.className = 'stem-title';
    // Get the current number of stems and add 1 for the new stem number
    const currentStemCount = document.querySelectorAll('.stem-box').length + 1;
    stemTitle.textContent = `Stem ${currentStemCount}`;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'title-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = function() { deleteStem(stemId); };
    
    // Hide the delete button on Stem 2 (stemId = 1)
    if (stemId === 1) {
        closeBtn.style.visibility = 'hidden';
    }
    
    // Add title and close button to container
    titleContainer.appendChild(stemTitle);
    titleContainer.appendChild(closeBtn);
    
    // Add title container to stem box
    stemBox.appendChild(titleContainer);
    
    // Clone the input section from the first stem
    const inputSection = document.querySelector('.input-section').cloneNode(true);
    
    // Update IDs and values
    const inputs = inputSection.querySelectorAll('input');
    inputs.forEach(input => {
        const fieldName = input.id.split('-')[0];
        input.id = `${fieldName}-${stemId}`;
        input.dataset.stemId = stemId;
        input.classList.add('stem-input');
    });
    
    // Update input values if initial data is provided
    if (initialData) {
        inputs.forEach(input => {
            const fieldName = input.id.split('-')[0];
            input.value = initialData[fieldName];
        });
    }
    
    stemBox.appendChild(inputSection);
    
    // Create results section
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'results-container';
    
    const resultsGroup = document.createElement('div');
    resultsGroup.className = 'results-group';
    
    const reachDiv = document.createElement('div');
    reachDiv.id = `effectiveReach-${stemId}`;
    reachDiv.innerHTML = 'Run (X): 0mm';
    
    const spacerDiv = document.createElement('div');
    spacerDiv.className = 'results-spacer';
    
    const stackDiv = document.createElement('div');
    stackDiv.id = `effectiveStack-${stemId}`;
    stackDiv.className = 'stack-result';
    stackDiv.innerHTML = 'Rise (Y): 0mm';
    
    resultsGroup.appendChild(reachDiv);
    resultsGroup.appendChild(spacerDiv);
    resultsGroup.appendChild(stackDiv);
    resultsDiv.appendChild(resultsGroup);
    
    stemBox.appendChild(resultsDiv);
    
    // Add the new stem to the container
    stemContainer.appendChild(stemBox);
    
    // Add event listeners to the new inputs
    const newInputs = stemBox.querySelectorAll('input');
    newInputs.forEach(input => {
        input.addEventListener('input', function() {
            calculateStemDimensions(stemId);
            highlightDifferences(stemId); // Highlight differences when input changes
            saveStemData(); // Save data when input changes
        });
    });
    
    // Calculate initial values
    calculateStemDimensions(stemId);
    
    // Highlight differences initially
    highlightDifferences(stemId);
    
    // Update overlay visualization
    drawStemOverlay();
    
    // Update realistic visualization
    drawRealisticStemVisualization();
    
    // Auto-save
    autoSaveStemData();
}

function deleteStem(stemId) {
    const stemBoxes = document.querySelectorAll('.stem-box');
    
    // If this is Stem 2 (stemId = 1) and there are only 2 stems total, don't delete it
    if (stemId === 1 && stemBoxes.length === 2) {
        // Instead of deleting, just reset it to default values
        document.getElementById('headTubeAngle-1').value = DEFAULT_VALUES_ADDTL.headTubeAngle;
        document.getElementById('stemHeight-1').value = DEFAULT_VALUES_ADDTL.stemHeight;
        document.getElementById('stemLength-1').value = DEFAULT_VALUES_ADDTL.stemLength;
        document.getElementById('stemAngle-1').value = DEFAULT_VALUES_ADDTL.stemAngle;
        document.getElementById('spacerHeight-1').value = DEFAULT_VALUES_ADDTL.spacerHeight;
        
        // Recalculate and highlight
        calculateStemDimensions(1);
        highlightDifferences(1);
        
        // Save data
        saveStemData();
        return;
    }
    
    const stemBox = document.querySelector(`[data-stem-id="stem-${stemId}"]`);
    if (stemBox) {
        stemBox.remove();
        updateStemNumbers();
        
        // Recalculate and rehighlight all remaining stems
        calculateStemDimensions(0);
        
        // Apply highlighting to all remaining stems
        const remainingStemBoxes = document.querySelectorAll('.stem-box');
        remainingStemBoxes.forEach((box, index) => {
            if (index > 0) {
                const stemId = parseInt(box.dataset.stemId.split('-')[1]);
                highlightDifferences(stemId);
            }
        });
        
        // Update overlay visualization
        drawStemOverlay();
        
        // Update realistic visualization
        drawRealisticStemVisualization();
        
        saveStemData(); // Save data after deleting stem
    }
}

function updateStemNumbers() {
    const stemBoxes = document.querySelectorAll('.stem-box');
    stemBoxes.forEach((box, index) => {
        const stemTitle = box.querySelector('.stem-title');
        if (stemTitle) {
            stemTitle.textContent = `Stem ${index + 1}`;
        }
    });
}

// Add new functions for auto-save/load
function autoSaveStemData() {
    const stems = [];
    const stemBoxes = document.querySelectorAll('.stem-box');
    
    stemBoxes.forEach((box, index) => {
        const stemId = parseInt(box.dataset.stemId.split('-')[1]);
        const data = {
            headTubeAngle: parseFloat(document.getElementById(`headTubeAngle-${stemId}`).value),
            stemHeight: parseFloat(document.getElementById(`stemHeight-${stemId}`).value),
            stemLength: parseFloat(document.getElementById(`stemLength-${stemId}`).value),
            stemAngle: parseFloat(document.getElementById(`stemAngle-${stemId}`).value),
            spacerHeight: parseFloat(document.getElementById(`spacerHeight-${stemId}`).value)
        };
        stems.push(data);
    });
    
    localStorage.setItem('autoSavedStemData', JSON.stringify(stems));
}

function autoLoadStemData() {
    const savedData = localStorage.getItem('autoSavedStemData');
    if (!savedData) return;
    
    const stems = JSON.parse(savedData);
    
    // Remove all existing stems except the first one
    const stemBoxes = document.querySelectorAll('.stem-box');
    stemBoxes.forEach((box, index) => {
        if (index > 0) box.remove();
    });
    
    // Update first stem
    if (stems.length > 0) {
        const firstStem = stems[0];
        document.getElementById('headTubeAngle-0').value = firstStem.headTubeAngle;
        document.getElementById('stemHeight-0').value = firstStem.stemHeight;
        document.getElementById('stemLength-0').value = firstStem.stemLength;
        document.getElementById('stemAngle-0').value = firstStem.stemAngle;
        document.getElementById('spacerHeight-0').value = firstStem.spacerHeight;
    }
    
    // Add additional stems
    for (let i = 1; i < stems.length; i++) {
        addNewStem(stems[i]);
    }
    
    // If there's no Stem 2, add it with default values
    if (stems.length === 1) {
        addNewStem();
    }
    
    // Recalculate all stems
    calculateStemDimensions(0);
    
    // Apply highlighting to all stems
    const updatedStemBoxes = document.querySelectorAll('.stem-box');
    updatedStemBoxes.forEach((box, index) => {
        if (index > 0) {
            const stemId = parseInt(box.dataset.stemId.split('-')[1]);
            highlightDifferences(stemId);
        }
    });
}

function resetAllStems() {
    // Remove all stems except the first two
    const stemBoxes = document.querySelectorAll('.stem-box');
    stemBoxes.forEach((box, index) => {
        if (index > 1) box.remove();
    });
    
    // Reset Stem 1 to default values
    document.getElementById('headTubeAngle-0').value = DEFAULT_VALUES.headTubeAngle;
    document.getElementById('stemHeight-0').value = DEFAULT_VALUES.stemHeight;
    document.getElementById('stemLength-0').value = DEFAULT_VALUES.stemLength;
    document.getElementById('stemAngle-0').value = DEFAULT_VALUES.stemAngle;
    document.getElementById('spacerHeight-0').value = DEFAULT_VALUES.spacerHeight;
    
    // Reset Stem 2 to default values if it exists
    if (document.getElementById('headTubeAngle-1')) {
        document.getElementById('headTubeAngle-1').value = DEFAULT_VALUES_ADDTL.headTubeAngle;
        document.getElementById('stemHeight-1').value = DEFAULT_VALUES_ADDTL.stemHeight;
        document.getElementById('stemLength-1').value = DEFAULT_VALUES_ADDTL.stemLength;
        document.getElementById('stemAngle-1').value = DEFAULT_VALUES_ADDTL.stemAngle;
        document.getElementById('spacerHeight-1').value = DEFAULT_VALUES_ADDTL.spacerHeight;
    }
    
    // Recalculate all stems
    calculateStemDimensions(0);
    
    // Apply highlighting to Stem 2
    if (document.getElementById('headTubeAngle-1')) {
        highlightDifferences(1);
    }
    
    // Update stem count
    stemCount = 2;
    
    // Update overlay visualization
    drawStemOverlay();
    
    // Update realistic visualization
    drawRealisticStemVisualization();
    
    // Save data
    autoSaveStemData();
}

// Function to draw stems on overlay (empty implementation as we're only using the realistic visualization)
function drawStemOverlay() {
    // This function is intentionally empty as we're using drawRealisticStemVisualization instead
    // Kept for compatibility with existing code that calls this function
}

// Function to draw realistic stem visualization
function drawRealisticStemVisualization() {
    const canvas = document.getElementById('stemVisualizationCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // New center point with steerer tube more vertical - moved left
    const originX = width / 2 - 70; // Shifted 60px to the left
    const originY = height / 2 + 120;
    
    // Scale: pixels per mm (adjust as needed)
    const scale = 1.5;
    
    // Check if dark mode is active
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Draw reference lines (faint grid)
    ctx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";
    ctx.lineWidth = 1;
    
    // Draw grid for better measurement reference
    const gridSize = 10 * scale; // 10mm grid (scaled)
    const gridCount = 30; // Increase grid count to maintain coverage with smaller grid size
    
    // Draw horizontal grid lines
    for (let i = -gridCount; i <= gridCount; i++) {
        ctx.beginPath();
        ctx.moveTo(originX - gridSize * gridCount, originY + i * gridSize);
        ctx.lineTo(originX + gridSize * gridCount, originY + i * gridSize);
        ctx.stroke();
    }
    
    // Draw vertical grid lines
    for (let i = -gridCount; i <= gridCount; i++) {
        ctx.beginPath();
        ctx.moveTo(originX + i * gridSize, originY - gridSize * gridCount);
        ctx.lineTo(originX + i * gridSize, originY + gridSize * gridCount);
        ctx.stroke();
    }
    
    // Draw main reference lines (slightly darker)
    ctx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1.5;
    
    // Set dashed line style for main reference lines
    ctx.setLineDash([5, 5]);
    
    // Horizontal reference line
    ctx.beginPath();
    ctx.moveTo(originX - 250, originY);
    ctx.lineTo(originX + 350, originY);
    ctx.stroke();
    
    // Vertical reference line
    ctx.beginPath();
    ctx.moveTo(originX, originY - 300);
    ctx.lineTo(originX, originY + 300);
    ctx.stroke();
    
    // Reset to solid line
    ctx.setLineDash([]);
    
    // Add grid size label
    ctx.fillStyle = isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText("Grid: 10mm", 10, 20);
    
    // Define a palette of distinct colors for different stems
    const stemColors = [
        "#0066CC", // Blue
        "#AA0000", // Red
        "#009933", // Green
        "#9900CC", // Purple
        "#FF6600", // Orange
        "#007799", // Teal
        "#CC6699", // Pink
        "#666633", // Olive
        "#663399", // Indigo
        "#FF9900"  // Amber
    ];
    
    // Get all stems
    const stemBoxes = document.querySelectorAll('.stem-box');
    if (stemBoxes.length === 0) return;
    
    // Extract stem data
    const stemData = [];
    
    stemBoxes.forEach((box) => {
        const stemId = parseInt(box.dataset.stemId.split('-')[1]);
        
        // Get input values
        const headTubeAngle = parseFloat(document.getElementById(`headTubeAngle-${stemId}`).value);
        const stemHeight = parseFloat(document.getElementById(`stemHeight-${stemId}`).value);
        const stemLength = parseFloat(document.getElementById(`stemLength-${stemId}`).value);
        const stemAngle = parseFloat(document.getElementById(`stemAngle-${stemId}`).value);
        const spacerHeight = parseFloat(document.getElementById(`spacerHeight-${stemId}`).value);
        
        stemData.push({
            id: stemId,
            headTubeAngle,
            stemHeight,
            stemLength,
            stemAngle,
            spacerHeight
        });
    });
    
    // Reference stem (always the first one)
    const referenceStem = stemData[0];
    
    // Draw each stem configuration
    stemData.forEach((stem, index) => {
        // Adjusted angles for 90° CCW rotation
        // For steerer tube, rotate 90° CCW from how it was before
        const headTubeAngleRad = (180 - stem.headTubeAngle) * Math.PI / 180;
        
        // For stem, adjust angle by 90° CW to make 0° stem perpendicular to steerer tube
        const stemAngleRad = (180 - stem.headTubeAngle + stem.stemAngle - 90) * Math.PI / 180;
        
        // Choose a unique color for this stem
        const stemColor = stemColors[index % stemColors.length];
        const lighterColor = getLighterColor(stemColor);
        
        // Use dark gray for steerer tube in light mode, white in dark mode
        const structureColor = isDarkMode ? "#FFFFFF" : "#555555";
        
        // Draw steerer tube (more vertical now)
        const steererLength = 0;
        const steererEndX = originX + Math.cos(headTubeAngleRad) * steererLength;
        const steererEndY = originY - Math.sin(headTubeAngleRad) * steererLength;
        
        ctx.strokeStyle = structureColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(steererEndX, steererEndY);
        ctx.stroke();
        
        // Calculate spacer end position
        let spacerEndX = steererEndX;
        let spacerEndY = steererEndY;
        
        if (stem.spacerHeight > 0) {
            spacerEndX = steererEndX + Math.cos(headTubeAngleRad) * stem.spacerHeight * scale;
            spacerEndY = steererEndY - Math.sin(headTubeAngleRad) * stem.spacerHeight * scale;
            
            // Use same color and thickness for spacers
            ctx.strokeStyle = structureColor;
            ctx.lineWidth = 3; // Match steerer tube thickness
            ctx.beginPath();
            ctx.moveTo(steererEndX, steererEndY);
            ctx.lineTo(spacerEndX, spacerEndY);
            ctx.stroke();
        }
        
        // Calculate stem center position (stem clamps at spacer end + stemHeight/2 along steerer tube)
        const stemCenterX = spacerEndX + Math.cos(headTubeAngleRad) * (stem.stemHeight / 2) * scale;
        const stemCenterY = spacerEndY - Math.sin(headTubeAngleRad) * (stem.stemHeight / 2) * scale;
        
        // Draw stem height with same color and thickness
        if (stem.stemHeight > 0) {
            ctx.strokeStyle = structureColor;
            ctx.lineWidth = 3; // Match steerer tube thickness
            ctx.beginPath();
            ctx.moveTo(spacerEndX, spacerEndY);
            ctx.lineTo(stemCenterX, stemCenterY);
            ctx.stroke();
        }
        
        // Calculate stem end position (from stem center along stem angle)
        const stemEndX = stemCenterX + Math.cos(stemAngleRad) * stem.stemLength * scale;
        const stemEndY = stemCenterY - Math.sin(stemAngleRad) * stem.stemLength * scale;
        
        // Define circle radius
        const circleRadius = 15.9;
        
        // Calculate where the stem line should stop (at the circle's border)
        const dx = stemEndX - stemCenterX;
        const dy = stemEndY - stemCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const ratio = (distance - circleRadius) / distance;
        
        // Stop the stem line at the circle's border
        const stemLineEndX = stemCenterX + dx * ratio;
        const stemLineEndY = stemCenterY + dy * ratio;
        
        // Draw stem
        ctx.strokeStyle = stemColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(stemCenterX, stemCenterY);
        ctx.lineTo(stemLineEndX, stemLineEndY);
        ctx.stroke();
        
        // Draw handlebar position (outlined circle with transparent center)
        ctx.strokeStyle = stemColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(stemEndX, stemEndY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add a dot in the center of the circle
        ctx.fillStyle = stemColor;
        ctx.beginPath();
        ctx.arc(stemEndX, stemEndY, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Update the legend with stem data and colors
    updateStemLegend(stemData, stemColors);
}

// Function to update the stem legend
function updateStemLegend(stemData, stemColors) {
    const legendContainer = document.querySelector('.stem-legend');
    if (!legendContainer) return;
    
    // Clear existing legend items
    legendContainer.innerHTML = '';
    
    // Create legend items for each stem
    stemData.forEach((stem, index) => {
        const stemColor = stemColors[index % stemColors.length];
        
        // Create legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        // Create color box
        const colorBox = document.createElement('span');
        colorBox.className = 'color-box';
        colorBox.style.backgroundColor = stemColor;
        
        // Create stem label
        const stemLabel = document.createElement('span');
        stemLabel.textContent = `Stem ${stem.id + 1}`;
        
        // Append elements
        legendItem.appendChild(colorBox);
        legendItem.appendChild(stemLabel);
        legendContainer.appendChild(legendItem);
    });
}

// Helper function to get a lighter version of a color
function getLighterColor(hexColor) {
    // Convert hex to RGB
    let r = parseInt(hexColor.substring(1, 3), 16);
    let g = parseInt(hexColor.substring(3, 5), 16);
    let b = parseInt(hexColor.substring(5, 7), 16);
    
    // Make each component lighter
    r = Math.min(255, Math.round(r * 1.3));
    g = Math.min(255, Math.round(g * 1.3));
    b = Math.min(255, Math.round(b * 1.3));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Add this function to the initialization
document.addEventListener('DOMContentLoaded', function() {
    // Add CSS for highlighting different values
    const style = document.createElement('style');
    style.textContent = `
        .highlight-different {
            background-color: var(--highlight-bg) !important;
            border-left: 3px solid var(--highlight-border) !important;
            padding-left: 3px !important;
        }
        .input-field {
            transition: background-color 0.3s ease, border-left 0.3s ease;
            border-left: 3px solid transparent;
            padding-left: 0px;
        }
        .reset-all-btn:hover {
            background-color: var(--error-color) !important;
            color: white !important;
        }
    `;
    document.head.appendChild(style);
    
    // Add event listeners to all inputs in the first stem
    const inputs = document.querySelectorAll('.stem-input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            calculateStemDimensions(parseInt(this.dataset.stemId));
            autoSaveStemData(); // Auto-save when input changes
        });
    });
    
    // Add event listener to the Add Stem button
    document.getElementById('addStemBtn').addEventListener('click', () => {
        addNewStem();
        autoSaveStemData(); // Auto-save after adding new stem
    });
    
    // Add event listener to the Reset All button
    document.getElementById('resetAllBtn').addEventListener('click', resetAllStems);
    
    // Add event listener for page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            autoSaveStemData(); // Auto-save when leaving the page
        }
    });
    
    // Listen for theme changes using MutationObserver
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                // Redraw visualization when theme changes
                drawRealisticStemVisualization();
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });
    
    // Try to load auto-saved data first, then fall back to manual saved data
    const autoSavedData = localStorage.getItem('autoSavedStemData');
    if (autoSavedData) {
        autoLoadStemData();
    } else {
        loadStemData();
    }
    
    // If no saved data at all, do initial calculation and add Stem 2
    if (!localStorage.getItem('autoSavedStemData') && !localStorage.getItem('stemCalculatorData')) {
        calculateStemDimensions(0);
        
        // Add Stem 2 by default
        addNewStem();
    } else {
        // Check if we need to add Stem 2 (if there's only Stem 1)
        const stemBoxes = document.querySelectorAll('.stem-box');
        if (stemBoxes.length === 1) {
            addNewStem();
        }
    }
    
    // Draw the stem visualization
    setTimeout(() => {
        // Force recalculation and draw visualization
        console.log("Explicitly running visualization on page load");
        calculateStemDimensions(0);
        drawRealisticStemVisualization();
    }, 100); // Small delay to ensure DOM is fully ready
});

// Add window unload handler
window.addEventListener('beforeunload', () => {
    autoSaveStemData(); // Auto-save before page unload
}); 
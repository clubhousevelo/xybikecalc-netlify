class BikeSearch {
    constructor() {
        // Use secure server-side function instead of direct API calls
        
        // Storage keys
        this.STORAGE_KEY_PARAMS = 'bikeSearchParams';
        this.STORAGE_KEY_RESULTS = 'bikeSearchResults';
        
        // Sorting state
        this.sortColumn = 'totalDiff'; // Default sort by total difference
        this.sortDirection = 'asc';    // Default ascending order
        
        this.initializeSearch();
        
        // Ensure table headers are preserved after initialization
        setTimeout(() => {
            this.ensureTableHeaders();
        }, 100);
    }

    initializeSearch() {
        const searchButton = document.querySelector('.search-button');
        searchButton.addEventListener('click', () => this.searchBikes());

        const clearButton = document.querySelector('.clear-search-button');
        clearButton.addEventListener('click', () => this.clearSearch());

        // Add enter key support
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchBikes();
                }
            });
        });
        
        // Initialize sliders
        this.initializeSliders();
        
        // Initialize S/R ratio range slider
        this.initializeSRRatioSlider();
        
        // Initialize STA range slider
        this.initializeSTASlider();
        
        // Load bike data to populate style filter
        this.loadStyleOptions();
        
        // Load saved search parameters and results
        this.loadSavedSearch();
    }

    initializeSliders() {
        // Initialize sliders with default values first
        this.setSliderDefaults();
        
        // Reach slider
        const reachSlider = document.getElementById('reachSlider');
        const reachTarget = document.getElementById('reachTarget');
        const reachSliderValue = reachSlider.nextElementSibling;
        
        reachSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            reachTarget.value = value;
            reachSliderValue.textContent = value;
        });
        
        reachTarget.addEventListener('input', (e) => {
            const value = e.target.value;
            reachSlider.value = value;
            reachSliderValue.textContent = value;
        });
        
        // Stack slider
        const stackSlider = document.getElementById('stackSlider');
        const stackTarget = document.getElementById('stackTarget');
        const stackSliderValue = stackSlider.nextElementSibling;
        
        stackSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            stackTarget.value = value;
            stackSliderValue.textContent = value;
        });
        
        stackTarget.addEventListener('input', (e) => {
            const value = e.target.value;
            stackSlider.value = value;
            stackSliderValue.textContent = value;
        });
    }

    setSliderDefaults() {
        // Set default values
        const reachSlider = document.getElementById('reachSlider');
        const reachTarget = document.getElementById('reachTarget');
        const reachSliderValue = reachSlider.nextElementSibling;
        
        const stackSlider = document.getElementById('stackSlider');
        const stackTarget = document.getElementById('stackTarget');
        const stackSliderValue = stackSlider.nextElementSibling;
        
        // Set default values
        reachSlider.value = '380';
        reachTarget.value = '380';
        reachSliderValue.textContent = '380';
        
        stackSlider.value = '560';
        stackTarget.value = '560';
        stackSliderValue.textContent = '560';
    }

    updateSliderRanges(bikes) {
        if (!bikes || bikes.length === 0) return;
        
        // Find min and max values for reach and stack
        const reachValues = bikes.map(bike => parseFloat(bike.reach)).filter(val => !isNaN(val));
        const stackValues = bikes.map(bike => parseFloat(bike.stack)).filter(val => !isNaN(val));
        
        if (reachValues.length > 0) {
            const minReach = Math.floor(Math.min(...reachValues));
            const maxReach = Math.ceil(Math.max(...reachValues));
            
            // Update reach slider and input ranges
            const reachSlider = document.getElementById('reachSlider');
            const reachTarget = document.getElementById('reachTarget');
            
            reachSlider.min = minReach;
            reachSlider.max = maxReach;
            reachTarget.min = minReach;
            reachTarget.max = maxReach;
            
            // Ensure slider position matches the current value
            const currentReachValue = parseFloat(reachTarget.value) || 380;
            if (currentReachValue >= minReach && currentReachValue <= maxReach) {
                reachSlider.value = currentReachValue;
                reachSlider.nextElementSibling.textContent = currentReachValue;
            }
            
            console.log(`Updated Reach range: ${minReach} - ${maxReach}`);
        }
        
        if (stackValues.length > 0) {
            const minStack = Math.floor(Math.min(...stackValues));
            const maxStack = Math.ceil(Math.max(...stackValues));
            
            // Update stack slider and input ranges
            const stackSlider = document.getElementById('stackSlider');
            const stackTarget = document.getElementById('stackTarget');
            
            stackSlider.min = minStack;
            stackSlider.max = maxStack;
            stackTarget.min = minStack;
            stackTarget.max = maxStack;
            
            // Ensure slider position matches the current value
            const currentStackValue = parseFloat(stackTarget.value) || 560;
            if (currentStackValue >= minStack && currentStackValue <= maxStack) {
                stackSlider.value = currentStackValue;
                stackSlider.nextElementSibling.textContent = currentStackValue;
            }
            
            console.log(`Updated Stack range: ${minStack} - ${maxStack}`);
        }
        
        // Update S/R ratio range
        const srRatioValues = bikes.map(bike => parseFloat(this.getSRRatio(bike))).filter(val => !isNaN(val));
        if (srRatioValues.length > 0) {
            const minSRRatio = Math.floor(Math.min(...srRatioValues) * 100) / 100;
            const maxSRRatio = Math.ceil(Math.max(...srRatioValues) * 100) / 100;
            
            // Update S/R ratio range sliders
            const srRatioMin = document.getElementById('srRatioMin');
            const srRatioMax = document.getElementById('srRatioMax');
            
            // Check if sliders exist before updating
            if (srRatioMin && srRatioMax) {
                srRatioMin.min = minSRRatio;
                srRatioMin.max = maxSRRatio;
                srRatioMax.min = minSRRatio;
                srRatioMax.max = maxSRRatio;
                
                // Set initial values to cover the full range
                srRatioMin.value = minSRRatio;
                srRatioMax.value = maxSRRatio;
                
                // Update display values
                const minValue = document.getElementById('srRatioMinValue');
                const maxValue = document.getElementById('srRatioMaxValue');
                if (minValue && maxValue) {
                    minValue.textContent = minSRRatio.toFixed(2);
                    maxValue.textContent = maxSRRatio.toFixed(2);
                }
                
                // Update the visual range bar
                const rangeBar = document.querySelector('.range-slider__range');
                if (rangeBar) {
                    rangeBar.style.left = '0%';
                    rangeBar.style.width = '100%';
                }
                
                console.log(`Updated S/R Ratio range: ${minSRRatio} - ${maxSRRatio}`);
            }
        }
        
        // Update STA range
        const staValues = bikes.map(bike => parseFloat(this.getSTA(bike))).filter(val => !isNaN(val));
        if (staValues.length > 0) {
            const minSTA = Math.floor(Math.min(...staValues) * 10) / 10;
            const maxSTA = Math.ceil(Math.max(...staValues) * 10) / 10;
            
            // Update STA range sliders
            const staMin = document.getElementById('staMin');
            const staMax = document.getElementById('staMax');
            
            // Check if sliders exist before updating
            if (staMin && staMax) {
                staMin.min = minSTA;
                staMin.max = maxSTA;
                staMax.min = minSTA;
                staMax.max = maxSTA;
                
                // Set initial values to cover the full range
                staMin.value = minSTA;
                staMax.value = maxSTA;
                
                // Update display values
                const minValue = document.getElementById('staMinValue');
                const maxValue = document.getElementById('staMaxValue');
                if (minValue && maxValue) {
                    minValue.textContent = minSTA.toFixed(1);
                    maxValue.textContent = maxSTA.toFixed(1);
                }
                
                // Update the visual range bar
                const rangeBar = document.querySelector('.sta-filter .range-slider__range');
                if (rangeBar) {
                    rangeBar.style.left = '0%';
                    rangeBar.style.width = '100%';
                }
                
                console.log(`Updated STA range: ${minSTA} - ${maxSTA}`);
            }
        }
    }

    syncSlidersWithInputs() {
        // Ensure sliders match the current input values
        const reachSlider = document.getElementById('reachSlider');
        const reachTarget = document.getElementById('reachTarget');
        const reachSliderValue = reachSlider.nextElementSibling;
        
        const stackSlider = document.getElementById('stackSlider');
        const stackTarget = document.getElementById('stackTarget');
        const stackSliderValue = stackSlider.nextElementSibling;
        
        // Update reach slider
        const reachValue = parseFloat(reachTarget.value);
        if (!isNaN(reachValue)) {
            reachSlider.value = reachValue;
            reachSliderValue.textContent = reachValue;
        }
        
        // Update stack slider
        const stackValue = parseFloat(stackTarget.value);
        if (!isNaN(stackValue)) {
            stackSlider.value = stackValue;
            stackSliderValue.textContent = stackValue;
        }
    }

    initializeSRRatioSlider() {
        const minSlider = document.getElementById('srRatioMin');
        const maxSlider = document.getElementById('srRatioMax');
        const minValue = document.getElementById('srRatioMinValue');
        const maxValue = document.getElementById('srRatioMaxValue');
        const rangeBar = document.querySelector('.range-slider__range');

        // Function to update the visual range bar
        const updateRangeBar = () => {
            if (!rangeBar) return;
            
            const minVal = parseFloat(minSlider.value);
            const maxVal = parseFloat(maxSlider.value);
            const min = parseFloat(minSlider.min);
            const max = parseFloat(maxSlider.max);
            
            if (isNaN(minVal) || isNaN(maxVal) || isNaN(min) || isNaN(max)) return;
            
            const range = max - min;
            const leftPercent = ((minVal - min) / range) * 100;
            const widthPercent = ((maxVal - minVal) / range) * 100;
            
            rangeBar.style.left = leftPercent + '%';
            rangeBar.style.width = widthPercent + '%';
        };

        // Function to update display values
        const updateValues = () => {
            minValue.textContent = parseFloat(minSlider.value).toFixed(2);
            maxValue.textContent = parseFloat(maxSlider.value).toFixed(2);
            updateRangeBar();
        };

        // Function to ensure min doesn't exceed max
        const constrainMin = () => {
            if (parseFloat(minSlider.value) > parseFloat(maxSlider.value)) {
                minSlider.value = maxSlider.value;
            }
            updateValues();
        };

        // Function to ensure max doesn't go below min
        const constrainMax = () => {
            if (parseFloat(maxSlider.value) < parseFloat(minSlider.value)) {
                maxSlider.value = minSlider.value;
            }
            updateValues();
        };

        // Add event listeners
        minSlider.addEventListener('input', constrainMin);
        maxSlider.addEventListener('input', constrainMax);

        // Don't initialize display values yet - wait for data to be loaded
        // This prevents the flash of incorrect values
        minValue.textContent = '';
        maxValue.textContent = '';
    }
    
    initializeSTASlider() {
        const minSlider = document.getElementById('staMin');
        const maxSlider = document.getElementById('staMax');
        const minValue = document.getElementById('staMinValue');
        const maxValue = document.getElementById('staMaxValue');
        const rangeBar = document.querySelector('.sta-filter .range-slider__range');

        // Function to update the visual range bar
        const updateRangeBar = () => {
            if (!rangeBar) return;
            
            const minVal = parseFloat(minSlider.value);
            const maxVal = parseFloat(maxSlider.value);
            const min = parseFloat(minSlider.min);
            const max = parseFloat(minSlider.max);
            
            if (isNaN(minVal) || isNaN(maxVal) || isNaN(min) || isNaN(max)) return;
            
            const range = max - min;
            const leftPercent = ((minVal - min) / range) * 100;
            const widthPercent = ((maxVal - minVal) / range) * 100;
            
            rangeBar.style.left = leftPercent + '%';
            rangeBar.style.width = widthPercent + '%';
        };

        // Function to update display values
        const updateValues = () => {
            minValue.textContent = parseFloat(minSlider.value).toFixed(1);
            maxValue.textContent = parseFloat(maxSlider.value).toFixed(1);
            updateRangeBar();
        };

        // Function to ensure min doesn't exceed max
        const constrainMin = () => {
            if (parseFloat(minSlider.value) > parseFloat(maxSlider.value)) {
                minSlider.value = maxSlider.value;
            }
            updateValues();
        };

        // Function to ensure max doesn't go below min
        const constrainMax = () => {
            if (parseFloat(maxSlider.value) < parseFloat(minSlider.value)) {
                maxSlider.value = minSlider.value;
            }
            updateValues();
        };

        // Add event listeners
        minSlider.addEventListener('input', constrainMin);
        maxSlider.addEventListener('input', constrainMax);

        // Don't initialize display values yet - wait for data to be loaded
        // This prevents the flash of incorrect values
        minValue.textContent = '';
        maxValue.textContent = '';
    }
    
    ensureTableHeaders() {
        const resultsTable = document.getElementById('resultsTable');
        if (!resultsTable) return;
        
        // Check if the table has proper headers
        const thead = resultsTable.querySelector('thead');
        if (!thead || !thead.querySelector('th[data-sort="sta"]')) {
            // If headers are missing or STA column is missing, restore them
            resultsTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Brand</th>
                        <th>Model</th>
                        <th>Size</th>
                        <th>Style</th>
                        <th>Reach</th>
                        <th>Stack</th>
                        <th>S/R Ratio</th>
                        <th>Δ Reach</th>
                        <th>Δ Stack</th>
                        <th class="sortable" data-sort="sta">STA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="11">Enter target measurements and click Search</td>
                    </tr>
                </tbody>`;
            
            // Clear sorting indicators when restoring headers
            this.clearSortIndicators();
        }
    }
    
    loadSavedSearch() {
        try {
            // Load saved parameters
            const savedParams = localStorage.getItem(this.STORAGE_KEY_PARAMS);
            if (savedParams) {
                const params = JSON.parse(savedParams);
                
                // Set input values
                if (params.reachTarget) {
                    document.getElementById('reachTarget').value = params.reachTarget;
                    // Note: Slider will be updated when ranges are set
                }
                if (params.stackTarget) {
                    document.getElementById('stackTarget').value = params.stackTarget;
                    // Note: Slider will be updated when ranges are set
                }
                if (params.reachRange) document.getElementById('reachRange').value = params.reachRange;
                if (params.stackRange) document.getElementById('stackRange').value = params.stackRange;
                
                // We'll set the filters after options are loaded
                this.savedBrandFilter = Array.isArray(params.brandFilter) ? params.brandFilter : [params.brandFilter];
                this.savedStyleFilter = params.styleFilter;
                this.savedSRRatioMin = params.srRatioMin;
                this.savedSRRatioMax = params.srRatioMax;
                this.savedSTAMin = params.staMin;
                this.savedSTAMax = params.staMax;
            }
            
            // Load saved results
            const savedResults = localStorage.getItem(this.STORAGE_KEY_RESULTS);
            if (savedResults) {
                const results = JSON.parse(savedResults);
                if (results.bikes && results.reachTarget && results.stackTarget) {
                    this.displayResults(results.bikes, results.reachTarget, results.stackTarget, results.totalMatches);
                }
            }
        } catch (error) {
            console.error('Error loading saved search:', error);
        }
    }
    
    saveSearchParams(params) {
        try {
            localStorage.setItem(this.STORAGE_KEY_PARAMS, JSON.stringify(params));
        } catch (error) {
            console.error('Error saving search parameters:', error);
        }
    }
    
    saveSearchResults(bikes, reachTarget, stackTarget, totalMatches) {
        try {
            const results = {
                bikes,
                reachTarget,
                stackTarget,
                totalMatches,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY_RESULTS, JSON.stringify(results));
        } catch (error) {
            console.error('Error saving search results:', error);
        }
    }

    async fetchBikeData() {
        // Use secure server-side function instead of direct API calls
        const range = 'A:P';
        
        try {
            const response = await fetch('/.netlify/functions/sheets-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ range })
            });
            if (!response.ok) {
                throw new Error('Failed to fetch bike data');
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch bike data');
            }
            return result.data;
        } catch (error) {
            this.displayError('Error loading bike data: ' + error.message);
            return [];
        }
    }

    processSheetData(values) {
        // Skip header row and process data
        const headers = values[0];
        console.log('Spreadsheet headers:', headers); // Debug: log all headers
        console.log('Column P (index 15) header:', headers[15]); // Debug: specifically check column P
        
        return values.slice(1).map(row => {
            const bike = {};
            headers.forEach((header, index) => {
                // Handle variations of the material header
                let key = header.toLowerCase().replace(/\s+/g, '_');
                if (key === 'frame_material' || key === 'material_type' || key === 'frame_material_type') {
                    key = 'material';
                }
                bike[key] = row[index];
                if (index === 15) { // Debug: specifically log column P (Material) data
                    console.log(`Column P data - header: "${header}", key: "${key}", value: "${row[index]}"`);
                }
            });
            return bike;
        });
    }

    async loadStyleOptions() {
        try {
            const bikes = await this.fetchBikeData();
            
            // Load brand checkboxes
            const brandCheckboxes = document.getElementById('brandCheckboxes');
            const brands = [...new Set(bikes.map(bike => bike.brand).filter(Boolean))].sort();
            
            // Clear existing checkboxes (except "All Brands")
            const existingCheckboxes = brandCheckboxes.querySelectorAll('.brand-checkbox-item:not(:first-child)');
            existingCheckboxes.forEach(checkbox => checkbox.remove());
            
            // Add brand checkboxes
            brands.forEach(brand => {
                const checkboxItem = document.createElement('div');
                checkboxItem.className = 'brand-checkbox-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `brand-${brand.replace(/\s+/g, '-')}`;
                checkbox.value = brand;
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = brand;
                
                checkboxItem.appendChild(checkbox);
                checkboxItem.appendChild(label);
                brandCheckboxes.appendChild(checkboxItem);
            });
            
            // Add event listeners for checkbox behavior
            this.setupBrandCheckboxListeners();
            
            // Load style options
            const styleSelect = document.getElementById('styleFilter');
            const styles = [...new Set(bikes.map(bike => bike.style).filter(Boolean))].sort();
            styles.forEach(style => {
                const option = document.createElement('option');
                option.value = style;
                option.textContent = style;
                styleSelect.appendChild(option);
            });

            // Load material checkboxes
            const materialCheckboxes = document.getElementById('materialCheckboxes');
            console.log('Raw bike data for materials:', bikes.map(bike => ({ material: bike.material })));
            const materials = [...new Set(bikes.map(bike => bike.material).filter(Boolean))].sort();
            console.log('Unique materials found:', materials);
            
            // Clear existing checkboxes (except "All Materials")
            const existingMaterialCheckboxes = materialCheckboxes.querySelectorAll('.material-checkbox-item:not(:first-child)');
            existingMaterialCheckboxes.forEach(checkbox => checkbox.remove());
            
            // Add material checkboxes
            materials.forEach(material => {
                const checkboxItem = document.createElement('div');
                checkboxItem.className = 'material-checkbox-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `material-${material.replace(/\s+/g, '-')}`;
                checkbox.value = material;
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = material;
                
                checkboxItem.appendChild(checkbox);
                checkboxItem.appendChild(label);
                materialCheckboxes.appendChild(checkboxItem);
            });
            
            // Add event listeners for material checkbox behavior
            this.setupMaterialCheckboxListeners();
            
            // Set saved filters if available
            if (this.savedBrandFilter && this.savedBrandFilter.length > 0) {
                // Clear "All Brands" checkbox
                const allBrandsCheckbox = document.getElementById('brandAll');
                if (allBrandsCheckbox) {
                    allBrandsCheckbox.checked = false;
                }
                // Check saved brands
                this.savedBrandFilter.forEach(brand => {
                    const checkbox = document.getElementById(`brand-${brand.replace(/\s+/g, '-')}`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
            if (this.savedStyleFilter) {
                styleSelect.value = this.savedStyleFilter;
            }
            if (this.savedSRRatioMin !== undefined) {
                document.getElementById('srRatioMin').value = this.savedSRRatioMin;
                document.getElementById('srRatioMinValue').textContent = this.savedSRRatioMin.toFixed(2);
            }
            if (this.savedSRRatioMax !== undefined) {
                document.getElementById('srRatioMax').value = this.savedSRRatioMax;
                document.getElementById('srRatioMaxValue').textContent = this.savedSRRatioMax.toFixed(2);
            }
            if (this.savedSTAMin !== undefined) {
                document.getElementById('staMin').value = this.savedSTAMin;
                document.getElementById('staMinValue').textContent = this.savedSTAMin.toFixed(1);
            }
            if (this.savedSTAMax !== undefined) {
                document.getElementById('staMax').value = this.savedSTAMax;
                document.getElementById('staMaxValue').textContent = this.savedSTAMax.toFixed(1);
            }
            
            // Update slider ranges based on actual data
            this.updateSliderRanges(bikes);
            
            // After ranges are updated, ensure sliders match any saved values
            this.syncSlidersWithInputs();
        } catch (error) {
            console.error('Error loading style options:', error);
        }
    }

    setupBrandCheckboxListeners() {
        const allBrandsCheckbox = document.getElementById('brandAll');
        const brandCheckboxes = document.querySelectorAll('#brandCheckboxes input[type="checkbox"]:not(#brandAll)');
        const expandToggle = document.getElementById('brandExpandToggle');
        const brandCheckboxesContainer = document.getElementById('brandCheckboxes');
        
        // "All Brands" checkbox behavior
        if (allBrandsCheckbox) {
            allBrandsCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Uncheck all other brands when "All Brands" is checked
                    brandCheckboxes.forEach(checkbox => {
                        checkbox.checked = false;
                    });
                }
            });
        }
        
        // Individual brand checkbox behavior
        brandCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Uncheck "All Brands" when a specific brand is selected
                    if (allBrandsCheckbox) {
                        allBrandsCheckbox.checked = false;
                    }
                }
            });
        });
        
        // Expand/collapse functionality
        if (expandToggle && brandCheckboxesContainer) {
            expandToggle.addEventListener('click', () => {
                const isExpanded = brandCheckboxesContainer.classList.contains('expanded');
                
                if (isExpanded) {
                    // Collapse
                    brandCheckboxesContainer.classList.remove('expanded');
                    expandToggle.textContent = 'Expand List';
                } else {
                    // Expand
                    brandCheckboxesContainer.classList.add('expanded');
                    expandToggle.textContent = 'Collapse List';
                }
            });
        }
    }

    setupMaterialCheckboxListeners() {
        const allMaterialsCheckbox = document.getElementById('materialAll');
        const materialCheckboxes = document.querySelectorAll('#materialCheckboxes input[type="checkbox"]:not(#materialAll)');
        const expandToggle = document.getElementById('materialExpandToggle');
        const materialCheckboxesContainer = document.getElementById('materialCheckboxes');
        
        // "All Materials" checkbox behavior
        if (allMaterialsCheckbox) {
            allMaterialsCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Uncheck all other materials when "All Materials" is checked
                    materialCheckboxes.forEach(checkbox => {
                        checkbox.checked = false;
                    });
                }
            });
        }
        
        // Individual material checkbox behavior
        materialCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Uncheck "All Materials" when a specific material is selected
                    if (allMaterialsCheckbox) {
                        allMaterialsCheckbox.checked = false;
                    }
                }
            });
        });
        
        // Expand/collapse functionality
        if (expandToggle && materialCheckboxesContainer) {
            expandToggle.addEventListener('click', () => {
                const isExpanded = materialCheckboxesContainer.classList.contains('expanded');
                
                if (isExpanded) {
                    // Collapse
                    materialCheckboxesContainer.classList.remove('expanded');
                    expandToggle.textContent = 'Expand List';
                } else {
                    // Expand
                    materialCheckboxesContainer.classList.add('expanded');
                    expandToggle.textContent = 'Collapse List';
                }
            });
        }
    }

    async searchBikes() {
        const reachTarget = parseFloat(document.getElementById('reachTarget').value);
        const stackTarget = parseFloat(document.getElementById('stackTarget').value);
        const reachRange = parseFloat(document.getElementById('reachRange').value) || 10;
        const stackRange = parseFloat(document.getElementById('stackRange').value) || 10;
        const brandFilter = Array.from(document.querySelectorAll('#brandCheckboxes input[type="checkbox"]:checked')).map(checkbox => checkbox.value).filter(value => value !== '');
        const materialFilter = Array.from(document.querySelectorAll('#materialCheckboxes input[type="checkbox"]:checked')).map(checkbox => checkbox.value).filter(value => value !== '');
        const styleFilter = document.getElementById('styleFilter').value;
        const srRatioMin = parseFloat(document.getElementById('srRatioMin').value);
        const srRatioMax = parseFloat(document.getElementById('srRatioMax').value);
        const staMin = parseFloat(document.getElementById('staMin').value);
        const staMax = parseFloat(document.getElementById('staMax').value);

        if (!this.validateInputs(reachTarget, stackTarget, reachRange, stackRange)) {
            return;
        }
        
        // Save search parameters
        this.saveSearchParams({
            reachTarget,
            stackTarget,
            reachRange,
            stackRange,
            brandFilter,
            materialFilter,
            styleFilter,
            srRatioMin,
            srRatioMax,
            staMin,
            staMax
        });

        try {
            const bikes = await this.fetchBikeData();
            
            // First, get all matching bikes without the 100 limit to count total matches
            const allMatchingBikes = this.filterBikesWithoutLimit(bikes, reachTarget, stackTarget, reachRange, stackRange, brandFilter, materialFilter, styleFilter, srRatioMin, srRatioMax, staMin, staMax);
            const totalMatches = allMatchingBikes.length;
            
            // Then get the limited results for display
            const matchingBikes = this.filterBikes(bikes, reachTarget, stackTarget, reachRange, stackRange, brandFilter, materialFilter, styleFilter, srRatioMin, srRatioMax, staMin, staMax);
            
            this.displayResults(matchingBikes, reachTarget, stackTarget, totalMatches);
            
            // Save search results with total count
            this.saveSearchResults(matchingBikes, reachTarget, stackTarget, totalMatches);
        } catch (error) {
            this.displayError('Error searching bikes: ' + error.message);
        }
    }

    validateInputs(reach, stack, reachRange, stackRange) {
        if (isNaN(reach) || isNaN(stack)) {
            this.displayError('Please enter valid numbers for Reach and Stack');
            return false;
        }
        if (reach < 300 || reach > 550 || stack < 400 || stack > 700) {
            this.displayError('Please enter reasonable values for Reach (300-500) and Stack (400-700)');
            return false;
        }
        if (reachRange < 0 || stackRange < 0) {
            this.displayError('Range values must be positive');
            return false;
        }
        return true;
    }

    filterBikes(bikes, reachTarget, stackTarget, reachRange, stackRange, brandFilter, materialFilter, styleFilter, srRatioMin, srRatioMax, staMin, staMax) {
        return bikes
            .filter(bike => {
                const reach = parseFloat(bike.reach);
                const stack = parseFloat(bike.stack);
                const srRatio = parseFloat(this.getSRRatio(bike));
                const sta = parseFloat(this.getSTA(bike));
                const brandMatch = brandFilter.length === 0 || brandFilter.includes(bike.brand);
                const materialMatch = materialFilter.length === 0 || materialFilter.includes(bike.material);
                
                // Debug material filtering
                if (materialFilter.length > 0) {
                    console.log('Filtering material:', {
                        bikeMaterial: bike.material,
                        materialFilter,
                        isMatch: materialMatch
                    });
                }
                
                const styleMatch = !styleFilter || bike.style === styleFilter;
                const srRatioMatch = isNaN(srRatio) || (srRatio >= srRatioMin && srRatio <= srRatioMax);
                const staMatch = isNaN(sta) || (sta >= staMin && sta <= staMax);
                
                return (
                    Math.abs(reach - reachTarget) <= reachRange &&
                    Math.abs(stack - stackTarget) <= stackRange &&
                    brandMatch &&
                    materialMatch &&
                    styleMatch &&
                    srRatioMatch &&
                    staMatch
                );
            })
            .map(bike => ({
                ...bike,
                reachDiff: parseFloat(bike.reach) - reachTarget,
                stackDiff: parseFloat(bike.stack) - stackTarget,
                totalDiff: Math.abs(parseFloat(bike.reach) - reachTarget) + 
                          Math.abs(parseFloat(bike.stack) - stackTarget)
            }))
            .sort((a, b) => a.totalDiff - b.totalDiff)
            .slice(0, 100); // Limit to top 100 matches
    }

    filterBikesWithoutLimit(bikes, reachTarget, stackTarget, reachRange, stackRange, brandFilter, materialFilter, styleFilter, srRatioMin, srRatioMax, staMin, staMax) {
        return bikes
            .filter(bike => {
                const reach = parseFloat(bike.reach);
                const stack = parseFloat(bike.stack);
                const srRatio = parseFloat(this.getSRRatio(bike));
                const sta = parseFloat(this.getSTA(bike));
                const brandMatch = brandFilter.length === 0 || brandFilter.includes(bike.brand);
                const materialMatch = materialFilter.length === 0 || materialFilter.includes(bike.material);
                const styleMatch = !styleFilter || bike.style === styleFilter;
                const srRatioMatch = isNaN(srRatio) || (srRatio >= srRatioMin && srRatio <= srRatioMax);
                const staMatch = isNaN(sta) || (sta >= staMin && sta <= staMax);
                
                return (
                    Math.abs(reach - reachTarget) <= reachRange &&
                    Math.abs(stack - stackTarget) <= stackRange &&
                    brandMatch &&
                    materialMatch &&
                    styleMatch &&
                    srRatioMatch &&
                    staMatch
                );
            })
            .map(bike => ({
                ...bike,
                reachDiff: parseFloat(bike.reach) - reachTarget,
                stackDiff: parseFloat(bike.stack) - stackTarget,
                totalDiff: Math.abs(parseFloat(bike.reach) - reachTarget) + 
                          Math.abs(parseFloat(bike.stack) - stackTarget)
            }))
            .sort((a, b) => a.totalDiff - b.totalDiff);
        // No slice limit - returns all matching bikes
    }

    displayResults(bikes, reachTarget, stackTarget, totalMatches = null) {
        const resultsTable = document.getElementById('resultsTable');
        const resultsCounter = document.getElementById('resultsCounter');
        
        if (bikes.length === 0) {
            resultsTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Brand</th>
                        <th>Model</th>
                        <th>Size</th>
                        <th>Style</th>
                        <th>Reach</th>
                        <th>Stack</th>
                        <th>S/R Ratio</th>
                        <th>Δ Reach</th>
                        <th>Δ Stack</th>
                        <th class="sortable" data-sort="sta">STA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="11">No matching bikes found</td></tr>
                </tbody>`;
            resultsCounter.textContent = 'No matching bikes found';
            return;
        }

        // Sort bikes based on current sort settings
        const sortedBikes = this.sortBikes(bikes);

        const headers = `
            <thead>
                <tr>
                    <th><input type="checkbox" id="selectAllBikes" title="Select All Bikes"></th>
                    <th class="sortable" data-sort="brand" style="width: 10%;">Brand</th>
                    <th class="sortable" data-sort="model" style="width: 12%;">Model</th>
                    <th class="sortable" data-sort="size">Size</th>
                    <th class="sortable" data-sort="style">Style</th>
                    <th class="sortable" data-sort="material">Material</th>
                    <th class="sortable" data-sort="reach">Reach</th>
                    <th class="sortable" data-sort="stack">Stack</th>
                    <th class="sortable" data-sort="sr_ratio" title="Stack/Reach Ratio">S/R Ratio</th>
                    <th class="sortable" data-sort="reachDiff">Δ Reach</th>
                    <th class="sortable" data-sort="stackDiff">Δ Stack</th>
                    <th class="sortable" data-sort="sta">STA</th>
                </tr>
            </thead>`;

        const rows = sortedBikes.map(bike => {
            console.log('Bike object for display:', bike); // Debug: log the bike object
            console.log('S/R Ratio value:', bike.sr_ratio); // Debug: log the S/R ratio specifically
            
            return `
            <tr>
                <td><input type="checkbox" class="bike-checkbox" data-bike='${JSON.stringify(bike)}'></td>
                <td>${this.escapeHtml(bike.brand)}</td>
                <td>${this.escapeHtml(bike.model)}</td>
                <td>${this.escapeHtml(bike.size)}</td>
                <td>${this.escapeHtml(bike.style || '')}</td>
                <td>${this.escapeHtml(bike.material || '')}</td>
                <td>${parseFloat(bike.reach).toFixed(1)}</td>
                <td>${parseFloat(bike.stack).toFixed(1)}</td>
                <td>${this.formatSRRatio(this.getSRRatio(bike))}</td>
                <td class="${bike.reachDiff > 0 ? 'diff-positive' : 'diff-negative'}">
                    ${bike.reachDiff > 0 ? '+' : ''}${bike.reachDiff.toFixed(1)}
                </td>
                <td class="${bike.stackDiff > 0 ? 'diff-positive' : 'diff-negative'}">
                    ${bike.stackDiff > 0 ? '+' : ''}${bike.stackDiff.toFixed(1)}
                </td>
                <td>${this.formatSTA(this.getSTA(bike))}</td>
            </tr>
        `;
        }).join('');

        resultsTable.innerHTML = headers + '<tbody>' + rows + '</tbody>';
        
        // Clear any existing highlighting from previous results
        this.clearAllBikeHighlighting();
        
        // Update results counter
        this.updateResultsCounter(bikes, totalMatches);
        
        // Add event listeners to sortable headers
        this.addSortListeners();
        
        // Add event listeners to checkboxes and select all functionality
        this.addCheckboxListeners();
        
        // Update search instructions with current calculator status
        this.updateSearchInstructions();
    }

    updateResultsCounter(bikes, totalMatches = null) {
        const resultsCounter = document.getElementById('resultsCounter');
        if (!resultsCounter) return;
        
        // If totalMatches is provided, use it; otherwise try to get from localStorage
        if (totalMatches === null) {
            const savedResults = localStorage.getItem(this.STORAGE_KEY_RESULTS);
            if (savedResults) {
                try {
                    const results = JSON.parse(savedResults);
                    if (results.totalMatches !== undefined) {
                        totalMatches = results.totalMatches;
                    }
                } catch (error) {
                    console.error('Error parsing saved results:', error);
                }
            }
        }
        
        // Default to bikes.length if no total count is available
        if (totalMatches === null) {
            totalMatches = bikes.length;
        }
        
        // Get current calculator status
        const currentCalculatorBikes = JSON.parse(localStorage.getItem('xyCalculatorData') || '{"bikes": []}');
        const currentBikeCount = currentCalculatorBikes.bikes.length;
        const calculatorStatus = currentBikeCount >= 20 ? 
            ` (Calculator: ${currentBikeCount}/20 - FULL)` : 
            ` (Calculator: ${currentBikeCount}/20)`;
        
        if (bikes.length === 0) {
            resultsCounter.textContent = 'No matching bikes found';
        } else if (totalMatches > 100) {
            resultsCounter.textContent = `Found ${totalMatches} bikes. Displaying the nearest 100 results:`;
        } else {
            resultsCounter.textContent = `Found ${bikes.length} bikes`;
        }
    }
    
    sortBikes(bikes) {
        console.log(`Sorting by column: ${this.sortColumn}, direction: ${this.sortDirection}`); // Debug sorting
        
        return [...bikes].sort((a, b) => {
            let valueA, valueB;
            
            // Handle different data types
            if (this.sortColumn === 'brand' || this.sortColumn === 'model' || 
                this.sortColumn === 'size' || this.sortColumn === 'style') {
                valueA = (a[this.sortColumn] || '').toLowerCase();
                valueB = (b[this.sortColumn] || '').toLowerCase();
            } else if (this.sortColumn === 'sr_ratio') {
                // Special handling for S/R ratio using our getSRRatio method
                valueA = parseFloat(this.getSRRatio(a)) || 0;
                valueB = parseFloat(this.getSRRatio(b)) || 0;
                console.log(`S/R Ratio sorting - A: ${valueA}, B: ${valueB}`); // Debug S/R ratio sorting
            } else if (this.sortColumn === 'sta') {
                // Special handling for STA using our getSTA method
                valueA = parseFloat(this.getSTA(a)) || 0;
                valueB = parseFloat(this.getSTA(b)) || 0;
                console.log(`STA sorting - A: ${valueA}, B: ${valueB}`); // Debug STA sorting
            } else {
                valueA = parseFloat(a[this.sortColumn]) || 0;
                valueB = parseFloat(b[this.sortColumn]) || 0;
            }
            
            // Compare based on direction
            if (this.sortDirection === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        });
    }
    
    addSortListeners() {
        const headers = document.querySelectorAll('#resultsTable th.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                console.log(`Sort header clicked: ${column}`); // Debug sort clicks
                
                // If clicking the same column, toggle direction
                if (column === this.sortColumn) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    // New column, set as ascending
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }
                
                console.log(`New sort: column=${this.sortColumn}, direction=${this.sortDirection}`); // Debug sort state
                
                // Update UI to show sort direction
                this.updateSortIndicators(headers, header);
                
                // Re-display results with new sort
                const reachTarget = parseFloat(document.getElementById('reachTarget').value);
                const stackTarget = parseFloat(document.getElementById('stackTarget').value);
                
                // Get current results from table
                const savedResults = localStorage.getItem(this.STORAGE_KEY_RESULTS);
                if (savedResults) {
                    const results = JSON.parse(savedResults);
                    if (results.bikes) {
                        this.displayResults(results.bikes, results.reachTarget, results.stackTarget, results.totalMatches);
                    }
                }
            });
        });
    }
    
    updateSortIndicators(allHeaders, activeHeader) {
        console.log(`Updating sort indicators - active: ${this.sortColumn}, direction: ${this.sortDirection}`); // Debug sort indicators
        
        // Remove indicators from all headers
        allHeaders.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Add indicator to active header
        activeHeader.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        
        console.log(`Active header now has classes:`, activeHeader.classList.toString()); // Debug class updates
    }
    
    clearSortIndicators() {
        const allHeaders = document.querySelectorAll('#resultsTable th.sortable');
        allHeaders.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });
    }

    displayError(message) {
        const resultsTable = document.getElementById('resultsTable');
        resultsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Select</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Size</th>
                    <th>Style</th>
                    <th>Reach</th>
                    <th>Stack</th>
                    <th>S/R Ratio</th>
                    <th>Δ Reach</th>
                    <th>Δ Stack</th>
                    <th class="sortable" data-sort="sta">STA</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="11" style="color: var(--error-color);">${this.escapeHtml(message)}</td>
                </tr>
            </tbody>`;
    }

    formatSRRatio(srRatio) {
        if (!srRatio || isNaN(parseFloat(srRatio))) {
            return '-';
        }
        return parseFloat(srRatio).toFixed(2);
    }
    
    formatSTA(sta) {
        if (!sta || isNaN(parseFloat(sta))) {
            return '-';
        }
        return parseFloat(sta).toFixed(1) + '°';
    }

    // Try to find S/R ratio data with multiple possible keys
    getSRRatio(bike) {
        // Try multiple possible column names for S/R ratio
        const possibleKeys = [
            'sr_ratio',
            's/r_ratio', 
            'stack_reach_ratio',
            'stack/reach_ratio',
            'stack_reach',
            'stack/reach'
        ];
        
        for (const key of possibleKeys) {
            if (bike[key] !== undefined && bike[key] !== null && bike[key] !== '') {
                console.log(`Found S/R ratio using key: ${key}, value: ${bike[key]}`);
                return bike[key];
            }
        }
        
        console.log('No S/R ratio found, available keys:', Object.keys(bike));
        return null;
    }
    
    // Try to find STA data with multiple possible keys
    getSTA(bike) {
        // Try multiple possible column names for STA
        const possibleKeys = [
            'sta',
            'st_angle',
            'seat_tube_angle',
            'seat_tube_angle_degrees',
            'seat_tube_angle_deg',
            'seat_tube_angle_°',
            'seat_tube_angle',
            'seat_tube_angle_degrees',
            'seat_tube_angle_deg',
            'seat_tube_angle_°'
        ];
        
        for (const key of possibleKeys) {
            if (bike[key] !== undefined && bike[key] !== null && bike[key] !== '') {
                console.log(`Found STA using key: ${key}, value: ${bike[key]}`);
                return bike[key];
            }
        }
        
        console.log('No STA found, available keys:', Object.keys(bike));
        return null;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    clearSearch() {
        // Clear input fields
        document.getElementById('reachTarget').value = '380';
        document.getElementById('stackTarget').value = '560';
        document.getElementById('reachRange').value = '5';
        document.getElementById('stackRange').value = '5';
        // Clear brand checkboxes
        const brandCheckboxes = document.querySelectorAll('#brandCheckboxes input[type="checkbox"]');
        brandCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        // Check "All Brands" by default
        const allBrandsCheckbox = document.getElementById('brandAll');
        if (allBrandsCheckbox) {
            allBrandsCheckbox.checked = true;
        }
        document.getElementById('styleFilter').value = '';
        
        // Reset S/R ratio filter to full range
        const srRatioMin = document.getElementById('srRatioMin');
        const srRatioMax = document.getElementById('srRatioMax');
        if (srRatioMin && srRatioMax) {
            const minVal = parseFloat(srRatioMin.min) || 0;
            const maxVal = parseFloat(srRatioMax.max) || 3;
            srRatioMin.value = minVal;
            srRatioMax.value = maxVal;
            
            const minValue = document.getElementById('srRatioMinValue');
            const maxValue = document.getElementById('srRatioMaxValue');
            if (minValue && maxValue) {
                minValue.textContent = minVal.toFixed(2);
                maxValue.textContent = maxVal.toFixed(2);
            }
            
            // Reset the visual range bar
            const rangeBar = document.querySelector('.range-slider__range');
            if (rangeBar) {
                rangeBar.style.left = '0%';
                rangeBar.style.width = '100%';
            }
        }
        
        // Reset STA filter to full range
        const staMin = document.getElementById('staMin');
        const staMax = document.getElementById('staMax');
        if (staMin && staMax) {
            const minVal = parseFloat(staMin.min) || 70;
            const maxVal = parseFloat(staMax.max) || 80;
            staMin.value = minVal;
            staMax.value = maxVal;
            
            const minValue = document.getElementById('staMinValue');
            const maxValue = document.getElementById('staMaxValue');
            if (minValue && maxValue) {
                minValue.textContent = minVal.toFixed(1);
                maxValue.textContent = maxVal.toFixed(1);
            }
            
            // Reset the visual range bar
            const rangeBar = document.querySelector('.sta-filter .range-slider__range');
            if (rangeBar) {
                rangeBar.style.left = '0%';
                rangeBar.style.width = '100%';
            }
        }
        
        // Reset sliders to default values
        const reachSlider = document.getElementById('reachSlider');
        const stackSlider = document.getElementById('stackSlider');
        reachSlider.value = '380';
        stackSlider.value = '560';
        reachSlider.nextElementSibling.textContent = '380';
        stackSlider.nextElementSibling.textContent = '560';
        
        // Clear results table
        const resultsTable = document.getElementById('resultsTable');
        resultsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Select</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Size</th>
                    <th>Style</th>
                    <th>Reach</th>
                    <th>Stack</th>
                    <th>S/R Ratio</th>
                    <th>Δ Reach</th>
                    <th>Δ Stack</th>
                    <th class="sortable" data-sort="sta">STA</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="11">Enter target measurements and click Search</td>
                </tr>
            </tbody>`;
        
        // Reset results counter
        const resultsCounter = document.getElementById('resultsCounter');
        if (resultsCounter) {
            resultsCounter.textContent = '';
        }
        
        // Clear sorting indicators
        this.clearSortIndicators();
        
        // Clear localStorage
        localStorage.removeItem(this.STORAGE_KEY_PARAMS);
        localStorage.removeItem(this.STORAGE_KEY_RESULTS);
    }

    addCheckboxListeners() {
        // Use event delegation for checkboxes
        const resultsTable = document.getElementById('resultsTable');
        if (resultsTable) {
            resultsTable.addEventListener('change', (e) => {
                if (e.target.classList.contains('bike-checkbox')) {
                    this.updateSelectAllState();
                    this.updateAddButtonVisibility();
                    this.updateBikeRowHighlight(e.target);
                }
            });
        }
        
        // Add select all functionality
        const selectAllCheckbox = document.getElementById('selectAllBikes');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.bike-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                    this.updateBikeRowHighlight(checkbox);
                });
                this.updateAddButtonVisibility();
            });
        }
        
        // Add event listener for the Add to Calculator button
        const addButton = document.getElementById('addSelectedBikesBtn');
        if (addButton) {
            // Remove any existing listeners to prevent duplicates
            addButton.removeEventListener('click', this.boundAddSelectedBikesToCalculator);
            
            // Bind the method to preserve 'this' context
            this.boundAddSelectedBikesToCalculator = this.addSelectedBikesToCalculator.bind(this);
            
            addButton.addEventListener('click', this.boundAddSelectedBikesToCalculator);
        }
        
        // Initialize processing state
        this.isProcessing = false;
        
        // Set up periodic calculator status updates
        this.setupCalculatorStatusUpdates();
    }
    
    updateAddButtonVisibility() {
        const addButton = document.getElementById('addSelectedBikesBtn');
        const selectedCheckboxes = document.querySelectorAll('.bike-checkbox:checked');
        
        if (addButton) {
            if (selectedCheckboxes.length === 0) {
                addButton.style.display = 'none';
                return;
            }
            
            // Check current calculator bike count
            const currentCalculatorBikes = JSON.parse(localStorage.getItem('xyCalculatorData') || '{"bikes": []}');
            const currentBikeCount = currentCalculatorBikes.bikes.length;
            const remainingSlots = Math.max(0, 20 - currentBikeCount);
            
            if (currentBikeCount >= 20) {
                // Calculator is full - show disabled state
                addButton.style.display = 'block';
                addButton.disabled = true;
                addButton.textContent = `Calculator Full (${currentBikeCount}/20) - Remove Bikes First`;
                addButton.title = 'XY Position Calculator has reached the maximum of 20 bikes. Please remove some bikes before adding more.';
                addButton.style.opacity = '0.6';
                addButton.style.cursor = 'not-allowed';
            } else if (selectedCheckboxes.length > remainingSlots) {
                // Too many bikes selected for remaining slots
                addButton.style.display = 'block';
                addButton.disabled = true;
                addButton.textContent = `Too Many Selected (${selectedCheckboxes.length} > ${remainingSlots} slots)`;
                addButton.title = `You can only add ${remainingSlots} more bikes to the calculator. Please deselect some bikes.`;
                addButton.style.opacity = '0.6';
                addButton.style.cursor = 'not-allowed';
            } else {
                // Normal state - can add bikes
                addButton.style.display = 'block';
                addButton.disabled = false;
                addButton.textContent = `Add ${selectedCheckboxes.length} Bike${selectedCheckboxes.length !== 1 ? 's' : ''} to Calculator`;
                addButton.title = `Add selected bikes to XY Position Calculator. Current: ${currentBikeCount}/20 bikes.`;
                addButton.style.opacity = '1';
                addButton.style.cursor = 'pointer';
            }
        }
    }
    
    updateSelectAllState() {
        const checkboxes = document.querySelectorAll('.bike-checkbox');
        const selectAllCheckbox = document.getElementById('selectAllBikes');
        
        if (checkboxes.length === 0) return;
        
        const checkedCount = document.querySelectorAll('.bike-checkbox:checked').length;
        const totalCount = checkboxes.length;
        
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === totalCount) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    updateBikeRowHighlight(checkbox) {
        // Find the parent row of the checkbox
        const row = checkbox.closest('tr');
        if (!row) return;
        
        if (checkbox.checked) {
            // Add highlight class when checked
            row.classList.add('bike-selected');
        } else {
            // Remove highlight class when unchecked
            row.classList.remove('bike-selected');
        }
    }

    clearAllBikeHighlighting() {
        // Remove highlighting from all bike rows
        const highlightedRows = document.querySelectorAll('#resultsTable tbody tr.bike-selected');
        highlightedRows.forEach(row => {
            row.classList.remove('bike-selected');
        });
    }

    async addBikeToCalculator(bikeData) {
        try {
            console.log('Adding bike to calculator:', bikeData); // Debug log
            
            // Create a new bike entry compatible with the calculator format
            const newBike = {
                id: `search-bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                isManual: false,
                brand: bikeData.brand || '',
                model: bikeData.model || '',
                size: bikeData.size || '',
                reach: bikeData.reach || '',
                stack: bikeData.stack || '',
                hta: bikeData.hta || '',
                sta: bikeData.sta || '',
                stl: bikeData.stl || '',
                stemLength: 100,
                stemAngle: -6,
                spacersHeight: 20,
                stemHeight: 40,
                headsetHeight: 10,
                handlebarReach: 80,
                saddleSetback: 0,
                saddleHeight: 0,
                notes: `Added from Bike Search - ${bikeData.style || 'Unknown style'}`,
                // Initialize user modification flags
                _userModifiedStemHeight: false,
                _userModifiedStemLength: false,
                _userModifiedStemAngle: false,
                _userModifiedSpacersHeight: false,
                _userModifiedHeadsetHeight: false,
                // Initialize stock values for highlighting
                _stockStemHeight: 40,
                _stockStemLength: 100,
                _stockStemAngle: -6,
                _stockSpacersHeight: 20,
                _stockHeadsetHeight: 10
            };
            
            // Try to get stock values from the database if we have brand, model, and size
            if (bikeData.brand && bikeData.model && bikeData.size) {
                try {
                    // Create a temporary BikeDatabase instance to get stock values
                    const tempDatabase = new BikeDatabase();
                    await tempDatabase.initialize();
                    const geometry = await tempDatabase.getBikeGeometry(bikeData.brand, bikeData.model, bikeData.size);
                    
                    if (geometry) {
                        console.log('Found stock values for bike:', geometry);
                        
                        // Apply stock values for stem configuration
                        if (geometry.stemHeight !== null) {
                            newBike.stemHeight = geometry.stemHeight;
                            newBike._stockStemHeight = geometry.stemHeight;
                        } else {
                            newBike._stockStemHeight = null;
                        }
                        
                        if (geometry.stemLength !== null) {
                            newBike.stemLength = geometry.stemLength;
                            newBike._stockStemLength = geometry.stemLength;
                        } else {
                            newBike._stockStemLength = null;
                        }
                        
                        if (geometry.stemAngle !== null) {
                            newBike.stemAngle = geometry.stemAngle;
                            newBike._stockStemAngle = geometry.stemAngle;
                        } else {
                            newBike._stockStemAngle = null;
                        }
                        
                        if (geometry.spacersHeight !== null) {
                            newBike.spacersHeight = geometry.spacersHeight;
                            newBike._stockSpacersHeight = geometry.spacersHeight;
                        } else {
                            newBike._stockSpacersHeight = null;
                        }
                        
                        if (geometry.headsetHeight !== null) {
                            newBike.headsetHeight = geometry.headsetHeight;
                            newBike._stockHeadsetHeight = geometry.headsetHeight;
                        } else {
                            newBike._stockHeadsetHeight = null;
                        }
                    }
                } catch (error) {
                    console.warn('Could not fetch stock values for bike:', error);
                    // Continue with default values if stock values can't be fetched
                }
            }
            
            console.log('New bike data with stock values:', newBike); // Debug log
            
            return newBike;
        } catch (error) {
            console.error('Error creating bike data:', error);
            throw error;
        }
    }
    
    async addSelectedBikesToCalculator() {
        // Prevent multiple rapid clicks
        if (this.isProcessing) {
            console.log('Already processing bikes, please wait...');
            return;
        }
        
        // Check if we're in a valid state
        if (!document.getElementById('resultsTable') || !document.querySelector('.bike-checkbox')) {
            console.log('Page not ready - results table or checkboxes not found');
            return;
        }
        
        // Double-check that we have actual results to work with
        const resultsTable = document.getElementById('resultsTable');
        const hasResults = resultsTable.querySelector('tbody tr:not(:first-child)') || 
                          resultsTable.querySelector('.bike-checkbox');
        
        if (!hasResults) {
            console.log('No search results found - cannot add bikes');
            this.showAddConfirmation('No results', 'Please perform a search first', true);
            this.isProcessing = false;
            return;
        }
        
        // Check if XY Position Calculator has reached the 20 bike limit
        const currentCalculatorBikes = JSON.parse(localStorage.getItem('xyCalculatorData') || '{"bikes": []}');
        const currentBikeCount = currentCalculatorBikes.bikes.length;
        
        if (currentBikeCount >= 20) {
            console.log(`XY Position Calculator has ${currentBikeCount} bikes - cannot add more from Bike Search`);
            this.showAddConfirmation('Limit Reached', `XY Position Calculator has ${currentBikeCount} bikes. Please remove some bikes before adding more from Bike Search.`, true);
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        
        // Update button appearance
        const addButton = document.getElementById('addSelectedBikesBtn');
        if (addButton) {
            addButton.classList.add('processing');
            addButton.textContent = 'Processing...';
        }
        
        // Get selected checkboxes and convert to array to avoid NodeList issues
        const selectedCheckboxes = Array.from(document.querySelectorAll('.bike-checkbox:checked'));
        console.log(`Found ${selectedCheckboxes.length} selected checkboxes`); // Debug log
        
        if (selectedCheckboxes.length === 0) {
            this.isProcessing = false;
            if (addButton) {
                addButton.classList.remove('processing');
                this.updateAddButtonVisibility();
            }
            console.log('No checkboxes found - this might indicate a DOM issue');
            this.showAddConfirmation('No bikes selected', 'Please select bikes to add', true);
            return;
        }
        
        try {
            // Get initial count for comparison
            const initialCalculatorBikes = JSON.parse(localStorage.getItem('xyCalculatorData') || '{"bikes": []}');
            const initialCount = initialCalculatorBikes.bikes.length;
            console.log(`Initial calculator bikes count: ${initialCount}`); // Debug log
            
            const addedBikes = [];
            let successCount = 0;
            let errorCount = 0;
            
            // Process each selected bike
            for (let index = 0; index < selectedCheckboxes.length; index++) {
                const checkbox = selectedCheckboxes[index];
                try {
                    // Verify the checkbox has the expected data
                    if (!checkbox.dataset.bike) {
                        console.error(`Checkbox ${index + 1} missing bike data`);
                        errorCount++;
                        continue;
                    }
                    
                    const bikeData = JSON.parse(checkbox.dataset.bike);
                    
                    // Verify the bike data has required fields
                    if (!bikeData.brand || !bikeData.model || !bikeData.reach || !bikeData.stack) {
                        console.error(`Bike ${index + 1} missing required data:`, bikeData);
                        errorCount++;
                        continue;
                    }
                    
                    console.log(`Processing bike ${index + 1}: ${bikeData.brand} ${bikeData.model}`); // Debug log
                    
                    const newBike = await this.addBikeToCalculator(bikeData);
                    addedBikes.push(newBike);
                    successCount++;
                    
                    console.log(`Successfully processed bike ${index + 1}`); // Debug log
                } catch (error) {
                    console.error(`Error processing bike ${index + 1}:`, error);
                    errorCount++;
                }
            }
            
            console.log(`Processed ${successCount} bikes successfully, ${errorCount} errors`); // Debug log
            
            // Now add all bikes to localStorage at once
            if (addedBikes.length > 0) {
                try {
                    const calculatorBikes = JSON.parse(localStorage.getItem('xyCalculatorData') || '{"bikes": []}');
                    const beforeCount = calculatorBikes.bikes.length;
                    calculatorBikes.bikes.push(...addedBikes);
                    
                    // Try to save to localStorage
                    localStorage.setItem('xyCalculatorData', JSON.stringify(calculatorBikes));
                    
                    // Verify the save was successful
                    const verification = JSON.parse(localStorage.getItem('xyCalculatorData') || '{"bikes": []}');
                    const afterCount = verification.bikes.length;
                    
                    if (afterCount >= beforeCount + addedBikes.length) {
                        console.log(`Successfully added ${addedBikes.length} bikes to localStorage (${beforeCount} → ${afterCount})`);
                    } else {
                        console.error(`localStorage save failed: expected ${beforeCount + addedBikes.length} bikes, got ${afterCount}`);
                        throw new Error('localStorage save verification failed');
                    }
                } catch (localStorageError) {
                    console.error('Error saving to localStorage:', localStorageError);
                    throw new Error('Failed to save bikes to localStorage');
                }
            }
            
            // Uncheck all checkboxes after successful addition
            selectedCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                this.updateBikeRowHighlight(checkbox); // Remove highlighting
            });
            
            // Update select all state
            this.updateAddButtonVisibility();
            this.updateSelectAllState();
            
            // Update calculator status to reflect new bike count
            this.updateCalculatorStatus();
            
            // Get final count from localStorage to ensure accuracy
            const finalCalculatorBikes = JSON.parse(localStorage.getItem('xyCalculatorData') || '{"bikes": []}');
            const finalCount = finalCalculatorBikes.bikes.length;
            console.log(`Final calculator bikes count: ${finalCount}`); // Debug log
            
            // Show confirmation with accurate counts
            if (successCount > 0) {
                this.showAddConfirmation(
                    `${successCount} bike${successCount !== 1 ? 's' : ''} added to XY Position Calculator (${finalCount} total)`, 
                    ``, 
                    false, 
                    finalCount
                );
            } else {
                this.showAddConfirmation('Error', 'No bikes were successfully added', true);
            }
            
        } catch (error) {
            console.error('Error adding selected bikes:', error);
            this.showAddConfirmation('Error', 'Failed to add bikes to calculator', true);
        } finally {
            // Always reset processing state
            this.isProcessing = false;
            
            // Reset button appearance
            const addButton = document.getElementById('addSelectedBikesBtn');
            if (addButton) {
                addButton.classList.remove('processing');
                this.updateAddButtonVisibility();
            }
        }
    }

    showAddConfirmation(brand, model, isError = false, totalBikes = null) {
        // Clear any existing notifications first
        this.clearExistingNotifications();
        
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = `add-notification ${isError ? 'error' : 'success'}`;
        
        let message = `${isError ? 'Error: ' : ''}${brand} ${model} ${isError ? 'failed to add' : ''}`;
        if (!isError && totalBikes !== null) {
            message += ``;
        }
        
        notification.innerHTML = `
            <span class="notification-icon">${isError ? '⚠️' : '✓'}</span>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds (longer for more detailed message)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
    
    clearExistingNotifications() {
        const existingNotifications = document.querySelectorAll('.add-notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.remove();
            }
        });
    }
    
    setupCalculatorStatusUpdates() {
        // Update status every 2 seconds to catch changes from other tabs/windows
        setInterval(() => {
            this.updateCalculatorStatus();
        }, 2000);
        
        // Also update when the page becomes visible (user switches back to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateCalculatorStatus();
            }
        });
    }
    
    updateCalculatorStatus() {
        // Update the add button visibility and results counter
        this.updateAddButtonVisibility();
        
        // Update results counter if we have results
        const resultsCounter = document.getElementById('resultsCounter');
        if (resultsCounter && resultsCounter.textContent.includes('Calculator Status:')) {
            const savedResults = localStorage.getItem(this.STORAGE_KEY_RESULTS);
            if (savedResults) {
                try {
                    const results = JSON.parse(savedResults);
                    if (results.bikes) {
                        this.updateResultsCounter(results.bikes, results.totalMatches);
                    }
                } catch (error) {
                    console.error('Error updating calculator status:', error);
                }
            }
        }
        
        // Update search instructions with calculator status
        this.updateSearchInstructions();
    }
    
    updateSearchInstructions() {
        const searchInstructions = document.querySelector('.search-instructions');
        if (!searchInstructions) return;
        
        const currentCalculatorBikes = JSON.parse(localStorage.getItem('xyCalculatorData') || '{"bikes": []}');
        const currentBikeCount = currentCalculatorBikes.bikes.length;
        
        let statusMessage = '';
        if (currentBikeCount >= 20) {
            statusMessage = `<br><strong style="color: var(--error-color);">⚠️ Calculator Full:</strong> XY Position Calculator has ${currentBikeCount}/20 bikes. Remove some bikes before adding more from Bike Search.`;
        } else if (currentBikeCount >= 15) {
            statusMessage = `<br><strong style="color: #ff9500;">⚠️ Almost Full:</strong> XY Position Calculator has ${currentBikeCount}/20 bikes. Only ${20 - currentBikeCount} more bikes can be added.`;
        } else {
            statusMessage = `<br><strong style="color: var(--success-color);">✓ Available:</strong> XY Position Calculator has ${currentBikeCount} bikes. You can add up to ${20 - currentBikeCount} more bikes.`;
        }
        
        searchInstructions.innerHTML = `
            <strong>💡 Tip:</strong> Select bikes below to add them to the XY Position Calculator for comparison.
            ${statusMessage}
        `;
    }
}

// Initialize the bike search when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BikeSearch();
});

// BikeDatabase class for accessing stock values
class BikeDatabase {
    constructor() {
        // Use secure server-side function instead of direct API calls
        this.bikeData = null;
    }

    async initialize() {
        try {
            await this.loadBikeData();
        } catch (error) {
            console.error('Failed to initialize bike database:', error);
        }
    }

    async loadBikeData() {
        const range = 'A:P';  // Updated range to include stem configuration and headset columns
        
        try {
            const response = await fetch('/.netlify/functions/sheets-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ range })
            });
            if (!response.ok) {
                throw new Error('Failed to fetch bike data');
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch bike data');
            }
            this.bikeData = result.data;
        } catch (error) {
            console.error('Error loading bike data:', error);
            throw error;
        }
    }


    async getBrands() {
        if (!this.bikeData) await this.loadBikeData();
        return [...new Set(this.bikeData.map(bike => bike.brand))].sort();
    }

    async getModels(brand) {
        if (!this.bikeData) await this.loadBikeData();
        return [...new Set(this.bikeData
            .filter(bike => bike.brand === brand)
            .map(bike => bike.model))]
            .sort();
    }

    async getSizes(brand, model) {
        if (!this.bikeData) await this.loadBikeData();
        const bikes = this.bikeData
            .filter(bike => bike.brand === brand && bike.model === model)
            .sort((a, b) => parseFloat(a.stack) - parseFloat(b.stack));
        return [...new Set(bikes.map(bike => bike.size))];
    }

    async getBikeGeometry(brand, model, size) {
        if (!this.bikeData) await this.loadBikeData();
        const bike = this.bikeData.find(b => 
            b.brand === brand && 
            b.model === model && 
            b.size === size
        );
        
        if (!bike) return null;
        
        return {
            reach: parseFloat(bike.reach) || 0,
            stack: parseFloat(bike.stack) || 0,
            hta: parseFloat(bike.ht_angle) || 0,
            sta: parseFloat(bike.st_angle) || 0,
            stl: parseFloat(bike.st_length) || 0,
            // Stock values for stem configuration and headset
            stemHeight: bike.stem_height !== undefined && bike.stem_height !== '' ? parseFloat(bike.stem_height) : null,
            stemLength: bike.stem_length !== undefined && bike.stem_length !== '' ? parseFloat(bike.stem_length) : null,
            stemAngle: bike.stem_angle !== undefined && bike.stem_angle !== '' ? parseFloat(bike.stem_angle) : null,
            spacersHeight: bike.spacer_height !== undefined && bike.spacer_height !== '' ? parseFloat(bike.spacer_height) : null,
            headsetHeight: bike.headset_height !== undefined && bike.headset_height !== '' ? parseFloat(bike.headset_height) : null
        };
    }
} 
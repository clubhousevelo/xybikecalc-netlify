class BikeCalculator {
    constructor() {
        this.database = new BikeDatabase();
        this.bikes = [];
        this.bikeCount = 0;
        
        // Create debounced update function using centralized config
        this.debouncedUpdate = DebounceUtils.debounce(async () => {
            await this.updateCalculations();
        }, DebounceUtils.getDelay('position-simulator'));
        
        // Initialize database and event listeners
        this.initialize();
    }

    // Helper function to get theme-aware highlight color
    getHighlightColor() {
        const computedStyle = getComputedStyle(document.documentElement);
        return computedStyle.getPropertyValue('--highlight-bg').trim() || '#fef9c3';
    }

    async initialize() {
        try {
            // Initialize the database first
            await this.database.initialize();
            
            // Initialize event listeners (without drag and drop for Full Bike Calculator)
            this.initializeEventListeners();
            
            // Check if there's saved data from the current session
            const savedData = localStorage.getItem('fullBikeCalculatorData');
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    const sessionStart = sessionStorage.getItem('fullBikeCalculatorSession');
                    
                    // Load saved data
                    this.loadSavedData();
                    
                    // Set new session timestamp if none exists
                    if (!sessionStart) {
                        sessionStorage.setItem('fullBikeCalculatorSession', Date.now().toString());
                    }
                } catch (error) {
                    console.error('Error parsing saved data:', error);
                    // If there's an error parsing saved data, start fresh
                    this.startWithDefaultBikes();
                }
            } else {
                // No saved data, start fresh with default bikes
                this.startWithDefaultBikes();
                
                // Set new session timestamp
                sessionStorage.setItem('fullBikeCalculatorSession', Date.now().toString());
            }
            
            // Adjust bike container width after initial load
            this.adjustBikesContainerWidth();
            
            // For Full Bike Calculator: Collapse the client info card by default
            this.collapseClientInfoCard();
            
            // Initialize canvas for bike geometry visualization
            this.initializeCanvas();
        } catch (error) {
            console.error('Failed to initialize calculator:', error);
            this.showCustomAlert('Failed to load bike database. Please check your internet connection and try again.');
            
            // If we failed to initialize but don't have any bikes, add one default bike
            if (this.bikes.length === 0) {
                this.startWithDefaultBikes();
            }
        }
    }

    // Helper method to start with default bikes
    startWithDefaultBikes() {
        // Start fresh with one default bike for Full Bike Calculator
        this.addBike(); // Add one database bike
        
        // Save the default state immediately to localStorage
        setTimeout(() => {
            this.saveData();
        }, 100);
    }

    initializeEventListeners() {
        // Clean up any existing disabled bike cards that might be in the DOM
        const disabledBikeCards = document.querySelectorAll('.disabled-database-bike');
        disabledBikeCards.forEach(card => card.remove());
        
        // Add bike buttons
        const addBikeBtn = document.getElementById('addBike');
        addBikeBtn.addEventListener('click', () => this.addBike());
        
        // Update buttons state based on login status
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // When user logs in, need to refresh any bike cards that were added while not logged in
                // to show the geometry data
                // Add a delay to ensure data is loaded first
                setTimeout(() => {
                    this.refreshBikeCardsAfterLogin();
                }, 200);
                
                // Update Save button state
                const saveButton = document.getElementById('saveButton');
                saveButton.classList.remove('disabled-button');
                saveButton.title = "Save your bike fit profile";
            } else {
                // Update Save button state
                const saveButton = document.getElementById('saveButton');
                saveButton.classList.add('disabled-button');
                saveButton.title = "Login required to save your profile";
            }
            
            // Update save button enabled/disabled state
            this.updateSaveButtonState();
        });
        
        document.getElementById('addManualBike').addEventListener('click', () => this.addManualBike());

        // Print button
        document.getElementById('printButton').addEventListener('click', () => this.printBikeData());
        
        // Window resize listener for adjusting bike container
        window.addEventListener('resize', () => {
            this.adjustBikesContainerWidth();
        });

        // Clear all data button
        document.getElementById('clearAllData').addEventListener('click', () => {
            // Check if there's already a confirmation dialog open
            if (document.querySelector('.confirm-dialog')) {
                return; // Don't create multiple dialogs
            }
            
            // Create custom confirmation dialog instead of using native confirm()
            const confirmDialog = document.createElement('div');
            confirmDialog.className = 'confirm-dialog';
            confirmDialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--card-bg);
                color: var(--text-color);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                max-width: 400px;
                width: 90%;
                text-align: center;
                z-index: 1001;
            `;
            
            confirmDialog.innerHTML = `
                <h3 style="margin-top: 0;">Confirm Reset</h3>
                <p>Are you sure you want to reset the XY Calculator? This will clear all bike data and measurements.</p>
                <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                    <button class="cancel-button">Cancel</button>
                    <button class="confirm-button">Reset</button>
                </div>
            `;
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
            `;
            
            // Add to DOM
            document.body.appendChild(overlay);
            document.body.appendChild(confirmDialog);
            
            // Style buttons
            const cancelButton = confirmDialog.querySelector('.cancel-button');
            cancelButton.style.cssText = `
                padding: 8px 16px;
                background: transparent;
                color: var(--text-color);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
            `;
            
            const confirmButton = confirmDialog.querySelector('.confirm-button');
            confirmButton.style.cssText = `
                padding: 8px 16px;
                background: #FF3B30;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
            `;
            
            // Function to close dialog
            const closeDialog = () => {
                    document.body.removeChild(confirmDialog);
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleKeyDown);
            };
            
            // Handle keyboard events
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeDialog();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    // Perform reset operation
                    resetCalculator();
                    closeDialog();
                }
            };
            
            // Function to reset the calculator
            const resetCalculator = () => {
                // Clear only XY calculator data from localStorage
                localStorage.removeItem('xyCalculatorData');
                
                // Clear input fields
                document.getElementById('clientName').value = '';
                document.getElementById('clientNotes').value = '';
                document.getElementById('targetSaddleX').value = '';
                document.getElementById('targetSaddleY').value = '';
                document.getElementById('targetHandlebarX').value = '';
                document.getElementById('targetHandlebarY').value = '';
                document.getElementById('handlebarReachUsed').value = '';
                
                // Clear component notes fields
                const saddleNotes = document.getElementById('saddleNotes');
                if (saddleNotes) saddleNotes.value = '';
                
                const handlebarNotes = document.getElementById('handlebarNotes');
                if (handlebarNotes) handlebarNotes.value = '';
                
                const crankLengthNotes = document.getElementById('crankLengthNotes');
                if (crankLengthNotes) crankLengthNotes.value = '';
                
                const drivetrainNotes = document.getElementById('drivetrainNotes');
                if (drivetrainNotes) drivetrainNotes.value = '';
                
                // Clear bikes container
                document.getElementById('bikes-container').innerHTML = '';
                this.bikes = [];
                
                // Add default bikes based on login status
                const isLoggedIn = firebase.auth().currentUser !== null;
                
                if (isLoggedIn) {
                    // For logged in users: one database bike and one manual bike
                    this.addBike(); // Add one database bike
                    this.addManualBike(); // Add one manual bike
                } else {
                    // For non-logged in users: a disabled database bike and one manual bike
                    this.addDisabledBike(); // Add disabled database bike
                    this.addManualBike(); // Add one manual bike
                }
                
                // Update save button state
                this.updateSaveButtonState();
            };
            
            // Add keyboard event listener
            document.addEventListener('keydown', handleKeyDown);
            
            // Add event listeners
            cancelButton.onclick = closeDialog;
            
            confirmButton.onclick = () => {
                resetCalculator();
                closeDialog();
            };
            
            // Focus the cancel button by default (safer option)
            cancelButton.focus();
        });

        // Client name input
        const clientNameInput = document.getElementById('clientName');
        clientNameInput.addEventListener('input', () => {
            this.updateSaveButtonState();
            this.saveData();
        });

        // Client notes input
        const clientNotesInput = document.getElementById('clientNotes');
        clientNotesInput.addEventListener('input', () => {
            this.saveData();
        });
        
        // Component notes inputs
        const saddleNotesInput = document.getElementById('saddleNotes');
        if (saddleNotesInput) {
            saddleNotesInput.addEventListener('input', () => {
                this.saveData();
            });
        }
        
        const handlebarNotesInput = document.getElementById('handlebarNotes');
        if (handlebarNotesInput) {
            handlebarNotesInput.addEventListener('input', () => {
                this.saveData();
            });
        }
        
        const crankLengthNotesInput = document.getElementById('crankLengthNotes');
        if (crankLengthNotesInput) {
            crankLengthNotesInput.addEventListener('input', () => {
                this.saveData();
            });
        }
        
        const drivetrainNotesInput = document.getElementById('drivetrainNotes');
        if (drivetrainNotesInput) {
            drivetrainNotesInput.addEventListener('input', () => {
                this.saveData();
            });
        }

        // Save/Load buttons
        document.getElementById('saveButton').addEventListener('click', () => {
            // Check if user is logged in before allowing save
            if (!firebase.auth().currentUser) {
                this.showCustomAlert('Please log in to save bike configurations to a client profile.');
                return;
            }
            this.saveInstance();
        });
        document.getElementById('loadButton').addEventListener('click', () => this.showLoadDialog());

        // Target position inputs - these should update ALL bike cards
        ['targetSaddleX', 'targetSaddleY', 'targetHandlebarX', 'targetHandlebarY', 'handlebarReachUsed']
            .forEach(id => {
                document.getElementById(id).addEventListener('input', () => {
                    // When target positions change, trigger debounced update
                    this.debouncedUpdate();
                    this.saveData();

                });
            });
        
        // Drag and drop functionality removed for Full Bike Calculator (single bike card only)
        
        // Fix dark mode toggle for XY Calculator
        const darkModeToggle = document.getElementById('darkModeToggle');
        const mobileDarkModeToggle = document.getElementById('mobileDarkModeToggle');
        
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                this.updateDarkModeToggle();
                localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
                // Redraw canvas after theme change
                this.updateBikeVisualization();
            });
        }
        
        if (mobileDarkModeToggle) {
            mobileDarkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                this.updateDarkModeToggle();
                localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
                // Redraw canvas after theme change
                this.updateBikeVisualization();
            });
        }
        
        // Update toggle state on initialization
        this.updateDarkModeToggle();
        
        // Handle canvas resize
        window.addEventListener('resize', () => {
            if (this.canvas) {
                this.canvas.width = this.canvas.offsetWidth;
                this.canvas.height = this.canvas.offsetHeight;
                
                // Enable high-quality rendering
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                
                // Redraw the visualization
                this.updateBikeVisualization();
            }
        });
        
        // Save data before page unload to ensure data persistence
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });
        
        // Save data when page becomes hidden (mobile browsers, tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveData();
            }
        });

        // Function to update add bike button states
        const updateAddBikeButtonStates = () => {
            const hasMaxBikes = this.bikes.length >= 2;
            addBikeBtn.disabled = hasMaxBikes;
            addBikeBtn.title = hasMaxBikes ? 'Maximum two bike cards allowed' : 'Add a bike from database';
            
            const addManualBikeBtn = document.getElementById('addManualBike');
            addManualBikeBtn.disabled = hasMaxBikes;
            addManualBikeBtn.title = hasMaxBikes ? 'Maximum two bike cards allowed' : 'Add a manual bike entry';
        };
        
        // Update button states initially and whenever bikes change
        updateAddBikeButtonStates();
        
        // Store the function reference so it can be called from other methods
        this.updateAddBikeButtonStates = updateAddBikeButtonStates;
    }

    // Add method to update dark mode toggle appearance
    updateDarkModeToggle() {
        const darkModeToggles = [
            document.getElementById('darkModeToggle'),
            document.getElementById('mobileDarkModeToggle')
        ];
        
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        darkModeToggles.forEach(toggle => {
            if (toggle) {
                const toggleIcon = toggle.querySelector('.toggle-icon');
                const toggleText = toggle.querySelector('.toggle-text');
                
                if (toggleIcon) {
                    toggleIcon.textContent = isDarkMode ? '🌙' : '☀️';
                }
                
                if (toggleText) {
                    toggleText.textContent = isDarkMode ? 'Dark Mode' : 'Light Mode';
                }
            }
        });
    }

    initializeDragAndDrop() {
        const bikesContainer = document.getElementById('bikes-container');
        
        // Event delegation for drag handles
        bikesContainer.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('drag-handle') || e.target.closest('.drag-handle')) {
                const bikeCard = e.target.closest('.bike-card');
                if (bikeCard) {
                    this.handleDragStart(bikeCard, e);
                }
            }
        });
        
        // Prevent default drag behavior on bike cards
        bikesContainer.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('bike-card')) {
                e.preventDefault();
            }
        });
    }

    handleDragStart(bikeCard, startEvent) {
        const bikesContainer = document.getElementById('bikes-container');
        const initialX = startEvent.clientX;
        const bikeCards = Array.from(document.querySelectorAll('.bike-card'));
        const startIndex = bikeCards.indexOf(bikeCard);
        const bikeRect = bikeCard.getBoundingClientRect();
        const containerRect = bikesContainer.getBoundingClientRect();
        
        // Calculate the offset between cursor and card's left edge
        const cursorOffsetX = initialX - bikeRect.left;
        
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        
        // Add dragging class
        bikeCard.classList.add('dragging');
        
        // Create placeholder for original position
        const placeholder = document.createElement('div');
        placeholder.className = 'bike-card-placeholder';
        placeholder.style.width = `${bikeRect.width}px`;
        placeholder.style.height = `${bikeRect.height}px`;
        placeholder.style.flex = '0 0 auto';
        placeholder.style.margin = '0 6px';
        
        // Store original position
        const originalPosition = {
            left: bikeRect.left,
            top: bikeRect.top
        };
        
        // Set fixed positioning for dragged element
        bikeCard.style.position = 'fixed';
        bikeCard.style.zIndex = '1000';
        bikeCard.style.width = `${bikeRect.width}px`;
        bikeCard.style.left = `${originalPosition.left}px`;
        bikeCard.style.top = `${originalPosition.top}px`;
        
        // Insert placeholder
        bikeCard.parentNode.insertBefore(placeholder, bikeCard);
        
        const handleMove = (moveEvent) => {
            // Calculate new position based on cursor position and initial offset
            const newLeft = moveEvent.clientX - cursorOffsetX;
            
            // Update position
            bikeCard.style.left = `${newLeft}px`;
            
            // Find the card we're hovering over
            const cardWidth = bikeRect.width;
            const cardCenter = newLeft + (cardWidth / 2);
            
            // Get updated list of cards (excluding the dragged one)
            const currentCards = Array.from(document.querySelectorAll('.bike-card:not(.dragging)'));
            
            // Find the card we should insert before
            let nextCard = currentCards.find(card => {
                const rect = card.getBoundingClientRect();
                return rect.left + rect.width / 2 > cardCenter;
            });
            
            // Move placeholder if needed
            if (nextCard) {
                bikesContainer.insertBefore(placeholder, nextCard);
            } else {
                // Always append to the end if no next card is found
                bikesContainer.appendChild(placeholder);
            }
            
            // Auto-scroll if near edges
            const scrollThreshold = 100;
            if (moveEvent.clientX - containerRect.left < scrollThreshold) {
                // Scroll left
                bikesContainer.scrollLeft -= 10;
            } else if (containerRect.right - moveEvent.clientX < scrollThreshold) {
                // Scroll right
                bikesContainer.scrollLeft += 10;
            }
        };
        
        const handleEnd = () => {
            // Remove event listeners
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.body.style.userSelect = '';
            // Replace placeholder with bike card
            bikeCard.classList.remove('dragging');
            bikeCard.style.position = '';
            bikeCard.style.zIndex = '';
            bikeCard.style.width = '';
            bikeCard.style.left = '';
            bikeCard.style.top = '';
            if (placeholder.parentNode) {
                placeholder.parentNode.insertBefore(bikeCard, placeholder);
                placeholder.parentNode.removeChild(placeholder);
            }
            // Update the bikes array to match the new DOM order
            const newBikeCards = Array.from(document.querySelectorAll('.bike-card'));
            const newBikes = newBikeCards.map(card => {
                return this.bikes.find(bike => bike.id === card.id);
            });
            this.bikes = newBikes;
        };
        
        // Add event listeners for drag
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
    }

    addBike() {
        // For Full Bike Calculator: Allow up to two bike cards
        if (this.bikes.length >= 2) {
            return;
        }
        
        // Create bike data regardless of login status
        const bikeData = {
            id: `bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            isManual: false,
            brand: '',
            model: '',
            size: '',
            reach: '',
            stack: '',
            hta: '',
            sta: '',
            stl: '',
            stemHeight: 40,
            stemLength: 100,
            stemAngle: -6,
            spacerHeight: 20,
            headsetHeight: 10,
            handlebarReach: 80,
            saddleSetback: 0,
            saddleHeight: 0,
            saddleX: 0,
            saddleY: 0,
            notes: '',
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
        
        this.bikes.push(bikeData);
        this.renderBikeCard(bikeData, this.bikes.length - 1);
        this.updateCalculationsForBike(bikeData.id);
        
        // Setup bike selectors for the new bike
        if (!bikeData.isManual) {
            this.setupBikeSelectors(bikeData.id);
        }
        
        // Update button states
        if (this.updateAddBikeButtonStates) {
            this.updateAddBikeButtonStates();
        }
        
        // Force canvas resize and redraw to adjust for new bike card
        setTimeout(() => {
            this.forceCanvasResize();
            this.updateBikeVisualization();
            this.updateCanvasControlsVisibility();
        }, 100);
    }
    
    addDisabledBike() {
        // Instead of adding a disabled bike, add a regular bike
        this.addBike();
    }

    addManualBike() {
        // For Full Bike Calculator: Allow up to two bike cards
        if (this.bikes.length >= 2) {
            return;
        }
        
        const bikeData = {
            id: `manual-bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            isManual: true,
            brand: '',
            model: '',
            size: '',
            reach: '',
            stack: '',
            hta: '',
            sta: '',
            stl: '',
            stemHeight: 40,
            stemLength: 100,
            stemAngle: -6,
            spacersHeight: 20,
            headsetHeight: 10,
            handlebarReach: 80,
            saddleSetback: 0,
            saddleHeight: 0,
            saddleX: 0,
            saddleY: 0,
            notes: '',
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
        
        this.bikes.push(bikeData);
        this.renderBikeCard(bikeData, this.bikes.length - 1);
        this.updateCalculationsForBike(bikeData.id);
        
        // Force canvas resize and redraw to adjust for new bike card
        setTimeout(() => {
            this.forceCanvasResize();
            this.updateBikeVisualization();
            this.updateCanvasControlsVisibility();
        }, 100);
    }

    renderBikeCard(bikeData, index) {
        const bikeCard = document.createElement('div');
        bikeCard.className = 'bike-card';
        bikeCard.id = bikeData.id;
        bikeCard.innerHTML = this.getBikeCardHTML(index, bikeData.isManual);
        
        document.getElementById('bikes-container').appendChild(bikeCard);
        
        // Initialize bike card inputs and event listeners
        this.initializeBikeCardInputs(bikeCard, bikeData, index);
        
        // Adjust container width based on number of cards
        this.adjustBikesContainerWidth();
    }
    
    renderDisabledBikeCard(bikeData, index) {
        // Instead of rendering a disabled bike card, render a regular bike card
        // Remove isDisabled property if it exists
        if (bikeData.isDisabled) {
            delete bikeData.isDisabled;
        }
        this.renderBikeCard(bikeData, index);
    }
    
    // Add this new method to dynamically adjust the bikes container width
    adjustBikesContainerWidth() {
        const bikesContainer = document.getElementById('bikes-container');
        const containerWrapper = document.querySelector('.bikes-container-wrapper');
        const bikeCards = document.querySelectorAll('.bike-card');
        
        if (bikeCards.length === 0) {
            containerWrapper.style.justifyContent = 'center';
            return;
        }
        
        // Calculate total width of all bike cards
        let totalCardsWidth = 0;
        
        // Get the computed gap between cards
        const computedStyle = window.getComputedStyle(bikesContainer);
        const gap = parseInt(computedStyle.gap) || 12; // Default to 12px if gap can't be determined
        
        // Calculate actual width by measuring each card
        bikeCards.forEach((card, index) => {
            totalCardsWidth += card.offsetWidth;
            // Add gap width for all but the last card
            if (index < bikeCards.length - 1) {
                totalCardsWidth += gap;
            }
        });
        
        // Compare with container width
        const containerWidth = containerWrapper.clientWidth;
        
        if (totalCardsWidth <= containerWidth - 24) { // 24px accounts for padding
            // Cards fit within container - center them
            containerWrapper.style.justifyContent = 'center';
        } else {
            // Cards overflow - align to left to enable scrolling
            containerWrapper.style.justifyContent = 'flex-start';
        }
    }
    
    // Method to collapse the client info card by default for Full Bike Calculator
    collapseClientInfoCard() {
        const clientInfoCard = document.querySelector('.client-info-card');
        const clientInfoToggle = document.getElementById('clientInfoToggle');
        const calculatorContainer = document.getElementById('calculatorContainer');
        
        if (clientInfoCard && clientInfoToggle && calculatorContainer) {
            // Add the 'active' class to collapse the card
            clientInfoCard.classList.add('active');
            clientInfoToggle.classList.add('active');
            calculatorContainer.classList.add('active');
        }
    }

    getBikeCardHTML(index, isManual) {
        const isLoggedIn = firebase.auth().currentUser !== null;
        const readonlyClass = !isManual && !isLoggedIn ? 'login-required' : '';
        const positionNumber = index + 1;
        
        return `
            ${isManual ? this.getManualInputsHTML() : this.getBikeSelectorHTML()}
            <div class="geometry-section" style="margin-bottom:-5px;">
                <div class="input-group">
                    <label>Reach:</label>
                    <input type="number" class="reach" value="" min="300" max="600">
                    <span>mm</span>
                </div>
                <div class="input-group">
                    <label>Stack:</label>
                    <input type="number" class="stack" value="" min="400" max="800">
                    <span>mm</span>
                </div>
                <div class="input-group">
                    <label>Head Tube Angle:</label>
                    <input type="number" class="hta" value="" step="0.1" min="60" max="80">
                    <span>°</span>
                </div>
                <div class="input-group">
                    <label>Seat Tube Angle:</label>
                    <input type="number" class="sta" value="" step="0.1" min="60" max="85">
                    <span>°</span>
                </div>
                <div class="input-group">
                    <label>Seat Tube Length:</label>
                    <input type="number" class="stl" value="" min="250">
                    <span>mm</span>
                </div>
            </div>
            <div class="stem-section" style="margin-bottom:-5px;">
                <h4>Stem Configuration</h4>
                <div class="input-group">
                    <label class="tooltip">Stem Height:<span class="tooltip-text">Measured height of the stem where it clamps the steerer tube. Typically ranges from 38-42mm.</span></label>
                    <input type="number" class="stem-height" value="40" min="10">
                    <span>mm</span>
                </div>
                <div class="input-group">
                    <label>Stem Length:</label>
                    <input type="number" class="stem-length" value="100" min="35" max="250" step="5">
                    <span>mm</span>
                </div>
                <div class="input-group">
                    <label>Stem Angle:</label>
                    <input type="number" class="stem-angle" value="-6" min="-69" max="69">
                    <span>°</span>
                </div>
                <div class="input-group">
                    <label class="tooltip">Spacer Height:<span class="tooltip-text">Include only the height of actual spacers, not the headset bearing cover or transition spacers which can be specified below.</span></label>
                    <input type="number" class="spacer-height" value="20" min="0">
                    <span>mm</span>
                </div>
                <div class="input-group">
                    <label class="tooltip">Headset Height:<span class="tooltip-text">Height of the headset bearing cover and/or transition spacers above the frame.</span></label>
                    <input type="number" class="headset-height" value="10" min="0" max="50">
                    <span>mm</span>
                </div>
            </div>
            <div class="saddle-section" style="margin-bottom:-5px;">
                <h4>Saddle Rail Center (SRC)</h4>
                <div class="input-group">
                    <label class="tooltip">Saddle X:<span class="tooltip-text">This is <i>NOT</i> the same as 'Saddle Setback'. Please read the guide if you are unsure of this value.</span></label>
                    <input type="number" class="saddle-x" id="targetSaddleX" value="" min="100" max="300">
                    <span>mm</span>
                </div>
                <div class="input-group">
                    <label class="tooltip">Saddle Y:<span class="tooltip-text">This is <i>NOT</i> the same as 'Saddle Height'. Please read the guide if you are unsure of this value.</span></label>
                    <input type="number" class="saddle-y" id="targetSaddleY" value="" min="425" max="900">
                    <span>mm</span>
                </div>
            </div>
            <div class="results-section" style="margin-bottom:-5px;">
                <h4>Results</h4>
                <div class="result-group">
                    <label class="tooltip">Handlebar X:<span class="tooltip-text">Horizontal distance from the center of the bottom bracket to center of the handlebar.<p><br>Value in parentheses is the difference from the calculated HX to target HX (if provided).</p></span></label>
                    <span class="handlebar-x">-- mm</span>
                </div>
                <div class="result-group with-divider">
                    <label class="tooltip">Handlebar Y:<span class="tooltip-text">Vertical distance from the center of the bottom bracket to center of the handlebar.<p><br>Value in parentheses is the difference from the calculated HY to target HY (if provided).</p></span></label>
                    <span class="handlebar-y">-- mm</span>
                </div>
                <div class="result-group with-divider" style="display: none;">
                    <label class="tooltip">Bar Reach Needed:<span class="tooltip-text">The handlebar reach value needed to achieve an identical lever position as the target position.</span></label>
                    <span class="bar-reach-needed">-- mm</span>
                </div>
                <div class="result-group">
                    <label class="tooltip">Setback vs STA:<span class="tooltip-text">The horizontal distance between the Saddle Rail Center and the seat tube extended. <p><br>A value of -20 or greater suggests using a setback seatpost (vs straight) may be most appropriate.</p></span></label>
                    <span class="setback-sta">-- mm</span>
                </div>
                <div class="result-group">
                    <label class="tooltip">Effective STA:<span class="tooltip-text">The effective seat tube angle, calculated from the center of the bottom bracket to the center of the saddle rail.</span></label>
                    <span class="effective-sta">-- °</span>
                </div>
                <div class="result-group">
                    <label class="tooltip">BB to Rail:<span class="tooltip-text">The distance from the center of the bottom bracket to the saddle rail, following the seat tube. Used to determine appropriate integrated seat mast choice. <p><br>***This will vary if the saddle rail itself is not horizontal!***</p></span></label>
                    <span class="bb-rail">-- mm</span>
                </div>
                <div class="result-group">
                    <label class="tooltip">BB to SRC:<span class="tooltip-text">The direct distance from the center of the bottom bracket to the saddle rail center using X/Y coordinates.</span></label>
                    <span class="bb-src">-- mm</span>
                </div>
                <div class="result-group">
                    <label class="tooltip">Exposed Seatpost:<span class="tooltip-text">The amount of seatpost extending above the seat tube. This can affect seatpost length selection and can have an effect on seatpost compliance.</span></label>
                    <span class="exposed-seatpost">-- mm</span>
                </div>
            </div>
            <div class="notes-section" style="display: none;">
                <div class="input-group">
                    <textarea class="bike-notes" placeholder="Add notes about this bike..."></textarea>
                </div>
            </div>
            <div class="button-group">
                <button class="reset-button">RESET</button>
                <button class="duplicate-button" style="display: none;">DUPLICATE</button>
                ${index === 1 ? '<button class="delete-button">🗑️</button>' : ''}
                <label>Bike ${positionNumber}</label>
            </div>
        `;
    }

    getBikeSelectorHTML() {
        return `
            <div class="bike-selector">
                <select class="brand-select">
                    <option value="">Select Brand</option>
                </select>
                <select class="model-select" disabled>
                    <option value="">Select Model</option>
                </select>
                <select class="size-select" disabled>
                    <option value="">Select Size</option>
                </select>
            </div>
        `;
    }

    getManualInputsHTML() {
        return `
            <div class="manual-inputs">
                <div class="input-group">
                    <label>Brand:</label>
                    <input type="text" class="brand-input" placeholder="Manual Entry">
                </div>
                <div class="input-group">
                    <label>Model:</label>
                    <input type="text" class="model-input">
                </div>
                <div class="input-group">
                    <label>Size:</label>
                    <input type="text" class="size-input">
                </div>
            </div>
        `;
    }

    initializeBikeCardInputs(bikeCard, bikeData, index) {
        const card = document.getElementById(bikeData.id);

        // Setup input listeners for all numeric inputs
        card.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => {
                this.updateBikeData(bikeData.id);
                // Trigger debounced update for all bikes
                this.debouncedUpdate();
            });
        });
        
        // Setup specific event listeners for stem configuration to track user modifications
        const stemHeightInput = card.querySelector('.stem-height');
        const stemLengthInput = card.querySelector('.stem-length');
        const stemAngleInput = card.querySelector('.stem-angle');
        const spacerHeightInput = card.querySelector('.spacer-height');
        const headsetHeightInput = card.querySelector('.headset-height');
        
        if (stemHeightInput) {
            stemHeightInput.addEventListener('input', () => {
                if (bikeData) {
                    bikeData._userModifiedStemHeight = true; // Mark as user-modified
                    
                    // Check if value differs from stock value and remove highlighting if so
                    if (bikeData._stockStemHeight !== undefined && parseFloat(stemHeightInput.value) !== bikeData._stockStemHeight) {
                        stemHeightInput.style.backgroundColor = '';
                    }
                    
                    this.updateBikeData(bikeData.id);
                    // Trigger debounced update for all bikes
                    this.debouncedUpdate();
                    this.saveData();
                }
            });
        }
        
        if (stemLengthInput) {
            stemLengthInput.addEventListener('input', () => {
                if (bikeData) {
                    bikeData._userModifiedStemLength = true; // Mark as user-modified
                    
                    // Check if value differs from stock value and remove highlighting if so
                    if (bikeData._stockStemLength !== undefined && parseFloat(stemLengthInput.value) !== bikeData._stockStemLength) {
                        stemLengthInput.style.backgroundColor = '';
                    }
                    
                    this.updateBikeData(bikeData.id);
                    // Trigger debounced update for all bikes
                    this.debouncedUpdate();
                    this.saveData();
                }
            });
        }
        
        if (stemAngleInput) {
            stemAngleInput.addEventListener('input', () => {
                if (bikeData) {
                    bikeData._userModifiedStemAngle = true; // Mark as user-modified
                    
                    // Check if value differs from stock value and remove highlighting if so
                    if (bikeData._stockStemAngle !== undefined && parseFloat(stemAngleInput.value) !== bikeData._stockStemAngle) {
                        stemAngleInput.style.backgroundColor = '';
                    }
                    
                    this.updateBikeData(bikeData.id);
                    // Trigger debounced update for all bikes
                    this.debouncedUpdate();
                    this.saveData();
                }
            });
        }
        
        if (spacerHeightInput) {
            spacerHeightInput.addEventListener('input', () => {
                if (bikeData) {
                    bikeData._userModifiedSpacersHeight = true; // Mark as user-modified
                    
                    // Check if value differs from stock value and remove highlighting if so
                    if (bikeData._stockSpacersHeight !== undefined && parseFloat(spacerHeightInput.value) !== bikeData._stockSpacersHeight) {
                        spacerHeightInput.style.backgroundColor = '';
                    }
                    
                    this.updateBikeData(bikeData.id);
                    // Trigger debounced update for all bikes
                    this.debouncedUpdate();
                    this.saveData();
                }
            });
        }
        
        if (headsetHeightInput) {
            headsetHeightInput.addEventListener('input', () => {
                if (bikeData) {
                    bikeData._userModifiedHeadsetHeight = true; // Mark as user-modified
                    
                    // Check if value differs from stock value and remove highlighting if so
                    if (bikeData._stockHeadsetHeight !== undefined && parseFloat(headsetHeightInput.value) !== bikeData._stockHeadsetHeight) {
                        headsetHeightInput.style.backgroundColor = '';
                    }
                    
                    this.updateBikeData(bikeData.id);
                    // Trigger debounced update for all bikes
                    this.debouncedUpdate();
                    this.saveData();
                }
            });
        }
        
        // Setup notes textarea listener
        const notesTextareaListener = card.querySelector('.bike-notes');
        if (notesTextareaListener) {
            notesTextareaListener.addEventListener('input', () => {
                this.updateBikeData(bikeData.id);
                // Trigger debounced update for all bikes
                this.debouncedUpdate();
            });
        }

        // Setup manual input listeners if applicable
        if (bikeData.isManual) {
            card.querySelectorAll('.manual-inputs input').forEach(input => {
                input.addEventListener('input', () => {
                    this.updateBikeData(bikeData.id);
                    // Trigger debounced update for all bikes
                    this.debouncedUpdate();
                    // Trigger debounced update for all bikes
                    this.debouncedUpdate();
                });
            });

            // Set initial values for manual bike
            card.querySelector('.brand-input').value = bikeData.brand;
            card.querySelector('.model-input').value = bikeData.model;
            card.querySelector('.size-input').value = bikeData.size;
            card.querySelector('.reach').value = bikeData.reach;
            card.querySelector('.stack').value = bikeData.stack;
            card.querySelector('.hta').value = bikeData.hta;
            card.querySelector('.sta').value = bikeData.sta;
            card.querySelector('.stl').value = bikeData.stl;
            card.querySelector('.stem-length').value = bikeData.stemLength;
            card.querySelector('.stem-angle').value = bikeData.stemAngle;
            card.querySelector('.spacer-height').value = bikeData.spacersHeight;
            card.querySelector('.headset-height').value = bikeData.headsetHeight;
            card.querySelector('.saddle-x').value = bikeData.saddleX;
            card.querySelector('.saddle-y').value = bikeData.saddleY;
        }
        
        // Set initial notes value for all bikes
        const notesTextarea = card.querySelector('.bike-notes');
        if (notesTextarea) {
            notesTextarea.value = bikeData.notes || '';
        }

        // Setup button listeners
        card.querySelector('.reset-button').addEventListener('click', () => {
            this.resetBike(bikeData.id);
        });

        card.querySelector('.duplicate-button').addEventListener('click', () => {
            this.duplicateBike(bikeData.id);
        });

        // Only add delete button event listener if the delete button exists (Position 2 only)
        const deleteButton = card.querySelector('.delete-button');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.deleteBike(bikeData.id);
            });
        }
    }

    updateBikeData(bikeId) {
        const bike = this.bikes.find(b => b.id === bikeId);
        if (!bike) return;
        
        const card = document.getElementById(bikeId);
        
        // Update bike data from inputs
        bike.reach = parseFloat(card.querySelector('.reach').value) || '';
        bike.stack = parseFloat(card.querySelector('.stack').value) || '';
        bike.hta = parseFloat(card.querySelector('.hta').value) || '';
        bike.sta = parseFloat(card.querySelector('.sta').value) || '';
        bike.stl = parseFloat(card.querySelector('.stl').value) || '';
        
        // Treat blank stem configuration fields as 0
        const stemLengthValue = card.querySelector('.stem-length').value;
        const stemAngleValue = card.querySelector('.stem-angle').value;
        const spacerHeightValue = card.querySelector('.spacer-height').value;
        const headsetHeightValue = card.querySelector('.headset-height').value;
        const stemHeightValue = card.querySelector('.stem-height').value;
        
        bike.stemLength = stemLengthValue === '' ? 0 : parseFloat(stemLengthValue);
        bike.stemAngle = stemAngleValue === '' ? 0 : parseFloat(stemAngleValue);
        bike.spacersHeight = spacerHeightValue === '' ? 0 : parseFloat(spacerHeightValue);
        bike.headsetHeight = headsetHeightValue === '' ? 0 : parseFloat(headsetHeightValue);
        bike.stemHeight = stemHeightValue === '' ? 40 : parseFloat(stemHeightValue);
        
        // Update saddle position fields
        const saddleXValue = card.querySelector('.saddle-x').value;
        const saddleYValue = card.querySelector('.saddle-y').value;
        bike.saddleX = saddleXValue === '' ? 0 : parseFloat(saddleXValue);
        bike.saddleY = saddleYValue === '' ? 0 : parseFloat(saddleYValue);
        
        // If it's a manual bike, update brand/model/size
        if (bike.isManual) {
            bike.brand = card.querySelector('.brand-input').value || '';
            bike.model = card.querySelector('.model-input').value || '';
            bike.size = card.querySelector('.size-input').value || '';
        }
        
        // Update notes
        const notesTextarea = card.querySelector('.bike-notes');
        if (notesTextarea) {
            bike.notes = notesTextarea.value || '';
        }
        
        // Find the index of the bike in the array
        const bikeIndex = this.bikes.findIndex(b => b.id === bikeId);
        if (bikeIndex !== -1) {
            // Don't call updateCalculationsForBike here - let the debounced version handle it
            this.saveData(); // Save data after any bike update
            this.updateBikeVisualization(); // Update the visualization
        }
    }

    async updateCalculations() {
        // Update calculations for all bikes in parallel
        await Promise.all(this.bikes.map(bike => this.updateCalculationsForBike(bike.id)));
    }

    async updateCalculationsForBike(bikeId) {
        const bike = this.bikes.find(b => b.id === bikeId);
        if (!bike) return;
        
        const card = document.getElementById(bikeId);
        
        // Get saddle position from the bike card's saddle position fields
        const saddleX = parseFloat(card.querySelector('.saddle-x').value) || 0;
        const saddleY = parseFloat(card.querySelector('.saddle-y').value) || 0;
        
        // Get target positions from client info card
        const targetHandlebarX = parseFloat(document.getElementById('targetHandlebarX').value) || '';
        const targetHandlebarY = parseFloat(document.getElementById('targetHandlebarY').value) || '';
        const handlebarReachUsed = parseFloat(document.getElementById('handlebarReachUsed').value) || '';
        
        // Default values
        let handlebarX = '-- ';
        let handlebarY = '-- ';
        let barReachNeeded = '-- ';
        let handlebarXDiff = '';
        let handlebarYDiff = '';
        let setbackVsSTA = '--';
        let effectiveSTA = '--';
        let bbToRail = '--';
        let bbToSRC = '--';
        let exposedSeatpost = '--';

        try {
            // Call backend for calculations
            const result = await APIClient.callCalculator('position-simulator', {
                bike: {
                    reach: bike.reach,
                    stack: bike.stack,
                    hta: bike.hta,
                    sta: bike.sta,
                    stl: bike.stl,
                    stemLength: bike.stemLength,
                    stemAngle: bike.stemAngle,
                    spacersHeight: bike.spacersHeight,
                    stemHeight: bike.stemHeight,
                    headsetHeight: bike.headsetHeight
                },
                saddleX,
                saddleY,
                targetHandlebarX,
                targetHandlebarY,
                handlebarReachUsed,
                isSaddleValid: this.isSaddlePositionValid(saddleX, saddleY)
            });

            // Use results from backend
            handlebarX = result.handlebarX;
            handlebarY = result.handlebarY;
            barReachNeeded = result.barReachNeeded;
            handlebarXDiff = result.handlebarXDiff;
            handlebarYDiff = result.handlebarYDiff;
            setbackVsSTA = result.setbackVsSTA;
            effectiveSTA = result.effectiveSTA;
            bbToRail = result.bbToRail;
            bbToSRC = result.bbToSRC;
            exposedSeatpost = result.exposedSeatpost;
        } catch (error) {
            console.error('Backend calculation error:', error);
            // Keep default values on error
        }

        // Update display
        const hasHandlebarData = typeof handlebarX === 'number';
        if (hasHandlebarData) {
            card.querySelector('.handlebar-x').textContent = `${Math.round(handlebarX)} mm`;
            if (handlebarXDiff) {
                const xArrow = parseInt(handlebarXDiff) > 0 ? '→' : '←';
                card.querySelector('.handlebar-x').innerHTML = `${Math.round(handlebarX)} mm <span class="diff ${parseInt(handlebarXDiff) > 0 ? 'negative' : 'positive'}">(${handlebarXDiff} ${xArrow})</span>`;
            }
            
            card.querySelector('.handlebar-y').textContent = `${Math.round(handlebarY)} mm`;
            if (handlebarYDiff) {
                const yArrow = parseInt(handlebarYDiff) > 0 ? '↑' : '↓';
                card.querySelector('.handlebar-y').innerHTML = `${Math.round(handlebarY)} mm <span class="diff ${parseInt(handlebarYDiff) > 0 ? 'positive' : 'negative'}">(${handlebarYDiff} ${yArrow})</span>`;
            }
            
            card.querySelector('.bar-reach-needed').textContent = 
                (targetHandlebarX && handlebarReachUsed) ? `${barReachNeeded} mm` : '-- mm';
        } else {
            // If we don't have required geometry, display placeholder values
            card.querySelector('.handlebar-x').textContent = '-- mm';
            card.querySelector('.handlebar-y').textContent = '-- mm';
            card.querySelector('.bar-reach-needed').textContent = '-- mm';
        }
        
        card.querySelector('.setback-sta').textContent = 
            typeof setbackVsSTA === 'number' ? `${setbackVsSTA > 0 ? '+' : ''}${setbackVsSTA} mm` : setbackVsSTA;
        card.querySelector('.effective-sta').textContent = 
            effectiveSTA !== '--' ? `${effectiveSTA}°` : effectiveSTA;
        card.querySelector('.bb-rail').textContent = 
            bbToRail !== '--' ? `~${bbToRail} mm` : bbToRail;
        card.querySelector('.bb-src').textContent = 
            bbToSRC !== '--' ? `${bbToSRC} mm` : bbToSRC;
        card.querySelector('.exposed-seatpost').textContent = 
            exposedSeatpost !== '--' ? `${exposedSeatpost} mm` : exposedSeatpost;
        
        // Update the bike visualization after calculations
        this.updateBikeVisualization();
    }

    resetBike(bikeId) {
        const bike = this.bikes.find(b => b.id === bikeId);
        if (!bike) return;
        
        const card = document.getElementById(bikeId);
        
        // Reset to default values
        bike.reach = '';
        bike.stack = '';
        bike.hta = '';
        bike.sta = '';
        bike.stl = '';
        bike.stemLength = 100;
        bike.stemAngle = -6;
        bike.spacersHeight = 20;
        bike.headsetHeight = 10;
        bike.stemHeight = 40; // Default stem height
        bike.handlebarReach = 80;
        bike.saddleSetback = 0;
        bike.saddleHeight = 0;
        bike.saddleX = '';
        bike.saddleY = '';
        bike.notes = '';
        
        // Reset user modification flags
        bike._userModifiedStemHeight = false;
        bike._userModifiedStemLength = false;
        bike._userModifiedStemAngle = false;
        bike._userModifiedSpacersHeight = false;
        bike._userModifiedHeadsetHeight = false;
        
        // Reset stock values to defaults
        bike._stockStemHeight = 40;
        bike._stockStemLength = 100;
        bike._stockStemAngle = -6;
        bike._stockSpacersHeight = 20;
        bike._stockHeadsetHeight = 10;
        
        // Reset dropdown menus if not a manual bike
        if (!bike.isManual) {
            bike.brand = '';
            bike.model = '';
            bike.size = '';
            
            const brandSelect = card.querySelector('.brand-select');
            const modelSelect = card.querySelector('.model-select');
            const sizeSelect = card.querySelector('.size-select');
            
            brandSelect.value = '';
            modelSelect.innerHTML = '<option value="">Select Model</option>';
            sizeSelect.innerHTML = '<option value="">Select Size</option>';
            modelSelect.disabled = true;
            sizeSelect.disabled = true;
        } else {
            // For manual bikes, clear all fields
            bike.brand = '';
            bike.model = '';
            bike.size = '';
            
            card.querySelector('.brand-input').value = '';
            card.querySelector('.model-input').value = '';
            card.querySelector('.size-input').value = '';
        }
        
        // Update input fields
        card.querySelector('.reach').value = bike.reach;
        card.querySelector('.stack').value = bike.stack;
        card.querySelector('.hta').value = bike.hta;
        card.querySelector('.sta').value = bike.sta;
        card.querySelector('.stl').value = bike.stl;
        card.querySelector('.stem-length').value = bike.stemLength;
        card.querySelector('.stem-angle').value = bike.stemAngle;
        card.querySelector('.spacer-height').value = bike.spacersHeight;
        card.querySelector('.headset-height').value = bike.headsetHeight;
        card.querySelector('.stem-height').value = bike.stemHeight;
        card.querySelector('.saddle-x').value = bike.saddleX;
        card.querySelector('.saddle-y').value = bike.saddleY;
        
        // Remove highlighting from stem configuration fields
        card.querySelector('.stem-height').style.backgroundColor = '';
        card.querySelector('.stem-length').style.backgroundColor = '';
        card.querySelector('.stem-angle').style.backgroundColor = '';
        card.querySelector('.spacer-height').style.backgroundColor = '';
        card.querySelector('.headset-height').style.backgroundColor = '';
        
        // Clear notes
        const notesTextarea = card.querySelector('.bike-notes');
        if (notesTextarea) {
            notesTextarea.value = '';
        }
        
        // Clear results section
        card.querySelector('.handlebar-x').textContent = '-- mm';
        card.querySelector('.handlebar-y').textContent = '-- mm';
        card.querySelector('.bar-reach-needed').textContent = '-- mm';
        card.querySelector('.setback-sta').textContent = '-- mm';
        card.querySelector('.effective-sta').textContent = '-- °';
        card.querySelector('.bb-rail').textContent = '-- mm';
        card.querySelector('.bb-src').textContent = '-- mm';
        card.querySelector('.exposed-seatpost').textContent = '-- mm';
        
        // Find the index of the bike in the array
        const bikeIndex = this.bikes.findIndex(b => b.id === bikeId);
        if (bikeIndex !== -1) {
            this.updateCalculationsForBike(bikeId);
            this.saveData(); // Save data after reset
        }
    }

    deleteBike(bikeId) {
        const bikeIndex = this.bikes.findIndex(b => b.id === bikeId);
        if (bikeIndex === -1) return;
        
        // Remove from DOM
        const card = document.getElementById(bikeId);
        if (card) {
            card.remove();
        }
        
        // Remove from array
        this.bikes.splice(bikeIndex, 1);
        this.saveData(); // Save data after deletion
        
        // Re-enable add bike buttons
        if (this.updateAddBikeButtonStates) {
            this.updateAddBikeButtonStates();
        }
        
        // Adjust container width after removing a bike card
        this.adjustBikesContainerWidth();
        
        // Force canvas resize and redraw to adjust for removed bike card
        setTimeout(() => {
            this.forceCanvasResize();
            this.updateBikeVisualization();
            this.updateCanvasControlsVisibility();
        }, 100);
    }

    duplicateBike(bikeId) {
        const originalBike = this.bikes.find(b => b.id === bikeId);
        if (!originalBike) return;

        // Check if trying to duplicate a non-manual bike while not logged in
        if (!originalBike.isManual && !firebase.auth().currentUser) {
            this.showCustomAlert('Please log in to duplicate bikes from our database. You can duplicate bikes with manually input geometry data without logging in.');
            return;
        }

        // Create a deep copy of the bike data with a new ID
        const duplicatedBike = {
            ...JSON.parse(JSON.stringify(originalBike)),
            id: `bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        };
        
        // For non-logged in users, ensure duplicated bikes are manual
        if (!firebase.auth().currentUser && !duplicatedBike.isManual) {
            duplicatedBike.isManual = true;
            duplicatedBike.id = `manual-bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }

        // Find the index of the original bike
        const originalIndex = this.bikes.findIndex(b => b.id === bikeId);
        
        // Insert the duplicated bike after the original
        this.bikes.splice(originalIndex + 1, 0, duplicatedBike);
        
        // Render the new bike card
        this.renderBikeCard(duplicatedBike, originalIndex + 1);
        
        // Set values in the duplicated bike card
        const card = document.getElementById(duplicatedBike.id);
        if (card) {
            // Set geometry values
            card.querySelector('.reach').value = duplicatedBike.reach || '';
            card.querySelector('.stack').value = duplicatedBike.stack || '';
            card.querySelector('.hta').value = duplicatedBike.hta || '';
            card.querySelector('.sta').value = duplicatedBike.sta || '';
            card.querySelector('.stl').value = duplicatedBike.stl || '';
            
            // Set stem configuration values
            card.querySelector('.stem-height').value = duplicatedBike.stemHeight !== undefined && duplicatedBike.stemHeight !== '' ? duplicatedBike.stemHeight : 40;
            card.querySelector('.stem-length').value = duplicatedBike.stemLength || 100;
            card.querySelector('.stem-angle').value = duplicatedBike.stemAngle !== undefined && duplicatedBike.stemAngle !== '' ? duplicatedBike.stemAngle : -6;
            card.querySelector('.spacer-height').value = duplicatedBike.spacersHeight !== undefined && duplicatedBike.spacersHeight !== '' ? duplicatedBike.spacersHeight : 20;
            card.querySelector('.headset-height').value = duplicatedBike.headsetHeight !== undefined && duplicatedBike.headsetHeight !== '' ? duplicatedBike.headsetHeight : 10;
            
            // Apply highlighting for stock values if they exist (not null)
            if (duplicatedBike._stockStemHeight !== undefined && duplicatedBike._stockStemHeight !== null && duplicatedBike.stemHeight === duplicatedBike._stockStemHeight) {
                card.querySelector('.stem-height').style.backgroundColor = this.getHighlightColor();
            }
            if (duplicatedBike._stockStemLength !== undefined && duplicatedBike._stockStemLength !== null && duplicatedBike.stemLength === duplicatedBike._stockStemLength) {
                card.querySelector('.stem-length').style.backgroundColor = this.getHighlightColor();
            }
            if (duplicatedBike._stockStemAngle !== undefined && duplicatedBike._stockStemAngle !== null && duplicatedBike.stemAngle === duplicatedBike._stockStemAngle) {
                card.querySelector('.stem-angle').style.backgroundColor = this.getHighlightColor();
            }
            if (duplicatedBike._stockSpacersHeight !== undefined && duplicatedBike._stockSpacersHeight !== null && duplicatedBike.spacersHeight === duplicatedBike._stockSpacersHeight) {
                card.querySelector('.spacer-height').style.backgroundColor = this.getHighlightColor();
            }
            if (duplicatedBike._stockHeadsetHeight !== undefined && duplicatedBike._stockHeadsetHeight !== null && duplicatedBike.headsetHeight === duplicatedBike._stockHeadsetHeight) {
                card.querySelector('.headset-height').style.backgroundColor = this.getHighlightColor();
            }
            
            // Set notes
            const notesTextarea = card.querySelector('.bike-notes');
            if (notesTextarea) {
                notesTextarea.value = duplicatedBike.notes || '';
            }
            
            // For manual bikes, set the brand/model/size
            if (duplicatedBike.isManual) {
                const brandInput = card.querySelector('.brand-input');
                const modelInput = card.querySelector('.model-input');
                const sizeInput = card.querySelector('.size-input');
                
                if (brandInput) brandInput.value = duplicatedBike.brand || '';
                if (modelInput) modelInput.value = duplicatedBike.model || '';
                if (sizeInput) sizeInput.value = duplicatedBike.size || '';
            } else {
            this.setupBikeSelectors(duplicatedBike.id);
            }
        }
        
        // Update calculations and save
        this.updateCalculationsForBike(duplicatedBike.id);
        this.saveData();
        
        // Force canvas resize and redraw to adjust for duplicated bike card
        setTimeout(() => {
            this.forceCanvasResize();
            this.updateBikeVisualization();
            this.updateCanvasControlsVisibility();
        }, 100);
    }

    async setupBikeSelectors(bikeId) {
        const card = document.getElementById(bikeId);
        const brandSelect = card.querySelector('.brand-select');
        const modelSelect = card.querySelector('.model-select');
        const sizeSelect = card.querySelector('.size-select');
        const bike = this.bikes.find(b => b.id === bikeId);
        
        // Flag to prevent geometry fetching during initial setup
        let isInitialSetup = true;
        
        // Add login notice for non-logged-in users
        if (!firebase.auth().currentUser) {
            // Add a notice above the selectors but keep them functional
            const selectorContainer = card.querySelector('.bike-selector');
            if (selectorContainer) {
                // Remove any existing login notices to avoid duplicates
                const existingNotices = selectorContainer.querySelectorAll('.login-notice');
                existingNotices.forEach(notice => notice.remove());
                
                // Add a new login notice
                const loginNotice = document.createElement('div');
                loginNotice.className = 'login-notice';
                loginNotice.innerHTML = `<div>🔒 Please log in to view bike geometry and configure position</div>`;
                selectorContainer.insertBefore(loginNotice, selectorContainer.firstChild);
            }
        }

        // Populate brands
        const brands = await this.database.getBrands();
        brandSelect.innerHTML = '<option value="">Select Brand</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandSelect.appendChild(option);
        });

        // If we have saved brand data, restore it and its dependent selections
        if (bike.brand) {
            brandSelect.value = bike.brand;
            
            const models = await this.database.getModels(bike.brand);
            modelSelect.innerHTML = '<option value="">Select Model</option>';
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelSelect.appendChild(option);
            });
            modelSelect.disabled = false;

            if (bike.model) {
                modelSelect.value = bike.model;
                const sizes = await this.database.getSizes(bike.brand, bike.model);
                sizeSelect.innerHTML = '<option value="">Select Size</option>';
                sizes.forEach(size => {
                    const option = document.createElement('option');
                    option.value = size;
                    option.textContent = size;
                    sizeSelect.appendChild(option);
                });
                sizeSelect.disabled = false;

                if (bike.size) {
                    sizeSelect.value = bike.size;
                }
            }
        }

        // Setup change handlers
        brandSelect.addEventListener('change', async () => {
            modelSelect.innerHTML = '<option value="">Select Model</option>';
            sizeSelect.innerHTML = '<option value="">Select Size</option>';
            
            if (brandSelect.value) {
                const models = await this.database.getModels(brandSelect.value);
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    modelSelect.appendChild(option);
                });
                modelSelect.disabled = false;
                sizeSelect.disabled = true;
            } else {
                modelSelect.disabled = true;
                sizeSelect.disabled = true;
            }
            this.updateBikeData(bikeId);
        });

        modelSelect.addEventListener('change', async () => {
            sizeSelect.innerHTML = '<option value="">Select Size</option>';
            
            if (modelSelect.value) {
                const sizes = await this.database.getSizes(brandSelect.value, modelSelect.value);
                sizes.forEach(size => {
                    const option = document.createElement('option');
                    option.value = size;
                    option.textContent = size;
                    sizeSelect.appendChild(option);
                });
                sizeSelect.disabled = false;
            } else {
                sizeSelect.disabled = true;
            }
            this.updateBikeData(bikeId);
        });

        sizeSelect.addEventListener('change', async () => {
            // Update bike properties regardless of login status
            if (bike) {
                bike.brand = brandSelect.value;
                bike.model = modelSelect.value;
                bike.size = sizeSelect.value;
            }
            
            // Only fetch and display geometry data if logged in
            if (sizeSelect.value && firebase.auth().currentUser) {
                const geometry = await this.database.getBikeGeometry(
                    brandSelect.value,
                    modelSelect.value,
                    sizeSelect.value
                );
                
                if (geometry) {
                    if (bike) {
                        // Update bike properties directly
                        bike.reach = geometry.reach;
                        bike.stack = geometry.stack;
                        bike.hta = geometry.hta;
                        bike.sta = geometry.sta;
                        bike.stl = geometry.stl;
                        
                        // Update display
                        card.querySelector('.reach').value = geometry.reach;
                        card.querySelector('.stack').value = geometry.stack;
                        card.querySelector('.hta').value = geometry.hta;
                        card.querySelector('.sta').value = geometry.sta;
                        card.querySelector('.stl').value = geometry.stl;
                        
                        // Only apply stock values if this is not the initial setup (i.e., user is actively selecting a different bike)
                        if (!isInitialSetup) {
                            console.log('DEBUG: Applying stock values, geometry:', geometry);
                            // Apply stock values from the database
                            if (geometry.stemHeight !== null) {
                                bike.stemHeight = geometry.stemHeight;
                                card.querySelector('.stem-height').value = geometry.stemHeight;
                                // Store stock value for highlighting
                                bike._stockStemHeight = geometry.stemHeight;
                                // Highlight field as using stock value
                                card.querySelector('.stem-height').style.backgroundColor = this.getHighlightColor();
                            } else {
                                bike.stemHeight = 40; // Default value
                                card.querySelector('.stem-height').value = 40;
                                // Store stock value for highlighting (null means no stock value)
                                bike._stockStemHeight = null;
                                // No highlighting for default values
                                card.querySelector('.stem-height').style.backgroundColor = '';
                            }
                            if (geometry.stemLength !== null) {
                                bike.stemLength = geometry.stemLength;
                                card.querySelector('.stem-length').value = geometry.stemLength;
                                // Store stock value for highlighting
                                bike._stockStemLength = geometry.stemLength;
                                // Highlight field as using stock value
                                card.querySelector('.stem-length').style.backgroundColor = this.getHighlightColor();
                            } else {
                                bike.stemLength = 100; // Default value
                                card.querySelector('.stem-length').value = 100;
                                // Store stock value for highlighting (null means no stock value)
                                bike._stockStemLength = null;
                                // No highlighting for default values
                                card.querySelector('.stem-length').style.backgroundColor = '';
                            }
                            if (geometry.stemAngle !== null) {
                                bike.stemAngle = geometry.stemAngle;
                                card.querySelector('.stem-angle').value = geometry.stemAngle;
                                // Store stock value for highlighting
                                bike._stockStemAngle = geometry.stemAngle;
                                // Highlight field as using stock value
                                card.querySelector('.stem-angle').style.backgroundColor = this.getHighlightColor();
                            } else {
                                bike.stemAngle = -6; // Default value
                                card.querySelector('.stem-angle').value = -6;
                                // Store stock value for highlighting (null means no stock value)
                                bike._stockStemAngle = null;
                                // No highlighting for default values
                                card.querySelector('.stem-angle').style.backgroundColor = '';
                            }
                            if (geometry.spacersHeight !== null) {
                                bike.spacersHeight = geometry.spacersHeight;
                                card.querySelector('.spacer-height').value = geometry.spacersHeight;
                                // Store stock value for highlighting
                                bike._stockSpacersHeight = geometry.spacersHeight;
                                // Highlight field as using stock value
                                card.querySelector('.spacer-height').style.backgroundColor = this.getHighlightColor();
                            } else {
                                bike.spacersHeight = 20; // Default value
                                card.querySelector('.spacer-height').value = 20;
                                // Store stock value for highlighting (null means no stock value)
                                bike._stockSpacersHeight = null;
                                // No highlighting for default values
                                card.querySelector('.spacer-height').style.backgroundColor = '';
                            }
                            if (geometry.headsetHeight !== null) {
                                bike.headsetHeight = geometry.headsetHeight;
                                card.querySelector('.headset-height').value = geometry.headsetHeight;
                                // Store stock value for highlighting
                                bike._stockHeadsetHeight = geometry.headsetHeight;
                                // Highlight field as using stock value
                                card.querySelector('.headset-height').style.backgroundColor = this.getHighlightColor();
                            } else {
                                bike.headsetHeight = 10; // Default value
                                card.querySelector('.headset-height').value = 10;
                                // Store stock value for highlighting (null means no stock value)
                                bike._stockHeadsetHeight = null;
                                // No highlighting for default values
                                card.querySelector('.headset-height').style.backgroundColor = '';
                            }
                            
                            // Reset user modification flags since we're applying stock values
                            bike._userModifiedStemHeight = false;
                            bike._userModifiedStemLength = false;
                            bike._userModifiedStemAngle = false;
                            bike._userModifiedSpacersHeight = false;
                            bike._userModifiedHeadsetHeight = false;
                        }
                        

                        
                        // Update calculations for this bike only
                        this.updateCalculationsForBike(bikeId);
                        
                        // Save the updated data
                        this.saveData();
                    }
                }
            } else if (sizeSelect.value && !firebase.auth().currentUser) {
                // Show a login prompt in the geometry fields if not logged in
                card.querySelector('.reach').value = '';
                card.querySelector('.stack').value = '';
                card.querySelector('.hta').value = '';
                card.querySelector('.sta').value = '';
                card.querySelector('.stl').value = '';
                
                // Add placeholder in the first field to prompt login
                card.querySelector('.reach').placeholder = "Please";
                card.querySelector('.stack').placeholder = "log in";
                card.querySelector('.hta').placeholder = "to";
                card.querySelector('.sta').placeholder = "view";
                card.querySelector('.stl').placeholder = "geo";
            }
        });
        
        // Mark initial setup as complete - now geometry fetching will apply stock values
        isInitialSetup = false;
    }

    saveData() {
        const data = {
            sessionTimestamp: sessionStorage.getItem('xyCalculatorSession'),
            clientName: document.getElementById('clientName').value,
            clientNotes: document.getElementById('clientNotes').value,
            // Add component notes
            saddleNotes: document.getElementById('saddleNotes')?.value || '',
            handlebarNotes: document.getElementById('handlebarNotes')?.value || '',
            crankLengthNotes: document.getElementById('crankLengthNotes')?.value || '',
            drivetrainNotes: document.getElementById('drivetrainNotes')?.value || '',
            targetSaddleX: document.getElementById('targetSaddleX').value,
            targetSaddleY: document.getElementById('targetSaddleY').value,
            targetHandlebarX: document.getElementById('targetHandlebarX').value,
            targetHandlebarY: document.getElementById('targetHandlebarY').value,
            handlebarReachUsed: document.getElementById('handlebarReachUsed').value,
            bikes: this.bikes.map(bike => {
                // Create a deep copy of the bike object to ensure all properties are saved
                return {
                    ...bike,
                    // Ensure these properties are explicitly saved
                    reach: bike.reach || '',
                    stack: bike.stack || '',
                    hta: bike.hta || '',
                    sta: bike.sta || '',
                    stl: bike.stl || '',
                    stemHeight: bike.stemHeight !== undefined && bike.stemHeight !== '' ? bike.stemHeight : 40,
                    stemLength: bike.stemLength || 100,
                    stemAngle: bike.stemAngle !== undefined && bike.stemAngle !== '' ? bike.stemAngle : -6,
                    spacersHeight: bike.spacersHeight !== undefined && bike.spacersHeight !== '' ? bike.spacersHeight : 20,
                    headsetHeight: bike.headsetHeight !== undefined && bike.headsetHeight !== '' ? bike.headsetHeight : 10,
                    // Save user modification flags
                    _userModifiedStemHeight: bike._userModifiedStemHeight || false,
                    _userModifiedStemLength: bike._userModifiedStemLength || false,
                    _userModifiedStemAngle: bike._userModifiedStemAngle || false,
                    _userModifiedSpacersHeight: bike._userModifiedSpacersHeight || false,
                    _userModifiedHeadsetHeight: bike._userModifiedHeadsetHeight || false,
                    // Save stock values for highlighting
                    _stockStemHeight: bike._stockStemHeight,
                    _stockStemLength: bike._stockStemLength,
                    _stockStemAngle: bike._stockStemAngle,
                    _stockSpacersHeight: bike._stockSpacersHeight,
                    _stockHeadsetHeight: bike._stockHeadsetHeight,
                    handlebarReach: bike.handlebarReach || 80,
                    saddleSetback: bike.saddleSetback || 0,
                    saddleHeight: bike.saddleHeight || 0,
                    saddleX: bike.saddleX || 0,
                    saddleY: bike.saddleY || 0,
                    notes: bike.notes || ''
                };
            })
        };
        localStorage.setItem('fullBikeCalculatorData', JSON.stringify(data));
    }

    loadSavedData() {
        console.log('loadSavedData called');
        // Clear stem selections so all checkboxes are selected by default
        localStorage.removeItem('xyStemSelections');
        window.xyStemSelections = {}; // Also clear in-memory selection state
        const savedData = localStorage.getItem('fullBikeCalculatorData');
        console.log('Saved data from localStorage:', savedData);
        
        if (!savedData) {
            console.log('No saved data found, starting with default bikes');
            this.startWithDefaultBikes();
            return;
        }
        
        try {
            const data = JSON.parse(savedData);
            
            // Validate that we have valid data
            if (!data || typeof data !== 'object') {
                console.log('Invalid saved data format, starting with default bikes');
                this.startWithDefaultBikes();
                return;
            }
            
            // Clear existing bikes
            document.getElementById('bikes-container').innerHTML = '';
            this.bikes = [];
            
            // Set target positions
            document.getElementById('clientName').value = data.clientName || '';
            document.getElementById('clientNotes').value = data.clientNotes || '';
            // Load component notes
            if (document.getElementById('saddleNotes')) {
                document.getElementById('saddleNotes').value = data.saddleNotes || '';
            }
            if (document.getElementById('handlebarNotes')) {
                document.getElementById('handlebarNotes').value = data.handlebarNotes || '';
            }
            if (document.getElementById('crankLengthNotes')) {
                document.getElementById('crankLengthNotes').value = data.crankLengthNotes || '';
            }
            if (document.getElementById('drivetrainNotes')) {
                document.getElementById('drivetrainNotes').value = data.drivetrainNotes || '';
            }
            document.getElementById('targetSaddleX').value = data.targetSaddleX || '';
            document.getElementById('targetSaddleY').value = data.targetSaddleY || '';
            document.getElementById('targetHandlebarX').value = data.targetHandlebarX || '';
            document.getElementById('targetHandlebarY').value = data.targetHandlebarY || '';
            document.getElementById('handlebarReachUsed').value = data.handlebarReachUsed || '';
            
            // Check if user is logged in
            const isLoggedIn = firebase.auth().currentUser !== null;
            
            // Load bikes
            if (data.bikes && Array.isArray(data.bikes) && data.bikes.length > 0) {
                // For non-logged in users, clear isDisabled property if it exists
                if (!isLoggedIn) {
                    data.bikes = data.bikes.map(bike => {
                        if (bike.isDisabled) {
                            const newBike = {...bike};
                            delete newBike.isDisabled;
                            return newBike;
                        }
                        return bike;
                    });
                }
                
                // Load all bikes regardless of login status
                const bikesToLoad = data.bikes;
                
                bikesToLoad.forEach((bikeData, index) => {
                    this.bikes.push(bikeData);
                    this.renderBikeCard(bikeData, index);
                    
                    // Get the card element
                    const card = document.getElementById(bikeData.id);
                    
                    // Explicitly set the geometry values in the input fields
                    if (card) {
                        // Set geometry values
                        card.querySelector('.reach').value = bikeData.reach || '';
                        card.querySelector('.stack').value = bikeData.stack || '';
                        card.querySelector('.hta').value = bikeData.hta || '';
                        card.querySelector('.sta').value = bikeData.sta || '';
                        card.querySelector('.stl').value = bikeData.stl || '';
                        
                        // Set stem configuration values
                        card.querySelector('.stem-height').value = bikeData.stemHeight !== undefined && bikeData.stemHeight !== '' ? bikeData.stemHeight : 40;
                        card.querySelector('.stem-length').value = bikeData.stemLength || 100;
                        card.querySelector('.stem-angle').value = bikeData.stemAngle !== undefined && bikeData.stemAngle !== '' ? bikeData.stemAngle : -6;
                        card.querySelector('.spacer-height').value = bikeData.spacersHeight !== undefined && bikeData.spacersHeight !== '' ? bikeData.spacersHeight : 20;
                        card.querySelector('.headset-height').value = bikeData.headsetHeight !== undefined && bikeData.headsetHeight !== '' ? bikeData.headsetHeight : 10;
                        
                        // Set user modification flags
                        bikeData._userModifiedStemHeight = bikeData._userModifiedStemHeight || false;
                        bikeData._userModifiedStemLength = bikeData._userModifiedStemLength || false;
                        bikeData._userModifiedStemAngle = bikeData._userModifiedStemAngle || false;
                        bikeData._userModifiedSpacersHeight = bikeData._userModifiedSpacersHeight || false;
                        bikeData._userModifiedHeadsetHeight = bikeData._userModifiedHeadsetHeight || false;
                        
                        // Apply highlighting for stock values if they exist (not null)
                        if (bikeData._stockStemHeight !== undefined && bikeData._stockStemHeight !== null && bikeData.stemHeight === bikeData._stockStemHeight) {
                            card.querySelector('.stem-height').style.backgroundColor = this.getHighlightColor();
                        }
                        if (bikeData._stockStemLength !== undefined && bikeData._stockStemLength !== null && bikeData.stemLength === bikeData._stockStemLength) {
                            card.querySelector('.stem-length').style.backgroundColor = this.getHighlightColor();
                        }
                        if (bikeData._stockStemAngle !== undefined && bikeData._stockStemAngle !== null && bikeData.stemAngle === bikeData._stockStemAngle) {
                            card.querySelector('.stem-angle').style.backgroundColor = this.getHighlightColor();
                        }
                        if (bikeData._stockSpacersHeight !== undefined && bikeData._stockSpacersHeight !== null && bikeData.spacersHeight === bikeData._stockSpacersHeight) {
                            card.querySelector('.spacer-height').style.backgroundColor = this.getHighlightColor();
                        }
                        if (bikeData._stockHeadsetHeight !== undefined && bikeData._stockHeadsetHeight !== null && bikeData.headsetHeight === bikeData._stockHeadsetHeight) {
                            card.querySelector('.headset-height').style.backgroundColor = this.getHighlightColor();
                        }
                        
                        // Set saddle position values
                        card.querySelector('.saddle-x').value = bikeData.saddleX || 0;
                        card.querySelector('.saddle-y').value = bikeData.saddleY || 0;
                        
                        // For manual bikes, also set the brand/model/size
                        if (bikeData.isManual) {
                            const brandInput = card.querySelector('.brand-input');
                            const modelInput = card.querySelector('.model-input');
                            const sizeInput = card.querySelector('.size-input');
                            
                            if (brandInput) brandInput.value = bikeData.brand || '';
                            if (modelInput) modelInput.value = bikeData.model || '';
                            if (sizeInput) sizeInput.value = bikeData.size || '';
                        }
                    }
                    
                    // Setup bike selectors for database bikes
                    if (!bikeData.isManual) {
                        // Add a delay to ensure the bike data is fully loaded and database is ready
                        setTimeout(() => {
                            try {
                                this.setupBikeSelectors(bikeData.id);
                            } catch (error) {
                                console.error('Failed to setup bike selectors:', error);
                                // If setup fails, try again later
                                setTimeout(() => {
                                    try {
                                        this.setupBikeSelectors(bikeData.id);
                                    } catch (retryError) {
                                        console.error('Retry failed to setup bike selectors:', retryError);
                                    }
                                }, 1000);
                            }
                        }, 100);
                    }
                });
                
                console.log(`Successfully loaded ${bikesToLoad.length} bikes from saved data`);
                this.updateCalculations();
            } else {
                console.log('No valid bikes in saved data, starting with default bikes');
                this.startWithDefaultBikes();
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
            // In case of error, start with default bikes but ensure only one
            if (this.bikes.length === 0) {
                this.startWithDefaultBikes();
            }
        }
        
        // Ensure legend checkboxes reset after DOM updates
        setTimeout(() => {
            localStorage.removeItem('xyStemSelections');
        }, 0);
        
        // Update the visualization if there's sufficient data
        if (this.bikes.length > 0) {
            const bike = this.bikes[0];
            const saddleX = bike.saddleX || 0;
            const saddleY = bike.saddleY || 0;
            const hasFrameGeometry = bike.reach && bike.stack && bike.hta;
            
            // Update visualization if we have either saddle position OR bike frame geometry
            if (saddleX || saddleY || hasFrameGeometry) {
                // Add a small delay to ensure DOM and canvas are ready
                setTimeout(() => {
                    this.updateBikeVisualization();
                }, 100);
            }
        }
    }

    printBikeData() {
        // Check if there are any bikes to print
        if (this.bikes.length === 0) {
            this.showCustomAlert('No bike data to print.');
            return;
        }
        
        // Get client information
        const clientName = document.getElementById('clientName').value.trim() || '';
        const clientNotes = document.getElementById('clientNotes').value.trim() || '';
        
        // Get target positions
        const targetSaddleX = document.getElementById('targetSaddleX').value || '-';
        const targetSaddleY = document.getElementById('targetSaddleY').value || '-';
        const targetHandlebarX = document.getElementById('targetHandlebarX').value || '-';
        const targetHandlebarY = document.getElementById('targetHandlebarY').value || '-';
        const handlebarReachUsed = document.getElementById('handlebarReachUsed').value || '-';
        
        // Get component notes
        const saddleNotes = document.getElementById('saddleNotes').value.trim() || '&nbsp;';
        const handlebarNotes = document.getElementById('handlebarNotes').value.trim() || '&nbsp;';
        const crankLengthNotes = document.getElementById('crankLengthNotes').value.trim() || '&nbsp;';
        const drivetrainNotes = document.getElementById('drivetrainNotes').value.trim() || '&nbsp;';
        
        // Check if any target positions are provided
        const hasTargetPositions = 
            targetSaddleX !== 'N/A' || 
            targetSaddleY !== 'N/A' || 
            targetHandlebarX !== 'N/A' || 
            targetHandlebarY !== 'N/A' || 
            handlebarReachUsed !== 'N/A';
            
        // Check if any component notes are provided
        const hasComponentNotes = 
            saddleNotes !== 'N/A' || 
            handlebarNotes !== 'N/A' || 
            crankLengthNotes !== 'N/A' || 
            drivetrainNotes !== 'N/A';
        
        // Get user's name from Firebase auth
        const user = firebase.auth().currentUser;
        let byLine = '';
        if (!user) {
            byLine = ' by Anonymous';
        } else if (user.displayName) {
            byLine = ` by ${user.displayName}`;
        }
        // The byLine will be empty if user is logged in but has no display name
        
        // Create a temporary print container
        const printContainer = document.createElement('div');
        printContainer.className = 'print-container';
        printContainer.style.display = 'none';
        document.body.appendChild(printContainer);
        
        // Add print-specific styles
        const printStyles = document.createElement('style');
        printStyles.textContent = `
            @media print {
                .print-container {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                }
            }
        `;
        document.head.appendChild(printStyles);
        
        // Create a header section
        const headerSection = document.createElement('div');
        headerSection.innerHTML = `
            <div style="margin-bottom: 0px; text-align: center;">
                <h1 style="margin-bottom: 0px;margin-top: 0px;">XY Position Calculator</h1>
                <h4 style="margin-bottom: 20px;margin-top: 0px;">www.xybikecalc.com</h4>
                <p style="margin-bottom: 20px;">Generated on ${new Date().toLocaleDateString()}${byLine}</p>
            </div>
        `;
        printContainer.appendChild(headerSection);
        
        // Create client information section with two columns
        const clientInfoSection = document.createElement('div');
        clientInfoSection.style.cssText = 'display: flex; gap: 20px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap;';
        
        // Client Info box (new left column)
        const clientInfoBox = document.createElement('div');
        clientInfoBox.style.cssText = 'flex: 1; max-width: 300px; min-width: 250px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #ffffff;';
        
        clientInfoBox.innerHTML = `
            <h2 style="margin: 0 0 5px 0; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Rider Info</h2>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                ${clientName !== '' ? `
                <div>
                    <div style="font-weight: bold; margin-bottom: 3px;">Name:</div>
                    <div style="padding: 5px; background-color: #f8f8f8; border-radius: 4px;">${clientName}</div>
                </div>
                ` : ''}
                ${clientNotes !== '' ? `
                <div>
                    <div style="font-weight: bold; margin-bottom: 3px;">Fit Notes:</div>
                    <div style="padding: 5px; background-color: #f8f8f8; border-radius: 4px; white-space: pre-wrap; line-height: 1.4; word-wrap: break-word;">${clientNotes}</div>
                </div>
                ` : ''}
            </div>
        `;
        
        clientInfoSection.appendChild(clientInfoBox);
        
        // Target Position box (modified to narrower single-column format)
        if (hasTargetPositions) {
            const targetPositionBox = document.createElement('div');
            targetPositionBox.style.cssText = 'flex: 1; max-width: 200px; min-width: 200px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #ffffff;';
            
            targetPositionBox.innerHTML = `
                <h2 style="margin: 0 0 5px 0; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Target Position</h2>
                
                <div style="margin-bottom: 10px;">
                    <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #444; text-align: left;">Saddle</h3>
                    <div style="display: grid; grid-template-columns: 30px 1fr; gap: 0px; margin-left: 15px;">
                        <div style="text-align: left; font-weight: bold;">X:</div>
                        <div style="text-align: left;">${targetSaddleX} mm</div>
                        <div style="text-align: left; font-weight: bold;">Y:</div>
                        <div style="text-align: left;">${targetSaddleY} mm</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #444; text-align: left;">Handlebar</h3>
                    <div style="display: grid; grid-template-columns: 30px 1fr; gap: 0px; margin-left: 15px;">
                        <div style="text-align: left; font-weight: bold;">X:</div>
                        <div style="text-align: left;">${targetHandlebarX} mm</div>
                        <div style="text-align: left; font-weight: bold;">Y:</div>
                        <div style="text-align: left;">${targetHandlebarY} mm</div>
                    </div>
                </div>
                
                <div style="margin-top: 5px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Bar Reach Used:</div>
                    <div style="margin-left: 45px;">${handlebarReachUsed} mm</div>
                </div>
            `;
            
            clientInfoSection.appendChild(targetPositionBox);
        }
        
        // Component Notes box
        if (hasComponentNotes) {
            const componentNotesBox = document.createElement('div');
            componentNotesBox.style.cssText = 'flex: 1; max-width: 300px; min-width: 250px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #ffffff;';
            
            componentNotesBox.innerHTML = `
                <h2 style="margin: 0 0 5px 0; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Component Notes</h2>
                <div style="display: grid; grid-template-columns: 1fr; gap: 3px;">
                    ${saddleNotes !== 'N/A' ? `
                    <div>
                        <div style="font-weight: bold;">Saddle:</div>
                        <div style="padding: 5px; background-color: #f8f8f8; border-radius: 4px;">${saddleNotes}</div>
                    </div>
                    ` : ''}
                    
                    ${handlebarNotes !== 'N/A' ? `
                    <div>
                        <div style="font-weight: bold;">Handlebar:</div>
                        <div style="padding: 5px; background-color: #f8f8f8; border-radius: 4px;">${handlebarNotes}</div>
                    </div>
                    ` : ''}
                    
                    ${crankLengthNotes !== 'N/A' ? `
                    <div>
                        <div style="font-weight: bold;">Crank Length:</div>
                        <div style="padding: 5px; background-color: #f8f8f8; border-radius: 4px;">${crankLengthNotes}</div>
                    </div>
                    ` : ''}
                    
                    ${drivetrainNotes !== 'N/A' ? `
                    <div>
                        <div style="font-weight: bold;">Drivetrain:</div>
                        <div style="padding: 5px; background-color: #f8f8f8; border-radius: 4px;">${drivetrainNotes}</div>
                    </div>
                    ` : ''}
                </div>
            `;
            
            clientInfoSection.appendChild(componentNotesBox);
        }
        
        // Only add the client info section if any information is available
        printContainer.appendChild(clientInfoSection);

        
        
        // Create bike recommendations section
        const bikesHeader = document.createElement('div');
        bikesHeader.style.cssText = 'page-break-before: always; break-before: page;'; // Add page break
        bikesHeader.innerHTML = `
            <h2 style="margin: 0px 0 15px 0; text-align: center; color: #333;">Bike Recommendations</h2>
        `;
        printContainer.appendChild(bikesHeader);
        
        // Add bike data section
        const bikesSection = document.createElement('div');
        bikesSection.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;';
        
        // Get all bike cards with data
        const bikeCards = document.querySelectorAll('.bike-card');
        let hasBikeData = false;
        
        bikeCards.forEach((card, index) => {
            // Skip empty or placeholder cards
            if (card.classList.contains('bike-card-placeholder')) return;
            
            // Check if the card has the required geometry data (stack, reach, and head tube angle)
            const reachInput = card.querySelector('.reach');
            const stackInput = card.querySelector('.stack');
            const htaInput = card.querySelector('.hta');
            
            const hasReach = reachInput && reachInput.value && reachInput.value.trim() !== '';
            const hasStack = stackInput && stackInput.value && stackInput.value.trim() !== '';
            const hasHta = htaInput && htaInput.value && htaInput.value.trim() !== '';
            
            // Skip cards without required geometry
            if (!hasReach || !hasStack || !hasHta) return;
            
            // Get bike name - construct from brand, model, and size if available
            let bikeName = '';
            let isManual = false;
            
            // For manual bikes, get values from input fields
            if (card.querySelector('.manual-inputs')) {
                isManual = true;
                const brandInput = card.querySelector('.brand-input');
                const modelInput = card.querySelector('.model-input');
                const sizeInput = card.querySelector('.size-input');
                
                const brand = brandInput && brandInput.value ? brandInput.value.trim() : '';
                const model = modelInput && modelInput.value ? modelInput.value.trim() : '';
                const size = sizeInput && sizeInput.value ? sizeInput.value.trim() : '';
                
                if (brand || model || size) {
                    bikeName = [brand, model, size].filter(Boolean).join(' ');
                    if (brand && (model || size)) {
                        bikeName = brand + ' ' + [model, size].filter(Boolean).join(' - ');
                    }
                }
            } 
            // For database bikes, get values from selectors
            else if (card.querySelector('.bike-selector')) {
                const brandSelect = card.querySelector('.brand-select');
                const modelSelect = card.querySelector('.model-select');
                const sizeSelect = card.querySelector('.size-select');
                
                const brand = brandSelect && brandSelect.value ? brandSelect.value : '';
                const model = modelSelect && modelSelect.value ? modelSelect.value : '';
                const size = sizeSelect && sizeSelect.value ? sizeSelect.value : '';
                
                if (brand || model || size) {
                    bikeName = [brand, model, size].filter(Boolean).join(' ');
                    if (brand && (model || size)) {
                        bikeName = brand + ' ' + [model, size].filter(Boolean).join(' - ');
                    }
                }
            }
            
            // If we couldn't construct a name, use a default
            if (!bikeName) {
                bikeName = `Bike ${index + 1}`;
            }
            
            // Get geometry data
            const geometrySection = card.querySelector('.geometry-section');
            let geometryData = '';
            if (geometrySection) {
                geometryData = '<div style="display: grid; grid-template-columns: 1fr 0.5fr; gap: 4px 2px;">';
                const geometryInputs = geometrySection.querySelectorAll('.input-group');
                geometryInputs.forEach(group => {
                    const label = group.querySelector('label')?.textContent || '';
                    const value = group.querySelector('input')?.value || '--';
                    const unit = group.querySelector('span')?.textContent || '';
                    if (label && value) {
                        geometryData += `
                            <div style="text-align: left; font-size: 13px;">${label}</div>
                            <div style="text-align: right; font-size: 13px; font-weight: 500;">${value}${unit}</div>
                        `;
                    }
                });
                geometryData += '</div>';
            }
            
            // Helper function to clean label/value text by removing tooltips
            const cleanTooltipText = (element) => {
                if (!element) return '';
                
                // For label elements with tooltips
                if (element.classList && element.classList.contains('tooltip')) {
                    // Just get the text node, not the tooltip span
                    return element.childNodes[0].textContent.trim();
                }
                
                // For other elements, just get the text content
                return element.textContent || '';
            };
            
            // Get stem data
            const stemSection = card.querySelector('.stem-section');
            let stemData = '';
            if (stemSection) {
                stemData = '<div style="display: grid; grid-template-columns: 1fr 0.5fr; gap: 4px 2px;">';
                const stemInputs = stemSection.querySelectorAll('.input-group');
                stemInputs.forEach(group => {
                    // Get the original label element
                    const labelElement = group.querySelector('label');
                    
                    // Create a clean label text without tooltip content
                    let label = cleanTooltipText(labelElement);
                    
                    // Get the value and unit correctly
                    const inputElement = group.querySelector('input');
                    const value = inputElement?.value || 'N/A';
                    const unitElement = group.querySelector('span:not(.tooltip-text)'); // Exclude tooltip spans
                    const unit = unitElement?.textContent || '';
                    
                    if (label && value) {
                        stemData += `
                            <div style="text-align: left; font-size: 13px;">${label}</div>
                            <div style="text-align: right; font-size: 13px; font-weight: 500;">${value}${unit}</div>
                        `;
                    }
                });
                stemData += '</div>';
            }
            
            // Get notes data
            const notesSection = card.querySelector('.notes-section');
            let notesData = '';
            if (notesSection) {
                const notesTextarea = notesSection.querySelector('.bike-notes');
                const notes = notesTextarea?.value?.trim() || '';
                if (notes) {
                    notesData = `
                        <div style="margin-top: 8px; padding: 6px; background-color: #f8f8f8; border-radius: 4px;">
                            <div style="font-weight: bold; font-size: 12px; margin-bottom: 3px; color: #333;text-align: center;border-bottom: 1px solid #ddd;padding-bottom: 3px;">Notes</div>
                            <div style="font-size: 12px; line-height: 1.4; color: #222; white-space: pre-wrap; min-height: 16px; word-wrap: break-word;">${notes}</div>
                        </div>
                    `;
                }
            }
            
            // Get results data
            const resultsSection = card.querySelector('.results-section');
            let resultsData = '';
            if (resultsSection) {
                    resultsData = '<div style="display: grid; grid-template-columns: 0.95fr 0.8fr; gap: 2px 2px;">';
                const resultGroups = resultsSection.querySelectorAll('.result-group');
                resultGroups.forEach(group => {
                    // Get the original label element
                    const labelElement = group.querySelector('label');
                    
                    // Create a clean label text without tooltip content
                    let label = cleanTooltipText(labelElement);
                    
                    const valueSpan = group.querySelector('span:not(.tooltip-text)'); // Exclude tooltip spans
                    const value = valueSpan?.textContent || 'N/A';
                    
                    // Special handling for handlebar X and Y to show differences with arrows
                    if (label === 'Handlebar X:' && targetHandlebarX !== 'N/A' && value !== '-- mm') {
                        const actualValue = parseInt(value);
                        if (!isNaN(actualValue)) {
                            const targetValue = parseInt(targetHandlebarX);
                            const diff = actualValue - targetValue;
                            
                            if (Math.abs(diff) >= 1) {
                                let diffText = '';
                                if (diff > 0) {
                                    diffText = `<div style="text-align: right; font-size: 12px; color: #FF3B30;">→ ${diff}mm longer</div>`;
                                } else if (diff < 0) {
                                    diffText = `<div style="text-align: right; font-size: 12px; color: #007AFF;">← ${Math.abs(diff)}mm shorter</div>`;
                                }
                                
                                resultsData += `
                                    <div style="text-align: left; font-size: 13px;">${label}</div>
                                    <div style="text-align: right; font-size: 13px; font-weight: 600;">${actualValue} mm</div>
                                    <div></div>${diffText}
                                `;
                            } else {
                                resultsData += `
                                    <div style="text-align: left; font-size: 13px;">${label}</div>
                                    <div style="text-align: right; font-size: 13px; font-weight: 600;">${actualValue} mm</div>
                                `;
                            }
                        } else {
                            resultsData += `
                                <div style="text-align: left; font-size: 13px;">${label}</div>
                                <div style="text-align: right; font-size: 13px; font-weight: 600;">${value}</div>
                            `;
                        }
                    } 
                    else if (label === 'Handlebar Y:' && targetHandlebarY !== 'N/A' && value !== '-- mm') {
                        const actualValue = parseInt(value);
                        if (!isNaN(actualValue)) {
                            const targetValue = parseInt(targetHandlebarY);
                            const diff = actualValue - targetValue;
                            
                            if (Math.abs(diff) >= 1) {
                                let diffText = '';
                                if (diff > 0) {
                                    diffText = `<div style="text-align: right; font-size: 12px; color: #007AFF;">↑ ${diff}mm higher</div>`;
                                } else if (diff < 0) {
                                    diffText = `<div style="text-align: right; font-size: 12px; color: #FF3B30;">↓ ${Math.abs(diff)}mm lower</div>`;
                                }
                                
                                resultsData += `
                                    <div style="text-align: left; font-size: 13px;">${label}</div>
                                    <div style="text-align: right; font-size: 13px; font-weight: 600;">${actualValue} mm</div>
                                    <div></div>${diffText}
                                `;
                            } else {
                                resultsData += `
                                    <div style="text-align: left; font-size: 13px;">${label}</div>
                                    <div style="text-align: right; font-size: 13px; font-weight: 600;">${actualValue} mm</div>
                                `;
                            }
                        } else {
                            resultsData += `
                                <div style="text-align: left; font-size: 13px;">${label}</div>
                                <div style="text-align: right; font-size: 13px; font-weight: 600;">${value}</div>
                            `;
                        }
                    }
                    else {
                        // For all other result values
                        let fontSize = '14px';
                        let fontWeight = '500';
                        
                        // Use larger fonts for position-related values
                        if (label.includes('Saddle') || label.includes('Handlebar')) {
                            fontSize = '14px';
                            fontWeight = '600';
                        }
                        
                        // Check if this is Bar Reach Needed (which needs a divider after it)
                        if (label === 'Bar Reach Needed:') {
                            resultsData += `
                                <div style="text-align: left; font-size: 13px;">${label}</div>
                                <div style="text-align: right; font-size: ${fontSize}; font-weight: ${fontWeight};">${value}</div>
                                <div style="grid-column: 1 / span 2; height: 4px; border-bottom: 0.5px solid #ddd; margin-bottom: 4px;"></div>
                            `;
                        } else {
                            resultsData += `
                                <div style="text-align: left; font-size: 13px;">${label}</div>
                                <div style="text-align: right; font-size: ${fontSize}; font-weight: ${fontWeight};">${value}</div>
                            `;
                        }
                    }
                });
                resultsData += '</div>';
            }
            
            // Only add cards that have some data
            if (geometryData || stemData || resultsData) {
                hasBikeData = true;
                
                // Create bike card for print - using vertical column layout
                const bikeCard = document.createElement('div');
                bikeCard.style.cssText = 'width: 220px; margin-bottom: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; page-break-inside: avoid; display: flex; flex-direction: column; background-color: #ffffff;';
                bikeCard.innerHTML = `
                    <h3 style="margin: 0 0 6px 0; font-size: 14px; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 6px;">${bikeName}</h3>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${geometryData ? `
                            <div>
                                <h4 style="margin: 4px 0 4px 0; font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 2px;text-align: center;">Geometry</h4>
                                <div style="line-height: 1.2;">${geometryData}</div>
                            </div>
                        ` : ''}
                        
                        ${stemData ? `
                            <div>
                                <h4 style="margin: 4px 0 4px 0; font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 2px;text-align: center;">Stem</h4>
                                <div style="line-height: 1.2;">${stemData}</div>
                            </div>
                        ` : ''}
                        
                        ${resultsData ? `
                            <div>
                                <h4 style="margin: 4px 0 4px 0; font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 2px;text-align: center;">Results</h4>
                                <div style="line-height: 1.2;">${resultsData}</div>
                            </div>
                        ` : ''}
                        
                        ${notesData ? `
                            <div>
                                <div style="line-height: 1.2;">${notesData}</div>
                            </div>
                        ` : ''}
                    </div>
                `;
                
                bikesSection.appendChild(bikeCard);
            }
        });
        
        if (!hasBikeData) {
            bikesSection.innerHTML += '<p>No bike data available with complete geometry (stack, reach, and head tube angle).</p>';
        }
        
        printContainer.appendChild(bikesSection);
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Create the footer content
        const footerContent = `${clientName} - Saddle X/Y: ${targetSaddleX}/${targetSaddleY} - Handlebar X/Y: ${targetHandlebarX}/${targetHandlebarY} - Bar Reach Used: ${handlebarReachUsed}`;
        
        // Write content to the new window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>XY Bike Calculator - ${clientName}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.4;
                        color: #333;
                        padding: 0px;
                        max-width: 1200px;
                        margin: 0 auto;
                        background-color: #f5f5f5;
                    }
                    h1 {
                        color: #333;
                        font-size: 28px;
                        margin-bottom: 10px;
                    }
                    h2 {
                        color: #444;
                        font-size: 22px;
                        margin: 0px 0 15px;
                        padding-bottom: 5px;
                        border-bottom: 1px solid #ddd;
                    }
                    h3 {
                        color: #555;
                        font-size: 18px;
                        margin: 15px 0 10px;
                    }
                    h4 {
                        color: #666;
                        font-size: 16px;
                        margin: 0px 0 5px;
                    }
                    p {
                        margin: 5px 0;
                    }
                    .print-button {
                        background-color: #5856D6;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 8px 16px;
                        font-size: 14px;
                        cursor: pointer;
                        margin: 30px auto;
                        display: block;
                    }
                    .print-button:hover {
                        opacity: 0.9;
                    }
                    .header-logo {
                        text-align: center;
                        font-size: 16px;
                        color: #777;
                        margin-bottom: 0px;
                    }
                    .footer {
                        text-align: center;
                        font-size: 12px;
                        color: #777;
                        margin-top: 30px;
                        padding-top: 10px;
                        border-top: 1px solid #ddd;
                    }
                    @media print {
                        body {
                            padding: 0.5cm;
                            margin: 0;
                            max-width: none;
                            background-color: white;
                        }
                        .print-button {
                            display: none;
                        }
                        @page {
                            size: landscape;
                            margin: 1cm 0cm 1cm 0cm; /* Top, Right, Bottom, Left - added space for footer */
                        }
                        
                        /* Page footer that appears on every page */
                        body::after {
                            content: "${footerContent}";
                            position: fixed;
                            bottom: 0cm;
                            left: 0;
                            right: 0;
                            height: 20px;
                            font-size: 14px;
                            text-align: center;
                            z-index: 1000;
                        }
                        
                        /* Force background colors to print */
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${printContainer.innerHTML}
                <button class="print-button" onclick="window.print()">Print Report</button>
            </body>
            </html>
        `);
        
        // Clean up
        document.body.removeChild(printContainer);
        
        // Close the document and focus the window
        printWindow.document.close();
        printWindow.focus();
    }

    saveInstance() {
        // Client name should already be verified by the disabled state
        const clientName = document.getElementById('clientName').value.trim();
        if (!clientName) return;

        // Get bikes with calculated handlebar positions
        const validBikes = this.bikes.filter(bike => {
            const card = document.getElementById(bike.id);
            if (!card) return false;
            const handlebarX = card.querySelector('.handlebar-x').textContent;
            return handlebarX && handlebarX !== '-- mm';
        });

        if (validBikes.length === 0) {
            this.showCustomAlert('No bikes with calculated handlebar positions to save.');
            return;
        }

        // Save to Firebase with separate collection for Full Bike Calculator
        this.saveFullBikeData(this.getSaveData())
            .then(() => {
                // Use toast notification instead of alert dialog
                this.showToast('Full bike configuration saved successfully!');
            })
            .catch(error => {
                // Still use alert for errors
                this.showCustomAlert('Error saving full bike configuration: ' + error.message);
            });
    }

    // Add a method to update save button state based on auth
    updateSaveButtonState() {
        const saveButton = document.getElementById('saveButton');
        const clientName = document.getElementById('clientName')?.value?.trim();
        
        if (saveButton) {
            // Only disable if there's no client name
            saveButton.disabled = !clientName;
        }
    }

    // Method to get data for saving to Firebase
    getSaveData() {
        // Get bikes with calculated handlebar positions
        const validBikes = this.bikes.filter(bike => {
            const card = document.getElementById(bike.id);
            if (!card) return false;
            const handlebarX = card.querySelector('.handlebar-x').textContent;
            return handlebarX && handlebarX !== '-- mm';
        });

        return {
            timestamp: new Date().toISOString(),
            clientName: document.getElementById('clientName').value.trim(),
            clientNotes: document.getElementById('clientNotes').value.trim(),
            // Add component notes
            saddleNotes: document.getElementById('saddleNotes')?.value || '',
            handlebarNotes: document.getElementById('handlebarNotes')?.value || '',
            crankLengthNotes: document.getElementById('crankLengthNotes')?.value || '',
            drivetrainNotes: document.getElementById('drivetrainNotes')?.value || '',
            targetSaddleX: document.getElementById('targetSaddleX').value,
            targetSaddleY: document.getElementById('targetSaddleY').value,
            targetHandlebarX: document.getElementById('targetHandlebarX').value,
            targetHandlebarY: document.getElementById('targetHandlebarY').value,
            handlebarReachUsed: document.getElementById('handlebarReachUsed').value,
            bikes: validBikes.map(bike => {
                const card = document.getElementById(bike.id);
                return {
                    ...bike,
                    calculatedValues: {
                        handlebarX: card.querySelector('.handlebar-x').textContent.split(' ')[0],
                        handlebarY: card.querySelector('.handlebar-y').textContent.split(' ')[0],
                        barReachNeeded: card.querySelector('.bar-reach-needed').textContent.split(' ')[0],
                        setbackSTA: card.querySelector('.setback-sta').textContent.split(' ')[0],
                        effectiveSTA: card.querySelector('.effective-sta').textContent.split(' ')[0],
                        bbToRail: card.querySelector('.bb-rail').textContent.split(' ')[0],
                        exposedSeatpost: card.querySelector('.exposed-seatpost').textContent.split(' ')[0]
                    }
                };
            })
        };
    }
    
    // Method to save full bike data to separate Firebase collection
    saveFullBikeData(data) {
        const user = firebase.auth().currentUser;
        if (!user || !firebase.firestore) return Promise.reject('User not logged in or Firestore not available');
        
        const db = firebase.firestore();
        
        // Add timestamp and user info
        const fitData = {
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            userId: user.uid
        };
        
        // Save to separate collection for Full Bike Calculator
        return db.collection('users').doc(user.uid).collection('fullBikeConfigs').add(fitData)
            .then(docRef => {
                console.log('Full bike configuration saved with ID:', docRef.id);
                return docRef.id;
            })
            .catch(error => {
                console.error('Error saving full bike configuration:', error);
                throw error;
            });
    }
    
    // Add a new method for custom alerts
    showCustomAlert(message) {
        // Check if there's already an alert dialog open
        if (document.querySelector('.alert-dialog')) {
            return; // Don't create multiple dialogs
        }
        
        // Create custom alert dialog
        const alertDialog = document.createElement('div');
        alertDialog.className = 'alert-dialog';
        alertDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--card-bg);
            color: var(--text-color);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 90%;
            text-align: center;
            z-index: 1001;
        `;
        
        alertDialog.innerHTML = `
            <p style="margin-top: 0;">${message}</p>
            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <button class="ok-button">OK</button>
            </div>
        `;
        
        // Create overlay
        const alertOverlay = document.createElement('div');
        alertOverlay.className = 'alert-overlay';
        alertOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        `;
        
        // Add to DOM
        document.body.appendChild(alertOverlay);
        document.body.appendChild(alertDialog);
        
        // Style button
        const okButton = alertDialog.querySelector('.ok-button');
        okButton.style.cssText = `
            padding: 8px 16px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        `;
        
        // Function to close the dialog
        const closeDialog = () => {
            if (document.body.contains(alertDialog)) {
                document.body.removeChild(alertDialog);
            }
            if (document.body.contains(alertOverlay)) {
                document.body.removeChild(alertOverlay);
            }
            // Remove the keyboard event listener
            document.removeEventListener('keydown', handleKeyDown);
        };
        
        // Add event listener for the OK button
        okButton.onclick = closeDialog;
        
        // Handle keyboard events
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault(); // Prevent default action
                closeDialog();
            }
        };
        
        // Add keyboard event listener
        document.addEventListener('keydown', handleKeyDown);
        
        // Focus the OK button
        okButton.focus();
    }

    showLoadDialog() {
        // Store a reference to 'this' to use in nested functions
        const self = this;
        
        // Check if dialog already exists and remove it
        const existingDialog = document.getElementById('loadDialog');
        if (existingDialog) {
            document.body.removeChild(existingDialog);
        }

        // Check if overlay already exists and remove it
        const existingOverlay = document.getElementById('dialogOverlay');
        if (existingOverlay) {
            document.body.removeChild(existingOverlay);
        }

        // Create dialog overlay
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'dialogOverlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create dialog
        const loadDialog = document.createElement('div');
        loadDialog.id = 'loadDialog';
        loadDialog.style.cssText = `
            background-color: var(--card-background);
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            padding: 20px;
            position: relative;
            z-index: 1001;
        `;

        // Create dialog content
        loadDialog.innerHTML = `
            <h2 style="margin-top: 0; color: var(--text-color);">Open Saved Full Bike Configuration</h2>
            <div style="margin-bottom: 16px;">
                <input type="text" id="searchInput" placeholder="Search by client name" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--input-bg);
                    color: var(--text-color);
                ">
            </div>
            <div class="saved-fits-header" style="
                display: grid;
                grid-template-columns: 30px 2fr 1fr 1fr 1fr 100px;
                gap: 8px;
                padding: 8px;
                color: var(--text-color);
                font-weight: bold;
                margin-bottom: 10px;
            ">
                <div>
                    <input type="checkbox" id="selectAll" style="cursor: pointer;">
                </div>
                <div>Client Name</div>
                <div>Date Saved</div>
                <div>Bikes</div>
                <div>Target Position</div>
                <div>Actions</div>
            </div>
            <div id="savedFitsList" style="
                flex: 1;
                overflow-y: auto;
                margin-bottom: 12px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                padding: 8px;
                background: var(--background);
            "></div>
            <div style="display: flex; justify-content: space-between; gap: 8px; background: var(--background);">
                <div style="flex: 1;">
                    <button id="deleteSelected" class="delete-selected-button" style="
                        padding: 4px 10px;
                        background: transparent;
                        color: var(--error-color);
                        border: 1px solid var(--error-color);
                        border-radius: 4px;
                        cursor: pointer;
                        display: none;
                        transition: background-color 0.2s;
                    ">Delete Selected</button>
                </div>
                <div>
                    <button id="cancelLoad" style="
                        padding: 8px 16px;
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Close</button>
                </div>
            </div>
        `;

        // Add dialog to DOM - place the dialog inside the overlay
        dialogOverlay.appendChild(loadDialog);
        document.body.appendChild(dialogOverlay);

        // Get elements
        const searchInput = loadDialog.querySelector('#searchInput');
        const savedFitsList = loadDialog.querySelector('#savedFitsList');
        const cancelButton = loadDialog.querySelector('#cancelLoad');
        const selectAllCheckbox = loadDialog.querySelector('#selectAll');
        const deleteSelectedButton = loadDialog.querySelector('#deleteSelected');

        // Add styles for mobile layout
        const style = document.createElement('style');
        style.textContent = `
            .saved-fit-item {
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--card-bg);
                margin-bottom: 8px;
            }
            .saved-fit-item .client-name {
                font-weight: bold;
            }
            .saved-fit-item .action-buttons {
            display: flex;
                gap: 6px;
            }
            .saved-fit-item .load-btn {
                padding: 6px 12px;
                background: var(--primary-color);
                color: white;
            border: none;
                border-radius: 4px;
            cursor: pointer;
            }
            .saved-fit-item .delete-btn {
                padding: 6px;
                background: transparent;
                color: var(--error-color);
                border: 1px solid var(--error-color);
                border-radius: 4px;
                cursor: pointer;
                display: flex;
            align-items: center;
                justify-content: center;
            }
            @media (max-width: 767px) {
                .desktop-only {
                    display: none !important;
                }
                .saved-fit-item {
                    display: flex !important;
                    flex-direction: column !important;
                    padding: 8px !important;
                }
                .saved-fit-item .main-row {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-bottom: 4px !important;
                }
                .saved-fit-item .info-row {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 8px !important;
                    font-size: 0.85em !important;
                    color: var(--text-secondary) !important;
                }
                .saved-fit-item .checkbox-container {
                    margin-right: 8px !important;
                }
                .saved-fit-item .client-name {
                    flex: 1 !important;
                }
                .saved-fit-item .date-info,
                .saved-fit-item .bikes-info,
                .saved-fit-item .position-info {
                    display: none !important;
                }
            }
            @media (min-width: 768px) {
                .saved-fit-item {
                    display: grid !important;
                    grid-template-columns: 30px 2fr 1fr 1fr 1fr 90px !important;
                    gap: 10px !important;
                    padding: 10px !important;
                    align-items: center !important;
                }
                .saved-fit-item .main-row {
                    display: contents !important;
                }
                .saved-fit-item .info-row {
                    display: none !important;
                }
                .saved-fit-item .checkbox-container {
                    grid-column: 1;
                }
                .saved-fit-item .client-name {
                    grid-column: 2;
                }
                .saved-fit-item .date-info {
                    grid-column: 3;
                }
                .saved-fit-item .bikes-info {
                    grid-column: 4;
                }
                .saved-fit-item .position-info {
                    grid-column: 5;
                }
                .saved-fit-item .action-buttons {
                    grid-column: 6;
                }
            }
        `;
        document.head.appendChild(style);

        // Function to close dialog
        const closeLoadDialog = () => {
            document.body.removeChild(dialogOverlay);
            document.removeEventListener('keydown', handleKeyDown);
        };
        
        // Handle keyboard events
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeLoadDialog();
            }
        };

        // Add keyboard event listener
        document.addEventListener('keydown', handleKeyDown);


        // Function to delete multiple fits
        const deleteMultipleFits = async (fitIds) => {
            try {
                const user = firebase.auth().currentUser;
                if (!user) {
                    self.showToast('Please log in to delete full bike configurations', 'error');
                    return;
                }

                // Show a loading message in the list while deletion is in progress
                savedFitsList.innerHTML = '<div style="text-align: center; padding: 20px;">Deleting...</div>';
                
                // Disable all buttons in the dialog to prevent further actions
                const buttons = loadDialog.querySelectorAll('button');
                buttons.forEach(button => {
                    button.disabled = true;
                });

                const db = firebase.firestore();
                const batch = db.batch();

                fitIds.forEach(fitId => {
                    const fitRef = db.collection('users').doc(user.uid)
                        .collection('fullBikeConfigs').doc(fitId);
                    batch.delete(fitRef);
                });

                // Commit the batch delete operation
                await batch.commit();
                
                // Show success message
                self.showToast(`${fitIds.length} full bike configuration(s) deleted successfully`);
                
                // Close current dialog
                closeLoadDialog();
                
                // Give Firestore some time to update
                setTimeout(() => {
                    // Reopen the dialog with a fresh state
                    self.showLoadDialog();
                }, 500);
                
            } catch (error) {
                console.error('Error deleting bike positions:', error);
                self.showToast('Error deleting full bike configuration(s)', 'error');
                
                // Show error in list
                savedFitsList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--error-color);">
                        Error deleting configuration(s). Please try again.
                    </div>
                    <div style="text-align: center; margin-top: 10px;">
                        <button id="retryLoadButton" style="
                            padding: 8px 16px;
                            background: var(--primary-color);
                            color: white;
            border: none;
                            border-radius: 4px;
            cursor: pointer;
                        ">Refresh List</button>
                    </div>
                `;
                
                // Re-enable buttons
                const buttons = loadDialog.querySelectorAll('button');
                buttons.forEach(button => {
                    if (button.id !== 'retryLoadButton') {
                        button.disabled = false;
                    }
                });
                
                // Add event listener to retry button
                const retryButton = document.getElementById('retryLoadButton');
                if (retryButton) {
                    retryButton.addEventListener('click', () => {
                        updateList(searchInput.value.trim());
                    });
                }
            }
        };

        // Function to update the selected state
        const updateSelectedState = () => {
            const checkboxes = savedFitsList.querySelectorAll('.fit-checkbox');
            const selectAllCheckbox = loadDialog.querySelector('#selectAll');
            const deleteSelectedButton = loadDialog.querySelector('.delete-selected-button');
            
            // Count selected checkboxes
            const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            
            // Update select all checkbox state
            if (selectAllCheckbox) {
                if (selectedCount === checkboxes.length && checkboxes.length > 0) {
                    selectAllCheckbox.checked = true;
                    selectAllCheckbox.indeterminate = false;
                } else if (selectedCount === 0) {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                } else {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = true;
                }
            }
            
            // Show/hide delete selected button based on any selection
            if (deleteSelectedButton) {
                deleteSelectedButton.style.display = selectedCount > 0 ? 'block' : 'none';
            }
        };

        // Function to update the list with retry mechanism
        let allFits = []; // Store all fits to enable client-side searching
        
        const updateList = async (searchTerm = '', retryCount = 0, forceRefresh = false) => {
            const maxRetries = 3;
            
            // If we already have data and we're just searching (not forcing refresh), filter client-side
            if (allFits.length > 0 && !forceRefresh) {
                renderFitsList(searchTerm);
                return;
            }
            
            // Show loading indicator
            savedFitsList.innerHTML = '<div style="text-align: center; padding: 20px;">Loading...</div>';

            try {
                // Check if user is logged in
                const user = firebase.auth().currentUser;
                if (!user) {
                    savedFitsList.innerHTML = '<div style="text-align: center; padding: 20px;">Please log in to view saved full bike configurations</div>';
                    return;
                }

                const db = firebase.firestore();
                
                // Add a retry backoff delay
                if (retryCount > 0) {
                    // Exponential backoff: 500ms, 1000ms, 2000ms, etc.
                    const delay = Math.min(500 * Math.pow(2, retryCount - 1), 3000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                // Create a query with cache-first approach for Full Bike Calculator
                const fitsRef = db.collection('users').doc(user.uid).collection('fullBikeConfigs');
                let query = fitsRef.orderBy('timestamp', 'desc');
                
                // Set a timeout for the query
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timed out')), 10000)
                );
                
                // Try to get data with timeout protection
                let snapshot;
                try {
                    snapshot = await Promise.race([
                        query.get({ source: 'default' }), // Try cache first, then server
                        timeoutPromise
                    ]);
                } catch (err) {
                    console.warn(`Query attempt ${retryCount + 1} failed:`, err);
                    
                    // Retry with increased count if not at max retries
                    if (retryCount < maxRetries) {
                        return updateList(searchTerm, retryCount + 1, forceRefresh);
                    }
                    throw err; // Re-throw if max retries reached
                }

                // Handle empty results
                if (!snapshot || snapshot.empty) {
                    allFits = []; // Clear the cache
                    savedFitsList.innerHTML = '<div style="text-align: center; padding: 20px;">No saved full bike configurations found</div>';
                    return;
                }

                // Process the results
                allFits = []; // Reset the fits array before processing new data
                snapshot.forEach(doc => {
                    try {
                        const data = doc.data();
                        // Validate required fields before adding to list
                        if (data && data.clientName) {
                            allFits.push({
                                id: doc.id,
                                ...data
                            });
                        } else {
                            console.warn('Skipping invalid fit data:', doc.id);
                        }
                    } catch (error) {
                        console.error('Error processing fit data:', error);
                        // Continue with other fits even if one fails
                    }
                });

                // Render the list with the search term
                renderFitsList(searchTerm);
                
            } catch (error) {
                console.error('Error loading saved positions:', error);
                
                // Provide a more helpful error message based on the error type
                let errorMessage = 'Error loading saved positions';
                
                if (error.message === 'Request timed out') {
                    errorMessage = 'Loading timed out. Please try again.';
                } else if (error.code === 'permission-denied') {
                    errorMessage = 'You don\'t have permission to view these positions.';
                } else if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
                    errorMessage = 'Network issue. Please check your connection and try again.';
                }
                
                // Only show retry button if not already retrying
                if (retryCount < maxRetries) {
                    savedFitsList.innerHTML = `
                        <div style="text-align: center; padding: 20px; color: var(--error-color);">${errorMessage}</div>
                        <div style="text-align: center; margin-top: 10px;">
                            <button id="retryButton" style="
                                padding: 8px 16px;
                                background: var(--primary-color);
                                color: white;
                                border: none;
                    border-radius: 4px;
                    cursor: pointer;
                            ">Retry</button>
                        </div>
                    `;
                    
                    const retryButton = document.getElementById('retryButton');
                    if (retryButton) {
                        retryButton.addEventListener('click', () => {
                            updateList(searchTerm, retryCount + 1, true); // Force refresh on retry
                        });
                    }
                } else {
                    savedFitsList.innerHTML = `
                        <div style="text-align: center; padding: 20px; color: var(--error-color);">
                            ${errorMessage}
                        </div>
                        <div style="text-align: center; margin-top: 10px;">
                            <p>Please try closing and reopening the dialog.</p>
                        </div>
                    `;
                }
            }
        };
        
        // Function to render the list with filtering
        const renderFitsList = (searchTerm = '') => {
            // Filter fits if there's a search term - handle case insensitively and safely
            const filteredFits = searchTerm
                ? allFits.filter(fit => {
                    try {
                        return fit.clientName && 
                            fit.clientName.toLowerCase().includes(searchTerm.toLowerCase());
                    } catch (err) {
                        console.warn('Error filtering fit:', err);
                        return false; // Skip items that cause errors
                    }
                })
                : allFits;

            // Handle no matches
            if (filteredFits.length === 0) {
                savedFitsList.innerHTML = searchTerm 
                    ? `<div style="text-align: center; padding: 20px;">No matches found for "${searchTerm}"</div>`
                    : '<div style="text-align: center; padding: 20px;">No saved bike positions found</div>';
                return;
            }

            // Build HTML for the list
            let html = '';
            
            // Process each fit individually to prevent one bad fit from breaking the entire list
            filteredFits.forEach(fit => {
                try {
                    const date = new Date(fit.timestamp || Date.now());
                    const formattedDate = date.toLocaleDateString();
                    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    // Safely get bike count
                    const bikeCount = fit.bikes && Array.isArray(fit.bikes) ? fit.bikes.length : 0;
                    
                    // Safely get target positions
                    const targetX = fit.targetHandlebarX || '--';
                    const targetY = fit.targetHandlebarY || '--';
                    
                    html += `
                    <div class="saved-fit-item" data-fit-id="${fit.id}">
                        <div class="main-row">
                            <div class="checkbox-container">
                                <input type="checkbox" class="fit-checkbox" style="cursor: pointer;">
                            </div>
                            <div class="client-name">
                                ${fit.clientName || 'Unnamed'}
                                ${fit.clientNotes ? `<div class="client-notes" style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px; font-weight: normal;">${fit.clientNotes}</div>` : ''}
                            </div>
                            <div class="date-info">${formattedDate}<br><span style="font-size: 0.9em; color: var(--text-secondary);">${formattedTime}</span></div>
                            <div class="bikes-info">${bikeCount} bikes</div>
                            <div class="position-info">HX: ${targetX}mm<br>HY: ${targetY}mm</div>
                            <div class="action-buttons">
                                <button class="load-btn">Open</button>
                                <button class="delete-btn">🗑️</button>
                            </div>
                        </div>
                        <div class="info-row">
                            <span>${formattedDate} ${formattedTime}</span>
                            <span>•</span>
                            <span>${bikeCount} bikes</span>
                            <span>•</span>
                            <span>HX: ${targetX}mm, HY: ${targetY}mm</span>
                        </div>
                </div>
            `;
                } catch (itemError) {
                    console.error('Error rendering item:', itemError);
                    // Skip this item if it causes an error
                }
            });

            // Update the DOM
            savedFitsList.innerHTML = html || '<div style="text-align: center; padding: 20px;">No valid bike positions found</div>';

            // Add event listeners after DOM update
            try {
                // Add event listeners to checkboxes
                savedFitsList.querySelectorAll('.fit-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', updateSelectedState);
                });

                // Add event listeners to load buttons
                savedFitsList.querySelectorAll('.load-btn').forEach(button => {
                    button.addEventListener('click', async () => {
                        try {
                            const fitId = button.closest('.saved-fit-item').dataset.fitId;
                            if (!fitId) throw new Error('Missing fit ID');
                            
                            const user = firebase.auth().currentUser;
                            if (!user) throw new Error('User not logged in');

                            button.textContent = 'Opening...';
                            button.disabled = true;

                            // First try to find the data in our locally cached allFits array
                            const cachedFit = allFits.find(fit => fit.id === fitId);
                            if (cachedFit) {
                                self.loadSavedFit(cachedFit);
                    closeLoadDialog();
                                return;
                            }

                            // If not found in cache, fetch from Firestore
                            const doc = await firebase.firestore()
                                .collection('users')
                                .doc(user.uid)
                                .collection('bikeFits')
                                .doc(fitId)
                                .get();

                            if (doc.exists) {
                                self.loadSavedFit(doc.data());
                                closeLoadDialog();
                            } else {
                                throw new Error('Bike position not found');
                            }
                        } catch (error) {
                            console.error('Error loading bike position:', error);
                            self.showToast('Error loading bike position', 'error');
                            
                            // Reset button
                            button.textContent = 'Open';
                            button.disabled = false;
                        }
                    });
                });

                // Add delete handlers
                savedFitsList.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', async () => {
                        try {
                            const fitId = button.closest('.saved-fit-item').dataset.fitId;
                            if (fitId) {
                                showDeleteConfirmation([fitId], () => deleteMultipleFits([fitId]));
                            }
                        } catch (error) {
                            console.error('Error setting up delete handler:', error);
                        }
                    });
                });
            } catch (eventError) {
                console.error('Error setting up event listeners:', eventError);
            }
        };

        cancelButton.addEventListener('click', closeLoadDialog);

        // Select All checkbox handler
        selectAllCheckbox.addEventListener('change', () => {
            const checkboxes = savedFitsList.querySelectorAll('.fit-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
            updateSelectedState();
        });

        // Function to show custom confirmation dialog
        const showDeleteConfirmation = (fitIds, onConfirm) => {
            // Check if dialog already exists and remove it
            const existingDialog = document.querySelector('.confirm-dialog');
            if (existingDialog) {
                existingDialog.parentNode.removeChild(existingDialog);
            }

            // Check if overlay already exists and remove it
            const existingOverlay = document.querySelector('.dialog-overlay');
            if (existingOverlay) {
                document.body.removeChild(existingOverlay);
            }

                    const confirmDialog = document.createElement('div');
                    confirmDialog.className = 'confirm-dialog';
            confirmDialog.id = 'confirmDialog';
                    confirmDialog.style.cssText = `
                        background: var(--card-bg);
                        color: var(--text-color);
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                        max-width: 400px;
                        width: 90%;
                        text-align: center;
                z-index: 1002;
                    `;
                    
            const message = fitIds.length === 1 
                ? 'Are you sure you want to delete this bike position?' 
                : `Are you sure you want to delete ${fitIds.length} selected bike positions?`;
                    
                    confirmDialog.innerHTML = `
                <h3 style="margin-top: 0;">Confirm Delete</h3>
                <p>${message}</p>
                        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                    <button class="cancel-button" style="
                        padding: 8px 16px;
                        background: transparent;
                        color: var(--text-color);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                    ">Cancel</button>
                    <button class="confirm-button" style="
                        padding: 8px 16px;
                        background: var(--error-color);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                    ">Delete</button>
                </div>
            `;

            // Create overlay
            const confirmOverlay = document.createElement('div');
            confirmOverlay.className = 'dialog-overlay';
            confirmOverlay.id = 'confirmOverlay';
            confirmOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1001;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            // Add to DOM - place dialog inside overlay
            confirmOverlay.appendChild(confirmDialog);
            document.body.appendChild(confirmOverlay);

            // Handle close
                    const closeConfirmDialog = () => {
                            document.body.removeChild(confirmOverlay);
            };
                    
                    // Add event listeners
            confirmDialog.querySelector('.cancel-button').onclick = closeConfirmDialog;
            confirmDialog.querySelector('.confirm-button').onclick = () => {
                onConfirm();
                        closeConfirmDialog();
            };
        };

        // Add Delete Selected button handler - using a single event listener
        if (deleteSelectedButton) {
            // Remove any existing event listeners by cloning and replacing the button
            const newDeleteSelectedButton = deleteSelectedButton.cloneNode(true);
            deleteSelectedButton.parentNode.replaceChild(newDeleteSelectedButton, deleteSelectedButton);
            
            // Add the event listener to the new button
            newDeleteSelectedButton.addEventListener('click', () => {
                const selectedItems = savedFitsList.querySelectorAll('.fit-checkbox:checked');
                const selectedIds = Array.from(selectedItems).map(cb => 
                    cb.closest('.saved-fit-item').dataset.fitId
                );

                if (selectedIds.length > 0) {
                    // Show confirmation dialog before deletion
                    showDeleteConfirmation(selectedIds, () => deleteMultipleFits(selectedIds));
                }
            });
        }

        // Add event listener to search input using client-side filtering
        searchInput.addEventListener('input', (e) => {
            // No need to debounce since we're filtering client-side
            renderFitsList(e.target.value.trim());
        });

        // Add select all checkbox handler
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = savedFitsList.querySelectorAll('.fit-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = selectAllCheckbox.checked;
                });
                updateSelectedState();
            });
        }

        // Initial load of saved fits
        updateList();
    }

    loadSavedInstance(savedData) {
        // Set client name and target positions
        document.getElementById('clientName').value = savedData.clientName;
        document.getElementById('clientNotes').value = savedData.clientNotes || '';
        // Load component notes
        document.getElementById('saddleNotes').value = savedData.saddleNotes || '';
        document.getElementById('handlebarNotes').value = savedData.handlebarNotes || '';
        document.getElementById('crankLengthNotes').value = savedData.crankLengthNotes || '';
        document.getElementById('drivetrainNotes').value = savedData.drivetrainNotes || '';
        document.getElementById('targetSaddleX').value = savedData.targetSaddleX;
        document.getElementById('targetSaddleY').value = savedData.targetSaddleY;
        document.getElementById('targetHandlebarX').value = savedData.targetHandlebarX;
        document.getElementById('targetHandlebarY').value = savedData.targetHandlebarY;
        document.getElementById('handlebarReachUsed').value = savedData.handlebarReachUsed;

        // Clear existing bikes
        document.getElementById('bikes-container').innerHTML = '';
        this.bikes = [];

        // Load saved bikes
        savedData.bikes.forEach((bikeData, index) => {
            this.bikes.push(bikeData);
            this.renderBikeCard(bikeData, index);
            
            const card = document.getElementById(bikeData.id);
            if (card) {
                // Set geometry values
                card.querySelector('.reach').value = bikeData.reach || '';
                card.querySelector('.stack').value = bikeData.stack || '';
                card.querySelector('.hta').value = bikeData.hta || '';
                card.querySelector('.sta').value = bikeData.sta || '';
                card.querySelector('.stl').value = bikeData.stl || '';
                
                // Set stem configuration values
                card.querySelector('.stem-height').value = bikeData.stemHeight !== undefined && bikeData.stemHeight !== '' ? bikeData.stemHeight : 40;
                card.querySelector('.stem-length').value = bikeData.stemLength || 100;
                card.querySelector('.stem-angle').value = bikeData.stemAngle !== undefined && bikeData.stemAngle !== '' ? bikeData.stemAngle : -6;
                card.querySelector('.spacer-height').value = bikeData.spacersHeight !== undefined && bikeData.spacersHeight !== '' ? bikeData.spacersHeight : 20;
                card.querySelector('.headset-height').value = bikeData.headsetHeight !== undefined && bikeData.headsetHeight !== '' ? bikeData.headsetHeight : 10;
                
                // For manual bikes, set the brand/model/size
                if (bikeData.isManual) {
                    const brandInput = card.querySelector('.brand-input');
                    const modelInput = card.querySelector('.model-input');
                    const sizeInput = card.querySelector('.size-input');
                    
                    if (brandInput) brandInput.value = bikeData.brand || '';
                    if (modelInput) modelInput.value = bikeData.model || '';
                    if (sizeInput) sizeInput.value = bikeData.size || '';
                } else {
                    this.setupBikeSelectors(bikeData.id);
                }
            }
        });

        // Update calculations
        this.updateCalculations();
        
        // Enable save button
        document.getElementById('saveButton').disabled = false;
        
        // Save the loaded data to localStorage so it persists after page refresh
        this.saveData();
        
        // Update the visualization if there's sufficient data
        if (this.bikes.length > 0) {
            const bike = this.bikes[0];
            const saddleX = bike.saddleX || 0;
            const saddleY = bike.saddleY || 0;
            const hasFrameGeometry = bike.reach && bike.stack && bike.hta;
            
            // Update visualization if we have either saddle position OR bike frame geometry
            if (saddleX || saddleY || hasFrameGeometry) {
                // Add a small delay to ensure DOM and canvas are ready
                setTimeout(() => {
                    this.updateBikeVisualization();
                }, 100);
            }
        }
    }

    // Method to load a saved fit from Firebase
    loadSavedFit(savedData) {
        if (!savedData) return;

        // Set client name and target positions
        document.getElementById('clientName').value = savedData.clientName || '';
        document.getElementById('clientNotes').value = savedData.clientNotes || '';
        // Load component notes
        document.getElementById('saddleNotes').value = savedData.saddleNotes || '';
        document.getElementById('handlebarNotes').value = savedData.handlebarNotes || '';
        document.getElementById('crankLengthNotes').value = savedData.crankLengthNotes || '';
        document.getElementById('drivetrainNotes').value = savedData.drivetrainNotes || '';
        document.getElementById('targetSaddleX').value = savedData.targetSaddleX || '';
        document.getElementById('targetSaddleY').value = savedData.targetSaddleY || '';
        document.getElementById('targetHandlebarX').value = savedData.targetHandlebarX || '';
        document.getElementById('targetHandlebarY').value = savedData.targetHandlebarY || '';
        document.getElementById('handlebarReachUsed').value = savedData.handlebarReachUsed || '';

        // Clear existing bikes
        document.getElementById('bikes-container').innerHTML = '';
        this.bikes = [];

        // Load saved bikes (only first bike for Full Bike Calculator)
        if (savedData.bikes && Array.isArray(savedData.bikes) && savedData.bikes.length > 0) {
            // Only load the first bike card
            const bikeData = savedData.bikes[0];
                this.bikes.push(bikeData);
            this.renderBikeCard(bikeData, 0);
                
                const card = document.getElementById(bikeData.id);
                if (card) {
                    // Set geometry values
                    card.querySelector('.reach').value = bikeData.reach || '';
                    card.querySelector('.stack').value = bikeData.stack || '';
                    card.querySelector('.hta').value = bikeData.hta || '';
                    card.querySelector('.sta').value = bikeData.sta || '';
                    card.querySelector('.stl').value = bikeData.stl || '';
                    
                                            // Set stem configuration values
                        card.querySelector('.stem-height').value = bikeData.stemHeight !== undefined && bikeData.stemHeight !== '' ? bikeData.stemHeight : 40;
                        card.querySelector('.stem-length').value = bikeData.stemLength || 100;
                        card.querySelector('.stem-angle').value = bikeData.stemAngle !== undefined && bikeData.stemAngle !== '' ? bikeData.stemAngle : -6;
                        card.querySelector('.spacer-height').value = bikeData.spacersHeight !== undefined && bikeData.spacersHeight !== '' ? bikeData.spacersHeight : 20;
                        card.querySelector('.headset-height').value = bikeData.headsetHeight !== undefined && bikeData.headsetHeight !== '' ? bikeData.headsetHeight : 10;
                        
                        // Set saddle position values
                        card.querySelector('.saddle-x').value = bikeData.saddleX || 0;
                        card.querySelector('.saddle-y').value = bikeData.saddleY || 0;
                        
                        // For manual bikes, set the brand/model/size
                        if (bikeData.isManual) {
                            const brandInput = card.querySelector('.brand-input');
                            const modelInput = card.querySelector('.model-input');
                            const sizeInput = card.querySelector('.size-input');
                            
                            if (brandInput) brandInput.value = bikeData.brand || '';
                            if (modelInput) modelInput.value = bikeData.model || '';
                            if (sizeInput) sizeInput.value = bikeData.size || '';
                        } else {
                            this.setupBikeSelectors(bikeData.id);
                        }
                }
        }

        // Update calculations
        this.updateCalculations();
        
        // Enable save button
        document.getElementById('saveButton').disabled = false;
        
        // Save the loaded data to localStorage so it persists after page refresh
        this.saveData();
        
        // Update the visualization
        this.updateBikeVisualization();
    }

    // === Bike Geometry Visualization ===
    forceCanvasResize() {
        if (this.canvas) {
            // Force canvas to recalculate its dimensions
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            
            // Enable high-quality rendering
            if (this.ctx) {
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
            }
        }
    }
    
    initializeCanvas() {
        this.canvas = document.getElementById('bikeGeometryCanvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            
            // Set canvas size to match display size
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            
            // Enable high-quality rendering
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Initialize zoom and pan state
            this.initializeZoomAndPan();
            
            this.drawEmptyState();
            
            // Initialize visibility controls
            this.initializeVisibilityControls();
            this.updateCanvasControlsVisibility();
        }
    }
    
    initializeZoomAndPan() {
        // Initialize view state
        this.viewState = {
            scale: 1.0,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0
        };
        
        // Add zoom and pan controls to the canvas container
        this.addZoomPanControls();
        
        // Add mouse event listeners for panning
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Set initial cursor style
        this.canvas.style.cursor = 'grab';
    }
    
    addZoomPanControls() {
        const canvasContainer = this.canvas.parentElement;
        if (!canvasContainer) return;
        
        // Create controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'canvas-controls';
        controlsContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            z-index: 1000;
        `;
        
        // Zoom in button
        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerHTML = '+';
        zoomInBtn.className = 'zoom-btn zoom-in';
        zoomInBtn.title = 'Zoom In';
        zoomInBtn.style.cssText = `
            width: 30px;
            height: 30px;
            border: 1px solid #ccc;
            background: #cccccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        `;
        zoomInBtn.addEventListener('click', () => this.zoomIn());
        zoomInBtn.addEventListener('mouseenter', () => {
            zoomInBtn.style.background = '#007AFF';
            zoomInBtn.style.transform = 'scale(1.05)';
        });
        zoomInBtn.addEventListener('mouseleave', () => {
            zoomInBtn.style.background = '#cccccc';
            zoomInBtn.style.transform = 'scale(1)';
        });
        
        // Zoom out button
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerHTML = '−';
        zoomOutBtn.className = 'zoom-btn zoom-out';
        zoomOutBtn.title = 'Zoom Out';
        zoomOutBtn.style.cssText = `
            width: 30px;
            height: 30px;
            border: 1px solid #ccc;
            background: #cccccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        `;
        zoomOutBtn.addEventListener('click', () => this.zoomOut());
        zoomOutBtn.addEventListener('mouseenter', () => {
            zoomOutBtn.style.background = '#007AFF';
            zoomOutBtn.style.transform = 'scale(1.05)';
        });
        zoomOutBtn.addEventListener('mouseleave', () => {
            zoomOutBtn.style.background = '#cccccc';
            zoomOutBtn.style.transform = 'scale(1)';
        });
        
        // Default view button
        const defaultViewBtn = document.createElement('button');
        defaultViewBtn.innerHTML = '⌂';
        defaultViewBtn.className = 'default-view-btn';
        defaultViewBtn.title = 'Reset to default view';
        defaultViewBtn.style.cssText = `
            width: 30px;
            height: 30px;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            background: #cccccc;
            transition: all 0.2s ease;
        `;
        defaultViewBtn.addEventListener('click', () => this.resetToDefaultView());
        defaultViewBtn.addEventListener('mouseenter', () => {
            defaultViewBtn.style.background = '#007AFF';
            defaultViewBtn.style.transform = 'scale(1.05)';
        });
        defaultViewBtn.addEventListener('mouseleave', () => {
            defaultViewBtn.style.background = '#cccccc';
            defaultViewBtn.style.transform = 'scale(1)';
        });
        
        // Zoom level indicator
        const zoomIndicator = document.createElement('div');
        zoomIndicator.className = 'zoom-indicator';
        zoomIndicator.style.cssText = `
            width: 30px;
            height: 20px;
            border: 1px solid #ccc;
            background: white;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-family: monospace;
            color: #666;
            user-select: none;
        `;
        this.zoomIndicator = zoomIndicator;
        
        // Add all controls
        controlsContainer.appendChild(zoomInBtn);
        controlsContainer.appendChild(zoomOutBtn);
        controlsContainer.appendChild(defaultViewBtn);
        controlsContainer.appendChild(zoomIndicator);
        
        // Insert controls into the canvas container
        canvasContainer.style.position = 'relative';
        canvasContainer.appendChild(controlsContainer);
        
        // Update zoom indicator
        this.updateZoomIndicator();
    }
    
    handleMouseDown(e) {
        if (e.button === 0) { // Left mouse button only
            this.viewState.isDragging = true;
            this.viewState.lastMouseX = e.clientX;
            this.viewState.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    handleMouseMove(e) {
        if (this.viewState.isDragging) {
            const deltaX = e.clientX - this.viewState.lastMouseX;
            const deltaY = e.clientY - this.viewState.lastMouseY;
            
            this.viewState.offsetX += deltaX;
            this.viewState.offsetY += deltaY;
            
            this.viewState.lastMouseX = e.clientX;
            this.viewState.lastMouseY = e.clientY;
            
            this.updateBikeVisualization();
        }
    }
    
    handleMouseUp(e) {
        if (e.button === 0) {
            this.viewState.isDragging = false;
            this.canvas.style.cursor = 'grab';
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.99 : 1.01;
        const newScale = Math.max(0.5, Math.min(5.0, this.viewState.scale * zoomFactor));
        
        // Zoom towards mouse position
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom center
        const zoomCenterX = (mouseX - this.viewState.offsetX) / this.viewState.scale;
        const zoomCenterY = (mouseY - this.viewState.offsetY) / this.viewState.scale;
        
        // Update scale
        this.viewState.scale = newScale;
        
        // Adjust offset to keep zoom center in place
        this.viewState.offsetX = mouseX - zoomCenterX * this.viewState.scale;
        this.viewState.offsetY = mouseY - zoomCenterY * this.viewState.scale;
        
        this.updateZoomIndicator();
        this.updateBikeVisualization();
    }
    
    zoomIn() {
        this.viewState.scale = Math.min(5.0, this.viewState.scale * 1.05);
        this.updateZoomIndicator();
        this.updateBikeVisualization();
    }
    
    zoomOut() {
        this.viewState.scale = Math.max(0.5, this.viewState.scale * 0.95);
        this.updateZoomIndicator();
        this.updateBikeVisualization();
    }
    
    resetToDefaultView() {
        this.viewState.scale = 1.0;
        this.viewState.offsetX = 0;
        this.viewState.offsetY = 0;
        this.updateZoomIndicator();
        this.updateBikeVisualization();
    }
    
    updateZoomIndicator() {
        if (this.zoomIndicator) {
            this.zoomIndicator.textContent = `${Math.round(this.viewState.scale * 100)}%`;
        }
    }
    
    initializeVisibilityControls() {
        // Get checkbox elements for Position 1
        this.showPositionCheckbox1 = document.getElementById('showPosition1');
        this.showXYAxesCheckbox1 = document.getElementById('showXYAxes1');
        this.showSeatpostMeasurementsCheckbox1 = document.getElementById('showSeatpostMeasurements1');
        
        // Get checkbox elements for Position 2
        this.showPositionCheckbox2 = document.getElementById('showPosition2');
        this.showXYAxesCheckbox2 = document.getElementById('showXYAxes2');
        this.showSeatpostMeasurementsCheckbox2 = document.getElementById('showSeatpostMeasurements2');
        
        // Add event listeners for Position 1
        if (this.showPositionCheckbox1) {
            this.showPositionCheckbox1.addEventListener('change', () => {
                // If position is unchecked, uncheck coordinate checkboxes
                if (!this.showPositionCheckbox1.checked) {
                    if (this.showXYAxesCheckbox1) this.showXYAxesCheckbox1.checked = false;
                    if (this.showSeatpostMeasurementsCheckbox1) this.showSeatpostMeasurementsCheckbox1.checked = false;
                }
                // If position is checked, do NOT automatically check coordinate checkboxes
                this.updateBikeVisualization();
            });
        }
        
        if (this.showXYAxesCheckbox1) {
            this.showXYAxesCheckbox1.addEventListener('change', () => {
                this.updateBikeVisualization();
            });
        }
        
        if (this.showSeatpostMeasurementsCheckbox1) {
            this.showSeatpostMeasurementsCheckbox1.addEventListener('change', () => {
                this.updateBikeVisualization();
            });
        }
        
        // Add event listeners for Position 2
        if (this.showPositionCheckbox2) {
            this.showPositionCheckbox2.addEventListener('change', () => {
                // If position is unchecked, uncheck coordinate checkboxes
                if (!this.showPositionCheckbox2.checked) {
                    if (this.showXYAxesCheckbox2) this.showXYAxesCheckbox2.checked = false;
                    if (this.showSeatpostMeasurementsCheckbox2) this.showSeatpostMeasurementsCheckbox2.checked = false;
                }
                // If position is checked, do NOT automatically check coordinate checkboxes
                this.updateBikeVisualization();
            });
        }
        
        if (this.showXYAxesCheckbox2) {
            this.showXYAxesCheckbox2.addEventListener('change', () => {
                this.updateBikeVisualization();
            });
        }
        
        if (this.showSeatpostMeasurementsCheckbox2) {
            this.showSeatpostMeasurementsCheckbox2.addEventListener('change', () => {
                this.updateBikeVisualization();
            });
        }
    }
    
    shouldShowPosition(bikeIndex = 0) {
        if (bikeIndex === 0) {
            return this.showPositionCheckbox1 ? this.showPositionCheckbox1.checked : true;
        } else {
            return this.showPositionCheckbox2 ? this.showPositionCheckbox2.checked : true;
        }
    }
    
    shouldShowXYAxes(bikeIndex = 0) {
        if (bikeIndex === 0) {
            return this.showXYAxesCheckbox1 ? this.showXYAxesCheckbox1.checked : true;
        } else {
            return this.showXYAxesCheckbox2 ? this.showXYAxesCheckbox2.checked : true;
        }
    }
    
    shouldShowSeatpostMeasurements(bikeIndex = 0) {
        if (bikeIndex === 0) {
            return this.showSeatpostMeasurementsCheckbox1 ? this.showSeatpostMeasurementsCheckbox1.checked : true;
        } else {
            return this.showSeatpostMeasurementsCheckbox2 ? this.showSeatpostMeasurementsCheckbox2.checked : true;
        }
    }
    
    updateCanvasControlsVisibility() {
        const bike2ControlsRow = document.querySelector('.position-controls-row:nth-child(2)');
        if (bike2ControlsRow) {
            if (this.bikes.length >= 2) {
                bike2ControlsRow.style.display = 'flex';
            } else {
                bike2ControlsRow.style.display = 'none';
            }
        }
    }
    
    isSaddlePositionValid(saddleX, saddleY) {
        return saddleX >= 100 && saddleX <= 300 && saddleY >= 425 && saddleY <= 900;
    }
    
    isFrameGeometryValid(reach, stack, hta, sta) {
        return reach >= 300 && reach <= 500 && 
               stack >= 460 && stack <= 750 && 
               hta >= 60 && hta <= 75 &&
               (!sta || (sta >= 65 && sta <= 85));
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
        
        // Apply zoom and pan transformations
        ctx.save();
        ctx.translate(this.viewState.offsetX, this.viewState.offsetY);
        ctx.scale(this.viewState.scale, this.viewState.scale);
        
        // Draw placeholder text
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Enter bike geometry values to see visualization', canvas.width / 2, canvas.height / 2);
        
        // Restore context
        ctx.restore();
    }

    updateBikeVisualization() {
        // Ensure canvas is initialized
        if (!this.canvas || !this.ctx) {
            this.initializeCanvas();
        }
        
        // Get the current bike data
        if (this.bikes.length === 0) {
            this.drawEmptyState();
            return;
        }
        
        // Clear canvas and set background once
        const ctx = this.ctx;
        const canvas = this.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color') || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply zoom and pan transformations
        ctx.save();
        ctx.translate(this.viewState.offsetX, this.viewState.offsetY);
        ctx.scale(this.viewState.scale, this.viewState.scale);
        
        // Calculate common origin coordinates based on the first bike with data
        let commonOriginX, commonOriginY;
        let commonScale;
        let commonCenterX, commonCenterY;
        
        // Find the first bike with data to determine the common origin
        const referenceBike = this.bikes.find(bike => {
            const saddleX = bike.saddleX || 0;
            const saddleY = bike.saddleY || 0;
            const hasFrameGeometry = bike && bike.reach && bike.stack && bike.hta && this.isFrameGeometryValid(bike.reach, bike.stack, bike.hta, bike.sta);
            return (saddleX !== 0 || saddleY !== 0 || hasFrameGeometry);
        });
        
        if (referenceBike) {
            // Calculate origin based on the reference bike
            const refSaddleX = referenceBike.saddleX || 0;
            const refSaddleY = referenceBike.saddleY || 0;
            const refSeatTubeAngle = referenceBike.sta || 0;
            const refSeatTubeLength = referenceBike.stl || 0;
            
            // Calculate scale and origin for the reference bike
            const refSaddleDistanceScale = Math.sqrt(refSaddleX * refSaddleX + refSaddleY * refSaddleY);
            const refStaForScale = (refSeatTubeAngle && refSeatTubeAngle > 0) ? refSeatTubeAngle : 73;
            const refSeatTubeLengthToSaddleYScale = refSaddleY ? (refSaddleY / Math.sin((90 - refStaForScale + 90) * Math.PI / 180)) : 500;
            const refDisplaySeatTubeLengthScale = (refSeatTubeLength && refSeatTubeLength > 0) ? refSeatTubeLength : refSeatTubeLengthToSaddleYScale;
            
            const refSeatTubeX = refDisplaySeatTubeLengthScale * Math.cos((90 - refStaForScale + 90) * Math.PI / 180);
            const refSeatTubeY = refDisplaySeatTubeLengthScale * Math.sin((90 - refStaForScale + 90) * Math.PI / 180);
            
            // Calculate bounds for scaling
            let refMaxX = 0;
            let refMaxY = 0;
            let refMinY = 0;
            
            // Include bike frame geometry bounds when available
            if (referenceBike && referenceBike.reach && referenceBike.stack && referenceBike.hta && this.isFrameGeometryValid(referenceBike.reach, referenceBike.stack, referenceBike.hta, referenceBike.sta)) {
                const refHtaDeg = referenceBike.hta || 0;
                const refStemAngleDeg = (referenceBike.stemAngle !== undefined && referenceBike.stemAngle !== '') ? referenceBike.stemAngle : 0;
                const refSpacersHeightMm = (referenceBike.spacersHeight !== undefined && referenceBike.spacersHeight !== '') ? referenceBike.spacersHeight : 0;
                const refHeadsetHeightMm = (referenceBike.headsetHeight !== undefined && referenceBike.headsetHeight !== '') ? referenceBike.headsetHeight : 0;
                const refStemHeightHalfMm = (referenceBike.stemHeight !== undefined && referenceBike.stemHeight !== '') ? (referenceBike.stemHeight / 2) : 20;
                const refStemLengthMm = (referenceBike.stemLength !== undefined && referenceBike.stemLength !== '') ? referenceBike.stemLength : 0;

                const refHtaRad = (180 - refHtaDeg) * Math.PI / 180;
                const refStemRad = (90 - refHtaDeg + refStemAngleDeg) * Math.PI / 180;
                const refStemCenterX = (refHeadsetHeightMm + refSpacersHeightMm + refStemHeightHalfMm) * Math.cos(refHtaRad);
                const refStemCenterY = (refHeadsetHeightMm + refSpacersHeightMm + refStemHeightHalfMm) * Math.sin(refHtaRad);
                const refClampX = refStemLengthMm * Math.cos(refStemRad);
                const refClampY = refStemLengthMm * Math.sin(refStemRad);
                const refHandlebarCenterX = (referenceBike.reach || 0) + refStemCenterX + refClampX;
                const refHandlebarCenterY = (referenceBike.stack || 0) + refStemCenterY + refClampY;
                
                const refHandlebarRadiusMm = 31.8 / 2;
                refMaxX = Math.max(refMaxX, refHandlebarCenterX + refHandlebarRadiusMm + 20);
                refMaxY = Math.max(refMaxY, refHandlebarCenterY + refHandlebarRadiusMm + 30);
                refMaxX = Math.max(refMaxX, (referenceBike.reach || 0) + 50);
                refMaxY = Math.max(refMaxY, (referenceBike.stack || 0) + 50);
                refMinY = Math.min(refMinY, refHandlebarCenterY - refHandlebarRadiusMm - 20);
            }
            
            // Include saddle position if provided
            if (refSaddleX || refSaddleY) {
                refMaxX = Math.max(refMaxX, refSaddleX);
                refMaxY = Math.max(refMaxY, refSaddleY + 10);
            }
            
            // Include seat tube projection if available
            if (refSeatTubeX || refSeatTubeY) {
                refMaxX = Math.max(refMaxX, refSeatTubeX);
                refMaxY = Math.max(refMaxY, refSeatTubeY);
            }
            
            // Ensure minimum bounds
            refMaxX = Math.max(refMaxX, 400);
            refMaxY = Math.max(refMaxY, 300);
            
            // Calculate scale
            const refTargetWidth = canvas.width * 0.9;
            const refTargetHeight = canvas.height * 0.8;
            const refScaleX = refTargetWidth / refMaxX;
            const refScaleY = refTargetHeight / (refMaxY - refMinY);
            commonScale = Math.min(refScaleX, refScaleY);
            
            // Calculate center coordinates
            if (referenceBike && referenceBike.reach && referenceBike.hta && this.isFrameGeometryValid(referenceBike.reach, referenceBike.stack, referenceBike.hta, referenceBike.sta)) {
                const refHeadTubeEndY = 410;
                const refHeadTubeAngleRad = (360 + referenceBike.hta) * Math.PI / 180;
                const refHeadTubeEndX = referenceBike.reach + (refHeadTubeEndY - referenceBike.stack) / Math.tan(refHeadTubeAngleRad);
                const refForkLengthMm = 370;
                const refFrontAxleX = refHeadTubeEndX + refForkLengthMm * Math.cos(refHeadTubeAngleRad) + 50;
                const refChainstayLengthMm = 410;
                const refRearAxleX = -refChainstayLengthMm;
                const refAxleMidpointX = (refFrontAxleX + refRearAxleX) / 2;
                commonCenterX = canvas.width / 2 - refAxleMidpointX * commonScale * 2.5;
            } else {
                commonCenterX = canvas.width / 2;
            }
            
            commonCenterY = canvas.height * 0.55;
            
            // Calculate common origin
            if (refSaddleX || refSaddleY) {
                commonOriginX = commonCenterX;
                commonOriginY = commonCenterY - 20 + (refSaddleY * commonScale) / 2;
            } else if (referenceBike && referenceBike.reach && referenceBike.stack && referenceBike.hta && this.isFrameGeometryValid(referenceBike.reach, referenceBike.stack, referenceBike.hta, referenceBike.sta)) {
                commonOriginX = commonCenterX;
                commonOriginY = commonCenterY + 250;
            } else {
                commonOriginX = commonCenterX;
                commonOriginY = commonCenterY;
            }
        } else {
            // Fallback values if no bike has data
            commonOriginX = canvas.width / 2;
            commonOriginY = canvas.height * 0.55;
            commonScale = 1.0;
        }
        
        // Draw both bikes if they exist
        this.bikes.forEach((bike, index) => {
            // Check if this position should be shown
            if (!this.shouldShowPosition(index)) {
                return; // Skip drawing this bike if position visibility is disabled
            }
            
            const saddleX = bike.saddleX || 0;
            const saddleY = bike.saddleY || 0;
            const seatTubeAngle = bike.sta || 0;
            const seatTubeLength = bike.stl || 0;
            
            console.log(`updateBikeVisualization called for bike ${index + 1} with:`, { saddleX, saddleY, seatTubeAngle, seatTubeLength });

            // Calculate the values needed for visualization
            let bbToRail = '--';
            let bbToSRC = '--';
            let exposedSeatpost = '--';
            let effectiveSTA = '--';
            let setbackVsSTA = '--';

            if (saddleX !== 0 || saddleY !== 0) {
                // Only calculate saddle-related values if saddle position is within valid range
                if (this.isSaddlePositionValid(saddleX, saddleY)) {
                    const hasSTA = !!seatTubeAngle;
                    const hasSTL = !!seatTubeLength;

                    if (hasSTA) {
                        // Calculate setback vs STA (horizontal distance from seat tube extended)
                        const seatTubeX = saddleY * Math.tan((90 - seatTubeAngle) * Math.PI / 180);
                        setbackVsSTA = Math.round(seatTubeX - saddleX);
                    }
                    
                    // Calculate effective STA (angle from BB to saddle)
                    const angleFromVertical = Math.atan2(saddleX, saddleY) * 180 / Math.PI;
                    effectiveSTA = (90 - angleFromVertical).toFixed(1);
                    
                    if (hasSTA) {
                    // Calculate BB to Rail distance using seatpost calculator formula
                    const seatTubeLengthToSaddleYScale = saddleY / Math.sin((90 - seatTubeAngle + 90) * Math.PI / 180);
                    bbToRail = Math.round(seatTubeLengthToSaddleYScale);
                    
                        // Calculate exposed seatpost if STL present
                        if (hasSTL) {
                        exposedSeatpost = Math.round(bbToRail - seatTubeLength);
                    }
                    }

                    // Calculate BB to SRC (hypotenuse of Saddle X and Y values)
                    bbToSRC = Math.round(Math.sqrt(saddleX * saddleX + saddleY * saddleY));
                } else {
                    // Saddle position is outside valid range, set all related values to '--'
                    setbackVsSTA = '--';
                    effectiveSTA = '--';
                    bbToRail = '--';
                    bbToSRC = '--';
                    exposedSeatpost = '--';
                }
            }

            // Always update visualization if we have bike frame geometry, even without saddle position
            const hasFrameGeometry = bike && bike.reach && bike.stack && bike.hta && this.isFrameGeometryValid(bike.reach, bike.stack, bike.hta, bike.sta);
            if (saddleX !== 0 || saddleY !== 0 || hasFrameGeometry) {
                this.drawBikeVisualization(bike, saddleX, saddleY, seatTubeAngle, seatTubeLength, bbToRail, bbToSRC, exposedSeatpost, effectiveSTA, setbackVsSTA, index, commonOriginX, commonOriginY, commonScale);
            }
        });
        
        // Restore context after all bikes are drawn
        ctx.restore();
        
        // Draw disclaimer at bottom of canvas, centered with white background
        const disclaimerText = 'Frame, fork, & wheels are for illustrative purposes only. Some tube lengths may not represent the actual bike geometry.';
        const disclaimerFontSize = Math.max(14, 1);
        ctx.font = `${disclaimerFontSize}px Arial`;
        ctx.textAlign = 'center';
        
        // Calculate text dimensions for background
        const textMetrics = ctx.measureText(disclaimerText);
        const textWidth = textMetrics.width;
        const textHeight = disclaimerFontSize;
        
        // Position disclaimer at bottom of canvas with padding
        const disclaimerX = canvas.width / 2;
        const disclaimerY = canvas.height - 14;
        
        // Draw white background rectangle with padding
        const bgPadding = 2;
        const bgWidth = textWidth + (bgPadding * 2);
        const bgHeight = textHeight + (bgPadding * 2);
        const bgX = disclaimerX - (bgWidth / 2);
        const bgY = disclaimerY - textHeight - (bgPadding / 2);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        
        // Draw disclaimer text
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted-text-color') || '#777';
        ctx.fillText(disclaimerText, disclaimerX, disclaimerY);
    }

    drawBikeVisualization(bike, saddleX, saddleY, seatTubeAngle, seatTubeLength, bbToRail, bbToSRC, exposedSeatpost, effectiveSTA, setbackVsSTA, bikeIndex = 0, commonOriginX, commonOriginY, commonScale) {
        if (!this.canvas || !this.ctx) {
            return;
        }

        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Check if we have bike frame geometry
        const hasFrameGeometry = bike && bike.reach && bike.stack && bike.hta && this.isFrameGeometryValid(bike.reach, bike.stack, bike.hta, bike.sta);
        const hasSaddleInput = !!(saddleX || saddleY);
        
        // Draw visualization if we have either saddle position OR valid bike frame geometry
        if (!hasSaddleInput && !hasFrameGeometry) {
            return; // Don't draw empty state here, let the main method handle it
        }
        
        // Set opacity and colors based on bike index
        const opacity = bikeIndex === 0 ? 1.0 : 1.0; // First bike is fully opaque, second is semi-transparent
        ctx.globalAlpha = opacity;
        
        // Calculate scale to fit everything in canvas with padding
        const saddleDistanceScale = Math.sqrt(saddleX * saddleX + saddleY * saddleY);
        
        // Calculate seat tube projection for scaling; use fallbacks when inputs are missing
        const staForScale = (seatTubeAngle && seatTubeAngle > 0) ? seatTubeAngle : 73;
        const seatTubeLengthToSaddleYScale = saddleY ? (saddleY / Math.sin((90 - staForScale + 90) * Math.PI / 180)) : 500; // default length when saddleY missing
        const displaySeatTubeLengthScale = (seatTubeLength && seatTubeLength > 0) ? seatTubeLength : seatTubeLengthToSaddleYScale;
        
        const seatTubeX = displaySeatTubeLengthScale * Math.cos((90 - staForScale + 90) * Math.PI / 180);
        const seatTubeY = displaySeatTubeLengthScale * Math.sin((90 - staForScale + 90) * Math.PI / 180);
        const exposedX = exposedSeatpost && exposedSeatpost > 0 && seatTubeLength ? exposedSeatpost * Math.cos((90 - seatTubeAngle + 90) * Math.PI / 180) : 0;
        const exposedY = exposedSeatpost && exposedSeatpost > 0 && seatTubeLength ? exposedSeatpost * Math.sin((90 - seatTubeAngle + 90) * Math.PI / 180) : 0;
        
        const handlebarRadiusMm = 31.8 / 2;
        
        // Calculate handlebar position early for bounds calculation and reference lines
        let handlebarCenterX = 0;
        let handlebarCenterY = 0;
        if (bike && bike.reach && bike.stack && bike.hta && this.isFrameGeometryValid(bike.reach, bike.stack, bike.hta, bike.sta)) {
            const htaDeg = bike.hta || 0;
            const stemAngleDeg = (bike.stemAngle !== undefined && bike.stemAngle !== '') ? bike.stemAngle : 0;
            const spacersHeightMm = (bike.spacersHeight !== undefined && bike.spacersHeight !== '') ? bike.spacersHeight : 0;
            const headsetHeightMm = (bike.headsetHeight !== undefined && bike.headsetHeight !== '') ? bike.headsetHeight : 0;
            const stemHeightHalfMm = (bike.stemHeight !== undefined && bike.stemHeight !== '') ? (bike.stemHeight / 2) : 20;
            const stemLengthMm = (bike.stemLength !== undefined && bike.stemLength !== '') ? bike.stemLength : 0;

            const htaRad = (180 - htaDeg) * Math.PI / 180;
            const stemRad = (90 - htaDeg + stemAngleDeg) * Math.PI / 180;
            const stemCenterX = (headsetHeightMm + spacersHeightMm + stemHeightHalfMm) * Math.cos(htaRad);
            const stemCenterY = (headsetHeightMm + spacersHeightMm + stemHeightHalfMm) * Math.sin(htaRad);
            const clampX = stemLengthMm * Math.cos(stemRad);
            const clampY = stemLengthMm * Math.sin(stemRad);
            handlebarCenterX = (bike.reach || 0) + stemCenterX + clampX;
            handlebarCenterY = (bike.stack || 0) + stemCenterY + clampY;
        }


        
        // Use the common origin coordinates and scale passed from the main method
        const originX = commonOriginX;
        const originY = commonOriginY;
        const scale = commonScale;
        

        
        
        // Colors - different colors for each bike position
        const frameColor = bikeIndex === 0 ? '#cccccc' : '#FFA552'; // Gray for first bike, orange for second bike
        const colors = {
            seatTube: bikeIndex === 0 ? 
                (getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007bff') : 
                '#FFA552', // Orange for second bike
            exposedSeatpost: bikeIndex === 0 ? '#cccccc' : '#FFD0A3', // Lighter orange for second bike
            saddle: bikeIndex === 0 ? '#28a745' : '#FFA552', // Orange saddle for second bike
            bb: bikeIndex === 0 ? '#6c757d' : '#FFA552', // Orange BB for second bike
            text: getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333'
        };
        
        // Scale line widths and sizes for better visibility
        const lineWidth = Math.max(2, scale * 0.8);
        const bbRadius = 47 * scale / 2; // Make BB diameter represent 47mm
        const saddleRadius = Math.max(4, scale * 0.8);
        // Optional override for where the seat stay should attach on the seat tube
        let seatStayAttachX = null;
        let seatStayAttachY = null;
        // Wheel dimensions for 700x30c (BSD 622mm + 2x30mm tire = 682mm OD)
        const rimDiameterMm = 622;
        const tireWidthMm = 17;
        const wheelDiameterMm = rimDiameterMm + 2 * tireWidthMm; // 682mm
        const wheelRadiusMm = wheelDiameterMm / 2; // 341mm
        // Track front axle height so rear axle can be aligned to it
        let forkAxleY = null;
        
        
        // Draw head tube and down tube (detailed frame representation)
        const reach = bike.reach || 0;
        const stack = bike.stack || 0;
        const headTubeAngle = bike.hta || 0; // Get Head Tube Angle
        if (reach && stack && headTubeAngle && this.isFrameGeometryValid(reach, stack, headTubeAngle, bike.sta)) {
            const headTubeWidth = 35 * scale; // 35mm head tube width
            const headTubeAngleRad = (360 + headTubeAngle) * Math.PI / 180;
            
            // Calculate head tube end position (bottom of head tube at Y = 410)
            const headTubeEndY = originY - 420 * scale; // Locked to Y = 410
            const headTubeEndX = originX + reach * scale + (headTubeEndY - (originY - stack * scale)) / Math.tan(headTubeAngleRad);
            
            // Draw head tube as a thick line
            ctx.strokeStyle = frameColor;
            ctx.lineWidth = headTubeWidth;
            ctx.beginPath();
            ctx.moveTo(originX + reach * scale, originY - stack * scale);
            ctx.lineTo(headTubeEndX, headTubeEndY);
            ctx.stroke();
            
            // Draw down tube from bottom of head tube to BB center
            const downTubeStartX = headTubeEndX - 35 * scale * Math.cos(headTubeAngleRad);
            const downTubeStartY = headTubeEndY - 35 * scale * Math.sin(headTubeAngleRad);
            
            ctx.strokeStyle = frameColor;
            ctx.lineWidth = 35 * scale; // 35mm line width (same as head tube)
            ctx.beginPath();
            ctx.moveTo(downTubeStartX, downTubeStartY);
            ctx.lineTo(originX, originY);
            ctx.stroke();
            
            // Draw top tube
            const topTubeStartX = originX + reach * scale + 35 * scale * Math.cos(headTubeAngleRad);
            const topTubeStartY = originY - stack * scale + 35 * scale * Math.sin(headTubeAngleRad);

            const noSeatTubeLength = !(seatTubeLength && seatTubeLength > 0);
            if (noSeatTubeLength) {
                // Intersect a line from the head tube at -4° with the seat tube line at provided STA or 73° fallback
                const staValue = (seatTubeAngle && seatTubeAngle > 0) ? seatTubeAngle : 73;
                const staRad = (180 - staValue) * Math.PI / 180;
                // Seat tube direction in canvas coordinates points up-left from BB
                const dSeatX = Math.cos(staRad);
                const dSeatY = -Math.sin(staRad);
                // -4° slope means slightly downwards from left-to-right in screen space
                const slopeRad = -4 * Math.PI / 180;
                const dTopX = Math.cos(slopeRad);
                const dTopY = Math.sin(slopeRad);
                const P0x = topTubeStartX;
                const P0y = topTubeStartY;
                const Q0x = originX;
                const Q0y = originY;
                const denom = dTopX * (-dSeatY) - dTopY * (-dSeatX);
                let t = 0;
                if (Math.abs(denom) > 1e-6) {
                    const rx = Q0x - P0x;
                    const ry = Q0y - P0y;
                    t = (rx * (-dSeatY) - ry * (-dSeatX)) / denom;
                }
                const meetX = P0x + t * dTopX;
                const meetY = P0y + t * dTopY;

                seatStayAttachX = meetX;
                seatStayAttachY = meetY;

                ctx.strokeStyle = frameColor;
                ctx.lineWidth = 35 * scale;
                ctx.beginPath();
                ctx.moveTo(topTubeStartX, topTubeStartY);
                ctx.lineTo(meetX, meetY);
                ctx.stroke();
            } else {
                // Standard behavior: meet the computed seat tube end
                // If STA is missing but STL exists, fall back to 73° for drawing
                const staForTopTube = (seatTubeAngle && seatTubeAngle > 0) ? seatTubeAngle : 73;
                const displaySeatTubeLengthForTopTube = seatTubeLength;
                const seatTubeEndY = originY - displaySeatTubeLengthForTopTube * Math.sin((180 - staForTopTube) * Math.PI / 180) * scale;
                const seatTubeEndX = originX + displaySeatTubeLengthForTopTube * Math.cos((180 - staForTopTube) * Math.PI / 180) * scale;

                ctx.strokeStyle = frameColor;
                ctx.lineWidth = 35 * scale; // 35mm line width (same as other tubes)
                ctx.beginPath();
                ctx.moveTo(topTubeStartX, topTubeStartY);
                ctx.lineTo(seatTubeEndX+5, seatTubeEndY+25);
                ctx.stroke();
            }
            

            // Draw a red line indicating the top of the head tube
            // Centered at the top of the head tube and perpendicular to its axis
            const htTopCenterX = originX + reach * scale;
            const htTopCenterY = originY - stack * scale;
            const halfHTWidth = headTubeWidth / 2;
            // Perpendicular unit vector to head tube axis
            const perpUx = Math.sin(headTubeAngleRad);
            const perpUy = -Math.cos(headTubeAngleRad);

            // Draw fork from bottom of head tube along head tube angle
            const forkLengthMm = 365; // approximate axle-to-crown
            const forkBladeWidth = 28 * scale;
            const forkEndX = headTubeEndX + forkLengthMm * scale * Math.cos(headTubeAngleRad) + 50;
            const forkEndY = headTubeEndY + forkLengthMm * scale * Math.sin(headTubeAngleRad);
            forkAxleY = forkEndY;

            // Calculate BB Drop (vertical distance between fork axle and bottom bracket)
//            let bbDrop = null;
//            if (forkAxleY !== null) {
                // Since canvas Y-axis is inverted (positive Y is down), 
                // BB drop = forkAxleY - originY (positive means BB is below fork axle)
//                bbDrop = (forkAxleY - originY) / scale;
                
                // Draw BB Drop measurement
//                ctx.save();
//                ctx.fillStyle = colors.text;
//                ctx.font = `${Math.max(14, scale * 1.5)}px Arial`;
//                ctx.textAlign = 'left';
//                ctx.textBaseline = 'middle';
                
                // Position the text to the right of the BB, aligned with the fork axle height
//                const bbDropLabelX = originX + 60 * scale;
//                const bbDropLabelY = (forkAxleY + originY) / 2; // Midpoint between BB and fork axle
                
//                ctx.fillText(`BB Drop: ${Math.abs(bbDrop).toFixed(1)} mm`, bbDropLabelX, bbDropLabelY);
                
                // Draw vertical line showing BB Drop measurement
//                ctx.strokeStyle = colors.text;
//                ctx.lineWidth = Math.max(1, scale * 0.5);
//                ctx.setLineDash([5, 5]); // Dashed line
//                ctx.beginPath();
//                ctx.moveTo(bbDropLabelX - 10 * scale, forkAxleY);
//                ctx.lineTo(bbDropLabelX - 10 * scale, originY);
//                ctx.stroke();
//                ctx.setLineDash([]); // Reset to solid line
                
                // Draw small horizontal lines at ends
//                ctx.beginPath();
//                ctx.moveTo(bbDropLabelX - 15 * scale, forkAxleY);
//                ctx.lineTo(bbDropLabelX - 5 * scale, forkAxleY);
//                ctx.moveTo(bbDropLabelX - 15 * scale, originY);
//                ctx.lineTo(bbDropLabelX - 5 * scale, originY);
//                ctx.stroke();
                
//                ctx.restore();
//            }
            // Front wheel circle (700x30c) - draw BEFORE fork and hub so it sits behind
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = Math.max(30, scale);
            ctx.beginPath();
            ctx.arc(forkEndX, forkEndY, wheelRadiusMm * scale, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Front wheel rim (black circle)
            ctx.strokeStyle = '#bbbbbb';
            ctx.lineWidth = Math.max(2, scale * 0.8);
            ctx.beginPath();
            ctx.arc(forkEndX, forkEndY, 622/2*scale, 0, 2 * Math.PI); // 700c Rim
            ctx.stroke();

            // Draw fork on top of wheel
            // Start slightly inside the head tube to avoid any visual gap
            const forkStartX = headTubeEndX - Math.cos(headTubeAngleRad) * (headTubeWidth / 2);
            const forkStartY = headTubeEndY - Math.sin(headTubeAngleRad) * (headTubeWidth / 2);
            // Perpendicular unit vector to the fork axis
            const perpX = -Math.sin(headTubeAngleRad);
            const perpY =  Math.cos(headTubeAngleRad);
            const topHalfWidth = forkBladeWidth / 1.8;
            const bottomHalfWidth = 10 * scale; // match hub radius so edges meet the hub

            const startLeftX = forkStartX - perpX * topHalfWidth;
            const startLeftY = forkStartY - perpY * topHalfWidth;
            const startRightX = forkStartX -5 + perpX * topHalfWidth;
            const startRightY = forkStartY + perpY * topHalfWidth;
            const endLeftX = forkEndX - perpX * bottomHalfWidth;
            const endLeftY = forkEndY - perpY * bottomHalfWidth;
            const endRightX = forkEndX + perpX * bottomHalfWidth;
            const endRightY = forkEndY + perpY * bottomHalfWidth;

            ctx.fillStyle = frameColor;
            ctx.strokeStyle = frameColor;
            ctx.beginPath();
            ctx.moveTo(startLeftX, startLeftY);
            ctx.lineTo(endLeftX, endLeftY);
            ctx.lineTo(endRightX, endRightY);
            ctx.lineTo(startRightX, startRightY);
            ctx.closePath();
            ctx.fill();
            // Front axle hub
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = Math.max(1, scale * 0.5);
            ctx.beginPath();
            ctx.arc(forkEndX, forkEndY, 10 * scale, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();


            // Draw headset height above the head tube (red trapezoid) - between frame and spacers
            const headsetHeightMm = (bike.headsetHeight !== undefined && bike.headsetHeight !== '') ? parseFloat(bike.headsetHeight) : 0;
            let headsetEndX = htTopCenterX;
            let headsetEndY = htTopCenterY;
            if (headsetHeightMm > 0) {
                // Calculate the end position (top of headset)
                headsetEndX = htTopCenterX - headsetHeightMm * scale * Math.cos(headTubeAngleRad);
                headsetEndY = htTopCenterY - headsetHeightMm * scale * Math.sin(headTubeAngleRad);
                
                // Calculate the four corners of the trapezoid
                // Bottom corners (at head tube width)
                const bottomLeftX = htTopCenterX - perpUx * halfHTWidth;
                const bottomLeftY = htTopCenterY - perpUy * halfHTWidth;
                const bottomRightX = htTopCenterX + perpUx * halfHTWidth;
                const bottomRightY = htTopCenterY + perpUy * halfHTWidth;
                
                // Top corners (narrowed to spacer width - 28.6mm)
                const spacerWidth = 28.6 * scale;
                const topLeftX = headsetEndX - perpUx * (spacerWidth / 2);
                const topLeftY = headsetEndY - perpUy * (spacerWidth / 2);
                const topRightX = headsetEndX + perpUx * (spacerWidth / 2);
                const topRightY = headsetEndY + perpUy * (spacerWidth / 2);
                
                // Draw the trapezoid
                ctx.fillStyle = '#555555';
                ctx.strokeStyle = '#555555';
                ctx.lineWidth = Math.max(1, scale * 0.5);
                ctx.beginPath();
                ctx.moveTo(bottomLeftX, bottomLeftY);
                ctx.lineTo(bottomRightX, bottomRightY);
                ctx.lineTo(topRightX, topRightY);
                ctx.lineTo(topLeftX, topLeftY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            // Draw spacers above the headset height along the head tube angle (under the red line)
            const spacerHeightMm = (bike.spacersHeight !== undefined && bike.spacersHeight !== '') ? parseFloat(bike.spacersHeight) : 0;
            let spacerEndX = headsetEndX;
            let spacerEndY = headsetEndY;
            if (spacerHeightMm > 0) {
                // Draw upwards from the headset end (opposite the head tube direction)
                spacerEndX = headsetEndX - spacerHeightMm * scale * Math.cos(headTubeAngleRad);
                spacerEndY = headsetEndY - spacerHeightMm * scale * Math.sin(headTubeAngleRad);

                ctx.strokeStyle = '#a0a0a0';
                ctx.lineWidth = 28.6 * scale; // Steerer/spacer stack width
                ctx.beginPath();
                ctx.moveTo(headsetEndX, headsetEndY);
                ctx.lineTo(spacerEndX, spacerEndY);
                ctx.stroke();
            }

            // Draw the stem head above the spacers using Stem Height (still underneath the red line)
            const stemHeightMm = (bike.stemHeight !== undefined && bike.stemHeight !== '') ? parseFloat(bike.stemHeight) : 0;
            if (stemHeightMm > 0) {
                const stemHeadEndX = spacerEndX - stemHeightMm * scale * Math.cos(headTubeAngleRad);
                const stemHeadEndY = spacerEndY - stemHeightMm * scale * Math.sin(headTubeAngleRad);

                ctx.strokeStyle = '#bbb';
                ctx.lineWidth = 31.8 * scale; // Stem clamp outer width
                ctx.beginPath();
                ctx.moveTo(spacerEndX, spacerEndY);
                ctx.lineTo(stemHeadEndX, stemHeadEndY);
                ctx.stroke();

                // From the center of the Stem Height, draw the stem body using Stem Length and Stem Angle
                const stemCenterX = (spacerEndX + stemHeadEndX) / 2;
                const stemCenterY = (spacerEndY + stemHeadEndY) / 2;
                const stemLengthMm = (bike.stemLength !== undefined && bike.stemLength !== '') ? parseFloat(bike.stemLength) : 0;
                const stemAngleDeg = (bike.stemAngle !== undefined && bike.stemAngle !== '') ? parseFloat(bike.stemAngle) : 0;
                if (stemLengthMm > 0) {
                    // Angle relative to head tube angle; match stack-reach convention
                    const stemAngleRad = (-90 + headTubeAngle - stemAngleDeg) * Math.PI / 180;
                    const stemBodyEndX = stemCenterX + stemLengthMm * scale * Math.cos(stemAngleRad);
                    const stemBodyEndY = stemCenterY + stemLengthMm * scale * Math.sin(stemAngleRad);

                    ctx.strokeStyle = '#bbb';
                    ctx.lineWidth = 28.6 * scale; // Stem body width
                    ctx.beginPath();
                    ctx.moveTo(stemCenterX, stemCenterY);
                    ctx.lineTo(stemBodyEndX, stemBodyEndY);
                    ctx.stroke();

                    // Draw handlebar clamp as a 31.8mm diameter circle at the end of the stem body
                    const handlebarRadius = (31.8 / 2) * scale;
                    const primaryColor = bikeIndex === 0 ? 
                        (getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007aff') : 
                        '#FF932E'; // Orange for second bike
                    ctx.fillStyle = primaryColor;
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = Math.max(1, scale * 0.5);
                    ctx.beginPath();
                    ctx.arc(stemBodyEndX, stemBodyEndY, handlebarRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }
            }

            // Red marker drawn last so it appears on top of spacers/stem head
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = Math.max(1, scale * 1.5);
            ctx.beginPath();
            ctx.moveTo(htTopCenterX - perpUx * halfHTWidth, htTopCenterY - perpUy * halfHTWidth);
            ctx.lineTo(htTopCenterX + perpUx * halfHTWidth, htTopCenterY + perpUy * halfHTWidth);
            ctx.stroke();

        }
        
        // Draw seat tube and exposed seatpost AFTER top/down tubes so they appear on top
        // Draw seat tube (rotated 90° counterclockwise). If STA/STL missing or 0, use mock STA=73° and default length to saddleY
        const staForSeatTube = (seatTubeAngle && seatTubeAngle > 0) ? seatTubeAngle : 73;
        const seatTubeLengthToSaddleY = saddleY / Math.sin((180 - staForSeatTube) * Math.PI / 180);
        const displaySeatTubeLength = (seatTubeLength && seatTubeLength > 0) ? seatTubeLength : seatTubeLengthToSaddleY; // Use calculated length as default if not provided
        const seatTubeEndX = originX + displaySeatTubeLength * Math.cos((180 - staForSeatTube) * Math.PI / 180) * scale;
        const seatTubeEndY = originY - displaySeatTubeLength * Math.sin((180 - staForSeatTube) * Math.PI / 180) * scale;

        // Draw rear triangle: chainstay and seat stay (simplified)
        // Rear axle location (assume horizontal rear-center of 410mm behind BB)
        const chainstayLengthMm = 410;
        const rearAxleX = originX - chainstayLengthMm * scale;
        const rearAxleY = (forkAxleY !== null) ? forkAxleY : originY;
        // Rear wheel circle (700x30c) - draw BEFORE stays so it sits behind
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = Math.max(30, scale);
        ctx.beginPath();
        ctx.arc(rearAxleX, rearAxleY, wheelRadiusMm * scale, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Rear wheel rim (black circle)
        ctx.strokeStyle = '#bbbbbb';
        ctx.lineWidth = Math.max(2, scale * 0.8);
        ctx.beginPath();
        ctx.arc(rearAxleX, rearAxleY, 622/2 * scale, 0, 2 * Math.PI); // 700c Rim
        ctx.stroke();

        // Chainstay
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 20 * scale;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(rearAxleX, rearAxleY);
        ctx.stroke();
        // Seat stay from seat tube attachment to rear axle
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 18 * scale;
        ctx.beginPath();
        const seatStayStartX = (seatStayAttachX !== null) ? seatStayAttachX : (seatTubeEndX + 10);
        const seatStayStartY = (seatStayAttachY !== null) ? seatStayAttachY : (seatTubeEndY + 10);
        ctx.moveTo(seatStayStartX, seatStayStartY);
        ctx.lineTo(rearAxleX, rearAxleY);
        ctx.stroke();
        // Rear hub
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, scale * 0.5);
        ctx.beginPath();
        ctx.arc(rearAxleX, rearAxleY, 10 * scale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        
        // If no ST length provided, draw as trapezoid to the intersection with top tube and seat stay
        if (!seatTubeLength || seatTubeLength === 0) {
            // Use the intersection point calculated earlier for the top tube
            if (seatStayAttachX !== null && seatStayAttachY !== null) {
                // Calculate the angle of the seat tube from BB to intersection point
                const seatTubeAngleRad = Math.atan2(seatStayAttachY - originY, seatStayAttachX - originX);
                
                // Calculate the width of the seat tube (31.8mm)
                const seatTubeWidth = 27.2 * scale;
                
                // Calculate the four corners of the seat tube
                // Bottom left (where it meets the BB) - horizontal bottom edge
                const bottomLeftX = originX - (seatTubeWidth / 2);
                const bottomLeftY = originY;
                
                // Bottom right (where it meets the BB) - horizontal bottom edge
                const bottomRightX = originX + (seatTubeWidth / 2);
                const bottomRightY = originY;
                
                // Calculate the top corners at the intersection point
                // The top edge should be perpendicular to the seat tube direction
                const perpAngleRad = seatTubeAngleRad + Math.PI / 2;
                
                // Top left - extend from intersection point with constant width
                const topLeftX = seatStayAttachX - Math.cos(perpAngleRad) * (seatTubeWidth / 2);
                const topLeftY = seatStayAttachY - Math.sin(perpAngleRad) * (seatTubeWidth / 2);
                
                // Top right - extend from intersection point with constant width
                const topRightX = seatStayAttachX + Math.cos(perpAngleRad) * (seatTubeWidth / 2);
                const topRightY = seatStayAttachY + Math.sin(perpAngleRad) * (seatTubeWidth / 2);
                
                // Draw the trapezoid
                ctx.fillStyle = colors.seatTube;
                ctx.beginPath();
                ctx.moveTo(bottomLeftX, bottomLeftY);
                ctx.lineTo(topLeftX, topLeftY-20);
                ctx.lineTo(topRightX, topRightY-20);
                ctx.lineTo(bottomRightX, bottomRightY);
                ctx.closePath();
                ctx.fill();
            } else {
                // Fallback: draw to saddle Y position if no intersection point available
                const seatTubeAngleRad = (180 - staForSeatTube) * Math.PI / 180;
                const seatTubeWidth = 27.2 * scale;
                
                const bottomLeftX = originX - (seatTubeWidth / 2);
                const bottomLeftY = originY;
                const bottomRightX = originX + (seatTubeWidth / 2);
                const bottomRightY = originY;
                
                const saddleCanvasY = originY - saddleY * scale;
                const seatTubeLengthPx = displaySeatTubeLength * scale;
                const topCenterX = originX + seatTubeLengthPx * Math.cos(seatTubeAngleRad);
                const topCenterY = saddleCanvasY;
                
                const topLeftX = topCenterX - (seatTubeWidth / 2);
                const topLeftY = saddleCanvasY;
                const topRightX = topCenterX + (seatTubeWidth / 2);
                const topRightY = saddleCanvasY;
                
                ctx.fillStyle = colors.seatTube;
                ctx.beginPath();
                ctx.moveTo(bottomLeftX, bottomLeftY);
                ctx.lineTo(topLeftX, topLeftY);
                ctx.lineTo(topRightX, topRightY);
                ctx.lineTo(bottomRightX, bottomRightY);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            // If ST length provided, draw as simple line
            ctx.strokeStyle = colors.seatTube;
            ctx.lineWidth = 31.8 * scale; // Make line thickness represent 31.8mm wide
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(seatTubeEndX, seatTubeEndY);
            ctx.stroke();
        }
        
        // Draw exposed seatpost if applicable (always draw the visual, but conditionally show the label)
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
            
            // Add rotated label for exposed seatpost - only if seatpost measurements are shown
            if (this.shouldShowSeatpostMeasurements(bikeIndex)) {
                // Calculate midpoint of the exposed seatpost line
                const exposedMidX = (seatTubeEndX + exposedEndX) / 2;
                const exposedMidY = (seatTubeEndY + exposedEndY) / 2;
                
                // Determine label position based on eSTA vs STA comparison
                const effectiveSTANum = parseFloat(effectiveSTA);
                const seatTubeAngleNum = parseFloat(seatTubeAngle);
                let offsetDistance = 0 * scale;
                let perpAngle = exposedAngleRad + Math.PI / 2; // Perpendicular angle
                
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
                ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : colors.text;
                ctx.textAlign = 'center';
                ctx.font = `${Math.max(15, scale * 2)}px Arial`;
                ctx.fillText(`${exposedSeatpost} mm`, 0, +5);
                
                // Restore context
                ctx.restore();
            }
        }
        
           // Draw bottom bracket (on top of everything)
                ctx.fillStyle = '#ffffff'; // White fill
                ctx.strokeStyle = '#000000'; // Black edge
                ctx.lineWidth = Math.max(1, scale * 0.5); // Edge thickness
                ctx.beginPath();
                ctx.arc(originX, originY, bbRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

        // Draw saddle image with high resolution (same as seatpost calculator)
        if (saddleX && saddleY && this.isSaddlePositionValid(saddleX, saddleY)) {
            // Check if we have a preloaded saddle image
            if (!this.saddleImage || !this.saddleImage.complete) {
                // Create and preload the image if it doesn't exist
                this.saddleImage = new Image();
                this.saddleImage.onload = () => {
                    // Force a redraw when the image loads
                    this.updateBikeVisualization();
                };
                this.saddleImage.onerror = () => {
                    console.log('Saddle image failed to load, using fallback circle');
                };
                this.saddleImage.src = '../images/saddle.png';
            } else {
                // Image is already loaded, draw it immediately
                const saddleLengthPixels = 250 * scale; // scale to 250mm saddle length
                const imageAspectRatio = this.saddleImage.width / this.saddleImage.height;
                const saddleWidth = saddleLengthPixels;
                const saddleHeight = saddleLengthPixels / imageAspectRatio;

                // Align image center to saddle X/Y with small empirical offsets (consistent with seatpost calculator)
                // Note: originX and originY are already in the transformed coordinate system due to the ctx.translate and ctx.scale
                const saddleCanvasXImg = originX - (saddleX - 8) * scale;
                const saddleCanvasYImg = originY - (saddleY + 26) * scale;
                
                // Debug logging to see what coordinates are being used
                console.log('Saddle image coordinates:', {
                    originX,
                    originY,
                    saddleX,
                    saddleY,
                    scale,
                    saddleCanvasXImg,
                    saddleCanvasYImg,
                    viewState: this.viewState
                });

                // Log the current transformation matrix
                const transform = ctx.getTransform();
                console.log('Canvas transformation matrix:', transform);

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(
                    this.saddleImage,
                    saddleCanvasXImg - saddleWidth / 2,
                    saddleCanvasYImg - saddleHeight / 2,
                    saddleWidth,
                    saddleHeight
                );
            }
        }

        // Calculate saddle canvas coordinates if saddle position is provided and valid
        let saddleCanvasX, saddleCanvasY;
        if (saddleX && saddleY && this.isSaddlePositionValid(saddleX, saddleY)) {
            saddleCanvasX = originX - saddleX * scale;
            saddleCanvasY = originY - saddleY * scale;
            
            // Draw saddle position dot
            ctx.fillStyle = colors.saddle;
            ctx.beginPath();
            ctx.arc(saddleCanvasX, saddleCanvasY, saddleRadius, 0, 0 * Math.PI);
            ctx.fill();
            
            // Add Setback vs STA label beneath the saddle dot - only if seatpost measurements are shown
            if (this.shouldShowSeatpostMeasurements(bikeIndex) && setbackVsSTA && setbackVsSTA !== '--' && seatTubeAngle) {
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
                
                ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : colors.saddle; // Red for Bike 2, green for Bike 1
                ctx.textAlign = 'center';
                ctx.font = `${Math.max(14, scale * 2)}px Arial`;
                
                // Add + sign for positive values
                const displayValue = parseFloat(setbackValue) > 0 ? `+${setbackValue} mm` : `${setbackValue} mm`;
                ctx.fillText(displayValue, saddleCanvasX + horizontalOffset, saddleCanvasY + 25 * scale);
            }
        }
        
        // Draw line from BB to saddle (Effective STA) - only if seatpost measurements are shown and saddle position is valid
        if (this.shouldShowSeatpostMeasurements(bikeIndex) && saddleX && saddleY && this.isSaddlePositionValid(saddleX, saddleY)) {
            ctx.strokeStyle = bikeIndex === 1 ? '#ff0000' : colors.saddle; // Red for Bike 2, green for Bike 1
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
                ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : colors.saddle;
                ctx.textAlign = 'center';
                ctx.font = `${Math.max(15, scale * 2)}px Arial`;
                ctx.fillText(`BB to SRC: ${bbToSRC} mm`, 0, verticalOffset);
                
                // Restore context
                ctx.restore();
            }
        }
        
        // Draw effective STA arc from horizontal (only above Y axis) - only if seatpost measurements are shown and saddle position is valid
        if (this.shouldShowSeatpostMeasurements(bikeIndex) && saddleX && saddleY && this.isSaddlePositionValid(saddleX, saddleY)) {
            const arcRadius = 80 * scale; // Much larger radius for visibility
            const startAngle = Math.PI; // Start at 180 degrees (negative X axis)
            const endAngle = Math.PI + (parseFloat(effectiveSTA) * Math.PI / 180); // End at effective STA angle
            
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
                
                ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : colors.saddle;
                ctx.textAlign = 'center';
                ctx.font = `${Math.max(14, scale * 2)}px Arial`;
                ctx.fillText(`eSTA: ${effectiveSTA}°`, eSTALabelX, eSTALabelY);
                ctx.textAlign = 'left'; // Reset to default alignment
            }
        }
        
        // Draw STA arc from horizontal (only above Y axis) - only if seatpost measurements are shown
        if (this.shouldShowSeatpostMeasurements(bikeIndex) && seatTubeAngle) {
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
            
            ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : colors.seatTube;
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
        


        // Precompute handlebar position in canvas coordinates for use across sections
        // These are independent of the Cartesian (XY) visibility toggle
        let handlebarCanvasX = null;
        let handlebarCanvasY = null;
        if (bike && bike.reach && bike.stack && bike.hta && this.isFrameGeometryValid(bike.reach, bike.stack, bike.hta, bike.sta)) {
            handlebarCanvasX = originX + handlebarCenterX * scale;
            handlebarCanvasY = originY - handlebarCenterY * scale;
        }

        // Draw dashed reference lines to key points (on top of bike geometry) - only if XY axes are shown
        if (this.shouldShowXYAxes(bikeIndex) && (saddleX || saddleY || (bike && bike.reach && bike.stack))) {
            // Handlebar canvas coordinates are precomputed above
            
            // Set dashed line style for reference lines
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);
            
            // Only draw saddle reference lines if saddle position is within valid range
            if (saddleX && saddleY && this.isSaddlePositionValid(saddleX, saddleY)) {
                // Calculate SRC point (Saddle Rail Center) from Saddle X and Y
                const srcX = originX - saddleX * scale;
                const srcY = originY - saddleY * scale;
                
                // Draw horizontal dashed line from Y-axis to SRC point
                ctx.beginPath();
                ctx.moveTo(originX, srcY);
                ctx.lineTo(srcX, srcY);
                ctx.stroke();
                
                // Draw vertical dashed line from X-axis to SRC point
                ctx.beginPath();
                ctx.moveTo(srcX, originY);
                ctx.lineTo(srcX, srcY);
                ctx.stroke();
                
                // Draw small reference point at SRC
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.arc(srcX, srcY, 2, 0, 2 * Math.PI);
                ctx.fill();
                
                // Add axis labels for SRC
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333';
                ctx.font = `${Math.max(14, scale * 1.5)}px Arial`;
                ctx.textAlign = 'center';
                
                // Horizontal line label (centered along the dashed line)
                const horizontalMidX = (originX + srcX) / 2;
                ctx.fillText(`${Math.abs(saddleX)} mm`, horizontalMidX, srcY + 14);
                
                // Vertical line label (centered along the dashed line, rotated 90° clockwise)
                const verticalMidY = (originY + srcY) / 2;
                ctx.save();
                ctx.translate(srcX + 6, verticalMidY);
                ctx.rotate(Math.PI / 2); // 90° clockwise
                ctx.fillText(`${saddleY} mm`, 0, 0);
                ctx.restore();
            }
            
            // Draw handlebar reference lines if available and frame geometry is valid
            if (handlebarCanvasX !== null && handlebarCanvasY !== null && bike && bike.reach && bike.stack && bike.hta && this.isFrameGeometryValid(bike.reach, bike.stack, bike.hta, bike.sta)) {
                // Draw horizontal dashed line from Y-axis to handlebar
                ctx.beginPath();
                ctx.moveTo(originX, handlebarCanvasY);
                ctx.lineTo(handlebarCanvasX, handlebarCanvasY);
                ctx.stroke();
                
                // Draw vertical dashed line from X-axis to handlebar
                ctx.beginPath();
                ctx.moveTo(handlebarCanvasX, originY);
                ctx.lineTo(handlebarCanvasX, handlebarCanvasY);
                ctx.stroke();
                
                // Draw small reference point at handlebar
                ctx.beginPath();
                ctx.arc(handlebarCanvasX, handlebarCanvasY, 2, 0, 2 * Math.PI);
                ctx.fill();
                
                // Add axis labels for handlebar
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333';
                ctx.font = `${Math.max(14, scale * 1.5)}px Arial`;
                ctx.textAlign = 'center';
                
                // Calculate handlebar X and Y values in mm
                const handlebarX = (handlebarCanvasX - originX) / scale;
                const handlebarY = (originY - handlebarCanvasY) / scale;
                
                // Horizontal line label (centered along the dashed line)
                const handlebarHorizontalMidX = (originX + handlebarCanvasX) / 2;
                ctx.fillText(`${Math.abs(handlebarX).toFixed(0)} mm`, handlebarHorizontalMidX, handlebarCanvasY - 6);
                
                // Vertical line label (centered along the dashed line, rotated 90° clockwise)
                const handlebarVerticalMidY = (originY + handlebarCanvasY) / 2;
                ctx.save();
                ctx.translate(handlebarCanvasX + 6, handlebarVerticalMidY);
                ctx.rotate(Math.PI / 2); // 90° clockwise
                ctx.fillText(`${handlebarY.toFixed(0)} mm`, 0, 0);
                ctx.restore();
                
            }
            // Draw head tube top reference lines (Stack and Reach) - only if frame geometry is valid
            if (bike && bike.reach && bike.stack && bike.hta && this.isFrameGeometryValid(bike.reach, bike.stack, bike.hta, bike.sta)) {
                // Calculate head tube top point from Stack and Reach
                const headTubeTopX = originX + (bike.reach || 0) * scale;
                const headTubeTopY = originY - (bike.stack || 0) * scale;
                            
                // Draw horizontal dashed line from Y-axis to head tube top
                ctx.beginPath();
                ctx.moveTo(originX, headTubeTopY);
                ctx.lineTo(headTubeTopX, headTubeTopY);
                ctx.stroke();
                            
                // Draw vertical dashed line from X-axis to head tube top
                ctx.beginPath();
                ctx.moveTo(headTubeTopX, originY);
                ctx.lineTo(headTubeTopX, headTubeTopY);
                ctx.stroke();
                            
                // Draw small reference point at head tube top
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.arc(headTubeTopX, headTubeTopY, 2, 0, 2 * Math.PI);
                ctx.fill();
                            
                // Add axis labels for head tube top
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333333';
                ctx.font = `${Math.max(14, scale * 1.5)}px Arial`;
                ctx.textAlign = 'center';
                            
                // Horizontal line label (centered along the dashed line - Reach)
                const headTubeHorizontalMidX = (originX + headTubeTopX) / 2;
                ctx.fillText(`${bike.reach} mm`, headTubeHorizontalMidX, headTubeTopY - 6);
                            
                // Vertical line label (centered along the dashed line - Stack, rotated 90° clockwise)
                const headTubeVerticalMidY = (originY + headTubeTopY) / 2;
                ctx.save();
                ctx.translate(headTubeTopX + 6, headTubeVerticalMidY);
                ctx.rotate(Math.PI / 2); // 90° clockwise
                ctx.fillText(`${bike.stack} mm`, 0, 0);
                ctx.restore();
            }
            

            
            // Reset line style
            ctx.setLineDash([]);
        }

                // Draw X and Y axes (only if XY axes are shown)
                if (this.shouldShowXYAxes(bikeIndex)) {
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
                    
                    // Draw axis labels
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007bff';
                    ctx.font = `${Math.max(12, scale * 2)}px Arial`;
                    ctx.textAlign = 'center';
                    
                    // X-axis label
                    ctx.fillText('X', canvas.width - 20, originY - 10);
                    
                    // Y-axis label
                    ctx.fillText('Y', originX + 20, 20);
                }
                
                // Draw origin point (BB) with a small circle
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007bff';
                ctx.beginPath();
                ctx.arc(originX, originY, 3, 0, 2 * Math.PI);
                ctx.fill();
        
        
        // Draw BB to Rail label - only if seatpost measurements are shown
        if (this.shouldShowSeatpostMeasurements(bikeIndex) && bbToRail && bbToRail !== '--' && seatTubeAngle) {
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
                const offsetDistance = 15 * scale;
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
                ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : colors.text;
                ctx.textAlign = 'center';
                ctx.font = `${Math.max(14, scale * 2)}px Arial`;
                ctx.fillText(`BB to Rail: ~${bbToRail} mm`, 0, verticalOffset);
                
                // Restore context
                ctx.restore();

        // Draw polar measurements from BB and SRC to handlebar - only if seatpost measurements are shown
            if (this.shouldShowSeatpostMeasurements(bikeIndex) && handlebarCanvasX !== null && handlebarCanvasY !== null && bike && bike.reach && bike.stack && bike.hta && this.isFrameGeometryValid(bike.reach, bike.stack, bike.hta, bike.sta)) {
                // Calculate handlebar X and Y values in mm for distance calculations
                const handlebarX = (handlebarCanvasX - originX) / scale;
                const handlebarY = (originY - handlebarCanvasY) / scale;
                
                // Draw dashed line from BB to handlebar center with measurement
                ctx.strokeStyle = '#28a745'; // Green color for BB-to-handlebar line
                ctx.lineWidth = 1.5;
                ctx.setLineDash([8, 4]); // Different dash pattern to distinguish from axis lines
                
                // Draw the line from BB (origin) to handlebar center
                ctx.beginPath();
                ctx.moveTo(originX, originY);
                ctx.lineTo(handlebarCanvasX, handlebarCanvasY);
                ctx.stroke();
                
                // Draw dashed arc from horizontal X axis to BB-handlebar line
                const bbHandlebarAngle = Math.atan2(handlebarCanvasY - originY, handlebarCanvasX - originX);
                const arcRadius = 75 * scale; // Arc radius for the angle
                
                // Draw arc from horizontal (0 degrees) to BB-handlebar angle
                // Ensure positive angle by checking if we need to go clockwise or counter-clockwise
                let startAngle = 0;
                let endAngle = bbHandlebarAngle;
                
                // If the angle is negative (handlebar is below horizontal), draw in positive direction
                if (bbHandlebarAngle < 0) {
                    startAngle = bbHandlebarAngle;
                    endAngle = 0;
                }
                
                ctx.beginPath();
                ctx.arc(originX, originY, arcRadius, startAngle, endAngle);
                ctx.stroke();
                
                // Add label for BB-handlebar angle - positioned just beyond the arc radius, halfway between the angle
                const bbHandlebarMidAngle = (startAngle + endAngle) / 2; // Halfway between start and end angles
                const bbHandlebarLabelX = originX + (arcRadius + 40 * scale) * Math.cos(bbHandlebarMidAngle);
                const bbHandlebarLabelY = originY + (arcRadius + 20 * scale) * Math.sin(bbHandlebarMidAngle);
                
                // Calculate the angle in degrees for display - always show positive value
                const bbHandlebarAngleDeg = Math.abs((endAngle - startAngle) * 180 / Math.PI).toFixed(1);
                
                ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : '#28a745'; // Red for Bike 2, green for Bike 1
                ctx.textAlign = 'center';
                ctx.font = `${Math.max(14, scale * 1.5)}px Arial`;
                ctx.fillText(`${bbHandlebarAngleDeg}°`, bbHandlebarLabelX, bbHandlebarLabelY);
                ctx.textAlign = 'left'; // Reset to default alignment
                
                // Calculate the distance from BB to handlebar
                const bbToHandlebarDistance = Math.sqrt(handlebarX * handlebarX + handlebarY * handlebarY);
                
                // Add measurement label along the BB-to-handlebar line
                const lineMidX = (originX + handlebarCanvasX) / 2;
                const lineMidY = (originY + handlebarCanvasY) / 2;
                
                // Calculate perpendicular offset to position label
                const lineAngle = Math.atan2(handlebarCanvasY - originY, handlebarCanvasX - originX);
                const perpAngle = lineAngle + Math.PI / 2;
                const offsetDistance = 25 * scale;
                const offsetX = Math.cos(perpAngle) * offsetDistance;
                const offsetY = Math.sin(perpAngle) * offsetDistance;
                
                // Draw the measurement label rotated parallel to the line
                ctx.save();
                ctx.translate(lineMidX + offsetX - 20, lineMidY + offsetY - 20);
                ctx.rotate(lineAngle); // Rotate text parallel to the line
                
                ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : '#28a745';
                ctx.font = `${Math.max(14, scale * 1.5)}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(`${bbToHandlebarDistance.toFixed(0)} mm`, 0, 0);
                ctx.restore();
                
            // Draw dashed line from SRC to handlebar center with measurement
                if (saddleX && saddleY && this.isSaddlePositionValid(saddleX, saddleY)) {
                    // Calculate SRC point (Saddle Rail Center) from Saddle X and Y
                    const srcX = originX - saddleX * scale;
                    const srcY = originY - saddleY * scale;
                    
                    // Draw dashed line from SRC to handlebar center
                    ctx.strokeStyle = '#28a745'; // Green color for SRC-to-handlebar line
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([8, 4]); // Different dash pattern to distinguish from other lines
                    
                    // Draw the line from SRC to handlebar center
                    ctx.beginPath();
                    ctx.moveTo(srcX, srcY);
                    ctx.lineTo(handlebarCanvasX, handlebarCanvasY);
                    ctx.stroke();
                    
                    // Calculate the distance from SRC to handlebar
                    const srcToHandlebarDistance = Math.sqrt(
                        Math.pow(handlebarCanvasX - srcX, 2) + 
                        Math.pow(handlebarCanvasY - srcY, 2)
                    ) / scale; // Convert back to mm
                    
                    // Add measurement label along the SRC-to-handlebar line
                    const srcLineMidX = (srcX + handlebarCanvasX) / 2;
                    const srcLineMidY = (srcY + handlebarCanvasY) / 2;
                    
                    // Calculate perpendicular offset to position label
                    const srcLineAngle = Math.atan2(handlebarCanvasY - srcY, handlebarCanvasX - srcX);
                    const srcPerpAngle = srcLineAngle + Math.PI / 2;
                    const srcOffsetDistance = 25 * scale;
                    const srcOffsetX = Math.cos(srcPerpAngle) * srcOffsetDistance;
                    const srcOffsetY = Math.sin(srcPerpAngle) * srcOffsetDistance;
                    
                    // Draw the measurement label rotated parallel to the line
                    ctx.save();
                    ctx.translate(srcLineMidX + srcOffsetX + 25, srcLineMidY + srcOffsetY - 25);
                    ctx.rotate(srcLineAngle); // Rotate text parallel to the line
                    
                    ctx.fillStyle = bikeIndex === 1 ? '#ff0000' : '#28a745';
                    ctx.font = `${Math.max(14, scale * 1.5)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText(`${srcToHandlebarDistance.toFixed(0)} mm`, 0, 0);
                    ctx.restore();
                }
                
                // Reset line style back to original
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 3]);
            }
        }
        
        // Reset line dash pattern to solid lines for next bike
        ctx.setLineDash([]);
    }

    refreshBikeCardsAfterLogin() {
        // This method will update all bike cards to load geometry data after a user logs in
        // It replaces the old removeDisabledBikeCards method
        
        // Find all non-manual bike cards
        const bikes = this.bikes.filter(bike => !bike.isManual);
        
        // For each bike, fetch and display the geometry data if brand, model, and size are selected
        bikes.forEach(bike => {
            const card = document.getElementById(bike.id);
            if (!card) return;
            
            // If the bike already has brand, model, and size selected, fetch its geometry
            if (bike.brand && bike.model && bike.size) {
                // Remove any login notices
                const loginNotices = card.querySelectorAll('.login-notice');
                loginNotices.forEach(notice => notice.remove());
                
                // Fetch geometry data
                this.database.getBikeGeometry(bike.brand, bike.model, bike.size)
                    .then(geometry => {
                        if (geometry) {
                            // Update bike properties
                            bike.reach = geometry.reach;
                            bike.stack = geometry.stack;
                            bike.hta = geometry.hta;
                            bike.sta = geometry.sta;
                            bike.stl = geometry.stl;
                            
                            // Update display
                            card.querySelector('.reach').value = geometry.reach;
                            card.querySelector('.stack').value = geometry.stack;
                            card.querySelector('.hta').value = geometry.hta;
                            card.querySelector('.sta').value = geometry.sta;
                            card.querySelector('.stl').value = geometry.stl;
                            
                            // Clear any placeholders
                            card.querySelector('.reach').placeholder = "";
                            
                            // Don't apply stock values during login refresh - preserve existing values
                            // Stock values will only be applied when user actively selects a different bike
                            
                            // Update calculations
                            this.updateCalculationsForBike(bike.id);
                            
                            // Save the updated data
                            this.saveData();
                        }
                    });
            }
            else {
                // Just remove login notices since geometry isn't applicable yet
                const loginNotices = card.querySelectorAll('.login-notice');
                loginNotices.forEach(notice => notice.remove());
            }
        });
    }

    // Replace the old removeDisabledBikeCards method
    removeDisabledBikeCards() {
        // This method is kept for backwards compatibility but calls the new method
        this.refreshBikeCardsAfterLogin();
    }

    // Add a method for toast notifications
    showToast(message, type = 'success', duration = 3000) {
        // Remove any existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        
        // Set background color based on type
        let bgColor = 'var(--success-color, #4CAF50)';
        if (type === 'error') {
            bgColor = 'var(--error-color, #F44336)';
        } else if (type === 'info') {
            bgColor = 'var(--info-color, #2196F3)';
        }
        
        // Position the toast
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background-color: ${bgColor};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        toast.innerHTML = message;
        document.body.appendChild(toast);
        
        // Fade in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);
        
        // Fade out after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}

class BikeDatabase {
    constructor() {
        // Use secure server-side function instead of direct API calls
        this.bikeData = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            await this.loadBikeData();
        } catch (error) {
            console.error('Failed to initialize bike database:', error);
        }
    }

    async loadBikeData() {
        const range = 'A:P';  // Use same range as other calculators
        
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

    processSheetData(values) {
        if (!values || values.length < 2) return [];
        
        const headers = values[0];
        return values.slice(1).map(row => {
            const bike = {};
            headers.forEach((header, index) => {
                const value = row[index] || '';
                bike[header.toLowerCase().replace(/\s+/g, '_')] = value;
            });
            return bike;
        });
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
            // Add stock values for stem configuration
            stemHeight: bike.stem_height !== undefined && bike.stem_height !== '' ? parseFloat(bike.stem_height) : null,
            stemLength: bike.stem_length !== undefined && bike.stem_length !== '' ? parseFloat(bike.stem_length) : null,
            stemAngle: bike.stem_angle !== undefined && bike.stem_angle !== '' ? parseFloat(bike.stem_angle) : null,
            spacersHeight: bike.spacer_height !== undefined && bike.spacer_height !== '' ? parseFloat(bike.spacer_height) : null,
            headsetHeight: bike.headset_height !== undefined && bike.headset_height !== '' ? parseFloat(bike.headset_height) : null
        };
    }
}
        
// Add hover styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .delete-selected-button:hover {
        background-color: var(--error-color) !important;
        color: white !important;
    }
    .cancel-button:hover {
        background-color: var(--border-color) !important;
        color: var(--text-color) !important;
    }
`;
document.head.appendChild(styleSheet);
        
// Ensure graph updates on theme change
if (window.MutationObserver) {
    const observer = new MutationObserver(() => {
        if (window.calculator && typeof window.calculator.updateXYStemComparisonGraph === 'function') {
            window.calculator.updateXYStemComparisonGraph();
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
        
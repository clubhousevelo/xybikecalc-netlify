// Function to detect and apply theme based on system preference and user settings
function initializeTheme() {
    // Check if user has previously set a theme preference
    const storedTheme = localStorage.getItem('theme');
    
    // If no stored preference, check system preference
    if (!storedTheme) {
      // Check if user prefers dark mode
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Set theme based on system preference
      document.documentElement.setAttribute('data-theme', prefersDarkMode ? 'dark' : 'light');
      
      // Update toggle buttons to match
      updateThemeToggleButtons(prefersDarkMode ? 'dark' : 'light');
    } else {
      // Apply stored user preference
      document.documentElement.setAttribute('data-theme', storedTheme);
      updateThemeToggleButtons(storedTheme);
    }
    
    // Add listener for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      // Only apply system changes if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        const newTheme = event.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeToggleButtons(newTheme);
      }
    });
  }
  
  // Update all theme toggle buttons to match current theme
  function updateThemeToggleButtons(theme) {
    document.querySelectorAll('#darkModeToggle, #mobileDarkModeToggle').forEach(btn => {
      if (!btn) return;
      
      const icon = btn.querySelector('.toggle-icon');
      const text = btn.querySelector('.toggle-text');
      
      if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
      if (text) text.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    });
  }
  
  // Modify the existing toggle function to clearly set user preference
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Set explicit user preference in localStorage
    localStorage.setItem('theme', newTheme);
    
    // Update all toggle buttons
    updateThemeToggleButtons(newTheme);
    
    // Refresh canvas if it exists (for Stack & Reach Calculator)
    if (window.calculator && typeof window.calculator.updateVisualization === 'function') {
      window.calculator.updateVisualization();
    }
    
    // Refresh seatpost calculator canvas if it exists
    if (window.seatpostCalculator && typeof window.seatpostCalculator.redrawOnThemeChange === 'function') {
      window.seatpostCalculator.redrawOnThemeChange();
    }
    
    return false; // Prevent default action
  }
  
  // Initialize theme when page loads
  document.addEventListener('DOMContentLoaded', initializeTheme);
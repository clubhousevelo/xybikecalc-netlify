document.addEventListener('DOMContentLoaded', function() {
    const calculatorHeader = document.querySelector('.calculator-header');
    
    if (calculatorHeader) {
        // Get the current page identifier from the URL
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const storageKey = `calculatorDescriptionCollapsed_${currentPage}`;
        
        // Check if there's a saved state in localStorage for this specific page
        const isCollapsed = localStorage.getItem(storageKey) === 'true';
        if (isCollapsed) {
            calculatorHeader.classList.add('collapsed');
        }

        calculatorHeader.addEventListener('click', function() {
            this.classList.toggle('collapsed');
            // Save state to localStorage for this specific page
            localStorage.setItem(storageKey, this.classList.contains('collapsed'));
        });
    }
}); 
// Central place to manage application version
const APP_VERSION = "1.6.1";

// Function to set version number in all navigation footers
function setVersionNumbers() {
    // Select all version number containers
    const versionElements = document.querySelectorAll('.version a');
    
    // Update the text in each element
    versionElements.forEach(element => {
        element.textContent = `version ${APP_VERSION}`;
    });
}

// Run when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', setVersionNumbers); 
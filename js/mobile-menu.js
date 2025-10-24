document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav a');

    // Toggle mobile menu
    hamburgerMenu.addEventListener('click', function() {
        this.classList.toggle('active');
        mobileNav.classList.toggle('active');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu when clicking a link
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburgerMenu.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!mobileNav.contains(event.target) && !hamburgerMenu.contains(event.target) && mobileNav.classList.contains('active')) {
            hamburgerMenu.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Update active state based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    mobileNavLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}); 
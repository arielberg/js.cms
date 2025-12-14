/**
 * Navigation Helper
 * Handles active link highlighting and navigation state
 */

/**
 * Update active navigation link based on current hash
 */
export function updateActiveNav() {
  const hash = window.location.hash || '#';
  const navLinks = document.querySelectorAll('#sidebar .nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const linkHash = link.getAttribute('href');
    
    // Check if current hash matches link
    if (linkHash === hash || 
        (hash.startsWith(linkHash + '/') && linkHash !== '#') ||
        (linkHash === '#content-types' && hash === '#content-types')) {
      link.classList.add('active');
    }
  });
}

/**
 * Initialize navigation
 */
export function initNavigation() {
  // Update on hash change
  window.addEventListener('hashchange', updateActiveNav);
  
  // Update on initial load
  setTimeout(updateActiveNav, 100);
  
  // Update after a short delay to ensure DOM is ready
  setTimeout(updateActiveNav, 200);
}


/* ===================== PAGE LOADER ===================== */
window.addEventListener('load', () => {
    const loader = document.getElementById('page-loader');
    if (loader) setTimeout(() => loader.classList.add('hidden'), 400);
});

/* ===================== ADMIN SESSION MANAGEMENT ===================== */
let adminSession = null;

function checkAdminSession() {
    const session = localStorage.getItem('adminSession');
    if (session) {
        try {
            adminSession = JSON.parse(session);
            return true;
        } catch (e) {
            localStorage.removeItem('adminSession');
            return false;
        }
    }
    return false;
}

/* ===================== NAV SCROLL ===================== */
const nav = document.getElementById('main-nav');

window.addEventListener('scroll', () => {
    if (window.scrollY > 0) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
}, { passive: true });

/* ===================== THEME TOGGLE ===================== */
const themeBtn = document.getElementById('theme-switch');
const body = document.body;

function updateThemeButton() {
    const isDark = body.classList.contains('dark-mode');
    themeBtn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

themeBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    updateThemeButton();
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
});

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
    }
    updateThemeButton();

    // Check admin session and show admin panel if logged in
    if (checkAdminSession()) {
        showAdminPanel();
    }

    // Load profile image if available
    loadProfileImage();

    loadShowreelForPublic();
    initAdminSystem();
    setupEyeToggle();
    initMagneticButtons();
});

const EYE_OPEN   = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function setupEyeToggle() {
    const btn   = document.getElementById('eye-toggle');
    const input = document.getElementById('admin-password');
    if (!btn || !input) return;

    btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type   = show ? 'text' : 'password';
        btn.innerHTML = show ? EYE_CLOSED : EYE_OPEN;
        btn.classList.toggle('active', show);
    });
}

function loadShowreelForPublic() {
    const videoElement = document.getElementById('showreel-video');
    const placeholder = document.getElementById('placeholder-bg');
    const qualityOverlay = document.getElementById('quality-overlay');

    if (!videoElement || !placeholder) return;

    async function loadShowreelInfo() {
        try {
            const response = await fetch('/api/showreel');
            const data = await response.json();

            if (data.success) {
                console.log('Showreel info:', data.file);
                videoElement.src = '/api/showreel/watch?quality=auto';
                videoElement.style.display = 'block';
                placeholder.style.display = 'none';
                videoElement.load();
                videoElement.controls = true;
                if (qualityOverlay) qualityOverlay.style.display = 'block';
                
                // Setup quality selector
                setupQualitySelector();
            } else {
                videoElement.style.display = 'none';
                placeholder.style.display = 'flex';
                if (qualityOverlay) qualityOverlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading showreel info:', error);
            videoElement.style.display = 'none';
            placeholder.style.display = 'flex';
        }
    }

    function setupQualitySelector() {
        const qualitySelect = document.getElementById('quality-select');

        if (!qualitySelect) return;

        qualitySelect.addEventListener('change', (e) => {
            const quality = e.target.value;
            const currentTime = videoElement.currentTime;
            const wasPlaying = !videoElement.paused;

            videoElement.src = `/api/showreel/watch?quality=${quality}`;
            videoElement.currentTime = currentTime;
            videoElement.load();

            if (wasPlaying) {
                videoElement.play().catch(() => {});
            }
        });
    }

    loadShowreelInfo();
}

function initAdminUploader() {
    // Legacy function - kept for compatibility but does nothing now
    // Admin features moved to separate endpoint or removed for public site
}

/* ===================== SMOOTH SCROLL ===================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

/* ===================== SCROLL REVEAL ===================== */
window.addEventListener('DOMContentLoaded', () => {
    if (typeof ScrollReveal === 'undefined') return;

    const sr = ScrollReveal({
        distance: '44px',
        duration: 1100,
        delay: 80,
        reset: false,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: 0
    });

    sr.reveal('.section-header',   { origin: 'bottom', delay: 100 });
    sr.reveal('.video-container',  { origin: 'bottom', delay: 180, distance: '64px' });
    sr.reveal('.category-card',    { origin: 'bottom', interval: 70, distance: '32px' });
    sr.reveal('.contact-card',     { origin: 'bottom', delay: 120, distance: '36px' });
});

/* ===================== CATEGORY CARD — subtle tilt ===================== */
document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 6;
        const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 6;
        this.style.transform = `perspective(800px) rotateX(${-y}deg) rotateY(${x}deg)`;
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
        this.style.transition = 'transform 0.5s ease';
    });

    card.addEventListener('mouseenter', function() {
        this.style.transition = 'transform 0.1s ease';
    });
});

/* ===================== MAGNETIC BUTTONS ===================== */
function initMagneticButtons() {
    const STRENGTH = 0.28;
    const EASE_OUT = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.35s ease';
    const EASE_IN  = 'transform 0.1s linear, background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.35s ease';

    document.querySelectorAll('.btn-primary, .btn-secondary, .theme-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transition = EASE_IN;
        });

        btn.addEventListener('mousemove', e => {
            const r  = btn.getBoundingClientRect();
            const dx = (e.clientX - (r.left + r.width  / 2)) * STRENGTH;
            const dy = (e.clientY - (r.top  + r.height / 2)) * STRENGTH;
            btn.style.transform = `translate(${dx}px, ${dy}px) translateY(-3px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transition = EASE_OUT;
            btn.style.transform  = '';
        });
    });
}

/* ===================== BUTTON RIPPLE ===================== */
document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
    btn.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        ripple.style.cssText = `
            position:absolute; border-radius:50%;
            left:${e.clientX - rect.left}px; top:${e.clientY - rect.top}px;
            width:0; height:0; pointer-events:none;
            background:rgba(212,168,75,0.25);
            transform:translate(-50%,-50%);
            animation:ripple 0.55s ease-out forwards;
        `;
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

/* Ripple keyframe */
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to { width: 260px; height: 260px; opacity: 0; }
    }
`;
document.head.appendChild(style);

/* ===================== ADMIN SYSTEM ===================== */
function initAdminSystem() {
    const adminLink = document.getElementById('admin-link');
    const adminModal = document.getElementById('admin-modal');
    const closeModal = document.getElementById('close-admin-modal');
    const adminLoginForm = document.getElementById('admin-login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const adminPanel = document.getElementById('admin-panel');
    const toggleBtn = document.getElementById('admin-toggle-btn');

    // Small tab on right edge — re-opens the panel when it's hidden
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            adminPanel.style.display = 'block';
            adminPanel.classList.remove('hidden');
            toggleBtn.style.display = 'none';
        });
    }

    // Arrow inside panel header — collapses the panel
    const collapseBtn = document.getElementById('panel-collapse-btn');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            adminPanel.style.display = 'none';
            if (toggleBtn) toggleBtn.style.display = 'flex';
        });
    }

    // Admin link click
    if (adminLink) {
        adminLink.addEventListener('click', () => {
            if (adminSession) {
                showAdminPanel();
            } else {
                adminModal.style.display = 'flex';
            }
        });
    }

    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            adminModal.style.display = 'none';
            document.getElementById('admin-password').value = '';
        });
    }

    // Login form
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password').value;
            const statusDiv = document.getElementById('admin-login-status');

            try {
                const response = await fetch('/api/admin-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: 'shamsal619@gmail.com', 
                        password: password 
                    })
                });

                const data = await response.json();

                if (data.success) {
                    adminSession = { email: data.email };
                    localStorage.setItem('adminSession', JSON.stringify(adminSession));
                    adminModal.style.display = 'none';
                    document.getElementById('admin-password').value = '';
                    showAdminPanel();
                } else {
                    statusDiv.textContent = 'Invalid password';
                    statusDiv.style.color = '#ff4444';
                }
            } catch (error) {
                statusDiv.textContent = 'Error: ' + error.message;
                statusDiv.style.color = '#ff4444';
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            adminSession = null;
            localStorage.removeItem('adminSession');
            document.getElementById('admin-panel').style.display = 'none';
            const tb = document.getElementById('admin-toggle-btn');
            if (tb) tb.style.display = 'none';
        });
    }

    // Category cards click to navigate
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.admin-delete-btn')) return;
            const categoryName = this.querySelector('h3').textContent.trim();
            let categorySlug;
            
            // Map category names to database slugs
            const categoryMap = {
                'Animation Shorts': 'animation-shorts',
                'Real Estate': 'real-estate',
                'AI Ads': 'ai-ads',
                'Car Reels': 'car-reels',
                'Color Grading': 'color-grading',
                'Long-Form': 'long-form',
                'F&B': 'fb',
                'Insta Reels': 'medical',
                'Retouch': 'retouch'
            };
            
            categorySlug = categoryMap[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-');
            window.location.href = `category.html?name=${categorySlug}`;
        });
    });

    // Setup admin feature handlers
    setupAdminUpload();
}

function showAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    const adminModal = document.getElementById('admin-modal');
    const toggleBtn  = document.getElementById('admin-toggle-btn');
    if (adminPanel) {
        adminPanel.style.display = 'block';
        adminPanel.classList.remove('hidden');
        adminModal.style.display = 'none';
        if (toggleBtn) toggleBtn.style.display = 'none'; // tab hidden when panel is open
    }
}

async function loadProfileImage() {
    try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        
        if (data.success && data.photoUrl) {
            const profileImg = document.querySelector('.profile-circle img');
            if (profileImg) {
                profileImg.src = data.photoUrl;
            }
        }
    } catch (error) {
        console.log('No profile image available yet');
    }
}

function setupAdminUpload() {
    const profilePhotoInput   = document.getElementById('profile-photo-input');
    const profilePhotoTrigger = document.getElementById('profile-photo-trigger');
    const profileStatus       = document.getElementById('profile-upload-status');

    const showreelInput   = document.getElementById('showreel-input');
    const showreelTrigger = document.getElementById('showreel-trigger');
    const showreelStatus  = document.getElementById('showreel-upload-status');

    const deleteShowreelBtn   = document.getElementById('delete-showreel-btn');
    const categorySelect      = document.getElementById('category-select');
    const categoryCoverInput  = document.getElementById('category-cover-input');
    const categoryCoverTrigger= document.getElementById('category-cover-trigger');
    const coverStatus         = document.getElementById('cover-upload-status');

    /* ---- helper ---- */
    function setStatus(el, msg, color) {
        if (!el) return;
        el.textContent = msg;
        el.style.color = color || 'var(--muted)';
    }

    /* ---- Profile photo: click button → open picker → auto-upload ---- */
    if (profilePhotoTrigger && profilePhotoInput) {
        profilePhotoTrigger.addEventListener('click', () => profilePhotoInput.click());

        profilePhotoInput.addEventListener('change', async () => {
            const file = profilePhotoInput.files[0];
            if (!file) return;
            profilePhotoTrigger.disabled = true;
            setStatus(profileStatus, 'Uploading...', 'var(--muted)');

            const formData = new FormData();
            formData.append('profilePhoto', file);
            try {
                const res  = await fetch('/api/upload-profile', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    setStatus(profileStatus, '✓ Photo updated!', 'var(--blue)');
                    const img = document.querySelector('.profile-circle img');
                    if (img) img.src = data.imageUrl + '?t=' + Date.now();
                } else {
                    setStatus(profileStatus, 'Error: ' + data.message, '#e55');
                }
            } catch (e) {
                setStatus(profileStatus, 'Error: ' + e.message, '#e55');
            }
            profilePhotoInput.value = '';
            profilePhotoTrigger.disabled = false;
        });
    }

    /* ---- Showreel: click button → open picker → auto-upload ---- */
    if (showreelTrigger && showreelInput) {
        showreelTrigger.addEventListener('click', () => showreelInput.click());

        showreelInput.addEventListener('change', async () => {
            const file = showreelInput.files[0];
            if (!file) return;
            showreelTrigger.disabled = true;
            setStatus(showreelStatus, 'Uploading... (this may take a moment)', 'var(--muted)');

            const formData = new FormData();
            formData.append('showreel', file);
            formData.append('adminEmail', adminSession.email);
            try {
                const res  = await fetch('/api/upload-showreel', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    setStatus(showreelStatus, '✓ Showreel uploaded!', 'var(--blue)');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    setStatus(showreelStatus, 'Error: ' + data.message, '#e55');
                }
            } catch (e) {
                setStatus(showreelStatus, 'Error: ' + e.message, '#e55');
            }
            showreelInput.value = '';
            showreelTrigger.disabled = false;
        });
    }

    /* ---- Delete showreel ---- */
    if (deleteShowreelBtn) {
        deleteShowreelBtn.addEventListener('click', async () => {
            if (!confirm('Delete the current showreel?')) return;
            try {
                const res  = await fetch('/api/showreel', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminEmail: adminSession.email, password: '' })
                });
                const data = await res.json();
                if (data.success) { alert('Showreel deleted!'); location.reload(); }
                else alert('Error: ' + data.message);
            } catch (e) { alert('Error: ' + e.message); }
        });
    }

    /* ---- Category cover: select category → click button → open picker → auto-upload ---- */
    if (categoryCoverTrigger && categoryCoverInput) {
        categoryCoverTrigger.addEventListener('click', () => {
            if (!categorySelect.value) {
                setStatus(coverStatus, 'Please select a category first', '#e55');
                return;
            }
            categoryCoverInput.click();
        });

        categoryCoverInput.addEventListener('change', async () => {
            const file = categoryCoverInput.files[0];
            const categorySlug = categorySelect.value;
            if (!file || !categorySlug) return;
            categoryCoverTrigger.disabled = true;
            setStatus(coverStatus, 'Uploading...', 'var(--muted)');

            const formData = new FormData();
            formData.append('categorySlug', categorySlug);
            formData.append('coverImage', file);
            try {
                const res  = await fetch('/api/upload-category-cover', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    setStatus(coverStatus, '✓ Cover updated!', 'var(--blue)');
                    categorySelect.value = '';
                } else {
                    setStatus(coverStatus, 'Error: ' + data.message, '#e55');
                }
            } catch (e) {
                setStatus(coverStatus, 'Error: ' + e.message, '#e55');
            }
            categoryCoverInput.value = '';
            categoryCoverTrigger.disabled = false;
        });
    }
}

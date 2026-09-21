(function () {
    'use strict';

    var lenis = null;
    if (typeof window.Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.2,
            easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
            smoothWheel: true
        });
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    function scrollToTarget(hash) {
        var target = document.querySelector(hash);
        if (!target) return;
        if (lenis) {
            lenis.scrollTo(target, { offset: 0, duration: 1.4 });
        } else {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var hash = link.getAttribute('hash') || link.getAttribute('href');
            if (!hash || hash === '#') return;
            e.preventDefault();
            scrollToTarget(hash);
            closeMobileMenu();
        });
    });

    var nav = document.getElementById('nav');
    function onScroll() {
        if (!nav) return;
        if (window.scrollY > 60) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var navMenuBtn = document.getElementById('navMenuBtn');
    var mobileMenu = document.getElementById('mobileMenu');

    function closeMobileMenu() {
        if (navMenuBtn) navMenuBtn.classList.remove('active');
        if (mobileMenu) mobileMenu.classList.remove('active');
    }

    if (navMenuBtn && mobileMenu) {
        navMenuBtn.addEventListener('click', function () {
            navMenuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
    }

    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-link');
    if ('IntersectionObserver' in window && sections.length) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var id = entry.target.getAttribute('id');
                navLinks.forEach(function (link) {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        sections.forEach(function (s) { observer.observe(s); });
    }

    var FALLBACK_MENU = [
        { name: 'Smoked Burrata', description: 'Heirloom tomatoes, basil oil, smoked sea salt', price: 24, category: 'starters', featured: true },
        { name: 'Charred Octopus', description: 'Smoked paprika, fingerling potatoes, lemon', price: 32, category: 'starters', featured: false },
        { name: '45-Day Dry-Aged Ribeye', description: 'Bone marrow butter, charred shallot jus', price: 85, category: 'mains', featured: true },
        { name: 'Wood-Fired Lamb', description: 'Rosemary jus, roasted root vegetables', price: 72, category: 'mains', featured: false },
        { name: 'Smoked Chocolate Tart', description: 'Hickory smoke, sea salt, vanilla cream', price: 18, category: 'desserts', featured: false },
        { name: '2018 Reserve Cabernet', description: 'Napa Valley, full-bodied, blackberry notes', price: 185, category: 'wines', featured: true }
    ];

    var menuState = { items: FALLBACK_MENU, activeTab: 'all' };

    var CATEGORY_LABELS = { starters: 'Starter', mains: 'Main', desserts: 'Dessert', wines: 'Wine' };

    function renderMenu() {
        var grid = document.getElementById('menuGrid');
        if (!grid) return;
        var items = menuState.items.filter(function (item) {
            return menuState.activeTab === 'all' || item.category === menuState.activeTab;
        });
        grid.innerHTML = items.map(function (item) {
            var badge = item.featured ? '<span class="menu-card-badge">Chef\'s Pick</span>' : '';
            var label = CATEGORY_LABELS[item.category] || item.category;
            return '' +
                '<div class="menu-card" data-category="' + item.category + '">' +
                    '<div class="menu-card-image"><div class="image-placeholder"><span>' + item.name + '</span></div>' + badge + '</div>' +
                    '<div class="menu-card-content">' +
                        '<span class="menu-card-category">' + label + '</span>' +
                        '<h3 class="menu-card-name">' + item.name + '</h3>' +
                        '<p class="menu-card-description">' + (item.description || '') + '</p>' +
                        '<span class="menu-card-price">$' + Number(item.price).toFixed(0) + '</span>' +
                    '</div>' +
                '</div>';
        }).join('');
        if (window.EOAnimations && typeof window.EOAnimations.initMenuCardReveals === 'function') {
            window.EOAnimations.initMenuCardReveals();
        }
    }

    function loadMenu() {
        var grid = document.getElementById('menuGrid');
        if (grid) grid.innerHTML = '<p class="menu-loading">Setting the table...</p>';
        fetch('/api/menu')
            .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('bad status')); })
            .then(function (data) {
                var items = Array.isArray(data) ? data : (data.items || []);
                if (items.length) menuState.items = items;
                renderMenu();
            })
            .catch(function () { renderMenu(); });
    }

    document.querySelectorAll('.menu-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.menu-tab').forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            menuState.activeTab = tab.getAttribute('data-tab');
            renderMenu();
        });
    });

    var reserveForm = document.getElementById('reserveForm');
    var formSuccess = document.getElementById('formSuccess');

    if (reserveForm) {
        var dateInput = reserveForm.querySelector('input[name="date"]');
        if (dateInput) {
            var today = new Date().toISOString().split('T')[0];
            dateInput.setAttribute('min', today);
        }

        reserveForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!reserveForm.checkValidity()) {
                reserveForm.reportValidity();
                return;
            }
            var formData = new FormData(reserveForm);
            var payload = {};
            formData.forEach(function (value, key) { payload[key] = value; });

            var submitBtn = reserveForm.querySelector('.submit-btn .btn-text');
            var originalText = submitBtn ? submitBtn.textContent : null;
            if (submitBtn) submitBtn.textContent = 'Sending...';

            fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function (res) {
                    if (!res.ok) return res.json().then(function (err) { throw new Error(err.message || 'Reservation failed'); });
                    return res.json();
                })
                .then(function () {
                    reserveForm.style.display = 'none';
                    if (formSuccess) formSuccess.classList.add('visible');
                })
                .catch(function (err) {
                    alert(err.message || 'Could not submit reservation. Please call us at +1 (707) 555-0189.');
                })
                .finally(function () {
                    if (submitBtn && originalText) submitBtn.textContent = originalText;
                });
        });
    }

    var newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = newsletterForm.querySelector('input[type="email"]').value;
            fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Newsletter Signup', email: email, message: 'Newsletter subscription request' })
            })
                .then(function (res) {
                    if (!res.ok) throw new Error('failed');
                    newsletterForm.innerHTML = '<span class="footer-form-thanks">Thank you — you\'re on the list.</span>';
                })
                .catch(function () {
                    alert('Could not subscribe right now. Please try again later.');
                });
        });
    }

    loadMenu();
})();

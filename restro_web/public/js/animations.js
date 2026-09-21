(function () {
    'use strict';

    var hasGsap = typeof window.gsap !== 'undefined';
    var hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== 'undefined';
    if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    function finishLoading() {
        var preloader = document.getElementById('preloader');
        var body = document.body;
        if (preloader) preloader.classList.add('done');
        body.classList.remove('is-loading');
    }

    function runPreloader() {
        var preloader = document.getElementById('preloader');
        var progress = document.getElementById('preloaderProgress');
        var percent = document.getElementById('preloaderPercent');
        var chars = document.querySelectorAll('.preloader-char');

        if (!preloader) { finishLoading(); return; }

        if (!hasGsap) { finishLoading(); return; }

        gsap.to(chars, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.07,
            ease: 'power3.out'
        });

        var state = { value: 0 };
        gsap.to(state, {
            value: 100,
            duration: 1.8,
            ease: 'power2.inOut',
            delay: 0.3,
            onUpdate: function () {
                var v = Math.round(state.value);
                if (progress) progress.style.width = v + '%';
                if (percent) percent.textContent = v + '%';
            },
            onComplete: function () {
                gsap.to('.preloader-inner', {
                    opacity: 0,
                    y: -30,
                    duration: 0.5,
                    ease: 'power2.in',
                    onComplete: function () {
                        finishLoading();
                    }
                });
            }
        });
    }

    function initScrollProgress() {
        var bar = document.getElementById('scrollProgress');
        if (!bar) return;
        function update() {
            var doc = document.documentElement;
            var max = doc.scrollHeight - window.innerHeight;
            var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
            bar.style.width = pct + '%';
        }
        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    function initReveals() {
        if (!hasScrollTrigger) return;

        gsap.utils.toArray('.section-title .title-word').forEach(function (word, i) {
            gsap.from(word, {
                y: 60,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: { trigger: word, start: 'top 88%' }
            });
        });

        gsap.utils.toArray('.section-eyebrow').forEach(function (el) {
            gsap.from(el, {
                opacity: 0,
                x: -30,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 90%' }
            });
        });

        gsap.utils.toArray('.story-paragraph').forEach(function (el) {
            gsap.from(el, {
                opacity: 0,
                y: 40,
                duration: 0.9,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 88%' }
            });
        });

        gsap.utils.toArray('.stat').forEach(function (el) {
            gsap.from(el, {
                opacity: 0,
                y: 40,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 90%' }
            });
        });

        gsap.utils.toArray('.story-image').forEach(function (el) {
            gsap.from(el, {
                opacity: 0,
                y: 60,
                duration: 1,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 90%' }
            });
        });

        gsap.utils.toArray('.feature').forEach(function (el) {
            gsap.from(el, {
                opacity: 0,
                x: 50,
                duration: 0.9,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 88%' }
            });
        });

        gsap.utils.toArray('.testimonial').forEach(function (el) {
            gsap.from(el, {
                opacity: 0,
                y: 50,
                duration: 0.9,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 90%' }
            });
        });

        gsap.utils.toArray('.reserve-form, .form-success').forEach(function (el) {
            gsap.from(el, {
                opacity: 0,
                y: 60,
                duration: 1,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 85%' }
            });
        });

        gsap.utils.toArray('.contact-item').forEach(function (el) {
            gsap.from(el, {
                opacity: 0,
                y: 30,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 90%' }
            });
        });
    }

    function initCounters() {
        var counters = document.querySelectorAll('.stat-number');
        counters.forEach(function (el) {
            var target = parseInt(el.getAttribute('data-target'), 10) || 0;
            if (hasScrollTrigger) {
                var obj = { value: 0 };
                gsap.to(obj, {
                    value: target,
                    duration: 2,
                    ease: 'power2.out',
                    scrollTrigger: { trigger: el, start: 'top 90%', once: true },
                    onUpdate: function () {
                        el.textContent = Math.round(obj.value);
                    }
                });
            } else {
                el.textContent = target;
            }
        });
    }

    function initParallax() {
        if (!hasScrollTrigger) return;
        gsap.to('.story-image-1', {
            yPercent: -8,
            ease: 'none',
            scrollTrigger: { trigger: '.story-gallery', start: 'top bottom', end: 'bottom top', scrub: true }
        });
        gsap.to('.story-image-3', {
            yPercent: -8,
            ease: 'none',
            scrollTrigger: { trigger: '.story-gallery', start: 'top bottom', end: 'bottom top', scrub: true }
        });
        gsap.to('.story-image-2', {
            yPercent: -16,
            ease: 'none',
            scrollTrigger: { trigger: '.story-gallery', start: 'top bottom', end: 'bottom top', scrub: true }
        });
        gsap.to('.hero-bg-glow', {
            yPercent: 25,
            opacity: 0.3,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
    }

    function initMagnetic() {
        if (!hasGsap) return;
        if (!window.matchMedia('(pointer: fine)').matches) return;
        document.querySelectorAll('.magnetic').forEach(function (el) {
            el.addEventListener('mousemove', function (e) {
                var rect = el.getBoundingClientRect();
                var x = e.clientX - rect.left - rect.width / 2;
                var y = e.clientY - rect.top - rect.height / 2;
                gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: 'power2.out' });
            });
            el.addEventListener('mouseleave', function () {
                gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
            });
        });
    }

    function initMenuCardReveals() {
        if (!hasScrollTrigger) return;
        ScrollTrigger.batch('.menu-card', {
            start: 'top 92%',
            onEnter: function (batch) {
                gsap.from(batch, {
                    opacity: 0,
                    y: 50,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: 'power2.out',
                    overwrite: true
                });
            }
        });
    }

    window.EOAnimations = { initMenuCardReveals: initMenuCardReveals };

    function init() {
        runPreloader();
        initScrollProgress();
        initReveals();
        initCounters();
        initParallax();
        initMagnetic();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

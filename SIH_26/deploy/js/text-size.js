/* ============================================================
   EMERGENCY MITRA - TEXT SIZE / ACCESSIBILITY (js/text-size.js)
   ============================================================
   Government-portal style font controls: A−  A  A+  A++

     - Scales the ENTIRE page uniformly (static markup, Tailwind
       classes, px-based widgets, JS-rendered content) — like the
       browser's own zoom, but controlled in-page
     - 4 levels: 85% (A−) · 100% (A) · 115% (A+) · 130% (A++)
     - Persisted in localStorage ("em_text_scale") so the choice
       follows the user across every portal page
     - Widget markup is injected automatically into any page that
       includes this script — no per-page HTML needed
     - Keyboard shortcuts:  Ctrl/⌘ + Alt +  = / − / 0

   ENGINE: uses the standard CSS `zoom` on <html> (all modern
   browsers, incl. Firefox 126+). Older engines fall back to root
   font-size scaling (covers all rem/Tailwind text).
   ============================================================ */

(function () {
    'use strict';

    var KEY = 'em_text_scale';
    var LEVELS = [0.85, 1.0, 1.15, 1.30];      // A− , A , A+ , A++
    var LABELS = ['A−', 'A', 'A+', 'A++'];
    var DEFAULT_IDX = 1;

    var idx = DEFAULT_IDX;

    /* ---------- persistence ---------- */
    function load() {
        try {
            var v = parseInt(localStorage.getItem(KEY) || '', 10);
            if (v >= 0 && v < LEVELS.length) idx = v;
        } catch (e) { /* private mode */ }
    }
    function save() {
        try { localStorage.setItem(KEY, String(idx)); } catch (e) { /* private mode */ }
    }

    /* ---------- engine ---------- */
    function apply() {
        var scale = LEVELS[idx];
        var root = document.documentElement;
        var zoomable = false;
        try { zoomable = window.CSS && CSS.supports && CSS.supports('zoom', '1.15'); } catch (e) { zoomable = false; }

        if (zoomable) {
            root.style.zoom = String(scale);
            root.style.fontSize = '';                       // keep rem base intact
        } else {
            root.style.zoom = '';
            root.style.fontSize = (scale * 100) + '%';      // rem fallback (Tailwind scales)
        }
        /* tell overlay engines (tutorial) which engine is active: only the
           zoom engine distorts fixed-position coordinates */
        try { window.TextSize.engine = zoomable ? 'zoom' : 'font'; } catch (e) { }

        /* widget highlight state (widget may not be injected yet) */
        try {
            var btns = document.querySelectorAll('[data-ts-idx]');
            for (var i = 0; i < btns.length; i++) {
                var on = parseInt(btns[i].getAttribute('data-ts-idx'), 10) === idx;
                btns[i].className = on ? TS_ON : TS_OFF;
            }
        } catch (e) { /* querySelectorAll unavailable — skip styling */ }

        try { window.dispatchEvent(new CustomEvent('em:text-scale-changed', { detail: { scale: scale, idx: idx } })); } catch (e) { }
    }

    /* ---------- public API ---------- */
    window.TextSize = {
        set: function (i) {
            idx = Math.max(0, Math.min(LEVELS.length - 1, parseInt(i, 10) || 0));
            save(); apply();
        },
        up: function () { this.set(idx + 1); },
        down: function () { this.set(idx - 1); },
        reset: function () { this.set(DEFAULT_IDX); },
        current: function () { return LEVELS[idx]; },
        idx: function () { return idx; }
    };

    /* ---------- widget (injected on every page) ---------- */
    var TS_ON = 'ts-btn ts-on';
    var TS_OFF = 'ts-btn';

    function injectWidget() {
        if (document.getElementById('ts-widget')) return;

        var st = document.createElement('style');
        st.textContent =
            /* Compact + unbreakable: fixed-height buttons and flex-shrink:0
               keep the widget on ONE line inside the sticky header even at
               A+/A++ zoom (no more buttons sliding up-down when squeezed) */
            '#ts-widget{display:inline-flex;align-items:center;gap:1px;background:#fff;' +
            'border:1.5px solid #cfd8d5;border-radius:999px;padding:2px 4px;' +
            'box-shadow:0 2px 8px rgba(16,32,26,.10);z-index:60;vertical-align:middle;' +
            'flex-shrink:0;white-space:nowrap;height:30px}' +
            '#ts-widget.ts-float{position:fixed;bottom:14px;left:14px;z-index:55;' +
            'box-shadow:0 4px 16px rgba(16,32,26,.18)}' +
            '#ts-widget .ts-label{font-size:9px;font-weight:800;letter-spacing:.4px;color:#5b6f66;' +
            'padding:0 4px;display:inline-flex;align-items:center;gap:3px;text-transform:uppercase}' +
            '#ts-widget .ts-label .material-symbols-outlined{font-size:14px;color:#00453d}' +
            '.ts-btn{border:none;background:transparent;color:#37493f;font-weight:800;font-size:11px;' +
            'min-width:24px;height:22px;border-radius:999px;cursor:pointer;transition:all .15s ease;' +
            'display:inline-flex;align-items:center;justify-content:center;line-height:1;' +
            'flex-shrink:0;padding:0 2px}' +
            '.ts-btn:hover{background:#eef5f2;color:#00453d}' +
            '.ts-btn.ts-on{background:#00453d;color:#fff}' +
            '#ts-widget .ts-sep{width:1px;height:14px;background:#cfd8d5;margin:0 1px;flex-shrink:0}' +
            '@media (max-width:520px){#ts-widget .ts-word{display:none}}' +
            '@media print{#ts-widget{display:none}}';
        document.head.appendChild(st);

        var w = document.createElement('div');
        w.id = 'ts-widget';
        w.setAttribute('role', 'group');
        w.setAttribute('aria-label', 'Text size controls');
        var inner = '<span class="ts-label" title="Text size"><span class="material-symbols-outlined">text_increase</span>' +
            '<span class="ts-word">Aa</span></span><span class="ts-sep"></span>';
        for (var i = 0; i < LEVELS.length; i++) {
            inner += '<button type="button" class="ts-btn" data-ts-idx="' + i + '" ' +
                'title="' + (i === 0 ? 'Decrease text size' : i === 1 ? 'Normal text size' : i === 2 ? 'Large text size' : 'Largest text size') + '" ' +
                'aria-label="Text size ' + LABELS[i] + '" onclick="TextSize.set(' + i + ')">' +
                LABELS[i] + '</button>';
        }
        w.innerHTML = inner;
        /* Preferred placement: in the page header beside the Sign In
           button (clearly visible at the top, like govt portals).
           Fallback: floating bottom-left if no mount point exists. */
        var mount = document.getElementById('ts-mount') || document.querySelector('.ts-mount');
        if (mount) {
            mount.appendChild(w);
            w.classList.add('ts-inline');
            /* additional placements (e.g. mobile drawer) get a clone so
               the control is visible in every header variant */
            var extras = document.querySelectorAll('.ts-mount');
            for (var i = 0; i < extras.length; i++) {
                if (extras[i] !== mount) {
                    var clone = w.cloneNode(true);
                    clone.removeAttribute('id');       // duplicate IDs are invalid
                    extras[i].appendChild(clone);
                }
            }
        } else {
            document.body.appendChild(w);
            w.classList.add('ts-float');
        }
    }

    /* ---------- keyboard shortcuts ---------- */
    document.addEventListener('keydown', function (e) {
        if (!(e.ctrlKey || e.metaKey) || !e.altKey) return;
        if (e.key === '=' || e.key === '+') { e.preventDefault(); window.TextSize.up(); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); window.TextSize.down(); }
        else if (e.key === '0') { e.preventDefault(); window.TextSize.reset(); }
    });

    /* ---------- boot ---------- */
    function boot() {
        load();
        injectWidget();
        apply();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

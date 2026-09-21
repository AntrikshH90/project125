/* ============================================================
   EMERGENCY MITRA - SHARED FOOTER (js/footer.js)
   ============================================================
   Injects the full, responsive government-style footer into any
   page that has <div id="footer-root"></div>:

     • Emergency helpline strip — 108 / 112 / 1091 / 1098 / 1078
       (tap-to-call, colour-coded, works on mobile)
     • Brand block with offline-capability badges
     • QUICK LINKS — citizen portal, command center, key features
     • INFORMATION — Privacy Policy, Terms, Help Desk, Accessibility,
       Rural Outreach -> info.html?page=...  (real working pages)
     • CONTACT — office, email, hours
     • Legal bar — copyright, govt attribution, tech badges

   Fully responsive (1 / 2 / 4 column grid), keyboard accessible,
   and translated by js/translations.js (all strings are dictionary
   keys — footer re-walks on language change via the global walker).
   ============================================================ */

(function () {
    'use strict';

    function boot() {
        var root = document.getElementById('footer-root');
        if (!root || root.dataset.rendered) return;
        root.dataset.rendered = '1';

        var year = new Date().getFullYear();

        function tel(num, label, sub, color) {
            return '<a href="tel:' + num + '" ' +
                'class="group flex items-center gap-2.5 bg-white/5 hover:bg-white/15 border border-white/15 ' +
                'rounded-xl px-3 py-2.5 transition-all hover:-translate-y-0.5 min-w-0" ' +
                'aria-label="' + label + ' helpline ' + num + '">' +
                '<span class="material-symbols-outlined text-[20px] flex-shrink-0" style="color:' + color + '">' +
                'call</span>' +
                '<span class="min-w-0"><span class="block text-[15px] lg:text-base font-extrabold text-white leading-tight">' +
                num + '</span>' +
                '<span class="block text-[10.5px] lg:text-[11px] text-white/70 leading-tight">' + sub + '</span></span></a>';
        }

        function link(href, label, icon) {
            return '<a href="' + href + '" class="flex items-center gap-2 text-white/75 hover:text-white ' +
                'text-sm font-medium py-1 transition-colors group">' +
                '<span class="material-symbols-outlined text-[17px] text-[#71f8e4] opacity-70 ' +
                'group-hover:opacity-100 transition-opacity">' + icon + '</span>' + label + '</a>';
        }

        root.innerHTML =
            '<footer class="bg-[#00453d] text-white w-full mt-auto border-t-4 border-[#71f8e4]" role="contentinfo">' +

            /* ---- helpline strip ---- */
            '<div class="bg-black/20 border-b border-white/10">' +
            '<div class="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop py-3">' +
            '<div class="flex flex-wrap items-center justify-center lg:justify-between gap-2.5">' +
            '<span class="text-[10.5px] lg:text-xs font-extrabold tracking-wider text-white/80 ' +
            'uppercase flex items-center gap-1.5 mr-1">' +
            '<span class="material-symbols-outlined text-[16px] text-[#71f8e4] animate-pulse">emergency</span>' +
            'Emergency Helplines</span>' +
            '<div class="flex flex-wrap justify-center gap-2">' +
            tel('108', '108', 'Ambulance', '#71f8e4') +
            tel('112', '112', 'National Emergency', '#ff8a80') +
            tel('1091', '1091', 'Women Helpline', '#f48fb1') +
            tel('1098', '1098', 'Child Helpline', '#ffe082') +
            tel('1078', '1078', 'Disaster Mgmt', '#80cbc4') +
            '</div></div></div></div>' +

            /* ---- main grid ---- */
            '<div class="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop py-lg lg:py-xl">' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-lg gap-y-xl">' +

            /* brand */
            '<div class="space-y-3 min-w-0">' +
            '<div class="flex items-center gap-2.5">' +
            '<img src="logo.png" alt="Emergency Mitra" class="w-11 h-11 object-contain">' +
            '<div><div class="text-lg lg:text-xl font-bold leading-tight">Emergency Mitra</div>' +
            '<div class="text-[11px] text-white/70 leading-tight">Government of Maharashtra</div></div></div>' +
            '<p class="text-sm text-white/75 leading-relaxed">Right Care. Right Facility. Right Now. — ' +
            'connecting rural communities to the right government healthcare facility in the golden hour.</p>' +
            '<div class="flex flex-wrap gap-1.5 pt-1">' +
            '<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ' +
            'bg-white/10 border border-white/15"><span class="material-symbols-outlined text-[13px] text-[#71f8e4]">wifi_off</span>OFFLINE READY</span>' +
            '<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ' +
            'bg-white/10 border border-white/15"><span class="material-symbols-outlined text-[13px] text-[#71f8e4]">sms</span>SMS FALLBACK</span>' +
            '<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ' +
            'bg-white/10 border border-white/15"><span class="material-symbols-outlined text-[13px] text-[#71f8e4]">shield</span>TRUST SCORED</span>' +
            '</div></div>' +

            /* quick links */
            '<nav aria-label="Quick links"><h3 class="text-[11px] font-extrabold uppercase tracking-wider ' +
            'text-[#71f8e4] mb-3 flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[15px]">bolt</span>Quick Links</h3>' +
            '<div class="space-y-0.5">' +
            link('citizen.html', 'Citizen Portal', 'person') +
            link('citizen.html', 'Find Facilities', 'local_hospital') +
            link('citizen.html', 'AI Preliminary Triage', 'psychology') +
            link('admin-login.html', 'Officer Login', 'admin_panel_settings') +
            link('admin.html', 'Command Center', 'dashboard') +
            '</div></nav>' +

            /* information */
            '<nav aria-label="Information"><h3 class="text-[11px] font-extrabold uppercase tracking-wider ' +
            'text-[#71f8e4] mb-3 flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[15px]">menu_book</span>Information</h3>' +
            '<div class="space-y-0.5">' +
            link('info.html?page=privacy', 'Privacy Policy', 'privacy_tip') +
            link('info.html?page=terms', 'Terms of Service', 'gavel') +
            link('info.html?page=help', 'Help Desk', 'support_agent') +
            link('info.html?page=accessibility', 'Accessibility', 'accessibility_new') +
            link('info.html?page=outreach', 'Rural Outreach', 'diversity_3') +
            '</div></nav>' +

            /* contact */
            '<div><h3 class="text-[11px] font-extrabold uppercase tracking-wider text-[#71f8e4] mb-3 ' +
            'flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px]">contact_mail</span>Contact</h3>' +
            '<div class="space-y-2.5 text-sm text-white/75">' +
            '<p class="flex items-start gap-2"><span class="material-symbols-outlined text-[16px] text-[#71f8e4] mt-0.5">location_on</span>' +
            '<span>Office of the District Health Officer,<br>Collector Campus, Wardha — 442001, Maharashtra</span></p>' +
            '<p class="flex items-center gap-2"><span class="material-symbols-outlined text-[16px] text-[#71f8e4]">mail</span>' +
            '<a href="mailto:help@emergencymitra.gov.in" class="hover:text-white transition-colors break-all">help@emergencymitra.gov.in</a></p>' +
            '<p class="flex items-center gap-2"><span class="material-symbols-outlined text-[16px] text-[#71f8e4]">schedule</span>' +
            '<span>Control Room: 24×7 • Help Desk: 9 AM – 9 PM</span></p>' +
            '</div></div>' +

            '</div></div>' +

            /* ---- legal bar ---- */
            '<div class="border-t border-white/10 bg-black/15">' +
            '<div class="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop py-4">' +
            '<div class="flex flex-col lg:flex-row justify-between items-center gap-2 text-center lg:text-left">' +
            '<p class="text-[11.5px] lg:text-xs text-white/70">© ' + year + ' Emergency Mitra • Rural Emergency ' +
            'Healthcare Network • Smart India Hackathon Prototype</p>' +
            '<p class="text-[11px] text-white/50 flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[14px] text-[#71f8e4]">verified_user</span>' +
            'False emergency reports are punishable under BNS §54 / IPC §182</p>' +
            '</div></div></div>' +
            '</footer>';

        /* if a saved language is active, translate the injected footer too */
        try {
            if (window.currentLang && window.currentLang !== 'en' && typeof window.translatePage === 'function') {
                window.translatePage(window.currentLang);
            }
        } catch (e) { /* translations not loaded — footer stays English */ }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

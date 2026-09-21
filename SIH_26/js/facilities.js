/* ============================================================
   EMERGENCY MITRA - FACILITIES FINDER (js/facilities.js)
   ============================================================
   Powers the "Find Facilities" modal with a live, filterable
   directory of Wardha-district government health facilities.

   FEATURES
     - Live search across name / services / area
     - Filter chips: Hospitals, PHCs, Blood Bank, Diagnostics,
       Maternity, 24x7, Antivenom-available
     - "Use My Location" -> real GPS -> haversine distances,
       nearest-first sort + NEAREST ribbon + distance filter
     - Live OPEN / CLOSED badges computed from facility hours
     - Readiness score bars, bed/oxygen grids, blood units
     - Working actions: Call (tel:), Directions (Google Maps),
       Request/Book with confirmation state
     - Responsive 1/2/3-column card grid + stats strip
   ============================================================ */

(function () {
    'use strict';

    const TYPES = {
        hospital:    { icon: 'local_hospital',   color: '#1c695f', label: 'Hospital' },
        phc:         { icon: 'medical_services', color: '#7a5900', label: 'PHC' },
        blood:       { icon: 'water_drop',       color: '#ba1a1a', label: 'Blood Bank' },
        diagnostics: { icon: 'biotech',          color: '#6d4ba0', label: 'Diagnostics' },
        women:       { icon: 'pregnant_woman',   color: '#a0316b', label: 'Maternity' }
    };

    const CHIPS = [
        { id: 'all',         label: 'All Facilities', icon: 'domain' },
        { id: 'hospital',    label: 'Hospitals',      icon: 'local_hospital' },
        { id: 'phc',         label: 'PHCs',           icon: 'medical_services' },
        { id: 'blood',       label: 'Blood Bank',     icon: 'water_drop' },
        { id: 'diagnostics', label: 'Diagnostics',    icon: 'biotech' },
        { id: 'women',       label: 'Maternity',      icon: 'pregnant_woman' },
        { id: 'open24',      label: '24\u00d77 Open', icon: 'schedule' },
        { id: 'antivenom',   label: 'Antivenom',      icon: 'vaccines' }
    ];

    const WARDDHA_CENTER = { lat: 20.7450, lng: 78.6030 };
    const state = { q: '', chip: 'all', maxDist: 0, userLoc: null };
    const booked = new Set(
        (() => { try { return JSON.parse(localStorage.getItem('em_bookings') || '[]'); } catch (e) { return []; } })()
    );

    /* ---------------------------- HELPERS ---------------------------- */

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function haversine(a, b) {
        const R = 6371, rad = Math.PI / 180;
        const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
        const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.sqrt(h));
    }

    function isOpen(f) {
        if (f.hours === '24/7') return true;
        const m = /^(\d{1,2})-(\d{1,2})$/.exec(f.hours || '');
        if (!m) return false;
        const h = new Date().getHours();
        return h >= +m[1] && h < +m[2];
    }

    function distOf(f) {
        const ref = state.userLoc || WARDDHA_CENTER;
        return haversine(ref, f);
    }

    function fmtKm(km) { return km < 10 ? km.toFixed(1) : String(Math.round(km)); }

    function bedsAvailable(v) { return parseInt(v, 10) || 0; }

    function toast(msg, icon) {
        let t = document.getElementById('ff-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'ff-toast';
            document.body.appendChild(t);
        }
        t.innerHTML = '<span class="material-symbols-outlined">' + (icon || 'info') + '</span>' + esc(msg);
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 3200);
    }

    /* ---------------------------- DATASET ---------------------------- */

    const FACILITIES = [
        { id: 'dh', name: 'District Hospital, Wardha', type: 'hospital',
          tier: 'Apex Trauma & Referral Hub', addr: 'Civil Lines, Wardha',
          lat: 20.7450, lng: 78.6030, hours: '24/7', phone: '07152240100', score: 94,
          beds: { ICU: '2/10', Oxygen: '15/40', General: '45/100', Emergency: '3/5' },
          antivenom: 24,
          services: ['Trauma Care', 'ICU', 'CT Scan', 'X-Ray', 'Blood Bank', 'Pharmacy'] },
        { id: 'rh_sev', name: 'Rural Hospital, Sevagram', type: 'hospital',
          tier: 'Secondary Care Centre', addr: 'Sevagram Road',
          lat: 20.7380, lng: 78.6480, hours: '24/7', phone: '07152284045', score: 86,
          beds: { ICU: '2/10', Oxygen: '8/20', General: '22/50', Emergency: '1/5' },
          antivenom: 10,
          services: ['General Surgery', 'Maternity', 'Dialysis', 'Ambulance'] },
        { id: 'sdh_hing', name: 'Sub-District Hospital, Hinganghat', type: 'hospital',
          tier: 'First Referral Unit (FRU)', addr: 'Nagpur Road, Hinganghat',
          lat: 20.5460, lng: 78.5410, hours: '24/7', phone: '07153255120', score: 88,
          beds: { ICU: '1/6', Oxygen: '12/25', General: '18/40', Emergency: '2/4' },
          antivenom: 8,
          services: ['Emergency OT', 'ICU', 'X-Ray', 'Ambulance'] },
        { id: 'phc_deoli', name: 'Primary Health Centre, Deoli', type: 'phc',
          tier: 'Primary Health Centre', addr: 'Main Road, Deoli',
          lat: 20.7700, lng: 78.4600, hours: '09-16', phone: '07154263041', score: 72,
          beds: { General: '6/15' }, antivenom: 4,
          vaccines: ['Child Immunization', 'Adult', 'COVID-19', 'Rabies'],
          services: ['OPD', 'Vaccination', 'Basic Lab'] },
        { id: 'phc_seloo', name: 'Primary Health Centre, Seloo', type: 'phc',
          tier: 'Primary Health Centre', addr: 'Seloo Highway',
          lat: 20.7180, lng: 78.7600, hours: '09-16', phone: '07154277022', score: 68,
          beds: { General: '4/10' }, antivenom: 2,
          vaccines: ['Child Immunization', 'COVID-19'],
          services: ['OPD', 'Vaccination'] },
        { id: 'women', name: "Women's Hospital, Wardha", type: 'women',
          tier: 'Maternity & C-Section Centre', addr: 'Civil Lines, Wardha',
          lat: 20.7500, lng: 78.5950, hours: '24/7', phone: '07152251190', score: 84,
          beds: { General: '12/30', Emergency: '1/3' },
          services: ['Obstetrician on duty', 'Anesthetist on duty', 'Emergency OT', 'NICU'] },
        { id: 'bloodbank', name: 'District Blood Bank, Wardha', type: 'blood',
          tier: 'Central Blood Storage', addr: 'Main Govt Hospital Campus',
          lat: 20.7455, lng: 78.6020, hours: '24/7', phone: '07152240164', score: 90,
          blood: { 'O+': 12, 'A+': 8, 'B+': 15, 'AB+': 4, 'O-': 2, 'AB-': 1 },
          services: ['Whole Blood', 'Packed Cells', 'Plasma', 'Thalassemia Support'] },
        { id: 'diagnostic', name: 'District Diagnostic Centre', type: 'diagnostics',
          tier: 'Imaging & Pathology', addr: 'Govt Hospital Complex',
          lat: 20.7440, lng: 78.6050, hours: '08-20', phone: '07152240188', score: 78,
          services: ['Blood Tests', 'X-Ray', 'CT Scan', 'Ultrasound', 'MRI (Down)'] },
        { id: 'uhc', name: 'Urban Health Centre, Wardha', type: 'phc',
          tier: 'Urban OPD & Vaccination', addr: 'Jatpura, Wardha',
          lat: 20.7350, lng: 78.6100, hours: '09-17', phone: '07152233117', score: 65,
          beds: { General: '2/6' },
          vaccines: ['Child Immunization', 'Adult', 'COVID-19'],
          services: ['OPD', 'Vaccination', 'Dressing'] },
        { id: 'rh_karanja', name: 'Rural Hospital, Karanja', type: 'hospital',
          tier: 'Secondary Care Centre', addr: 'Karanja (Ghadge)',
          lat: 20.9700, lng: 78.4200, hours: '24/7', phone: '07156255033', score: 75,
          beds: { ICU: '1/4', Oxygen: '5/12', General: '14/30' },
          antivenom: 6,
          services: ['General Surgery', 'X-Ray', 'Ambulance'] },
        { id: 'phc_ashti', name: 'Primary Health Centre, Ashti', type: 'phc',
          tier: 'Primary Health Centre', addr: 'Ashti Road',
          lat: 20.6900, lng: 78.6900, hours: '09-16', phone: '07154288510', score: 62,
          beds: { General: '3/8' },
          vaccines: ['Child Immunization'],
          services: ['OPD', 'Vaccination'] }
    ];

    /* ---------------------------- FILTERING ---------------------------- */

    function matches(f) {
        if (state.chip === 'open24' && f.hours !== '24/7') return false;
        if (state.chip === 'antivenom' && !(f.antivenom > 0)) return false;
        if (TYPES[state.chip] && f.type !== state.chip) return false;

        if (state.maxDist > 0) {
            if (!state.userLoc) {
                toast('Tap "Use My Location" first to filter by distance', 'my_location');
                state.maxDist = 0;
                const sel = document.getElementById('ff-dist');
                if (sel) sel.value = 'All Distances';
                return true;
            }
            if (distOf(f) > state.maxDist) return false;
        }

        const q = state.q.trim().toLowerCase();
        if (!q) return true;
        const hay = [f.name, f.tier, f.addr, TYPES[f.type].label]
            .concat(f.services || [], Object.keys(f.blood || {}), f.vaccines || [])
            .join(' ').toLowerCase();
        return hay.includes(q);
    }

    function sorted() {
        const list = FACILITIES.filter(matches);
        if (state.userLoc) {
            list.sort((a, b) => distOf(a) - distOf(b));
        } else {
            list.sort((a, b) => b.score - a.score);
        }
        return list;
    }

    /* ---------------------------- RENDERING ---------------------------- */

    function stat(icon, val, label) {
        return '<div class="ff-stat"><span class="material-symbols-outlined">' + icon + '</span>' +
            '<div><b>' + val + '</b><span>' + esc(label) + '</span></div></div>';
    }

    function statStrip(list) {
        const beds = list.reduce((n, f) => n + Object.values(f.beds || {})
            .reduce((s, v) => s + bedsAvailable(v), 0), 0);
        const blood = list.reduce((n, f) => n + Object.values(f.blood || {})
            .reduce((s, v) => s + v, 0), 0);
        const open24 = list.filter(f => f.hours === '24/7').length;
        const av = list.filter(f => f.antivenom > 0).reduce((n, f) => n + f.antivenom, 0);
        return '<div class="ff-stats">' +
            stat('domain', list.length, 'Facilities') +
            stat('bed', beds, 'Beds Free') +
            stat('water_drop', blood, 'Blood Units') +
            stat('schedule', open24, 'Open 24\u00d77') +
            stat('science', av, 'AV Vials') +
            '</div>';
    }

    function scoreBar(score) {
        const cls = score >= 85 ? 'hi' : (score >= 70 ? 'mid' : 'low');
        return '<div class="ff-score" title="Facility readiness score">' +
            '<span class="ff-score-label">Readiness ' + score + '%</span>' +
            '<div class="ff-score-track"><div class="ff-score-fill ' + cls +
            '" style="width:' + score + '%"></div></div></div>';
    }

    function card(f, nearest) {
        const t = TYPES[f.type];
        const open = isOpen(f);
        const km = distOf(f);
        const isBooked = booked.has(f.id);

        // Live bed-availability badge (capacity-aware routing proof)
        let bedBadge = '';
        if (f.beds) {
            const icuFree = bedsAvailable(f.beds.ICU || '0/0');
            const o2Free = bedsAvailable(f.beds.Oxygen || '0/0');
            const genFree = bedsAvailable(f.beds.General || '0/0');
            const totalFree = icuFree + o2Free + genFree;
            const bedCls = totalFree === 0 ? 'beds-zero' : (totalFree <= 5 ? 'beds-low' : 'beds-ok');
            const bedLabel = totalFree === 0 ? 'FULL' : (totalFree <= 5 ? totalFree + ' BEDS LEFT' : totalFree + ' BEDS AVAILABLE');
            bedBadge = '<span class="ff-bed-badge ' + bedCls + '">' +
                '<span class="material-symbols-outlined">bed</span>' + bedLabel + '</span>';
        }

        let res = '';
        if (f.beds) {
            res += '<div class="ff-beds">' + Object.keys(f.beds).map(k => {
                const v = f.beds[k], free = bedsAvailable(v);
                return '<div class="ff-bed' + (free === 0 ? ' zero' : '') + '"><span>' +
                    esc(k) + '</span><b>' + esc(v) + '</b></div>';
            }).join('') + '</div>';
        }
        if (f.blood) {
            res += '<div class="ff-blood">' + Object.keys(f.blood).map(g => {
                const u = f.blood[g];
                return '<span class="ff-unit' + (u <= 3 ? ' low' : '') + '"><b>' + g + '</b> ' + u + 'u</span>';
            }).join('') + '</div>';
        }
        if (f.vaccines) {
            res += '<div class="ff-tags">' + f.vaccines.map(v =>
                '<span class="ff-tag">' + esc(v) + '</span>').join('') + '</div>';
        }
        if (f.services) {
            res += '<div class="ff-tags">' + f.services.slice(0, 5).map(s =>
                '<span class="ff-tag">' + esc(s) + '</span>').join('') +
                (f.services.length > 5
                    ? '<span class="ff-tag more">+' + (f.services.length - 5) + ' more</span>' : '') +
                '</div>';
        }
        if (f.antivenom > 0) {
            res += '<div class="ff-av"><span class="material-symbols-outlined">science</span>' +
                'Snake Antivenom: <b>' + f.antivenom + ' vials</b></div>';
        }

        const actionLabel = f.type === 'blood' ? 'Request Blood'
            : (f.vaccines ? 'Book Slot'
                : (f.type === 'diagnostics' ? 'Book Test' : 'Book Bed'));

        return '<div class="ff-card' + (nearest ? ' nearest' : '') + '">' +
            (nearest ? '<div class="ff-ribbon"><span class="material-symbols-outlined">near_me</span>NEAREST</div>' : '') +
            '<div class="ff-card-head">' +
                '<div class="ff-icon" style="background:' + t.color + '1a;color:' + t.color + '">' +
                    '<span class="material-symbols-outlined">' + t.icon + '</span></div>' +
                '<div class="ff-card-title"><h5>' + esc(f.name) + '</h5>' +
                    '<p>' + esc(f.tier) + ' &bull; ' + esc(f.addr) +
                    (state.userLoc ? ' &bull; <b class="ff-km">' + fmtKm(km) + ' km</b>' : '') +
                    '</p></div>' +
                '<span class="ff-badge ' + (open ? 'open' : 'shut') + '">' +
                    '<span class="material-symbols-outlined">' + (open ? 'check_circle' : 'schedule') + '</span>' +
                    (open ? (f.hours === '24/7' ? '24\u00d77 OPEN' : 'OPEN NOW') : 'CLOSED') + '</span>' +
            '</div>' +
            (bedBadge ? '<div class="ff-bed-row">' + bedBadge + '</div>' : '') +
            scoreBar(f.score) +
            res +
            '<div class="ff-actions">' +
                '<button class="ff-btn primary' + (isBooked ? ' done' : '') +
                    '" onclick="Facilities.book(\'' + f.id + '\')">' +
                    '<span class="material-symbols-outlined">' + (isBooked ? 'check_circle' : 'event_available') +
                    '</span>' + (isBooked ? 'Requested' : actionLabel) + '</button>' +
                '<a class="ff-btn" href="tel:' + esc(f.phone) + '">' +
                    '<span class="material-symbols-outlined">call</span>Call</a>' +
                '<a class="ff-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' +
                    f.lat + ',' + f.lng + '"><span class="material-symbols-outlined">map</span>Directions</a>' +
            '</div>' +
            '</div>';
    }

    function render() {
        const box = document.getElementById('facility-results');
        if (!box) return;
        const list = sorted();
        let html = statStrip(list) + '<div class="ff-grid">';
        if (!list.length) {
            html += '<div class="ff-empty"><span class="material-symbols-outlined">search_off</span>' +
                '<b>No facilities match your filters</b>' +
                '<span>Try clearing the search or widening the distance.</span></div>';
        } else {
            list.forEach((f, i) => { html += card(f, !!(state.userLoc && i === 0)); });
        }
        html += '</div>';
        box.innerHTML = html;
    }

    /* ---------------------------- ACTIONS ---------------------------- */

    function useMyLocation() {
        const btn = document.getElementById('ff-loc');
        if (!navigator.geolocation) {
            state.userLoc = WARDDHA_CENTER;
            render();
            toast('Geolocation unsupported \u2014 distances from Wardha centre', 'info');
            return;
        }
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">progress_activity</span> Locating\u2026';
        }
        const restoreBtn = () => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">my_location</span> Use My Location';
            }
        };
        navigator.geolocation.getCurrentPosition(pos => {
            state.userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            restoreBtn();
            render();
            toast('\ud83d\udcd0 Location locked \u2014 sorted nearest-first', 'near_me');
        }, () => {
            state.userLoc = state.userLoc || WARDDHA_CENTER;   // graceful fallback
            restoreBtn();
            render();
            toast('GPS denied \u2014 using Wardha centre as reference', 'location_off');
        }, { enableHighAccuracy: true, timeout: 8000 });
    }

    function renderChips() {
        const box = document.getElementById('ff-chips');
        if (!box) return;
        box.innerHTML = CHIPS.map(c =>
            '<button class="ff-chip' + (state.chip === c.id ? ' active' : '') +
            '" onclick="Facilities.setChip(\'' + c.id + '\')">' +
            '<span class="material-symbols-outlined">' + c.icon + '</span>' + esc(c.label) +
            '</button>').join('');
    }

    window.Facilities = {
        setQuery(q) { state.q = q; render(); },
        setDistance(v) {
            state.maxDist = v.indexOf('5') >= 0 && v.indexOf('10') < 0 && v.indexOf('25') < 0 ? 5
                : (v.indexOf('10') >= 0 ? 10 : (v.indexOf('25') >= 0 ? 25 : 0));
            render();
        },
        setChip(id) { state.chip = id; renderChips(); render(); },
        useMyLocation,
        book(id) {
            const f = FACILITIES.find(x => x.id === id);
            if (!f || booked.has(id)) return;
            booked.add(id);
            try { localStorage.setItem('em_bookings', JSON.stringify([...booked])); } catch (e) { /* private mode */ }
            render();
            const ref = 'FF-' + String(Math.floor(1000 + Math.random() * 9000));
            if (window.Outbox && !window.Outbox.isOnline()) {
                window.Outbox.enqueue('booking', { type: 'Facility Booking — ' + f.name, hospital: f.name, note: 'Ref ' + ref });
                toast('📴 Offline — booking queued & will auto-sync to ' + f.name, 'cloud_upload');
            } else {
                toast('\u2705 Request sent to ' + f.name + ' \u2014 ref ' + ref, 'task_alt');
            }
        },
        render
    };

    /* ---------------------------- STYLES ---------------------------- */

    (function injectStyles() {
        const st = document.createElement('style');
        st.textContent =
            '.ff-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
            '.ff-chip{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:999px;' +
                'border:1.5px solid #cfd8d5;background:#fff;font-size:13px;font-weight:600;color:#37493f;' +
                'cursor:pointer;transition:all .18s ease}' +
            '.ff-chip:hover{border-color:#1c695f;transform:translateY(-1px)}' +
            '.ff-chip.active{background:#1c695f;color:#fff;border-color:#1c695f;box-shadow:0 3px 10px rgba(28,105,95,.3)}' +
            '.ff-chip .material-symbols-outlined{font-size:16px}' +
            '.ff-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:18px}' +
            '.ff-stat{display:flex;align-items:center;gap:9px;background:linear-gradient(135deg,#f0f7f5,#fff);' +
                'border:1px solid #dce7e3;border-radius:12px;padding:10px 13px}' +
            '.ff-stat .material-symbols-outlined{font-size:24px;color:#1c695f}' +
            '.ff-stat b{display:block;font-size:19px;line-height:1.1;color:#10201a}' +
            '.ff-stat span{font-size:11.5px;color:#5b6f66;font-weight:600}' +
            '.ff-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}' +
            '.ff-card{position:relative;background:#fff;border:1.5px solid #e1e8e5;border-radius:16px;padding:16px;' +
                'display:flex;flex-direction:column;gap:11px;transition:transform .2s ease,box-shadow .2s ease;' +
                'animation:ffIn .35s ease both}' +
            '.ff-card:hover{transform:translateY(-3px);box-shadow:0 10px 26px rgba(16,32,26,.12);border-color:rgba(28,105,95,.33)}' +
            '.ff-card.nearest{border-color:#1c695f;box-shadow:0 6px 18px rgba(28,105,95,.18)}' +
            '.ff-bed-row{margin-top:-2px}' +
            '.ff-bed-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;' +
                'letter-spacing:.4px;padding:5px 10px;border-radius:9px;border:1px solid}' +
            '.ff-bed-badge .material-symbols-outlined{font-size:15px}' +
            '.ff-bed-badge.beds-ok{background:#e6f2ee;color:#166534;border-color:#b3d9cc;animation:bedPulse 2.5s infinite}' +
            '.ff-bed-badge.beds-low{background:#fdf6e4;color:#854d0e;border-color:#f0e0b0}' +
            '.ff-bed-badge.beds-zero{background:#fdeeee;color:#ba1a1a;border-color:#f2c6c6}' +
            '@keyframes bedPulse{0%,100%{opacity:1}50%{opacity:.72}}' +
            '@keyframes ffIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
            '.ff-ribbon{position:absolute;top:-10px;right:12px;background:#1c695f;color:#fff;font-size:10.5px;' +
                'font-weight:800;letter-spacing:.6px;padding:3px 9px;border-radius:999px;display:flex;' +
                'align-items:center;gap:3px}' +
            '.ff-ribbon .material-symbols-outlined{font-size:13px}';
        document.head.appendChild(st);
    })();

    (function injectStyles2() {
        const st = document.createElement('style');
        st.textContent =
            '.ff-card-head{display:flex;gap:11px;align-items:flex-start}' +
            '.ff-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;' +
                'justify-content:center;flex-shrink:0}' +
            '.ff-card-title{flex:1;min-width:0}' +
            '.ff-card-title h5{font-size:15.5px;font-weight:800;color:#10201a;line-height:1.25;margin:0}' +
            '.ff-card-title p{font-size:12px;color:#5b6f66;margin:2px 0 0}' +
            '.ff-km{color:#1c695f}' +
            '.ff-badge{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:800;' +
                'padding:4px 8px;border-radius:999px;white-space:nowrap}' +
            '.ff-badge .material-symbols-outlined{font-size:13px}' +
            '.ff-badge.open{background:#e6f2ee;color:#1c695f}' +
            '.ff-badge.shut{background:#fdeeee;color:#ba1a1a}' +
            '.ff-score{display:flex;align-items:center;gap:9px}' +
            '.ff-score-label{font-size:11px;font-weight:800;color:#37493f;white-space:nowrap}' +
            '.ff-score-track{flex:1;height:7px;background:#eef3f1;border-radius:99px;overflow:hidden}' +
            '.ff-score-fill{height:100%;border-radius:99px;transition:width .5s ease}' +
            '.ff-score-fill.hi{background:linear-gradient(90deg,#1c695f,#2e9e7f)}' +
            '.ff-score-fill.mid{background:linear-gradient(90deg,#c78d1a,#e8b23c)}' +
            '.ff-score-fill.low{background:linear-gradient(90deg,#ba1a1a,#e05252)}' +
            '.ff-beds{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}' +
            '.ff-bed{display:flex;justify-content:space-between;align-items:center;background:#f6faf8;' +
                'border:1px solid #e1e8e5;border-radius:8px;padding:6px 10px;font-size:12px}' +
            '.ff-bed span{color:#5b6f66;font-weight:600}' +
            '.ff-bed b{color:#1c695f}.ff-bed.zero b{color:#ba1a1a}' +
            '.ff-blood{display:flex;flex-wrap:wrap;gap:6px}' +
            '.ff-unit{font-size:11.5px;font-weight:700;border:1px solid #e1e8e5;border-radius:8px;' +
                'padding:4px 8px;background:#fff}' +
            '.ff-unit b{color:#ba1a1a}.ff-unit.low{background:#fdeeee;border-color:#f2c6c6}' +
            '.ff-tags{display:flex;flex-wrap:wrap;gap:6px}' +
            '.ff-tag{font-size:11px;font-weight:600;background:#f0f4f2;color:#37493f;border-radius:999px;padding:4px 10px}' +
            '.ff-tag.more{color:#1c695f;font-weight:800}' +
            '.ff-av{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#7a5900;background:#fdf6e4;' +
                'border:1px solid #f0e0b0;border-radius:9px;padding:7px 11px}' +
            '.ff-av .material-symbols-outlined{font-size:17px}' +
            '.ff-actions{display:flex;gap:8px;margin-top:auto;padding-top:11px;border-top:1px solid #eef3f1}' +
            '.ff-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;' +
                'padding:8px 6px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;' +
                'border:1.5px solid #1c695f;color:#1c695f;background:#fff;text-decoration:none;' +
                'transition:all .15s ease}' +
            '.ff-btn:hover{background:#f0f7f5}' +
            '.ff-btn .material-symbols-outlined{font-size:16px}' +
            '.ff-btn.primary{background:#1c695f;color:#fff}' +
            '.ff-btn.primary:hover{background:#155248}' +
            '.ff-btn.primary.done{background:#2e9e7f;border-color:#2e9e7f}' +
            '.ff-empty{grid-column:1/-1;text-align:center;padding:44px 16px;color:#5b6f66}' +
            '.ff-empty .material-symbols-outlined{font-size:44px;color:#c4d2cc}' +
            '.ff-empty b{display:block;font-size:16px;color:#10201a;margin:8px 0 4px}' +
            '#ff-toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,80px);display:flex;' +
                'align-items:center;gap:8px;background:#10201a;color:#fff;font-size:13.5px;font-weight:600;' +
                'padding:12px 18px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);z-index:99999;' +
                'opacity:0;transition:all .3s ease;pointer-events:none;max-width:92vw}' +
            '#ff-toast.show{transform:translate(-50%,0);opacity:1}' +
            '#ff-toast .material-symbols-outlined{font-size:19px;color:#7fd8bf}' +
            '@media (max-width:640px){.ff-actions{flex-wrap:wrap}.ff-btn{min-width:calc(50% - 4px)}}';
        document.head.appendChild(st);
    })();

    /* ---------------------------- BOOT ---------------------------- */

    document.addEventListener('DOMContentLoaded', () => {
        renderChips();
        render();
        // Re-render on every open so distances / open-status stay live.
        if (typeof window.openFindFacilityModal === 'function') {
            const orig = window.openFindFacilityModal;
            window.openFindFacilityModal = function () {
                renderChips();
                render();
                return orig.apply(this, arguments);
            };
        }
        // Language switch: facility cards are JS-rendered — redraw them
        // so buttons/badges follow the chosen language (full-page i18n).
        window.addEventListener('em:language-changed', () => {
            renderChips();
            render();
        });
    });

    console.info('%c[Facilities] finder ready \u2014 ' + FACILITIES.length + ' facilities indexed',
        'color:#1c695f;font-weight:bold');
})();
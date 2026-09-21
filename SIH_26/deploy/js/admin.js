/* ============================================================
   EMERGENCY MITRA - ADMIN DASHBOARD CONTROLLER (js/admin.js)
   ============================================================
   Powers the officer/admin dashboard modal:

   MOCK DATA (replace with real API calls later)
     - adminCases     : live emergency case list w/ vitals, ETA
     - hospitalData   : facility capacity (ICU/O2/OT/beds),
                        antivenom stock, readiness score
     - inventoryItems : resource inventory w/ min-stock alerts

   FEATURES
     - openDashboardModal / closeDashboardModal
     - Tab switching (Live Cases / Hospitals / Inventory)
     - renderDashboard* : build table/card DOM from state
     - Case detail view, status updates, showToast notifications
     - Inventory search/filter + hospital view switcher
   ============================================================ */

        // --- Admin Dashboard State ---
        // NOTE: trust-ui.js decorator reserves `c.trust` (object) for live-scored
        // cases. Seeded demo cases use trustScore/trustTier/trustNote instead.
        let adminCases = [
            { id: "EM-9021", time: "2 mins ago", patient: "Ramesh Pawar", age: "42 / M", type: "Snakebite 🐍", priority: "CRITICAL", hospital: "District Hospital Wardha", doctor: "Dr. Kulkarni", status: "En Route", eta: "8 mins", vitals: "BP: 90/60 • SpO2: 92%", trustScore: 91, trustTier: "HIGH", trustNote: "OTP verified + photo + GPS + 3-report cluster" },
            { id: "EM-9020", time: "14 mins ago", patient: "Sunita Ghorpade", age: "29 / F", type: "Accident / Trauma", priority: "CRITICAL", hospital: "District Hospital Wardha", doctor: "Dr. Deshmukh", status: "In ER", eta: "Arrived", vitals: "BP: 110/70 • SpO2: 97%", trustScore: 84, trustTier: "HIGH", trustNote: "DigiLocker badge + camera evidence + GPS" },
            { id: "EM-9019", time: "28 mins ago", patient: "Babanrao Patil", age: "64 / M", type: "Cardiac Arrest", priority: "CRITICAL", hospital: "Rural Hospital Sevagram", doctor: "Dr. A. Verma", status: "ICU Admitted", eta: "Arrived", vitals: "Pulse: 88 • SpO2: 95%", trustScore: 78, trustTier: "MEDIUM", trustNote: "OTP verified + GPS + wearable HR spike" },
            { id: "EM-9018", time: "45 mins ago", patient: "Kavita Shinde", age: "31 / F", type: "Severe Bleeding", priority: "URGENT", hospital: "SDH Hinganghat", doctor: "Dr. R. Joshi", status: "OT Prepped", eta: "Arrived", vitals: "BP: 100/65 • Hb: 8.4", trustScore: 63, trustTier: "MEDIUM", trustNote: "Photo evidence + GPS, no cluster" },
            { id: "EM-9017", time: "1 hr ago", patient: "Vijay Gaikwad", age: "52 / M", type: "Breathing Issue", priority: "STABLE", hospital: "PHC Deoli", doctor: "Dr. M. Roy", status: "Under Observation", eta: "Arrived", vitals: "SpO2: 98% on O2", trustScore: 41, trustTier: "MEDIUM", trustNote: "OTP verified + GPS only" },
            { id: "EM-9016", time: "2 hrs ago", patient: "Unknown (bystander SOS)", age: "— / M", type: "Road Accident 🛣️", priority: "URGENT", hospital: "PHC Seloo", doctor: "Dr. On Duty", status: "Stabilized / Discharged", eta: "Arrived", vitals: "Assessed on arrival", trustScore: 22, trustTier: "LOW", trustNote: "Anonymous bare SOS — volunteer verified on IVR" }
        ];

        let hospitalData = [
            { id: "dh_wardha", name: "District Hospital, Wardha", tier: "Apex Trauma & Referral Hub", icu: "2/10", o2: "15/40", gen: "45/100", ot: "AVAILABLE", antivenom: 24, ambulances: 4, score: 94 },
            { id: "rh_sevagram", name: "Rural Hospital, Sevagram", tier: "Secondary Care Centre", icu: "3/8", o2: "8/20", gen: "22/50", ot: "OCCUPIED", antivenom: 10, ambulances: 2, score: 86 },
            { id: "sdh_hinganghat", name: "Sub-District Hospital, Hinganghat", tier: "First Referral Unit (FRU)", icu: "1/6", o2: "12/25", gen: "18/40", ot: "AVAILABLE", antivenom: 8, ambulances: 2, score: 88 },
            { id: "phc_deoli", name: "Primary Health Centre, Deoli", tier: "Primary Health Centre", icu: "0/2", o2: "3/8", gen: "6/15", ot: "N/A", antivenom: 4, ambulances: 1, score: 72 }
        ];

        let inventoryItems = [
            { id: "inv-1", name: "Polyvalent Snake Antivenom", cat: "Critical Antidote", loc: "District Hospital Wardha", stock: 24, min: 10, unit: "Vials", status: "ADEQUATE" },
            { id: "inv-2", name: "Polyvalent Snake Antivenom", cat: "Critical Antidote", loc: "Rural Hospital Sevagram", stock: 10, min: 8, unit: "Vials", status: "ADEQUATE" },
            { id: "inv-3", name: "Polyvalent Snake Antivenom", cat: "Critical Antidote", loc: "PHC Deoli", stock: 4, min: 5, unit: "Vials", status: "LOW STOCK" },
            { id: "inv-4", name: "Medical Oxygen (D-Type Cylinders)", cat: "Life Support", loc: "Central Wardha Depot", stock: 38, min: 15, unit: "Cylinders", status: "ADEQUATE" },
            { id: "inv-5", name: "Blood Group O-Negative (Universal)", cat: "Blood Bank", loc: "Wardha Blood Bank", stock: 6, min: 8, unit: "Units", status: "LOW STOCK" },
            { id: "inv-6", name: "Blood Group B-Positive", cat: "Blood Bank", loc: "Wardha Blood Bank", stock: 18, min: 10, unit: "Units", status: "ADEQUATE" },
            { id: "inv-7", name: "Automated External Defibrillators (AED)", cat: "Cardiac Device", loc: "Emergency Fleet", stock: 12, min: 10, unit: "Active Units", status: "ADEQUATE" }
        ];

        let ambulanceFleet = [
            { id: "MH-31-EM-102", type: "ALS (Advanced Life Support)", driver: "Suresh Jadhav (+91 98221 00192)", loc: "Seloo Hwy • Heading to Wardha DH", status: "EN ROUTE", eta: "8 min" },
            { id: "MH-31-EM-105", type: "BLS (Basic Life Support)", driver: "Anil Raut (+91 98221 00195)", loc: "Sevagram Base Station", status: "AVAILABLE", eta: "Ready" },
            { id: "MH-31-EM-108", type: "ALS (Advanced Life Support)", driver: "Pravin Kadu (+91 98221 00198)", loc: "Hinganghat Bypass", status: "EN ROUTE", eta: "12 min" },
            { id: "MH-31-EM-112", type: "BLS (Basic Life Support)", driver: "Ganesh More (+91 98221 00201)", loc: "Deoli Rural Sub-Centre", status: "AVAILABLE", eta: "Ready" }
        ];

        // --- Dashboard Navigation & Modals ---
        function switchDashTab(tabKey, element) {
            document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));

            const targetPanel = document.getElementById('dash-panel-' + tabKey);
            if (targetPanel) targetPanel.classList.add('active');

            if (element) {
                element.classList.add('active');
            } else {
                const matchingTab = Array.from(document.querySelectorAll('.dash-tab')).find(b => b.textContent.toLowerCase().includes(tabKey));
                if (matchingTab) matchingTab.classList.add('active');
            }

            renderDashboard();
            if (tabKey === 'litemap') renderDashLiveMap();
        }

        function openDashboardModal() {
            renderDashboard();
            openModal('modal-dashboard');
        }

        function openDashboardModalMobile() {
            toggleMobileMenu();
            openDashboardModal();
        }

        function showToast(msg, icon = 'check_circle') {
            const toast = document.getElementById('dash-toast');
            document.getElementById('toast-msg').textContent = msg;
            document.getElementById('toast-icon').textContent = icon;
            toast.className = "show";
            setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3200);
        }

        // --- Render Functions ---
        function renderDashboard() {
            renderOverviewCases();
            renderCasesTable();
            renderHospitalCards();
            renderPatientsTable();
            renderInventoryTable();
            renderAmbulanceCards();
        }

        function renderOverviewCases() {
            const tbody = document.getElementById('dash-overview-cases-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            adminCases.slice(0, 4).forEach(c => {
                const priorityBadge = c.priority === 'CRITICAL' ? 'dash-badge red' : (c.priority === 'URGENT' ? 'dash-badge yellow' : 'dash-badge blue');
                const trustBadge = c.trustTier === 'HIGH' ? 'dash-badge red' : (c.trustTier === 'MEDIUM' ? 'dash-badge yellow' : 'dash-badge blue');
                tbody.innerHTML += `
                    <tr>
                        <td class="font-bold font-mono text-primary">${c.id}</td>
                        <td><div class="font-bold">${c.patient}</div><div class="text-[11px] text-on-surface-variant">${c.age}</div></td>
                        <td>${c.type}</td>
                        <td><span class="${priorityBadge}">${c.priority}</span></td>
                        <td><span class="${trustBadge}" title="${c.trustNote || ''}">🛡 ${c.trustScore ?? '—'} · ${c.trustTier ?? 'N/A'}</span></td>
                        <td class="text-xs font-semibold">${c.hospital}</td>
                        <td><span class="font-bold text-error">${c.eta}</span></td>
                        <td>
                            <button onclick="switchDashTab('cases')" class="bg-primary/10 text-primary hover:bg-primary hover:text-white px-2.5 py-1 rounded text-xs font-bold transition-colors">
                                View
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        function renderCasesTable() {
            const tbody = document.getElementById('cases-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';
            adminCases.forEach((c, idx) => {
                const priorityBadge = c.priority === 'CRITICAL' ? 'dash-badge red' : (c.priority === 'URGENT' ? 'dash-badge yellow' : 'dash-badge blue');
                const trustBadge = c.trustTier === 'HIGH' ? 'dash-badge red' : (c.trustTier === 'MEDIUM' ? 'dash-badge yellow' : 'dash-badge blue');
                const trustChip = c.trustScore != null
                    ? `<span class="${trustBadge}" title="${c.trustNote || ''}">🛡 ${c.trustScore} · ${c.trustTier}</span>`
                    : '<span class="dash-badge gray">pending</span>';
                tbody.innerHTML += `
                    <tr>
                        <td class="font-bold font-mono text-primary">
                            <button onclick="openCaseTimeline(${idx})" title="View case timeline" class="hover:underline">${c.id}</button>
                        </td>
                        <td class="text-xs text-on-surface-variant">${c.time}</td>
                        <td><div class="font-bold">${c.patient}</div><div class="text-xs text-on-surface-variant">${c.age} • ${c.vitals}</div></td>
                        <td class="font-semibold">${c.type}</td>
                        <td><span class="${priorityBadge}">${c.priority}</span></td>
                        <td>${trustChip}</td>
                        <td class="text-xs font-medium">${c.hospital}</td>
                        <td class="text-xs font-bold text-primary">${c.doctor}</td>
                        <td>
                            <select onchange="updateCaseStatus(${idx}, this.value)" class="text-xs font-semibold p-1 border rounded bg-surface">
                                <option ${c.status === 'En Route' ? 'selected' : ''}>En Route</option>
                                <option ${c.status === 'In ER' ? 'selected' : ''}>In ER</option>
                                <option ${c.status === 'ICU Admitted' ? 'selected' : ''}>ICU Admitted</option>
                                <option ${c.status === 'OT Prepped' ? 'selected' : ''}>OT Prepped</option>
                                <option ${c.status === 'Under Observation' ? 'selected' : ''}>Under Observation</option>
                                <option ${c.status === 'Stabilized / Discharged' ? 'selected' : ''}>Stabilized / Discharged</option>
                            </select>
                        </td>
                        <td>
                            <button onclick="alert('Pre-Arrival Handshake telemetry shared with '+ '${c.hospital}')" class="text-primary hover:text-secondary p-1" title="Send Telemetry Handshake">
                                <span class="material-symbols-outlined text-[20px]">send_and_archive</span>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        function renderHospitalCards() {
            const container = document.getElementById('hospital-cards-grid');
            if (!container) return;
            container.innerHTML = '';
            hospitalData.forEach(h => {
                container.innerHTML += `
                    <div class="bg-white rounded-xl border border-outline-variant p-4 shadow-sm flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-bold text-base text-primary">${h.name}</h4>
                                    <span class="text-xs text-on-surface-variant font-medium">${h.tier}</span>
                                </div>
                                <span class="dash-badge green">${h.score}% Match</span>
                            </div>
                            <div class="grid grid-cols-2 gap-2 my-3 text-xs">
                                <div class="bg-surface p-2 rounded border border-outline-variant">
                                    <span class="text-on-surface-variant block">ICU Beds:</span>
                                    <strong class="text-error text-sm">${h.icu}</strong> Available
                                </div>
                                <div class="bg-surface p-2 rounded border border-outline-variant">
                                    <span class="text-on-surface-variant block">Oxygen Beds:</span>
                                    <strong class="text-primary text-sm">${h.o2}</strong> Available
                                </div>
                                <div class="bg-surface p-2 rounded border border-outline-variant">
                                    <span class="text-on-surface-variant block">General Beds:</span>
                                    <strong class="text-primary text-sm">${h.gen}</strong>
                                </div>
                                <div class="bg-surface p-2 rounded border border-outline-variant">
                                    <span class="text-on-surface-variant block">Emergency OT:</span>
                                    <strong class="${h.ot === 'AVAILABLE' ? 'text-[#166534]' : 'text-amber-600'} text-sm">${h.ot}</strong>
                                </div>
                            </div>
                        </div>
                        <div class="pt-3 border-t border-outline-variant flex justify-between items-center text-xs">
                            <span>Antivenom: <strong>${h.antivenom} Vials</strong></span>
                            <button onclick="showToast('Alert pushed to '+ '${h.name}')" class="bg-primary text-white px-3 py-1.5 rounded font-bold hover:bg-primary-container">
                                Alert ER Desk
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        function renderPatientsTable() {
            const tbody = document.getElementById('patient-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';
            const patients = [
                { id: "P-1094", name: "Rahul Sharma", age: "34 / M", blood: "O+", allergy: "Penicillin", ward: "Ward 4 (Trauma)", vitals: "BP: 120/80 • HR: 76", contact: "+91 98765 43210" },
                { id: "P-1095", name: "Meena Deshmukh", age: "48 / F", blood: "A+", allergy: "None", ward: "ICU Bed #2", vitals: "BP: 110/70 • SpO2: 98%", contact: "+91 98221 55432" },
                { id: "P-1096", name: "Kishore Bhagat", age: "22 / M", blood: "B+", allergy: "Sulfa Drugs", ward: "Emergency OT #1", vitals: "BP: 105/65 • Hb: 9.1", contact: "+91 94231 88901" }
            ];
            patients.forEach(p => {
                tbody.innerHTML += `
                    <tr>
                        <td class="font-bold font-mono text-primary">${p.id}</td>
                        <td class="font-bold">${p.name}</td>
                        <td>${p.age}</td>
                        <td><span class="dash-badge red">${p.blood}</span></td>
                        <td class="text-xs font-semibold text-error">${p.allergy}</td>
                        <td class="text-xs font-bold text-primary">${p.ward}</td>
                        <td class="text-xs font-mono">${p.vitals}</td>
                        <td class="text-xs">${p.contact}</td>
                        <td>
                            <button onclick="openModal('modal-passport')" class="bg-surface border border-primary text-primary px-2 py-1 rounded text-xs font-bold hover:bg-primary hover:text-white">
                                View QR
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        function renderInventoryTable() {
            const tbody = document.getElementById('inventory-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';
            inventoryItems.forEach((item, idx) => {
                const statusClass = item.stock <= item.min ? 'dash-badge red' : 'dash-badge green';
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.name}</strong></td>
                        <td class="text-xs text-on-surface-variant">${item.cat}</td>
                        <td class="text-xs">${item.loc}</td>
                        <td><strong class="text-base text-primary">${item.stock}</strong> <span class="text-xs text-on-surface-variant">${item.unit}</span></td>
                        <td class="text-xs">${item.min} ${item.unit}</td>
                        <td><span class="${statusClass}">${item.stock <= item.min ? 'LOW STOCK' : 'ADEQUATE'}</span></td>
                        <td>
                            <div class="flex items-center gap-1.5">
                                <button onclick="adjustInventory(${idx}, -1)" class="w-7 h-7 bg-surface-container border rounded font-bold hover:bg-error hover:text-white">-</button>
                                <button onclick="adjustInventory(${idx}, 1)" class="w-7 h-7 bg-surface-container border rounded font-bold hover:bg-primary hover:text-white">+</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        function adjustInventory(idx, delta) {
            if (inventoryItems[idx].stock + delta >= 0) {
                inventoryItems[idx].stock += delta;
                renderInventoryTable();
                showToast(`Updated ${inventoryItems[idx].name} to ${inventoryItems[idx].stock}`);
            }
        }

        function renderAmbulanceCards() {
            const container = document.getElementById('ambulance-cards-grid');
            if (!container) return;
            container.innerHTML = '';
            ambulanceFleet.forEach(a => {
                const badge = a.status === 'EN ROUTE' ? 'dash-badge red' : 'dash-badge green';
                container.innerHTML += `
                    <div class="bg-white rounded-xl border border-outline-variant p-4 shadow-sm flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start mb-2">
                                <div class="font-bold text-primary text-base font-mono">${a.id}</div>
                                <span class="${badge}">${a.status}</span>
                            </div>
                            <p class="text-xs font-semibold text-on-surface-variant mb-2">${a.type}</p>
                            <p class="text-xs text-on-surface-variant mb-1"><strong>Location:</strong> ${a.loc}</p>
                            <p class="text-xs text-on-surface-variant"><strong>Driver:</strong> ${a.driver}</p>
                        </div>
                        <div class="mt-3 pt-3 border-t flex justify-between items-center text-xs">
                            <span class="font-bold text-error">ETA: ${a.eta}</span>
                            <button onclick="showToast('Connecting direct radio to '+ '${a.id}')" class="bg-primary text-white px-2.5 py-1 rounded font-bold hover:bg-primary-container">
                                Call / Dispatch
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        function updateCaseStatus(idx, newStatus) {
            adminCases[idx].status = newStatus;
            showToast(`Case ${adminCases[idx].id} status updated to: ${newStatus}`);
        }

        /* ============================================================
           CASE TIMELINE — golden-hour journey for each case.
           Click any Case ID to see Filed → Verified → Dispatched →
           En Route → Facility stages with timestamps.
           ============================================================ */
        const CASE_STAGE_ORDER = ['Filed', 'Verified', 'Dispatched', 'En Route', 'At Facility', 'Closed'];

        function caseStages(c) {
            const t = (m) => c.time;   // prototype: timestamps relative to case age
            const stageMap = {
                'En Route':               { done: ['Filed', 'Verified', 'Dispatched', 'En Route'], cur: 'At Facility' },
                'In ER':                  { done: ['Filed', 'Verified', 'Dispatched', 'En Route', 'At Facility'], cur: 'Closed' },
                'ICU Admitted':           { done: ['Filed', 'Verified', 'Dispatched', 'En Route', 'At Facility'], cur: 'Closed' },
                'OT Prepped':             { done: ['Filed', 'Verified', 'Dispatched', 'En Route', 'At Facility'], cur: 'Closed' },
                'Under Observation':      { done: ['Filed', 'Verified', 'Dispatched', 'En Route', 'At Facility'], cur: 'Closed' },
                'Stabilized / Discharged':{ done: CASE_STAGE_ORDER, cur: null }
            };
            const cfg = stageMap[c.status] || { done: ['Filed', 'Verified'], cur: 'Dispatched' };
            return CASE_STAGE_ORDER.map(s => ({
                stage: s,
                state: cfg.done.includes(s) ? 'done' : (cfg.cur === s ? 'current' : 'pending')
            }));
        }

        function openCaseTimeline(idx) {
            const c = adminCases[idx];
            if (!c) return;
            const stages = caseStages(c);
            const stepW = 100 / stages.length;

            const items = stages.map((s, i) => {
                const icon = s.state === 'done' ? 'check_circle'
                    : (s.state === 'current' ? 'pending_actions' : 'radio_button_unchecked');
                const color = s.state === 'done' ? '#166534' : (s.state === 'current' ? '#d97706' : '#9ca3af');
                const bg = s.state === 'current' ? 'background:#fef3c7;' : '';
                return `
                <div style="display:flex; align-items:flex-start; gap:10px; ${bg} padding:8px 10px; border-radius:10px;">
                    <span class="material-symbols-outlined" style="font-size:22px; color:${color};">${icon}</span>
                    <div style="flex:1;">
                        <div style="font-weight:800; font-size:13.5px; color:${s.state === 'pending' ? '#9ca3af' : '#1f2937'};">${s.stage}</div>
                        ${s.state !== 'pending' ? `<div style="font-size:11.5px; color:#6b7280;">${c.time}${s.state === 'current' ? ' • in progress' : ' • complete'}</div>` : ''}
                    </div>
                    ${s.state === 'current' ? '<span class="dash-badge yellow">NOW</span>' : (s.state === 'done' ? '<span class="dash-badge green">DONE</span>' : '')}
                </div>`;
            }).join('');

            const bar = `<div style="height:8px; background:#e5e7eb; border-radius:99px; overflow:hidden; margin:6px 0 16px;">
                <div style="height:100%; width:${Math.round(stages.filter(s => s.state === 'done').length / stages.length * 100)}%;
                     background:linear-gradient(90deg,#166534,#22c55e); border-radius:99px; transition:width .5s ease;"></div>
            </div>`;

            document.getElementById('case-timeline-body').innerHTML = `
                <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:12px 14px; margin-bottom:14px;">
                    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; font-size:13px;">
                        <div><b>${c.patient}</b> <span style="color:#6b7280;">(${c.age})</span></div>
                        <div style="font-weight:700; color:#ba1a1a;">${c.type}</div>
                    </div>
                    <div style="font-size:12px; color:#6b7280; margin-top:4px;">${c.hospital} • ${c.vitals}</div>
                </div>
                ${bar}${items}`;

            openModal('modal-case-timeline');
        }

        function triggerNewAdmissionModal() {
            openModal('modal-quick-admission');
        }

        function handleQuickAdmission(e) {
            e.preventDefault();
            const name = document.getElementById('adm-name').value;
            const age = document.getElementById('adm-age').value;
            const type = document.getElementById('adm-type').value;
            const priority = document.getElementById('adm-priority').value;
            const hospital = document.getElementById('adm-hospital').value;

            const newCaseId = "EM-" + Math.floor(1000 + Math.random() * 9000);
            adminCases.unshift({
                id: newCaseId,
                time: "Just now",
                patient: name,
                age: age,
                type: type,
                priority: priority,
                hospital: hospital,
                doctor: "Dr. On Duty",
                status: "En Route",
                eta: "10 mins",
                vitals: "Assessing...",
                trustScore: 45,
                trustTier: "MEDIUM",
                trustNote: "Awaiting operator verification"
            });

            closeModal('modal-quick-admission');
            renderDashboard();
            switchDashTab('cases');
            showToast(`New emergency case ${newCaseId} registered! Hospital notified.`, 'verified');
        }

        function sendDistrictBroadcast() {
            const target = document.getElementById('broadcast-target').value;
            showToast(`Broadcast dispatched to ${target}!`, 'podcasts');
        }

        function triggerDataRefresh() {
            showToast('All network facility telemetry refreshed.');
            renderDashboard();
        }

        function requestEmergencyRestock() {
            showToast('Emergency restock order #ORD-4491 queued with Maharashtra Medical Services Corp.');
        }

        function filterCaseTable() {
            const query = document.getElementById('case-search-input').value.toLowerCase();
            const priority = document.getElementById('case-filter-priority').value;
            const rows = document.querySelectorAll('#cases-table-body tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const matchQuery = text.includes(query);
                const matchPriority = priority === 'ALL' || text.includes(priority.toLowerCase());
                row.style.display = (matchQuery && matchPriority) ? '' : 'none';
            });
        }

        function filterPatientTable() {
            const query = document.getElementById('patient-search-input').value.toLowerCase();
            const rows = document.querySelectorAll('#patient-table-body tr');
            let count = 0;
            rows.forEach(row => {
                const match = row.textContent.toLowerCase().includes(query);
                row.style.display = match ? '' : 'none';
                if (match) count++;
            });
            const counter = document.getElementById('patient-count-display');
            if (counter) counter.textContent = count;
        }

        function filterInventoryTable() {
            const query = document.getElementById('inventory-search-input').value.toLowerCase();
            const rows = document.querySelectorAll('#inventory-table-body tr');
            rows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
            });
        }

        function switchHospitalView(val) {
            showToast(val === 'all' ? 'Displaying all 8 network facilities.' : `Filtered dashboard for: ${val.toUpperCase()}`);
        }

        /* ============================================================
           LIVE DISTRICT MAP (Leaflet + OpenStreetMap tiles)
           Facilities (readiness-colored) + active cases (tier-colored)
           + en-route ambulances. Renders lazily on first tab open.
           ============================================================ */
        const MAP_CASES = [
            { id: "EM-9021", label: "Snakebite 🐍", tier: "CRITICAL", lat: 20.7420, lng: 78.5970, pop: "Ramesh Pawar • Snakebite • ALS MH-31-EM-102 en route" },
            { id: "EM-9020", label: "Accident / Trauma", tier: "CRITICAL", lat: 20.7510, lng: 78.6120, pop: "Sunita Ghorpade • Trauma • In ER at DH Wardha" },
            { id: "EM-9018", label: "Severe Bleeding", tier: "URGENT", lat: 20.5490, lng: 78.5460, pop: "Kavita Shinde • Bleeding • OT prepped at SDH Hinganghat" },
            { id: "EM-9017", label: "Breathing Issue", tier: "STABLE", lat: 20.7720, lng: 78.4550, pop: "Vijay Gaikwad • Breathing • Under observation at PHC Deoli" }
        ];
        const MAP_AMBULANCES = [
            { id: "MH-31-EM-102", lat: 20.7350, lng: 78.5850, pop: "ALS • En route to DH Wardha • ETA 8 min" },
            { id: "MH-31-EM-108", lat: 20.5610, lng: 78.5330, pop: "ALS • En route on Hinganghat Bypass • ETA 12 min" }
        ];

        let _dashMap = null;
        const _tierColor = { CRITICAL: '#ba1a1a', URGENT: '#d97706', STABLE: '#2563eb' };

        function _mapDivIcon(color, glyph, size) {
            return L.divIcon({
                className: '',
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
                html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
                    'background:' + color + ';color:#fff;display:flex;align-items:center;' +
                    'justify-content:center;font-size:' + Math.round(size * 0.55) + 'px;' +
                    'box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid #fff;">' + glyph + '</div>'
            });
        }

        function renderDashLiveMap() {
            const holder = document.getElementById('dash-live-map');
            if (!holder || typeof L === 'undefined') return;

            if (!_dashMap) {
                _dashMap = L.map('dash-live-map', { scrollWheelZoom: false }).setView([20.72, 78.58], 10);
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(_dashMap);
            }
            // Leaflet renders 0x0 inside hidden panels — force a re-measure.
            setTimeout(() => _dashMap.invalidateSize(), 60);

            _dashMap.eachLayer(l => { if (l instanceof L.Marker) _dashMap.removeLayer(l); });

            hospitalData.forEach(h => {
                const c = MAP_FACILITY_COORDS[h.id];
                if (!c) return;
                L.marker([c.lat, c.lng], { icon: _mapDivIcon('#1c695f', 'H', 30) })
                    .addTo(_dashMap)
                    .bindPopup('<b>' + h.name + '</b><br>' + h.tier +
                        '<br>ICU: ' + h.icu + ' • O2: ' + h.o2 +
                        '<br>Antivenom: ' + h.antivenom + ' vials • Readiness ' + h.score + '%');
            });

            MAP_CASES.forEach(c => {
                L.circleMarker([c.lat, c.lng], {
                    radius: 9, color: '#fff', weight: 2,
                    fillColor: _tierColor[c.tier] || '#2563eb', fillOpacity: 0.95
                }).addTo(_dashMap)
                    .bindPopup('<b>' + c.id + ' — ' + c.tier + '</b><br>' + c.pop);
            });

            MAP_AMBULANCES.forEach(a => {
                L.marker([a.lat, a.lng], { icon: _mapDivIcon('#7c3aed', '🚑', 30) })
                    .addTo(_dashMap)
                    .bindPopup('<b>' + a.id + '</b><br>' + a.pop);
            });
        }

        const MAP_FACILITY_COORDS = {
            dh_wardha:      { lat: 20.7450, lng: 78.6030 },
            rh_sevagram:    { lat: 20.7380, lng: 78.6480 },
            sdh_hinganghat: { lat: 20.5460, lng: 78.5410 },
            phc_deoli:      { lat: 20.7700, lng: 78.4600 }
        };

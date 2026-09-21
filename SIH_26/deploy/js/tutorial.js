/* ============================================================
   EMERGENCY MITRA - INTERACTIVE TUTORIAL (js/tutorial.js)
   ============================================================
   Animated hands-on onboarding for first-time users:

     - Animated SPOTLIGHT that glides between real UI buttons
       (dimmed overlay with a moving cutout + pulsing ring)
     - Auto-positioned tooltip card (above/below/center),
       progress bar, step counter, keyboard navigation
     - "TRY IT" steps: the tour WAITS until the user actually
       performs the action (open wizard, ack SOS legal card,
       filter facilities, save profile...) then auto-advances
     - DEMO MODE: while the tour runs, the trust layer
       suppresses ALL real case filing (wizard / SOS / triage)
       so users can try everything with zero real complaints
     - Floating "?" help button to replay the tour anytime
     - Auto-starts once for new visitors (localStorage flag)

   Loads LAST so its wrappers sit on top of app/admin/account/
   facilities/trust wrappers. Zero original lines modified.
   ============================================================ */

(function () {
    'use strict';

    const DONE_KEY = 'em_tutorial_done_v1';

    /* ---------------------------- DEMO MODE ---------------------------- */

    window.DemoMode = {
        active: false,
        enter() {
            if (this.active) return;
            this.active = true;
            const b = document.getElementById('tut-demo-badge');
            if (b) b.classList.add('show');
        },
        exit() {
            if (!this.active) return;
            this.active = false;
            const b = document.getElementById('tut-demo-badge');
            if (b) b.classList.remove('show');
        },
        toggle() { this.active ? this.exit() : this.enter(); }
    };

    /* ---------------------------- STEPS (1/2) ---------------------------- */

    const STEPS = [
        {
            id: 'welcome', center: true,
            icon: 'school', title: 'Welcome to Emergency Mitra!',
            body: '<b>Great to have you here.</b> This is a <b>2-minute hands-on tour</b> — ' +
                  'you will actually <b>try every key feature</b>, not just read about them.<br><br>' +
                  '🎓 <b>Demo Mode is now ON</b>: nothing you do during this tour files a real ' +
                  'complaint or sends a real SOS. Explore fearlessly!',
            cta: 'Start the Tour'
        },
        {
            id: 'wizard-btn', target: '.btn-start-emergency',
            icon: 'emergency', title: 'Start Emergency — Guided Wizard',
            body: 'This opens a <b>step-by-step wizard</b>: pick the emergency type, answer ' +
                  'quick questions, attach photo/voice evidence.<br><br>' +
                  '👉 <b>TRY IT:</b> click this button now.',
            waitFor: 'wizard-opened'
        },
        {
            id: 'wizard-use', target: '#emergency-wizard-modal > div',
            icon: 'checklist', title: 'Try the Wizard — Nothing Real Is Filed',
            body: 'Pick <b>any emergency type</b> and walk through the steps.<br><br>' +
                  'When you finish (or hit Close), Demo Mode blocks the case from being ' +
                  'filed — watch the Trust Engine log say <i>"NOT filed"</i>.<br><br>' +
                  '👉 Close the wizard when you are done exploring.',
            waitFor: 'wizard-closed'
        },
        {
            id: 'sos-btn', target: '.btn-sos',
            icon: 'my_location', title: 'SOS — For Unconscious Patients',
            body: 'One tap for the worst moments: the reporter sees the <b>legal rules</b> ' +
                  '(anti-fake warning), then GPS + evidence chain activate automatically — ' +
                  '<b>zero typing needed</b>.<br><br>' +
                  '👉 <b>TRY IT:</b> press SOS, read the legal card, tap <i>"I Understand"</i>. ' +
                  'Demo Mode swallows the alert.',
            waitFor: 'sos-acked'
        },
        {
            id: 'sos-explain', center: true,
            icon: 'gpp_good', title: 'What Just Happened?',
            body: 'You saw the <b>legal acknowledgement</b> every reporter must give. In a real ' +
                  'emergency that tap would trigger: 📍 GPS lockdown → 📷 evidence chain → ' +
                  '📞 IVR call-back → 🛡 credibility scoring → 🚑 dispatch.<br><br>' +
                  'In Demo Mode, <b>nothing was sent</b> — check the Trust Engine log.',
            cta: 'Next'
        },
        {
            id: 'ff-btn', target: '.btn-find-facility',
            icon: 'local_hospital', title: 'Find Facilities — Live Directory',
            body: 'A searchable directory of every government facility in the district: beds, ' +
                  'blood stock, antivenom, diagnostics — with live open/closed status.<br><br>' +
                  '👉 <b>TRY IT:</b> click to open it.',
            waitFor: 'facilities-opened'
        }
    ];

    /* ---------------------------- STEPS (2/2) ---------------------------- */

    STEPS.push(
        {
            id: 'ff-use', target: '#ff-chips',
            icon: 'filter_alt', title: 'Filter Like a Pro',
            body: 'These chips filter instantly — try <b>🩸 Blood Bank</b>, <b>🚨 24×7 Open</b> or ' +
                  '<b>🐍 Antivenom</b>. Searching "blood" works too.<br><br>' +
                  '👉 <b>TRY IT:</b> tap any chip or type in the search box.',
            waitFor: 'facilities-filtered'
        },
        {
            id: 'ff-gps', target: '#ff-loc',
            icon: 'near_me', title: 'Nearest-First With Real GPS',
            body: '<b>"Use My Location"</b> sorts every facility by real distance and flags the ' +
                  'closest one with a NEAREST ribbon. Every card has working <b>Call</b>, ' +
                  '<b>Directions</b> and <b>Request</b> actions.<br><br>' +
                  '👉 Close the modal when you are ready to continue.',
            waitFor: 'facilities-closed'
        },
        {
            id: 'account', target: '#account-menu-btn',
            icon: 'badge', title: 'Sign-In — Verify Once, Zero Friction Forever',
            body: 'Verify your mobile (OTP), link ABHA / DigiLocker, and save your blood group, ' +
                  'allergies and emergency contact <b>in advance</b>.<br><br>' +
                  'In a real emergency your identity is already proven — cases show your name, ' +
                  'and hospitals see your medical profile.<br><br>' +
                  '👉 <b>TRY IT:</b> open the Account hub.',
            waitFor: 'account-opened'
        },
        {
            id: 'account-save', target: '#account-menu-btn',
            icon: 'save', title: 'Your Details Flow Everywhere',
            body: 'Fill <b>Basic Details</b> (name, age, blood group, allergies, emergency contact) ' +
                  'and hit <b>Save</b>. They appear automatically in case rows and the dashboard ' +
                  '<b>Patients</b> tab.<br><br>' +
                  '👉 <b>TRY IT:</b> save your profile (any details work in Demo Mode).',
            waitFor: 'account-saved'
        },
        {
            id: 'dashboard', target: 'nav button[onclick="openDashboardModal()"], nav a[href="admin-login.html"]',
            icon: 'dashboard', title: 'Officer Login — Command Center Behind Credentials',
            body: 'The <b>duty-officer Command Center</b> (live cases with 🛡 <b>credibility chips</b>, the ' +
                  '<b>Patients</b> directory, blood/inventory stock alerts, ambulance fleet GPS and broadcast ' +
                  'alerts) now lives behind a <b>credential gate</b> so citizens never see it.<br><br>' +
                  'As a citizen you will not see any dashboard here — officers sign in via ' +
                  '<b>Officer Login</b> (admin / mitra123 in this prototype).',
            cta: 'Next'
        },
        {
            id: 'finish', center: true,
            icon: 'verified', title: 'You Are Ready! 🎉',
            body: 'You have now tried the <b>wizard</b>, the <b>SOS flow</b>, the <b>facilities ' +
                  'finder</b> and the <b>account hub</b> — all in Demo Mode.<br><br>' +
                  'Exiting Demo Mode now. The <b>?</b> button (bottom-right) replays this tour ' +
                  'anytime.<br><br><b>In a real emergency:</b> unconscious → <b>SOS</b>. ' +
                  'Conscious → <b>Start Emergency</b>.',
            cta: 'Finish Tour & Exit Demo'
        }
    );

    /* ---------------------------- STATE ---------------------------- */

    let idx = -1;
    let active = false;
    let scrolledFor = null;                          // step already scrolled into view
    const els = {};

    /* --------------------- TUTORIAL i18n (EN/HI/MR) --------------------
       Language-aware step text. Falls back to English automatically.
       The active dictionary is re-read on every render() so a language
       switch mid-tour re-translates the CURRENT step immediately. */

    const TT = {
        hi: {
            steps: {
                welcome: { title: 'इमर्जन्सी मित्र में आपका स्वागत है!', body: '<b>यहां आपका स्वागत है।</b> यह <b>2 मिनट का हाथों-हाथ टूर</b> है — ' +
                    'आप हर मुख्य फीचर <b>खुद आज़माएंगे</b>, सिर्फ पढ़ेंगे नहीं।<br><br>' +
                    '🎓 <b>डेमो मोड चालू है</b>: टूर के दौरान आपकी कोई कार्रवाई असली शिकायत दर्ज ' +
                    'नहीं करती, असली SOS नहीं भेजती। बेझिझक खोजें!', cta: 'टूर शुरू करें' },
                'wizard-btn': { title: 'आपातकाल शुरू करें — निर्देशित विज़ार्ड', body: 'यह <b>स्टेप-बाय-स्टेप विज़ार्ड</b> खोलता है: आपातकाल का प्रकार चुनें, ' +
                    'तेज़ सवालों के जवाब दें, फोटो/आवाज़ का सबूत जोड़ें।<br><br>' +
                    '👉 <b>आज़माएं:</b> अभी इस बटन पर क्लिक करें।' },
                'wizard-use': { title: 'विज़ार्ड आज़माएं — कुछ भी असली दर्ज नहीं होता', body: 'कोई भी <b>आपातकाल का प्रकार</b> चुनें और स्टेप्स पूरे करें।<br><br>' +
                    'जब आप बंद करेंगे, डेमो मोड केस को दर्ज होने से रोक देगा — ट्रस्ट इंजन लॉग में ' +
                    '<i>"NOT filed"</i> देखें।<br><br>👉 देख लें तो विज़ार्ड बंद कर दें।' },
                'sos-btn': { title: 'SOS — बेहोश मरीजों के लिए', body: 'सबसे बुरे पल के लिए एक टैप: पहले <b>कानूनी नियम</b> दिखते हैं ' +
                    '(फर्जी रिपोर्ट चेतावनी), फिर GPS + सबूत श्रृंखला अपने आप चालू — ' +
                    '<b>टाइपिंग की ज़रूरत नहीं</b>।<br><br>👉 <b>आज़माएं:</b> SOS दबाएं, कानूनी कार्ड पढ़ें, ' +
                    '<i>"मैं समझता/समझती हूं"</i> दबाएं। डेमो मोड अलर्ट को निगल जाएगा।' },
                'sos-explain': { title: 'अभी क्या हुआ?', body: 'आपने <b>कानूनी सहमति</b> देखी जो हर रिपोर्टर को देनी होती है। असली ' +
                    'आपातकाल में उस टैप से: 📍 GPS लॉक → 📷 सबूत श्रृंखला → 📞 IVR कॉल-बैक → ' +
                    '🛡 विश्वसनीयता स्कोरिंग → 🚑 डिस्पैच।<br><br>डेमो मोड में <b>कुछ भी नहीं भेजा गया</b> — ट्रस्ट इंजन लॉग देखें।', cta: 'आगे' },
                'ff-btn': { title: 'सुविधाएं खोजें — लाइव डायरेक्टरी', body: 'जिले की हर सरकारी सुविधा की खोज योग्य डायरेक्टरी: बेड, रक्त स्टॉक, ' +
                    'एंटीवेनम, जांचें — खुला/बंद स्टेटस के साथ।<br><br>👉 <b>आज़माएं:</b> क्लिक करके खोलें।' },
                'ff-use': { title: 'प्रो की तरह फ़िल्टर करें', body: 'ये चिप्स तुरंत फ़िल्टर करते हैं — <b>🩸 ब्लड बैंक</b>, <b>🚨 24×7 खुला</b> या ' +
                    '<b>🐍 एंटीवेनम</b> आज़माएं। "blood" टाइप करने पर भी चलेगा।<br><br>' +
                    '👉 <b>आज़माएं:</b> कोई चिप दबाएं या सर्च बॉक्स में टाइप करें।' },
                'ff-gps': { title: 'निकटतम-पहले, असली GPS के साथ', body: '<b>"मेरा स्थान उपयोग करें"</b> हर सुविधा को असली दूरी से क्रमित करता है और ' +
                    'सबसे नज़दीकी पर NEAREST रिबन लगाता है। हर कार्ड में काम करते <b>कॉल</b>, ' +
                    '<b>रास्ता</b> और <b>अनुरोध</b> बटन हैं।<br><br>👉 आगे बढ़ने के लिए मोडल बंद करें।' },
                account: { title: 'साइन-इन — एक बार सत्यापन, हमेशा झीरो झंझट', body: 'मोबाइल सत्यापित करें (OTP), ABHA / DigiLocker जोड़ें, और अपना रक्त समूह, ' +
                    'एलर्जी व आपातकालीन संपर्क <b>पहले से</b> सेव करें।<br><br>असली आपातकाल में आपकी पहचान पहले से ' +
                    'साबित होगी — केस में आपका नाम और मेडिकल प्रोफ़ाइल अस्पताल को दिखेगी।<br><br>' +
                    '👉 <b>आज़माएं:</b> अकाउंट हब खोलें।' },
                'account-save': { title: 'आपकी जानकारी हर जगह फ्लो करती है', body: '<b>Basic Details</b> भरें (नाम, उम्र, रक्त समूह, एलर्जी, आपातकालीन संपर्क) ' +
                    'और <b>Save</b> दबाएं। ये केस रोज़ और डैशबोर्ड के <b>मरीज़</b> टैब में अपने आप दिखेंगे।<br><br>' +
                    '👉 <b>आज़माएं:</b> प्रोफ़ाइल सेव करें (डेमो मोड में कोई भी जानकारी चलेगी)।' },
                dashboard: { title: 'अधिकारी लॉगिन — क्रेडेंशियल के पीछे कमांड सेंटर', body: '<b>ड्यूटी ऑफिसर कमांड सेंटर</b> (🛡 <b>विश्वसनीयता चिप्स</b> वाले लाइव केस, ' +
                    '<b>मरीज़</b> डायरेक्टरी, रक्त/इन्वेंट्री अलर्ट, एम्बुलेंस फ्लीट GPS और प्रसारण) अब ' +
                    '<b>लॉगिन गेट</b> के पीछे है ताकि नागरिक इसे कभी न देखें।<br><br>' +
                    'नागरिक के रूप में आपको यहां कोई डैशबोर्ड नहीं दिखेगा — अधिकारी <b>Officer Login</b> ' +
                    '(इस प्रोटोटाइप में admin / mitra123) से साइन इन करते हैं।', cta: 'आगे' },
                finish: { title: 'आप तैयार हैं! 🎉', body: 'आपने <b>विज़ार्ड</b>, <b>SOS फ्लो</b>, <b>सुविधा खोज</b> और <b>अकाउंट हब</b> — सब ' +
                    'डेमो मोड में आज़मा लिया।<br><br>डेमो मोड अब बंद हो रहा है। <b>?</b> बटन (नीचे-दाएं) से ' +
                    'टूर कभी भी दोबारा चलाएं।<br><br><b>असली आपातकाल में:</b> बेहोश → <b>SOS</b>. ' +
                    'होश में → <b>आपातकाल शुरू करें</b>।', cta: 'टूर पूरा करें और डेमो बंद करें' }
            },
            ui: { step: 'चरण', of: '/', try: 'आज़माएं', skip: 'छोड़ें', back: 'पीछे', next: 'आगे' },
            toast: '🎓 टूर पूरा — डेमो मोड बंद। अब आप असली काम के लिए तैयार हैं!'
        },
        mr: {
            steps: {
                welcome: { title: 'इमर्जन्सी मित्रमध्ये स्वागत आहे!', body: '<b>इथे आपलं स्वागत आहे.</b> हा <b>2 मिनिटांचा हाताळणीचा टूर</b> आहे — ' +
                    'तुम्ही प्रत्येक महत्त्वाचे फीचर <b>स्वतः वापरून पाहाल</b>, फक्त वाचणार नाही.<br><br>' +
                    '🎓 <b>डेमो मोड सुरू आहे</b>: टूरदरम्यान तुमची कोणतीही कृती खऱ्या तक्रारीची नोंद ' +
                    'करत नाही किंवा खरा SOS पाठवत नाही. निर्भयपणे वापरा!', cta: 'टूर सुरू करा' },
                'wizard-btn': { title: 'आपत्कालीन सुरू करा — मार्गदर्शित विझार्ड', body: 'हे <b>टप्प्याटप्प्याने विझार्ड</b> उघडते: आपत्कालीन प्रकार निवडा, ' +
                    'झटपट प्रश्नांची उत्तरे द्या, फोटो/आवाजाचा पुरावा जोडा.<br><br>' +
                    '👉 <b>वापरून पहा:</b> आता हे बटण दाबा.' },
                'wizard-use': { title: 'विझार्ड वापरून पहा — खरी नोंद होत नाही', body: 'कोणताही <b>आपत्कालीन प्रकार</b> निवडा आणि टप्पे पूर्ण करा.<br><br>' +
                    'तुम्ही बंद केल्यावर डेमो मोड प्रकरण नोंदवण्यास प्रतिबंध करेल — ट्रस्ट इंजन लॉगमध्ये ' +
                    '<i>"NOT filed"</i> पहा.<br><br>👉 पाहून झाल्यावर विझार्ड बंद करा.' },
                'sos-btn': { title: 'SOS — बेशुद्ध रुग्णांसाठी', body: 'सर्वात वाईट क्षणांसाठी एक टॅप: आधी <b>कायदेशीर नियम</b> दिसतात ' +
                    '(खोट्या तक्रारीची सूचना), मग GPS + पुरावा साखळी आपोआप सुरू — ' +
                    '<b>टाइपिंगची गरज नाही</b>.<br><br>👉 <b>वापरून पहा:</b> SOS दाबा, कायदेशीर कार्ड वाचा, ' +
                    '<i>"मला समजले"</i> दाबा. डेमो मोड अलर्ट गिळंकृत करेल.' },
                'sos-explain': { title: 'नुकतं काय झालं?', body: 'तुम्ही <b>कायदेशीर सहमती</b> पाहिली जी प्रत्येक नोंददात्याने द्यायची असते. खऱ्या ' +
                    'आपत्कालीन परिस्थितीत त्या टॅपमुळे: 📍 GPS लॉक → 📷 पुरावा साखळी → 📞 IVR कॉल-बॅक → ' +
                    '🛡 विश्वासार्हता स्कोअरिंग → 🚑 पाठवणी.<br><br>डेमो मोडमध्ये <b>काहीही पाठवले गेले नाही</b> — ट्रस्ट इंजन लॉग पहा.', cta: 'पुढे' },
                'ff-btn': { title: 'सुविधा शोधा — थेट निर्देशिका', body: 'जिल्ह्यातील प्रत्येक सरकारी सुविधेची शोधण्यायोग्य निर्देशिका: बेड, रक्तसाठा, ' +
                    'ॲन्टीव्हेनम, तपासण्या — उघडे/बंद स्थितीसह.<br><br>👉 <b>वापरून पहा:</b> क्लिक करून उघडा.' },
                'ff-use': { title: 'व्यावसायिकाप्रमाणे फिल्टर करा', body: 'हे चिप्स लगेच फिल्टर करतात — <b>🩸 रक्तपेढी</b>, <b>🚨 24×7 उघडे</b> किंवा ' +
                    '<b>🐍 ॲन्टीव्हेनम</b> वापरून पहा. "blood" टाइप करूनही चालते.<br><br>' +
                    '👉 <b>वापरून पहा:</b> कोणतीही चिप दाबा किंवा सर्च बॉक्समध्ये टाइप करा.' },
                'ff-gps': { title: 'जवळपास-प्रथम, खऱ्या GPS सह', body: '<b>"माझे स्थान वापरा"</b> प्रत्येक सुविधा खऱ्या अंतरानुसार क्रमित करते आणि ' +
                    'सर्वात जवळच्या वर NEAREST रिबन लावते. प्रत्येक कार्डवर कार्यरत <b>कॉल</b>, ' +
                    '<b>मार्गदर्शक</b> आणि <b>विनंती</b> बटणे आहेत.<br><br>👉 पुढे जाण्यासाठी मोडaal बंद करा.' },
                account: { title: 'साइन-इन — एकदा पडताळा, कायम सुलभ', body: 'मोबाईल पडताळा (OTP), ABHA / DigiLocker जोडा, आणि रक्तगट, ॲलर्जी व ' +
                    'आपत्कालीन संपर्क <b>अगोदरच</b> सेव्ह करा.<br><br>खऱ्या आपत्कालीन परिस्थितीत तुमची ओळख ' +
                    'आधीच सिद्ध असेल — प्रकरणात तुमचं नाव व वैद्यकीय प्रोफाइल रुग्णालयाला दिसेल.<br><br>' +
                    '👉 <b>वापरून पहा:</b> अकाउंट हब उघडा.' },
                'account-save': { title: 'तुमची माहिती सर्वत्र वापरली जाते', body: '<b>Basic Details</b> भरा (नाव, वय, रक्तगट, ॲलर्जी, आपत्कालीन संपर्क) ' +
                    'आणि <b>Save</b> दाबा. ती प्रकरणांच्या ओळींत व डॅशबोर्डच्या <b>रुग्ण</b> टॅबमध्ये आपोआप दिसेल.<br><br>' +
                    '👉 <b>वापरून पहा:</b> प्रोफाइल सेव्ह करा (डेमो मोडमध्ये कोणतीही माहिती चालते).' },
                dashboard: { title: 'अधिकारी लॉगिन — क्रेडेन्शियलमागील कमांड सेंटर', body: '<b>कर्तव्यदर्शक अधिकारी कमांड सेंटर</b> (🛡 <b>विश्वासार्हता चिप्स</b>सह थेट प्रकरणे, ' +
                    '<b>रुग्ण</b> निर्देशिका, रक्त/सामग्री सूचना, रुग्णवाहिका ताफा GPS आणि प्रसारण) आता ' +
                    '<b>लॉगिन गेट</b>मागे आहे जेणेकरून नागरिक ते कधीही पाहू नयेत.<br><br>' +
                    'नागरिक म्हणून तुम्हाला इथे डॅशबोर्ड दिसणार नाही — अधिकारी <b>Officer Login</b> ' +
                    '(या प्रोटोटाइपमध्ये admin / mitra123) द्वारे साइन इन करतात.', cta: 'पुढे' },
                finish: { title: 'तुम्ही तयार आहात! 🎉', body: 'तुम्ही <b>विझार्ड</b>, <b>SOS फ्लो</b>, <b>सुविधा शोध</b> आणि <b>अकाउंट हब</b> — सर्व ' +
                    'डेमो मोडमध्ये वापरून पाहिले.<br><br>डेमो मोड आता बंद होत आहे. <b>?</b> बटणाने (खाली-उजवीकडे) ' +
                    'टूर कधीही पुन्हा चालवा.<br><br><b>खऱ्या आपत्कालीन परिस्थितीत:</b> बेशुद्ध → <b>SOS</b>. ' +
                    'होशात → <b>आपत्कालीन सुरू करा</b>.', cta: 'टूर पूर्ण करा व डेमो बंद करा' }
            },
            ui: { step: 'टप्पा', of: '/', try: 'वापरून पहा', skip: 'वगळा', back: 'मागे', next: 'पुढे' },
            toast: '🎓 टूर पूर्ण — डेमो मोड बंद. आता तुम्ही खऱ्या वापरासाठी तयार आहात!'
        }
    };

    function lang() {
        return (window.currentLang === 'hi' || window.currentLang === 'mr') ? window.currentLang : 'en';
    }
    function stepText(step) {
        var pack = TT[lang()];
        if (pack && pack.steps[step.id]) return pack.steps[step.id];
        return null;
    }
    function uiText() {
        var pack = TT[lang()];
        return (pack && pack.ui) || { step: 'Step', of: 'of', try: 'TRY IT', skip: 'Skip', back: 'Back', next: 'Next' };
    }

    /* ---------------------------- TOUR ENGINE ---------------------------- */

    function el(id) {
        if (!els[id]) els[id] = document.getElementById(id);
        return els[id];
    }

    function emit(name) {
        if (!active || idx < 0 || idx >= STEPS.length) return;
        if (STEPS[idx].waitFor === name) {
            setTimeout(next, 450);                       // beat for the UI to settle
        }
    }

    function targetRect(step) {
        if (!step.target) return null;
        const t = document.querySelector(step.target);
        if (!t) return null;                             // target absent on this portal — step stays centered
        const r = t.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return null; // hidden (closed modal etc.)
        return r;
    }

    function curZoom() {
        /* text-size.js A+/A++ applies CSS zoom on <html>. getBoundingClientRect()
           already reports VISUAL px, but every style px we write is rendered
           ×zoom — so divide by the active zoom to keep the spotlight exact. */
        try {
            if (window.TextSize && window.TextSize.engine === 'zoom') {
                var s = window.TextSize.current();
                if (s && s > 0) return s;
            }
        } catch (e) { /* ignore */ }
        return 1;
    }

    function place() {
        if (!active || idx < 0) return;
        const step = STEPS[idx];
        const spot = el('tut-spot'), ring = el('tut-ring'), card = el('tut-card');
        if (!spot || !card) return;
        const z = curZoom();
        const toEl = (v) => Math.round(v / z);           // real px -> element px
        const r = targetRect(step);
        const vw = window.innerWidth, vh = window.innerHeight;
        const pad = 8;

        if (!r) {                                        // centered card, no cutout
            // Target missing on this portal entirely? Skip forward so the
            // tour never stalls (e.g. officer-only steps on citizen pages).
            if (step.target && !document.querySelector(step.target)) {
                if (idx < STEPS.length - 1) { idx++; render(); }
                return;
            }
            spot.style.opacity = '0';
            ring.style.opacity = '0';
            const cw = Math.min(430, vw - 32);
            card.style.left = toEl(Math.max(16, (vw - cw) / 2)) + 'px';
            const ch = (card.offsetHeight || 210) * z;   // element px -> real px
            card.style.top = toEl(Math.max(16, (vh - ch) / 2 - 30)) + 'px';
            return;
        }

        // MOBILE FIX: target below the fold / offscreen (e.g. hero buttons on
        // a phone)? Bring it into view first — the scroll listener re-places
        // the spotlight as the page glides. One attempt per step: no loops.
        if (r.top < pad || r.left < pad || r.bottom > vh - pad || r.right > vw - pad) {
            if (scrolledFor !== step.id) {
                const t = document.querySelector(step.target);
                if (t && typeof t.scrollIntoView === 'function') {
                    scrolledFor = step.id;
                    t.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    return;
                }
            }
            // already tried and still clipped — fall through and clamp below
        }

        spot.style.opacity = '1';
        spot.style.left = toEl(Math.max(0, r.left - pad)) + 'px';
        spot.style.top = toEl(Math.max(0, r.top - pad)) + 'px';
        spot.style.width = toEl(Math.min(vw, r.width + pad * 2)) + 'px';
        spot.style.height = toEl(Math.min(vh, r.height + pad * 2)) + 'px';

        ring.style.opacity = '1';
        ring.style.left = toEl(r.left - pad) + 'px';
        ring.style.top = toEl(r.top - pad) + 'px';
        ring.style.width = toEl(r.width + pad * 2) + 'px';
        ring.style.height = toEl(r.height + pad * 2) + 'px';

        const cw = Math.min(360, vw - 24);
        card.style.width = toEl(cw) + 'px';
        const cardH = (card.offsetHeight || 210) * z;    // element px -> real px
        let top;
        if (r.bottom + cardH + 26 < vh) {
            top = r.bottom + 16;                          // below the target
        } else if (r.top - cardH - 26 > 0) {
            top = r.top - cardH - 16;                     // above the target
        } else {
            top = Math.max(16, (vh - cardH) / 2);         // fallback: middle
        }
        // never let the card overflow the bottom edge (short screens)
        top = Math.min(top, Math.max(16, vh - cardH - 12));
        card.style.left = toEl(Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12)) + 'px';
        card.style.top = toEl(top) + 'px';
    }

    function render() {
        if (idx < 0 || idx >= STEPS.length) return;
        const step = STEPS[idx];
        const card = el('tut-card');
        if (!card) return;
        scrolledFor = null;

        const ov = stepText(step) || {};
        const ui = uiText();
        const title = ov.title || step.title;
        const body = ov.body || step.body;

        const counter = ui.step + ' ' + (idx + 1) + ' ' + ui.of + ' ' + STEPS.length;
        const pct = Math.round(((idx + 1) / STEPS.length) * 100);
        const isLast = idx === STEPS.length - 1;
        const nextLabel = ov.cta || step.cta || (step.waitFor ? ui.try : ui.next);
        const isFinish = isLast || step.id === 'finish';

                /* step dots - completed solid, current elongated, upcoming hollow */
        let dots = '';
        for (let i = 0; i < STEPS.length; i++) {
            const cls = i === idx ? 'tut-dot active' : (i < idx ? 'tut-dot done' : 'tut-dot');
            dots += '<button class="' + cls + '" aria-label="Go to step ' + (i + 1) + '" ' +
                (i <= idx ? 'onclick="Tutorial.goTo(' + i + ')"' : 'disabled') +
                '></button>';
        }
        card.innerHTML =
            /* gradient header band */
            '<div class="tut-head">' +
                '<div class="tut-icontile"><span class="material-symbols-outlined">' + step.icon + '</span></div>' +
                '<div class="tut-head-meta">' +
                    '<div class="tut-kicker">Emergency Mitra &bull; Guided Tour</div>' +
                    '<div class="tut-counter">' + counter + '</div>' +
                '</div>' +
                (step.waitFor
                    ? '<span class="tut-try"><span class="material-symbols-outlined">touch_app</span>' + ui.try + '</span>'
                    : '') +
            '</div>' +
            /* shimmer progress */
            '<div class="tut-progress"><div class="tut-progress-fill" style="width:' + pct + '%"></div></div>' +
            /* body */
            '<div class="tut-content">' +
                '<div class="tut-title">' + title + '</div>' +
                '<div class="tut-body">' + body + '</div>' +
            '</div>' +
            '<div class="tut-dots">' + dots + '</div>' +
            '<div class="tut-btns">' +
                '<button class="tut-btn ghost" onclick="Tutorial.stop(true)">' + ui.skip + '</button>' +
                (idx > 0 ? '<button class="tut-btn ghost" onclick="Tutorial.prev()">' + ui.back + '</button>' : '') +
                '<button class="tut-btn primary" onclick="Tutorial.' + (isFinish ? 'finish()' : 'next()') + '">' +
                    nextLabel +
                    '<span class="material-symbols-outlined">' + (isFinish ? 'verified' : 'arrow_forward') + '</span></button>' +
            '</div>';
        place();
    }

    function start(fromHelp) {
        if (active) return;
        active = true;
        idx = 0;
        DemoMode.enter();
        buildUi();
        document.getElementById('tut-overlay-bg').classList.add('show');
        document.getElementById('tut-card').classList.add('show');
        document.getElementById('tut-help').style.display = 'none';
        render();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        document.addEventListener('keydown', onKey);
        console.info('[Tutorial] started' + (fromHelp ? ' (replay)' : ''));
    }

    function stop(skipped) {
        active = false;
        idx = -1;
        const bg = document.getElementById('tut-overlay-bg');
        const card = document.getElementById('tut-card');
        const spot = document.getElementById('tut-spot');
        const ring = document.getElementById('tut-ring');
        if (bg) bg.classList.remove('show');
        if (card) card.classList.remove('show');
        if (spot) spot.style.opacity = '0';
        if (ring) ring.style.opacity = '0';
        const help = document.getElementById('tut-help');
        if (help) help.style.display = 'flex';
        window.removeEventListener('resize', place);
        window.removeEventListener('scroll', place, true);
        document.removeEventListener('keydown', onKey);
        if (!skipped) DemoMode.exit();
        console.info('[Tutorial] stopped' + (skipped ? ' (skipped)' : ''));
    }

    function finish() {
        try { localStorage.setItem(DONE_KEY, '1'); } catch (e) { /* private mode */ }
        DemoMode.exit();
        stop(false);
        var pack = TT[lang()];
        miniToast((pack && pack.toast) || '🎓 Tour complete — Demo Mode off. You are ready for the real thing!');
    }

    function next() { idx = Math.min(idx + 1, STEPS.length - 1); render(); }
    function goTo(i) { if (i >= 0 && i < STEPS.length) { idx = i; render(); } }
    function prev() { idx = Math.max(idx - 1, 0); render(); }

    function onKey(e) {
        if (!active) return;
        if (e.key === 'ArrowRight' || e.key === 'Enter') next();
        else if (e.key === 'ArrowLeft') prev();
        else if (e.key === 'Escape') stop(true);
    }

    function miniToast(msg) {
        const t = document.getElementById('tut-mini-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 3800);
    }

    window.Tutorial = {
        start: () => start(true),
        stop, next, prev, goTo, finish, emit,
        isActive: () => active,
        steps: STEPS
    };

    /* Language switch mid-tour: re-render the CURRENT step in the new
       language instantly (titles, body, buttons, progress counter). */
    window.addEventListener('em:language-changed', function () {
        if (active && idx >= 0) render();
    });

    /* ---------------------------- UI BUILD ---------------------------- */

    function buildUi() {
        if (document.getElementById('tut-overlay-bg')) return;

        /* floating-widget styles (AI FAB + help button) */
        const fab = document.createElement('style');
        fab.textContent =
            '#mitra-ai-fab{position:fixed;right:20px;bottom:86px;z-index:29000;width:54px;height:54px;' +
            'border-radius:50%;border:2px solid rgba(255,255,255,.55);cursor:pointer;' +
            'background:linear-gradient(135deg,#00453d 0%,#0b6b5d 55%,#14a08a 100%);color:#fff;' +
            'box-shadow:0 8px 24px rgba(0,69,61,.5);display:flex;align-items:center;justify-content:center;' +
            'animation:mitraFabPulse 2.6s ease infinite;transition:transform .18s ease}' +
            '#mitra-ai-fab:hover{transform:scale(1.12)}' +
            '#mitra-ai-fab .mitra-ai-emoji{font-size:30px;line-height:1;font-family:' +
            '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif}' +
            '#mitra-ai-fab .mitra-fab-plus{position:absolute;top:-2px;right:-2px;width:18px;height:18px;' +
            'border-radius:50%;background:#ba1a1a;color:#fff;font-size:13px;font-weight:900;line-height:18px;' +
            'text-align:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)}' +
            '#mitra-ai-fab .mitra-fab-tag{position:absolute;right:62px;top:50%;transform:translateY(-50%) ' +
            'translateX(6px);background:#2e1065;color:#fff;font-size:11px;font-weight:800;padding:5px 10px;' +
            'border-radius:9px;white-space:nowrap;opacity:0;pointer-events:none;transition:all .2s ease;' +
            'box-shadow:0 4px 14px rgba(0,0,0,.3)}' +
            '#mitra-ai-fab:hover .mitra-fab-tag{opacity:1;transform:translateY(-50%) translateX(0)}' +
            '@keyframes mitraFabPulse{0%{box-shadow:0 8px 24px rgba(0,69,61,.5),0 0 0 0 rgba(20,160,138,.45)}' +
            '70%{box-shadow:0 8px 24px rgba(0,69,61,.5),0 0 0 16px rgba(20,160,138,0)}' +
            '100%{box-shadow:0 8px 24px rgba(0,69,61,.5),0 0 0 0 rgba(20,160,138,0)}}' +
            '@media (max-width:640px){#mitra-ai-fab{right:16px;bottom:84px;width:50px;height:50px}' +
            '#mitra-ai-fab .material-symbols-outlined{font-size:24px}}' +
            '@media print{#mitra-ai-fab{display:none}}';
        document.head.appendChild(fab);

        const frag = document.createDocumentFragment();

        const bg = document.createElement('div');
        bg.id = 'tut-overlay-bg';
        frag.appendChild(bg);

        const spot = document.createElement('div');
        spot.id = 'tut-spot';
        frag.appendChild(spot);

        const ring = document.createElement('div');
        ring.id = 'tut-ring';
        frag.appendChild(ring);

        const card = document.createElement('div');
        card.id = 'tut-card';
        frag.appendChild(card);

        const help = document.createElement('button');
        help.id = 'tut-help';
        help.title = 'Replay the interactive tutorial';
        help.innerHTML = '<span class="material-symbols-outlined">help</span>';
        help.onclick = () => {
            if (DemoMode.active) DemoMode.exit();
            start(true);
        };
        frag.appendChild(help);

        /* ---- Ask Mitra AI floating shortcut (stacked above help) ----
           Doctor icon: on-device Material "medical_information" (stethoscope-
           style chart glyph) over a teal gradient + a red + badge like
           real health assistants. Falls back to the emoji if Material
           Symbols have not loaded (offline CDN case). */
        if (!document.getElementById('mitra-ai-fab')) {
            const ai = document.createElement('button');
            ai.id = 'mitra-ai-fab';
            ai.title = 'Ask Mitra AI — instant health guidance';
            ai.setAttribute('aria-label', 'Ask Mitra AI');
            ai.innerHTML =
                '<span class="mitra-ai-emoji">🧑‍⚕️</span>' +
                '<span class="mitra-fab-plus">+</span>' +
                '<span class="mitra-fab-tag">Ask Mitra AI 🧑‍⚕️</span>';
            ai.onclick = function () {
                try {
                    if (window.MitraTriage && typeof window.MitraTriage.open === 'function') {
                        window.MitraTriage.open();
                        if (typeof window.MitraTriage.tab === 'function') {
                            window.MitraTriage.tab('chat');
                        }
                        return;
                    }
                    if (typeof window.openModal === 'function') window.openModal('modal-triage');
                    if (window.MitraChat && typeof window.MitraChat.onShow === 'function') {
                        window.MitraChat.onShow();
                    }
                } catch (e) { /* never crash the page */ }
            };
            frag.appendChild(ai);
        }

        const badge = document.createElement('div');
        badge.id = 'tut-demo-badge';
        badge.innerHTML =
            '<span class="material-symbols-outlined">school</span>DEMO MODE — nothing real is filed' +
            '<button onclick="DemoMode.exit(); document.getElementById(\'tut-demo-badge\').classList.remove(\'show\')" ' +
            'title="Exit demo mode">Exit</button>';
        frag.appendChild(badge);

        const toast = document.createElement('div');
        toast.id = 'tut-mini-toast';
        frag.appendChild(toast);

        document.body.appendChild(frag);
    }

    /* ---------------------------- HOOKS ---------------------------- */

    function wireHooks() {
        function wrapFn(obj, fn, after) {
            const orig = obj[fn];
            if (typeof orig !== 'function') return;
            obj[fn] = function () {
                const r = orig.apply(this, arguments);
                try { after.apply(this, arguments); } catch (e) { /* never break host */ }
                return r;
            };
        }

        wrapFn(window, 'startEmergencySequence', () => emit('wizard-opened'));
        wrapFn(window, 'closeEmergencyWizard', () => emit('wizard-closed'));
        wrapFn(window, 'openFindFacilityModal', () => emit('facilities-opened'));
        wrapFn(window, 'openDashboardModal', () => emit('dashboard-opened'));
        wrapFn(window, 'closeModal', (id) => {
            if (id === 'modal-find-facility') emit('facilities-closed');
        });
        if (window.Facilities) {
            wrapFn(window.Facilities, 'setChip', () => emit('facilities-filtered'));
            wrapFn(window.Facilities, 'setQuery', () => emit('facilities-filtered'));
        }
        if (window.AccountUI) {
            wrapFn(window.AccountUI, 'open', () => emit('account-opened'));
            wrapFn(window.AccountUI, 'saveProfile', () => emit('account-saved'));
        }
    }

    /* ---------------------------- BOOT ---------------------------- */

    document.addEventListener('DOMContentLoaded', () => {
        buildUi();
        wireHooks();
        let done = false;
        try { done = localStorage.getItem(DONE_KEY) === '1'; } catch (e) { /* private mode */ }
        if (!done) {
            DemoMode.enter();
            setTimeout(() => start(false), 900);          // let the hero settle first
        }
    });

    /* ---------------------------- STYLES ---------------------------- */

    /* ---------------------------- STYLES ---------------------------- */
/* Premium purple design system: deep-violet glass card, animated
   gradient header, shimmer progress, step dots. */
(function injectStyles() {
    const st = document.createElement('style');
    st.textContent =

        /* ---------- backdrop ---------- */
        '#tut-overlay-bg{position:fixed;inset:0;' +
        'background:radial-gradient(ellipse at 30% 20%,rgba(76,29,149,.38),transparent 55%),' +
        'radial-gradient(ellipse at 75% 80%,rgba(124,58,237,.30),transparent 55%),rgba(12,6,24,.66);' +
        'backdrop-filter:blur(3px);z-index:29998;opacity:0;pointer-events:none;transition:opacity .4s ease}' +
        '#tut-overlay-bg.show{opacity:1;pointer-events:auto}' +

        /* ---------- cutout spotlight ---------- */
        '#tut-spot{position:fixed;z-index:29999;border-radius:16px;pointer-events:none;opacity:0;' +
        'box-shadow:0 0 0 9999px rgba(12,6,24,.68);outline:3px solid rgba(233,213,255,.95);' +
        'transition:all .45s cubic-bezier(.4,0,.2,1)}' +
        '#tut-ring{position:fixed;z-index:29999;border-radius:16px;pointer-events:none;opacity:0;' +
        'border:3px solid #a855f7;animation:tutPulse 1.7s ease-out infinite;' +
        'transition:all .45s cubic-bezier(.4,0,.2,1)}' +
        '@keyframes tutPulse{0%{box-shadow:0 0 0 0 rgba(168,85,247,.6)}' +
        '70%{box-shadow:0 0 0 18px rgba(168,85,247,0)}100%{box-shadow:0 0 0 0 rgba(168,85,247,0)}}' +

        /* ---------- glass card ---------- */
        '#tut-card{position:fixed;z-index:30000;width:352px;max-width:calc(100vw - 24px);' +
        'background:linear-gradient(165deg,#ffffff 0%,#faf7ff 55%,#f4ecff 100%);' +
        'border-radius:20px;overflow:hidden;' +
        'box-shadow:0 24px 70px rgba(46,16,101,.45),0 0 0 1px rgba(168,85,247,.25);' +
        'opacity:0;pointer-events:none;' +
        'transition:opacity .3s ease,left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1)}' +
        '#tut-card.show{opacity:1;pointer-events:auto;animation:tutIn .38s cubic-bezier(.34,1.4,.64,1)}' +
        '@keyframes tutIn{from{transform:translateY(14px) scale(.97);opacity:0}to{transform:none;opacity:1}}' +

        /* ---------- gradient header ---------- */
        '.tut-head{display:flex;align-items:center;gap:11px;padding:14px 16px;' +
        'background:linear-gradient(120deg,#4c1d95 0%,#7c3aed 45%,#a855f7 80%,#c084fc 100%);' +
        'background-size:200% 200%;animation:tutFlow 6s ease infinite;' +
        'position:relative;overflow:hidden}' +
        '@keyframes tutFlow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}' +
        '.tut-head::after{content:"";position:absolute;top:0;left:-80%;width:55%;height:100%;' +
        'background:linear-gradient(105deg,transparent,rgba(255,255,255,.28),transparent);' +
        'animation:tutShine 3.2s ease infinite}' +
        '@keyframes tutShine{0%{left:-80%}55%,100%{left:130%}}' +
        '.tut-icontile{width:42px;height:42px;border-radius:13px;background:rgba(255,255,255,.18);' +
        'border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;' +
        'flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}' +
        '.tut-icontile .material-symbols-outlined{font-size:24px;color:#fff}' +
        '.tut-head-meta{flex:1;min-width:0}' +
        '.tut-kicker{font-size:9px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;' +
        'color:rgba(233,213,255,.9);margin-bottom:2px}' +
        '.tut-counter{font-size:12px;font-weight:800;color:#fff;letter-spacing:.3px}' +
        '.tut-try{display:inline-flex;align-items:center;gap:3px;background:rgba(255,255,255,.22);' +
        'border:1px solid rgba(255,255,255,.4);color:#fff;padding:3px 9px;border-radius:99px;' +
        'font-size:9.5px;font-weight:800;letter-spacing:.5px;animation:tutBlink 1.4s ease infinite;flex-shrink:0}' +
        '.tut-try .material-symbols-outlined{font-size:13px}' +
        '@keyframes tutBlink{50%{opacity:.6}}' +

        /* ---------- shimmer progress ---------- */
        '.tut-progress{height:6px;background:#ede4f9;border-radius:99px;overflow:hidden}' +
        '.tut-progress-fill{height:100%;border-radius:99px;' +
        'background:linear-gradient(90deg,#7c3aed,#a855f7,#c084fc);background-size:200% 100%;' +
        'animation:tutGrad 2.4s linear infinite;transition:width .45s cubic-bezier(.4,0,.2,1);position:relative}' +
        '.tut-progress-fill::after{content:"";position:absolute;inset:0;' +
        'background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);' +
        'animation:tutSheen 1.8s ease infinite}' +
        '@keyframes tutGrad{0%{background-position:0% 0}100%{background-position:200% 0}}' +
        '@keyframes tutSheen{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}' +

        /* ---------- content ---------- */
        '.tut-content{padding:14px 18px 4px}' +
        '.tut-title{font-size:17px;font-weight:800;color:#2a1245;margin-bottom:7px;line-height:1.3}' +
        '.tut-body{font-size:13px;line-height:1.6;color:#554470;margin-bottom:12px}' +
        '.tut-body b{color:#6d28d9}' +

        /* ---------- step dots ---------- */
        '.tut-dots{display:flex;gap:5px;justify-content:center;padding:2px 18px 10px}' +
        '.tut-dot{width:7px;height:7px;border-radius:99px;border:none;background:#ddd0f2;' +
        'cursor:default;transition:all .3s ease;padding:0}' +
        '.tut-dot.done{background:#a855f7;cursor:pointer}' +
        '.tut-dot.done:hover{background:#7c3aed}' +
        '.tut-dot.active{width:22px;background:linear-gradient(90deg,#7c3aed,#c084fc);' +
        'box-shadow:0 0 8px rgba(168,85,247,.5)}' +

        /* ---------- buttons ---------- */
        '.tut-btns{display:flex;gap:8px;justify-content:flex-end;padding:6px 18px 16px}' +
        '.tut-btn{padding:9px 15px;border-radius:11px;font-size:12.5px;font-weight:800;cursor:pointer;' +
        'border:1.5px solid transparent;transition:all .18s ease;' +
        'display:inline-flex;align-items:center;gap:5px}' +
        '.tut-btn .material-symbols-outlined{font-size:15px}' +
        '.tut-btn.ghost{background:#f4eefb;color:#6b5590}' +
        '.tut-btn.ghost:hover{background:#e9def7;color:#4c1d95}' +
        '.tut-btn.primary{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;' +
        'box-shadow:0 5px 16px rgba(124,58,237,.4)}' +
        '.tut-btn.primary:hover{transform:translateY(-1px);' +
        'box-shadow:0 8px 22px rgba(124,58,237,.5);' +
        'background:linear-gradient(135deg,#6d28d9,#9333ea)}' +

        /* ---------- floating help button ---------- */
        '#tut-help{position:fixed;right:20px;bottom:20px;z-index:29000;width:54px;height:54px;' +
        'border-radius:50%;border:none;background:linear-gradient(135deg,#7c3aed,#c084fc);color:#fff;' +
        'cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.5);display:flex;align-items:center;' +
        'justify-content:center;animation:tutHelpPulse 2.4s ease infinite;transition:transform .18s ease}' +
        '#tut-help:hover{transform:scale(1.12) rotate(8deg)}' +
        '#tut-help .material-symbols-outlined{font-size:28px}' +
        '@keyframes tutHelpPulse{0%{box-shadow:0 8px 24px rgba(124,58,237,.5),0 0 0 0 rgba(168,85,247,.45)}' +
        '70%{box-shadow:0 8px 24px rgba(124,58,237,.5),0 0 0 16px rgba(168,85,247,0)}' +
        '100%{box-shadow:0 8px 24px rgba(124,58,237,.5),0 0 0 0 rgba(168,85,247,0)}}' +

        /* ---------- demo badge ---------- */
        '#tut-demo-badge{position:fixed;top:14px;left:50%;transform:translate(-50%,-70px);z-index:29001;' +
        'display:flex;align-items:center;gap:7px;background:linear-gradient(120deg,#2e1065,#4c1d95);' +
        'color:#e9d8fa;font-size:12px;font-weight:800;padding:9px 15px;border-radius:999px;' +
        'border:1px solid #a855f7;box-shadow:0 8px 26px rgba(46,16,101,.5);' +
        'transition:transform .4s cubic-bezier(.34,1.56,.64,1)}' +
        '#tut-demo-badge.show{transform:translate(-50%,0)}' +
        '#tut-demo-badge .material-symbols-outlined{font-size:17px;color:#d8b4fe}' +
        '#tut-demo-badge button{background:#a855f7;color:#fff;border:none;border-radius:99px;' +
        'padding:3px 12px;font-size:11px;font-weight:800;cursor:pointer;margin-left:5px;transition:background .15s}' +
        '#tut-demo-badge button:hover{background:#7c3aed}' +

        /* ---------- mini toast ---------- */
        '#tut-mini-toast{position:fixed;left:50%;bottom:88px;transform:translate(-50%,70px);z-index:30001;' +
        'background:linear-gradient(120deg,#2e1065,#4c1d95);color:#fff;font-size:13px;font-weight:600;' +
        'padding:13px 19px;border-radius:14px;box-shadow:0 10px 34px rgba(46,16,101,.5);opacity:0;' +
        'transition:all .35s ease;pointer-events:none;max-width:92vw;border:1px solid #a855f7}' +
        '#tut-mini-toast.show{transform:translate(-50%,0);opacity:1}' +
        '@media (max-width:640px){.tut-content{padding:12px 14px 2px}.tut-title{font-size:15.5px}' +
        '.tut-body{font-size:12.5px}.tut-btns{padding:4px 14px 13px}.tut-dots{padding:2px 14px 8px}' +
        '#tut-demo-badge{font-size:10.5px;padding:7px 11px}}' +
        '@media print{#tut-help,#tut-demo-badge{display:none}}';
    document.head.appendChild(st);
})();

    console.info('%c[Tutorial] ready — Demo Mode + interactive tour loaded',
        'color:#a855f7;font-weight:bold');
})();

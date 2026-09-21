/* ============================================================
   EMERGENCY MITRA - AI PRELIMINARY TRIAGE v2 (js/ai-triage.js)
   ============================================================
   TAB 1 of the upgraded "AI Preliminary Triage" experience:

     - 45+ symptoms in 7 body-system groups (fever, cough,
       headache, vomiting, breathing, bites, urinary ...)
     - "Other symptom?" free-text box with live multilingual
       autocomplete (English / हिंदी / मराठी keywords)
     - Duration + severity modifiers
     - On-device scoring -> CRITICAL / URGENT / STABLE using the
       same 70/35 bands the Command Center already understands
     - Possible-cause inference + red-flag banner + first-aid tips
     - CRITICAL/URGENT -> "Report to Hospital" (files a case into
       the Command Center through the portal bridge) + Call 108

   LOAD ORDER: after js/network-cards.js (replaces Network.aiOpen
   non-destructively; original stays intact as fallback).
   The chatbot half lives in js/mitra-chat.js.
   ============================================================ */

(function () {
    'use strict';

    /* ============================================================
       SYMPTOM DATABASE — 7 body groups, trilingual labels
       w = triage weight, red = emergency red flag
       ============================================================ */
    var GROUPS = [
        {
            id: 'general', label: 'General & Fever', hi: 'सामान्य और बुखार', mr: 'सामान्य व ताप', icon: 'thermostat',
            symptoms: [
                { id: 'fever', icon: '🌡️', w: 14, label: 'Fever', hi: 'बुखार', mr: 'ताप' },
                { id: 'chills', icon: '🥶', w: 8, label: 'Chills / shivering', hi: 'ठंड लगना', mr: 'थंड लागणे' },
                { id: 'bodyAche', icon: '💪', w: 12, label: 'Body ache', hi: 'बदन दर्द', mr: 'शरीर दुखणे' },
                { id: 'fatigue', icon: '🥱', w: 6, label: 'Weakness / fatigue', hi: 'कमजोरी / थकान', mr: 'अशक्तपणा' },
                { id: 'appetite', icon: '🍽️', w: 4, label: 'Loss of appetite', hi: 'भूख न लगना', mr: 'भूक न लागणे' },
                { id: 'sweat', icon: '💦', w: 6, label: 'Night sweats', hi: 'रात में पसीना', mr: 'रात्री घाम' },
                { id: 'dehydration', icon: '🚱', w: 12, label: 'Dehydration / dry mouth', hi: 'पानी की कमी', mr: 'पाण्याची कमतरता' },
                { id: 'weightLoss', icon: '⚖️', w: 14, label: 'Unexplained weight loss', hi: 'वजन घटना (अनजाने में)', mr: 'वजन कमी (अस्पष्ट)' }
            ]
        },
        {
            id: 'head', label: 'Head & Mind', hi: 'सिर और मस्तिष्क', mr: 'डोके व मन', icon: 'psychology',
            symptoms: [
                { id: 'headache', icon: '🤕', w: 12, label: 'Headache', hi: 'सिरदर्द', mr: 'डोकेदुखी' },
                { id: 'dizzy', icon: '💫', w: 12, label: 'Dizziness', hi: 'चक्कर आना', mr: 'चक्कर येणे' },
                { id: 'vision', icon: '👁️', w: 14, label: 'Blurred vision', hi: 'धुंधला दिखना', mr: 'धुंदल दिसणे' },
                { id: 'confusion', icon: '🌫️', w: 28, red: true, label: 'Confusion / disoriented', hi: 'भ्रम / बौखलाहट', mr: 'गोंधळ' },
                { id: 'faint', icon: '😴', w: 30, red: true, label: 'Fainting / unconscious', hi: 'बेहोश होना', mr: 'बेशी होणे' },
                { id: 'seizure', icon: '⚡', w: 38, red: true, label: 'Seizure / fits', hi: 'दौरे / मिर्गी', mr: 'झटके / मिरगी' },
                { id: 'stiffNeck', icon: '🧍', w: 25, red: true, label: 'Stiff neck (with fever)', hi: 'गर्दन अकड़ना', mr: 'मान ताठ होणे' }
            ]
        },
        {
            id: 'chest', label: 'Chest & Breathing', hi: 'छाती और सांस', mr: 'छाती व श्वास', icon: 'airwave',
            symptoms: [
                { id: 'chestPain', icon: '❤️', w: 40, red: true, label: 'Chest pain / pressure', hi: 'सीने में दर्द', mr: 'छातीत दुखणे' },
                { id: 'breathless', icon: '😮‍💨', w: 35, red: true, label: 'Difficulty breathing', hi: 'सांस लेने में तकलीफ', mr: 'श्वासास त्रास' },
                { id: 'coughDry', icon: '😷', w: 8, label: 'Dry cough', hi: 'सूखी खांसी', mr: 'कोरडा खोकला' },
                { id: 'coughPhlegm', icon: '🫙', w: 10, label: 'Cough with phlegm', hi: 'बलगम वाली खांसी', mr: 'खोकल्यात कफ' },
                { id: 'coughBlood', icon: '🩸', w: 38, red: true, label: 'Coughing up blood', hi: 'खांसी में खून', mr: 'खोकल्यात रक्त' },
                { id: 'wheeze', icon: '🎵', w: 15, label: 'Wheezing', hi: 'सांस में सीटी', mr: 'श्वासात आवाज' },
                { id: 'palpitations', icon: '💓', w: 18, label: 'Heart pounding', hi: 'धड़कन तेज़', mr: 'हृदयगती वेगवान' },
                { id: 'legsWelling', icon: '🦵', w: 14, label: 'Leg / ankle swelling', hi: 'पैरों में सूजन', mr: 'पायांमध्ये सूज' }
            ]
        },
        {
            id: 'stomach', label: 'Stomach & Digestion', hi: 'पेट और पाचन', mr: 'पोट व पचन', icon: 'restaurant',
            symptoms: [
                { id: 'vomit', icon: '🤮', w: 14, label: 'Vomiting', hi: 'उल्टी', mr: 'उलटी' },
                { id: 'nausea', icon: '😣', w: 8, label: 'Nausea', hi: 'जी मिचलाना', mr: 'ओढी येणे' },
                { id: 'diarrhea', icon: '🚽', w: 12, label: 'Diarrhea / loose motions', hi: 'दस्त', mr: 'अतिसार' },
                { id: 'abdPain', icon: '🎯', w: 14, label: 'Abdominal pain', hi: 'पेट दर्द', mr: 'पोटदुखी' },
                { id: 'vomitBlood', icon: '🩸', w: 38, red: true, label: 'Blood in vomit / stool', hi: 'उल्टी/मल में खून', mr: 'उलटी/मलमध्ये रक्त' },
                { id: 'swallow', icon: '⬇️', w: 10, label: 'Difficulty swallowing', hi: 'निगलने में दिक्कत', mr: 'गिळण्यास त्रास' },
                { id: 'jaundice', icon: '🟡', w: 16, label: 'Yellow eyes / skin', hi: 'पीलिया', mr: 'पिवळसरपणा' },
                { id: 'constipation', icon: '⏸️', w: 8, label: 'Constipation', hi: 'कब्ज', mr: 'बद्धकोष्ठता' }
            ]
        },
        {
            id: 'throat', label: 'Throat, Ear & Nose', hi: 'गला, कान और नाक', mr: 'घसा, कान व नाक', icon: 'hearing',
            symptoms: [
                { id: 'soreThroat', icon: '🗣️', w: 6, label: 'Sore throat', hi: 'गले में दर्द', mr: 'घसाखोक' },
                { id: 'runnyNose', icon: '🤧', w: 5, label: 'Runny nose / cold', hi: 'जुकाम / सर्दी', mr: 'सर्दी' },
                { id: 'earPain', icon: '👂', w: 7, label: 'Ear pain', hi: 'कान दर्द', mr: 'कानदुखी' },
                { id: 'toothache', icon: '🦷', w: 5, label: 'Toothache', hi: 'दांत दर्द', mr: 'दातदुखी' }
            ]
        },
        {
            id: 'skin', label: 'Skin & Injury', hi: 'त्वचा और चोट', mr: 'त्वचा व इजा', icon: 'healing',
            symptoms: [
                { id: 'rash', icon: '🔴', w: 8, label: 'Rash / red spots', hi: 'दाने / रैश', mr: 'ताकं' },
                { id: 'itch', icon: '🪶', w: 5, label: 'Itching', hi: 'खुजली', mr: 'खाजसुखी' },
                { id: 'swell', icon: '🎈', w: 12, label: 'Swelling (localized)', hi: 'सूजन', mr: 'सूज' },
                { id: 'bleed', icon: '🩸', w: 40, red: true, label: 'Uncontrolled bleeding', hi: 'बहता खून', mr: 'रक्तस्राव' },
                { id: 'burn', icon: '🔥', w: 25, label: 'Burn injury', hi: 'जलने का घाव', mr: 'उकळणे' },
                { id: 'fracture', icon: '🦴', w: 18, label: 'Suspected fracture', hi: 'हड्डी टूटने का शक', mr: 'हाडतोडीचा संशय' },
                { id: 'bite', icon: '🐍', w: 42, red: true, label: 'Snake / scorpion bite', hi: 'सांप / बिच्छू काटना', mr: 'साप / विंचूचा वार' },
                { id: 'noseBleed', icon: '👃', w: 16, label: 'Nosebleed', hi: 'नाक से खून', mr: 'नाकातून रक्त' },
                { id: 'infectedWound', icon: '🧫', w: 14, label: 'Infected wound / pus', hi: 'संक्रमित घाव / मवाद', mr: 'संसर्गजन्य जखम / पू' }
            ]
        },
        {
            id: 'urine', label: 'Urinary', hi: 'मूत्र', mr: 'मूत्र', icon: 'water_drop',
            symptoms: [
                { id: 'urineBurn', icon: '🔥', w: 10, label: 'Burning urination', hi: 'पेशाब में जलन', mr: 'लघवीस जळजळ' },
                { id: 'urineBlood', icon: '🩸', w: 22, red: true, label: 'Blood in urine', hi: 'पेशाब में खून', mr: 'लघवीत रक्त' }
            ]
        }
    ];

    var ALL_SYMPTOMS = (function () {
        var out = [];
        GROUPS.forEach(function (g) { g.symptoms.forEach(function (s) { s.group = g.id; out.push(s); }); });
        return out;
    })();

    /* ============================================================
       FREE-TEXT MATCHER — "type any other symptom"
       keyword map: EN + Hinglish + Devanagari -> symptom id
       ============================================================ */
    var TEXT_MAP = [
        ['fever', ['fever', 'bukhar', 'bukhaar', 'बुखार', 'ताप']],
        ['headache', ['headache', 'sir dard', 'sirdard', 'सिरदर्द', 'डोकेदुखी', 'सिर दर्द']],
        ['coughDry', ['dry cough', 'khansi', 'khaansi', 'खांसी', 'खोकला', 'cough']],
        ['coughPhlegm', ['balgam', 'phlegm', 'बलगम', 'कफ']],
        ['coughBlood', ['blood in cough', 'khansi me khoon', 'खांसी में खून']],
        ['vomit', ['vomit', 'ulti', 'उल्टी']],
        ['nausea', ['nausea', 'michla', 'मिचलाना', 'ओढी']],
        ['diarrhea', ['diarrhea', 'loose motion', 'loosemotion', 'dast', 'दस्त', 'अतिसार', 'पतले']],
        ['abdPain', ['stomach', 'pet dard', 'pet', 'पेट', 'पोटदुखी']],
        ['vomitBlood', ['blood in vomit', 'ulti me khoon', 'खून की उल्टी']],
        ['chestPain', ['chest pain', 'seene dard', 'seene me dard', 'सीने में दर्द', 'छाती', 'heart attack', 'dil ka daura', 'दिल']],
        ['breathless', ['breathless', 'saans', 'dam', 'सांस', 'दम', 'श्वास']],
        ['bleed', ['bleeding', 'khoon beh', 'blood coming', 'खून बह', 'रक्तस्राव']],
        ['burn', ['burn', 'jala', 'जला', 'उकळ']],
        ['fracture', ['fracture', 'haddi', 'हड्डी', 'हाडतोड']],
        ['bite', ['snake', 'saanp', 'sanp', 'saap', 'सांप', 'साप', 'विंचू', 'scorpion', 'bite']],
        ['dizzy', ['dizzy', 'chakkar', 'चक्कर']],
        ['seizure', ['seizure', 'fit', 'mirgi', 'daura', 'दौरा', 'दौरे', 'मिर्गी', 'झटके']],
        ['faint', ['faint', 'behosh', 'unconscious', 'बेहोश', 'बेशी', 'मूर्छा']],
        ['confusion', ['confusion', 'confuse', 'भ्रम', 'गोंधळ']],
        ['rash', ['rash', 'dane', 'chakatte', 'दाने', 'रैश', 'ताकं']],
        ['itch', ['itch', 'khujli', 'खुजली', 'खाज']],
        ['swell', ['swelling', 'sujan', 'सूजन', 'सूज']],
        ['soreThroat', ['throat', 'gala', 'गला', 'घसा']],
        ['runnyNose', ['runny nose', 'zukam', 'sardi', 'जुकाम', 'सर्दी']],
        ['earPain', ['ear', 'kaan', 'कान']],
        ['toothache', ['tooth', 'daant', 'daat', 'दांत', 'दात']],
        ['jaundice', ['jaundice', 'piliya', 'पीलिया', 'कामळा']],
        ['urineBurn', ['urine burn', 'peshab', 'लघवी', 'पेशाब', 'जलन']],
        ['urineBlood', ['blood in urine', 'peshab me khoon', 'लघवीत रक्त']],
        ['bodyAche', ['body ache', 'badan dard', 'बदन दर्द', 'शरीर दुख']],
        ['fatigue', ['weakness', 'kamzori', 'thakan', 'कमजोरी', 'थकान']],
        ['chills', ['chill', 'shiver', 'ठंड लग', 'कंपकंपी']],
        ['sweat', ['sweat', 'pasina', 'पसीना', 'घाम']],
        ['appetite', ['appetite', 'bhook', 'भूख', 'भूक']],
        ['dehydration', ['dehydration', 'pyaas', 'प्यास']],
        ['vision', ['vision', 'blurred', 'aankh', 'najjar', 'आंख', 'नजर', 'डोळे']],
        ['swallow', ['swallow', 'nigal', 'निगल', 'गिळ']],
        ['wheeze', ['wheeze', 'सांस में सीटी']],
        ['palpitations', ['palpitation', 'dhadkan', 'धड़कन', 'हृदयगती']],
        ['stiffNeck', ['neck', 'gardan', 'garda', 'गर्दन', 'मान']],
        ['weightLoss', ['weight loss', 'vajan kam', 'वजन घट', 'वजन कमी']],
        ['legsWelling', ['leg swelling', 'pair sujan', 'पैरों में सूजन', 'पायांमध्ये सूज']],
        ['constipation', ['constipation', 'kabz', 'कब्ज', 'बद्धकोष्ठ']],
        ['noseBleed', ['nosebleed', 'nak se khoon', 'नाक से खून', 'नाकातून रक्त']],
        ['infectedWound', ['wound', 'pus', 'ghav', 'मवाद', 'घाव', 'जखम']]
    ].map(function (row) { return { id: row[0], tokens: row[1] }; });

    function normalize(text) {
        return (' ' + String(text || '').toLowerCase().trim() + ' ').replace(/\s+/g, ' ');
    }

    /** Free text -> symptom id (first best match) or null. */
    function matchText(text) {
        var t = normalize(text);
        if (t.trim().length < 3) return null;
        for (var i = 0; i < TEXT_MAP.length; i++) {
            var row = TEXT_MAP[i];
            for (var j = 0; j < row.tokens.length; j++) {
                var tok = ' ' + row.tokens[j];
                if (t.indexOf(tok) >= 0) return row.id;
            }
        }
        return null;
    }

    /** Live autocomplete suggestions (max 6 ids). */
    function suggest(text) {
        var t = normalize(text).trim();
        if (t.length < 2) return [];
        var out = [];
        ALL_SYMPTOMS.forEach(function (s) {
            if (out.length >= 6) return;
            var hay = [s.label, s.hi, s.mr].join(' ').toLowerCase();
            if (hay.indexOf(t) >= 0) out.push(s.id);
        });
        if (out.length < 6) {
            TEXT_MAP.forEach(function (row) {
                if (out.length >= 6) return;
                row.tokens.forEach(function (tok) {
                    if (out.length < 6 && tok.indexOf(t) >= 0 && out.indexOf(row.id) < 0) out.push(row.id);
                });
            });
        }
        return out;
    }

    /* ============================================================
       CONDITION INFERENCE — co-occurrence rules (on-device)
       ============================================================ */
    var CONDITIONS = [
        { id: 'cardiac', requires: ['chestPain', 'breathless', 'palpitations'], min: 1, label: 'Cardiac emergency (heart attack / angina)', hi: 'हृदय आपातकाल (हार्ट अटैक की आशंका)', mr: 'हृदयाचा झटका' },
        { id: 'snake', requires: ['bite'], min: 1, label: 'Snake / scorpion envenomation — antivenom needed', hi: 'सांप / बिच्छू विष — एंटी-व्हेनम जरूरी', mr: 'साप / विंचू विषबाधा' },
        { id: 'bleeding', requires: ['bleed'], min: 1, label: 'Hemorrhagic emergency — hospital now', hi: 'गंभीर रक्तस्राव — तुरंत अस्पताल', mr: 'तीव्र रक्तस्राव' },
        { id: 'heatstroke', requires: ['fever', 'dehydration', 'confusion'], min: 2, label: 'Heat stroke', hi: 'लू / हीट स्ट्रोक', mr: 'उन्हाचा झटका' },
        { id: 'dengue', requires: ['fever', 'headache', 'bodyAche'], min: 2, label: 'Dengue / viral fever — platelet check advised', hi: 'डेंगू / वायरल बुखार — प्लेटलेट जांच', mr: 'डेंग्यू / व्हायरल ताप' },
        { id: 'respiratory', requires: ['fever', 'coughDry', 'coughPhlegm', 'soreThroat', 'runnyNose'], min: 2, label: 'Respiratory tract infection', hi: 'श्वसन तंत्र का संक्रमण', mr: 'श्वसनसंस्थेचा संसर्ग' },
        { id: 'gastro', requires: ['vomit', 'diarrhea', 'abdPain'], min: 2, label: 'Gastroenteritis / food poisoning — ORS critical', hi: 'गैस्ट्रो / फूड पॉइज़निंग — ORS लें', mr: 'जठरांत्रशोथ / अन्नविषबाधा' },
        { id: 'neuro', requires: ['headache', 'vision', 'dizzy'], min: 2, label: 'Migraine / neurological issue', hi: 'माइग्रेन / तंत्रिका संबंधी समस्या', mr: 'मायग्रेन / मज्जासंबंधी समस्या' },
        { id: 'uti', requires: ['urineBurn', 'fever'], min: 1, label: 'Urinary tract infection', hi: 'मूत्र संक्रमण (UTI)', mr: 'मूत्रमार्ग संसर्ग' },
        { id: 'seizureDx', requires: ['seizure'], min: 1, label: 'Seizure disorder — protect from injury', hi: 'मिर्गी का दौरा', mr: 'मिरगीचा झटका' }
    ];

    /* ============================================================
       CORE ENGINE (pure — node-testable)
       ============================================================ */
    var DURATION_BONUS = { today: 0, days13: 3, week: 8, chronic: 12 };
    var SEVERITY_MULT = { mild: 0.8, moderate: 1.0, severe: 1.25 };

    function analyze(state) {
        var picked = (state && state.picked) || {};
        var score = 0, redFlags = [], names = [];

        ALL_SYMPTOMS.forEach(function (s) {
            if (picked[s.id]) {
                score += s.w;
                names.push(s);
                if (s.red) redFlags.push(s);
            }
        });
        ((state && state.custom) || []).forEach(function (c) { score += (c.w || 8); });

        score *= (SEVERITY_MULT[(state && state.severity)] || 1);
        score += (DURATION_BONUS[(state && state.duration)] || 0);
        score = Math.max(0, Math.min(100, Math.round(score)));
        if (redFlags.length) score = Math.max(score, 72);   // any red flag => CRITICAL band

        var priority = score >= 70 ? 'CRITICAL' : (score >= 35 ? 'URGENT' : 'STABLE');
        if (redFlags.length) priority = 'CRITICAL';

        var conditions = CONDITIONS.filter(function (c) {
            var hits = c.requires.filter(function (id) { return picked[id]; }).length;
            return hits >= c.min;
        }).sort(function (a, b) {
            return b.requires.filter(function (id) { return picked[id]; }).length -
                   a.requires.filter(function (id) { return picked[id]; }).length;
        }).slice(0, 3);

        return { score: score, priority: priority, redFlags: redFlags, conditions: conditions, names: names };
    }

    /* ============================================================
       STATE + UI STRINGS
       ============================================================ */
    var S = {
        /* follow the globally selected language from the very first
           render (translations.js boots before this module loads) */
        lang: (window.currentLang === 'hi' || window.currentLang === 'mr') ? window.currentLang : 'en',
        tab: 'checker',
        picked: {},        // { symptomId: true }
        custom: [],        // [{ label, w }]
        severity: 'moderate',
        duration: 'today'
    };
    /* live follow: translations.js re-renders us on every switch */
    window.addEventListener('em:language-changed', function (e) {
        var l = (e && e.detail && e.detail.lang) || window.currentLang || 'en';
        if (l !== 'en' && l !== 'hi' && l !== 'mr') l = 'en';
        if (S.lang !== l) { S.lang = l; renderChecker(); }
    });

    var UI_STR = {
        checker: { en: 'Symptom Checker', hi: 'लक्षण जांच', mr: 'लक्षण तपासणी' },
        chat: { en: 'Ask Mitra AI', hi: 'मित्र AI से पूछें', mr: 'मित्र AI ला विचारा' },
        other: { en: 'Other symptom? Type here…', hi: 'कोई और लक्षण? यहाँ लिखें…', mr: 'दुसरे लक्षण? इथे लिहा…' },
        severity: { en: 'Severity', hi: 'गंभीरता', mr: 'तीव्रता' },
        duration: { en: 'Since how long?', hi: 'कितने समय से?', mr: 'किती दिवसांपासून?' },
        mild: { en: 'Mild', hi: 'हल्का', mr: 'सौम्य' },
        moderate: { en: 'Moderate', hi: 'मध्यम', mr: 'मध्यम' },
        severe: { en: 'Severe', hi: 'गंभीर', mr: 'तीव्र' },
        today: { en: 'Today', hi: 'आज से', mr: 'आजपासून' },
        days13: { en: '1–3 days', hi: '1–3 दिन', mr: '1–3 दिवस' },
        week: { en: '4–7 days', hi: '4–7 दिन', mr: '4–7 दिवस' },
        chronic: { en: 'Over a week', hi: 'एक हफ्ते से अधिक', mr: 'एका आठवड्याहून जास्त' },
        reset: { en: 'Reset', hi: 'रीसेट', mr: 'रीसेट' },
        report: { en: 'Report to Hospital', hi: 'अस्पताल को रिपोर्ट करें', mr: 'रुग्णालयाला कळवा' },
        call108: { en: 'Call 108', hi: '108 कॉल करें', mr: '108 कॉल करा' },
        file: { en: 'File case to Command Center', hi: 'कमांड सेंटर में दर्ज करें', mr: 'कमांड सेंटरमध्ये नोंदवा' },
        selected: { en: 'selected', hi: 'चुने गए', mr: 'निवडलेली' },
        possible: { en: 'Possible causes', hi: 'संभावित कारण', mr: 'शक्य कारणे' },
        advice: { en: 'What to do now', hi: 'अब क्या करें', mr: 'आता काय करावे' },
        typed: { en: 'Your typed symptoms', hi: 'आपके लिखे लक्षण', mr: 'तुम्ही लिहिलेली लक्षणे' }
    };
    function str(key) { return (UI_STR[key] && UI_STR[key][S.lang]) || (UI_STR[key] && UI_STR[key].en) || key; }

    /* ============================================================
       STYLES (feature-scoped, injected once)
       ============================================================ */
    (function injectStyles() {
        var st = document.createElement('style');
        st.textContent =
            '.at-tab{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;font-size:13px;font-weight:700;' +
            'color:#5b6f66;border-bottom:3px solid transparent;margin-bottom:-1px;cursor:pointer;background:none;' +
            'border-top:none;border-left:none;border-right:none}' +
            '.at-tab.active{color:#00453d;border-bottom-color:#00453d}' +
            '.at-tab .material-symbols-outlined{font-size:18px}' +
            '.at-group-title{font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#5b6f66;' +
            'margin:14px 0 8px;display:flex;align-items:center;gap:6px}' +
            '.at-chip{display:inline-flex;align-items:center;gap:6px;border:1.5px solid #cfd8d5;background:#fff;color:#37493f;' +
            'border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s ease;margin:0 6px 8px 0}' +
            '.at-chip:hover{border-color:#00453d;transform:translateY(-1px)}' +
            '.at-chip.on{background:#00453d;border-color:#00453d;color:#fff}' +
            '.at-chip.at-red{border-color:#f3c1c1;background:#fef5f5}' +
            '.at-chip.at-red.on{background:#ba1a1a;border-color:#ba1a1a;color:#fff}' +
            '.at-sel{width:100%;padding:10px 12px;border:1.5px solid #cfd8d5;border-radius:10px;background:#fff;font-size:13px;font-weight:600;outline:none}' +
            '.at-sel:focus{border-color:#00453d}' +
            '.at-input{width:100%;padding:11px 46px 11px 14px;border:1.5px solid #cfd8d5;border-radius:12px;background:#fff;font-size:13.5px;outline:none}' +
            '.at-input:focus{border-color:#00453d;box-shadow:0 0 0 3px rgba(0,69,61,.08)}' +
            '.at-suggest{position:relative}' +
            '.at-suggest-box{position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1.5px solid #d9e5e0;' +
            'border-radius:12px;box-shadow:0 14px 34px rgba(16,32,26,.14);z-index:30;overflow:hidden}' +
            '.at-suggest-item{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:13px;font-weight:600;color:#37493f;cursor:pointer}' +
            '.at-suggest-item:hover{background:#f0f7f5}' +
            '.at-crit-banner{display:flex;align-items:flex-start;gap:10px;background:#fdecec;border:2px solid #ba1a1a;' +
            'border-radius:14px;padding:12px 14px;margin-top:12px}' +
            '.at-res-score{display:flex;align-items:center;gap:12px;background:#fafcfa;border:2px solid #d9e5e0;' +
            'border-radius:14px;padding:14px;margin-top:14px}' +
            '.at-cond{background:#f0f7f5;border:1.5px solid #cfe3dc;border-radius:12px;padding:9px 12px;font-size:12.5px;' +
            'font-weight:600;color:#14524a;margin-top:8px;display:flex;gap:8px;align-items:flex-start}' +
            '.at-cta{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}' +
            '.at-cta button{flex:1;min-width:170px;min-height:50px;border:none;border-radius:12px;font-weight:800;font-size:13.5px;' +
            'cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .15s ease,box-shadow .15s ease}' +
            '.at-cta button:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.16)}' +
            '.at-badge{font-size:9.5px;font-weight:800;letter-spacing:.5px;background:#e6f2ee;color:#14524a;padding:3px 8px;' +
            'border-radius:999px;display:inline-flex;align-items:center;gap:4px}' +
            '.at-redline{color:#ba1a1a;font-weight:800;font-size:12.5px;display:flex;align-items:center;gap:6px;margin-top:10px}';
        document.head.appendChild(st);
    })();

    /* ============================================================
       HELPERS
       ============================================================ */
    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g,
            function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }
    function toast(msg, icon) {
        if (typeof window.showToast === 'function') { window.showToast(msg, icon || 'info'); return; }
        console.log('[MitraTriage] ' + msg);
    }
    function symptomLabel(s) {
        if (S.lang === 'hi') return s.hi || s.label;
        if (S.lang === 'mr') return s.mr || s.label;
        return s.label;
    }
    function priorityMeta(p) {
        return p === 'CRITICAL' ? { color: '#ba1a1a', icon: 'emergency' } :
            p === 'URGENT' ? { color: '#d97706', icon: 'warning' } :
                { color: '#16a34a', icon: 'check_circle' };
    }

    /* ============================================================
       CHECKER RENDER
       ============================================================ */
    function renderChecker() {
        var host = $('at-panel-checker');
        if (!host) return;
        var R = analyze(S);
        var meta = priorityMeta(R.priority);
        var html = '';

        /* free-text box + live suggestions */
        html += '<div class="at-suggest" style="margin-bottom:6px;">' +
            '<input id="at-free-text" class="at-input" autocomplete="off" placeholder="' + esc(str('other')) + '"' +
            ' oninput="MitraTriage.onType(this.value)" onkeydown="MitraTriage.freeKey(event)">' +
            '<button type="button" title="Add" onclick="MitraTriage.addFree()" ' +
            'style="position:absolute;right:6px;top:50%;transform:translateY(-50%);width:32px;height:32px;border:none;' +
            'border-radius:9px;background:#00453d;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
            '<span class="material-symbols-outlined" style="font-size:18px">add</span></button>' +
            '<div id="at-suggest-box"></div></div>';

        /* symptom groups */
        GROUPS.forEach(function (g) {
            html += '<div class="at-group-title"><span class="material-symbols-outlined" style="font-size:15px;color:#00453d">' +
                g.icon + '</span>' + esc(S.lang === 'hi' ? (g.hi || g.label) : S.lang === 'mr' ? (g.mr || g.label) : g.label) + '</div><div>';
            g.symptoms.forEach(function (s) {
                var on = !!S.picked[s.id];
                html += '<button type="button" class="at-chip' + (on ? ' on' : '') + (s.red ? ' at-red' : '') +
                    '" onclick="MitraTriage.toggle(\'' + s.id + '\')">' +
                    '<span>' + s.icon + '</span>' + esc(symptomLabel(s)) + (s.red ? ' ⚠' : '') + (on ? ' ✓' : '') + '</button>';
            });
            html += '</div>';
        });

        /* custom typed chips */
        if (S.custom.length) {
            html += '<div class="at-group-title"><span class="material-symbols-outlined" style="font-size:15px;color:#00453d">edit_note</span>' +
                esc(str('typed')) + '</div><div>';
            S.custom.forEach(function (c, i) {
                html += '<button type="button" class="at-chip on" onclick="MitraTriage.removeCustom(' + i + ')">📝 ' +
                    esc(c.label) + ' ✕</button>';
            });
            html += '</div>';
        }

        /* severity + duration */
        html += '<div class="grid grid-cols-2 gap-3" style="margin-top:16px;">' +
            '<div><label class="block text-[10px] font-extrabold uppercase text-on-surface-variant mb-1">' + esc(str('severity')) + '</label>' +
            '<select class="at-sel" onchange="MitraTriage.setSeverity(this.value)">' +
            ['mild', 'moderate', 'severe'].map(function (v) {
                return '<option value="' + v + '"' + (S.severity === v ? ' selected' : '') + '>' + esc(str(v)) + '</option>';
            }).join('') + '</select></div>' +
            '<div><label class="block text-[10px] font-extrabold uppercase text-on-surface-variant mb-1">' + esc(str('duration')) + '</label>' +
            '<select class="at-sel" onchange="MitraTriage.setDuration(this.value)">' +
            ['today', 'days13', 'week', 'chronic'].map(function (v) {
                return '<option value="' + v + '"' + (S.duration === v ? ' selected' : '') + '>' + esc(str(v)) + '</option>';
            }).join('') + '</select></div></div>';

        /* live analysis */
        var count = R.names.length + S.custom.length;
        if (count === 0) {
            html += '<div style="text-align:center;padding:26px 10px 10px;color:#5b6f66;font-size:13px;">' +
                '<span class="material-symbols-outlined" style="font-size:40px;color:#c4d2cc">touch_app</span>' +
                '<div style="margin-top:6px;font-weight:600">' +
                (S.lang === 'hi' ? 'लक्षण चुनें या लिखें — विश्लेषण तुरंत यहाँ दिखेगा।' :
                    S.lang === 'mr' ? 'लक्षणे निवडा किंवा लिहा — विश्लेषण लगेच येथे दिसेल.' :
                        'Tap symptoms or type one — the analysis appears here instantly.') + '</div></div>';
        } else {
            if (R.redFlags.length) {
                html += '<div class="at-crit-banner"><span class="material-symbols-outlined" style="color:#ba1a1a;font-size:26px">emergency</span>' +
                    '<div><div style="font-weight:800;color:#ba1a1a;font-size:13.5px">' +
                    (S.lang === 'hi' ? 'खतरनाक लक्षण मिले — तुरंत ध्यान दें!' :
                        S.lang === 'mr' ? 'धोक्याची लक्षणे आढळली — तत्काळ लक्ष द्या!' :
                            'Emergency red-flag symptom detected!') + '</div>' +
                    '<div style="font-size:12px;color:#7f1d1d;margin-top:2px">' +
                    esc(R.redFlags.map(symptomLabel).join(' • ')) + '</div></div></div>';
            }

            html += '<div class="at-res-score">' +
                '<div style="position:relative;width:64px;height:64px;flex-shrink:0">' +
                '<svg viewBox="0 0 36 36" style="width:64px;height:64px;transform:rotate(-90deg)">' +
                '<circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" stroke-width="4"></circle>' +
                '<circle cx="18" cy="18" r="15.5" fill="none" stroke="' + meta.color + '" stroke-width="4" ' +
                'stroke-dasharray="' + R.score + ' 100" stroke-linecap="round"></circle></svg>' +
                '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
                'font-weight:900;font-size:17px;color:' + meta.color + '">' + R.score + '</div></div>' +
                '<div style="flex:1"><div style="font-weight:900;font-size:16px;color:' + meta.color +
                ';display:flex;align-items:center;gap:6px">' +
                '<span class="material-symbols-outlined" style="font-size:19px">' + meta.icon + '</span>' + R.priority +
                (R.redFlags.length ? ' <span class="at-badge" style="background:#fdecec;color:#ba1a1a">RED FLAG</span>' : '') +
                '</div><div style="font-size:11.5px;color:#5b6f66;margin-top:2px">' + count + ' ' + esc(str('selected')) +
                ' • ' + esc(str(R.severity)) + ' • ' + esc(str(S.duration)) + '</div></div>' +
                '<button type="button" onclick="MitraTriage.reset()" style="align-self:flex-start;border:1.5px solid #cfd8d5;' +
                'background:#fff;border-radius:9px;padding:7px 12px;font-size:11.5px;font-weight:700;cursor:pointer;color:#5b6f66">' +
                esc(str('reset')) + '</button></div>';

            if (R.conditions.length) {
                html += '<div style="font-weight:800;font-size:12px;color:#00453d;margin-top:14px;display:flex;align-items:center;gap:6px">' +
                    '<span class="material-symbols-outlined" style="font-size:16px">medical_information</span>' + esc(str('possible')) + '</div>';
                R.conditions.forEach(function (c) {
                    var label = S.lang === 'hi' ? (c.hi || c.label) : S.lang === 'mr' ? (c.mr || c.label) : c.label;
                    html += '<div class="at-cond"><span class="material-symbols-outlined" style="font-size:17px;color:#14524a">medication</span>' +
                        '<span>' + esc(label) + '</span></div>';
                });
            }

            html += '<div style="font-weight:800;font-size:12px;color:#00453d;margin-top:14px;display:flex;align-items:center;gap:6px">' +
                '<span class="material-symbols-outlined" style="font-size:16px">tips_and_updates</span>' + esc(str('advice')) + '</div>' +
                '<ul style="margin:8px 0 0;padding-left:18px;font-size:12.5px;color:#37493f;line-height:1.7">' +
                adviceList(R).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';

            html += '<div class="at-cond" style="background:#fff;border-color:#00453d;margin-top:12px">' +
                '<span class="material-symbols-outlined" style="font-size:18px;color:#00453d">local_hospital</span>' +
                '<span><b>' + esc(facilityFor(R.priority)) + '</b></span></div>';

            if (S.duration === 'chronic') {
                html += '<div class="at-redline"><span class="material-symbols-outlined" style="font-size:16px">event_repeat</span>' +
                    (S.lang === 'hi' ? 'लक्षण एक हफ्ते से अधिक पुराने हैं — डॉक्टर से मुलाकात जरूरी है।' :
                        S.lang === 'mr' ? 'लक्षणे आठवड्याहून जास्त जुनी आहेत — डॉक्टरांना भेटा.' :
                            'Symptoms persist over a week — a doctor consultation is necessary.') + '</div>';
            }

            if (R.priority === 'CRITICAL') {
                html += '<div class="at-cta">' +
                    '<button type="button" onclick="MitraTriage.call108()" style="background:#ba1a1a;color:#fff">' +
                    '<span class="material-symbols-outlined">call</span>' + esc(str('call108')) + ' — Ambulance</button>' +
                    '<button type="button" onclick="MitraTriage.report()" style="background:#00453d;color:#fff">' +
                    '<span class="material-symbols-outlined">local_hospital</span>' + esc(str('report')) + '</button></div>';
            } else if (R.priority === 'URGENT') {
                html += '<div class="at-cta">' +
                    '<button type="button" onclick="MitraTriage.report()" style="background:#d97706;color:#fff">' +
                    '<span class="material-symbols-outlined">local_hospital</span>' + esc(str('report')) + '</button>' +
                    '<button type="button" onclick="MitraTriage.tab(\'chat\')" style="background:#fff;border:2px solid #00453d;color:#00453d">' +
                    '<span class="material-symbols-outlined">forum</span>' + esc(str('chat')) + '</button></div>';
            } else {
                html += '<div class="at-cta">' +
                    '<button type="button" onclick="MitraTriage.report()" style="background:#fff;border:2px solid #00453d;color:#00453d">' +
                    '<span class="material-symbols-outlined">save</span>' + esc(str('file')) + '</button></div>';
            }
        }

        host.innerHTML = html;
    }

    function facilityFor(priority) {
        if (priority === 'CRITICAL') return 'District Hospital Wardha — Emergency Department (go NOW / call 108)';
        if (priority === 'URGENT') return 'Nearest PHC or Sub-District Hospital within 24 hours';
        return 'PHC OPD within 2–3 days if symptoms persist';
    }

    function adviceList(R) {
        if (R.priority === 'CRITICAL') {
            return S.lang === 'hi' ? [
                '108 पर कॉल करें या तुरंत अस्पताल जाएं — समय जीवन बचाता है।',
                'मरीज को चलने-फिरने न दें, शांत रखें।',
                'बिना डॉक्टर की सलाह दवा न दें; चेतना कम हो तो कुछ भी मुंह में न दें।',
                'लक्षण शुरू होने का समय याद रखें — डॉक्टर को बताएं।'
            ] : S.lang === 'mr' ? [
                '108 ला कॉल करा किंवा लगेच रुग्णालयात जा — वेळ जीव वाचवते.',
                'रुग्णाला चालण्यास देऊ नका, शांत ठेवा.',
                'डॉक्टरांचा सल्ला न घेता औषध देऊ नका; बेशी असल्यास मुखातून काहीही नको.',
                'लक्षणे सुरू झाल्याची वेळ लक्षात ठेवा — डॉक्टरांना सांगा.'
            ] : [
                'Call 108 or reach the hospital immediately — time saves lives.',
                'Do not let the patient walk around; keep them calm and still.',
                'No self-medication; nothing by mouth if consciousness is reduced.',
                'Note the time symptoms began — tell the doctor.'
            ];
        }
        if (R.priority === 'URGENT') {
            return S.lang === 'hi' ? [
                '24 घंटे के अंदर नज़दीकी PHC / अस्पताल में दिखाएं।',
                'ORS / पानी लेते रहें, आराम करें।',
                'बुखार 102°F+ हो या लक्षण बढ़ें तो तुरंत अस्पताल जाएं।',
                'बच्चों, गर्भवती महिलाओं और बुजुर्गों में देर न करें।'
            ] : S.lang === 'mr' ? [
                '24 तासांत जवळच्या प्राथमिक उपचार केंद्रात / रुग्णालयात तपासणी करा.',
                'ORS / पाणी पुरेसे घ्या, विश्रांती घ्या.',
                'ताप 102°F+ असल्यास किंवा लक्षणे वाढल्यास लगेच रुग्णालयात जा.',
                'बालके, गर्भवती महिला व वृद्धांसाठी उशीर करू नका.'
            ] : [
                'Visit the nearest PHC / hospital within 24 hours.',
                'Stay hydrated (ORS), rest, and monitor the symptoms.',
                'Go immediately if fever crosses 102°F or symptoms worsen.',
                'Do not delay for children, pregnant women, or the elderly.'
            ];
        }
        return S.lang === 'hi' ? [
            'आराम करें, खूब पानी/ORS पिएं।',
            '48 घंटे में सुधार न हो या लक्षण बढ़ें तो PHC जाएं।',
            'बिना पर्चे की दवा खुद से न लें।'
        ] : S.lang === 'mr' ? [
            'विश्रांती घ्या, भरपूर पाणी/ORS प्या.',
            '48 तासांत सुधार नाही किंवा लक्षणे वाढली तर PHC मध्ये जा.',
            'पर्च्याशिवाय औषधे स्वतःहून घेऊ नका.'
        ] : [
            'Rest, hydrate well (water / ORS).',
            'If no improvement in 48 hours or symptoms worsen, visit the PHC.',
            'Avoid self-medicating with prescription drugs.'
        ];
    }

    /* ============================================================
       REPORT TO HOSPITAL — files case into the Command Center
       (admin.html receives it via the portal bridge automatically)
       ============================================================ */
    function fileCase(typePrefix) {
        var R = analyze(S);
        var top = R.names.slice(0, 3).map(function (s) { return s.label; }).join(' + ');
        var detail = top || (S.custom.map(function (c) { return c.label; }).join(' + ')) || 'General symptoms';
        var prio = R.priority;

        var api = window.AccountAPI;
        var who = (api && typeof api.displayName === 'function' && api.displayName()) ? api.displayName() : 'AI Triage Referral';
        var hospital = prio === 'CRITICAL' ? 'District Hospital Wardha' :
            (prio === 'URGENT' ? 'Nearest capable' : 'PHC OPD (queued)');

        var c = {
            id: 'EM-' + Math.floor(1000 + Math.random() * 9000),
            time: 'Just now', patient: who, age: '—',
            type: typePrefix + ': ' + detail,
            priority: prio, hospital: hospital,
            doctor: '—', status: prio === 'CRITICAL' ? 'En Route' : 'Verifying',
            eta: prio === 'CRITICAL' ? '12 mins' : '—',
            vitals: 'On-device AI symptom engine v2 • severity: ' + S.severity + ' • ' + S.duration,
            trustScore: prio === 'CRITICAL' ? 88 : (prio === 'URGENT' ? 58 : 34),
            trustTier: prio === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            trustNote: 'On-device AI symptom engine v2'
        };

        try {
            if (typeof adminCases !== 'undefined') {
                adminCases.unshift(c);
                if (typeof renderDashboard === 'function') renderDashboard();
            } else if (window.PortalBridge) {
                window.PortalBridge.file(c);   // citizen page -> officer console
            }
        } catch (e) { /* never block UI */ }

        if (window.TrustLayer && window.TrustLayer.OpsFeed && typeof window.TrustLayer.OpsFeed.push === 'function') {
            window.TrustLayer.OpsFeed.push('AI triage case <b>' + c.id + '</b> filed (' + prio + ') • ' + esc(detail),
                prio === 'CRITICAL' ? 'err' : 'info');
        }
        return c;
    }

    function report() {
        var R = analyze(S);
        if ((R.names.length + S.custom.length) === 0) {
            toast('Select or type at least one symptom first', 'info');
            return;
        }
        var c = fileCase('AI Triage');
        toast('Case ' + c.id + ' filed — hospital ' + (R.priority === 'CRITICAL' ? 'alerted (CRITICAL)' : 'notified'), 'local_hospital');
        closeModalSafe();
    }

    function call108() { window.location.href = 'tel:108'; }

    function closeModalSafe() {
        try { if (typeof window.closeModal === 'function') window.closeModal('modal-triage'); }
        catch (e) { var m = $('modal-triage'); if (m) m.classList.remove('show'); }
    }

    /* ============================================================
       PUBLIC API (inline onclick handlers)
       ============================================================ */
    function setTabUI(tab) {
        var c = $('at-tab-checker'), h = $('at-tab-chat');
        var pc = $('at-panel-checker'), ph = $('at-panel-chat');
        if (c) c.classList.toggle('active', tab === 'checker');
        if (h) h.classList.toggle('active', tab === 'chat');
        if (pc) pc.style.display = tab === 'checker' ? 'block' : 'none';
        if (ph) ph.style.display = tab === 'chat' ? 'block' : 'none';
    }

    window.MitraTriage = {
        open: function () {
            renderChecker();
            this.tab(S.tab);
            try { if (typeof window.openModal === 'function') window.openModal('modal-triage'); } catch (e) { }
        },
        tab: function (tab) {
            S.tab = tab;
            setTabUI(tab);
            if (tab === 'checker') renderChecker();
            if (tab === 'chat' && window.MitraChat && typeof window.MitraChat.onShow === 'function') {
                window.MitraChat.onShow();
            }
        },
        toggle: function (id) {
            S.picked[id] = !S.picked[id];
            renderChecker();
        },
        setSeverity: function (v) { S.severity = v; renderChecker(); },
        setDuration: function (v) { S.duration = v; renderChecker(); },
        setLang: function (lang) {
            S.lang = lang;
            renderChecker();
            if (window.MitraChat && typeof window.MitraChat.onLangChange === 'function') {
                window.MitraChat.onLangChange(lang);
            }
        },
        reset: function () {
            S.picked = {}; S.custom = []; S.severity = 'moderate'; S.duration = 'today';
            renderChecker();
        },
        removeCustom: function (i) { S.custom.splice(i, 1); renderChecker(); },

        /* free-text handling */
        onType: function (val) {
            var box = $('at-suggest-box');
            if (!box) return;
            var ids = suggest(val);
            if (!ids.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
            box.style.display = 'block';
            box.innerHTML = ids.map(function (id) {
                var s = SYMPTOM_BY_ID[id];
                return '<div class="at-suggest-item" onclick="MitraTriage.pickSuggest(\'' + id + '\')">' +
                    '<span>' + s.icon + '</span><span>' + esc(symptomLabel(s)) + '</span></div>';
            }).join('');
        },
        pickSuggest: function (id) {
            var input = $('at-free-text');
            if (input) { input.value = ''; }
            var box = $('at-suggest-box');
            if (box) { box.innerHTML = ''; box.style.display = 'none'; }
            S.picked[id] = true;
            renderChecker();
        },
        freeKey: function (e) {
            if (e.key === 'Enter') { e.preventDefault(); this.addFree(); }
            if (e.key === 'Escape') { var b = $('at-suggest-box'); if (b) b.style.display = 'none'; }
        },
        addFree: function () {
            var input = $('at-free-text');
            var text = input ? input.value.trim() : '';
            if (!text) return;
            var id = matchText(text);
            if (id) {
                S.picked[id] = true;   // known symptom — highlight the real chip
            } else {
                S.custom.push({ label: text, w: 8 });   // unknown — keep patient's words
            }
            if (input) input.value = '';
            var box = $('at-suggest-box');
            if (box) { box.innerHTML = ''; box.style.display = 'none'; }
            renderChecker();
        },

        report: report,
        call108: call108,

        /* test hooks (pure engine — used by test/test-ai-triage.js) */
        _internals: {
            analyze: analyze, matchText: matchText, suggest: suggest,
            GROUPS: GROUPS, ALL_SYMPTOMS: ALL_SYMPTOMS, CONDITIONS: CONDITIONS
        }
    };

    var SYMPTOM_BY_ID = {};
    ALL_SYMPTOMS.forEach(function (s) { SYMPTOM_BY_ID[s.id] = s; });

    /* ============================================================
       BOOT — non-destructive takeover of the Explore card entry
       ============================================================ */
    if (window.Network && typeof window.Network.aiOpen === 'function') {
        var prevAiOpen = window.Network.aiOpen;
        window.Network.aiOpen = function () {
            if ($('at-panel-checker')) { window.MitraTriage.open(); return; }
            prevAiOpen.apply(this, arguments);   // fallback if markup missing
        };
    }
})();

/* ============================================================
   EMERGENCY MITRA - ASK MITRA AI (js/mitra-chat.js)
   ============================================================
   TAB 2 of the upgraded "AI Preliminary Triage" experience.

   Chat UI + intent engine:

     - Typing indicator, quick-reply chips, trilingual replies
       (English / हिंदी / मराठी) — patient's own language
     - Emergency intents (chest pain, breathing, snakebite,
       bleeding, seizure, stroke, poisoning, unconsciousness)
       get a red "Call 108 + Report to Hospital" action row
     - Works FULLY OFFLINE via the built-in knowledge base —
       ideal for low-connectivity rural use

   OPTIONAL LLM BACKEND (user-fillable slot):
       window.MITRA_AI_CONFIG = { apiKey:'', endpoint:'', model:'' }
     - Leave apiKey '' (default) => offline engine only.
     - Set apiKey to enable an OpenAI-compatible chat completion
       call; any failure/time-out silently falls back offline.
     - The system prompt hard-constrains the model to first-aid
       guidance + the 108/hospital protocol, in the user language.

   LOAD ORDER: after js/ai-triage.js (shares its modal panels).
   ============================================================ */

(function () {
    'use strict';

    /* ============================================================
       CONFIG — paste credentials here or set the global earlier
       ============================================================ */
    var CFG = window.MITRA_AI_CONFIG || {};
    var API_KEY = CFG.apiKey || '';
    var ENDPOINT = CFG.endpoint || 'https://api.openai.com/v1/chat/completions';
    var MODEL = CFG.model || 'gpt-4o-mini';
    var REQ_TIMEOUT = 15000;

    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g,
            function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    /* ============================================================
       STATE
       ============================================================ */
    var S = { lang: (window.currentLang === 'hi' || window.currentLang === 'mr') ? window.currentLang : 'en', busy: false, history: [], started: false };
    /* live follow: re-draw chips/input + keep bot replies in-language */
    window.addEventListener('em:language-changed', function (e) {
        var l = (e && e.detail && e.detail.lang) || window.currentLang || 'en';
        if (l === 'hi' || l === 'mr' || l === 'en') {
            S.lang = l;
            renderChips();
            renderInput();
        }
    });

    /* ============================================================
       QUICK CHIPS + GREETING
       ============================================================ */
    var QUICK = {
        en: ['I have fever', 'Chest pain', 'Vomiting since morning', 'Snake bite!', 'My child has fever', 'I feel dizzy'],
        hi: ['मुझे बुखार है', 'सीने में दर्द है', 'सुबह से उल्टी हो रही है', 'सांप ने काटा!', 'मेरे बच्चे को बुखार है', 'चक्कर आ रहे हैं'],
        mr: ['मला ताप आहे', 'छातीत दुखतंय', 'सकाळीपासून उलटी होतेय', 'सापाने चावलं!', 'माझ्या मुलाला ताप आहे', 'चक्कर येतेय']
    };

    /* ============================================================
       INTENT KNOWLEDGE BASE (offline engine) — EN/HI/MR
       red = emergency intent -> Call 108 + report row attached
       ============================================================ */
    var INTENTS = [
        {
            id: 'chestPain', red: true,
            kw: { en: ['chest pain', 'heart', 'heart attack', 'seene me dard'], hi: ['सीने में दर्द', 'छाती', 'दिल'], mr: ['छातीत दुख', 'हृदय'] },
            resp: {
                en: { t: 'Chest pain can be a HEART EMERGENCY', b: 'Do NOT wait. Do NOT drive yourself.', tips: ['Call 108 NOW or reach District Hospital Wardha immediately', 'Sit down, loosen clothes, stay calm — do not walk around', 'If a doctor prescribed aspirin earlier, take one (325mg) unless allergic'] },
                hi: { t: 'सीने का दर्द हृदय आपातकाल हो सकता है', b: 'इंतजार न करें। खुद गाड़ी न चलाएं।', tips: ['अभी 108 कॉल करें या तुरंत अस्पताल जाएं', 'बैठ जाएं, कपड़े ढीले करें, शांत रहें', 'पहले बताई गई हो तो एक एस्पिरिन (325mg) लें — एलर्जी न हो'] },
                mr: { t: 'छातीतील दुखणे हृदयाचा आपत्कालीन प्रकार असू शकतो', b: 'उशीर करू नका. स्वतः वाहन चालवू नका.', tips: ['लगेच 108 ला कॉल करा किंवा रुग्णालयात जा', 'बसा, कपडे सैल करा, शांत राहा', 'आधी सांगितले असल्यास एक अॅस्पिरिन (325mg) घ्या'] }
            }
        },
        {
            id: 'breathless', red: true,
            kw: { en: ['breath', 'breathing', 'suffocat', 'saans nahi'], hi: ['सांस', 'दम'], mr: ['श्वास', 'दम'] },
            resp: {
                en: { t: 'Breathing difficulty is an emergency', b: 'Get help immediately — minutes matter.', tips: ['Call 108 now', 'Sit upright — do not lie flat', 'Loosen tight clothing; let fresh air in', 'If an inhaler was prescribed, use it'] },
                hi: { t: 'सांस लेने में तकलीफ आपातकाल है', b: 'तुरंत मदद लें — हर मिनट जरूरी है।', tips: ['अभी 108 कॉल करें', 'सीधे बैठें — लेटें नहीं', 'कपड़े ढीले करें, ताज़ी हवा आने दें', 'इनहेलर हो तो इस्तेमाल करें'] },
                mr: { t: 'श्वासाला त्रास हा आपत्कालीन प्रकार आहे', b: 'लगेच मदत घ्या — प्रत्येक मिनिट महत्त्वाचे.', tips: ['लगेच 108 ला कॉल करा', 'सरळ बसा — झोपू नका', 'कपडे सैल करा, हवा येऊ द्या', 'इन्हेलर असल्यास वापरा'] }
            }
        },
        {
            id: 'snakebite', red: true,
            kw: { en: ['snake', 'bite', 'scorpion'], hi: ['सांप', 'काट', 'काटना', 'बिच्छू'], mr: ['साप', 'चाव', 'वार', 'विंचू'] },
            resp: {
                en: { t: 'SNAKEBITE — rush to antivenom facility', b: 'District Hospital Wardha keeps polyvalent antivenom.', tips: ['Keep the bitten limb STILL, at or below heart level', 'Remove rings, watches, tight items', 'Do NOT cut, suck, or tie a tight tourniquet', 'Note the snake\u2019s colour/shape if safe — never chase it', 'Call 108 now'] },
                hi: { t: 'सांप ने काटा — एंटी-व्हेनम अस्पताल भागें', b: 'जिला अस्पताल वर्धा में एंटी-व्हेनम उपलब्ध है।', tips: ['काटा वाला अंग बिल्कुल हिलाएं नहीं — दिल से नीचे रखें', 'अंगूठी/घड़ी/कसे कपड़े हटाएं', 'काटें, चूसें या कसकर बांधें — बिल्कुल नहीं', 'सांप का रंग-आकार सुरक्षित हो तो याद करें — पीछा न करें', '108 कॉल करें'] },
                mr: { t: 'सापाचा वार — अ‍ॅन्टी-व्हेनम रुग्णालयात धावा', b: 'जिल्हा रुग्णालय वर्धा येथे पॉलिव्हॅलेंट अ‍ॅन्टी-व्हेनम आहे.', tips: ['चावलेला भाग हलवू नका — हृदयाच्या पातळीखाली ठेवा', 'अंगठी/घड्याळ/घट्ट वस्त्र काढा', 'चावू / चोखू / घट्ट बांधू नका', 'सापाचा रंग-आकार सुरक्षित असल्यास लक्षात ठेवा', '108 ला कॉल करा'] }
            }
        },
        {
            id: 'bleeding', red: true,
            kw: { en: ['bleed', 'bleeding', 'blood loss'], hi: ['खून', 'रक्तस्राव'], mr: ['रक्तस्राव'] },
            resp: {
                en: { t: 'Uncontrolled bleeding — act now', b: 'Pressure saves lives.', tips: ['Press HARD with a clean cloth — do not lift to peek', 'Raise the injured part above heart level', 'If the cloth soaks, add more layers — do not remove', 'Call 108 / reach hospital immediately'] },
                hi: { t: 'बहता खून — तुरंत काम करें', b: 'दबाव ही जान बचाता है।', tips: ['साफ कपड़े से जोर से दबाएं — बीच में उठाकर न देखें', 'घायल अंग दिल से ऊपर उठाएं', 'कपड़ा भीग जाए तो ऊपर और बांधें — न हटाएं', '108 कॉल करें / तुरंत अस्पताल'] },
                mr: { t: 'रक्तस्राव थांबत नसेल — लगेच उपाय करा', b: 'दाब हाच जीव वाचवतो.', tips: ['स्वच्छ कापडाने जोरात दाबा — उचलून बघू नका', 'जखमी भाग हृदयाच्या पातळीवर वर करा', 'कापड भिजले तर वर अजून बांधा — काढू नका', '108 कॉल करा / लगेच रुग्णालय'] }
            }
        },
        {
            id: 'seizure', red: true,
            kw: { en: ['seizure', 'fits', 'epilepsy', 'convuls'], hi: ['दौरा', 'मिर्गी', 'झटके'], mr: ['मिरगी', 'झटके', 'दौरे'] },
            resp: {
                en: { t: 'Seizure — protect, don\u2019t restrain', b: '', tips: ['Move hard objects away; put something soft under the head', 'Turn the person on their SIDE (recovery position)', 'Do NOT put anything in the mouth', 'Time it — if >5 minutes or repeating, call 108', 'Stay with them until fully aware'] },
                hi: { t: 'दौरा — सुरक्षित रखें, रोकें नहीं', b: '', tips: ['पास की चोट देने वाली वस्तुएं हटाएं, सिर के नीचे मुलायम रखें', 'मरीज को करवट पर लिटाएं', 'मुंह में कुछ भी डालें नहीं', 'समय नोट करें — 5 मिनट से ज्यादा/बार-बार हो तो 108', 'होश आने तक साथ रहें'] },
                mr: { t: 'झटके — संरक्षण करा, आटोकू नका', b: '', tips: ['जवळच्या घातक वस्तू दूर करा, डोक्याखाली मऊ कापड', 'रुग्णाला बाजूला झोपवा', 'तोंडात काहीही घालू नका', 'वेळ मोजा — 5 मिनिटांहून जास्त/पुनरावृत्ती असल्यास 108', 'होश येईपर्यंत जवळ राहा'] }
            }
        },
        {
            id: 'poison', red: true,
            kw: { en: ['poison', 'swallowed chemical', 'overdose'], hi: ['ज़हर', 'विष'], mr: ['विष', 'झेर'] },
            resp: {
                en: { t: 'Suspected poisoning — fast action critical', b: '', tips: ['Call 108 immediately', 'Bring the container/strip to the hospital', 'Do NOT force vomiting unless poison control says so', 'Keep the packet/prescription handy'] },
                hi: { t: 'ज़हर/विष का शक — तेज़ कार्रवाई जरूरी', b: '', tips: ['तुरंत 108 कॉल करें', 'बोतल/पत्ती अस्पताल ले जाएं', 'बताए बिना उल्टी न कराएं', 'पैकेट/पर्चा साथ रखें'] },
                mr: { t: 'विषबाधेचा संशय — झटपट कृती आवश्यक', b: '', tips: ['लगेच 108 ला कॉल करा', 'भांडी/पट्टी रुग्णालयात न्या', 'सांगितल्याशिवाय उलटी करू देऊ नका', 'पॅकेट/पर्चा जवळ ठेवा'] }
            }
        },
        {
            id: 'unconscious', red: true,
            kw: { en: ['unconscious', 'not responding', 'collapsed'], hi: ['बेहोश', 'होश नहीं'], mr: ['बेशी', 'होश नाही'] },
            resp: {
                en: { t: 'Unresponsive person — life-threatening', b: '', tips: ['Call 108 NOW', 'Check breathing — if absent, start CPR (30 compressions : 2 breaths)', 'If breathing normally, turn them on their side', 'Do not give food or water'] },
                hi: { t: 'बेहोश मरीज — जानलेवा स्थिति', b: '', tips: ['अभी 108 कॉल करें', 'सांस जांचें — न हो तो CPR शुरू करें (30 दबाव : 2 सांस)', 'सांस चल रही हो तो करवट पर लिटाएं', 'खाना/पानी न दें'] },
                mr: { t: 'बेशी रुग्ण — जीवघेणी स्थिती', b: '', tips: ['लगेच 108 कॉल करा', 'श्वास तपासा — नसेल CPR सुरू करा (30 दाब : 2 श्वास)', 'श्वास चालू असल्यास बाजूला झोपवा', 'अन्न/पाणी देऊ नका'] }
            }
        },
        {
            id: 'stroke', red: true,
            kw: { en: ['stroke', 'face drooping', 'slurred speech', 'arm weakness'], hi: ['लकवा', 'लड़खड़', 'चेहरा टेढ़ा'], mr: ['लकवा', 'तोंड वाकडं'] },
            resp: {
                en: { t: 'Possible STROKE — every minute counts', b: 'FAST: Face drooping, Arm weakness, Speech difficulty, Time to call.', tips: ['Call 108 immediately — note the exact time symptoms began', 'Do NOT give food, water or medicines', 'Lay the person down with the head slightly raised'] },
                hi: { t: 'लकवे (स्ट्रोक) की आशंका — हर मिनट अहम', b: 'FAST याद रखें: चेहरा टेढ़ा, बाजू कमजोर, बोलने में उलझन, तुरंत कॉल।', tips: ['108 कॉल करें — लक्षण शुरू होने का सटीक समय नोट करें', 'खाना, पानी या दवा न दें', 'सिर थोड़ा ऊंचा रखकर लिटाएं'] },
                mr: { t: 'लकव्याची (स्ट्रोक) शक्यता — प्रत्येक मिनिट महत्त्वाचे', b: 'FAST लक्षात ठेवा: तोंड वाकडे, हात कमजोर, बोलणे खिळखिळे, लगेच कॉल.', tips: ['लगेच 108 कॉल करा — लक्षणे सुरू झाल्याची वेळ नोंदवा', 'अन्न, पाणी किंवा औषध देऊ नका', 'डोके थोडे उंच ठेवून झोपवा'] }
            }
        },
        {
            id: 'fever', red: false,
            kw: { en: ['fever', 'temperature', 'bukhar'], hi: ['बुखार', 'ताप'], mr: ['ताप'] },
            resp: {
                en: { t: 'Fever — care guide', b: 'Most fevers are viral and settle in 2–3 days.', tips: ['Drink plenty of fluids — water, ORS, soup', 'Paracetamol as per age/dose if needed', 'Sponge with lukewarm water if very high', 'See a doctor if: >3 days, 102°F+, rash, stiff neck, or severe weakness', 'Monsoon fever with chills — get malaria/dengue testing'] },
                hi: { t: 'बुखार — देखभाल गाइड', b: 'ज्यादातर बुखार वायरल होते हैं और 2–3 दिन में ठीक हो जाते हैं।', tips: ['खूब तरल लें — पानी, ORS, सूप', 'जरूरत हो तो पैरासिटामोल (उम्र के हिसाब से)', 'बहुत तेज़ बुखार में गुनगुने पानी से पोंछें', 'डॉक्टर से मिलें अगर: 3 दिन से ज्यादा, 102°F+, दाने, गर्दन अकड़ना', 'बारिश में बुखार+ठंड लगना — मलेरिया/डेंगू जांच कराएं'] },
                mr: { t: 'ताप — काळजी मार्गदर्शन', b: 'बहुतेक ताप व्हायरल असतात व 2–3 दिवसांत बरे होतात.', tips: ['भरपूर पाणी/ORS/सूप प्या', 'गरज असल्यास पॅरासिटॅमॉल (वयानुसार मात्रा)', 'खूप जास्त तापात कोमट पाण्याने पुसा', 'डॉक्टरांकडे जा: 3 दिवसांहून जास्त, 102°F+, ताकं, मान ताठ', 'पावसाळ्यात ताप+थंडी — मलेरिया/डेंग्यू तपासणी करा'] }
            }
        },
        {
            id: 'coughCold', red: false,
            kw: { en: ['cough', 'cold', 'throat', 'sore throat', 'runny nose'], hi: ['खांसी', 'जुकाम', 'गला', 'सर्दी'], mr: ['खोकला', 'सर्दी', 'घसा'] },
            resp: {
                en: { t: 'Cough & cold — home care', b: 'Usually self-limiting in 5–7 days.', tips: ['Warm fluids — turmeric milk, honey-ginger (adults), soup', 'Steam inhalation twice daily for blocked nose', 'Avoid cold drinks; rest your voice', 'Doctor if: breathlessness, blood in cough, fever >3 days, or cough >2 weeks'] },
                hi: { t: 'खांसी-जुकाम — घरेलू देखभाल', b: 'आमतौर पर 5–7 दिन में ठीक हो जाता है।', tips: ['गरम तरल — हल्दी दूध, शहद-अदरक (बड़ों के लिए), सूप', 'बंद नाक के लिए दिन में 2 बार भाप', 'ठंडी चीज़ें न लें, आराम करें', 'डॉक्टर से मिलें अगर: सांस तकलीफ, खांसी में खून, 3 दिन से बुखार, 2 हफ्ते से खांसी'] },
                mr: { t: 'खोकला-सर्दी — घरगुती काळजी', b: 'सामान्यतः 5–7 दिवसांत बरे होतात.', tips: ['उष्ण पेय — हळदीचे दूध, मध-आलं (प्रौढांसाठी), सूप', 'बंद नाकासाठी दिवसातून 2 वेळा वाफ', 'थंड पदार्थ टाळा, आवाजाला आराम', 'डॉक्टरांकडे जा: श्वासास त्रास, खोकल्यात रक्त, 3 दिवसांहून ताप, 2 आठवड्यांहून खोकला'] }
            }
        },
        {
            id: 'headache', red: false,
            kw: { en: ['headache', 'head pain', 'migraine'], hi: ['सिरदर्द', 'सिर दर्द', 'माइग्रेन'], mr: ['डोकेदुखी'] },
            resp: {
                en: { t: 'Headache — what helps', b: '', tips: ['Rest in a quiet, dim room; hydrate well', 'Paracetamol as per dose helps most headaches', 'Cool cloth on the forehead', 'URGENT if: worst-ever headache, with vomiting/vision issues, after injury, or high fever + stiff neck'] },
                hi: { t: 'सिरदर्द — क्या काम आता है', b: '', tips: ['शांत, कम रोशनी वाले कमरे में आराम; खूब पानी पिएं', 'पैरासिटामोल खुराक अनुसार लें', 'माथे पर ठंडी पट्टी', 'तुरंत डॉक्टर अगर: जीवन का सबसे तेज़ दर्द, उल्टी/नजर की दिक्कत, चोट के बाद, तेज़ बुखार+गर्दन अकड़न'] },
                mr: { t: 'डोकेदुखी — काय उपयुक्त', b: '', tips: ['शांत, कमी उजेड़्यात विश्रांती; पाणी भरपूर प्या', 'पॅरासिटॅमॉल मात्रेनुसार घ्या', 'कपाळावर थंड पट्टी', 'लगेच डॉक्टर असे: आतापर्यंतचे सर्वात तीव्र दुखणे, उलटी/डोळ्यांची अडचण, दुखापतीनंतर, ताप+मान ताठ'] }
            }
        },
        {
            id: 'gastro', red: false,
            kw: { en: ['vomit', 'diarrhea', 'loose motion', 'food poisoning', 'stomach upset'], hi: ['उल्टी', 'दस्त', 'फूड पॉइज़निंग'], mr: ['उलटी', 'अतिसार'] },
            resp: {
                en: { t: 'Vomiting / diarrhea — hydration is the medicine', b: 'Dehydration is the real danger, especially for children.', tips: ['ORS sip-by-sip — 1 sachet in 1 litre clean water', 'Eat light: banana, rice, curd, khichdi — no oily/spicy food', 'Zinc helps children (per doctor)', 'URGENT if: blood in vomit/stool, no urine 8+ hours, sunken eyes, continuous vomiting'] },
                hi: { t: 'उल्टी/दस्त — पानी ही असली दवा है', b: 'पानी की कमी असली खतरा है — बच्चों में और भी।', tips: ['ORS घूंट-घूंट पिएं — 1 पाउच 1 लीटर साफ पानी में', 'हल्का खाना: केला, चावल, दही, खिचड़ी — तला/मसालेदार नहीं', 'बच्चों को जिंक दें (डॉक्टर की सलाह से)', 'तुरंत अस्पताल अगर: उल्टी/दस्त में खून, 8 घंटे से पेशाब नहीं, आंखें धंसी, लगातार उल्टी'] },
                mr: { t: 'उलटी/अतिसार — पाणी हेच औषध', b: 'पाण्याची कमतरता ही खरी धोका — विशेषतः बालकांमध्ये.', tips: ['ORS घोटाघोट करून प्या — 1 पावडर 1 लिटर स्वच्छ पाण्यात', 'हलके खा: केळी, भात, दही, खिचडी — तेलकट/तिखट नको', 'बालकांना झिंक द्या (डॉक्टरांच्या सल्ल्याने)', 'लगेच रुग्णालय: उलटी/मलमध्ये रक्त, 8 तासांहून लघवी नाही, डोळे खाचलेले, सतत उलटी'] }
            }
        },
        {
            id: 'burn', red: false,
            kw: { en: ['burn', 'fire', 'boiling water'], hi: ['जला', 'आग'], mr: ['उकळणे', 'आग'] },
            resp: {
                en: { t: 'Burns — cool it, don\u2019t ruin it', b: '', tips: ['Run COOL (not ice) water over it for 10–20 minutes', 'Remove rings/watches near the burn', 'Cover with clean cloth; do NOT apply toothpaste/oil/ghee', 'Do not pop blisters', 'Hospital for: face/hand burns, larger than a palm, or blisters'] },
                hi: { t: 'जले हाथ-पैर — ठंडा करें, उपाय खराब न करें', b: '', tips: ['10–20 मिनट ठंडा (बर्फ नहीं) पानी बहाएं', 'पास की अंगूठी/घड़ी उतारें', 'साफ कपड़े से ढकें; टूथपेस्ट/तेल/घी न लगाएं', 'फफोले न फोड़ें', 'अस्पताल: चेहरे/हाथ का जलना, हथेली से बड़ा, फफोले'] },
                mr: { t: 'उकळलेले भाग — थंड करा, चुकीचे उपाय करू नका', b: '', tips: ['10–20 मिनिटे थंड (बर्फ नाही) पाणी ओता', 'जवळची अंगठी/घड्याळ काढा', 'स्वच्छ कापडाने झाका; टूथपेस्ट/तेल/तूप लावू नका', 'फडके फोडू नका', 'रुग्णालय: चेहरा/हात, तळव्याएवढा मोठा, फडके'] }
            }
        },
        {
            id: 'dizzy', red: false,
            kw: { en: ['dizzy', 'dizziness', 'chakkar', 'light headed'], hi: ['चक्कर'], mr: ['चक्कर'] },
            resp: {
                en: { t: 'Dizziness — sit first, think next', b: '', tips: ['Sit or lie down immediately — do not stay standing', 'Drink water/ORS — often dehydration or skipped meals', 'Check whether today\u2019s medicines were taken', 'URGENT if: with chest pain, fainting, slurred speech, or repeated episodes'] },
                hi: { t: 'चक्कर — पहले बैठें, फिर सोचें', b: '', tips: ['तुरंत बैठ/लेट जाएं — खड़े रहें नहीं', 'पानी/ORS पिएं — अक्सर पानी की कमी या खाना छोड़ने से', 'आज कोई दवा ली है या नहीं देखें', 'तुरंत डॉक्टर अगर: सीने में दर्द, बेहोशी, बोलने में उलझन, बार-बार चक्कर'] },
                mr: { t: 'चक्कर — आधी बसा, मग विचार करा', b: '', tips: ['लगेच बसा/झोपा — उभे राहू नका', 'पाणी/ORS प्या — बहुधा पाण्याची कमतरता/उपवास', 'आजची औषधे घेतली का ते बघा', 'लगेच डॉक्टर असे: छातीदुखी, बेशी, बोलणे खिळखिळे, सतत चक्कर'] }
            }
        },
        {
            id: 'dogbite', red: false,
            kw: { en: ['dog bite', 'dog', 'rabies', 'animal bite', 'cat scratch'], hi: ['कुत्ते ने काटा', 'कुत्ता', 'रेबीज', 'जानवर'], mr: ['कुत्र्याने चावलं', 'रेबीज', 'प्राणी'] },
            resp: {
                en: { t: 'Animal bite — rabies is preventable, neglect is fatal', b: '', tips: ['Wash the wound with soap under running water for 15 minutes NOW', 'Apply antiseptic; cover with clean cloth', 'Reach the anti-rabies vaccination centre TODAY (District Hospital Wardha)', 'Complete the FULL vaccine course even if it feels fine'] },
                hi: { t: 'जानवर ने काटा — रेबीज रोका जा सकता है, लापरवाही घातक है', b: '', tips: ['अभी बहते पानी और साबुन से 15 मिनट धोएं', 'एंटीसेप्टिक लगाएं, साफ कपड़े से बांधें', 'आज ही एंटी-रेबीज केंद्र जाएं (जिला अस्पताल वर्धा)', 'पूरी वैक्सीन कोर्स पूरी करें — ठीक लगे तो भी'] },
                mr: { t: 'प्राण्याचा वार — रेबीज टाळता येतो, अवहेलना घातक', b: '', tips: ['आत्ता वाहत्या पाण्यात साबणाने 15 मिनिटे धुवा', 'अँटिसेप्टिक लावा, स्वच्छ कापडाने बांधा', 'आजच अँटी-रेबीज केंद्रात जा (जिल्हा रुग्णालय वर्धा)', 'संपूर्ण लस पूर्ण करा — व्यवस्थित वाटले तरी'] }
            }
        },
        {
            id: 'childFever', red: false,
            kw: { en: ['child fever', 'my child', 'baby fever', 'kids'], hi: ['बच्चे को बुखार', 'बच्चा', 'शिशु'], mr: ['मुलाला ताप', 'बाळ'] },
            resp: {
                en: { t: 'Child with fever — act carefully', b: 'Children dehydrate faster than adults.', tips: ['Paracetamol by WEIGHT (15mg/kg) — never aspirin for children', 'Light clothing, sponging, fluids sip by sip', 'Watch urine output and activity — these tell more than the thermometer', 'URGENT: baby under 3 months, fever >102°F, refusing feeds, seizures, or very drowsy child'] },
                hi: { t: 'बच्चे को बुखार — सावधानी से', b: 'बच्चों में पानी की कमी जल्दी होती है।', tips: ['पैरासिटामोल वजन के हिसाब से (15mg/kg) — बच्चों को कभी एस्पिरिन नहीं', 'हल्के कपड़े, गुनगुने पानी से पोंछें, थोड़ा-थोड़ा तरल पिलाएं', 'पेशाब और हरकत देखें — थर्मामीटर से ज्यादा ये बताते हैं', 'तुरंत अस्पताल: 3 महीने से छोटा शिशु, 102°F+, दूध छोड़ना, दौरा, बहुत सुस्त'] },
                mr: { t: 'मुलाला ताप — काळजीपूर्वक', b: 'बालकांमध्ये पाण्याची कमतरता लवकर होते.', tips: ['पॅरासिटॅमॉल वजनानुसार (15mg/kg) — बालकांना अॅस्पिरिन कधीच नाही', 'हलकी कपडे, कोमट पाण्याने पुसणे, अल्प-अल्प पाणी', 'लघवीचे प्रमाण व हालचाल बघा — थर्मामीटरपेक्षा उपयुक्त', 'लगेच रुग्णालय: 3 महिन्यांहून लहान बाळ, 102°F+, दूध घेत नाही, झटके, अतिशय सुस्त'] }
            }
        },
        {
            id: 'pregnancy', red: false,
            kw: { en: ['pregnan', 'labor pain', 'bleeding in pregnancy'], hi: ['गर्भवती', 'प्रेगनेंसी', 'प्रसव पीड़ा'], mr: ['गर्भवती', 'प्रसूती'] },
            resp: {
                en: { t: 'Pregnancy-related emergency signs', b: '', tips: ['URGENT: bleeding, severe abdominal pain, severe headache/vision change, facial swelling, reduced baby movement', 'No medicine without your doctor\u2019s advice', 'Reach the nearest facility with maternity care (24x7 PHC / District Hospital)', 'Carry your Mother & Child Protection Card'] },
                hi: { t: 'गर्भावस्था के आपातकालीन चिन्ह', b: '', tips: ['तुरंत अस्पताल: रक्तस्राव, तेज़ पेट दर्द, तेज़ सिरदर्द/धुंधला दिखना, चेहरे की सूजन, गर्भ में हलचल कम', 'बिना डॉक्टर की सलाह कोई दवा न लें', 'मातृत्व सुविधा वाला नज़दीकी अस्पताल', 'मातृत्व कार्ड साथ रखें'] },
                mr: { t: 'गर्भारपणातील आपत्कालीन लक्षणे', b: '', tips: ['लगेच रुग्णालय: रक्तस्राव, तीव्र पोटदुखी, तीव्र डोकेदुखी/धुंदल, चेहऱ्यावर सूज, गर्भाची हालचाल कमी', 'डॉक्टरांचा सल्ला न घेता औषध घेऊ नका', 'मातृत्व सुविधा असलेले जवळचे रुग्णालय', 'मातृत्व कार्ड सोबत ठेवा'] }
            }
        },
        {
            id: 'urine', red: false,
            kw: { en: ['urine', 'burning urination', 'uti'], hi: ['पेशाब', 'पेशाब में जलन'], mr: ['लघवी', 'जळजळ'] },
            resp: {
                en: { t: 'Burning urination — likely UTI', b: '', tips: ['Drink 3–4 litres of water through the day', 'Do not hold urine; empty the bladder fully', 'URGENT if: blood in urine, fever + back pain, or pregnancy', 'Doctor may ask for a urine test — antibiotics only on prescription'] },
                hi: { t: 'पेशाब में जलन — संभवतः UTI', b: '', tips: ['दिन में 3–4 लीटर पानी पिएं', 'पेशाब रोककर न रखें; पूरा खाली करें', 'तुरंत डॉक्टर अगर: पेशाब में खून, बुखार+कमर दर्द, या गर्भावस्था', 'यूरिन टेस्ट लग सकता है — एंटीबायोटिक केवल पर्चे पर'] },
                mr: { t: 'लघवीस जळजळ — बहुधा UTI', b: '', tips: ['दिवसभरात 3–4 लिटर पाणी प्या', 'लघवी लांब लावू नका; पूर्ण करा', 'लगेच डॉक्टर असे: लघवीत रक्त, ताप+कटिदुखी, किंवा गर्भारपण', 'लघवीची तपासणी लागू शकते — अँटिबायोटिक फक्त पर्च्यावर'] }
            }
        },
        {
            id: 'default', red: false,
            kw: { en: [], hi: [], mr: [] },
            resp: {
                en: { t: 'Tell me a bit more', b: 'I can guide on fever, cough, vomiting, injuries, bites and more. For the fastest help:', tips: ['Open the Symptom Checker tab — tap what you feel', 'Describe: what hurts, since when, how severe', 'Call 108 for any life-threatening situation'] },
                hi: { t: 'थोड़ा और बताइए', b: 'मैं बुखार, खांसी, उल्टी, चोट, काटने आदि पर मार्गदर्शन कर सकता हूं। जल्दी मदद के लिए:', tips: ['लक्षण जांच टैब खोलें — जो लगे वो चुनें', 'बताएं: कहां दर्द, कब से, कितना तेज़', 'जानलेवा स्थिति में 108 कॉल करें'] },
                mr: { t: 'अजून थोडं सांगा', b: 'ताप, खोकला, उलटी, दुखापत, चावणे अशा अनेक विषयांत मी मार्गदर्शन करू शकतो. पटकन मदतीसाठी:', tips: ['लक्षण तपासणी टॅब उघडा — जे वाटते ते निवडा', 'सांगा: कुठे दुखतं, कधीपासून, किती जोरात', 'जीवघेणी परिस्थिती असल्यास 108 ला कॉल करा'] }
            }
        }
    ];

    /* ============================================================
       INTENT MATCHING
       ============================================================ */
    function matchIntent(text) {
        var t = (' ' + String(text || '').toLowerCase().trim() + ' ').replace(/\s+/g, ' ');
        if (t.length < 3) return INTENTS[INTENTS.length - 1];
        var best = null, bestScore = 0;
        for (var i = 0; i < INTENTS.length; i++) {
            var it = INTENTS[i];
            if (it.id === 'default') continue;
            /* Match across ALL languages — a patient may type Hindi while the
               UI is in English. Longer keyword = stronger signal. */
            var kws = [].concat(it.kw.en || [], it.kw.hi || [], it.kw.mr || []);
            var score = 0;
            kws.forEach(function (k) {
                if (t.indexOf(k) >= 0) score = Math.max(score, k.length);
            });
            if (score > bestScore) { bestScore = score; best = it; }
        }
        return best || INTENTS[INTENTS.length - 1];
    }

    /* ============================================================
       RENDER
       ============================================================ */
    function chatEl() { return $('at-chat-log'); }

    function scrollLog() {
        var log = chatEl();
        if (log) log.scrollTop = log.scrollHeight;
    }

    function msgHtml(m) {
        if (m.role === 'user') {
            return '<div class="at-msg user">' + esc(m.text) + '</div>';
        }
        var r = m.resp[S.lang] || m.resp.en;
        var html = '<div class="at-msg bot">' +
            '<div class="at-msg-title"><span class="material-symbols-outlined" style="font-size:16px;' +
            (m.resp.red ? 'color:#ba1a1a' : 'color:#00453d') + '">' +
            (m.resp.red ? 'emergency' : 'smart_toy') + '</span>' + esc(r.t) + '</div>';
        if (r.b) html += '<div>' + esc(r.b) + '</div>';
        if (r.tips && r.tips.length) {
            html += '<ul>' + r.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
        }
        if (m.resp.red) {
            html += '<div class="at-cta" style="margin-top:10px">' +
                '<button type="button" onclick="window.location.href=\'tel:108\'" style="background:#ba1a1a;color:#fff;min-width:0;min-height:44px;font-size:12.5px">' +
                '<span class="material-symbols-outlined">call</span>Call 108</button>' +
                '<button type="button" onclick="MitraChat.report()" style="background:#00453d;color:#fff;min-width:0;min-height:44px;font-size:12.5px">' +
                '<span class="material-symbols-outlined">local_hospital</span>Report to Hospital</button></div>';
        }
        html += '</div>';
        return html;
    }

    function renderLog() {
        var log = chatEl();
        if (!log) return;
        if (!S.history.length) {
            var greet = {
                en: { t: 'Namaste! I am Mitra — your health guide.', b: 'Describe your problem in your own language. I give first-aid guidance and tell you when to reach a hospital. In a life-threatening situation, always call 108 first.', tips: null },
                hi: { t: 'नमस्ते! मैं मित्र हूं — आपका स्वास्थ्य मार्गदर्शक।', b: 'अपनी समस्या अपनी भाषा में बताएं। मैं प्राथमिक उपचार बताऊंगा और कब अस्पताल जाना है यह भी। जानलेवा स्थिति में पहले 108 कॉल करें।', tips: null },
                mr: { t: 'नमस्कार! मी मित्र — तुमचा आरोग्य मार्गदर्शक.', b: 'तुमची समस्या तुमच्या भाषेत सांगा. मी प्राथमिक उपचार सांगेन आणि कधी रुग्णालयात जायचं तेही. जीवघेणी परिस्थितीत आधी 108 ला कॉल करा.', tips: null }
            }[S.lang] || {};
            S.history.push({ role: 'bot', resp: { red: false, en: greet, hi: greet, mr: greet } });
        }
        log.innerHTML = S.history.map(msgHtml).join('');
        scrollLog();
        renderChips();
    }

    function renderChips() {
        var host = $('at-chat-chips');
        if (!host) return;
        host.innerHTML = (QUICK[S.lang] || QUICK.en).map(function (q) {
            return '<button type="button" class="at-quick" onclick="MitraChat.quick(\'' + esc(q).replace(/'/g, "\\'") + '\')">' + esc(q) + '</button>';
        }).join('');
    }

    function renderInput() {
        var input = $('at-chat-input');
        if (input) input.placeholder = {
            en: 'Describe your problem in your language…',
            hi: 'अपनी समस्या अपनी भाषा में बताएं…',
            mr: 'तुमची समस्या तुमच्या भाषेत सांगा…'
        }[S.lang] || input.placeholder;
    }

    function showTyping() {
        var log = chatEl();
        if (!log) return;
        var d = document.createElement('div');
        d.id = 'at-typing-row';
        d.className = 'at-msg bot';
        d.innerHTML = '<div class="at-typing"><span></span><span></span><span></span></div>';
        log.appendChild(d);
        scrollLog();
    }
    function hideTyping() {
        var d = $('at-typing-row');
        if (d && d.parentNode) d.parentNode.removeChild(d);
    }

    /* ============================================================
       SEND PIPELINE
       ============================================================ */
    function send(text) {
        var msg = String(text || '').trim();
        if (!msg || S.busy) return;
        S.history.push({ role: 'user', text: msg });
        renderLog();
        S.busy = true;
        var sendBtn = $('at-send');
        if (sendBtn) sendBtn.disabled = true;
        showTyping();

        var useApi = API_KEY && S.history.filter(function (m) { return m.role === 'user'; }).length > 0;

        var finish = function (reply) {
            hideTyping();
            S.busy = false;
            if (sendBtn) sendBtn.disabled = false;
            if (reply) S.history.push({ role: 'bot', resp: reply });
            renderLog();
        };

        if (useApi) {
            apiReply(msg).then(finish).catch(function () {
                setTimeout(function () { finish(localReply(msg)); }, 350);
            });
        } else {
            // Small human-feel delay so responses don't flash instantly
            setTimeout(function () { finish(localReply(msg)); }, 420 + Math.random() * 380);
        }
    }

    function localReply(text) {
        var it = matchIntent(text);
        return { red: !!it.red, en: it.resp.en, hi: it.resp.hi, mr: it.resp.mr };
    }

    /* ============================================================
       OPTIONAL LLM BACKEND (OpenAI-compatible)
       Falls back to the offline engine on any error/time-out.
       ============================================================ */
    function apiReply(text) {
        var langName = S.lang === 'hi' ? 'Hindi (Devanagari)' : S.lang === 'mr' ? 'Marathi (Devanagari)' : 'English';
        var sys =
            'You are Mitra, a rural-India emergency health guide inside the Emergency Mitra app. ' +
            'Rules: give short first-aid guidance only; NEVER diagnose definitively; ' +
            'ALWAYS advise calling 108 and reaching the nearest hospital for anything life-threatening ' +
            '(chest pain, breathing difficulty, snakebite, heavy bleeding, seizure, stroke, poisoning, unconsciousness). ' +
            'Reply ONLY in ' + langName + '. Keep it under 120 words. Use a short bold headline line, then 2-4 bullet tips.';

        var msgs = [{ role: 'system', content: sys }].concat(
            S.history.slice(-8).map(function (m) {
                return { role: m.role === 'bot' ? 'assistant' : 'user', content: m.text || m.resp.en.t };
            })
        );

        var ctl = ('AbortController' in window) ? new window.AbortController() : null;
        var timer = ctl ? setTimeout(function () { ctl.abort(); }, REQ_TIMEOUT) : null;

        return fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
            body: JSON.stringify({ model: MODEL, messages: msgs, max_tokens: 320, temperature: 0.4 }),
            signal: ctl ? ctl.signal : undefined
        }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function (data) {
            if (timer) clearTimeout(timer);
            var content = data && data.choices && data.choices[0] && data.choices[0].message &&
                data.choices[0].message.content;
            if (!content) throw new Error('empty');
            return { red: matchIntent(text).red, api: true, html: content, en: { t: '', b: content, tips: null }, hi: null, mr: null };
        }).catch(function (e) {
            if (timer) clearTimeout(timer);
            throw e;
        });
    }

    /* ============================================================
       REPORT FROM CHAT — files the concern as a hospital case
       ============================================================ */
    function report() {
        var lastUser = '';
        for (var i = S.history.length - 1; i >= 0; i--) {
            if (S.history[i].role === 'user') { lastUser = S.history[i].text; break; }
        }
        var detail = lastUser || 'Chat consultation';
        var it = matchIntent(detail);
        var prio = it.red ? 'CRITICAL' : 'URGENT';

        var api = window.AccountAPI;
        var who = (api && typeof api.displayName === 'function' && api.displayName()) ? api.displayName() : 'Mitra AI Chat';

        var c = {
            id: 'EM-' + Math.floor(1000 + Math.random() * 9000),
            time: 'Just now', patient: who, age: '—',
            type: 'Mitra AI Chat: ' + detail,
            priority: prio, hospital: it.red ? 'District Hospital Wardha' : 'Nearest capable',
            doctor: '—', status: it.red ? 'En Route' : 'Verifying',
            eta: it.red ? '12 mins' : '—',
            vitals: 'Mitra AI chatbot referral • lang: ' + S.lang,
            trustScore: it.red ? 85 : 52, trustTier: it.red ? 'HIGH' : 'MEDIUM',
            trustNote: 'Mitra AI chatbot referral'
        };

        try {
            if (typeof adminCases !== 'undefined') {
                adminCases.unshift(c);
                if (typeof renderDashboard === 'function') renderDashboard();
            } else if (window.PortalBridge) {
                window.PortalBridge.file(c);
            }
        } catch (e) { /* never block UI */ }

        if (typeof window.showToast === 'function') {
            window.showToast('Case ' + c.id + ' filed — hospital notified', 'local_hospital');
        }
        try { if (typeof window.closeModal === 'function') window.closeModal('modal-triage'); } catch (e) { }
    }

    /* ============================================================
       STYLES
       ============================================================ */
    (function injectStyles() {
        var st = document.createElement('style');
        st.textContent =
            '.at-chat-log{max-height:44vh;min-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:4px 2px}' +
            '.at-msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:13px;line-height:1.55;animation:atFade .3s ease}' +
            '.at-msg.bot{background:#f0f7f5;border:1.5px solid #d9e5e0;color:#10201a;align-self:flex-start;border-bottom-left-radius:4px}' +
            '.at-msg.user{background:#00453d;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}' +
            '.at-msg .at-msg-title{font-weight:800;font-size:13.5px;margin-bottom:4px;display:flex;align-items:center;gap:6px}' +
            '.at-msg ul{margin:6px 0 0;padding-left:18px}' +
            '.at-msg li{margin:2px 0}' +
            '@keyframes atFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
            '.at-typing{display:inline-flex;gap:4px;align-items:center;height:20px}' +
            '.at-typing span{width:7px;height:7px;border-radius:50%;background:#7fa39a;animation:atBlink 1.2s infinite}' +
            '.at-typing span:nth-child(2){animation-delay:.2s}.at-typing span:nth-child(3){animation-delay:.4s}' +
            '@keyframes atBlink{0%,80%,100%{opacity:.25;transform:scale(.85)}40%{opacity:1;transform:scale(1)}}' +
            '.at-chat-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 8px}' +
            '.at-quick{border:1.5px solid #cfd8d5;background:#fff;border-radius:999px;padding:6px 12px;font-size:12px;' +
            'font-weight:600;cursor:pointer;color:#37493f}' +
            '.at-quick:hover{border-color:#00453d;color:#00453d}' +
            '.at-chat-row{display:flex;gap:8px;margin-top:4px}' +
            '.at-chat-row input{flex:1;padding:12px 14px;border:1.5px solid #cfd8d5;border-radius:12px;font-size:13.5px;outline:none}' +
            '.at-chat-row input:focus{border-color:#00453d;box-shadow:0 0 0 3px rgba(0,69,61,.08)}' +
            '.at-send{width:48px;height:44px;border:none;border-radius:12px;background:#00453d;color:#fff;cursor:pointer;' +
            'display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}' +
            '.at-send:hover{background:#0b6b5d}.at-send:disabled{opacity:.5;cursor:not-allowed}' +
            '.at-lang-pill{border:1.5px solid #cfd8d5;background:#fff;border-radius:999px;font-size:11px;font-weight:700;' +
            'padding:4px 10px;cursor:pointer;color:#5b6f66}' +
            '.at-lang-pill.on{background:#00453d;border-color:#00453d;color:#fff}';
        document.head.appendChild(st);
    })();

    /* ============================================================
       PUBLIC API
       ============================================================ */
    window.MitraChat = {
        onShow: function () {
            if (!S.started) { S.started = true; renderLog(); renderInput(); }
            else { renderChips(); renderInput(); }
            var input = $('at-chat-input');
            if (input && window.innerWidth > 640) input.focus();
        },
        onLangChange: function (lang) {
            S.lang = lang || 'en';
            renderChips();
            renderInput();
        },
        quick: function (q) { send(q); },
        key: function (e) {
            if (e.key === 'Enter') { e.preventDefault(); this.submit(); }
        },
        submit: function () {
            var input = $('at-chat-input');
            var v = input ? input.value : '';
            if (input) input.value = '';
            send(v);
        },
        report: report,
        setLang: function (lang) { this.onLangChange(lang); },
        _internals: { matchIntent: matchIntent, INTENTS: INTENTS, localReply: localReply }
    };
})();

/* ============================================================
   EMERGENCY MITRA - MULTI-LANGUAGE TRANSLATION ENGINE v2
   (js/translations.js)
   ============================================================
   Full-page client-side i18n without any framework.

   WHAT v2 FIXES (vs the old partial engine):
     1. Marathi (mr) now has a COMPLETE dictionary — previously it
        held 2 entries, so switching to MR translated almost nothing.
     2. Every string added since the original build (role chooser,
        Officer Login, AI triage, handshake, passport, modals,
        dashboards) is covered in both HI and MR.
     3. window.currentLang is kept in sync so on-device TTS
        (handshake, IVR, Mitra AI) speaks the chosen language.
     4. JS-rendered widgets (facilities finder, AI triage panels,
        handshake view) re-render on language change so the whole
        page switches — not just static markup.
     5. Admin page gets the same switcher (dropdown markup hook),
        with dashboard terminology included.
     6. <html lang> attribute updated for accessibility/IME.

   BEHAVIOUR
     - translatePage(lang): switch everything + persist choice
     - Auto-applies saved language on DOMContentLoaded
     - DOM text-node walker preserves original English (data-orig
       bookkeeping) so switching back to EN is lossless
     - em:language-changed event lets any module re-render itself

   TO ADD A LANGUAGE 'ta': add an appTranslations.ta dictionary,
   add buttons id 'btn-lang-ta' / 'mob-lang-ta', and add 'ta' to
   the LANGS list below. Nothing else.
   ============================================================ */

(function () {
    'use strict';

    var LANGS = ['en', 'hi', 'mr'];

    var appTranslations = {
        /* ============================================================
           HINDI
           ============================================================ */
        hi: {
            /* ---- role chooser (index.html) ---- */
            "Who are you?": "आप कौन हैं?",
            "Emergency Mitra": "इमर्जन्सी मित्र",
            "Right Care. Right Facility. Right Now.": "सही देखभाल। सही सुविधा। सही समय।",
            "Right Care. Right Facility. Right Now. — Tell us who you are, and we will take you to the right place.": "सही देखभाल। सही सुविधा। सही समय। — बताइए आप कौन हैं, हम आपको सही जगह ले चलते हैं।",
            "I am a Patient / Citizen": "मैं मरीज़ / नागरिक हूं",
            "I am an Admin / Officer": "मैं एडमिन / अधिकारी हूं",
            "Report an emergency, send an SOS, find nearby government facilities, check first-aid guidance and manage your verified health account.": "आपातकाल रिपोर्ट करें, SOS भेजें, नज़दीकी सरकारी सुविधाएं खोजें, प्राथमिक उपचार देखें और अपना सत्यापित स्वास्थ्य खाता संभालें।",
            "Duty-officer access to the Command Center: live emergency cases, bed management, medical inventory, ambulance fleet GPS and district-wide broadcasts.": "कमांड सेंटर तक ड्यूटी अधिकारी की पहुंच: लाइव आपातकालीन मामले, बेड प्रबंधन, चिकित्सा इन्वेंट्री, एम्बुलेंस फ्लीट GPS और जिला-व्यापी प्रसारण।",
            "Enter Citizen Portal": "नागरिक पोर्टल में जाएं",
            "Officer Login": "अधिकारी लॉगिन",

            /* ---- header / nav ---- */
            "Home": "मुख्यपृष्ठ",
            "Emergency": "आपातकाल",
            "Facilities": "सुविधाएं",
            "Find Facilities": "सुविधाएं खोजें",
            "Officer Login": "अधिकारी लॉगिन",
            "Sign In": "साइन इन",
            "Dashboard": "डैशबोर्ड",
            "Language / भाषा:": "भाषा चुनें:",

            /* ---- hero ---- */
            "Maharashtra Government Health Network": "महाराष्ट्र शासन स्वास्थ्य नेटवर्क",
            "Right Care.": "सही देखभाल।",
            "Right Facility.": "सही सुविधा।",
            "Right Now.": "अभी तुरंत।",
            "Emergency Mitra connects rural communities with the most suitable nearby government healthcare facility during emergencies, ensuring timely and appropriate care.": "इमर्जन्सी मित्र आपातकाल के दौरान ग्रामीण समुदायों को निकटतम उपयुक्त सरकारी स्वास्थ्य सुविधा से जोड़ता है, जिससे समय पर और उचित देखभाल सुनिश्चित होती है।",
            "Start Emergency": "आपातकाल शुरू करें",
            "SOS — SEND LOCATION": "SOS — लोकेशन भेजें",
            "For unconscious / unresponsive patient": "बेहोश / अनुत्तरदायी मरीज के लिए",

            /* ---- hero trust strip ---- */
            "Govt Healthcare Network": "सरकारी स्वास्थ्य नेटवर्क",
            "Low-Connectivity Support": "कम कनेक्टिविटी सहायता",
            "SMS Fallback": "एसएमएस फॉलबैक",
            "Hindi + English": "हिंदी + अंग्रेजी",
            "Offline Ready": "ऑफलाइन तैयार",
            "Govt Healthcare Network Govt Healthcare Network Low-Connectivity Support SMS Fallback हिंदी + English + मराठी": "सरकारी स्वास्थ्य नेटवर्क कम कनेक्टिविटी सहायता एसएमएस फॉलबैक हिंदी + English + मराठी",

            /* ---- advisory ---- */
            "Emergency Health Advisory": "आपातकालीन स्वास्थ्य परामर्श",
            "LIVE GUIDANCE": "लाइव मार्गदर्शन",
            "Snakebite": "सर्पदंश (सांप का काटना)",
            "Do not cut or suck the wound. Keep the patient still and reach antivenom-equipped care immediately.": "घाव को काटें या चूसें नहीं। मरीज को शांत रखें और तुरंत एंटीवेनम युक्त अस्पताल पहुँचें।",
            "Cardiac Emergency": "हृदय आपातकाल",
            "If the person is unresponsive and not breathing normally, begin CPR and seek emergency help immediately.": "यदि व्यक्ति अनुत्तरदायी है और सामान्य रूप से सांस नहीं ले रहा है, तो तुरंत सीपीआर शुरू करें और आपातकालीन सहायता लें।",
            "Severe Bleeding": "गंभीर रक्तस्राव",
            "Apply firm, continuous pressure with a clean cloth and seek emergency medical care.": "साफ कपड़े से लगातार दबाव बनाए रखें और तुरंत आपातकालीन चिकित्सा सहायता लें।",
            "Accident & Trauma": "दुर्घटना और ट्रॉमा",
            "Avoid unnecessary movement if a spinal or major injury is suspected. Call emergency services.": "रीढ़ या गंभीर चोट का संदेह होने पर अनावश्यक हलचल से बचें। आपातकालीन सेवाओं को कॉल करें।",
            "Emergency guidance • Not a diagnosis": "आपातकालीन मार्गदर्शन • यह चिकित्सा निदान नहीं है",

            /* ---- assistance cards ---- */
            "Immediate Emergency Assistance": "त्वरित आपातकालीन सहायता",
            "Select the type of emergency for rapid protocol activation.": "त्वरित प्रोटोकॉल सक्रिय करने के लिए आपातकाल का प्रकार चुनें।",
            "Snakebite Protocol": "सर्पदंश प्रोटोकॉल",
            "Find antivenom-equipped care.": "एंटीवेनम युक्त केंद्र खोजें।",
            "Accident & Trauma": "दुर्घटना और ट्रॉमा",
            "Trauma routing + first aid.": "ट्रॉमा रूटिंग + प्राथमिक उपचार।",
            "Cardiac Arrest": "कार्डियक अरेस्ट",
            "CPR + AED assistance.": "सीपीआर + एईडी सहायता।",
            "Emergency bleeding support.": "आपातकालीन रक्तस्राव नियंत्रण।",
            "Breathing Issue": "सांस लेने में तकलीफ",
            "Airway emergency support.": "श्वसन मार्ग आपातकालीन सहायता।",
            "CRITICAL": "अतिगंभीर",
            "URGENT": "अत्यावश्यक",

            /* ---- how it works ---- */
            "How Emergency Mitra Works": "इमर्जन्सी मित्र कैसे काम करता है",
            "Select Emergency": "आपातकाल चुनें",
            "Share Location": "लोकेशन साझा करें",
            "Smart Facility Matching": "स्मार्ट अस्पताल मिलान",
            "Navigate & Share": "नेविगेट और साझा करें",

            /* ---- advanced network ---- */
            "Advanced Emergency Network": "उन्नत आपातकालीन नेटवर्क",
            "From emergency detection to hospital readiness, Emergency Mitra connects the complete response chain.": "आपातकाल की पहचान से लेकर अस्पताल की तैयारी तक, इमर्जन्सी मित्र पूरी प्रतिक्रिया श्रृंखला को जोड़ता है।",
            "Pre-Arrival Handshake": "आगमन पूर्व अस्पताल समन्वय",
            "Alerts the destination hospital before arrival, ensuring staff and beds are ready.": "पहुंचने से पहले गंतव्य अस्पताल को सतर्क करता है, जिससे कर्मचारी और बेड तैयार रहते हैं।",
            "AI Preliminary Triage": "एआई प्रारंभिक ट्राइएज",
            "Intelligent symptom analysis prioritizes critical cases automatically.": "इंटेलिजेंट लक्षण विश्लेषण स्वचालित रूप से गंभीर मामलों को प्राथमिकता देता है।",
            "Ambulance Dispatch": "एम्बुलेंस प्रेषण (डिस्पैच)",
            "Automated dispatch of the nearest available emergency transport.": "निकटतम उपलब्ध आपातकालीन वाहन का स्वचालित प्रेषण।",
            "Resource Inventory": "संसाधन सूची (इन्वेंट्री)",
            "Real-time tracking of critical supplies across the healthcare network.": "स्वास्थ्य नेटवर्क में महत्वपूर्ण चिकित्सा आपूर्ति की वास्तविक समय ट्रैकिंग।",
            "Audio-First IVR": "ऑडियो-प्रथम आईवीआर",
            "Accessible voice-guided emergency reporting in local languages.": "स्थानीय भाषाओं में सुलभ आवाज-निर्देशित आपातकालीन रिपोर्टिंग।",
            "Offline Passport": "ऑफलाइन मेडिकल पासपोर्ट",
            "Locally stored critical medical history available instantly without internet.": "इंटरनेट के बिना तुरंत उपलब्ध स्थानीय रूप से संग्रहीत महत्वपूर्ण चिकित्सा इतिहास।",
            "Explore": "देखें",
            "READY": "तैयार",
            "AI SUPPORT": "एआई सपोर्ट",
            "DEMO": "डेमो",
            "PROTOTYPE": "प्रोटोटाइप",
            "OFFLINE": "ऑफलाइन",

            /* ---- online pill / offline panel ---- */
            "Online": "ऑनलाइन",
            "Offline": "ऑफलाइन",
            "Offline Status": "ऑफलाइन स्थिति",

            /* ---- facilities modal (static parts) ---- */
            "Find Healthcare Facilities": "स्वास्थ्य सुविधाएं खोजें",
            "Search facilities, services, or locations...": "सुविधाएं, सेवाएं या स्थान खोजें...",

            /* ---- footer ---- */
            "Privacy Policy": "गोपनीयता नीति",
            "Terms of Service": "सेवा की शर्तें",
            "Help Desk": "सहायता केंद्र (हेल्प डेस्क)",
            "Rural Outreach": "ग्रामीण संपर्क",
            "Accessibility": "सुलभता",
            "© 2026 Emergency Mitra • Rural Emergency Healthcare Network": "© 2026 इमर्जन्सी मित्र • ग्रामीण आपातकालीन स्वास्थ्य नेटवर्क",
            "© 2026 Emergency Mitra • Sessions expire automatically after 8": "© 2026 इमर्जन्सी मित्र • सत्र 8 घंटे बाद स्वतः समाप्त",

            /* ---- passport ---- */
            "Offline Emergency Passport": "ऑफलाइन आपातकालीन पासपोर्ट",
            "OFFLINE SYNCED": "ऑफलाइन सिंक किया गया",
            "Blood Group": "रक्त समूह",
            "Allergies": "एलर्जी",
            "Emergency Contact": "आपातकालीन संपर्क",
            "SCAN AT DESK": "डेस्क पर स्कैन करें",

            /* ---- triage wizard ---- */
            "Emergency Protocol": "आपातकालीन प्रोटोकॉल",
            "Step 1 of 3: Assessment": "चरण 1/3: मूल्यांकन",
            "Step 2 of 3: Hospital Handshake": "चरण 2/3: अस्पताल समन्वय",
            "Step 3 of 3: First Aid Guidance": "चरण 3/3: प्राथमिक उपचार मार्गदर्शन",
            "Bypass: Call 108": "बायपास: 108 पर कॉल करें",
            "Answer quickly to determine triage priority.": "ट्राइएज प्राथमिकता निर्धारित करने के लिए तुरंत उत्तर दें।",
            "Next Step": "अगला कदम",
            "Back": "पीछे",
            "Close Protocol": "प्रोटोकॉल बंद करें",

            /* ---- AI triage v2 ---- */
            "Symptom Checker": "लक्षण जांच",
            "Ask Mitra AI": "मित्र AI से पूछें",
            "AI is for decision support only and does not replace professional medical diagnosis.": "एआई केवल निर्णय सहायता के लिए है और पेशेवर चिकित्सा निदान का विकल्प नहीं है।",
            "WORKS OFFLINE": "ऑफलाइन काम करता है",
            "English (EN)": "अंग्रेजी (EN)",
            "हिंदी (HI)": "हिंदी (HI)",
            "मराठी (MR)": "मराठी (MR)",

            /* ---- handshake (citizen) ---- */
            "Request": "विनंती",
            "Call": "कॉल करें",
            "Map": "मैप",
            "Book": "बुक करें",

            /* ---- facilities finder (JS-rendered) ---- */
            "All Facilities": "सभी सुविधाएं",
            "Hospitals": "अस्पताल",
            "PHCs": "प्राथमिक स्वास्थ्य केंद्र",
            "Diagnostics": "जांचें (डायग्नोस्टिक्स)",
            "Maternity": "प्रसूति",
            "24×7 Open": "24×7 खुला",
            "24\u00d77 Open": "24×7 खुला",
            "Antivenom": "एंटीवेनम",
            "Hospital": "अस्पताल",
            "PHC": "प्राथमिक स्वास्थ्य केंद्र",
            "Directions": "रास्ता देखें",
            "Request Blood": "रक्त का अनुरोध करें",
            "Book Slot": "स्लॉट बुक करें",
            "Book Test": "जांच बुक करें",
            "Book Bed": "बेड बुक करें",
            "Readiness": "तैयारी",
            "NEAREST": "सबसे नज़दीक",
            "OPEN NOW": "अभी खुला",
            "CLOSED": "बंद",
            "FULL": "भरा हुआ",
            "BEDS LEFT": "बेड बचे",
            "BEDS AVAILABLE": "बेड उपलब्ध",
            "Beds Free": "खाली बेड",
            "Blood Units": "रक्त यूनिट",
            "Open 24×7": "24×7 खुला",
            "Open 24\u00d77": "24×7 खुला",
            "AV Vials": "एंटीवेनम शीशियां",
            "Snake Antivenom:": "सर्पदंश एंटीवेनम:",
            "vials": "शीशियां",
            "Use My Location": "मेरा स्थान उपयोग करें",
            "All Distances": "सभी दूरियां",
            "Blood Availability": "रक्त उपलब्धता",
            "Bed Availability": "बेड (खाट) उपलब्धता",
            "GPS denied — using Wardha centre as reference": "GPS अस्वीकृत — संदर्भ के लिए वर्धा केंद्र उपयोग हो रहा है",
            "Locations shared — nearest-first sorting on": "लोकेशन साझा की गई — निकटतम-पहले क्रम चालू",

            /* ---- handshake citizen view ---- */
            "RESERVED": "आरक्षित",
            "NOTIFIED": "सूचित",
            "WAITING": "प्रतीक्षा",
            "STANDBY": "तैयारी पर",
            "ACKNOWLEDGED": "स्वीकृत",
            "Replay simulation": "सिमुलेशन दोहराएं",
            "Medical Officer": "चिकित्सा अधिकारी",
            "Medical Officer Notified:": "चिकित्सा अधिकारी को सूचित किया गया:",
            "Antivenom / critical supplies": "एंटीवेनम / महत्वपूर्ण आपूर्ति",
            "Hospital response:": "अस्पताल की प्रतिक्रिया:",
            "Pre-Arrival Request —": "आगमन-पूर्व अनुरोध —",
            "min ETA": "मिनट में पहुंच",
            "📡 Request sent to the duty officer. The hospital will acknowledge shortly — this screen updates by itself. For any emergency call 108.": "📡 अनुरोध ड्यूटी अधिकारी को भेजा गया। अस्पताल शीघ्र स्वीकार करेगा — यह स्क्रीन स्वयं अपडेट होती है। किसी भी आपातकाल में 108 कॉल करें।",
            "accepted — bed": "ने स्वीकार किया — बेड",
            "reserved for this case, medical team on standby.": "इस मामले के लिए आरक्षित, चिकित्सा टीम तैयार।",
            "at capacity — case auto-rerouted to": "क्षमता पूरी — मामला स्वतः पुनर्निर्देशित",

            /* ---- handshake admin panel (interpolated labels) ---- */
            "Trust score": "विश्वसनीयता स्कोर",
            "Bed required": "आवश्यक बेड",
            "Requested:": "अनुरोध:",
            "PENDING — ACTION NEEDED": "लंबित — कार्रवाई जरूरी",
            "DECLINED → REROUTED": "अस्वीकृत → पुनर्निर्देशित",
            "Acknowledge & Reserve Bed": "स्वीकार करें और बेड आरक्षित करें",
            "Ambulance incoming — ETA": "एम्बुलेंस आ रही है — पहुंच समय",
            "min. Decide before arrival to guarantee the bed.": "मिनट। पहुंचने से पहले निर्णय लें ताकि बेड पक्का हो।",
            "Bed reserved & citizen auto-notified • decided by": "बेड आरक्षित और नागरिक को सूचित • निर्णय",
            "Case rerouted to": "मामला पुनर्निर्देशित",
            "No incoming handshakes": "कोई आगमन-पूर्व समन्वय नहीं",
            "Simulate Incoming": "नया अनुरोध भेजें",
            "Pre-Arrival Handshake Requests": "आगमन-पूर्व समन्वय अनुरोध",
            "Acknowledge & Reserve": "स्वीकार करें और आरक्षित करें",
            "Decline & Reroute": "अस्वीकार करें और पुनर्निर्देशित करें",

            /* ---- admin statuses ---- */
            "EN ROUTE": "रास्ते में",
            "AVAILABLE": "उपलब्ध",
            "EN ROUTE": "रास्ते में",

            /* ---- admin: header + login ---- */
            "Open Dashboard": "डैशबोर्ड खोलें",
            "Logout": "लॉगआउट",
            "Command Center": "कमांड सेंटर",
            "Emergency Mitra — Command Center": "इमर्जन्सी मित्र — कमांड सेंटर",
            "Duty Officer": "ड्यूटी अधिकारी",
            "Duty Officer Console": "ड्यूटी अधिकारी कंसोल",
            "Command Center session active": "कमांड सेंटर सत्र सक्रिय",
            "Use Open Dashboard (top-right) to manage live cases, bed availability, inventory, ambulance fleet, the district map and broadcasts. The dashboard reopens automatically on every visit.": "लाइव मामलों, बेड उपलब्धता, इन्वेंट्री, एम्बुलेंस फ्लीट, जिला नक्शा और प्रसारण प्रबंधन के लिए डैशबोर्ड खोलें (ऊपर-दाएं)। डैशबोर्ड हर बार स्वतः खुलता है।",
            "Officer ID": "अधिकारी आईडी",
            "Password": "पासवर्ड",
            "Duty Officer Sign-In": "ड्यूटी अधिकारी साइन-इन",
            "Restricted area — Emergency Mitra Command Center": "प्रतिबंधित क्षेत्र — इमर्जन्सी मित्र कमांड सेंटर",
            "Enter Command Center": "कमांड सेंटर में प्रवेश करें",
            "Back to portal": "पोर्टल पर वापस",
            "Prototype credentials:": "प्रोटोटाइप क्रेडेंशियल:",
            "or": "या",
            "Replace js/admin-auth.js with real ABAC/SSO before production.": "प्रोडक्शन से पहले js/admin-auth.js को असली ABAC/SSO से बदलें।",

            /* ---- admin: tabs ---- */
            "Overview": "ओवरव्यू",
            "Active Cases": "सक्रिय मामले",
            "Critical": "गंभीर",
            "Bed Management": "बेड प्रबंधन",
            "Patients": "मरीज़",
            "Medical Inventory": "चिकित्सा इन्वेंट्री",
            "Fleet & GPS": "फ्लीट और GPS",
            "Live Map": "लाइव नक्शा",
            "Broadcast Alert": "प्रसारण अलर्ट",
            "New": "नए",

            /* ---- admin: KPI ---- */
            "Active Emergencies": "सक्रिय आपातकाल",
            "Available ICU Beds": "उपलब्ध आईसीयू बेड",
            "Antivenom Stock": "एंटीवेनम स्टॉक",
            "Vials": "शीशियां",
            "Ambulances En Route": "रास्ते में एम्बुलेंस",
            "Pre-Arrival Handshakes": "आगमन-पूर्व समन्वय",
            "Offline Sync Sessions": "ऑफलाइन सिंक सत्र",

            /* ---- admin: handshake panel ---- */
            "Pre-Arrival Handshake Requests": "आगमन-पूर्व समन्वय अनुरोध",
            "Incoming ambulance pre-alerts from citizens & the 108 gateway — acknowledge to reserve beds, or reroute.": "नागरिकों और 108 गेटवे से आने वाली एम्बुलेंस प्री-अलर्ट — बेड आरक्षित करने के लिए स्वीकार करें, या पुनर्निर्देशित करें।",
            "PENDING": "लंबित",
            "ACK": "स्वीकृत",
            "REROUTED": "पुनर्निर्देशित",
            "Acknowledge & Reserve Bed": "स्वीकार करें और बेड आरक्षित करें",
            "Decline & Reroute": "अस्वीकार करें और पुनर्निर्देशित करें",
            "No incoming handshakes": "कोई आगमन-पूर्व समन्वय नहीं",
            "Patient": "मरीज",
            "Hospital": "अस्पताल",

            /* ---- admin: broadcast ---- */
            "District-Wide Emergency Broadcast": "जिला-व्यापी आपातकालीन प्रसारण",
            "Dispatch District Broadcast Now": "जिला प्रसारण अभी भेजें",

            /* ---- admin: tables ---- */
            "Status": "स्थिति",
            "Priority": "प्राथमिकता",
            "Trust": "विश्वास",
            "ETA": "पहुंच समय",
            "Action": "कार्रवाई",
            "Resource": "संसाधन",
            "Quantity": "मात्रा",
            "Last Updated": "अंतिम अपडेट",

            /* ---- tutorial ---- */
            "Officer Login — Command Center Behind Credentials": "अधिकारी लॉगिन — क्रेडेंशियल के पीछे कमांड सेंटर",

            /* ============================================================
               EMERGENCY WIZARD (app.js ewData) — every kind of line
               ============================================================ */
            "What type of emergency are you facing?": "आप किस तरह का आपातकाल झेल रहे हैं?",
            "Speak Your Emergency — बोलकर बताएं": "बोलकर बताएं — Speak Your Emergency",
            "VOICE DETECTED": "आवाज पहचानी गई",
            "Listening... describe the emergency (tap to stop)": "सुन रहा हूं… आपातकाल बताएं (रोकने के लिए टैप करें)",
            "Voice mode is not supported in this browser.": "इस ब्राउज़र में वॉइस मोड समर्थित नहीं है।",
            "Please select the emergency type below instead.": "कृपया नीचे से आपातकाल का प्रकार चुन लें।",
            "Animal Bite": "जानवर का काटना",
            "Dog, Cat, Snake, Insect...": "कुत्ता, बिल्ली, सांप, कीड़ा…",
            "Accident / Trauma": "दुर्घटना / ट्रॉमा",
            "Road, fall, collision...": "सड़क, गिरना, टक्कर…",
            "Chemical Exposure": "रासायनिक संपर्क",
            "Acid, pesticide, gas leak...": "एसिड, कीटनाशक, गैस लीक…",
            "Cardiac / Chest": "हृदय / सीने संबंधी",
            "Heart attack, chest pain...": "हार्ट अटैक, सीने का दर्द…",
            "Cuts, wounds, haemorrhage...": "कट, घाव, रक्तस्राव…",
            "Breathing, poisoning, burns...": "सांस, ज़हर, जलने…",
            "Step 1 of 4: Select Emergency Type": "चरण 1/4: आपातकाल का प्रकार चुनें",
            "Step 2 of 4: Select Sub-Type": "चरण 2/4: उप-प्रकार चुनें",
            "Step 3 of 4: Check Symptoms": "चरण 3/4: लक्षण चुनें",
            "Step 4 of 4: Assistance & Guidance": "चरण 4/4: सहायता और मार्गदर्शन",
            "🐾 Animal Bite": "🐾 जानवर का काटना",
            "Which animal caused the bite?": "किस जानवर ने काटा?",
            "🐕 Dog": "🐕 कुत्ता", "🐈 Cat": "🐈 बिल्ली", "🐍 Snake": "🐍 सांप",
            "🐒 Monkey": "🐒 बंदर", "🐝 Insect / Bee": "🐝 कीड़ा / मधुमक्खी",
            "🐀 Rat / Rodent": "🐀 चूहा", "🦁 Wild Animal": "🦁 जंगली जानवर",
            "❓ Other Animal": "❓ अन्य जानवर",
            "Bleeding from wound": "घाव से खून", "Swelling around bite": "काटने के आसपास सूजन",
            "Redness / Warmth": "लालिमा / गर्माहट", "Pain at site": "जगह पर दर्द",
            "Nausea / Vomiting": "जी मिचलाना / उल्टी", "Muscle spasms": "मांसपेशी झटके",
            "Difficulty swallowing (rabies sign)": "निगलने में तकलीफ (रेबीज का लक्षण)",
            "Puncture wound": "छेद वाला घाव", "Discharge from wound": "घाव से स्राव",
            "Swelling spreading rapidly": "तेज़ी से फैलती सूजन", "Discolouration at bite site": "काट की जगह रंग बदलना",
            "Bleeding from gums": "मसूड़ों से खून", "Muscle weakness / paralysis": "मांसपेशी कमजोरी / पक्षाघात",
            "Loss of consciousness": "बेहोशी", "Localised swelling": "स्थानीय सूजन",
            "Hives / Rash": "पित्ती / दाने", "Difficulty breathing (anaphylaxis)": "सांस लेने में तकलीफ (एनाफाइलैक्सिस)",
            "Throat tightening": "गला कसना", "Dizziness / Fainting": "चक्कर / बेहोशी",
            "Severe pain": "तेज़ दर्द", "Wound / Scratch": "घाव / खरोंच",
            "Deep laceration / Tear": "गहरा कटाव / फटा घाव", "Shock / Pale skin": "शॉक / पीली त्वचा",
            "Broken bones": "टूटी हड्डियां", "Bleeding": "खून बहना", "Swelling": "सूजन",
            "Redness": "लालिमा", "Headache": "सिरदर्द", "Nausea": "जी मिचलाना",
            "Wash wound with soap and water for 15 min": "घाव को 15 मिनट साबुन और पानी से धोएं",
            "Apply antiseptic": "एंटीसेप्टिक लगाएं", "Cover with clean bandage": "साफ पट्टी से बांधें",
            "Seek anti-rabies vaccination immediately": "तुरंत एंटी-रेबीज टीका लगवाएं",
            "Note dog vaccination status if possible": "संभव हो तो कुत्ते के टीके की जानकारी नोट करें",
            "Wash wound thoroughly with soap and water": "घाव को साबुन-पानी से अच्छी तरह धोएं",
            "Seek tetanus & rabies prophylaxis": "टेटनस व रेबीज टीका लगवाएं",
            "Monitor for infection signs": "संक्रमण के लक्षणों पर नज़र रखें",
            "Keep patient still and calm": "मरीज को शांत और स्थिर रखें",
            "Immobilise the bitten limb at or below heart level": "काटे गए अंग को दिल की स्तर पर या नीचे स्थिर रखें",
            "Remove tight items (rings, watches)": "कसी हुई चीज़ें (अंगूठी, घड़ी) हटाएं",
            "Rush to antivenom-equipped hospital": "एंटीवेनम वाले अस्पताल तुरंत जाएं",
            "Note snake appearance if safe to do so": "सुरक्षित हो तो सांप का रूप याद रखें",
            "Seek rabies vaccination urgently": "जल्दी रेबीज टीका लगवाएं",
            "Report to health authority": "स्वास्थ्य विभाग को सूचित करें",
            "Remove stinger if visible (scrape, do not squeeze)": "सुई दिखे तो हटाएं (खुरचें, न दबाएं)",
            "Apply cold pack to site": "ठंडी सिकाई करें", "Give antihistamine if available": "एंटीहिस्टामिन हो तो दें",
            "Use EpiPen if anaphylaxis and prescribed": "एनाफिलैक्सिस में बताई गई हो तो एपिपेन लगाएं",
            "Monitor for rat-bite fever symptoms": "चूहे के काटने के बुखार के लक्षण देखें",
            "Control bleeding with firm pressure": "जोर से दबाकर खून रोकें", "Immobilise injured area": "घायल भाग स्थिर रखें",
            "Keep patient warm": "मरीज को गर्म रखें", "Call emergency transport immediately": "तुरंत एम्बुलेंस बुलाएं",
            "Seek medical evaluation and anti-rabies advice": "चिकित्सा जांच व रेबीज सलाह लें",
            "Do not ignore even minor bites": "छोटे काटने को भी नज़रअंदाज़ न करें",
            "Do not close wound tightly before cleaning": "साफ करने से पहले घाव कसकर न बांधें",
            "Do not delay rabies vaccination": "रेबीज टीका टालें नहीं",
            "Do not ignore cat scratches — risk of infection is high": "बिल्ली के खरोंच को नज़रअंदाज़ न करें — संक्रमण का खतरा ज्यादा है",
            "Do not close puncture wounds immediately": "छेद वाले घाव तुरंत बंद न करें",
            "Do not cut or suck the wound": "घाव न काटें या चूसें नहीं",
            "Do not apply tourniquet or ice": "टूर्निकेट या बर्फ न लगाएं", "Do not give alcohol": "शराब न दें",
            "Do not allow patient to walk": "मरीज को चलने न दें",
            "Do not delay medical attention": "इलाज में देरी न करें", "Do not use home remedies": "घरेलू नुस्खे न आज़माएं",
            "Do not squeeze stinger": "सुई को न दबाएं", "Do not rub the area": "जगह को न रगड़ें",
            "Do not give antihistamines if unconscious": "बेहोश हो तो एंटीहिस्टामिन न दें",
            "Do not ignore — rat bites can cause leptospirosis": "नज़रअंदाज़ न करें — चूहे के काटने से लेप्टोस्पायरोसिस हो सकता है",
            "Do not apply dirt or mud": "मिट्टी या कीचड़ न लगाएं",
            "Do not move patient unless safe": "सुरक्षित न हो तो मरीज हिलाएं नहीं",
            "Do not remove impaled objects": "धंसी वस्तुएं न निकालें", "Do not give food or water": "खाना या पानी न दें",
            "Do not ignore the bite": "काटने को नज़रअंदाज़ न करें", "Do not apply mud or turmeric": "मिट्टी या हल्दी न लगाएं",
            "🚗 Accident / Trauma": "🚗 दुर्घटना / ट्रॉमा",
            "What type of accident occurred?": "कैसा दुर्घटना हुई?",
            "🛣️ Road Accident": "🛣️ सड़क दुर्घटना", "⬇️ Fall / Height": "⬇️ गिरना / ऊंचाई से",
            "🔥 Fire / Burns": "🔥 आग / जलना", "💧 Drowning": "💧 डूबना",
            "Severe bleeding": "अत्यधिक रक्तस्राव", "Suspected bone fracture": "हड्डी टूटने का शक",
            "Head / neck injury": "सिर / गर्दन की चोट", "Spinal injury suspected": "रीढ़ की चोट का शक",
            "Chest pain": "सीने का दर्द", "Back / spine pain": "पीठ / रीढ़ में दर्द",
            "Head / neck injury": "सिर / गर्दन की चोट", "Fracture / deformity": "फ्रैक्चर / विकृति",
            "Burns on skin": "त्वचा पर जलन", "Smoke inhalation / difficulty breathing": "धुआं सांस अंदर / दम घुटना",
            "Blisters": "फफोले", "Charred skin": "जली त्वचा", "Eye irritation": "आंखों में जलन",
            "Chest tightness": "सीने में जकड़न", "Not breathing": "सांस नहीं ले रहा",
            "Unresponsive": "अनुत्तरदायी", "Coughing / choking": "खांसी / घुटन",
            "Blue lips": "नीले होंठ", "Vomiting water": "पानी की उल्टी",
            "Confusion": "भ्रम", "Spurting blood": "उछलता खून",
            "Ensure scene safety": "पहले जगह की सुरक्षा देखें", "Apply direct pressure to bleeding": "खून पर सीधा दबाव डालें",
            "Stabilise neck if spinal injury suspected": "रीढ़ की चोट के शक में गर्दन स्थिर रखें",
            "Call emergency services immediately": "तुरंत आपातकालीन सेवा कॉल करें", "Keep patient warm": "मरीज को गर्म रखें",
            "Do not move patient": "मरीज को हिलाएं नहीं", "Stabilise head/neck": "सिर/गर्दन स्थिर रखें",
            "Check breathing and pulse": "सांस और नाड़ी जांचें",
            "Move to fresh air": "ताज़ी हवा में ले जाएं", "Cool burn with running water 10-20 min": "जले भाग को 10-20 मिनट बहते पानी से ठंडा करें",
            "Cover with clean damp cloth": "साफ गीले कपड़े से ढकें", "Do not pop blisters": "फफोले न फोड़ें",
            "Start rescue breaths immediately": "तुरंत आर्टिफिशियल श्वास शुरू करें", "Begin CPR if no pulse": "नाड़ी न हो तो CPR शुरू करें",
            "Turn patient sideways after resuscitation": "होश में लाने के बाद मरीज को करवट पर लिटाएं",
            "Do not move unless in danger": "खतरे में न हों तो हिलाएं नहीं",
            "Do not twist or bend the spine": "रीढ़ को घुमाएं या मोड़ें नहीं",
            "Do not move neck without support": "सहारा दिए बिना गर्दन न हिलाएं",
            "Do not use ice on burns": "जले हिस्से पर बर्फ न लगाएं",
            "Do not apply toothpaste or butter": "टूथपेस्ट या मक्खन न लगाएं",
            "Do not remove burnt clothing stuck to skin": "चिपके जले कपड़े न उतारें",
            "Do not leave alone": "अकेला न छोड़ें", "Do not delay CPR": "CPR में देरी न करें",
            "☣️ Chemical Exposure": "☣️ रासायनिक संपर्क",
            "What type of chemical exposure?": "कैसी रासायनिक संपर्क?",
            "⚗️ Acid / Alkali": "⚗️ एसिड / क्षार", "🌾 Pesticide / Insecticide": "🌾 कीटनाशक",
            "💨 Gas / Fume Inhalation": "💨 गैस / धुएं का सांस लेना", "❓ Unknown Chemical": "❓ अज्ञात रसायन",
            "Burning pain on skin/eye": "त्वचा/आंखों में जलन वाला दर्द", "Redness / blistering": "लालिमा / फफोले",
            "Blurred vision": "धुंधला दिखना", "Excessive saliva / tearing": "लार / आंसू बहना",
            "Muscle tremors": "मांसपेशी में कंपकंपी", "Seizures": "दौरे", "Pinpoint pupils": "सिकुड़ी पुतलियां",
            "Coughing / choking": "खांसी / घुटन", "Skin redness / rash": "त्वचा पर लालिमा / दाने",
            "Eye / throat irritation": "आंख / गले में जलन", "Flush affected area with large amounts of water for 15-20 min": "प्रभावित जगह को 15-20 मिनट खूब पानी से धोएं",
            "Remove contaminated clothing": "दूषित कपड़े उतारें", "Cover with sterile dressing": "बाँझ पट्टी से ढकें",
            "Seek emergency care immediately": "तुरंत आपातकालीन देखभाल लें",
            "Remove from exposure": "संपर्क से दूर ले जाएं", "Flush skin with water": "त्वचा को पानी से धोएं",
            "Seek emergency care — antidote (atropine) required": "तुरंत अस्पताल जाएं — एंटीडोट (एट्रोपीन) जरूरी",
            "Move to fresh air immediately": "तुरंत ताज़ी हवा में जाएं", "Loosen tight clothing": "कसे कपड़े ढीले करें",
            "Give oxygen if available": "ऑक्सीजन हो तो दें",
            "Flush skin and eyes with water": "त्वचा और आंखें पानी से धोएं",
            "Bring chemical container/label to hospital": "कंटेनर/लेबल अस्पताल ले जाएं",
            "Do not neutralise acid with alkali on skin": "त्वचा पर एसिड को क्षार से भिगोएं नहीं",
            "Do not induce vomiting if swallowed": "निगलने पर उल्टी न कराएं",
            "Do not induce vomiting if organophosphate poisoning suspected": "ऑर्गेनोफॉस्फेट विष के शक में उल्टी न कराएं",
            "Do not re-enter gas-filled area without protection": "बिना सुरक्षा गैसभरे इलाके में न जाएं",
            "Do not give mouth-to-mouth without barrier device": "बिना बैरियर डिवाइस माउथ-टू-माउथ न करें",
            "Do not neutralise without knowing the chemical": "रसायन जाने बिना तटस्थीकरण न करें",
            "Do not induce vomiting unless directed by Poison Control": "पॉइज़न कंट्रोल के कहने के बिना उल्टी न कराएं",
            "💔 Cardiac / Chest": "💔 हृदय / सीना",
            "What best describes the situation?": "स्थिति को सबसे अच्छा कैसे बताता है?",
            "💔 Heart Attack": "💔 हार्ट अटैक", "❤️ Cardiac Arrest (No pulse)": "❤️ कार्डियक अरेस्ट (नाड़ी बंद)",
            "😣 Chest Pain": "😣 सीने में दर्द", "💓 Palpitations": "💓 धड़कन तेज़",
            "Severe chest pain / pressure": "सीने में तेज़ दर्द / दबाव", "Pain radiating to arm, jaw, neck": "बांह, जबड़े, गर्दन तक दर्द",
            "Shortness of breath": "सांस की खतरनाक कमी", "Sweating profusely": "भरपूर पसीना",
            "Pale / Ashen skin": "पीली / राख जैसी त्वचा", "No pulse / Not breathing": "नाड़ी बंद / सांस रुकी",
            "Gasping or no breath sounds": "हांफना या सांस बंद", "Collapsed suddenly": "अचानक बेहोश गिरना",
            "Sharp or dull chest pain": "तेज़ या सुन्न सीने का दर्द", "Worsens with breathing": "सांस लेने से बढ़े",
            "Tenderness on pressing chest": "छाती दबाने पर दर्द", "Rapid / irregular heartbeat": "तेज़ / अनियमित धड़कन",
            "Pounding in chest": "छाती में घनघनाहट", "Fainting": "बेहोशी जैसा",
            "Call 108 immediately": "तुरंत 108 कॉल करें", "Have patient sit/lie comfortably": "मरीज को आराम से बैठाएं",
            "Give aspirin 325mg if available and not allergic": "एस्पिरिन 325mg हो और एलर्जी न हो तो दें",
            "Keep patient calm and warm": "मरीज को शांत और गर्म रखें",
            "Start CPR immediately (30 compressions : 2 breaths)": "तुरंत CPR शुरू करें (30 दबाव : 2 सांस)",
            "Use AED if available": "AED हो तो उपयोग करें", "Do not stop until help arrives": "मदद आने तक न रुकें",
            "Have patient rest": "मरीज को आराम दें", "Monitor vital signs": "वाइटल साइन देखें",
            "Seek medical evaluation": "चिकित्सा जांच करवाएं", "Take slow deep breaths": "धीमी गहरी सांस लें",
            "Avoid caffeine/stimulants": "कैफीन/स्टिमुलेंट से बचें", "Seek medical advice": "डॉक्टर की सलाह लें",
            "Do not leave patient alone": "मरीज को अकेला न छोड़ें", "Do not give water or food": "पानी या भोजन न दें",
            "Do not delay calling 108": "108 कॉल में देरी न करें",
            "Do not delay CPR even for a minute": "CPR में एक मिनट की भी देरी न करें",
            "Do not give up until professionals take over": "पेशेवर आने तक हार न मानें",
            "Do not ignore — seek evaluation": "नज़रअंदाज़ न करें — जांच करवाएं",
            "Do not self-medicate without advice": "बिना सलाह दवा न लें", "Do not panic": "घबराएं नहीं",
            "Do not consume energy drinks": "एनर्जी ड्रिंक न पिएं",
            "🩸 Severe Bleeding": "🩸 गंभीर रक्तस्राव",
            "Where is the bleeding?": "खून कहां से बह रहा है?",
            "💪 Arm / Leg": "💪 बांह / टांग", "🧠 Head / Face": "🧠 सिर / चेहरा",
            "🫁 Chest / Abdomen": "🫁 छाती / पेट", "🩺 Suspected Internal": "🩺 अंदरूनी रक्तस्राव का शक",
            "Bright red / spurting blood": "लाल / फव्वारे जैसा खून", "Wound won't stop bleeding": "घाव से खून रुक नहीं रहा",
            "Pale / Cold skin": "पीली / ठंडी त्वचा", "Weakness": "कमजोरी",
            "Blood from scalp / face": "सिर / चेहरे से खून", "Unequal pupils": "असमान पुतलियां",
            "Breathing difficulty": "सांस लेने में तकलीफ", "Coughing blood": "खांसी में खून",
            "Abdominal rigidity": "पेट कठोर", "Shock signs": "शॉक के संकेत",
            "Rapid weak pulse": "तेज़ और कमजोर नाड़ी", "No visible wound": "कोई घाव दिख नहीं रहा",
            "Vomiting blood": "खून की उल्टी", "Apply firm direct pressure with clean cloth": "साफ कपड़े से जोर से सीधा दबाव दें",
            "Elevate limb above heart level": "अंग को दिल से ऊपर उठाएं",
            "Apply tourniquet above wound if bleeding uncontrolled": "खून रुक न रहे तो घाव के ऊपर टूर्निकेट लगाएं",
            "Keep patient lying down": "मरीज को लिटाए रखें",
            "Apply gentle pressure — do not press if skull fracture suspected": "हल्का दबाव दें — खोपड़ी फ्रैक्चर के शक में दबाएं नहीं",
            "Protect airway": "सांस का रास्ता साफ रखें",
            "Seal chest wound with occlusive dressing": "छाती के घाव को हवा-रोधी पट्टी से बंद करें",
            "Call 108 — this is life-threatening": "108 कॉल करें — यह जानलेवा स्थिति है", "Keep warm": "गर्म रखें",
            "Do not remove soaked bandages — add layers": "भीगे पट्टे न हटाएं — ऊपर और बांधें",
            "Do not peek at wound unnecessarily": "घाव को बार-बार न खोलें",
            "Do not apply tight pressure if skull fracture suspected": "खोपड़ी फ्रैक्चर के शक में कसकर न दबाएं",
            "Do not press abdomen hard": "पेट पर जोर से न दबाएं",
            "Do not give pain killers that thin blood (e.g. aspirin)": "खून पतला करने वाली दवा (जैसे एस्पिरिन) न दें",
            "🆘 Other Emergency": "🆘 अन्य आपातकाल",
            "😮‍💨 Breathing Difficulty": "😮‍💨 सांस में तकलीफ", "☠️ Poisoning / Overdose": "☠️ ज़हर / ओवरडोज़",
            "🔥 Burns / Scalds": "🔥 जलना", "⚡ Seizure / Epilepsy": "⚡ दौरा / मिर्गी",
            "Unable to speak in full sentences": "पूरे वाक्य में बोलने में असमर्थ",
            "Wheezing / Stridor sounds": "सांस में सीटी / घरघन आवाज़", "Rapid shallow breathing": "तेज़ छोटी सांसें",
            "Confusion / Agitation": "भ्रम / बेचैनी", "Choking": "घुटन", "Diarrhoea": "दस्त",
            "Confusion / Drowsiness": "भ्रम / बौखलाहट", "Red painful skin": "दर्दनाक लाल त्वचा",
            "Charred or white skin": "जली या सफेद त्वचा", "Breathing difficulty (inhalation)": "सांस तकलीफ (धुएं से)",
            "Convulsions / Jerking movements": "झटके / ठपठपाहट", "Staring blankly": "देखते रह जाना",
            "Confusion after episode": "दौरे के बाद भ्रम", "Tongue biting": "जीभ काटना",
            "Loss of bladder control": "पेशाब पर नियंत्रण खोना",
            "Sit patient upright": "मरीज को सीधा बैठाएं", "Assist with prescribed inhaler": "पर्चे वाला इनहेलर लगाने में मदद करें",
            "Call 108 immediately if worsening": "बढ़ती तकलीफ में तुरंत 108 कॉल करें",
            "Call Poison Control / 108": "ज़हर नियंत्रण केंद्र / 108 कॉल करें",
            "Bring poison container to hospital": "ज़हर का कंटेनर अस्पताल ले जाएं",
            "Keep patient awake if possible": "संभव हो तो मरीज को जागते रखें",
            "Give water if caustic substance swallowed (unless directed otherwise)": "तेज़ाबी पदार्थ निगला हो तो पानी दें (निर्देश हो तो)",
            "Cool burn with running water 10-20 min": "जले भाग को 10-20 मिनट बहते पानी से ठंडा करें",
            "Remove jewellery near burn": "जले हिस्से के पास गहने हटाएं",
            "Seek hospital care for any significant burn": "बड़े जलने पर अस्पताल ले जाएं",
            "Protect from injury — clear hard objects": "चोट से बचाएं — कठोर वस्तुएं हटाएं",
            "Place on side (recovery position)": "करवट पर लिटाएं", "Time the seizure": "दौरे का समय नोट करें",
            "Stay calm and reassure patient after": "बाद में मरीज को शांत रखें और हिम्मत दें",
            "Do not force patient to lie down": "मरीज को ज़बरदस्ती लिटाएं नहीं",
            "Do not give milk or food without medical advice": "बिना सलाह दूध या भोजन न दें",
            "Do not use ice": "बर्फ न उपयोग करें", "Do not apply butter, toothpaste or oil": "मक्खन, टूथपेस्ट या तेल न लगाएं",
            "Do not restrain the person": "व्यक्ति को रोकें नहीं", "Do not put anything in mouth": "मुंह में कुछ भी न डालें",
            "Do not give water until fully conscious": "पूरी तरह होश में आने तक पानी न दें",
            " symptom(s) reported": " लक्षण बताए गए",
            "No specific symptoms selected": "कोई विशेष लक्षण नहीं चुना",
            "⚡ Call 108 immediately! This is a life-threatening emergency.": "⚡ तुरंत 108 कॉल करें! यह जानलेवा आपातकाल है।",
            "DO": "करें", "DON'T": "न करें",
            "Reported Symptoms": "बताए गए लक्षण",
            "✅ Pre-arrival alert sent to hospital via SMS gateway": "✅ अस्पताल को एसएमएस गेटवे से आगमन-पूर्व सूचना भेजी गई",
            "✅ Ambulance dispatch request initiated — ETA ~12 min": "✅ एम्बुलेंस पाठवने का अनुरोध शुरू — पहुंच समय ~12 मिनट",
            "✅ Emergency team on standby": "✅ आपातकालीन टीम तैयार",
            "Check all symptoms present for: ": "मौजूद लक्षण चुनें: ",
            "Anti-Fake Trust Score": "एंटी-फेक विश्वसनीयता स्कोर",
            "Trust": "विश्वास",
            "HIGH — AUTO-DISPATCH": "उच्च — स्वतः डिस्पैच",
            "MEDIUM — OPERATOR CONFIRM": "मध्यम — ऑपरेटर पुष्टि",
            "LOW — VOLUNTEER VERIFY": "कम — स्वयंसेवी सत्यापन",

            /* ---- account hub (account.js) ---- */
            "Basic Details": "मूल विवरण",
            "Save Details": "विवरण सेव करें",
            "Mobile Verification": "मोबाइल सत्यापन",
            "ABHA ID (Ayushman Bharat Health Account)": "ABHA आईडी (आयुष्मान भारत हेल्थ अकाउंट)",
            "DigiLocker Aadhaar eKYC": "डिजिलॉकर आधार eKYC",
            "Emergency Contact (notified on your SOS)": "आपातकालीन संपर्क (आपके SOS पर सूचित)",

            /* ---- shared footer ---- */
            "Emergency Helplines": "आपातकालीन हेल्पलाइन",
            "Quick Links": "त्वरित लिंक",
            "Information": "जानकारी",
            "Contact": "संपर्क",
            "National Emergency": "राष्ट्रीय आपातकाल",
            "Women Helpline": "महिला हेल्पलाइन",
            "Child Helpline": "बाल हेल्पलाइन",
            "Disaster Mgmt": "आपदा प्रबंधन",
            "Ambulance": "एम्बुलेंस",
            "Government of Maharashtra": "महाराष्ट्र शासन",
            "connecting rural communities to the right government healthcare facility in the golden hour.": "गोल्डन आवर में ग्रामीण समुदायों को सही सरकारी स्वास्थ्य सुविधा से जोड़ना।",
            "OFFLINE READY": "ऑफलाइन तैयार",
            "SMS FALLBACK": "एसएमएस फॉलबैक",
            "TRUST SCORED": "विश्वसनीयता स्कोर",
            "Citizen Portal": "नागरिक पोर्टल",
            "Command Center": "कमांड सेंटर",
            "Office of the District Health Officer,": "जिला स्वास्थ्य अधिकारी कार्यालय,",
            "Collector Campus, Wardha — 442001, Maharashtra": "कलेक्टर परिसर, वर्धा — 442001, महाराष्ट्र",
            "Control Room: 24×7 • Help Desk: 9 AM – 9 PM": "नियंत्रण कक्ष: 24×7 • हेल्प डेस्क: सुबह 9 – रात 9",
            "False emergency reports are punishable under BNS §54 / IPC §182": "झूठी आपातकालीन रिपोर्ट BNS §54 / IPC §182 के तहत दंडनीय है",
        },

        /* ============================================================
           MARATHI — complete dictionary (was 2 entries before)
           ============================================================ */
        mr: {
            /* ---- role chooser ---- */
            "Who are you?": "आपण कोण आहात?",
            "Emergency Mitra": "इमर्जन्सी मित्र",
            "Right Care. Right Facility. Right Now.": "योग्य उपचार. योग्य सुविधा. तत्काळ.",
            "Right Care. Right Facility. Right Now. — Tell us who you are, and we will take you to the right place.": "योग्य उपचार. योग्य सुविधा. तत्काळ. — आपण कोण आहात ते सांगा, आम्ही तुम्हाला योग्य ठिकाणी घेऊन जाऊ.",
            "I am a Patient / Citizen": "मी रुग्ण / नागरिक आहे",
            "I am an Admin / Officer": "मी प्रशासक / अधिकारी आहे",
            "Report an emergency, send an SOS, find nearby government facilities, check first-aid guidance and manage your verified health account.": "आपत्कालीन परिस्थिती नोंदवा, SOS पाठवा, जवळच्या सरकारी सुविधा शोधा, प्राथमिक उपचार मार्गदर्शन पहा आणि तुमचे सत्यापित आरोग्य खाते व्यवस्थापित करा.",
            "Duty-officer access to the Command Center: live emergency cases, bed management, medical inventory, ambulance fleet GPS and district-wide broadcasts.": "कमांड सेंटरकडे कर्तव्यदर्शक अधिकाऱ्याची प्रवेश: थेट आपत्कालीन प्रकरणे, बेड व्यवस्थापन, वैद्यकीय सामग्री, रुग्णवाहिका ताफा GPS आणि जिल्हाव्यापी प्रसारण.",
            "Enter Citizen Portal": "नागरिक पोर्टलमध्ये प्रवेश",

            /* ---- header / nav ---- */
            "Home": "मुख्यपृष्ठ",
            "Emergency": "आपत्कालीन",
            "Facilities": "सुविधा",
            "Find Facilities": "सुविधा शोधा",
            "Officer Login": "अधिकारी लॉगिन",
            "Sign In": "साइन इन",
            "Dashboard": "डॅशबोर्ड",
            "Language / भाषा:": "भाषा निवडा:",

            /* ---- hero ---- */
            "Maharashtra Government Health Network": "महाराष्ट्र शासन आरोग्य नेटवर्क",
            "Right Care.": "योग्य उपचार.",
            "Right Facility.": "योग्य सुविधा.",
            "Right Now.": "तत्काळ.",
            "Emergency Mitra connects rural communities with the most suitable nearby government healthcare facility during emergencies, ensuring timely and appropriate care.": "आपत्कालीन परिस्थितीत इमर्जन्सी मित्र ग्रामीण समुदायांना जवळच्या सर्वात योग्य सरकारी आरोग्य सुविधेशी जोडतो, ज्यामुळे वेळेत आणि योग्य उपचार सुनिश्चित होतो.",
            "Start Emergency": "आपत्कालीन सुरू करा",
            "SOS — SEND LOCATION": "SOS — स्थान पाठवा",
            "For unconscious / unresponsive patient": "बेशुद्ध / प्रतिसाद न देणाऱ्या रुग्णासाठी",

            /* ---- trust strip ---- */
            "Govt Healthcare Network": "सरकारी आरोग्य नेटवर्क",
            "Low-Connectivity Support": "कमी कनेक्टिव्हिटी मदत",
            "SMS Fallback": "एसएमएस पर्याय",
            "Hindi + English": "हिंदी + इंग्रजी",
            "Offline Ready": "ऑफलाइन तयार",
            "Govt Healthcare Network Govt Healthcare Network Low-Connectivity Support SMS Fallback हिंदी + English + मराठी": "सरकारी आरोग्य नेटवर्क कमी कनेक्टिव्हिटी मदत एसएमएस पर्याय हिंदी + English + मराठी",
            "© 2026 Emergency Mitra • Sessions expire automatically after 8": "© 2026 इमर्जन्सी मित्र • सत्र 8 तासांनंतर आपोआप संपते",

            /* ---- advisory ---- */
            "Emergency Health Advisory": "आपत्कालीन आरोग्य सल्ला",
            "LIVE GUIDANCE": "थेट मार्गदर्शन",
            "Snakebite": "सर्पदंश (साप चावणे)",
            "Do not cut or suck the wound. Keep the patient still and reach antivenom-equipped care immediately.": "जखम कापू नका किंवा चोखू नका. रुग्णाला स्थिर ठेवा आणि लगेच ॲन्टीव्हेनम असलेल्या उपचाराकडे न्या.",
            "Cardiac Emergency": "हृदयविकाराचा आपत्कालीन प्रकार",
            "If the person is unresponsive and not breathing normally, begin CPR and seek emergency help immediately.": "व्यक्ती प्रतिसाद देत नसेल आणि नेहमीप्रमाणे श्वास न घेत असेल तर CPR सुरू करा आणि तत्काळ आपत्कालीन मदत घ्या.",
            "Severe Bleeding": "तीव्र रक्तस्राव",
            "Apply firm, continuous pressure with a clean cloth and seek emergency medical care.": "स्वच्छ कापडाने सातत्याने दाबा आणि तत्काळ वैद्यकीय उपचार घ्या.",
            "Accident & Trauma": "अपघात व ट्रॉमा",
            "Avoid unnecessary movement if a spinal or major injury is suspected. Call emergency services.": "पाठीचा कणा किंवा गंभीर दुखापतीचा संशय असल्यास अनावश्यक हालचाल टाळा. आपत्कालीन सेवा कॉल करा.",
            "Emergency guidance • Not a diagnosis": "आपत्कालीन मार्गदर्शन • हे वैद्यकीय निदान नाही",

            /* ---- assistance cards ---- */
            "Immediate Emergency Assistance": "तत्काळ आपत्कालीन मदत",
            "Select the type of emergency for rapid protocol activation.": "जलद प्रोटोकॉल सुरू करण्यासाठी आपत्कालीन प्रकार निवडा.",
            "Snakebite Protocol": "सर्पदंश प्रोटोकॉल",
            "Find antivenom-equipped care.": "ॲन्टीव्हेनम असलेली सुविधा शोधा.",
            "Trauma routing + first aid.": "ट्रॉमा मार्गदर्शन + प्राथमिक उपचार.",
            "Cardiac Arrest": "हृदयविकाराचा झटका",
            "CPR + AED assistance.": "CPR + AED मदत.",
            "Emergency bleeding support.": "आपत्कालीन रक्तस्राव मदत.",
            "Breathing Issue": "श्वास घेण्यास त्रास",
            "Airway emergency support.": "श्वसनमार्ग आपत्कालीन मदत.",
            "CRITICAL": "अत्यंत गंभीर",
            "URGENT": "तातडीचे",

            /* ---- how it works ---- */
            "How Emergency Mitra Works": "इमर्जन्सी मित्र कसे काम करते",
            "Select Emergency": "आपत्कालीन निवडा",
            "Share Location": "स्थान सामायिक करा",
            "Smart Facility Matching": "स्मार्ट सुविधा जुळणी",
            "Navigate & Share": "नेव्हिगेट आणि शेअर करा",

            /* ---- advanced network ---- */
            "Advanced Emergency Network": "प्रगत आपत्कालीन नेटवर्क",
            "From emergency detection to hospital readiness, Emergency Mitra connects the complete response chain.": "आपत्कालीन ओळखीपासून रुग्णालय तयारीपर्यंत, इमर्जन्सी मित्र संपूर्ण प्रतिसाद साखळी जोडते.",
            "Pre-Arrival Handshake": "आगमन-पूर्व रुग्णालय समन्वय",
            "Alerts the destination hospital before arrival, ensuring staff and beds are ready.": "पोहोचण्यापूर्वी गंतव्य रुग्णालयाला सूचित करते, ज्यामुळे कर्मचारी व बेड तयार राहतात.",
            "AI Preliminary Triage": "एआय प्राथमिक ट्रायेज",
            "Intelligent symptom analysis prioritizes critical cases automatically.": "बुद्धिमान लक्षण विश्लेषण गंभीर प्रकरणांना आपोआप प्राधान्य देते.",
            "Ambulance Dispatch": "रुग्णवाहिका पाठवणे",
            "Automated dispatch of the nearest available emergency transport.": "जवळच्या उपलब्ध आपत्कालीन वाहतुकीची स्वयंचलित पाठवणी.",
            "Resource Inventory": "संसाधन साठा",
            "Real-time tracking of critical supplies across the healthcare network.": "आरोग्य नेटवर्कमधील महत्त्वाच्या सामग्रीचे थेट मागोवा.",
            "Audio-First IVR": "ऑडिओ-प्रथम IVR",
            "Accessible voice-guided emergency reporting in local languages.": "स्थानिक भाषांमध्ये आवाज-निर्देशित आपत्कालीन नोंद.",
            "Offline Passport": "ऑफलाइन मेडिकल पासपोर्ट",
            "Locally stored critical medical history available instantly without internet.": "इंटरनेटशिवाय तत्काळ उपलब्ध होणारा स्थानिकरित्या साठवलेला महत्त्वाचा वैद्यकीय इतिहास.",
            "Explore": "पहा",
            "READY": "तयार",
            "AI SUPPORT": "एआय मदत",
            "DEMO": "डेमो",
            "PROTOTYPE": "प्रोटोटाइप",
            "OFFLINE": "ऑफलाइन",

            /* ---- online pill / offline panel ---- */
            "Online": "ऑनलाइन",
            "Offline": "ऑफलाइन",
            "Offline Status": "ऑफलाइन स्थिती",

            /* ---- facilities modal (static parts) ---- */
            "Find Healthcare Facilities": "आरोग्य सुविधा शोधा",
            "Search facilities, services, or locations...": "सुविधा, सेवा किंवा ठिकाण शोधा...",

            /* ---- footer ---- */
            "Privacy Policy": "गोपनीयता धोरण",
            "Terms of Service": "सेवा अटी",
            "Help Desk": "मदत केंद्र",
            "Rural Outreach": "ग्रामीण संपर्क",
            "Accessibility": "सुलभता",
            "© 2026 Emergency Mitra • Rural Emergency Healthcare Network": "© 2026 इमर्जन्सी मित्र • ग्रामीण आपत्कालीन आरोग्य नेटवर्क",

            /* ---- passport ---- */
            "Offline Emergency Passport": "ऑफलाइन आपत्कालीन पासपोर्ट",
            "OFFLINE SYNCED": "ऑफलाइन सिंक झाले",
            "Blood Group": "रक्तगट",
            "Allergies": "ॲलर्जी",
            "Emergency Contact": "आपत्कालीन संपर्क",
            "SCAN AT DESK": "काउंटरवर स्कॅन करा",

            /* ---- triage wizard ---- */
            "Emergency Protocol": "आपत्कालीन प्रोटोकॉल",
            "Step 1 of 3: Assessment": "टप्पा 1/3: मूल्यांकन",
            "Step 2 of 3: Hospital Handshake": "टप्पा 2/3: रुग्णालय समन्वय",
            "Step 3 of 3: First Aid Guidance": "टप्पा 3/3: प्राथमिक उपचार मार्गदर्शन",
            "Bypass: Call 108": "बायपास: 108 ला कॉल करा",
            "Answer quickly to determine triage priority.": "ट्रायेज प्राधान्य ठरवण्यासाठी झटपट उत्तर द्या.",
            "Next Step": "पुढील टप्पा",
            "Back": "मागे",
            "Close Protocol": "प्रोटोकॉल बंद करा",

            /* ---- AI triage v2 ---- */
            "Symptom Checker": "लक्षण तपासणी",
            "Ask Mitra AI": "मित्र AI ला विचारा",
            "AI is for decision support only and does not replace professional medical diagnosis.": "एआय केवळ निर्णयासाठी मदत आहे आणि व्यावसायिक वैद्यकीय निदानाचा पर्याय नाही.",
            "WORKS OFFLINE": "ऑफलाइन चालते",
            "English (EN)": "इंग्रजी (EN)",
            "हिंदी (HI)": "हिंदी (HI)",
            "मराठी (MR)": "मराठी (MR)",

            /* ---- handshake (citizen) ---- */
            "Request": "विनंती",
            "Call": "कॉल करा",
            "Map": "नकाशा",
            "Book": "बुक करा",

            /* ---- facilities finder (JS-rendered) ---- */
            "All Facilities": "सर्व सुविधा",
            "Hospitals": "रुग्णालये",
            "PHCs": "प्राथमिक आरोग्य केंद्रे",
            "Diagnostics": "तपासण्या",
            "Maternity": "प्रसूती",
            "24×7 Open": "24×7 उघडे",
            "24\u00d77 Open": "24×7 उघडे",
            "Antivenom": "ॲन्टीव्हेनम",
            "Hospital": "रुग्णालय",
            "PHC": "प्राथमिक आरोग्य केंद्र",
            "Directions": "मार्गदर्शक",
            "Request Blood": "रक्ताची विनंती",
            "Book Slot": "स्लॉट बुक करा",
            "Book Test": "तपासणी बुक करा",
            "Book Bed": "बेड बुक करा",
            "Readiness": "तयारी",
            "NEAREST": "सर्वात जवळ",
            "OPEN NOW": "आता उघडे",
            "CLOSED": "बंद",
            "FULL": "पूर्ण",
            "BEDS LEFT": "बेड शिल्लक",
            "BEDS AVAILABLE": "बेड उपलब्ध",
            "Beds Free": "रिक्त बेड",
            "Blood Units": "रक्त युनिट",
            "Open 24×7": "24×7 उघडे",
            "Open 24\u00d77": "24×7 उघडे",
            "AV Vials": "ॲन्टीव्हेनम शीश्या",
            "Snake Antivenom:": "सर्पदंश ॲन्टीव्हेनम:",
            "vials": "शीश्या",
            "Use My Location": "माझे स्थान वापरा",
            "All Distances": "सर्व अंतरे",
            "Blood Availability": "रक्त उपलब्धता",
            "Bed Availability": "बेड उपलब्धता",
            "GPS denied — using Wardha centre as reference": "GPS नाकारले — संदर्भासाठी वर्धा केंद्र वापरत आहे",
            "Locations shared — nearest-first sorting on": "स्थान सामायिक — जवळपास-प्रथम क्रम सुरू",

            /* ---- handshake citizen view ---- */
            "RESERVED": "राखीव",
            "NOTIFIED": "सूचित",
            "WAITING": "प्रतीक्षा",
            "STANDBY": "तयारीवर",
            "ACKNOWLEDGED": "मान्य",
            "Replay simulation": "सिम्युलेशन पुन्हा",
            "Medical Officer": "वैद्यकीय अधिकारी",
            "Medical Officer Notified:": "वैद्यकीय अधिकाऱ्याला सूचित:",
            "Antivenom / critical supplies": "ॲन्टीव्हेनम / गंभीर सामग्री",
            "Hospital response:": "रुग्णालयाचा प्रतिसाद:",
            "Pre-Arrival Request —": "आगमन-पूर्व विनंती —",
            "min ETA": "मिनिटांत येईल",
            "📡 Request sent to the duty officer. The hospital will acknowledge shortly — this screen updates by itself. For any emergency call 108.": "📡 विनंती कर्तव्यदर्शक अधिकाऱ्याकडे पाठवली. रुग्णालय लवकरच मान्य करेल — हा स्क्रीन स्वतःहून अपडेट होतो. आपत्कालीन परिस्थितीत 108 ला कॉल करा.",
            "accepted — bed": "ने मान्य केले — बेड",
            "reserved for this case, medical team on standby.": "या प्रकरणासाठी राखीव, वैद्यकीय टीम तयार.",
            "at capacity — case auto-rerouted to": "क्षमता पूर्ण — प्रकरण आपोआप पुनर्निर्देशित",

            /* ---- handshake admin panel (interpolated labels) ---- */
            "Trust score": "विश्वासार्हता स्कोअर",
            "Bed required": "आवश्यक बेड",
            "Requested:": "विनंती:",
            "PENDING — ACTION NEEDED": "प्रलंबित — कृती आवश्यक",
            "DECLINED → REROUTED": "नाकारले → पुनर्निर्देशित",
            "Acknowledge & Reserve Bed": "मान्य करा व बेड राखून ठेवा",
            "Ambulance incoming — ETA": "रुग्णवाहिका येतेय — पोहोचणीची वेळ",
            "min. Decide before arrival to guarantee the bed.": "मिनिटे. पोहोचण्यापूर्वी निर्णय घ्या म्हणजे बेड निश्चित होईल.",
            "Bed reserved & citizen auto-notified • decided by": "बेड राखीव व नागरिकाला सूचित • निर्णय",
            "Case rerouted to": "प्रकरण पुनर्निर्देशित",
            "No incoming handshakes": "कोणतीही आगमन-पूर्व विनंती नाही",
            "Simulate Incoming": "नवीन विनंती पाठवा",
            "Pre-Arrival Handshake Requests": "आगमन-पूर्व समन्वय विनंत्या",
            "Acknowledge & Reserve": "मान्य करा व राखून ठेवा",
            "Decline & Reroute": "नाकारा व पुनर्निर्देशित करा",

            /* ---- admin statuses ---- */
            "EN ROUTE": "वाटेवर",
            "AVAILABLE": "उपलब्ध",
            "EN ROUTE": "वाटेवर",

            /* ---- admin: header + login ---- */
            "Open Dashboard": "डॅशबोर्ड उघडा",
            "Logout": "लॉगआउट",
            "Command Center": "कमांड सेंटर",
            "Duty Officer": "कर्तव्यदर्शक अधिकारी",
            "Emergency Mitra — Command Center": "इमर्जन्सी मित्र — कमांड सेंटर",
            "Duty Officer Console": "कर्तव्यदर्शक अधिकारी कन्सोल",
            "Command Center session active": "कमांड सेंटर सत्र सुरू आहे",
            "Use Open Dashboard (top-right) to manage live cases, bed availability, inventory, ambulance fleet, the district map and broadcasts. The dashboard reopens automatically on every visit.": "थेट प्रकरणे, बेड उपलब्धता, सामग्री, रुग्णवाहिका ताफा, जिल्हा नकाशा आणि प्रसारण व्यवस्थापित करण्यासाठी डॅशबोर्ड उघडा (वर-उजवीकडे). डॅशबोर्ड प्रत्येक वेळी आपोआप उघडते.",
            "Officer ID": "अधिकारी आयडी",
            "Password": "पासवर्ड",
            "Duty Officer Sign-In": "कर्तव्यदर्शक अधिकारी साइन-इन",
            "Restricted area — Emergency Mitra Command Center": "प्रतिबंधित क्षेत्र — इमर्जन्सी मित्र कमांड सेंटर",
            "Enter Command Center": "कमांड सेंटरमध्ये प्रवेश",
            "Back to portal": "पोर्टलवर परत",
            "Prototype credentials:": "प्रोटोटाइप क्रेडेन्शियल:",
            "or": "किंवा",
            "Replace js/admin-auth.js with real ABAC/SSO before production.": "प्रोडक्शनपूर्वी js/admin-auth.js खऱ्या ABAC/SSO ने बदला.",

            /* ---- admin: tabs ---- */
            "Overview": "आढावा",
            "Active Cases": "सुरू असलेली प्रकरणे",
            "Critical": "गंभीर",
            "Bed Management": "बेड व्यवस्थापन",
            "Patients": "रुग्ण",
            "Medical Inventory": "वैद्यकीय सामग्री",
            "Fleet & GPS": "ताफा आणि GPS",
            "Live Map": "थेट नकाशा",
            "Broadcast Alert": "प्रसारण सूचना",
            "New": "नवीन",

            /* ---- admin: KPI ---- */
            "Active Emergencies": "सुरू असलेली आपत्कालीन प्रकरणे",
            "Available ICU Beds": "उपलब्ध ICU बेड",
            "Antivenom Stock": "ॲन्टीव्हेनम साठा",
            "Vials": "शीश्या",
            "Ambulances En Route": "वाटेवरील रुग्णवाहिका",
            "Pre-Arrival Handshakes": "आगमन-पूर्व समन्वय",
            "Offline Sync Sessions": "ऑफलाइन सिंक सत्रे",

            /* ---- admin: handshake panel ---- */
            "Pre-Arrival Handshake Requests": "आगमन-पूर्व समन्वय विनंत्या",
            "Incoming ambulance pre-alerts from citizens & the 108 gateway — acknowledge to reserve beds, or reroute.": "नागरिकांकडून व 108 गेटवेकडून येणाऱ्या रुग्णवाहिका प्री-अलर्ट — बेड राखून ठेवण्यासाठी मान्य करा, किंवा पुनर्निर्देशित करा.",
            "PENDING": "प्रलंबित",
            "ACK": "मान्य",
            "REROUTED": "पुनर्निर्देशित",
            "Acknowledge & Reserve Bed": "मान्य करा व बेड राखून ठेवा",
            "Decline & Reroute": "नाकारा व पुनर्निर्देशित करा",
            "No incoming handshakes": "कोणतीही आगमन-पूर्व विनंती नाही",
            "Patient": "रुग्ण",
            "Hospital": "रुग्णालय",

            /* ---- admin: broadcast ---- */
            "District-Wide Emergency Broadcast": "जिल्हाव्यापी आपत्कालीन प्रसारण",
            "Dispatch District Broadcast Now": "जिल्हा प्रसारण आता पाठवा",

            /* ---- admin: tables ---- */
            "Status": "स्थिती",
            "Priority": "प्राधान्य",
            "Trust": "विश्वास",
            "ETA": "पोहोचणीची वेळ",
            "Action": "कृती",
            "Resource": "संसाधन",
            "Quantity": "प्रमाण",
            "Last Updated": "शेवटचे अद्ययावत",

            /* ---- tutorial ---- */
            "Officer Login — Command Center Behind Credentials": "अधिकारी लॉगिन — क्रेडेन्शियलमागील कमांड सेंटर",

            /* ============================================================
               EMERGENCY WIZARD (app.js ewData) — every kind of line
               ============================================================ */
            "What type of emergency are you facing?": "तुम्हाला कोणत्या प्रकारची आपत्कालीन परिस्थिती आहे?",
            "Speak Your Emergency — बोलकर बताएं": "बोलून सांगा — Speak Your Emergency",
            "VOICE DETECTED": "आवाज ओळखला",
            "Listening... describe the emergency (tap to stop)": "ऐकत आहे… आपत्कालीन परिस्थिती सांगा (थांबवण्यासाठी टॅप करा)",
            "Voice mode is not supported in this browser.": "या ब्राउझरमध्ये व्हॉइस मोड समर्थित नाही.",
            "Please select the emergency type below instead.": "कृपया खालून आपत्कालीन प्रकार निवडा.",
            "Animal Bite": "प्राण्याचा वार",
            "Dog, Cat, Snake, Insect...": "कुत्रा, मांजर, साप, किडा…",
            "Accident / Trauma": "अपघात / ट्रॉमा",
            "Road, fall, collision...": "रस्ता, पडणे, आदळणे…",
            "Chemical Exposure": "रासायनिक संपर्क",
            "Acid, pesticide, gas leak...": "आम्ल, कीटकनाशक, वायू गळती…",
            "Cardiac / Chest": "हृदय / छाती",
            "Heart attack, chest pain...": "हृदयविकाराचा झटका, छातीदुखी…",
            "Cuts, wounds, haemorrhage...": "चिरे, जखमा, रक्तस्राव…",
            "Breathing, poisoning, burns...": "श्वास, विषबाधा, उकळणे…",
            "Step 1 of 4: Select Emergency Type": "टप्पा 1/4: आपत्कालीन प्रकार निवडा",
            "Step 2 of 4: Select Sub-Type": "टप्पा 2/4: उपप्रकार निवडा",
            "Step 3 of 4: Check Symptoms": "टप्पा 3/4: लक्षणे निवडा",
            "Step 4 of 4: Assistance & Guidance": "टप्पा 4/4: मदत व मार्गदर्शन",
            "🐾 Animal Bite": "🐾 प्राण्याचा वार",
            "Which animal caused the bite?": "कोणत्या प्राण्याने चावले?",
            "🐕 Dog": "🐕 कुत्रा", "🐈 Cat": "🐈 मांजर", "🐍 Snake": "🐍 साप",
            "🐒 Monkey": "🐒 माकड", "🐝 Insect / Bee": "🐝 किडा / मधमाशी",
            "🐀 Rat / Rodent": "🐀 उंदीर", "🦁 Wild Animal": "🦁 जंगली प्राणी",
            "❓ Other Animal": "❓ इतर प्राणी",
            "Bleeding from wound": "जखमेतून रक्तस्राव", "Swelling around bite": "चावलेल्या भागाभोवती सूज",
            "Redness / Warmth": "लालपणा / उब", "Pain at site": "ठिकाणी वेदना",
            "Nausea / Vomiting": "ओढी / उलटी", "Muscle spasms": "स्नायूंचे झटके",
            "Difficulty swallowing (rabies sign)": "गिळण्यास त्रास (रेबीजची चिन्हे)",
            "Puncture wound": "टोचून झालेली जखम", "Discharge from wound": "जखमेतून स्राव",
            "Swelling spreading rapidly": "झटपट पसरणारी सूज", "Discolouration at bite site": "चावलेल्या भागावर रंग बदलणे",
            "Bleeding from gums": "पिऱ्यातून रक्त", "Muscle weakness / paralysis": "स्नायू दुर्बल / पक्षाघात",
            "Loss of consciousness": "बेशी", "Localised swelling": "ठिकठिकाणी सूज",
            "Hives / Rash": "पित्ती / ताकं", "Difficulty breathing (anaphylaxis)": "श्वास घेताना त्रास (ॲनाफिलॅक्सिस)",
            "Throat tightening": "घसा खिळणे", "Dizziness / Fainting": "चक्कर / बेशी",
            "Severe pain": "तीव्र वेदना", "Wound / Scratch": "जखम / खाजवलेला भाग",
            "Deep laceration / Tear": "खोल चीर / फाट", "Shock / Pale skin": "शॉक / ठंडा पिवळसर त्वचा",
            "Broken bones": "हाडे तुटली", "Bleeding": "रक्तस्राव", "Swelling": "सूज",
            "Redness": "लालपणा", "Headache": "डोकेदुखी", "Nausea": "ओढी",
            "Wash wound with soap and water for 15 min": "जखम साबण व पाण्याने 15 मिनिटे धुवा",
            "Apply antiseptic": "ॲन्टिसेप्टिक लावा", "Cover with clean bandage": "स्वच्छ पट्टीने बांधा",
            "Seek anti-rabies vaccination immediately": "लगेच ॲन्टी-रेबीज लस घ्या",
            "Note dog vaccination status if possible": "शक्य असल्यास कुत्र्याची लस माहिती नोंदवा",
            "Wash wound thoroughly with soap and water": "जखम साबण-पाण्याने व्यवस्थित धुवा",
            "Seek tetanus & rabies prophylaxis": "टिटॅनस व रेबीज प्रतिबंधात्मक लस घ्या",
            "Monitor for infection signs": "संसर्गाची लक्षणे पहा",
            "Keep patient still and calm": "रुग्णाला स्थिर व शांत ठेवा",
            "Immobilise the bitten limb at or below heart level": "चावलेला भाग हृदयाच्या पातळीपर्यंत/खाली स्थिर ठेवा",
            "Remove tight items (rings, watches)": "घट्ट वस्तू (अंगठी, घड्याळे) काढा",
            "Rush to antivenom-equipped hospital": "ॲन्टीव्हेनम असलेल्या रुग्णालयात धावा",
            "Note snake appearance if safe to do so": "सुरक्षित असल्यास सापाचा रंग-आकार लक्षात ठेवा",
            "Seek rabies vaccination urgently": "तातडीने रेबीज लस घ्या",
            "Report to health authority": "आरोग्य विभागास सूचित करा",
            "Remove stinger if visible (scrape, do not squeeze)": "काटा दिसल्यास काढा (खरवडा, दाबू नका)",
            "Apply cold pack to site": "थंड सेक द्या", "Give antihistamine if available": "ॲन्टिहिस्टॅमिन असल्यास द्या",
            "Use EpiPen if anaphylaxis and prescribed": "ॲनाफिलॅक्सिस असल्यास सांगितल्यास एपिपेन वापरा",
            "Monitor for rat-bite fever symptoms": "उंदीरदंश तापाची लक्षणे पहा",
            "Control bleeding with firm pressure": "घट्ट दाबाने रक्तस्राव नियंत्रित करा",
            "Immobilise injured area": "जखमी भाग स्थिर ठेवा", "Keep patient warm": "रुग्णाला उबदार ठेवा",
            "Call emergency transport immediately": "तत्काळ रुग्णवाहिका मागा",
            "Seek medical evaluation and anti-rabies advice": "वैद्यकीय तपासणी व रेबीज सल्ला घ्या",
            "Do not ignore even minor bites": "किरकोळ वारही टाळू नका",
            "Do not close wound tightly before cleaning": "धुण्यापूर्वी जखम घट्ट बांधू नका",
            "Do not delay rabies vaccination": "रेबीज लस उशीर न करता घ्या",
            "Do not ignore cat scratches — risk of infection is high": "मांजरीच्या खाजवलेल्या जखमा टाळू नका — संसर्गाचा धोका जास्त आहे",
            "Do not close puncture wounds immediately": "टोचलेल्या जखमा लगेच बंद करू नका",
            "Do not cut or suck the wound": "जखम कापू नका किंवा चोखू नका",
            "Do not apply tourniquet or ice": "टूर्निकेट किंवा बर्फ लावू नका", "Do not give alcohol": "अल्कोहोल देऊ नका",
            "Do not allow patient to walk": "रुग्णाला चालवू देऊ नका",
            "Do not delay medical attention": "उपचारात उशीर करू नका", "Do not use home remedies": "घरगुती उपाय करू नका",
            "Do not squeeze stinger": "काटा दाबू नका", "Do not rub the area": "तो भाग घासू नका",
            "Do not give antihistamines if unconscious": "बेशी असल्यास ॲन्टिहिस्टॅमिन देऊ नका",
            "Do not ignore — rat bites can cause leptospirosis": "टाळू नका — उंदीरदंशामुळे लेप्टोस्पायरोसिस होऊ शकतो",
            "Do not apply dirt or mud": "माती किंवा चिखल लावू नका",
            "Do not move patient unless safe": "सुरक्षित नसेल तर रुग्ण हलवू नका",
            "Do not remove impaled objects": "खोवलेल्या वस्तू काढू नका", "Do not give food or water": "अन्न/पाणी देऊ नका",
            "Do not ignore the bite": "वाराकडे दुर्लक्ष करू नका", "Do not apply mud or turmeric": "माती किंवा हळद लावू नका",
            "🚗 Accident / Trauma": "🚗 अपघात / ट्रॉमा",
            "What type of accident occurred?": "कोणत्या प्रकारचा अपघात झाला?",
            "🛣️ Road Accident": "🛣️ रस्ता अपघात", "⬇️ Fall / Height": "⬇️ पडणे / उंचीवरून",
            "🔥 Fire / Burns": "🔥 आग / उकळणे", "💧 Drowning": "💧 बुडणे",
            "Severe bleeding": "तीव्र रक्तस्राव", "Suspected bone fracture": "हाडतोडीचा संशय",
            "Head / neck injury": "डोके / मानेची दुखापत", "Spinal injury suspected": "पाठीच्या कण्याची दुखापतीचा संशय",
            "Chest pain": "छातीदुखी", "Back / spine pain": "पाठ / कणा दुखणे",
            "Fracture / deformity": "हाडतोड / विकृत आकार", "Burns on skin": "त्वचेवर उकळी",
            "Smoke inhalation / difficulty breathing": "धूर श्वासात / श्वासास त्रास", "Blisters": "फडके",
            "Charred skin": "काळसर त्वचा", "Eye irritation": "डोळ्यांची चिडचिड",
            "Chest tightness": "छातीत जडपणा", "Not breathing": "श्वास नाही",
            "Unresponsive": "प्रतिसादहीन", "Coughing / choking": "खोकला / गुदमरणे",
            "Blue lips": "ओठ निळे", "Vomiting water": "पाण्याची उलटी",
            "Confusion": "गोंधळ", "Spurting blood": "फवाऱ्याने रक्तस्राव",
            "Ensure scene safety": "आधी स्थळाची सुरक्षितता पहा", "Apply direct pressure to bleeding": "रक्तस्रावावर थेट दाबा",
            "Stabilise neck if spinal injury suspected": "पाठीच्या कण्याचा संशय असल्यास मान स्थिर ठेवा",
            "Call emergency services immediately": "तत्काळ आपत्कालीन सेवा कॉल करा",
            "Do not move patient": "रुग्ण हलवू नका", "Stabilise head/neck": "डोके/मान स्थिर ठेवा",
            "Check breathing and pulse": "श्वास व नाडी तपासा",
            "Move to fresh air": "ताज्या हवेत न्या", "Cool burn with running water 10-20 min": "उकळलेला भाग 10-20 मिनिटे वाहत्या पाण्यात थंड करा",
            "Cover with clean damp cloth": "स्वच्छ ओल्या कापडाने झाका", "Do not pop blisters": "फडके फोडू नका",
            "Start rescue breaths immediately": "तत्काळ कृत्रिम श्वास सुरू करा", "Begin CPR if no pulse": "नाडी नसेल CPR सुरू करा",
            "Turn patient sideways after resuscitation": "होशात आल्यावर रुग्णाला बाजूला झोपवा",
            "Do not move unless in danger": "धोका नसेल तर हलवू नका",
            "Do not twist or bend the spine": "पाठीचा कणा वळवू/वाकवू नका",
            "Do not move neck without support": "आधाराशिवाय मान हलवू नका",
            "Do not use ice on burns": "उकळलेल्या भागावर बर्फ लावू नका",
            "Do not apply toothpaste or butter": "टूथपेस्ट किंवा लोणी लावू नका",
            "Do not remove burnt clothing stuck to skin": "त्वचेला चिकटलेले भाजलेले कपडे काढू नका",
            "Do not leave alone": "एकटे सोडू नका", "Do not delay CPR": "CPR मध्ये उशीर करू नका",
            "☣️ Chemical Exposure": "☣️ रासायनिक संपर्क",
            "What type of chemical exposure?": "कोणत्या प्रकारचा रासायनिक संपर्क?",
            "⚗️ Acid / Alkali": "⚗️ आम्ल / क्षार", "🌾 Pesticide / Insecticide": "🌾 कीटकनाशक",
            "💨 Gas / Fume Inhalation": "💨 वायू / धूर श्वासात", "❓ Unknown Chemical": "❓ अनोळखी रसायन",
            "Burning pain on skin/eye": "त्वचा/डोळ्यांवर जळजळीत वेदना", "Redness / blistering": "लालपणा / फडके",
            "Blurred vision": "धुंदल दिसणे", "Excessive saliva / tearing": "जास्त लाळ / अश्रू",
            "Muscle tremors": "स्नायूंची थरथर", "Seizures": "झटके", "Pinpoint pupils": "बारीक झालेले डोळे",
            "Coughing / choking": "खोकला / गुदमरणे", "Skin redness / rash": "त्वचेवर लालपणा / ताकं",
            "Eye / throat irritation": "डोळे/घसा चिडणे", "Flush affected area with large amounts of water for 15-20 min": "प्रभावित भाग 15-20 मिनिटे मोठ्या प्रमाणात पाण्याने धुवा",
            "Remove contaminated clothing": "दूषित कपडे काढा", "Cover with sterile dressing": "स्वच्छ पट्टीने झाका",
            "Seek emergency care immediately": "तत्काळ आपत्कालीन उपचार घ्या",
            "Remove from exposure": "संपर्कातून दूर न्या", "Flush skin with water": "त्वचा पाण्याने धुवा",
            "Seek emergency care — antidote (atropine) required": "तत्काळ उपचार घ्या — ॲन्टिडोट (ॲट्रोपीन) आवश्यक",
            "Move to fresh air immediately": "तत्काळ ताज्या हवेत जा", "Loosen tight clothing": "घट्ट कपडे सैल करा",
            "Give oxygen if available": "ऑक्सिजन असल्यास द्या",
            "Flush skin and eyes with water": "त्वचा व डोळे पाण्याने धुवा",
            "Bring chemical container/label to hospital": "रसायन कंटेनर/लेबल रुग्णालयात आणा",
            "Do not neutralise acid with alkali on skin": "त्वचेवरील आम्ल क्षाराने तटस्थ करू नका",
            "Do not induce vomiting if swallowed": "गिळल्यास उलटी करू देऊ नका",
            "Do not induce vomiting if organophosphate poisoning suspected": "ऑर्गेनोफॉस्फेट विषबाधेचा संशय असल्यास उलटी करू देऊ नका",
            "Do not re-enter gas-filled area without protection": "संरक्षणाशिवाय वायूभरलेल्या भागात पुन्हा जाऊ नका",
            "Do not give mouth-to-mouth without barrier device": "बॅरियर साधनाशिवाय माउथ-टू-माउथ करू नका",
            "Do not neutralise without knowing the chemical": "रसायन न ओळखता तटस्थ करू नका",
            "Do not induce vomiting unless directed by Poison Control": "पॉइझन कंट्रोलने सांगितल्याशिवाय उलटी करू देऊ नका",
            "💔 Cardiac / Chest": "💔 हृदय / छाती",
            "What best describes the situation?": "परिस्थिती नेमकी कशी आहे?",
            "💔 Heart Attack": "💔 हृदयविकाराचा झटका", "❤️ Cardiac Arrest (No pulse)": "❤️ कार्डियक अरेस्ट (नाडी नाही)",
            "😣 Chest Pain": "😣 छातीदुखी", "💓 Palpitations": "💓 धडधड",
            "Severe chest pain / pressure": "तीव्र छातीदुखी / दाब", "Pain radiating to arm, jaw, neck": "हात, जबडा, मानेकडे पसरणारे वेदना",
            "Shortness of breath": "श्वास कमी होणे", "Sweating profusely": "मोठ्या प्रमाणात घाम",
            "Pale / Ashen skin": "पिवळसर / राखाडी त्वचा", "No pulse / Not breathing": "नाडी नाही / श्वास नाही",
            "Gasping or no breath sounds": "दम घुटणे किंवा श्वासाचा आवाज नाही", "Collapsed suddenly": "अचानक कोसळणे",
            "Sharp or dull chest pain": "खोल किंवा मंद छातीदुखी", "Worsens with breathing": "श्वासासोबत वाढणे",
            "Tenderness on pressing chest": "छाती दाबल्यास वेदना", "Rapid / irregular heartbeat": "जलद / अनियमित हृदयगती",
            "Pounding in chest": "छातीत धडधड", "Fainting": "बेशी",
            "Call 108 immediately": "तत्काळ 108 कॉल करा", "Have patient sit/lie comfortably": "रुग्णाला आरामात बसवा/झोपवा",
            "Give aspirin 325mg if available and not allergic": "ॲस्पिरिन 325mg असल्यास व ॲलर्जी नसल्यास द्या",
            "Keep patient calm and warm": "रुग्णाला शांत व उबदार ठेवा",
            "Start CPR immediately (30 compressions : 2 breaths)": "तत्काळ CPR सुरू करा (30 दाब : 2 श्वास)",
            "Use AED if available": "AED असल्यास वापरा", "Do not stop until help arrives": "मदत येईपर्यंत थांबू नका",
            "Have patient rest": "रुग्णाला विश्रांती द्या", "Monitor vital signs": "महत्त्वाची लक्षणे पहा",
            "Seek medical evaluation": "वैद्यकीय तपासणी करा", "Take slow deep breaths": "सावकाश खोल श्वास घ्या",
            "Avoid caffeine/stimulants": "कॅफिन/उद्दीपक टाळा", "Seek medical advice": "वैद्यकीय सल्ला घ्या",
            "Do not leave patient alone": "रुग्णाला एकटे सोडू नका", "Do not give water or food": "पाणी/अन्न देऊ नका",
            "Do not delay calling 108": "108 कॉलमध्ये उशीर करू नका",
            "Do not delay CPR even for a minute": "CPR मध्ये एका मिनिटाचाही उशीर करू नका",
            "Do not give up until professionals take over": "व्यावसायिक येईपर्यंत थांबू नका",
            "Do not ignore — seek evaluation": "दुर्लक्ष करू नका — तपासणी करा",
            "Do not self-medicate without advice": "सल्ल्याशिवाय औषध घेऊ नका", "Do not panic": "घाबरू नका",
            "Do not consume energy drinks": "एनर्जी ड्रिंक पिऊ नका",
            "🩸 Severe Bleeding": "🩸 तीव्र रक्तस्राव",
            "Where is the bleeding?": "रक्तस्राव कुठून होत आहे?",
            "💪 Arm / Leg": "💪 हात / पाय", "🧠 Head / Face": "🧠 डोके / चेहरा",
            "🫁 Chest / Abdomen": "🫁 छाती / पोट", "🩺 Suspected Internal": "🩺 आंतरिक रक्तस्रावाचा संशय",
            "Bright red / spurting blood": "लाल / फवाऱ्यासारखे रक्त", "Wound won't stop bleeding": "जखमेतून रक्त थांबत नाही",
            "Pale / Cold skin": "पिवळसर / थंड त्वचा", "Weakness": "अशक्तपणा",
            "Blood from scalp / face": "डोके/चेहऱ्यावरून रक्त", "Unequal pupils": "असमान डोळे",
            "Breathing difficulty": "श्वासास त्रास", "Coughing blood": "खोकल्यात रक्त",
            "Abdominal rigidity": "पोट कठीण होणे", "Shock signs": "शॉकची चिन्हे",
            "Rapid weak pulse": "जलद कमकुवत नाडी", "No visible wound": "जखम दिसत नाही",
            "Vomiting blood": "रक्ताची उलटी", "Apply firm direct pressure with clean cloth": "स्वच्छ कापडाने घट्ट थेट दाबा",
            "Elevate limb above heart level": "जखमी भाग हृदयाच्या पातळीवर वर करा",
            "Apply tourniquet above wound if bleeding uncontrolled": "रक्तस्राव न थांबता जखमेवर टूर्निकेट लावा",
            "Keep patient lying down": "रुग्णाला झोपवून ठेवा",
            "Apply gentle pressure — do not press if skull fracture suspected": "हलका दाब द्या — कवटी हाडतोडीचा संशय असल्यास दाबू नका",
            "Protect airway": "श्वासमार्ग सुरक्षित ठेवा",
            "Seal chest wound with occlusive dressing": "छातीची जखम हवाबंद पट्टीने बंद करा",
            "Call 108 — this is life-threatening": "108 कॉल करा — हे जीवघेणे आहे",
            "Do not remove soaked bandages — add layers": "भिजलेल्या पट्ट्या काढू नका — वर अधिक बांधा",
            "Do not peek at wound unnecessarily": "जखम अनावश्यक उघडू नका",
            "Do not apply tight pressure if skull fracture suspected": "कवटी हाडतोडीचा संशय असल्यास घट्ट दाबू नका",
            "Do not press abdomen hard": "पोटावर जोरात दाबू नका",
            "Keep warm": "उबदार ठेवा",
            "Do not give pain killers that thin blood (e.g. aspirin)": "रक्त पातळ करणारी औषधे (ॲस्पिरिन इत्यादी) देऊ नका",
            "🆘 Other Emergency": "🆘 इतर आपत्कालीन प्रकरण",
            "😮‍💨 Breathing Difficulty": "😮‍💨 श्वासास त्रास", "☠️ Poisoning / Overdose": "☠️ विषबाधा / ओव्हरडोज",
            "🔥 Burns / Scalds": "🔥 उकळणे", "⚡ Seizure / Epilepsy": "⚡ झटके / मिरगी",
            "Unable to speak in full sentences": "संपूर्ण वाक्यात बोलणे कठीण",
            "Wheezing / Stridor sounds": "श्वासात फुत्कार / खरखर आवाज", "Rapid shallow breathing": "जलद उथळ श्वास",
            "Confusion / Agitation": "गोंधळ / अस्वस्थता", "Choking": "गुदमरणे", "Diarrhoea": "अतिसार",
            "Confusion / Drowsiness": "गोंधळ / झोपळा", "Red painful skin": "वेदनादायी लाल त्वचा",
            "Charred or white skin": "काळसर किंवा पांढरी त्वचा", "Breathing difficulty (inhalation)": "श्वासास त्रास (धुरामुळे)",
            "Convulsions / Jerking movements": "झटके / ठपठपाट", "Staring blankly": "ताठ पाहत राहणे",
            "Confusion after episode": "झटक्यानंतर गोंधळ", "Tongue biting": "जीभ चावणे",
            "Loss of bladder control": "लघवीवर नियंत्रण गमावणे",
            "Sit patient upright": "रुग्णाला सरळ बसवा", "Assist with prescribed inhaler": "सांगितलेला इन्हेलर वापरण्यास मदत करा",
            "Call 108 immediately if worsening": "वाढल्यास तत्काळ 108 कॉल करा",
            "Call Poison Control / 108": "विष नियंत्रण केंद्र / 108 कॉल करा",
            "Bring poison container to hospital": "विषाची भांडी रुग्णालयात आणा",
            "Keep patient awake if possible": "शक्य असल्यास रुग्णाला जागा ठेवा",
            "Give water if caustic substance swallowed (unless directed otherwise)": "क्षारीय पदार्थ गिळल्यास पाणी द्या (निर्देश असल्यास)",
            "Cool burn with running water 10-20 min": "उकळलेला भाग 10-20 मिनिटे वाहत्या पाण्याने थंड करा",
            "Remove jewellery near burn": "उकळलेल्या भागाजवळील दागिने काढा",
            "Seek hospital care for any significant burn": "मोठ्या उकळीसाठी रुग्णालयात न्या",
            "Protect from injury — clear hard objects": "दुखापतीपासून वाचवा — कठीण वस्तू दूर करा",
            "Place on side (recovery position)": "बाजूला झोपवा", "Time the seizure": "झटक्याची वेळ नोंदवा",
            "Stay calm and reassure patient after": "नंतर शांत राहा व रुग्णाला दिलासा द्या",
            "Do not force patient to lie down": "रुग्णाला जबरदस्तीने झोपवू नका",
            "Do not give milk or food without medical advice": "वैद्यकीय सल्ल्याशिवाय दूध/अन्न देऊ नका",
            "Do not use ice": "बर्फ वापरू नका", "Do not apply butter, toothpaste or oil": "लोणी, टूथपेस्ट किंवा तेल लावू नका",
            "Do not restrain the person": "व्यक्तीला आटोकून धरू नका", "Do not put anything in mouth": "तोंडात काहीही घालू नका",
            "Do not give water until fully conscious": "पूर्ण होशात येईपर्यंत पाणी देऊ नका",
            " symptom(s) reported": " लक्षणे नोंदवली",
            "No specific symptoms selected": "विशिष्ट लक्षणे निवडली नाहीत",
            "⚡ Call 108 immediately! This is a life-threatening emergency.": "⚡ तत्काळ 108 कॉल करा! ही जीवघेणी आपत्कालीन परिस्थिती आहे.",
            "DO": "करा", "DON'T": "करू नका",
            "Reported Symptoms": "नोंदवलेली लक्षणे",
            "✅ Pre-arrival alert sent to hospital via SMS gateway": "✅ रुग्णालयाला एसएमएस गेटवेद्वारे आगमन-पूर्व सूचना पाठवली",
            "✅ Ambulance dispatch request initiated — ETA ~12 min": "✅ रुग्णवाहिका पाठवण्याची विनंती सुरू — पोहोचणीची वेळ ~12 मिनिटे",
            "✅ Emergency team on standby": "✅ आपत्कालीन टीम तयार",
            "Check all symptoms present for: ": "उपलब्ध लक्षणे निवडा: ",
            "Anti-Fake Trust Score": "ॲन्टी-फेक विश्वासार्हता स्कोअर",
            "HIGH — AUTO-DISPATCH": "उच्च — स्वयंचलित पाठवणी",
            "MEDIUM — OPERATOR CONFIRM": "मध्यम — ऑपरेटर पुष्टी",
            "LOW — VOLUNTEER VERIFY": "कमी — स्वयंसेवी पडताळणी",

            /* ---- account hub (account.js) ---- */
            "Basic Details": "मूल माहिती",
            "Save Details": "माहिती सेव्ह करा",
            "Mobile Verification": "मोबाईल पडताळणी",
            "ABHA ID (Ayushman Bharat Health Account)": "ABHA आयडी (आयुष्मान भारत हेल्थ अकाउंट)",
            "DigiLocker Aadhaar eKYC": "डिजिलॉकर आधार eKYC",
            "Emergency Contact (notified on your SOS)": "आपत्कालीन संपर्क (तुमच्या SOS वर सूचित)",

            /* ---- shared footer ---- */
            "Emergency Helplines": "आपत्कालीन हेल्पलाइन",
            "Quick Links": "झटपट दुवे",
            "Information": "माहिती",
            "Contact": "संपर्क",
            "National Emergency": "राष्ट्रीय आपत्कालीन",
            "Women Helpline": "महिला हेल्पलाइन",
            "Child Helpline": "बाल हेल्पलाइन",
            "Disaster Mgmt": "आपत्ती व्यवस्थापन",
            "Ambulance": "रुग्णवाहिका",
            "Government of Maharashtra": "महाराष्ट्र शासन",
            "connecting rural communities to the right government healthcare facility in the golden hour.": "गोल्डन अवरमध्ये ग्रामीण समुदायांना योग्य सरकारी आरोग्य सुविधेशी जोडणे.",
            "OFFLINE READY": "ऑफलाइन तयार",
            "SMS FALLBACK": "एसएमएस पर्याय",
            "TRUST SCORED": "विश्वासार्हता स्कोअर",
            "Citizen Portal": "नागरिक पोर्टल",
            "Command Center": "कमांड सेंटर",
            "Office of the District Health Officer,": "जिल्हा आरोग्य अधिकारी कार्यालय,",
            "Collector Campus, Wardha — 442001, Maharashtra": "कलेक्टर कॅम्पस, वर्धा — 442001, महाराष्ट्र",
            "Control Room: 24×7 • Help Desk: 9 AM – 9 PM": "नियंत्रण कक्ष: 24×7 • मदत केंद्र: सकाळी 9 – रात्री 9",
            "False emergency reports are punishable under BNS §54 / IPC §182": "खोट्या आपत्कालीन तक्रारी BNS §54 / IPC §182 अंतर्गत दंडनीय आहेत",
        }
    };

    var currentActiveLang = 'en';
    var appliedOnce = false;

    function isSkipTag(tag) {
        return ['script', 'style', 'noscript', 'code', 'pre', 'textarea'].indexOf(tag) >= 0;
    }

    /* ============================================================
       DOM TEXT-NODE WALKER — English-source preservation intact.
       Each text node remembers its original English in _origText so
       EN <-> HI <-> MR switching is lossless and idempotent.
       ============================================================ */
    function walkAndTranslate(node, targetLang) {
        if (!node) return;

        if (node.nodeType === Node.ELEMENT_NODE) {
            var tag = node.tagName.toLowerCase();
            if (isSkipTag(tag)) return;
            if (node.classList && (node.classList.contains('material-symbols-outlined') ||
                node.classList.contains('font-mono'))) return;

            /* placeholders */
            if (node.hasAttribute('placeholder')) {
                if (!node.hasAttribute('data-orig-placeholder')) {
                    node.setAttribute('data-orig-placeholder', node.getAttribute('placeholder'));
                }
                var origPh = node.getAttribute('data-orig-placeholder');
                var dictPh = appTranslations[targetLang] || {};
                node.setAttribute('placeholder', targetLang === 'en'
                    ? origPh
                    : (dictPh[origPh] || origPh));
            }

            /* title tooltips */
            if (node.hasAttribute('title')) {
                if (!node.hasAttribute('data-orig-title')) {
                    node.setAttribute('data-orig-title', node.getAttribute('title'));
                }
                var origT = node.getAttribute('data-orig-title');
                var dictT = appTranslations[targetLang] || {};
                node.setAttribute('title', targetLang === 'en' ? origT : (dictT[origT] || origT));
            }

            for (var i = 0; i < node.childNodes.length; i++) {
                walkAndTranslate(node.childNodes[i], targetLang);
            }
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            var text = node.nodeValue;
            if (!text) return;
            var trimmed = text.trim();
            if (!trimmed) return;

            /* \u00A0 (from &nbsp; markup) must match plain-space dict keys */
            var canon = trimmed.replace(/\u00A0/g, ' ');
            if (!node._origText) node._origText = trimmed;
            var orig = node._origText;
            var origCanon = orig.replace(/\u00A0/g, ' ');
            var dict = appTranslations[targetLang] || {};

            /* exact-match first: safe for split text nodes like
               "Right Care." + " Right Facility." across spans */
            if (targetLang === 'en') {
                node.nodeValue = text.replace(trimmed, orig);
            } else if (dict[origCanon]) {
                node.nodeValue = text.replace(trimmed, dict[origCanon]);
            } else if (dict[orig]) {
                node.nodeValue = text.replace(trimmed, dict[orig]);
            } else if (dict && Object.keys(dict).length) {
                /* substring sweep for mixed text nodes, but only with
                   keys we have not already replaced inside this run */
                var translated = origCanon;
                var keys = Object.keys(dict);
                /* longest keys first so longer phrases win over words */
                keys.sort(function (a, b) { return b.length - a.length; });
                for (var k = 0; k < keys.length; k++) {
                    if (keys[k].length > 2 && translated.indexOf(keys[k]) >= 0) {
                        translated = translated.split(keys[k]).join(dict[keys[k]]);
                    }
                }
                node.nodeValue = text.replace(trimmed, translated);
            }
        }
    }

    /* ============================================================
       MODULE RE-RENDER HOOKS — JS-drawn widgets follow the switch
       ============================================================ */
    function rerenderJsWidgets() {
        /* facilities finder grid + chips (JS-rendered) */
        try {
            if (window.Facilities) {
                if (typeof Facilities.render === 'function') Facilities.render();
            }
        } catch (e) { /* widget absent on this page */ }

        /* AI triage v2 panels (own full trilingual UI of their own —
           they follow window.currentLang internally) */
        try {
            if (window.MitraTriage && typeof window.MitraTriage.setLang === 'function') {
                window.MitraTriage.setLang(currentActiveLang === 'en' ? 'en' : currentActiveLang);
            }
        } catch (e) { /* not on this page */ }
        try {
            if (window.MitraChat && typeof window.MitraChat.onLangChange === 'function') {
                window.MitraChat.onLangChange(currentActiveLang);
            }
        } catch (e) { /* not on this page */ }

        /* handshake citizen view re-renders via its own timer; nudge it */
        try {
            if (window.HandshakeCitizen && typeof window.HandshakeCitizen.render === 'function') {
                window.HandshakeCitizen.render();
            }
        } catch (e) { /* not on this page */ }
    }

    /* ============================================================
       PUBLIC API
       ============================================================ */
    function translatePage(lang) {
        if (LANGS.indexOf(lang) < 0) lang = 'en';
        currentActiveLang = lang;

        /* <html lang> for a11y + Devanagari IME hints */
        try { document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : (lang === 'hi' ? 'hi' : 'mr')); } catch (e) { }

        /* global flag consumed by TTS + multilingual widgets */
        window.currentLang = lang;
        window.currentActiveLang = lang;

        /* dropdown header code */
        var langCodeEl = document.getElementById('current-lang-code');
        if (langCodeEl) langCodeEl.textContent = lang.toUpperCase();

        /* dropdown + mobile pill highlight state */
        LANGS.forEach(function (l) {
            var btn = document.getElementById('btn-lang-' + l);
            var check = document.getElementById('check-' + l);
            var mobBtn = document.getElementById('mob-lang-' + l);

            if (btn) {
                if (l === lang) {
                    btn.classList.add('bg-primary/10', 'font-bold', 'text-primary');
                    if (check) check.classList.remove('hidden');
                } else {
                    btn.classList.remove('bg-primary/10', 'font-bold', 'text-primary');
                    if (check) check.classList.add('hidden');
                }
            }
            if (mobBtn) {
                mobBtn.className = (l === lang)
                    ? "px-2.5 py-1 text-xs font-bold rounded border border-primary bg-primary text-on-primary"
                    : "px-2.5 py-1 text-xs font-bold rounded border border-outline-variant bg-surface text-on-surface";
            }
        });

        /* re-draw JS widgets (fresh English) so the walker below
           can translate EVERYTHING — including just-rendered rows */
        rerenderJsWidgets();

        /* modules with their own render loops re-draw now too */
        try { window.dispatchEvent(new CustomEvent('em:language-changed', { detail: { lang: lang } })); } catch (e) { }

        /* walk LAST: static markup + freshly rendered JS content */
        walkAndTranslate(document.body, lang);

        /* persist */
        try { localStorage.setItem('selected_lang', lang); } catch (e) { /* private mode */ }

        appliedOnce = true;
    }

    /* re-apply after each language switch request from any module */
    function currentLang() { return currentActiveLang; }

    /* ============================================================
       BOOT — apply saved language as early as possible
       ============================================================ */
    function boot() {
        var saved = 'en';
        try { saved = localStorage.getItem('selected_lang') || 'en'; } catch (e) { /* private mode */ }
        window.currentLang = saved;
        window.currentActiveLang = saved;

        if (saved !== 'en') translatePage(saved);
        else {
            /* keep header code in sync even in EN */
            var el = document.getElementById('current-lang-code');
            if (el) el.textContent = 'EN';
        }

        /* late-rendered widgets: re-apply once more after full paint */
        setTimeout(function () {
            if (currentActiveLang !== 'en') walkAndTranslate(document.body, currentActiveLang);
        }, 400);
    }

    document.addEventListener('DOMContentLoaded', boot);
    /* if the script loads after DOM ready (defer-like ordering) */
    if (document.readyState !== 'loading' && !appliedOnce) boot();

    /* ============================================================
       EXPOSE — translatePage stays a global (existing onclicks work)
       ============================================================ */
    window.appTranslations = appTranslations;
    window.translatePage = translatePage;
    window.getTranslationLang = currentLang;

    /* Modules that draw their own trilingual UI (ai-triage, chat,
       handshake citizen view) re-render themselves through the
       em:language-changed event emitted above. */
})();

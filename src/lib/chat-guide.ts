import { and, desc, eq } from "drizzle-orm";
import { db, collectionCenters, pickupRequests, productListings, settlementRecords } from "@/db";
import type { SafeUser } from "@/lib/auth";
import { formatINR } from "@/lib/constants";
import type { ChatLanguage } from "@/lib/chat-languages";

export type ChatTopic = "hello" | "centers" | "listing" | "payment" | "pickup" | "tracking" | "ai" | "recycling" | "safety" | "help";

const cues: Record<Exclude<ChatTopic, "help">, RegExp> = {
  centers: /cent[er][re]|hub|location|amritsar|jalandhar|phagwara|ludhiana|mohali|patiala|where|nearest|ਕਿੱਥੇ|ਕੇਂਦਰ|ਅੰਮ੍ਰਿਤਸਰ|ਜਲੰਧਰ|ਫਗਵਾੜਾ|कहाँ|केंद्र|अमृतसर|जालंधर|फगवाड़ा|কেন্দ্র|केंद्र|மையம்|కేంద్రం/i,
  payment: /pay|paid|earn|money|wallet|payout|cash|bank|bill|invoice|receipt|settlement|refund|rupee|₹|ਪੈਸੇ|ਭੁਗਤਾਨ|ਭੁਗਤਾਨ|ਭੁਗਤ|ਬਿੱਲ|पैस|भुगतान|बिल|रसीद|वॉलेट|টাকা|পেমেন্ট|பணம்|கட்டணம்|డబ్బు|చెల్లింపు/i,
  listing: /list|sell|product|device price|offer|quote|valuation|brand|model|फोटो|बेचन|लिस्ट|उत्पाद|ऑफ़र|कीमत|ਲਿਸਟ|ਵੇਚ|ਕੀਮਤ|ਪੇਸ਼ਕਸ਼|ਪ੍ਰੋਡਕਟ|দাম|விலை|ధర/i,
  tracking: /track|status|request id|eco-\d{4}|journey|where is my|order|ट्रैक|स्थिति|मेरा अनुरोध|ਕਿੱਥੇ.*ਮੇਰ|ਸਥਿਤੀ|ਟਰੈਕ|অবস্থা|நிலை|స్థితి/i,
  pickup: /pickup|collect|schedule|doorstep|time slot|address|book|पिकअप|कलेक्शन|उठा|समय|पता|ਇਕੱਠਾ|ਪਿਕਅੱਪ|ਸਮਾਂ|ਪਤਾ|சேகரிப்பு|సేకరణ/i,
  ai: /\bai\b|scan|photo|image|detect|classif|identify|vision|एआई|पहचान|तस्वीर|फोटो|ਏਆਈ|ਫੋਟੋ|ਪਛਾਣ|ছবি|படம்|చిత్రం/i,
  recycling: /recycl|epr|cpcb|environment|carbon|impact|recovery|रीसायक|रिसाइक|पर्यावरण|ਰੀਸਾਈਕਲ|ਮੁੜ ਵਰਤ|পরিবেশ|மறுசுழற்சி|రీసైక్లింగ్/i,
  safety: /battery|batteries|swollen|data wipe|privacy|secure|hazard|safely|safety|safe|बैटरी|सुरक्षा|सुरक्षित|डेटा|ਬੈਟਰੀ|ਸੁਰੱਖਿਆ|ਸੁਰੱਖਿਅਤ|ਡਾਟਾ|பேட்டரி|பாதுகாப்பாக|బ్యాటరీ/i,
  hello: /^(hi|hey|hello|namaste|sat sri akal|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|नमस्ते|नमस्कार|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ|হ্যালো|வணக்கம்|నమస్కారం)[! .?]*$/i,
};

type GuideLanguage = "en" | "hi" | "pa" | "bn" | "mr" | "ta" | "te";
const replies: Record<GuideLanguage, Record<ChatTopic, string>> = {
  en: {
    hello: "Hello! I'm Tara, your EcoTrace guide. I can help with product listings, pickup booking, Punjab demo hubs, tracking and the sandbox wallet. What would you like to explore?",
    centers: "Our Punjab collection-point listings include Phagwara and nearby Goraya, Banga, Kapurthala, Hoshiarpur and Jalandhar, as well as Ludhiana, Amritsar, Mohali and Patiala. These are sample map records, not verified facilities or a promise of nationwide pickup. Search by city or category on the centers page.",
    listing: "To list a device: sign in → My Products & Wallet → Create listing → add a product photo, category, condition and quantity. The displayed INR is an indicative SANDBOX guide, not a buyback guarantee. An admin reviews and sends an offer. Accept it to book a linked doorstep pickup.",
    payment: "The payment journey is: list product → admin-reviewed offer → you accept → partner collects & weighs → hub verifies → recycler documents recovery → admin prepares & approves settlement → DEMO wallet credit. No money or bank transfer occurs here. A printable *sandbox statement* is available after settlement.",
    pickup: "Choose a demo pilot center, upload your device photo or enter items, add a private pickup address and preferred time slot. Admin assigns a partner. The actual number of items and weight are recorded at physical collection—not guessed from a photo.",
    tracking: "Sign in to see your own pickup journey under the Citizen dashboard. You can also enter a request ID on the Impact page to see a public, privacy-redacted chain of custody. A collected item is not recycled until the recycler documents processing.",
    ai: "Upload a photo to the AI scanner to get editable device categories. If an external Vision API is configured it can return visible counts and confidence; without a key the app honestly shows Demo Mode suggestions. Exact quantity must be confirmed, and only a scale can establish actual weight.",
    recycling: "EcoTrace keeps requested quantity, estimated weight, measured collection, recycler gate weight and documented recycled mass as separate records. Collected waste is never automatically 'recycled', and an internal EPR record is NOT a statutory CPCB credit or certificate.",
    safety: "Please keep swollen lithium batteries isolated and tell your collection partner. Remove SIM cards and wipe personal data before pickup. Your street address is private to your account, the assigned partner and authorized operations staff.",
    help: "I can guide you through listing a device, choosing a Punjab demonstration center, booking pickup, tracking your request, recycling stages or the sandbox wallet. Try asking about one of those topics. I’m a multilingual knowledge-base guide until an external AI key is configured.",
  },
  hi: {
    hello: "नमस्ते! मैं तारा, आपकी EcoTrace सहायक हूँ। उत्पाद लिस्टिंग, पिकअप, पंजाब के डेमो सेंटर, ट्रैकिंग और डेमो वॉलेट के बारे में पूछिए।",
    centers: "पंजाब में लुधियाना, अमृतसर, जालंधर, फगवाड़ा, मोहाली और पटियाला के *डेमो* संग्रह केंद्र दिखाए गए हैं। ये नमूना स्थान हैं, सरकारी मान्यता प्राप्त केंद्र या देशव्यापी सेवा नहीं। शहर के अनुसार केंद्र पेज पर खोजें।",
    listing: "उत्पाद लिस्ट करने के लिए लॉग इन करें → My Products & Wallet → नया उत्पाद जोड़ें → फोटो, श्रेणी, स्थिति और संख्या भरें। दिखाई गई कीमत केवल डेमो अनुमान है। एडमिन ऑफर देता है; स्वीकार करने के बाद पिकअप बुक करें।",
    payment: "भुगतान का डेमो क्रम: उत्पाद लिस्ट → एडमिन ऑफर → आपकी स्वीकृति → असली वजन से संग्रह → हब सत्यापन → रीसायकल दस्तावेज़ → एडमिन अनुमोदन → *डेमो वॉलेट* क्रेडिट। यहाँ कोई असली बैंक ट्रांसफर नहीं होता। प्रिंट करने योग्य डेमो स्टेटमेंट उपलब्ध है।",
    pickup: "डेमो पायलट केंद्र चुनें, सामान की फोटो या विवरण दें, निजी पिकअप पता और समय चुनें। एडमिन पार्टनर नियुक्त करेगा। वास्तविक संख्या और वजन संग्रह के समय तौले जाते हैं।",
    tracking: "लॉग इन करके Citizen डैशबोर्ड में अपनी पिकअप स्थिति देखें। Impact पेज पर अनुरोध आईडी से निजी पता छिपाकर यात्रा देख सकते हैं। एकत्रित सामान रीसायकल होने के बराबर नहीं है।",
    ai: "फोटो अपलोड करके डिवाइस की श्रेणी जाँचें और सुझाव बदलें। असली Vision API होने पर पहचान मिल सकती है; कुंजी न होने पर Demo Mode साफ़ दिखता है। सटीक वजन सिर्फ़ तराजू से पता चलता है।",
    recycling: "EcoTrace अनुमानित वजन, वास्तविक संग्रह, रीसायकल केंद्र पर प्राप्त वजन और दस्तावेज़ी रीसायकल मात्रा अलग रखता है। आंतरिक EPR रिकॉर्ड कोई कानूनी CPCB प्रमाणपत्र नहीं है।",
    safety: "फूली हुई लिथियम बैटरी अलग रखें और पार्टनर को बताएँ। पिकअप से पहले सिम निकालें और निजी डेटा मिटाएँ। आपका पूरा पता सार्वजनिक ट्रैकिंग में नहीं दिखता।",
    help: "आप मुझसे उत्पाद लिस्टिंग, पंजाब के डेमो सेंटर, पिकअप, ट्रैकिंग, रीसायकल या डेमो वॉलेट के बारे में पूछ सकते हैं। बाहरी AI कुंजी न होने पर मैं सीमित विषयों की बहुभाषी गाइड हूँ।",
  },
  pa: {
    hello: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤਾਰਾ, ਤੁਹਾਡੀ EcoTrace ਸਹਾਇਕ ਹਾਂ। ਉਤਪਾਦ ਲਿਸਟਿੰਗ, ਪਿਕਅੱਪ, ਪੰਜਾਬ ਦੇ ਡੈਮੋ ਕੇਂਦਰ, ਟਰੈਕਿੰਗ ਜਾਂ ਡੈਮੋ ਵਾਲਿਟ ਬਾਰੇ ਪੁੱਛੋ।",
    centers: "ਪੰਜਾਬ ਵਿੱਚ ਲੁਧਿਆਣਾ, ਅੰਮ੍ਰਿਤਸਰ, ਜਲੰਧਰ, ਫਗਵਾੜਾ, ਮੋਹਾਲੀ ਅਤੇ ਪਟਿਆਲਾ ਦੇ *ਡੈਮੋ* ਕੇਂਦਰ ਦਿਖਾਏ ਗਏ ਹਨ। ਇਹ ਸਿਰਫ਼ ਨਮੂਨਾ ਟਿਕਾਣੇ ਹਨ, ਸਰਕਾਰੀ ਮਾਨਤਾ ਵਾਲੇ ਕੇਂਦਰ ਜਾਂ ਅਸਲ ਸੇਵਾ ਦਾ ਦਾਅਵਾ ਨਹੀਂ। ਕੇਂਦਰ ਪੰਨੇ 'ਤੇ ਸ਼ਹਿਰ ਚੁਣੋ।",
    listing: "ਡਿਵਾਈਸ ਲਿਸਟ ਕਰਨ ਲਈ ਲੌਗ ਇਨ ਕਰੋ → My Products & Wallet → ਨਵਾਂ ਉਤਪਾਦ → ਫੋਟੋ, ਕਿਸਮ, ਹਾਲਤ ਅਤੇ ਗਿਣਤੀ ਭਰੋ। ਦਿਖਾਈ ਕੀਮਤ ਸਿਰਫ਼ ਡੈਮੋ ਅੰਦਾਜ਼ਾ ਹੈ। ਐਡਮਿਨ ਪੇਸ਼ਕਸ਼ ਭੇਜੇਗਾ; ਮਨਜ਼ੂਰ ਕਰਕੇ ਪਿਕਅੱਪ ਬੁੱਕ ਕਰੋ।",
    payment: "ਡੈਮੋ ਭੁਗਤਾਨ ਕ੍ਰਮ: ਲਿਸਟਿੰਗ → ਐਡਮਿਨ ਪੇਸ਼ਕਸ਼ → ਤੁਹਾਡੀ ਮਨਜ਼ੂਰੀ → ਅਸਲ ਤੋਲ ਨਾਲ ਸੰਗ੍ਰਹਿ → ਹੱਬ ਜਾਂਚ → ਰੀਸਾਈਕਲ ਦਸਤਾਵੇਜ਼ → ਐਡਮਿਨ ਮਨਜ਼ੂਰੀ → *ਡੈਮੋ ਵਾਲਿਟ* ਕ੍ਰੈਡਿਟ। ਕੋਈ ਅਸਲੀ ਬੈਂਕ ਟ੍ਰਾਂਸਫ਼ਰ ਨਹੀਂ ਹੁੰਦਾ। ਪ੍ਰਿੰਟ ਕਰਨ ਯੋਗ ਡੈਮੋ ਸਟੇਟਮੈਂਟ ਮਿਲੇਗਾ।",
    pickup: "ਡੈਮੋ ਪਾਇਲਟ ਹੱਬ ਚੁਣੋ, ਫੋਟੋ ਜਾਂ ਸਮਾਨ ਦਾ ਵੇਰਵਾ ਦਿਓ, ਨਿੱਜੀ ਪਤਾ ਤੇ ਸਮਾਂ ਚੁਣੋ। ਐਡਮਿਨ ਪਾਰਟਨਰ ਲਗਾਏਗਾ। ਅਸਲ ਗਿਣਤੀ ਅਤੇ ਭਾਰ ਪਿਕਅੱਪ ਵੇਲੇ ਤੋਲੇ ਜਾਂਦੇ ਹਨ।",
    tracking: "ਲੌਗ ਇਨ ਕਰਕੇ Citizen ਡੈਸ਼ਬੋਰਡ ਵਿੱਚ ਆਪਣਾ ਪਿਕਅੱਪ ਦੇਖੋ। Impact ਪੰਨੇ 'ਤੇ ਬੇਨਤੀ ਆਈਡੀ ਨਾਲ ਨਿੱਜੀ ਪਤਾ ਲੁਕਾ ਕੇ ਲੜੀ ਦੇਖ ਸਕਦੇ ਹੋ। ਇਕੱਠਾ ਹੋਇਆ ਸਮਾਨ ਹਾਲੇ ਰੀਸਾਈਕਲ ਨਹੀਂ ਹੋਇਆ।",
    ai: "AI ਸਕੈਨਰ ਵਿੱਚ ਫੋਟੋ ਪਾਓ, ਸੁਝਾਈ ਸ਼੍ਰੇਣੀ ਅਤੇ ਗਿਣਤੀ ਬਦਲ ਸਕਦੇ ਹੋ। Vision API ਕੁੰਜੀ ਹੋਵੇ ਤਾਂ ਮਾਡਲ ਚੱਲੇਗਾ, ਨਹੀਂ ਤਾਂ Demo Mode ਸਪਸ਼ਟ ਦਿਖੇਗਾ। ਸਹੀ ਭਾਰ ਸਿਰਫ਼ ਤੋਲਣ ਨਾਲ ਪਤਾ ਲੱਗਦਾ ਹੈ।",
    recycling: "EcoTrace ਮੰਗੀ ਗਿਣਤੀ, ਅੰਦਾਜ਼ਾ ਭਾਰ, ਅਸਲ ਸੰਗ੍ਰਹਿ, ਰੀਸਾਈਕਲਰ ਦਾ ਪ੍ਰਾਪਤ ਭਾਰ ਅਤੇ ਦਸਤਾਵੇਜ਼ੀ ਰੀਸਾਈਕਲ ਮਾਤਰਾ ਵੱਖ ਰੱਖਦਾ ਹੈ। ਅੰਦਰੂਨੀ EPR ਰਿਕਾਰਡ CPCB ਸਰਟੀਫਿਕੇਟ ਨਹੀਂ ਹੈ।",
    safety: "ਫੁੱਲੀ ਲਿਥੀਅਮ ਬੈਟਰੀ ਵੱਖ ਰੱਖੋ ਅਤੇ ਪਾਰਟਨਰ ਨੂੰ ਦੱਸੋ। ਪਿਕਅੱਪ ਤੋਂ ਪਹਿਲਾਂ ਸਿਮ ਕੱਢੋ ਅਤੇ ਨਿੱਜੀ ਡਾਟਾ ਮਿਟਾਓ। ਤੁਹਾਡਾ ਘਰ ਦਾ ਪਤਾ ਜਨਤਕ ਟਰੈਕਿੰਗ ਵਿੱਚ ਨਹੀਂ ਦਿਖਦਾ।",
    help: "ਲਿਸਟਿੰਗ, ਪੰਜਾਬ ਡੈਮੋ ਸੈਂਟਰ, ਪਿਕਅੱਪ, ਟਰੈਕਿੰਗ, ਰੀਸਾਈਕਲ ਜਾਂ ਡੈਮੋ ਵਾਲਿਟ ਬਾਰੇ ਪੁੱਛੋ। ਬਾਹਰੀ AI ਕੁੰਜੀ ਬਿਨਾਂ ਮੈਂ ਸੀਮਤ ਵਿਸ਼ਿਆਂ ਦੀ ਬਹੁਭਾਸ਼ੀ ਗਾਈਡ ਹਾਂ।",
  },
  bn: {
    hello: "নমস্কার! আমি তারা, আপনার EcoTrace সহায়ক। পণ্য তালিকা, পিকআপ, পাঞ্জাবের ডেমো কেন্দ্র, ট্র্যাকিং ও ডেমো ওয়ালেট সম্পর্কে জিজ্ঞেস করুন।",
    centers: "পাঞ্জাবের লুধিয়ানা, অমৃতসর, জলন্ধর, ফাগওয়ারা, মোহালি ও পাতিয়ালায় নমুনা সংগ্রহ কেন্দ্র দেখানো হয়েছে। এগুলি সরকারি অনুমোদিত বাস্তব কেন্দ্র নয়; কেন্দ্র পৃষ্ঠায় শহর অনুসন্ধান করুন।",
    listing: "পণ্য তালিকাভুক্ত করুন: লগ ইন → My Products & Wallet → ছবি, বিভাগ, অবস্থা ও সংখ্যা দিন। দেখানো মূল্য কেবল ডেমো অনুমান। অ্যাডমিন অফার দিলে গ্রহণ করে পিকআপ বুক করুন।",
    payment: "ডেমো পেমেন্ট ধাপ: তালিকা → অ্যাডমিন অফার → গ্রহণ → ওজন মেপে সংগ্রহ → হাব যাচাই → পুনর্ব্যবহারের নথি → অ্যাডমিন অনুমোদন → *ডেমো ওয়ালেট* ক্রেডিট। এখানে আসল টাকা বা ব্যাঙ্ক ট্রান্সফার হয় না। স্টেটমেন্ট প্রিন্ট করা যায়।",
    pickup: "ডেমো কেন্দ্র বেছে নিন, ডিভাইসের ছবি বা তথ্য, ব্যক্তিগত ঠিকানা ও সময় দিন। অ্যাডমিন সংগ্রহ সঙ্গী নিয়োগ করবে। আসল সংখ্যা ও ওজন সংগ্রহের সময় মাপা হয়।",
    tracking: "লগ ইন করে Citizen ড্যাশবোর্ডে নিজের পিকআপ দেখুন। Impact পৃষ্ঠায় অনুরোধ আইডি দিয়ে ব্যক্তিগত ঠিকানা ছাড়া ধাপগুলি দেখতে পারেন। সংগৃহীত মানেই পুনর্ব্যবহৃত নয়।",
    ai: "AI স্ক্যানারে ছবি দিয়ে বিভাগ যাচাই করুন। Vision API থাকলে শনাক্তকরণ হয়; না থাকলে Demo Mode স্পষ্ট দেখায়। সঠিক ওজন শুধু ওজনযন্ত্রে মাপা হয়।",
    recycling: "EcoTrace অনুমান, প্রকৃত সংগ্রহের ওজন, রিসাইক্লারের প্রাপ্ত ওজন ও নথিভুক্ত পুনর্ব্যবহারের পরিমাণ আলাদাভাবে রাখে। অভ্যন্তরীণ EPR নথি আইনি CPCB সনদ নয়।",
    safety: "ফোলা লিথিয়াম ব্যাটারি আলাদা রাখুন; সিম সরিয়ে ব্যক্তিগত তথ্য মুছে ফেলুন। বাড়ির ঠিকানা পাবলিক ট্র্যাকিংয়ে প্রকাশ পায় না।",
    help: "পণ্য তালিকা, পাঞ্জাবের ডেমো কেন্দ্র, পিকআপ, ট্র্যাকিং, পুনর্ব্যবহার বা ডেমো ওয়ালেট সম্পর্কে জিজ্ঞেস করুন। AI কী না থাকলে এটি সীমিত বহুভাষিক গাইড।",
  },
  mr: {
    hello: "नमस्कार! मी तारा, तुमची EcoTrace सहाय्यक आहे. उत्पादन नोंदणी, पिकअप, पंजाबमधील डेमो केंद्र, ट्रॅकिंग किंवा डेमो वॉलेट विचारा.",
    centers: "पंजाबमध्ये लुधियाना, अमृतसर, जालंधर, फगवाडा, मोहाली आणि पटियाला येथील *डेमो* केंद्रे दाखवली आहेत. ही सरकारी मान्यताप्राप्त प्रत्यक्ष केंद्रे नाहीत. केंद्र पृष्ठावर शहर शोधा.",
    listing: "लॉग इन → My Products & Wallet → फोटो, प्रकार, स्थिती आणि संख्या भरून उत्पादन नोंदवा. दाखवलेली किंमत फक्त डेमो अंदाज आहे. प्रशासकाची ऑफर स्वीकारून पिकअप बुक करा.",
    payment: "डेमो क्रम: उत्पादन → प्रशासकाची ऑफर → स्वीकृती → वजनासह संकलन → केंद्र तपासणी → पुनर्वापर नोंदी → प्रशासक मंजुरी → *डेमो वॉलेट* क्रेडिट. येथे खरे पैसे किंवा बँक हस्तांतरण नाही. स्टेटमेंट प्रिंट करता येते.",
    pickup: "डेमो केंद्र, उपकरणांचा फोटो, खाजगी पत्ता आणि वेळ निवडा. प्रशासक भागीदार नेमतो. प्रत्यक्ष संख्या आणि वजन संकलनाच्या वेळीच नोंदवले जाते.",
    tracking: "लॉग इन करून Citizen डॅशबोर्डवर तुमच्या पिकअपचा प्रवास पाहा. Impact पृष्ठावर मागणी क्रमांकाने खाजगी पत्ता न दाखवता स्थिती दिसते. गोळा केलेले म्हणजे पुनर्वापर झालेले नाही.",
    ai: "AI स्कॅनरवर फोटो टाका आणि सुचवलेली श्रेणी दुरुस्त करा. Vision API नसेल तर Demo Mode स्पष्ट दिसतो. अचूक वजन फक्त तराजूवर मोजता येते.",
    recycling: "EcoTrace अंदाज, प्रत्यक्ष संकलन, रिसायकलरला मिळालेले वजन आणि दस्तऐवजीकृत पुनर्वापर वेगळे ठेवते. अंतर्गत EPR नोंद कायदेशीर CPCB प्रमाणपत्र नाही.",
    safety: "फुगलेली लिथियम बॅटरी वेगळी ठेवा; सिम काढा आणि वैयक्तिक डेटा पुसा. घरचा पत्ता सार्वजनिक ट्रॅकिंगमध्ये नसतो.",
    help: "उत्पादन, पंजाब डेमो केंद्र, पिकअप, ट्रॅकिंग, पुनर्वापर किंवा डेमो वॉलेटबद्दल विचारा. AI की नसल्यास हा मर्यादित बहुभाषिक मार्गदर्शक आहे.",
  },
  ta: {
    hello: "வணக்கம்! நான் தாரா, உங்கள் EcoTrace வழிகாட்டி. பொருள் பட்டியல், பிக்கப், பஞ்சாப் மாதிரி மையங்கள், கண்காணிப்பு அல்லது மாதிரி வாலட் பற்றி கேளுங்கள்.",
    centers: "பஞ்சாபின் லூதியானா, அமிர்தசரஸ், ஜலந்தர், பக்வாரா, மொஹாலி, பாட்டியாலாவில் *மாதிரி* மையங்கள் காட்டப்படுகின்றன. இவை அரசு அங்கீகாரம் பெற்ற உண்மையான மையங்கள் அல்ல. மையங்கள் பக்கத்தில் தேடுங்கள்.",
    listing: "உள்நுழைவு → My Products & Wallet → சாதனப் புகைப்படம், வகை, நிலை மற்றும் எண்ணிக்கை சேர்க்கவும். காட்டப்படும் மதிப்பு மாதிரி வழிகாட்டுதலே. நிர்வாகி வழங்கும் முன்மொழிவை ஏற்று பிக்கப் முன்பதிவு செய்யுங்கள்.",
    payment: "மாதிரி பணப் பாதை: பட்டியல் → நிர்வாகியின் சலுகை → ஏற்பு → எடை போட்டு சேகரிப்பு → மைய சரிபார்ப்பு → மறுசுழற்சி ஆவணம் → ஒப்புதல் → *மாதிரி வாலட்* கிரெடிட். உண்மையான பணமோ வங்கிப் பரிமாற்றமோ இல்லை. அறிக்கையை அச்சிடலாம்.",
    pickup: "மாதிரி மையம், சாதனப் புகைப்படம், தனிப்பட்ட முகவரி, நேர இடைவெளி தேர்வுசெய்க. நிர்வாகி சேகரிப்பு கூட்டாளியை நியமிப்பார். உண்மையான எடை சேகரிக்கும் போதே அளக்கப்படும்.",
    tracking: "உள்நுழைந்து Citizen டாஷ்போர்டில் உங்கள் பிக்கப்பைப் பார்க்கவும். Impact பக்கத்தில் கோரிக்கை எண்ணுடன் தனிப்பட்ட முகவரி இல்லாமல் நிலையைப் பாருங்கள். சேகரித்தது மறுசுழற்சி ஆனது என்பதல்ல.",
    ai: "AI ஸ்கேனரில் புகைப்படத்தைப் பதிவேற்றி வகையைச் சரிசெய்யலாம். Vision API இல்லாதபோது Demo Mode காட்டப்படும். உண்மையான எடை தராசில் மட்டுமே அளக்கப்படும்.",
    recycling: "EcoTrace மதிப்பீடு, சேகரிக்கப்பட்ட எடை, மறுசுழற்சியாளரின் எடை மற்றும் ஆவணப்படுத்திய மறுசுழற்சி அளவைத் தனித்தனியாகப் பதிகிறது. உள்ளக EPR பதிவு சட்டப்பூர்வ CPCB சான்றிதழல்ல.",
    safety: "வீங்கிய லித்தியம் பேட்டரிகளை தனியாக வைத்துக் கொள்ளுங்கள். சிம் நீக்கி தனிப்பட்ட தரவை அழிக்கவும். வீட்டு முகவரி பொது கண்காணிப்பில் தெரியாது.",
    help: "பொருள் பட்டியல், பஞ்சாப் மாதிரி மையங்கள், பிக்கப், கண்காணிப்பு, மறுசுழற்சி அல்லது மாதிரி வாலட் பற்றி கேளுங்கள். AI விசை இல்லாவிட்டால் இது வரம்புள்ள பன்மொழி வழிகாட்டி.",
  },
  te: {
    hello: "నమస్కారం! నేను తారా, మీ EcoTrace మార్గదర్శి. పరికరాల లిస్టింగ్, పికప్, పంజాబ్ డెమో కేంద్రాలు, ట్రాకింగ్ లేదా డెమో వాలెట్ గురించి అడగండి.",
    centers: "పంజాబ్‌లో లూథియానా, అమృత్‌సర్, జలంధర్, ఫగ్వారా, మొహాలి, పాటియాలా *డెమో* కేంద్రాలు చూపిస్తున్నాం. ఇవి ప్రభుత్వ అనుమతి గల నిజమైన కేంద్రాలు కావు. కేంద్రాల పేజీలో నగరం ఎంచుకోండి.",
    listing: "లాగిన్ → My Products & Wallet → పరికరపు ఫోటో, వర్గం, స్థితి, సంఖ్య నమోదు చేయండి. చూపించే ధర డెమో అంచనా మాత్రమే. నిర్వాహకుడి ఆఫర్‌ను అంగీకరించి పికప్ బుక్ చేయండి.",
    payment: "డెమో క్రమం: లిస్టింగ్ → నిర్వాహకుడి ఆఫర్ → అంగీకారం → నిజమైన తూకంతో సేకరణ → కేంద్ర ధృవీకరణ → రీసైక్లింగ్ పత్రాలు → ఆమోదం → *డెమో వాలెట్* క్రెడిట్. నిజమైన డబ్బు లేదా బ్యాంకు బదిలీ జరగదు. స్టేట్‌మెంట్ ప్రింట్ చేయవచ్చు.",
    pickup: "డెమో కేంద్రం, ఫోటో, వ్యక్తిగత చిరునామా, సమయం ఎంచుకోండి. నిర్వాహకుడు భాగస్వామిని నియమిస్తారు. నిజమైన సంఖ్య, బరువు సేకరణప్పుడు కొలుస్తారు.",
    tracking: "లాగిన్ అయి Citizen డ్యాష్‌బోర్డులో మీ పికప్ చూడండి. Impact పేజీలో అభ్యర్థన సంఖ్యతో చిరునామా లేకుండా దశలు చూడవచ్చు. సేకరించిన వస్తువు వెంటనే రీసైకిల్ అయినట్లు కాదు.",
    ai: "AI స్కానర్‌లో ఫోటోను అప్‌లోడ్ చేసి వర్గం సరిచేయండి. Vision API లేకుంటే Demo Mode స్పష్టంగా కనిపిస్తుంది. ఖచ్చితమైన బరువు తూకం ద్వారానే తెలుస్తుంది.",
    recycling: "EcoTrace అంచనా, సేకరించిన బరువు, రీసైక్లర్‌కు అందిన బరువు, పత్రాల్లోని రీసైక్లింగ్ మొత్తాన్ని వేర్వేరుగా ఉంచుతుంది. అంతర్గత EPR రికార్డు చట్టబద్ధ CPCB సర్టిఫికేట్ కాదు.",
    safety: "ఉబ్బిన లిథియం బ్యాటరీలను వేరుగా ఉంచండి; సిమ్ కార్డు తీసి వ్యక్తిగత సమాచారం తొలగించండి. ఇంటి చిరునామా పబ్లిక్ ట్రాకింగ్‌లో కనిపించదు.",
    help: "పరికరాల లిస్టింగ్, పంజాబ్ డెమో కేంద్రాలు, పికప్, ట్రాకింగ్, రీసైక్లింగ్ లేదా డెమో వాలెట్ గురించి అడగండి. AI కీ లేకపోతే ఇది పరిమిత బహుభాషా గైడ్.",
  },
};

export function detectChatLanguage(text: string, requested: ChatLanguage): Exclude<ChatLanguage, "auto"> {
  if (requested !== "auto") return requested;
  if (/[\u3040-\u30FF]/u.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/u.test(text)) return "ko";
  if (/[\u4E00-\u9FFF]/u.test(text)) return "zh";
  if (/[\u0A00-\u0A7F]/u.test(text)) return "pa";
  if (/[\u0A80-\u0AFF]/u.test(text)) return "gu";
  if (/[\u0980-\u09FF]/u.test(text)) return "bn";
  if (/[\u0B00-\u0B7F]/u.test(text)) return "or";
  if (/[\u0B80-\u0BFF]/u.test(text)) return "ta";
  if (/[\u0C00-\u0C7F]/u.test(text)) return "te";
  if (/[\u0C80-\u0CFF]/u.test(text)) return "kn";
  if (/[\u0D00-\u0D7F]/u.test(text)) return "ml";
  if (/[\u0900-\u097F]/u.test(text)) return "hi";
  if (/[\u0600-\u06FF]/u.test(text)) return /[ےںٹڈڑگپچ]/u.test(text) ? "ur" : "ar";
  if (/\b(sat sri akal|ki haal|kiven|paise kado|sanu|daso|kidda)\b/i.test(text)) return "pa";
  if (/\b(namaste|mujhe|kaise|kitna|kahan|paisa|bhejo|mera|meri|kab|hai)\b/i.test(text)) return "hi";
  return "en";
}

export function classifyChatTopic(text: string): ChatTopic {
  const order: ChatTopic[] = ["hello", "payment", "listing", "tracking", "centers", "pickup", "safety", "ai", "recycling"];
  for (const topic of order) if (topic !== "help" && cues[topic].test(text)) return topic;
  return "help";
}

export async function guidedAnswer(message: string, language: Exclude<ChatLanguage, "auto">, user: SafeUser | null) {
  const topic = classifyChatTopic(message);
  const localLanguage: GuideLanguage = language in replies ? language as GuideLanguage : "en";
  let text = replies[localLanguage][topic];
  if (localLanguage !== language) text = `Live translation into your selected language is temporarily unavailable. Here is the verified English guide instead:\n\n${text}`;
  const links: { label: string; href: string }[] = [];
  if (topic === "centers") {
    const rows = await db.select({ city: collectionCenters.city, code: collectionCenters.code }).from(collectionCenters).where(eq(collectionCenters.state, "Punjab"));
    const cities = [...new Set(rows.map((r) => r.city))];
    text += `\n\n📍 ${cities.join(" · ")} (${rows.length} sample hubs in database)`;
    links.push({ label: "Explore demo hubs", href: "/collection-centers" });
  }
  if (topic === "listing" || topic === "payment") {
    links.push({ label: "My products & wallet", href: user ? "/dashboard/citizen?tab=marketplace" : "/login" });
  }
  if (topic === "pickup" || topic === "ai") links.push({ label: "Book a pickup", href: "/dashboard/citizen?tab=schedule" });
  if (topic === "tracking") {
    const code = message.match(/ECO-\d{4}-[\w-]+/i)?.[0]?.toUpperCase();
    if (user) {
      const rows = await db.select({ requestCode: pickupRequests.requestCode, status: pickupRequests.status, actualCollectedWeightKg: pickupRequests.actualCollectedWeightKg })
        .from(pickupRequests).where(and(eq(pickupRequests.citizenId, user.id), ...(code ? [eq(pickupRequests.requestCode, code)] : [])))
        .orderBy(desc(pickupRequests.createdAt)).limit(3);
      if (rows.length) text += `\n\n🔒 Your ${code ? "matching" : "recent"} record(s): ${rows.map((r) => `${r.requestCode}: ${r.status.replaceAll("_", " ")}${r.actualCollectedWeightKg != null ? ` · ${r.actualCollectedWeightKg} kg collected` : ""}`).join(" | ")}.`;
      else if (code) text += "\n\n🔒 No request matching that code belongs to this signed-in account.";
    } else text += "\n\n🔒 Log in to ask me about your personal requests; I cannot reveal someone else's data.";
    links.push({ label: "Track my requests", href: "/dashboard/citizen" });
  }
  if (topic === "payment" && user) {
    const rows = await db.select({ status: settlementRecords.status, amount: settlementRecords.finalAmountPaise }).from(settlementRecords).where(eq(settlementRecords.ownerId, user.id));
    const credited = rows.filter((r) => r.status === "credited").reduce((sum, r) => sum + r.amount, 0);
    const awaiting = rows.filter((r) => r.status !== "credited").length;
    text += `\n\n🔒 Your demo wallet credited total: ${formatINR(credited)}. Awaiting approval/credit: ${awaiting}. These are sandbox entries, not real funds.`;
  }
  if (topic === "listing" && user) {
    const rows = await db.select({ listingCode: productListings.listingCode, title: productListings.title, status: productListings.status }).from(productListings).where(eq(productListings.ownerId, user.id)).orderBy(desc(productListings.createdAt)).limit(3);
    if (rows.length) text += `\n\n🔒 Your recent products: ${rows.map((r) => `${r.listingCode} · ${r.title} (${r.status.replaceAll("_", " ")})`).join(" | ")}.`;
  }
  if (topic === "recycling") links.push({ label: "Impact & traceability", href: "/impact" });
  return { text, topic, links };
}

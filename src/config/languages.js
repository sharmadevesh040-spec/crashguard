// Central configuration for Indian Regional Languages

export const SUPPORTED_LANGUAGES = [
  {
    code: 'en-IN',
    name: 'English',
    nativeName: 'English (India)',
    ttsPrompt: 'Crash detected. Are you okay?',
    safeKeywords: ['okay', 'ok', 'safe', 'fine', 'stop', 'cancel', 'good', 'no', 'im okay', 'i am okay', 'i am ok', "i'm ok", 'i am fine', 'yes i am fine']
  },
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिंदी',
    ttsPrompt: 'Durghatna ka pata chala hai. Kya aap theek hain?',
    safeKeywords: ['theek', 'thik', 'haan', 'ha', 'sahi', 'surakshit', 'cancel', 'okay', 'ok', 'nhi', 'nahi', 'mujhe kuch nahi hua', 'me thik hu', 'main thik hu', 'mai thik hu', 'haan thik hu', 'main theek hoon', 'theek hu', 'rok do', 'ruko', 'safe']
  },
  {
    code: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    ttsPrompt: 'Durghotona dhora porechhe. Apni ki thik achhen?',
    safeKeywords: ['thik', 'theek', 'achhi', 'hyan', 'na', 'kuchu hoyni', 'safe', 'okay', 'cancel']
  },
  {
    code: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    ttsPrompt: 'Pramadam jarigindhi. Meeru kshemamga unnara?',
    safeKeywords: ['kshemam', 'avunu', 'bagunnanu', 'safe', 'okay', 'cancel', 'kadhu', 'em kaledu', 'unnara', 'theek']
  },
  {
    code: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    ttsPrompt: 'Aapghat zalyache aadhale aahe. Tumhi theek aahat ka?',
    safeKeywords: ['theek', 'thik', 'ho', 'nah', 'kahi nahi zale', 'safe', 'okay', 'cancel', 'aahat']
  },
  {
    code: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    ttsPrompt: 'Vibathu kandupidikkappattullathu. Neengal nallamirukkirirgala?',
    safeKeywords: ['nalam', 'nalla', 'illa', 'aam', 'okay', 'safe', 'cancel', 'onnumila']
  },
  {
    code: 'ur-IN',
    name: 'Urdu',
    nativeName: 'اردو',
    ttsPrompt: 'Haadsa detect hua hai. Kya aap theek hain?',
    safeKeywords: ['theek', 'thik', 'haan', 'ha', 'sahi', 'mehfooz', 'cancel', 'okay', 'nahi', 'mujhe kuch nahi hua']
  },
  {
    code: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    ttsPrompt: 'Akasmat no khyal aavyo che. Tame thik cho?',
    safeKeywords: ['thik', 'theek', 'ha', 'baraabar', 'safe', 'okay', 'cancel', 'nathi', 'kai nathi thiyu']
  },
  {
    code: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    ttsPrompt: 'Apaghata pattiyagide. Neevu sari iddeera?',
    safeKeywords: ['sari', 'howdu', 'kshema', 'safe', 'okay', 'cancel', 'illa', 'enu agilla']
  },
  {
    code: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    ttsPrompt: 'Apakadam nadannu. Ningalkku kuzhappamonnumille?',
    safeKeywords: ['kuzhappamilla', 'illa', 'shari', 'safe', 'okay', 'cancel', 'athe']
  },
  {
    code: 'pa-IN',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    ttsPrompt: 'Haadsa detect hoya hai. Ki tussi theek ho?',
    safeKeywords: ['theek', 'thik', 'haan', 'ha', 'sahi', 'safe', 'okay', 'cancel', 'nahi', 'kujh nahi hoya']
  }
];

// Fallback to English if setting is missing
export const getLanguageConfig = (code) => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code) || SUPPORTED_LANGUAGES[0];
};

// Combine all safe words across languages to ensure absolute safety catch-all
export const getGlobalSafeKeywords = () => {
  const allWords = new Set();
  SUPPORTED_LANGUAGES.forEach(lang => {
    lang.safeKeywords.forEach(keyword => allWords.add(keyword.toLowerCase()));
  });
  return Array.from(allWords);
};

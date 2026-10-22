// Languages OVEREASE can listen to and answer in. `speech` is the BCP 47 tag the browser uses
// for both listening and speaking. Availability of a voice depends on the student's device.
export type Language = { code: string; name: string; native: string; speech: string; greeting: string };

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English", speech: "en-IN", greeting: "Hi, I am OVEREASE. Ask me anything about studying abroad." },
  { code: "hi", name: "Hindi", native: "हिन्दी", speech: "hi-IN", greeting: "नमस्ते, मैं ओवरईज़ हूँ। विदेश में पढ़ाई के बारे में कुछ भी पूछिए।" },
  { code: "bn", name: "Bengali", native: "বাংলা", speech: "bn-IN", greeting: "নমস্কার, আমি ওভারইজ। বিদেশে পড়াশোনা নিয়ে যা খুশি জিজ্ঞেস করুন।" },
  { code: "ta", name: "Tamil", native: "தமிழ்", speech: "ta-IN", greeting: "வணக்கம், நான் ஓவர்ஈஸ். வெளிநாட்டுப் படிப்பு பற்றி எதையும் கேளுங்கள்." },
  { code: "te", name: "Telugu", native: "తెలుగు", speech: "te-IN", greeting: "నమస్కారం, నేను ఓవర్‌ఈజ్. విదేశీ చదువు గురించి ఏదైనా అడగండి." },
  { code: "mr", name: "Marathi", native: "मराठी", speech: "mr-IN", greeting: "नमस्कार, मी ओव्हरईज. परदेशातील शिक्षणाबद्दल काहीही विचारा." },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", speech: "gu-IN", greeting: "નમસ્તે, હું ઓવરઈઝ છું. વિદેશમાં અભ્યાસ વિશે કંઈ પણ પૂછો." },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", speech: "kn-IN", greeting: "ನಮಸ್ಕಾರ, ನಾನು ಓವರ್‌ಈಸ್. ವಿದೇಶದಲ್ಲಿ ಓದುವ ಬಗ್ಗೆ ಏನು ಬೇಕಾದರೂ ಕೇಳಿ." },
  { code: "ml", name: "Malayalam", native: "മലയാളം", speech: "ml-IN", greeting: "നമസ്കാരം, ഞാൻ ഓവർഈസ്. വിദേശത്ത് പഠിക്കുന്നതിനെക്കുറിച്ച് എന്തും ചോദിക്കൂ." },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", speech: "pa-IN", greeting: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਓਵਰਈਜ਼ ਹਾਂ। ਵਿਦੇਸ਼ ਵਿੱਚ ਪੜ੍ਹਾਈ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ।" },
  { code: "ur", name: "Urdu", native: "اردو", speech: "ur-IN", greeting: "السلام علیکم، میں اوورایز ہوں۔ بیرونِ ملک تعلیم کے بارے میں کچھ بھی پوچھیں۔" },
];

export const DEFAULT_LANGUAGE = "en";

export function languageByCode(code: string | undefined): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

// The server only accepts a language it knows, so a request cannot put free text into the prompt.
export function languageNameOrEnglish(raw: unknown): string {
  return LANGUAGES.find((l) => l.name === raw)?.name ?? "English";
}

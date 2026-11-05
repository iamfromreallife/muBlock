"""Local labels for muBlock's UI language selector.

All Lite _locales are retained unchanged apart from these new muBlock keys.
Unknown fork-specific translations use clear English as a fallback.
"""
LABELS = {
    "en": ("Extension language", "Follow browser language"),
    "en_GB": ("Extension language", "Follow browser language"),
    "pt_PT": ("Idioma da extensão", "Seguir o idioma do navegador"),
    "pt_BR": ("Idioma da extensão", "Seguir o idioma do navegador"),
    "es": ("Idioma de la extensión", "Seguir el idioma del navegador"),
    "fr": ("Langue de l’extension", "Suivre la langue du navigateur"),
    "de": ("Sprache der Erweiterung", "Browsersprache verwenden"),
    "it": ("Lingua dell’estensione", "Segui la lingua del browser"),
    "nl": ("Taal van de extensie", "Browsertaal volgen"),
    "pl": ("Język rozszerzenia", "Użyj języka przeglądarki"),
    "ru": ("Язык расширения", "Язык браузера"),
    "uk": ("Мова розширення", "Використовувати мову браузера"),
    "ja": ("拡張機能の言語", "ブラウザーの言語を使用"),
    "ko": ("확장 프로그램 언어", "브라우저 언어 따르기"),
    "zh_CN": ("扩展程序语言", "跟随浏览器语言"),
    "zh_TW": ("擴充功能語言", "跟隨瀏覽器語言"),
    "ar": ("لغة الإضافة", "اتباع لغة المتصفح"),
    "he": ("שפת התוסף", "לפי שפת הדפדפן"),
    "tr": ("Uzantı dili", "Tarayıcı dilini kullan"),
    "cs": ("Jazyk rozšíření", "Použít jazyk prohlížeče"),
    "sk": ("Jazyk rozšírenia", "Použiť jazyk prehliadača"),
    "da": ("Udvidelsens sprog", "Følg browserens sprog"),
    "sv": ("Tilläggets språk", "Följ webbläsarens språk"),
    "fi": ("Laajennuksen kieli", "Käytä selaimen kieltä"),
    "nb": ("Utvidelsens språk", "Følg nettleserens språk"),
    "el": ("Γλώσσα επέκτασης", "Χρήση γλώσσας προγράμματος περιήγησης"),
    "ro": ("Limba extensiei", "Folosește limba browserului"),
    "hu": ("Bővítmény nyelve", "A böngésző nyelvének használata"),
    "id": ("Bahasa ekstensi", "Ikuti bahasa browser"),
    "vi": ("Ngôn ngữ tiện ích", "Theo ngôn ngữ trình duyệt"),
    "bg": ("Език на разширението", "Използвай езика на браузъра"),
    "ca": ("Idioma de l’extensió", "Segueix l’idioma del navegador"),
    "hr": ("Jezik proširenja", "Prati jezik preglednika"),
    "sl": ("Jezik razširitve", "Sledi jeziku brskalnika"),
    "sr": ("Језик проширења", "Прати језик прегледача"),
    "th": ("ภาษาของส่วนขยาย", "ใช้ภาษาของเบราว์เซอร์"),
    "hi": ("एक्सटेंशन की भाषा", "ब्राउज़र की भाषा का उपयोग करें"),
}
def add_language_messages(bundle:dict, locale:str)->None:
    label, system=LABELS.get(locale, LABELS["en"])
    bundle["muLanguageLabel"]={"message":label}
    bundle["muLanguageSystem"]={"message":system}

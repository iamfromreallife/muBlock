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
    bundle["muPickerCreateForAllWebsites"] = {
        "message": PICKER_GLOBAL_LABELS.get(locale, PICKER_GLOBAL_LABELS["en"])
    }
    cosmetic, disabled, error = COSMETIC_LABELS.get(locale, COSMETIC_LABELS["en"])
    bundle["muDisableCosmeticFiltering"] = {"message": cosmetic}
    bundle["muCosmeticDisabledForSite"] = {"message": disabled}
    bundle["muCosmeticRuleError"] = {"message": error}
    # Every upstream language gets a localized counter. Major locales have
    # hand-written singular/plural forms; others reuse Lite's own translated
    # "Custom filters" caption instead of displaying untranslated English.
    translated_title = bundle.get("customFiltersPageName", {}).get("message", "Custom filters")
    one, other = CUSTOM_FILTER_COUNT.get(locale, (
        "$1 " + translated_title, "$1 " + translated_title,
    ))
    bundle["muCustomFilterCountOne"] = {"message": one}
    bundle["muCustomFilterCountOther"] = {"message": other}



# Picker action labels. Missing locales fall back to English, as does muGetMessage.
PICKER_GLOBAL_LABELS = {
    "en": "Create for all websites",
    "en_GB": "Create for all websites",
    "pt_PT": "Criar para todos os websites",
    "pt_BR": "Criar para todos os sites",
    "es": "Crear para todos los sitios web",
    "fr": "Créer pour tous les sites web",
    "de": "Für alle Websites erstellen",
    "it": "Crea per tutti i siti web",
    "nl": "Maken voor alle websites",
    "pl": "Utwórz dla wszystkich witryn",
    "ru": "Создать для всех сайтов",
    "uk": "Створити для всіх сайтів",
    "ja": "すべてのウェブサイトに適用して作成",
    "ko": "모든 웹사이트에 적용",
    "zh_CN": "为所有网站创建",
    "zh_TW": "為所有網站建立",
    "ar": "إنشاء لجميع المواقع",
    "he": "יצירה עבור כל האתרים",
    "tr": "Tüm web siteleri için oluştur",
    "cs": "Vytvořit pro všechny weby",
    "sk": "Vytvoriť pre všetky weby",
    "da": "Opret for alle websteder",
    "sv": "Skapa för alla webbplatser",
    "fi": "Luo kaikille verkkosivustoille",
    "nb": "Opprett for alle nettsteder",
    "el": "Δημιουργία για όλους τους ιστότοπους",
    "ro": "Creează pentru toate site-urile",
    "hu": "Létrehozás minden webhelyhez",
    "id": "Buat untuk semua situs web",
    "vi": "Tạo cho tất cả trang web",
    "bg": "Създай за всички сайтове",
    "ca": "Crea per a tots els llocs web",
    "hr": "Stvori za sve web-stranice",
    "sl": "Ustvari za vsa spletna mesta",
    "sr": "Направи за све сајтове",
    "th": "สร้างสำหรับทุกเว็บไซต์",
    "hi": "सभी वेबसाइटों के लिए बनाएँ",
    "fil": "Gawin para sa lahat ng website",
    "fa": "ایجاد برای همه وب‌سایت‌ها",
    "bn": "সব ওয়েবসাইটের জন্য তৈরি করুন",
    "et": "Loo kõigile veebisaitidele",
    "lt": "Sukurti visoms svetainėms",
    "lv": "Izveidot visām vietnēm",
    "ms": "Cipta untuk semua laman web",
}

CUSTOM_FILTER_COUNT = {
    "en": ("$1 custom filter", "$1 custom filters"),
    "en_GB": ("$1 custom filter", "$1 custom filters"),
    "pt_PT": ("$1 filtro personalizado", "$1 filtros personalizados"),
    "pt_BR": ("$1 filtro personalizado", "$1 filtros personalizados"),
    "es": ("$1 filtro personalizado", "$1 filtros personalizados"),
    "fr": ("$1 filtre personnalisé", "$1 filtres personnalisés"),
    "de": ("$1 benutzerdefinierter Filter", "$1 benutzerdefinierte Filter"),
    "it": ("$1 filtro personalizzato", "$1 filtri personalizzati"),
    "nl": ("$1 aangepast filter", "$1 aangepaste filters"),
    "pl": ("$1 filtr niestandardowy", "$1 filtrów niestandardowych"),
    "ru": ("$1 пользовательский фильтр", "$1 пользовательских фильтров"),
    "uk": ("$1 власний фільтр", "$1 власних фільтрів"),
    "ja": ("カスタムフィルター $1 件", "カスタムフィルター $1 件"),
    "ko": ("사용자 지정 필터 $1개", "사용자 지정 필터 $1개"),
    "zh_CN": ("$1 条自定义过滤规则", "$1 条自定义过滤规则"),
    "zh_TW": ("$1 條自訂過濾規則", "$1 條自訂過濾規則"),
    "ar": ("فلتر مخصص واحد ($1)", "$1 فلاتر مخصصة"),
    "he": ("$1 מסנן מותאם אישית", "$1 מסננים מותאמים אישית"),
    "tr": ("$1 özel filtre", "$1 özel filtre"),
    "cs": ("$1 vlastní filtr", "$1 vlastních filtrů"),
    "sk": ("$1 vlastný filter", "$1 vlastných filtrov"),
    "da": ("$1 tilpasset filter", "$1 tilpassede filtre"),
    "sv": ("$1 anpassat filter", "$1 anpassade filter"),
    "fi": ("$1 mukautettu suodatin", "$1 mukautettua suodatinta"),
    "nb": ("$1 tilpasset filter", "$1 tilpassede filtre"),
    "el": ("$1 προσαρμοσμένο φίλτρο", "$1 προσαρμοσμένα φίλτρα"),
    "ro": ("$1 filtru personalizat", "$1 filtre personalizate"),
    "hu": ("$1 egyéni szűrő", "$1 egyéni szűrő"),
    "id": ("$1 filter khusus", "$1 filter khusus"),
    "vi": ("$1 bộ lọc tùy chỉnh", "$1 bộ lọc tùy chỉnh"),
    "bg": ("$1 персонализиран филтър", "$1 персонализирани филтри"),
    "ca": ("$1 filtre personalitzat", "$1 filtres personalitzats"),
    "hr": ("$1 prilagođeni filtar", "$1 prilagođenih filtara"),
    "sl": ("$1 filter po meri", "$1 filtrov po meri"),
    "sr": ("$1 прилагођени филтер", "$1 прилагођених филтера"),
    "th": ("ตัวกรองกำหนดเอง $1 รายการ", "ตัวกรองกำหนดเอง $1 รายการ"),
    "hi": ("$1 कस्टम फ़िल्टर", "$1 कस्टम फ़िल्टर"),
}

# (Switch label, tooltip when enabled, error on failed save).
COSMETIC_LABELS = {
    "en": ("Disable cosmetic filtering", "Cosmetic filtering disabled for this website", "Could not save the cosmetic filtering rule"),
    "en_GB": ("Disable cosmetic filtering", "Cosmetic filtering disabled for this website", "Could not save the cosmetic filtering rule"),
    "pt_PT": ("Desativar filtragem cosmética", "Filtragem cosmética desativada neste website", "Não foi possível guardar a regra de filtragem cosmética"),
    "pt_BR": ("Desativar filtragem cosmética", "Filtragem cosmética desativada neste site", "Não foi possível salvar a regra de filtragem cosmética"),
    "es": ("Desactivar filtrado cosmético", "Filtrado cosmético desactivado en este sitio", "No se pudo guardar la regla de filtrado cosmético"),
    "fr": ("Désactiver le filtrage cosmétique", "Filtrage cosmétique désactivé pour ce site", "Impossible d’enregistrer la règle de filtrage cosmétique"),
    "de": ("Kosmetische Filterung deaktivieren", "Kosmetische Filterung für diese Website deaktiviert", "Regel zur kosmetischen Filterung konnte nicht gespeichert werden"),
    "it": ("Disattiva il filtraggio cosmetico", "Filtraggio cosmetico disattivato per questo sito", "Impossibile salvare la regola di filtraggio cosmetico"),
    "nl": ("Cosmetische filtering uitschakelen", "Cosmetische filtering op deze website uitgeschakeld", "Kan de regel niet opslaan"),
    "pl": ("Wyłącz filtrowanie kosmetyczne", "Filtrowanie kosmetyczne wyłączone dla tej witryny", "Nie można zapisać reguły filtrowania"),
    "ru": ("Отключить косметическую фильтрацию", "Косметическая фильтрация отключена для сайта", "Не удалось сохранить правило фильтрации"),
    "uk": ("Вимкнути косметичну фільтрацію", "Косметичну фільтрацію вимкнено для сайту", "Не вдалося зберегти правило фільтрації"),
    "ja": ("要素の非表示を無効にする", "このサイトで要素の非表示が無効です", "フィルタリング設定を保存できません"),
    "ko": ("요소 숨김 필터링 비활성화", "이 사이트에서 요소 숨김이 비활성화됨", "필터 규칙을 저장할 수 없습니다"),
    "zh_CN": ("禁用元素隐藏过滤", "已在此网站禁用元素隐藏过滤", "无法保存过滤规则"),
    "zh_TW": ("停用元素隱藏過濾", "已在此網站停用元素隱藏過濾", "無法儲存過濾規則"),
    "ar": ("تعطيل التصفية التجميلية", "تم تعطيل التصفية التجميلية لهذا الموقع", "تعذّر حفظ قاعدة التصفية"),
    "tr": ("Kozmetik filtrelemeyi devre dışı bırak", "Bu sitede kozmetik filtreleme devre dışı", "Filtre kuralı kaydedilemedi"),
    "cs": ("Vypnout kosmetické filtrování", "Kosmetické filtrování je na webu vypnuto", "Pravidlo filtrování nelze uložit"),
    "sk": ("Vypnúť kozmetické filtrovanie", "Kozmetické filtrovanie je na webe vypnuté", "Pravidlo filtrovania nemožno uložiť"),
    "da": ("Deaktiver kosmetisk filtrering", "Kosmetisk filtrering deaktiveret for dette websted", "Filterreglen kunne ikke gemmes"),
    "sv": ("Inaktivera kosmetisk filtrering", "Kosmetisk filtrering är inaktiverad på webbplatsen", "Det gick inte att spara filterregeln"),
    "fi": ("Poista kosmeettinen suodatus käytöstä", "Kosmeettinen suodatus pois käytöstä tällä sivustolla", "Suodatussääntöä ei voitu tallentaa"),
}

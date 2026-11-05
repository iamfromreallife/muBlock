"""Localize muBlock-only appearance controls in Lite locale message files.

Upstream translated messages stay intact. English is the fallback for locales
not yet translated by this fork; all 71 Lite locales still have valid keys.
Each localized value is a standalone translation of a short UI string.
"""
FIELDS = (
    "muAppearanceTitle",
    "muAppearanceFont",
    "muAppearanceFontSize",
    "muAppearanceTheme",
    "muAppearanceFollowSystem",
    "muAppearanceLight",
    "muAppearanceDark",
    "muAppearanceSystemFont",
    "muAppearanceMonospace",
)

LANGUAGES = {
    "en": ("Appearance","Font","Font size","Theme","Follow System","Light","Dark","System default","Monospace"),
    "en_GB": ("Appearance","Font","Font size","Theme","Follow System","Light","Dark","System default","Monospace"),
    "pt_PT": ("Aparência","Tipo de letra","Tamanho da letra","Tema","Seguir o sistema","Claro","Escuro","Predefinição do sistema","Monoespaçada"),
    "pt_BR": ("Aparência","Fonte","Tamanho da fonte","Tema","Seguir o sistema","Claro","Escuro","Padrão do sistema","Monoespaçada"),
    "es": ("Apariencia","Fuente","Tamaño de fuente","Tema","Seguir el sistema","Claro","Oscuro","Predeterminada del sistema","Monoespaciada"),
    "fr": ("Apparence","Police","Taille de police","Thème","Suivre le système","Clair","Sombre","Police du système","Monospace"),
    "de": ("Darstellung","Schriftart","Schriftgröße","Design","Systemeinstellung","Hell","Dunkel","Systemschrift","Monospace"),
    "it": ("Aspetto","Carattere","Dimensione carattere","Tema","Segui il sistema","Chiaro","Scuro","Carattere di sistema","Monospaziato"),
    "nl": ("Uiterlijk","Lettertype","Tekengrootte","Thema","Systeem volgen","Licht","Donker","Systeemlettertype","Monospace"),
    "pl": ("Wygląd","Czcionka","Rozmiar czcionki","Motyw","Zgodny z systemem","Jasny","Ciemny","Czcionka systemowa","Monospace"),
    "ru": ("Оформление","Шрифт","Размер шрифта","Тема","Как в системе","Светлая","Тёмная","Системный шрифт","Моноширинный"),
    "uk": ("Вигляд","Шрифт","Розмір шрифту","Тема","Як у системі","Світла","Темна","Системний шрифт","Моноширинний"),
    "ja": ("外観","フォント","文字サイズ","テーマ","システムに合わせる","ライト","ダーク","システム標準","等幅フォント"),
    "zh_CN": ("外观","字体","字体大小","主题","跟随系统","浅色","深色","系统默认","等宽字体"),
    "zh_TW": ("外觀","字型","字型大小","主題","跟隨系統","淺色","深色","系統預設","等寬字型"),
    "ko": ("모양","글꼴","글꼴 크기","테마","시스템 설정 따르기","라이트","다크","시스템 기본값","고정폭"),
    "ar": ("المظهر","الخط","حجم الخط","السمة","اتباع النظام","فاتح","داكن","خط النظام","أحادي المسافة"),
    "tr": ("Görünüm","Yazı tipi","Yazı tipi boyutu","Tema","Sistemi takip et","Açık","Koyu","Sistem varsayılanı","Eş aralıklı"),
    "cs": ("Vzhled","Písmo","Velikost písma","Motiv","Podle systému","Světlý","Tmavý","Systémové písmo","Neproporcionální"),
    "sk": ("Vzhľad","Písmo","Veľkosť písma","Motív","Podľa systému","Svetlý","Tmavý","Systémové písmo","Neproporcionálne"),
    "sv": ("Utseende","Typsnitt","Teckenstorlek","Tema","Följ systemet","Ljust","Mörkt","Systemstandard","Fast bredd"),
    "da": ("Udseende","Skrifttype","Skriftstørrelse","Tema","Følg systemet","Lyst","Mørkt","Systemstandard","Monospace"),
    "fi": ("Ulkoasu","Fontti","Fonttikoko","Teema","Järjestelmän mukaan","Vaalea","Tumma","Järjestelmän oletus","Tasalevyinen"),
    "nb": ("Utseende","Skrifttype","Skriftstørrelse","Tema","Følg systemet","Lys","Mørk","Systemstandard","Monospace"),
    "ro": ("Aspect","Font","Dimensiunea fontului","Temă","Urmează sistemul","Luminos","Întunecat","Font implicit de sistem","Monospațiat"),
    "hu": ("Megjelenés","Betűtípus","Betűméret","Téma","Rendszerbeállítás","Világos","Sötét","Rendszer alapértelmezése","Rögzített szélességű"),
    "el": ("Εμφάνιση","Γραμματοσειρά","Μέγεθος γραμματοσειράς","Θέμα","Σύμφωνα με το σύστημα","Φωτεινό","Σκοτεινό","Προεπιλογή συστήματος","Σταθερού πλάτους"),
    "id": ("Tampilan","Font","Ukuran font","Tema","Ikuti sistem","Terang","Gelap","Bawaan sistem","Monospace"),
    "vi": ("Giao diện","Phông chữ","Cỡ chữ","Chủ đề","Theo hệ thống","Sáng","Tối","Mặc định hệ thống","Đơn cách"),
    "he": ("מראה","גופן","גודל גופן","ערכת נושא","לפי המערכת","בהיר","כהה","ברירת מחדל של המערכת","רוחב קבוע"),
    "hi": ("दिखावट","फ़ॉन्ट","फ़ॉन्ट आकार","थीम","सिस्टम के अनुसार","हल्का","गहरा","सिस्टम डिफ़ॉल्ट","मोनोस्पेस"),
    "th": ("รูปลักษณ์","แบบอักษร","ขนาดแบบอักษร","ธีม","ตามระบบ","สว่าง","มืด","ค่าเริ่มต้นของระบบ","ความกว้างคงที่"),
    "bg": ("Външен вид","Шрифт","Размер на шрифта","Тема","Според системата","Светла","Тъмна","Системен шрифт","Моноширинен"),
    "ca": ("Aparença","Tipus de lletra","Mida de la lletra","Tema","Segueix el sistema","Clar","Fosc","Tipus de lletra del sistema","Monoespaiada"),
    "hr": ("Izgled","Font","Veličina fonta","Tema","Prati sustav","Svijetla","Tamna","Zadani font sustava","Monospace"),
    "sr": ("Изглед","Фонт","Величина фонта","Тема","Прати систем","Светла","Тамна","Системски фонт","Моноширински"),
    "sl": ("Videz","Pisava","Velikost pisave","Tema","Sledi sistemu","Svetla","Temna","Sistemska pisava","Enakoširinska"),
}

def merge_messages(messages: dict, locale: str) -> None:
    translation = LANGUAGES.get(locale, LANGUAGES["en"])
    for field, value in zip(FIELDS, translation):
        messages[field] = {"message": value}

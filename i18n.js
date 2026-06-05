/* =====================================================================
   i18n — English / Arabic language toggle
   - Stores choice in localStorage ("siteLang": "en" | "ar")
   - Swaps text via [data-i18n] attributes, no page reload
   - Applies dir="rtl" + body.ar for Arabic
   ===================================================================== */

const translations = {
    en: {
        /* brand */
        'brand.name': 'Shams<span> Eldin</span>',
        /* nav */
        'nav.showreel': 'Showreel',
        'nav.projects': 'Projects',
        'nav.about': 'Contacts',

        /* hero */
        'hero.badge': 'Shams Eldin · 3+ Years of Experience',
        'hero.title': 'Video <span class="gradient-text">Editor</span>',
        'hero.bio': 'A Video Editor and Colorist with 3+ years turning raw footage into work that performs, across the UAE, USA, Canada, Europe, and Egypt. I edit in Premiere Pro and After Effects for YouTube, Instagram, and Reels, build mid-level animation, and grade cinematic color in DaVinci Resolve. With a sharp eye for retouching in Photoshop and Lightroom, I craft high-quality content built to fit every platform and stand out on it.',
        'hero.viewProjects': 'View Projects',
        'hero.contactMe': 'Contact Me',

        /* showreel */
        'showreel.eyebrow': 'Featured Work',
        'showreel.title': 'Showreel',

        /* categories */
        'categories.eyebrow': 'Portfolio',
        'categories.title': 'Project Categories',
        'cat.animation': 'Animation Shorts',
        'cat.realEstate': 'Real Estate',
        'cat.aiAds': 'AI Ads',
        'cat.carReels': 'Car Reels',
        'cat.colorGrading': 'Color Grading',
        'cat.longForm': 'Long-Form',
        'cat.fb': 'F&amp;B',
        'cat.instaReels': 'Insta Reels',
        'cat.retouch': 'Retouch',

        /* contact */
        'contact.eyebrow': 'Contact',
        'contact.title': 'Let&apos;s Talk About Your Next Project',
        'contact.emailLabel': 'Email',
        'contact.whatsappLabel': 'WhatsApp',
        'contact.instagramLabel': 'Instagram',

        /* loader */
        'loader.text': 'Loading',

        /* category page */
        'catpage.allCategories': 'All Categories',
        'catpage.eyebrow': 'Portfolio',
        'catpage.backToAll': 'Back to All Categories'
    },

    ar: {
        /* brand */
        'brand.name': 'شمس<span> الدين</span>',
        /* nav */
        'nav.showreel': 'الشوريل',
        'nav.projects': 'الأعمال',
        'nav.about': 'تواصل',

        /* hero */
        'hero.badge': 'شمس الدين · خبرة أكثر من 3 سنوات',
        'hero.title': 'محرر <span class="gradient-text">فيديو</span>',
        'hero.bio': 'محرر فيديو وكولوريست بخبرة أكثر من 3 سنوات في مشاريع تمتد عبر الإمارات، الولايات المتحدة، كندا، أوروبا، ومصر. متخصص في المونتاج الاحترافي باستخدام Premiere Pro و After Effects لمحتوى يوتيوب وإنستغرام والريلز والأنيميشن، وأقدّم كولور جريدنج سينمائي عبر DaVinci Resolve، إلى جانب خبرة قوية في ريتاتش الصور باستخدام Photoshop و Lightroom. أصنع محتوى عالي الجودة مصمّم خصيصاً لكل منصّة.',
        'hero.viewProjects': 'شاهد الأعمال',
        'hero.contactMe': 'تواصل معي',

        /* showreel */
        'showreel.eyebrow': 'أعمال مختارة',
        'showreel.title': 'الشوريل',

        /* categories */
        'categories.eyebrow': 'معرض الأعمال',
        'categories.title': 'تصنيفات الأعمال',
        'cat.animation': 'أنيميشن قصير',
        'cat.realEstate': 'العقارات',
        'cat.aiAds': 'إعلانات الذكاء الاصطناعي',
        'cat.carReels': 'ريلز السيارات',
        'cat.colorGrading': 'الكولور جريدنج',
        'cat.longForm': 'المحتوى الطويل',
        'cat.fb': 'الأطعمة والمشروبات',
        'cat.instaReels': 'ريلز إنستغرام',
        'cat.retouch': 'ريتاتش الصور',

        /* contact */
        'contact.eyebrow': 'تواصل',
        'contact.title': 'لنتحدّث عن مشروعك القادم',
        'contact.emailLabel': 'البريد الإلكتروني',
        'contact.whatsappLabel': 'واتساب',
        'contact.instagramLabel': 'إنستغرام',

        /* loader */
        'loader.text': 'جارٍ التحميل',

        /* category page */
        'catpage.allCategories': 'كل التصنيفات',
        'catpage.eyebrow': 'معرض الأعمال',
        'catpage.backToAll': 'العودة لكل التصنيفات'
    }
};

function applyLanguage(lang) {
    const t = translations[lang] || translations.en;
    const html = document.documentElement;
    const body = document.body;

    // swap text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key] !== undefined) el.innerHTML = t[key];
    });

    // direction + body class
    if (lang === 'ar') {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', 'ar');
        body.classList.add('ar');
    } else {
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', 'en');
        body.classList.remove('ar');
    }

    // button label: show the OTHER language
    const btn = document.getElementById('lang-switch');
    if (btn) btn.textContent = lang === 'ar' ? 'English' : 'عربي';

    localStorage.setItem('siteLang', lang);
}

function toggleLanguage() {
    const current = localStorage.getItem('siteLang') || 'en';
    applyLanguage(current === 'en' ? 'ar' : 'en');
}

// expose for category page dynamic content
window.getSiteLang = () => localStorage.getItem('siteLang') || 'en';
window.applyLanguage = applyLanguage;

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(localStorage.getItem('siteLang') || 'en');
    const btn = document.getElementById('lang-switch');
    if (btn) btn.addEventListener('click', toggleLanguage);
});

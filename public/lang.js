// Language Manager
let currentLang = localStorage.getItem('sharyat_lang') || 'mr'; // default Marathi

function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const en = el.getAttribute('data-en');
        const mr = el.getAttribute('data-mr');
        if (en && mr) {
            const translation = currentLang === 'mr' ? mr : en;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else if (el.hasAttribute('title')) {
                el.setAttribute('title', translation);
            } else {
                el.innerHTML = translation;
            }
        }
    });

    const langBtns = document.querySelectorAll('#langToggleBtn');
    langBtns.forEach(btn => {
        if (currentLang === 'mr') {
            btn.innerHTML = '<span style="font-size: 1.2rem; margin-right: 8px;">🇺🇸</span> English';
        } else {
            btn.innerHTML = '<span style="font-size: 1.2rem; margin-right: 8px;">🇮🇳</span> मराठी';
        }
    });
}

function toggleLanguage() {
    currentLang = currentLang === 'mr' ? 'en' : 'mr';
    localStorage.setItem('sharyat_lang', currentLang);
    translatePage(); // Apply changes without reloading the page
}

function t(enText, mrText) {
    return currentLang === 'mr' ? mrText : enText;
}

window.addEventListener('DOMContentLoaded', translatePage);

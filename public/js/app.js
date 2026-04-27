// Roll Story — frontend logic
// Settings, menu, gallery, about, social links, modals, promo popup, loader, scroll.

let cachedMenuItems = [];
let cachedSettings = {};

// Map of social link types to their Phosphor icon markup.
const SOCIAL_ICONS = {
    instagram: '<i class="ph-fill ph-instagram-logo"></i>',
    facebook:  '<i class="ph-fill ph-facebook-logo"></i>',
    telegram:  '<i class="ph-fill ph-telegram-logo"></i>',
    whatsapp:  '<i class="ph-fill ph-whatsapp-logo"></i>',
    phone:     '<i class="ph-fill ph-phone"></i>',
    email:     '<i class="ph-fill ph-envelope"></i>',
    viber:     '<i class="ph-fill ph-chat-circle-text"></i>',
    tiktok:    '<i class="ph-fill ph-tiktok-logo"></i>',
    youtube:   '<i class="ph-fill ph-youtube-logo"></i>'
};

// Build a correctly-formatted URL for a given social link type and value.
function getSocialUrl(type, value) {
    if (!value) return '#';
    switch (type) {
        case 'instagram': return value.startsWith('http') ? value : 'https://instagram.com/' + value;
        case 'facebook':  return value.startsWith('http') ? value : 'https://facebook.com/' + value;
        case 'telegram':  return value.startsWith('http') ? value : 'https://t.me/' + value;
        case 'whatsapp':  return 'https://wa.me/' + value.replace(/[^0-9]/g, '');
        case 'phone':     return 'tel:' + value.replace(/[^0-9+]/g, '');
        case 'email':     return 'mailto:' + value;
        case 'viber':     return 'viber://chat?number=' + value.replace(/[^0-9]/g, '');
        case 'tiktok':    return value.startsWith('http') ? value : 'https://tiktok.com/@' + value.replace('@', '');
        case 'youtube':   return value.startsWith('http') ? value : 'https://youtube.com/' + value;
        default:          return '#';
    }
}

// Populate a container element with social icon links.
function renderSocialIcons(links, container) {
    if (!container || !links || !links.length) return;
    container.innerHTML = '';

    links.forEach(link => {
        const a = document.createElement('a');
        a.href = getSocialUrl(link.type, link.value);
        a.className = 'social-icon brand-' + link.type;
        a.target = (link.type === 'phone' || link.type === 'email') ? '_self' : '_blank';
        a.rel = 'noopener';
        a.title = link.type;
        a.innerHTML = SOCIAL_ICONS[link.type] || '';
        container.appendChild(a);
    });
}

// --- Init ---

window.addEventListener('DOMContentLoaded', async () => {
    initScrollAnimations();
    initHeaderScroll();
    createModalContainers();

    // Load site settings first — they affect almost everything else.
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            cachedSettings = await res.json();
            applySettingsToUI();
            updateDynamicTranslations();
            applyHeroBackground();
        }
    } catch (e) { /* settings unavailable — site still functions with defaults */ }

    // Loader config
    try {
        const res = await fetch('/api/loader');
        if (res.ok) applyLoaderSettings(await res.json());
    } catch (e) { /* non-critical */ }

    // Menu (home featured grid or full menu page)
    if (document.getElementById('menu-grid') || document.getElementById('featured-grid')) {
        try {
            const res = await fetch('/api/menu');
            if (res.ok) {
                cachedMenuItems = await res.json();
                renderMenu();
            }
        } catch (e) { /* menu unavailable */ }
    }

    // Gallery page
    if (document.getElementById('gallery-grid')) {
        try {
            const res = await fetch('/api/gallery');
            if (res.ok) renderGallery(await res.json());
        } catch (e) { /* gallery unavailable */ }
    }

    // About page sections
    if (document.getElementById('about-sections-container')) {
        try {
            const res = await fetch('/api/about');
            if (res.ok) renderAboutSections(await res.json());
        } catch (e) { /* about unavailable */ }
    }

    // Menu category filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const filter = e.target.dataset.filter;
            if (!filter) return;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderMenu(filter);
        });
    });

    // Social icons (footer, contact, sidebar)
    try {
        const res = await fetch('/api/social');
        if (res.ok) {
            const links = await res.json();
            document.querySelectorAll('#footer-social, #contact-social, #social-sidebar').forEach(container => {
                renderSocialIcons(links, container);
            });
        }
    } catch (e) { /* social links unavailable */ }

    // Dynamic nav pages
    try {
        const res = await fetch('/api/pages');
        if (res.ok) injectDynamicPages(await res.json());
    } catch (e) { /* static pages unavailable */ }

    // Static page renderer (page.html)
    if (document.getElementById('static-page-container')) {
        const slug = new URLSearchParams(window.location.search).get('slug');
        if (slug) {
            try {
                const res = await fetch('/api/pages/' + slug);
                if (res.ok) {
                    const page = await res.json();
                    const lang = localStorage.getItem('lang') || 'ro';
                    const title = page['title_' + lang] || page.title_ro;
                    const content = page['content_' + lang] || page.content_ro || '';
                    const image = page.image_url ? '<img src="' + page.image_url + '" alt="">' : '';

                    document.getElementById('static-page-title').textContent = title;
                    document.getElementById('static-page-body').innerHTML = content + image;
                    document.getElementById('page-title').textContent = title + ' | Roll Story';
                }
            } catch (e) { /* page load failed */ }
        }
    }

    // Promo popup
    try {
        const res = await fetch('/api/promo');
        if (res.ok) {
            const promo = await res.json();
            if (promo) initPromoPopup(promo);
        }
    } catch (e) { /* promo unavailable */ }

    dismissLoader();
});

// Re-render language-dependent content when the user switches language.
window.addEventListener('languageChanged', () => {
    updateDynamicTranslations();

    if (cachedMenuItems.length > 0) {
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        renderMenu(activeFilter);
    }

    if (document.getElementById('about-sections-container')) {
        fetch('/api/about')
            .then(r => r.json())
            .then(renderAboutSections)
            .catch(() => {});
    }
});

// --- Loader ---

function applyLoaderSettings(config) {
    const loader = document.getElementById('global-loader');
    if (!loader) return;

    if (config.loader_enabled === '0') {
        loader.classList.add('hidden');
        return;
    }

    const spinner = document.getElementById('loader-spinner');
    const text = document.getElementById('loader-text');

    if (config.loader_text) text.textContent = config.loader_text;

    if (config.loader_color === 'green') {
        spinner.classList.add('green');
        text.classList.add('green');
    }
}

function dismissLoader() {
    const loader = document.getElementById('global-loader');
    if (!loader) return;
    setTimeout(() => loader.classList.add('hidden'), 600);
}

// --- Settings ---

function applySettingsToUI() {
    const phone = cachedSettings.phone || '+37361055561';
    const phoneDigits = phone.replace(/[^0-9+]/g, '');
    const waMessage = cachedSettings.whatsapp_msg || 'Hello! I would like to place an order from Roll Story.';
    const waUrl = 'https://wa.me/' + phoneDigits.replace('+', '') + '?text=' + encodeURIComponent(waMessage);

    document.querySelectorAll('#wa-btn, #contact-wa-btn').forEach(btn => { btn.href = waUrl; });
    document.querySelectorAll('#call-btn, #contact-call-btn').forEach(btn => { btn.href = 'tel:' + phoneDigits; });

    const glovoBtn = document.getElementById('glovo-btn');
    if (glovoBtn && cachedSettings.glovo_url) {
        glovoBtn.href = cachedSettings.glovo_url;
        glovoBtn.style.display = 'flex';
    }
}

function updateDynamicTranslations() {
    const lang = localStorage.getItem('lang') || 'ro';
    const hoursEl = document.getElementById('hours-display');
    if (hoursEl && cachedSettings['working_hours_' + lang]) {
        hoursEl.textContent = cachedSettings['working_hours_' + lang];
    }
}

function applyHeroBackground() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const url = cachedSettings.hero_bg_url;
    const type = cachedSettings.hero_bg_type;
    if (!url) return;

    if (type === 'video') {
        const video = document.createElement('video');
        video.src = url;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;';
        hero.insertBefore(video, hero.firstChild);
    } else {
        hero.style.backgroundImage = "url('" + url + "')";
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
    }
}

// --- Dynamic nav pages ---

function injectDynamicPages(pages) {
    if (!pages || !pages.length) return;

    const lang = localStorage.getItem('lang') || 'ro';
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    const langSwitch = nav.querySelector('.lang-switch');

    pages.forEach(page => {
        const a = document.createElement('a');
        a.href = '/page.html?slug=' + page.slug;
        a.textContent = page['title_' + lang] || page.title_ro;
        a.dataset.dynamicPage = page.slug;

        if (langSwitch) nav.insertBefore(a, langSwitch);
        else nav.appendChild(a);
    });
}

// --- Product modal ---

// Builds the product modal and gallery lightbox DOM once, reuses them after.
function createModalContainers() {
    if (!document.getElementById('product-modal-overlay')) {
        const modalHtml = `
            <div class="modal-overlay" id="product-modal-overlay">
                <div class="product-modal">
                    <button class="modal-close" onclick="closeProductModal()">&#10005;</button>
                    <div class="product-modal-body">
                        <img class="product-modal-image" id="modal-img" src="" alt="">
                        <div class="product-modal-info">
                            <span class="modal-category" id="modal-cat"></span>
                            <h2 class="modal-title" id="modal-name"></h2>
                            <div class="modal-price" id="modal-price"></div>
                            <p class="modal-desc" id="modal-desc"></p>
                            <div class="modal-ingredients" id="modal-ingredients-box" style="display:none">
                                <h4 id="modal-ing-label">INGREDIENTE</h4>
                                <p id="modal-ingredients"></p>
                            </div>
                            <a href="#" class="modal-order-btn" id="modal-wa-btn" target="_blank">
                                <i class="ph ph-whatsapp-logo"></i>
                                <span id="modal-order-text">Comandă prin WhatsApp</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('product-modal-overlay').addEventListener('click', e => {
            if (e.target.id === 'product-modal-overlay') closeProductModal();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeProductModal();
                closeLightbox();
                closePromo();
            }
        });
    }

    if (!document.getElementById('lightbox-overlay')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="lightbox-overlay" id="lightbox-overlay" onclick="closeLightbox()">
                <button class="lightbox-close" onclick="closeLightbox()">&#10005;</button>
                <img id="lightbox-img" src="" alt="Gallery">
            </div>`);
    }
}

function openProductModal(id) {
    const item = cachedMenuItems.find(i => i.id === id);
    if (!item) return;

    const lang = localStorage.getItem('lang') || 'ro';
    const currency = dictionary[lang]?.val_currency || 'MDL';

    const title       = item['name_' + lang] || item.name_ro;
    const description = item['desc_' + lang] || '';
    const ingredients = item['ingredients_' + lang] || '';

    const categoryLabels = {
        shawarma: dictionary[lang]?.cat_shawarma,
        crepes:   dictionary[lang]?.cat_crepes,
        drinks:   dictionary[lang]?.cat_drinks,
        addons:   dictionary[lang]?.cat_addons
    };

    const imgEl = document.getElementById('modal-img');
    imgEl.src = item.image_url || '';
    imgEl.style.display = item.image_url ? 'block' : 'none';

    document.getElementById('modal-cat').textContent  = categoryLabels[item.category] || item.category;
    document.getElementById('modal-name').textContent = title;
    document.getElementById('modal-price').textContent = item.price + ' ' + currency;
    document.getElementById('modal-desc').textContent = description;

    const ingredientsBox = document.getElementById('modal-ingredients-box');
    if (ingredients) {
        document.getElementById('modal-ingredients').textContent = ingredients;
        ingredientsBox.style.display = 'block';
    } else {
        ingredientsBox.style.display = 'none';
    }

    const phoneDigits = (cachedSettings.phone || '+37361055561').replace(/[^0-9]/g, '');
    const waMessages = {
        ro: 'Bună ziua! Aș dori să comand: ' + title + ' (' + item.price + ' ' + currency + ') de la Roll Story.',
        ru: 'Здравствуйте! Хочу заказать: ' + title + ' (' + item.price + ' ' + currency + ') из Roll Story.',
        en: 'Hello! I would like to order: ' + title + ' (' + item.price + ' ' + currency + ') from Roll Story.'
    };
    document.getElementById('modal-wa-btn').href = 'https://wa.me/' + phoneDigits + '?text=' + encodeURIComponent(waMessages[lang] || waMessages.ro);

    const orderLabels = { ro: 'Comandă prin WhatsApp', ru: 'Заказать через WhatsApp', en: 'Order via WhatsApp' };
    document.getElementById('modal-order-text').textContent = orderLabels[lang] || orderLabels.ro;

    const ingredientLabels = { ro: 'INGREDIENTE', ru: 'ИНГРЕДИЕНТЫ', en: 'INGREDIENTS' };
    document.getElementById('modal-ing-label').textContent = ingredientLabels[lang] || ingredientLabels.ro;

    document.getElementById('product-modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    document.getElementById('product-modal-overlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

// --- Lightbox ---

function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox-overlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

// --- Menu ---

function renderMenu(filter = 'all') {
    const isFeatured = !!document.getElementById('featured-grid');
    const grid = document.getElementById('featured-grid') || document.getElementById('menu-grid');
    if (!grid) return;

    const lang = localStorage.getItem('lang') || 'ro';
    const currency = dictionary[lang]?.val_currency || 'MDL';

    let items = [...cachedMenuItems];
    if (filter !== 'all') items = items.filter(item => item.category === filter);
    if (isFeatured) items = items.slice(0, 6);

    grid.innerHTML = '';

    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--color-text-muted);grid-column:1/-1">—</p>';
        return;
    }

    items.forEach((item, index) => {
        const title = item['name_' + lang] || item.name_ro;
        const desc  = item['desc_' + lang] || '';

        const imageHtml = item.image_url
            ? '<div class="menu-image-wrap"><img src="' + item.image_url + '" alt="' + title + '" class="menu-image" loading="lazy"><div class="overlay"></div></div>'
            : '<div class="menu-image-wrap" style="display:flex;align-items:center;justify-content:center;background:var(--color-bg-panel)"><i class="ph ph-plus-circle" style="font-size:48px;color:var(--color-text-muted)"></i><div class="overlay"></div></div>';

        const truncatedDesc = desc ? '<p class="menu-desc">' + desc.substring(0, 60) + (desc.length > 60 ? '...' : '') + '</p>' : '';

        const card = document.createElement('div');
        card.className = 'menu-card';
        card.style.animation = 'fadeInUp 0.6s ' + (index * 0.06) + 's both';
        card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(item.id);
        card.innerHTML = imageHtml
            + '<div class="price-badge">' + item.price + '<br><small style="font-size:11px;font-weight:400">' + currency + '</small></div>'
            + '<div class="menu-details"><h3 class="menu-title">' + title + '</h3>' + truncatedDesc + '</div>';

        grid.appendChild(card);
    });
}

// --- Gallery ---

function renderGallery(items) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!items.length) {
        grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--color-text-muted);grid-column:1/-1">—</p>';
        return;
    }

    items.forEach(item => {
        const img = document.createElement('img');
        img.src = item.image_url;
        img.alt = item.type || 'Gallery';
        img.loading = 'lazy';
        img.className = 'animate-on-scroll';
        img.onclick = () => openLightbox(item.image_url);
        grid.appendChild(img);
    });

    initScrollAnimations();
}

// --- About ---

function renderAboutSections(sections) {
    const container = document.getElementById('about-sections-container');
    if (!container) return;

    const lang = localStorage.getItem('lang') || 'ro';
    container.innerHTML = '';

    sections.forEach(section => {
        const title = section['title_' + lang] || section.title_ro || '';
        const text  = section['text_' + lang]  || section.text_ro  || '';
        const imageHtml = section.image_url
            ? '<div class="about-section-image"><img src="' + section.image_url + '" alt="' + title + '" loading="lazy"></div>'
            : '';

        const div = document.createElement('div');
        div.className = 'about-section animate-on-scroll';
        div.innerHTML = '<div class="about-section-text"><h3>' + title + '</h3><p>' + text + '</p></div>' + imageHtml;
        container.appendChild(div);
    });

    initScrollAnimations();
}

// --- Promo popup ---

function initPromoPopup(promo) {
    if (promo.show_once && sessionStorage.getItem('promo_seen')) return;

    const lang = localStorage.getItem('lang') || 'ro';
    const title   = promo['title_' + lang]        || promo.title_ro        || '';
    const text    = promo['text_' + lang]         || promo.text_ro         || '';
    const btnText = promo['button_text_' + lang]  || promo.button_text_ro  || '';
    const delay   = (promo.delay_seconds || 3) * 1000;

    setTimeout(() => {
        const imageHtml  = promo.image_url ? '<img class="promo-card-image" src="' + promo.image_url + '" alt="">' : '';
        const buttonHtml = promo.button_url ? '<a href="' + promo.button_url + '" class="promo-cta">' + btnText + '</a>' : '';

        const html = `
            <div class="promo-overlay" id="promo-overlay">
                <button class="promo-close" onclick="closePromo()">&#10005;</button>
                <div class="promo-card">
                    ${imageHtml}
                    <div class="promo-card-body">
                        <h2>${title}</h2>
                        <p>${text}</p>
                        ${buttonHtml}
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        setTimeout(() => document.getElementById('promo-overlay')?.classList.add('active'), 50);

        if (promo.show_once) sessionStorage.setItem('promo_seen', '1');
    }, delay);
}

function closePromo() {
    const overlay = document.getElementById('promo-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 500);
}

// --- Utilities ---

function initScrollAnimations() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll:not(.visible)').forEach(el => observer.observe(el));
}

function initHeaderScroll() {
    const header = document.getElementById('main-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
}

function toggleMobileNav() {
    document.getElementById('nav-links')?.classList.toggle('open');
    document.getElementById('hamburger')?.classList.toggle('active');
}

// Close the mobile nav when a link inside it is tapped.
document.addEventListener('click', e => {
    if (e.target.closest('.nav-links a:not(.lang-btn)')) {
        const nav = document.getElementById('nav-links');
        const hamburger = document.getElementById('hamburger');
        if (nav?.classList.contains('open')) {
            nav.classList.remove('open');
            hamburger?.classList.remove('active');
        }
    }
});

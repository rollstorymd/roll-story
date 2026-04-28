let cachedMenuItems = [];
let cachedSettings = {};
const supabaseClient = window.supabaseClient;

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

function isActiveValue(value) {
    return value === true || value === 1 || value === '1';
}

async function fetchSettings() {
    const { data, error } = await supabaseClient.from('settings').select('key,value');
    if (error) throw error;
    return sbRowsToMap(data);
}

async function fetchLoaderConfig() {
    const { data, error } = await supabaseClient.from('settings').select('key,value').like('key', 'loader_%');
    if (error) throw error;
    return sbRowsToMap(data);
}

async function fetchMenuItems() {
    const { data, error } = await supabaseClient
        .from('menu_items')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });
    if (error) throw error;
    return (data || []).filter(item => isActiveValue(item.active));
}

async function fetchGallery() {
    const { data, error } = await supabaseClient
        .from('gallery')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function fetchAboutSections() {
    const { data, error } = await supabaseClient
        .from('about_sections')
        .select('*')
        .order('order_index', { ascending: true })
        .order('id', { ascending: true });
    if (error) throw error;
    return (data || []).filter(section => isActiveValue(section.active));
}

async function fetchSocialLinks() {
    const { data, error } = await supabaseClient
        .from('social_links')
        .select('*')
        .order('id', { ascending: true });
    if (error) throw error;
    return (data || []).filter(link => isActiveValue(link.active));
}

async function fetchNavPages() {
    const { data, error } = await supabaseClient
        .from('static_pages')
        .select('id, slug, title_ro, title_ru, title_en, order_index, active')
        .order('order_index', { ascending: true })
        .order('id', { ascending: true });
    if (error) throw error;
    return (data || []).filter(page => isActiveValue(page.active));
}

async function fetchPageBySlug(slug) {
    const s = String(slug || '').trim();
    if (!s) return null;

    const { data, error } = await supabaseClient
        .from('static_pages')
        .select('*')
        .ilike('slug', s)
        .order('id', { ascending: false })
        .limit(1)
        ;
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row || null;
}

async function fetchPromo() {
    const { data, error } = await supabaseClient
        .from('promo_popup')
        .select('*')
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data && isActiveValue(data.active) ? data : null;
}

async function fetchTestimonials() {
    const { data, error } = await supabaseClient
        .from('testimonials')
        .select('*')
        .eq('active', 1)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
    if (error) throw error;
    return data || [];
}

window.addEventListener('DOMContentLoaded', async () => {
    initScrollAnimations();
    initHeaderScroll();
    createModalContainers();

    try {
        cachedSettings = await fetchSettings();
        applySettingsToUI();
        updateDynamicTranslations();
        applyHeroBackground();
    } catch (e) { console.error('Failed to load settings', e); }

    try {
        applyLoaderSettings(await fetchLoaderConfig());
    } catch (e) { console.error('Failed to load loader settings', e); }

    if (document.getElementById('menu-grid') || document.getElementById('featured-grid')) {
        try {
            cachedMenuItems = await fetchMenuItems();
            renderMenu();
        } catch (e) { console.error('Failed to load menu items', e); }
    }

    if (document.getElementById('gallery-grid')) {
        try {
            renderGallery(await fetchGallery());
        } catch (e) { console.error('Failed to load gallery', e); }
    }

    if (document.getElementById('about-sections-container')) {
        try {
            renderAboutSections(await fetchAboutSections());
        } catch (e) { console.error('Failed to load about sections', e); }
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const filter = e.target.dataset.filter;
            if (!filter) return;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderMenu(filter);
        });
    });

    try {
        const links = await fetchSocialLinks();
        document.querySelectorAll('#footer-social, #contact-social, #social-sidebar').forEach(container => {
            renderSocialIcons(links, container);
        });
    } catch (e) { console.error('Failed to load social links', e); }

    try {
        injectDynamicPages(await fetchNavPages());
    } catch (e) { console.error('Failed to load static pages', e); }

    if (document.getElementById('static-page-container')) {
        const slug = new URLSearchParams(window.location.search).get('slug');
        if (slug) {
            try {
                const page = await fetchPageBySlug(slug);
                if (page) {
                    const lang = localStorage.getItem('lang') || 'ro';
                    const title = page['title_' + lang] || page.title_ro;
                    const content = page['content_' + lang] || page.content_ro || '';
                    const image = page.image_url ? '<img src="' + page.image_url + '" alt="">' : '';

                    document.getElementById('static-page-title').textContent = title;
                    document.getElementById('static-page-body').innerHTML = content + image;
                    document.getElementById('page-title').textContent = title + ' | Roll Story';
                }
            } catch (e) { console.error('Failed to load static page', e); }
            finally { dismissLoader(); }
        }
    }

    try {
        const promo = await fetchPromo();
        if (promo) initPromoPopup(promo);
    } catch (e) { console.error('Failed to load promo', e); }

    if (document.querySelector('.reviews-section .marquee-track')) {
        try {
            const testimonials = await fetchTestimonials();
            if (testimonials.length) renderTestimonials(testimonials);
        } catch (e) { console.error('Failed to load testimonials', e); }
    }

    dismissLoader();
});

window.addEventListener('languageChanged', () => {
    updateDynamicTranslations();

    if (cachedMenuItems.length > 0) {
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        renderMenu(activeFilter);
    }

    if (document.getElementById('about-sections-container')) {
        fetchAboutSections().then(renderAboutSections).catch(() => {});
    }
});

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

function injectDynamicPages(pages) {
    if (!pages || !pages.length) return;

    const lang = localStorage.getItem('lang') || 'ro';
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    const langSwitch = nav.querySelector('.lang-switch');

    pages.forEach(page => {
        const a = document.createElement('a');
        a.href = '/page?slug=' + page.slug;
        a.textContent = page['title_' + lang] || page.title_ro;
        a.dataset.dynamicPage = page.slug;

        if (langSwitch) nav.insertBefore(a, langSwitch);
        else nav.appendChild(a);
    });
}

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

function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox-overlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

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

function renderTestimonials(items) {
    const track = document.querySelector('.reviews-section .marquee-track');
    if (!track) return;

    const renderSet = (entries) => entries.map(item => {
        const rating = Math.max(1, Math.min(5, Number(item.rating) || 5));
        const stars = '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);
        const content = item.content || '';
        const author = item.author_name || 'Client';
        return '<div class="review-card"><div class="review-stars">' + stars + '</div><p class="review-text">"' + content + '"</p><div class="review-author"><i class="ph-fill ph-user-circle"></i> ' + author + '</div></div>';
    }).join('');

    track.innerHTML = renderSet(items) + renderSet(items);
}

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

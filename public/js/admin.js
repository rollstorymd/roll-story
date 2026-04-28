let CURRENT_USER = null;
const pendingActions = new Set();
const supabaseClient = window.supabaseClient;

(async function bootstrap() {
    const session = await sbRequireAdmin();
    if (!session) return;

    const { data: profile } = await supabaseClient
        .from('admin_profiles')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (!profile) {
        await supabaseClient.auth.signOut();
        window.location.href = '/admin/login.html';
        return;
    }

    CURRENT_USER = session.user;
})();

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = '/admin/login.html';
}

function isActiveInt(value) {
    return Number(value) === 1;
}

async function withPending(actionKey, task) {
    if (pendingActions.has(actionKey)) return;
    pendingActions.add(actionKey);
    try {
        return await task();
    } finally {
        pendingActions.delete(actionKey);
    }
}

function setButtonBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
        if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
        button.disabled = true;
        if (busyText) button.textContent = busyText;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) button.textContent = button.dataset.originalText;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    ensureTestimonialsAdminUI();
    loadSettings();
    loadMenu();
    loadGallery();
    loadAboutSections();
    loadHeroBgPreview();
    loadSocial();
    loadPromo();
    loadLoader();
    loadPages();
    loadTestimonials();

    document.getElementById('settings-form').addEventListener('submit', saveSettings);
    document.getElementById('menu-item-form').addEventListener('submit', saveMenuItem);
    document.getElementById('gallery-form').addEventListener('submit', uploadGallery);
    document.getElementById('about-form').addEventListener('submit', saveAboutSection);
    document.getElementById('hero-bg-form').addEventListener('submit', uploadHeroBg);
    document.getElementById('promo-form').addEventListener('submit', savePromo);
    document.getElementById('loader-form').addEventListener('submit', saveLoader);
    document.getElementById('page-form').addEventListener('submit', savePage);
});

async function fetchSettingsMap() {
    const { data, error } = await supabaseClient.from('settings').select('key,value');
    if (error) throw error;
    return sbRowsToMap(data);
}

async function loadSettings() {
    try {
        const s = await fetchSettingsMap();
        document.getElementById('set-phone').value      = s.phone || '';
        document.getElementById('set-wa-msg').value     = s.whatsapp_msg || '';
        document.getElementById('set-glovo').value      = s.glovo_url || '';
        document.getElementById('set-bolt').value       = s.bolt_url || '';
        document.getElementById('set-hours-ro').value   = s.working_hours_ro || '';
        document.getElementById('set-hours-ru').value   = s.working_hours_ru || '';
        document.getElementById('set-hours-en').value   = s.working_hours_en || '';
    } catch (e) {
        console.error(e);
    }
}

async function saveSettings(e) {
    e.preventDefault();
    const data = {};
    new FormData(e.target).forEach((v, k) => { data[k] = v; });

    try {
        const rows = Object.entries(data).map(([key, value]) => ({ key, value: String(value ?? '') }));
        const { error } = await supabaseClient.from('settings').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
        alert('Salvat!');
    } catch (err) {
        console.error(err);
        alert('Eroare!');
    }
}

async function loadHeroBgPreview() {
    try {
        const s = await fetchSettingsMap();
        const p = document.getElementById('hero-bg-preview');
        const btn = document.getElementById('delete-hero-bg-btn');

        if (s.hero_bg_url) {
            p.innerHTML = s.hero_bg_type === 'video'
                ? '<video src="' + s.hero_bg_url + '" style="max-width:300px;border-radius:8px" controls muted></video>'
                : '<img src="' + s.hero_bg_url + '" style="max-width:300px;border-radius:8px">';
            if (btn) btn.style.display = 'inline-block';
        } else {
            p.innerHTML = '<p style="color:#8fa896">Niciun fundal setat.</p>';
            if (btn) btn.style.display = 'none';
        }
    } catch (e) {
        console.error(e);
    }
}

async function uploadHeroBg(e) {
    e.preventDefault();
    const f = document.getElementById('hero-bg-file').files[0];
    if (!f) return;

    try {
        const url = await sbUploadImage(f);
        const type = sbInferMediaType(f);

        const { error } = await supabaseClient.from('settings').upsert([
            { key: 'hero_bg_url', value: url },
            { key: 'hero_bg_type', value: type }
        ], { onConflict: 'key' });
        if (error) throw error;

        alert('Actualizat!');
        document.getElementById('hero-bg-file').value = '';
        loadHeroBgPreview();
    } catch (err) {
        console.error(err);
        alert('Eroare!');
    }
}

async function deleteHeroBg() {
    if (!confirm('Ștergi fundalul?')) return;
    try {
        const { error } = await supabaseClient.from('settings').upsert([
            { key: 'hero_bg_url', value: '' },
            { key: 'hero_bg_type', value: '' }
        ], { onConflict: 'key' });
        if (error) throw error;
        alert('Șters!');
        loadHeroBgPreview();
    } catch (err) {
        console.error(err);
        alert('Eroare!');
    }
}

async function loadMenu() {
    try {
        const { data: items, error } = await supabaseClient
            .from('menu_items')
            .select('*')
            .order('category', { ascending: true })
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });
        if (error) throw error;

        const tb = document.getElementById('menu-table-body');
        tb.innerHTML = '';
        (items || []).forEach(item => {
            const tr = document.createElement('tr');
            const active = isActiveInt(item.active);
            tr.style.opacity = active ? '1' : '0.55';
            tr.innerHTML = '<td>' + item.id + '</td>'
                + '<td>' + (item.image_url ? '<img src="' + item.image_url + '" style="width:44px;height:44px;object-fit:cover;border-radius:6px">' : '—') + '</td>'
                + '<td><strong>' + (item.name_ro || '') + '</strong></td>'
                + '<td><span style="background:rgba(255,227,42,0.1);padding:3px 8px;border-radius:4px;font-size:12px;color:#FFE32A">' + item.category + '</span></td>'
                + '<td><strong>' + item.price + ' MDL</strong></td>'
                + '<td>' + (active ? '✅' : '❌') + '</td>'
                + '<td><button class="btn-sm" onclick="editMenuItem(' + item.id + ')">Edit</button> '
                + '<button class="btn-sm ' + (active ? 'btn-danger' : 'btn-secondary') + '" onclick="' + (active ? 'deleteMenuItem(' : 'reactivateMenuItem(') + item.id + ')">'
                + (active ? 'Șterge' : 'Reactivează') + '</button></td>';
            tb.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
    }
}

function openMenuModal(item = null) {
    document.getElementById('menu-editor').style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
    if (!item) {
        document.getElementById('modal-title').textContent = 'Adaugă Produs';
        document.getElementById('menu-item-form').reset();
        document.getElementById('mi-id').value = '';
    }
}

function closeMenuModal() {
    document.getElementById('menu-editor').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}

async function editMenuItem(id) {
    try {
        const { data: item, error } = await supabaseClient.from('menu_items').select('*').eq('id', id).maybeSingle();
        if (error || !item) throw error || new Error('not found');

        document.getElementById('mi-id').value          = item.id;
        document.getElementById('mi-cat').value         = item.category;
        document.getElementById('mi-price').value       = item.price;
        document.getElementById('mi-name-ro').value     = item.name_ro || '';
        document.getElementById('mi-name-ru').value     = item.name_ru || '';
        document.getElementById('mi-name-en').value     = item.name_en || '';
        document.getElementById('mi-desc-ro').value     = item.desc_ro || '';
        document.getElementById('mi-desc-ru').value     = item.desc_ru || '';
        document.getElementById('mi-desc-en').value     = item.desc_en || '';
        document.getElementById('mi-ing-ro').value      = item.ingredients_ro || '';
        document.getElementById('mi-ing-ru').value      = item.ingredients_ru || '';
        document.getElementById('mi-ing-en').value      = item.ingredients_en || '';
        document.getElementById('mi-active').value      = item.active;
        document.getElementById('mi-sort').value        = item.sort_order || 0;
        document.getElementById('modal-title').textContent = 'Editează: ' + (item.name_ro || '');
        openMenuModal(item);
    } catch (e) {
        console.error(e);
        alert('Eroare!');
    }
}

async function saveMenuItem(e) {
    e.preventDefault();
    const submitButton = e.submitter || e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('mi-id').value;
    const actionKey = 'menu-save:' + (id || 'new');

    await withPending(actionKey, async () => {
        setButtonBusy(submitButton, true, 'Se salvează...');
        const file = document.getElementById('mi-image').files[0];

        const payload = {
            category:        document.getElementById('mi-cat').value,
            price:           parseFloat(document.getElementById('mi-price').value),
            name_ro:         document.getElementById('mi-name-ro').value,
            name_ru:         document.getElementById('mi-name-ru').value,
            name_en:         document.getElementById('mi-name-en').value,
            desc_ro:         document.getElementById('mi-desc-ro').value || null,
            desc_ru:         document.getElementById('mi-desc-ru').value || null,
            desc_en:         document.getElementById('mi-desc-en').value || null,
            ingredients_ro:  document.getElementById('mi-ing-ro').value || null,
            ingredients_ru:  document.getElementById('mi-ing-ru').value || null,
            ingredients_en:  document.getElementById('mi-ing-en').value || null,
            active:          parseInt(document.getElementById('mi-active').value, 10) || 0,
            sort_order:      parseInt(document.getElementById('mi-sort').value, 10) || 0
        };

        if (!payload.category) {
            alert('Categoria este obligatorie.');
            return;
        }

        try {
            if (file) payload.image_url = await sbUploadImage(file);

            const { error } = id
                ? await supabaseClient.from('menu_items').update(payload).eq('id', id)
                : await supabaseClient.from('menu_items').insert([payload]);
            if (error) throw error;

            closeMenuModal();
            await loadMenu();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        } finally {
            setButtonBusy(submitButton, false);
        }
    });
}

async function deleteMenuItem(id) {
    if (!confirm('Ștergi acest produs?')) return;
    await withPending('menu-delete:' + id, async () => {
        try {
            const { error } = await supabaseClient.from('menu_items').update({ active: 0 }).eq('id', id);
            if (error) throw error;
            await loadMenu();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        }
    });
}

async function reactivateMenuItem(id) {
    await withPending('menu-reactivate:' + id, async () => {
        try {
            const { error } = await supabaseClient.from('menu_items').update({ active: 1 }).eq('id', id);
            if (error) throw error;
            await loadMenu();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        }
    });
}

async function loadGallery() {
    try {
        const { data: items, error } = await supabaseClient
            .from('gallery')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });
        if (error) throw error;

        const g = document.getElementById('gallery-manage-grid');
        g.innerHTML = '';
        (items || []).forEach(item => {
            const d = document.createElement('div');
            d.style.cssText = 'position:relative';
            d.innerHTML = '<img src="' + item.image_url + '" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #1a3d22">'
                + '<button class="btn-sm btn-danger" style="position:absolute;top:2px;right:2px;padding:2px 6px;font-size:10px" onclick="deleteGalleryItem(' + item.id + ')">✕</button>';
            g.appendChild(d);
        });
    } catch (e) {
        console.error(e);
    }
}

async function uploadGallery(e) {
    e.preventDefault();
    const submitButton = e.submitter || e.target.querySelector('button[type="submit"]');
    await withPending('gallery-upload', async () => {
        setButtonBusy(submitButton, true, 'Se încarcă...');
        const file = document.getElementById('gal-file').files[0];
        if (!file) return;

        try {
            const url = await sbUploadImage(file);
            const { error } = await supabaseClient.from('gallery').insert([{
                image_url: url,
                type: document.getElementById('gal-type').value || 'interior',
                sort_order: 0
            }]);
            if (error) throw error;

            document.getElementById('gallery-form').reset();
            await loadGallery();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        } finally {
            setButtonBusy(submitButton, false);
        }
    });
}

async function deleteGalleryItem(id) {
    if (!confirm('Ștergi?')) return;
    try {
        const { error } = await supabaseClient.from('gallery').delete().eq('id', id);
        if (error) throw error;
        loadGallery();
    } catch (err) {
        console.error(err);
        alert('Eroare!');
    }
}

async function loadAboutSections() {
    try {
        const { data: secs, error } = await supabaseClient
            .from('about_sections')
            .select('*')
            .order('order_index', { ascending: true })
            .order('id', { ascending: true });
        if (error) throw error;

        const c = document.getElementById('about-sections-admin');
        c.innerHTML = '';
        (secs || []).forEach(sec => {
            const d = document.createElement('div');
            d.className = 'page-item';
            d.innerHTML = (sec.image_url
                    ? '<img src="' + sec.image_url + '" style="width:50px;height:50px;object-fit:cover;border-radius:6px">'
                    : '<div style="width:50px;height:50px;background:#1a3d22;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#8fa896;font-size:20px">📄</div>')
                + '<div class="page-info"><strong>' + (sec.title_ro || '—') + '</strong><small>Ord: ' + sec.order_index + ' | ' + (sec.active ? '✅' : '❌') + '</small></div>'
                + '<button class="btn-sm" onclick="editAboutSection(' + sec.id + ')">Edit</button> '
                + '<button class="btn-sm btn-danger" onclick="deleteAboutSection(' + sec.id + ')">Șterge</button>';
            c.appendChild(d);
        });
    } catch (e) {
        console.error(e);
    }
}

function openAboutModal(sec = null) {
    document.getElementById('about-editor').style.display = 'block';
    document.getElementById('about-modal-overlay').style.display = 'block';
    if (!sec) {
        document.getElementById('about-modal-title').textContent = 'Adaugă Secțiune';
        document.getElementById('about-form').reset();
        document.getElementById('ab-id').value = '';
    }
}

function closeAboutModal() {
    document.getElementById('about-editor').style.display = 'none';
    document.getElementById('about-modal-overlay').style.display = 'none';
}

async function editAboutSection(id) {
    try {
        const { data: sec, error } = await supabaseClient.from('about_sections').select('*').eq('id', id).maybeSingle();
        if (error || !sec) throw error || new Error('not found');

        document.getElementById('ab-id').value        = sec.id;
        document.getElementById('ab-title-ro').value  = sec.title_ro || '';
        document.getElementById('ab-title-ru').value  = sec.title_ru || '';
        document.getElementById('ab-title-en').value  = sec.title_en || '';
        document.getElementById('ab-text-ro').value   = sec.text_ro || '';
        document.getElementById('ab-text-ru').value   = sec.text_ru || '';
        document.getElementById('ab-text-en').value   = sec.text_en || '';
        document.getElementById('ab-order').value     = sec.order_index || 0;
        document.getElementById('ab-active').value    = sec.active;
        document.getElementById('about-modal-title').textContent = 'Editează: ' + (sec.title_ro || '');
        openAboutModal(sec);
    } catch (e) {
        console.error(e);
        alert('Eroare!');
    }
}

async function saveAboutSection(e) {
    e.preventDefault();
    const submitButton = e.submitter || e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('ab-id').value;
    await withPending('about-save:' + (id || 'new'), async () => {
        setButtonBusy(submitButton, true, 'Se salvează...');
        const file = document.getElementById('ab-image').files[0];

        const payload = {
            title_ro:    document.getElementById('ab-title-ro').value,
            title_ru:    document.getElementById('ab-title-ru').value,
            title_en:    document.getElementById('ab-title-en').value,
            text_ro:     document.getElementById('ab-text-ro').value,
            text_ru:     document.getElementById('ab-text-ru').value,
            text_en:     document.getElementById('ab-text-en').value,
            order_index: parseInt(document.getElementById('ab-order').value, 10) || 0,
            active:      parseInt(document.getElementById('ab-active').value, 10) || 0
        };

        try {
            if (file) payload.image_url = await sbUploadImage(file);

            const { error } = id
                ? await supabaseClient.from('about_sections').update(payload).eq('id', id)
                : await supabaseClient.from('about_sections').insert([payload]);
            if (error) throw error;

            closeAboutModal();
            await loadAboutSections();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        } finally {
            setButtonBusy(submitButton, false);
        }
    });
}

async function deleteAboutSection(id) {
    if (!confirm('Ștergi?')) return;
    try {
        const { error } = await supabaseClient.from('about_sections').delete().eq('id', id);
        if (error) throw error;
        loadAboutSections();
    } catch (err) {
        console.error(err);
        alert('Eroare!');
    }
}

async function loadSocial() {
    try {
        const { data: links, error } = await supabaseClient
            .from('social_links')
            .select('*')
            .order('id', { ascending: true });
        if (error) throw error;

        const c = document.getElementById('social-admin-list');
        c.innerHTML = '';
        (links || []).forEach(l => {
            const d = document.createElement('div');
            d.className = 'social-admin-row';
            d.innerHTML = '<span class="social-type">' + l.type + '</span>'
                + '<input type="text" data-type="' + l.type + '" value="' + (l.value || '') + '" placeholder="URL / numar">'
                + '<label class="toggle-switch"><input type="checkbox" data-social-active="' + l.type + '" ' + (l.active ? 'checked' : '') + '><span class="toggle-slider"></span></label>';
            c.appendChild(d);
        });
    } catch (e) {
        console.error(e);
    }
}

async function saveSocial() {
    const rows = document.querySelectorAll('.social-admin-row');
    const links = [];
    rows.forEach(r => {
        const type = r.querySelector('[data-type]').dataset.type;
        const value = r.querySelector('[data-type]').value;
        const active = r.querySelector('[data-social-active]').checked ? 1 : 0;
        links.push({ type, value, active });
    });

    try {
        const { error } = await supabaseClient.from('social_links').upsert(links, { onConflict: 'type' });
        if (error) throw error;
        alert('Salvat!');
    } catch (err) {
        console.error(err);
        alert('Eroare!');
    }
}

async function loadPromo() {
    try {
        const { data: p, error } = await supabaseClient
            .from('promo_popup')
            .select('*')
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        if (!p) return;

        document.getElementById('promo-active').checked   = !!p.active;
        document.getElementById('promo-title-ro').value   = p.title_ro || '';
        document.getElementById('promo-title-ru').value   = p.title_ru || '';
        document.getElementById('promo-title-en').value   = p.title_en || '';
        document.getElementById('promo-text-ro').value    = p.text_ro || '';
        document.getElementById('promo-text-ru').value    = p.text_ru || '';
        document.getElementById('promo-text-en').value    = p.text_en || '';
        document.getElementById('promo-delay').value      = p.delay_seconds || 3;
        document.getElementById('promo-btn-url').value    = p.button_url || '';
        document.getElementById('promo-btn-ro').value     = p.button_text_ro || '';
        document.getElementById('promo-btn-ru').value     = p.button_text_ru || '';
        document.getElementById('promo-btn-en').value     = p.button_text_en || '';
        document.getElementById('promo-once').checked     = !!p.show_once;
    } catch (e) {
        console.error(e);
    }
}

async function savePromo(e) {
    e.preventDefault();
    const submitButton = e.submitter || e.target.querySelector('button[type="submit"]');
    await withPending('promo-save', async () => {
        setButtonBusy(submitButton, true, 'Se salvează...');
        const file = document.getElementById('promo-image').files[0];

        const payload = {
            active:          document.getElementById('promo-active').checked ? 1 : 0,
            title_ro:        document.getElementById('promo-title-ro').value,
            title_ru:        document.getElementById('promo-title-ru').value,
            title_en:        document.getElementById('promo-title-en').value,
            text_ro:         document.getElementById('promo-text-ro').value,
            text_ru:         document.getElementById('promo-text-ru').value,
            text_en:         document.getElementById('promo-text-en').value,
            delay_seconds:   parseInt(document.getElementById('promo-delay').value, 10) || 3,
            button_url:      document.getElementById('promo-btn-url').value || '',
            button_text_ro:  document.getElementById('promo-btn-ro').value || 'Comandă',
            button_text_ru:  document.getElementById('promo-btn-ru').value || 'Заказать',
            button_text_en:  document.getElementById('promo-btn-en').value || 'Order Now',
            show_once:       document.getElementById('promo-once').checked ? 1 : 0
        };

        try {
            if (file) payload.image_url = await sbUploadImage(file);

            const { data: existing } = await supabaseClient.from('promo_popup').select('id').limit(1).maybeSingle();
            const { error } = existing
                ? await supabaseClient.from('promo_popup').update(payload).eq('id', existing.id)
                : await supabaseClient.from('promo_popup').insert([payload]);
            if (error) throw error;

            alert('Salvat!');
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        } finally {
            setButtonBusy(submitButton, false);
        }
    });
}

async function loadLoader() {
    try {
        const { data, error } = await supabaseClient.from('settings').select('key,value').like('key', 'loader_%');
        if (error) throw error;
        const d = sbRowsToMap(data);
        document.getElementById('loader-enabled').checked     = d.loader_enabled !== '0';
        document.getElementById('loader-text-input').value    = d.loader_text || 'Roll Story';
        document.getElementById('loader-color-input').value   = d.loader_color || 'yellow';
    } catch (e) {
        console.error(e);
    }
}

async function saveLoader(e) {
    e.preventDefault();
    try {
        const rows = [
            { key: 'loader_enabled', value: document.getElementById('loader-enabled').checked ? '1' : '0' },
            { key: 'loader_text',    value: document.getElementById('loader-text-input').value },
            { key: 'loader_color',   value: document.getElementById('loader-color-input').value }
        ];
        const { error } = await supabaseClient.from('settings').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
        alert('Salvat!');
    } catch (err) {
        console.error(err);
        alert('Eroare!');
    }
}

async function loadPages() {
    try {
        const { data: pages, error } = await supabaseClient
            .from('static_pages')
            .select('*')
            .order('order_index', { ascending: true })
            .order('id', { ascending: true });
        if (error) throw error;

        const c = document.getElementById('pages-admin-list');
        c.innerHTML = '';
        (pages || []).forEach(pg => {
            const d = document.createElement('div');
            d.className = 'page-item';
            d.innerHTML = '<div class="page-info"><strong>' + (pg.title_ro || '') + '</strong><small>/page.html?slug=' + pg.slug + ' | Ord: ' + pg.order_index + ' | ' + (pg.active ? '✅' : '❌') + '</small></div>'
                + '<button class="btn-sm" onclick="editPage(' + pg.id + ')">Edit</button> '
                + '<button class="btn-sm btn-danger" onclick="deletePage(' + pg.id + ')">Șterge</button>';
            c.appendChild(d);
        });
    } catch (e) {
        console.error(e);
    }
}

function openPageModal(isEdit = false) {
    document.getElementById('page-editor').style.display = 'block';
    document.getElementById('page-modal-overlay').style.display = 'block';
    if (!isEdit) {
        document.getElementById('page-modal-title').textContent = 'Adaugă Pagină';
        document.getElementById('page-form').reset();
        document.getElementById('pg-id').value = '';
    }
}

function closePageModal() {
    document.getElementById('page-editor').style.display = 'none';
    document.getElementById('page-modal-overlay').style.display = 'none';
}

async function editPage(id) {
    try {
        const { data: pg, error } = await supabaseClient.from('static_pages').select('*').eq('id', id).maybeSingle();
        if (error || !pg) throw error || new Error('not found');

        openPageModal(true);
        document.getElementById('pg-id').value         = pg.id;
        document.getElementById('pg-slug').value       = pg.slug;
        document.getElementById('pg-order').value      = pg.order_index || 0;
        document.getElementById('pg-title-ro').value   = pg.title_ro || '';
        document.getElementById('pg-title-ru').value   = pg.title_ru || '';
        document.getElementById('pg-title-en').value   = pg.title_en || '';
        document.getElementById('pg-content-ro').value = pg.content_ro || '';
        document.getElementById('pg-content-ru').value = pg.content_ru || '';
        document.getElementById('pg-content-en').value = pg.content_en || '';
        document.getElementById('pg-active').value     = pg.active;
        document.getElementById('pg-image').value      = '';
        document.getElementById('page-modal-title').textContent = 'Editează: ' + (pg.title_ro || '');
    } catch (e) {
        console.error(e);
        alert('Eroare!');
    }
}

async function savePage(e) {
    e.preventDefault();
    const submitButton = e.submitter || e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('pg-id').value;
    await withPending('page-save:' + (id || 'new'), async () => {
        setButtonBusy(submitButton, true, 'Se salvează...');
        const file = document.getElementById('pg-image').files[0];

        const payload = {
            slug:        document.getElementById('pg-slug').value,
            order_index: parseInt(document.getElementById('pg-order').value, 10) || 0,
            title_ro:    document.getElementById('pg-title-ro').value,
            title_ru:    document.getElementById('pg-title-ru').value,
            title_en:    document.getElementById('pg-title-en').value,
            content_ro:  document.getElementById('pg-content-ro').value || '',
            content_ru:  document.getElementById('pg-content-ru').value || '',
            content_en:  document.getElementById('pg-content-en').value || '',
            active:      parseInt(document.getElementById('pg-active').value, 10) || 0
        };

        try {
            if (file) payload.image_url = await sbUploadImage(file);

            const { error } = id
                ? await supabaseClient.from('static_pages').update(payload).eq('id', id)
                : await supabaseClient.from('static_pages').insert([payload]);

            if (error) {
                if (error.code === '23505') {
                    alert('Slug-ul există deja.');
                    return;
                }
                throw error;
            }

            closePageModal();
            await loadPages();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        } finally {
            setButtonBusy(submitButton, false);
        }
    });
}

async function deletePage(id) {
    if (!confirm('Ștergi pagina?')) return;
    try {
        const { error } = await supabaseClient.from('static_pages').delete().eq('id', id);
        if (error) throw error;
        loadPages();
    } catch (err) {
        console.error(err);
        alert('Eroare!');
    }
}

async function changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('cp-current').value;
    const newPwd  = document.getElementById('cp-new').value;
    const confirmPwd = document.getElementById('cp-confirm').value;
    const msg = document.getElementById('cp-msg');

    msg.style.display = 'none';

    if (newPwd !== confirmPwd) {
        msg.textContent = 'Parolele noi nu coincid.';
        msg.style.color = '#ff4d4d';
        msg.style.display = 'block';
        return;
    }

    try {
        const { data: userData } = await supabaseClient.auth.getUser();
        const email = userData?.user?.email;
        if (!email) throw new Error('No session');

        const { error: signInErr } = await supabaseClient.auth.signInWithPassword({ email, password: current });
        if (signInErr) {
            msg.textContent = 'Parola curentă este incorectă.';
            msg.style.color = '#ff4d4d';
            msg.style.display = 'block';
            return;
        }

        const { error: updateErr } = await supabaseClient.auth.updateUser({ password: newPwd });
        if (updateErr) throw updateErr;

        msg.textContent = 'Parola a fost schimbata cu succes.';
        msg.style.color = '#4CAF50';
        msg.style.display = 'block';
        document.getElementById('change-password-form').reset();
    } catch (err) {
        console.error(err);
        msg.textContent = 'Eroare la schimbarea parolei.';
        msg.style.color = '#ff4d4d';
        msg.style.display = 'block';
    }
}

function ensureTestimonialsAdminUI() {
    if (document.getElementById('testimonials-admin-list')) return;
    const adminContainer = document.querySelector('.admin-container');
    if (!adminContainer) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = ''
        + '<h2><i class="ph ph-chat-circle-text"></i> Customer Reviews</h2>'
        + '<button onclick="openTestimonialModal()" style="margin-bottom:15px"><i class="ph ph-plus"></i> Adaugă Review</button>'
        + '<div id="testimonials-admin-list" class="pages-list"></div>';
    adminContainer.appendChild(card);

    const overlay = document.createElement('div');
    overlay.id = 'testimonial-modal-overlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999';
    overlay.onclick = closeTestimonialModal;
    document.body.appendChild(overlay);

    const modal = document.createElement('div');
    modal.id = 'testimonial-editor';
    modal.className = 'card';
    modal.style.cssText = 'display:none;position:fixed;top:5%;left:50%;transform:translateX(-50%);width:92%;max-width:650px;max-height:90vh;overflow-y:auto;z-index:1000';
    modal.innerHTML = ''
        + '<h2 id="testimonial-modal-title">Adaugă Review</h2>'
        + '<form id="testimonial-form">'
        + '<input type="hidden" id="ts-id">'
        + '<div class="form-grid">'
        + '<div><label>Autor</label><input type="text" id="ts-author" required></div>'
        + '<div><label>Rating</label><input type="number" id="ts-rating" min="1" max="5" value="5"></div>'
        + '<div style="grid-column:span 2"><label>Conținut</label><textarea id="ts-content" rows="4" required></textarea></div>'
        + '<div><label>Activ</label><select id="ts-active"><option value="1">Da</option><option value="0">Nu</option></select></div>'
        + '</div>'
        + '<div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end">'
        + '<button type="button" onclick="closeTestimonialModal()" class="btn-secondary">Anulează</button>'
        + '<button type="submit">Salvează</button>'
        + '</div>'
        + '</form>';
    document.body.appendChild(modal);
    document.getElementById('testimonial-form').addEventListener('submit', saveTestimonial);
}

async function loadTestimonials() {
    const list = document.getElementById('testimonials-admin-list');
    if (!list) return;
    try {
        const { data: testimonials, error } = await supabaseClient
            .from('testimonials')
            .select('*')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false });
        if (error) throw error;

        list.innerHTML = '';
        (testimonials || []).forEach(item => {
            const active = isActiveInt(item.active);
            const row = document.createElement('div');
            row.className = 'page-item';
            row.style.opacity = active ? '1' : '0.55';
            row.innerHTML = '<div class="page-info"><strong>' + (item.author_name || '—') + '</strong><small>'
                + 'Rating: ' + (item.rating || 5) + '/5 | ' + (active ? '✅' : '❌') + '<br>' + (item.content || '')
                + '</small></div>'
                + '<button class="btn-sm" onclick="editTestimonial(' + item.id + ')">Edit</button> '
                + '<button class="btn-sm ' + (active ? 'btn-danger' : 'btn-secondary') + '" onclick="' + (active ? 'deactivateTestimonial(' : 'reactivateTestimonial(') + item.id + ')">'
                + (active ? 'Dezactivează' : 'Reactivează') + '</button>';
            list.appendChild(row);
        });
    } catch (e) {
        console.error(e);
    }
}

function openTestimonialModal() {
    document.getElementById('testimonial-editor').style.display = 'block';
    document.getElementById('testimonial-modal-overlay').style.display = 'block';
    document.getElementById('testimonial-modal-title').textContent = 'Adaugă Review';
    document.getElementById('testimonial-form').reset();
    document.getElementById('ts-id').value = '';
    document.getElementById('ts-rating').value = '5';
    document.getElementById('ts-active').value = '1';
}

function closeTestimonialModal() {
    document.getElementById('testimonial-editor').style.display = 'none';
    document.getElementById('testimonial-modal-overlay').style.display = 'none';
}

async function editTestimonial(id) {
    try {
        const { data, error } = await supabaseClient.from('testimonials').select('*').eq('id', id).maybeSingle();
        if (error || !data) throw error || new Error('not found');
        document.getElementById('ts-id').value = data.id;
        document.getElementById('ts-author').value = data.author_name || '';
        document.getElementById('ts-content').value = data.content || '';
        document.getElementById('ts-rating').value = data.rating || 5;
        document.getElementById('ts-active').value = data.active;
        document.getElementById('testimonial-modal-title').textContent = 'Editează Review';
        document.getElementById('testimonial-editor').style.display = 'block';
        document.getElementById('testimonial-modal-overlay').style.display = 'block';
    } catch (e) {
        console.error(e);
        alert('Eroare!');
    }
}

async function saveTestimonial(e) {
    e.preventDefault();
    const submitButton = e.submitter || e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('ts-id').value;
    await withPending('testimonial-save:' + (id || 'new'), async () => {
        setButtonBusy(submitButton, true, 'Se salvează...');
        const payload = {
            author_name: document.getElementById('ts-author').value,
            content: document.getElementById('ts-content').value,
            rating: parseInt(document.getElementById('ts-rating').value, 10) || 5,
            active: parseInt(document.getElementById('ts-active').value, 10) || 0
        };

        try {
            const { error } = id
                ? await supabaseClient.from('testimonials').update(payload).eq('id', id)
                : await supabaseClient.from('testimonials').insert([payload]);
            if (error) throw error;
            closeTestimonialModal();
            await loadTestimonials();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        } finally {
            setButtonBusy(submitButton, false);
        }
    });
}

async function deactivateTestimonial(id) {
    await withPending('testimonial-deactivate:' + id, async () => {
        try {
            const { error } = await supabaseClient.from('testimonials').update({ active: 0 }).eq('id', id);
            if (error) throw error;
            await loadTestimonials();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        }
    });
}

async function reactivateTestimonial(id) {
    await withPending('testimonial-reactivate:' + id, async () => {
        try {
            const { error } = await supabaseClient.from('testimonials').update({ active: 1 }).eq('id', id);
            if (error) throw error;
            await loadTestimonials();
        } catch (err) {
            console.error(err);
            alert('Eroare!');
        }
    });
}

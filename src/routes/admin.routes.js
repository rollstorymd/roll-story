const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const supabase = require('../supabase');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET;

// Rate-limit login attempts: max 10 per 15 minutes per IP.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again later.' }
});

// Upload a file to Supabase Storage and return its public URL.
async function uploadToSupabase(file) {
    if (!file) return null;

    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).slice(2);
    const filename = `img-${uniqueSuffix}${ext}`;

    const { error } = await supabase.storage.from('images').upload(filename, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
    });

    if (error) {
        console.error('[uploadToSupabase]', error.message);
        throw error;
    }

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename);
    return urlData.publicUrl;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (error || !admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, admin.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, username: admin.username });
    } catch (e) {
        console.error('[admin/login]', e.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// All routes below this line require a valid JWT.
router.use(authenticate);

router.post('/change-password', async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password || new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    try {
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', req.admin.id)
            .maybeSingle();

        if (error || !admin) return res.status(401).json({ error: 'Admin not found' });

        const valid = await bcrypt.compare(current_password, admin.password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        const hash = await bcrypt.hash(new_password, 10);
        await supabase.from('admins').update({ password_hash: hash }).eq('id', req.admin.id);

        res.json({ message: 'Password updated' });
    } catch (e) {
        console.error('[admin/change-password]', e.message);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ─── Menu ──────────────────────────────────────────────────────────────────

router.get('/menu', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('category', { ascending: true })
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[admin/menu GET]', e.message);
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

router.post('/menu', upload.single('image'), async (req, res) => {
    try {
        const b = req.body;
        const imageUrl = req.file ? await uploadToSupabase(req.file) : null;

        const { error } = await supabase.from('menu_items').insert([{
            category: b.category,
            name_ro: b.name_ro, name_ru: b.name_ru, name_en: b.name_en,
            desc_ro: b.desc_ro || null, desc_ru: b.desc_ru || null, desc_en: b.desc_en || null,
            ingredients_ro: b.ingredients_ro || null, ingredients_ru: b.ingredients_ru || null, ingredients_en: b.ingredients_en || null,
            price: parseFloat(b.price),
            image_url: imageUrl,
            sort_order: parseInt(b.sort_order, 10) || 0,
            active: parseInt(b.active, 10) || 1
        }]);

        if (error) throw error;
        res.json({ message: 'Created' });
    } catch (e) {
        console.error('[admin/menu POST]', e.message);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

router.put('/menu/:id', upload.single('image'), async (req, res) => {
    try {
        const b = req.body;
        const updateData = {
            category: b.category,
            name_ro: b.name_ro, name_ru: b.name_ru, name_en: b.name_en,
            desc_ro: b.desc_ro || null, desc_ru: b.desc_ru || null, desc_en: b.desc_en || null,
            ingredients_ro: b.ingredients_ro || null, ingredients_ru: b.ingredients_ru || null, ingredients_en: b.ingredients_en || null,
            price: parseFloat(b.price),
            sort_order: parseInt(b.sort_order, 10) || 0,
            active: parseInt(b.active, 10) || 1
        };

        if (req.file) {
            updateData.image_url = await uploadToSupabase(req.file);
        }

        const { error } = await supabase.from('menu_items').update(updateData).eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Updated' });
    } catch (e) {
        console.error('[admin/menu PUT]', e.message);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

router.delete('/menu/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('menu_items').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Deleted' });
    } catch (e) {
        console.error('[admin/menu DELETE]', e.message);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// ─── Settings ──────────────────────────────────────────────────────────────

router.post('/settings', async (req, res) => {
    try {
        const upserts = Object.entries(req.body).map(([key, value]) =>
            supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
        );
        await Promise.all(upserts);
        res.json({ message: 'Saved' });
    } catch (e) {
        console.error('[admin/settings POST]', e.message);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// ─── Hero Background ───────────────────────────────────────────────────────

router.post('/hero-bg', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File required' });

        const imageUrl = await uploadToSupabase(req.file);
        const ext = path.extname(req.file.originalname).toLowerCase();
        const type = ['.mp4', '.webm', '.mov'].includes(ext) ? 'video' : 'image';

        await supabase.from('settings').upsert({ key: 'hero_bg_url', value: imageUrl }, { onConflict: 'key' });
        await supabase.from('settings').upsert({ key: 'hero_bg_type', value: type }, { onConflict: 'key' });

        res.json({ message: 'Updated', url: imageUrl, type });
    } catch (e) {
        console.error('[admin/hero-bg POST]', e.message);
        res.status(500).json({ error: 'Failed to update hero background' });
    }
});

router.delete('/hero-bg', async (req, res) => {
    try {
        await supabase.from('settings').upsert({ key: 'hero_bg_url', value: '' }, { onConflict: 'key' });
        await supabase.from('settings').upsert({ key: 'hero_bg_type', value: '' }, { onConflict: 'key' });
        res.json({ message: 'Deleted' });
    } catch (e) {
        console.error('[admin/hero-bg DELETE]', e.message);
        res.status(500).json({ error: 'Failed to remove hero background' });
    }
});

// ─── Gallery ───────────────────────────────────────────────────────────────

router.post('/gallery', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image required' });

        const imageUrl = await uploadToSupabase(req.file);
        const { error } = await supabase.from('gallery').insert([{
            image_url: imageUrl,
            type: req.body.type || 'interior',
            sort_order: parseInt(req.body.sort_order, 10) || 0
        }]);

        if (error) throw error;
        res.json({ message: 'Added' });
    } catch (e) {
        console.error('[admin/gallery POST]', e.message);
        res.status(500).json({ error: 'Failed to add gallery item' });
    }
});

router.delete('/gallery/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('gallery').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Deleted' });
    } catch (e) {
        console.error('[admin/gallery DELETE]', e.message);
        res.status(500).json({ error: 'Failed to delete gallery item' });
    }
});

// ─── About Sections ────────────────────────────────────────────────────────

router.get('/about', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('about_sections')
            .select('*')
            .order('order_index', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[admin/about GET]', e.message);
        res.status(500).json({ error: 'Failed to load sections' });
    }
});

router.post('/about', upload.single('image'), async (req, res) => {
    try {
        const b = req.body;
        const imageUrl = req.file ? await uploadToSupabase(req.file) : null;

        const { error } = await supabase.from('about_sections').insert([{
            title_ro: b.title_ro, title_ru: b.title_ru, title_en: b.title_en,
            text_ro: b.text_ro, text_ru: b.text_ru, text_en: b.text_en,
            image_url: imageUrl,
            order_index: parseInt(b.order_index, 10) || 0,
            active: parseInt(b.active, 10) || 1
        }]);

        if (error) throw error;
        res.json({ message: 'Created' });
    } catch (e) {
        console.error('[admin/about POST]', e.message);
        res.status(500).json({ error: 'Failed to create section' });
    }
});

router.put('/about/:id', upload.single('image'), async (req, res) => {
    try {
        const b = req.body;
        const updateData = {
            title_ro: b.title_ro, title_ru: b.title_ru, title_en: b.title_en,
            text_ro: b.text_ro, text_ru: b.text_ru, text_en: b.text_en,
            order_index: parseInt(b.order_index, 10) || 0,
            active: parseInt(b.active, 10) || 1
        };

        if (req.file) {
            updateData.image_url = await uploadToSupabase(req.file);
        }

        const { error } = await supabase.from('about_sections').update(updateData).eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Updated' });
    } catch (e) {
        console.error('[admin/about PUT]', e.message);
        res.status(500).json({ error: 'Failed to update section' });
    }
});

router.delete('/about/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('about_sections').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Deleted' });
    } catch (e) {
        console.error('[admin/about DELETE]', e.message);
        res.status(500).json({ error: 'Failed to delete section' });
    }
});

// ─── Social Links ──────────────────────────────────────────────────────────

router.get('/social', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('social_links')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[admin/social GET]', e.message);
        res.status(500).json({ error: 'Failed to load social links' });
    }
});

router.post('/social', async (req, res) => {
    try {
        const upserts = req.body.map(link =>
            supabase.from('social_links').upsert(
                { type: link.type, value: link.value, active: link.active ? 1 : 0 },
                { onConflict: 'type' }
            )
        );
        await Promise.all(upserts);
        res.json({ message: 'Saved' });
    } catch (e) {
        console.error('[admin/social POST]', e.message);
        res.status(500).json({ error: 'Failed to save social links' });
    }
});

// ─── Promo Popup ───────────────────────────────────────────────────────────

router.get('/promo', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('promo_popup')
            .select('*')
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        res.json(data || null);
    } catch (e) {
        console.error('[admin/promo GET]', e.message);
        res.status(500).json({ error: 'Failed to load promo' });
    }
});

router.post('/promo', upload.single('image'), async (req, res) => {
    try {
        const b = req.body;
        const { data: existing } = await supabase.from('promo_popup').select('id').limit(1).maybeSingle();
        const imageUrl = req.file ? await uploadToSupabase(req.file) : (b.existing_image || null);

        const payload = {
            title_ro: b.title_ro, title_ru: b.title_ru, title_en: b.title_en,
            text_ro: b.text_ro, text_ru: b.text_ru, text_en: b.text_en,
            button_url: b.button_url || '',
            button_text_ro: b.button_text_ro || 'Comandă',
            button_text_ru: b.button_text_ru || 'Заказать',
            button_text_en: b.button_text_en || 'Order Now',
            delay_seconds: parseInt(b.delay_seconds, 10) || 3,
            show_once: parseInt(b.show_once, 10) || 1,
            active: parseInt(b.active, 10) || 0
        };

        if (imageUrl) payload.image_url = imageUrl;

        const { error } = existing
            ? await supabase.from('promo_popup').update(payload).eq('id', existing.id)
            : await supabase.from('promo_popup').insert([payload]);

        if (error) throw error;
        res.json({ message: 'Saved' });
    } catch (e) {
        console.error('[admin/promo POST]', e.message);
        res.status(500).json({ error: 'Failed to save promo' });
    }
});

// ─── Loader ────────────────────────────────────────────────────────────────

router.post('/loader', async (req, res) => {
    try {
        const { loader_enabled, loader_text, loader_color } = req.body;
        await Promise.all([
            supabase.from('settings').upsert({ key: 'loader_enabled', value: loader_enabled }, { onConflict: 'key' }),
            supabase.from('settings').upsert({ key: 'loader_text', value: loader_text }, { onConflict: 'key' }),
            supabase.from('settings').upsert({ key: 'loader_color', value: loader_color }, { onConflict: 'key' })
        ]);
        res.json({ message: 'Saved' });
    } catch (e) {
        console.error('[admin/loader POST]', e.message);
        res.status(500).json({ error: 'Failed to save loader settings' });
    }
});

// ─── Static Pages ──────────────────────────────────────────────────────────

router.get('/pages', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('static_pages')
            .select('*')
            .order('order_index', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[admin/pages GET]', e.message);
        res.status(500).json({ error: 'Failed to load pages' });
    }
});

router.post('/pages', upload.single('image'), async (req, res) => {
    try {
        const b = req.body;
        const imageUrl = req.file ? await uploadToSupabase(req.file) : null;

        const { error } = await supabase.from('static_pages').insert([{
            slug: b.slug,
            title_ro: b.title_ro, title_ru: b.title_ru, title_en: b.title_en,
            content_ro: b.content_ro || '', content_ru: b.content_ru || '', content_en: b.content_en || '',
            image_url: imageUrl,
            order_index: parseInt(b.order_index, 10) || 0,
            active: parseInt(b.active, 10) || 1
        }]);

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Slug already exists' });
            throw error;
        }

        res.json({ message: 'Created' });
    } catch (e) {
        console.error('[admin/pages POST]', e.message);
        res.status(500).json({ error: 'Failed to create page' });
    }
});

router.put('/pages/:id', upload.single('image'), async (req, res) => {
    try {
        const b = req.body;
        const updateData = {
            slug: b.slug,
            title_ro: b.title_ro, title_ru: b.title_ru, title_en: b.title_en,
            content_ro: b.content_ro || '', content_ru: b.content_ru || '', content_en: b.content_en || '',
            order_index: parseInt(b.order_index, 10) || 0,
            active: parseInt(b.active, 10) || 1
        };

        if (req.file) {
            updateData.image_url = await uploadToSupabase(req.file);
        }

        const { error } = await supabase.from('static_pages').update(updateData).eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Updated' });
    } catch (e) {
        console.error('[admin/pages PUT]', e.message);
        res.status(500).json({ error: 'Failed to update page' });
    }
});

router.delete('/pages/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('static_pages').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Deleted' });
    } catch (e) {
        console.error('[admin/pages DELETE]', e.message);
        res.status(500).json({ error: 'Failed to delete page' });
    }
});

module.exports = router;

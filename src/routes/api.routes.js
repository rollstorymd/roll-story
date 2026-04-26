const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Prevent all public API responses from being cached.
// This ensures the admin panel's changes are reflected immediately.
router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

router.get('/menu', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('active', 1)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[/api/menu]', e.message);
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

router.get('/menu/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Item not found' });
        res.json(data);
    } catch (e) {
        console.error('[/api/menu/:id]', e.message);
        res.status(500).json({ error: 'Failed to load item' });
    }
});

router.get('/settings', async (req, res) => {
    try {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;

        const settings = {};
        data.forEach(row => { settings[row.key] = row.value; });
        res.json(settings);
    } catch (e) {
        console.error('[/api/settings]', e.message);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

router.get('/gallery', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('gallery')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[/api/gallery]', e.message);
        res.status(500).json({ error: 'Failed to load gallery' });
    }
});

router.get('/about', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('about_sections')
            .select('*')
            .eq('active', 1)
            .order('order_index', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[/api/about]', e.message);
        res.status(500).json({ error: 'Failed to load about sections' });
    }
});

router.get('/social', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('social_links')
            .select('*')
            .eq('active', 1)
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[/api/social]', e.message);
        res.status(500).json({ error: 'Failed to load social links' });
    }
});

router.get('/promo', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('promo_popup')
            .select('*')
            .eq('active', 1)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        res.json(data || null);
    } catch (e) {
        console.error('[/api/promo]', e.message);
        res.status(500).json({ error: 'Failed to load promo' });
    }
});

router.get('/pages', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('static_pages')
            .select('id, slug, title_ro, title_ru, title_en, order_index')
            .eq('active', 1)
            .order('order_index', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('[/api/pages]', e.message);
        res.status(500).json({ error: 'Failed to load pages' });
    }
});

router.get('/pages/:slug', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('static_pages')
            .select('*')
            .eq('slug', req.params.slug)
            .eq('active', 1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Page not found' });
        res.json(data);
    } catch (e) {
        console.error('[/api/pages/:slug]', e.message);
        res.status(500).json({ error: 'Failed to load page' });
    }
});

router.get('/loader', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .like('key', 'loader_%');

        if (error) throw error;

        const loader = {};
        data.forEach(row => { loader[row.key] = row.value; });
        res.json(loader);
    } catch (e) {
        console.error('[/api/loader]', e.message);
        res.status(500).json({ error: 'Failed to load loader settings' });
    }
});

module.exports = router;

(function () {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase JS client not loaded');
        return;
    }

    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in /js/env.js');
        return;
    }

    const client = window.supabase.createClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storageKey: 'rollstory.auth'
        }
    });

    window.supabaseClient = client;
    window.sb = client;
    console.info('Supabase client ready. Use window.supabaseClient for queries.');

    window.sbRowsToMap = function (rows) {
        const out = {};
        (rows || []).forEach(r => { out[r.key] = r.value; });
        return out;
    };

    window.sbUploadImage = async function (file) {
        if (!file) return null;

        const dot = file.name.lastIndexOf('.');
        const ext = dot >= 0 ? file.name.slice(dot) : '';
        const suffix = Date.now() + '-' + Math.random().toString(36).slice(2);
        const filename = 'img-' + suffix + ext;

        const { error } = await window.supabaseClient.storage.from('images').upload(filename, file, {
            contentType: file.type || undefined,
            cacheControl: '3600',
            upsert: false
        });
        if (error) throw error;

        const { data } = window.supabaseClient.storage.from('images').getPublicUrl(filename);
        return data.publicUrl;
    };

    window.sbInferMediaType = function (file) {
        if (!file) return 'image';
        if (file.type && file.type.startsWith('video/')) return 'video';
        const name = (file.name || '').toLowerCase();
        return /\.(mp4|webm|mov)$/.test(name) ? 'video' : 'image';
    };

    window.sbRequireAdmin = async function () {
        const { data } = await window.supabaseClient.auth.getSession();
        if (!data.session) {
            window.location.href = '/admin/login.html';
            return null;
        }
        return data.session;
    };
})();

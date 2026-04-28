const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set as environment variables.');
    process.exit(1);
}

const escape = (v) => String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const out = `window.SUPABASE_URL = '${escape(url)}';\nwindow.SUPABASE_ANON_KEY = '${escape(key)}';\n`;

fs.writeFileSync(path.join(__dirname, 'public', 'js', 'env.js'), out);

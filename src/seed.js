// Database seed reference — Roll Story
//
// This project uses Supabase (PostgreSQL) as its database.
// Initial data is seeded directly via the Supabase dashboard or SQL editor.
//
// Required tables:
//   admins, menu_items, settings, gallery, about_sections,
//   social_links, promo_popup, static_pages
//
// To create an admin account, run in the Supabase SQL editor:
//
//   INSERT INTO admins (username, password_hash)
//   VALUES ('admin', '<bcrypt_hash_of_your_password>');
//
// To generate a bcrypt hash locally:
//   node -e "const b=require('bcrypt');b.hash('yourpassword',10).then(console.log)"
//
// Default settings rows (run once):
//
//   INSERT INTO settings (key, value) VALUES
//     ('phone', '+373 610 55 561'),
//     ('whatsapp_msg', 'Buna ziua! Doresc sa plasez o comanda la Roll Story.'),
//     ('glovo_url', ''),
//     ('bolt_url', ''),
//     ('working_hours_ro', 'Zilnic 09:00 – 23:00'),
//     ('working_hours_ru', 'Ежедневно 09:00 – 23:00'),
//     ('working_hours_en', 'Daily 09:00 – 23:00'),
//     ('hero_bg_url', ''),
//     ('hero_bg_type', 'image'),
//     ('loader_enabled', '1'),
//     ('loader_text', 'Roll Story'),
//     ('loader_color', 'yellow');
//
//   INSERT INTO social_links (type, value, active) VALUES
//     ('instagram', '', 0),
//     ('facebook', '', 0),
//     ('telegram', '', 0),
//     ('whatsapp', '+373 610 55 561', 1),
//     ('phone', '+373 610 55 561', 1),
//     ('email', '', 0),
//     ('viber', '', 0);

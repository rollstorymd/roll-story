const db = require('./db');
const bcrypt = require('bcrypt');

const run = async () => {
    db.exec(`DELETE FROM menu_items; DELETE FROM settings; DELETE FROM gallery; DELETE FROM admins; DELETE FROM about_sections; DELETE FROM social_links; DELETE FROM promo_popup; DELETE FROM static_pages;`);

    const hash = await bcrypt.hash('admin123', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);

    const s = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    [
        ['whatsapp_msg', 'Hello! I would like to place an order from Roll Story – Soroca.'],
        ['glovo_url', ''], ['bolt_url', ''],
        ['working_hours_ro', 'Zilnic 09:00 – 23:00'],
        ['working_hours_ru', 'Ежедневно 09:00 – 23:00'],
        ['working_hours_en', 'Daily 09:00 – 23:00'],
        ['phone', '+373 610 55 561'],
        ['hero_bg_url', ''], ['hero_bg_type', 'image'],
        ['loader_enabled', '1'],
        ['loader_text', 'Roll Story'],
        ['loader_color', 'yellow']
    ].forEach(r => s.run(r[0], r[1]));

    const sl = db.prepare('INSERT INTO social_links (type, value, active) VALUES (?, ?, ?)');
    [
        ['instagram', '', 0], ['facebook', '', 0], ['telegram', '', 0],
        ['whatsapp', '+373 610 55 561', 1], ['phone', '+373 610 55 561', 1],
        ['email', '', 0], ['viber', '', 0]
    ].forEach(r => sl.run(r[0], r[1], r[2]));

    db.prepare(`INSERT INTO promo_popup (title_ro, title_ru, title_en, text_ro, text_ru, text_en, button_text_ro, button_text_ru, button_text_en, active) VALUES (?,?,?,?,?,?,?,?,?,0)`)
      .run('Ofertă Specială', 'Специальное Предложение', 'Special Offer', 'Descoperă noile noastre produse!', 'Откройте наши новые продукты!', 'Discover our new products!', 'Vezi Meniul', 'Смотреть Меню', 'View Menu');

    const m = db.prepare(`INSERT INTO menu_items (category, name_ro, name_ru, name_en, desc_ro, desc_ru, desc_en, ingredients_ro, ingredients_ru, ingredients_en, price, image_url, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    [
        ['shawarma','Șaorma cu Pui','Шаурма с курицей','Chicken Shawarma','Șaorma clasică cu carne de pui la grătar, legume proaspete și sos special.','Классическая шаурма с жареной курицей, свежими овощами и фирменным соусом.','Classic shawarma with grilled chicken, fresh vegetables and special sauce.','Pui, salată, roșii, castraveți, ceapă, sos usturoi','Курица, салат, помидоры, огурцы, лук, чесночный соус','Chicken, lettuce, tomatoes, cucumbers, onion, garlic sauce',82,'/images/uploads/shawarma_placeholder.png',1],
        ['shawarma','Șaorma Hot Cheese','Шаурма Hot Cheese','Hot Cheese Shawarma','Șaorma fierbinte cu brânză topită și sos picant.','Горячая шаурма с расплавленным сыром и острым соусом.','Hot shawarma with melted cheese and spicy sauce.','Pui, cașcaval, sos picant, legume','Курица, сыр, острый соус, овощи','Chicken, cheese, spicy sauce, vegetables',69,'/images/uploads/shawarma_placeholder.png',2],
        ['shawarma','Șaorma Vânătorească','Шаурма Охотничья','Hunter Shawarma','Șaorma premium cu cârnăciori de vânătoare și legume proaspete.','Премиум шаурма с охотничьими колбасками и свежими овощами.','Premium shawarma with hunter sausages and fresh vegetables.','Cârnăciori, pui, ciuperci, ceapă, sos','Колбаски, курица, грибы, лук, соус','Sausages, chicken, mushrooms, onion, sauce',95,'/images/uploads/shawarma_placeholder.png',3],
        ['shawarma','Șaorma Nutritivă','Шаурма Питательная','Nutritive Shawarma','Porție dublă, bogată în proteine pentru cei activi.','Двойная порция, богатая белками для активных людей.','Double portion, protein-rich for active people.','Pui dublu, legume, sos, lipie mare','Двойная курица, овощи, соус, большой лаваш','Double chicken, vegetables, sauce, large flatbread',85,'/images/uploads/shawarma_placeholder.png',4],
        ['shawarma','Hot Dog Grill','Хот-дог Гриль','Hot Dog Grill','Hot dog grill cu cârnăciori proaspeți și sos de muștar.','Хот-дог гриль со свежими колбасками и горчичным соусом.','Grilled hot dog with fresh sausages and mustard sauce.','Cârnăciori, pâine, muștar, ketchup, ceapă','Колбаски, булка, горчица, кетчуп, лук','Sausages, bun, mustard, ketchup, onion',50,'/images/uploads/shawarma_placeholder.png',5],
        ['shawarma','Șaorma Vegană','Веганская Шаурма','Vegan Shawarma','Alternativa vegană cu legume la grătar și humus.','Веганская альтернатива с овощами гриль и хумусом.','Vegan alternative with grilled vegetables and hummus.','Legume la grătar, humus, salată, roșii','Овощи гриль, хумус, салат, помидоры','Grilled vegetables, hummus, lettuce, tomatoes',84,'/images/uploads/shawarma_placeholder.png',6],
        ['shawarma','Șaorma Premium','Премиум Шаурма','Premium Shawarma','Cea mai exclusivistă șaorma Roll Story — porție mare, ingrediente premium.','Самая эксклюзивная шаурма — большая порция, премиум ингредиенты.','The most exclusive Roll Story shawarma — large portion, premium ingredients.','Pui premium, cașcaval, ciuperci, sos special, legume proaspete','Премиум курица, сыр, грибы, фирменный соус, свежие овощи','Premium chicken, cheese, mushrooms, special sauce, fresh vegetables',120,'/images/uploads/shawarma_placeholder.png',7],
        ['addons','Cașcaval 30g','Сыр 30г','Cheese 30g','Cașcaval proaspăt de cea mai bună calitate.','Свежий сыр высшего качества.','Fresh cheese of the finest quality.',null,null,null,22,null,1],
        ['addons','Carne 70g','Мясо 70г','Meat 70g','Porție suplimentară de carne de pui la grătar.','Дополнительная порция жареной курицы.','Extra portion of grilled chicken.',null,null,null,28,null,2],
        ['addons','Ciuperci 30g','Грибы 30г','Mushrooms 30g','Ciuperci proaspete, sotate.','Свежие обжаренные грибы.','Fresh sautéed mushrooms.',null,null,null,18,null,3],
        ['drinks','Ice Latte','Ice Latte','Ice Latte','Cafea rece cu lapte și gheață.','Холодный кофе с молоком и льдом.','Cold coffee with milk and ice.','Cafea, lapte, gheață','Кофе, молоко, лёд','Coffee, milk, ice',45,'/images/uploads/drink_placeholder.png',1],
        ['drinks','Ice Cream Float','Мороженое Float','Ice Cream Float','Băutură rece cu înghețată.','Холодный напиток с мороженым.','Cold drink with ice cream.','Suc, înghețată, gheață','Сок, мороженое, лёд','Juice, ice cream, ice',49,'/images/uploads/drink_placeholder.png',2],
        ['drinks','Mojito','Мохито','Mojito','Mojito proaspăt cu mentă și lămâie.','Свежий мохито с мятой и лимоном.','Fresh mojito with mint and lime.','Mentă, lămâie, zahăr, gheață, apă minerală','Мята, лимон, сахар, лёд, минеральная вода','Mint, lime, sugar, ice, sparkling water',55,'/images/uploads/drink_placeholder.png',3],
        ['drinks','Bumble Coffee','Bumble Coffee','Bumble Coffee','Cafea rece cu suc de portocale.','Холодный кофе с апельсиновым соком.','Cold coffee with orange juice.','Cafea, suc portocale, gheață','Кофе, апельсиновый сок, лёд','Coffee, orange juice, ice',50,'/images/uploads/drink_placeholder.png',4],
        ['drinks','Affogato','Аффогато','Affogato','Espresso turnat peste înghețată.','Эспрессо с мороженым.','Espresso poured over ice cream.','Espresso, înghețată vanilie','Эспрессо, ванильное мороженое','Espresso, vanilla ice cream',35,'/images/uploads/drink_placeholder.png',5],
        ['drinks','Pina Colada','Пина Колада','Pina Colada','Cocktail răcoritor cu ananas și cocos.','Освежающий коктейль с ананасом и кокосом.','Refreshing cocktail with pineapple and coconut.','Ananas, cocos, gheață','Ананас, кокос, лёд','Pineapple, coconut, ice',40,'/images/uploads/drink_placeholder.png',6],
        ['drinks','Milkshake','Молочный коктейль','Milkshake','Milkshake cremos — ciocolată, banană sau zmeură.','Сливочный коктейль — шоколад, банан или малина.','Creamy milkshake — chocolate, banana or raspberry.','Lapte, înghețată, sirop','Молоко, мороженое, сироп','Milk, ice cream, syrup',49,'/images/uploads/drink_placeholder.png',7],
        ['drinks','Limonadă','Лимонад','Lemonade','Limonadă proaspătă cu mentă.','Свежий лимонад с мятой.','Fresh lemonade with mint.','Lămâie, zahăr, mentă, apă','Лимон, сахар, мята, вода','Lemon, sugar, mint, water',36,'/images/uploads/drink_placeholder.png',8],
        ['drinks','Frappe','Фраппе','Frappe','Cafea frappe rece și spumoasă.','Холодный и пенистый кофе фраппе.','Cold, frothy frappe coffee.','Cafea, lapte, gheață, zahăr','Кофе, молоко, лёд, сахар','Coffee, milk, ice, sugar',45,'/images/uploads/drink_placeholder.png',9],
        ['drinks','Ice Tea Cătină','Ice Tea Облепиха','Ice Tea Sea Buckthorn','Ceai rece cu cătină proaspătă.','Холодный чай со свежей облепихой.','Cold tea with fresh sea buckthorn.','Ceai, cătină, miere, gheață','Чай, облепиха, мёд, лёд','Tea, sea buckthorn, honey, ice',47,'/images/uploads/drink_placeholder.png',10],
        ['drinks','Ice Tea Fructe de Pădure','Ice Tea Лесные ягоды','Ice Tea Forest Fruits','Ceai rece cu fructe de pădure.','Холодный чай с лесными ягодами.','Cold tea with forest fruits.','Ceai, fructe de pădure, gheață','Чай, лесные ягоды, лёд','Tea, forest berries, ice',35,'/images/uploads/drink_placeholder.png',11],
        ['crepes','Crepe','Блины','Classic Crepes','Clătită clasică, simplă și gustoasă.','Классический блин, простой и вкусный.','Classic crepe, simple and tasty.','Făină, ouă, lapte, unt','Мука, яйца, молоко, масло','Flour, eggs, milk, butter',39,'/images/uploads/crepe_placeholder.png',1],
        ['crepes','Crepe Șaorma','Блин Шаурма','Shawarma Crepe','Clătită umplută cu ingrediente de șaorma.','Блин с начинкой из шаурмы.','Crepe filled with shawarma ingredients.','Pui, legume, sos, clătită','Курица, овощи, соус, блин','Chicken, vegetables, sauce, crepe',75,'/images/uploads/crepe_placeholder.png',2],
        ['crepes','Crepe Ou și Cașcaval','Блин Яйцо и Сыр','Egg & Cheese','Clătită cu ou și cașcaval topit.','Блин с яйцом и плавленым сыром.','Crepe with egg and melted cheese.','Ou, cașcaval, clătită','Яйцо, сыр, блин','Egg, cheese, crepe',60,'/images/uploads/crepe_placeholder.png',3],
        ['crepes','Crepe Banană, Ciocolată','Блин Банан, Шоколад','Banana & Chocolate','Clătită dulce cu banane și ciocolată topită.','Сладкий блин с бананом и растопленным шоколадом.','Sweet crepe with banana and melted chocolate.','Banane, ciocolată, clătită','Бананы, шоколад, блин','Bananas, chocolate, crepe',65,'/images/uploads/crepe_placeholder.png',4],
        ['crepes','Crepe Dulceață Naturală','Блин Варенье','100% Natural Jam','Clătită cu dulceață 100% naturală.','Блин с вареньем 100% натуральным.','Crepe with 100% natural jam.','Dulceață naturală, clătită','Натуральное варенье, блин','Natural jam, crepe',55,'/images/uploads/crepe_placeholder.png',5],
        ['crepes','Crepe Vișină și Lapte Condensat','Блин Вишня','Cherry & Condensed Milk','Clătită cu vișine și lapte condensat.','Блин с вишней и сгущённым молоком.','Crepe with cherries and condensed milk.','Vișine, lapte condensat, clătită','Вишня, сгущённое молоко, блин','Cherries, condensed milk, crepe',60,'/images/uploads/crepe_placeholder.png',6],
        ['crepes','Crepe cu Pomușoare','Блин с ягодами','Berries','Clătită cu amestec de fructe de pădure.','Блин со смесью лесных ягод.','Crepe with mixed berries.','Fructe de pădure, clătită, frișcă','Лесные ягоды, блин, сливки','Forest berries, crepe, whipped cream',68,'/images/uploads/crepe_placeholder.png',7],
        ['crepes','Crepe Caesar','Блин Цезарь','Caesar Crepe','Clătită cu pui, cașcaval și sos Caesar.','Блин с курицей, сыром и соусом Цезарь.','Crepe with chicken, cheese and Caesar sauce.','Pui, cașcaval, sos Caesar, salată','Курица, сыр, соус Цезарь, салат','Chicken, cheese, Caesar sauce, lettuce',80,'/images/uploads/crepe_placeholder.png',8],
        ['crepes','Crepe Vânătorească','Блин Охотничий','Hunter Crepe','Clătită cu cârnăciori și ciuperci.','Блин с колбасками и грибами.','Crepe with sausages and mushrooms.','Cârnăciori, ciuperci, sos, clătită','Колбаски, грибы, соус, блин','Sausages, mushrooms, sauce, crepe',80,'/images/uploads/crepe_placeholder.png',9],
    ].forEach(i => m.run(...i));

    const ab = db.prepare('INSERT INTO about_sections (title_ro,title_ru,title_en,text_ro,text_ru,text_en,image_url,order_index,active) VALUES (?,?,?,?,?,?,?,?,1)');
    ab.run('Povestea Noastră','Наша История','Our Story','Roll Story a fost fondată din pasiunea de a oferi mâncare de stradă de calitate premium. Am început cu o idee simplă: că fast-food-ul poate fi și sănătos, și delicios. Astăzi, suntem mândri să servim cea mai bună șaorma din Soroca.','Roll Story была основана из страсти к предоставлению уличной еды премиум-качества.','Roll Story was founded from a passion for delivering premium street food. We started with a simple idea: fast food can be both healthy and delicious.',null,1);
    ab.run('Calitate Fără Compromis','Качество Без Компромиссов','Uncompromising Quality','Selectăm doar cele mai proaspete ingrediente. Carnea de pui vine de la ferme verificate, legumele sunt livrate zilnic, iar sosurile sunt făcute în casă. Ne garantăm produsele 400%.','Мы выбираем только самые свежие ингредиенты. Куриное мясо поступает с проверенных ферм, овощи доставляются ежедневно.','We select only the freshest ingredients. Chicken comes from verified farms, vegetables are delivered daily, and sauces are homemade. We guarantee our products 400%.',null,2);
    ab.run('De Ce Roll Story?','Почему Roll Story?','Why Roll Story?','Suntem mai mult decât un fast-food. Suntem o experiență culinară. Echipa noastră tânără și pasionată pregătește fiecare produs cu dragoste și atenție.','Мы больше, чем фаст-фуд. Мы — кулинарный опыт. Наша молодая и увлечённая команда готовит каждый продукт с любовью.','We are more than fast food. We are a culinary experience. Our young and passionate team prepares each product with love and attention.',null,3);
};

run().catch(e => { process.exit(1); });

-- Owner explicitly requested publication of the complete existing catalog on 30 October 2026.
-- This changes presentation only; no stock, physical sample evidence or checkout gates are fabricated.

insert into public.categories ("id","name","name_en","slug","description","description_en","status","display_order","sort_order","image_url")
select '157f1573-79cc-4a8f-8387-17b44d46af9b','Cadeaubonnen','Gift cards','cadeaubonnen','Geef hem de keuze uit de collectie van MOSE.','Let him choose from the MOSE collection.','active',70,70,'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/products/1777127303286-w73ri.png'
where not exists(select 1 from public.categories where id='157f1573-79cc-4a8f-8387-17b44d46af9b');

do $$ begin
 if not exists(select 1 from public.categories t where id='3c7d490f-9df0-4536-9e9e-4faf1c78320e' and to_jsonb(t) @> '{"status":"active"}'::jsonb) then
  update public.categories t set "status"='active',"updated_at"='2026-10-30T07:55:25.947Z' where id='3c7d490f-9df0-4536-9e9e-4faf1c78320e' and to_jsonb(t) @> '{"id":"3c7d490f-9df0-4536-9e9e-4faf1c78320e","status":"inactive","updated_at":"2026-10-28T09:30:43.282136+00:00"}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_categories_3c7d490f-9df0-4536-9e9e-4faf1c78320e'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.categories t where id='ace4d07e-5b4b-4a9f-b964-692b071142cd' and to_jsonb(t) @> '{"status":"inactive"}'::jsonb) then
  update public.categories t set "status"='inactive',"updated_at"='2026-10-30T07:55:25.947Z' where id='ace4d07e-5b4b-4a9f-b964-692b071142cd' and to_jsonb(t) @> '{"id":"ace4d07e-5b4b-4a9f-b964-692b071142cd","status":"active","updated_at":"2025-12-31T00:24:43.111411+00:00"}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_categories_ace4d07e-5b4b-4a9f-b964-692b071142cd'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.categories t where id='7a60f11f-a4f1-4a9d-9309-7ce96ad0bf2f' and to_jsonb(t) @> '{"status":"active"}'::jsonb) then
  update public.categories t set "status"='active',"updated_at"='2026-10-30T07:55:25.947Z' where id='7a60f11f-a4f1-4a9d-9309-7ce96ad0bf2f' and to_jsonb(t) @> '{"id":"7a60f11f-a4f1-4a9d-9309-7ce96ad0bf2f","status":"inactive","updated_at":"2026-10-28T09:30:43.444378+00:00"}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_categories_7a60f11f-a4f1-4a9d-9309-7ce96ad0bf2f'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='2307a99e-781a-8f4a-9da0-2374d3cb464f' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":10,"slug":"boxy-fleece-hoodie","description":"Een korte, ruime hoodie met verlaagde schouders en een rustige uitstraling met een subtiel zwart MOSE-logo op de borst. De boxy pasvorm geeft ruimte rond borst en mouwen.\n\nMateriaal: 53% polyester, 42% katoen, 5% overige vezels.\nStofgewicht: 10.2 oz/yd² (345 g/m²).\nOnderhoud: fijnwas op 30 °C, niet bleken, drogen op lage temperatuur, strijken op lage temperatuur, niet rechtstreeks op de print, niet chemisch reinigen.","description_en":"A cropped, oversized fleece hoodie with dropped shoulders and a subtle black MOSE chest logo. The boxy fit gives the chest and sleeves room.\n\nFabric: 53% polyester, 42% cotton, 5% other fibers.\nFabric weight: 10.2 oz/yd² (345 g/m²).\nCare: Machine wash at 30°C (gentle cycle); Do not bleach; Tumble dry low;  Iron at low temperature, avoid ironing on print; Do not dry clean.","meta_title":"Boxy Fleece Hoodie | MOSE","meta_title_en":"Boxy Fleece Hoodie | MOSE","meta_description":"Een korte, ruime hoodie met verlaagde schouders en een rustige uitstraling met een subtiel zwart MOSE-logo op de borst. De boxy pasvorm geeft ruimte rond b","meta_description_en":"A cropped, oversized fleece hoodie with dropped shoulders and a subtle black MOSE chest logo. The boxy fit gives the chest and sleeves room."}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=10,"slug"='boxy-fleece-hoodie',"updated_at"='2026-10-30T07:55:25.947Z',"description"='Een korte, ruime hoodie met verlaagde schouders en een rustige uitstraling met een subtiel zwart MOSE-logo op de borst. De boxy pasvorm geeft ruimte rond borst en mouwen.

Materiaal: 53% polyester, 42% katoen, 5% overige vezels.
Stofgewicht: 10.2 oz/yd² (345 g/m²).
Onderhoud: fijnwas op 30 °C, niet bleken, drogen op lage temperatuur, strijken op lage temperatuur, niet rechtstreeks op de print, niet chemisch reinigen.',"description_en"='A cropped, oversized fleece hoodie with dropped shoulders and a subtle black MOSE chest logo. The boxy fit gives the chest and sleeves room.

Fabric: 53% polyester, 42% cotton, 5% other fibers.
Fabric weight: 10.2 oz/yd² (345 g/m²).
Care: Machine wash at 30°C (gentle cycle); Do not bleach; Tumble dry low;  Iron at low temperature, avoid ironing on print; Do not dry clean.',"meta_title"='Boxy Fleece Hoodie | MOSE',"meta_title_en"='Boxy Fleece Hoodie | MOSE',"meta_description"='Een korte, ruime hoodie met verlaagde schouders en een rustige uitstraling met een subtiel zwart MOSE-logo op de borst. De boxy pasvorm geeft ruimte rond b',"meta_description_en"='A cropped, oversized fleece hoodie with dropped shoulders and a subtle black MOSE chest logo. The boxy fit gives the chest and sleeves room.' where id='2307a99e-781a-8f4a-9da0-2374d3cb464f' and to_jsonb(t) @> '{"id":"2307a99e-781a-8f4a-9da0-2374d3cb464f","updated_at":"2026-10-28T09:48:32.346393+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":5,"slug":"tapstitch-rw0041-boxy-fleece-hoodie","description":"Een korte, ruime hoodie met verlaagde schouders en een rustige, onbedrukte uitstraling. De boxy pasvorm geeft ruimte rond borst en mouwen.\n\nMateriaal: 53% polyester, 42% katoen, 5% overige vezels.\nStofgewicht: 10.2 oz/yd² (345 g/m²).\nOnderhoud: fijnwas op 30 °C, niet bleken, drogen op lage temperatuur, strijken op lage temperatuur, niet chemisch reinigen.","description_en":"A cropped, oversized fleece hoodie with dropped shoulders and a plain finish. The boxy fit gives the chest and sleeves room.\n\nFabric: 53% polyester, 42% cotton, 5% other fibers.\nFabric weight: 10.2 oz/yd² (345 g/m²).\nCare: Machine wash at 30°C (gentle cycle); Do not bleach; Tumble dry low;  Iron at low temperature, avoid ironing on print; Do not dry clean.","meta_title":null,"meta_title_en":null,"meta_description":null,"meta_description_en":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_2307a99e-781a-8f4a-9da0-2374d3cb464f'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='7562c8b3-a7f7-457a-925e-145035b00feb' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":100,"slug":"mose-classic-sweater"}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=100,"slug"='mose-classic-sweater',"updated_at"='2026-10-30T07:55:25.947Z' where id='7562c8b3-a7f7-457a-925e-145035b00feb' and to_jsonb(t) @> '{"id":"7562c8b3-a7f7-457a-925e-145035b00feb","updated_at":"2026-10-29T22:34:42.163189+00:00","status":"active","is_active":true,"show_color_variants_on_shop":true,"display_order":2,"slug":"mose-classic-sweater"}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_7562c8b3-a7f7-457a-925e-145035b00feb'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='3692f227-52fc-41d5-911c-5c539448070b' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":90,"slug":"mose-essential-hoodie"}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=90,"slug"='mose-essential-hoodie',"updated_at"='2026-10-30T07:55:25.947Z' where id='3692f227-52fc-41d5-911c-5c539448070b' and to_jsonb(t) @> '{"id":"3692f227-52fc-41d5-911c-5c539448070b","updated_at":"2026-10-29T22:34:42.303504+00:00","status":"active","is_active":true,"show_color_variants_on_shop":true,"display_order":1,"slug":"mose-essential-hoodie"}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_3692f227-52fc-41d5-911c-5c539448070b'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='51c487a8-ca2d-8e2d-82d4-68ab8501b8c9' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":50,"slug":"tree-camo-barrel-pants","meta_title":"Tree Camo Barrel Pants | MOSE","meta_title_en":"Tree Camo Barrel Pants | MOSE","meta_description":"Een ruime barrel-leg broek met boomcamouflage, middelhoge taille en knoop- en ritssluiting. Het patroon is onderdeel van de originele stof; er wordt geen e","meta_description_en":"Loose barrel-leg pants with tree camouflage, a mid-rise waist and button-and-zip closure. The original fabric pattern is retained with no added print."}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=50,"slug"='tree-camo-barrel-pants',"updated_at"='2026-10-30T07:55:25.947Z',"meta_title"='Tree Camo Barrel Pants | MOSE',"meta_title_en"='Tree Camo Barrel Pants | MOSE',"meta_description"='Een ruime barrel-leg broek met boomcamouflage, middelhoge taille en knoop- en ritssluiting. Het patroon is onderdeel van de originele stof; er wordt geen e',"meta_description_en"='Loose barrel-leg pants with tree camouflage, a mid-rise waist and button-and-zip closure. The original fabric pattern is retained with no added print.' where id='51c487a8-ca2d-8e2d-82d4-68ab8501b8c9' and to_jsonb(t) @> '{"id":"51c487a8-ca2d-8e2d-82d4-68ab8501b8c9","updated_at":"2026-10-28T09:48:32.557261+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":8,"slug":"tapstitch-mb0057-tree-camo-barrel-pants","meta_title":null,"meta_title_en":null,"meta_description":null,"meta_description_en":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_51c487a8-ca2d-8e2d-82d4-68ab8501b8c9'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='cb17519f-6662-86fc-894e-92b4e0ccbbb0' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":30,"slug":"vintage-barrel-jeans","meta_title":"Vintage Barrel Jeans | MOSE","meta_title_en":"Vintage Barrel Jeans | MOSE","meta_description":"Een jeans met barrel-leg silhouet, vintage wassing en middelhoge taille. De denim van 410 g/m² geeft de vorm gewicht. Zonder toegevoegde print.","meta_description_en":"Barrel-leg jeans with a vintage wash and mid-rise waist. The 410 g/m² denim adds weight to the silhouette. No added print."}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=30,"slug"='vintage-barrel-jeans',"updated_at"='2026-10-30T07:55:25.947Z',"meta_title"='Vintage Barrel Jeans | MOSE',"meta_title_en"='Vintage Barrel Jeans | MOSE',"meta_description"='Een jeans met barrel-leg silhouet, vintage wassing en middelhoge taille. De denim van 410 g/m² geeft de vorm gewicht. Zonder toegevoegde print.',"meta_description_en"='Barrel-leg jeans with a vintage wash and mid-rise waist. The 410 g/m² denim adds weight to the silhouette. No added print.' where id='cb17519f-6662-86fc-894e-92b4e0ccbbb0' and to_jsonb(t) @> '{"id":"cb17519f-6662-86fc-894e-92b4e0ccbbb0","updated_at":"2026-10-28T09:48:32.649956+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":9,"slug":"tapstitch-ub0083-vintage-barrel-jeans","meta_title":null,"meta_title_en":null,"meta_description":null,"meta_description_en":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_cb17519f-6662-86fc-894e-92b4e0ccbbb0'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='1569c48c-5120-8d19-add8-04e24546eee4' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":60,"slug":"washed-barrel-jeans","meta_title":"Washed Barrel Jeans | MOSE","meta_title_en":"Washed Barrel Jeans | MOSE","meta_description":"Een ruime barrel-leg jeans met een uitgesproken vintage wassing en middelhoge taille. De denim weegt 450 g/m². Zonder toegevoegde print.","meta_description_en":"Loose barrel-leg jeans with a distinctive vintage wash and mid-rise waist. Made from 450 g/m² denim with no added print."}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=60,"slug"='washed-barrel-jeans',"updated_at"='2026-10-30T07:55:25.947Z',"meta_title"='Washed Barrel Jeans | MOSE',"meta_title_en"='Washed Barrel Jeans | MOSE',"meta_description"='Een ruime barrel-leg jeans met een uitgesproken vintage wassing en middelhoge taille. De denim weegt 450 g/m². Zonder toegevoegde print.',"meta_description_en"='Loose barrel-leg jeans with a distinctive vintage wash and mid-rise waist. Made from 450 g/m² denim with no added print.' where id='1569c48c-5120-8d19-add8-04e24546eee4' and to_jsonb(t) @> '{"id":"1569c48c-5120-8d19-add8-04e24546eee4","updated_at":"2026-10-28T09:48:32.764955+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":10,"slug":"tapstitch-mb0030-washed-barrel-jeans","meta_title":null,"meta_title_en":null,"meta_description":null,"meta_description_en":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_1569c48c-5120-8d19-add8-04e24546eee4'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='f2ccb146-34b5-8b6f-a779-44f685e090d6' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":80,"slug":"distressed-barrel-jeans","meta_title":"Distressed Barrel Jeans | MOSE","meta_title_en":"Distressed Barrel Jeans | MOSE","meta_description":"Een ruime barrel-leg jeans met gewassen finish, distressed details en middelhoge taille. De denim weegt 340 g/m². Zonder toegevoegde print.","meta_description_en":"Loose barrel-leg jeans with a washed finish, distressed details and mid-rise waist. Made from 340 g/m² denim with no added print."}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=80,"slug"='distressed-barrel-jeans',"updated_at"='2026-10-30T07:55:25.947Z',"meta_title"='Distressed Barrel Jeans | MOSE',"meta_title_en"='Distressed Barrel Jeans | MOSE',"meta_description"='Een ruime barrel-leg jeans met gewassen finish, distressed details en middelhoge taille. De denim weegt 340 g/m². Zonder toegevoegde print.',"meta_description_en"='Loose barrel-leg jeans with a washed finish, distressed details and mid-rise waist. Made from 340 g/m² denim with no added print.' where id='f2ccb146-34b5-8b6f-a779-44f685e090d6' and to_jsonb(t) @> '{"id":"f2ccb146-34b5-8b6f-a779-44f685e090d6","updated_at":"2026-10-28T09:48:33.036262+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":12,"slug":"tapstitch-ub0018-distressed-barrel-jeans","meta_title":null,"meta_title_en":null,"meta_description":null,"meta_description_en":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_f2ccb146-34b5-8b6f-a779-44f685e090d6'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='39ff9979-e4ff-84b4-8831-cf0b0cc713af' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":20,"slug":"raglan-longsleeve","description":"Een ruime longsleeve met contrasterende raglanmouwen. De katoenen stof van 270 g/m² geeft deze longsleeve meer gewicht. Het zwarte MOSE-logo op de borst houdt het geheel rustig.\n\nMateriaal: 100% katoen.\nStofgewicht: 8.0 oz/yd² (270 g/m²).\nOnderhoud: fijnwas op 30 °C, niet bleken, drogen op lage temperatuur, strijken op lage temperatuur, niet rechtstreeks op de print, niet chemisch reinigen.","description_en":"A relaxed long-sleeve tee with contrasting raglan sleeves. The 270 g/m² cotton fabric gives this long-sleeve tee a substantial feel. A subtle black MOSE logo sits on the chest.\n\nFabric: 100% cotton.\nFabric weight: 8.0 oz/yd² (270 g/m²).\nCare: Machine wash at 30°C (gentle cycle); Do not bleach; Tumble dry low;  Iron at low temperature, avoid ironing on print; Do not dry clean.","meta_title":"Raglan Longsleeve | MOSE","meta_title_en":"Raglan Longsleeve | MOSE","meta_description":"Een ruime longsleeve met contrasterende raglanmouwen. De katoenen stof van 270 g/m² geeft deze longsleeve meer gewicht. Het zwarte MOSE-logo op de borst ho","meta_description_en":"A relaxed long-sleeve tee with contrasting raglan sleeves. The 270 g/m² cotton fabric gives this long-sleeve tee a substantial feel. A subtle black MOSE lo"}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=20,"slug"='raglan-longsleeve',"updated_at"='2026-10-30T07:55:25.947Z',"description"='Een ruime longsleeve met contrasterende raglanmouwen. De katoenen stof van 270 g/m² geeft deze longsleeve meer gewicht. Het zwarte MOSE-logo op de borst houdt het geheel rustig.

Materiaal: 100% katoen.
Stofgewicht: 8.0 oz/yd² (270 g/m²).
Onderhoud: fijnwas op 30 °C, niet bleken, drogen op lage temperatuur, strijken op lage temperatuur, niet rechtstreeks op de print, niet chemisch reinigen.',"description_en"='A relaxed long-sleeve tee with contrasting raglan sleeves. The 270 g/m² cotton fabric gives this long-sleeve tee a substantial feel. A subtle black MOSE logo sits on the chest.

Fabric: 100% cotton.
Fabric weight: 8.0 oz/yd² (270 g/m²).
Care: Machine wash at 30°C (gentle cycle); Do not bleach; Tumble dry low;  Iron at low temperature, avoid ironing on print; Do not dry clean.',"meta_title"='Raglan Longsleeve | MOSE',"meta_title_en"='Raglan Longsleeve | MOSE',"meta_description"='Een ruime longsleeve met contrasterende raglanmouwen. De katoenen stof van 270 g/m² geeft deze longsleeve meer gewicht. Het zwarte MOSE-logo op de borst ho',"meta_description_en"='A relaxed long-sleeve tee with contrasting raglan sleeves. The 270 g/m² cotton fabric gives this long-sleeve tee a substantial feel. A subtle black MOSE lo' where id='39ff9979-e4ff-84b4-8831-cf0b0cc713af' and to_jsonb(t) @> '{"id":"39ff9979-e4ff-84b4-8831-cf0b0cc713af","updated_at":"2026-10-28T09:48:33.614838+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":6,"slug":"tapstitch-rt0028-raglan-longsleeve","description":"Een ruime longsleeve met contrasterende raglanmouwen. De katoenen stof van 270 g/m² geeft deze onbedrukte basic meer gewicht.\n\nMateriaal: 100% katoen.\nStofgewicht: 8.0 oz/yd² (270 g/m²).\nOnderhoud: fijnwas op 30 °C, niet bleken, drogen op lage temperatuur, strijken op lage temperatuur, niet chemisch reinigen.","description_en":"A relaxed long-sleeve tee with contrasting raglan sleeves. The 270 g/m² cotton fabric gives this plain staple a substantial feel.\n\nFabric: 100% cotton.\nFabric weight: 8.0 oz/yd² (270 g/m²).\nCare: Machine wash at 30°C (gentle cycle); Do not bleach; Tumble dry low;  Iron at low temperature, avoid ironing on print; Do not dry clean.","meta_title":null,"meta_title_en":null,"meta_description":null,"meta_description_en":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_39ff9979-e4ff-84b4-8831-cf0b0cc713af'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='b925b2e2-a147-8cf1-9fcb-47e2ca45ec2f' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":40,"slug":"barrel-pants","meta_title":"Barrel Pants | MOSE","meta_title_en":"Barrel Pants | MOSE","meta_description":"Een ruime broek met barrel-leg silhouet en middelhoge taille. De katoenmix met elastaan geeft de onbedrukte broek bewegingsruimte.","meta_description_en":"Loose barrel-leg pants with a mid-rise waist. A cotton blend with elastane adds stretch to this plain style."}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=40,"slug"='barrel-pants',"updated_at"='2026-10-30T07:55:25.947Z',"meta_title"='Barrel Pants | MOSE',"meta_title_en"='Barrel Pants | MOSE',"meta_description"='Een ruime broek met barrel-leg silhouet en middelhoge taille. De katoenmix met elastaan geeft de onbedrukte broek bewegingsruimte.',"meta_description_en"='Loose barrel-leg pants with a mid-rise waist. A cotton blend with elastane adds stretch to this plain style.' where id='b925b2e2-a147-8cf1-9fcb-47e2ca45ec2f' and to_jsonb(t) @> '{"id":"b925b2e2-a147-8cf1-9fcb-47e2ca45ec2f","updated_at":"2026-10-28T09:48:33.711187+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":7,"slug":"tapstitch-mb0001-barrel-pants","meta_title":null,"meta_title_en":null,"meta_description":null,"meta_description_en":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_b925b2e2-a147-8cf1-9fcb-47e2ca45ec2f'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":130,"slug":"mose-giftcard","category_id":"157f1573-79cc-4a8f-8387-17b44d46af9b"}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=130,"slug"='mose-giftcard',"updated_at"='2026-10-30T07:55:25.947Z',"category_id"='157f1573-79cc-4a8f-8387-17b44d46af9b' where id='bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c' and to_jsonb(t) @> '{"id":"bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c","updated_at":"2026-10-29T22:34:42.433318+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":1,"slug":"mose-giftcard","category_id":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='c5fa43eb-d196-4216-ac8d-67c34279b8c7' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":110,"slug":"mose-tee"}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=110,"slug"='mose-tee',"updated_at"='2026-10-30T07:55:25.947Z' where id='c5fa43eb-d196-4216-ac8d-67c34279b8c7' and to_jsonb(t) @> '{"id":"c5fa43eb-d196-4216-ac8d-67c34279b8c7","updated_at":"2026-10-29T22:34:42.560867+00:00","status":"active","is_active":true,"show_color_variants_on_shop":true,"display_order":3,"slug":"mose-tee"}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_c5fa43eb-d196-4216-ac8d-67c34279b8c7'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='6fd7d8dc-ffe1-8efe-8639-f04d1f50dffa' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":70,"slug":"sunfade-barrel-jeans","meta_title":"Sunfade Barrel Jeans | MOSE","meta_title_en":"Sunfade Barrel Jeans | MOSE","meta_description":"Een ruime barrel-leg jeans in lichtblauw met sunfade-wassing en rafelige details. De middelhoge taille en denim van 460 g/m² bepalen de pasvorm. Zonder toe","meta_description_en":"Loose barrel-leg jeans in light blue with a sunfade wash and frayed details. A mid-rise waist and 460 g/m² denim define the fit. No added print."}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=70,"slug"='sunfade-barrel-jeans',"updated_at"='2026-10-30T07:55:25.947Z',"meta_title"='Sunfade Barrel Jeans | MOSE',"meta_title_en"='Sunfade Barrel Jeans | MOSE',"meta_description"='Een ruime barrel-leg jeans in lichtblauw met sunfade-wassing en rafelige details. De middelhoge taille en denim van 460 g/m² bepalen de pasvorm. Zonder toe',"meta_description_en"='Loose barrel-leg jeans in light blue with a sunfade wash and frayed details. A mid-rise waist and 460 g/m² denim define the fit. No added print.' where id='6fd7d8dc-ffe1-8efe-8639-f04d1f50dffa' and to_jsonb(t) @> '{"id":"6fd7d8dc-ffe1-8efe-8639-f04d1f50dffa","updated_at":"2026-10-28T09:48:32.928046+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":11,"slug":"tapstitch-mb0010-sunfade-barrel-jeans","meta_title":null,"meta_title_en":null,"meta_description":null,"meta_description_en":null}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_6fd7d8dc-ffe1-8efe-8639-f04d1f50dffa'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.products t where id='07dbf6e8-230c-4799-b739-ff4c423ca603' and to_jsonb(t) @> '{"status":"active","is_active":true,"show_color_variants_on_shop":false,"display_order":120,"slug":"mose-automatisch-horloge"}'::jsonb) then
  update public.products t set "status"='active',"is_active"=true,"show_color_variants_on_shop"=false,"display_order"=120,"slug"='mose-automatisch-horloge',"updated_at"='2026-10-30T07:55:25.947Z' where id='07dbf6e8-230c-4799-b739-ff4c423ca603' and to_jsonb(t) @> '{"id":"07dbf6e8-230c-4799-b739-ff4c423ca603","updated_at":"2026-10-15T15:03:47.479394+00:00","status":"draft","is_active":false,"show_color_variants_on_shop":false,"display_order":4,"slug":"mose-automatisch-horloge"}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_products_07dbf6e8-230c-4799-b739-ff4c423ca603'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='21101bdf-aac6-8637-8f18-e6a487da0623' and to_jsonb(t) @> '{"alt_text":"Distressed Barrel Jeans — Blue — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Distressed Barrel Jeans — Blue — detail' where id='21101bdf-aac6-8637-8f18-e6a487da0623' and to_jsonb(t) @> '{"id":"21101bdf-aac6-8637-8f18-e6a487da0623","alt_text":"Distressed Barrel Jeans — Blue — detail (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/ddf3f6cdfeed9650f47ed8679f5ac53dcb57b9834ff9ec64d0c2334fefa7820d.webp","position":3}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_21101bdf-aac6-8637-8f18-e6a487da0623'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='df5150cf-7fa8-8b24-b1f7-584feed6d36a' and to_jsonb(t) @> '{"alt_text":"Distressed Barrel Jeans — Blue — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Distressed Barrel Jeans — Blue — lifestyle' where id='df5150cf-7fa8-8b24-b1f7-584feed6d36a' and to_jsonb(t) @> '{"id":"df5150cf-7fa8-8b24-b1f7-584feed6d36a","alt_text":"Distressed Barrel Jeans — Blue — lifestyle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/1edd03ff5477b64c67e4548002a297545b9b8f169230f8b1602cc4f16d6141c6.webp","position":4}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_df5150cf-7fa8-8b24-b1f7-584feed6d36a'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='e42560c7-7a94-84a6-a62d-f69eafcf1ae9' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Coffee — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Coffee — front' where id='e42560c7-7a94-84a6-a62d-f69eafcf1ae9' and to_jsonb(t) @> '{"id":"e42560c7-7a94-84a6-a62d-f69eafcf1ae9","alt_text":"Boxy Fleece Hoodie — Coffee — front (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/e42560c7-7a94-84a6-a62d-f69eafcf1ae9-01214b646b291f7e.webp","position":0}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_e42560c7-7a94-84a6-a62d-f69eafcf1ae9'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='fa1bce78-ae94-8fe1-8ce6-03b51b0d6de6' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Black — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Black — angle' where id='fa1bce78-ae94-8fe1-8ce6-03b51b0d6de6' and to_jsonb(t) @> '{"id":"fa1bce78-ae94-8fe1-8ce6-03b51b0d6de6","alt_text":"Boxy Fleece Hoodie — Black — angle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/fa1bce78-ae94-8fe1-8ce6-03b51b0d6de6-7eed1b97287d131b.webp","position":7}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_fa1bce78-ae94-8fe1-8ce6-03b51b0d6de6'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='efaa68aa-c435-8658-bbbe-e65e6a6d1060' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Coffee — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Coffee — angle' where id='efaa68aa-c435-8658-bbbe-e65e6a6d1060' and to_jsonb(t) @> '{"id":"efaa68aa-c435-8658-bbbe-e65e6a6d1060","alt_text":"Raglan Longsleeve — White with Coffee — angle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/efaa68aa-c435-8658-bbbe-e65e6a6d1060-5c072e850f15b1c0.webp","position":7}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_efaa68aa-c435-8658-bbbe-e65e6a6d1060'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='24562273-e971-8277-9744-f936855b83d7' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Coffee — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Coffee — back' where id='24562273-e971-8277-9744-f936855b83d7' and to_jsonb(t) @> '{"id":"24562273-e971-8277-9744-f936855b83d7","alt_text":"Boxy Fleece Hoodie — Coffee — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/4ee7c9a5026b84ef433e50bf4925cd38a15bf721feef97ce98eab69154e26f9c.webp","position":1}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_24562273-e971-8277-9744-f936855b83d7'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='d8573e92-7773-8b9c-894d-312b2237a45e' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Black — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Black — back' where id='d8573e92-7773-8b9c-894d-312b2237a45e' and to_jsonb(t) @> '{"id":"d8573e92-7773-8b9c-894d-312b2237a45e","alt_text":"Boxy Fleece Hoodie — Black — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/cba0a535d8d8a4fa2d76f805c55e317bad42bc9947f81de13f860a9e5b1df827.webp","position":6}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_d8573e92-7773-8b9c-894d-312b2237a45e'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='1de05143-43ea-88d0-8757-25fa15a425f4' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Dark Green — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Dark Green — back' where id='1de05143-43ea-88d0-8757-25fa15a425f4' and to_jsonb(t) @> '{"id":"1de05143-43ea-88d0-8757-25fa15a425f4","alt_text":"Boxy Fleece Hoodie — Dark Green — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/782787457f722f5a40246a549384bf1087c1d305624edd433c7bb3a59e8650c9.webp","position":11}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_1de05143-43ea-88d0-8757-25fa15a425f4'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='c2b0b279-47fd-8db1-b89c-888fe4dfb893' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Black — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Black — back' where id='c2b0b279-47fd-8db1-b89c-888fe4dfb893' and to_jsonb(t) @> '{"id":"c2b0b279-47fd-8db1-b89c-888fe4dfb893","alt_text":"Raglan Longsleeve — White with Black — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/838762a56eba3739f7a2ab55d6996a03706dfdb5684c7aaad8f55ca726cf39e8.webp","position":1}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_c2b0b279-47fd-8db1-b89c-888fe4dfb893'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='c6f2a6c6-3583-807a-ab0a-2ebec4e113b1' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Coffee — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Coffee — back' where id='c6f2a6c6-3583-807a-ab0a-2ebec4e113b1' and to_jsonb(t) @> '{"id":"c6f2a6c6-3583-807a-ab0a-2ebec4e113b1","alt_text":"Raglan Longsleeve — White with Coffee — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/c6431cc62244d93223c64588a2e8997802f828ea8be47c5cece095c0a01cf435.webp","position":6}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_c6f2a6c6-3583-807a-ab0a-2ebec4e113b1'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='6d85220e-d46e-8f6e-9dc6-baf3bf65383d' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Coffee — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Coffee — angle' where id='6d85220e-d46e-8f6e-9dc6-baf3bf65383d' and to_jsonb(t) @> '{"id":"6d85220e-d46e-8f6e-9dc6-baf3bf65383d","alt_text":"Boxy Fleece Hoodie — Coffee — angle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/6d85220e-d46e-8f6e-9dc6-baf3bf65383d-353b09ef768cfdd3.webp","position":2}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_6d85220e-d46e-8f6e-9dc6-baf3bf65383d'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='4809a494-7105-87ac-b3d5-d557edea2b33' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Coffee — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Coffee — detail' where id='4809a494-7105-87ac-b3d5-d557edea2b33' and to_jsonb(t) @> '{"id":"4809a494-7105-87ac-b3d5-d557edea2b33","alt_text":"Boxy Fleece Hoodie — Coffee — detail (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/4809a494-7105-87ac-b3d5-d557edea2b33-364704334e9d5944.webp","position":3}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_4809a494-7105-87ac-b3d5-d557edea2b33'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='92571d50-6f33-8557-81c8-6d6fec59d3dc' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Coffee — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Coffee — lifestyle' where id='92571d50-6f33-8557-81c8-6d6fec59d3dc' and to_jsonb(t) @> '{"id":"92571d50-6f33-8557-81c8-6d6fec59d3dc","alt_text":"Boxy Fleece Hoodie — Coffee — lifestyle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/92571d50-6f33-8557-81c8-6d6fec59d3dc-a1482b332eb6e607.webp","position":4}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_92571d50-6f33-8557-81c8-6d6fec59d3dc'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='5df29640-f4df-8507-8a7f-18a0aa5d7732' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Black — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Black — front' where id='5df29640-f4df-8507-8a7f-18a0aa5d7732' and to_jsonb(t) @> '{"id":"5df29640-f4df-8507-8a7f-18a0aa5d7732","alt_text":"Boxy Fleece Hoodie — Black — front (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/5df29640-f4df-8507-8a7f-18a0aa5d7732-fe214d4e500afa2d.webp","position":5}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_5df29640-f4df-8507-8a7f-18a0aa5d7732'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='05c2dbdc-b243-8a95-ba52-a90380356b42' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Black — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Black — detail' where id='05c2dbdc-b243-8a95-ba52-a90380356b42' and to_jsonb(t) @> '{"id":"05c2dbdc-b243-8a95-ba52-a90380356b42","alt_text":"Boxy Fleece Hoodie — Black — detail (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/05c2dbdc-b243-8a95-ba52-a90380356b42-fe0df136c05b63af.webp","position":8}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_05c2dbdc-b243-8a95-ba52-a90380356b42'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='dad96303-66e1-895c-b49b-19584b8dc12f' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Black — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Black — lifestyle' where id='dad96303-66e1-895c-b49b-19584b8dc12f' and to_jsonb(t) @> '{"id":"dad96303-66e1-895c-b49b-19584b8dc12f","alt_text":"Boxy Fleece Hoodie — Black — lifestyle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/dad96303-66e1-895c-b49b-19584b8dc12f-67e987b618a5a008.webp","position":9}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_dad96303-66e1-895c-b49b-19584b8dc12f'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='5858351a-4a02-8364-9077-d25eee4ca907' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Dark Green — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Dark Green — front' where id='5858351a-4a02-8364-9077-d25eee4ca907' and to_jsonb(t) @> '{"id":"5858351a-4a02-8364-9077-d25eee4ca907","alt_text":"Boxy Fleece Hoodie — Dark Green — front (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/5858351a-4a02-8364-9077-d25eee4ca907-9caa162a848dd014.webp","position":10}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_5858351a-4a02-8364-9077-d25eee4ca907'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='08827340-eee6-813b-8210-60ae9c0afe71' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Dark Green — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Dark Green — angle' where id='08827340-eee6-813b-8210-60ae9c0afe71' and to_jsonb(t) @> '{"id":"08827340-eee6-813b-8210-60ae9c0afe71","alt_text":"Boxy Fleece Hoodie — Dark Green — angle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/08827340-eee6-813b-8210-60ae9c0afe71-56e9d4166c59cef0.webp","position":12}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_08827340-eee6-813b-8210-60ae9c0afe71'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='391d159f-e540-8109-ba6b-cc2569c6f154' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Dark Green — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Dark Green — detail' where id='391d159f-e540-8109-ba6b-cc2569c6f154' and to_jsonb(t) @> '{"id":"391d159f-e540-8109-ba6b-cc2569c6f154","alt_text":"Boxy Fleece Hoodie — Dark Green — detail (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/391d159f-e540-8109-ba6b-cc2569c6f154-72faf239051ed6f9.webp","position":13}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_391d159f-e540-8109-ba6b-cc2569c6f154'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='02e25483-9c0f-8e1e-b6c6-529433d43fa7' and to_jsonb(t) @> '{"alt_text":"Boxy Fleece Hoodie — Dark Green — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Boxy Fleece Hoodie — Dark Green — lifestyle' where id='02e25483-9c0f-8e1e-b6c6-529433d43fa7' and to_jsonb(t) @> '{"id":"02e25483-9c0f-8e1e-b6c6-529433d43fa7","alt_text":"Boxy Fleece Hoodie — Dark Green — lifestyle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/02e25483-9c0f-8e1e-b6c6-529433d43fa7-c8271569e7f3b9d6.webp","position":14}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_02e25483-9c0f-8e1e-b6c6-529433d43fa7'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='da07b949-8ecb-8811-bd53-4375e0e335ef' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Black — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Black — front' where id='da07b949-8ecb-8811-bd53-4375e0e335ef' and to_jsonb(t) @> '{"id":"da07b949-8ecb-8811-bd53-4375e0e335ef","alt_text":"Raglan Longsleeve — White with Black — front (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/da07b949-8ecb-8811-bd53-4375e0e335ef-4954347fad90bb60.webp","position":0}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_da07b949-8ecb-8811-bd53-4375e0e335ef'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='8c74e333-0004-842a-9cbf-800004e38d54' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Black — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Black — angle' where id='8c74e333-0004-842a-9cbf-800004e38d54' and to_jsonb(t) @> '{"id":"8c74e333-0004-842a-9cbf-800004e38d54","alt_text":"Raglan Longsleeve — White with Black — angle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/8c74e333-0004-842a-9cbf-800004e38d54-2916a06aff743e51.webp","position":2}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_8c74e333-0004-842a-9cbf-800004e38d54'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='53da4470-10a7-8b0b-920c-83aa9a1edf3f' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Black — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Black — detail' where id='53da4470-10a7-8b0b-920c-83aa9a1edf3f' and to_jsonb(t) @> '{"id":"53da4470-10a7-8b0b-920c-83aa9a1edf3f","alt_text":"Raglan Longsleeve — White with Black — detail (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/53da4470-10a7-8b0b-920c-83aa9a1edf3f-d539eaf7d403184a.webp","position":3}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_53da4470-10a7-8b0b-920c-83aa9a1edf3f'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='37ef00f1-16e6-8977-af77-2abfc0b4486b' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Black — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Black — lifestyle' where id='37ef00f1-16e6-8977-af77-2abfc0b4486b' and to_jsonb(t) @> '{"id":"37ef00f1-16e6-8977-af77-2abfc0b4486b","alt_text":"Raglan Longsleeve — White with Black — lifestyle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/37ef00f1-16e6-8977-af77-2abfc0b4486b-789594efbf9d37eb.webp","position":4}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_37ef00f1-16e6-8977-af77-2abfc0b4486b'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='86e2d667-5809-8e07-96d9-9b9b011144b1' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Coffee — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Coffee — front' where id='86e2d667-5809-8e07-96d9-9b9b011144b1' and to_jsonb(t) @> '{"id":"86e2d667-5809-8e07-96d9-9b9b011144b1","alt_text":"Raglan Longsleeve — White with Coffee — front (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/86e2d667-5809-8e07-96d9-9b9b011144b1-b5b9aeda7e3d88b1.webp","position":5}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_86e2d667-5809-8e07-96d9-9b9b011144b1'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='919d330a-ef9b-895f-b9e2-e2b9df0f4014' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Black — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Black — front' where id='919d330a-ef9b-895f-b9e2-e2b9df0f4014' and to_jsonb(t) @> '{"id":"919d330a-ef9b-895f-b9e2-e2b9df0f4014","alt_text":"Barrel Pants — Black — front (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/ecdeff73286bdb1311ba63836a347be4e7b088846184bc063e9379bbf270b66d.webp","position":0}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_919d330a-ef9b-895f-b9e2-e2b9df0f4014'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='78a01b5f-02aa-87a0-977b-acc30743796c' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Black — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Black — back' where id='78a01b5f-02aa-87a0-977b-acc30743796c' and to_jsonb(t) @> '{"id":"78a01b5f-02aa-87a0-977b-acc30743796c","alt_text":"Barrel Pants — Black — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/a43bb408738d1bc4ce7f6bd68dfca5e6900a65b6d35049d1d50fcd42ed4ab29d.webp","position":1}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_78a01b5f-02aa-87a0-977b-acc30743796c'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='fd3a6358-e584-85a0-8250-310a69e55e3d' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Black — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Black — angle' where id='fd3a6358-e584-85a0-8250-310a69e55e3d' and to_jsonb(t) @> '{"id":"fd3a6358-e584-85a0-8250-310a69e55e3d","alt_text":"Barrel Pants — Black — angle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/b5513db6fbb0ff7e62941978dd4980b9ca3e0b68f9d7d8185a184da05ff2f306.webp","position":2}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_fd3a6358-e584-85a0-8250-310a69e55e3d'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='6b46292c-4f1f-85fe-b69f-35bac7aa4b6e' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Black — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Black — detail' where id='6b46292c-4f1f-85fe-b69f-35bac7aa4b6e' and to_jsonb(t) @> '{"id":"6b46292c-4f1f-85fe-b69f-35bac7aa4b6e","alt_text":"Barrel Pants — Black — detail (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/64b30054d96a1c9a444b654fc61019e4332b2959ef3bf1a930692e86591b6f3e.webp","position":3}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_6b46292c-4f1f-85fe-b69f-35bac7aa4b6e'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='82e6adcb-fefc-850a-bc9b-e7cdf5914e44' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Black — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Black — lifestyle' where id='82e6adcb-fefc-850a-bc9b-e7cdf5914e44' and to_jsonb(t) @> '{"id":"82e6adcb-fefc-850a-bc9b-e7cdf5914e44","alt_text":"Barrel Pants — Black — lifestyle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/42588b195c4eb3b740622b7e7bf0cac8afc558cdad0c2c94f2eefdaa3056f1d5.webp","position":4}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_82e6adcb-fefc-850a-bc9b-e7cdf5914e44'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='cd939514-7cb7-8be3-bf4a-c51e3c496166' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Gray Green — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Gray Green — front' where id='cd939514-7cb7-8be3-bf4a-c51e3c496166' and to_jsonb(t) @> '{"id":"cd939514-7cb7-8be3-bf4a-c51e3c496166","alt_text":"Barrel Pants — Gray Green — front (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/9db19764fa49661e0b975291ea26eab749454e92b52c11178cb4af98f8fae0da.webp","position":5}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_cd939514-7cb7-8be3-bf4a-c51e3c496166'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='35ebfe85-9bd8-8de2-b130-68c8b23f9858' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Gray Green — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Gray Green — back' where id='35ebfe85-9bd8-8de2-b130-68c8b23f9858' and to_jsonb(t) @> '{"id":"35ebfe85-9bd8-8de2-b130-68c8b23f9858","alt_text":"Barrel Pants — Gray Green — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/450dd08e8c5b9452a1fc9b4b001a3b895c34ff6b79604d54f6d6e414f7af7709.webp","position":6}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_35ebfe85-9bd8-8de2-b130-68c8b23f9858'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='93866dda-271e-8dd2-9cb2-7fb5b5677a76' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Gray Green — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Gray Green — angle' where id='93866dda-271e-8dd2-9cb2-7fb5b5677a76' and to_jsonb(t) @> '{"id":"93866dda-271e-8dd2-9cb2-7fb5b5677a76","alt_text":"Barrel Pants — Gray Green — angle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/f16c8dccd2d80ab3d22b10442adea4fe6ba07adc6ff69d22ed52d346a1c4dd0e.webp","position":7}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_93866dda-271e-8dd2-9cb2-7fb5b5677a76'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='fc2dedc7-a8b6-8515-a5ab-32ec6267dd5d' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Gray Green — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Gray Green — detail' where id='fc2dedc7-a8b6-8515-a5ab-32ec6267dd5d' and to_jsonb(t) @> '{"id":"fc2dedc7-a8b6-8515-a5ab-32ec6267dd5d","alt_text":"Barrel Pants — Gray Green — detail (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/53242e2aecd7f6f359d3c064331e2e8df90a2f8e4e09141bcf4d4e9c3e0e5f95.webp","position":8}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_fc2dedc7-a8b6-8515-a5ab-32ec6267dd5d'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='e7ee616a-8b59-81fe-be51-814b94601daa' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Gray Green — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Gray Green — lifestyle' where id='e7ee616a-8b59-81fe-be51-814b94601daa' and to_jsonb(t) @> '{"id":"e7ee616a-8b59-81fe-be51-814b94601daa","alt_text":"Barrel Pants — Gray Green — lifestyle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/ca614f2f7e5305811e99d38554c739d4dc84b0d611aa8b4afd31a1466eb1b91d.webp","position":9}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_e7ee616a-8b59-81fe-be51-814b94601daa'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='150ffe9f-9f19-8e7b-b14b-276cfdd93465' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Coffee — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Coffee — front' where id='150ffe9f-9f19-8e7b-b14b-276cfdd93465' and to_jsonb(t) @> '{"id":"150ffe9f-9f19-8e7b-b14b-276cfdd93465","alt_text":"Barrel Pants — Coffee — front (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/115e37a1f3e7b0ade71d08250cfddb42285385887408c0ea1a629b27e516570c.webp","position":10}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_150ffe9f-9f19-8e7b-b14b-276cfdd93465'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='4afc93bf-db24-8283-a280-de3ff7df6738' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Coffee — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Coffee — back' where id='4afc93bf-db24-8283-a280-de3ff7df6738' and to_jsonb(t) @> '{"id":"4afc93bf-db24-8283-a280-de3ff7df6738","alt_text":"Barrel Pants — Coffee — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/13c6201e8dd60f975ededaa532694ee73caa58e65b06b7129ec24eaadb501f3a.webp","position":11}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_4afc93bf-db24-8283-a280-de3ff7df6738'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='78f65174-712d-85a9-bc9c-3039089efd80' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Coffee — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Coffee — angle' where id='78f65174-712d-85a9-bc9c-3039089efd80' and to_jsonb(t) @> '{"id":"78f65174-712d-85a9-bc9c-3039089efd80","alt_text":"Barrel Pants — Coffee — angle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/a2d1507af5fe6af12be84d72d729770dc32993ffd92bf291fc30b05bc41015f2.webp","position":12}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_78f65174-712d-85a9-bc9c-3039089efd80'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='6750620c-fd01-8112-af85-1f4c905924b2' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Coffee — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Coffee — detail' where id='6750620c-fd01-8112-af85-1f4c905924b2' and to_jsonb(t) @> '{"id":"6750620c-fd01-8112-af85-1f4c905924b2","alt_text":"Barrel Pants — Coffee — detail (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/a430cec113a3c8beecf5b78ae3e6e1e79f6ef084fb7385014c91e6a642ddeba3.webp","position":13}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_6750620c-fd01-8112-af85-1f4c905924b2'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='fc4d0288-d6fc-8c9b-a427-d6144abd3c6a' and to_jsonb(t) @> '{"alt_text":"Barrel Pants — Coffee — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Barrel Pants — Coffee — lifestyle' where id='fc4d0288-d6fc-8c9b-a427-d6144abd3c6a' and to_jsonb(t) @> '{"id":"fc4d0288-d6fc-8c9b-a427-d6144abd3c6a","alt_text":"Barrel Pants — Coffee — lifestyle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/429cd20906cf1f2d489356829e199520d9dd8ab807a3ce03e307ed3f62da0c07.webp","position":14}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_fc4d0288-d6fc-8c9b-a427-d6144abd3c6a'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='654666c3-3afd-84a0-8f2e-2d71eb0352d5' and to_jsonb(t) @> '{"alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Tree Camo Barrel Pants — Brown Tree Camo — front' where id='654666c3-3afd-84a0-8f2e-2d71eb0352d5' and to_jsonb(t) @> '{"id":"654666c3-3afd-84a0-8f2e-2d71eb0352d5","alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — front (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/942ac8717e0eb4e94325e200c6aba9094fdf78d3e181602bc1a973f296d7732c.webp","position":0}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_654666c3-3afd-84a0-8f2e-2d71eb0352d5'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='4952a0be-045b-8259-a288-eb166bcf24d5' and to_jsonb(t) @> '{"alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Tree Camo Barrel Pants — Brown Tree Camo — back' where id='4952a0be-045b-8259-a288-eb166bcf24d5' and to_jsonb(t) @> '{"id":"4952a0be-045b-8259-a288-eb166bcf24d5","alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/a6f91ce0bf0bc99a574f29771a0dd6c9a8ffa8bc277b7a4c3ae1825185364f98.webp","position":1}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_4952a0be-045b-8259-a288-eb166bcf24d5'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='850b2212-a273-8e82-845c-b7827aa495bf' and to_jsonb(t) @> '{"alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Tree Camo Barrel Pants — Brown Tree Camo — angle' where id='850b2212-a273-8e82-845c-b7827aa495bf' and to_jsonb(t) @> '{"id":"850b2212-a273-8e82-845c-b7827aa495bf","alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — angle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/47cf8700c0ed6002ce98162c08c4d2d49f5579c4150a9e5e5b515474b92a14cc.webp","position":2}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_850b2212-a273-8e82-845c-b7827aa495bf'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='de3d71bd-15ed-8704-be6b-1a776bfa80e7' and to_jsonb(t) @> '{"alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Tree Camo Barrel Pants — Brown Tree Camo — detail' where id='de3d71bd-15ed-8704-be6b-1a776bfa80e7' and to_jsonb(t) @> '{"id":"de3d71bd-15ed-8704-be6b-1a776bfa80e7","alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — detail (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/822005da8988da8730135aed93b35ba87d59373e1d25dd26919751bc8d6b03cb.webp","position":3}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_de3d71bd-15ed-8704-be6b-1a776bfa80e7'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='7394e8a7-3fad-89a3-a4f3-d480a8c26912' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Coffee — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Coffee — detail' where id='7394e8a7-3fad-89a3-a4f3-d480a8c26912' and to_jsonb(t) @> '{"id":"7394e8a7-3fad-89a3-a4f3-d480a8c26912","alt_text":"Raglan Longsleeve — White with Coffee — detail (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/7394e8a7-3fad-89a3-a4f3-d480a8c26912-2d175b18b253a0ff.webp","position":8}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_7394e8a7-3fad-89a3-a4f3-d480a8c26912'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='887c2719-88cc-8c44-a45e-b01d28d9ef74' and to_jsonb(t) @> '{"alt_text":"Raglan Longsleeve — White with Coffee — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Raglan Longsleeve — White with Coffee — lifestyle' where id='887c2719-88cc-8c44-a45e-b01d28d9ef74' and to_jsonb(t) @> '{"id":"887c2719-88cc-8c44-a45e-b01d28d9ef74","alt_text":"Raglan Longsleeve — White with Coffee — lifestyle (productvisualisatie met 6 cm borstlogo; fysieke samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/mose-branded/2026-10-28/887c2719-88cc-8c44-a45e-b01d28d9ef74-32be6dc0484a656d.webp","position":9}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_887c2719-88cc-8c44-a45e-b01d28d9ef74'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='75b0297b-2b40-89dc-b02b-79f0c44cea7f' and to_jsonb(t) @> '{"alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Tree Camo Barrel Pants — Brown Tree Camo — lifestyle' where id='75b0297b-2b40-89dc-b02b-79f0c44cea7f' and to_jsonb(t) @> '{"id":"75b0297b-2b40-89dc-b02b-79f0c44cea7f","alt_text":"Tree Camo Barrel Pants — Brown Tree Camo — lifestyle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/e04a1290da474028c387cf15140df2e7e51404311044b602fed248830acd0d22.webp","position":4}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_75b0297b-2b40-89dc-b02b-79f0c44cea7f'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='4b0e845b-fba0-8def-9ac5-dbb231429b84' and to_jsonb(t) @> '{"alt_text":"Vintage Barrel Jeans — Jeans Blue — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Vintage Barrel Jeans — Jeans Blue — front' where id='4b0e845b-fba0-8def-9ac5-dbb231429b84' and to_jsonb(t) @> '{"id":"4b0e845b-fba0-8def-9ac5-dbb231429b84","alt_text":"Vintage Barrel Jeans — Jeans Blue — front (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/91fe46a78f9bb27aef971fb6151d1566eea9d9a5754cc8a9bb588d825dc823e4.webp","position":0}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_4b0e845b-fba0-8def-9ac5-dbb231429b84'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='2aa4e005-e044-8e66-9898-28ecca3d73d8' and to_jsonb(t) @> '{"alt_text":"Vintage Barrel Jeans — Jeans Blue — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Vintage Barrel Jeans — Jeans Blue — back' where id='2aa4e005-e044-8e66-9898-28ecca3d73d8' and to_jsonb(t) @> '{"id":"2aa4e005-e044-8e66-9898-28ecca3d73d8","alt_text":"Vintage Barrel Jeans — Jeans Blue — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/ff6a362387a1a819ff489142a3152e901748c1fc7bcb08ed5eb3573a3bab4ed8.webp","position":1}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_2aa4e005-e044-8e66-9898-28ecca3d73d8'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='17db6b5a-38ee-8bc1-bad6-617632dbb120' and to_jsonb(t) @> '{"alt_text":"Vintage Barrel Jeans — Jeans Blue — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Vintage Barrel Jeans — Jeans Blue — angle' where id='17db6b5a-38ee-8bc1-bad6-617632dbb120' and to_jsonb(t) @> '{"id":"17db6b5a-38ee-8bc1-bad6-617632dbb120","alt_text":"Vintage Barrel Jeans — Jeans Blue — angle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/56406138b6cfb736d6cad7324022b2456e976e02e6d9f3fb6531b719ef8bd040.webp","position":2}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_17db6b5a-38ee-8bc1-bad6-617632dbb120'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='49e1c72c-7c18-8145-a6e9-0371f3df782e' and to_jsonb(t) @> '{"alt_text":"Vintage Barrel Jeans — Jeans Blue — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Vintage Barrel Jeans — Jeans Blue — detail' where id='49e1c72c-7c18-8145-a6e9-0371f3df782e' and to_jsonb(t) @> '{"id":"49e1c72c-7c18-8145-a6e9-0371f3df782e","alt_text":"Vintage Barrel Jeans — Jeans Blue — detail (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/53bfa62308622479d9c94b7d8e16b815d87b990681efcf9aa8de30c3e1137c6a.webp","position":3}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_49e1c72c-7c18-8145-a6e9-0371f3df782e'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='52b0ab21-ddfc-81dd-b3e2-4a4b3ad4897e' and to_jsonb(t) @> '{"alt_text":"Vintage Barrel Jeans — Jeans Blue — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Vintage Barrel Jeans — Jeans Blue — lifestyle' where id='52b0ab21-ddfc-81dd-b3e2-4a4b3ad4897e' and to_jsonb(t) @> '{"id":"52b0ab21-ddfc-81dd-b3e2-4a4b3ad4897e","alt_text":"Vintage Barrel Jeans — Jeans Blue — lifestyle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/59a307c7db586f0335e1e69dd9b867b8e2c3945b805575c6765504ac8f264703.webp","position":4}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_52b0ab21-ddfc-81dd-b3e2-4a4b3ad4897e'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='36f4fd43-b585-88ac-95a7-d546c3e20cf9' and to_jsonb(t) @> '{"alt_text":"Washed Barrel Jeans — Jeans Blue — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Washed Barrel Jeans — Jeans Blue — front' where id='36f4fd43-b585-88ac-95a7-d546c3e20cf9' and to_jsonb(t) @> '{"id":"36f4fd43-b585-88ac-95a7-d546c3e20cf9","alt_text":"Washed Barrel Jeans — Jeans Blue — front (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/b15596a3693f52c6f9a29e3ca3daf981618b1313a38f1f3dbb5873a50d2ef4a0.webp","position":0}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_36f4fd43-b585-88ac-95a7-d546c3e20cf9'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='a854c129-1b5f-80fb-b2e2-2e747ef00562' and to_jsonb(t) @> '{"alt_text":"Washed Barrel Jeans — Jeans Blue — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Washed Barrel Jeans — Jeans Blue — back' where id='a854c129-1b5f-80fb-b2e2-2e747ef00562' and to_jsonb(t) @> '{"id":"a854c129-1b5f-80fb-b2e2-2e747ef00562","alt_text":"Washed Barrel Jeans — Jeans Blue — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/6c392ff4720296890ac9cbb3b9ba76b5d4424265984c3208c3f1708f2a46f1ce.webp","position":1}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_a854c129-1b5f-80fb-b2e2-2e747ef00562'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='0b4f7ed4-ab31-8a46-9b92-b15e9465dcf7' and to_jsonb(t) @> '{"alt_text":"Washed Barrel Jeans — Jeans Blue — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Washed Barrel Jeans — Jeans Blue — angle' where id='0b4f7ed4-ab31-8a46-9b92-b15e9465dcf7' and to_jsonb(t) @> '{"id":"0b4f7ed4-ab31-8a46-9b92-b15e9465dcf7","alt_text":"Washed Barrel Jeans — Jeans Blue — angle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/556bc2ddc5427cb8c6e8350f5bf5145a62d07d45b58912bca1f33f1761ee903b.webp","position":2}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_0b4f7ed4-ab31-8a46-9b92-b15e9465dcf7'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='add90084-51e3-8f68-827f-56318215ce55' and to_jsonb(t) @> '{"alt_text":"Washed Barrel Jeans — Jeans Blue — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Washed Barrel Jeans — Jeans Blue — detail' where id='add90084-51e3-8f68-827f-56318215ce55' and to_jsonb(t) @> '{"id":"add90084-51e3-8f68-827f-56318215ce55","alt_text":"Washed Barrel Jeans — Jeans Blue — detail (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/1e6b6f7dbd9494d9cd906c88062025018d4f3a291873b215f5304f4a678e3da7.webp","position":3}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_add90084-51e3-8f68-827f-56318215ce55'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='4559adc3-cbff-8fa8-968d-5b50054d411d' and to_jsonb(t) @> '{"alt_text":"Washed Barrel Jeans — Jeans Blue — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Washed Barrel Jeans — Jeans Blue — lifestyle' where id='4559adc3-cbff-8fa8-968d-5b50054d411d' and to_jsonb(t) @> '{"id":"4559adc3-cbff-8fa8-968d-5b50054d411d","alt_text":"Washed Barrel Jeans — Jeans Blue — lifestyle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/200314749aded905071e0b758d69b891fa82dc29d2d4b3b1a772c7452b658ec2.webp","position":4}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_4559adc3-cbff-8fa8-968d-5b50054d411d'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='64021106-41b5-804d-bbbf-f902750a9c5f' and to_jsonb(t) @> '{"alt_text":"Sunfade Barrel Jeans — Light Blue — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Sunfade Barrel Jeans — Light Blue — front' where id='64021106-41b5-804d-bbbf-f902750a9c5f' and to_jsonb(t) @> '{"id":"64021106-41b5-804d-bbbf-f902750a9c5f","alt_text":"Sunfade Barrel Jeans — Light Blue — front (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/f31d500b4f3b31038b1071b5b2cba41bf8dad2a3464fe5d4e90c11cf6df80e6c.webp","position":0}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_64021106-41b5-804d-bbbf-f902750a9c5f'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='745530f8-7036-8b27-b963-73546e217d65' and to_jsonb(t) @> '{"alt_text":"Sunfade Barrel Jeans — Light Blue — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Sunfade Barrel Jeans — Light Blue — back' where id='745530f8-7036-8b27-b963-73546e217d65' and to_jsonb(t) @> '{"id":"745530f8-7036-8b27-b963-73546e217d65","alt_text":"Sunfade Barrel Jeans — Light Blue — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/b49f1eaed8ce249d00101091eef06c9ad7e3eca150b4abc903bb9524185c8077.webp","position":1}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_745530f8-7036-8b27-b963-73546e217d65'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='6cd3d2bf-d33d-8853-823c-a74b2e14276e' and to_jsonb(t) @> '{"alt_text":"Sunfade Barrel Jeans — Light Blue — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Sunfade Barrel Jeans — Light Blue — angle' where id='6cd3d2bf-d33d-8853-823c-a74b2e14276e' and to_jsonb(t) @> '{"id":"6cd3d2bf-d33d-8853-823c-a74b2e14276e","alt_text":"Sunfade Barrel Jeans — Light Blue — angle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/159ab1c6532d3fb727473ca49fa1239df309133516ff19d6e1ad7b5e88562702.webp","position":2}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_6cd3d2bf-d33d-8853-823c-a74b2e14276e'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='ea732fb9-6872-8eec-a08b-b56d52ee7586' and to_jsonb(t) @> '{"alt_text":"Sunfade Barrel Jeans — Light Blue — detail"}'::jsonb) then
  update public.product_images t set "alt_text"='Sunfade Barrel Jeans — Light Blue — detail' where id='ea732fb9-6872-8eec-a08b-b56d52ee7586' and to_jsonb(t) @> '{"id":"ea732fb9-6872-8eec-a08b-b56d52ee7586","alt_text":"Sunfade Barrel Jeans — Light Blue — detail (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/f06b727cb0ace48bf276afedf30421db9526e9aeec4003fb26a568e83b70b32e.webp","position":3}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_ea732fb9-6872-8eec-a08b-b56d52ee7586'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='680f1a4d-f71a-84db-a07d-23e3cb285071' and to_jsonb(t) @> '{"alt_text":"Sunfade Barrel Jeans — Light Blue — lifestyle"}'::jsonb) then
  update public.product_images t set "alt_text"='Sunfade Barrel Jeans — Light Blue — lifestyle' where id='680f1a4d-f71a-84db-a07d-23e3cb285071' and to_jsonb(t) @> '{"id":"680f1a4d-f71a-84db-a07d-23e3cb285071","alt_text":"Sunfade Barrel Jeans — Light Blue — lifestyle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/e135ba80c149e815f117e800ceaf563cc8b94722096ede4bd0582719ddf7bc26.webp","position":4}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_680f1a4d-f71a-84db-a07d-23e3cb285071'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='cf790db2-1266-8895-a04b-726349783ddc' and to_jsonb(t) @> '{"alt_text":"Distressed Barrel Jeans — Blue — front"}'::jsonb) then
  update public.product_images t set "alt_text"='Distressed Barrel Jeans — Blue — front' where id='cf790db2-1266-8895-a04b-726349783ddc' and to_jsonb(t) @> '{"id":"cf790db2-1266-8895-a04b-726349783ddc","alt_text":"Distressed Barrel Jeans — Blue — front (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/c4d1333a9ac95627243ac8be51ee59fe7dfb09851a156025f3515c2ddd879d83.webp","position":0}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_cf790db2-1266-8895-a04b-726349783ddc'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='f6133e29-827e-8d95-8e79-dbcfe6f7af5a' and to_jsonb(t) @> '{"alt_text":"Distressed Barrel Jeans — Blue — back"}'::jsonb) then
  update public.product_images t set "alt_text"='Distressed Barrel Jeans — Blue — back' where id='f6133e29-827e-8d95-8e79-dbcfe6f7af5a' and to_jsonb(t) @> '{"id":"f6133e29-827e-8d95-8e79-dbcfe6f7af5a","alt_text":"Distressed Barrel Jeans — Blue — back (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/42c8024a5fa9655428458cc400f67ee04f75604ac3c7d0ef4afec463b103b6d4.webp","position":1}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_f6133e29-827e-8d95-8e79-dbcfe6f7af5a'; end if;
 end if;
end $$;

do $$ begin
 if not exists(select 1 from public.product_images t where id='697f0fb3-ec92-8115-bb1f-317aa63a27eb' and to_jsonb(t) @> '{"alt_text":"Distressed Barrel Jeans — Blue — angle"}'::jsonb) then
  update public.product_images t set "alt_text"='Distressed Barrel Jeans — Blue — angle' where id='697f0fb3-ec92-8115-bb1f-317aa63a27eb' and to_jsonb(t) @> '{"id":"697f0fb3-ec92-8115-bb1f-317aa63a27eb","alt_text":"Distressed Barrel Jeans — Blue — angle (conceptbeeld; samplecontrole volgt)","url":"https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/tapstitch-drafts/2026-10-27/66d7d8e36db48b333366e70c9a9f46950c9e309cd65c3ec47767ab03eff0843c.webp","position":2}'::jsonb;
  if not found then raise exception 'CATALOG_CHANGED_product_images_697f0fb3-ec92-8115-bb1f-317aa63a27eb'; end if;
 end if;
end $$;

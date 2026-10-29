-- Keep feed captions and obsolete offers aligned with the current MOSE collection.
begin;
update public.instagram_settings set section_subtitle_nl = 'Outfits en nieuwe kleding uit de collectie.', section_subtitle_en = 'Outfits and new pieces from the collection.' where id = '01fd2e6f-f85a-433a-929b-6de2a9350805' and section_subtitle_nl is not distinct from 'Benieuwd naar wie we eigenlijk zijn en wat we allemaal doen?' and section_subtitle_en is not distinct from 'MOSE worn in the wild';
update public.instagram_posts set is_hidden = true, is_manually_hidden = true where id = '02078e4f-98d0-4f77-8362-c6632b8a5efd' and is_hidden is not distinct from false and is_manually_hidden is not distinct from false and caption is not distinct from '3 MOSE tees voor maar €100,-🤩

Shop ze op MOSEWEAR.COM.';
update public.instagram_posts set is_hidden = true, is_manually_hidden = true where id = 'b2d70e6a-cef9-451c-9383-0ef6d8c2811e' and is_hidden is not distinct from false and is_manually_hidden is not distinct from false and caption is not distinct from 'Kiek ‘m es eem dan! Oes Marcie!🤩

Marc rockt onze groene MOSE tee. Hebben jullie hem al geshopt?

1 voor €44,95
2 voor €42,45 p.s.
3 voor 39,95 p.s.

MOSEWEAR.COM

#FYP #MOSE #kleding #Groningen';
commit;

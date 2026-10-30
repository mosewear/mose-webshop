-- Restore the owner's original per-colour card presentation; publication, prices and stock stay unchanged.
update public.products set show_color_variants_on_shop=true where id in ('7562c8b3-a7f7-457a-925e-145035b00feb'::uuid, '3692f227-52fc-41d5-911c-5c539448070b'::uuid, 'c5fa43eb-d196-4216-ac8d-67c34279b8c7'::uuid) and show_color_variants_on_shop=false;

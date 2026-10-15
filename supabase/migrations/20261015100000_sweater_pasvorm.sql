-- Pasvormregels voor de Classic Sweater.
-- Meertend is 1,88 m en draagt XL, Rick is 1,86 m en draagt L.
-- Detail- en groepsfoto's blijven leeg, zoals bij de andere producten.
update product_images i
set model_height = '1,88 m', model_size_worn = 'XL'
from products p
where p.id = i.product_id and p.slug = 'mose-classic-sweater' and i.model_name = 'Meertend';

update product_images i
set model_height = '1,86 m', model_size_worn = 'L'
from products p
where p.id = i.product_id and p.slug = 'mose-classic-sweater' and i.model_name = 'Rick';

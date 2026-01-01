-- Verwijder alle bestaande producten en gerelateerde data
-- Dit verwijdert automatisch ook variants en images door CASCADE

DELETE FROM products;

-- Reset de sequences (optioneel, voor schone IDs)
-- ALTER SEQUENCE products_id_seq RESTART WITH 1;
-- ALTER SEQUENCE product_variants_id_seq RESTART WITH 1;
-- ALTER SEQUENCE product_images_id_seq RESTART WITH 1;




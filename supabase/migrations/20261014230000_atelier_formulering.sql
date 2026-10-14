-- "Wij maken het zelf" eruit. We laten het maken.
--
-- Rick: de kleding wordt gemaakt in het atelier in Groningen, maar niet door
-- onszelf. Voor de klant is het voldoende dat het daar vandaan komt. Zinnen als
-- "we maken de kleding die we zelf dragen" en "ons atelier" claimen iets anders,
-- en een claim over herkomst die niet klopt, is precies het soort zin waar een
-- merk later op wordt afgerekend.
--
-- Overal nu: het atelier maakt, wij laten maken.

update lookbook_chapters set
  caption_nl = 'Irma en Rick, en een atelier in Groningen. Daar laten we onze kleding maken, en daar gebeurt de afwerking met de hand. Als het hier goed zit, zit het de rest van de week ook goed.',
  caption_en = 'Irma and Rick, and an atelier in Groningen. That is where our clothes are made, and where the finishing is done by hand. If it sits right here, it sits right the rest of the week too.',
  updated_at = now()
where sort_order = 40;

-- Blog: dezelfde zinnen rechtzetten.
update blog_posts set
  content_nl = replace(content_nl,
    'Ons atelier zit hier, en de afwerking gebeurt hier met de hand.',
    'Het atelier waar onze kleding wordt gemaakt zit hier, en de afwerking gebeurt met de hand.'),
  content_en = replace(content_en,
    'Our atelier is here, and the finishing is done here by hand.',
    'The atelier where our clothes are made is here, and the finishing is done by hand.'),
  updated_at = now()
where slug = 'groningen-in-september';

update blog_posts set
  content_nl = replace(content_nl,
    'Dat is exact waarom wij onze hoodie en sweater op 300 gram per vierkante meter maken.',
    'Dat is exact waarom onze hoodie en sweater op 300 gram per vierkante meter worden gemaakt.'),
  content_en = replace(content_en,
    'That is exactly why we make our hoodie and sweater at 300 gsm.',
    'That is exactly why our hoodie and sweater are made at 300 gsm.'),
  updated_at = now()
where slug = 'groningen-in-september';

update blog_posts set
  content_nl = replace(content_nl, 'Beide maken we in de maten M, L en XL', 'Beide zijn er in de maten M, L en XL'),
  content_en = replace(content_en, 'We make both in M, L and XL', 'Both come in M, L and XL'),
  updated_at = now()
where slug = 'hoodie-of-sweater-het-verschil';

update blog_posts set
  content_nl = replace(content_nl,
    'Alles wat wij maken komt uit ons atelier in Groningen, waar de afwerking met de hand gebeurt.',
    'Alles wat wij verkopen komt uit het atelier in Groningen, waar de afwerking met de hand gebeurt.'),
  content_en = replace(content_en,
    'Everything we make comes from our atelier in Groningen, where the finishing is done by hand.',
    'Everything we sell comes from the atelier in Groningen, where the finishing is done by hand.'),
  updated_at = now()
where slug = 'terug-van-vakantie-kleding-op-orde';

update blog_posts set
  content_nl = replace(
    replace(content_nl,
      'en daarom maken we onze hoodie en sweater allebei in dat gewicht',
      'en daarom laten we onze hoodie en sweater allebei in dat gewicht maken'),
    'Alles wordt bij ons lokale atelier in Groningen met de hand afgewerkt.',
    'Alles wordt in het atelier in Groningen met de hand afgewerkt.'),
  content_en = replace(
    replace(content_en,
      'which is why we make both our hoodie and our sweater in it',
      'which is why both our hoodie and our sweater are made in it'),
    'Everything is hand-finished at our local atelier in Groningen.',
    'Everything is hand-finished at the atelier in Groningen.'),
  updated_at = now()
where slug = 'vier-stukken-zeven-dagen-september';

update blog_posts set
  content_nl = replace(content_nl,
    'Omdat wij dichtbij maken, kunnen we vijftig stuks laten draaien',
    'Omdat we dichtbij laten maken, kunnen we vijftig stuks laten draaien'),
  content_en = replace(content_en,
    'Because we make close by, we can run fifty pieces',
    'Because we have it made close by, we can run fifty pieces'),
  updated_at = now()
where slug = 'waarom-we-in-groningen-laten-maken';

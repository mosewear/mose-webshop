-- Vijf retouren stonden nog open in het systeem terwijl ze in werkelijkheid al
-- waren afgehandeld. De statuswijziging is destijds niet teruggekoppeld, dus de
-- administratie liep achter op de praktijk: de oudste stond 181 dagen "open",
-- waaronder een klant die zijn geld allang had.
--
-- Eindstatus volgens de winkel zelf: returns.status = 'refunded' en de
-- bijbehorende order op 'return_completed' (zie statusMap in
-- src/lib/update-order-status.ts).
--
-- refunded_at blijft bewust leeg. De echte terugbetaaldatum is nergens
-- vastgelegd, en een verzonnen datum op een financiële regel is erger dan een
-- lege datum. De voorraad raken we hier ook niet aan: of die stuks weer
-- verkocht zijn, weet het systeem niet en dat is geen gok waard.

update returns
set status = 'refunded'
where status in ('return_received', 'refund_processing');

update orders o
set status = 'return_completed', updated_at = now()
where exists (select 1 from returns r where r.order_id = o.id and r.status = 'refunded')
  and o.status in ('return_received', 'return_in_transit', 'return_requested');

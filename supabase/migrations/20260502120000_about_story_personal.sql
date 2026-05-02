-- Vervang het generieke "MOSE is geboren uit frustratie..."-verhaal in
-- de about-sectie door een persoonlijke story van Irma & Rick. De
-- /over-mose render splitst paragraph1/2 op blank-lines zodat meerdere
-- alinea's binnen één veld als losse <p>'s worden getoond. We gebruiken
-- dollar-quoting ($PARA$ ... $PARA$) zodat de aanhalingstekens en
-- emoji binnen de copy geen escape-verhaal vereisen.

UPDATE about_settings
SET
  story_paragraph1_nl = $PARA$Wij zijn Irma en Rick, de oprichters van MOSE.

We wonen met onze katten Bob en Marley en onze daggoe Guus in Groningen, in Helpman. Sinds september zijn we zelfs getrouwd. Wow, serieuze shit.

“Waarom MOSE?” Onze overleden poes heette Mosie, we noemden haar Moos. Dit is ons eerbetoon. 🐱$PARA$,
  story_paragraph2_nl = $PARA$We zijn MOSE gestart omdat fast fashion ons irriteert. We kochten vaak dure t-shirts die na een paar keer wassen klaar waren voor de prullenbak. Daarom maken we kleding die blijft. Duurzaam, eerlijk en lokaal. Ook na tig keer wassen.

Lokaal? Ja. Gewoon gemaakt in het atelier in Groningen.$PARA$,
  story_paragraph1_en = $PARA$We're Irma and Rick, the founders of MOSE.

We live with our cats Bob and Marley and our doggo Guus in Groningen, in Helpman. As of September we're even married. Wow, serious stuff.

"Why MOSE?" Our late cat was named Mosie, we called her Moos. This is our tribute to her. 🐱$PARA$,
  story_paragraph2_en = $PARA$We started MOSE because fast fashion irritates us. We kept buying expensive t-shirts that were ready for the bin after a few washes. So we make clothing that lasts. Sustainable, honest and local. Even after countless washes.

Local? Yes. Just made in the atelier in Groningen.$PARA$,
  updated_at = NOW();

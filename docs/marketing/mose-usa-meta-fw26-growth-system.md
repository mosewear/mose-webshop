# MOSE USA | Meta Ads growth system | FW26
Owner: MOSE. Status: staged in Meta, all ads and ad sets paused. Last audit: 2026-11-04.
Meta account: Mosewear.com, 1421367439360000. Account billing currency EUR.
Pixel: 1447430483627328. Conversion objective: OUTCOME_SALES, website Purchase.
Status: **NOT AUTHORIZED TO LAUNCH**. United States storefront checkout/US shipping and DDP are unverified.

## Actual Meta campaign structure

| Layer | Campaign ID | Set | Audience | Daily EUR budget if enabled | State |
|---|---|---|---|---:|---|
| Creative Lab | 120250743414600194 | W01 / 120250743450820194 | US, 18–44, all genders, broad | 35 | PAUSED |
| Creative Lab | 120250743414600194 | W02 / 120250748113520194 | same | 35 | PAUSED |
| Creative Lab | 120250743414600194 | W03 / 120250748114040194 | same | 35 | PAUSED |
| Creative Lab | 120250743414600194 | W04 / 120250748114490194 | same | 35 | PAUSED |
| Creative Lab | 120250743414600194 | W05 / 120250748114880194 | same | 35 | PAUSED |
| Winner Scale | 120250748088950194 | S01 / 120250748115970194 | same, winner-only | 70 | PAUSED, empty |
| Retargeting HOLD | 120250748089540194 | none | needs real custom audience and adequate size | none | PAUSED, empty |

**Danger:** enabling all five Creative Lab ad sets creates up to EUR 175/day of parallel budget, BEFORE scale. Activate at most ONE Creative Lab wave at a time under the 35/day pilot until the owner approves a higher spend. Never enable the scale and remarketing layers by accident.

## Confirmed assets and test matrix
24 static image ads created and verified PAUSED in the connected Meta account. All 24 have distinct utm_content values on the common tags:
utm_source=meta&utm_medium=paid_social&utm_campaign=mose_us_fw26

- W01, 4 baseline ads: Denim Jacket (2 original angles), Waffle Tee (1), Washed Longsleeve (1).
- W02, 5 ads, product silhouette and styling: Denim, Washed Longsleeve, Waffle, Heavy Tee, Quarter-Zip; alternate photo angle for each.
- W03, 5 ads, material proof: Denim 320 GSM 70/30 cotton-poly, Washed Longsleeve 250 GSM cotton, Waffle 340 GSM 70/30 blend, Heavy Tee 300 GSM cotton, Quarter-Zip 230 GSM polyester-elastane.
- W04, 5 ads, wardrobe versatility: Denim, Longsleeve, Waffle, Heavy Tee, Quarter-Zip; different imagery and hooks from W02/W03.
- W05, 5 ads, fit and function: Denim shape, Longsleeve size L length 76 cm, Waffle raglan, Heavy Tee oversized and size guide, Training Pants stretch and tapered cut.

Actual image uploads came from existing Shopify CDN product photography, not fabricated AI garment replicas. Some alternate CDN images initially failed Meta import; their ads were replaced with accepted source images, not left as broken ads. Each uses Shop Now and links to the corresponding public MOSE product path in English.

## Test design
Prioritize measurable creative differences, not tiny word changes.
1. W01 baseline, run only AFTER checkout proof. Keep 4 ads for a stable first read.
2. W02 test silhouette and styling with 5 ads in isolation.
3. W03 test fabric and measurable details.
4. W04 test styling/usage rather than material.
5. W05 test fit reassurance and utility.
Use one wave at a time at EUR 35/day, keeping the same broad US audience and purchase pixel. Compare ads by product and creative angle. Do not mistake a broad Meta algorithm's uneven creative spend for valid randomized experimental evidence; run native A/B tests where eligible and enough spend is available.

## Critical missing creative formats
The six sampled Shopify products currently have **zero Shopify-hosted videos**. Do not claim that 9:16 UGC, Reels motion, 4:5 feed design crops or carousels have been built in Ads Manager. Production brief:
- 4:5 feed 1080x1350: denim 320 GSM wash/cuffs, washed long sleeve on-model in a city, waffle macro texture, heavy tee oversized fit and size guide.
- 9:16 Reels/Stories 1080x1920: 6–15 sec original MOSE clips, high-quality sample footage, front/back full fit, closeup material, 3 fits in 10 seconds, packaging/unboxing, mobile readable hooks, generous UI safe area. Silent-captions and licensed/original sound if sound is used.
- Consider separate 1:1 carousel with 3 genuine product photos: outfit, texture, size-fit. Must have correctly linked cards and the same SKU available at checkout.
- Shoot the confirmed RW0016 black/beige AFTER the actual Tapstitch produced butterfly and positioning match the official safe print region; blank front. Do not use old RW0041 mockups.
- All visuals must reflect actual products. No invented US delivery guarantee, duties included guarantee, discounts, sale tags, customer quotes/reviews, country-of-manufacture or prices.
- Image and video ad placements need placement-specific aspect ratio crops; don't rely on heavy automatic cropping of important products.

## Prelaunch nonnegotiable gate
- Actual US checkout must select United States, show real USD charged currency, a valid US shipping method, tax/duties and full payable total; fulfill DDP without surprise invoice or clearly block excluded ZIPs.
- Landing URL live product availability and sizing accurate for US.
- Purchase and AddToCart events use correct USD values, content IDs and deduplicate browser Pixel versus CAPI. Verify Meta Events Manager test event for at least US ATC, IC and Purchase in a safe test.
- Match supplier origin/HS code, US landed cost, taxes and returns; determine gross margin after refunds/payment/fulfillment before setting any minimum ROAS or acceptable CPA. No CPA/ROAS number should be fabricated.
- Keep conversion tracking UTMs valid and domains verified.
- Correct Instagram identity, placements and automatic enhancements must be reviewed in Ads Manager preview before activation.

## Winner and scaling policy
Only consider an ad a candidate winner on purchase data AND contribution after cost: purchase conversions and attributed revenue, true fulfillment margin, cost per acquisition, landing-page conversion rate, return risk, checkout issues and AOV. Do not promote on CTR alone. Control for creative spend and volume.
- Start one €35/day wave, 4–5 ads. Evaluate after enough purchase events and spend relative to the verified break-even CPA; don't prematurely kill an ad after a few impressions. If spend materially exceeds a pre-agreed break-even acquisition threshold with no purchases, stop that variant and review click quality and checkout.
- Move a measured profitable creative into S01 after validating the actual published image, source, landing URL and conversion events. No theoretical/untested "winners" in S01.
- Start with €70/day ONLY once owner explicitly approves that higher daily spend. Scale gradually and verify acquisition margin; avoid changing too many variables or heavily editing live ads each day.
- Retargeting requires real 7/14/30-day website visitors, product viewers, cart initiators, purchaser exclusions and a sufficiently large audience. Do not launch the campaign with broad targeting masquerading as retargeting; avoid oversized retarget spend and frequency.
- Weekly reporting: spend, impressions, CPM, link CTR, landing views, add to cart, initiated checkouts, purchases, purchase conversion value (USD), purchase CPA (EUR spend), ROAS after currencies normalized, net contribution, refunded orders, and creative cohort. Keep separate customer purchase currency and ad account billing currency.

## Handoff notes
Meta's direct Windsor connection supports creating campaigns, ad sets, standard single-image ads and setting pause/enable. It does not on its own create a measured DPA/catalog sales integration or working native Meta A/B test. Existing imported creative URLs and Meta approval statuses must be reviewed if the source imagery changes. Stage everything paused; owner approval is required before spending.

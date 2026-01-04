# MOSE WEBSHOP - IMPROVEMENTS & TODO PLAN

## 🚨 KRITIEK (Moet worden opgelost)

### 1. Back-in-Stock Notifications
**Status**: UI aanwezig, backend ontbreekt  
**Locatie**: `src/app/(main)/product/[slug]/page.tsx:238`  
**Probleem**: `handleNotifyMe` heeft TODO comment, slaat niks op in database  
**Actie**: 
- Database tabel `back_in_stock_notifications` maken
- API endpoint `/api/back-in-stock/notify` maken
- Email template voor back-in-stock emails
- Cron job om stock te checken en emails te sturen

### 2. Contact Formulier Backend
**Status**: Formulier werkt, emails worden niet verstuurd  
**Locatie**: `src/app/(main)/contact/page.tsx:20`  
**Probleem**: TODO comment "Send email via API"  
**Actie**:
- API endpoint `/api/contact` maken
- Email template voor contact formulier
- Optioneel: Database tabel voor contact submissions (voor admin overzicht)

### 3. Image Storage Cleanup
**Status**: Images worden niet verwijderd uit Supabase Storage  
**Locatie**: `src/app/admin/products/[id]/images/page.tsx:143`  
**Probleem**: TODO comment "Also delete from storage if needed"  
**Actie**:
- Supabase Storage cleanup implementeren bij image delete
- Cleanup functie in ImageUpload component

### 4. Password Reset Functionaliteit
**Status**: Volledig ontbreekt  
**Probleem**: Gebruikers kunnen wachtwoord niet resetten  
**Actie**:
- `/forgot-password` pagina maken
- `/reset-password` pagina maken  
- Supabase Auth password reset gebruiken
- Email templates voor password reset

---

## ⚠️ BELANGRIJK (Zou moeten worden toegevoegd)

### 5. Form Validatie Library
**Status**: Basic validatie, geen library  
**Probleem**: Inconsistente validatie, veel duplicate code  
**Actie**:
- Zod + React Hook Form installeren
- Validatie schemas maken voor alle forms (checkout, contact, product edit, etc.)
- Error messages standaardiseren

### 6. Toast Notifications Systeem
**Status**: react-hot-toast geïnstalleerd maar niet gebruikt  
**Probleem**: 64x `alert()` en `confirm()` gebruikt (slecht voor UX)  
**Actie**:
- Toast provider toevoegen aan layout
- Alle `alert()`/`confirm()` vervangen door toast notifications
- Success/error states verbeteren

### 7. Error Boundaries
**Status**: Geen error boundaries aanwezig  
**Probleem**: Geen graceful error handling bij crashes  
**Actie**:
- `error.tsx` files toevoegen aan belangrijke routes
- Global error boundary component
- Error logging (Sentry of alternatief)

### 8. Environment Variables Validatie
**Status**: Geen validatie, kan runtime errors geven  
**Probleem**: Missing env vars worden pas ontdekt bij gebruik  
**Actie**:
- Zod schema voor environment variables
- Validatie bij app start
- Duidelijke error messages

---

## 💡 VERBETERINGEN (Nice to have)

### 9. Analytics Dashboard Uitbreiden
**Status**: Basic analytics aanwezig  
**Verbeteringen**:
- Chart library toevoegen (recharts/visx)
- Grafieken voor revenue trends
- Export functionaliteit (CSV/PDF)
- Real-time updates
- Date range filtering

### 10. Database Type Updates
**Status**: Types lijken incomplete  
**Problemen**:
- `paid_at`, `payment_metadata`, `checkout_started_at` velden ontbreken mogelijk in types
- Database types syncen met actual database schema
**Actie**:
- Supabase types regenereren
- Types controleren en updaten

### 11. Console.log Cleanup
**Status**: 217 console.log statements  
**Actie**:
- Development-only logging wrapper maken
- Production logs verwijderen of vervangen door proper logging
- Error logging service integreren

### 12. Account Page Uitbreidingen
**Status**: Basis functionaliteit aanwezig  
**Verbeteringen**:
- Adresbeheer (billing/shipping addresses)
- Profiel bewerken
- Wachtwoord wijzigen
- Order history verbeteringen (filtering, search)

### 13. Admin Verbeteringen
**Verbeteringen**:
- Bulk acties (multi-select, bulk delete)
- Export functionaliteit (orders, products CSV)
- Advanced filtering/sorting
- Activity log/audit trail
- Image upload progress indicator

### 14. Performance Optimalisaties
**Verbeteringen**:
- Image lazy loading optimaliseren
- Product listing pagination (nu alles in 1x)
- Database query optimalisatie (N+1 problemen checken)
- Caching strategy verbeteren

### 15. SEO Verbeteringen
**Verbeteringen**:
- Dynamic meta tags voor alle product pages
- Structured data (JSON-LD) uitbreiden
- Sitemap verbeteren
- Open Graph images genereren

### 16. Testing
**Status**: Geen tests aanwezig  
**Actie**:
- Unit tests voor utilities
- Integration tests voor API routes
- E2E tests voor kritieke flows (checkout, admin)

---

## 📋 PRIORITEITEN

### Fase 1 (Kritiek - Deze week):
1. Back-in-stock notifications backend
2. Contact formulier backend  
3. Image storage cleanup
4. Password reset functionaliteit

### Fase 2 (Belangrijk - Deze maand):
5. Form validatie library
6. Toast notifications
7. Error boundaries
8. Environment variables validatie

### Fase 3 (Verbeteringen - Later):
9-16. Alle andere verbeteringen

---

## 📝 QUICK WINS (Makkelijk te fixen)

1. ✅ Console.log cleanup (vervang door logging service)
2. ✅ Alert/confirm vervangen door toast (1-2 uur werk)
3. ✅ Database types regenereren (5 minuten)
4. ✅ Error.tsx files toevoegen (30 minuten)
5. ✅ Environment variables validatie toevoegen (1 uur)


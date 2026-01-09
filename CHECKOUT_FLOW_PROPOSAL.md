# Checkout Flow Verbetering - Perfect Voorstel

## Huidige Problemen

### 1. Geen Auto-load bij Page Load
- ❌ Checkout laadt niet automatisch user data als gebruiker al ingelogd is
- ❌ Gebruiker moet handmatig inloggen tijdens checkout
- ❌ Geen gebruik van opgeslagen adressen

### 2. Login Functionaliteit
- ❌ Probeert address/city/etc uit `profiles` table te halen (bestaat niet)
- ❌ Gebruikt `user_addresses` table niet
- ✅ Werkt wel voor first_name, last_name, email

### 3. User Experience
- ⚠️ Gebruiker moet altijd handmatig inloggen, ook al is hij ingelogd
- ⚠️ Geen gebruik van opgeslagen default address
- ⚠️ Geen optie om tussen guest checkout en login te switchen na auto-fill

---

## Perfecte Flow Voorstel

### SCENARIO 1: Gebruiker is NIET ingelogd (Guest)

1. **Page Load:**
   - Check: `supabase.auth.getUser()`
   - Geen user → formulier blijft leeg
   - Toon guest checkout formulier standaard

2. **Optie om in te loggen:**
   - Gebruiker kan klikken op "Login & Checkout" button
   - Switchen naar login formulier
   - Na login:
     - Haal profile op uit `profiles` table (first_name, last_name, email)
     - Haal default shipping address op uit `user_addresses` table
     - Vul formulier in met deze data
     - Switch terug naar guest checkout formulier (nu met ingevulde data)
     - Toon toast: "Je gegevens zijn ingevuld!"

3. **Checkout:**
   - Gebruiker kan gegevens nog aanpassen
   - Betaalt als ingelogde gebruiker (user_id wordt opgeslagen in order)

---

### SCENARIO 2: Gebruiker IS al ingelogd

1. **Page Load:**
   - Check: `supabase.auth.getUser()`
   - User gevonden → fetch profile + default address
   - Vul formulier automatisch in
   - Toon guest checkout formulier (met ingevulde data)
   - Gebruiker kan nog steeds switchen naar login mode (maar is al ingelogd)

2. **Optie om te switchen:**
   - Gebruiker kan nog steeds klikken op "Login & Checkout" (al ingelogd)
   - Toon login formulier met melding "Je bent al ingelogd" of
   - Direct terug naar checkout met refresh van data
   - OF: Verberg login optie als al ingelogd (beter UX?)

3. **Checkout:**
   - Gebruiker kan gegevens aanpassen
   - Betaalt als ingelogde gebruiker

---

## Technische Implementatie

### State Management
```typescript
const [user, setUser] = useState<any>(null)
const [isLoggedIn, setIsLoggedIn] = useState(false)
const [checkoutMode, setCheckoutMode] = useState<'guest' | 'login'>('guest')
const [formDataLoaded, setFormDataLoaded] = useState(false)
```

### useEffect bij Page Load
```typescript
useEffect(() => {
  loadUserData()
}, [])

async function loadUserData() {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    setUser(user)
    setIsLoggedIn(true)
    await loadProfileAndAddress(user.id)
  }
}
```

### Load Profile + Address
```typescript
async function loadProfileAndAddress(userId: string) {
  // 1. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  // 2. Fetch default shipping address
  const { data: defaultAddress } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default_shipping', true)
    .single()

  // 3. Fill form
  setForm({
    email: user.email || profile?.email || '',
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    address: defaultAddress?.address || '',
    city: defaultAddress?.city || '',
    postalCode: defaultAddress?.postal_code || '',
    phone: defaultAddress?.phone || '',
    country: defaultAddress?.country || 'NL',
  })
  
  setFormDataLoaded(true)
}
```

### Login Handler (tijdens checkout)
```typescript
async function handleLogin(e: React.FormEvent) {
  e.preventDefault()
  setIsLoggingIn(true)
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    })
    
    if (error) throw error
    
    // Load profile + address
    await loadProfileAndAddress(data.user!.id)
    
    // Switch back to guest mode (with filled data)
    setCheckoutMode('guest')
    toast.success('Je gegevens zijn ingevuld!')
  } catch (error) {
    toast.error('Inloggen mislukt')
  } finally {
    setIsLoggingIn(false)
  }
}
```

---

## UI/UX Verbeteringen

### 1. Login Button State
- **Niet ingelogd**: "Login & Checkout" button (toon login formulier)
- **Wel ingelogd**: "Je bent ingelogd" badge OF verberg button (optie)

### 2. Toast Notifications
- ✅ "Je gegevens zijn ingevuld!" (na auto-load of login)
- ✅ "Welkom terug!" (na login)

### 3. Formulier States
- Loading state tijdens data ophalen
- Disabled fields tijdens loading (optioneel)
- Clear indication dat data is opgehaald

### 4. Fallbacks
- Als geen default address: alleen profile data invullen
- Als geen profile: alleen email invullen
- Gebruiker kan alles altijd aanpassen

---

## Voordelen

✅ **Auto-fill bij page load** - Gebruiker hoeft niet handmatig in te loggen  
✅ **Gebruikt user_addresses table** - Correcte data source  
✅ **Flexibel** - Gebruiker kan nog steeds switchen tussen guest/login  
✅ **Betere UX** - Minder clicks, sneller checkout  
✅ **Correcte data** - Gebruikt profiles + user_addresses tables  
✅ **Toekomstbestendig** - Werkt met opgeslagen adressen  

---

## Implementatie Checklist

- [ ] useEffect toevoegen voor auto-load bij page load
- [ ] loadProfileAndAddress functie maken
- [ ] handleLogin functie updaten (gebruikt user_addresses)
- [ ] Login button state management (toon/verberg)
- [ ] Toast notifications toevoegen
- [ ] Loading states toevoegen
- [ ] Testen: Niet ingelogd → Login → Checkout
- [ ] Testen: Al ingelogd → Page load → Auto-fill
- [ ] Testen: Al ingelogd → Login button (wat gebeurt er?)

---

## Vragen voor Beslissing

1. **Login Button als al ingelogd:**
   - Optie A: Verberg button (gebruiker is al ingelogd, button niet nodig)
   - Optie B: Toon "Je bent ingelogd" badge (informatief)
   - Optie C: Toon button maar redirect direct naar checkout (refresh data)

   **Aanbeveling: Optie A** (verberg button) - cleanest UX

2. **Default Address Fallback:**
   - Als geen default address, maar wel andere adressen:
     - Optie A: Gebruik eerste address
     - Optie B: Laat address velden leeg
   
   **Aanbeveling: Optie A** - betere UX

3. **Formulier Lock tijdens Auto-fill:**
   - Optie A: Disable fields tijdens loading (prevent edits tijdens load)
   - Optie B: Enable fields, maar data wordt overschreven
   
   **Aanbeveling: Optie B** - sneller, minder friction



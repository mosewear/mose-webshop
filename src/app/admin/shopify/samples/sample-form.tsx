'use client'
import { useEffect, useState } from 'react'
type Model={model:string;name:string;priceCents:number;variants:{localId:string;color:string;size:string}[]}
const key='mose-admin-sample-attempt-v1'
const euros=(cents:number)=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(cents/100)
export default function SampleForm(){
 const [models,setModels]=useState<Model[]>([]),[selected,setSelected]=useState<Record<string,string>>({}),[ready,setReady]=useState(false),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retrySafe,setRetrySafe]=useState(false)
 useEffect(()=>{const controller=new AbortController();fetch('/api/admin/shopify/samples',{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('De samplecollectie kon niet worden geladen.');return r.json()}).then(data=>{setModels(data.models);setReady(data.enabled);const stored=sessionStorage.getItem(key);if(stored){try{const prior=JSON.parse(stored);setSelected(Object.fromEntries(data.models.map((m:Model)=>[m.model,m.variants.find(v=>prior.variants?.includes(v.localId))?.localId||''])))}catch{setError('Een eerdere poging moet eerst worden gecontroleerd.')}}}).catch(e=>{if(!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[])
 async function checkout(){
  setBusy(true);setError('');setRetrySafe(false)
  try{
   const variants=models.map(m=>selected[m.model]);const stored=sessionStorage.getItem(key)
   let attempt:{id:string;variants:string[]}
   if(stored){attempt=JSON.parse(stored);if(JSON.stringify([...attempt.variants].sort())!==JSON.stringify([...variants].sort()))throw new Error('Je eerdere poging gebruikt andere maten. Rond die poging eerst af of laat hem controleren.')}else{attempt={id:crypto.randomUUID(),variants};sessionStorage.setItem(key,JSON.stringify(attempt))}
   const session=await fetch('/api/shopify/session',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000)});if(!session.ok)throw new Error('De veilige afrekensessie kon niet worden gestart.')
   const response=await fetch('/api/admin/shopify/samples',{method:'POST',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({attemptId:attempt.id,variants:attempt.variants,acknowledgedCosts:true})})
   const data=await response.json();if(!response.ok){setRetrySafe(data.retrySafe===true);throw new Error(data.error||'Afrekenen is nog niet beschikbaar.')}
   if(typeof data.checkoutUrl!=='string')throw new Error('Geen bevestigde afrekenlink ontvangen. Gebruik dezelfde poging.')
   window.location.assign(data.checkoutUrl)
  }catch(e){setError(e instanceof Error && ['TimeoutError','AbortError'].includes(e.name)?'Geen bevestiging ontvangen. Je poging blijft bewaard; probeer dezelfde poging opnieuw.':e instanceof Error?e.message:'Afrekenen is nog niet beschikbaar.')}finally{setBusy(false)}
 }
 return <main className="max-w-4xl mx-auto space-y-6">
  <header><h1 className="font-display text-3xl uppercase">Private samplebestelling</h1><p className="mt-2">Eén exemplaar van elk van de acht Tapstitch-modellen. Alleen voor de beheerder; de publieke collectie wordt hiermee niet vrijgegeven.</p></header>
  <section className="border-2 border-black p-5 bg-white space-y-2 text-sm"><p>De hoodie heeft een zwart DTF-logo van 6 cm; de longsleeve een zwart DTG-logo van 6 cm. Alle acht artikelen krijgen het goedgekeurde label en de hangtag.</p><p>Je betaalt zelf de MOSE-bestelling in Shopify. Verzendkosten en eventuele belastingen zie je vóór betaling. De Tapstitch-productie en verzending vragen daarna afzonderlijke, handmatige leveranciersbetaling.</p><p>De lokaal opgeslagen samplekortingscode hoort bij de leveranciersbestelling in Tapstitch. Vul deze niet in bij Shopify. Deze pagina voert geen betaling uit en keurt de fysieke kwaliteit niet alvast goed.</p></section>
  {!ready&&<p role="status" className="border border-amber-700 p-4">De private bestelroute is nog niet vrijgegeven. Je kunt de gewenste maten alvast kiezen.</p>}
  <div className="space-y-3">{models.map(m=><label key={m.model} className="block border-2 border-black bg-white p-4"><span className="font-bold">{m.name}</span><span className="float-right">{euros(m.priceCents)}</span><select aria-label={`${m.name}: kleur en maat`} className="mt-3 w-full border border-gray-500 rounded-none p-3 bg-white" value={selected[m.model]||''} onChange={e=>setSelected(s=>({...s,[m.model]:e.target.value}))} disabled={busy}><option value="">Kies kleur en maat</option>{m.variants.map(v=><option key={v.localId} value={v.localId}>{v.color} · {v.size}</option>)}</select></label>)}</div>
  {models.length===8&&<p className="text-xl font-bold">Artikelen: {euros(models.reduce((sum,m)=>sum+m.priceCents,0))}<span className="block text-sm font-normal">Verzendkosten worden in Shopify getoond.</span></p>}
  <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} disabled={busy} className="mt-1"/><span>Ik begrijp dat dit een betaalde proefbestelling is, dat Tapstitch apart betaald moet worden en dat de kortingscode alleen daar geldt.</span></label>
  {error&&<p role="alert" className="border-2 border-red-700 p-4 text-red-800">{error}</p>}
  <button className="bg-black text-white px-6 py-4 font-bold disabled:opacity-40" disabled={!ready||busy||!ack||models.length!==8||models.some(m=>!selected[m.model])} onClick={checkout}>{busy?'Winkelmand wordt veilig gecontroleerd…':'Controleer en ga naar Shopify'}</button>
  {retrySafe&&<button className="block underline" onClick={()=>{sessionStorage.removeItem(key);setRetrySafe(false);setError('De vorige poging is zonder winkelmand geweigerd. Je kunt veilig opnieuw proberen.')}}>Nieuwe poging na bevestigde weigering</button>}
  <p className="text-xs text-gray-600">Bij een onderbroken aanvraag blijft dezelfde poging bewaard. Een onbekende uitkomst wordt eerst gecontroleerd om dubbele bestellingen te voorkomen.</p>
 </main>
}

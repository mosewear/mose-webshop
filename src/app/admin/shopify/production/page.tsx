'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import ProductionStatus from '@/components/admin/ProductionStatus'
type Feed={configured:boolean;enabled:boolean;state:{state:string;last_success_at:string|null;next_run_at:string;last_error:string|null;budget_usd_micros:number;spent_usd_micros:number;reserved_usd_micros:number};orders:Array<{shopify_order_id:string;shopify_order_name:string;production_status:string;production_checked_at:string|null;production_stale:boolean;production_source_url:string|null}>}
export default function ProductionPage(){
  const[data,setData]=useState<Feed|null>(null),[error,setError]=useState('')
  useEffect(()=>{
    let stopped=false,controller:AbortController|undefined
    async function load(){
      if(document.visibilityState!=='visible')return
      controller?.abort();controller=new AbortController()
      try{const response=await fetch('/api/admin/tapstitch',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('De productieverbinding kan nu niet worden gecontroleerd.');const value=await response.json();if(!stopped){setData(value);setError('')}}
      catch(e){if(!stopped && !(e instanceof DOMException && e.name==='AbortError'))setError('De productieverbinding kan nu niet worden gecontroleerd. Getoonde gegevens zijn mogelijk verouderd.')}
    }
    void load();const timer=setInterval(load,60000);document.addEventListener('visibilitychange',load)
    return()=>{stopped=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',load)}
  },[])
  const date=(v:string|null)=>v?new Date(v).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam'}):'Nog niet uitgevoerd'
  return <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
    <Link href="/admin/orders" className="text-sm underline">← Alle bestellingen</Link>
    <h1 className="font-heading text-3xl">Tapstitch-productiecontrole</h1>
    <p className="text-sm text-gray-600">De online browser leest de echte Tapstitch-orderkop. Betaling en verzending blijven afzonderlijke bronnen. Een ontbrekende of mislukte controle verandert nooit de laatst bevestigde productiestatus.</p>
    {error&&<p role="alert" className="border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
    {!data&&!error&&<p role="status">Verbinding controleren…</p>}
    {data&&<>
      <section className="border bg-white p-5 space-y-2">
        <h2 className="font-bold">Verbinding: {!data.configured?'nog niet gekoppeld':!data.enabled?'gepauzeerd':data.state.last_error?'aandacht nodig':'actief'}</h2>
        <p>Laatste volledige controle: {date(data.state.last_success_at)}</p>
        <p>Volgende controle: {data.enabled?date(data.state.next_run_at):'Niet gepland zolang de verbinding uitstaat'}</p>
        {data.state.last_error&&<p role="alert" className="font-semibold text-amber-800">Controle niet voltooid ({data.state.last_error}). Laatste bevestigde gegevens blijven bewaard. Controleer de browserlogin, het tegoed of de koppeling.</p>}
        {data.enabled&&data.state.state==='starting'&&<p>De browser wordt gestart. Bij een onzekere start wordt dezelfde controle teruggevonden; er wordt geen tweede betaalde controle gestart.</p>}
        <p className="text-sm text-gray-600">Iedere zes uur een controle voor maximaal tien open orders, oudste controle eerst. Resultaten worden iedere vijf minuten verwerkt. Na acht uur zonder bevestiging verschijnt een waarschuwing. Dit is schermcontrole, geen officiële Tapstitch-API.</p>
        <p className="text-sm">Browserbudget: ${(Number(data.state.spent_usd_micros)/1000000).toFixed(3)} gebruikt · ${(Number(data.state.reserved_usd_micros)/1000000).toFixed(2)} gereserveerd · ${(Number(data.state.budget_usd_micros)/1000000).toFixed(2)} totaal. Geen automatische verhoging.</p>
      </section>
      <section className="space-y-3"><h2 className="font-bold">Bevestigde orderstatussen</h2>
        {!data.orders.length&&<p>Nog geen productiestatus verwerkt.</p>}
        {data.orders.map(order=><article key={order.shopify_order_id} className="border bg-white p-4"><h3 className="font-bold">{order.shopify_order_name}</h3><ProductionStatus order={order}/></article>)}
      </section>
    </>}
  </main>
}

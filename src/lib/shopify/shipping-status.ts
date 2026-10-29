/** Carrier evidence is distinct from a successful fulfillment API record or a purchased label. */
export const shipmentLabels:Record<string,string>={
 LABEL_PRINTED:'Verzendlabel aangemaakt',LABEL_PURCHASED:'Verzendlabel aangemaakt',LABEL_VOIDED:'Verzendlabel vervallen',
 CARRIER_PICKED_UP:'Opgehaald door vervoerder',PICKED_UP:'Opgehaald',IN_TRANSIT:'Onderweg',OUT_FOR_DELIVERY:'Vandaag in bezorging',
 DELIVERED:'Afgeleverd',ATTEMPTED_DELIVERY:'Bezorgpoging gedaan',DELAYED:'Vertraagd',FAILURE:'Verzendprobleem',NOT_DELIVERED:'Niet afgeleverd',
 READY_FOR_PICKUP:'Klaar om af te halen',CONFIRMED:'Zending bevestigd',FULFILLED:'Afhandeling gemeld',MARKED_AS_FULFILLED:'Afhandeling gemeld',SUBMITTED:'Zending aangemeld',CANCELED:'Zending geannuleerd',
}
export function shipmentLabel(value:string|null|undefined,en=false){
 if(!value || !shipmentLabels[value]) return en?'Shipping status not yet confirmed':'Verzendstatus nog niet bevestigd'
 return en?value.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()):shipmentLabels[value]
}

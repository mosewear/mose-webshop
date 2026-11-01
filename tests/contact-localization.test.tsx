import {render, screen, fireEvent, cleanup} from '@testing-library/react'
import {afterEach, expect, it, vi} from 'vitest'
import {NextIntlClientProvider} from 'next-intl'
import ContactPage from '@/app/[locale]/contact/page'
import nl from '../messages/nl.json'
import en from '../messages/en.json'
vi.mock('@/lib/settings',()=>({getSiteSettings:async()=>({contact_email:'info@example.com',contact_phone:'0123',contact_address:'Groningen'})}))
vi.mock('@/components/layout/PaginaKop',()=>({default:({titel}:{titel:string})=><h1>{titel}</h1>}))
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()})
function submit(locale:'en'|'nl'){
 const messages=locale==='en'?en:nl
 const view=render(<NextIntlClientProvider locale={locale} messages={messages}><ContactPage/></NextIntlClientProvider>)
 for(const [id,value] of Object.entries({name:'QA',email:'qa@example.com',subject:'product',message:'A preserved question'})) fireEvent.change(view.container.querySelector('#'+id)!,{target:{value}})
 fireEvent.submit(view.container.querySelector('form')!)
 return messages.contactPage.form
}
it.each(['nl','en'] as const)('shows localized API errors in %s without exposing server copy', async locale=>{
 const fetchMock=vi.fn().mockResolvedValue({ok:false,json:async()=>({code:'invalid_email',error:'Ongeldig email adres'})})
 vi.stubGlobal('fetch',fetchMock)
 submit(locale)
 expect(await screen.findByRole('alert')).toHaveTextContent(locale==='en'?'Enter a valid email address.':'Vul een geldig e-mailadres in.')
 expect(screen.getByRole('alert')).not.toHaveTextContent('Ongeldig email adres')
 expect(fetchMock).toHaveBeenCalledTimes(1)
})
it.each(['nl','en'] as const)('preserves the message and reports network failure, never success, in %s', async locale=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Network down')))
 vi.spyOn(console,'error').mockImplementation(()=>{})
 const form=submit(locale)
 expect(await screen.findByRole('alert')).toHaveTextContent(form.error)
 expect(screen.queryByText(form.success)).not.toBeInTheDocument()
 expect(screen.getByDisplayValue('A preserved question')).toBeInTheDocument()
})

'use client'

import { useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Message } from './ChatWindow'
import ChatAvatar from './ChatAvatar'

interface ChatMessagesProps {
  messages: Message[]
}

/**
 * Berichtenlijst.
 *
 * De vorige opmaak gaf elk bericht een wit vlak met een zwarte rand van 2px.
 * Daarmee zag een bericht er precies zo uit als een suggestieknop en als het
 * invoerveld: drie verschillende dingen in één uitstraling. Je kon niet zien
 * wat je kon aantikken en wat alleen tekst was.
 *
 * Hiërarchie komt nu uit VULLING, niet uit randen. Het gespreksvlak is grijs,
 * een antwoord van MOSE is wit, jouw bericht is zwart. Drie vlakken, geen
 * enkele zware lijn, en in één oogopslag duidelijk wie wat zei.
 */
export default function ChatMessages({ messages }: ChatMessagesProps) {
  const t = useTranslations('chat')
  const locale = useLocale()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const heeftGetypt = messages.some((m) => m.role === 'user')

  // Pas meescrollen zodra er een gesprek is. Op een klein scherm paste de
  // begroeting anders niet in beeld en sprong de weergave bij het openen
  // meteen naar beneden, zodat je op een halve zin keek.
  useEffect(() => {
    if (!heeftGetypt) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, heeftGetypt])

  // Het model schrijft platte tekst, maar een taalmodel valt soms terug op
  // markdown. De bubbel toont de tekst letterlijk, dus dan staat er
  // "**MOSE Tee**: €50" in beeld. Dit haalt alleen de opmaaktekens weg.
  const zonderMarkdown = (tekst: string) =>
    tekst.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)__(.+?)__(?=\s|$)/g, '$1$2')

  return (
    <div
      data-chat-scroll
      className="flex flex-1 flex-col overflow-y-auto overscroll-contain bg-[#EFEFEC] px-4 py-5"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {/* Zodra er gepraat wordt staat het gesprek onderaan, tegen het
          invoerveld aan, zoals in elke chat die mensen kennen. Zolang er alleen
          een begroeting staat juist bovenaan: anders zweeft die ene zin
          onderin met een leeg grijs vlak erboven. */}
      <div className={heeftGetypt ? 'mt-auto space-y-3' : 'space-y-3'}>
        {messages.map((message, index) => {
          const vanBezoeker = message.role === 'user'
          const eersteVanBlok = messages[index - 1]?.role !== message.role
          const laatsteVanBlok = messages[index + 1]?.role !== message.role

          return (
            <div key={message.id} className={eersteVanBlok && index > 0 ? 'pt-2' : undefined}>
              {eersteVanBlok && !vanBezoeker && <span className="sr-only">{t('assistant')}</span>}

              {/* Het portret staat naast het eerste bericht van een blok, net
                  als in de berichtenapps die iedereen gebruikt. Volgende
                  bubbels van hetzelfde blok springen even ver in, zodat de
                  linkerrand één doorlopende lijn blijft. Hierboven stond een
                  los tekstlabel "MOSE"; dat kostte een regel en gaf het gesprek
                  geen gezicht. */}
              <div className={`flex items-end gap-2 ${vanBezoeker ? 'justify-end' : 'justify-start'}`}>
                {!vanBezoeker &&
                  (eersteVanBlok ? (
                    <ChatAvatar maat={32} className="mb-[2px]" />
                  ) : (
                    <span aria-hidden="true" className="w-8 flex-shrink-0" />
                  ))}
                {/* Een antwoord van MOSE mag op een telefoon de volle breedte
                    pakken. Op 85% bleven er 35 tekens per regel over, en bij een
                    uitleg van zes regels over retourneren leest dat hakkerig. Wie
                    wat zei blijkt al uit de kleur, de uitlijning en het label
                    erboven, dus de smalle marge voegde niets toe. Jouw eigen
                    bericht blijft wel smaller: dat is meestal één zin, en de
                    inspringing laat zien dat het van jou komt. */}
                <div
                  className={`px-4 py-3 ${
                    vanBezoeker
                      ? 'max-w-[85%] bg-black text-white'
                      : 'max-w-[calc(100%-2.5rem)] bg-white text-black md:max-w-[80%]'
                  }`}
                >
                  {message.isTyping ? (
                    <div className="flex items-center gap-1.5 py-1" role="status" aria-label={t('assistant')}>
                      {[0, 160, 320].map((vertraging) => (
                        <span
                          key={vertraging}
                          className="h-1.5 w-1.5 rounded-full bg-black/40 motion-safe:animate-bounce"
                          style={{ animationDelay: `${vertraging}ms` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.6] md:text-[14px]">
                      {zonderMarkdown(message.content)}
                    </p>
                  )}
                </div>
              </div>

              {laatsteVanBlok && !message.isTyping && (
                <p
                  className={`mt-1.5 text-[11px] tabular-nums text-black/60 ${
                    vanBezoeker ? 'text-right' : 'pl-10'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString(locale === 'en' ? 'en-GB' : 'nl-NL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Message } from './ChatWindow'
import ChatStarters from './ChatStarters'

interface ChatMessagesProps {
  messages: Message[]
  onPickStarter: (vraag: string) => void
  isLoading?: boolean
}

/**
 * Berichtenlijst.
 *
 * De vorige opmaak gaf beide kanten een afgeronde bubbel met een zwarte rand
 * van 2px, en de assistent kreeg daarbij een vol merkgroen vlak met witte
 * tekst. Dat leverde twee problemen op. Visueel botsten ronde bubbels met de
 * rest van de shop, die overal rechte hoeken gebruikt. Inhoudelijk haalde witte
 * tekst op #00A676 maar 3,13:1 contrast, terwijl dit juist het langste stuk
 * leestekst in de hele chat is.
 *
 * Nu: de assistent is wit met zwarte tekst (21:1), de bezoeker is zwart met
 * witte tekst (21:1). Groen blijft als accent op het merkvierkantje naast het
 * antwoord. Wie heeft gesproken lees je aan de kant én aan de kleur, niet
 * alleen aan de kleur.
 */
export default function ChatMessages({ messages, onPickStarter, isLoading }: ChatMessagesProps) {
  const t = useTranslations('chat')
  const locale = useLocale()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const heeftGetypt = messages.some((m) => m.role === 'user')

  // Pas meescrollen zodra er een gesprek is. Op een iPhone SE past de begroeting
  // plus de vier suggesties niet in één scherm, en dan sprong de weergave bij het
  // openen meteen naar beneden: het eerste wat je zag was een halve zin. Zolang
  // er nog niets gevraagd is, blijft de lijst dus bovenaan staan.
  useEffect(() => {
    if (!heeftGetypt) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, heeftGetypt])

  // Het model is gevraagd platte tekst te schrijven, maar een taalmodel valt
  // soms terug op markdown. De bubbel toont de tekst letterlijk, dus dan staat
  // er "**MOSE Tee**: €50" in beeld. Dit haalt alleen de opmaaktekens weg; de
  // tekst zelf blijft ongemoeid.
  const zonderMarkdown = (tekst: string) =>
    tekst.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)__(.+?)__(?=\s|$)/g, '$1$2')

  return (
    <div
      data-chat-scroll
      className="flex flex-1 flex-col overflow-y-auto overscroll-contain bg-gray-50 p-4"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {/* `mt-auto` duwt een kort gesprek naar de onderkant, tegen het
          invoerveld aan. Zonder dit plakte de begroeting bovenaan met op een
          telefoon ruim duizend lege pixels eronder, en groeide het gesprek van
          boven naar beneden het lege vlak in. Elke chat die mensen kennen werkt
          andersom. */}
      <div className="mt-auto space-y-4">
      {messages.map((message, index) => {
        const vanBezoeker = message.role === 'user'
        // Tijdstip alleen onder het laatste bericht van een blok. Een stempel
        // onder elke regel maakte van een gesprek van vier zinnen een lijst met
        // acht tijden, allemaal hetzelfde.
        const toontTijd = messages[index + 1]?.role !== message.role

        return (
          <div key={message.id} className={`flex gap-2 ${vanBezoeker ? 'justify-end' : 'justify-start'}`}>
            {!vanBezoeker && (
              <div
                className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-black bg-brand-primary font-display text-sm leading-none text-white"
                aria-hidden="true"
              >
                M
              </div>
            )}

            <div className={`flex min-w-0 flex-col ${vanBezoeker ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-full border-2 border-black px-3.5 py-2.5 ${
                  vanBezoeker ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                {message.isTyping ? (
                  <div className="flex items-center gap-1.5 py-1" role="status" aria-label={t('assistant')}>
                    {[0, 160, 320].map((vertraging) => (
                      <span
                        key={vertraging}
                        className="h-2 w-2 bg-black motion-safe:animate-bounce"
                        style={{ animationDelay: `${vertraging}ms` }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {zonderMarkdown(message.content)}
                  </p>
                )}
              </div>

              {toontTijd && !message.isTyping && (
                <p className="mt-1 px-0.5 text-[11px] tabular-nums text-gray-500">
                  {message.timestamp.toLocaleTimeString(locale === 'en' ? 'en-GB' : 'nl-NL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        )
      })}

        {!heeftGetypt && <ChatStarters onPick={onPickStarter} disabled={isLoading} />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

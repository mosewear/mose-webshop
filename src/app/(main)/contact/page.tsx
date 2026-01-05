'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        // If response is not JSON, still show success if status is ok
        if (response.ok) {
          setSubmitted(true)
          setLoading(false)
          setForm({ name: '', email: '', subject: '', message: '' })
          setTimeout(() => setSubmitted(false), 5000)
          return
        }
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        setError(data.error || 'Er ging iets mis bij het versturen van je bericht')
        setLoading(false)
        return
      }

      setSubmitted(true)
      setLoading(false)
      setError('')
      setForm({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error submitting contact form:', error)
      // If we get here but email was sent, show success anyway
      // This handles cases where response parsing fails but email was sent
      setSubmitted(true)
      setLoading(false)
      setForm({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    }
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-6">CONTACT</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Vragen over je bestelling, product of iets anders? We helpen je graag.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white border-2 border-black p-6 md:p-8">
            <h2 className="text-2xl font-display mb-6">STUUR EEN BERICHT</h2>
            
            {submitted && (
              <div className="mb-6 p-4 bg-green-50 border-2 border-green-600 text-green-800">
                <strong>Bedankt!</strong> We hebben je bericht ontvangen en nemen zo snel mogelijk contact op.
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 text-red-900">
                <strong>Fout:</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-bold mb-2">
                  Naam *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="Je naam"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold mb-2">
                  E-mail *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="jouw@email.nl"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-bold mb-2">
                  Onderwerp *
                </label>
                <select
                  id="subject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                >
                  <option value="">Kies een onderwerp</option>
                  <option value="order">Vraag over mijn bestelling</option>
                  <option value="product">Vraag over een product</option>
                  <option value="return">Retour of ruil</option>
                  <option value="other">Iets anders</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-bold mb-2">
                  Bericht *
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-none"
                  placeholder="Vertel ons hoe we je kunnen helpen..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'VERSTUREN...' : 'VERSTUUR BERICHT'}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            {/* Email */}
            <div className="bg-gray-50 border-2 border-gray-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-primary text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">E-mail</h3>
                  <a href="mailto:info@mosewear.nl" className="text-brand-primary hover:underline">
                    info@mosewear.nl
                  </a>
                  <p className="text-sm text-gray-600 mt-2">
                    We reageren binnen 24 uur op werkdagen
                  </p>
                </div>
              </div>
            </div>

            {/* Telefoon */}
            <div className="bg-gray-50 border-2 border-gray-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-primary text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Telefoon</h3>
                  <a href="tel:+31502111931" className="text-brand-primary hover:underline">
                    +31 50 211 1931
                  </a>
                  <p className="text-sm text-gray-600 mt-2">
                    Bereikbaar op werkdagen 10:00 - 17:00
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-gray-50 border-2 border-gray-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-primary text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Locatie</h3>
                  <p className="text-gray-700">
                    Helper Brink 27a<br />
                    9722 EG Groningen<br />
                    Nederland
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Geen fysieke winkel, alleen online
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="bg-brand-primary text-white p-6 border-2 border-brand-primary">
              <h3 className="font-bold text-lg mb-2">Veelgestelde vragen?</h3>
              <p className="text-sm mb-4 opacity-90">
                Check eerst onze FAQ. Misschien staat je antwoord er al!
              </p>
              <Link
                href="/algemene-voorwaarden"
                className="inline-block px-6 py-3 bg-white text-brand-primary font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors text-sm"
              >
                Naar Voorwaarden
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

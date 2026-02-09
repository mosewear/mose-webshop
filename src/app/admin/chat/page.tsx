'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MessageCircle, Calendar, Globe, Monitor, Smartphone } from 'lucide-react'
import Link from 'next/link'

interface ChatConversation {
  id: string
  session_id: string
  page_url: string | null
  device_type: string | null
  locale: string
  started_at: string
  last_message_at: string
  message_count: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  metadata: any
}

export default function ChatAdminPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching conversations:', error)
      } else {
        setConversations(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chat gesprekken laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-100 transition-colors border-2 border-gray-300"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold flex items-center gap-2 md:gap-3">
                <MessageCircle className="w-6 h-6 md:w-8 md:h-8 text-brand-primary" />
                Chat Gesprekken
              </h1>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Bekijk alle chat gesprekken met klanten</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-gray-200 p-4">
              <h2 className="text-lg font-bold mb-4">Gesprekken ({conversations.length})</h2>
              <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                {conversations.length > 0 ? (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full text-left p-3 border-2 transition-colors ${
                        selectedConversation === conv.id
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono text-gray-500 truncate">
                            {conv.session_id.slice(0, 20)}...
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {new Date(conv.last_message_at).toLocaleString('nl-NL')}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-brand-primary">
                          {conv.message_count}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {conv.device_type === 'mobile' ? (
                          <Smartphone className="w-3 h-3" />
                        ) : (
                          <Monitor className="w-3 h-3" />
                        )}
                        <span className="truncate">{conv.page_url || 'Onbekend'}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Nog geen chat gesprekken
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Messages View */}
          <div className="lg:col-span-2">
            {selectedConversation && selectedConv ? (
              <div className="bg-white border-2 border-gray-200 p-6">
                <div className="mb-6 pb-4 border-b-2 border-gray-200">
                  <h2 className="text-xl font-bold mb-2">Gesprek Details</h2>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 mb-1">Session ID:</div>
                      <div className="font-mono text-xs">{selectedConv.session_id}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Gestart:</div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedConv.started_at).toLocaleString('nl-NL')}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Pagina:</div>
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        <a
                          href={selectedConv.page_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-primary hover:underline truncate"
                        >
                          {selectedConv.page_url || 'Onbekend'}
                        </a>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Device:</div>
                      <div className="flex items-center gap-1">
                        {selectedConv.device_type === 'mobile' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                        {selectedConv.device_type || 'Onbekend'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Taal:</div>
                      <div>{selectedConv.locale.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Aantal berichten:</div>
                      <div className="font-bold">{selectedConv.message_count}</div>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-4">Berichten</h3>
                {messagesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Berichten laden...</p>
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 border-2 ${
                          msg.role === 'user'
                            ? 'bg-gray-50 border-gray-300 ml-8'
                            : 'bg-brand-primary/10 border-brand-primary mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-sm">
                            {msg.role === 'user' ? '👤 Klant' : '🤖 AI Assistent'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleString('nl-NL')}
                          </div>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Geen berichten in dit gesprek
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white border-2 border-gray-200 p-12 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Selecteer een gesprek om berichten te bekijken</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


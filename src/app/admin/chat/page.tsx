'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MessageCircle, Calendar, Globe, Monitor, Smartphone } from 'lucide-react'
import Link from 'next/link'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
  conversation_id: string
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
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelsRef = useRef<RealtimeChannel[]>([])

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch initial conversations
  useEffect(() => {
    fetchConversations()
  }, [])

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  // Setup Realtime subscriptions
  useEffect(() => {
    let messagesChannel: RealtimeChannel | null = null
    let conversationsChannel: RealtimeChannel | null = null

    // Subscribe to new messages
    messagesChannel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          
          // If this message belongs to the currently selected conversation, add it
          if (selectedConversation && newMessage.conversation_id === selectedConversation) {
            setMessages((prev) => {
              // Check if message already exists (avoid duplicates)
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Messages channel status:', status)
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected')
        }
      })

    // Subscribe to new conversations and updates
    conversationsChannel = supabase
      .channel('chat_conversations_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_conversations',
        },
        (payload) => {
          const newConversation = payload.new as ChatConversation
          setConversations((prev) => {
            // Check if conversation already exists (avoid duplicates)
            if (prev.some((c) => c.id === newConversation.id)) {
              return prev
            }
            // Add new conversation at the top
            return [newConversation, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
        },
        (payload) => {
          const updatedConversation = payload.new as ChatConversation
          setConversations((prev) => {
            // Update existing conversation
            const index = prev.findIndex((c) => c.id === updatedConversation.id)
            if (index !== -1) {
              const updated = [...prev]
              updated[index] = updatedConversation
              // Move updated conversation to top (most recent)
              const [moved] = updated.splice(index, 1)
              return [moved, ...updated]
            }
            return prev
          })
          
          // If this is the selected conversation, refresh messages to get latest count
          if (selectedConversation === updatedConversation.id) {
            // Only refresh if we're not currently loading
            if (!messagesLoading) {
              fetchMessages(updatedConversation.id)
            }
          }
        }
      )
      .subscribe()

    channelsRef.current = [messagesChannel, conversationsChannel]

    // Cleanup subscriptions on unmount or when dependencies change
    return () => {
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel)
      }
      if (conversationsChannel) {
        supabase.removeChannel(conversationsChannel)
      }
      channelsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/chat/conversations')
      const data = await response.json()
      
      if (!response.ok) {
        console.error('API Error:', data)
        alert(`Fout bij ophalen gesprekken: ${data.error || 'Onbekende fout'}`)
        return
      }
      
      setConversations(data.conversations || [])
      console.log('✅ Conversations loaded:', data.conversations?.length || 0)
    } catch (error: any) {
      console.error('Error fetching conversations:', error)
      alert(`Fout bij ophalen gesprekken: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true)
    try {
      const response = await fetch(`/api/admin/chat/messages?conversation_id=${conversationId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }
      const { messages } = await response.json()
      setMessages(messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  // Realtime subscription setup - separate effect to avoid dependency issues
  useEffect(() => {
    let messagesChannel: RealtimeChannel | null = null
    let conversationsChannel: RealtimeChannel | null = null

    // Subscribe to new messages
    messagesChannel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          
          // If this message belongs to the currently selected conversation, add it
          if (selectedConversation && newMessage.conversation_id === selectedConversation) {
            setMessages((prev) => {
              // Check if message already exists (avoid duplicates)
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected')
        }
      })

    // Subscribe to new conversations and updates
    conversationsChannel = supabase
      .channel('chat_conversations_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_conversations',
        },
        (payload) => {
          const newConversation = payload.new as ChatConversation
          setConversations((prev) => {
            // Check if conversation already exists (avoid duplicates)
            if (prev.some((c) => c.id === newConversation.id)) {
              return prev
            }
            // Add new conversation at the top
            return [newConversation, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
        },
        (payload) => {
          const updatedConversation = payload.new as ChatConversation
          setConversations((prev) => {
            // Update existing conversation
            const index = prev.findIndex((c) => c.id === updatedConversation.id)
            if (index !== -1) {
              const updated = [...prev]
              updated[index] = updatedConversation
              // Move updated conversation to top (most recent)
              const [moved] = updated.splice(index, 1)
              return [moved, ...updated]
            }
            return prev
          })
          
          // If this is the selected conversation, refresh messages to get latest count
          if (selectedConversation === updatedConversation.id) {
            // Only refresh if we're not currently loading
            if (!messagesLoading) {
              fetchMessages(updatedConversation.id)
            }
          }
        }
      )
      .subscribe()

    channelsRef.current = [messagesChannel, conversationsChannel]

    // Cleanup subscriptions on unmount or when dependencies change
    return () => {
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel)
      }
      if (conversationsChannel) {
        supabase.removeChannel(conversationsChannel)
      }
      channelsRef.current = []
    }
  }, [selectedConversation, supabase])

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
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold flex items-center gap-2 md:gap-3">
                <MessageCircle className="w-6 h-6 md:w-8 md:h-8 text-brand-primary" />
                Chat Gesprekken
              </h1>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Bekijk alle chat gesprekken met klanten</p>
            </div>
            {/* Realtime Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-600 hidden md:inline">
                {realtimeStatus === 'connected' ? 'Live' : 'Offline'}
              </span>
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
                    {/* Scroll anchor for auto-scroll */}
                    <div ref={messagesEndRef} />
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


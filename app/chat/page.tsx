'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShipmentDrawer } from "@/components/ShipmentDrawer"
import { Bot, Send, User, ArrowLeft, Loader2, Plus, MessageSquare, Trash2, Clock, Ship } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface ChatSession {
  id: string
  title: string
  updated_at: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql_query?: string | null
}

export default function ChatPage() {
  const [chats, setChats] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [useLocalStorage, setUseLocalStorage] = useState(false)
  
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [lastJobNumber, setLastJobNumber] = useState<string | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load chats on mount
  useEffect(() => {
    loadChats()
  }, [])

  // Load messages when chat changes
  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId)
    } else {
      setMessages([])
    }
  }, [currentChatId])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const loadChats = async () => {
    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (error) {
        console.log('Supabase error, using local storage:', error.message)
        setUseLocalStorage(true)
        loadFromLocalStorage()
        return
      }
      
      if (data) {
        setChats(data)
      }
    } catch (e) {
      console.log('Using local storage mode')
      setUseLocalStorage(true)
      loadFromLocalStorage()
    }
  }

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('chat_sessions')
    if (saved) {
      setChats(JSON.parse(saved))
    }
  }

  const saveToLocalStorage = (sessions: ChatSession[]) => {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions))
  }

  const loadMessages = async (chatId: string) => {
    if (useLocalStorage) {
      const saved = localStorage.getItem(`chat_messages_${chatId}`)
      if (saved) {
        setMessages(JSON.parse(saved))
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
      
      if (data && !error) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sql_query: m.sql_query
        })))
      }
    } catch (e) {
      console.log('Error loading messages')
    }
  }

  const saveMessagesToLocal = (chatId: string, msgs: ChatMessage[]) => {
    localStorage.setItem(`chat_messages_${chatId}`, JSON.stringify(msgs))
  }

  const createNewChat = async () => {
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Analysis',
      updated_at: new Date().toISOString()
    }

    if (!useLocalStorage) {
      try {
        const { data, error } = await supabase
          .from('chats')
          .insert({ title: 'New Analysis', user_id: null })
          .select()
          .single()
        
        if (data && !error) {
          newChat.id = data.id
        } else {
          setUseLocalStorage(true)
        }
      } catch (e) {
        setUseLocalStorage(true)
      }
    }

    setChats(prev => {
      const updated = [newChat, ...prev]
      if (useLocalStorage) saveToLocalStorage(updated)
      return updated
    })
    setCurrentChatId(newChat.id)
    setMessages([])
    inputRef.current?.focus()
  }

  const deleteChat = async (chatId: string) => {
    if (!useLocalStorage) {
      await supabase.from('chats').delete().eq('id', chatId)
    }
    
    setChats(prev => {
      const updated = prev.filter(c => c.id !== chatId)
      if (useLocalStorage) saveToLocalStorage(updated)
      return updated
    })
    
    if (useLocalStorage) {
      localStorage.removeItem(`chat_messages_${chatId}`)
    }
    
    if (currentChatId === chatId) {
      setCurrentChatId(null)
      setMessages([])
    }
  }

  const updateChatTitle = async (chatId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
    
    if (!useLocalStorage) {
      await supabase
        .from('chats')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', chatId)
    }
    
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, title, updated_at: new Date().toISOString() } : c)
      if (useLocalStorage) saveToLocalStorage(updated)
      return updated
    })
  }

  const openDrawerForJob = (jobNo: string) => {
    const record = {
      JOBNO: jobNo,
      POL: '?',
      POD: '?',
      CONT_GRWT: 0,
      CONT_TEU: 0,
      CONT_CBM: 0,
      CONT_UTILIZATION: 0,
      SHPTSTATUS: 'Unknown',
      CONNAME: 'Unknown',
      _mode: 'Unknown'
    }
    setSelectedRecord(record)
    setDrawerOpen(true)
  }

  const handleSend = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    // Try to detect a job number in the user question and open the drawer
    const jobMatch = trimmedInput.match(/\b\d{6,}\b/)
    if (jobMatch) {
      setLastJobNumber(jobMatch[0])
      openDrawerForJob(jobMatch[0])
    }

    let chatId = currentChatId

    // Create new chat if none selected
    if (!chatId) {
      const newChat: ChatSession = {
        id: crypto.randomUUID(),
        title: trimmedInput.slice(0, 50),
        updated_at: new Date().toISOString()
      }

      if (!useLocalStorage) {
        try {
          const { data, error } = await supabase
            .from('chats')
            .insert({ title: trimmedInput.slice(0, 50), user_id: null })
            .select()
            .single()
          
          if (data && !error) {
            newChat.id = data.id
          } else {
            setUseLocalStorage(true)
          }
        } catch (e) {
          setUseLocalStorage(true)
        }
      }

      chatId = newChat.id
      setChats(prev => {
        const updated = [newChat, ...prev]
        if (useLocalStorage) saveToLocalStorage(updated)
        return updated
      })
      setCurrentChatId(chatId)
    }

    // Create user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput
    }

    // Update local state immediately
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    // Save user message
    if (!useLocalStorage) {
      try {
        await supabase.from('messages').insert({
          chat_id: chatId,
          role: 'user',
          content: trimmedInput
        })
      } catch (e) {
        setUseLocalStorage(true)
      }
    }
    
    if (useLocalStorage) {
      saveMessagesToLocal(chatId, newMessages)
    }

    // Update chat title if first message
    if (messages.length === 0) {
      updateChatTitle(chatId, trimmedInput)
    }

    try {
      // Build message history for API
      const historyForApi = newMessages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi })
      })

      const data = await res.json()

      // Create assistant message
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer || 'Sorry, I could not process that request.',
        sql_query: data.sql_query || null
      }

      const finalMessages = [...newMessages, assistantMsg]
      setMessages(finalMessages)

      // Save assistant message
      if (!useLocalStorage) {
        try {
          await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'assistant',
            content: assistantMsg.content,
            sql_query: assistantMsg.sql_query
          })
          await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId)
        } catch (e) {
          setUseLocalStorage(true)
        }
      }
      
      if (useLocalStorage) {
        saveMessagesToLocal(chatId, finalMessages)
      }

    } catch (e) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I encountered a connection error. Please try again."
      }
      const finalMessages = [...newMessages, errorMsg]
      setMessages(finalMessages)
      if (useLocalStorage) {
        saveMessagesToLocal(chatId, finalMessages)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleSend()
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-sm",
        isSidebarCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-72"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Ship className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">LogisticsAI</span>
          </div>
          <Button
            onClick={createNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Chat History */}
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-1">
            {chats.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No conversations yet
              </div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setCurrentChatId(chat.id)}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                    currentChatId === chat.id
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{chat.title || 'New Chat'}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(chat.updated_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200">
          <Link href="/">
            <Button variant="ghost" className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-2 justify-start">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-600"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">Logistics AI Analyst</h1>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Connected to Database
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2" />
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {/* Welcome message if no chat selected */}
            {!currentChatId && messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
                  <Bot className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Logistics AI Analyst</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                  I have access to all 8,000+ shipments in your database. Ask me about volumes, 
                  performance, utilization, or specific jobs.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
                  {[
                    "What's our total Sea volume in 2024?",
                    "Show me utilization by mode",
                    "Which carriers handle the most TEU?",
                    "Compare Air vs Sea performance"
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="text-left px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                  msg.role === 'user'
                    ? "bg-slate-200"
                    : "bg-blue-600"
                )}>
                  {msg.role === 'user'
                    ? <User className="w-5 h-5 text-slate-600" />
                    : <Bot className="w-5 h-5 text-white" />
                  }
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm",
                  msg.role === 'user'
                    ? "bg-blue-600 text-white rounded-tr-md"
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-md"
                )}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === 'assistant' && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!lastJobNumber}
                        onClick={() => openDrawerForJob(lastJobNumber || 'Unknown')}
                      >
                        Open shipment drawer
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-3 text-slate-500 text-sm shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing shipment data...
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form 
            className="max-w-4xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                placeholder="Ask about utilization, volumes, carriers, or specific jobs..."
                className="flex-1 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                className="h-12 w-12 bg-blue-600 hover:bg-blue-700 shadow-md"
                disabled={isLoading || !input.trim()}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
              Press Enter to send. AI can make mistakes - verify important data.
            </p>
          </form>
        </div>
      </main>

      {/* Shipment Detail Drawer */}
      <ShipmentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        record={selectedRecord}
      />
    </div>
  )
}

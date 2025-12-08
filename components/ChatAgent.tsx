'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, X, Loader2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export function ChatAgent() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { 
      role: 'bot', 
      text: 'Hello! I\'m your Logistics AI Analyst. I can help you analyze shipments, carriers, routes, volumes, and more.\n\nTry asking:\n• "How many Sea shipments do we have?"\n• "What are the top 3 carriers by weight?"\n• "Show me shipments from Mumbai to Antwerp"\n• "What\'s the average transit time?"\n\nWhat would you like to know?' 
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg })
      })
      
      const data = await res.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setMessages(prev => [...prev, { role: 'bot', text: data.answer || "I couldn't generate an answer. Please try rephrasing your question." }])
    } catch (e: any) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: `Sorry, I couldn't analyze that right now. ${e.message ? `Error: ${e.message}` : 'Please try again.'}` 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* CHAT WINDOW */}
      {isOpen && (
        <Card className="w-[350px] md:w-[400px] h-[500px] shadow-2xl border-slate-200 flex flex-col animate-in slide-in-from-bottom-5">
          <CardHeader className="bg-slate-900 text-white rounded-t-lg py-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <CardTitle className="text-sm font-medium">Logistics AI Analyst</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-slate-300 hover:text-white hover:bg-slate-800" 
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50">
            <ScrollArea className="h-full p-4">
              <div className="flex flex-col gap-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] px-3 py-2 rounded-lg text-sm",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white" 
                        : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-xs text-slate-500">Analyzing database...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="p-3 bg-white border-t">
            <form 
              className="flex w-full gap-2"
              onSubmit={(e) => { 
                e.preventDefault()
                handleSend()
              }}
            >
              <Input 
                placeholder="Ask about shipments..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      {/* FLOATING BUTTON */}
      {!isOpen && (
        <Button 
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-transform hover:scale-105"
        >
          <MessageSquare className="w-7 h-7" />
        </Button>
      )}
    </div>
  )
}


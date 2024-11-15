'use client'

import { useState, useEffect, useRef } from "react"
import { db, auth } from "@/lib/firebase"
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  getDocs,
  where,
  setDoc,
} from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, Send, Plus, LogIn, Smile, LogOut, Moon, Sun } from 'lucide-react'
import EmojiPicker, { Theme } from "emoji-picker-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ChatProps {
  user: any
}

interface Message {
  id: string
  text: string
  sender: string
  timestamp: Date
  read?: boolean
  translatedText?: string
}

const containsOnlyEmojis = (text: string) => {
  // This regex pattern covers most emoji cases
  const emojiRegex = /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])+$/
  return emojiRegex.test(text)
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [inRoom, setInRoom] = useState(false)
  const [userLanguage, setUserLanguage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  useEffect(() => {
    fetchUserLanguage(user.uid)
  }, [user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (inRoom && user && userLanguage) {
      const q = query(
        collection(db, `rooms/${roomCode}/messages`),
        orderBy("timestamp")
      )
      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const newMessages = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data()
              if (
                data.sender !== user.email &&
                !containsOnlyEmojis(data.text)
              ) {
                const translatedText = await translateMessage(
                  data.text,
                  userLanguage
                )
                return { id: doc.id, ...data, translatedText }
              }
              return { id: doc.id, ...data }
            })
          )
          setMessages(newMessages)
        },
        (error) => {
          console.error("Error in message listener:", error)
          setError(
            "Failed to receive messages. Please check your internet connection."
          )
        }
      )

      return () => {
        unsubscribe()
      }
    }
  }, [inRoom, roomCode, user, userLanguage])

  useEffect(() => {
    if (newMessage) {
      setIsTyping(true)
      const timeout = setTimeout(() => setIsTyping(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [newMessage])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark")
    setIsDark(!isDark)
  }

  const fetchUserLanguage = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid))
      if (userDoc.exists()) {
        const language = userDoc.data().language
        setUserLanguage(language)
      } else {
        console.log("User document not found")
      }
    } catch (error) {
      console.error("Error fetching user language:", error)
      setError("Failed to fetch user language. Please try again.")
    }
  }

  const translateMessage = async (text: string, targetLanguage: string) => {
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage }),
      })
      const data = await response.json()
      return data.translatedText
    } catch (error) {
      console.error("Translation error:", error)
      return text // Return original text if translation fails
    }
  }

  const joinRoom = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (roomCode) {
        const roomQuery = query(
          collection(db, "rooms"),
          where("code", "==", roomCode)
        )
        const roomSnapshot = await getDocs(roomQuery)
        if (!roomSnapshot.empty) {
          setInRoom(true)
        } else {
          setError("Room not found. Please check the room code.")
        }
      }
    } catch (error) {
      setError(
        "An error occurred while joining the room. Please check your internet connection and try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const createRoom = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const newRoomCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()
      await setDoc(doc(db, "rooms", newRoomCode), {
        code: newRoomCode,
        createdBy: user.uid,
        createdAt: new Date(),
      })
      setRoomCode(newRoomCode)
      setInRoom(true)
    } catch (error) {
      setError(
        "An error occurred while creating the room. Please check your internet connection and try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newMessage.trim() && inRoom) {
      try {
        await addDoc(collection(db, `rooms/${roomCode}/messages`), {
          text: newMessage,
          sender: user.email,
          timestamp: new Date(),
          read: false,
        })
        setNewMessage("")
      } catch (error) {
        setError(
          "Failed to send message. Please check your internet connection."
        )
      }
    }
  }

  const leaveRoom = () => {
    setInRoom(false)
    setRoomCode("")
    setMessages([])
  }

  const handleEmojiClick = (emojiObject: any) => {
    setNewMessage((prevMessage) => prevMessage + emojiObject.emoji)
  }

  if (!inRoom) {
    return (
      <div className="min-h-screen w-full max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Join or Create a Chat Room</CardTitle>
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="Enter Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={joinRoom}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Join Room
              </Button>
              <Button
                onClick={createRoom}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Room
              </Button>
            </div>
          </CardContent>
          {error && (
            <CardFooter>
              <p className="text-red-500 text-sm">{error}</p>
            </CardFooter>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Card className="flex flex-col h-full">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Chat Room</CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm font-normal">Room Code: {roomCode}</span>
              <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === user.email ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.sender === user.email
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-xs opacity-70 mb-1">{msg.sender}</p>
                  <p className="break-words">
                    {msg.sender !== user.email
                      ? msg.translatedText || msg.text
                      : msg.text}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        <CardFooter className="border-t p-4">
          <form onSubmit={sendMessage} className="flex w-full gap-2">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={isDark ? Theme.DARK : Theme.LIGHT}
                />
              </PopoverContent>
            </Popover>
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
        <CardFooter className="pt-0 px-4 pb-4">
          <Button onClick={leaveRoom} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Leave Room
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

"use client";

import { useState, useEffect } from "react";
import { db, auth } from "../../lib/firebase";
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
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Send,
  Plus,
  LogIn,
  Smile,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatProps {
  user: any;
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [userLanguage, setUserLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };
  useEffect(() => {
    fetchUserLanguage(user.uid);
  }, [user]);

  const fetchUserLanguage = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const language = userDoc.data().language;
        console.log("User language:", language);
        setUserLanguage(language);
      } else {
        console.log("User document not found");
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setError("Failed to fetch user language. Please try again.");
    }
  };

  useEffect(() => {
    if (inRoom && user && userLanguage) {
      const q = query(
        collection(db, `rooms/${roomCode}/messages`),
        orderBy("timestamp")
      );
      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const newMessages = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              if (data.sender !== user.email) {
                const translatedText = await translateMessage(
                  data.text,
                  userLanguage
                );
                return { id: doc.id, ...data, translatedText };
              }
              return { id: doc.id, ...data };
            })
          );
          setMessages(newMessages);
        },
        (error) => {
          console.error("Error in message listener:", error);
          setError(
            "Failed to receive messages. Please check your internet connection."
          );
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [inRoom, roomCode, user, userLanguage]);

  const translateMessage = async (text: string, targetLanguage: string) => {
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage }),
      });
      const data = await response.json();
      return data.translatedText;
    } catch (error) {
      console.error("Translation error:", error);
      return text; // Return original text if translation fails
    }
  };

  const joinRoom = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (roomCode) {
        const roomQuery = query(
          collection(db, "rooms"),
          where("code", "==", roomCode)
        );
        const roomSnapshot = await getDocs(roomQuery);
        if (!roomSnapshot.empty) {
          setInRoom(true);
        } else {
          setError("Room not found. Please check the room code.");
        }
      }
    } catch (error) {
      setError(
        "An error occurred while joining the room. Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newRoomCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      await setDoc(doc(db, "rooms", newRoomCode), {
        code: newRoomCode,
        createdBy: user.uid,
        createdAt: new Date(),
      });
      setRoomCode(newRoomCode);
      setInRoom(true);
    } catch (error) {
      setError(
        "An error occurred while creating the room. Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newMessage.trim() && inRoom) {
      try {
        const docRef = await addDoc(
          collection(db, `rooms/${roomCode}/messages`),
          {
            text: newMessage,
            sender: user.email,
            timestamp: new Date(),
          }
        );
        setNewMessage("");
      } catch (error) {
        setError(
          "Failed to send message. Please check your internet connection and try again."
        );
      }
    }
  };

  const leaveRoom = () => {
    setInRoom(false);
    setRoomCode("");
    setMessages([]);
  };

  const handleEmojiClick = (emojiObject: any) => {
    setNewMessage((prevMessage) => prevMessage + emojiObject.emoji);
  };
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
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col p-4">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Chat Room</CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-sm font-normal">
                  Room Code: {roomCode}
                </span>
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
          <ScrollArea className="flex-1 p-4">
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
            </div>
          </ScrollArea>
          <CardFooter className="border-t p-4 gap-4 flex-col">
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
            <Button onClick={leaveRoom} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Leave Room
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
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
import { Loader2, Send, Plus, LogIn, Smile, LogOut } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatProps {
  user: any;
}

export function ChatComponent({ user }: ChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [userLanguage, setUserLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Join or Create a Chat Room</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="Enter Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <div className="flex space-x-2">
            <Button onClick={joinRoom} disabled={isLoading} className="flex-1">
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
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Chat Room</span>
          <span className="text-sm font-normal">Room Code: {roomCode}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full pr-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-4 ${
                msg.sender === user.email ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block p-2 rounded-lg ${
                  msg.sender === user.email
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <p className="font-semibold text-sm">{msg.sender}</p>
                <p>
                  {msg.sender !== user.email
                    ? msg.translatedText || msg.text
                    : msg.text}
                </p>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex-col space-y-4">
        <form onSubmit={sendMessage} className="flex w-full space-x-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow"
          />
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </PopoverContent>
          </Popover>
          <Button type="submit">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <Button onClick={leaveRoom} variant="outline" className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Leave Room
        </Button>
      </CardFooter>
      {error && (
        <CardFooter>
          <p className="text-red-500 text-sm">{error}</p>
        </CardFooter>
      )}
    </Card>
  );
}

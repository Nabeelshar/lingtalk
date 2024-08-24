// components/Chat.tsx
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
import { onAuthStateChanged } from "firebase/auth";

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

  if (!inRoom) {
    return (
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Enter Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <Button onClick={joinRoom} disabled={isLoading}>
          {isLoading ? "Joining..." : "Join Room"}
        </Button>
        <Button onClick={createRoom} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create New Room"}
        </Button>
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 h-64 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <strong>{msg.sender}:</strong>{" "}
            {msg.sender !== user.email
              ? msg.translatedText || msg.text
              : msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="flex">
        <Input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow mr-2"
        />
        <Button type="submit">Send</Button>
      </form>
      <div>Room Code: {roomCode}</div>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}

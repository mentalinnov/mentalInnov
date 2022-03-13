import React, { useState, useEffect, useRef } from "react";
import { Button } from "react-bootstrap"
import { connect } from "react-redux";
import { userMessage, sendMessage } from "../../actions/watson";
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc
} from "firebase/firestore";

const Chat = ({ chat, userMessage, sendMessage }) => {
  // Handle Users Message
  const [message, setMessage] = useState("");
  const endOfMessages = useRef(null);
  const { currentUser } = useAuth();
  let id = '';
  let chatHistory = '';
  let lastMessage = '';

  // const scrollToBottom = () => {
  //   endOfMessages.current.scrollIntoView({ behavior: "smooth" });
  //   console.log("user: ", currentUser.email)
  //   console.log("last chat: ", chat[chat.length - 1])
  // };
  // useEffect(scrollToBottom, [chat]);

  //  Function that handles user submission
  const handleClick = async (e, chat) => {
    const code = e.keyCode || e.which;    
    if (code === 13) {
      userMessage(message);
      sendMessage(message);
      setMessage("");
    }
  };

  useEffect(() => {
    const saveChatToDB = async () => {
      const snapshot = await db.collection('accounts').where('email', '==', currentUser.email).get()
      snapshot.forEach(doc => {
        id = doc.id
        chatHistory = doc.data().chatHistory
      });
      const userDoc = doc(db, "accounts", id);
      if (chat[chat.length - 1]){
        const newFields = { chatHistory: 
                            chatHistory + "\n"
                            + chat[chat.length - 1].type + ": " + chat[chat.length - 1].message};
        await updateDoc(userDoc, newFields);
      }
    };

    const scrollToBottom = () => {
      endOfMessages.current.scrollIntoView({ behavior: "smooth" });
    };

    saveChatToDB();
    scrollToBottom();
  }, [chat]);

  return (
    <div className="chat">
      <h1>Mental health chatbot</h1>

      <div class="historyContainer">
        {chat.length === 0
          ? ""
          : chat.map((msg) => <div className={msg.type}>{msg.message}</div>)}
        <div ref={endOfMessages}></div>

      </div>

      <input
        id="chatBox"
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleClick}
        value={message}
        placeholder="Please type your message here...">
      </input>      
    </div>
  );
};
const mapStateToProps = (state) => ({
  chat: state.watson.messages,
});

export default connect(mapStateToProps, { userMessage, sendMessage })(Chat);

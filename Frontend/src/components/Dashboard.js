import React, { useState, useEffect } from "react"
import { Row, Container, Button, Alert } from "react-bootstrap"
import { useAuth } from "../contexts/AuthContext"
import { useHistory } from "react-router-dom"
import { Provider } from "react-redux";
import axios from "axios";
import { Web3Storage, File } from 'web3.storage/dist/bundle.esm.min.js'
import algosdk from 'algosdk'
import { useTimer } from 'react-timer-hook';
import { saveAs } from 'file-saver';
import store from "../store";
import Chat from "./chat/Chat";
import { createSession } from "../actions/watson";
import { db } from "../firebase";
import {
  doc,
  updateDoc
} from "firebase/firestore";
import "../css/Dashboard.css";

if (localStorage.getItem("session")) {
  delete axios.defaults.headers.common["session_id"];
  axios.defaults.headers.common["session_id"] = localStorage.getItem("session");
}
else {
  delete axios.defaults.headers.common["session_id"];
}

const token = process.env.REACT_APP_WEB3_STORAGE_TOKEN
const client = new Web3Storage({ token })

// wallet details
const recoveredAccount = algosdk.mnemonicToSecretKey(process.env.REACT_APP_PASSPHRASE);

// setup algod
const baseServer = process.env.REACT_APP_ALGO_SERVER;
const port = '';
const purestakeToken = {
   'X-API-Key': process.env.REACT_APP_PURESTAKE_API_KEY
}
const algodClient = new algosdk.Algodv2(purestakeToken, baseServer, port);
const account = {
    addr: process.env.REACT_APP_WALLET_ADDRESS,
    sk: new Uint8Array(process.env.REACT_APP_SK.split(','))
  }

export default function Dashboard() {
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingDownload, setLoadingDownload] = useState(false)
  const [showTimerWarning, setShowTimerWarning] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const [error, setError] = useState("")
  const { currentUser, logout } = useAuth()
  const history = useHistory()
  var id = ''
  var fname = ''
  var lname = ''
  var address = ''
  var email = ''
  var cidDB = ''
  var chatHistory = ''

  // set initial timer on page load: 5 mins == 300 seconds
  // watson assistant chat session currently lasts 5 mins on the free version 
  // so need to retrieve a new session ID every 5 minutes
  var time = new Date();
  time.setSeconds(time.getSeconds() + 300);

  useEffect(() => {
    // if 5 mins passed
    if (timerExpired) {
      // create new session ID
      store.dispatch(createSession());
      // reset timer
      setTimerExpired(false)
      time = new Date();
      time.setSeconds(time.getSeconds() + 300);
      setShowTimerWarning(true)
    }
  });

  function MyTimer({ expiryTimestamp }) {
    const {
      seconds,
    } = useTimer({ expiryTimestamp, onExpire: () => setTimerExpired(true) });
  
    return (
      <div style={{textAlign: 'center'}}>

      </div>
    );
  }

  async function handleLogout() {
    setError("")
    try {
      await logout()
      history.push("/login")
    } catch {
      setError("Failed to log out")
    }
  }

  async function downloadUserDetails() {
    // Get user details from DB
    const snapshot = await db.collection('accounts').where('email', '==', currentUser.email).get()
    snapshot.forEach(doc => {
      id = doc.id
      fname = doc.data().first_name
      lname = doc.data().last_name
      address = doc.data().address
      email = doc.data().email
    });
    // Create user details file
    var userDetails = new Blob([`First Name: ${fname}, Last Name: ${lname}, Address: ${address}`], {
      type: "text/plain;charset=utf-8;",
    });
    // Download user details file
    saveAs(userDetails, "userDetails.txt");
  }

  async function createChatHistoryFile() {
    // Get chat history from DB
    const snapshot = await db.collection('accounts').where('email', '==', currentUser.email).get()
    snapshot.forEach(doc => {
      id = doc.id
      chatHistory = doc.data().chatHistory
    });
    // Create chat history file
    const buffer = Buffer.from(chatHistory);
    const files = [
      new File([buffer], 'chatHistory.txt')
    ]
    return files
  }

  async function saveToAlgorand() {
    setLoadingSave(true)
    // Push file to IPFS via web3storage
    const file = await createChatHistoryFile()
    const cid = await client.put(file)
    console.log("File CID:", cid)

    // Save cid as a note to send with transaction
    const fileMetadata = {
      cid: `${cid}`,
      filename: './chatHistory.txt'
    }
    let note = algosdk.encodeObj(fileMetadata)

    // Fill cid field of user in DB
    const userDoc = doc(db, "accounts", id);
    const newFields = { cid: cid};
    await updateDoc(userDoc, newFields);

    // Transaction to self with transaction note containing CID
    let params = await algodClient.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true
    let txn = algosdk.makePaymentTxnWithSuggestedParams(
                        process.env.REACT_APP_WALLET_ADDRESS, 
                        process.env.REACT_APP_WALLET_ADDRESS, 
                        0, 
                        undefined,
                        note, 
                        params)

    // Sign & send transaction
    let signedTxn = txn.signTxn(recoveredAccount.sk)
    let txId = txn.txID().toString()
    console.log("Signed transaction with txID: %s", txId)
    await algodClient.sendRawTransaction(signedTxn).do()

    // Confirmation
    let status = await algodClient.status().do()
    let lastRound = status["last-round"]
    while (true) {
      const pendingInfo = await algodClient.pendingTransactionInformation(txId).do()
      if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
        console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"])
        break
      }
      lastRound++
      await algodClient.statusAfterBlock(lastRound).do()
    }

    // Read transaction from Algorand
    let confirmedTxn = await algodClient.pendingTransactionInformation(txId).do()
    console.log("Transaction information: %o", confirmedTxn.txn.txn)
    console.log("Decoded note: %s", algosdk.decodeObj(confirmedTxn.txn.txn.note))
    console.log('File push complete!')

    setLoadingSave(false)
  }

  async function downloadFromAlgorand() {
    setLoadingDownload(true)
    const snapshot = await db.collection('accounts').where('email', '==', currentUser.email).get()
    snapshot.forEach(doc => {
      cidDB = doc.data().cid
    });

    // Get file from IPFS
    const res = await client.get(cidDB)
    const files = await res.files()
    console.log(`IPFS url: https://${cidDB}.ipfs.dweb.link`)
    console.log("Displaying files in IPFS storage:")
    for (const file of files) {
      console.log(`${file.cid}: ${file.name} (${file.size} bytes)`)
    }
    // Download File
    fetch(`https://${cidDB}.ipfs.dweb.link/chatHistory.txt`)
      .then(response => {
          response.blob().then(blob => {
              let url = window.URL.createObjectURL(blob);
              let a = document.createElement('a');
              a.href = url;
              a.download = 'chatHistory.txt';
              a.click();
          });
    });
    setLoadingDownload(false)
  }

  return (
    <Container className="fixed-top ">
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Provider store={store}>
        {/* <h2 className="text-right mr-3 mt-3" style={{fontSize:"22px"}}> {currentUser.email}</h2>  */}
        {/* show alert for session time */}
        <Alert className="text-center align-items-center" show={showTimerWarning} variant='warning'> 
            5 minutes have passed, a new session has been created!
        </Alert>
        <Alert className="text-center align-items-center" show={!showTimerWarning} variant='warning'> 
            Important: chatbot sessions currently only last for 5 minutes. After that, a new session will be created.
        </Alert>
        {/* run timer */}
        <div>
          <MyTimer expiryTimestamp={time} />
        </div>

        {/* Chat container */}
        <div className="container">
          <Chat />
        </div>
        
        {/* Save & Download buttons */}
        <Row className="align-items-right" style={{display:'flex', justifyContent:'right'}}> 
          <div className=" text-right mr-3 mt-3">
            <Button variant="outline-primary" onClick={downloadUserDetails}>
              Download user details
            </Button>
          </div>
          <div className=" text-right mr-3 mt-3">
            <Button disabled={loadingSave} variant="outline-primary" onClick={saveToAlgorand}>
              Save chat to Algorand
            </Button>
          </div>
          <div className=" text-right mr-3 mt-3">
            <Button disabled={loadingDownload} variant="outline-primary" onClick={downloadFromAlgorand}>
              Download chat from Algorand
            </Button>
          </div>
          <div className="text-right mr-3 mt-3">
            <Button variant="outline-danger" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </Row>
      </Provider>
    </Container>  
  )
}

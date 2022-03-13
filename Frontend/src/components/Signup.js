import React, { useRef, useState } from "react"
import { Form, Button, Card, Alert } from "react-bootstrap"
import { useAuth } from "../contexts/AuthContext"
import { Link, useHistory } from "react-router-dom"
import { db } from "../firebase";
import {
  collection,
  addDoc,
} from "firebase/firestore";

export default function Signup() {
  const fnameRef = useRef()
  const lnameRef = useRef()
  const addressRef = useRef()
  const emailRef = useRef()
  const passwordRef = useRef()
  const passwordConfirmRef = useRef()
  const { signup } = useAuth()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const history = useHistory()

  async function handleSubmit(e) {
    e.preventDefault()

    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("Passwords do not match")
    }

    try {
      setError("")
      setLoading(true)
      await signup(emailRef.current.value, passwordRef.current.value)
      const accountsReference = collection(db, "accounts");
      await addDoc(accountsReference, { first_name: fnameRef.current.value, 
                                        last_name: lnameRef.current.value, 
                                        address: addressRef.current.value, 
                                        email: emailRef.current.value,
                                        cid: "",
                                        chatHistory: ""});
      history.push("/")
      
    } catch {
      setError("Failed to create an account")
    }

    setLoading(false)
  }

  return (
    <>
      <Card>
        <Card.Body>
          <h2 className="text-center mb-4">Sign Up</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
          <Form.Group id="fname">
              <Form.Label>First Name</Form.Label>
              <Form.Control type="text" name="fname" ref={fnameRef} required />
            </Form.Group>
            <Form.Group id="lname">
              <Form.Label>Last Name</Form.Label>
              <Form.Control type="text" name="lname" ref={lnameRef} required />
            </Form.Group>
            <Form.Group id="address">
              <Form.Label>Address</Form.Label>
              <Form.Control type="text" name="address" ref={addressRef} required />
            </Form.Group>
            <Form.Group id="email">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" name="email" ref={emailRef} required />
            </Form.Group>
            <Form.Group id="password">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" ref={passwordRef} required />
            </Form.Group>
            <Form.Group id="password-confirm">
              <Form.Label>Password Confirmation</Form.Label>
              <Form.Control type="password" ref={passwordConfirmRef} required />
            </Form.Group>
            <Button disabled={loading} className="w-100" type="submit">
              Sign Up
            </Button>
          </Form>
        </Card.Body>
      </Card>
      <div className="w-100 text-center mt-2">
        Already have an account? <Link to="/login">Log In</Link>
      </div>
    </>
  )
}

import axios from "axios";
import {
  INPUT_SUCCESS,
  INPUT_FAIL,
  SESSION_SUCCESS,
  SESSION_FAIL,
  MESSAGE_SUCCESS,
  MESSAGE_FAIL,
} from "./types";

export const userMessage = (message) => async (dispatch) => {
  try {
    dispatch({ type: INPUT_SUCCESS, payload: message });
  } catch (err) {
    dispatch({ type: INPUT_FAIL });
  }
};

export const createSession = () => async (dispatch) => {
  try {
    
    const res = await axios.get(process.env.REACT_APP_BACKEND_URL + "/api/watson/session");
    dispatch({ type: SESSION_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: SESSION_FAIL });
  }
};

export const sendMessage = (message) => async (dispatch) => {
  try {
    const body = { input: message, session: localStorage.getItem("session")};
    console.log("session", body.session)
    const res = await axios.post(process.env.REACT_APP_BACKEND_URL + "/api/watson/message", body);
    dispatch({
      type: MESSAGE_SUCCESS,
      payload: res.data.output.generic[0].text,
    });
  } catch (err) {
    console.log(err)
    dispatch({ type: MESSAGE_FAIL });
  }
};

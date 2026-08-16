import {
  useEffect,
  useState
} from "react";

import {
  io
} from "socket.io-client";

import Home from "./components/Home";
import Room from "./components/Room";

import "./App.css";

const socket =
  io("http://localhost:5000", {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
  });

function App() {

  const [roomId, setRoomId] =
    useState(null);

  const [isHost, setIsHost] =
    useState(false);

  const [userName, setUserName] =
    useState("");


  useEffect(() => {

    const savedRoom =
      sessionStorage.getItem(
        "syncTuneRoomId"
      );

    const savedName =
      sessionStorage.getItem(
        "syncTuneUserName"
      );

    const savedHost =
      sessionStorage.getItem(
        "syncTuneIsHost"
      );


    if (
      savedRoom &&
      savedName
    ) {

      setRoomId(
        savedRoom
      );

      setUserName(
        savedName
      );

      setIsHost(
        savedHost === "true"
      );

    }

  }, []);


  

  useEffect(() => {

    const handleRoomCreated =
      (id) => {

        console.log(
          "ROOM CREATED:",
          id
        );


        setRoomId(
          id
        );

        setIsHost(
          true
        );

      };


    const handleRoomJoined =
      (id) => {

        console.log(
          "ROOM JOINED:",
          id
        );


        setRoomId(
          id
        );

        setIsHost(
          false
        );

      };


    const handleRoomReconnected =
      (data) => {

        console.log(
          "ROOM RECONNECTED:",
          data.roomId
        );


        setRoomId(
          data.roomId
        );

      };


    const handleRoomError =
      (message) => {

        console.error(
          "ROOM ERROR:",
          message
        );


        alert(
          message
        );


        /*
          If the room no longer exists,
          clear saved session.
        */

        if (
          message ===
          "Room no longer exists"
        ) {

          sessionStorage.removeItem(
            "syncTuneRoomId"
          );

          sessionStorage.removeItem(
            "syncTuneUserName"
          );

          sessionStorage.removeItem(
            "syncTuneIsHost"
          );


          setRoomId(
            null
          );

        }

      };


    socket.on(
      "room-created",
      handleRoomCreated
    );

    socket.on(
      "room-joined",
      handleRoomJoined
    );

    socket.on(
      "room-reconnected",
      handleRoomReconnected
    );

    socket.on(
      "room-error",
      handleRoomError
    );


    return () => {

      socket.off(
        "room-created",
        handleRoomCreated
      );

      socket.off(
        "room-joined",
        handleRoomJoined
      );

      socket.off(
        "room-reconnected",
        handleRoomReconnected
      );

      socket.off(
        "room-error",
        handleRoomError
      );

    };

  }, []);




  const leaveRoom =
    () => {

      socket.emit(
        "leave-room"
      );


      sessionStorage.removeItem(
        "syncTuneRoomId"
      );

      sessionStorage.removeItem(
        "syncTuneUserName"
      );

      sessionStorage.removeItem(
        "syncTuneIsHost"
      );


      setRoomId(
        null
      );

      setIsHost(
        false
      );

    };


  

  if (roomId) {

    return (

      <Room
        roomId={roomId}
        isHost={isHost}
        socket={socket}
        userName={userName}
        onLeave={leaveRoom}
      />

    );

  }


 

  return (

    <Home
      socket={socket}
      setUserName={setUserName}
    />

  );

}

export default App;
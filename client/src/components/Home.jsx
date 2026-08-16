import {
  useState
} from "react";

function Home({
  socket,
  setUserName
}) {

  const [name, setName] =
    useState("");

  const [roomInput, setRoomInput] =
    useState("");

  const [error, setError] =
    useState("");


 

  const createRoom =
    () => {

      const cleanName =
        name.trim();


      if (!cleanName) {

        setError(
          "Please enter your name"
        );

        return;

      }


      setUserName(
        cleanName
      );


      setError("");


      socket.emit(
        "create-room",
        cleanName
      );

    };



  const joinRoom =
    () => {

      const cleanName =
        name.trim();

      const cleanRoom =
        roomInput
          .trim()
          .toUpperCase();


      if (!cleanName) {

        setError(
          "Please enter your name"
        );

        return;

      }


      if (!cleanRoom) {

        setError(
          "Please enter Room ID"
        );

        return;

      }


      setUserName(
        cleanName
      );


      setError("");


      socket.emit(
        "join-room",
        {

          roomId:
            cleanRoom,

          userName:
            cleanName

        }
      );

    };


  return (

    <div className="home">

      <div className="home-card">

        <div className="logo-big">
          🎵
        </div>


        <h1>
          SyncTune
        </h1>


        <p>
          Listen together.
          Chat together.
        </p>


        <input
          className="room-input"
          type="text"
          placeholder="Enter your name"
          value={name}
          maxLength={30}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
        />


        <button
          className="primary-button"
          onClick={
            createRoom
          }
        >
          Create Room
        </button>


        <div className="divider">
          OR
        </div>


        <input
          className="room-input"
          type="text"
          placeholder="Enter Room ID"
          value={roomInput}
          onChange={(e) =>
            setRoomInput(
              e.target.value
            )
          }
          onKeyDown={(e) => {

            if (
              e.key === "Enter"
            ) {

              joinRoom();

            }

          }}
        />


        <button
          className="secondary-button"
          onClick={
            joinRoom
          }
        >
          Join Room
        </button>


        {error && (

          <div className="error">
            ❌ {error}
          </div>

        )}

      </div>

    </div>

  );

}

export default Home;
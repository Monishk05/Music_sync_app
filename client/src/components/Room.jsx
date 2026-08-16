import {
  useEffect,
  useRef,
  useState
} from "react";

const DRIFT_THRESHOLD = 0.35;

function Room({
  roomId,
  isHost,
  socket,
  userName,
  onLeave
}) {

  

  const audioRef =
    useRef(null);

  const remotePlayRef =
    useRef(false);

  const remotePauseRef =
    useRef(false);

  const remoteSeekRef =
    useRef(false);

  const enablingAudioRef =
    useRef(false);

  const changingSongRef =
    useRef(false);



  const [musicUrl, setMusicUrl] =
    useState("");

  const [musicName, setMusicName] =
    useState("");

  const [status, setStatus] =
    useState(
      "Waiting for music..."
    );


  

  const [audioEnabled, setAudioEnabled] =
    useState(isHost);


  const [playlist, setPlaylist] =
    useState([]);

  const [
    currentSongIndex,
    setCurrentSongIndex
  ] = useState(0);

  const [
    autoPlayNext,
    setAutoPlayNext
  ] = useState(false);


  const [userCount, setUserCount] =
    useState(1);

  const [users, setUsers] =
    useState([]);



  const [messages, setMessages] =
    useState([]);

  const [chatMessage, setChatMessage] =
    useState("");


  const [
    connectionStatus,
    setConnectionStatus
  ] = useState(
    socket.connected
      ? "connected"
      : "disconnected"
  );


  useEffect(() => {

    if (!roomId) {
      return;
    }


    sessionStorage.setItem(
      "syncTuneRoomId",
      roomId
    );

    sessionStorage.setItem(
      "syncTuneUserName",
      userName || ""
    );

    sessionStorage.setItem(
      "syncTuneIsHost",
      String(isHost)
    );

  }, [
    roomId,
    userName,
    isHost
  ]);


  useEffect(() => {

    const handleConnect =
      () => {

        console.log(
          "🟢 SOCKET CONNECTED:",
          socket.id
        );


        setConnectionStatus(
          "connected"
        );

      };


    const handleDisconnect =
      () => {

        console.log(
          "🔴 SOCKET DISCONNECTED"
        );


        setConnectionStatus(
          "disconnected"
        );

      };


    const handleReconnectAttempt =
      () => {

        console.log(
          "🔄 RECONNECTING..."
        );


        setConnectionStatus(
          "reconnecting"
        );

      };


    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.io.on(
      "reconnect_attempt",
      handleReconnectAttempt
    );


    return () => {

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.io.off(
        "reconnect_attempt",
        handleReconnectAttempt
      );

    };

  }, [socket]);




  useEffect(() => {

    const handleReconnect =
      () => {

        console.log(
          "🔄 RECONNECTED - RESTORING ROOM"
        );


        socket.emit(
          "reconnect-room",
          {

            roomId,

            userName,

            isHost

          }
        );

      };


    socket.on(
      "connect",
      handleReconnect
    );


    return () => {

      socket.off(
        "connect",
        handleReconnect
      );

    };

  }, [
    socket,
    roomId,
    userName,
    isHost
  ]);




  useEffect(() => {

    const handleRoomReconnected =
      (data) => {

        console.log(
          "✅ ROOM RESTORED:",
          data.roomId
        );


        setStatus(
          "Room reconnected. Synchronizing..."
        );


       

        socket.emit(
          "get-room-users",
          roomId
        );


        if (!isHost) {

          socket.emit(
            "request-sync",
            roomId
          );

        }

      };


    socket.on(
      "room-reconnected",
      handleRoomReconnected
    );


    return () => {

      socket.off(
        "room-reconnected",
        handleRoomReconnected
      );

    };

  }, [
    socket,
    roomId,
    isHost
  ]);


   useEffect(() => {

    const requestCurrentSync =
      () => {

        console.log(
          "🎵 REQUESTING CURRENT SYNC"
        );


        socket.emit(
          "request-sync",
          roomId
        );

      };


    socket.on(
      "request-current-sync",
      requestCurrentSync
    );


    return () => {

      socket.off(
        "request-current-sync",
        requestCurrentSync
      );

    };

  }, [
    socket,
    roomId
  ]);


  
  useEffect(() => {

    const receiveMusic =
      (data) => {

        console.log(
          "🎵 MUSIC RECEIVED:",
          data
        );


        setMusicUrl(
          data.musicUrl
        );

        setMusicName(
          data.fileName
        );


        setStatus(
          "Music ready!"
        );

      };


    socket.on(
      "music-selected",
      receiveMusic
    );


    return () => {

      socket.off(
        "music-selected",
        receiveMusic
      );

    };

  }, [socket]);


 

  useEffect(() => {

    const receivePlaylist =
      (data) => {

        console.log(
          "🎶 PLAYLIST:",
          data
        );


        setPlaylist(
          data.playlist || []
        );


        setCurrentSongIndex(
          data.currentSongIndex || 0
        );

      };


    socket.on(
      "playlist-updated",
      receivePlaylist
    );


    return () => {

      socket.off(
        "playlist-updated",
        receivePlaylist
      );

    };

  }, [socket]);


  

  const enableAudio =
    async () => {

      const audio =
        audioRef.current;


      if (!audio) {
        return;
      }


      try {

        enablingAudioRef.current =
          true;


        audio.muted =
          true;


        if (
          audio.readyState < 2
        ) {

          audio.load();


          await new Promise(
            (resolve) => {

              const ready =
                () => {

                  audio.removeEventListener(
                    "canplay",
                    ready
                  );

                  resolve();

                };


              audio.addEventListener(
                "canplay",
                ready,
                {
                  once: true
                }
              );

            }
          );

        }


        await audio.play();


        audio.pause();


        audio.currentTime =
          0;


        audio.muted =
          false;


        enablingAudioRef.current =
          false;


        setAudioEnabled(
          true
        );


        setStatus(
          "🔊 Audio enabled. Ready!"
        );



        socket.emit(
          "request-sync",
          roomId
        );


      } catch (error) {

        console.error(
          "ENABLE AUDIO ERROR:",
          error
        );


        audio.muted =
          false;

        enablingAudioRef.current =
          false;


        setAudioEnabled(
          false
        );


        setStatus(
          "Click Enable Audio again."
        );

      }

    };


  

  useEffect(() => {

    const receivePlay =
      async (data) => {

        const audio =
          audioRef.current;


        if (!audio) {
          return;
        }


        if (!audioEnabled) {

          setStatus(
            "🔊 Click Enable Audio first."
          );

          return;

        }


        remotePlayRef.current =
          true;


        const start =
          async () => {

            try {

              audio.currentTime =
                Number(
                  data.currentTime
                ) || 0;


              await audio.play();


              setStatus(
                "▶ Playing together"
              );


            } catch (error) {

              console.error(
                "REMOTE PLAY ERROR:",
                error
              );


              remotePlayRef.current =
                false;

            }

          };


        if (
          audio.readyState >= 2
        ) {

          await start();

        } else {

          const ready =
            async () => {

              audio.removeEventListener(
                "canplay",
                ready
              );


              await start();

            };


          audio.addEventListener(
            "canplay",
            ready
          );

        }

      };


    socket.on(
      "play-music",
      receivePlay
    );


    return () => {

      socket.off(
        "play-music",
        receivePlay
      );

    };

  }, [
    socket,
    audioEnabled
  ]);



  useEffect(() => {

    const receivePause =
      (data) => {

        const audio =
          audioRef.current;


        if (!audio) {
          return;
        }


        remoteSeekRef.current =
          true;

        remotePauseRef.current =
          true;


        audio.currentTime =
          Number(
            data.currentTime
          ) || 0;


        audio.pause();


        setStatus(
          "⏸ Paused"
        );

      };


    socket.on(
      "pause-music",
      receivePause
    );


    return () => {

      socket.off(
        "pause-music",
        receivePause
      );

    };

  }, [socket]);



  useEffect(() => {

    const receiveSeek =
      (data) => {

        const audio =
          audioRef.current;


        if (!audio) {
          return;
        }


        remoteSeekRef.current =
          true;


        audio.currentTime =
          Number(
            data.currentTime
          ) || 0;

      };


    socket.on(
      "seek-music",
      receiveSeek
    );


    return () => {

      socket.off(
        "seek-music",
        receiveSeek
      );

    };

  }, [socket]);


  
  useEffect(() => {

    if (isHost) {
      return;
    }


    const receiveSync =
      async (data) => {

        const audio =
          audioRef.current;


        if (!audio) {
          return;
        }


        if (!audioEnabled) {
          return;
        }


        const hostTime =
          Number(
            data.currentTime
          ) || 0;


        const guestTime =
          audio.currentTime;


        const difference =
          hostTime -
          guestTime;


        console.log(
          "SYNC:",
          {
            host:
              hostTime.toFixed(3),

            guest:
              guestTime.toFixed(3),

            difference:
              difference.toFixed(3)
          }
        );


      
        if (
          Math.abs(difference) <
          DRIFT_THRESHOLD
        ) {


          if (
            data.isPlaying &&
            audio.paused
          ) {

            remotePlayRef.current =
              true;

            try {

              await audio.play();

            } catch (error) {

              remotePlayRef.current =
                false;

            }

          }


          if (
            !data.isPlaying &&
            !audio.paused
          ) {

            remotePauseRef.current =
              true;

            audio.pause();

          }


          return;

        }


        remoteSeekRef.current =
          true;


        audio.currentTime =
          hostTime;


        console.log(
          "🔄 DRIFT CORRECTED:",
          difference.toFixed(3)
        );


        if (
          data.isPlaying &&
          audio.paused
        ) {

          remotePlayRef.current =
            true;


          try {

            await audio.play();

          } catch (error) {

            remotePlayRef.current =
              false;

          }

        }


        if (
          !data.isPlaying &&
          !audio.paused
        ) {

          remotePauseRef.current =
            true;

          audio.pause();

        }

      };


    socket.on(
      "sync-time",
      receiveSync
    );


    return () => {

      socket.off(
        "sync-time",
        receiveSync
      );

    };

  }, [
    socket,
    isHost,
    audioEnabled
  ]);


  useEffect(() => {

    if (!isHost) {
      return;
    }


    const interval =
      setInterval(
        () => {

          const audio =
            audioRef.current;


          if (!audio) {
            return;
          }


          if (!musicUrl) {
            return;
          }


          socket.emit(
            "sync-time",
            {

              roomId,

              currentTime:
                audio.currentTime,

              isPlaying:
                !audio.paused &&
                !audio.ended

            }
          );

        },
        1000
      );


    return () => {

      clearInterval(
        interval
      );

    };

  }, [
    socket,
    roomId,
    isHost,
    musicUrl
  ]);


 

  useEffect(() => {

    if (!isHost) {
      return;
    }


    const sendSync =
      () => {

        const audio =
          audioRef.current;


        if (!audio) {
          return;
        }


        socket.emit(
          "sync-time",
          {

            roomId,

            currentTime:
              audio.currentTime,

            isPlaying:
              !audio.paused &&
              !audio.ended

          }
        );

      };


    socket.on(
      "sync-request",
      sendSync
    );


    return () => {

      socket.off(
        "sync-request",
        sendSync
      );

    };

  }, [
    socket,
    roomId,
    isHost
  ]);



  useEffect(() => {

    const changeSong =
      (data) => {

        const audio =
          audioRef.current;


        changingSongRef.current =
          true;


        remotePlayRef.current =
          false;

        remotePauseRef.current =
          false;

        remoteSeekRef.current =
          false;


        if (audio) {
          audio.pause();
        }


        setMusicUrl(
          data.musicUrl
        );

        setMusicName(
          data.fileName
        );

        setCurrentSongIndex(
          data.currentSongIndex
        );


        if (isHost) {

          setAutoPlayNext(
            true
          );

        }


        setStatus(
          "Loading next song..."
        );

      };


    socket.on(
      "change-song",
      changeSong
    );


    return () => {

      socket.off(
        "change-song",
        changeSong
      );

    };

  }, [
    socket,
    isHost
  ]);



  const handleCanPlay =
    async () => {

      if (!autoPlayNext) {
        return;
      }


      if (!isHost) {
        return;
      }


      const audio =
        audioRef.current;


      if (!audio) {
        return;
      }


      try {

        setAutoPlayNext(
          false
        );


        changingSongRef.current =
          false;


        audio.currentTime =
          0;


        await audio.play();


      } catch (error) {

        console.error(
          "NEXT SONG ERROR:",
          error
        );


        setAutoPlayNext(
          false
        );


        changingSongRef.current =
          false;

      }

    };



  const handleSongEnded =
    () => {

      if (!isHost) {
        return;
      }


      socket.emit(
        "next-song",
        {
          roomId
        }
      );

    };


 

  useEffect(() => {

    const finished =
      () => {

        setStatus(
          "Playlist finished."
        );

      };


    socket.on(
      "playlist-finished",
      finished
    );


    return () => {

      socket.off(
        "playlist-finished",
        finished
      );

    };

  }, [socket]);




  useEffect(() => {

    const updateUsers =
      (data) => {

        setUserCount(
          data.count
        );

        setUsers(
          data.users || []
        );

      };


    socket.on(
      "room-users",
      updateUsers
    );


    socket.emit(
      "get-room-users",
      roomId
    );


    return () => {

      socket.off(
        "room-users",
        updateUsers
      );

    };

  }, [
    socket,
    roomId
  ]);



  useEffect(() => {

    const receiveMessage =
      (data) => {

        setMessages(
          (previous) => [
            ...previous,
            data
          ]
        );

      };


    socket.on(
      "receive-message",
      receiveMessage
    );


    return () => {

      socket.off(
        "receive-message",
        receiveMessage
      );

    };

  }, [socket]);


  

  useEffect(() => {

    const userLeft =
      (data) => {

        setStatus(
          `${data.name || "User"} left the room.`
        );

      };


    socket.on(
      "user-left",
      userLeft
    );


    return () => {

      socket.off(
        "user-left",
        userLeft
      );

    };

  }, [socket]);



  useEffect(() => {

    const roomClosed =
      () => {

        alert(
          "The host closed the room."
        );


        onLeave();

      };


    socket.on(
      "room-closed",
      roomClosed
    );


    return () => {

      socket.off(
        "room-closed",
        roomClosed
      );

    };

  }, [
    socket,
    onLeave
  ]);


  

  const uploadMusic =
    async (event) => {

      const file =
        event.target.files[0];


      if (!file) {
        return;
      }


      setStatus(
        "Uploading..."
      );


      const formData =
        new FormData();


      formData.append(
        "music",
        file
      );


      try {

        const response =
          await fetch(
            "http://localhost:5000/upload",
            {
              method:
                "POST",

              body:
                formData
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Upload failed"
          );

        }


        socket.emit(
          "music-selected",
          {

            roomId,

            musicUrl:
              data.musicUrl,

            fileName:
              data.fileName

          }
        );


        setStatus(
          "Music added!"
        );


        event.target.value =
          "";

      } catch (error) {

        console.error(
          "UPLOAD ERROR:",
          error
        );


        setStatus(
          "Upload failed."
        );

      }

    };




  const handlePlay =
    () => {

      if (
        remotePlayRef.current
      ) {

        remotePlayRef.current =
          false;

        return;

      }


      if (
        enablingAudioRef.current
      ) {
        return;
      }


      if (
        changingSongRef.current
      ) {
        return;
      }


      const audio =
        audioRef.current;


      if (!audio) {
        return;
      }


      socket.emit(
        "play-music",
        {

          roomId,

          currentTime:
            audio.currentTime

        }
      );


      setStatus(
        "▶ Playing together"
      );

    };




  const handlePause =
    () => {

      if (
        remotePauseRef.current
      ) {

        remotePauseRef.current =
          false;

        return;

      }


      if (
        enablingAudioRef.current
      ) {
        return;
      }


      if (
        changingSongRef.current
      ) {
        return;
      }


      const audio =
        audioRef.current;


      if (!audio) {
        return;
      }


      socket.emit(
        "pause-music",
        {

          roomId,

          currentTime:
            audio.currentTime

        }
      );


      setStatus(
        "⏸ Paused"
      );

    };



  const handleSeeked =
    () => {

      if (
        remoteSeekRef.current
      ) {

        remoteSeekRef.current =
          false;

        return;

      }


      if (
        enablingAudioRef.current
      ) {
        return;
      }


      if (
        changingSongRef.current
      ) {
        return;
      }


      const audio =
        audioRef.current;


      if (!audio) {
        return;
      }


      socket.emit(
        "seek-music",
        {

          roomId,

          currentTime:
            audio.currentTime

        }
      );

    };


 
  const sendMessage =
    () => {

      const text =
        chatMessage.trim();


      if (!text) {
        return;
      }


      socket.emit(
        "send-message",
        {

          roomId,

          message:
            text

        }
      );


      setChatMessage("");

    };


 
  const leaveRoom =
    () => {

      socket.emit(
        "leave-room"
      );


      onLeave();

    };


  const closeRoom =
    () => {

      socket.emit(
        "close-room"
      );


      onLeave();

    };




  return (

    <div className="room">

      <header className="room-header">

        <div className="logo">
          🎵 SyncTune
        </div>


        <div className="room-info">

          <div className="room-id">

            Room:
            {" "}

            <strong>
              {roomId}
            </strong>

          </div>


          <div>
            👥 {userCount}
          </div>


          <div>

            {connectionStatus ===
              "connected" &&
              "🟢 Connected"}

            {connectionStatus ===
              "reconnecting" &&
              "🟡 Reconnecting..."}

            {connectionStatus ===
              "disconnected" &&
              "🔴 Disconnected"}

          </div>

        </div>

      </header>


      <main className="room-main">

        {/* MUSIC */}

        <section className="music-panel">

          <div className="album">
            🎵
          </div>


          {musicName ? (

            <h2 className="song-name">
              {musicName}
            </h2>

          ) : (

            <h2 className="song-name">
              No music selected
            </h2>

          )}


          {musicUrl ? (

            <audio
              ref={audioRef}
              src={musicUrl}
              controls
              preload="auto"
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeeked}
              onEnded={handleSongEnded}
              onCanPlay={handleCanPlay}
            />

          ) : (

            <p>
              {isHost
                ? "Upload a song to start."
                : "Waiting for host to upload music..."}
            </p>

          )}


          {!isHost &&
            musicUrl &&
            !audioEnabled && (

            <button
              className="primary-button enable-audio"
              onClick={
                enableAudio
              }
            >
              🔊 Enable Audio
            </button>

          )}


          {isHost && (

            <div className="upload-box">

              <label>
                Upload Music
              </label>


              <input
                type="file"
                accept="audio/*"
                onChange={
                  uploadMusic
                }
              />

            </div>

          )}


          <p className="status">
            {status}
          </p>


          {/* PLAYLIST */}

          {playlist.length > 0 && (

            <div className="playlist">

              <h3>
                🎶 Playlist
              </h3>


              {playlist.map(
                (song, index) => (

                  <div
                    key={
                      `${song.musicUrl}-${index}`
                    }
                    className={
                      index ===
                      currentSongIndex
                        ? "playlist-item active"
                        : "playlist-item"
                    }
                  >

                    <span>

                      {index + 1}.
                      {" "}
                      {song.fileName}

                    </span>


                    {index ===
                      currentSongIndex && (

                      <span>
                        ▶
                      </span>

                    )}

                  </div>

                )
              )}

            </div>

          )}

        </section>


        {/* CHAT */}

        <section className="chat-panel">

          <div className="chat-header">
            💬 Chat
          </div>


          <div className="chat-messages">

            {messages.length === 0 && (

              <div className="empty-chat">
                No messages yet.
              </div>

            )}


            {messages.map(
              (msg, index) => (

                <div
                  className={
                    msg.senderId === socket.id
                      ? "chat-message own"
                      : "chat-message"
                  }
                  key={index}
                >

                  <div className="chat-user">

                    {msg.senderName ||
                      "User"}

                  </div>


                  <div className="chat-text">
                    {msg.message}
                  </div>


                  <div className="chat-time">
                    {msg.time}
                  </div>

                </div>

              )
            )}

          </div>


          <div className="chat-input">

            <input
              type="text"
              placeholder="Type a message..."
              value={chatMessage}
              onChange={(e) =>
                setChatMessage(
                  e.target.value
                )
              }
              onKeyDown={(e) => {

                if (
                  e.key === "Enter"
                ) {

                  sendMessage();

                }

              }}
            />


            <button
              onClick={
                sendMessage
              }
            >
              Send
            </button>

          </div>

        </section>

      </main>


      <footer className="room-footer">

        <div>

          {isHost
            ? "👑 You are the Host"
            : audioEnabled
              ? "🟢 Audio Enabled"
              : "🔊 Audio Not Enabled"}

        </div>


        {isHost ? (

          <button
            className="danger-button"
            onClick={
              closeRoom
            }
          >
            Close Room
          </button>

        ) : (

          <button
            className="leave-button"
            onClick={
              leaveRoom
            }
          >
            Leave Room
          </button>

        )}

      </footer>

    </div>

  );

}

export default Room;
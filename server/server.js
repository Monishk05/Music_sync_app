const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());


const uploadsPath = path.join(
  __dirname,
  "uploads"
);

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
}

app.use(
  "/uploads",
  express.static(uploadsPath)
);


const server =
  http.createServer(app);



const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  },

  

  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});


const rooms = new Map();



const storage =
  multer.diskStorage({

    destination: (req, file, cb) => {

      cb(
        null,
        uploadsPath
      );

    },

    filename: (req, file, cb) => {

      const extension =
        path.extname(
          file.originalname
        );

      const filename =
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2, 8) +
        extension;

      cb(
        null,
        filename
      );

    }

  });

const upload =
  multer({
    storage
  });



app.get("/", (req, res) => {

  res.send(
    "SyncTune Server is running"
  );

});



app.post(
  "/upload",
  upload.single("music"),
  (req, res) => {

    try {

      if (!req.file) {

        return res
          .status(400)
          .json({
            message:
              "No music file selected"
          });

      }

      const musicUrl =
        `http://localhost:5000/uploads/${req.file.filename}`;

      console.log(
        "🎵 Uploaded:",
        req.file.originalname
      );

      res.json({

        musicUrl,

        fileName:
          req.file.originalname

      });

    } catch (error) {

      console.error(
        "UPLOAD ERROR:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Upload failed"
        });

    }

  }
);



function generateRoomId() {

  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

}

function sendRoomUsers(roomId) {

  const room =
    io.sockets.adapter.rooms.get(
      roomId
    );

  if (!room) {
    return;
  }

  const users = [];

  room.forEach(
    (socketId) => {

      const connectedSocket =
        io.sockets.sockets.get(
          socketId
        );

      if (connectedSocket) {

        users.push({

          socketId,

          name:
            connectedSocket.userName ||
            "User",

          isHost:
            connectedSocket.isHost ||
            false

        });

      }

    }
  );

  io.to(roomId).emit(
    "room-users",
    {
      count:
        room.size,

      users
    }
  );

}



function sendCurrentSync(roomId) {

  const room =
    io.sockets.adapter.rooms.get(
      roomId
    );

  if (!room) {
    return;
  }

  room.forEach(
    (socketId) => {

      const connectedSocket =
        io.sockets.sockets.get(
          socketId
        );

      if (
        connectedSocket &&
        connectedSocket.isHost
      ) {

        connectedSocket.emit(
          "sync-request"
        );

      }

    }
  );

}



io.on(
  "connection",
  (socket) => {

    console.log(
      "🟢 CONNECTED:",
      socket.id
    );

    let currentRoomId =
      null;


  

    socket.on(
      "create-room",
      (userName) => {

        const name =
          typeof userName === "string"
            ? userName.trim()
            : String(
                userName?.userName ||
                ""
              ).trim();

        if (!name) {

          socket.emit(
            "room-error",
            "Please enter your name"
          );

          return;

        }

        let roomId;

        do {

          roomId =
            generateRoomId();

        } while (
          rooms.has(roomId)
        );


        socket.userName =
          name;

        socket.isHost =
          true;


        rooms.set(
          roomId,
          {

            musicUrl:
              null,

            fileName:
              null,

            playlist:
              [],

            currentSongIndex:
              0

          }
        );


        socket.join(
          roomId
        );

        currentRoomId =
          roomId;


        console.log(
          "🏠 ROOM CREATED:",
          roomId,
          "HOST:",
          name
        );


        socket.emit(
          "room-created",
          roomId
        );


        sendRoomUsers(
          roomId
        );

      }
    );


   

    socket.on(
      "join-room",
      (data) => {

        let roomId = "";
        let name = "";


        if (
          typeof data ===
          "string"
        ) {

          roomId =
            data
              .trim()
              .toUpperCase();

        } else {

          roomId =
            String(
              data?.roomId ||
              ""
            )
              .trim()
              .toUpperCase();

          name =
            String(
              data?.userName ||
              ""
            ).trim();

        }


        if (!name) {
          name = "Guest";
        }


        const room =
          rooms.get(roomId);


        if (!room) {

          socket.emit(
            "room-error",
            "Room does not exist"
          );

          return;

        }


        socket.userName =
          name;

        socket.isHost =
          false;


        socket.join(
          roomId
        );

        currentRoomId =
          roomId;


        console.log(
          "✅ JOINED:",
          name,
          roomId
        );


        socket.emit(
          "room-joined",
          roomId
        );


        socket.to(
          roomId
        ).emit(
          "user-joined",
          {
            socketId:
              socket.id,

            name
          }
        );


        sendRoomUsers(
          roomId
        );


        // Current song

        if (room.musicUrl) {

          socket.emit(
            "music-selected",
            {

              musicUrl:
                room.musicUrl,

              fileName:
                room.fileName

            }
          );

        }


        // Playlist

        socket.emit(
          "playlist-updated",
          {

            playlist:
              room.playlist || [],

            currentSongIndex:
              room.currentSongIndex || 0

          }
        );

      }
    );


    

    socket.on(
      "get-room-users",
      (roomId) => {

        sendRoomUsers(
          roomId
        );

      }
    );


    

    socket.on(
      "reconnect-room",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();

        const name =
          String(
            data?.userName || ""
          ).trim();


        const room =
          rooms.get(roomId);


        if (!room) {

          socket.emit(
            "room-error",
            "Room no longer exists"
          );

          return;

        }


     
        socket.userName =
          name || "User";

        socket.isHost =
          Boolean(data?.isHost);


        socket.join(
          roomId
        );


        currentRoomId =
          roomId;


        console.log(
          "🔄 RECONNECTED:",
          socket.userName,
          roomId
        );


        socket.emit(
          "room-reconnected",
          {
            roomId
          }
        );


        sendRoomUsers(
          roomId
        );


        // Restore playlist

        socket.emit(
          "playlist-updated",
          {

            playlist:
              room.playlist || [],

            currentSongIndex:
              room.currentSongIndex || 0

          }
        );


        // Restore song

        if (room.musicUrl) {

          socket.emit(
            "music-selected",
            {

              musicUrl:
                room.musicUrl,

              fileName:
                room.fileName

            }
          );

        }


        // Guest asks Host for current position

        if (!socket.isHost) {

          socket.emit(
            "request-current-sync"
          );

        }

      }
    );



    socket.on(
      "music-selected",
      (data) => {

        const room =
          rooms.get(
            data.roomId
          );


        if (!room) {
          return;
        }


        const song = {

          musicUrl:
            data.musicUrl,

          fileName:
            data.fileName

        };


        room.playlist.push(
          song
        );


        if (
          room.playlist.length === 1
        ) {

          room.currentSongIndex =
            0;

          room.musicUrl =
            song.musicUrl;

          room.fileName =
            song.fileName;

        }


        rooms.set(
          data.roomId,
          room
        );


        console.log(
          "🎵 SONG ADDED:",
          song.fileName
        );


        io.to(
          data.roomId
        ).emit(
          "playlist-updated",
          {

            playlist:
              room.playlist,

            currentSongIndex:
              room.currentSongIndex

          }
        );


        io.to(
          data.roomId
        ).emit(
          "music-selected",
          {

            musicUrl:
              room.musicUrl,

            fileName:
              room.fileName

          }
        );

      }
    );


    socket.on(
      "play-music",
      (data) => {

        const currentTime =
          Number(
            data.currentTime
          ) || 0;


        socket.to(
          data.roomId
        ).emit(
          "play-music",
          {
            currentTime
          }
        );

      }
    );


   

    socket.on(
      "pause-music",
      (data) => {

        const currentTime =
          Number(
            data.currentTime
          ) || 0;


        socket.to(
          data.roomId
        ).emit(
          "pause-music",
          {
            currentTime
          }
        );

      }
    );


   
    socket.on(
      "seek-music",
      (data) => {

        const currentTime =
          Number(
            data.currentTime
          ) || 0;


        socket.to(
          data.roomId
        ).emit(
          "seek-music",
          {
            currentTime
          }
        );

      }
    );


   

    socket.on(
      "next-song",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();


        const room =
          rooms.get(roomId);


        if (!room) {
          return;
        }


        if (!socket.isHost) {

          console.log(
            "❌ Guest tried next song"
          );

          return;

        }


        if (
          !room.playlist ||
          room.playlist.length === 0
        ) {

          return;

        }


        if (
          room.currentSongIndex >=
          room.playlist.length - 1
        ) {

          io.to(
            roomId
          ).emit(
            "playlist-finished"
          );

          return;

        }


        room.currentSongIndex += 1;


        const nextSong =
          room.playlist[
            room.currentSongIndex
          ];


        room.musicUrl =
          nextSong.musicUrl;

        room.fileName =
          nextSong.fileName;


        rooms.set(
          roomId,
          room
        );


        io.to(
          roomId
        ).emit(
          "playlist-updated",
          {

            playlist:
              room.playlist,

            currentSongIndex:
              room.currentSongIndex

          }
        );


        io.to(
          roomId
        ).emit(
          "change-song",
          {

            musicUrl:
              nextSong.musicUrl,

            fileName:
              nextSong.fileName,

            currentSongIndex:
              room.currentSongIndex

          }
        );

      }
    );



    socket.on(
      "sync-time",
      (data) => {


        if (!socket.isHost) {
          return;
        }


        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();


        if (
          !rooms.has(roomId)
        ) {
          return;
        }


        socket.to(
          roomId
        ).emit(
          "sync-time",
          {

            currentTime:
              Number(
                data.currentTime
              ) || 0,

            isPlaying:
              Boolean(
                data.isPlaying
              )

          }
        );

      }
    );


    socket.on(
      "request-sync",
      (roomId) => {

        sendCurrentSync(
          roomId
        );

      }
    );



    socket.on(
      "send-message",
      (data) => {

        const message =
          String(
            data?.message || ""
          ).trim();


        if (!message) {
          return;
        }


        const senderName =
          socket.userName ||
          "User";


        io.to(
          data.roomId
        ).emit(
          "receive-message",
          {

            senderId:
              socket.id,

            senderName,

            message,

            time:
              new Date()
                .toLocaleTimeString()

          }
        );

      }
    );


    socket.on(
      "leave-room",
      () => {

        if (!currentRoomId) {
          return;
        }


        const roomId =
          currentRoomId;


        socket.leave(
          roomId
        );


        socket.to(
          roomId
        ).emit(
          "user-left",
          {

            socketId:
              socket.id,

            name:
              socket.userName ||
              "User"

          }
        );


        currentRoomId =
          null;


        setTimeout(
          () => {

            sendRoomUsers(
              roomId
            );

          },
          100
        );

      }
    );


    socket.on(
      "close-room",
      () => {

        if (!currentRoomId) {
          return;
        }


        const roomId =
          currentRoomId;


        io.to(
          roomId
        ).emit(
          "room-closed"
        );


        rooms.delete(
          roomId
        );


        currentRoomId =
          null;


        console.log(
          "🔴 ROOM CLOSED:",
          roomId
        );

      }
    );

    socket.on(
      "disconnect",
      (reason) => {

        console.log(
          "🔴 DISCONNECTED:",
          socket.userName ||
          socket.id,

          "Reason:",
          reason
        );


        if (currentRoomId) {

          const roomId =
            currentRoomId;


          setTimeout(
            () => {

              sendRoomUsers(
                roomId
              );

            },
            100
          );

        }

      }
    );

  }
);


const PORT = 5000;

server.listen(
  PORT,
  () => {

    console.log(
      `🎵 SyncTune Server running at http://localhost:${PORT}`
    );

  }
);
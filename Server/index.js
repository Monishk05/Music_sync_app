const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

// Change this in your server/index.js
const io = new Server(server, {
    cors: { 
        origin: "https://music-sync-app-theta.vercel.app/", // Using "*" during testing ensures NOTHING is blocked
        methods: ["GET", "POST"] 
    }
});

const roomStore = {}; 

io.on('connection', (socket) => {
    socket.on("join_room", (roomId) => {
        const id = roomId.toLowerCase().trim();
        socket.join(id);
        if (roomStore[id]) {
            socket.emit('update_song', roomStore[id].url);
        }
    });

    socket.on("leave_room", (roomId) => {
        socket.leave(roomId.toLowerCase().trim());
    });

    socket.on("send_message", (data) => {
        io.to(data.room).emit("receive_message", data);
    });

    socket.on('change_song', (data) => {
        const id = data.roomId.toLowerCase().trim();
        roomStore[id] = { url: data.url };
        io.to(id).emit('update_song', data.url);
    });

    socket.on("send_control", (data) => {
        socket.to(data.room).emit("receive_control", data);
    });

    socket.on('remove_song', (roomId) => {
        const id = roomId.toLowerCase().trim();
        delete roomStore[id];
        io.to(id).emit('update_song', null);
    });
});

server.listen(5000, () => console.log("SERVER RUNNING ON PORT 5000"));

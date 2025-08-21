// This is the API route for our server
import { Server } from 'socket.io';

const SocketHandler = (req, res) => {
  // If the server is already running, we don't need to create a new one
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    // Create a new Socket.IO server on top of our existing HTTP server
    const io = new Server(res.socket.server);

    // This is the main connection handler
    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      // Listen for the 'join-room' event from the client
      socket.on('join-room', (data) => {
        const { roomid, user } = data;
        // Join the specified room
        socket.join(roomid);
        console.log(`${user} joined room: ${roomid}`);

        // Emit a message to all clients in the same room, including the sender
        io.to(roomid).emit('user-joined', { user });

        // A broadcast message to the sender only
        socket.emit('update-room', { message: `Welcome to room ${roomid}, ${user}` });
      });

      // Listen for a 'disconnect' event from the client
      socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export default SocketHandler;

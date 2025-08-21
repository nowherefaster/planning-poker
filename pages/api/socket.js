// This is our serverless function that will handle WebSocket connections
import { Server } from 'socket.io';

// We create a global variable to store the socket server instance
// This is a singleton pattern that works well in a serverless environment
let io;

// The main handler for our serverless function
export default function handler(req, res) {
  // If a Socket.IO server instance does not exist, we create one
  if (!res.socket.server.io) {
    console.log('*First use, starting Socket.IO');

    // Create a new Socket.IO server and attach it to the HTTP server
    io = new Server(res.socket.server, {
      path: '/api/socket', // We must specify the path here to match the client
      addTrailingSlash: false // This prevents the client from getting a 404
    });

    // Handle the 'connection' event when a new client connects
    io.on('connection', (socket) => {
      console.log(`New client connected: ${socket.id}`);

      // Handle the 'join-room' event from the client
      socket.on('join-room', ({ roomid, user }) => {
        // Join the specified room
        socket.join(roomid);
        console.log(`${user} joined room ${roomid}`);

        // Emit a message back to the user who just joined
        socket.emit('update-room', {
          message: `Welcome to room ${roomid}, ${user}`
        });

        // Broadcast a message to all other users in the room
        socket.broadcast.to(roomid).emit('user-joined', {
          user: user
        });
      });

      // Handle the 'disconnect' event when a client leaves
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    // Attach the Socket.IO instance to the server so it's not created again
    res.socket.server.io = io;
  } else {
    // If an instance already exists, we just reuse it
    console.log('Socket.IO is already running');
  }

  // End the response to complete the serverless function call
  res.end();
}

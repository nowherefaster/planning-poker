// This is our serverless function that will handle WebSocket connections
import { Server } from 'socket.io';
import http from 'http';

// We create a global variable to store the socket server instance
// This is to prevent creating multiple servers on hot reloads in development
let io;

// The main handler for our serverless function
export default function handler(req, res) {
  // Check if the Socket.IO server is already created
  if (io) {
    console.log('Backend: Reusing existing Socket.IO instance.');
    res.end();
    return;
  }

  // Log that we are starting the server setup
  console.log('Backend: No existing instance found. Starting new Socket.IO server setup...');

  // Create a new HTTP server instance
  const httpServer = new http.Server(req.socket.server);
  
  // Create a new Socket.IO server and attach it to the HTTP server
  io = new Server(httpServer, {
    path: '/api/socket' // We must specify the path here to match the client
  });

  // Log that the Socket.IO server has been created
  console.log('Backend: Socket.IO server instance created.');

  // Handle the 'connection' event when a new client connects
  io.on('connection', (socket) => {
    console.log(`Backend: New client connected with ID: ${socket.id}`);

    // Handle the 'join-room' event from the client
    socket.on('join-room', ({ roomid, user }) => {
      // Join the specified room
      socket.join(roomid);
      console.log(`Backend: ${user} joined room ${roomid}`);

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
      console.log(`Backend: Client disconnected with ID: ${socket.id}`);
    });
  });

  // Attach the Socket.IO server to the HTTP server's 'upgrade' event
  httpServer.listen(0, '0.0.0.0', () => {
    console.log('Backend: HTTP server listening for upgrades.');
    // The following lines are necessary for Vercel to handle the connection
    req.socket.server.on('upgrade', (req, socket, head) => {
      console.log('Backend: Received upgrade request.');
      io.engine.handleUpgrade(req, socket, head);
    });
  });

  // End the response to allow the serverless function to complete
  console.log('Backend: Serverless function response ending.');
  res.end();
}

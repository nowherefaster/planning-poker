// This is our serverless function that will handle WebSocket connections
import { Server } from 'socket.io';
import http from 'http';

// We create a global singleton instance of the HTTP server and the Socket.IO server
let server;
let io;

// The main handler for our serverless function
export default function handler(req, res) {
  // If the server and io instances don't exist, create them
  if (!server) {
    console.log('Backend: Creating new HTTP server and Socket.IO instance.');
    
    // Create the HTTP server
    server = http.createServer();
    
    // Create the Socket.IO server and attach it to the HTTP server
    io = new Server(server, {
      path: '/api/socket' // We must specify the path here to match the client
    });

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
    
    // This is the crucial part for Vercel: handling the 'upgrade' event
    // We attach a listener to the server to handle the WebSocket upgrade
    server.on('upgrade', (req, socket, head) => {
      console.log('Backend: Received upgrade request. Handling...');
      io.engine.handleUpgrade(req, socket, head);
    });
    
    // We now listen on Vercel's internal socket and attach our upgrade listener
    server.listen(req.socket.server);
  } else {
    // If the server already exists, we just handle the request as normal
    console.log('Backend: Reusing existing HTTP server and Socket.IO instance.');
    io.engine.handleRequest(req, res);
  }

  // End the response to allow the serverless function to complete
  res.end();
}

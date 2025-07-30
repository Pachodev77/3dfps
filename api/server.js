const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const players = {};

// Servir archivos estáticos
// Servir archivos estáticos

io.on('connection', (socket) => {
  // Nuevo jugador
  socket.on('new-player', (data) => {
    players[socket.id] = {
      id: socket.id,
      ...data
    };
    // Notifica a todos del nuevo jugador
    socket.broadcast.emit('player-joined', { id: socket.id, ...data });
    // Envía la lista de jugadores actuales al nuevo
    socket.emit('all-players', players);
  });

  // Actualización de estado
  socket.on('update-player', (data) => {
    if (players[socket.id]) {
      players[socket.id] = { ...players[socket.id], ...data };
      socket.broadcast.emit('update-player', { id: socket.id, ...data });
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    delete players[socket.id];
    socket.broadcast.emit('player-left', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Servidor Socket.io escuchando en puerto', PORT);
}); 
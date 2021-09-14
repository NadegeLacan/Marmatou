const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");
const socketIo = require("socket.io");
const http = require("http");
const server = http.createServer(app);
const clients = [];
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});
require("dotenv").config();

app.use(express.json()).use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));


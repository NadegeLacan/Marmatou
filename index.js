const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const path = require("path");
const mysql = require("mysql");
const socketIo = require("socket.io");
const http = require("http");
const server = http.createServer(app);
const public = path.join(__dirname, "/public");
const io = socketIo(server);

app
  .set("view engine", "ejs")
  .use(express.json())
  .use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));

//connect db
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "blabla",
});

connection.connect((err) => {
  if (err) throw err;
  console.log("db connected");
});

app.get(`/`, (req, res) => {
  res.render("index.ejs", { info: "" });
});

app.post("/connection", (req, res) => {
  // console.log(req.body);

  if (req.body.creationCompte) {
    const query = `SELECT * FROM user WHERE pseudo = "${req.body.pseudoConnexion}";`;

    connection.query(query, async function (error, results, fields) {
      if (error) throw error;

      if (results.length != 0) {
        res.status(401).render("index.ejs", { info: "User in use" });
      } else {
        const salt = await bcrypt.genSalt();
        const hashed = await bcrypt.hash(req.body.pwdConnexion, salt);

        // console.log(salt);
        // console.log(hashed);

        const insert = `INSERT INTO user(pseudo,password, connect) 
        VALUES ("${req.body.pseudoConnexion}", "${hashed}", ${false} );`;

        connection.query(insert, function (error, results, fields) {
          if (error) throw error;
          res.status(401).render("index.ejs", { info: "User created" });
        });
      }
    });
  } else {
    const query = `SELECT * FROM user WHERE pseudo = "${req.body.pseudoConnexion}";`;

    connection.query(query, (err, result, fields) => {
      if (err) throw err;

      if (result.length === 0) {
        // console.log("here1");
        res.status(401).render("index.ejs", { info: "Wrong credentials " });
      } else {
        bcrypt.compare(
          req.body.pwdConnexion,
          result[0].password,
          (err, compare) => {
            if (err) throw err;
            // console.log("compare", compare);
            if (compare) {
              // console.log("here2");
              res.status(200).render("chat.ejs", { id: result[0].id });
            } else {
              // console.log("here3");
              res
                .status(401)
                .render("index.ejs", { info: "Wrong credentials" });
            }
          }
        );
      }
    });
  }
});

app.get("/messages", (req, res) => {
  console.log("receiver:", req.headers.receiver);

  const query = `
  SELECT * FROM messages 
  INER JOIN salon 
    ON salon.id = message.id_salon
  WHERE  salon.nom= ${req.headers.salon};`;

  connection.query(query, (err, results) => {
    if (err) throw err;
  });
});

app.get("/salons", (req, res) => {
  const query = `
  SELECT nom FROM salons;`;

  connection.query(query, (err, results) => {
    if (err) throw err;
  });
});

// SOCKET CONNECTIONS

io.on("connection", (socket) => {
  // console.log("hdshfakl");
  // console.log();

  socket.on("createSalon", (data) => {
    const checkSalon = `SELECT * FROM salon WHERE nom= "${data.name}";`;
    const insertSalon = `
    INSERT INTO salon(nom)
    VALUES("${data.name}");`;

    connection.query(checkSalon, (err, resultCheck) => {
      if (err) throw err;
      // console.log(resultCheck);
      // console.log("gshjdfjsd", resultCheck.length);
      if (resultCheck.length === 0) {
        // console.log("im in");
        connection.query(insertSalon, (error, resultInsert) => {
          if (error) throw error;
          // console.log("inserResult: ", resultInsert);
          // console.log("ID: ", resultInsert.insertId);

          const insertClient = `
            INSERT INTO appartenir()
            VALUES(${resultInsert.insertId}, ${socket.handshake.query.id})`;

          // console.log(insertClient);

          connection.query(insertClient, (error3, resultAppartenir) => {
            if (error3) throw error3;
            // console.log("inserted");

            io.emit("newGroup", { name: data.name });

            //TODO: recevoir event dans le client, BONNE APETIT
          });
        });
      }
    });
  });

  socket.on("newMsg", (data) => {
    // console.log("jdshfkjfgsdf");
    // console.log(data);
    const select = `SELECT  pseudo from user WHERE id = ${socket.handshake.query.id}`;
    const query = `
    INSERT INTO message (contenu, spoiler, format_code, id_user)
    VALUES("${data.msg}", ${false}, ${false}, ${socket.handshake.query.id} )  `;

    connection.query(select, (err, resultsSelect) => {
      if (err) throw err;
      // console.log(resultsSelect[0].pseudo);

      connection.query(query, (error, resultsInsert) => {
        if (error) throw error;

        socket.broadcast.emit("msgIncoming", {
          msg: data.msg,
          senderID: data.sender,
          senderPseudo: resultsSelect[0].pseudo,
        });
      });
    });
  });
});

server.listen(8080, () => console.log("Server running"));

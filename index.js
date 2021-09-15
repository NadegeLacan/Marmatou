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
  .use(express.static(public));
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

// ##### HTTP ROUTES ###

// index
app.get(`/`, (req, res) => {
  res.render("index.ejs", { info: "" });
});

      // CONNEXION
app.post("/connection", (req, res) => {

  //si utilisateur veut créer un compte
  if (req.body.creationCompte) { 
    const query = `SELECT * FROM user WHERE pseudo = "${req.body.pseudoConnexion}";`;

    //check si pseudo exist deja
    connection.query(query, async function (error, results, fields) {
      if (error) throw error;

      if (results.length != 0) {
        res.status(401).render("index.ejs", { info: "User in use" });
      } else {

        //encrypt
        const salt = await bcrypt.genSalt();
        const hashed = await bcrypt.hash(req.body.pwdConnexion, salt);

        const insert = `INSERT INTO user(pseudo,password, connect) 
        VALUES ("${req.body.pseudoConnexion}", "${hashed}", ${false} );`;

        // add to database sinon
        connection.query(insert, function (error, results, fields) {
          if (error) throw error;
          res.status(201).render("index.ejs", { info: "User created" });
        });
      }
    });
  } else {

    //s'il veut se connecter
    const query = `SELECT * FROM user WHERE pseudo = "${req.body.pseudoConnexion}";`;

    //check s'il existe
    connection.query(query, (err, result, fields) => {
      if (err) throw err;

      if (result.length === 0) {
        
        res.status(401).render("index.ejs", { info: "Wrong credentials " });
      } else {
        //check si la password est correct
        bcrypt.compare(
          req.body.pwdConnexion,
          result[0].password,
          (err, compare) => {
            if (err) throw err;
          
            if (compare) {
              
            // réponds avec la page de chat si correct
              res.status(200).render("chat.ejs", { id: result[0].id });
            } else {
              
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

//FETCH MESSAGES

app.get("/messages", (req, res) => {

  const query = `
  SELECT *, pseudo FROM message 
  INNER JOIN user
    ON user.id = message.id_user
  WHERE id_salon= ${req.headers.salon};`;

  connection.query(query, (err, results) => {
    if (err) throw err;
    res.send(results);
  });
});

//FETCH SALONS

app.get("/salons", (req, res) => {
  const query = `
  SELECT nom, id FROM salon;`;

  connection.query(query, (err, results) => {
    if (err) throw err;

 
    res.send(results);
  });
});

// SOCKET CONNECTIONS

io.on("connection", (socket) => {

  //les sockets sont crees avec un room default, ici je l'elimine pour la placer dans notre sale public

  socket.rooms.forEach((room) => {
    socket.leave(room);
  });

  socket.join(1);


  socket.on("newMsg", (data) => {
 

    const select = `SELECT  pseudo from user WHERE id = ${socket.handshake.query.id}`;
    const query = `
    INSERT INTO message (contenu, spoiler, format_code, id_user, id_salon)
    VALUES("${data.msg}", ${false}, ${false}, ${socket.handshake.query.id}, ${data.salonId}) ; `;
    // cherche le pseudo de l'émetteur
    connection.query(select, (err, resultsSelect) => {
      if (err) throw err;
      //insert le message dans bdd
      connection.query(query, (error, resultsInsert) => {
        if (error) throw error;
      // broadcast le message a toutes les sockets dans le salon
        io.sockets.in(data.salonId).emit("msgIncoming", {
          msg: data.msg,
          senderId: socket.handshake.query.id,
          senderPseudo: resultsSelect[0].pseudo,
        });
      });
    });
  });


  socket.on("createSalon", (data) => {
    
    const checkSalon = `SELECT * FROM salon WHERE nom= "${data.name}";`;
    const insertSalon = `
    INSERT INTO salon(nom)
    VALUES("${data.name}");`;
  //check si salon existe deja
    connection.query(checkSalon, (err, resultCheck) => {
      if (err) throw err;
      if (resultCheck.length === 0) {
        // insert salon dans bdd
        connection.query(insertSalon, (error, resultInsert) => {
          if (error) throw error;
          
          io.emit("newSalon", { name: data.name, id: resultInsert.insertId });

          const insertClient = `
            INSERT INTO appartenir()
            VALUES(${resultInsert.insertId}, ${socket.handshake.query.id})`; 
            
          // insert dans la table appartenir qui sers pas a grand chose vu q'uon n'a pas creer un moyen de inviter des gens
          connection.query(insertClient, (error3, resultAppartenir) => {
            if (error3) throw error3;

          });
        });
      }else{
        //si vous voulais envoyer un reponse vers la page en disant que le groupe existe deja faite le ici xd
      }
    });
  });


  socket.on("changeSalon", (data) => {
    socket.rooms.forEach((room) => {
      socket.leave(room); // sors de la room precedente
    });

    socket.join(data.salonId); // join la nouvelle
  });

});


server.listen(8080, () => console.log("Server running"));

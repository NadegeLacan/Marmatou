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
const multer = require("multer");


app.set('view engine', 'ejs').use(express.json()).use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));



//connect db
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "blabla",
});

const upload = multer({
  dest: "C:/Users/Utilisateur/Documents/GitHub/Marmatou/temp"
  
});

const handleError = (err, res) => {
  res
    .status(500)
    .contentType("text/plain")
    .end(err + "<br>Oops! Something went wrong!");
};



connection.connect((err) => {
  if (err) throw err;
  console.log("db connected");
});

app.get(`/`, (req,res)=>{
  res.render("index.ejs", {info:""});
});


app.post("/connection", (req,res)=>{
  console.log(req.body);

  if(req.body.creationCompte){
    const query = `SELECT * FROM user WHERE pseudo = "${req.body.pseudoConnexion}";`;

    connection.query(query, async function (error, results, fields) {
      if (error) throw error;

      if (results.length != 0) {
        res.status(401).render("index.ejs", {info:"User in use"});
      } else {
        const salt = await bcrypt.genSalt();
        const hashed = await bcrypt.hash(req.body.pwdConnexion, salt);

        console.log(salt);
        console.log(hashed);

        const insert = `INSERT INTO user(pseudo,password, connect) 
        VALUES ("${req.body.pseudoConnexion}", "${hashed}", ${false} );`;

        connection.query(insert, function (error, results, fields) {
          if (error) throw error;
          res.status(401).render("index.ejs", {info:"User created"});
        });
      }
    });
  }

  else{
    const query = `SELECT * FROM user WHERE pseudo = "${req.body.pseudoConnexion}";`;

    connection.query(query, (err, result, fields) => {
    if (err) throw err;
    

    if (result.length === 0) {
      console.log("here1");
      res.status(401).render("index.ejs", {info:"Wrong credentials "});
    } else {
      bcrypt.compare(req.body.pwdConnexion, result[0].password, (err, compare) => {
        if (err) throw err;
        console.log("compare", compare);
        if (compare) {
          console.log("here2");
          res.status(401).render("chat.ejs", {id:result[0].id});
        } else {
          console.log("here3");
          res.status(401).render("index.ejs", {info:"Wrong credentials"});
        }
      });
    }
  })
}
});

app.post("/addProfilpic", upload.single("profilPicEntry"), (req,res)=>{

  let hasError = Uploadimage(req.body["prodId"], req.file.path, `public/media/profil-picture/`);
           
  if (hasError ) {
      return handleError(err, res);
  } else {
      res.status(200)
          .contentType("text/plain")
          .end("File uploaded!");


});


function Uploadimage ( id, fPath, tPath ) {
  /* fonction ajout d'image */ 

  const targetPath = path.join(__dirname,`${tPath}${id}.jpg`);

  fs.rename(fPath, targetPath, err => {
      if (err) {
          return false;
      } else {
          return true;
      }
  });
}



server.listen(8080, () => console.log("Server running"));


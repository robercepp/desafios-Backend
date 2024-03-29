const express = require ('express')
const router = express.Router()
const { fork } = require("child_process");
const logger = require("../logger.js");
const { listAllUsers, createUser, findUser } = require("../controllers/usuarios.js");
const prod = require("../controllers/productos.js");
const { getAllChats } = require("../controllers/chat.js");
const passport = require("passport");

//GraphQl
const {graphqlHTTP} = require('express-graphql')
const {schema} = require ('../graphql/typeDefs.js')
const {root} = require ('../controllers/graphql.js')

//Principal (frontend)
router.get("/login", notAuth, async (req, res) => {
  logger.info(`ruta: '/login' - método: get peticionada`);
  res.render("login", { titulo: "Login de usuario" });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.get("/", auth, async (req, res) => {
  logger.info(`ruta: '/' - método: get peticionada`);
  res.render("main", {
    email: req.user.email,
    titulo: "Pagina principal",
    mensajes: getAllChats(),
  });
});

router.get("/logout", auth, async (req, res) => {
  logger.info(`ruta: '/logout' - método: get peticionada`);
  res.render("logout", { usuario: req.user.email, titulo: "cierre de sesión" });
});

router.get("/exit", (req, res) => {
  logger.info(`ruta: '/exit' - método: get peticionada`);
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

//Manejo de usuarios (FRONTEND)
router.get("/register", notAuth, (req, res) => {
  logger.info(`ruta: '/register' - método: get peticionada`);
  res.render("register", { titulo: "Registro de usuario nuevo" });
});

router.post("/register", notAuth, async (req, res) => {
  logger.info(`ruta: '/register' - método: post peticionada`);
  if ((await findUser(req.body.email)) !== null) {
    res.render("register", {
      titulo: "Registro de usuario nuevo",
      error: "El usuario ya existe",
    });
  } else {
    try {
      createUser(req.body);
      res.redirect("/login");
    } catch (error) {
      console.log(error);
      res.redirect("/register");
    }
  }
});

//uso de graphql para manejo de productos y usuarios
router.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true
}))

// //manejo de usuarios (API)
// router.get("/api/usuarios", auth, async (req, res) => {
//   const resultado = await listAllUsers();
//   return res.send(resultado);
// });

// router.post("/api/usuarios", notAuth, async (req, res) => {
//   try {
//     await createUser(req.body);
//   } catch (error) {
//     console.log(error);
//   }
// });

// //manejo de productos (API)
// router.get("/api/productos", prod.listAllProducts);

// router.get("/api/productos/:id", prod.listProductById)

// router.post("/api/productos", prod.createProduct);

// router.put('/api/productos/:id', prod.modifyProduct)

// router.delete('/api/productos/:id', prod.deleteProduct)

//Productos aleatorios
router.get("/api/randoms", auth, async (req, res) => {
  
  const { cant } = req.query;
  const child = fork("./numsAleatorios.js");
  child.send(parseInt(cant));
  child.on("message", (mensaje) => {
    res.render("randoms", { titulo: "Numeros Aleatorios", lista: mensaje });
  });
});

router.get('/api/productos-test', async (req, res) => {
  logger.info(`ruta: '${req.url}' - método: get peticionada`);
  const {cant} = req.query
  res.render("test",{
    titulo: "Pruebas de Productos aleatorios",
    lista: await prod.randomizeProducts(parseInt(cant))
  })
})

router.get("/info", auth, (req, res) => {
  logger.info(`ruta: '${req.url}' - método: get peticionada`);
  res.render("info", { titulo: "Info del Proceso" });
});

router.get("*", async (req, res) => {
  res.json({ error: `error 404, ruta '${req.url}' no encontrada` });
});

//modulos de autorización
function auth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.redirect("/login");
  }
}

function notAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  return next();
}

module.exports = router;

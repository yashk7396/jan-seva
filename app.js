const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "janseva_secret",
  resave: false,
  saveUninitialized: true
}));

// 🔐 AUTH
function checkAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
}

// STORAGE
let tokens = [];

let counters = {
  "Eye Checkup": 0,
  "General Checkup": 0,
  "Lab Test": 0
};

// 🔥 DEFAULT ROUTE
app.get("/", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/admin");
  } else {
    res.redirect("/login");
  }
});

// 🔐 LOGIN
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    req.session.loggedIn = true;
    res.redirect("/admin");
  } else {
    res.send("Invalid Credentials");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// 📝 FORM
app.get("/form", checkAuth, (req, res) => {
  res.render("form");
});

// 🎯 GENERATE TOKEN
app.post("/generate", checkAuth, (req, res) => {
  const { name, phone, service, place } = req.body;

  counters[service] += 1;
  let token_number = counters[service];

  let prefix = service === "Eye Checkup" ? "E"
              : service === "General Checkup" ? "G"
              : "L";

  let display_token = `${prefix}-${token_number}`;

  let now = new Date();
  let slot_time = now.toLocaleTimeString();

  let token = {
    id: Date.now(),
    name,
    phone,
    place,
    service,
    token_number,
    display_token,
    slot_time,
    status: "Waiting",
    called: false
  };

  tokens.push(token);

  res.redirect(`/print/${token.id}`);
});

// 🖨 PRINT
app.get("/print/:id", checkAuth, (req, res) => {
  const token = tokens.find(t => t.id == req.params.id);
  res.render("print", { token });
});

// 📊 ADMIN
app.get("/admin", checkAuth, (req, res) => {
  res.render("admin", { tokens });
});

// 🔔 CALL NEXT
app.get("/call-next/:service", checkAuth, (req, res) => {
  const service = decodeURIComponent(req.params.service);

  let serviceTokens = tokens.filter(t => t.service === service);

  let current = serviceTokens.find(t => t.called);
  if (current) current.called = false;

  let next = serviceTokens.find(t => t.status === "Waiting");

  if (next) {
    next.called = true;
    next.status = "Called";
  }

  res.redirect("/admin");
});
// ✅ DONE
app.get("/done/:id", checkAuth, (req, res) => {
  const token = tokens.find(t => t.id == req.params.id);
  if (token) {
    token.status = "Done";
    token.called = false;
  }
  res.redirect("/admin");
});

// 📺 DISPLAY
app.get("/display", checkAuth, (req, res) => {
  res.render("display", { tokens });
});

// DEBUG
app.get("/tokens", (req, res) => {
  res.json(tokens);
});

// 404
app.use((req, res) => {
  res.status(404).send("Page not found");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

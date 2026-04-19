const express = require("express");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// In-memory storage
let tokens = [];

// Home Form
app.get("/", (req, res) => {
  res.render("form");
});

// Generate Token
app.post("/generate", (req, res) => {
  const { name, phone, service } = req.body;

  if (!name || !phone || !service) {
    return res.status(400).send("All fields are required");
  }

  const token_number = tokens.length + 1;

  const now = new Date();
  let lastTime = new Date(now);

  if (tokens.length > 0) {
    const last = tokens[tokens.length - 1];

    if (last.slot_time) {
      const [time, modifier] = last.slot_time.split(" ");
      let [h, m] = time.split(":").map(Number);

      if (modifier === "PM" && h !== 12) h += 12;
      if (modifier === "AM" && h === 12) h = 0;

      lastTime = new Date(now);
      lastTime.setHours(h, m, 0, 0);
    }
  }

  const baseTime = now > lastTime ? new Date(now) : new Date(lastTime);
  baseTime.setMinutes(baseTime.getMinutes() + 5);

  let hour = baseTime.getHours();
  const minute = baseTime.getMinutes();

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12;

  const slot_time = `${hour}:${minute < 10 ? "0" : ""}${minute} ${ampm}`;

  const token = {
    id: Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    service: service.trim(),
    token_number,
    slot_time,
    status: "Waiting",
    called: false
  };

  tokens.push(token);

  res.redirect(`/print/${token.id}`);
});

// Print Page
app.get("/print/:id", (req, res) => {
  const token = tokens.find(t => t.id == req.params.id);

  if (!token) {
    return res.status(404).send("Token not found");
  }

  res.render("print", { token });
});

// Admin Panel
app.get("/admin", (req, res) => {
  res.render("admin", { tokens });
});

// Call Next Token
app.get("/call-next", (req, res) => {
  const currentCalled = tokens.find(t => t.called);

  if (currentCalled) {
    currentCalled.called = false;

    if (currentCalled.status !== "Done") {
      currentCalled.status = "Waiting";
    }
  }

  const next = tokens.find(t => t.status === "Waiting" && !t.called);

  if (next) {
    next.called = true;
    next.status = "Called";
  }

  res.redirect("/admin");
});

// Mark Done
app.get("/done/:id", (req, res) => {
  const id = Number(req.params.id);
  const token = tokens.find(t => t.id === id);

  if (!token) {
    return res.status(404).send("Token not found");
  }

  token.status = "Done";
  token.called = false;

  res.redirect("/admin");
});

// Display Screen
app.get("/display", (req, res) => {
  res.render("display", { tokens });
});

// Optional JSON route for debug
app.get("/tokens", (req, res) => {
  res.json(tokens);
});

// Optional 404 handler
app.use((req, res) => {
  res.status(404).send("Page not found");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
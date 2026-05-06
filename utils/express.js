import express from "express";
const app = express();
const port = 3000;

app.use("/post", express.json());
app.use("/nocontent", express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Change * to your desired origin if needed
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  // Additional headers you may need to allow

  // Set the allowed methods
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    return res.status(200).json({});
  }

  next();
});

app.post("/post", (req, res) => {
  console.log(req.body);
  res.json(req.body);
});

app.post("/invalidarray", (req, res) => {
  res.json("{1, 2, 3]");
});

app.post("/nocontent", (req, res) => {
  console.log(req.body);
  res.removeHeader("Content-type");
  res.json(req.body);
});

app.post("/form", (req, res) => {
  console.log(req.body);
  res.send(req.body);
});

app.use("/json", express.json());
app.use("/json", express.urlencoded({ extended: true }));
app.post("/json", (req, res) => {
  console.log(req.body);
  res.json(req.body);
});

app.get("/jsonobject", (req, res) => {
  res.json({ name: "Bob", age: 20 });
});

app.post("/hello", (req, res) => {
  console.log(req.body);
  res.send("<div>Hello</div>");
});

app.post("/blob", (req, res) => {
  res.send(req.body);
});

app.head("/head", (req, res) => {
  res.send(req.body);
});

app.delete("/delete", (req, res) => {
  res.send(req.body);
});

app.put("/put", (req, res) => {
  res.json("Hello");
});

app.patch("/patch", (req, res) => {
  res.json("Hello");
});

app.post("/hello", (req, res) => {
  res.json("Hello");
});

app.get("/interpolation", (req, res) => {
  res.send("{{expr}}");
});

app.get("/jsoninterpolation", (req, res) => {
  res.json("{{expr}}");
});

app.get("/now", (req, res) => {
  res.send(Date.now().toString(10));
});

app.get("/scopeinit", (req, res) => {
  res.send('<div ng-init="name=1"></div>');
});

app.get("/directive", (req, res) => {
  res.send("<div><div test></div></div>");
});

app.get("/empty", (req, res) => {
  res.send(" ");
});

app.get("/hello", (req, res) => {
  res.send("Hello");
});

app.get("/div", (req, res) => {
  res.send("<div>Hello</div>");
});

app.get("/stream-html", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.write("<span>{{first}}</span>");
  setTimeout(() => {
    res.write("<span>{{second}}</span>");
    res.end();
  }, 25);
});

app.get("/http-stream-demo", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.flushHeaders?.();

  const chunks = [
    `<article class="chunk-card"><b>Chunk 1</b><span>Connected to fetch stream</span></article>`,
    `<article class="chunk-card"><b>Chunk 2</b><span>Compiled at {{ timestamp }}</span></article>`,
    `<article class="chunk-card"><b>Chunk 3</b><span>Template expression: {{ message }}</span></article>`,
  ];

  chunks.forEach((chunk, index) => {
    setTimeout(() => {
      res.write(chunk);

      if (index === chunks.length - 1) {
        res.end();
      }
    }, index * 700);
  });
});

app.post("/stream-html", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.write("<span>{{first}}</span>");
  setTimeout(() => {
    res.write("<span>{{second}}</span>");
    res.end();
  }, 25);
});

app.put("/stream-html", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.write("<span>{{first}}</span>");
  setTimeout(() => {
    res.write("<span>{{second}}</span>");
    res.end();
  }, 25);
});

app.delete("/stream-html", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.write("<span>{{first}}</span>");
  setTimeout(() => {
    res.write("<span>{{second}}</span>");
    res.end();
  }, 25);
});

app.get("/div-animate", (req, res) => {
  res.send(`<div class='animate'>Hello ${Date.now().toString(10)}</div>`);
});

app.get("/divexpr", (req, res) => {
  res.send("<div>{{expr}}</div>");
});

app.get("/divctrlexpr", (req, res) => {
  res.send("<div>{{$ctrl.expr}}</div>");
});

app.get("/template.html", (req, res) => {
  res.send("<p>template.html</p>");
});

app.get("/circle-svg", (req, res) => {
  res.send("<circle></circle>");
});

app.get("/hello2", (req, res) => {
  res.send("Hello2");
});

app.get("/include", (req, res) => {
  res.send("<div ng-include=\"'/mock/hello'\"></div>");
});

app.get("/third", (req, res) => {
  res.send("<div third>{{1+2}}</div>");
});

app.get("/script", (req, res) => {
  res.send("<div><script>window.SCRIPT_RAN = true;</script></div>");
});

app.get("/401", (req, res) => {
  res.sendStatus(401);
});

app.get("/404", (req, res) => {
  res.sendStatus(404);
});

app.get("/422", (req, res) => {
  res.status(422).send("Invalid data");
});

app.get("/never", () => {
  setTimeout(() => {}, 500);
});

app.get("/my-rect.html", (req, res) => {
  res.send("<g ng-include=\"'/mock/include.svg'\"></g>");
});

app.get("/my-rect2.html", (req, res) => {
  res.send("<g ng-include=\"'/mock/include.svg'\"><a></a></g>");
});

app.get("/include.svg", (req, res) => {
  res.send("<rect></rect><rect></rect>");
});

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// messageSpec.js
app.get("/my-messages", (req, res) => {
  res.send('<div ng-message="required">You did not enter a value</div>');
});

app.use("/posthtml", express.json());
app.use("/posthtml", express.urlencoded({ extended: true }));
app.post("/posthtml", (req, res) => {
  console.log(req.body);
  res.send(`<div>${req.body.name}</div>`);
});

app.use("/posterror", express.json());
app.use("/posterror", express.urlencoded({ extended: true }));
app.post("/posterror", (req, res) => {
  console.log(req.body);
  res.status(422).send(`<div>Error</div>`);
});

app.use("/urlencoded", express.urlencoded({ extended: true }));
app.post("/urlencoded", (req, res) => {
  console.log(req.body); // Access parsed form data
  res.send("Form data: " + req.body.name);
});

// SSE endpoint
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send an initial message
  res.write(`data: Connected to SSE stream\n\n`);

  // Send messages every 2 seconds
  const interval = setInterval(() => {
    const now = new Date();

    // Format hours, minutes, seconds
    const pad = (num) => String(num).padStart(2, "0");
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    res.write(`data: ${timeStr}\n\n`);
  }, 1000);

  // Cleanup when the client closes the connection
  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

app.get("/sse-protocol", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(
    `data: ${JSON.stringify({
      target: "#feed",
      swap: "beforeend",
      html: "<p>Feed</p>",
    })}\n\n`,
  );

  setTimeout(() => {
    res.write(
      `data: ${JSON.stringify({
        target: "#side",
        swap: "innerHTML",
        html: "<p>Side</p>",
      })}\n\n`,
    );
  }, 25);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 1000);

  req.on("close", () => {
    clearInterval(heartbeat);
    res.end();
  });
});

app.get("/sse-protocol-data", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(
    `data: ${JSON.stringify({
      target: "#feed",
      swap: "beforeend",
      data: "<p>Data fallback</p>",
    })}\n\n`,
  );

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 1000);

  req.on("close", () => {
    clearInterval(heartbeat);
    res.end();
  });
});

app.get("/sse-once", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(`data: <p>Raw message</p>\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 1000);

  req.on("close", () => {
    clearInterval(heartbeat);
    res.end();
  });
});

app.get("/sse-custom", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(
    `event: notice\ndata: ${JSON.stringify({
      target: "#feed",
      swap: "beforeend",
      html: "<p>Notice</p>",
    })}\n\n`,
  );

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 1000);

  req.on("close", () => {
    clearInterval(heartbeat);
    res.end();
  });
});

app.get("/sse-demo", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let count = 0;

  const send = () => {
    count++;
    res.write(
      `data: ${JSON.stringify({
        target: "#sse-feed",
        swap: "afterbegin",
        html: `<article class="event-card"><strong>Update ${count}</strong><span>${new Date().toLocaleTimeString()}</span></article>`,
      })}\n\n`,
    );
    res.write(
      `event: stats\ndata: ${JSON.stringify({
        target: "#sse-stats",
        swap: "innerHTML",
        html: `<b>${count}</b> streamed update${count === 1 ? "" : "s"}`,
      })}\n\n`,
    );
  };

  send();

  const interval = setInterval(send, 1500);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

app.get("/eventsoject", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send messages every 2 seconds
  const interval = setInterval(() => {
    const now = new Date();

    // Format hours, minutes, seconds
    const pad = (num) => String(num).padStart(2, "0");
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    res.write(`data: ${JSON.stringify({ time: timeStr })}\n\n`);
  }, 1000);

  // Cleanup when the client closes the connection
  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

let sseRes = undefined;
app.get("/subscribe", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  sseRes = res;

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 2000);

  // Cleanup when the client closes the connection
  req.on("close", () => {
    clearInterval(heartbeat);
    res.end();
  });
});

app.use("/publish", express.json());
app.post("/publish", (req, res) => {
  const message = req.body;

  if (!message || !message.text) {
    return res.status(400).json({ error: "Missing 'text' field" });
  }

  console.log("📨 Received message:", message);

  // Push to all connected SSE clients
  const data = JSON.stringify({
    text: message.text,
    time: new Date().toISOString(),
  });

  if (sseRes) {
    sseRes.write(`data: ${data}\n\n`);
  }

  res.json({ status: "Message sent to SSE client" });
});

const initialTasks = [
  { id: 1, title: "Write API notes", owner: "Ada", status: "Open" },
  { id: 2, title: "Review cache policy", owner: "Lin", status: "Open" },
  { id: 3, title: "Ship REST demo", owner: "Grace", status: "Done" },
];
let tasks = [];
let nextTaskId = 1;

function resetTasks() {
  tasks = initialTasks.map((task) => ({ ...task }));
  nextTaskId = Math.max(...tasks.map((task) => task.id)) + 1;
}

resetTasks();

app.use("/api/tasks", express.json());

app.post("/api/tasks/reset", (req, res) => {
  resetTasks();
  res.json({ data: tasks });
});

app.get("/api/tasks", (req, res) => {
  res.json(tasks);
});

app.get("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return res.sendStatus(404);
  }

  res.json(task);
});

app.post("/api/tasks", (req, res) => {
  const body = req.body || {};
  const task = {
    id: nextTaskId++,
    title: body.title,
    owner: body.owner,
    status: body.status || "Open",
  };

  tasks = [task, ...tasks];
  res.status(201).json(task);
});

app.put("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const current = tasks.find((item) => item.id === id);

  if (!current) {
    return res.sendStatus(404);
  }

  const updated = { ...current, ...(req.body || {}), id };

  tasks = tasks.map((item) => (item.id === id ? updated : item));
  res.json(updated);
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const length = tasks.length;

  tasks = tasks.filter((item) => item.id !== id);

  if (tasks.length === length) {
    return res.sendStatus(404);
  }

  res.status(204).end();
});

app.get("/users", (req, res) => {
  res.json([
    {
      id: 1,
      name: "Bob",
    },
    {
      id: 2,
      name: "Ken",
    },
  ]);
});

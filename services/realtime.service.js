const clients = new Set();

const format = (event, payload) =>
  `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

exports.register = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write("\n");
  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });

  sendStateSnapshot(res);
};

// New clients would otherwise see every machine as offline until its next state change
async function sendStateSnapshot(res) {
  try {
    // required lazily to keep this module free of model dependencies at load time
    const MachineRuntimeState = require("../models/machineRuntimeState.model");
    const states = await MachineRuntimeState.find({});
    if (!clients.has(res)) return;
    for (const s of states) {
      res.write(format("machine-state", {
        machineId: String(s.machine),
        state: s.state,
        health: s.health,
        lastPowerKw: s.lastPowerKw,
        lastSeenAt: s.lastSeenAt,
      }));
    }
  } catch (err) {
    console.error("Realtime snapshot error:", err.message);
  }
}

exports.publish = (event, payload) => {
  const data = format(event, payload);

  for (const client of clients) {
    try {
      client.write(data);
    } catch {
      clients.delete(client);
    }
  }
};

const MachineRuntimeState = require("../models/machineRuntimeState.model");
const realtime = require("./realtime.service");

const STALE_AFTER_MS = 3000;
const DISCONNECTED_AFTER_MS = 10000;

exports.startHealthMonitor = () => {
  setInterval(async () => {
    try {
      const now = Date.now();
      const states = await MachineRuntimeState.find({});

      for (const stateDoc of states) {
        const lastSeen = stateDoc.lastSeenAt
          ? new Date(stateDoc.lastSeenAt).getTime()
          : 0;

        let nextHealth = "healthy";

        if (!lastSeen || now - lastSeen >= DISCONNECTED_AFTER_MS) {
          nextHealth = "disconnected";
        } else if (now - lastSeen >= STALE_AFTER_MS) {
          nextHealth = "stale";
        }

        if (stateDoc.health !== nextHealth) {
          stateDoc.health = nextHealth;
          await stateDoc.save();

          realtime.publish("machine-state", {
            machineId: String(stateDoc.machine),
            state: stateDoc.state,
            health: stateDoc.health,
            lastPowerKw: stateDoc.lastPowerKw,
            lastSeenAt: stateDoc.lastSeenAt,
          });
        }
      }
    } catch (err) {
      console.error("Health monitor error:", err.message);
    }
  }, 1000);
};

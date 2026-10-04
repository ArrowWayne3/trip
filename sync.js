// sync.js: syncs ticks and added activities through /api/state, keeping a copy on this device for offline use.
(() => {
  if (window.storage) return;
  const API = "/api/state", PASS = "trip-passcode", PENDING = "trip-unsynced";
  let key = null, declined = false;
  const say = msg => setTimeout(() => { const el = document.getElementById("status"); if (el) el.textContent = msg; }, 0);
  function passcode() {
    let p = localStorage.getItem(PASS);
    if (!p && !declined) {
      p = (prompt("Trip passcode, to sync between your devices:") || "").trim();
      if (p) localStorage.setItem(PASS, p); else declined = true;
    }
    return p;
  }
  async function call(method, body) {
    const p = passcode();
    if (!p) throw new Error("nopass");
    const r = await fetch(API, { method, body, cache: "no-store", headers: { "x-trip-passcode": p, "Content-Type": "text/plain" } });
    if (r.status === 401) { localStorage.removeItem(PASS); throw new Error("badpass"); }
    if (!r.ok) throw new Error("server");
    return r.json();
  }
  const why = e => e.message === "badpass" ? "Wrong passcode. Changes are saved on this device only; you'll be asked again at your next change."
    : e.message === "nopass" ? "No passcode entered, so changes are saved on this device only. Reload the page to add one."
    : "Saved on this device. It will sync once you're back online.";
  async function push() {
    const v = key && localStorage.getItem(key);
    if (!v) return;
    await call("PUT", v);
    localStorage.removeItem(PENDING);
  }
  window.storage = {
    async get(k) {
      key = k;
      try {
        if (localStorage.getItem(PENDING)) await push();
        else { const r = await call("GET"); if (r.value) localStorage.setItem(k, r.value); }
      } catch (e) {
        say(e.message === "badpass" || e.message === "nopass" ? why(e) : "Offline, so you're seeing what's saved on this device.");
      }
      const v = localStorage.getItem(k);
      if (v === null) throw new Error("not found");
      return { key: k, value: v };
    },
    async set(k, v) {
      key = k;
      localStorage.setItem(k, v);
      localStorage.setItem(PENDING, "1");
      try { await push(); } catch (e) { say(why(e)); }
      return { key: k, value: v };
    },
    async delete(k) { localStorage.removeItem(k); return { key: k, deleted: true }; }
  };
  window.addEventListener("online", () => {
    if (localStorage.getItem(PENDING)) push().then(() => say("All changes synced."), () => {});
  });
})();
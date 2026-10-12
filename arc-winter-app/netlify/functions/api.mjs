// ARC Winter Challenge API — Netlify Function + Netlify Blobs storage.
//   GET  /api/data                      -> { today, athletes:[{id,name}], logs:{ athleteId: { "YYYY-MM-DD": {m, p} } } }
//   POST /api/athletes  {name}          -> { athlete:{id,name}, existed, ...data }
//   POST /api/present   {athleteId, present}        (today only)
//   POST /api/time      {athleteId, date, minutes}  (adds to that day)
import { getStore } from "@netlify/blobs";

const TZ = "America/New_York";

export function todayKey(d = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const bad = (msg, status = 400) => json({ error: msg }, status);

export function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "athlete";
}

async function readAll(athletesStore, logStore) {
  const [{ blobs: aBlobs }, { blobs: lBlobs }] = await Promise.all([athletesStore.list(), logStore.list()]);
  const athletes = (await Promise.all(aBlobs.map((b) => athletesStore.get(b.key, { type: "json" })))).filter(Boolean);
  const logs = {};
  await Promise.all(
    lBlobs.map(async (b) => {
      const v = await logStore.get(b.key, { type: "json" });
      if (v) logs[b.key] = v;
    })
  );
  return { today: todayKey(), athletes, logs };
}

export async function handle(req, stores) {
  const { athletes: athletesStore, logs: logStore } = stores;
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/(\.netlify\/functions\/)?api\/?/, "").replace(/\/$/, "");

  if (req.method === "GET" && route === "data") return json(await readAll(athletesStore, logStore));
  if (req.method !== "POST") return bad("Not found", 404);

  let body;
  try { body = await req.json(); } catch { return bad("Request body must be JSON."); }

  if (route === "athletes") {
    const name = String(body.name || "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (!name) return bad("Type a name first.");
    const all = await readAll(athletesStore, logStore);
    const dup = all.athletes.find((a) => a.name.toLowerCase() === name.toLowerCase());
    if (dup) return json({ athlete: dup, existed: true, ...all });
    let id = slug(name), n = 2;
    while (all.athletes.some((a) => a.id === id)) id = slug(name) + "-" + n++;
    const athlete = { id, name, created: new Date().toISOString() };
    await athletesStore.setJSON(id, athlete);
    return json({ athlete, existed: false, ...(await readAll(athletesStore, logStore)) });
  }

  const athleteId = String(body.athleteId || "");
  if (!athleteId || !(await athletesStore.get(athleteId))) return bad("That athlete is not on the roster.");
  const log = (await logStore.get(athleteId, { type: "json" })) || {};

  if (route === "present") {
    const t = todayKey();
    log[t] = { m: 0, ...log[t], p: !!body.present };
    await logStore.setJSON(athleteId, log);
    return json(await readAll(athletesStore, logStore));
  }

  if (route === "time") {
    const date = String(body.date || "");
    const minutes = Math.round(Number(body.minutes));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Invalid date.");
    if (date > todayKey()) return bad("You can't log time for a future date.");
    if (!(minutes > 0)) return bad("Enter how long you trained.");
    if (minutes > 600) return bad("That's over 10 hours. Check the hours field.");
    const day = log[date] || { m: 0, p: false };
    log[date] = { ...day, m: (Number(day.m) || 0) + minutes };
    await logStore.setJSON(athleteId, log);
    return json(await readAll(athletesStore, logStore));
  }

  return bad("Not found", 404);
}

export default async (req) => {
  try {
    return await handle(req, {
      athletes: getStore({ name: "arc-athletes", consistency: "strong" }),
      logs: getStore({ name: "arc-logs", consistency: "strong" }),
    });
  } catch (e) {
    console.error(e);
    return bad("Something went wrong on the server. Try again.", 500);
  }
};

export const config = { path: "/api/*" };

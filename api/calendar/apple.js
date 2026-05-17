import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({ credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  })});
}

const adminDb = getFirestore();

function parseICSEvents(icsText) {
  const events = [];
  const blocks = icsText.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key) => {
      const match = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return match ? match[1].trim() : "";
    };
    const dtstart = get("DTSTART");
    const date = dtstart.replace(/T.*/, "").replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
    if (!date) return;
    events.push({
      id:     `apple_${get("UID") || Math.random()}`,
      title:  get("SUMMARY") || "Event",
      date,
      source: "apple",
      color:  "#000000",
      allDay: !dtstart.includes("T"),
    });
  }
  return events;
}

async function discoverCalDAVUrl(email, authHeader) {
  // Step 1: discover principal URL
  const propfindRes = await fetch("https://caldav.icloud.com/.well-known/caldav", {
    method: "PROPFIND",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/xml",
      Depth: "0",
    },
    body: `<?xml version="1.0"?><propfind xmlns="DAV:"><prop><current-user-principal/></prop></propfind>`,
    redirect: "follow",
  });

  const text = await propfindRes.text();
  console.log("[Apple] PROPFIND status:", propfindRes.status, "url:", propfindRes.url);

  // Extract principal URL from response
  const principalMatch = text.match(/<href>([^<]*\/principals\/[^<]*)<\/href>/);
  if (principalMatch) {
    const principalUrl = principalMatch[1].startsWith("http")
      ? principalMatch[1]
      : `https://caldav.icloud.com${principalMatch[1]}`;
    
    // Step 2: get calendar home
    const homeRes = await fetch(principalUrl, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/xml",
        Depth: "0",
      },
      body: `<?xml version="1.0"?><propfind xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><prop><c:calendar-home-set/></prop></propfind>`,
    });
    const homeText = await homeRes.text();
    const homeMatch = homeText.match(/<href>([^<]*\/calendars\/[^<]*)<\/href>/);
    if (homeMatch) {
      return homeMatch[1].startsWith("http")
        ? homeMatch[1]
        : `https://caldav.icloud.com${homeMatch[1]}`;
    }
  }

  // Fallback: try direct URL pattern
  const userPart = email.split("@")[0];
  return `https://caldav.icloud.com/${userPart}/calendars/`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "Missing uid" });

  try {
    const doc = await adminDb.doc(`users/${uid}/integrations/apple_calendar`).get();
    if (!doc.exists) return res.status(404).json({ error: "Not connected" });

    const { email, password } = doc.data();
    const decoded = Buffer.from(password, "base64").toString("utf-8");
    const authHeader = `Basic ${Buffer.from(`${email}:${decoded}`).toString("base64")}`;

    const calendarUrl = await discoverCalDAVUrl(email, authHeader);
    console.log("[Apple] using calendar URL:", calendarUrl);

    const now = new Date();
    const start = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const reportRes = await fetch(calendarUrl, {
      method: "REPORT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/xml",
        Depth: "1",
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
<calendar-query xmlns="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:">
  <d:prop><d:getetag/><calendar-data/></d:prop>
  <filter><comp-filter name="VCALENDAR">
    <comp-filter name="VEVENT">
      <time-range start="${start}" end="${end}"/>
    </comp-filter>
  </comp-filter></filter>
</calendar-query>`,
    });

    const xml = await reportRes.text();
    console.log("[Apple] REPORT status:", reportRes.status, "response length:", xml.length);
    
    const icsMatches = xml.match(/BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g) || [];
    const events = icsMatches.flatMap(parseICSEvents).filter(Boolean);

    console.log("[Apple Calendar] returning", events.length, "events");
    res.json({ events });
  } catch (e) {
    console.error("[Apple Calendar fetch]", e);
    res.status(500).json({ error: "Failed to fetch events", detail: e.message });
  }
}

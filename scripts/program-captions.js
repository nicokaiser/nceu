#!/usr/bin/env node
// Prints the program as Markdown photo captions, one heading per day.
//
//   node scripts/program-captions.js [url] > captions.md
//
// Only needs `fetch` (Node 18+). Defaults to the live site; pass another
// program.json URL (e.g. http://localhost:5173/program.json) to override.

const url = process.argv[2] ?? "https://nodeconf.eu/program.json";
const SUFFIX = "at NodeConf EU 2026, Bologna, Italy.";
// Organiser-led sessions are captioned by title only.
const HIDDEN_SPEAKERS = new Set(["NodeConf EU Staff"]);

const res = await fetch(url);
if (!res.ok) {
  console.error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const program = await res.json();
const names = program.speakerNames ?? {};

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function presenters(session) {
  const lead = names[session.speakerId] ?? session.speaker;
  const co = (session.coSpeakerIds ?? []).map((id) => names[id] ?? id);
  return [lead, ...co]
    .filter((name) => name && !HIDDEN_SPEAKERS.has(name))
    .join(" & ");
}

function caption(session) {
  const who = presenters(session);
  return who
    ? `${who} presenting “${session.title}” ${SUFFIX}`
    : `${session.title} ${SUFFIX}`;
}

const out = [];
for (const day of program.days) {
  if (day.sessions.length === 0) continue;

  out.push(`## ${day.label} — ${formatDate(day.date)}`, "");
  for (const session of day.sessions) {
    out.push(caption(session), "");
  }
}

process.stdout.write(out.join("\n"));

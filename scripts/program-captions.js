#!/usr/bin/env node
// Prints the program as Markdown photo captions, one heading per day.
//
//   node scripts/program-captions.js > captions.md
//
// Reads content/program.yaml and the speaker names from content/speakers/*.md.
// Each caption is followed by a Bluesky version that uses the speakers'
// @handles (falling back to their names), e.g. "📸 #NodeConfEU @bengl.dev: Title".

import { readdirSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const CONTENT = new URL("../content/", import.meta.url);
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const SUFFIX = "at NodeConf EU 2026, Bologna, Italy.";
const BLUESKY_PREFIX = "📸 #NodeConfEU";
// Organiser-led sessions are captioned by title only.
const HIDDEN_SPEAKERS = new Set(["NodeConf EU Staff"]);

const program = parseYaml(readFileSync(new URL("program.yaml", CONTENT), "utf8"));
const speakerDir = new URL("speakers/", CONTENT);
// Speaker id → { name, handle }, where handle is the Bluesky handle (if any).
const speakers = Object.fromEntries(
  readdirSync(speakerDir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const match = readFileSync(new URL(f, speakerDir), "utf8").match(FRONTMATTER);
      const data = match ? parseYaml(match[1]) : undefined;
      const bluesky = data?.links?.bluesky;
      const handle = bluesky?.match(/bsky\.app\/profile\/([^/?#]+)/)?.[1];
      return [f.replace(/\.md$/, ""), { name: data?.name, handle }];
    })
    .filter(([, speaker]) => speaker.name),
);

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function presenters(session, useHandles) {
  const lead = speakers[session.speakerId] ?? { name: session.speaker };
  const co = (session.coSpeakerIds ?? []).map((id) => speakers[id] ?? { name: id });
  return [lead, ...co]
    .filter(({ name }) => name && !HIDDEN_SPEAKERS.has(name))
    .map(({ name, handle }) => (useHandles && handle ? `@${handle}` : name))
    .join(" & ");
}

function caption(session, bluesky = false) {
  const who = presenters(session, bluesky);
  if (bluesky) {
    return who
      ? `${BLUESKY_PREFIX} ${who}: ${session.title}`
      : `${BLUESKY_PREFIX} ${session.title}`;
  }
  return who
    ? `${who} presenting “${session.title}” ${SUFFIX}`
    : `${session.title} ${SUFFIX}`;
}

const out = [];
for (const day of program.days) {
  if (day.sessions.length === 0) continue;

  out.push(`## ${day.label} — ${formatDate(day.date)}`, "");
  for (const session of day.sessions) {
    out.push(caption(session), caption(session, true), "");
  }
}

process.stdout.write(out.join("\n"));

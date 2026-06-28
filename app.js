const form = document.querySelector("#notesForm");
const sourceText = document.querySelector("#sourceText");
const noteStyle = document.querySelector("#noteStyle");
const detailLevel = document.querySelector("#detailLevel");
const output = document.querySelector("#notesOutput");
const statusLabel = document.querySelector("#status");
const wordCount = document.querySelector("#wordCount");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const clearInput = document.querySelector("#clearInput");

let currentMarkdown = "";

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function sentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

function keywords(text) {
  const stop = new Set([
    "about", "after", "also", "because", "between", "could", "during", "from", "have", "into",
    "more", "most", "only", "other", "that", "their", "there", "these", "this", "through",
    "were", "when", "where", "which", "while", "with", "would", "your", "using", "uses"
  ]);
  const counts = {};
  words(text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ")).forEach((word) => {
    if (word.length < 4 || stop.has(word)) return;
    counts[word] = (counts[word] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 8)
    .map(([word]) => word);
}

function scoreSentence(sentence, keyTerms, index) {
  const lower = sentence.toLowerCase();
  const termScore = keyTerms.reduce((score, term) => score + (lower.includes(term) ? 2 : 0), 0);
  const signalScore = /important|remember|therefore|because|causes|results|means|supports|affect|compare/i.test(sentence) ? 3 : 0;
  const positionScore = index < 2 ? 2 : 0;
  return termScore + signalScore + positionScore;
}

function chooseSentences(list, keyTerms, count) {
  return list
    .map((sentence, index) => ({ sentence, score: scoreSentence(sentence, keyTerms, index), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
}

function titleCase(text) {
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionItems(list, style) {
  if (style === "meeting") {
    return [
      "Confirm the main decision and owner for each follow-up.",
      "Send a concise recap to attendees with deadlines.",
      "Flag any unresolved questions for the next discussion."
    ];
  }
  if (style === "exam") {
    return [
      "Turn the key points into a one-page revision sheet.",
      "Practice answering each flashcard without looking at the source.",
      "Review weak terms again after a short break."
    ];
  }
  if (style === "research") {
    return [
      "Check the source for evidence, dates, and quoted claims.",
      "Separate findings from assumptions before citing this material.",
      "List follow-up questions for deeper reading."
    ];
  }
  return [
    "Review the summary, then recite the key points from memory.",
    "Add examples for any concept that still feels abstract.",
    "Schedule a quick spaced-repetition review."
  ];
}

function topicTerms(topic) {
  return keywords(topic).length ? keywords(topic) : topic.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5);
}

function buildTopicNotes(topic) {
  const cleanTopic = topic.replace(/\s+/g, " ").trim();
  const displayTopic = titleCase(cleanTopic);
  const detail = Number(detailLevel.value);
  const style = noteStyle.value;
  const terms = topicTerms(cleanTopic);
  const sections = [];
  const md = [];

  const overview = `${displayTopic} is the central topic for these notes. Use this outline to organize definitions, examples, causes, effects, formulas, dates, people, or steps as you study the topic in more depth.`;
  const points = [
    `Define ${displayTopic} in one clear sentence before adding details.`,
    `Identify the most important parts, stages, categories, or principles connected to ${displayTopic}.`,
    `Add one real example and one non-example so the idea is easier to recognize.`,
    `Connect ${displayTopic} to related topics, prior lessons, or practical uses.`,
    `List common mistakes, confusing terms, or exceptions that often appear in questions.`,
    `Summarize why ${displayTopic} matters and what problem it helps explain or solve.`
  ].slice(0, detail * 2 + 2);

  const flashcards = [
    { question: `What is ${displayTopic}?`, answer: `Write a concise definition, then add the most important detail from your textbook, lecture, or source.` },
    { question: `Why is ${displayTopic} important?`, answer: `Explain the purpose, impact, or real-world use of the topic.` },
    { question: `What are the main parts of ${displayTopic}?`, answer: `Break it into categories, stages, features, causes, effects, or examples.` },
    { question: `What is commonly confused with ${displayTopic}?`, answer: `Compare it with a related term and note the key difference.` },
    { question: `How would you explain ${displayTopic} to a beginner?`, answer: `Use plain language and include one simple example.` }
  ].slice(0, Math.max(3, detail + 2));

  const actions = style === "exam"
    ? [`Create a one-page revision sheet for ${displayTopic}.`, "Practice the flashcards without looking at the answers.", "Add likely exam questions from your syllabus."]
    : style === "research"
      ? [`Find two credible sources about ${displayTopic}.`, "Record definitions, evidence, and examples separately.", "Note any gaps or questions for deeper reading."]
      : style === "meeting"
        ? [`Clarify the goal of discussing ${displayTopic}.`, "List decisions, owners, and due dates after the meeting.", "Capture open questions for follow-up."]
        : [`Add source material to make these notes more specific.`, "Rewrite each key point in your own words.", "Review the flashcards after a short break."];

  if (document.querySelector("#includeSummary").checked) {
    sections.push(`<section class="note-section"><h3>Summary</h3><p>${escapeHtml(overview)}</p><div class="tag-row">${terms.map((term) => `<span class="tag">${escapeHtml(titleCase(term))}</span>`).join("")}</div></section>`);
    md.push(`## Summary\n\n${overview}\n\nKey terms: ${terms.join(", ")}`);
  }

  if (document.querySelector("#includeBullets").checked) {
    const label = style === "meeting" ? "Discussion Guide" : style === "research" ? "Research Outline" : "Key Points";
    sections.push(`<section class="note-section"><h3>${label}</h3><ul>${points.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`);
    md.push(`## ${label}\n\n${points.map((item) => `- ${item}`).join("\n")}`);
  }

  if (document.querySelector("#includeFlashcards").checked) {
    sections.push(`<section class="note-section"><h3>Flashcards</h3>${flashcards.map((card) => `<div class="flashcard"><strong>Q: ${escapeHtml(card.question)}</strong><span>A: ${escapeHtml(card.answer)}</span></div>`).join("")}</section>`);
    md.push(`## Flashcards\n\n${flashcards.map((card) => `**Q:** ${card.question}\n\n**A:** ${card.answer}`).join("\n\n")}`);
  }

  if (document.querySelector("#includeActions").checked) {
    sections.push(`<section class="note-section"><h3>Next Actions</h3><ol>${actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>`);
    md.push(`## Next Actions\n\n${actions.map((item) => `1. ${item}`).join("\n")}`);
  }

  return {
    html: sections.join(""),
    markdown: `# ${displayTopic} Notes\n\n${md.join("\n\n")}`
  };
}

function renderApiNotes(data, include) {
  const sections = [];
  const md = [];
  const title = data.title || "AI Notes";
  const keyTerms = Array.isArray(data.keyTerms) ? data.keyTerms : [];
  const keyPoints = Array.isArray(data.keyPoints) ? data.keyPoints : [];
  const flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];
  const actions = Array.isArray(data.actions) ? data.actions : [];

  if (include.summary) {
    sections.push(`<section class="note-section"><h3>Summary</h3><p>${escapeHtml(data.summary || "")}</p><div class="tag-row">${keyTerms.map((term) => `<span class="tag">${escapeHtml(term)}</span>`).join("")}</div></section>`);
    md.push(`## Summary\n\n${data.summary || ""}\n\nKey terms: ${keyTerms.join(", ")}`);
  }

  if (include.bullets) {
    sections.push(`<section class="note-section"><h3>Key Points</h3><ul>${keyPoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`);
    md.push(`## Key Points\n\n${keyPoints.map((item) => `- ${item}`).join("\n")}`);
  }

  if (include.flashcards) {
    sections.push(`<section class="note-section"><h3>Flashcards</h3>${flashcards.map((card) => `<div class="flashcard"><strong>Q: ${escapeHtml(card.question || "")}</strong><span>A: ${escapeHtml(card.answer || "")}</span></div>`).join("")}</section>`);
    md.push(`## Flashcards\n\n${flashcards.map((card) => `**Q:** ${card.question || ""}\n\n**A:** ${card.answer || ""}`).join("\n\n")}`);
  }

  if (include.actions) {
    sections.push(`<section class="note-section"><h3>Next Actions</h3><ol>${actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>`);
    md.push(`## Next Actions\n\n${actions.map((item) => `1. ${item}`).join("\n")}`);
  }

  return {
    html: sections.join(""),
    markdown: `# ${title}\n\n${md.join("\n\n")}`
  };
}

async function generateWithBackend(text, include) {
  const response = await fetch("/api/generate-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      style: noteStyle.value,
      detail: Number(detailLevel.value),
      includes: include
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Backend generation failed");
  }

  return response.json();
}

function buildNotes(text) {
  const sentenceList = sentences(text);
  const keyTerms = keywords(text);
  const detail = Number(detailLevel.value);
  const summaryCount = Math.min(sentenceList.length, detail + 1);
  const bulletCount = Math.min(sentenceList.length, detail * 3);
  const chosenSummary = chooseSentences(sentenceList, keyTerms, summaryCount);
  const chosenBullets = chooseSentences(sentenceList, keyTerms, bulletCount);
  const style = noteStyle.value;
  const sections = [];
  const md = [];

  if (document.querySelector("#includeSummary").checked) {
    const summary = chosenSummary.join(" ");
    sections.push(`<section class="note-section"><h3>Summary</h3><p>${escapeHtml(summary)}</p><div class="tag-row">${keyTerms.map((term) => `<span class="tag">${escapeHtml(titleCase(term))}</span>`).join("")}</div></section>`);
    md.push(`## Summary\n\n${summary}\n\nKey terms: ${keyTerms.join(", ")}`);
  }

  if (document.querySelector("#includeBullets").checked) {
    const label = style === "meeting" ? "Decisions & Discussion" : style === "research" ? "Findings" : "Key Points";
    sections.push(`<section class="note-section"><h3>${label}</h3><ul>${chosenBullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`);
    md.push(`## ${label}\n\n${chosenBullets.map((item) => `- ${item}`).join("\n")}`);
  }

  if (document.querySelector("#includeFlashcards").checked) {
    const cards = keyTerms.slice(0, Math.max(3, detail + 2)).map((term) => {
      const answer = sentenceList.find((sentence) => sentence.toLowerCase().includes(term)) || `Review how ${term} connects to the main topic.`;
      return { question: `What should you remember about ${term}?`, answer };
    });
    sections.push(`<section class="note-section"><h3>Flashcards</h3>${cards.map((card) => `<div class="flashcard"><strong>Q: ${escapeHtml(card.question)}</strong><span>A: ${escapeHtml(card.answer)}</span></div>`).join("")}</section>`);
    md.push(`## Flashcards\n\n${cards.map((card) => `**Q:** ${card.question}\n\n**A:** ${card.answer}`).join("\n\n")}`);
  }

  if (document.querySelector("#includeActions").checked) {
    const actions = actionItems(sentenceList, style);
    sections.push(`<section class="note-section"><h3>Next Actions</h3><ol>${actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>`);
    md.push(`## Next Actions\n\n${actions.map((item) => `1. ${item}`).join("\n")}`);
  }

  return {
    html: sections.join(""),
    markdown: `# AI Notes\n\n${md.join("\n\n")}`
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function setStatus(message) {
  statusLabel.textContent = message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = sourceText.value.trim();
  const count = words(text).length;
  const include = {
    summary: document.querySelector("#includeSummary").checked,
    bullets: document.querySelector("#includeBullets").checked,
    flashcards: document.querySelector("#includeFlashcards").checked,
    actions: document.querySelector("#includeActions").checked
  };
  wordCount.textContent = `${count} word${count === 1 ? "" : "s"} analyzed`;

  if (!text) {
    setStatus("Needs topic");
    output.innerHTML = `<div class="empty-state"><div class="mark">AI</div><h3>Add a topic or source text</h3><p>Type a topic such as machine learning, or paste a paragraph for more specific notes.</p></div>`;
    currentMarkdown = "";
    return;
  }

  setStatus("Generating");

  try {
    const apiNotes = await generateWithBackend(text, include);
    const notes = renderApiNotes(apiNotes, include);
    output.innerHTML = notes.html;
    currentMarkdown = notes.markdown;
    wordCount.textContent = apiNotes.mode === "topic" ? `Topic mode: ${text}` : `${count} word${count === 1 ? "" : "s"} analyzed`;
    setStatus("AI generated");
    return;
  } catch (error) {
    setStatus("Local fallback");
  }

  if (count < 12) {
    const notes = buildTopicNotes(text);
    output.innerHTML = notes.html;
    currentMarkdown = notes.markdown;
    wordCount.textContent = `Topic mode: ${text}`;
    setStatus("Generated");
    return;
  }

  const notes = buildNotes(text);
  output.innerHTML = notes.html;
  currentMarkdown = notes.markdown;
  setStatus("Generated");
});

copyBtn.addEventListener("click", async () => {
  if (!currentMarkdown) return setStatus("Nothing yet");
  try {
    await navigator.clipboard.writeText(currentMarkdown);
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = currentMarkdown;
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }
  setStatus("Copied");
});

downloadBtn.addEventListener("click", () => {
  if (!currentMarkdown) return setStatus("Nothing yet");
  const blob = new Blob([currentMarkdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ai-notes.md";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Downloaded");
});

clearInput.addEventListener("click", () => {
  sourceText.value = "";
  output.innerHTML = `<div class="empty-state"><div class="mark">AI</div><h3>Your notes will appear here</h3><p>Type any topic or paste your own text, then generate notes from that input.</p></div>`;
  wordCount.textContent = "0 words analyzed";
  currentMarkdown = "";
  sourceText.focus();
  setStatus("Cleared");
});

if (/photosynthesis/i.test(sourceText.value)) {
  sourceText.value = "";
  setStatus("Old sample cleared");
}

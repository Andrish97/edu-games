export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/word/random") {
      return handleRandom(env);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleRandom(env) {
  const len = 5;

  const prompt = `
Podaj 50 polskich słów o długości ${len} liter jako JSON array.
Bez liter q, x, v.
Tylko małe litery.
`.trim();

  const hfResponse = await fetch(env.HF_MODEL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + env.HF_API_TOKEN,
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  const txt = await hfResponse.text();
  let arr = [];

  try {
    arr = JSON.parse(txt);
  } catch (_) {
    arr = txt
      .replace(/[\[\]"']/g, " ")
      .split(/[\s,]+/)
      .filter(Boolean);
  }

  const clean = arr
    .map((w) => w.toLowerCase().replace(/[^a-ząćęłńóśżź]/g, ""))
    .filter((w) => w.length === len);

  if (!clean.length) {
    return new Response(JSON.stringify({ error: "empty list" }), {
      status: 500,
    });
  }

  const word = clean[Math.floor(Math.random() * clean.length)];

  return new Response(JSON.stringify({ word }), {
    headers: { "Content-Type": "application/json" },
  });
}

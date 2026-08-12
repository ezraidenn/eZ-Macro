// Lista los modelos de visión disponibles para la API key configurada (solo lectura)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const res = await fetch("https://api.openai.com/v1/models", {
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
});
if (!res.ok) {
  console.error("Error:", res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
const ids = data.data.map((m) => m.id).sort();
const relevant = ids.filter((id) => /^(gpt-5|gpt-4o|gpt-4\.1|o3|o4)/.test(id));
console.log(relevant.join("\n"));

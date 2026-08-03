// const fs = require("fs");

// // 1. Wczytaj surowy plik
// const raw = fs.readFileSync("output_pierwsza.json", "utf8");

// // TODO: w zależności od formatu:
// // - jeśli to jest już tablica => JSON.parse(raw)
// // - jeśli JSONL => split('\n'), JSON.parse każdej linii
// // - jeśli log/tekst => trzeba wyciągnąć obiekty

// // PRZYKŁAD 1: jeśli output_pierwsza.json to już jedna TABLICA JSON:
// let docs;
// try {
//   docs = JSON.parse(raw);
//   if (!Array.isArray(docs)) {
//     throw new Error("Root nie jest tablicą");
//   }
// } catch (e) {
//   console.error("Błąd JSON.parse:", e.message);
//   process.exit(1);
// }

// // 2. Przemapuj dokumenty do ujednoliconej postaci
// const cleaned = docs.map((doc, i) => {
//   const url = doc.url || doc.link || "";
//   const title = doc.title || doc.tytul || `Dokument ${i}`;
//   const body = doc.body_text || doc.body || doc.cleanedText || doc.text || "";

//   return {
//     url,
//     title,
//     body_text: body,
//     source: "ergosystem.pl",
//   };
// });

// // 3. Zapisz jako output_clean.json
// fs.writeFileSync("output_clean.json", JSON.stringify(cleaned, null, 2), "utf8");
// console.log("Zapisano output_clean.json z", cleaned.length, "dokumentami");

// const fs = require("fs");

// // 1. Wczytaj surowy plik
// const raw = fs.readFileSync("output_pierwsza.json", "utf8");

// // JSONL: jedna struktura JSON na linię
// const lines = raw
//   .split(/\r?\n/)
//   .map((l) => l.trim())
//   .filter((l) => l.length > 0);

// let docs = [];
// for (const [idx, line] of lines.entries()) {
//   try {
//     docs.push(JSON.parse(line));
//   } catch (e) {
//     console.error(`Błąd JSON.parse w linii ${idx + 1}:`, e.message);
//   }
// }

// // 2. Przemapuj dokumenty do ujednoliconej postaci
// const cleaned = docs.map((doc, i) => {
//   const url = doc.url || doc.link || "";
//   const title = doc.title || doc.tytul || `Dokument ${i}`;
//   const body = doc.body_text || doc.body || doc.cleanedText || doc.text || "";

//   return {
//     url,
//     title,
//     body_text: body,
//     source: "ergosystem.pl",
//   };
// });

// // 3. Zapisz wynik
// fs.writeFileSync("output_clean.json", JSON.stringify(cleaned, null, 2), "utf8");
// console.log("Zapisano output_clean.json z", cleaned.length, "dokumentami");

const fs = require("fs");

const raw = fs.readFileSync("output_pierwsza.json", "utf8");

const lines = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

let docs = [];
for (const [idx, line] of lines.entries()) {
  // próbujemy wyciągnąć fragment między pierwszym '{' a ostatnim '}'
  const firstBrace = line.indexOf("{");
  const lastBrace = line.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error(`Pomijam linię ${idx + 1}: brak kompletnego obiektu JSON`);
    continue;
  }

  const jsonFragment = line.slice(firstBrace, lastBrace + 1);

  try {
    docs.push(JSON.parse(jsonFragment));
  } catch (e) {
    console.error(`Błąd JSON.parse w linii ${idx + 1}:`, e.message);
  }
}

const cleaned = docs.map((doc, i) => {
  const url = doc.url || doc.link || "";
  const title = doc.title || doc.tytul || `Dokument ${i}`;
  const body = doc.body_text || doc.body || doc.cleanedText || doc.text || "";

  return {
    url,
    title,
    body_text: body,
    source: "ergosystem.pl",
  };
});

fs.writeFileSync("output_clean.json", JSON.stringify(cleaned, null, 2), "utf8");
console.log("Zapisano output_clean.json z", cleaned.length, "dokumentami");

const item = $input.first().json;

const toArray = (v) =>
  Array.isArray(v) ? v : v == null || v === "" ? [] : [v];

const cleanText = (v) =>
  String(v || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniq = (arr) => [...new Set(arr.map(cleanText).filter(Boolean))];

const removeEmptyLike = (arr) => uniq(arr).filter((v) => !/^pusty$/i.test(v));

const decodeSafe = (v) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

const opis = removeEmptyLike(toArray(item.opis));
const naglowki = removeEmptyLike(toArray(item.naglowki));
const linki = removeEmptyLike(toArray(item.linki));

const tekstTelefonu = removeEmptyLike(
  toArray(item.tekst_telefonu || item.telefon_text),
);

const telefonHref = removeEmptyLike(
  toArray(item.telefon_href).map((v) =>
    cleanText(decodeSafe(v))
      .replace(/^tel\.?:/i, "")
      .trim(),
  ),
);

const emailHref = removeEmptyLike(
  toArray(item["adres e-mail_href"] || item.email_href).map((v) =>
    cleanText(v).replace(/^mailto:/i, ""),
  ),
);

const wwwHref = removeEmptyLike(
  toArray(item.www_href).map((v) => cleanText(decodeSafe(v))),
);

const formularzNazwy = removeEmptyLike(
  toArray(item.formularz_nazw_wejściowych || item.formularz_input_names),
);

const formularzPlaceholders = removeEmptyLike(
  toArray(item.formularz_placeholders),
);

const formularzOpcje = removeEmptyLike(toArray(item.formularz_select_options));

const cena = removeEmptyLike(toArray(item.cena));
const tytul = cleanText(item.tytuł || item.tytul || "");

const telefonFinal = tekstTelefonu[0] || telefonHref[0] || "";
const emailFinal = emailHref[0] || "";
const wwwFinal =
  wwwHref.find((v) => /^https?:\/\//i.test(v)) || wwwHref[0] || "";

const oferta = opis.filter(
  (v) =>
    !/radosław|włodarczyk|@ergosystem|tel\.|mailto:|wprowadź swój|treść twojej wiadomości/i.test(
      v,
    ),
);

const kontakt = {
  telefon: telefonFinal,
  telefony: uniq([...tekstTelefonu, ...telefonHref]),
  email: emailFinal,
  emaile: emailHref,
  www: wwwFinal,
  linki: wwwHref,
};

const formularz = {
  nazwyPol: formularzNazwy,
  placeholders: formularzPlaceholders,
  opcjeSelect: formularzOpcje,
};

const nawigacja = naglowki.filter(
  (v) => !/^kompleksowe rozwiązania do biur$/i.test(v) || naglowki.length === 1,
);

const messageInputRaw =
  item["Message input"] ??
  item.chatInput ??
  item.userMessage ??
  item.body?.chatInput ??
  item.body?.message ??
  "[BRAK PYTANIA UŻYTKOWNIKA]";

const messageInput = cleanText(messageInputRaw);

return [
  {
    json: {
      "Message input": messageInput,
      _debug_keys: Object.keys(item),
      tytul,
      cena,
      oferta,
      opis,
      naglowki,
      nawigacja,
      kontakt,
      formularz,
      linki,
    },
  },
];

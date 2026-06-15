import os
import re
import pandas as pd

SOURCE_DIR = r"C:\1\T4\jdszr24-grupa-4\SKRAPOWANIE\SKRAP_DED\DATA\LINKI"
OUTPUT_FILE = r"C:\1\T4\jdszr24-grupa-4\SKRAPOWANIE\SKRAP_DED\DATA\faq_input.csv"

def normalize_domain(raw: str) -> str:
    """
    Zwraca sensowny URL na podstawie wartości typu 'forte.com.pl biznes-meble'
    -> 'https://forte.com.pl'
    """
    if not isinstance(raw, str):
        return None
    txt = raw.strip()

    # odetnij wszystko po pierwszej spacji
    first_part = txt.split()[0]

    # usuń ewentualne prefiksy 'http://', 'https://'
    first_part = re.sub(r"^https?://", "", first_part, flags=re.IGNORECASE)

    # gdy brakuje kropki, raczej nie jest to domena
    if "." not in first_part:
        return None

    return "https://" + first_part.strip("/")

def is_probably_domain(raw: str) -> bool:
    if not isinstance(raw, str):
        return False
    raw = raw.strip()
    # prosta heurystyka: zawiera kropkę i żadnych spacji
    if " " in raw:
        raw = raw.split()[0]
    return "." in raw

# 1. Wczytaj istniejące URL-e
existing_urls = []
if os.path.isfile(OUTPUT_FILE):
    try:
        existing_df = pd.read_csv(OUTPUT_FILE, dtype=str, encoding="utf-8")
        if "url" in existing_df.columns:
            existing_urls = [
                str(v).strip()
                for v in existing_df["url"].dropna().astype(str)
                if str(v).strip()
            ]
    except Exception as e:
        print(f"Nie udało się wczytać istniejącego faq_input.csv: {e}")

all_urls = list(existing_urls)

# 2. Przetwarzanie plików z katalogu LINKI
for fname in os.listdir(SOURCE_DIR):
    if not fname.lower().endswith(".csv"):
        continue
    fpath = os.path.join(SOURCE_DIR, fname)
    print(f"Przetwarzam: {fpath}")

    try:
        df = pd.read_csv(
            fpath,
            dtype=str,
            encoding="utf-8",
            sep=None,
            engine="python"
        )
    except Exception:
        try:
            df = pd.read_csv(fpath, dtype=str, encoding="utf-8")
        except Exception as e:
            print(f"Pomijam {fpath} (błąd: {e})")
            continue

    # Szukamy kolumn o nazwach sugerujących domenę / stronę
    col_candidates = [c for c in df.columns
                      if any(k in c.lower() for k in ["strona", "url", "link", "www", "adres"])]

    if not col_candidates:
        # jeśli nic nie znaleziono po nazwie, weź wszystkie i filtruj heurystyką
        col_candidates = list(df.columns)

    for col in col_candidates:
        for v in df[col].dropna().astype(str):
            v = v.strip()
            # Jeżeli wygląda na domenę albo zaczyna się od www / zawiera kropkę
            if is_probably_domain(v):
                url = normalize_domain(v)
                if url:
                    all_urls.append(url)

# 3. Deduplikacja (stare + nowe)
seen = set()
unique_urls = []
for url in all_urls:
    if url not in seen:
        seen.add(url)
        unique_urls.append(url)

# 4. Zapis do faq_input.csv
out_df = pd.DataFrame({"url": unique_urls})
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
out_df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

print(f"Zapisano {len(unique_urls)} unikalnych URL-i do {OUTPUT_FILE}")

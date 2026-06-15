# A nie możemy? Diagnozować? Jeżeli po diagnozie mamy wyniki pozytywne, na przykład na. Dwóch kolejnych. Pytaniach, to przechodzimy do scrapowania. Jeżeli mamy Błędne... Odpowiedzi z diagnozy. To przechodzimy do drugiej diagnozy. I tak z trzecią, czwartą i kolejną. W ten sposób w końcu obsłużymy wszystkie ustawienia. Jakie będziemy. Spotykać.

Da się to zrobić – możesz zbudować **wielostopniowy „tryb auto‑detekcji strategii”**, który:

- dla każdego URL robi najpierw **diagnostyczny sampling**,
- próbuje kolejno kilka „kandydatów” parserów,
- dopiero gdy **któryś kandydat przejdzie test na 2–3 sensowne Q\&A**, uruchamia pełne scrapowanie,
- jeśli żaden parser nie przejdzie testu, URL jest logowany jako „nieobsłużony” bez marnowania Selenium w pętli.

To jest dokładnie to, o czym piszesz – automatyczne „przeklikiwanie” strategii, aż coś zaskoczy.

Pokażę Ci szkic takiego mechanizmu w Twoim stylu, bez rozwalania obecnego kodu.

---

## Koncepcja: candidate parsers + auto‑detekcja

Idea:

1. Definiujesz kilka **kandydatów** (strategii) jako małe obiekty/funkcje:
   - `strategy_ac` – obecny parser `ac-*` (Mebligo/Selsey).
   - `strategy_maxfliz` – parser Maxfliz (`.faq-module`).
   - `strategy_generic` – ogólny heuristic parser FAQ (pytania z `?` w nagłówkach + odpowiedzi z sąsiednich `p`).
2. Funkcja **`try_strategy_on_sample`**:
   - bierze HTML (już pobrany raz),
   - wybiera kilka bloków (np. 3),
   - odpala strategię,
   - sprawdza, ile z nich dało sensowne pary Q\&A (np. `len(question) > 10`, `len(answer) > 20`, zawiera polskie litery, `?` itd.),
   - zwraca: „OK / FAIL” i ewentualnie sample do debugowania.
3. Funkcja **`auto_detect_strategy`**:
   - ma listę strategii w kolejności priorytetu,
   - po kolei robi `try_strategy_on_sample` dla każdej,
   - jeśli któraś da **≥ 2 poprawne Q\&A** → uznajemy ją za wybraną dla tego URL,
   - jeśli żadna nie przejdzie – log „nie obsłużone”.
4. Na końcu, gdy znamy strategię, odpalamy **pełne scrapowanie** (bez powtarzania Selenium).

---

## Minimalny szkic kodu (pod Twoje istniejące funkcje)

Poniżej dam Ci uproszczony blok (nie kopiuję wszystkiego, tylko to, co nowe), w Pythonowym pseudo‑kodzie zbliżonym do Twojego:

```python
from dataclasses import dataclass
from typing import Callable, List, Dict, Tuple

@dataclass
class Strategy:
    name: str
    find_blocks: Callable[[BeautifulSoup], List]
    extract_question: Callable
    extract_answer: Callable


# --------- 1. Definicje strategii ----------

strategy_ac = Strategy(
    name="ac_panels",
    find_blocks=lambda soup: soup.find_all("div", id=re.compile(r"^ac-\d+$")),
    extract_question=extract_question,      # Twoje extract_*
    extract_answer=extract_answer,
)

strategy_maxfliz = Strategy(
    name="maxfliz_faq",
    find_blocks=lambda soup: soup.select("div.faq-module ul.faq-list > li"),
    extract_question=lambda li: clean_text(
        (li.select_one("a.faq-link.accordion-title") or li).get_text(" ", strip=True)
    ),
    extract_answer=lambda li: clean_text(
        (li.select_one("div.accordion-content") or li).get_text(" ", strip=True)
    ),
)

strategy_generic = Strategy(
    name="generic_faq",
    find_blocks=find_generic_blocks,              # np. sekcje z '?' w środku
    extract_question=extract_question_generic,
    extract_answer=extract_answer_generic,
)

CANDIDATES = [strategy_ac, strategy_maxfliz, strategy_generic]


# --------- 2. Diagnostyczne przetestowanie strategii ----------

def try_strategy_on_sample(
    soup: BeautifulSoup,
    strategy: Strategy,
    max_blocks: int = 5,
    min_good: int = 2,
) -> Tuple[bool, List[Dict]]:
    blocks = strategy.find_blocks(soup)
    if not blocks:
        return False, []

    sample = blocks[:max_blocks]
    good_qas: List[Dict] = []

    for idx, block in enumerate(sample, start=1):
        q = strategy.extract_question(block)
        a = strategy.extract_answer(block)
        # bardzo prosta walidacja "sensowności"
        if q and a and "?" in q and len(q) > 10 and len(a) > 20:
            good_qas.append(
                {"question": q, "answer": a, "block_index": idx}
            )

    is_ok = len(good_qas) >= min_good
    return is_ok, good_qas


# --------- 3. Auto‑detekcja strategii dla danego URL ----------

def auto_detect_strategy(url: str, shop_name: str) -> Tuple[Strategy | None, BeautifulSoup, List[Dict]]:
    soup = get_soup_with_selenium(url)

    print(f"[{shop_name}] Auto‑detekcja strategii dla {url}")
    for strat in CANDIDATES:
        ok, sample_qas = try_strategy_on_sample(soup, strat)
        print(f"  - {strat.name}: {'OK' if ok else 'FAIL'} (sample={len(sample_qas)})")
        if ok:
            print(f"[{shop_name}] Wybrana strategia: {strat.name}")
            return strat, soup, sample_qas

    print(f"[{shop_name}] Nie udało się dobrać strategii – pomijam URL.")
    return None, soup, []


# --------- 4. Główne scrapowanie z auto‑detekcją ----------

def scrape_auto(url: str, shop_name: str, debug_sample: int = 3) -> List[Dict]:
    strat, soup, diag_qas = auto_detect_strategy(url, shop_name)
    if strat is None:
        return []

    # Opcjonalnie: wypisz sample diag_qas do logu, żebyś widział, co złapał.
    print(f"[{shop_name}] Diagnoza ({strat.name}) – przykładowe Q&A:")
    for i, qa in enumerate(diag_qas[:debug_sample], start=1):
        print(f"  {i}. {qa['question']}")
        print(f"     {qa['answer'][:120]}...")

    # Pełne scrapowanie
    blocks = strat.find_blocks(soup)
    qas: List[Dict] = []
    for idx, block in enumerate(blocks, start=1):
        q = strat.extract_question(block)
        a = strat.extract_answer(block)
        if q and a:
            qas.append(
                {
                    "shop": shop_name,
                    "source_url": url,
                    "question": q,
                    "answer": a,
                    "block_index": idx,
                }
            )

    print(f"[{shop_name}] {strat.name}: zebrano {len(qas)} Q&A z {url}")
    return qas
```

W ten sposób:

- Dla Mebligo/Selsey:
  - `strategy_ac` przejdzie test (bo znajdzie sporo sensownych Q\&A),
  - scrapowanie pójdzie tą strategią.
- Dla Maxfliz:
  - `strategy_ac` da `FAIL` (0 bloków),
  - `strategy_maxfliz` da `OK` (pytania/odpowiedzi z `.faq-module`),
  - scrapowanie pójdzie `strategy_maxfliz`.
- Dla innej strony:
  - jeśli żadna strategia nie przejdzie testu → log, żadnych Q\&A, brak duplikatów, Selenium nie jest wożone w kółko.

---

## Jak to wpiąć w Twój obecny kod

W `process_urls` zamiast wołać `parse_faq_ac_panels` bezwarunkowo, robisz:

```python
def process_urls(input_csv, output_csv):
    rows = pd.read_csv(input_csv).to_dict(orient="records")
    all_qas = []

    for row in rows:
        url = row.get("url")
        if not url:
            continue
        shop = row.get("shop") or get_shop_name_from_url(url)

        print(f"[INFO] Przetwarzam: {shop} -> {url}")
        try:
            qas = scrape_auto(url, shop_name=shop)
        except Exception as e:
            print(f"[ERROR] {shop}: {e}")
            continue

        if not qas:
            print(f"[WARN] {shop}: brak Q&A, nic nie zapisano\n")
            continue

        print(f"[INFO] {shop}: znaleziono {len(qas)} Q&A\n")
        all_qas.extend(qas)

    if not all_qas:
        print("[WARN] Brak jakichkolwiek Q&A – nie tworzę pliku output.")
        return False

    out_df = pd.DataFrame(all_qas)
    out_df.to_csv(output_csv, index=False, encoding="utf-8")
    print(f"[OK] {output_csv} utworzony: {len(out_df)} Q&A")
    return True
```

Nie musisz ręcznie rozpoznawać domen ani pisać `if domain == ...` – robi to za Ciebie `auto_detect_strategy`, o ile dopisujesz kolejne strategie do `CANDIDATES`.

---

## Co dalej

- Obecnie masz **dobry parser `ac-*`** i dobrze zdiagnozowaną Maxfliz.
- Proponuję, żebyś:

1. Wziął powyższy szkic i wstawił go do `skraper_faq.py` jako osobny moduł „auto‑detekcji”.
2. Zaczął od `CANDIDATES = [strategy_ac, strategy_maxfliz]` (bez generic), żeby widzieć czysto, kiedy która strategia się wybiera.
3. Dla stron, które nadal zwracają 0, włączył `strategy_generic` i zobaczył sample.

W ten sposób Twoja wizja „pierwsza diagnoza, druga diagnoza, trzecia…” jest zaimplementowana jako **lista kandydatów** i prosty test sensowności Q\&A – bez rozbijania działającego kodu na Mebligo/Selsey.

Jeśli chcesz, w kolejnym kroku mogę napisać Ci konkretną `strategy_forte` / `strategy_szynaka` po tym, jak pokażesz 1 debug‑blok HTML z tych stron.

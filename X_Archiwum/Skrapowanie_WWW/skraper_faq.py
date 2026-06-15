# import csv
# import re
# import time
# from pathlib import Path
# from typing import List, Dict, Optional

# import chromedriver_autoinstaller
# from selenium import webdriver
# from selenium.webdriver.chrome.options import Options
# from bs4 import BeautifulSoup


# def get_soup_with_selenium(url: str) -> Optional[BeautifulSoup]:
#     """Ładuje stronę przez Selenium (z JS) i zwraca BeautifulSoup,
#     albo None w przypadku błędu."""
#     chromedriver_autoinstaller.install()

#     options = Options()
#     options.add_argument("--headless=new")
#     options.add_argument("--no-sandbox")
#     options.add_argument("--disable-dev-shm-usage")

#     driver = webdriver.Chrome(options=options)

#     try:
#         driver.get(url)
#         # prosty wait; w razie potrzeby zamień na WebDriverWait
#         time.sleep(3)
#         html = driver.page_source
#     except Exception as e:
#         print(f"[ERROR] Nie udało się załadować strony: {url} ({e})")
#         return None
#     finally:
#         driver.quit()

#     return BeautifulSoup(html, "html.parser")


# def parse_faq_ac_panels(url: str, shop_name: str) -> List[Dict]:
#     """Parser FAQ oparty na strukturze ac-panel / ac-trigger,
#     jak dla Mebligo. Zwraca listę Q&A lub pustą listę."""
#     soup = get_soup_with_selenium(url)
#     if soup is None:
#         return []

#     qas: List[Dict] = []

#     panels = soup.find_all("div", id=re.compile(r"^ac-panel-(\d+)$"))
#     print(f"[INFO] {shop_name}: znaleziono {len(panels)} paneli ac-panel-*")

#     for panel in panels:
#         panel_id = panel.get("id") or ""
#         m = re.match(r"ac-panel-(\d+)", panel_id)
#         if not m:
#             continue
#         idx = m.group(1)

#         # odpowiadające pytanie: id="ac-trigger-<n>"
#         trigger = soup.find(id=f"ac-trigger-{idx}")

#         question_text = None
#         if trigger:
#             question_text = trigger.get_text(" ", strip=True)
#         else:
#             # fallback: poprzedni nagłówek lub button
#             prev_heading = panel.find_previous(["h2", "h3", "button"])
#             if prev_heading:
#                 question_text = prev_heading.get_text(" ", strip=True)

#         answer_text = panel.get_text(" ", strip=True)

#         if question_text and answer_text:
#             qas.append(
#                 {
#                     "shop": shop_name,
#                     "source_url": url,
#                     "question": question_text,
#                     "answer": answer_text,
#                 }
#             )

#     return qas


# def read_input_urls(input_csv: str) -> List[Dict]:
#     """Wczytuje listę adresów z CSV wejściowego.
#     Zakładamy nagłówki np.: shop,url"""
#     rows: List[Dict] = []
#     with open(input_csv, newline="", encoding="utf-8") as f:
#         reader = csv.DictReader(f)
#         for row in reader:
#             # oczekujemy co najmniej kolumny 'url';
#             # opcjonalnie 'shop'
#             rows.append(row)
#     return rows


# def append_to_output_csv(qas: List[Dict], output_csv: str) -> None:
#     """Dopisuje wyniki do CSV wyjściowego.
#     Jeśli plik nie istnieje, tworzy nagłówek."""
#     if not qas:
#         return

#     fieldnames = ["shop", "source_url", "question", "answer"]
#     path = Path(output_csv)
#     file_exists = path.exists()

#     with open(output_csv, "a", newline="", encoding="utf-8") as f:
#         writer = csv.DictWriter(f, fieldnames=fieldnames)
#         if not file_exists:
#             writer.writeheader()
#         writer.writerows(qas)


# def process_urls(
#     input_csv: str,
#     output_csv: str = "faq_output.csv",
# ) -> None:
#     """Główny pipeline:
#     - wczytuje URL-e z input_csv,
#     - próbuje sparsować FAQ dla każdego,
#     - jeśli znajdzie Q&A, dopisuje do output_csv."""
#     rows = read_input_urls(input_csv)

#     for row in rows:
#         url = row.get("url")
#         if not url:
#             continue

#         shop_name = row.get("shop") or "unknown"
#         print(f"\n[INFO] Przetwarzam: {shop_name} -> {url}")

#         # Tu decydujesz, jakiego parsera użyć.
#         # Na razie mamy jeden: parse_faq_ac_panels (jak Mebligo).
#         qas = parse_faq_ac_panels(url, shop_name=shop_name)

#         print(f"[INFO] {shop_name}: znaleziono {len(qas)} Q&A")

#         if qas:
#             append_to_output_csv(qas, output_csv)
#             print(f"[INFO] {shop_name}: zapisano do {output_csv}")
#         else:
#             print(f"[WARN] {shop_name}: brak Q&A, nic nie zapisano")


# if __name__ == "__main__":
#     # przykład użycia:
#     # input CSV np. o strukturze:
#     # shop,url
#     # Mebligo,https://mebligo.pl/content/9-najczesciej-zadawane-pytania-faq
#     process_urls("faq_input.csv", output_csv="faq_output.csv")


#############################             222222       WERSJA PO POPRAWKACH             222222             #############################

import csv
import re
import time
from pathlib import Path
from typing import List, Dict, Optional

import chromedriver_autoinstaller
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup


# Katalog bazowy = katalog, w którym leży ten plik
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "DATA"


def get_soup_with_selenium(url: str) -> Optional[BeautifulSoup]:
    chromedriver_autoinstaller.install()

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)

    try:
        driver.get(url)
        time.sleep(3)
        html = driver.page_source
    except Exception as e:
        print(f"[ERROR] Nie udało się załadować strony: {url} ({e})")
        return None
    finally:
        driver.quit()

    return BeautifulSoup(html, "html.parser")


def parse_faq_ac_panels(url: str, shop_name: str) -> List[Dict]:
    """Parser FAQ dla stron o strukturze ac-panel-* / ac-trigger-* (np. Mebligo)."""
    soup = get_soup_with_selenium(url)
    if soup is None:
        return []

    qas: List[Dict] = []

    panels = soup.find_all("div", id=re.compile(r"^ac-panel-(\d+)$"))
    print(f"[INFO] {shop_name}: znaleziono {len(panels)} paneli ac-panel-*")

    for panel in panels:
        panel_id = panel.get("id") or ""
        m = re.match(r"ac-panel-(\d+)", panel_id)
        if not m:
            continue
        idx = m.group(1)

        trigger = soup.find(id=f"ac-trigger-{idx}")

        question_text = None
        if trigger:
            question_text = trigger.get_text(" ", strip=True)
        else:
            prev_heading = panel.find_previous(["h2", "h3", "button"])
            if prev_heading:
                question_text = prev_heading.get_text(" ", strip=True)

        answer_text = panel.get_text(" ", strip=True)

        if question_text and answer_text:
            qas.append(
                {
                    "shop": shop_name,
                    "source_url": url,
                    "question": question_text,
                    "answer": answer_text,
                }
            )

    return qas


def read_input_urls(input_csv: Path) -> List[Dict]:
    rows: List[Dict] = []
    with input_csv.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def append_to_output_csv(qas: List[Dict], output_csv: Path) -> None:
    """Dopisuje wyniki do CSV wyjściowego (append)."""
    if not qas:
        return

    fieldnames = ["shop", "source_url", "question", "answer"]
    file_exists = output_csv.exists()

    with output_csv.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerows(qas)


def process_urls(
    input_csv: str,
    output_csv: str = "faq_output.csv",
) -> None:
    """
    Główny pipeline:
    - wczytuje URL-e z DATA/input_csv,
    - dla każdego próbuje sparsować FAQ parserem,
    - jeśli znajdzie Q&A, dopisuje do DATA/output_csv.
    """
    input_path = Path(input_csv)
    if not input_path.is_absolute():
        input_path = DATA_DIR / input_path

    output_path = Path(output_csv)
    if not output_path.is_absolute():
        output_path = DATA_DIR / output_path

    print(f"[INFO] INPUT:  {input_path}")
    print(f"[INFO] OUTPUT: {output_path}")

    rows = read_input_urls(input_path)

    for row in rows:
        url = row.get("url")
        if not url:
            continue

        shop_name = row.get("shop") or "unknown"
        parser_name = row.get("parser", "ac_panels")

        print(f"\n[INFO] Przetwarzam: {shop_name} -> {url} (parser={parser_name})")

        # Na razie mamy jeden parser: ac_panels (jak Mebligo)
        if parser_name == "ac_panels":
            qas = parse_faq_ac_panels(url, shop_name=shop_name)
        else:
            print(f"[WARN] {shop_name}: nieznany parser '{parser_name}', pomijam")
            qas = []

        print(f"[INFO] {shop_name}: znaleziono {len(qas)} Q&A")

        if qas:
            append_to_output_csv(qas, output_path)
            print(f"[INFO] {shop_name}: zapisano do {output_path}")
        else:
            print(f"[WARN] {shop_name}: brak Q&A, nic nie zapisano")


if __name__ == "__main__":
    process_urls("faq_input.csv", output_csv="faq_output.csv")




    
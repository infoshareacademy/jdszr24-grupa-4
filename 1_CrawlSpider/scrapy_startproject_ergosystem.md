# Najprościej: dla Twojego use case (pełen tekst + szybki CSV/PG) zaproponowałbym dwa warianty, zależnie od tego, ile chcesz „klepać” kodu:

minimal‑kodowy: trafilatura (CLI lub Python) – crawler + ekstrakcja czystego tekstu + eksport do CSV/JSON out‑of‑the‑box.aclanthology+2
bardziej „inżynieryjny”: Scrapy z prostym CrawlSpider, który zbiera url, title, body_text i od razu eksportuje do CSV.stackoverflow+2
Poniżej rozpisuję oba, z myślą o ergosystem.pl.
Wariant 1: Trafilatura – szybki tekstowy crawler
Trafilatura to biblioteka + narzędzie CLI zaprojektowane dokładnie do tego: pobieranie stron, wyciąganie głównego tekstu, meta i eksport do CSV/JSON/MD.aclanthology+2
Dlaczego pasuje do Twojego scenariusza
Out‑of‑the‑box potrafi:
crawlować domenę (limit domeny, głębokość, liczba stron),
normalizować tekst (usuwać menu/stopkę, zostawiać main content),
wypluwać dane jako CSV/JSON (URL, tytuł, tekst, metadane).agno+1
Idealne jako szybki „tekstowy dump” pod RAG/QA bez ręcznego dłubania w HTML.
Typowy pipeline
Bazując na dokumentacji / artykułach:
crawl_website do zebrania stron i zapisania w pliku/bazie.github+1
extract_text / extract_batch dla czystego tekstu z każdej strony, z metadanymi (title, date, language, etc.).agno+1
Wynik zapisujesz jako CSV z polami np.: url, title, text, metadata_json.github+1
To daje Ci od razu „baza tekstowa” – jedna tabela, zero ręcznego scrapera.
Wariant 2: Scrapy CrawlSpider – własny crawler pod domenę
Jeśli chcesz większą kontrolę i ewentualnie rozszerzenie o strukturę (np. rozpoznawanie typów stron), Scrapy jest klasykiem.stackoverflow+2
Co daje Scrapy
CrawlSpider + Rule(LinkExtractor(...)) – pełzanie po domenie bez ręcznej listy URL‑i.stackoverflow+1
W parse_item możesz:
przypisać url,
wyciągnąć title,
wyciągnąć cały tekst body np. //text() albo odfiltrowany fragment strony.akamai+1
Eksport „za darmo”: scrapy crawl ergosystem -O documents.csv (CSV/JSON).akamai+1
Szkic logiki (myślowej)
allowed_domains = ["ergosystem.pl"], start_urls = ["https://ergosystem.pl"].[scrapingbee](https://www.scrapingbee.com/blog/crawling-python/)
rules = [Rule(LinkExtractor(allow=()), callback="parse_item", follow=True)] – proste pełzanie po wszystkim w domenie.[stackoverflow](https://stackoverflow.com/questions/39154393/scraping-all-text-using-scrapy-without-knowing-webpages-structure)
W parse_item:
title = response.css("title::text").get() lub h1.[youtube](https://www.youtube.com/watch?v=FQv-whbCfKs)[akamai](https://www.akamai.com/docs/guides/use-scrapy-to-extract-data-from-html-tags/)
body = "\n".join(response.xpath("//text()").getall()) – szybki „full text”.[stackoverflow](https://stackoverflow.com/questions/39154393/scraping-all-text-using-scrapy-without-knowing-webpages-structure)
Scrapy automatycznie zapisze wynik do CSV (one‑line CLI).[scrapingbee](https://www.scrapingbee.com/blog/crawling-python/)
Z tego masz CSV z url, title, body. Potem możesz:
wrzucić to do Postgresa przez COPY,
albo pipeline embeddingowy.
Co bym sugerował konkretnie dla ergosystem.pl
Dla szybkiego PoC (dump tekstu pod QA/RAG) wybrałbym:
jeśli chcesz minimum kodu i dobry „clean text” z main content: Trafilatura CLI/Python.agno+1
jeśli chcesz mieć pełną kontrolę i ewentualnie rozbudowę (produkty, parametry, obrazy): Scrapy CrawlSpider.stackoverflow+2
Ponieważ masz background w Pythonie / DevOps, realnie dwa wieczory roboty:
dzień 1: Scrapy projekt, prosty CrawlSpider, eksport documents.csv,
dzień 2: Postgres tabela + pipeline embeddingowy.
Który wariant bardziej Ci odpowiada: „minimal‑kodowy” (Trafilatura) czy „Scrapy pod przyszłą rozbudowę”? Wybiram Scrapy CrawlSpider - dawaj prosty plan działania.

Super, że wybrałeś Scrapy – to daje Ci pełną kontrolę i łatwą rozbudowę. Poniżej masz **konkretny, 2-dniowy plan działania** z gotowymi fragmentami kodu, które możesz wkleić i dostosować do `ergosystem.pl`.[^1][^2][^3]

---

## Dzień 1: Scrapy CrawlSpider + eksport do CSV

### Krok 1: Stwórz projekt Scrapy

```bash
scrapy startproject ergosystem_crawler
cd ergosystem_crawler
```

### Krok 2: Dodaj prostego CrawlSpidera

Utwórz plik `ergosystem_crawler/spiders/ergosystem_spider.py`:[^3][^1]

```python
import scrapy
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor

class ErgosystemSpider(CrawlSpider):
    name = "ergosystem"
    allowed_domains = ["ergosystem.pl"]
    start_urls = ["https://ergosystem.pl"]

    # Pełzanie po wszystkich linkach w domenie
    rules = [
        Rule(LinkExtractor(allow=()), callback="parse_item", follow=True),
    ]

    def parse_item(self, response):
        # Tytuł strony (h1 lub title)
        title = response.css("h1::text").get(default="").strip()
        if not title:
            title = response.css("title::text").get(default="").strip()

        # Pełny tekst strony (wszystkie text node w body)
        body_text = " ".join(
            response.xpath("//body//text()").getall()
        ).strip()

        # Odfiltruj puste/nagłówkowe strony (opcjonalne)
        if len(body_text) < 50:
            return

        yield {
            "url": response.url,
            "title": title,
            "body_text": body_text,
        }
```

### Krok 3: Uruchom crawlera z eksportem do CSV

```bash
scrapy crawl ergosystem -O documents.csv
```

To automatycznie zapisze wynik do `documents.csv` z kolumnami: `url`, `title`, `body_text`.[^4]

---

## Dzień 2: Pipeline do PostgreSQL + opcjonalny deduplikator

### Krok 1: Zainstaluj `psycopg2`

```bash
pip install psycopg2-binary
```

### Krok 2: Skonfiguruj `settings.py`

W `ergosystem_crawler/settings.py`:[^2]

```python
ITEM_PIPELINES = {
    "ergosystem_crawler.pipelines.ErgosystemPostgresPipeline": 300,
}

# Opcjonalnie: wyłącz wbudowany CSV exporter, jeśli chcesz tylko Postgres
# FEEDS = {}  # jeśli nie chcesz CSV, tylko DB
```

### Krok 3: Dodaj pipeline do Postgresa

Utwórz/edytuj `ergosystem_crawler/pipelines.py`:[^2]

```python
import psycopg2

class ErgosystemPostgresPipeline:
    def __init__(self):
        # Dostosuj dane połączenia
        self.connection = psycopg2.connect(
            host="localhost",
            database="ergosystem",
            user="postgres",
            password="twoje_hasło",
        )
        self.cur = self.connection.cursor()

        # Tabela na dokumenty
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                url TEXT UNIQUE,
                title TEXT,
                body_text TEXT,
                crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.connection.commit()

    def process_item(self, item, spider):
        # Wstaw lub zaktualizuj (UPSERT) – unikanie duplikatów po URL
        self.cur.execute("""
            INSERT INTO documents (url, title, body_text)
            VALUES (%s, %s, %s)
            ON CONFLICT (url) DO UPDATE
            SET title = EXCLUDED.title,
                body_text = EXCLUDED.body_text,
                crawled_at = CURRENT_TIMESTAMP
        """, (item["url"], item["title"], item["body_text"]))
        self.connection.commit()
        return item

    def close_spider(self, spider):
        self.cur.close()
        self.connection.close()
```

### Krok 4: Uruchom crawlera z pipeline’em

```bash
scrapy crawl ergosystem
```

Dane będą trafiać bezpośrednio do tabeli `documents` w Postgresie.[^2]

---

## Opcjonalne usprawnienia (gdybyś chciał)

- **Deduplikacja po treści** – dodaj `WHERE body_text IS DISTINCT FROM` w UPSERT.
- **Filtrowanie typów stron** – np. `allow=(r'/blog/|/poradniki/')` w `LinkExtractor`.

```
- **Czyszczenie tekstu** – usuń `<script>`, `<style>` przez `response.xpath("//body//text()[not(ancestor::script or ancestor::style)]").getall()`.
```

---

## Podsumowanie

Masz teraz:

- **Dzień 1**: CrawlSpider + CSV z `url`, `title`, `body_text`.
- **Dzień 2**: Pipeline do Postgresa z automatycznym tworzeniem tabeli i deduplikacją po URL.

Który element chcesz dopracować: filtrowanie stron (np. tylko blog/poradniki), czyszczenie tekstu (usunięcie menu/stopki), czy może od razu pipeline embeddingowy (np. `sentence-transformers` + wektory w Postgresie)?
<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.crawlspider.com/mastering-scrapys-crawlspider-a-comprehensive-tutorial/

[^2]: https://scrapeops.io/python-scrapy-playbook/scrapy-save-data-postgres/

[^3]: https://steemit.com/tutorial/@comppaz/web-crawler-a-scrapy-crawl-spider-tutorial

[^4]: https://www.youtube.com/watch?v=ExTimuRFn3M

[^5]: https://docs.scrapy.org/en/1.0/intro/overview.html

[^6]: https://docs.scrapy.org/en/latest/topics/link-extractors.html

[^7]: https://stackoverflow.com/questions/59605617/scrapy-postgresql-automatic-items-and-pipeline-for-custom-etl-truncate-in

[^8]: https://stackoverflow.com/questions/62728490/scrapy-keeps-crawling-and-never-stops-crawlspider-rules

[^9]: https://stackoverflow.com/questions/32747867/csv-output-from-web-scrawling-using-scrapy

[^10]: https://mherman.org/blog/recursively-scraping-web-pages-with-scrapy/

[^11]: https://stackoverflow.com/questions/26301831/extracting-text-xpath-scrapy

[^12]: https://docs.scrapy.org/en/2.9/topics/spiders.html

[^13]: https://www.reddit.com/r/webscraping/comments/lkunge/web_scraping_content_into_postgresql_scheduling/

[^14]: https://docs.scrapy.org/en/latest/topics/selectors.html

[^15]: https://www.pluralsight.com/resources/blog/guides/crawling-web-python-scrapy

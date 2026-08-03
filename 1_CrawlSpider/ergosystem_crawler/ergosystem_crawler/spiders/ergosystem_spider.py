
# wersja doczyszczona

import scrapy
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor


class ErgosystemSpider(CrawlSpider):
    name = "ergosystem"
    allowed_domains = ["ergosystem.pl"]
    start_urls = ["https://ergosystem.pl"]

    # Pełzanie po wszystkich linkach w domenie
    rules = [
        Rule(
            LinkExtractor(allow=()),
            callback="parse_item",
            follow=True,
        ),
    ]

    def parse_item(self, response):
        # Tytuł strony (h1 lub title)
        title = response.css("h1::text").get(default="").strip()
        if not title:
            title = response.css("title::text").get(default="").strip()

        # Tekst z body bez <script> i <style>, znormalizowany
        texts = response.xpath(
            "//body//*[not(self::script or self::style)]"
            "//text()[normalize-space()]"
        ).getall()
        body_text = " ".join(t.strip() for t in texts).strip()

        # Odfiltruj bardzo krótkie / techniczne strony
        if len(body_text) < 50:
            return

        yield {
            "url": response.url,
            "title": title,
            "body_text": body_text,
        }

import scrapy
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor

class ErgosystemSpider(CrawlSpider):
    name = "ergosystem"
    allowed_domains = ["ergosystem.pl"]
    start_urls = ["https://ergosystem.pl"]

    rules = [
        Rule(LinkExtractor(allow=()), callback="parse_item", follow=True),
    ]

    def parse_item(self, response):
        title = response.css("h1::text").get(default="").strip()
        if not title:
            title = response.css("title::text").get(default="").strip()

        body_text = " ".join(
            response.xpath("//body//text()").getall()
        ).strip()

        if len(body_text) < 50:
            return

        yield {
            "url": response.url,
            "title": title,
            "body_text": body_text,
        }
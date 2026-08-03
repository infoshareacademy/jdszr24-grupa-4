# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from itemadapter import ItemAdapter


# def fix_mojibake(s: str) -> str:
#     """
#     Napraw typowe przypadki 'UTF-8 → Latin-1' mojibake,
#     np. 'Ĺ‚Ä…czÄ…cych' → 'łączących'.
#     """
#     if not isinstance(s, str):
#         return s
#     try:
#         return s.encode("latin1").decode("utf-8")
#     except UnicodeDecodeError:
#         return s

def fix_mojibake(s: str) -> str:
    """
    Próbuje naprawić typowe przypadki mojibake UTF-8→Latin-1,
    ale jeśli się nie da, zwraca oryginał.
    """
    if not isinstance(s, str):
        return s

    try:
        return s.encode("latin1").decode("utf-8")
    except UnicodeEncodeError:
        # np. prawidłowe "ł", "ż" itd. – nic nie ruszamy
        return s
    except UnicodeDecodeError:
        # nie jest to klasyczny przypadek mojibake – zostaw tekst
        return s
    # koniec podmiany

def trim_footer(text: str) -> str:
    """
    Ucina typowe stopki/menu z Ergosystemu, żeby zostawić
    bardziej merytoryczną treść.
    """
    markers = [
        "Kategorie Meble pracownicze",
        "PARTNERZY",
        "Kontakt Telefon:",
        "© Ergosystem Sp. j.",
        "Projekt i realizacja: Digital Factory",
    ]
    for marker in markers:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]
    return text


class TextCleanPipeline:
    """
    Pipeline:
    - naprawia 'krzaki' UTF-8 (mojibake),
    - czyści stopkę / menu,
    - przycina whitespace.
    """

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)

        for field in ("title", "body_text"):
            if field in adapter and isinstance(adapter[field], str):
                value = adapter[field]
                value = fix_mojibake(value)
                value = trim_footer(value)
                value = value.strip()
                adapter[field] = value

        return item
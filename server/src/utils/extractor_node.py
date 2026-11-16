import sys
import json
import pdfplumber
import pandas as pd
import re
from collections import defaultdict
import warnings

warnings.filterwarnings('ignore')

class IntelligentPDFExtractor:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.garden_prefixes = ['BP', 'BOPSM', 'OF', 'BP1', 'OF1', 'BOP1','SELENG','BOPSMTEOK','BOP',None,'BOPSMMAJULI','BOPSMNAMROOP']

        self.output_columns = [
            'Garden',
            'Garden Inv No',
            'No. of Bags',
            'Nt Wt. Per Bags',
            'Net Weight',
            'Tare Weight',
            'Gross Weight'
        ]

    def is_garden_prefix(self, text: str) -> bool:
        return text.strip().upper() in self.garden_prefixes

    def clean_numeric_value(self, value: str) -> str:
        if not value:
            return ''
        value = value.replace(",", "")
        value = re.sub(r"[^\d.]", "", value)
        return value.strip()

    def extract_text_with_positions(self, page):
        words = []
        for w in page.extract_words(use_text_flow=True):
            words.append({
                "text": w["text"],
                "x0": w["x0"],
                "x1": w["x1"],
                "y0": w["top"],
                "y1": w["bottom"]
            })
        return words

    def find_header_y(self, words):
        header_keywords = ["garden", "bags", "gross", "tare", "net", "invoice"]
        header_candidates = [
            w["y0"] for w in words
            if any(key in w["text"].lower() for key in header_keywords)
        ]
        if not header_candidates:
            return 50
        from collections import Counter
        y_cluster = [round(y / 5) * 5 for y in header_candidates]
        return Counter(y_cluster).most_common(1)[0][0]

    def cluster_words_by_row(self, words, header_y):
        rows = defaultdict(list)
        data_words = [w for w in words if w["y0"] > header_y]
        data_words.sort(key=lambda w: w["y0"])
        tolerance = 4
        current_y = None
        for w in data_words:
            if current_y is None or abs(w["y0"] - current_y) > tolerance:
                current_y = w["y0"]
            rows[current_y].append(w)
        return rows

    def extract_rows(self, words, header_y):
        rows = self.cluster_words_by_row(words, header_y)
        extracted = []
        for y, row_words in rows.items():
            row_words.sort(key=lambda w: w["x0"])
            texts = [w["text"] for w in row_words]
            for i, word in enumerate(texts):
                if self.is_garden_prefix(word):
                    if i + 9 >= len(texts):
                        continue
                    try:
                        row_data = {
                            "Garden": texts[i + 1],
                            "Garden Inv No": texts[i + 2],
                            "No. of Bags": self.clean_numeric_value(texts[i + 5]),
                            "Nt Wt. Per Bags": self.clean_numeric_value(texts[i + 6]),
                            "Net Weight": self.clean_numeric_value(texts[i + 7]),
                            "Tare Weight": self.clean_numeric_value(texts[i + 8]),
                            "Gross Weight": self.clean_numeric_value(texts[i + 9]),
                        }
                        if row_data["Net Weight"]:
                            extracted.append(row_data)
                            break
                    except Exception:
                        continue
        return extracted

    def extract_from_pdf(self):
        all_rows = []

        with pdfplumber.open(self.pdf_path) as pdf:
            for page in pdf.pages:
                words = self.extract_text_with_positions(page)
                if not words:
                    continue
                header_y = self.find_header_y(words)
                page_rows = self.extract_rows(words, header_y)
                all_rows.extend(page_rows)

        df = pd.DataFrame(all_rows)

        for col in self.output_columns:
            if col not in df:
                df[col] = ""

        df = df[self.output_columns]

        return df

if __name__ == "__main__":
    try:
        pdf_path = sys.argv[1]
        extractor = IntelligentPDFExtractor(pdf_path)
        df = extractor.extract_from_pdf()
        data_json = df.to_dict(orient="records")

        print(json.dumps({
            "status": 200,
            "message": "PDF extracted successfully",
            "data": data_json
        }))

    except Exception as e:
        print(json.dumps({
            "status": 500,
            "message": "Extraction failed",
            "error": str(e)
        }))
import json
import csv
import os
import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

CSV_FILE = f"hamsters_events_{datetime.datetime.now()}.csv"

if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(["time", "name", "caseid", "context"])


class Handler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()
        
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            data = json.loads(body)

            with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
                csv.writer(f).writerow([
                    data['time'],
                    data['name'],
                    data['caseid'],
                    json.dumps(data['context'], ensure_ascii=False)
                ])

            self.send_response(201)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')

        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Invalid JSON")


server = HTTPServer(("0.0.0.0", 8082), Handler)
print("Listening on http://localhost:8082")
server.serve_forever()
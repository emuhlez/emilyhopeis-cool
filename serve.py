#!/usr/bin/env python3
"""No-cache static server for the portfolio."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if not args or not str(args[0]).startswith("GET /_"):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(NoCacheHandler, directory="."))
    print(f"Serving http://127.0.0.1:{port}/portfolio-site.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")

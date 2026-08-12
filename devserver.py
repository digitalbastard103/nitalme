"""Local dev server for nital.me.

Two things `python -m http.server` doesn't do that this site needs:

  * no-cache headers, so edits to css/styles.css and js/main.js actually show up
  * HTTP Range requests, so the audio player can seek into an MP3 without first
    downloading the whole file (every real static host supports Range)

    python devserver.py [port]

Local convenience only — do not deploy this.
"""
import os
import re
import sys
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


class DevHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        rng = self.headers.get("Range")
        if not rng:
            return super().send_head()

        path = self.translate_path(self.path)
        if os.path.isdir(path) or not os.path.exists(path):
            return super().send_head()

        m = RANGE_RE.match(rng.strip())
        if not m:
            return super().send_head()

        size = os.path.getsize(path)
        start_s, end_s = m.group(1), m.group(2)

        if start_s:
            start = int(start_s)
            end = int(end_s) if end_s else size - 1
        else:
            # suffix form: "bytes=-500" means the last 500 bytes
            if not end_s:
                return super().send_head()
            start = max(0, size - int(end_s))
            end = size - 1

        if start >= size:
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        end = min(end, size - 1)
        f = open(path, "rb")
        f.seek(start)

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()

        # hand back a reader bounded to the requested slice
        remaining = end - start + 1
        original_read = f.read

        def bounded_read(n=-1):
            nonlocal remaining
            if remaining <= 0:
                return b""
            if n is None or n < 0 or n > remaining:
                n = remaining
            chunk = original_read(n)
            remaining -= len(chunk)
            return chunk

        f.read = bounded_read
        return f


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    handler = partial(DevHandler, directory=".")
    print("nital.me serving on http://localhost:%d  (ctrl-c to stop)" % port)
    # threading matters: a single-threaded server deadlocks on keep-alive connections
    ThreadingHTTPServer(("", port), handler).serve_forever()

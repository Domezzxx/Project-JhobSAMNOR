"""เสิร์ฟ Flutter web build + proxy /api/* ไป backend (localhost:4000)
ใช้พอร์ตเดียว (5599) ที่มือถือเข้าถึงได้ → same-origin (ไม่มีปัญหา CORS/firewall พอร์ต 4000)
รัน: python serve_proxy.py
"""
import http.server
import os
import socketserver
import urllib.request
import urllib.error

PORT = int(os.environ.get("PROXY_PORT", "5599"))
API = os.environ.get("PROXY_API", "http://localhost:4000")
# path สัมพัทธ์กับไฟล์นี้ → portable (เครื่องอื่น clone แล้วรันได้)
WEBDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mobile", "build", "web")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=WEBDIR, **k)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept")

    def _proxy(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(API + self.path, data=body, method=self.command)
        for h in ("Content-Type", "Authorization", "Accept"):
            if h in self.headers:
                req.add_header(h, self.headers[h])
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                self.send_response(r.status)
                self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(data)))
                self._cors()
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(data)))
            self._cors()
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            msg = ('{"error":"proxy: %s"}' % str(e)).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self._cors()
            self.end_headers()
            self.wfile.write(msg)

    def do_OPTIONS(self):
        # ตอบ CORS preflight (กัน 501 ที่ทำให้ request จริงไม่ถูกส่ง)
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        return super().do_GET()

    def do_POST(self):
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def do_PATCH(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()


class ThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with ThreadingServer(("0.0.0.0", PORT), Handler) as s:
        print(f"serving web + /api proxy on 0.0.0.0:{PORT} -> {API}")
        s.serve_forever()

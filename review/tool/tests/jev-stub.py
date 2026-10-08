#!/usr/bin/env python3
"""A stand-in for the Jev endpoint, for lens-gate's tests.

    jev-stub.py <rules.json> <portfile>

rules.json: {"fail": bool, "rules": [[question_substr, state_substr, p_yes, confidence], ...],
"default": [p_yes, confidence]}. The first rule whose substrings both appear answers. Reread
on every request, so a test switches modes by rewriting the file. Every request is appended to
<rules.json>.log as one JSON line.
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

RULES, PORTFILE = sys.argv[1], sys.argv[2]


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        with open(RULES + ".log", "a") as f:
            f.write(json.dumps(body) + "\n")
        cfg = json.load(open(RULES))
        if cfg.get("fail"):
            self.send_response(500)
            self.end_headers()
            return
        q = body["questions"]["q"]["instructions"]
        p, conf = cfg.get("default", [0.05, 0.9])
        for qs, ss, rp, rc in cfg.get("rules", []):
            if qs in q and ss in body["state"]:
                p, conf = rp, rc
                break
        out = {"answers": {"q": {"type": "choice", "choice": "yes" if p >= 0.5 else "no",
                                 "confidence": conf,
                                 "probabilities": {"yes": p, "no": round(1 - p, 4)}}}}
        data = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 0), Handler)
open(PORTFILE, "w").write(str(srv.server_port))
srv.serve_forever()

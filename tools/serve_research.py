"""Preview the public research worktree on loopback with portable module MIME types."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

ROOT=Path(__file__).resolve().parent.parent

class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.gltf':'model/gltf+json'}
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)
    def allowed(self):
        parts=Path(unquote(urlsplit(self.path).path).lstrip('/')).parts
        if any(p.startswith('.') or p in ('node_modules','tests','tools','releases') for p in parts):return False
        candidate=ROOT.joinpath(*parts)
        try:
            if not candidate.resolve().is_relative_to(ROOT):return False
            for parent in [candidate,*candidate.parents]:
                if parent==ROOT:break
                if parent.is_symlink() or (hasattr(parent,'is_junction') and parent.is_junction()):return False
        except (OSError,ValueError):return False
        return True
    def do_GET(self):
        if not self.allowed():self.send_error(404);return
        super().do_GET()
    def do_HEAD(self):
        if not self.allowed():self.send_error(404);return
        super().do_HEAD()
    def list_directory(self,path):
        self.send_error(404);return None
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=41878);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'ATELIER http://127.0.0.1:{server.server_port}/entities/research/',flush=True)
    server.serve_forever()

if __name__=='__main__':main()

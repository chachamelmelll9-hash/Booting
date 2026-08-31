#!/usr/bin/env python3
"""Raw page-level CDP driver for an already-logged-in Arc tab.
Arc blocks browser-level CDP (Playwright connectOverCDP) but allows page targets.
Usage: pcdp.py <match-substr> <cmd> [args...]
cmds: url | title | eval <js> | evalfile <path> | nav <url> | wait [ms]
      snapshot | click <selector> | fill <selector> <text> | setfiles <selector> <path>
"""
import json, sys, time, urllib.request
from websocket import create_connection

def targets():
    return json.load(urllib.request.urlopen('http://localhost:9222/json'))

def find_ws(match):
    for t in targets():
        if t.get('type') == 'page' and match in t.get('url', ''):
            return t['webSocketDebuggerUrl'], t['url']
    return None, None

class CDP:
    def __init__(self, ws):
        self.ws = create_connection(ws, max_size=None, suppress_origin=True); self.id = 0
    def cmd(self, method, params=None, timeout=40):
        self.id += 1; mid = self.id
        self.ws.send(json.dumps({'id': mid, 'method': method, 'params': params or {}}))
        self.ws.settimeout(timeout)
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == mid:
                if 'error' in msg: raise RuntimeError(msg['error'])
                return msg.get('result', {})
    def ev(self, js, timeout=40):
        r = self.cmd('Runtime.evaluate', {'expression': js, 'returnByValue': True,
                     'awaitPromise': True, 'userGesture': True}, timeout)
        if r.get('exceptionDetails'):
            raise RuntimeError(json.dumps(r['exceptionDetails'])[:400])
        return r.get('result', {}).get('value')
    def close(self): self.ws.close()

def main():
    match, cmd, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
    ws, url = find_ws(match)
    if not ws:
        print('NO_PAGE matching', match); sys.exit(2)
    c = CDP(ws)
    c.cmd('Page.enable'); c.cmd('DOM.enable'); c.cmd('Runtime.enable')
    try:
        if cmd == 'url': print(url)
        elif cmd == 'title': print(c.ev('document.title'))
        elif cmd == 'eval': print(json.dumps(c.ev(' '.join(rest)), ensure_ascii=False))
        elif cmd == 'evalfile': print(json.dumps(c.ev(open(rest[0]).read()), ensure_ascii=False))
        elif cmd == 'nav':
            c.cmd('Page.navigate', {'url': rest[0]}); time.sleep(3); print('navigated')
        elif cmd == 'wait':
            time.sleep(int(rest[0])/1000 if rest else 3); print('waited')
        elif cmd == 'screenshot':
            import base64
            r = c.cmd('Page.captureScreenshot', {'format': 'png'})
            open(rest[0], 'wb').write(base64.b64decode(r['data'])); print('shot ' + rest[0])
        elif cmd == 'snapshot':
            js = r'''(() => {
              const vis = e => { const r=e.getBoundingClientRect(), s=getComputedStyle(e);
                return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'; };
              const sel='a,button,input,select,textarea,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[contenteditable=true]';
              return Array.from(document.querySelectorAll(sel)).filter(vis).slice(0,150).map(e=>{
                const t=(e.getAttribute('aria-label')||e.textContent||e.value||e.placeholder||'').replace(/\s+/g,' ').trim().slice(0,80);
                return e.tagName.toLowerCase()+(e.type?('['+e.type+']'):'')+' "'+t+'"';
              }).join('\n');
            })()'''
            print(c.ev(js))
        elif cmd == 'click':
            sel = json.dumps(rest[0])
            ok = c.ev(f'(()=>{{const el=document.querySelector({sel}); if(!el)return "NOT_FOUND"; el.scrollIntoView({{block:"center"}}); el.click(); return "OK";}})()')
            print(ok)
        elif cmd == 'clicktext':
            txt = json.dumps(' '.join(rest))
            ok = c.ev(f'''(()=>{{const t={txt}; const els=[...document.querySelectorAll('button,a,[role=button],[role=link],span,div')];
              const el=els.find(e=>e.textContent.replace(/\\s+/g," ").trim()===t)||els.find(e=>e.textContent.includes(t.trim()));
              if(!el)return "NOT_FOUND"; el.scrollIntoView({{block:"center"}}); el.click(); return "OK";}})()''')
            print(ok)
        elif cmd == 'fill':
            sel = json.dumps(rest[0]); val = json.dumps(' '.join(rest[1:]))
            ok = c.ev(f'''(()=>{{const el=document.querySelector({sel}); if(!el)return "NOT_FOUND";
              el.focus(); const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set||Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value')?.set;
              set? set.call(el,{val}) : (el.value={val});
              el.dispatchEvent(new Event('input',{{bubbles:true}})); el.dispatchEvent(new Event('change',{{bubbles:true}})); return "OK";}})()''')
            print(ok)
        elif cmd == 'key':
            k = rest[0]  # e.g. Enter
            vk = {'Enter': 13, 'Tab': 9}.get(k, 0)
            for t in ('keyDown', 'keyUp'):
                c.cmd('Input.dispatchKeyEvent', {'type': t, 'key': k, 'code': k,
                      'windowsVirtualKeyCode': vk, 'nativeVirtualKeyCode': vk})
            print('key ' + k)
        elif cmd == 'clickxy':
            x, y = float(rest[0]), float(rest[1])
            for ev in ('mouseMoved', 'mousePressed', 'mouseReleased'):
                p = {'type': ev, 'x': x, 'y': y, 'button': 'left', 'clickCount': 1}
                if ev == 'mouseMoved': p.pop('button'); p.pop('clickCount')
                c.cmd('Input.dispatchMouseEvent', p)
                time.sleep(0.05)
            print('clicked-xy')
        elif cmd == 'setfiles':
            sel = json.dumps(rest[0]); paths = rest[1:]
            # Get objectId of the file input, then DOM.setFileInputFiles
            r = c.cmd('Runtime.evaluate', {'expression': f'document.querySelector({sel})'})
            oid = r.get('result', {}).get('objectId')
            if not oid: print('INPUT_NOT_FOUND'); sys.exit(1)
            c.cmd('DOM.setFileInputFiles', {'files': paths, 'objectId': oid})
            print('uploaded ' + str(len(paths)) + ' file(s)')
        else: print('unknown cmd', cmd)
    finally:
        c.close()

if __name__ == '__main__':
    main()

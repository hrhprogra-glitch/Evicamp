#!/usr/bin/env python3
"""
Panel de Control de SiuHub (solo para el dueño de SiuHub).
Servidor sin dependencias externas (solo Python estándar). Escucha en 127.0.0.1:3090 y
Nginx lo publica con HTTPS en panel.siuhub.duckdns.org.

Seguridad:
  - Contraseña encriptada (PBKDF2-SHA256) en /opt/siuhub/panel-admin.json (solo root).
  - Sesión en cookie HttpOnly + Secure + SameSite=Strict; expira en 12 horas.
  - 5 intentos fallidos de login por IP bloquean 15 minutos.
  - Solo ejecuta los scripts de /opt/siuhub con argumentos validados, nunca comandos libres.

Uso:
  python3 panel.py                 -> servidor del panel
  python3 panel.py revisar-cobros  -> tarea diaria (cron): avisos y suspensión por falta de pago
  PANEL_CLAVE='...' python3 panel.py crear-clave -> guarda/cambia la contraseña del panel
"""
import calendar
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

DIR_SIUHUB = "/opt/siuhub"
REGISTRO = f"{DIR_SIUHUB}/clientes.tsv"
DATOS = f"{DIR_SIUHUB}/panel-datos.json"
ADMIN = f"{DIR_SIUHUB}/panel-admin.json"
DIR_CLIENTES = "/var/www/clientes"
DIR_BACKUPS = "/var/backups/siuhub"
INDEX_HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
DOMINIO_BASE = "siuhub.duckdns.org"

PUERTO = 3090
DURACION_SESION = 12 * 3600
DIAS_AVISO = 5      # "por vencer" desde 5 días antes
DIAS_GRACIA = 5     # se suspende 5 días después de vencido
MESES_PLAN = {"MENSUAL": 1, "TRIMESTRAL": 3, "SEMESTRAL": 6, "ANUAL": 12}
METODOS_PAGO = {"YAPE", "PLIN", "TRANSFERENCIA", "EFECTIVO", "OTRO"}
RE_SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$")
RE_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RE_FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")

candado = threading.Lock()
sesiones = {}          # token -> expira (epoch)
intentos = {}          # ip -> [epoch de fallos]


# ===================== Datos =====================

def leer_json(ruta, defecto):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return defecto


def guardar_json(ruta, datos):
    tmp = ruta + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    os.chmod(tmp, 0o600)
    os.replace(tmp, ruta)  # reemplazo atómico: nunca queda un archivo a medias


def leer_datos():
    d = leer_json(DATOS, {})
    d.setdefault("planes", {})
    d.setdefault("pagos", [])
    return d


def leer_registro():
    clientes = []
    try:
        with open(REGISTRO, encoding="utf-8") as f:
            for linea in f:
                partes = linea.rstrip("\n").split("\t")
                if len(partes) >= 5 and partes[0]:
                    clientes.append({"slug": partes[0], "nombre": partes[1], "puerto": partes[2],
                                     "estado": partes[3], "alta": partes[4]})
    except FileNotFoundError:
        pass
    return clientes


def sumar_meses(d, meses):
    m = d.month - 1 + meses
    anio, mes = d.year + m // 12, m % 12 + 1
    return date(anio, mes, min(d.day, calendar.monthrange(anio, mes)[1]))


def estado_pago(plan, hoy=None):
    if not plan or not plan.get("proximo_pago"):
        return {"estado": "SIN_PLAN", "dias": None}
    hoy = hoy or date.today()
    dias = (date.fromisoformat(plan["proximo_pago"]) - hoy).days
    if dias < 0:
        return {"estado": "VENCIDO", "dias": dias}
    if dias <= DIAS_AVISO:
        return {"estado": "POR_VENCER", "dias": dias}
    return {"estado": "AL_DIA", "dias": dias}


def escribir_suscripcion(slug, plan):
    """Archivo que lee el sistema del cliente para mostrar el aviso de vencimiento."""
    carpeta = os.path.join(DIR_CLIENTES, slug)
    if not os.path.isdir(carpeta):
        return
    ep = estado_pago(plan)
    suspension = None
    if plan and plan.get("proximo_pago"):
        suspension = (date.fromisoformat(plan["proximo_pago"]).toordinal() + DIAS_GRACIA)
        suspension = date.fromordinal(suspension).isoformat()
    datos = {"estado": ep["estado"], "dias_restantes": ep["dias"],
             "proximo_pago": plan.get("proximo_pago") if plan else None,
             "fecha_suspension": suspension, "actualizado": datetime.now().isoformat(timespec="seconds")}
    ruta = os.path.join(carpeta, "suscripcion.json")
    with open(ruta + ".tmp", "w", encoding="utf-8") as f:
        json.dump(datos, f)
    os.replace(ruta + ".tmp", ruta)
    os.chmod(ruta, 0o644)


# ===================== Scripts del servidor =====================

def ejecutar(args, entorno=None, espera=300):
    env = dict(os.environ, **(entorno or {}))
    r = subprocess.run(args, capture_output=True, text=True, timeout=espera, env=env)
    salida = (r.stdout + ("\n" + r.stderr if r.stderr else "")).strip()
    return r.returncode == 0, salida


def api_activa(slug):
    ok, salida = ejecutar(["systemctl", "is-active", f"postgrest-cliente@{slug}"], espera=10)
    return salida.strip() == "active"


def cambiar_estado(slug, accion):
    return ejecutar([f"{DIR_SIUHUB}/estado-cliente.sh", slug, accion], espera=60)


# ===================== Información =====================

def info_vps():
    mem = {}
    with open("/proc/meminfo") as f:
        for linea in f:
            k, v = linea.split(":", 1)
            mem[k] = int(v.split()[0])
    total = mem["MemTotal"] // 1024
    libre = mem.get("MemAvailable", mem["MemFree"]) // 1024
    disco = shutil.disk_usage("/")
    carga = os.getloadavg()[0]
    with open("/proc/uptime") as f:
        dias_encendido = int(float(f.read().split()[0]) // 86400)
    return {"ram_total_mb": total, "ram_usada_mb": total - libre,
            "disco_total_gb": round(disco.total / 1e9, 1), "disco_usado_gb": round(disco.used / 1e9, 1),
            "cpu_carga": round(carga, 2), "cpus": os.cpu_count(), "dias_encendido": dias_encendido}


def info_backups():
    bases = []
    if os.path.isdir(DIR_BACKUPS):
        for base in sorted(os.listdir(DIR_BACKUPS)):
            carpeta = os.path.join(DIR_BACKUPS, base)
            if not os.path.isdir(carpeta):
                continue
            archivos = sorted((f for f in os.listdir(carpeta) if f.endswith(".dump")), reverse=True)
            ultimo = archivos[0] if archivos else None
            bases.append({"base": base, "copias": len(archivos), "ultimo": ultimo,
                          "tamano_kb": os.path.getsize(os.path.join(carpeta, ultimo)) // 1024 if ultimo else 0})
    return bases


def resumen():
    datos = leer_datos()
    registro = {c["slug"]: c for c in leer_registro()}
    slugs = list(registro) + [s for s in datos["planes"] if s not in registro]
    clientes = []
    for slug in slugs:
        reg = registro.get(slug)
        plan = datos["planes"].get(slug)
        clientes.append({
            "slug": slug,
            "nombre": reg["nombre"] if reg else (plan or {}).get("nombre", slug),
            "externo": reg is None,  # Evicamp: tiene su propia instalación, no se suspende desde aquí
            "link": f"https://{slug}.{DOMINIO_BASE}" if reg else (plan or {}).get("link", ""),
            "estado": reg["estado"] if reg else "EXTERNO",
            "alta": reg["alta"] if reg else "",
            "api": api_activa(slug) if reg else None,
            "plan": plan,
            "pago": estado_pago(plan),
        })
    hoy = date.today()
    mes = hoy.strftime("%Y-%m")
    ingresos_mes = sum(p["monto"] for p in datos["pagos"] if p["fecha"].startswith(mes))
    esperado = sum(MENSUAL_EQ(c["plan"]) for c in clientes if c["plan"])
    return {
        "vps": info_vps(),
        "clientes": clientes,
        "backups": info_backups(),
        "pagos": sorted(datos["pagos"], key=lambda p: p["registrado"], reverse=True)[:50],
        "cobros": {"ingresos_mes": round(ingresos_mes, 2), "mensual_esperado": round(esperado, 2),
                   "vencidos": sum(1 for c in clientes if c["pago"]["estado"] == "VENCIDO"),
                   "por_vencer": sum(1 for c in clientes if c["pago"]["estado"] == "POR_VENCER")},
        "config": {"dias_aviso": DIAS_AVISO, "dias_gracia": DIAS_GRACIA, "dominio": DOMINIO_BASE},
    }


def MENSUAL_EQ(plan):
    return plan["precio"] / MESES_PLAN.get(plan["tipo"], 1)


# ===================== Cobros =====================

def guardar_plan(cuerpo):
    slug = cuerpo.get("slug", "")
    if not RE_SLUG.match(slug):
        raise ValueError("Link inválido.")
    tipo = cuerpo.get("tipo", "")
    if tipo not in MESES_PLAN:
        raise ValueError("Plan inválido.")
    precio = float(cuerpo.get("precio", 0))
    if not 0 <= precio <= 100000:
        raise ValueError("Precio inválido.")
    proximo = cuerpo.get("proximo_pago", "")
    if not RE_FECHA.match(proximo):
        raise ValueError("Fecha de próximo pago inválida.")
    date.fromisoformat(proximo)
    with candado:
        datos = leer_datos()
        plan = datos["planes"].get(slug, {})
        plan.update({"tipo": tipo, "precio": precio, "proximo_pago": proximo,
                     "telefono": str(cuerpo.get("telefono", ""))[:30], "notas": str(cuerpo.get("notas", ""))[:300]})
        if cuerpo.get("externo"):
            plan["nombre"] = str(cuerpo.get("nombre", slug))[:60]
            plan["link"] = str(cuerpo.get("link", ""))[:120]
        datos["planes"][slug] = plan
        guardar_json(DATOS, datos)
    escribir_suscripcion(slug, plan)
    return plan


def registrar_pago(cuerpo):
    slug = cuerpo.get("slug", "")
    metodo = cuerpo.get("metodo", "")
    if metodo not in METODOS_PAGO:
        raise ValueError("Método de pago inválido.")
    monto = float(cuerpo.get("monto", 0))
    if not 0 < monto <= 100000:
        raise ValueError("Monto inválido.")
    fecha = cuerpo.get("fecha") or date.today().isoformat()
    if not RE_FECHA.match(fecha):
        raise ValueError("Fecha inválida.")
    with candado:
        datos = leer_datos()
        plan = datos["planes"].get(slug)
        if not plan:
            raise ValueError("Primero configura el plan de este cliente.")
        # El siguiente vencimiento avanza un periodo desde el vencimiento actual (no desde hoy),
        # así pagar tarde o adelantado no regala ni quita días.
        base = date.fromisoformat(plan["proximo_pago"])
        plan["proximo_pago"] = sumar_meses(base, MESES_PLAN[plan["tipo"]]).isoformat()
        datos["pagos"].append({"id": secrets.token_hex(6), "slug": slug, "monto": round(monto, 2), "metodo": metodo,
                               "fecha": fecha, "nota": str(cuerpo.get("nota", ""))[:200],
                               "periodo_hasta": plan["proximo_pago"],
                               "registrado": datetime.now().isoformat(timespec="seconds")})
        suspendido_por_pago = plan.pop("suspendido_por_pago", False)
        guardar_json(DATOS, datos)
    escribir_suscripcion(slug, plan)
    reactivado = False
    if suspendido_por_pago and estado_pago(plan)["estado"] != "VENCIDO":
        reactivado, _ = cambiar_estado(slug, "activar")
    return {"plan": plan, "reactivado": reactivado}


def revisar_cobros():
    """Tarea diaria: actualiza los avisos y suspende a quien pasó los días de gracia."""
    registro = {c["slug"]: c for c in leer_registro()}
    with candado:
        datos = leer_datos()
        cambios = []
        for slug, plan in datos["planes"].items():
            escribir_suscripcion(slug, plan)
            ep = estado_pago(plan)
            reg = registro.get(slug)
            if reg and reg["estado"] == "ACTIVO" and ep["estado"] == "VENCIDO" and -ep["dias"] > DIAS_GRACIA:
                ok, _ = cambiar_estado(slug, "suspender")
                if ok:
                    plan["suspendido_por_pago"] = True
                    cambios.append(f"{slug}: suspendido por falta de pago ({-ep['dias']} días vencido)")
        guardar_json(DATOS, datos)
    for c in cambios:
        print(c)
    return cambios


# ===================== Autenticación =====================

def hash_clave(clave, sal=None):
    sal = sal or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", clave.encode(), sal.encode(), 200_000).hex()
    return sal, h


def verificar_clave(clave):
    admin = leer_json(ADMIN, None)
    if not admin:
        return False
    _, h = hash_clave(clave, admin["sal"])
    return hmac.compare_digest(h, admin["hash"])


def ip_bloqueada(ip):
    ahora = time.time()
    fallos = [t for t in intentos.get(ip, []) if ahora - t < 900]
    intentos[ip] = fallos
    return len(fallos) >= 5


# ===================== Servidor HTTP =====================

class Panel(BaseHTTPRequestHandler):
    server_version = "SiuHubPanel"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.ip(), fmt % args))

    def ip(self):
        return self.headers.get("X-Real-IP") or self.client_address[0]

    def responder(self, codigo, cuerpo, tipo="application/json", cabeceras=None):
        datos = cuerpo if isinstance(cuerpo, bytes) else json.dumps(cuerpo, ensure_ascii=False).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", f"{tipo}; charset=utf-8")
        self.send_header("Content-Length", str(len(datos)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (cabeceras or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(datos)

    def token(self):
        for parte in (self.headers.get("Cookie") or "").split(";"):
            k, _, v = parte.strip().partition("=")
            if k == "siuhub_panel":
                return v
        return None

    def autenticado(self):
        t = self.token()
        expira = sesiones.get(t) if t else None
        if expira and expira > time.time():
            return True
        sesiones.pop(t, None)
        return False

    def cuerpo_json(self):
        largo = int(self.headers.get("Content-Length") or 0)
        if largo > 20_000:
            raise ValueError("Petición demasiado grande.")
        return json.loads(self.rfile.read(largo) or b"{}")

    def do_GET(self):
        ruta = urlparse(self.path).path
        if ruta in ("/", "/index.html"):
            with open(INDEX_HTML, "rb") as f:
                return self.responder(200, f.read(), "text/html")
        if ruta == "/api/sesion":
            return self.responder(200, {"autenticado": self.autenticado()})
        if not self.autenticado():
            return self.responder(401, {"error": "Inicia sesión."})
        if ruta == "/api/resumen":
            return self.responder(200, resumen())
        return self.responder(404, {"error": "No existe."})

    def do_POST(self):
        ruta = urlparse(self.path).path
        # Protección CSRF: solo JSON (un formulario de otra página no puede enviarlo)
        if "application/json" not in (self.headers.get("Content-Type") or ""):
            return self.responder(415, {"error": "Tipo de contenido no permitido."})
        try:
            cuerpo = self.cuerpo_json()
        except (ValueError, json.JSONDecodeError) as e:
            return self.responder(400, {"error": str(e)})

        if ruta == "/api/login":
            ip = self.ip()
            if ip_bloqueada(ip):
                return self.responder(429, {"error": "Demasiados intentos. Espera 15 minutos."})
            if not verificar_clave(str(cuerpo.get("clave", ""))):
                intentos.setdefault(ip, []).append(time.time())
                time.sleep(1)
                return self.responder(401, {"error": "Contraseña incorrecta."})
            intentos.pop(ip, None)
            t = secrets.token_urlsafe(32)
            sesiones[t] = time.time() + DURACION_SESION
            return self.responder(200, {"ok": True}, cabeceras={
                "Set-Cookie": f"siuhub_panel={t}; Path=/; Max-Age={DURACION_SESION}; HttpOnly; Secure; SameSite=Strict"})

        if not self.autenticado():
            return self.responder(401, {"error": "Inicia sesión."})

        try:
            if ruta == "/api/logout":
                sesiones.pop(self.token(), None)
                return self.responder(200, {"ok": True}, cabeceras={
                    "Set-Cookie": "siuhub_panel=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict"})

            if ruta == "/api/clientes/nuevo":
                slug = str(cuerpo.get("slug", "")).strip().lower()
                nombre = str(cuerpo.get("nombre", "")).strip()[:60]
                correo = str(cuerpo.get("correo", "")).strip().lower()
                clave = str(cuerpo.get("clave", ""))
                if not RE_SLUG.match(slug):
                    raise ValueError("Link inválido: usa minúsculas, números y guiones (3 a 30).")
                if not nombre:
                    raise ValueError("Falta el nombre del negocio.")
                if not RE_CORREO.match(correo):
                    raise ValueError("Correo inválido.")
                if len(clave) < 6:
                    raise ValueError("La contraseña debe tener al menos 6 caracteres.")
                ok, salida = ejecutar([f"{DIR_SIUHUB}/nuevo-cliente.sh", slug, nombre, correo],
                                      entorno={"CLAVE_ADMIN": clave}, espera=600)
                if not ok:
                    return self.responder(500, {"error": "No se pudo crear el cliente.", "detalle": salida[-2000:]})
                if cuerpo.get("plan"):
                    guardar_plan(dict(cuerpo["plan"], slug=slug))
                return self.responder(200, {"ok": True, "link": f"https://{slug}.{DOMINIO_BASE}",
                                            "correo": correo, "detalle": salida[-2000:]})

            if ruta in ("/api/clientes/suspender", "/api/clientes/activar"):
                slug = str(cuerpo.get("slug", ""))
                if not RE_SLUG.match(slug):
                    raise ValueError("Link inválido.")
                ok, salida = cambiar_estado(slug, ruta.rsplit("/", 1)[1])
                if ok and ruta.endswith("activar"):
                    with candado:
                        datos = leer_datos()
                        if slug in datos["planes"]:
                            datos["planes"][slug].pop("suspendido_por_pago", None)
                            guardar_json(DATOS, datos)
                return self.responder(200 if ok else 500, {"ok": ok, "detalle": salida})

            if ruta == "/api/plan":
                return self.responder(200, {"ok": True, "plan": guardar_plan(cuerpo)})

            if ruta == "/api/pago":
                return self.responder(200, dict(registrar_pago(cuerpo), ok=True))

            if ruta == "/api/backup":
                ok, salida = ejecutar([f"{DIR_SIUHUB}/backup.sh"], espera=900)
                return self.responder(200 if ok else 500, {"ok": ok, "detalle": salida})

            if ruta == "/api/revisar-cobros":
                return self.responder(200, {"ok": True, "cambios": revisar_cobros()})

        except ValueError as e:
            return self.responder(400, {"error": str(e)})
        except subprocess.TimeoutExpired:
            return self.responder(504, {"error": "La operación tardó demasiado."})

        return self.responder(404, {"error": "No existe."})


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "revisar-cobros":
        revisar_cobros()
        return
    if len(sys.argv) > 1 and sys.argv[1] == "crear-clave":
        clave = os.environ.get("PANEL_CLAVE", "")
        if len(clave) < 10:
            sys.exit("PANEL_CLAVE debe tener al menos 10 caracteres.")
        sal, h = hash_clave(clave)
        guardar_json(ADMIN, {"sal": sal, "hash": h, "creado": datetime.now().isoformat(timespec="seconds")})
        print("Contraseña del panel guardada.")
        return
    if not os.path.isfile(ADMIN):
        sys.exit("Falta la contraseña del panel: ejecuta PANEL_CLAVE='...' panel.py crear-clave")
    print(f"Panel SiuHub en 127.0.0.1:{PUERTO}")
    ThreadingHTTPServer(("127.0.0.1", PUERTO), Panel).serve_forever()


if __name__ == "__main__":
    main()

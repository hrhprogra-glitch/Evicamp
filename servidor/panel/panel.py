#!/usr/bin/env python3
"""
Panel de Control de SiuMax (solo para el dueño de SiuMax).
Servidor sin dependencias externas (solo Python estándar). Escucha en 127.0.0.1:3090 y
Nginx lo publica con HTTPS en panel.siumax.duckdns.org.

Seguridad:
  - Contraseña encriptada (PBKDF2-SHA256) en /opt/siuhub/panel-admin.json (solo root).
  - Sesión en cookie HttpOnly + Secure + SameSite=Strict; expira en 12 horas.
  - 5 intentos fallidos de login por IP bloquean 15 minutos.
  - Solo ejecuta los scripts de /opt/siuhub con argumentos validados, nunca comandos libres.

Uso:
  python3 panel.py                 -> servidor del panel
  python3 panel.py revisar-cobros  -> tarea diaria (cron): avisos y suspensión por falta de pago
  PANEL_CLAVE='...' python3 panel.py crear-clave -> guarda/cambia la contraseña del panel
  MP_ACCESS_TOKEN='...' MP_MODO=prueba|produccion python3 panel.py configurar-mp -> guarda Mercado Pago
"""
import calendar
import hashlib
import hmac
import html
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
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

DIR_SIUMAX = "/opt/siuhub"
REGISTRO = f"{DIR_SIUMAX}/clientes.tsv"
DATOS = f"{DIR_SIUMAX}/panel-datos.json"
ADMIN = f"{DIR_SIUMAX}/panel-admin.json"
DIR_CLIENTES = "/var/www/clientes"
DIR_BACKUPS = "/var/backups/siuhub"
INDEX_HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
DOMINIO_BASE = "siumax.duckdns.org"

PUERTO = 3090
DURACION_SESION = 12 * 3600
DIAS_AVISO = 5      # "por vencer" desde 5 días antes
DIAS_GRACIA = 5     # se suspende 5 días después de vencido
MESES_PLAN = {"MENSUAL": 1, "TRIMESTRAL": 3, "SEMESTRAL": 6, "ANUAL": 12}
METODOS_PAGO = {"YAPE", "PLIN", "TRANSFERENCIA", "EFECTIVO", "OTRO", "MERCADOPAGO"}
MERCADOPAGO = f"{DIR_SIUMAX}/mercadopago.json"   # {"access_token": "...", "modo": "prueba"|"produccion"}
URL_PANEL = f"https://panel.{DOMINIO_BASE}"
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
             "fecha_suspension": suspension, "actualizado": datetime.now().isoformat(timespec="seconds"),
             # La página "Servicio suspendido" solo ofrece pagar si la suspensión fue por falta de pago
             "suspendido_por_pago": bool(plan and plan.get("suspendido_por_pago")),
             # Botón "Pagar ahora" del aviso: solo si Mercado Pago está configurado y hay precio
             "pagar_url": f"{URL_PANEL}/pagar/{slug}" if (mp_config() and plan and plan.get("precio")) else None}
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
    return ejecutar([f"{DIR_SIUMAX}/estado-cliente.sh", slug, accion], espera=60)


def editar_cliente(cuerpo):
    """Cambia el nombre del negocio (en el registro) y, si tiene plan, su WhatsApp y notas."""
    slug = str(cuerpo.get("slug", ""))
    cliente_registrado(slug)
    nombre = " ".join(str(cuerpo.get("nombre", "")).split())[:60]
    if not nombre:
        raise ValueError("Falta el nombre del negocio.")
    with candado:
        with open(REGISTRO, encoding="utf-8") as f:
            lineas = f.readlines()
        nuevas = []
        for linea in lineas:
            partes = linea.rstrip("\n").split("\t")
            if partes[0] == slug and len(partes) >= 5:
                partes[1] = nombre
                linea = "\t".join(partes) + "\n"
            nuevas.append(linea)
        with open(REGISTRO + ".tmp", "w", encoding="utf-8") as f:
            f.writelines(nuevas)
        os.replace(REGISTRO + ".tmp", REGISTRO)
        datos = leer_datos()
        plan = datos["planes"].get(slug)
        if plan:
            plan["telefono"] = str(cuerpo.get("telefono", ""))[:30]
            plan["notas"] = str(cuerpo.get("notas", ""))[:300]
            guardar_json(DATOS, datos)
    return {"ok": True}


REDIRECCIONES = f"{DIR_SIUMAX}/redirecciones.tsv"   # link_viejo  link_nuevo  fecha


def slug_actual(slug):
    """Si el cliente cambió de link, devuelve el link nuevo (sigue la cadena: a -> b -> c)."""
    mapa = {}
    try:
        with open(REDIRECCIONES, encoding="utf-8") as f:
            for linea in f:
                partes = linea.rstrip("\n").split("\t")
                if len(partes) >= 2 and partes[0]:
                    mapa[partes[0]] = partes[1]
    except FileNotFoundError:
        pass
    vistos = set()
    while slug in mapa and slug not in vistos:
        vistos.add(slug)
        slug = mapa[slug]
    return slug


def cambiar_link(cuerpo):
    """Cambia el link de un cliente conservando su base (se renombra). El link viejo redirige al nuevo."""
    viejo = str(cuerpo.get("slug", ""))
    cliente_registrado(viejo)
    nuevo = str(cuerpo.get("nuevo", "")).strip().lower()
    if not RE_SLUG.match(nuevo):
        raise ValueError("Link nuevo inválido: usa minúsculas, números y guiones (3 a 30).")
    if nuevo == viejo:
        raise ValueError("El link nuevo es igual al actual.")
    ok, salida = ejecutar([f"{DIR_SIUMAX}/cambiar-link.sh", viejo, nuevo], espera=300)
    if not ok:
        return False, salida
    with candado:
        datos = leer_datos()
        if viejo in datos["planes"]:
            datos["planes"][nuevo] = datos["planes"].pop(viejo)
        for p in datos["pagos"]:
            if p["slug"] == viejo:
                p["slug"] = nuevo
        datos.get("eliminados", {}).pop(nuevo, None)
        guardar_json(DATOS, datos)
        plan = datos["planes"].get(nuevo)
    if plan:
        escribir_suscripcion(nuevo, plan)   # el botón "Pagar ahora" ahora lleva el link nuevo
    return True, salida


def borrar_cliente(cuerpo):
    """Borra un cliente SUSPENDIDO, confirmando con su nombre. El script deja un backup final (30 días).
    Su historial de pagos se queda en el panel."""
    slug = str(cuerpo.get("slug", ""))
    reg = cliente_registrado(slug)
    if reg["estado"] != "SUSPENDIDO":
        raise ValueError("Primero suspende al cliente.")
    if " ".join(str(cuerpo.get("confirmacion", "")).split()).lower() != " ".join(reg["nombre"].split()).lower():
        raise ValueError("El nombre escrito no coincide con el del negocio.")
    ok, salida = ejecutar([f"{DIR_SIUMAX}/borrar-cliente.sh", slug], espera=300)
    if not ok:
        return False, salida
    with candado:
        datos = leer_datos()
        datos["planes"].pop(slug, None)
        archivar_pagos(datos, slug, reg["nombre"])
        guardar_json(DATOS, datos)
    return True, salida


def archivar_pagos(datos, slug, nombre):
    """Cliente borrado: sus pagos salen del panel (no cuentan en 'cobrado este mes' ni en 'pagos por negocio')
    y quedan archivados en panel-datos.json (y en el backup diario de la configuración) por si se necesitan."""
    suyos = [p for p in datos["pagos"] if p["slug"] == slug]
    datos["pagos"] = [p for p in datos["pagos"] if p["slug"] != slug]
    eliminado = datos.setdefault("eliminados", {}).setdefault(slug, {"nombre": nombre})
    eliminado.setdefault("fecha", date.today().isoformat())
    eliminado["pagos_archivados"] = eliminado.get("pagos_archivados", []) + suyos


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
            # .dump = una base de datos; .tar.gz = la configuración de todo el sistema
            archivos = sorted((f for f in os.listdir(carpeta) if f.endswith((".dump", ".tar.gz"))), reverse=True)
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
        "pagos_por_negocio": pagos_por_negocio(datos["pagos"]),
        "eliminados": datos.get("eliminados", {}),
        "cobros": {"ingresos_mes": round(ingresos_mes, 2), "mensual_esperado": round(esperado, 2),
                   "vencidos": sum(1 for c in clientes if c["pago"]["estado"] == "VENCIDO"),
                   "por_vencer": sum(1 for c in clientes if c["pago"]["estado"] == "POR_VENCER")},
        "config": {"dias_aviso": DIAS_AVISO, "dias_gracia": DIAS_GRACIA, "dominio": DOMINIO_BASE,
                   "mercadopago": (mp_config() or {}).get("modo")},
    }


def pagos_por_negocio(pagos):
    """Un resumen por negocio sobre TODOS sus pagos: cantidad, total y el último."""
    grupos = {}
    for p in pagos:
        g = grupos.setdefault(p["slug"], {"slug": p["slug"], "cantidad": 0, "total": 0.0, "ultimo": None})
        g["cantidad"] += 1
        g["total"] = round(g["total"] + p["monto"], 2)
        if not g["ultimo"] or (p["fecha"], p["registrado"]) > (g["ultimo"]["fecha"], g["ultimo"]["registrado"]):
            g["ultimo"] = p
    return sorted(grupos.values(), key=lambda g: (g["ultimo"]["fecha"], g["ultimo"]["registrado"]), reverse=True)


def MENSUAL_EQ(plan):
    return plan["precio"] / MESES_PLAN.get(plan["tipo"], 1)


# ===================== Detalle de un cliente =====================

def base_cliente(slug):
    return "cli_" + slug.replace("-", "_")


def psql_cliente(slug, sql, variables=None):
    """Ejecuta SQL en la base del cliente. Los valores van como variables de psql (:'x'),
    nunca pegados en el texto, para que comillas o símbolos no puedan alterar la consulta."""
    args = ["runuser", "-u", "postgres", "--", "psql", "-At", "-v", "ON_ERROR_STOP=1", "-d", base_cliente(slug)]
    for k, v in (variables or {}).items():
        args += ["-v", f"{k}={v}"]
    r = subprocess.run(args, input=sql, capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise ValueError("Error en la base del cliente: " + r.stderr.strip()[-300:])
    return r.stdout.strip()


def cliente_registrado(slug):
    if not RE_SLUG.match(slug or ""):
        raise ValueError("Link inválido.")
    reg = next((c for c in leer_registro() if c["slug"] == slug), None)
    if not reg:
        raise ValueError("Ese cliente no existe.")
    return reg


def detalle_cliente(slug):
    datos = leer_datos()
    plan = datos["planes"].get(slug)
    pagos = sorted((p for p in datos["pagos"] if p["slug"] == slug), key=lambda p: p["fecha"], reverse=True)
    eliminado = datos.get("eliminados", {}).get(slug)
    if eliminado and RE_SLUG.match(slug or "") and not any(c["slug"] == slug for c in leer_registro()):
        # Cliente borrado: solo queda su historial de pagos
        return {"slug": slug, "nombre": eliminado["nombre"], "link": "", "eliminado": eliminado["fecha"],
                "estado": "ELIMINADO", "alta": "", "api": None, "plan": None, "pago": estado_pago(None), "pagos": pagos,
                "total_pagado": round(sum(p["monto"] for p in pagos), 2), "usuarios": []}
    if plan and RE_SLUG.match(slug or "") and not any(c["slug"] == slug for c in leer_registro()):
        # Cliente externo (ej. Evicamp): solo su plan y sus pagos; sus usuarios no están en una base cli_
        return {"slug": slug, "nombre": plan.get("nombre", slug), "link": plan.get("link", ""), "externo": True,
                "estado": "EXTERNO", "alta": "", "api": None, "plan": plan, "pago": estado_pago(plan), "pagos": pagos,
                "total_pagado": round(sum(p["monto"] for p in pagos), 2), "usuarios": []}
    reg = cliente_registrado(slug)
    usuarios = json.loads(psql_cliente(slug, """
        SELECT coalesce(json_agg(json_build_object(
                 'nombre', e.nombre, 'email', e.email, 'rol', e.rol, 'estado', e.estado,
                 'creado', to_char(e.created_at, 'YYYY-MM-DD'),
                 'ultimo_uso', (SELECT to_char(max(s.ultimo_uso), 'YYYY-MM-DD HH24:MI') FROM sesiones s WHERE s.empleado_id = e.id)
               ) ORDER BY (e.rol = 'Administrador') DESC, e.created_at), '[]')
        FROM empleados e;
    """) or "[]")
    return {"slug": slug, "nombre": reg["nombre"], "link": f"https://{slug}.{DOMINIO_BASE}",
            "estado": reg["estado"], "alta": reg["alta"], "api": api_activa(slug),
            "plan": plan, "pago": estado_pago(plan), "pagos": pagos,
            "total_pagado": round(sum(p["monto"] for p in pagos), 2), "usuarios": usuarios}


def restablecer_clave(cuerpo):
    slug = str(cuerpo.get("slug", ""))
    cliente_registrado(slug)
    correo = str(cuerpo.get("email", "")).strip().lower()
    clave = str(cuerpo.get("clave", ""))
    if not RE_CORREO.match(correo):
        raise ValueError("Correo inválido.")
    if len(clave) < 6:
        raise ValueError("La contraseña debe tener al menos 6 caracteres.")
    # Cambia la clave y cierra sus sesiones abiertas (tendrá que entrar con la nueva)
    cambiados = psql_cliente(slug, """
        WITH emp AS (
          UPDATE empleados SET password_hash = crypt(:'clave', gen_salt('bf'))
          WHERE lower(email) = :'correo' RETURNING id
        ), cerradas AS (
          DELETE FROM sesiones WHERE empleado_id IN (SELECT id FROM emp)
        )
        SELECT count(*) FROM emp;
    """, {"clave": clave, "correo": correo})
    if cambiados.strip() != "1":
        raise ValueError("No se encontró ese usuario.")
    return {"ok": True}


# ===================== Cobros =====================

def guardar_plan(cuerpo):
    slug = cuerpo.get("slug", "")
    if not RE_SLUG.match(slug):
        raise ValueError("Link inválido.")
    tipo = cuerpo.get("tipo") or "MENSUAL"   # el precio del plan es por mes
    if tipo not in MESES_PLAN:
        raise ValueError("Plan inválido.")
    precio = float(cuerpo.get("precio", 0))
    if not 0 <= precio <= 100000:
        raise ValueError("Precio inválido.")
    # Precio por 12 meses que tú decides (vacío o 0 = precio por mes x 12)
    precio_anual = float(cuerpo.get("precio_anual") or 0)
    if not 0 <= precio_anual <= 1000000:
        raise ValueError("Precio por año inválido.")
    proximo = cuerpo.get("proximo_pago", "")
    if not RE_FECHA.match(proximo):
        raise ValueError("Fecha de próximo pago inválida.")
    date.fromisoformat(proximo)
    with candado:
        datos = leer_datos()
        plan = datos["planes"].get(slug, {})
        plan.update({"tipo": tipo, "precio": precio, "precio_anual": round(precio_anual, 2), "proximo_pago": proximo,
                     "telefono": str(cuerpo.get("telefono", ""))[:30], "notas": str(cuerpo.get("notas", ""))[:300]})
        if cuerpo.get("externo"):
            plan["nombre"] = str(cuerpo.get("nombre", slug))[:60]
            plan["link"] = str(cuerpo.get("link", ""))[:120]
        datos["planes"][slug] = plan
        guardar_json(DATOS, datos)
    escribir_suscripcion(slug, plan)
    return plan


MESES_MAXIMOS = 12


def precio_meses(plan, meses):
    """Lo que cuesta pagar N meses: precio por mes x N. El año (12 meses) cuesta su precio por año, si lo tiene."""
    mensual = float(plan["precio"]) / MESES_PLAN.get(plan["tipo"], 1)
    total = round(mensual * meses, 2)
    anual = float(plan.get("precio_anual") or 0)
    if meses == 12 and anual > 0:
        return round(anual, 2), anual < total   # True: el año sale más barato que 12 meses sueltos
    return total, False


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
    mp_id = str(cuerpo.get("mp_id") or "")  # solo lo pone el aviso de Mercado Pago, nunca el formulario
    with candado:
        datos = leer_datos()
        plan = datos["planes"].get(slug)
        if not plan:
            raise ValueError("Primero configura el plan de este cliente.")
        # Mercado Pago puede avisar el mismo pago varias veces: se registra una sola vez
        if mp_id and any(p.get("mp_id") == mp_id for p in datos["pagos"]):
            return {"plan": plan, "reactivado": False, "duplicado": True}
        # El siguiente vencimiento avanza desde el vencimiento actual (no desde hoy), así pagar tarde o
        # adelantado no regala ni quita días. Avanza los meses pagados; si no se indican, un periodo del plan.
        meses = int(cuerpo.get("meses") or MESES_PLAN[plan["tipo"]])
        if not 1 <= meses <= MESES_MAXIMOS:
            raise ValueError(f"Los meses deben ser de 1 a {MESES_MAXIMOS}.")
        base = date.fromisoformat(plan["proximo_pago"])
        plan["proximo_pago"] = sumar_meses(base, meses).isoformat()
        datos["pagos"].append({"id": secrets.token_hex(6), "slug": slug, "monto": round(monto, 2), "metodo": metodo,
                               "meses": meses,
                               "fecha": fecha, "nota": str(cuerpo.get("nota", ""))[:200],
                               "periodo_hasta": plan["proximo_pago"], "mp_id": mp_id or None,
                               "registrado": datetime.now().isoformat(timespec="seconds")})
        suspendido_por_pago = plan.pop("suspendido_por_pago", False)
        guardar_json(DATOS, datos)
    escribir_suscripcion(slug, plan)
    reactivado = False
    if suspendido_por_pago and estado_pago(plan)["estado"] != "VENCIDO":
        reactivado, _ = cambiar_estado(slug, "activar")
    return {"plan": plan, "reactivado": reactivado}


# ===================== Mercado Pago =====================

def mp_config():
    c = leer_json(MERCADOPAGO, None)
    return c if c and c.get("access_token") else None


def mp_api(metodo, ruta, cuerpo=None):
    conf = mp_config()
    if not conf:
        raise ValueError("Mercado Pago no está configurado.")
    req = Request(f"https://api.mercadopago.com{ruta}", method=metodo,
                  data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                  headers={"Authorization": f"Bearer {conf['access_token']}", "Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=20) as r:
            return json.loads(r.read() or b"{}")
    except HTTPError as e:
        raise ValueError(f"Mercado Pago respondió {e.code}.") from e
    except URLError as e:
        raise ValueError("No se pudo conectar con Mercado Pago.") from e


def pagina_elegir_meses(slug, cerrar_al_volver):
    """Antes de ir a Mercado Pago, el cliente elige: pagar 1 mes o 1 año (a su precio por año)."""
    reg = cliente_registrado(slug)
    plan = leer_datos()["planes"].get(slug)
    if not plan or not plan.get("precio"):
        raise ValueError("Este cliente no tiene un plan con precio.")
    vence = lambda iso: "/".join(reversed(iso.split("-")))
    hasta = lambda m: vence(sumar_meses(date.fromisoformat(plan["proximo_pago"]), m).isoformat())
    mes, _ = precio_meses(plan, 1)
    anio, con_descuento = precio_meses(plan, 12)
    normal = round(mes * 12, 2)
    ahorro = (f"<span class='ahorro'>ahorras S/ {normal - anio:.2f}</span>"
              f"<s>S/ {normal:.2f}</s>") if con_descuento else ""
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pagar plan · SiuMax</title><style>
html,body{{margin:0;min-height:100%}}
body{{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1E293B;color:#F8FAFC;padding:16px;box-sizing:border-box;font-family:ui-monospace,Menlo,Consolas,monospace}}
.caja{{border:2px solid #F59E0B;box-shadow:6px 6px 0 0 #F59E0B;padding:28px 24px;width:100%;max-width:440px;box-sizing:border-box}}
h1{{margin:0 0 6px;color:#F59E0B;font-size:18px;letter-spacing:.12em;text-transform:uppercase}}
p{{margin:0 0 18px;font-size:13px;line-height:1.6;color:#CBD5E1}}
.opcion{{display:block;border:2px solid #475569;padding:14px;margin-bottom:12px;cursor:pointer}}
.opcion:has(input:checked){{border-color:#F59E0B;background:rgba(245,158,11,.12)}}
.opcion input{{accent-color:#F59E0B;margin-right:8px;transform:scale(1.2)}}
.fila{{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-weight:900}}
.precio{{font-size:20px;color:#F59E0B}}
.detalle{{margin-top:6px;font-size:12px;color:#CBD5E1}}
.ahorro{{display:inline-block;background:#F59E0B;color:#1E293B;font-weight:900;font-size:11px;padding:2px 6px;margin-right:8px}}
s{{color:#94A3B8;font-size:12px}}
button{{margin-top:8px;width:100%;padding:13px;font:inherit;font-weight:900;letter-spacing:.12em;text-transform:uppercase;background:#F59E0B;color:#1E293B;border:2px solid #1E293B;box-shadow:4px 4px 0 0 #F59E0B;cursor:pointer;border-radius:0}}
button:hover,button:focus-visible{{outline:none;transform:translate(-1px,-1px);box-shadow:5px 5px 0 0 #F59E0B}}
small{{display:block;margin-top:12px;color:#94A3B8;font-size:11px;text-align:center}}
</style></head><body><form class="caja" method="get" action="/pagar/{slug}">
<h1>Pagar plan</h1><p>{html.escape(reg['nombre'])} · vence el {vence(plan['proximo_pago'])}</p>
<label class="opcion"><div class="fila"><span><input type="radio" name="meses" value="1" checked autofocus>1 mes</span>
  <span class="precio">S/ {mes:.2f}</span></div>
  <div class="detalle">Pagado hasta el {hasta(1)}</div></label>
<label class="opcion"><div class="fila"><span><input type="radio" name="meses" value="12">1 año</span>
  <span class="precio">S/ {anio:.2f}</span></div>
  <div class="detalle">{ahorro}Pagado hasta el {hasta(12)}</div></label>
{'<input type="hidden" name="volver" value="cerrar">' if cerrar_al_volver else ''}
<button type="submit">Continuar al pago</button>
<small>Yape o tarjeta con Mercado Pago</small></form></body></html>"""


def crear_link_pago(slug, cerrar_al_volver=False, meses=None):
    """Link de Checkout Pro por el precio del plan. El slug va en external_reference para saber
    de quién es el pago cuando Mercado Pago avise.
    cerrar_al_volver: el pago se abrió desde el programa de PC (en el navegador); al terminar se muestra
    "Pago recibido, ya puedes cerrar" en vez de abrir otra copia del sistema."""
    reg = cliente_registrado(slug)
    plan = leer_datos()["planes"].get(slug)
    if not plan or not plan.get("precio"):
        raise ValueError("Este cliente no tiene un plan con precio.")
    link_cliente = f"{URL_PANEL}/pago-listo" if cerrar_al_volver else f"https://{slug}.{DOMINIO_BASE}"
    # Meses elegidos por el cliente (1 a 12); sin elegir, un periodo del plan a su precio
    if meses is None:
        meses, total, titulo = MESES_PLAN[plan["tipo"]], float(plan["precio"]), f"Plan {plan['tipo'].lower()}"
    else:
        if meses not in (1, 12):
            raise ValueError("Elige pagar 1 mes o 1 año.")
        total, _ = precio_meses(plan, meses)
        titulo = "1 mes" if meses == 1 else "1 año"
    pref = mp_api("POST", "/checkout/preferences", {
        "items": [{"title": f"SiuMax - {titulo} ({reg['nombre']})", "quantity": 1,
                   "unit_price": float(total), "currency_id": "PEN"}],
        # slug | vencimiento que paga | meses que cubre (lo lee el aviso de pago para avanzar el plan)
        "external_reference": f"{slug}|{plan['proximo_pago']}|{meses}",
        "notification_url": f"{URL_PANEL}/api/mercadopago/webhook",
        "back_urls": {"success": link_cliente, "pending": link_cliente, "failure": link_cliente},
        "auto_return": "approved",
        "statement_descriptor": "SIUMAX",
    })
    # Con credenciales TEST- se usa el sandbox; con las de una cuenta (real o vendedor de prueba), el link normal
    if mp_config().get("access_token", "").startswith("TEST-"):
        return pref.get("sandbox_init_point") or pref.get("init_point")
    return pref.get("init_point")


def procesar_aviso_mp(id_pago):
    """Mercado Pago avisa que hubo un pago. No se confía en el aviso: se consulta el pago
    directamente a Mercado Pago con nuestro token y solo se registra si está APROBADO."""
    if not re.fullmatch(r"\d{1,20}", str(id_pago or "")):
        return "id inválido"
    pago = mp_api("GET", f"/v1/payments/{id_pago}")
    if pago.get("status") != "approved":
        return f"pago {id_pago} en estado {pago.get('status')}"
    partes = str(pago.get("external_reference") or "").split("|")
    slug = partes[0]
    if not RE_SLUG.match(slug):
        return "pago sin cliente"
    slug = slug_actual(slug)   # pagado con el link viejo de un cliente que cambió de link
    # Meses elegidos al pagar (los links antiguos no los traen: un periodo del plan)
    meses = int(partes[2]) if len(partes) > 2 and partes[2].isdigit() and 1 <= int(partes[2]) <= MESES_MAXIMOS else None
    # Cobrando de verdad: un pago de prueba (dinero ficticio) nunca cuenta
    if mp_config().get("modo") == "produccion" and pago.get("live_mode") is False:
        print(f"MP: pago {id_pago} de {slug} RECHAZADO: es un pago de prueba", flush=True)
        return "pago de prueba rechazado"
    # El monto debe cubrir lo que cuestan esos meses (en soles)
    plan = leer_datos()["planes"].get(slug) or {}
    if not plan.get("precio"):
        return "cliente sin plan"
    esperado = precio_meses(plan, meses)[0] if meses else float(plan["precio"])
    monto = float(pago.get("transaction_amount") or 0)
    if pago.get("currency_id") != "PEN" or monto + 0.009 < esperado:
        print(f"MP: pago {id_pago} de {slug} RECHAZADO: {pago.get('currency_id')} {monto} no cubre "
              f"{meses or 'el plan'} {'meses' if meses else ''} (S/ {esperado})", flush=True)
        return "monto insuficiente"
    metodo_mp = pago.get("payment_method_id") or pago.get("payment_type_id") or ""
    fecha = (pago.get("date_approved") or "")[:10] or date.today().isoformat()
    r = registrar_pago({"slug": slug, "monto": pago.get("transaction_amount"), "metodo": "MERCADOPAGO",
                        "fecha": fecha, "nota": f"MP #{id_pago} ({metodo_mp})", "mp_id": str(id_pago),
                        "meses": meses})
    return f"{slug}: {'ya registrado' if r.get('duplicado') else 'pago registrado'}"


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
                    escribir_suscripcion(slug, plan)   # la página de suspensión ya ofrece "Pagar ahora"
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


def ip_bloqueada(ip, limite=5):
    ahora = time.time()
    fallos = [t for t in intentos.get(ip, []) if ahora - t < 900]
    intentos[ip] = fallos
    return len(fallos) >= limite


# ===================== Servidor HTTP =====================

class Panel(BaseHTTPRequestHandler):
    server_version = "SiuMaxPanel"

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
        if ruta == "/logo.png":  # logo de SiuMax (público: se ve también en el login)
            with open(os.path.join(os.path.dirname(INDEX_HTML), "logo.png"), "rb") as f:
                return self.responder(200, f.read(), "image/png")
        if ruta == "/api/sesion":
            return self.responder(200, {"autenticado": self.autenticado()})
        if ruta == "/pago-listo":  # público: fin del pago abierto desde el programa de PC
            aprobado = (parse_qs(urlparse(self.path).query).get("status") or [""])[0] == "approved"
            titulo = "✅ Pago recibido" if aprobado else "Pago no completado"
            texto = ("Gracias. Tu plan de SiuMax ya está al día.<br>Esta pestaña se cerrará sola; si no, ciérrala y vuelve a tu sistema."
                     if aprobado else "El pago no se completó. Cierra esta pestaña e inténtalo de nuevo desde tu sistema.")
            pagina = (f"<!doctype html><html lang='es'><meta charset='utf-8'><meta name='viewport' content='width=device-width'>"
                      f"<title>SiuMax</title><body style='font-family:ui-monospace,Menlo,Consolas,monospace;background:#1E293B;"
                      f"color:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;"
                      f"padding:16px;box-sizing:border-box;text-align:center'><div style='border:2px solid #F59E0B;"
                      f"box-shadow:6px 6px 0 0 #F59E0B;padding:28px 24px;max-width:440px'>"
                      f"<h2 style='color:#F59E0B;margin:0 0 12px;letter-spacing:.1em;text-transform:uppercase'>{titulo}</h2>"
                      f"<p style='margin:0;line-height:1.6'>{texto}</p></div>"
                      f"<script>setTimeout(function(){{window.close()}},{3000 if aprobado else 8000})</script></body></html>")
            return self.responder(200, pagina.encode(), "text/html")
        if ruta.startswith("/pagar/"):  # público: botón "Pagar ahora" del aviso del cliente
            slug = slug_actual(ruta[len("/pagar/"):].strip("/"))
            try:
                if ip_bloqueada("pagar:" + self.ip(), limite=30):
                    raise ValueError("Demasiados intentos. Espera unos minutos.")
                intentos.setdefault("pagar:" + self.ip(), []).append(time.time())
                consulta = parse_qs(urlparse(self.path).query)
                cerrar = (consulta.get("volver") or [""])[0] == "cerrar"
                meses_txt = (consulta.get("meses") or [""])[0]
                if not meses_txt:   # primero el cliente elige cuántos meses paga
                    return self.responder(200, pagina_elegir_meses(slug, cerrar).encode(), "text/html")
                if not meses_txt.isdigit():
                    raise ValueError("Cantidad de meses inválida.")
                link = crear_link_pago(slug, cerrar_al_volver=cerrar, meses=int(meses_txt))
                if not link:
                    raise ValueError("Mercado Pago no devolvió el link de pago.")
                return self.responder(302, b"", "text/plain", {"Location": link})
            except ValueError as e:
                aviso = (f"<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width'>"
                         f"<body style='font-family:monospace;background:#1E293B;color:#F8FAFC;display:flex;align-items:center;"
                         f"justify-content:center;min-height:100vh;margin:0;padding:16px;text-align:center'>"
                         f"<div><h2 style='color:#F59E0B'>No se pudo abrir el pago</h2><p>{str(e)}</p>"
                         f"<p>Comunícate con SiuMax.</p></div>")
                return self.responder(400, aviso.encode(), "text/html")
        if not self.autenticado():
            return self.responder(401, {"error": "Inicia sesión."})
        if ruta == "/api/resumen":
            return self.responder(200, resumen())
        if ruta == "/api/cliente":
            slug = (parse_qs(urlparse(self.path).query).get("slug") or [""])[0]
            try:
                return self.responder(200, detalle_cliente(slug))
            except ValueError as e:
                return self.responder(400, {"error": str(e)})
        return self.responder(404, {"error": "No existe."})

    def do_POST(self):
        ruta = urlparse(self.path).path
        if ruta == "/api/mercadopago/webhook":  # público: lo llama Mercado Pago
            q = parse_qs(urlparse(self.path).query)
            try:
                cuerpo = self.cuerpo_json() if (self.headers.get("Content-Length") or "0") != "0" else {}
            except (ValueError, json.JSONDecodeError):
                cuerpo = {}
            tipo = cuerpo.get("type") or cuerpo.get("topic") or (q.get("type") or q.get("topic") or [""])[0]
            id_pago = (cuerpo.get("data") or {}).get("id") or (q.get("data.id") or q.get("id") or [""])[0]
            if tipo == "payment" and id_pago:
                try:
                    sys.stderr.write(f"Mercado Pago: {procesar_aviso_mp(id_pago)}\n")
                except ValueError as e:
                    sys.stderr.write(f"Mercado Pago: error con pago {id_pago}: {e}\n")
            return self.responder(200, {"ok": True})  # siempre 200 para que no reintente sin fin
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
                ok, salida = ejecutar([f"{DIR_SIUMAX}/nuevo-cliente.sh", slug, nombre, correo],
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
                            escribir_suscripcion(slug, datos["planes"][slug])
                return self.responder(200 if ok else 500, {"ok": ok, "detalle": salida})

            if ruta == "/api/clientes/editar":
                return self.responder(200, editar_cliente(cuerpo))

            if ruta == "/api/clientes/cambiar-link":
                ok, salida = cambiar_link(cuerpo)
                if not ok:
                    return self.responder(500, {"error": "No se pudo cambiar el link.", "detalle": salida[-2000:]})
                nuevo = str(cuerpo.get("nuevo", "")).strip().lower()
                return self.responder(200, {"ok": True, "link": f"https://{nuevo}.{DOMINIO_BASE}", "detalle": salida[-2000:]})

            if ruta == "/api/clientes/borrar":
                ok, salida = borrar_cliente(cuerpo)
                if not ok:
                    return self.responder(500, {"error": "No se pudo borrar el cliente.", "detalle": salida[-2000:]})
                return self.responder(200, {"ok": True, "detalle": salida[-2000:]})

            if ruta == "/api/usuario/clave":
                return self.responder(200, restablecer_clave(cuerpo))

            if ruta == "/api/plan":
                return self.responder(200, {"ok": True, "plan": guardar_plan(cuerpo)})

            if ruta == "/api/pago":
                return self.responder(200, dict(registrar_pago(cuerpo), ok=True))

            if ruta == "/api/backup":
                ok, salida = ejecutar([f"{DIR_SIUMAX}/backup.sh"], espera=900)
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
    if len(sys.argv) > 1 and sys.argv[1] == "configurar-mp":
        token = os.environ.get("MP_ACCESS_TOKEN", "").strip()
        modo = os.environ.get("MP_MODO", "prueba")
        if not token.startswith(("APP_USR-", "TEST-")) or modo not in ("prueba", "produccion"):
            sys.exit("MP_ACCESS_TOKEN o MP_MODO inválidos.")
        guardar_json(MERCADOPAGO, {"access_token": token, "modo": modo,
                                   "actualizado": datetime.now().isoformat(timespec="seconds")})
        # Los avisos de cada cliente ahora llevan el botón "Pagar ahora"
        for slug, plan in leer_datos()["planes"].items():
            escribir_suscripcion(slug, plan)
        print(f"Mercado Pago configurado en modo {modo}.")
        return
    if not os.path.isfile(ADMIN):
        sys.exit("Falta la contraseña del panel: ejecuta PANEL_CLAVE='...' panel.py crear-clave")
    print(f"Panel SiuMax en 127.0.0.1:{PUERTO}")
    ThreadingHTTPServer(("127.0.0.1", PUERTO), Panel).serve_forever()


if __name__ == "__main__":
    main()

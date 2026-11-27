// SiuMax para escritorio (PC de la caja).
// Abre el sistema del cliente desde el VPS en su propia ventana, así cada actualización
// llega al instante sin reinstalar, y agrega lo que el navegador no puede: imprimir tickets
// directo a la impresora elegida, sin la ventana de impresión.
const { app, BrowserWindow, Menu, ipcMain, shell, dialog, nativeImage, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const REVISAR_ACTUALIZACION_MS = 6 * 60 * 60 * 1000;

const DOMINIO_CLIENTES = 'nego.siumax.duckdns.org';     // clientes: <negocio>.nego.siumax.duckdns.org (SiuMax Nego, desde el 13/11/2026; antes .comerc)

// Preferencias de la PC (link del negocio e impresora). Se guardan en la carpeta de datos del usuario.
const archivoConfig = () => path.join(app.getPath('userData'), 'config.json');
const leerConfig = () => {
  try { return JSON.parse(fs.readFileSync(archivoConfig(), 'utf8')); } catch { return {}; }
};
const guardarConfig = (cambios) => {
  const config = { ...leerConfig(), ...cambios };
  fs.writeFileSync(archivoConfig(), JSON.stringify(config, null, 2));
  return config;
};

// Link del negocio:
//  - instalador de un cliente: viene fijo en destino.json (lo escribe build-escritorio.cjs)
//  - instalador genérico (sin url): se pregunta la primera vez y queda guardado en config.json
const DESTINO_FIJO = (() => {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'destino.json'), 'utf8'));
    return d.url ? d : null;
  } catch {
    return null;
  }
})();
const urlNegocio = () => (DESTINO_FIJO ? DESTINO_FIJO.url : leerConfig().url || null);
const origenNegocio = () => {
  const u = urlNegocio();
  return u ? new URL(u).origin : null;
};

const MARCAS_POR_DOMINIO = {
  'ecosistema123.duckdns.org': 'ECO SISTEMAS URH',
};

const aplicarIconoRemoto = async (origen) => {
  if (!ventana || ventana.isDestroyed() || !origen) return;
  const urlIcono = `${origen}/icons/icon-192.png`;
  try {
    const res = await net.fetch(urlIcono, { cache: 'no-store' });
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const img = nativeImage.createFromBuffer(buf);
    if (img.isEmpty() || ventana.isDestroyed()) return;
    ventana.setIcon(img);
    iconoActual = urlIcono;
  } catch { /* sin icono remoto: se mantiene el icono local */ }
};

const actualizarMarcaVentana = async (tituloForzado) => {
  const origen = origenNegocio();
  if (!ventana || ventana.isDestroyed() || !origen) return;
  await aplicarIconoRemoto(origen);
  try {
    let limpio = String(tituloForzado || '').trim().slice(0, 120);
    if (!limpio) {
      limpio = String(await ventana.webContents.executeJavaScript('document.title || ""').catch(() => '')).trim().slice(0, 120);
    }
    if (!limpio || /^SiuMax\b/i.test(limpio)) {
      const host = new URL(origen).hostname.toLowerCase();
      limpio = MARCAS_POR_DOMINIO[host] || limpio;
    }
    if (limpio && !ventana.isDestroyed()) {
      const cambio = limpio !== marcaActual;
      marcaActual = limpio;
      ventana.setTitle(limpio);
      if (cambio) construirMenu().catch(() => {});
    }
  } catch { /* sin titulo */ }
};

let ventana = null;
let marcaActual = 'SiuMax';
let iconoActual = '';
const nombreMarca = () => marcaActual || 'SiuMax';

// Una sola ventana: si abren el ícono otra vez, se trae la que ya está abierta
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!ventana) return;
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  });
}

const cargarSistema = () => {
  const url = urlNegocio();
  if (!url) {
    ventana.loadFile(path.join(__dirname, 'configurar.html'));
    return;
  }
  ventana.loadURL(url).catch(() => {
    ventana.loadFile(path.join(__dirname, 'sin-conexion.html'));
  });
};

const crearVentana = () => {
  ventana = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#1E293B',
    title: 'SiuMax',
    icon: path.join(__dirname, 'icono.png'),
    autoHideMenuBar: true, // el menú aparece con la tecla Alt, para no quitar espacio
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  ventana.once('ready-to-show', () => {
    ventana.maximize();
    ventana.show();
  });

  // Solo se navega dentro del sistema del cliente; cualquier otro link se abre en el navegador
  ventana.webContents.on('will-navigate', (e, url) => {
    const origen = origenNegocio();
    if (!(origen && url.startsWith(origen)) && !url.startsWith('file://')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Sin internet: pantalla local de "Sin conexión" con botón para reintentar
  ventana.webContents.on('did-fail-load', (_e, _codigo, _desc, url, esPrincipal) => {
    const origen = origenNegocio();
    if (esPrincipal && origen && url.startsWith(origen)) {
      ventana.loadFile(path.join(__dirname, 'sin-conexion.html'));
    }
  });
  ventana.webContents.on('did-finish-load', () => { void actualizarMarcaVentana(); });
  ventana.webContents.on('page-title-updated', (e, titulo) => {
    e.preventDefault();
    void actualizarMarcaVentana(titulo);
  });
  ventana.webContents.on('did-navigate', () => { void aplicarIconoRemoto(origenNegocio()); });

  cargarSistema();
};

// === IMPRESIÓN DIRECTA ===
// La página manda el HTML del ticket; se carga en una ventana invisible y se imprime en silencio.
ipcMain.handle('imprimir', async (_e, { html, titulo }) => {
  const { impresora } = leerConfig();
  const ancho80mm = Math.round((80 / 25.4) * 96); // ~302px CSS a 96dpi, viewport real para ticket 80mm
  const oculta = new BrowserWindow({
    show: false,
    width: ancho80mm,
    height: 900,
    useContentSize: true,
    webPreferences: { sandbox: true },
  });
  try {
    oculta.webContents.setZoomFactor(1);
    await oculta.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise((r) => setTimeout(r, 450));

    // Medir alto real del contenido (solo body, no documentElement.scrollHeight
    // porque puede reflejar el viewport grande y generar papel en blanco).
    const altoPx = await oculta.webContents.executeJavaScript(`(() => {
      const b = document.body, d = document.documentElement;
      [d, b].forEach((el) => {
        if (!el) return;
        el.style.margin = '0';
        el.style.marginTop = '0';
        el.style.height = 'auto';
        el.style.minHeight = '0';
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
      });
      void (b && b.offsetHeight);
      window.scrollTo(0, 0);
      const rectB = b ? b.getBoundingClientRect() : null;
      return Math.ceil(Math.max(
        rectB?.bottom || 0,
        b?.scrollHeight || 0,
        b?.offsetHeight || 0
      ));
    })()`).catch(() => 0);

    const altoFinal = altoPx > 0 ? Math.max(altoPx + 16, 200) : 1200;
    oculta.setContentSize(ancho80mm, altoFinal);
    await new Promise((r) => setTimeout(r, 200));
    const altoMicras = Math.max(Math.round((altoFinal * 25400) / 96) + 1500, 40000);

    return await new Promise((resolve) => {
      oculta.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: impresora || undefined,
          margins: { marginType: 'none' },
          pageSize: { width: 80000, height: altoMicras },
        },
        (ok, motivo) => resolve({ ok, motivo: ok ? null : motivo || 'No se pudo imprimir' })
      );
    });
  } catch (err) {
    return { ok: false, motivo: String(err && err.message ? err.message : err) };
  } finally {
    setTimeout(() => { if (!oculta.isDestroyed()) oculta.destroy(); }, 1000);
    if (titulo) console.log('Impreso:', titulo);
  }
});

ipcMain.handle('reintentar', () => cargarSistema());

// Instalador genérico: el usuario escribe "minegocio" o el link completo; se comprueba que sea un sistema SiuMax
ipcMain.handle('configurar', async (_e, texto) => {
  let valor = String(texto || '').trim().toLowerCase();
  if (!valor) return { ok: false, motivo: 'Escribe el link de tu negocio.' };
  if (!/^https?:\/\//.test(valor)) {
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(valor)) {
      return { ok: false, motivo: 'Link inválido: usa solo letras minúsculas, números y guiones.' };
    }
    valor = `https://${valor}.${DOMINIO_CLIENTES}`;
  }
  let url;
  try { url = new URL(valor); } catch { return { ok: false, motivo: 'Link inválido.' }; }
  if (url.protocol !== 'https:') return { ok: false, motivo: 'El link debe empezar con https://' };
  try {
    const r = await fetch(`${url.origin}/manifest.json`, { cache: 'no-store' });
    const manifiesto = r.ok ? await r.json() : null;
    // 'SiuHub' es el nombre anterior: sistemas que aún no se actualizaron (ej. Evicamp) siguen siendo válidos
    if (!manifiesto || !['SiuMax', 'SiuHub'].includes(manifiesto.name)) throw new Error('no es SiuMax');
  } catch {
    return { ok: false, motivo: `No se encontró un sistema SiuMax en ${url.origin}. Revisa el link y el internet.` };
  }
  guardarConfig({ url: url.origin });
  cargarSistema();
  construirMenu();
  return { ok: true };
});

// === ACTUALIZACIÓN AUTOMÁTICA DEL PROGRAMA (como Discord) ===
// El sistema (ventas, inventario...) ya se actualiza solo desde el VPS; esto actualiza el
// programa en sí (impresión, menú, ícono). Descarga en segundo plano y nunca corta una venta:
// pregunta antes de reiniciar y, si se elige "Después", se instala al cerrar el programa.
let avisoPendiente = false;
let revisionManual = false;

const configurarActualizaciones = () => {
  if (!app.isPackaged) return; // en desarrollo (npm start) no hay nada que actualizar
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', async (info) => {
    if (avisoPendiente) return;
    avisoPendiente = true;
    const { response } = await dialog.showMessageBox(ventana, {
      type: 'info',
      title: `Actualización de ${nombreMarca()}`,
      message: `Hay una nueva versión de ${nombreMarca()} (${info.version}) lista para instalar.`,
      detail: 'Se instala en unos segundos. Si estás atendiendo una venta, elige "Después": se instalará sola al cerrar el programa.',
      buttons: ['Reiniciar ahora', 'Después'],
      defaultId: 1,
      cancelId: 1,
    });
    avisoPendiente = false;
    if (response === 0) autoUpdater.quitAndInstall(true, true);
  });

  autoUpdater.on('update-not-available', () => {
    if (revisionManual) dialog.showMessageBox(ventana, { type: 'info', title: nombreMarca(), message: `Ya tienes la última versión (${app.getVersion()}).` });
    revisionManual = false;
  });

  autoUpdater.on('error', (err) => {
    console.error('Actualización:', err && err.message);
    if (revisionManual) dialog.showMessageBox(ventana, { type: 'warning', title: nombreMarca(), message: 'No se pudo buscar actualizaciones. Revisa el internet.' });
    revisionManual = false;
  });

  const revisar = () => autoUpdater.checkForUpdates().catch(() => {});
  revisar();
  setInterval(revisar, REVISAR_ACTUALIZACION_MS);
};

const buscarActualizacionManual = () => {
  if (!app.isPackaged) return;
  revisionManual = true;
  autoUpdater.checkForUpdates().catch(() => {});
};

// === MENÚ (tecla Alt) ===
const construirMenu = async () => {
  const impresoras = ventana ? await ventana.webContents.getPrintersAsync() : [];
  const { impresora } = leerConfig();

  const elegir = (nombre) => {
    guardarConfig({ impresora: nombre });
    construirMenu();
  };

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: nombreMarca(),
      submenu: [
        { label: 'Recargar', accelerator: 'F5', click: () => cargarSistema() },
        { label: 'Pantalla completa', accelerator: 'F11', click: () => ventana.setFullScreen(!ventana.isFullScreen()) },
        ...(DESTINO_FIJO ? [] : [{
          label: 'Cambiar link del negocio...',
          click: () => { guardarConfig({ url: null }); cargarSistema(); },
        }]),
        { type: 'separator' },
        { label: 'Salir', role: 'quit' },
      ],
    },
    {
      label: 'Impresora de tickets',
      submenu: [
        {
          label: 'Predeterminada de Windows',
          type: 'radio',
          checked: !impresora,
          click: () => elegir(null),
        },
        ...impresoras.map((p) => ({
          label: p.displayName || p.name,
          type: 'radio',
          checked: impresora === p.name,
          click: () => elegir(p.name),
        })),
        { type: 'separator' },
        { label: 'Actualizar lista de impresoras', click: () => construirMenu() },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: `Acerca de ${nombreMarca()}`,
          click: () => dialog.showMessageBox(ventana, {
            type: 'info',
            title: nombreMarca(),
            message: `${nombreMarca()} ${app.getVersion()}`,
            detail: `Programa: SiuMax ${app.getVersion()}\nConectado a: ${urlNegocio() || '(sin configurar)'}\nImpresora: ${leerConfig().impresora || 'predeterminada de Windows'}`,
          }),
        },
        { label: 'Buscar actualizaciones', click: () => buscarActualizacionManual() },
        { label: 'Herramientas de desarrollo', accelerator: 'Ctrl+Shift+I', click: () => ventana.webContents.toggleDevTools() },
      ],
    },
  ]));
};

app.whenReady().then(() => {
  // Un instalador de cliente trae su link fijo; se guarda también en la configuración para que,
  // al actualizarse con la versión genérica, la app siga abriendo el mismo negocio.
  if (DESTINO_FIJO && leerConfig().url !== DESTINO_FIJO.url) guardarConfig({ url: DESTINO_FIJO.url });
  crearVentana();
  construirMenu();
  configurarActualizaciones();
});

app.on('window-all-closed', () => app.quit());

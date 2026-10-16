// SiuMax para escritorio (PC de la caja).
// Abre el sistema del cliente desde el VPS en su propia ventana, así cada actualización
// llega al instante sin reinstalar, y agrega lo que el navegador no puede: imprimir tickets
// directo a la impresora elegida, sin la ventana de impresión.
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const REVISAR_ACTUALIZACION_MS = 6 * 60 * 60 * 1000;

const DOMINIO_CLIENTES = 'siumax.duckdns.org';

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

let ventana = null;

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

  cargarSistema();
};

// === IMPRESIÓN DIRECTA ===
// La página manda el HTML del ticket; se carga en una ventana invisible y se imprime en silencio.
ipcMain.handle('imprimir', async (_e, { html, titulo }) => {
  const { impresora } = leerConfig();
  const oculta = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await oculta.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return await new Promise((resolve) => {
      oculta.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: impresora || undefined, // sin elegir: usa la impresora predeterminada de Windows
          margins: { marginType: 'none' },
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
      title: 'Actualización de SiuMax',
      message: `Hay una nueva versión de SiuMax (${info.version}) lista para instalar.`,
      detail: 'Se instala en unos segundos. Si estás atendiendo una venta, elige "Después": se instalará sola al cerrar el programa.',
      buttons: ['Reiniciar ahora', 'Después'],
      defaultId: 1,
      cancelId: 1,
    });
    avisoPendiente = false;
    if (response === 0) autoUpdater.quitAndInstall(true, true);
  });

  autoUpdater.on('update-not-available', () => {
    if (revisionManual) dialog.showMessageBox(ventana, { type: 'info', title: 'SiuMax', message: `Ya tienes la última versión (${app.getVersion()}).` });
    revisionManual = false;
  });

  autoUpdater.on('error', (err) => {
    console.error('Actualización:', err && err.message);
    if (revisionManual) dialog.showMessageBox(ventana, { type: 'warning', title: 'SiuMax', message: 'No se pudo buscar actualizaciones. Revisa el internet.' });
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
      label: 'SiuMax',
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
          label: 'Acerca de SiuMax',
          click: () => dialog.showMessageBox(ventana, {
            type: 'info',
            title: 'SiuMax',
            message: `SiuMax ${app.getVersion()}`,
            detail: `Conectado a: ${urlNegocio() || '(sin configurar)'}\nImpresora: ${leerConfig().impresora || 'predeterminada de Windows'}`,
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

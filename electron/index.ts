import { app, BrowserWindow, globalShortcut, dialog, ipcMain, clipboard, Menu, MenuItem, nativeImage, Tray, screen } from 'electron'
import { join } from 'node:path'
import screenCapture from './screen-capture'
///node_modules/vite-plugin-electron/index.js startup->spawn('chcp 65001 && ' + electronPath, argv, { stdio: "inherit", shell: true });
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
if (process.platform === 'win32') {
	app.commandLine.appendSwitch('wm-window-animations-disabled')
}
app.disableHardwareAcceleration()
app.setAppUserModelId(app.getName())
if (!app.requestSingleInstanceLock()) {
	app.quit()
	process.exit(0)
}
process.env.DIST_ELECTRON = __dirname
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? join(process.env.DIST_ELECTRON, '../public') : process.env.DIST
process.env.USER_DATA_PATH = app.getPath('userData')
process.env.APP_ICON = join(process.env.PUBLIC, 'favicon.ico')
let win: BrowserWindow | null = null

function onExceptionMsg() {
	try {
		dialog.showMessageBoxSync({ message: '程序运行中发生错误!', type: 'error', title: 'Bob for Electron Error' })
	} catch {
	}
	app.exit(0)
}

function showMainWindow(params?: { base64?: string, trans?: boolean, text?: string }) {
	if (!win) return
	if (win.isMinimized())
		win.restore()
	win.setAlwaysOnTop(true)
	win.show()
	win.focus()
	win.webContents.send('show', params)
}

app.whenReady().then(() => {
	process.on('uncaughtException', onExceptionMsg)
	process.on('unhandledRejection', onExceptionMsg)
	const primaryDisplay = screen.getPrimaryDisplay()
	win = new BrowserWindow({
		show: true, title: 'Bob for electron', icon: process.env.APP_ICON,
		x: primaryDisplay.bounds.width - 450 - 40, y: 40, width: 450, height: 256,
		resizable: true, backgroundColor: '#00000000', alwaysOnTop: true,
		transparent: true, skipTaskbar: true, frame: false,
		useContentSize: true,
		webPreferences: {
			nodeIntegration: true, contextIsolation: false,
			webSecurity: false, spellcheck: false
		}
	})
	win.on('ready-to-show', () => {
		win.show()
		win.focus()
	})
	if (process.env.VITE_DEV_SERVER_URL) {
		win.loadURL(process.env.VITE_DEV_SERVER_URL).catch()
	} else {
		win.loadFile(join(process.env.DIST, 'index.html')).catch()
	}
	win.on('close', (e) => {
		e.preventDefault()
		e.returnValue = false
		win.hide()
	})
	win.setMenu(null)
	win.setIcon(join(process.env.PUBLIC, 'favicon.ico'))
	
	win.on('blur', () => win.webContents.send('blur'))
	app.on('second-instance', () => showMainWindow())
	app.on('activate', () => showMainWindow())
	/** 取消注册热键 */
	app.on('will-quit', () => {
		try {
			globalShortcut.unregisterAll()
		} catch {
		}
	})
	const win_width = win.getSize()[0]
	ipcMain.handle('setHeight', (e, height) => {
		try {
			win.focus()
			win.setBounds({
				x: primaryDisplay.bounds.width - 450 - 40, y: 40, width: 450, height: height
			})
			win.setSize(win_width, height, true)
			win.setMaximumSize(win_width, height)
			win.setMinimumSize(win_width, height)
			win.setSize(win_width, height, true)
			win.setMaximumSize(win_width, height)
			win.setMinimumSize(win_width, height)
		} catch {
		}
	})
	ipcMain.handle('show', () => win.show())
	ipcMain.handle('focus', () => win.focus())
	ipcMain.on('hide', () => win.hide())
	
	async function invokeScreenshot(ocr: boolean, trans: boolean) {
		try {
			const isVisible = win.isVisible()
			win.hide()
			//return
			//const res = await Screenshot()
			const res = await screenCapture()
			if (!res) {
				isVisible && win.show()
				return
			}
			if (res.type === 'color') {
				clipboard.writeText(res.data)
				return
			}
			if (!ocr) {
				try {
					clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(res.data, 'base64')))
				} catch {
				}
				isVisible && win.show()
				return
			}
			if (!res.data) {
				if (!isVisible) return
			}
			showMainWindow({ base64: res.data, trans })
		} catch {
		}
	}
	
	ipcMain.on('screenshot', (event, { ocr, trans }) => invokeScreenshot(ocr, trans))
	
	//  选择语言
	let current_lang_menu: Menu = undefined
	ipcMain.on('show-lang-menu', function (event, args) {
		const { from, to, target, x, y } = args
		if (!target) {
			current_lang_menu && current_lang_menu.closePopup(win)
			return
		}
		const list = [
			{ label: '自动检测', enabled: true },
			...args.languages.map(x => {
				return { label: x.name, enabled: true }
			})
		]
		for (const item of list as MenuItem[]) {
			item.click = function (menuItem: MenuItem) {
				try {
					win.webContents.send('select-lang', { target, lang: menuItem.label })
					current_lang_menu.closePopup(win)
				} catch {
				}
			}
		}
		const item = list.find(x => x.label === (target === 'from' ? from : to))
		item.checked = true
		item.enabled = false
		const menu = Menu.buildFromTemplate(list as any)
		menu.on('menu-will-close', function () {
			win.webContents.send('lang-menu-close')
		})
		menu.popup({ x, y, window: win })
	})
	
	/** 输入文本翻译 ctrl + alt + shift + f1 */
	globalShortcut.register('CommandOrControl+Shift+F1', () => {
		if (win.isVisible()) {
			win.hide()
			return
		}
		showMainWindow()
	})
	
	/** ocr后翻译 ctrl + alt + shitf + f2 */
	globalShortcut.register('CommandOrControl+Shift+F2', () => invokeScreenshot(true, true))
	
	/** 复制剪切板翻译 ctrl + alt + shitf + f3 -> translate，需AutoHotKey配合 */
	async function copyTrans() {
		let text = '~!@#empty'
		try {
			text = clipboard.readText()
		} catch {
		}
		showMainWindow({ text, trans: true })
	}
	
	globalShortcut.register('CommandOrControl+Shift+F3', copyTrans)
	
	/** 截图 ctrl + alt + shift + f4 */
	globalShortcut.register('CommandOrControl+Shift+F4', () => invokeScreenshot(false, false))
	
	/** 截图 ocr不翻译 ctrl + alt + shift + f5 */
	globalShortcut.register('CommandOrControl+Shift+F5', () => invokeScreenshot(true, false))
	
	/** 托盘图标 */
	const tray = new Tray(join(process.env.PUBLIC, 'favicon.ico'))
	const template: any[] = [
		{ label: '输入翻译', accelerator: 'CommandOrControl+Shift+F1', click: () => showMainWindow() },
		{ label: 'OCR翻译', accelerator: 'CommandOrControl+Shift+F2', click: () => invokeScreenshot(true, true) },
		{ label: '拷贝翻译', accelerator: 'CommandOrControl+Shift+F3', click: copyTrans },
		{ type: 'separator' },
		{ label: '截图/取色', accelerator: 'CommandOrControl+Shift+F4', click: () => invokeScreenshot(false, false) },
		{ label: 'OCR文本识别', accelerator: 'CommandOrControl+Shift+F5', click: () => invokeScreenshot(true, false) },
		{ type: 'separator' },
		{ label: '退出', click: () => app.exit(0) }
	]
	tray.setContextMenu(Menu.buildFromTemplate(template))
	tray.setToolTip(`Bob for Electron`)
	tray.on('double-click', () => showMainWindow())
})

app.on('window-all-closed', () => app.exit(0))

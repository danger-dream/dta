import { BrowserWindow, clipboard, dialog, ipcMain, Menu, MenuItem, nativeImage, screen } from 'electron'
import { enable } from '@electron/remote/main'
import screenCapture, { Init } from './screen-capture'
import { join } from 'node:path'
import Store from './store'

let win: BrowserWindow | null = null
const winWidth = 450

export default async function (store: Store) {
	Init()
	const primaryDisplay = screen.getPrimaryDisplay()
	store.TransWin = win = new BrowserWindow({
		show: false, x: primaryDisplay.bounds.width - winWidth - 40, y: 40, width: winWidth, height: 215,
		resizable: true, backgroundColor: '#FFF', alwaysOnTop: true,
		transparent: false, skipTaskbar: true, frame: false, hasShadow: true,
		webPreferences: {
			nodeIntegration: true, contextIsolation: false,
			webSecurity: false, spellcheck: false
		}
	})
	enable(win.webContents)
	if (store.isPack) {
		win.loadFile(join(store.resourcesPath, 'translate.html')).catch()
	} else {
		win.loadURL(store.devUrl + 'translate.html').catch()
		//win.webContents.openDevTools({ mode: 'detach' })
	}
	win.on('close', (e) => {
		e.preventDefault()
		e.returnValue = false
		win.hide()
	})
	win.setMenu(null)
	win.on('show', () => setTimeout(() => win.setOpacity(1), 50))
	win.on('hide', () => win.setOpacity(0))
	
	
	ipcMain.handle('trans-setHeight', (e, height) => {
		win.resizable = true
		win.focus()
		for (let i = 0; i < 2; i++) {
			win.setSize(winWidth, height, false)
			win.setMaximumSize(winWidth, height)
			win.setMinimumSize(winWidth, height)
		}
		win.resizable = false
	})
	ipcMain.handle('trans-show', () => win.show())
	ipcMain.handle('trans-focus', () => win.focus())
	ipcMain.on('trans-hide', () => win.hide())
	
	async function invokeScreenshot(ocr: boolean, trans: boolean) {
		try {
			const isVisible = win.isVisible()
			win.hide()
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
			store.showMainWindow({ base64: res.data, trans })
		} catch (e) {
			dialog.showMessageBoxSync({ message: 'error-trans: ' + e.message })
		}
	}
	
	ipcMain.on('trans-screenshot', (event, { ocr, trans }) => invokeScreenshot(ocr, trans))
	
	//  选择语言
	let current_lang_menu: Menu = undefined
	ipcMain.on('trans-show-lang-menu', function (event, args) {
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
	store.registerShortcut('CommandOrControl+Shift+F1', () => {
		if (win.isVisible()) {
			win.hide()
			return
		}
		store.showMainWindow()
	})
	
	/** ocr后翻译 ctrl + alt + shitf + f2 */
	store.registerShortcut('CommandOrControl+Shift+F2', () => invokeScreenshot(true, true))
	
	/** 复制剪切板翻译 ctrl + alt + shitf + f3 -> translate，需AutoHotKey配合 */
	async function copyTrans() {
		let text = '~!@#empty'
		try {
			text = clipboard.readText()
		} catch {
		}
		store.showMainWindow({ text, trans: true })
	}
	
	store.registerShortcut('CommandOrControl+Shift+F3', copyTrans)
	
	/** 截图 ctrl + alt + shift + f4 */
	store.registerShortcut('CommandOrControl+Shift+F4', () => invokeScreenshot(false, false))
	
	/** 截图 ocr不翻译 ctrl + alt + shift + f5 */
	store.registerShortcut('CommandOrControl+Shift+F5', () => invokeScreenshot(true, false))
	
	/** 托盘图标 */
	store.trayMenu.push(...[
		{ label: '输入翻译', accelerator: 'CommandOrControl+Shift+F1', click: () => store.showMainWindow() },
		{ label: 'OCR翻译', accelerator: 'CommandOrControl+Shift+F2', click: () => invokeScreenshot(true, true) },
		{ label: '拷贝翻译', accelerator: 'CommandOrControl+Shift+F3', click: copyTrans },
		{ type: 'separator' },
		{ label: '截图/取色', accelerator: 'CommandOrControl+Shift+F4', click: () => invokeScreenshot(false, false) },
		{ label: 'OCR文本识别', accelerator: 'CommandOrControl+Shift+F5', click: () => invokeScreenshot(true, false) }
	] as any)
}

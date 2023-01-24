import { app, BrowserWindow, globalShortcut, dialog, ipcMain, clipboard, Menu, MenuItem, nativeImage, Tray } from 'electron'
import Store from './store'
import { IConfig } from '../types'
import default_config from './config'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import LibOCR from './ocr'
import Translate from './translate'
import LangTesting from './LangTesting'

const store = new Store('conf', 'bob-for-electron')
let conf: IConfig = store.get('config', default_config)

function onExceptionMsg() {
	try {
		dialog.showMessageBoxSync({ message: '程序运行中发生错误!', type: 'error', title: 'Bob for Electron Error' })
	} catch {
	}
	app.exit(0)
}

process.on('uncaughtException', onExceptionMsg)
process.on('unhandledRejection', onExceptionMsg)

async function sleep(t = 300) {
	return new Promise(r => setTimeout(r, t))
}

async function runShareX(): Promise<void> {
	return new Promise(resolve => {
		try {
			const proc = spawn('ShareX.exe', [], { cwd: app.isPackaged ? process.resourcesPath : join(__dirname, '../build') })
			proc.on('exit', function () {
				resolve()
			})
		} catch {
			resolve()
		}
	})
}

/**
 * 调用ShareX截图/取色
 * @param {boolean} ocr
 * @returns {Promise<{type: "ocr" | "color", status: boolean, text: "", img?: string}>}
 * @constructor
 */
export async function ShareX(ocr: boolean = true): Promise<{ type: 'ocr' | 'color', status: boolean, text: '', img?: string }> {
	//  读取历史剪贴板数据
	let old_text = ''
	try {
		old_text = clipboard.readText()
	} catch {
	}
	
	function recovery(obj) {
		try {
			clipboard.writeText(old_text)
		} catch {
		}
		return obj
	}
	
	try {
		// 置空
		clipboard.writeText('')
	} catch {
	}
	//  调用ShareX
	await runShareX()
	try {
		//  读取剪贴板
		const text = clipboard.readText()
		if (text === 'ocr:empty') {
			//  取消截图
			return recovery({ type: 'ocr', status: true, text: '' })
		}
		const arr = text.split(':')
		if (arr.length !== 2) {
			return recovery({ type: 'ocr', status: false, text: '错误的返回值' })
		}
		//  判断是ocr还是取色
		if (arr[0] === 'ocr') {
			let text = ''
			//  是否进行文本识别
			if (ocr) {
				text = await LibOCR(conf, arr[1])
				if (conf.ocr_clipboard) {
					try {
						clipboard.writeText(text)
					} catch {
					}
				}
			}
			return recovery({ type: 'ocr', status: true, text, img: arr[1] })
		} else {
			return recovery({ type: 'color', status: true, text: arr[1] })
		}
	} catch (e) {
		return recovery({ type: 'ocr', status: false, text: e.message })
	}
}

export default async function (win: BrowserWindow) {
	function showWin() {
		try {
			if (!win) return
			if (win.isMinimized())
				win.restore()
			win.show()
		} catch {
		}
	}
	
	function clearPage() {
		win.webContents.send('clear')
	}
	
	//  失去焦点时，如果不是钉住状态就隐藏窗口
	win.on('blur', () => {
		!conf.pinup && win.hide()
	}).on('show', function () {
		setTimeout(function () {
			app.focus()
			win.setAlwaysOnTop(true)
			win.focus()
			win.webContents.send('win-show-focus')
		}, 100)
	})
	app.on('second-instance', inputTranslate)
	app.on('activate', inputTranslate)
	/** 取消注册热键 */
	app.on('will-quit', () => {
		try {
			globalShortcut.unregisterAll()
		} catch {
		}
	})
	
	//  获取窗口大小
	ipcMain.handle('getSize', () => win ? win.getSize() : [0, 0])
	//  设置窗口大小
	ipcMain.handle('setSize', (e, { width, height }) => {
		win.setSize(width, height, false)
		win.setMaximumSize(width, height)
		win.setMinimumSize(width, height)
	})
	//  获取配置文件
	ipcMain.handle('get-config', () => conf)
	//  设置配置文件
	ipcMain.on('set-config', (event, args) => {
		conf = args
		conf.init = false
		store.set('config', conf)
	})
	//  窗口获取焦点...
	ipcMain.handle('focus', () => win.focus())
	//  检测语言
	ipcMain.handle('lang-testing', (evente, text) => LangTesting(conf, text))
	//  翻译单个API
	ipcMain.on('translate-item', (event, args) => {
		const { name, text, from, to, id } = args
		const item = conf.translate.find(x => x.name === name)
		if (!item || !item.enable) {
			win.webContents.send('translate-result', { id, result: [] })
		} else {
			Translate(conf, item, text, from, to).then((res) => win.webContents.send('translate-result', { id, result: res }))
		}
	})
	
	//  选择语言
	let current_lang_menu: Menu = undefined
	ipcMain.on('show-lang-menu', function (event, args) {
		const { from, to, target, x, y } = args
		if (!target) {
			current_lang_menu && current_lang_menu.closePopup(win)
			return
		}
		const list = [
			{ label: '自动检测', type: 'radio', checked: false, enabled: true },
			...conf.languages.map(x => {
				return { label: x.name, type: 'radio', checked: false, enabled: true }
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
	function inputTranslate() {
		clearPage()
		showWin()
		win.webContents.send('input-translate')
	}
	
	globalShortcut.register('CommandOrControl+Shift+F1', () => {
		if (win.isVisible()) {
			win.hide()
			return
		}
		inputTranslate()
	})
	
	/** ocr后翻译 ctrl + alt + shitf + f2 */
	async function ocrTranslate() {
		clearPage()
		win.hide()
		const res = await ShareX()
		if (res.type === 'color' || (res.type === 'ocr' && !res.text)) return
		showWin()
		win.webContents.send('ocr-result', res)
	}
	
	ipcMain.on('ocr-translate', ocrTranslate)
	globalShortcut.register('CommandOrControl+Shift+F2', ocrTranslate)
	
	/** 复制剪切板翻译 -> translate，需AutoHotKey配合 */
	async function copyTranslate() {
		await sleep(300)
		clearPage()
		let text = '~!@#empty'
		try {
			text = clipboard.readText()
		} catch {
		}
		showWin()
		win.webContents.send('text-translate', text)
	}
	
	globalShortcut.register('CommandOrControl+Shift+F3', copyTranslate)
	
	
	/** 截图 ctrl + alt + shift + f4 */
	async function screenshot() {
		win.hide()
		const res = await ShareX(false)
		if (res.type === 'ocr' && res.status) {
			try {
				clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(res.img, 'base64')))
			} catch {
			}
		}
	}
	
	ipcMain.on('screenshot', screenshot)
	globalShortcut.register('CommandOrControl+Shift+F4', screenshot)
	
	
	/** ocr不翻译 ctrl + alt + shift + f5 */
	async function Ocr() {
		clearPage()
		win.hide()
		const res = await ShareX()
		if (res.type === 'color' || (res.type === 'ocr' && !res.text)) return
		showWin()
		win.webContents.send('text-result', res)
	}
	
	ipcMain.on('ocr-not-translate', Ocr)
	globalShortcut.register('CommandOrControl+Shift+F5', Ocr)
	
	/** 托盘图标 */
	const tray = new Tray(join(process.env.PUBLIC, 'favicon.ico'))
	const template: any[] = [
		{ label: '输入翻译', accelerator: 'CommandOrControl+Shift+F1', click: inputTranslate },
		{ label: 'OCR翻译', accelerator: 'CommandOrControl+Shift+F2', click: ocrTranslate },
		{ label: '拷贝翻译', accelerator: 'CommandOrControl+Shift+F3', click: copyTranslate },
		{ type: 'separator' },
		{ label: '截图/取色', accelerator: 'CommandOrControl+Shift+F4', click: screenshot },
		{ label: 'OCR文本识别', accelerator: 'CommandOrControl+Shift+F5', click: Ocr },
		{ type: 'separator' },
		{ label: '退出', click: () => app.exit(0) }
	]
	tray.setContextMenu(Menu.buildFromTemplate(template))
	tray.setToolTip(`Bob for Electron`)
	tray.on('double-click', inputTranslate)
}

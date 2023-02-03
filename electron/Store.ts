import { app, BrowserWindow, dialog, globalShortcut, MenuItem, MenuItemConstructorOptions } from 'electron'
import { join } from 'node:path'
import config from './config'

process.resourcesPath
export default class Store {
	isPack = app.isPackaged
	config = config
	resourcesPath = join(__dirname, '../dist')
	publicPath = app.isPackaged ? this.resourcesPath : join(__dirname, '../public')
	devUrl = process.env.VITE_DEV_SERVER_URL || ''
	trayMenu: Array<(MenuItemConstructorOptions) | (MenuItem)> = []
	private shortcuts: Record<string, () => void> = {}
	TransWin: BrowserWindow
	TakeWordWin: BrowserWindow
	
	constructor() {
		process.on('uncaughtException', this.onExceptionMsg)
		process.on('unhandledRejection', this.onExceptionMsg)
	}
	
	onExceptionMsg(e) {
		try {
			dialog.showMessageBoxSync({ message: '程序运行中发生错误:' + e.message, type: 'error', title: 'Desktop Tools Assistant Error' })
		} catch {
		}
		app.exit(0)
		process.exit(0)
	}
	
	showMainWindow(params?: { base64?: string, trans?: boolean, text?: string }) {
		//win.webContents.on('')
		if (!this.TransWin) return
		if (this.TransWin.isMinimized())
			this.TransWin.restore()
		this.TransWin.setAlwaysOnTop(true)
		this.TransWin.show()
		const self = this
		setTimeout(function () {
			self.TransWin.focus()
			self.TransWin.webContents.send('show', params)
		}, 10)
	}
	
	registerShortcut(accelerator: string, callback: () => void) {
		if (this.shortcuts[accelerator])
			throw new Error('热键已存在')
		this.shortcuts[accelerator] = callback
		globalShortcut.register(accelerator, callback)
	}
}

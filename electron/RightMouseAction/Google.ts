import { shell } from 'electron'
export default {
	action: 'google',
	text: 'Google搜索',
	async check(): Promise<boolean> {
		return true
	},
	async call(text: string) {
		shell.openExternal('https://www.google.com/search?q=' + text).catch()
	}
}

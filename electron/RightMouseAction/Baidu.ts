import { shell } from 'electron'
export default {
	action: 'baidu',
	text: '百度搜索',
	async check(): Promise<boolean> {
		return true
	},
	async call(text: string) {
		shell.openExternal('https://www.baidu.com/#wd=' + text).catch()
	}
}

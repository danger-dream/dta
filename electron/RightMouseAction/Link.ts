import { shell } from 'electron'

export default {
	action: 'link',
	text: '打开网址',
	async check(text: string): Promise<boolean> {
		text = text.replace(/\s/g, '')
		const length = text.length
		return length >= 4 && /^(((ht|f)tps?):\/\/)?([^!@#$%^&*?.\s-]([^!@#$%^&*?.\s]{0,63}[^!@#$%^&*?.\s])?\.)+[a-z]{2,6}\/?/.test(text)
	},
	async call(text: string) {
		shell.openExternal(text).catch()
	}
}

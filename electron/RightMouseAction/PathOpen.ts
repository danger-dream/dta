import { shell } from 'electron'
import { existsSync } from 'node:fs'

export default {
	action: 'folder',
	text: '打开路径',
	async check(text: string): Promise<boolean> {
		const length = text.length
		return length >= 2 && length <= 260 && existsSync(text)
	},
	async call(text: string) {
		shell.openPath(text).catch()
	}
}

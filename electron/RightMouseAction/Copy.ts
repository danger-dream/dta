import { clipboard } from 'electron'

export default {
	action: 'copy',
	text: '拷贝',
	async check(): Promise<boolean> {
		return true
	},
	async call(text: string) {
		text && clipboard.writeText(text)
	}
}

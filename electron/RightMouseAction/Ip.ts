import { clipboard } from 'electron'

export default {
	action: 'ip',
	text: '搜索IP',
	async check(text: string): Promise<boolean> {
		const length = text.length
		return length >= 7 && /^((2(5[0-5]|[0-4]\d))|1\d{2}|[1-9]?\d)(\.((2(5[0-5]|[0-4]\d))|1\d{2}|[1-9]?\d)){3}$/.test(text)
	},
	async call(text: string) {
		text && clipboard.writeText(text)
	}
}

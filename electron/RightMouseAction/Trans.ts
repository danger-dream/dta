import Store from '../store'

export default {
	action: 'trans',
	text: '翻译',
	async check(text: string): Promise<boolean> {
		return true
	},
	async call(text: string, store: Store) {
		store.showMainWindow({ text, trans: true })
	}
}

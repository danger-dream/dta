import { OcrTranslateConfig } from '../../types'
import axios from 'axios'

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<{ name: string, text: string, status: boolean }[]> {
	const res = await axios.post(conf.url, {
		apikey: conf.apikey,
		services: conf.use_services,
		text, source_lang: from, target_lang: to
	})
	if (res.status === 200 && res.data.status) {
		delete res.data.status
		const list = []
		for (const k of Object.keys(res.data)) {
			const item = res.data[k]
			list.push({ name: conf.services.find(x => x.en === k).zh, text: item.status ? item.result : '翻译失败', status: !!item.status })
		}
		return list
	} else {
		return []
	}
}

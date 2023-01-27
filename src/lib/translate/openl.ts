import { OcrTranslateConfig } from '../../../types'
import axios from 'axios'

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<string> {
	const res = await axios.post(conf.url, {
		apikey: conf.apikey,
		services: conf.use_services,
		text, source_lang: from, target_lang: to
	})
	if (res.status === 200 && res.data.status) {
		delete res.data.status
		const list = [] as string[]
		for (const k of Object.keys(res.data)) {
			const item = res.data[k]
			list.push(`${ conf.services.find((x: any) => x.en === k).zh } - 翻译结果:\n ${ item.status ? item.result : '翻译失败' }`)
		}
		return list.join('\n\n')
	} else {
		return ''
	}
}

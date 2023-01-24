import { OcrTranslateConfig } from '../../types'
import axios from 'axios'

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<string> {
	const res = await axios.post(conf.url + '/translate', { input_text: text, langs_out: to })
	if (res.status === 200) {
		return res.data.result[to].text.join('\n')
	} else {
		return ''
	}
}

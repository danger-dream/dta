import { OcrTranslateConfig } from '../../../types'
import axios from 'axios'

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<string> {
	const res = await axios.post(conf.url, {
		source: text.split('\n').filter(x => !!x),
		trans_type: `${ from }2${ to }`,
		request_id: 'demo', detect: true
	}, { headers: { 'x-authorization': 'token ' + conf.token } })
	
	if (res.status === 200 && res.data.target?.length > 0) {
		return res.data.target.join('\n')
	} else {
		return ''
	}
}

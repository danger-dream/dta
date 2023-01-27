import { OcrTranslateConfig } from '../../../types'
import axios from 'axios'

const qs = window.require('querystring')

export default async function (conf: OcrTranslateConfig, base64: string): Promise<string> {
	
	async function getAccessToken() {
		const { token_url, client_secret, client_id } = conf
		const res = await axios.post(token_url + '?' + qs.stringify({ client_id, client_secret }))
		return res.data.access_token
	}
	
	const action = conf.type_action[conf.type]
	const res = await axios.post(conf.url + action + '?access_token=' + await getAccessToken(), {
		image: base64,
		detect_direction: conf.detect_direction,
		paragraph: true
	}, {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Accept': 'application/json'
		},
		transformRequest: [function (data) {
			return qs.stringify(data)
		}]
	})
	return res.data.words_result.map((x: any) => x.words).join('\n')
}

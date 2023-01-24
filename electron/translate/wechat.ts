import Store from '../store'
import { OcrTranslateConfig } from '../../types'
import axios from 'axios'

const store = new Store('wx', 'bob-for-electron')
const last_token_time_key = 'LAST-TOKEN-TIME-KET'
const last_token_key = 'LAST-TOKEN-KET'

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<string> {
	let token = store.get(last_token_key, '')
	if (Date.now() - store.get(last_token_time_key, 0) >= 7200 * 1000 || !token) {
		const res = await axios.get(`${ conf.url }/token?grant_type=client_credential&appid=${ conf.appid }&secret=${ conf.secret }`)
		if (res.status === 200) {
			token = res.data.access_token
			store.set(last_token_time_key, Date.now()).set(last_token_key, token)
		} else {
			throw new Error('获取微信token失败')
		}
	}
	const res = await axios.post(`${ conf.url }/media/voice/translatecontent?access_token=${ token }&lfrom=${ from }&lto=${ to }`, text)
	return res.status === 200 ? res.data.to_content || '无翻译结果' : '翻译失败'
}

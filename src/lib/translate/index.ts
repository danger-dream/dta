// @ts-ignore
import Store from './store'
import { IConfig, OcrTranslateConfig } from '../../../types'
import { localUrl } from '../../../global'
import baidu from './baidu'
import fsou from './fsou'
import openl from './openl'
import tencent from './tencent'
import wechat from './wechat'
import caiyun from './caiyun'
import google from './google'
import youdao from './youdao'
import metaAI from './metaAI'

const crypto = window.require('crypto')
const map: Record<string, (conf: OcrTranslateConfig, text: string, from: string, to: string) => Promise<string | Record<string, any>>> = { baidu, fsou, openl, tencent, metaAI, wechat, caiyun, google, youdao }
const store = new Store('history', 'bob-for-electron-history')
const historys = store.get('list', []) as { id: string, text: string, from: string, to: string, result: any }[]
const historyMap = store.get('map', {}) as Record<string, number>

export default async function (config: IConfig, item: OcrTranslateConfig, text: string, from: string, to: string): Promise<string | Record<string, any>> {
	if (!item.enable) {
		throw new Error('接口未启用')
	}
	const action = map[item.name]
	if (!action) {
		throw new Error('接口错误')
	}
	const id = crypto.createHash('md5').update(item.name + '->' + from + ':' + text + '->' + to).digest('hex')
	if (historyMap[id] && historys[historyMap[id] - 1]?.id === id) {
		return historys[historyMap[id] - 1].result
	}
	
	let lang_from = config.languages.find(x => x.name === from)![item.name]
	let lang_to = config.languages.find(x => x.name === to)![item.name]
	if (lang_from === '-') {
		throw new Error('不支持的源语言')
	}
	if (!lang_from) {
		lang_from = config.languages.find(x => x.name === from)!.default
	}
	if (lang_to === '-') {
		throw new Error('不支持的目标语言')
	}
	if (!lang_to) {
		lang_to = config.languages.find(x => x.name === to)!.default
	}
	item = JSON.parse(JSON.stringify(item))
	item.url = localUrl(config, item)
	const res = await action(item, text, lang_from, lang_to)
	if (!res) {
		throw new Error('无翻译结果')
	}
	historyMap[id] = historys.push({ id, text, from, to, result: res })
	store.set('list', historys)
	store.set('map', historyMap)
	return res
}

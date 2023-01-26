import crypto from 'node:crypto'
import Store from '../store'
import { IConfig, ITranslateResultItem, OcrTranslateConfig } from '../../types'
import baidu from './baidu'
import fsou from './fsou'
import openl from './openl'
import tencent from './tencent'
import wechat from './wechat'
import caiyun from './caiyun'
import google from './google'
import youdao from './youdao'
import metaAI from './metaAI'
import { localUrl } from '../../global'

const map = { baidu, fsou, openl, tencent, metaAI, wechat, caiyun, google, youdao }
const store = new Store('history', 'bob-for-electron-history')
const historys = store.get('list', []) as { id: string, text: string, from: string, to: string, result: any }[]
const historyMap = store.get('map', {}) as Record<string, number>

export default async function (config: IConfig, item: OcrTranslateConfig, text: string, from: string, to: string): Promise<ITranslateResultItem | ITranslateResultItem[]> {
	if (!item.enable) {
		return { name: item.name, text: '接口未启用', status: false } as any
	}
	const action = map[item.name]
	if (!action) {
		return { name: item.name, text: '接口错误', status: false } as any
	}
	const id = crypto.createHash('md5').update(item.name + '->' + from + ':' + text + '->' + to).digest('hex')
	if (historyMap[id] && historys[historyMap[id] - 1]?.id === id) {
		return JSON.parse(historys[historyMap[id] - 1].result)
	}
	
	function end_catch(obj: any) {
		if (obj.status) {
			historyMap[id] = historys.push({ id, text, from, to, result: JSON.stringify(obj) })
			store.set('list', historys)
			store.set('map', historyMap)
		}
		return obj
	}
	
	try {
		let lang_from = config.languages.find(x => x.name === from)[item.name]
		let lang_to = config.languages.find(x => x.name === to)[item.name]
		if (lang_from === '-') {
			return end_catch({ name: item.name, text: '不支持的源语言', status: false })
		}
		if (!lang_from) {
			lang_from = config.languages.find(x => x.name === from).default
		}
		if (lang_to === '-') {
			return end_catch({ name: item.name, text: '不支持的目标语言', status: false })
		}
		if (!lang_to) {
			lang_to = config.languages.find(x => x.name === to).default
		}
		item = JSON.parse(JSON.stringify(item))
		item.url = localUrl(config, item)
		const res = await action(item, text, lang_from, lang_to)
		if (!res) {
			return end_catch({ name: item.name, text: '无翻译结果', status: false })
		}
		if (Array.isArray(res)) {
			return end_catch(res.map(x => {
				x.label = item.label + ' - ' + x.name
				x.name = item.name
				return x
			}))
		} else {
			if (typeof res === 'string') {
				return end_catch({ name: item.name, text: res, status: true })
			} else {
				return end_catch(Object.assign({ name: item.name, status: true }, res))
			}
		}
	} catch (e) {
		return end_catch({ name: item.name, text: '接口调用错误: ' + e.message + '\n' + e.stack, status: false })
	}
}

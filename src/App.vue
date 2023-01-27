<script setup lang="ts">
import type { UITranslate } from '../types'
import { ipcRenderer, clipboard } from 'electron'
import { nextTick, onMounted, reactive, ref } from 'vue'
import { ElScrollbar, ElInput } from 'element-plus'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-scrollbar.css'
import { Language } from '../global'
import { UUID, isEmpty } from './utils'
import default_config from './config'
import LibOCR from './lib/ocr'
import Translate from './lib/translate'
import LanguageDetect from './lib/LanguageDetect'
import { OcrTranslateConfig } from '../types'

const shadow = ref<HTMLElement>(null as any)
let trans_task_id = ''
let trans_timeout: any = undefined
let lang_menu_close_timeout: any = undefined
const input = ref<any>(null)
const state = reactive({
	config: default_config,
	reverse: '',
	auto_lang_test: '',
	from: Language.自动检测,
	to: Language.自动检测,
	loading_text: '',
	text: '',
	results: [] as UITranslate[]
})

function onResize(cb?: Function, show?: boolean) {
	nextTick(async () => {
		const height = shadow.value?.clientHeight + 60
		show !== false && await ipcRenderer.invoke('show')
		await ipcRenderer.invoke('setHeight', height)
		cb && cb()
	})
}

onMounted(() => {
	onResize(async () => {
		await ipcRenderer.invoke('focus')
		input.value?.ref?.focus()
	})
})

window.onblur = function () {
	if (state.config.pinup) return
	state.auto_lang_test = ''
	state.loading_text = ''
	trans_task_id = ''
	state.text = ''
	state.results = []
	clearTimeout(trans_timeout)
	trans_timeout = undefined
	onResize(() => ipcRenderer.send('hide'), false)
}

ipcRenderer.on('show', (event, args) => {
	onResize()
	if (!args) {
		input.value?.ref?.focus()
		return
	}
	const { base64, status, trans, text } = args
	if (text) {
		if (text === '~!@#empty') {
			state.text = '未获取到可用的数据'
			return
		}
		state.text = text
		trans && handleTrans()
		return
	}
	if (!status) {
		state.text = base64
		return
	}
	handleOcr(base64, trans)
})

async function handleOcr(base64: string, trans: boolean) {
	try {
		state.loading_text = 'OCR识别中...'
		const text = await LibOCR(state.config, base64)
		state.loading_text = ''
		state.text = text || ''
		if (text && trans) {
			handleTrans().then().catch()
		}
	} catch (e: any) {
		state.loading_text = ''
		state.text = 'OCR识别失败: ' + e.message
	}
}

async function transItem(conf: OcrTranslateConfig, from: Language, to: Language, id: string, item: UITranslate) {
	const st = Date.now()
	try {
		const res = await Translate(state.config, conf, state.text, from, to)
		if (id === trans_task_id) {
			if (typeof res === 'string') {
				item.text = res
			} else {
				Object.assign(item, res)
			}
			item.status = true
			item.loading = false
		}
	} catch (e: any) {
		if (id === trans_task_id) {
			item.status = false
			item.text = '翻译接口调用错误: \n' + e.message + '\n' + e.stack
		}
	}
	item.timestamp = Date.now() - st
	item.loading = false
	item.expand = true
	state.results.push(item)
	if (id !== trans_task_id) return
	if (!state.results.find(x => x.loading)) {
		state.loading_text = ''
		clearTimeout(trans_timeout)
		trans_timeout = undefined
		ipcRenderer.invoke('focus').catch()
	}
	onResize()
	
}

async function handleTrans() {
	if (isEmpty(state.text)) return
	//  去除空行和多余\r、\t
	state.text = state.text.split('\n').map(x => {
		let res = x
		if (res) {
			res = res.replaceAll('\t', ' ').replaceAll('\r', '')
		}
		return res
	}).filter(x => !!x).join('\n')
	const tlist = state.config.translate.filter(x => x.enable)
	if (tlist.length < 1) return
	//  语言检测
	state.loading_text = '正在识别语种'
	let from = state.from
	state.auto_lang_test = ''
	if (state.from === Language.自动检测) {
		from = state.auto_lang_test = await LanguageDetect(state.config, state.text) as Language
	}
	let to = Language.英语
	if (state.to === Language.自动检测) {
		if (from !== Language.中文) {
			to = Language.中文
		}
	}
	state.loading_text = '正在翻译...'
	//  每次调用一个翻译服务，不用等所有服务都出结束才看的到结果
	state.results = []
	trans_task_id = UUID()
	for (const item of tlist) {
		if (item.zh2en_enable) {
			//  如果不是中转英，跳过
			if (from !== Language.中文 || to !== Language.英语) {
				continue
			}
		}
		const obj = {
			name: item.name,
			label: item.label,
			text: '',
			expand: false,
			loading: true,
			status: false,
			isWord: false
		} as UITranslate
		transItem(item, from, to, trans_task_id, obj).catch()
	}
	//  超时
	trans_timeout = setTimeout(() => {
		for (const item of state.results) {
			if (item.loading) {
				item.status = false
				item.text = '调用接口超时!'
				item.loading = false
				item.expand = true
			}
		}
		state.loading_text = ''
		trans_task_id = ''
		ipcRenderer.invoke('focus')
		onResize()
	}, 1000 * (state.config.timeout || 15))
	//  调整窗口大小
	onResize()
}


//  选择语言
ipcRenderer.on('select-lang', (event, args: { target: 'to' | 'from', lang: Language }) => {
	(state as any)[args.target] = args.lang
	if (args.target === 'from') {
		if (state.from !== Language.自动检测 && state.from === state.to) {
			state.to = state.config.languages.find(x => x.name !== state.from)?.name as any || Language.英语
		}
	} else {
		if (state.to !== Language.自动检测 && state.from === state.to) {
			state.from = state.config.languages.find(x => x.name !== state.to)?.name as any || Language.英语
		}
	}
	!isEmpty(state.text) && handleTrans()
})
//  语言选择菜单关闭
ipcRenderer.on('lang-menu-close', () => {
	clearTimeout(lang_menu_close_timeout)
	lang_menu_close_timeout = setTimeout(() => state.reverse = '', 150)
})

function onInput() {
	state.auto_lang_test = ''
	onResize()
}

function onFY(e: KeyboardEvent) {
	if (e.ctrlKey || e.altKey || e.metaKey) {
		state.text += '\n'
		input.value?.ref?.focus()
		onResize()
	} else {
		e.stopPropagation()
		e.preventDefault()
		handleTrans()
	}
}

function onSelectLang(e: MouseEvent, target: 'from' | 'to') {
	if (state.reverse && state.reverse === target) {
		state.reverse = ''
	} else {
		state.reverse = target
	}
	const el = e.target as HTMLElement
	ipcRenderer.send('show-lang-menu', {
		from: state.from, to: state.to, target: state.reverse,
		x: el.offsetLeft + 15, y: el.offsetTop + 55 + el.offsetHeight,
		languages: JSON.parse(JSON.stringify(state.config.languages))
	})
}

function onExchange() {
	let s = state.from
	state.from = state.to
	state.to = s
	handleTrans()
}

function onExpand(item: any) {
	item.expand = !item.expand
	onResize()
}

function getPath(svg: string): string {
	return 'file:///' + window.process['env']['PUBLIC'] + '/svg/' + svg + '.svg'
}

async function playAudio(url: string) {
	const audio = new Audio(url)
	audio.play().then().catch()
}
</script>

<template>
	<div class="card">
		<div class="shadow" ref="shadow">
			<div class="tools">
				<div style="display: flex; align-items: center;">
					<div class="btn no-drag" :class="state.config.pinup ? 'active' : ''" title="钉住窗口，不会因为失去焦点而隐藏窗口"
						@click="state.config.pinup = !state.config.pinup">
						<Iconify icon="pinup" style="transform: rotate(-45deg);" />
					</div>
				</div>
				<div style="display: flex; align-items: center;">
					<div class="btn no-drag" title="识图并翻译 Ctrl + Shift + F2" @click="() => ipcRenderer.send('screenshot', { ocr: true, trans: true })">
						<Iconify icon="trans" />
					</div>
					<div class="btn no-drag" title="图片识别 Ctrl + Shift + F5" @click="() => ipcRenderer.send('screenshot', { ocr: true, trans: false })">
						<Iconify icon="ocr" />
					</div>
					<div class="btn no-drag" title="截图/取色 Ctrl + Shift + F4" @click="() => ipcRenderer.send('screenshot', { ocr: false, trans: false })">
						<Iconify icon="screenshot" />
					</div>
					<div class="btn no-drag" :class="state.config.ocr_clipboard ? 'active' : ''" title="识图后复制内容到剪切板"
						@click="state.config.ocr_clipboard = !state.config.ocr_clipboard">
						<Iconify icon="clipboard" />
					</div>
				</div>
			</div>
			<el-scrollbar class="no-drag" max-height="800px">
				<div class="input-box">
					<el-input v-model="state.text" :autosize="{minRows: 3, maxRows: 10}" type="textarea" :maxlength="3000" show-word-limit
						placeholder="待翻译的内容，Enter 翻译，Alt | Ctrl + Enter 换行" resize="none"
						v-loading="!!state.loading_text" :element-loading-text="state.loading_text"
						@input="onInput" @keydown.enter="onFY" ref="input" />
					<div class="bottom-ext">
						<div style="display: flex; align-items: center;">
							<div class="btn no-drag" @click="() => clipboard.writeText(state.text)" title="复制">
								<Iconify icon="copy" style="transform: rotate(-180deg);font-size: 16px;" />
							</div>
							<div v-if="state.auto_lang_test" class="language">
								识别为
								<mark>{{ state.auto_lang_test }}</mark>
							</div>
						</div>
					</div>
				</div>
				<div class="language-box">
					<div class="select no-drag" @click="e => onSelectLang(e, 'from')" title="原语种">
						{{ state.from }}
						<Iconify icon="fxs" :class="state.reverse === 'from' ? 'is-reverse' : ''" />
					</div>
					<div class="btn no-drag" title="互换语种" @click="onExchange">
						<Iconify icon="jh" style="transform: rotate(-90deg);" />
					</div>
					<div class="select no-drag" @click="e => onSelectLang(e, 'to')" title="目标语种">
						{{ state.to }}
						<Iconify icon="fxs" :class="state.reverse === 'to' ? 'is-reverse' : ''" />
					</div>
				</div>
				<div class="input-box" v-for="item in state.results" :key="item.name">
					<div class="header" @click="onExpand(item)" :style="{ 'border-bottom-right-radius': item.expand ? '0' : '8px', 'border-bottom-left-radius': item.expand ? '0' : '8px' }">
						<div class="left">
							<img :src="getPath(item.name)" />
							{{ item.label }}
							<span style="font-size: 13px; color: #8E8E8E;margin-left: 5px;">
								({{ item.timestamp }}ms)
							</span>
						</div>
						<Iconify icon="fxs" :class="item.expand ? 'is-reverse' : ''" style="margin-right: 15px;" />
					</div>
					<template v-if="item.expand">
						<div class="context">
							<el-scrollbar max-height="400" always>
								<div v-if="!item.isWord" v-html="item.loading ? '正在翻译...' : item.text.split('\n').join('<br>')" class="text"></div>
								<div v-else class="word">
									<div class="text">
										{{ item.text }}
										<Iconify icon="volume" class="volume" @click="playAudio(item.work_ext.dst_speak_url)" />
									</div>
									<div v-if="item.work_ext.us" class="phonetic" title="播放美式合成语音">
										美 [{{ item.work_ext.us.phonetic }}]
										<Iconify icon="volume" class="volume" @click="playAudio(item.work_ext.us.speech)" />
									</div>
									<div v-if="item.work_ext.uk" class="phonetic" title="播放英式合成语音">
										英 [{{ item.work_ext.uk.phonetic }}]
										<Iconify icon="volume" class="volume" @click="playAudio(item.work_ext.uk.speech)" />
									</div>
									<template v-if="item.work_ext.explains">
										<div v-for="(explain, i) in item.work_ext.explains" :key="i" class="explains">
											<template v-if="explain.includes('.')">
												<div class="prefix">{{ explain.split('.')[0] }}.</div>
												<div style="flex-grow: 1;">
													{{ explain.split('.').slice(1).join('.') }}
												</div>
											</template>
											<div v-else>{{ explain }}</div>
										</div>
									</template>
									<template v-if="item.work_ext.wfs">
										<div v-for="(wf, i) in item.work_ext.wfs" :key="i" class="wfs">
											<span>{{ wf.name }}:</span>
											<span class="value" @click="() => clipboard.writeText(wf.value)">
												{{ wf.value }}
											</span>
										</div>
									</template>
								</div>
							</el-scrollbar>
						</div>
						<div class="bottom-ext">
							<div class="btn no-drag" @click="() => clipboard.writeText(item.text)" title="复制">
								<Iconify icon="copy" style="transform: rotate(-180deg);font-size: 16px;" />
							</div>
							<span v-if="item.status" style="color: var(--el-color-info);font-size: 12px;line-height: 14px;margin-right: 12px;">
								{{ item.text.length }}
							</span>
						</div>
					</template>
				</div>
			</el-scrollbar>
		</div>
	</div>
</template>

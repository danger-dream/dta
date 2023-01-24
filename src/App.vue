<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { ElScrollbar, ElInput } from 'element-plus'
import { ipcRenderer } from 'electron'
import type { IConfig } from '../types'
import { Language } from '../global'
import { ITranslateResult, UITranslate } from '../types'
import { UUID, isEmpty } from './utils'
import { clipboard } from 'electron'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-scrollbar.css'

const shadow = ref<HTMLElement>(null as any)
const loading_trans = ref('正在翻译...')
let defaultSize = [] as number[]
let last_translate_text = ''
let translate_task_id = ''
let translate_timeout: any = undefined
let lang_menu_close_timeout: any = undefined
const input = ref<any>(null)
const state = reactive({
	config: {} as IConfig,
	setting: false,
	reverse: '',
	auto_lang_test: '',
	from: Language.自动检测,
	to: Language.自动检测,
	loading_lang_testing: false,
	loading: false,
	text: '',
	results: [] as UITranslate[]
})
//  获取配置文件
ipcRenderer.invoke('get-config').then((res) => {
	Object.assign(state.config, res)
})

ipcRenderer.on('clear', function () {
	state.config.pinup = false
	state.text = ''
	state.results = []
})

ipcRenderer.on('ocr-result', function (event, args) {
	state.text = args.text
	args.status && translate()
})

ipcRenderer.on('text-translate', function (event, args) {
	if (state.loading) {
		return
	}
	if (args === '~!@#empty') {
		state.text = '未获取到可用的数据'
	} else {
		state.text = args
		translate()
	}
})

ipcRenderer.on('translate-result', function (event, args: ITranslateResult) {
	if (args.id !== translate_task_id) return
	let list = args.result
	if (!Array.isArray(list)) {
		list = [list]
	}
	for (const item of list) {
		const res = state.results.find(x => x.name === item.name)
		if (!res) continue
		Object.assign(res, item)
		res.loading = false
		res.expand = true
	}
	if (!state.results.find(x => x.loading)) {
		state.loading = false
		clearTimeout(translate_timeout)
		translate_timeout = undefined
		ipcRenderer.invoke('focus')
	}
	nextTick().then(() => onResize())
})
ipcRenderer.on('win-blur', () => translate_task_id = '')

ipcRenderer.on('input-translate', inputFocus)
ipcRenderer.on('win-show-focus', () => input.value?.ref?.focus())

ipcRenderer.on('select-lang', function (event, args: { target: 'to' | 'from', lang: Language }) {
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
	!isEmpty(state.text) && translate()
})
ipcRenderer.on('lang-menu-close', () => {
	clearTimeout(lang_menu_close_timeout)
	lang_menu_close_timeout = setTimeout(() => state.reverse = '', 150)
})

onMounted(() => {
	nextTick().then(async () => {
		defaultSize = await ipcRenderer.invoke('getSize')
		onResize()
		inputFocus()
	})
})

function inputFocus() {
	ipcRenderer.invoke('focus').then(() => input.value?.ref?.focus())
}

function onResize() {
	const height = shadow.value?.clientHeight + 60
	ipcRenderer.invoke('setSize', { width: defaultSize[0], height })
	setTimeout(() => ipcRenderer.invoke('setSize', { width: defaultSize[0], height }), 10)
}

function onPin() {
	state.config.pinup = !state.config.pinup
	ipcRenderer.send('set-config', JSON.parse(JSON.stringify(state.config)))
}

function onOcrClipboard() {
	state.config.ocr_clipboard = !state.config.ocr_clipboard
	ipcRenderer.send('set-config', JSON.parse(JSON.stringify(state.config)))
}

function onInput() {
	state.auto_lang_test = ''
	nextTick().then(() => onResize())
}

async function translate() {
	if (isEmpty(state.text)) return
	state.text = state.text.trim()
	const tlist = state.config.translate.filter(x => x.enable)
	if (tlist.length < 1) return
	last_translate_text = state.text
	state.loading = true
	let from = state.from
	state.auto_lang_test = ''
	if (state.from === Language.自动检测) {
		state.loading_lang_testing = true
		from = state.auto_lang_test = await ipcRenderer.invoke('lang-testing', state.text)
		state.loading_lang_testing = false
	}
	let to = Language.英语
	if (state.to === Language.自动检测) {
		if (from !== Language.中文) {
			to = Language.中文
		}
	}
	state.results = []
	translate_task_id = UUID()
	for (const item of tlist) {
		if (item.zh2en_enable) {
			//  如果不是中转英，跳过
			if (from !== Language.中文 || to !== Language.英语) {
				continue
			}
		}
		ipcRenderer.send('translate-item', { name: item.name, text: state.text, from, to, id: translate_task_id })
		state.results.push({
			name: item.name,
			label: item.label,
			text: '',
			expand: false,
			loading: true,
			status: false,
			isWord: false
		} as any)
	}
	translate_timeout = setTimeout(function () {
		for (const item of state.results) {
			if (item.loading) {
				item.status = false
				item.text = '调用接口超时!'
				item.loading = false
				item.expand = true
			}
		}
		state.loading = false
		ipcRenderer.invoke('focus')
		nextTick().then(() => onResize())
	}, 1000 * (state.config.timeout || 15))
	nextTick().then(() => onResize())
}

function onFY(e: KeyboardEvent) {
	if (e.ctrlKey || e.altKey || e.metaKey) {
		state.text += '\n'
		input.value?.ref?.focus()
		nextTick().then(() => onResize())
	} else {
		e.stopPropagation()
		e.preventDefault()
		translate()
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
		from: state.from, to: state.to,
		target: state.reverse,
		x: el.offsetLeft,
		y: el.offsetTop + 20 + el.offsetHeight
	})
}

function onExchange() {
	let s = state.from
	state.from = state.to
	state.to = s
	translate()
}

function onExpand(item: any) {
	item.expand = !item.expand
	nextTick().then(() => onResize())
}

function getPath(svg: string): string {
	return 'file:///' + window.process['env']['PUBLIC'] + '/svg/' + svg + '.svg'
}
</script>

<template>
	<div class="card">
		<div class="shadow" ref="shadow">
			<div class="tools">
				<div style="display: flex; align-items: center;">
					<div class="btn no-drag" :class="state.config.pinup ? 'active' : ''" title="钉住窗口，不会因为失去焦点而隐藏窗口" @click="onPin">
						<Iconify icon="pinup" style="transform: rotate(-45deg);" />
					</div>
				</div>
				<div style="display: flex; align-items: center;">
					<div class="btn no-drag" title="识图并翻译 Ctrl + Shift + F2" @click="() => ipcRenderer.send('ocr-translate')">
						<Iconify icon="trans" />
					</div>
					<div class="btn no-drag" title="图片识别 Ctrl + Shift + F5" @click="() => ipcRenderer.send('ocr-not-translate')">
						<Iconify icon="ocr" />
					</div>
					<div class="btn no-drag" title="截图/取色 Ctrl + Shift + F4" @click="ipcRenderer.send('screenshot')">
						<Iconify icon="screenshot" />
					</div>
					<div class="btn no-drag" :class="state.config.ocr_clipboard ? 'active' : ''" title="识图后复制内容到剪切板" @click="onOcrClipboard">
						<Iconify icon="clipboard" />
					</div>
				</div>
			</div>
			<el-scrollbar class="no-drag" max-height="800px">
				<div class="input-box">
					<el-input v-model="state.text" :autosize="{minRows: 3, maxRows: 10}" type="textarea" :maxlength="3000" show-word-limit
						placeholder="待翻译的内容，Enter 翻译，Alt | Ctrl + Enter 换行" resize="none"
						v-loading="state.loading_lang_testing || state.loading" :element-loading-text="state.loading_lang_testing ? '正在识别语种' : '正在翻译...'"
						@input="onInput" @keydown.enter="onFY" ref="input" />
					<div class="bottom-ext">
						<div class="btn no-drag" @click="() => clipboard.writeText(state.text)" title="复制">
							<Iconify icon="copy" style="transform: rotate(-180deg);font-size: 16px;" />
						</div>
						<div v-if="state.auto_lang_test" class="language">
							识别为
							<mark>{{ state.auto_lang_test }}</mark>
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
						</div>
						<Iconify icon="fxs" :class="item.expand ? 'is-reverse' : ''" style="margin-right: 15px;" />
					</div>
					<template v-if="item.expand">
						<div class="context">
							<el-scrollbar max-height="400" always>
								<div v-if="!item.isWord" v-html="item.loading ? loading_trans : item.text.split('\n').join('<br>')" style="padding-right: 10px;"></div>
								<div v-else>
									<div style="font-size: 15px; margin: 5px 0 10px;font-weight: bold;">
										{{ item.text }}
									</div>
									<div v-if="item.work_ext.us" style="display: flex; align-items: center; margin-bottom: 5px;" title="播放美式合成语音">
										美 [{{ item.work_ext.us.phonetic }}]
										<Iconify icon="volume" style="margin-left: 5px; font-size: 20px;cursor: pointer;" />
									</div>
									<div v-if="item.work_ext.uk" style="display: flex; align-items: center; margin-bottom: 5px;" title="播放英式合成语音">
										英 [{{ item.work_ext.uk.phonetic }}]
										<Iconify icon="volume" style="margin-left: 5px; font-size: 20px;cursor: pointer;" />
									</div>
									<template v-if="item.work_ext.explains">
										<div v-for="(explain, i) in item.work_ext.explains" :key="i" style="display: flex; align-items: start; font-size: 13px;margin-bottom: 5px; padding-right: 10px;">
											<template v-if="explain.includes('.')">
												<div style="color: #A7A6A6;margin-right: 5px;min-width: 15px;max-width: 50px;">
													{{ explain.split('.')[0] }}.
												</div>
												<div style="flex-grow: 1;">
													{{ explain.split('.').slice(1).join('.') }}
												</div>
											</template>
											<div v-else>
												{{ explain }}
											</div>
										</div>
									</template>
									<template v-if="item.work_ext.wfs">
										<div v-for="(wf, i) in item.work_ext.wfs" :key="i" style="display: flex; align-items: center; font-size: 13px;">
											<span>{{ wf.name }}:</span>
											<span style="color: #3888EC; font-size: 14px;margin-left: 10px; cursor: pointer;">
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
						</div>
					</template>
				</div>
			</el-scrollbar>
		</div>
	</div>
</template>

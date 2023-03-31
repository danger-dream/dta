<script setup lang="ts">
import { app } from '@electron/remote'
import type { UITranslate } from '@/types'
import { OcrTranslateConfig } from '@/types'
import { ipcRenderer, clipboard } from 'electron'
import { reactive, ref, watch } from 'vue'
import { ElScrollbar, ElInput } from 'element-plus'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-scrollbar.css'
import { Language } from './lib/helper'
import { UUID, isEmpty } from '../utils'
import LibOCR from './lib/ocr'
import Translate from './lib/translate'
import LanguageDetect from './lib/LanguageDetect'

let trans_task_id = ''
let trans_timeout: any = undefined
let lang_menu_close_timeout: any = undefined
const input = ref<any>(null)
const state = reactive({
	config: app.store.config.trans,
	reverse: '',
	auto_lang_test: '',
	from: Language.自动检测,
	to: Language.自动检测,
	loading_text: '',
	text: '',
	results: [] as UITranslate[]
})

watch(() => state.text, () => {
	state.auto_lang_test = ''
	onResize()
})

function onResize(cb?: Function, show?: boolean) {
	setTimeout(async function () {
		const height = document.body.clientHeight
		show !== false && await ipcRenderer.invoke('trans-show')
		await ipcRenderer.invoke('trans-setHeight', height)
		cb && cb()
	}, 10)
}

window.onblur = function () {
	if (state.config.pinup) return
	state.auto_lang_test = ''
	state.loading_text = ''
	trans_task_id = ''
	state.text = ''
	state.results = []
	clearTimeout(trans_timeout)
	trans_timeout = undefined
	onResize(() => ipcRenderer.send('trans-hide'), false)
}

ipcRenderer.on('show', (event, args) => {
	if (!args) {
		input.value?.ref?.focus()
		onResize()
		return
	}
	const { base64, trans, text } = args
	if (text) {
		if (text === '~!@#empty') {
			state.text = '未获取到可用的数据'
		} else {
			state.text = text
			trans && handleTrans()
		}
		onResize()
		return
	}
	handleOcr(base64, trans)
})
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
	onResize()
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
			item.text = '翻译接口调用错误: \n' + conf.url + '\n' + e.message + '\n' + e.stack
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
		ipcRenderer.invoke('trans-focus').catch()
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
		ipcRenderer.invoke('trans-focus')
		onResize()
	}, 1000 * (state.config.timeout || 15))
	//  调整窗口大小
	onResize()
}

function onTrans(e: KeyboardEvent) {
	if (e.ctrlKey || e.altKey || e.metaKey) {
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
	ipcRenderer.send('trans-show-lang-menu', {
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
	return 'file:///' + app.store.publicPath + '/svg/' + svg + '.svg'
}

async function playAudio(url: string) {
	const audio = new Audio(url)
	audio.play().then().catch()
}
</script>

<template>
	<div class="card">
		<div class="tools">
			<div style="display: flex; align-items: center;">
				<div class="btn no-drag" :class="state.config.pinup ? 'active' : ''" title="钉住窗口，不会因为失去焦点而隐藏窗口"
				     @click="state.config.pinup = !state.config.pinup">
					<Iconify icon="pinup" style="transform: rotate(-45deg);"/>
				</div>
			</div>
			<div style="display: flex; align-items: center;">
				<div class="btn no-drag" title="识图并翻译 Ctrl + Shift + F2" @click="() => ipcRenderer.send('trans-screenshot', { ocr: true, trans: true })">
					<Iconify icon="trans"/>
				</div>
				<div class="btn no-drag" title="图片识别 Ctrl + Shift + F5" @click="() => ipcRenderer.send('trans-screenshot', { ocr: true, trans: false })">
					<Iconify icon="ocr"/>
				</div>
				<div class="btn no-drag" title="截图/取色 Ctrl + Shift + F4" @click="() => ipcRenderer.send('trans-screenshot', { ocr: false, trans: false })">
					<Iconify icon="screenshot"/>
				</div>
				<div class="btn no-drag" :class="state.config.ocr_clipboard ? 'active' : ''" title="识图后复制内容到剪切板"
				     @click="state.config.ocr_clipboard = !state.config.ocr_clipboard">
					<Iconify icon="clipboard"/>
				</div>
			</div>
		</div>
		<el-scrollbar class="no-drag" max-height="800px">
			<div class="input-box">
				<el-input v-model="state.text" :autosize="{minRows: 3, maxRows: 10}" type="textarea" :maxlength="3000" show-word-limit
				          placeholder="待翻译的内容，Alt | Ctrl + Enter 翻译" resize="none"
				          v-loading="!!state.loading_text" :element-loading-text="state.loading_text" @keydown.enter="onTrans" ref="input"/>
				<div class="bottom-ext">
					<div style="display: flex; align-items: center;">
						<div class="btn no-drag" @click="() => clipboard.writeText(state.text)" title="复制">
							<Iconify icon="copy" style="transform: rotate(-180deg);font-size: 16px;"/>
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
					<Iconify icon="fxs" :class="state.reverse === 'from' ? 'is-reverse' : ''"/>
				</div>
				<div class="btn no-drag" title="互换语种" @click="onExchange">
					<Iconify icon="jh" style="transform: rotate(-90deg);"/>
				</div>
				<div class="select no-drag" @click="e => onSelectLang(e, 'to')" title="目标语种">
					{{ state.to }}
					<Iconify icon="fxs" :class="state.reverse === 'to' ? 'is-reverse' : ''"/>
				</div>
			</div>
			<div class="input-box" v-for="item in state.results" :key="item.name">
				<div class="header" @click="onExpand(item)" :style="{ 'border-bottom-right-radius': item.expand ? '0' : '8px', 'border-bottom-left-radius': item.expand ? '0' : '8px' }">
					<div class="left">
						<img :src="getPath(item.name)"/>
						{{ item.label }}
						<span style="font-size: 13px; color: #8E8E8E;margin-left: 5px;">
								({{ item.timestamp }}ms)
							</span>
					</div>
					<Iconify icon="fxs" :class="item.expand ? 'is-reverse' : ''" style="margin-right: 15px;"/>
				</div>
				<template v-if="item.expand">
					<div class="context">
						<el-scrollbar max-height="400" always>
							<div v-if="!item.isWord" v-html="item.loading ? '正在翻译...' : item.text.split('\n').join('<br>')" class="text"></div>
							<div v-else class="word">
								<div class="text">
									{{ item.text }}
									<Iconify icon="volume" class="volume" @click="playAudio(item.work_ext.dst_speak_url)"/>
								</div>
								<div v-if="item.work_ext.us" class="phonetic" title="播放美式合成语音">
									美 [{{ item.work_ext.us.phonetic }}]
									<Iconify icon="volume" class="volume" @click="playAudio(item.work_ext.us.speech)"/>
								</div>
								<div v-if="item.work_ext.uk" class="phonetic" title="播放英式合成语音">
									英 [{{ item.work_ext.uk.phonetic }}]
									<Iconify icon="volume" class="volume" @click="playAudio(item.work_ext.uk.speech)"/>
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
							<Iconify icon="copy" style="transform: rotate(-180deg);font-size: 16px;"/>
						</div>
						<span v-if="item.status" style="color: var(--el-color-info);font-size: 12px;line-height: 14px;margin-right: 12px;">
								{{ item.text.length }}
							</span>
					</div>
				</template>
			</div>
		</el-scrollbar>
	</div>
</template>

<style lang="scss">
.no-drag {
	-webkit-app-region: no-drag;
}

html, body, #app {
	padding: 0;
	margin: 0;
	background-color: rgba(0, 0, 0, 0);
	overflow: hidden;
}

body {
	perspective: 800px;
	-webkit-app-region: drag;
	-webkit-user-select: none;
}

input[type="submit"], input[type="reset"], input[type="button"], input[type="text"], button, textarea {
	-webkit-app-region: no-drag;
}

.el-textarea {
	-webkit-user-select: text;
}

.el-textarea .el-loading-mask {
	background-color: #F6F6F670;
	border-top-left-radius: 8px;
	border-top-right-radius: 8px;
}

.el-textarea, .el-textarea__inner {
	border-radius: 8px;
}

.el-textarea__inner {
	box-shadow: none;
	background-color: #F6F6F6;
}

.el-textarea__inner:hover {
	box-shadow: none;
}

.el-textarea__inner:focus {
	box-shadow: none;
}

.el-textarea .el-input__count {
	background-color: #F6F6F6;
	bottom: -27px;
	right: 20px;
}

.el-select .el-input.is-focus .el-input__wrapper, .el-select .el-input__wrapper.is-focus {
	box-shadow: none !important;
}

.el-select .el-input__wrapper {
	background-color: #F6F6F6 !important;
	border-radius: unset !important;
	box-shadow: none !important;
}

.btn {
	padding: 5px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	
	svg {
		font-size: 20px;
		color: #2F2F2F;
	}
	
	& + & {
		margin-left: 5px;
	}
	
	&:hover {
		background: #E9E9E9;
	}
	
	&:active {
		background: #D9D9D9;
	}
	
	&.active svg {
		color: #007AFF;
	}
}

.input-box {
	width: calc(100% - 20px);
	margin: 5px 10px 5px 10px;
	border-radius: 8px;
	background: #F6F6F6;
	
	& + & {
		margin-top: 8px;
	}
	
	&:last-child {
		margin-bottom: 10px;
	}
	
	.header {
		height: 30px;
		line-height: 30px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 14px;
		color: #262626;
		background: #F1F1F1;
		border-top-left-radius: 8px;
		border-top-right-radius: 8px;
		cursor: pointer;
		
		.left {
			margin-left: 11px;
			display: flex;
			align-items: center;
			
			img {
				margin-right: 8px;
				width: 15px;
				height: 15px;
			}
		}
	}
	
	.context {
		background: rgb(246, 246, 246);
		min-height: 20px;
		line-height: 20px;
		padding: 5px 0 5px 11px;
		border-radius: 8px;
		overflow-y: auto;
		font-size: 14px;
		color: #2F2F2F;
		-webkit-user-select: text;
		
		.text {
			padding-right: 10px;
			overflow-x: hidden;
		}
		
		.word {
			.text {
				font-size: 15px;
				margin: 5px 0 10px;
				font-weight: bold;
				display: flex;
				align-items: center;
			}
			
			.phonetic {
				display: flex;
				align-items: center;
				margin-bottom: 5px;
			}
			
			.explains {
				display: flex;
				align-items: start;
				font-size: 13px;
				margin-bottom: 5px;
				padding-right: 10px;
				
				.prefix {
					color: #A7A6A6;
					margin-right: 5px;
					min-width: 15px;
					max-width: 50px;
				}
			}
			
			.wfs {
				display: flex;
				align-items: center;
				font-size: 13px;
				
				.value {
					color: #3888EC;
					font-size: 14px;
					margin-left: 10px;
					cursor: pointer;
				}
			}
		}
	}
	
	.bottom-ext {
		display: flex;
		align-items: center;
		margin: 5px 5px 5px 6px;
		justify-content: space-between;
	}
	
	.language {
		color: #ADADAD;
		font-size: 12px;
		margin-left: 10px;
		padding: 3px 10px;
		border-radius: 20px;
		background-color: #EAEAEA;
	}
	
	mark {
		margin-left: 2px;
		color: #3888EC;
		background: #EAEAEA;
	}
}

.language-box {
	width: calc(100% - 20px);
	margin: 8px 10px;
	border-radius: 8px;
	background: #F6F6F6;
	display: flex;
	justify-content: space-evenly;
	align-items: center;
}

.card {
	-webkit-transition: -webkit-transform .6s ease-in-out;
	transition: transform .6s ease-in-out;
	-webkit-transform-style: preserve-3d;
	transform-style: preserve-3d;
	border-radius: 10px;
	background-color: #FFF;
	
	.tools {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 5px 10px 0 10px;
	}
}

.select {
	padding: 5px;
	display: flex;
	align-items: center;
	color: #2F2F2F;
	cursor: pointer;
	font-size: 14px;
	
	&:hover {
		text-decoration: underline
	}
	
	svg {
		transition: transform .2s;
		margin-left: 5px;
	}
}

svg.is-reverse {
	transform: rotate(-180deg);
}

.volume {
	margin-left: 5px;
	font-size: 20px;
	cursor: pointer;
}

</style>

<script setup lang="ts">
import {ipcRenderer} from 'electron'
import {reactive} from 'vue'

const state = reactive({
	cur_text: '',
	list: [] as { action: string, title: string }[],
	value: ''
})

ipcRenderer.on('text', function (event, {actions, text}) {
	state.list = actions
	state.cur_text = text
})

function onInvoke(item: { action: string, title: string }) {
	ipcRenderer.send('tw-call', {action: item.action, text: state.cur_text})
}

</script>

<template>
	<div class="user-input">
		<Iconify v-for="item in state.list" :key="item.action" :icon="item.action" :title="item.title" @click="onInvoke(item)"/>
	</div>
</template>

<style>

body {
	padding: 0;
	margin: 0;
	font-family: "Segoe UI", Roboto, "Segoe UI Emoji", "Segoe UI Symbol", serif;
	overflow: hidden;
}

#app {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	-webkit-app-region: drag;
}

.user-input {
	background-color: #F7F9FB;
	width: 100%;
	height: 42px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 10px;
	box-sizing: border-box;
	overflow: hidden;
	margin-bottom: 0;
}


.user-input svg {
	-webkit-app-region: no-drag;
	font-size: 18px;
	color: #2F2F2F;
	padding: 5px;
	background: #F8F9FE;
	border-radius: 8px;
	/*height: 24px;
	width: 24px;*/
}

.user-input svg:hover {
	background: #DFE1E5;
}

.user-input svg:active {
	background: #D7D9DC;
}
</style>

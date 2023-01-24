import { rmSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import pkg from './package.json'
import electronPath from 'electron'
import { spawn } from 'child_process'

export default defineConfig(({ command }) => {
	rmSync('dist-electron', { recursive: true, force: true })
	const isServe = command === 'serve'
	const sourcemap = isServe || !!process.env.VSCODE_DEBUG
	
	return {
		plugins: [
			vue(),
			AutoImport({ resolvers: [ElementPlusResolver()] }),
			Components({ resolvers: [ElementPlusResolver()] }),
			electron([
				{
					entry: 'electron/index.ts',
					onstart() {
						if (process.electronApp) {
							process.electronApp.removeAllListeners()
							process.electronApp.kill()
						}
						process.electronApp = spawn(electronPath as unknown as string, ['.', '--no-sandbox'])
						process.electronApp.once('exit', process.exit)
						
						process.electronApp.stdout?.on('data', (data) => {
							const str = data.toString().trim()
							str && console.log(str)
						})
						process.electronApp.stderr?.on('data', (data) => {
							const str = data.toString().trim()
							str && console.error(str)
						})
					},
					vite: {
						build: {
							sourcemap,
							minify: true,
							outDir: 'dist-electron',
							target: 'node16',
							chunkSizeWarningLimit: Infinity,
							reportCompressedSize: false,
							rollupOptions: {
								external: Object.keys('dependencies' in pkg ? pkg.dependencies : {})
							}
						}
					}
				}
			]),
			renderer({ nodeIntegration: true })
		],
		server: process.env.VSCODE_DEBUG && (() => {
			const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
			return { host: url.hostname, port: +url.port }
		})(),
		clearScreen: false
	}
})

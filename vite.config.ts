/// <reference types="vite-plugin-electron/electron-env" />
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
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

export default defineConfig(() => {
	rmSync('dist-electron', { recursive: true, force: true })
	return {
		plugins: [
			vue(),
			AutoImport({ resolvers: [ElementPlusResolver()], dts: false }),
			Components({ resolvers: [ElementPlusResolver()], dts: false }),
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
						//  解决中文乱码问题
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
							sourcemap: false,
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
			electron([
				{
					entry: 'electron/ahk.ts',
					onstart() {
					
					},
					vite: {
						build: {
							sourcemap: false,
							minify: false,
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
		resolve: {
			alias: {
				'@': __dirname
			}
		},
		server: {
			host: '0.0.0.0',
			port: 5173
		},
		build: {
			rollupOptions: {
				external: [],
				input: {
					translate: resolve(__dirname, 'translate.html'),
					takeword: resolve(__dirname, 'takeword.html')
				}
			}
		},
		clearScreen: false
	}
})

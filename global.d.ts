export {}

declare global {
	
	namespace Electron {
		interface App {
			store: Record<string, any> & {
				isPack: boolean
				config: import('./types').IConfig
				resourcesPath: string
				publicPath: string
			}
		}
	}
}
const { join } = require('path')
const fs = require('fs')
const asar = require('asar')

function copyDependencies(pkg_path, out_path, base_node_modules) {
	const path = join(pkg_path, 'package.json')
	if (!fs.existsSync(path)) return
	let pkg = JSON.parse(fs.readFileSync(path, 'utf-8'))
	if (pkg['dependencies']) {
		for (const dependencie of Object.keys(pkg.dependencies)) {
			const dependenciePath = join(base_node_modules, dependencie)
			if (!fs.existsSync(dependenciePath)) {
				throw new Error('缺少项目依赖: ' + dependencie)
			}
			const dest = join(out_path, dependencie)
			if (fs.existsSync(dest)) continue
			fs.cpSync(dependenciePath, dest, { recursive: true })
			copyDependencies(dependenciePath, out_path, base_node_modules)
		}
	}
	if (pkg['optionalDependencies']) {
		for (const dependencie of Object.keys(pkg.optionalDependencies)) {
			const dependenciePath = join(base_node_modules, dependencie)
			if (!fs.existsSync(dependenciePath)) {
				continue
			}
			const dest = join(out_path, dependencie)
			if (fs.existsSync(dest)) continue
			fs.cpSync(dependenciePath, dest, { recursive: true })
			copyDependencies(dependenciePath, out_path, base_node_modules)
		}
	}
	return pkg
}

async function pack() {
	const rootPath = join(__dirname, '../')
	const outPath = join(rootPath, 'release')
	const web_dist = join(rootPath, 'dist')
	const electron_dist = join(rootPath, 'dist-electron')
	fs.rmSync(outPath, { recursive: true, force: true })
	fs.mkdirSync(outPath)
	fs.cpSync(web_dist, join(outPath, 'dist'), { recursive: true })
	fs.cpSync(electron_dist, join(outPath, 'dist-electron'), { recursive: true })
	const node_module_path = join(outPath, 'node_modules')
	fs.mkdirSync(node_module_path)
	const pkg = copyDependencies(rootPath, node_module_path, join(rootPath, 'node_modules'))
	if (pkg) {
		delete pkg.devDependencies
		delete pkg.scripts
		fs.writeFileSync(join(outPath, 'package.json'), JSON.stringify(pkg, undefined, '\t'))
	}
	fs.mkdirSync(join(outPath, 'build/Release'), { recursive: true })
	fs.cpSync(join(rootPath, 'build/Release/win32.node'), join(outPath, 'build/Release/win32.node'))
	//await asar.createPackage(outPath, join(outPath, 'app.asar'))
	await asar.createPackage(outPath, join(__dirname, '../../../tools/DesktopToolsAssistant/resources/app.asar'))
	fs.rmSync(web_dist, { recursive: true, force: true })
	fs.rmSync(electron_dist, { recursive: true, force: true })
	console.log('打包完成')
	process.exit()
}

pack().then().catch()

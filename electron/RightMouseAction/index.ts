import PathOpen from './PathOpen'
import Link from './Link'
import Ip from './Ip'
import calc from './Calc'
import trans from './Trans'
import copy from './Copy'
import google from './Google'
import baidu from './Baidu'
import Store from '../store'

const ActionMap = [
	PathOpen,
	Link,
	calc,
	Ip,
	trans,
	copy,
	google,
	baidu
]

export async function getRightMouseActions(text: string) {
	const result = []
	for (const item of ActionMap) {
		try {
			if (await item.check(text)) {
				result.push({ action: item.action, title: item.text })
			}
		} catch {
		}
	}
	return result
}

export async function callRightMouseAction(name: string, text: string, store: Store) {
	const action = ActionMap.find(x => x.action === name)
	if (!action) return
	try {
		await action.call(text, store)
	} catch {
	}
}

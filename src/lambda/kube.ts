import https from 'https'
import request from 'request'
import fetch from 'node-fetch'
import { AbortController } from 'node-abort-controller'
import { ApiType, CoreV1Api, Exec, KubeConfig } from "@kubernetes/client-node"
import { Context } from '@yff/sn/dist/wrapper/express'
import { PassThrough } from 'stream'

let kc: null | KubeConfig
declare type ApiConstructor<T extends ApiType> = new (server: string) => T;
function getKubeConfig() {
	if (!kc) {
		kc = new KubeConfig()
		kc.loadFromDefault()
	}
	return kc
}
function getKubeApi<T extends ApiType>(api: ApiConstructor<T>) {
	return getKubeConfig().makeApiClient(api)
}
async function makeFetchOptions(url: string) {
	const opts = {
		url,
		headers: {                                                                                                                                                                         
			Accept: 'application/json',                                                                                                                                                      
		}
	} as request.Options
	await getKubeConfig().applyToRequest(opts)
	const { headers, ca, key, cert } = opts,
		agent = new https.Agent({ cert, ca, key }),
		controller = new AbortController()
	return { agent, headers, controller, signal: controller.signal }
}

export default {
	async get() {
		const core = getKubeApi(CoreV1Api)
		return {
			namespaces: (await core.listNamespace()).body.items,
			nodes: (await core.listNode()).body.items
		}
	},
	pod: {
		async read(namespace: string, name: string) {
			const core = getKubeApi(CoreV1Api)
			return (await core.readNamespacedPod(name, namespace)).body
		},
		async listInNamespace(namespace: string) {
			const core = getKubeApi(CoreV1Api)
			return (await core.listNamespacedPod(namespace)).body.items
		},
		async log(namespace: string, name: string, container: string, channel: string, $ctx?: Context) {
			const emitter = $ctx?.emitter,
				cluster = getKubeConfig().getCurrentCluster()
			if (!emitter || !cluster) {
				throw Error('context not injected')
			}
			const params = new URLSearchParams({ container, follow: 'true' }),
				url = `${cluster.server}/api/v1/namespaces/${namespace}/pods/${name}/log?${params}`,
				opts = await makeFetchOptions(url),
				response = await fetch(url, opts)
			response.body.on('data', log => emitter.emit(channel, { log: '' + log }) )
			response.body.on('close', () => emitter.emit(channel, { done: true }))
			emitter.on(`sse.close.${channel}`, () => opts.controller.abort())
		},
		async cmd(channel: string, command: string, $ctx?: Context) {
			const emitter = $ctx?.emitter
			if (!emitter) {
				throw Error('context not injected')
			}
			emitter.emit(`exec.input.${channel}`, command)
		},
		async exec(namespace: string, name: string, container: string,
			command: string, channel: string, $ctx?: Context) {
			const emitter = $ctx?.emitter
			if (!emitter) {
				throw Error('context not injected')
			}
			const exec = new Exec(getKubeConfig()),
				[stdout, stderr, stdin] = [new PassThrough(), new PassThrough(), new PassThrough()]
			stdout.on('data', stdout => emitter.emit(channel, { stdout: '' + stdout }))
			stderr.on('data', stderr => emitter.emit(channel, { stderr: '' + stderr }))
			emitter.on(`sse.close.${channel}`, () => ws.close())
			emitter.on(`exec.input.${channel}`, data => stdin.write(data))
			const ws = await exec.exec(namespace, name, container, command, stdout, stderr, stdin, true, status => {
				emitter.emit(channel, { status })
			})
		},
	},
	node: {
		async list() {
			const core = getKubeApi(CoreV1Api)
			return (await core.listNode()).body.items
		}
	}
}

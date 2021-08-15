import React, { useEffect, useRef } from "react"
import { RouteComponentProps } from "react-router-dom"
import { Terminal } from 'xterm'
import { Modal } from 'antd'
import 'xterm/css/xterm.css'

import lambda from "../../../../../../lambda"

export default ({ match: { params: { namespace, pod, container } } }:
		RouteComponentProps<{ namespace: string, pod: string, container: string }>) => {
	const div = useRef(null as null | HTMLDivElement)
	useEffect(() => {
		const elem = div.current
		if (!elem || (elem as any)._sse_binded) {
			return
		}
		(elem as any)._sse_binded = true
		const channel = Math.random().toString(16).slice(2, 10)

		const term = new Terminal({ cursorBlink: true })
		term.open(elem)
		term.onKey(async ({ key }) => {
			await lambda.kube.pod.cmd(channel, key)
		})

		const sse = new EventSource(`/sse/${channel}`)
		sse.onmessage = ({ data }) => {
			const { stdout, stderr, status } = JSON.parse(data)
			if (stdout || stderr) {
				term.write(stdout || stderr)
			} else if (status) {
				Modal.info({
					title: `${namespace} / ${pod} / ${container}`,
					content: JSON.stringify(status)
				})
				term.dispose()
				sse.close()
			}
		}

		async function start() {
			await lambda.kube.pod.exec(namespace, pod, container, 'bash', channel)
		}
		start()
		return () => {
			sse.close()
			term.dispose()
		}
	}, [namespace, pod, container, div.current])
	return <div ref={ div }></div>
}

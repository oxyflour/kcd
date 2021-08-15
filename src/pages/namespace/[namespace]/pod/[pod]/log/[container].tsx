import React, { useEffect, useState } from "react"
import { RouteComponentProps } from "react-router-dom"
import lambda from "../../../../../../lambda"

export default ({ match: { params: { namespace, pod, container } } }:
		RouteComponentProps<{ namespace: string, pod: string, container: string }>) => {
	const [logs, setLogs] = useState('')
	useEffect(() => {
		const channel = Math.random().toString(16).slice(2, 10),
			sse = new EventSource(`/sse/${channel}`)
		let logs = ''
		sse.onmessage = ({ data }) => {
			const { done, log } = JSON.parse(data)
			if (done) {
				sse.close()
			} else {
				setLogs(logs += log)
			}
		}
		async function start() {
			await lambda.kube.pod.log(namespace, pod, container, channel)
		}
		start()
		return () => sse.close()
	}, [namespace, pod, container])
	return <pre>{ logs }</pre>
}

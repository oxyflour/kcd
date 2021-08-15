import React from "react"
import { Link, RouteComponentProps } from "react-router-dom"
import { Alert, Button, Card, Spin, Statistic } from "antd"
import { AlignLeftOutlined, CodeOutlined } from '@ant-design/icons'
import { V1PodSpec } from "@kubernetes/client-node"

import lambda from "../../../../lambda"
import { useAsyncEffect } from "../../../../utils/async"

import 'antd/dist/antd.css'

export default ({ match: { params: { namespace, pod } } }:
		RouteComponentProps<{ namespace: string, pod: string }>) => {
	const [{ loading, error, value }] = useAsyncEffect(() => lambda.kube.pod.read(namespace, pod), { }, [namespace, pod]),
		{ metadata = { }, spec = { } as V1PodSpec, status = { } } = value
	return loading ? <Spin /> :
		error ? <Alert type="error" message={ error + '' } /> :
		<div style={{ margin: 24 }}>
			<Card title={ `Pod ${metadata.name}` }>
				<Statistic title="Node Name" value={ spec.nodeName } />
				<Statistic title="Host IP" value={ status.hostIP } />
			</Card>
			{
				(spec.containers || []).map(({ name, image }, idx) =>
					<Card title={ `Container ${name}` } style={{ marginTop: 32 }} key={ idx }
						extra={
							<span>
								<Button type="text" icon={
									<Link to={ `/namespace/${namespace}/pod/${pod}/log/${name}` }>
										<AlignLeftOutlined />
									</Link>
								} />
								<span> </span>
								<Button type="text" icon={
									<Link to={ `/namespace/${namespace}/pod/${pod}/exec/${name}` }>
										<CodeOutlined />
									</Link>
								} />
							</span>
						}>
						<Statistic title="Image" value={ image } />
					</Card>)
			}
		</div>
}

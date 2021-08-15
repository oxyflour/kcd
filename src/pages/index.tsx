import React, { CSSProperties } from 'react'
import { Alert, Card, Col, Row, Spin, Tabs, List } from 'antd'

import 'antd/dist/antd.css'
import './index.css'

import lambda from '../lambda'
import { useAsyncEffect } from '../utils/async'
import { V1Node } from '@kubernetes/client-node'
import { Link } from 'react-router-dom'

function Center(props: { children: any }) {
	return <Row justify="space-around" align="middle">
		<Col>{ props.children }</Col>
	</Row>
}

const PROGRESS_COLOR_STEPS = [{
	value: 50,
	color: '#52c41a',
}, {
	value: 90,
	color: '#1890ff',
}, {
	value: 100,
	color: '#ff4d4f',
}]

function Progress({ style, percent, width = 10 }: {
		percent: number[]
		begin?: number
		width?: number
		style?: CSSProperties
	}) {
	return <svg width="100%" height="100%" viewBox="0 0 100 100" style={ style }>
	{
		percent.map((val, idx) => {
			const { color } = PROGRESS_COLOR_STEPS.find(item => item.value > val) || { color: 'gray' },
				radius = 50 - width / 2 - width * idx,
				length = radius * val / 100 * Math.PI * 2,
				rest = radius * (100 - val) / 100 * Math.PI * 2
			return <circle cx={ 50 } cy={ 50 } r={ radius } key={ idx }
				stroke={ color } strokeWidth={ width * 0.75 }
				fill="none" className="progress-bar"
				strokeDasharray={ `${length} ${rest}` } />
		})
	}
	</svg>
}

function NodeList({ nodes }: { nodes: V1Node[] }) {
	return <>
	{
		nodes.map(({ metadata = { }, status = { } }, idx) =>
			<Card size="small" className="node" key={ idx } title={
					<a href="#">
						{
						} { metadata.name } ({
							(status.addresses || [])
								.filter(item => item.type === 'InternalIP')
								.map(item => item.address)
								.join(', ')
						})
					</a>
				}>
				<Center>
					<Progress percent={ [90, 40, 80] } />
				</Center>
			</Card>)
	}
	</>
}

export default () => {
	const [data] = useAsyncEffect(() => lambda.kube.get(), { nodes: [], namespaces: [] }, []),
		{ nodes, namespaces } = data.value
	return data.loading ? <Spin /> :
		data.error ? <Alert type="error" message={ data.error + '' } /> :
		<Tabs className="cluster" defaultActiveKey="nodes">
			<Tabs.TabPane tab="Overview" key="overview">
			</Tabs.TabPane>
			<Tabs.TabPane tab="Namespaces" key="namespaces">
				<List dataSource={ namespaces }
					renderItem={
						({ metadata = { }, status = { } }, idx) => <List.Item key={ idx }>
							<List.Item.Meta
								title={
									<Link to={ `/namespace/${metadata.name}` }>{ metadata.name }</Link>
								}
								description={ `${status.phase} since ${metadata.creationTimestamp}` } />
						</List.Item>
					} />
			</Tabs.TabPane>
			<Tabs.TabPane tab="Nodes" key="nodes">
				<NodeList nodes={ nodes } />
			</Tabs.TabPane>
		</Tabs>
}

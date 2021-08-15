import React from 'react'
import { Alert, Spin, List } from 'antd'
import { RouteComponentProps } from 'react-router'

import lambda from '../../lambda'
import { useAsyncEffect } from '../../utils/async'

import 'antd/dist/antd.css'
import { Link } from 'react-router-dom'

export default ({ match: { params: { namespace } } }: RouteComponentProps<{ namespace: string }>) => {
	const [{ loading, error, value: pods }] = useAsyncEffect(
		() => lambda.kube.pod.listInNamespace(namespace),
		[], [namespace])
	return loading ? <Spin /> :
		error ? <Alert type="error" message={ error + '' } /> :
		<List dataSource={ pods } renderItem={
			({ metadata = { }, spec = { } }, idx) => <List.Item key={ idx }>
				<List.Item.Meta
					title={
						<Link to={ `/namespace/${namespace}/pod/${metadata.name}` }>
							{ metadata.name } [{ spec.nodeName }]
						</Link>
					}
					description={
						<span>
						{
							(spec.containers || []).map((container, idx) => <span
								style={{ marginLeft: 2, marginTop: 2 }} key={ idx }>
								{ container.name }: { container.image }
							</span>)
						}
						</span>
					} />
			</List.Item>
		} />
}

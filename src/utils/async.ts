import { DependencyList, useEffect, useState } from "react"

type UnWarpPromise<T> = T extends Promise<infer U> ? U : T
export function useAsyncEffect<F extends () => Promise<any>>(fn: F, init: UnWarpPromise<ReturnType<F>>, deps: DependencyList) {
	const [loading, setLoading] = useState(false),
		[error, setError] = useState(null),
		[value, setValue] = useState(init),
		state = { loading, error, value },
		load = () => start({ canceled: false })
	async function start({ canceled }: { canceled: boolean }) {
		setLoading(true)
		setError(null)
		try {
			const ret = await fn()
			canceled || setValue(ret)
		} catch (err) {
			canceled || setError(err)
		}
		canceled || setLoading(false)
	}
	useEffect(() => {
		const opts = { canceled: false }
		start(opts)
		return () => { opts.canceled = true }
	}, deps)
	return [state, load] as [typeof state, typeof load]
}

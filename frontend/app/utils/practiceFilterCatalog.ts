import type { ExamCatalogEntry } from './examCatalog.ts'

export type PracticeFilterCatalogStatus = 'idle' | 'pending' | 'success' | 'error'
export type PracticeFilterCatalogState = {
  scope: string | null
  status: PracticeFilterCatalogStatus
  data: ExamCatalogEntry[] | null
  error: unknown | null
}

export const practiceFilterScopeKey = (query: Record<string, string>, authGeneration: number): string => (
  JSON.stringify([Object.entries(query).sort(([left], [right]) => left.localeCompare(right)), authGeneration])
)

type Options = {
  scope: () => string | null
  fetchCatalog: (query: Record<string, string>, headers: Record<string, string>, signal: AbortSignal) => Promise<ExamCatalogEntry[]>
  onState: (state: PracticeFilterCatalogState) => void
}

/** Guards both visible counts and the sequence returned to the start action. */
export const createPracticeFilterCatalogLoader = ({ scope, fetchCatalog, onState }: Options) => {
  let generation = 0
  let controller: AbortController | null = null
  let disposed = false
  const emptyState = (): PracticeFilterCatalogState => ({ scope: null, status: 'idle', data: null, error: null })

  const invalidate = () => {
    generation++
    controller?.abort()
    controller = null
    if (!disposed) onState(emptyState())
  }

  const refresh = async (query: Record<string, string>, headers: Record<string, string>): Promise<ExamCatalogEntry[] | null> => {
    if (disposed) return null
    const requestedScope = scope()
    if (requestedScope === null) {
      invalidate()
      return null
    }
    const request = ++generation
    controller?.abort()
    const requestController = new AbortController()
    controller = requestController
    onState({ scope: requestedScope, status: 'pending', data: null, error: null })
    const current = () => !disposed && request === generation && requestedScope === scope()
    try {
      const data = await fetchCatalog({ ...query }, { ...headers }, requestController.signal)
      if (!current()) return null
      if (!Array.isArray(data)) throw new Error('公開問題の件数を確認できませんでした')
      onState({ scope: requestedScope, status: 'success', data, error: null })
      return data
    }
    catch (error) {
      if (current()) onState({ scope: requestedScope, status: 'error', data: null, error })
      return null
    }
    finally {
      if (current()) controller = null
    }
  }

  const dispose = () => {
    disposed = true
    invalidate()
  }

  return { refresh, invalidate, dispose }
}

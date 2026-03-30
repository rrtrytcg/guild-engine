import { useMemo } from 'react'
import useStore from '../store/useStore'
import { getPreviewSnapshot } from '../utils/previewData'

export default function useScreenPreview() {
  const activeScreen = useStore((s) => s.activeScreen)
  const previewDataSource = useStore((s) => s.previewDataSource)
  const mockData = useStore((s) => s.mockData)

  const snapshot = useMemo(() => getPreviewSnapshot(previewDataSource, activeScreen?.mockData ?? mockData), [
    activeScreen?.mockData,
    mockData,
    previewDataSource,
  ])

  return {
    activeScreen,
    previewDataSource,
    snapshot,
  }
}

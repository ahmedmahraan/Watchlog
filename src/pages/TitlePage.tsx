import { Link, useParams } from 'react-router-dom'
import { PageHeader, Placeholder } from '../components/PageHeader'

export default function TitlePage() {
  const { id } = useParams()
  return (
    <>
      <PageHeader title="Title details">
        <Link to="/" className="text-sm text-slate-500 hover:underline">← Back to library</Link>
      </PageHeader>
      <Placeholder phase={4}>Details for title <code className="font-mono">{id}</code>.</Placeholder>
    </>
  )
}

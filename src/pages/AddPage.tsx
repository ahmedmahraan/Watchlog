import { PageHeader, Placeholder } from '../components/PageHeader'

export default function AddPage() {
  return (
    <>
      <PageHeader title="Add a title" />
      <Placeholder phase={3}>Search TMDB for a movie or show to add.</Placeholder>
    </>
  )
}

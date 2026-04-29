import { redirect } from 'next/navigation'

// En v2, el detalle de idea vive en el Banco de Ideas
export default function IdeaDetailPage() {
  redirect('/ideas/banco')
}

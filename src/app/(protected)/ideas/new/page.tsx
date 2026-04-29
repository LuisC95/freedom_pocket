import { redirect } from 'next/navigation'

// En v2, la creación de ideas ocurre directamente en el Banco de Ideas
export default function NewIdeaPage() {
  redirect('/ideas/banco')
}

import DocumentShell, { documentMetadata, viewport } from '@/components/layout/DocumentShell'
export { viewport }
export const metadata = documentMetadata('nl')
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <DocumentShell locale="nl">{children}</DocumentShell>
}

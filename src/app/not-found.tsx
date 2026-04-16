import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/logomose.png"
              alt="MOSE"
              width={180}
              height={60}
              className="h-12 md:h-14 w-auto mx-auto"
              priority
            />
          </Link>
        </div>

        <div className="border-4 border-black p-8 md:p-12">
          <h1 className="text-7xl md:text-9xl font-display tracking-tight mb-4">
            404
          </h1>
          <div className="h-1 w-20 bg-brand-primary mx-auto mb-6" />
          <p className="text-lg md:text-xl text-gray-700 mb-8 leading-relaxed">
            Deze pagina bestaat niet of is verplaatst.
          </p>

          <div className="space-y-3">
            <Link
              href="/nl/shop"
              className="block w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
            >
              Naar de shop
            </Link>
            <Link
              href="/"
              className="block w-full py-4 border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              Naar de homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

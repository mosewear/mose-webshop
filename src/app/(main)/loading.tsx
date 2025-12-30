import { HeroSkeleton, ProductGridSkeleton, CategoryGridSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSkeleton />
      
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-12 bg-gray-200 w-1/3 mx-auto mb-12 animate-pulse" />
          <ProductGridSkeleton />
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="h-12 bg-gray-200 w-1/4 mx-auto mb-12 animate-pulse" />
          <CategoryGridSkeleton />
        </div>
      </section>
    </div>
  )
}


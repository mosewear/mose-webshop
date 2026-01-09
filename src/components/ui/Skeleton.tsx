/**
 * Loading skeletons for better perceived performance
 */

export function HeroSkeleton() {
  return (
    <div className="h-screen w-full animate-pulse bg-gray-200" />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-gray-200 mb-4" />
      <div className="h-6 bg-gray-200 mb-2 w-3/4 mx-auto" />
      <div className="h-6 bg-gray-200 w-1/2 mx-auto" />
    </div>
  )
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[...Array(3)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function CategoryCardSkeleton() {
  return (
    <div className="aspect-[3/4] bg-gray-200 animate-pulse" />
  )
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  )
}





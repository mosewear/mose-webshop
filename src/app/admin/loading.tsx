export default function AdminLoading() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4 sm:p-6 border-2 border-gray-200">
            <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white border-2 border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b-2 border-gray-200">
          <div className="flex gap-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 w-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-100 flex gap-8">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-4 w-24 bg-gray-100 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

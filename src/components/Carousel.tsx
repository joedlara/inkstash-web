import React from "react"
import "../styles/Carousel.css" // <-- make sure this path is correct

export interface CarouselProps<T> {
  items: T[]
  loading: boolean
  renderItem: (item: T) => React.ReactNode
}

export function Carousel<T>({ items, loading, renderItem }: CarouselProps<T>) {
  return (
    <section className="carousel">
      <div className="list">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div className="card placeholder" key={i}>
                {/* placeholder image */}
                <img src="https://via.placeholder.com/160" alt="loading" />
              </div>
            ))
          : items.map((item, i) => (
              <div className="card" key={i}>
                {renderItem(item)}
              </div>
            ))}
      </div>
    </section>
  )
}

export default Carousel

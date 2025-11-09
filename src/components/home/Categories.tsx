import { useNavigate } from 'react-router-dom';
import '../../styles/home/Categories.css';

interface Category {
  id: string;
  name: string;
  viewers: string;
  image_url: string;
  color: string;
}

const categories: Category[] = [
  {
    id: 'sneakers',
    name: 'Sneakers',
    viewers: '3.7K Viewers',
    image_url: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800',
    color: '#8B7355',
  },
  {
    id: 'electronics',
    name: 'Everyday Electronics',
    viewers: '5K Viewers',
    image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
    color: '#4169E1',
  },
  {
    id: 'pokemon-cards',
    name: 'Pokémon Cards',
    viewers: '11K Viewers',
    image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
    color: '#FFD700',
  },
  {
    id: 'womens-contemporary',
    name: "Women's Contemporary",
    viewers: '6.3K Viewers',
    image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
    color: '#C71585',
  },
  {
    id: 'makeup-skincare',
    name: 'Makeup & Skincare',
    viewers: '2.3K Viewers',
    image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
    color: '#FF69B4',
  },
  {
    id: 'streetwear',
    name: 'Streetwear',
    viewers: '1.1K Viewers',
    image_url: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800',
    color: '#2F4F4F',
  },
  {
    id: 'fragrances-perfume',
    name: 'Fragrances & Perfume',
    viewers: '962 Viewers',
    image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800',
    color: '#9370DB',
  },
  {
    id: 'football-cards',
    name: 'Football Cards',
    viewers: '4.9K Viewers',
    image_url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800',
    color: '#006400',
  },
];

export default function Categories() {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/browse?category=${categoryId}`);
  };

  return (
    <section className="categories-section">
      <div className="categories-container">
        <div className="section-header">
          <h2>Categories You Might Like</h2>
        </div>

        <div className="categories-grid">
          {categories.map((category) => (
            <div
              key={category.id}
              className="category-card"
              onClick={() => handleCategoryClick(category.id)}
              style={{ backgroundColor: category.color }}
            >
              <img
                src={category.image_url}
                alt={category.name}
                className="category-image"
              />
              <div className="category-overlay">
                <h3 className="category-name">{category.name}</h3>
                <div className="category-viewers">
                  <span className="viewer-dot"></span>
                  {category.viewers}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";

import {
  Search as SearchIcon,
  Heart,
  ArrowUpRight,
  Star,
  X,
} from "lucide-react";

import "./Search.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =========================================================
     SYNC SEARCH QUERY WITH URL
  ========================================================= */

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  /* =========================================================
     LOAD PRODUCTS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/admin/products`
        );

        if (cancelled) return;

        const data = response.data;

        const productList =
          data?.products ||
          data?.data ||
          [];

        const validProducts = Array.isArray(productList)
          ? productList.filter(
              (product) => product.active !== false
            )
          : [];

        setProducts(validProducts);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "SEARCH PRODUCTS ERROR:",
          error
        );

        setProducts([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     LOAD WISHLIST
  ========================================================= */

  useEffect(() => {
    const loadWishlist = () => {
      try {
        const saved = JSON.parse(
          localStorage.getItem("mamta_wishlist") || "[]"
        );

        setWishlist(
          Array.isArray(saved) ? saved : []
        );
      } catch (error) {
        console.error(
          "SEARCH WISHLIST ERROR:",
          error
        );

        setWishlist([]);
      }
    };

    loadWishlist();

    window.addEventListener(
      "wishlistUpdated",
      loadWishlist
    );

    return () => {
      window.removeEventListener(
        "wishlistUpdated",
        loadWishlist
      );
    };
  }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const handleSearch = (e) => {
    e.preventDefault();

    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      setSearchParams({
        q: trimmedQuery,
      });
    } else {
      setSearchParams({});
    }
  };

  /* =========================================================
     FILTER PRODUCTS
  ========================================================= */

  const searchTerm = query.trim().toLowerCase();

  const filteredProducts =
    searchTerm === ""
      ? []
      : products.filter((product) => {
          const name =
            product.name?.toLowerCase() || "";

          const category =
            product.category?.toLowerCase() || "";

          const description =
            product.description?.toLowerCase() || "";

          return (
            name.includes(searchTerm) ||
            category.includes(searchTerm) ||
            description.includes(searchTerm)
          );
        });

  /* =========================================================
     WISHLIST
  ========================================================= */

  const isInWishlist = (productId) => {
    return wishlist.some(
      (item) =>
        String(item._id || item.id) ===
        String(productId)
    );
  };

  const toggleWishlist = (product) => {
    const productId = product._id || product.id;

    try {
      const saved = JSON.parse(
        localStorage.getItem("mamta_wishlist") || "[]"
      );

      const currentWishlist = Array.isArray(saved)
        ? saved
        : [];

      const exists = currentWishlist.some(
        (item) =>
          String(item._id || item.id) ===
          String(productId)
      );

      const updatedWishlist = exists
        ? currentWishlist.filter(
            (item) =>
              String(item._id || item.id) !==
              String(productId)
          )
        : [...currentWishlist, product];

      localStorage.setItem(
        "mamta_wishlist",
        JSON.stringify(updatedWishlist)
      );

      setWishlist(updatedWishlist);

      window.dispatchEvent(
        new Event("wishlistUpdated")
      );
    } catch (error) {
      console.error(
        "TOGGLE WISHLIST ERROR:",
        error
      );
    }
  };

  /* =========================================================
     IMAGE
  ========================================================= */

  const getImage = (product) => {
    if (product.image) {
      return product.image;
    }

    if (
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    return PLACEHOLDER_IMAGE;
  };

  /* =========================================================
     PRICE
  ========================================================= */

  const formatPrice = (price) => {
    return `Rs. ${Number(
      price || 0
    ).toLocaleString()}`;
  };

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <main className="mamta-search-page">

      {/* =====================================================
          SEARCH HERO
      ===================================================== */}

      <section className="search-hero">

        <div className="search-hero-inner">

          <span className="search-eyebrow">
            MAAMTA COLLECTION
          </span>

          <h1>
            Find something
            <span> beautiful.</span>
          </h1>

          <p>
            Search our collection of maternity
            and baby pillows.
          </p>

          {/* SEARCH FORM */}

          <form
            className="search-form"
            onSubmit={handleSearch}
          >

            <SearchIcon
              size={21}
              strokeWidth={1.6}
            />

            <input
              type="text"
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Search pillows..."
              autoFocus
            />

            {query && (
              <button
                type="button"
                className="search-clear"
                onClick={() => {
                  setQuery("");
                  setSearchParams({});
                }}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}

            <button
              type="submit"
              className="search-submit"
            >
              Search
            </button>

          </form>

        </div>

      </section>

      {/* =====================================================
          RESULTS
      ===================================================== */}

      <section className="search-results">

        <div className="search-results-container">

          {query.trim() && (
            <div className="search-results-heading">

              <div>

                <span>
                  SEARCH RESULTS
                </span>

                <h2>
                  Results for{" "}
                  <strong>
                    "{query}"
                  </strong>
                </h2>

              </div>

              {!loading && (
                <p>
                  {filteredProducts.length}{" "}
                  product
                  {filteredProducts.length !== 1
                    ? "s"
                    : ""}
                </p>
              )}

            </div>
          )}

          {/* LOADING */}

          {loading && (
            <div className="search-message">

              <div className="search-spinner"></div>

              <p>
                Finding your favorites...
              </p>

            </div>
          )}

          {/* EMPTY SEARCH */}

          {!loading &&
            !query.trim() && (
              <div className="search-message search-start">

                <SearchIcon
                  size={42}
                  strokeWidth={1.2}
                />

                <h3>
                  What are you looking for?
                </h3>

                <p>
                  Try searching for maternity
                  pillows, baby pillows or a
                  product name.
                </p>

              </div>
            )}

          {/* NO RESULTS */}

          {!loading &&
            query.trim() &&
            filteredProducts.length === 0 && (
              <div className="search-message">

                <div className="empty-search-icon">

                  <SearchIcon
                    size={34}
                    strokeWidth={1.3}
                  />

                </div>

                <h3>
                  No products found
                </h3>

                <p>
                  We couldn't find anything
                  matching "{query}".
                </p>

                <Link
                  to="/shop"
                  className="search-shop-button"
                >
                  Browse All Products
                  <ArrowUpRight size={16} />
                </Link>

              </div>
            )}

          {/* PRODUCT GRID */}

          {!loading &&
            filteredProducts.length > 0 && (
              <div className="search-product-grid">

                {filteredProducts.map((product) => {

                  const productId =
                    product._id || product.id;

                  const liked =
                    isInWishlist(productId);

                  return (
                    <article
                      className="search-product-card"
                      key={productId}
                    >

                      {/* IMAGE */}

                      <div className="search-product-image">

                        <img
                          src={getImage(product)}
                          alt={product.name || "MAMTA product"}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = PLACEHOLDER_IMAGE;
                          }}
                        />

                        {product.category && (
                          <span className="search-product-badge">
                            {product.category}
                          </span>
                        )}

                        {/* WISHLIST */}

                        <button
                          type="button"
                          className={`search-wishlist ${
                            liked ? "active" : ""
                          }`}
                          onClick={() =>
                            toggleWishlist(product)
                          }
                          aria-label={
                            liked
                              ? "Remove from wishlist"
                              : "Add to wishlist"
                          }
                        >

                          <Heart
                            size={18}
                            strokeWidth={1.5}
                            fill={
                              liked
                                ? "currentColor"
                                : "none"
                            }
                          />

                        </button>

                        {/* VIEW */}

                        <Link
                          to={`/product/${productId}`}
                          className="search-view-button"
                        >

                          <span>
                            View Details
                          </span>

                          <ArrowUpRight size={15} />

                        </Link>

                      </div>

                      {/* INFO */}

                      <div className="search-product-info">

                        <h3>
                          {product.name}
                        </h3>

                        <div className="search-rating">

                          <div className="search-stars">

                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                fill="currentColor"
                                strokeWidth={1.2}
                              />
                            ))}

                          </div>

                          <span>
                            {product.rating || "5.0"}
                          </span>

                        </div>

                        <div className="search-price">

                          <strong>
                            {formatPrice(product.price)}
                          </strong>

                          {product.oldPrice && (
                            <del>
                              {formatPrice(product.oldPrice)}
                            </del>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                })}

              </div>
            )}

        </div>

      </section>

    </main>
  );
};

export default Search;

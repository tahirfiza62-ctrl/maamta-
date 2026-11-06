
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

/* =========================================================
   API
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api"
).replace(/\/+$/, "");

const PLACEHOLDER_IMAGE =
  "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";

const WISHLIST_KEY = "mamta_wishlist";

/* =========================================================
   COMPONENT
========================================================= */

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();

const query = searchParams.get("q") || "";
const [inputQuery, setInputQuery] = useState(query);

  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  /* =========================================================
     SYNC SEARCH QUERY WITH URL
  ========================================================= */



  /* =========================================================
     LOAD PRODUCTS FROM PUBLIC API
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setLoadError(false);

        // Use the same public endpoint as the Shop page.
        const response = await axios.get(
          `${API_URL}/products`
        );

        if (cancelled) return;

        const data = response.data;

        // Support different backend response formats.
        let productList = [];

        if (Array.isArray(data)) {
          productList = data;
        } else if (Array.isArray(data?.products)) {
          productList = data.products;
        } else if (Array.isArray(data?.data)) {
          productList = data.data;
        } else if (Array.isArray(data?.data?.products)) {
          productList = data.data.products;
        }

        console.log("SEARCH API RESPONSE:", data);
        console.log("SEARCH PRODUCTS:", productList);

        const validProducts = productList.filter(
          (product) =>
            product &&
            product.active !== false &&
            (product._id || product.id)
        );

        setProducts(validProducts);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "SEARCH PRODUCTS ERROR:",
          error.response?.data || error.message
        );

        setProducts([]);
        setLoadError(true);
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
          localStorage.getItem(WISHLIST_KEY) || "[]"
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
     HANDLE SEARCH
  ========================================================= */

  const handleSearch = (e) => {
  e.preventDefault();

  const trimmedQuery = inputQuery.trim();

  if (trimmedQuery) {
    setSearchParams({ q: trimmedQuery });
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
          const name = String(
            product.name || ""
          ).toLowerCase();

          const category = String(
            product.category || ""
          ).toLowerCase();

          const description = String(
            product.description || ""
          ).toLowerCase();

          const tags = Array.isArray(product.tags)
            ? product.tags.join(" ").toLowerCase()
            : String(product.tags || "").toLowerCase();

          return (
            name.includes(searchTerm) ||
            category.includes(searchTerm) ||
            description.includes(searchTerm) ||
            tags.includes(searchTerm)
          );
        });

  /* =========================================================
     CHECK WISHLIST
  ========================================================= */

  const isInWishlist = (productId) => {
    return wishlist.some(
      (item) =>
        String(item._id || item.id) ===
        String(productId)
    );
  };

  /* =========================================================
     TOGGLE WISHLIST
  ========================================================= */

  const toggleWishlist = (product) => {
    const productId = product._id || product.id;

    try {
      const saved = JSON.parse(
        localStorage.getItem(WISHLIST_KEY) || "[]"
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
        WISHLIST_KEY,
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
     GET PRODUCT IMAGE
  ========================================================= */

  const getImage = (product) => {
    if (product.image) {
      return product.image;
    }

    if (
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      const firstImage = product.images[0];

      // Also support image objects if your API returns them.
      if (typeof firstImage === "string") {
        return firstImage;
      }

      if (firstImage?.url) {
        return firstImage.url;
      }
    }

    return PLACEHOLDER_IMAGE;
  };

  /* =========================================================
     FORMAT PRICE
  ========================================================= */

  const formatPrice = (price) => {
    return `Rs. ${Number(
      price || 0
    ).toLocaleString("en-PK")}`;
  };

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <main className="mamta-search-page">

      {/* SEARCH HERO */}

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
  value={inputQuery}
  onChange={(e) => setInputQuery(e.target.value)}
  placeholder="Search pillows..."
  autoFocus
/>

            {query && (
              <button
                type="button"
                className="search-clear"
              onClick={() => {
  setInputQuery("");
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

      {/* SEARCH RESULTS */}

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

              {!loading && !loadError && (
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

          {/* API ERROR */}

          {!loading && loadError && (
            <div className="search-message">

              <div className="empty-search-icon">
                <SearchIcon
                  size={34}
                  strokeWidth={1.3}
                />
              </div>

              <h3>
                Products could not be loaded
              </h3>

              <p>
                Please try again in a moment.
              </p>

            </div>
          )}

          {/* EMPTY SEARCH */}

          {!loading &&
            !loadError &&
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
            !loadError &&
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
            !loadError &&
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

                      {/* PRODUCT IMAGE */}

                      <div className="search-product-image">

                        <img
                          src={getImage(product)}
                          alt={
                            product.name || "MAAMTA product"
                          }
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              PLACEHOLDER_IMAGE;
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

                        {/* VIEW DETAILS */}

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

                      {/* PRODUCT INFO */}

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

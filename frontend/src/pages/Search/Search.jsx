
import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
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
   API + STORAGE
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api"
).replace(/\/+$/, "");

const PLACEHOLDER_IMAGE =
  "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";

/* =========================================================
   USER + WISHLIST HELPERS
========================================================= */

const getCurrentUser = () => {
  try {
    const storedUser =
      localStorage.getItem("mamta_user") ||
      localStorage.getItem("mamta_user_data") ||
      localStorage.getItem("currentUser");

    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("USER READ ERROR:", error);
    return null;
  }
};

const getWishlistKey = () => {
  const token = localStorage.getItem("mamta_user_token");
  const user = getCurrentUser();

  if (!token || !user) return null;

  const userId = user._id || user.id || user.email;

  if (!userId) return null;

  return `mamta_wishlist_${encodeURIComponent(
    String(userId).trim().toLowerCase()
  )}`;
};

/* =========================================================
   COMPONENT
========================================================= */

const Search = () => {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") || "";

  const [inputQuery, setInputQuery] = useState(query);

  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  /* =========================================================
     LOAD PRODUCTS
========================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/products`,
          {
            timeout: 15000,
          }
        );

        if (cancelled) return;

        const data = response.data;

        console.log("SEARCH API RESPONSE:", data);

        let productList = [];

        if (Array.isArray(data)) {
          productList = data;
        } else if (Array.isArray(data?.products)) {
          productList = data.products;
        } else if (Array.isArray(data?.data)) {
          productList = data.data;
        } else if (Array.isArray(data?.data?.products)) {
          productList = data.data.products;
        } else if (Array.isArray(data?.data?.data)) {
          productList = data.data.data;
        }

        console.log("SEARCH PRODUCTS:", productList);

        const validProducts = productList.filter(
          (product) =>
            product &&
            product.active !== false &&
            (product._id || product.id)
        );

        setProducts(validProducts);
        setLoadError(false);
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
     LOAD ACCOUNT WISHLIST
========================================================= */

  useEffect(() => {
    const loadWishlist = () => {
      const wishlistKey = getWishlistKey();

      if (!wishlistKey) {
        setWishlist([]);
        return;
      }

      try {
        const saved = JSON.parse(
          localStorage.getItem(wishlistKey) || "[]"
        );

        setWishlist(
          Array.isArray(saved) ? saved : []
        );
      } catch (error) {
        console.error("SEARCH WISHLIST ERROR:", error);
        setWishlist([]);
      }
    };

    loadWishlist();

    window.addEventListener("wishlistUpdated", loadWishlist);
    window.addEventListener("authChanged", loadWishlist);
    window.addEventListener("authUpdated", loadWishlist);
    window.addEventListener("storage", loadWishlist);

    return () => {
      window.removeEventListener("wishlistUpdated", loadWishlist);
      window.removeEventListener("authChanged", loadWishlist);
      window.removeEventListener("authUpdated", loadWishlist);
      window.removeEventListener("storage", loadWishlist);
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

  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return false;

    const searchableFields = [
      product.name,
      product.title,
      product.category,
      product.description,
      ...(Array.isArray(product.tags) ? product.tags : []),
      ...(Array.isArray(product.features) ? product.features : []),
    ];

    const searchableText = searchableFields
      .filter(Boolean)
      .map((value) => String(value))
      .join(" ")
      .toLowerCase();

    return searchableText.includes(searchTerm);
  });

  /* =========================================================
     CHECK WISHLIST
========================================================= */

  const isInWishlist = (productId) => {
    if (!productId) return false;

    return wishlist.some(
      (item) =>
        String(item?._id || item?.id || "") ===
        String(productId)
    );
  };

  /* =========================================================
     TOGGLE WISHLIST
========================================================= */

  const toggleWishlist = (product) => {
    const productId = product._id || product.id;

    const wishlistKey = getWishlistKey();

    if (!wishlistKey) {
      navigate("/login");
      return;
    }

    try {
      const saved = JSON.parse(
        localStorage.getItem(wishlistKey) || "[]"
      );

      const currentWishlist = Array.isArray(saved)
        ? saved
        : [];

      const exists = currentWishlist.some(
        (item) =>
          String(item?._id || item?.id || "") ===
          String(productId)
      );

      const updatedWishlist = exists
        ? currentWishlist.filter(
            (item) =>
              String(item?._id || item?.id || "") !==
              String(productId)
          )
        : [
            ...currentWishlist,
            {
              ...product,
              _id: productId,
            },
          ];

      localStorage.setItem(
        wishlistKey,
        JSON.stringify(updatedWishlist)
      );

      setWishlist(updatedWishlist);

      window.dispatchEvent(
        new Event("wishlistUpdated")
      );
    } catch (error) {
      console.error("TOGGLE WISHLIST ERROR:", error);
    }
  };

  /* =========================================================
     GET PRODUCT IMAGE
========================================================= */

  const getImage = (product) => {
    if (
      typeof product.image === "string" &&
      product.image.trim()
    ) {
      return product.image;
    }

    if (
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      const firstImage = product.images[0];

      if (typeof firstImage === "string") {
        return firstImage || PLACEHOLDER_IMAGE;
      }

      if (firstImage?.url) {
        return firstImage.url;
      }

      if (firstImage?.image) {
        return firstImage.image;
      }

      if (firstImage?.src) {
        return firstImage.src;
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
              key={query}
              type="text"
              defaultValue={query}
              onChange={(e) =>
                setInputQuery(e.target.value)
              }
              placeholder="Search pillows..."
              autoFocus
            />

            {inputQuery && (
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
                  {filteredProducts.length === 1
                    ? "product"
                    : "products"}
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
                          {product.name || product.title}
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

                          {product.oldPrice &&
                            Number(product.oldPrice) >
                              Number(product.price) && (
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

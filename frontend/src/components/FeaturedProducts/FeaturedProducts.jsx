
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import {
  Heart,
  ArrowUpRight,
  Star,
} from "lucide-react";

import "./FeaturedProducts.css";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api";

const FEATURED_CACHE_KEY = "mamta_featured_products";

/* =========================================================
   USER AND WISHLIST HELPERS
========================================================= */

const getCurrentUser = () => {
  try {
    const user =
      localStorage.getItem("mamta_user") ||
      localStorage.getItem("mamta_user_data") ||
      localStorage.getItem("currentUser");

    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("USER DATA ERROR:", error);
    return null;
  }
};

const getWishlistKey = () => {
  const user = getCurrentUser();

  const userId =
    user?._id ||
    user?.id ||
    user?.userId ||
    user?.email;

  if (!userId) {
    return "mamta_wishlist_guest";
  }

  return `mamta_wishlist_${encodeURIComponent(
    String(userId).trim().toLowerCase()
  )}`;
};

const readWishlist = () => {
  try {
    const wishlist = JSON.parse(
      localStorage.getItem(getWishlistKey()) || "[]"
    );

    return Array.isArray(wishlist) ? wishlist : [];
  } catch (error) {
    console.error("WISHLIST ERROR:", error);
    return [];
  }
};

/* =========================================================
   FEATURED PRODUCTS CACHE
========================================================= */

const getCachedFeaturedProducts = () => {
  try {
    const cached = JSON.parse(
      localStorage.getItem(FEATURED_CACHE_KEY) || "[]"
    );

    return Array.isArray(cached) ? cached : [];
  } catch (error) {
    console.error("FEATURED CACHE ERROR:", error);
    return [];
  }
};

/* =========================================================
   HELPERS
========================================================= */

const getProductId = (product) => {
  return product?._id || product?.id;
};

const getProductImage = (product) => {
  return (
    product?.image ||
    product?.images?.[0] ||
    "https://placehold.co/900x900/F4D9DC/4A3032?text=MAAMTA"
  );
};

const formatPrice = (price) => {
  return `Rs. ${Number(price || 0).toLocaleString("en-PK")}`;
};

const getProductsFromResponse = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.products)) {
    return data.products;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.products)) {
    return data.data.products;
  }

  return [];
};

/* =========================================================
   FEATURED PRODUCTS COMPONENT
========================================================= */

const FeaturedProducts = () => {
  const cachedProducts = getCachedFeaturedProducts();

  const [products, setProducts] = useState(cachedProducts);
  const [loading, setLoading] = useState(cachedProducts.length === 0);

  const [wishlist, setWishlist] = useState(readWishlist);

  /* =======================================================
     FETCH PRODUCTS FROM PUBLIC API
  ======================================================= */

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/products`,
          {
            timeout: 30000,
          }
        );

        const fetchedProducts = getProductsFromResponse(
          response.data
        );

        const featuredProducts = fetchedProducts
          .filter((product) => product && getProductId(product))
          .slice(0, 4);

        if (!isMounted) return;

        if (featuredProducts.length > 0) {
          setProducts(featuredProducts);

          localStorage.setItem(
            FEATURED_CACHE_KEY,
            JSON.stringify(featuredProducts)
          );
        } else {
          console.warn(
            "Featured Products: API returned an empty product list."
          );

          setProducts(getCachedFeaturedProducts());
        }
      } catch (error) {
        console.error(
          "FEATURED PRODUCTS API ERROR:",
          error.response?.data || error.message
        );

        if (isMounted) {
          setProducts(getCachedFeaturedProducts());
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  /* =======================================================
     WISHLIST SYNCHRONIZATION
  ======================================================= */

  useEffect(() => {
    const syncWishlist = () => {
      setWishlist(readWishlist());
    };

    window.addEventListener("wishlistUpdated", syncWishlist);
    window.addEventListener("authChanged", syncWishlist);
    window.addEventListener("authUpdated", syncWishlist);
    window.addEventListener("storage", syncWishlist);

    return () => {
      window.removeEventListener(
        "wishlistUpdated",
        syncWishlist
      );

      window.removeEventListener(
        "authChanged",
        syncWishlist
      );

      window.removeEventListener(
        "authUpdated",
        syncWishlist
      );

      window.removeEventListener(
        "storage",
        syncWishlist
      );
    };
  }, []);

  /* =======================================================
     TOGGLE WISHLIST
  ======================================================= */

  const toggleWishlist = (product) => {
    const productId = getProductId(product);

    if (!productId) return;

    const currentWishlist = readWishlist();

    const alreadyExists = currentWishlist.some(
      (item) =>
        String(
          typeof item === "object"
            ? item._id || item.id
            : item
        ) === String(productId)
    );

    let updatedWishlist;

    if (alreadyExists) {
      updatedWishlist = currentWishlist.filter(
        (item) =>
          String(
            typeof item === "object"
              ? item._id || item.id
              : item
          ) !== String(productId)
      );

      toast.success("Removed from wishlist");
    } else {
      updatedWishlist = [
        ...currentWishlist,
        productId,
      ];

      toast.success("Added to wishlist");
    }

    localStorage.setItem(
      getWishlistKey(),
      JSON.stringify(updatedWishlist)
    );

    setWishlist(updatedWishlist);

    window.dispatchEvent(
      new Event("wishlistUpdated")
    );
  };

  /* =======================================================
     CHECK WISHLIST STATUS
  ======================================================= */

  const isWishlisted = (productId) => {
    return wishlist.some(
      (item) =>
        String(
          typeof item === "object"
            ? item._id || item.id
            : item
        ) === String(productId)
    );
  };

  /* =======================================================
     LOADING SKELETON
  ======================================================= */

  const renderSkeletons = () => {
    return Array.from({ length: 4 }).map((_, index) => (
      <div
        className="product-card"
        key={`skeleton-${index}`}
      >
        <div
          className="product-image"
          style={{
            background: "#f4d9dc",
            minHeight: "280px",
            animation: "mamtaPulse 1.5s ease-in-out infinite",
          }}
        />

        <div className="product-info">
          <div
            style={{
              height: "14px",
              width: "65%",
              background: "#f4d9dc",
              borderRadius: "8px",
              marginBottom: "12px",
            }}
          />

          <div
            style={{
              height: "18px",
              width: "85%",
              background: "#f4d9dc",
              borderRadius: "8px",
              marginBottom: "12px",
            }}
          />

          <div
            style={{
              height: "16px",
              width: "40%",
              background: "#f4d9dc",
              borderRadius: "8px",
            }}
          />
        </div>
      </div>
    ));
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section className="featured-products">
      <div className="featured-container">

        {/* SECTION HEADING */}

        <div className="featured-heading">
          <span className="featured-eyebrow">
            OUR COLLECTION
          </span>

          <h2 className="featured-title">
            Featured Products
          </h2>

          <p className="featured-intro">
            Discover thoughtfully selected essentials
            made with love for mothers and little ones.
          </p>

          <Link
            to="/shop"
            className="view-all-products"
          >
            View All Products
            <ArrowUpRight size={17} />
          </Link>
        </div>

        {/* PRODUCTS */}

        <div className="products-grid">

          {loading && products.length === 0 ? (
            renderSkeletons()
          ) : products.length > 0 ? (
            products.map((product, index) => {
              const productId = getProductId(product);

              return (
                <div
                  className={`product-card stagger-${index + 1}`}
                  key={productId}
                >
                  {/* PRODUCT IMAGE */}

                  <div className="product-image">

                    <Link to={`/product/${productId}`}>
                      <img
                        src={getProductImage(product)}
                        alt={product.name || "Mamta product"}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={
                          index === 0 ? "high" : "auto"
                        }
                        onError={(event) => {
                          event.currentTarget.src =
                            "https://placehold.co/900x900/F4D9DC/4A3032?text=MAAMTA";
                        }}
                      />
                    </Link>

                    {/* PRODUCT BADGE */}

                    {product.badge && (
                      <span className="product-badge">
                        {product.badge}
                      </span>
                    )}

                    {/* WISHLIST BUTTON */}

                    <button
                      type="button"
                      className={`wishlist-button ${
                        isWishlisted(productId)
                          ? "active"
                          : ""
                      }`}
                      onClick={() => toggleWishlist(product)}
                      aria-label={
                        isWishlisted(productId)
                          ? "Remove from wishlist"
                          : "Add to wishlist"
                      }
                    >
                      <Heart
                        size={19}
                        fill={
                          isWishlisted(productId)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>

                    {/* QUICK VIEW */}

                    <Link
                      to={`/product/${productId}`}
                      className="quick-view"
                    >
                      Quick View
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>

                  {/* PRODUCT INFORMATION */}

                  <div className="product-info">

                    <span className="product-category">
                      {product.category || "MAMTA COLLECTION"}
                    </span>

                    <Link
                      to={`/product/${productId}`}
                      className="product-name"
                    >
                      {product.name || "Beautiful Mamta Product"}
                    </Link>

                    {/* RATING */}

                    <div className="product-rating">
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            fill="currentColor"
                          />
                        ))}
                      </div>

                      <span>
                        {product.rating || "4.9"}
                      </span>
                    </div>

                    {/* PRICE */}

                    <div className="product-price">
                      <span className="current-price">
                        {formatPrice(product.price)}
                      </span>

                      {product.oldPrice > product.price && (
                        <span className="old-price">
                          {formatPrice(product.oldPrice)}
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            <div className="featured-empty">
              <p>
                Products are currently unavailable.
                Please visit our shop to explore the collection.
              </p>

              <Link to="/shop">
                Explore Shop
                <ArrowUpRight size={17} />
              </Link>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;

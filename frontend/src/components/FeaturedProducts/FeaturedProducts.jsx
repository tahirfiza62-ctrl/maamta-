
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
   API
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api"
).replace(/\/+$/, "");

/* =========================================================
   FEATURED PRODUCTS CACHE
========================================================= */

const FEATURED_CACHE_KEY = "mamta_featured_products";

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
   USER HELPERS
========================================================= */

const getCurrentUser = () => {
  try {
    const token = localStorage.getItem("mamta_user_token");

    if (!token) return null;

    const storedUser =
      localStorage.getItem("mamta_user") ||
      localStorage.getItem("mamta_user_data") ||
      localStorage.getItem("currentUser");

    if (!storedUser) return null;

    const parsedUser = JSON.parse(storedUser);

    return parsedUser?.user || parsedUser;
  } catch (error) {
    console.error("USER READ ERROR:", error);
    return null;
  }
};

/* =========================================================
   ACCOUNT-SPECIFIC WISHLIST KEY
========================================================= */

const getWishlistKey = (user) => {
  if (!user) return null;

  const userId = user._id || user.id || user.email;

  if (!userId) return null;

  return `mamta_wishlist_${encodeURIComponent(
    String(userId).trim().toLowerCase()
  )}`;
};

/* =========================================================
   FORMAT PRICE
========================================================= */

const formatPrice = (price) => {
  return `Rs. ${Number(price || 0).toLocaleString()}`;
};

/* =========================================================
   PRODUCT HELPERS
========================================================= */

const getProductId = (product) => {
  return String(product?._id || product?.id || "");
};

const getProductImage = (product) => {
  return (
    product?.image ||
    product?.images?.[0] ||
    "/products/maternity-pillow-1.jpg"
  );
};

const getProductCategory = (product) => {
  return product?.category || "MAAMTA COLLECTION";
};

/* =========================================================
   READ CURRENT USER'S WISHLIST
========================================================= */

const readWishlist = () => {
  try {
    const user = getCurrentUser();
    const wishlistKey = getWishlistKey(user);

    if (!wishlistKey) return [];

    const savedWishlist = JSON.parse(
      localStorage.getItem(wishlistKey) || "[]"
    );

    return Array.isArray(savedWishlist)
      ? savedWishlist
      : [];
  } catch (error) {
    console.error("Unable to read wishlist:", error);
    return [];
  }
};

/* =========================================================
   LOADING PLACEHOLDER
========================================================= */

const ProductSkeleton = () => {
  return (
    <article className="product-card">
      <div
        className="product-image"
        style={{
          background: "#f4d9dc",
          minHeight: "260px",
          animation: "mamtaPulse 1.3s ease-in-out infinite",
        }}
      />

      <div
        className="product-info"
        style={{ padding: "16px" }}
      >
        <div
          style={{
            height: "15px",
            width: "75%",
            background: "#f4d9dc",
            borderRadius: "5px",
            marginBottom: "14px",
          }}
        />

        <div
          style={{
            height: "11px",
            width: "35%",
            background: "#f4d9dc",
            borderRadius: "5px",
            marginBottom: "14px",
          }}
        />

        <div
          style={{
            height: "16px",
            width: "45%",
            background: "#f4d9dc",
            borderRadius: "5px",
          }}
        />
      </div>
    </article>
  );
};

/* =========================================================
   FEATURED PRODUCTS
========================================================= */

const FeaturedProducts = () => {
  const [products, setProducts] = useState(
    getCachedFeaturedProducts
  );

  const [wishlist, setWishlist] = useState(readWishlist);

  const [loading, setLoading] = useState(
    () => getCachedFeaturedProducts().length === 0
  );

  /* =======================================================
     LOAD PRODUCTS
     CACHE FIRST + BACKGROUND API UPDATE
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/admin/products`,
          {
            timeout: 30000,
          }
        );

        const responseData = response.data;

        const backendProducts = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.products)
          ? responseData.products
          : Array.isArray(responseData?.data)
          ? responseData.data
          : [];

        const featuredProducts = backendProducts.slice(0, 4);

        if (cancelled) return;

        setProducts(featuredProducts);

        try {
          localStorage.setItem(
            FEATURED_CACHE_KEY,
            JSON.stringify(featuredProducts)
          );
        } catch (cacheError) {
          console.error(
            "FEATURED CACHE SAVE ERROR:",
            cacheError
          );
        }
      } catch (error) {
        console.error(
          "FEATURED PRODUCTS LOAD ERROR:",
          error.response?.data || error.message
        );

        if (!cancelled) {
          setProducts(getCachedFeaturedProducts());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     SYNCHRONIZE WISHLIST
  ======================================================= */

  useEffect(() => {
    const loadWishlist = () => {
      setWishlist(readWishlist());
    };

    loadWishlist();

    window.addEventListener(
      "wishlistUpdated",
      loadWishlist
    );

    window.addEventListener(
      "authChanged",
      loadWishlist
    );

    window.addEventListener(
      "authUpdated",
      loadWishlist
    );

    const handleStorage = (event) => {
      if (
        event.key?.startsWith("mamta_wishlist_") ||
        event.key === "mamta_user" ||
        event.key === "mamta_user_token" ||
        event.key === "mamta_user_data" ||
        event.key === "currentUser"
      ) {
        loadWishlist();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        "wishlistUpdated",
        loadWishlist
      );

      window.removeEventListener(
        "authChanged",
        loadWishlist
      );

      window.removeEventListener(
        "authUpdated",
        loadWishlist
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  /* =======================================================
     CHECK WISHLIST
  ======================================================= */

  const isInWishlist = (productId) => {
    if (!productId) return false;

    return wishlist.some(
      (item) => getProductId(item) === String(productId)
    );
  };

  /* =======================================================
     TOGGLE WISHLIST
  ======================================================= */

  const toggleWishlist = (product) => {
    try {
      const productId = getProductId(product);

      if (!productId) {
        toast.error("Unable to identify this product.");
        return;
      }

      const user = getCurrentUser();
      const wishlistKey = getWishlistKey(user);

      if (!wishlistKey) {
        toast.error("Please login to use your wishlist.");
        return;
      }

      const currentWishlist = (() => {
        try {
          const saved = JSON.parse(
            localStorage.getItem(wishlistKey) || "[]"
          );

          return Array.isArray(saved) ? saved : [];
        } catch {
          return [];
        }
      })();

      const exists = currentWishlist.some(
        (item) => getProductId(item) === String(productId)
      );

      const updatedWishlist = exists
        ? currentWishlist.filter(
            (item) => getProductId(item) !== String(productId)
          )
        : [...currentWishlist, product];

      localStorage.setItem(
        wishlistKey,
        JSON.stringify(updatedWishlist)
      );

      setWishlist(updatedWishlist);

      window.dispatchEvent(
        new Event("wishlistUpdated")
      );

      toast.success(
        exists
          ? "Product removed from wishlist."
          : "Product added to wishlist!"
      );
    } catch (error) {
      console.error(
        "FEATURED WISHLIST UPDATE ERROR:",
        error
      );

      toast.error("Could not update your wishlist.");
    }
  };

  /* =======================================================
     RETURN
     SECTION ALWAYS RENDERS IMMEDIATELY
  ======================================================= */

  return (
    <section className="featured-products">
      <div className="featured-container">

        {/* HEADING */}

        <div className="featured-heading">
          <div className="featured-title">
            <span className="featured-eyebrow">
              MAAMTA COLLECTION
            </span>

            <h2>
              Loved for
              <span> Comfort</span>
            </h2>
          </div>

          <div className="featured-intro">
            <p>
              Discover thoughtfully designed pillows
              made to bring softness, comfort and care
              into everyday moments.
            </p>

            <Link
              to="/shop"
              className="view-all-products"
            >
              <span>View All Products</span>

              <ArrowUpRight
                size={17}
                strokeWidth={1.6}
              />
            </Link>
          </div>
        </div>

        {/* PRODUCTS GRID */}

        <div className="products-grid">

          {/* SHOW SKELETONS ONLY WHEN NO CACHE EXISTS */}

          {loading && products.length === 0 && (
            [1, 2, 3, 4].map((item) => (
              <ProductSkeleton key={item} />
            ))
          )}

          {/* SHOW PRODUCTS */}

          {products.map((product, index) => {
            const productId = getProductId(product);

            const productInWishlist =
              isInWishlist(productId);

            return (
              <article
                className="product-card"
                key={productId || index}
              >
                {/* PRODUCT IMAGE */}

                <div className="product-image">
                  <img
                    src={getProductImage(product)}
                    alt={product.name || "MAAMTA product"}
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src =
                        "https://placehold.co/900x900/F4D9DC/4A3032?text=MAAMTA";
                    }}
                  />

                  {/* CATEGORY */}

                  <span className="product-badge">
                    {getProductCategory(product)}
                  </span>

                  {/* WISHLIST */}

                  <button
                    type="button"
                    className={`wishlist-button ${
                      productInWishlist ? "active" : ""
                    }`}
                    aria-label={
                      productInWishlist
                        ? `Remove ${
                            product.name || "product"
                          } from wishlist`
                        : `Add ${
                            product.name || "product"
                          } to wishlist`
                    }
                    aria-pressed={productInWishlist}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleWishlist(product);
                    }}
                  >
                    <Heart
                      size={18}
                      strokeWidth={1.6}
                      fill={
                        productInWishlist
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
                    <span>Quick View</span>

                    <ArrowUpRight
                      size={15}
                      strokeWidth={1.7}
                    />
                  </Link>
                </div>

                {/* PRODUCT INFORMATION */}

                <div className="product-info">
                  <h3>{product.name}</h3>

                  {/* RATING */}

                  <div className="product-rating">
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          strokeWidth={1.5}
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

          {/* EMPTY STATE */}

          {!loading && products.length === 0 && (
            <p className="featured-empty">
              Products are currently unavailable.
              Please visit our shop to explore the collection.
            </p>
          )}

        </div>

      </div>
    </section>
  );
};

export default FeaturedProducts;

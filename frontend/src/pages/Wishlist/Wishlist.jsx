
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Heart,
  ShoppingBag,
  Trash2,
  ArrowRight,
  Star,
} from "lucide-react";

import "./Wishlist.css";

/* =========================================================
   CONSTANTS
========================================================= */

const GUEST_CART_KEY = "mamta_guest_cart";

/* =========================================================
   HELPERS
========================================================= */

const getCurrentUser = () => {
  try {
    const user =
      localStorage.getItem("mamta_user") ||
      localStorage.getItem("mamta_user_data") ||
      localStorage.getItem("currentUser");

    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Failed to read current user:", error);
    return null;
  }
};

const getUserIdentifier = (user) => {
  if (!user) return null;

  return user._id || user.id || user.email || null;
};

/*
  Each account gets a separate wishlist key.

  Example:
  mamta_wishlist_12345
  mamta_wishlist_67890
*/

const getWishlistKey = (userId) => {
  if (!userId) return null;

  return `mamta_wishlist_${encodeURIComponent(
    String(userId).toLowerCase()
  )}`;
};

const getProductId = (product) => {
  return product?._id || product?.id || product?.productId || null;
};

const getProductImage = (product) => {
  if (typeof product?.image === "string" && product.image) {
    return product.image;
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === "string") {
      return firstImage;
    }

    if (firstImage?.url) {
      return firstImage.url;
    }
  }

  return "/placeholder-product.jpg";
};

const getRating = (product) => {
  const rating = Number(product?.rating);

  if (Number.isNaN(rating)) {
    return 5;
  }

  return Math.min(Math.max(rating, 0), 5);
};

/* =========================================================
   WISHLIST COMPONENT
========================================================= */

const Wishlist = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);

  const userId = getUserIdentifier(currentUser);
  const wishlistKey = getWishlistKey(userId);

  /* =======================================================
     REFRESH USER AFTER LOGIN / LOGOUT
  ======================================================== */

  useEffect(() => {
    const refreshUser = () => {
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener("storage", refreshUser);
    window.addEventListener("authChanged", refreshUser);
    window.addEventListener("authUpdated", refreshUser);

    return () => {
      window.removeEventListener("storage", refreshUser);
      window.removeEventListener("authChanged", refreshUser);
      window.removeEventListener("authUpdated", refreshUser);
    };
  }, []);

  /* =======================================================
     LOAD USER-SPECIFIC WISHLIST
  ======================================================== */

  useEffect(() => {
    // Logged out: show no wishlist
    if (!wishlistKey) {
      setWishlist([]);
      return;
    }

    const loadWishlist = () => {
      try {
        const savedWishlist = JSON.parse(
          localStorage.getItem(wishlistKey) || "[]"
        );

        setWishlist(
          Array.isArray(savedWishlist) ? savedWishlist : []
        );
      } catch (error) {
        console.error("Failed to load wishlist:", error);
        setWishlist([]);
      }
    };

    loadWishlist();

    window.addEventListener("wishlistUpdated", loadWishlist);
    window.addEventListener("storage", loadWishlist);

    return () => {
      window.removeEventListener("wishlistUpdated", loadWishlist);
      window.removeEventListener("storage", loadWishlist);
    };
  }, [wishlistKey]);

  /* =======================================================
     LOAD CART
  ======================================================== */

  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = JSON.parse(
          localStorage.getItem(GUEST_CART_KEY) || "[]"
        );

        const cartItems = Array.isArray(savedCart)
          ? savedCart
          : Array.isArray(savedCart?.items)
            ? savedCart.items
            : [];

        setCart(cartItems);
      } catch (error) {
        console.error("Failed to load cart:", error);
        setCart([]);
      }
    };

    loadCart();

    window.addEventListener("cartUpdated", loadCart);
    window.addEventListener("cartChanged", loadCart);
    window.addEventListener("storage", loadCart);

    return () => {
      window.removeEventListener("cartUpdated", loadCart);
      window.removeEventListener("cartChanged", loadCart);
      window.removeEventListener("storage", loadCart);
    };
  }, []);

  /* =======================================================
     REMOVE FROM WISHLIST
  ======================================================== */

  const removeFromWishlist = (productId) => {
    if (!wishlistKey) return;

    const updatedWishlist = wishlist.filter(
      (item) =>
        String(getProductId(item)) !== String(productId)
    );

    setWishlist(updatedWishlist);

    localStorage.setItem(
      wishlistKey,
      JSON.stringify(updatedWishlist)
    );

    window.dispatchEvent(new Event("wishlistUpdated"));
  };

  /* =======================================================
     ADD TO GUEST CART
  ======================================================== */

  const addToCart = (product) => {
    const productId = getProductId(product);

    if (!productId) {
      return;
    }

    let guestCart = [];

    try {
      const savedCart = JSON.parse(
        localStorage.getItem(GUEST_CART_KEY) || "[]"
      );

      guestCart = Array.isArray(savedCart)
        ? savedCart
        : Array.isArray(savedCart?.items)
          ? savedCart.items
          : [];
    } catch (error) {
      console.error("Failed to read cart:", error);
    }

    const existingItem = guestCart.find(
      (item) =>
        String(item.productId || item._id || item.id) ===
          String(productId) &&
        String(item.color || "") === ""
    );

    if (existingItem) {
      existingItem.quantity =
        (Number(existingItem.quantity) || 1) + 1;
    } else {
      guestCart.push({
        productId: String(productId),
        name: product.name || product.title || "",
        image: getProductImage(product),
        price: Number(product.price || 0),
        quantity: 1,
        color: "",
        colorCode: "",
        colorImage: "",
      });
    }

    localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify(guestCart)
    );

    setCart(guestCart);

    window.dispatchEvent(new Event("cartUpdated"));
    window.dispatchEvent(new Event("cartChanged"));
  };

  /* =======================================================
     MOVE TO CART
  ======================================================== */

  const moveToCart = (product) => {
    addToCart(product);
  };

  /* =======================================================
     CLEAR CURRENT USER'S WISHLIST
  ======================================================== */

  const clearWishlist = () => {
    if (!wishlistKey) return;

    setWishlist([]);

    localStorage.setItem(
      wishlistKey,
      JSON.stringify([])
    );

    window.dispatchEvent(new Event("wishlistUpdated"));
  };

  /* =======================================================
     LOGGED OUT
  ======================================================== */

  if (!currentUser || !userId) {
    return (
      <main className="mamta-wishlist-page">

        <section className="wishlist-hero">
          <div className="wishlist-container">

            <div className="wishlist-hero-content">

              <div className="wishlist-hero-icon">
                <Heart size={28} />
              </div>

              <span className="wishlist-eyebrow">
                YOUR SAVED COLLECTION
              </span>

              <h1>Your Wishlist</h1>

              <p>
                Sign in to save your favorite Mamta products
                and keep them close for later.
              </p>

            </div>

          </div>
        </section>

        <section className="wishlist-section">
          <div className="wishlist-container">

            <div className="wishlist-empty">

              <div className="wishlist-empty-heart">
                <Heart size={42} />
              </div>

              <h2>Sign in to view your wishlist</h2>

              <p>
                Sign in to your account to see your
                personally saved products.
              </p>

              <button
                className="wishlist-shop-btn"
                onClick={() => navigate("/login")}
              >
                Sign In
                <ArrowRight size={17} />
              </button>

            </div>

          </div>
        </section>

      </main>
    );
  }

  /* =======================================================
     MAIN WISHLIST
  ======================================================== */

  return (
    <main className="mamta-wishlist-page">

      {/* HERO */}

      <section className="wishlist-hero">
        <div className="wishlist-container">

          <div className="wishlist-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Wishlist</span>
          </div>

          <div className="wishlist-hero-content">

            <div className="wishlist-hero-icon">
              <Heart size={28} />
            </div>

            <span className="wishlist-eyebrow">
              YOUR SAVED COLLECTION
            </span>

            <h1>Your Wishlist</h1>

            <p>
              A little collection of the things you love.
              Keep your favorite Mamta products close.
            </p>

          </div>

        </div>
      </section>

      {/* WISHLIST SECTION */}

      <section className="wishlist-section">
        <div className="wishlist-container">

          {/* CONTENT HEADER */}

          <div className="wishlist-content-header">

            <div>
              <span className="wishlist-section-eyebrow">
                SAVED FOR LATER
              </span>

              <h2>
                {wishlist.length > 0
                  ? `${wishlist.length} ${
                      wishlist.length === 1
                        ? "Product"
                        : "Products"
                    }`
                  : "Your Favorites"}
              </h2>
            </div>

            {wishlist.length > 0 && (
              <button
                className="wishlist-clear-btn"
                onClick={clearWishlist}
              >
                <Trash2 size={16} />
                Clear Wishlist
              </button>
            )}

          </div>

          {/* EMPTY STATE */}

          {wishlist.length === 0 ? (
            <div className="wishlist-empty">

              <div className="wishlist-empty-heart">
                <Heart size={42} />
              </div>

              <h2>Your wishlist is empty</h2>

              <p>
                Save products you love by clicking the heart
                icon. They will appear here.
              </p>

              <Link
                to="/shop"
                className="wishlist-shop-btn"
              >
                Explore Products
                <ArrowRight size={17} />
              </Link>

            </div>
          ) : (

            /* PRODUCTS */

            <div className="wishlist-grid">

              {wishlist.map((item) => {
                const productId = getProductId(item);
                const image = getProductImage(item);
                const rating = getRating(item);

                return (
                  <article
                    className="wishlist-product-card"
                    key={productId}
                  >

                    {/* PRODUCT IMAGE */}

                    <div className="wishlist-product-image">

                      <Link to={`/product/${productId}`}>
                        <img
                          src={image}
                          alt={
                            item.name ||
                            item.title ||
                            "Mamta product"
                          }
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "/placeholder-product.jpg";
                          }}
                        />
                      </Link>

                      <button
                        className="wishlist-remove-btn"
                        onClick={() =>
                          removeFromWishlist(productId)
                        }
                        aria-label="Remove from wishlist"
                      >
                        <Heart
                          size={18}
                          fill="currentColor"
                        />
                      </button>

                      {item.salePrice &&
                        Number(item.salePrice) <
                          Number(item.price) && (
                          <span className="wishlist-sale-badge">
                            SALE
                          </span>
                        )}

                    </div>

                    {/* PRODUCT INFO */}

                    <div className="wishlist-product-info">

                      <span className="wishlist-product-category">
                        {typeof item.category === "object"
                          ? item.category?.name || "Mamta Collection"
                          : item.category || "Mamta Collection"}
                      </span>

                      <h3>
                        <Link to={`/product/${productId}`}>
                          {item.name ||
                            item.title ||
                            "Mamta Product"}
                        </Link>
                      </h3>

                      {/* RATING */}

                      <div className="wishlist-product-rating">

                        <div className="wishlist-stars">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={13}
                              fill={
                                star <= rating
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          ))}
                        </div>

                        <span>
                          {rating.toFixed(1)}
                        </span>

                      </div>

                      {/* PRICE */}

                      <div className="wishlist-product-price">

                        {item.salePrice &&
                        Number(item.salePrice) <
                          Number(item.price) ? (
                          <>
                            <span className="wishlist-sale-price">
                              Rs.{" "}
                              {Number(
                                item.salePrice
                              ).toLocaleString()}
                            </span>

                            <span className="wishlist-old-price">
                              Rs.{" "}
                              {Number(
                                item.price
                              ).toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span>
                            Rs.{" "}
                            {Number(
                              item.price || 0
                            ).toLocaleString()}
                          </span>
                        )}

                      </div>

                      {/* ACTIONS */}

                      <div className="wishlist-product-actions">

                        <button
                          className="wishlist-cart-btn"
                          onClick={() => moveToCart(item)}
                        >
                          <ShoppingBag size={16} />
                          Add to Cart
                        </button>

                        <Link
                          to={`/product/${productId}`}
                          className="wishlist-view-btn"
                        >
                          View
                          <ArrowRight size={15} />
                        </Link>

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

export default Wishlist;
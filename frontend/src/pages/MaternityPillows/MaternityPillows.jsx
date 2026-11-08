
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import {
  Heart,
  ShoppingBag,
  ArrowUpRight,
  Check,
  Star,
} from "lucide-react";

import ScrollReveal from "../../components/ScrollReveal/ScrollReveal";
import "./MaternityPillows.css";

/* =========================================================
   API + STORAGE
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api"
).replace(/\/+$/, "");

const GUEST_CART_KEY = "mamta_guest_cart";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";

/* =========================================================
   USER + WISHLIST HELPERS
========================================================= */

const getCurrentUser = () => {
  try {
    const token = localStorage.getItem("mamta_user_token");

    if (!token) return null;

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

const getWishlistKey = (user) => {
  if (!user) return null;

  const userId = user._id || user.id || user.email;

  if (!userId) return null;

  return `mamta_wishlist_${encodeURIComponent(
    String(userId).trim().toLowerCase()
  )}`;
};

/* =========================================================
   PRODUCT HELPERS
========================================================= */

const extractProducts = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data?.data)) return data.data.data;

  return [];
};

const getProductCategory = (product) => {
  if (typeof product?.category === "object") {
    return (
      product.category?.name ||
      product.category?.title ||
      product.category?.categoryName ||
      ""
    );
  }

  return product?.category || "";
};

const getProductImage = (product) => {
  if (typeof product?.image === "string" && product.image.trim()) {
    return product.image;
  }

  if (typeof product?.images?.[0] === "string") {
    return product.images[0];
  }

  if (product?.images?.[0]?.url) {
    return product.images[0].url;
  }

  return PLACEHOLDER_IMAGE;
};

/* =========================================================
   COMPONENT
========================================================= */

const MaternityPillows = () => {
  const navigate = useNavigate();

  const [maternityProducts, setMaternityProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addingProductId, setAddingProductId] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =======================================================
     LOAD MATERNITY PRODUCTS
  ======================================================== */

  useEffect(() => {
    const loadMaternityProducts = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${API_URL}/products`);
        const products = extractProducts(response.data);

        const filteredProducts = products.filter((product) => {
          const category = getProductCategory(product).toLowerCase();

          return (
            category.includes("maternity") &&
            product.active !== false
          );
        });

        setMaternityProducts(filteredProducts);
      } catch (error) {
        console.error("MATERNITY PRODUCTS LOAD ERROR:", error);
        console.error("API ERROR RESPONSE:", error.response?.data);

        setMaternityProducts([]);

        toast.error(
          error.response?.data?.message ||
            "Unable to load maternity products."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMaternityProducts();
  }, []);

  /* =======================================================
     LOAD ACCOUNT-SPECIFIC WISHLIST
  ======================================================== */

  useEffect(() => {
    const refreshWishlist = () => {
      const user = getCurrentUser();
      const key = getWishlistKey(user);

      if (!key) {
        setWishlist([]);
        return;
      }

      try {
        const savedWishlist = JSON.parse(
          localStorage.getItem(key) || "[]"
        );

        setWishlist(
          Array.isArray(savedWishlist) ? savedWishlist : []
        );
      } catch (error) {
        console.error("WISHLIST LOAD ERROR:", error);
        setWishlist([]);
      }
    };

    refreshWishlist();

    window.addEventListener("wishlistUpdated", refreshWishlist);
    window.addEventListener("authChanged", refreshWishlist);
    window.addEventListener("authUpdated", refreshWishlist);
    window.addEventListener("storage", refreshWishlist);

    return () => {
      window.removeEventListener("wishlistUpdated", refreshWishlist);
      window.removeEventListener("authChanged", refreshWishlist);
      window.removeEventListener("authUpdated", refreshWishlist);
      window.removeEventListener("storage", refreshWishlist);
    };
  }, []);

  /* =======================================================
     PRICE FORMAT
  ======================================================== */

  const formatPrice = (price) => {
    return `Rs. ${Number(price || 0).toLocaleString()}`;
  };

  /* =======================================================
     CHECK WISHLIST
  ======================================================== */

  const isProductInWishlist = (productId) => {
    return wishlist.some(
      (item) =>
        String(item?._id || item?.id || "") === String(productId)
    );
  };

  /* =======================================================
     TOGGLE ACCOUNT WISHLIST
  ======================================================== */

  const toggleWishlist = (product) => {
    const productId = product?._id || product?.id;

    if (!productId) {
      toast.error("Product information is missing.");
      return;
    }

    const user = getCurrentUser();
    const key = getWishlistKey(user);

    if (!key) {
      toast.error("Please sign in to save products to your wishlist.");
      navigate("/login");
      return;
    }

    try {
      const savedWishlist = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      const currentWishlist = Array.isArray(savedWishlist)
        ? savedWishlist
        : [];

      const alreadyExists = currentWishlist.some(
        (item) =>
          String(item?._id || item?.id || "") === String(productId)
      );

      let updatedWishlist;

      if (alreadyExists) {
        updatedWishlist = currentWishlist.filter(
          (item) =>
            String(item?._id || item?.id || "") !==
            String(productId)
        );

        toast.success(`${product.name} removed from wishlist.`);
      } else {
        updatedWishlist = [...currentWishlist, product];

        toast.success(`${product.name} added to wishlist.`);
      }

      localStorage.setItem(key, JSON.stringify(updatedWishlist));

      setWishlist(updatedWishlist);

      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("WISHLIST ERROR:", error);
      toast.error("Unable to update wishlist.");
    }
  };

  /* =======================================================
     FLY TO CART ANIMATION
  ======================================================== */

  const animateToCart = (buttonElement) => {
    if (!buttonElement) return;

    const cartTarget = document.querySelector(
      '[data-cart-target="true"]'
    );

    if (!cartTarget) {
      console.warn(
        "MAMTA: Cart target not found. Add data-cart-target='true' to the cart element."
      );
      return;
    }

    const buttonRect = buttonElement.getBoundingClientRect();
    const cartRect = cartTarget.getBoundingClientRect();

    const size = 58;

    const startX =
      buttonRect.left + buttonRect.width / 2 - size / 2;

    const startY =
      buttonRect.top + buttonRect.height / 2 - size / 2;

    const endX =
      cartRect.left + cartRect.width / 2 - size / 2;

    const endY =
      cartRect.top + cartRect.height / 2 - size / 2;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const flyingItem = document.createElement("div");

    flyingItem.className = "mamta-flying-cart-item";
    flyingItem.innerHTML = "<span>M</span>";
    flyingItem.style.left = `${startX}px`;
    flyingItem.style.top = `${startY}px`;

    document.body.appendChild(flyingItem);

    const animation = flyingItem.animate(
      [
        {
          transform: "translate3d(0, 0, 0) scale(1)",
          opacity: 1,
        },
        {
          transform: `translate3d(${deltaX * 0.18}px, ${deltaY * 0.18 - 45}px, 0) scale(0.96)`,
          opacity: 1,
        },
        {
          transform: `translate3d(${deltaX * 0.48}px, ${deltaY * 0.48 - 55}px, 0) scale(0.82)`,
          opacity: 0.95,
        },
        {
          transform: `translate3d(${deltaX * 0.78}px, ${deltaY * 0.78 - 25}px, 0) scale(0.6)`,
          opacity: 0.65,
        },
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.25)`,
          opacity: 0,
        },
      ],
      {
        duration: 950,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      }
    );

    animation.onfinish = () => {
      flyingItem.remove();

      cartTarget.classList.remove("cart-flying-pop");
      void cartTarget.offsetWidth;
      cartTarget.classList.add("cart-flying-pop");

      setTimeout(() => {
        cartTarget.classList.remove("cart-flying-pop");
      }, 450);
    };
  };

  /* =======================================================
     ADD ITEM TO GUEST CART
  ======================================================== */

  const addToGuestCart = (cartData) => {
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
    console.error("GUEST CART READ ERROR:", error);
  }

  const existingItemIndex = guestCart.findIndex(
    (item) =>
      String(item.productId || item._id || item.id) ===
        String(cartData.productId) &&
      String(item.color || "") === String(cartData.color || "")
  );

  if (existingItemIndex !== -1) {
    guestCart[existingItemIndex] = {
      ...guestCart[existingItemIndex],
      ...cartData,
      quantity:
        Number(guestCart[existingItemIndex].quantity || 0) +
        Number(cartData.quantity || 1),
    };
  } else {
    guestCart.push(cartData);
  }

  localStorage.setItem(
    GUEST_CART_KEY,
    JSON.stringify({
      items: guestCart,
    })
  );

  window.dispatchEvent(new Event("cartChanged"));
};

  /* =======================================================
     ADD TO CART
  ======================================================== */

  const addToCart = async (product, buttonElement) => {
    const productId = product?._id || product?.id;

    if (!productId) {
      toast.error("Product ID is missing.");
      return;
    }

    if (String(addingProductId) === String(productId)) return;

    const cartData = {
      productId: String(productId),
      name: product.name || "",
      image: getProductImage(product),
      price: Number(product.price || 0),
      quantity: 1,
      color: "",
      colorCode: "",
      colorImage: "",
    };

    try {
      setAddingProductId(productId);

      const token = localStorage.getItem("mamta_user_token");

      if (token) {
        try {
          await axios.post(`${API_URL}/cart/add`, cartData, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          if (
            error.response?.status !== 401 &&
            error.response?.status !== 403
          ) {
            throw error;
          }

          localStorage.removeItem("mamta_user_token");
          localStorage.removeItem("mamta_user");
          localStorage.removeItem("mamta_token");
          localStorage.removeItem("mamta_user_data");

          window.dispatchEvent(new Event("authChanged"));

          addToGuestCart(cartData);
        }
      } else {
        addToGuestCart(cartData);
      }

      window.dispatchEvent(new Event("cartChanged"));
      animateToCart(buttonElement);

      toast.success(`${product.name} added to cart.`);
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to add product to cart."
      );
    } finally {
      setAddingProductId(null);
    }
  };

  /* =======================================================
     RETURN
  ======================================================== */

  return (
    <main className="maternity-page">
      {/* HERO */}
      <section className="maternity-hero">
        <div className="maternity-hero-glow maternity-glow-one"></div>
        <div className="maternity-hero-glow maternity-glow-two"></div>

        <div className="maternity-hero-inner">
          <ScrollReveal direction="left">
            <div className="maternity-hero-content">
              <span className="maternity-eyebrow">
                <span></span>
                MAAMTA MATERNITY COLLECTION
              </span>

              <h1>
                Made for
                <br />
                <em>your comfort.</em>
              </h1>

              <p>
                Gentle support for the beautiful journey
                of motherhood. Discover thoughtfully
                designed maternity pillows made to bring
                comfort to every moment of rest.
              </p>

              <div className="maternity-hero-actions">
                <a
                  href="#maternity-products"
                  className="maternity-primary-btn"
                >
                  Shop the collection
                  <ArrowUpRight size={17} />
                </a>

                <span className="maternity-hero-note">
                  Soft support • Thoughtful comfort
                </span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="maternity-hero-visual">
              <div className="maternity-hero-circle"></div>

              <div className="maternity-main-image">
                <img
                  src="https://res.cloudinary.com/iysbraru/image/upload/v1794067725/her3.webp"
                  alt="Mother and baby"
                  className="maternity-hero-image"
                />
              </div>

              <div className="maternity-floating-card">
                <span>DESIGNED FOR MUMS</span>

                <strong>
                  A softer way
                  <br />
                  to rest.
                </strong>

                <div className="floating-check">
                  <Check size={13} />
                  Thoughtful comfort
                </div>
              </div>

              <div className="maternity-round-badge">
                <span>COMFORT • CARE • MAAMTA •</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* INTRO */}
      <ScrollReveal direction="down">
        <section className="maternity-intro">
          <div className="maternity-intro-label">WHY MAAMTA</div>

          <h2>
            Comfort that feels
            <br />
            <em>like a little care.</em>
          </h2>

          <p>
            Pregnancy brings countless changes.
            Your comfort should not be one of them.
            Our maternity pillows are thoughtfully
            selected to offer soft, supportive comfort
            throughout your day and night.
          </p>
        </section>
      </ScrollReveal>

      {/* BENEFITS */}
      <section className="maternity-benefits">
        <ScrollReveal direction="left">
          <div className="maternity-benefit">
            <div className="benefit-number">01</div>
            <div>
              <h3>Gentle Support</h3>
              <p>
                Designed with comfort and support
                in mind for relaxing moments.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" className="stagger-2">
          <div className="maternity-benefit">
            <div className="benefit-number">02</div>
            <div>
              <h3>Soft Materials</h3>
              <p>
                Soft-touch fabrics create a cozy
                feeling whenever you need to rest.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="right" className="stagger-3">
          <div className="maternity-benefit">
            <div className="benefit-number">03</div>
            <div>
              <h3>Made for Motherhood</h3>
              <p>
                Thoughtfully chosen with the needs
                of expecting mothers in mind.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* PRODUCTS */}
      <section
        className="maternity-products-section"
        id="maternity-products"
      >
        <ScrollReveal direction="down">
          <div className="maternity-section-heading">
            <div>
              <span className="maternity-section-eyebrow">
                THE COLLECTION
              </span>

              <h2>
                Maternity <em>pillows.</em>
              </h2>
            </div>

            <p>
              Find the gentle support that
              feels right for you.
            </p>
          </div>
        </ScrollReveal>

        <div className="maternity-products-grid">
          {loading ? (
            <div className="no-products">
              <h3>Loading maternity collection...</h3>
              <p>Please wait while we find your products.</p>
            </div>
          ) : maternityProducts.length > 0 ? (
            maternityProducts.map((product, index) => {
              const productId = product._id || product.id;
              const productInWishlist =
                isProductInWishlist(productId);

              return (
                <ScrollReveal
                  key={productId}
                  direction="up"
                  className={`stagger-${(index % 6) + 1}`}
                >
                  <article className="maternity-product-card">
                    <div className="maternity-product-image">
                      <img
                        src={getProductImage(product)}
                        alt={product.name || "Maternity Pillow"}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />

                      {product.tag && (
                        <span className="maternity-product-tag">
                          {product.tag}
                        </span>
                      )}

                      <button
                        type="button"
                        className={`maternity-wishlist ${
                          productInWishlist ? "liked" : ""
                        }`}
                        onClick={() => toggleWishlist(product)}
                        aria-label={
                          productInWishlist
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                      >
                        <Heart
                          size={18}
                          fill={
                            productInWishlist
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>

                      <div className="maternity-product-overlay">
                        <button
                          type="button"
                          className="maternity-details-button"
                          onClick={() =>
                            navigate(`/product/${productId}`)
                          }
                        >
                          View Details
                          <ArrowUpRight size={15} />
                        </button>

                        <button
                          type="button"
                          className="maternity-add-cart-button"
                          onClick={(e) =>
                            addToCart(product, e.currentTarget)
                          }
                          disabled={
                            String(addingProductId) ===
                            String(productId)
                          }
                        >
                          <ShoppingBag size={16} />
                          {String(addingProductId) ===
                          String(productId)
                            ? "Adding..."
                            : "Add to cart"}
                        </button>
                      </div>
                    </div>

                    <div className="maternity-product-info">
                      <div className="maternity-rating">
                        <Star size={13} fill="currentColor" />
                        <span>{product.rating || "4.9"}</span>
                      </div>

                      <h3>{product.name}</h3>

                      <div className="maternity-price">
                        <strong>
                          {formatPrice(product.price)}
                        </strong>

                        {product.oldPrice && (
                          <span>
                            {formatPrice(product.oldPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })
          ) : (
            <div className="no-products">
              <h3>No maternity products available</h3>
              <p>
                Please check back soon for our collection.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CLOSING BANNER */}
      <ScrollReveal direction="up">
        <section className="maternity-closing">
          <div className="maternity-closing-inner">
            <span>FOR EVERY MOTHER</span>

            <h2>
              Because you deserve
              <br />
              <em>comfort too.</em>
            </h2>

            <a href="#maternity-products">
              Explore maternity pillows
              <ArrowUpRight size={16} />
            </a>
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
};

export default MaternityPillows;

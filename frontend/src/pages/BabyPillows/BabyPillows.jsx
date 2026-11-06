
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import {
  Heart,
  ShoppingBag,
  Star,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Feather,
  Check,
} from "lucide-react";

import ScrollReveal from "../../components/ScrollReveal/ScrollReveal";
import "./BabyPillows.css";

/* =========================================================
   API & STORAGE
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
   PRODUCT IMAGE HELPER
========================================================= */

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

const BabyPillows = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistKey, setWishlistKey] = useState(() =>
    getWishlistKey(getCurrentUser())
  );
  const [addingProductId, setAddingProductId] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =======================================================
     LOAD BABY PRODUCTS
  ======================================================== */

  useEffect(() => {
    const loadBabyProducts = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${API_URL}/products`);

        const allProducts = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.products)
            ? response.data.products
            : Array.isArray(response.data?.data)
              ? response.data.data
              : [];

        const babyProducts = allProducts.filter((product) => {
          const category =
            typeof product.category === "object"
              ? product.category?.name ||
                product.category?.title ||
                ""
              : product.category || "";

          return (
            String(category).toLowerCase().includes("baby") &&
            product.active !== false
          );
        });

        setProducts(babyProducts);
      } catch (error) {
        console.error("BABY PRODUCTS LOAD ERROR:", error);
        setProducts([]);

        toast.error("Unable to load baby products.");
      } finally {
        setLoading(false);
      }
    };

    loadBabyProducts();
  }, []);

  /* =======================================================
     LOAD ACCOUNT-SPECIFIC WISHLIST
  ======================================================== */

  useEffect(() => {
    const refreshWishlist = () => {
      const user = getCurrentUser();
      const key = getWishlistKey(user);

      setWishlistKey(key);

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
      toast.error("Product ID is missing.");
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

      setWishlistKey(key);
      setWishlist(updatedWishlist);

      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("WISHLIST ERROR:", error);
      toast.error("Unable to update wishlist.");
    }
  };

  /* =======================================================
     GUEST CART
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
      guestCart = [];
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
        quantity:
          Number(guestCart[existingItemIndex].quantity || 1) +
          Number(cartData.quantity || 1),
      };
    } else {
      guestCart.push(cartData);
    }

    localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify(guestCart)
    );
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

    const startX = buttonRect.left + buttonRect.width / 2;
    const startY = buttonRect.top + buttonRect.height / 2;
    const endX = cartRect.left + cartRect.width / 2;
    const endY = cartRect.top + cartRect.height / 2;

    const flyingItem = document.createElement("div");

    flyingItem.className = "mamta-flying-cart-item";
    flyingItem.innerHTML = "<span>M</span>";
    flyingItem.style.left = `${startX - 29}px`;
    flyingItem.style.top = `${startY - 29}px`;

    document.body.appendChild(flyingItem);

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const animation = flyingItem.animate(
      [
        {
          transform: "translate3d(0, 0, 0) scale(1)",
          opacity: 1,
        },
        {
          transform: `translate3d(${deltaX * 0.35}px, ${deltaY * 0.2}px, 0) scale(0.88)`,
          opacity: 1,
        },
        {
          transform: `translate3d(${deltaX * 0.75}px, ${deltaY * 0.72}px, 0) scale(0.58)`,
          opacity: 0.9,
        },
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.2)`,
          opacity: 0,
        },
      ],
      {
        duration: 900,
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
     ADD TO CART
  ======================================================== */

  const addToCart = async (product, buttonElement) => {
    const productId = product?._id || product?.id;

    if (!productId) {
      toast.error("Product ID is missing.");
      return;
    }

    if (String(addingProductId) === String(productId)) return;

    try {
      setAddingProductId(productId);

      const cartData = {
        productId: String(productId),
        name: product.name || "Baby Pillow",
        image: getProductImage(product),
        price: Number(product.price || 0),
        quantity: 1,
        color: "",
        colorCode: "",
        colorImage: "",
      };

      const token = localStorage.getItem("mamta_user_token");

      if (!token) {
        addToGuestCart(cartData);
      } else {
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
      }

      window.dispatchEvent(new Event("cartChanged"));

      animateToCart(buttonElement);

      toast.success(`${product.name} added to cart.`);
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
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
    <main className="baby-page">
      {/* HERO */}
      <section className="baby-hero">
        <div className="baby-hero-container">
          <ScrollReveal direction="left">
            <div className="baby-hero-content">
              <span className="baby-eyebrow">
                MAAMTA · BABY COLLECTION
              </span>

              <h1>
                Soft comfort
                <span>for little dreams.</span>
              </h1>

              <p>
                Thoughtfully designed baby pillows
                created to bring softness, comfort
                and warmth to everyday little moments.
              </p>

              <div className="baby-hero-actions">
                <a
                  href="#baby-collection"
                  className="baby-primary-button"
                >
                  <span>Explore Collection</span>
                  <ArrowUpRight size={17} />
                </a>

                <span className="baby-hero-note">
                  Soft · Gentle · Thoughtful
                </span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="maternity-hero-visual">
              <div className="maternity-hero-circle"></div>
              <div className="maternity-hero-glow maternity-glow-one"></div>
              <div className="maternity-hero-glow maternity-glow-two"></div>

              <div className="maternity-main-image">
                <img
                  src="https://res.cloudinary.com/iysbraru/image/upload/v1790508192/baby.jpg"
                  alt="MAAMTA baby pillow collection"
                />
              </div>

              <div className="maternity-floating-card">
                <span>MAAMTA COMFORT</span>

                <strong>
                  Made for
                  <br />
                  beautiful moments.
                </strong>

                <div className="floating-check">
                  <Check size={13} />
                  <span>Soft & thoughtfully designed</span>
                </div>
              </div>

              <div className="ma-round-badge">
                <span>
                  COMFORT
                  <br />
                  CARE
                  <br />
                  MAAMTA
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* INTRODUCTION */}
      <section className="baby-introduction">
        <div className="baby-intro-container">
          <ScrollReveal direction="down">
            <div className="baby-intro-title">
              <span className="baby-section-label">
                GENTLE BY DESIGN
              </span>

              <h2>
                Comfort made
                <span>for little ones.</span>
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up">
            <div className="baby-intro-content">
              <p className="baby-intro-main">
                Every little moment deserves a little more
                softness. Our baby pillows are thoughtfully
                selected to make everyday comfort feel simple,
                beautiful and special.
              </p>

              <p className="baby-intro-secondary">
                From peaceful rest to quiet cuddles, MAAMTA
                brings together soft essentials made with
                care for mothers and their little ones.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FEATURES */}
      <section className="baby-features">
        <div className="baby-features-container">
          <ScrollReveal direction="left" className="stagger-1">
            <div className="baby-feature">
              <div className="baby-feature-icon">
                <Feather size={20} />
              </div>

              <div>
                <span>01</span>
                <h3>Soft & Gentle</h3>
                <p>
                  Carefully selected soft materials
                  for cozy everyday comfort.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" className="stagger-2">
            <div className="baby-feature">
              <div className="baby-feature-icon">
                <Sparkles size={20} />
              </div>

              <div>
                <span>02</span>
                <h3>Thoughtful Design</h3>
                <p>
                  Simple, comfortable designs created
                  with little ones in mind.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" className="stagger-3">
            <div className="baby-feature">
              <div className="baby-feature-icon">
                <ShieldCheck size={20} />
              </div>

              <div>
                <span>03</span>
                <h3>Made with Care</h3>
                <p>
                  Everyday essentials chosen with
                  comfort and care at heart.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* COLLECTION */}
      <section className="baby-products" id="baby-collection">
        <div className="baby-products-container">
          <ScrollReveal direction="down">
            <div className="baby-products-heading">
              <div>
                <span className="baby-section-label">
                  THE COLLECTION
                </span>

                <h2>
                  Baby
                  <span>Pillows</span>
                </h2>
              </div>

              <p>
                Soft little companions thoughtfully chosen
                for everyday comfort and beautiful moments.
              </p>
            </div>
          </ScrollReveal>

          <div className="baby-products-grid">
            {loading ? (
              <p>Loading baby pillow collection...</p>
            ) : products.length > 0 ? (
              products.map((product, index) => {
                const productId = product._id || product.id;
                const productInWishlist =
                  isProductInWishlist(productId);
                const productImage = getProductImage(product);

                return (
                  <ScrollReveal
                    key={productId}
                    direction="up"
                    className={`stagger-${(index % 6) + 1}`}
                  >
                    <article className="baby-product-card">
                      <div className="baby-product-image">
                        <img
                          src={productImage}
                          alt={product.name || "Baby pillow"}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = PLACEHOLDER_IMAGE;
                          }}
                        />

                        {product.tag && (
                          <span className="baby-product-tag">
                            {product.tag}
                          </span>
                        )}

                        <button
                          type="button"
                          className={`baby-wishlist ${
                            productInWishlist ? "active" : ""
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
                            strokeWidth={1.5}
                            fill={
                              productInWishlist
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>

                        <Link
                          to={`/product/${productId}`}
                          className="baby-details-button"
                        >
                          <span>View Details</span>
                          <ArrowUpRight size={15} />
                        </Link>
                      </div>

                      <div className="baby-product-info">
                        <span className="baby-product-category">
                          BABY & KIDS
                        </span>

                        <h3>{product.name}</h3>

                        <div className="baby-rating">
                          <div className="baby-stars">
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
                            {product.rating || "4.9"}
                            {" · "}
                            {product.reviews || 0}
                            {" reviews"}
                          </span>
                        </div>

                        <div className="baby-product-bottom">
                          <div className="baby-price">
                            <strong>
                              Rs.{" "}
                              {Number(
                                product.price || 0
                              ).toLocaleString()}
                            </strong>

                            {product.oldPrice && (
                              <del>
                                Rs.{" "}
                                {Number(
                                  product.oldPrice
                                ).toLocaleString()}
                              </del>
                            )}
                          </div>

                          <button
                            type="button"
                            className={`baby-cart ${
                              String(addingProductId) ===
                              String(productId)
                                ? "adding"
                                : ""
                            }`}
                            onClick={(e) =>
                              addToCart(product, e.currentTarget)
                            }
                            disabled={
                              String(addingProductId) ===
                              String(productId)
                            }
                            aria-label={`Add ${product.name} to cart`}
                          >
                            <ShoppingBag size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  </ScrollReveal>
                );
              })
            ) : (
              <p>
                No baby pillow products are available right now.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="baby-final">
        <ScrollReveal direction="up">
          <div className="baby-final-content">
            <span className="baby-final-label">MAAMTA</span>

            <h2>
              Small comforts.
              <span>Beautiful beginnings.</span>
            </h2>

            <p>
              Thoughtfully chosen for the little moments
              that become your favorite memories.
            </p>

            <Link to="/shop" className="baby-final-button">
              <span>Shop All Products</span>
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
};

export default BabyPillows;

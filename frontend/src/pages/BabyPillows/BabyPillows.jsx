
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const WISHLIST_KEY = "mamta_wishlist";
const GUEST_CART_KEY = "mamta_guest_cart";

/* =========================================================
   COMPONENT
========================================================= */

const BabyPillows = () => {

  /* =======================================================
     STATES
  ======================================================== */

  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addingProductId, setAddingProductId] = useState(null);

  /* =======================================================
     LOAD BABY PRODUCTS
  ======================================================== */

  useEffect(() => {
    const loadBabyProducts = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/products`
        );

        const allProducts = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.products)
            ? response.data.products
            : [];

        const babyProducts = allProducts.filter((product) =>
          String(product.category || "")
            .toLowerCase()
            .includes("baby")
        );

        setProducts(babyProducts);

      } catch (error) {
        console.error("BABY PRODUCTS LOAD ERROR:", error);

        setProducts([]);

        toast.error("Unable to load baby products.");
      }
    };

    loadBabyProducts();
  }, []);

  /* =======================================================
     LOAD WISHLIST
  ======================================================== */

  useEffect(() => {
    const loadWishlist = () => {
      try {
        const savedWishlist = JSON.parse(
          localStorage.getItem(WISHLIST_KEY) || "[]"
        );

        setWishlist(
          Array.isArray(savedWishlist)
            ? savedWishlist
            : []
        );

      } catch (error) {
        console.error("WISHLIST LOAD ERROR:", error);
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

  /* =======================================================
     CHECK WISHLIST
  ======================================================== */

  const isProductInWishlist = (productId) => {
    return wishlist.some(
      (item) =>
        String(item._id || item.id) === String(productId)
    );
  };

  /* =======================================================
     TOGGLE WISHLIST
  ======================================================== */

  const toggleWishlist = (product) => {
    const productId = product._id || product.id;

    if (!productId) {
      toast.error("Product ID is missing.");
      return;
    }

    try {
      const savedWishlist = JSON.parse(
        localStorage.getItem(WISHLIST_KEY) || "[]"
      );

      const currentWishlist = Array.isArray(savedWishlist)
        ? savedWishlist
        : [];

      const alreadyExists = currentWishlist.some(
        (item) =>
          String(item._id || item.id) === String(productId)
      );

      let updatedWishlist;

      if (alreadyExists) {
        updatedWishlist = currentWishlist.filter(
          (item) =>
            String(item._id || item.id) !== String(productId)
        );

        toast.success(
          `${product.name} removed from wishlist.`
        );

      } else {
        updatedWishlist = [
          ...currentWishlist,
          product,
        ];

        toast.success(
          `${product.name} added to wishlist.`
        );
      }

      localStorage.setItem(
        WISHLIST_KEY,
        JSON.stringify(updatedWishlist)
      );

      setWishlist(updatedWishlist);

      window.dispatchEvent(
        new Event("wishlistUpdated")
      );

    } catch (error) {
      console.error("WISHLIST ERROR:", error);

      toast.error("Unable to update wishlist.");
    }
  };

  /* =======================================================
     GUEST CART
  ======================================================== */

  const addToGuestCart = (cartData) => {
    const savedCart = JSON.parse(
      localStorage.getItem(GUEST_CART_KEY) || "[]"
    );

    const guestCart = Array.isArray(savedCart)
      ? savedCart
      : [];

    const existingItemIndex = guestCart.findIndex(
      (item) =>
        String(item.productId) === String(cartData.productId) &&
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

    const startX =
      buttonRect.left + buttonRect.width / 2;

    const startY =
      buttonRect.top + buttonRect.height / 2;

    const endX =
      cartRect.left + cartRect.width / 2;

    const endY =
      cartRect.top + cartRect.height / 2;

    const flyingItem = document.createElement("div");

    flyingItem.className = "mamta-flying-cart-item";

    flyingItem.innerHTML = `<span>M</span>`;

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
          transform: `translate3d(
            ${deltaX * 0.35}px,
            ${deltaY * 0.2}px,
            0
          ) scale(0.88)`,
          opacity: 1,
        },
        {
          transform: `translate3d(
            ${deltaX * 0.75}px,
            ${deltaY * 0.72}px,
            0
          ) scale(0.58)`,
          opacity: 0.9,
        },
        {
          transform: `translate3d(
            ${deltaX}px,
            ${deltaY}px,
            0
          ) scale(0.2)`,
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

    if (String(addingProductId) === String(productId)) {
      return;
    }

    try {
      setAddingProductId(productId);

      const productImage =
        product.image ||
        (Array.isArray(product.images)
          ? product.images[0]
          : "") ||
        "";

      const cartData = {
        productId: String(productId),
        name: product.name || "Baby Pillow",
        image: productImage,
        price: Number(product.price || 0),
        quantity: 1,
        color: "",
        colorCode: "",
        colorImage: "",
      };

      const token = localStorage.getItem(
        "mamta_user_token"
      );

      /* ================================================
         GUEST USER
      ================================================ */

      if (!token) {
        addToGuestCart(cartData);

      } else {

        /* ================================================
           LOGGED-IN USER
        ================================================ */

        try {
          await axios.post(
            `${API_URL}/cart/add`,
            cartData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        } catch (error) {

          /* ============================================
             INVALID / EXPIRED TOKEN
          ============================================ */

          if (
            error.response?.status === 401 ||
            error.response?.status === 403
          ) {
            localStorage.removeItem("mamta_user_token");
            localStorage.removeItem("mamta_user");
            localStorage.removeItem("mamta_token");
            localStorage.removeItem("mamta_user_data");

            window.dispatchEvent(
              new Event("authChanged")
            );

            // Save item as guest instead of redirecting.
            addToGuestCart(cartData);

          } else {
            throw error;
          }
        }
      }

      /* ================================================
         UPDATE CART
      ================================================ */

      window.dispatchEvent(
        new Event("cartChanged")
      );

      /* ================================================
         CART ANIMATION
      ================================================ */

      animateToCart(buttonElement);

      /* ================================================
         SUCCESS MESSAGE
      ================================================ */

      toast.success(
        `${product.name} added to cart.`
      );

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

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="baby-hero">

        <div className="baby-hero-container">

          <ScrollReveal direction="left">

            <div className="baby-hero-content">

              <span className="baby-eyebrow">
                MAAMTA · BABY COLLECTION
              </span>

              <h1>
                Soft comfort
                <span>
                  for little dreams.
                </span>
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
                  <span>
                    Explore Collection
                  </span>

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

                <span>
                  MAAMTA COMFORT
                </span>

                <strong>
                  Made for
                  <br />
                  beautiful moments.
                </strong>

                <div className="floating-check">

                  <Check size={13} />

                  <span>
                    Soft & thoughtfully designed
                  </span>

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

      {/* =====================================================
          INTRODUCTION
      ===================================================== */}

      <section className="baby-introduction">

        <div className="baby-intro-container">

          <ScrollReveal direction="down">

            <div className="baby-intro-title">

              <span className="baby-section-label">
                GENTLE BY DESIGN
              </span>

              <h2>
                Comfort made
                <span>
                  for little ones.
                </span>
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

      {/* =====================================================
          FEATURES
      ===================================================== */}

      <section className="baby-features">

        <div className="baby-features-container">

          <ScrollReveal
            direction="left"
            className="stagger-1"
          >

            <div className="baby-feature">

              <div className="baby-feature-icon">
                <Feather size={20} />
              </div>

              <div>

                <span>01</span>

                <h3>
                  Soft & Gentle
                </h3>

                <p>
                  Carefully selected soft materials
                  for cozy everyday comfort.
                </p>

              </div>

            </div>

          </ScrollReveal>

          <ScrollReveal
            direction="up"
            className="stagger-2"
          >

            <div className="baby-feature">

              <div className="baby-feature-icon">
                <Sparkles size={20} />
              </div>

              <div>

                <span>02</span>

                <h3>
                  Thoughtful Design
                </h3>

                <p>
                  Simple, comfortable designs created
                  with little ones in mind.
                </p>

              </div>

            </div>

          </ScrollReveal>

          <ScrollReveal
            direction="right"
            className="stagger-3"
          >

            <div className="baby-feature">

              <div className="baby-feature-icon">
                <ShieldCheck size={20} />
              </div>

              <div>

                <span>03</span>

                <h3>
                  Made with Care
                </h3>

                <p>
                  Everyday essentials chosen with
                  comfort and care at heart.
                </p>

              </div>

            </div>

          </ScrollReveal>

        </div>

      </section>

      {/* =====================================================
          COLLECTION
      ===================================================== */}

      <section
        className="baby-products"
        id="baby-collection"
      >

        <div className="baby-products-container">

          <ScrollReveal direction="down">

            <div className="baby-products-heading">

              <div>

                <span className="baby-section-label">
                  THE COLLECTION
                </span>

                <h2>
                  Baby
                  <span>
                    Pillows
                  </span>
                </h2>

              </div>

              <p>
                Soft little companions thoughtfully chosen
                for everyday comfort and beautiful moments.
              </p>

            </div>

          </ScrollReveal>

          {/* PRODUCT GRID */}

          <div className="baby-products-grid">

            {products.map((product, index) => {

              const productId =
                product._id || product.id;

              const productInWishlist =
                isProductInWishlist(productId);

              const productImage =
                product.image ||
                (Array.isArray(product.images)
                  ? product.images[0]
                  : "") ||
                "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";

              return (
                <ScrollReveal
                  key={productId}
                  direction="up"
                  className={`stagger-${(index % 6) + 1}`}
                >

                  <article className="baby-product-card">

                    {/* PRODUCT IMAGE */}

                    <div className="baby-product-image">

                      <img
                        src={productImage}
                        alt={product.name || "Baby pillow"}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";
                        }}
                      />

                      {product.tag && (
                        <span className="baby-product-tag">
                          {product.tag}
                        </span>
                      )}

                      {/* WISHLIST */}

                      <button
                        type="button"
                        className={`baby-wishlist ${
                          productInWishlist ? "active" : ""
                        }`}
                        onClick={() =>
                          toggleWishlist(product)
                        }
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

                      {/* VIEW DETAILS */}

                      <Link
                        to={`/product/${productId}`}
                        className="baby-details-button"
                      >

                        <span>
                          View Details
                        </span>

                        <ArrowUpRight size={15} />

                      </Link>

                    </div>

                    {/* PRODUCT INFO */}

                    <div className="baby-product-info">

                      <span className="baby-product-category">
                        BABY & KIDS
                      </span>

                      <h3>
                        {product.name}
                      </h3>

                      {/* RATING */}

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

                      {/* PRICE + CART */}

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

                        {/* ADD TO CART */}

                        <button
                          type="button"
                          className={`baby-cart ${
                            String(addingProductId) === String(productId)
                              ? "adding"
                              : ""
                          }`}
                          onClick={(e) =>
                            addToCart(
                              product,
                              e.currentTarget
                            )
                          }
                          disabled={
                            String(addingProductId) === String(productId)
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
            })}

            {products.length === 0 && (
              <p>
                No baby pillow products are available right now.
              </p>
            )}

          </div>

        </div>

      </section>

      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="baby-final">

        <ScrollReveal direction="up">

          <div className="baby-final-content">

            <span className="baby-final-label">
              MAAMTA
            </span>

            <h2>
              Small comforts.
              <span>
                Beautiful beginnings.
              </span>
            </h2>

            <p>
              Thoughtfully chosen for the little moments
              that become your favorite memories.
            </p>

            <Link
              to="/shop"
              className="baby-final-button"
            >

              <span>
                Shop All Products
              </span>

              <ArrowUpRight size={17} />

            </Link>

          </div>

        </ScrollReveal>

      </section>

    </main>
  );
};

export default BabyPillows;

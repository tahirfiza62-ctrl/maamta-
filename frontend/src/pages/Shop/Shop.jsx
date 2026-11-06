
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import {
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Heart,
  ArrowUpRight,
} from "lucide-react";

import ScrollReveal from "../../components/ScrollReveal/ScrollReveal";

import {
  animateToWishlist,
  playWishlistSound,
} from "../../utils/wishlistAnimation";

import "./Shop.css";

/* =========================================================
   API + STORAGE
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api";

const WISHLIST_KEY = "mamta_wishlist";
const GUEST_CART_KEY = "mamta_guest_cart";

/* =========================================================
   CATEGORIES
========================================================= */

const categories = [
  "All",
  "Maternity Pillows",
  "Baby Pillows",
  "Nursing Products",
  "Elders Pillows",
  "Accessories",
];

/* =========================================================
   SHOP COMPONENT
========================================================= */

const Shop = () => {
  const navigate = useNavigate();

  /* =======================================================
     STATES
  ======================================================== */

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [wishlist, setWishlist] = useState([]);

  /* =======================================================
     LOAD WISHLIST
  ======================================================== */

  useEffect(() => {
    const loadWishlist = () => {
      try {
        const savedWishlist = localStorage.getItem(WISHLIST_KEY);

        if (!savedWishlist) {
          setWishlist([]);
          return;
        }

        const parsedWishlist = JSON.parse(savedWishlist);

        setWishlist(
          Array.isArray(parsedWishlist) ? parsedWishlist : []
        );
      } catch (error) {
        console.error("LOAD WISHLIST ERROR:", error);
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
  }, []);

  /* =======================================================
     FETCH PRODUCTS
  ======================================================== */

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);

        const endpoint = `${API_URL}/products`;

        console.log("FETCHING PRODUCTS FROM:", endpoint);

        const response = await axios.get(endpoint, {
          timeout: 10000,
        });

        console.log("PRODUCT API RESPONSE:", response.data);

        console.log(
          "ALL PRODUCT CATEGORIES + IMAGES:",
          response.data.products?.map((product) => ({
            name: product.name,
            category: product.category,
            mainImage: product.image,
            additionalImages: product.images,
          }))
        );

        if (
          response.data &&
          Array.isArray(response.data.products)
        ) {
          setProducts(response.data.products);
        } else {
          console.error("INVALID PRODUCTS RESPONSE:", response.data);
          setProducts([]);
          toast.error("Invalid product data received from server.");
        }
      } catch (error) {
        console.error("FETCH PRODUCTS ERROR:", error);
        console.error("ERROR RESPONSE:", error.response);

        if (error.response) {
          toast.error(
            error.response.data?.message ||
              `Server error: ${error.response.status}`
          );
        } else if (error.request) {
          toast.error(
            "Unable to connect to the server. Please try again."
          );
        } else {
          toast.error("Unable to load products.");
        }

        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  /* =======================================================
     GET PRODUCT IMAGES
  ======================================================== */

  const getProductImages = (product) => {
    if (!product) return [];

    let images = [];

    if (
      typeof product.image === "string" &&
      product.image.trim() !== ""
    ) {
      images.push(product.image.trim());
    }

    if (Array.isArray(product.images)) {
      const additionalImages = product.images
        .map((image) => {
          if (typeof image === "string") {
            return image.trim();
          }

          if (typeof image === "object" && image !== null) {
            return (
              image.url ||
              image.image ||
              image.src ||
              ""
            );
          }

          return "";
        })
        .filter((image) => typeof image === "string" && image.trim())
        .map((image) => image.trim());

      images.push(...additionalImages);
    }

    return [...new Set(images.filter(Boolean))];
  };

  /* =======================================================
     FILTER + SEARCH + SORT
  ======================================================== */

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (activeCategory !== "All") {
      result = result.filter((product) => {
        const category = String(product.category || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");

        const selectedCategory = activeCategory
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");

        if (selectedCategory === "nursing products") {
          return [
            "nursing products",
            "nursing product",
            "nursing pillow",
            "nursing pillows",
            "newborn & kids",
          ].includes(category);
        }

        return category === selectedCategory;
      });
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();

      result = result.filter(
        (product) =>
          product.name?.toLowerCase().includes(search) ||
          product.category?.toLowerCase().includes(search)
      );
    }

    if (sortBy === "low-high") {
      result.sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0)
      );
    } else if (sortBy === "high-low") {
      result.sort(
        (a, b) => Number(b.price || 0) - Number(a.price || 0)
      );
    } else if (sortBy === "name") {
      result.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    }

    return result;
  }, [products, activeCategory, searchTerm, sortBy]);

  /* =======================================================
     PRICE FORMAT
  ======================================================== */

  const formatPrice = (price) => {
    return `Rs. ${Number(price || 0).toLocaleString()}`;
  };

  /* =======================================================
     CHECK WISHLIST
  ======================================================== */

  const isInWishlist = (productId) => {
    if (!productId) return false;

    return wishlist.some(
      (item) =>
        String(item?._id || item?.id || "") === String(productId)
    );
  };

  /* =======================================================
     HANDLE WISHLIST
  ======================================================== */

  const handleWishlist = (product, event) => {
    if (!product?._id) {
      toast.error("Product information is missing.");
      return;
    }

    try {
      const currentWishlist = Array.isArray(wishlist)
        ? wishlist
        : [];

      const productId = String(product._id);

      const alreadyExists = currentWishlist.some(
        (item) =>
          String(item?._id || item?.id || "") === productId
      );

      if (alreadyExists) {
        const updatedWishlist = currentWishlist.filter(
          (item) =>
            String(item?._id || item?.id || "") !== productId
        );

        setWishlist(updatedWishlist);

        localStorage.setItem(
          WISHLIST_KEY,
          JSON.stringify(updatedWishlist)
        );

        window.dispatchEvent(new Event("wishlistUpdated"));

        toast.success(`${product.name} removed from wishlist.`);
        return;
      }

      const wishlistProduct = {
        ...product,
        _id: product._id,
      };

      const updatedWishlist = [
        ...currentWishlist,
        wishlistProduct,
      ];

      setWishlist(updatedWishlist);

      localStorage.setItem(
        WISHLIST_KEY,
        JSON.stringify(updatedWishlist)
      );

      playWishlistSound();

      if (event?.currentTarget) {
        const buttonRect =
          event.currentTarget.getBoundingClientRect();

        const productImages = getProductImages(product);

        const image =
          productImages[0] ||
          "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";

        animateToWishlist({
          image,
          startX: buttonRect.left + buttonRect.width / 2,
          startY: buttonRect.top + buttonRect.height / 2,
        });
      }

      window.dispatchEvent(new Event("wishlistUpdated"));

      toast.success(`${product.name} added to wishlist.`);
    } catch (error) {
      console.error("HANDLE WISHLIST ERROR:", error);
      toast.error("Unable to update wishlist.");
    }
  };

  /* =======================================================
     FLY TO CART ANIMATION
  ======================================================== */

  const animateToCart = (buttonElement, product) => {
    if (!buttonElement) return;

    const cartTarget = document.querySelector(
      '[data-cart-target="true"]'
    );

    if (!cartTarget) {
      console.warn("MAMTA: Cart target not found.");
      return;
    }

    const buttonRect = buttonElement.getBoundingClientRect();
    const cartRect = cartTarget.getBoundingClientRect();

    const itemSize = 58;

    const startX =
      buttonRect.left + buttonRect.width / 2 - itemSize / 2;

    const startY =
      buttonRect.top + buttonRect.height / 2 - itemSize / 2;

    const endX =
      cartRect.left + cartRect.width / 2 - itemSize / 2;

    const endY =
      cartRect.top + cartRect.height / 2 - itemSize / 2;

    const flying = document.createElement("div");

    flying.className = "mamta-flying-cart-item";

    const productImages = getProductImages(product);
    const image = productImages[0];

    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = "";
      flying.appendChild(img);
    } else {
      const span = document.createElement("span");
      span.textContent = "M";
      flying.appendChild(span);
    }

    flying.style.left = `${startX}px`;
    flying.style.top = `${startY}px`;

    document.body.appendChild(flying);

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const animation = flying.animate(
      [
        {
          transform: "translate3d(0, 0, 0) scale(1)",
          opacity: 1,
        },
        {
          transform: "translate3d(0, -38px, 0) scale(0.96)",
          opacity: 1,
          offset: 0.22,
        },
        {
          transform: `translate3d(${deltaX * 0.45}px, ${
            deltaY * 0.45 - 35
          }px, 0) scale(0.82)`,
          opacity: 0.98,
          offset: 0.52,
        },
        {
          transform: `translate3d(${deltaX * 0.78}px, ${
            deltaY * 0.78 - 18
          }px, 0) scale(0.62)`,
          opacity: 0.72,
          offset: 0.76,
        },
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.32)`,
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
      flying.remove();

      cartTarget.classList.add("cart-pop-animation");

      setTimeout(() => {
        cartTarget.classList.remove("cart-pop-animation");
      }, 450);
    };
  };

  /* =======================================================
     ADD ITEM TO GUEST CART
  ======================================================== */

  const addToGuestCart = (cartData) => {
    let guestCart = [];

    try {
      const savedCart = localStorage.getItem(GUEST_CART_KEY);

      guestCart = savedCart ? JSON.parse(savedCart) : [];

      if (!Array.isArray(guestCart)) {
        guestCart = [];
      }
    } catch (error) {
      console.error("GUEST CART READ ERROR:", error);
      guestCart = [];
    }

    const existingItem = guestCart.find(
      (item) =>
        String(item.productId) === String(cartData.productId) &&
        String(item.color || "") === String(cartData.color || "")
    );

    if (existingItem) {
      existingItem.quantity =
        Number(existingItem.quantity || 0) +
        Number(cartData.quantity || 1);
    } else {
      guestCart.push(cartData);
    }

    localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify(guestCart)
    );
  };

  /* =======================================================
     ADD TO CART — GUEST + LOGGED-IN USERS
  ======================================================== */

  const handleAddToCart = async (product, buttonElement) => {
    if (!product?._id) {
      toast.error("Product information is missing.");
      return;
    }

    const cartData = {
      productId: String(product._id),
      name: product.name || "",
      image:
        product.image ||
        getProductImages(product)[0] ||
        "",
      price: Number(product.price || 0),
      quantity: 1,
      color: "",
      colorCode: "",
      colorImage: "",
    };

    try {
      const token = localStorage.getItem("mamta_user_token");

      if (token) {
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
          // If the saved login session has expired,
          // continue by using the guest cart.
          if (
            error.response?.status !== 401 &&
            error.response?.status !== 403
          ) {
            throw error;
          }

          localStorage.removeItem("mamta_user_token");
          localStorage.removeItem("mamta_user");

          addToGuestCart(cartData);

          window.dispatchEvent(new Event("authChanged"));
        }
      } else {
        addToGuestCart(cartData);
      }

      window.dispatchEvent(new Event("cartChanged"));

      animateToCart(buttonElement, product);

      toast.success(`${product.name} added to cart.`);
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to add product to cart."
      );
    }
  };

  /* =======================================================
     RESET FILTERS
  ======================================================== */

  const resetFilters = () => {
    setSearchTerm("");
    setActiveCategory("All");
    setSortBy("featured");
  };

  /* =======================================================
     LOADING
  ======================================================== */

  if (loadingProducts) {
    return (
      <main className="mamta-shop-page">
        <section className="shop-loading-section">
          <div className="shop-loading-spinner"></div>

          <p>Loading MAAMTA collection...</p>
        </section>
      </main>
    );
  }

  /* =======================================================
     RETURN
  ======================================================== */

  return (
    <main className="mamta-shop-page">

      {/* SHOP HERO */}

      <section className="shop-hero">
        <div className="shop-hero-glow shop-glow-one"></div>
        <div className="shop-hero-glow shop-glow-two"></div>

        <div className="shop-hero-inner">
          <ScrollReveal direction="left">
            <div className="shop-hero-content">
              <div className="shop-hero-label">
                <span></span>
                THE MAAMTA COLLECTION
              </div>

              <h1>
                Comfort made
                <br />
                <em>with love.</em>
              </h1>

              <p>
                Discover thoughtfully crafted pillows designed for
                mothers, little ones, and every generation that
                deserves a little more comfort.
              </p>

              <div className="shop-hero-actions">
                <a href="#shop-products" className="shop-hero-btn">
                  Explore Collection
                  <ArrowUpRight size={17} />
                </a>

                <span className="shop-hero-note">
                  Softness • Support • Care
                </span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="shop-hero-visual">
              <div className="hero-image-main">
                <img
                  src="https://res.cloudinary.com/iysbraru/image/upload/v1791402609/ChatGPT_Image_Oct_8_2026_12_48_07_AM.png"
                  alt="MAMTA comfort collection"
                />
              </div>

              <div className="hero-floating-card">
                <span className="floating-card-small">MAAMTA</span>

                <strong>
                  Made for
                  <br />
                  gentle moments.
                </strong>
              </div>

              <div className="hero-round-text">
                <span>COMFORT • CARE • MAAMTA •</span>
              </div>

              <div className="hero-decor-circle"></div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SHOP CONTENT */}

      <section className="shop-container">

        {/* CATEGORY SECTION */}

        <div className="shop-category-section">
          <ScrollReveal direction="down">
            <div className="category-heading">
              <div>
                <span className="section-eyebrow">
                  EXPLORE COLLECTIONS
                </span>

                <h2>Shop by category</h2>
              </div>

              <p>Find the comfort made especially for you.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up">
            <div className="category-tabs">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    activeCategory === category
                      ? "category-tab active"
                      : "category-tab"
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}

                  {activeCategory === category && (
                    <span className="active-dot"></span>
                  )}
                </button>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* TOOLBAR */}

        <ScrollReveal direction="up">
          <div className="shop-toolbar">
            <div className="results-count">
              <SlidersHorizontal size={16} />

              <span>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1
                  ? "product"
                  : "products"}
              </span>
            </div>

            <div className="shop-search">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="shop-sort">
              <span>Sort by</span>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </ScrollReveal>

        {/* PRODUCTS */}

        {filteredProducts.length > 0 ? (
          <div id="shop-products" className="shop-products-grid">
            {filteredProducts.map((product, index) => {
              const productImages = getProductImages(product);

              const mainImage =
                productImages[0] ||
                "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";

              const hoverImage =
                productImages.length > 1
                  ? productImages[1]
                  : null;

              return (
                <ScrollReveal
                  key={product._id || product.id || index}
                  direction="up"
                  className={`stagger-${(index % 6) + 1}`}
                >
                  <article
                    className={`shop-product-card ${
                      isInWishlist(product._id)
                        ? "has-wishlist"
                        : ""
                    }`}
                  >

                    {/* PRODUCT IMAGE */}

                    <div className="product-image-wrapper">
                      <Link
                        to={`/product/${product._id}`}
                        className="product-image-link"
                        aria-label={`View ${product.name}`}
                      >
                        <img
                          className="product-main-image"
                          src={mainImage}
                          alt={product.name || "MAMTA product"}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";
                          }}
                        />

                        {hoverImage && (
                          <img
                            className="product-hover-image"
                            src={hoverImage}
                            alt={`${product.name} alternate view`}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </Link>

                      {/* WISHLIST */}

                      <button
                        type="button"
                        className={`product-wishlist ${
                          isInWishlist(product._id)
                            ? "wishlist-active"
                            : ""
                        }`}
                        aria-label={
                          isInWishlist(product._id)
                            ? `Remove ${product.name} from wishlist`
                            : `Add ${product.name} to wishlist`
                        }
                        onClick={(event) =>
                          handleWishlist(product, event)
                        }
                      >
                        <Heart
                          size={17}
                          strokeWidth={1.7}
                          fill={
                            isInWishlist(product._id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>

                      {/* CATEGORY */}

                      {product.category && (
                        <span className="product-category">
                          {product.category}
                        </span>
                      )}

                      {/* IMAGE OVERLAY */}

                      <Link
                        to={`/product/${product._id}`}
                        className="product-image-overlay"
                        aria-label={`View ${product.name}`}
                      >
                        <span>View Product</span>
                      </Link>
                    </div>

                    {/* PRODUCT INFO */}

                    <div className="product-info">
                      <div className="product-info-top">
                        <div className="product-title-area">
                          <span className="product-small-label">
                            MAAMTA
                          </span>

                          <h3>
                            <Link to={`/product/${product._id}`}>
                              {product.name}
                            </Link>
                          </h3>
                        </div>
                      </div>

                      {/* PRICE + ACTIONS */}

                      <div className="product-bottom">
                        <div className="product-price">
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

                        <div className="product-actions">
                          <button
                            type="button"
                            className="details-button"
                            onClick={() =>
                              navigate(`/product/${product._id}`)
                            }
                          >
                            Details
                          </button>

                          <button
                            type="button"
                            className="add-cart-button"
                            onClick={(e) =>
                              handleAddToCart(
                                product,
                                e.currentTarget
                              )
                            }
                          >
                            <ShoppingBag
                              size={16}
                              strokeWidth={1.7}
                            />

                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          /* NO PRODUCTS */

          <ScrollReveal direction="up">
            <div className="no-products">
              <div className="no-products-icon">
                <Search size={25} />
              </div>

              <h3>No products found</h3>

              <p>
                Try another search or choose a different category.
              </p>

              <button type="button" onClick={resetFilters}>
                View all products
                <ArrowUpRight size={16} />
              </button>
            </div>
          </ScrollReveal>
        )}
      </section>
    </main>
  );
};

export default Shop;

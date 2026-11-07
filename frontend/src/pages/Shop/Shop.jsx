
import { useEffect,  useState } from "react";
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

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api"
).replace(/\/$/, "");

const GUEST_CART_KEY = "mamta_guest_cart";

const PRODUCTS_PER_PAGE = 8;

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
    String(userId).toLowerCase()
  )}`;
};

/* =========================================================
   IMAGE OPTIMIZATION
========================================================= */

const optimizeImage = (url, width = 600) => {
  if (
    typeof url !== "string" ||
    !url.trim()
  ) {
    return "";
  }

  if (
    !url.includes("res.cloudinary.com") ||
    !url.includes("/upload/")
  ) {
    return url;
  }

  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto,w_${width},c_limit/`
  );
};

/* =========================================================
   SHOP COMPONENT
========================================================= */

const Shop = () => {
  const navigate = useNavigate();

  /* =======================================================
     PRODUCT STATES
  ======================================================== */

  const [products, setProducts] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: PRODUCTS_PER_PAGE,
    totalProducts: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  /* =======================================================
     FILTER STATES
  ======================================================== */

  const [activeCategory, setActiveCategory] = useState("All");

  const [searchTerm, setSearchTerm] = useState("");

  const [sortBy, setSortBy] = useState("featured");

  /* =======================================================
     WISHLIST STATES
  ======================================================== */

  const [wishlist, setWishlist] = useState([]);

  const [wishlistKey, setWishlistKey] = useState(
    () => getWishlistKey()
  );

  /* =======================================================
     REFRESH WISHLIST KEY
  ======================================================== */

  useEffect(() => {
    const refreshWishlistKey = () => {
      setWishlistKey(getWishlistKey());
    };

    refreshWishlistKey();

    window.addEventListener("authChanged", refreshWishlistKey);
    window.addEventListener("authUpdated", refreshWishlistKey);
    window.addEventListener("storage", refreshWishlistKey);

    return () => {
      window.removeEventListener(
        "authChanged",
        refreshWishlistKey
      );

      window.removeEventListener(
        "authUpdated",
        refreshWishlistKey
      );

      window.removeEventListener(
        "storage",
        refreshWishlistKey
      );
    };
  }, []);

  /* =======================================================
     LOAD WISHLIST
  ======================================================== */

  useEffect(() => {
    const loadWishlist = () => {
      if (!wishlistKey) {
        setWishlist([]);
        return;
      }

      try {
        const savedWishlist = localStorage.getItem(wishlistKey);

        const parsedWishlist = savedWishlist
          ? JSON.parse(savedWishlist)
          : [];

        setWishlist(
          Array.isArray(parsedWishlist)
            ? parsedWishlist
            : []
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
      window.removeEventListener(
        "wishlistUpdated",
        loadWishlist
      );

      window.removeEventListener(
        "storage",
        loadWishlist
      );
    };
  }, [wishlistKey]);

  /* =======================================================
     FETCH PRODUCTS — SERVER-SIDE PAGINATION

     Fetches only 8 products per request.
     Search, category and sorting are handled by backend.
  ======================================================== */

  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);

        setProducts([]);

        setPagination({
          currentPage: 1,
          limit: PRODUCTS_PER_PAGE,
          totalProducts: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        });

        const params = {
          page: 1,
          limit: PRODUCTS_PER_PAGE,
          sort: sortBy,
        };

        if (activeCategory !== "All") {
          params.category = activeCategory;
        }

        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        const response = await axios.get(
          `${API_URL}/products`,
          {
            params,
            timeout: 20000,
            signal: controller.signal,
          }
        );

        const productList = response.data?.products;

        if (!Array.isArray(productList)) {
          throw new Error(
            "Invalid products response from server."
          );
        }

        setProducts(productList);

        setPagination(
          response.data?.pagination || {
            currentPage: 1,
            limit: PRODUCTS_PER_PAGE,
            totalProducts: productList.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        );
      } catch (error) {
        if (
          error.name === "CanceledError" ||
          error.code === "ERR_CANCELED"
        ) {
          return;
        }

        console.error("FETCH PRODUCTS ERROR:", error);

        setProducts([]);

        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Unable to load products."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingProducts(false);
        }
      }
    };

    // Small delay prevents sending a request for every typed character.
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCategory, searchTerm, sortBy]);

  /* =======================================================
     GET PRODUCT IMAGES
  ======================================================== */

  const getProductImages = (product) => {
    if (!product) return [];

    let images = [];

    if (
      typeof product.image === "string" &&
      product.image.trim()
    ) {
      images.push(product.image.trim());
    }

    if (Array.isArray(product.images)) {
      const additionalImages = product.images
        .map((image) => {
          if (typeof image === "string") {
            return image.trim();
          }

          if (
            typeof image === "object" &&
            image !== null
          ) {
            return (
              image.url ||
              image.image ||
              image.src ||
              ""
            );
          }

          return "";
        })
        .filter(Boolean);

      images.push(...additionalImages);
    }

    return [...new Set(images)];
  };

  /* =======================================================
     LOAD MORE PRODUCTS
  ======================================================== */

  const handleLoadMore = async () => {
    if (
      loadingMore ||
      loadingProducts ||
      !pagination.hasNextPage
    ) {
      return;
    }

    const nextPage = pagination.currentPage + 1;

    try {
      setLoadingMore(true);

      const params = {
        page: nextPage,
        limit: PRODUCTS_PER_PAGE,
        sort: sortBy,
      };

      if (activeCategory !== "All") {
        params.category = activeCategory;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await axios.get(
        `${API_URL}/products`,
        {
          params,
          timeout: 20000,
        }
      );

      const newProducts = response.data?.products;

      if (!Array.isArray(newProducts)) {
        throw new Error(
          "Invalid products response from server."
        );
      }

      setProducts((previousProducts) => {
        const existingIds = new Set(
          previousProducts.map((product) =>
            String(product._id)
          )
        );

        const uniqueNewProducts = newProducts.filter(
          (product) =>
            !existingIds.has(String(product._id))
        );

        return [
          ...previousProducts,
          ...uniqueNewProducts,
        ];
      });

      setPagination(
        response.data?.pagination || {
          currentPage: nextPage,
          limit: PRODUCTS_PER_PAGE,
          totalProducts: products.length + newProducts.length,
          totalPages: nextPage,
          hasNextPage: false,
          hasPreviousPage: true,
        }
      );
    } catch (error) {
      console.error("LOAD MORE ERROR:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to load more products."
      );
    } finally {
      setLoadingMore(false);
    }
  };

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
        String(item?._id || item?.id || "") ===
        String(productId)
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

    const activeWishlistKey = getWishlistKey();

    if (!activeWishlistKey) {
      toast.error(
        "Please log in to save products to your wishlist."
      );

      navigate("/login");
      return;
    }

    try {
      let currentWishlist = [];

      try {
        const saved = localStorage.getItem(activeWishlistKey);

        const parsed = saved
          ? JSON.parse(saved)
          : [];

        currentWishlist = Array.isArray(parsed)
          ? parsed
          : [];
      } catch {
        currentWishlist = [];
      }

      const productId = String(product._id);

      const alreadyExists = currentWishlist.some(
        (item) =>
          String(item?._id || item?.id || "") === productId
      );

      // REMOVE FROM WISHLIST
      if (alreadyExists) {
        const updatedWishlist = currentWishlist.filter(
          (item) =>
            String(item?._id || item?.id || "") !==
            productId
        );

        localStorage.setItem(
          activeWishlistKey,
          JSON.stringify(updatedWishlist)
        );

        setWishlist(updatedWishlist);

        window.dispatchEvent(
          new Event("wishlistUpdated")
        );

        toast.success(
          `${product.name} removed from wishlist.`
        );

        return;
      }

      // ADD TO WISHLIST
      const updatedWishlist = [
        ...currentWishlist,
        {
          ...product,
          _id: product._id,
        },
      ];

      localStorage.setItem(
        activeWishlistKey,
        JSON.stringify(updatedWishlist)
      );

      setWishlist(updatedWishlist);

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
          startX:
            buttonRect.left + buttonRect.width / 2,
          startY:
            buttonRect.top + buttonRect.height / 2,
        });
      }

      window.dispatchEvent(
        new Event("wishlistUpdated")
      );

      toast.success(
        `${product.name} added to wishlist.`
      );
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

    const buttonRect =
      buttonElement.getBoundingClientRect();

    const cartRect =
      cartTarget.getBoundingClientRect();

    const itemSize = 58;

    const startX =
      buttonRect.left +
      buttonRect.width / 2 -
      itemSize / 2;

    const startY =
      buttonRect.top +
      buttonRect.height / 2 -
      itemSize / 2;

    const endX =
      cartRect.left +
      cartRect.width / 2 -
      itemSize / 2;

    const endY =
      cartRect.top +
      cartRect.height / 2 -
      itemSize / 2;

    const flying = document.createElement("div");

    flying.className = "mamta-flying-cart-item";

    const productImages = getProductImages(product);

    const image = productImages[0];

    if (image) {
      const img = document.createElement("img");

      img.src = optimizeImage(image, 150);
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
        cartTarget.classList.remove(
          "cart-pop-animation"
        );
      }, 450);
    };
  };

  /* =======================================================
     ADD TO GUEST CART
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
        String(
          item.productId || item._id || item.id
        ) === String(cartData.productId) &&
        String(item.color || "") ===
          String(cartData.color || "")
    );

    if (existingItemIndex !== -1) {
      guestCart[existingItemIndex] = {
        ...guestCart[existingItemIndex],
        quantity:
          Number(
            guestCart[existingItemIndex].quantity || 0
          ) +
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
     ADD TO CART
  ======================================================== */

  const handleAddToCart = async (
    product,
    buttonElement
  ) => {
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
      const token = localStorage.getItem(
        "mamta_user_token"
      );

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
          if (
            error.response?.status !== 401 &&
            error.response?.status !== 403
          ) {
            throw error;
          }

          localStorage.removeItem("mamta_user_token");
          localStorage.removeItem("mamta_user");

          addToGuestCart(cartData);

          window.dispatchEvent(
            new Event("authChanged")
          );
        }
      } else {
        addToGuestCart(cartData);
      }

      window.dispatchEvent(
        new Event("cartChanged")
      );

      animateToCart(buttonElement, product);

      toast.success(
        `${product.name} added to cart.`
      );
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
     RETURN
  ======================================================== */

  return (
    <main className="mamta-shop-page">

      {/* =================================================
          SHOP HERO
      ================================================== */}

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
                Discover thoughtfully crafted pillows designed
                for mothers, little ones, and every generation
                that deserves a little more comfort.
              </p>

              <div className="shop-hero-actions">

                <a
                  href="#shop-products"
                  className="shop-hero-btn"
                >
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
                  loading="eager"
                  fetchPriority="high"
                />
              </div>

              <div className="hero-floating-card">
                <span className="floating-card-small">
                  MAAMTA
                </span>

                <strong>
                  Made for
                  <br />
                  gentle moments.
                </strong>
              </div>

              <div className="hero-round-text">
                <span>
                  COMFORT • CARE • MAAMTA •
                </span>
              </div>

              <div className="hero-decor-circle"></div>

            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* =================================================
          SHOP CONTENT
      ================================================== */}

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

              <p>
                Find the comfort made especially for you.
              </p>

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
                  onClick={() =>
                    setActiveCategory(category)
                  }
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
                {pagination.totalProducts}{" "}
                {pagination.totalProducts === 1
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
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>

            <div className="shop-sort">

              <span>Sort by</span>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value)
                }
              >
                <option value="featured">
                  Featured
                </option>

                <option value="low-high">
                  Price: Low to High
                </option>

                <option value="high-low">
                  Price: High to Low
                </option>

                <option value="name">
                  Name
                </option>
              </select>

            </div>

          </div>
        </ScrollReveal>

        {/* =================================================
            PRODUCT LOADING
        ================================================== */}

        {loadingProducts ? (

          <div
            id="shop-products"
            className="shop-loading-section"
          >
            <div className="shop-loading-spinner"></div>

            <p>
              Loading MAAMTA collection...
            </p>
          </div>

        ) : products.length > 0 ? (

          <>

            {/* PRODUCT GRID */}

            <div
              id="shop-products"
              className="shop-products-grid"
            >

              {products.map((product, index) => {

                const productImages =
                  getProductImages(product);

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
                            src={optimizeImage(mainImage)}
                            alt={product.name || "MAMTA product"}
                            loading={index < 4 ? "eager" : "lazy"}
                            fetchPriority={
                              index < 4 ? "high" : "auto"
                            }
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.onerror = null;

                              e.currentTarget.src =
                                "https://placehold.co/700x700/F4D9DC/4A3032?text=MAMTA";
                            }}
                          />

                          {hoverImage && (
                            <img
                              className="product-hover-image"
                              src={optimizeImage(hoverImage)}
                              alt={`${product.name} alternate view`}
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          )}

                        </Link>

                        {/* WISHLIST BUTTON */}

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

                        {/* VIEW PRODUCT OVERLAY */}

                        <Link
                          to={`/product/${product._id}`}
                          className="product-image-overlay"
                          aria-label={`View ${product.name}`}
                        >
                          <span>
                            View Product
                          </span>
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
                              <Link
                                to={`/product/${product._id}`}
                              >
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
                                navigate(
                                  `/product/${product._id}`
                                )
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

            {/* LOAD MORE BUTTON */}

            {pagination.hasNextPage && (

              <div className="shop-load-more">

                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >

                  {loadingMore
                    ? "Loading..."
                    : "Load More Products"}

                  {!loadingMore && (
                    <ArrowUpRight size={17} />
                  )}

                </button>

              </div>

            )}

            {/* PRODUCT COUNT */}

            {products.length > 0 && (
              <p className="shop-products-count">
                Showing {products.length} of{" "}
                {pagination.totalProducts} products
              </p>
            )}

          </>

        ) : (

          /* NO PRODUCTS */

          <ScrollReveal direction="up">

            <div className="no-products">

              <div className="no-products-icon">
                <Search size={25} />
              </div>

              <h3>
                No products found
              </h3>

              <p>
                Try another search or choose a different
                category.
              </p>

              <button
                type="button"
                onClick={resetFilters}
              >
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
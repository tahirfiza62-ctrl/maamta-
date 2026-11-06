import { useEffect, useState } from "react";
import axios from "axios";

import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Check,
  ImagePlus,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import "./EditProduct.css";

/* =========================================================
   API CONFIG
   Same base URL as AdminProducts and AddProduct.
   Vite:  VITE_API_URL in .env (e.g. http://localhost:5000/api)
   CRA:   use process.env.REACT_APP_API_URL instead.
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || "https://maamta.onrender.com/api";

const PRODUCTS_URL = `${API_BASE}/admin/products`;

const TOKEN_KEY = "mamta_admin_token";
const USER_KEY = "mamta_admin_user";

const MAX_EXTRA_IMAGES = 4;

/* =========================================================
   ALLOWED CATEGORIES
========================================================= */

const ALLOWED_CATEGORIES = [
  "Maternity Pillows",
  "Baby Pillows",
  "Nursing Products",
  "Elders Pillows",
  "Accessories",
];

/* Maps old / legacy category names to the current ones */
const CATEGORY_MAP = {
  "newborn & kids": "Nursing Products",
  "nursing product": "Nursing Products",
  "nursing pillow": "Nursing Products",
  "nursing pillows": "Nursing Products",
  "nursing products": "Nursing Products",
  "maternity pillows": "Maternity Pillows",
  "baby pillows": "Baby Pillows",
  "elders pillows": "Elders Pillows",
  accessories: "Accessories",
};

const normalizeCategory = (category) => {
  const value = String(category || "").trim();

  return CATEGORY_MAP[value.toLowerCase()] || value;
};

/* =========================================================
   ALL AVAILABLE PRODUCT COLORS
========================================================= */

const AVAILABLE_COLORS = [
  { name: "Pink", value: "pink", hex: "#F4A6B8" },
  { name: "Blush Pink", value: "blush-pink", hex: "#E8A0A8" },
  { name: "Dusty Rose", value: "dusty-rose", hex: "#C98B91" },
  { name: "Rose", value: "rose", hex: "#D96C7B" },
  { name: "Mauve", value: "mauve", hex: "#B7848C" },
  { name: "Lavender", value: "lavender", hex: "#B8A1D9" },
  { name: "Purple", value: "purple", hex: "#8B5CF6" },
  { name: "Lilac", value: "lilac", hex: "#C8A2E8" },
  { name: "Blue", value: "blue", hex: "#6FA8DC" },
  { name: "Baby Blue", value: "baby-blue", hex: "#A7D8F0" },
  { name: "Sky Blue", value: "sky-blue", hex: "#87CEEB" },
  { name: "Navy Blue", value: "navy-blue", hex: "#243B53" },
  { name: "Royal Blue", value: "royal-blue", hex: "#4169E1" },
  { name: "Teal", value: "teal", hex: "#4DB6AC" },
  { name: "Mint", value: "mint", hex: "#A8D5BA" },
  { name: "Green", value: "green", hex: "#6FAF7B" },
  { name: "Sage Green", value: "sage-green", hex: "#A3B18A" },
  { name: "Olive", value: "olive", hex: "#808000" },
  { name: "Cream", value: "cream", hex: "#FFF1D0" },
  { name: "Ivory", value: "ivory", hex: "#FFFFF0" },
  { name: "White", value: "white", hex: "#FFFFFF" },
  { name: "Off White", value: "off-white", hex: "#F8F5F0" },
  { name: "Beige", value: "beige", hex: "#D8C3A5" },
  { name: "Nude", value: "nude", hex: "#D8A98B" },
  { name: "Camel", value: "camel", hex: "#C19A6B" },
  { name: "Brown", value: "brown", hex: "#8B5E3C" },
  { name: "Chocolate", value: "chocolate", hex: "#5C4033" },
  { name: "Grey", value: "grey", hex: "#9E9E9E" },
  { name: "Light Grey", value: "light-grey", hex: "#D3D3D3" },
  { name: "Charcoal", value: "charcoal", hex: "#36454F" },
  { name: "Black", value: "black", hex: "#111111" },
  { name: "Yellow", value: "yellow", hex: "#F4D35E" },
  { name: "Mustard", value: "mustard", hex: "#D4A017" },
  { name: "Orange", value: "orange", hex: "#F28C28" },
  { name: "Peach", value: "peach", hex: "#FFCBA4" },
  { name: "Coral", value: "coral", hex: "#FF7F7F" },
  { name: "Red", value: "red", hex: "#D71920" },
  { name: "Maroon", value: "maroon", hex: "#800000" },
  { name: "Wine", value: "wine", hex: "#722F37" },
  { name: "Burgundy", value: "burgundy", hex: "#800020" },
  { name: "Turquoise", value: "turquoise", hex: "#40E0D0" },
  { name: "Sea Green", value: "sea-green", hex: "#2E8B57" },
  { name: "Peacock Blue", value: "peacock-blue", hex: "#007C91" },
  { name: "Denim", value: "denim", hex: "#1560BD" },
  { name: "Terracotta", value: "terracotta", hex: "#C76B4A" },
  { name: "Khaki", value: "khaki", hex: "#C3B091" },
];

/* =========================================================
   HELPERS
========================================================= */

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/* Preview images: dim on error, restore when a new URL loads */
const dimOnError = (e) => {
  e.currentTarget.style.opacity = "0.3";
};

const restoreOnLoad = (e) => {
  e.currentTarget.style.opacity = "";
};

const findAvailableColor = (value) => {
  if (!value) {
    return null;
  }

  return (
    AVAILABLE_COLORS.find((color) => color.value === value) ||
    AVAILABLE_COLORS.find(
      (color) => color.name.toLowerCase() === String(value).toLowerCase()
    ) ||
    null
  );
};

/* Supports old string colors and new color objects */
const normalizeColor = (color) => {
  if (color && typeof color === "object") {
    const available = findAvailableColor(color.value || color.name);

    return {
      name: color.name || available?.name || "",
      value: color.value || available?.value || "",
      code: color.code || color.hex || available?.hex || "#CCCCCC",
      image: color.image || "",
    };
  }

  const available = findAvailableColor(color);

  if (available) {
    return {
      name: available.name,
      value: available.value,
      code: available.hex,
      image: "",
    };
  }

  return null;
};

/* Supports: string, { url }, { image }, { src } */
const normalizeImages = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return [
    ...new Set(
      images
        .map((image) => {
          if (typeof image === "string") {
            return image;
          }

          if (typeof image === "object" && image !== null) {
            return image.url || image.image || image.src || "";
          }

          return "";
        })
        .map((image) => (typeof image === "string" ? image.trim() : ""))
        .filter(Boolean)
    ),
  ].slice(0, MAX_EXTRA_IMAGES);
};

/* =========================================================
   EDIT PRODUCT
========================================================= */

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    oldPrice: "",
    category: "",
    image: "",
    images: [],
    stock: "",
    active: true,
    colors: [],
  });

  /* =======================================================
     AUTH FAILURE
  ======================================================= */

  const handleAuthError = (err) => {
    const status = err.response?.status;

    if (status === 401 || status === 403) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      navigate("/admin");
      return true;
    }

    return false;
  };

  /* =======================================================
     GET PRODUCT
     GET /api/admin/products/:id
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");
        setLoadFailed(false);

        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
          navigate("/admin");
          return;
        }

        const response = await axios.get(`${PRODUCTS_URL}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) {
          return;
        }

        const product = response.data?.product;

        if (!product) {
          setError("Product not found.");
          setLoadFailed(true);
          return;
        }

        const normalizedColors = Array.isArray(product.colors)
          ? product.colors.map(normalizeColor).filter(Boolean)
          : [];

        setFormData({
          name: product.name || "",
          description: product.description || "",
          price: product.price ?? "",
          oldPrice: product.oldPrice ?? "",
          category: normalizeCategory(product.category),
          image: product.image || "",
          images: normalizeImages(product.images),
          stock: product.stock ?? "",
          active: product.active !== false,
          colors: normalizedColors,
        });

        setFeatures(
          Array.isArray(product.features) ? product.features : []
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("GET PRODUCT ERROR:", err);

        if (handleAuthError(err)) {
          return;
        }

        setLoadFailed(true);

        setError(
          err.response?.data?.message ||
            (err.request && !err.response
              ? "Cannot reach the server. If it was idle, wait a minute and reload."
              : "Failed to load product.")
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  /* =======================================================
     INPUT CHANGE
  ======================================================= */

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* =======================================================
     ADDITIONAL IMAGES
  ======================================================= */

  const addImage = () => {
    if (formData.images.length >= MAX_EXTRA_IMAGES) {
      setError(
        `You can add a maximum of ${MAX_EXTRA_IMAGES} additional images.`
      );
      return;
    }

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ""],
    }));

    setError("");
  };

  const updateImage = (index, value) => {
    setFormData((prev) => {
      const updatedImages = [...prev.images];
      updatedImages[index] = value;

      return { ...prev, images: updatedImages };
    });
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  /* =======================================================
     COLORS
  ======================================================= */

  const toggleColor = (color) => {
    setFormData((prev) => {
      const alreadySelected = prev.colors.some(
        (item) => item.value === color.value
      );

      if (alreadySelected) {
        return {
          ...prev,
          colors: prev.colors.filter((item) => item.value !== color.value),
        };
      }

      return {
        ...prev,
        colors: [
          ...prev.colors,
          {
            name: color.name,
            value: color.value,
            code: color.hex,
            image: "",
          },
        ],
      };
    });
  };

  const updateColorImage = (colorValue, imageValue) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.map((color) =>
        color.value === colorValue
          ? { ...color, image: imageValue }
          : color
      ),
    }));
  };

  const removeColor = (colorValue) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((color) => color.value !== colorValue),
    }));
  };

  /* =======================================================
     FEATURES
  ======================================================= */

  const addFeature = () => {
    const value = featureInput.trim();

    if (!value) {
      return;
    }

    const exists = features.some(
      (feature) => String(feature).trim().toLowerCase() === value.toLowerCase()
    );

    if (exists) {
      setError("This feature has already been added.");
      return;
    }

    setFeatures((prev) => [...prev, value]);
    setFeatureInput("");
    setError("");
  };

  const removeFeature = (index) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  /* =======================================================
     VALIDATION
     Returns an error message, or "" when the form is valid.
  ======================================================= */

  const validateForm = (cleanedImages) => {
    if (!formData.name.trim()) {
      return "Product name is required.";
    }

    if (!ALLOWED_CATEGORIES.includes(formData.category.trim())) {
      return "Please select a valid product category.";
    }

    if (
      formData.price === "" ||
      !Number.isFinite(Number(formData.price)) ||
      Number(formData.price) < 0
    ) {
      return "Enter a valid price.";
    }

    if (formData.oldPrice !== "" && formData.oldPrice !== null) {
      if (
        !Number.isFinite(Number(formData.oldPrice)) ||
        Number(formData.oldPrice) < 0
      ) {
        return "Old price must be a valid number.";
      }

      if (Number(formData.oldPrice) <= Number(formData.price)) {
        return "Old price should be higher than the current price.";
      }
    }

    if (
      formData.stock !== "" &&
      (!Number.isFinite(Number(formData.stock)) ||
        Number(formData.stock) < 0)
    ) {
      return "Stock must be a valid number (0 or more).";
    }

    const mainImage = formData.image.trim();

    if (mainImage && !isValidUrl(mainImage)) {
      return "Main image URL must start with http:// or https://";
    }

    for (const url of cleanedImages) {
      if (!isValidUrl(url)) {
        return "Additional image URLs must start with http:// or https://";
      }
    }

    for (const color of formData.colors) {
      const colorImage = (color.image || "").trim();

      if (!colorImage && !mainImage) {
        return `Please add an image for ${color.name}.`;
      }

      if (colorImage && !isValidUrl(colorImage)) {
        return `The image URL for ${color.name} must start with http:// or https://`;
      }
    }

    return "";
  };

  /* =======================================================
     SUBMIT
     PUT /api/admin/products/:id
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    const cleanedImages = [
      ...new Set(
        formData.images
          .map((image) => (typeof image === "string" ? image.trim() : ""))
          .filter(Boolean)
      ),
    ].slice(0, MAX_EXTRA_IMAGES);

    const validationError = validateForm(cleanedImages);

    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      navigate("/admin");
      return;
    }

    try {
      setSaving(true);

      const mainImage = formData.image.trim();

      /* A color without its own image falls back to the main image */
      const cleanedColors = formData.colors.map((color) => ({
        name: color.name,
        value: color.value,
        code: color.code,
        image: (color.image || "").trim() || mainImage,
      }));

      const data = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        oldPrice:
          formData.oldPrice === "" || formData.oldPrice === null
            ? null
            : Number(formData.oldPrice),
        category: formData.category.trim(),
        image: mainImage,
        images: cleanedImages,
        stock: formData.stock === "" ? 0 : Number(formData.stock),
        active: formData.active,
        features: features
          .map((feature) => String(feature).trim())
          .filter(Boolean),
        colors: cleanedColors,
      };

      await axios.put(`${PRODUCTS_URL}/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/admin/products");
    } catch (err) {
      console.error("UPDATE PRODUCT ERROR:", err);

      if (handleAuthError(err)) {
        return;
      }

      setError(
        err.response?.data?.message ||
          (err.request && !err.response
            ? "Cannot reach the server. Please try again."
            : "Failed to update product.")
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="add-product-page">
        <div className="add-product-loading">Loading product...</div>
      </div>
    );
  }

  /* =======================================================
     LOAD ERROR
  ======================================================= */

  if (loadFailed) {
    return (
      <div className="add-product-page">
        <div className="add-product-error">{error}</div>

        <button
          className="add-product-back-btn"
          onClick={() => navigate("/admin/products")}
        >
          <ArrowLeft size={18} />
          Back to Products
        </button>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  const imagesFull = formData.images.length >= MAX_EXTRA_IMAGES;

  return (
    <div className="add-product-page">
      {/* TOP */}

      <div className="add-product-top">
        <button
          className="add-product-back-btn"
          type="button"
          onClick={() => navigate("/admin/products")}
        >
          <ArrowLeft size={18} />
          Back to Products
        </button>

        <div>
          <p className="add-product-eyebrow">MAMTA ADMIN</p>
          <h1>Edit Product</h1>
          <p>Update product information</p>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="add-product-error" role="alert">
          {error}
        </div>
      )}

      {/* FORM */}

      <form className="add-product-form" onSubmit={handleSubmit}>
        {/* BASIC INFORMATION */}

        <section className="add-product-card">
          <div className="add-product-card-heading">
            <div>
              <h2>Basic Information</h2>
              <p>Update the main product details.</p>
            </div>
          </div>

          <div className="add-product-field">
            <label htmlFor="edit-name">Product Name</label>

            <input
              id="edit-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="add-product-field">
            <label htmlFor="edit-description">Description</label>

            <textarea
              id="edit-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter product description"
              rows="5"
            />
          </div>

          <div className="add-product-field">
            <label htmlFor="edit-category">Category</label>

            <select
              id="edit-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select category</option>

              {ALLOWED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* PRICING & STOCK */}

        <section className="add-product-card">
          <div className="add-product-card-heading">
            <div>
              <h2>Pricing & Stock</h2>
              <p>Update pricing and inventory.</p>
            </div>
          </div>

          <div className="add-product-grid">
            <div className="add-product-field">
              <label htmlFor="edit-price">Current Price</label>

              <input
                id="edit-price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="any"
                required
              />
            </div>

            <div className="add-product-field">
              <label htmlFor="edit-old-price">Old Price</label>

              <input
                id="edit-old-price"
                type="number"
                name="oldPrice"
                value={formData.oldPrice}
                onChange={handleChange}
                min="0"
                step="any"
                placeholder="Optional"
              />
            </div>

            <div className="add-product-field">
              <label htmlFor="edit-stock">Stock</label>

              <input
                id="edit-stock"
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                step="1"
              />
            </div>
          </div>
        </section>

        {/* PRODUCT IMAGES */}

        <section className="add-product-card">
          <div className="add-product-card-heading">
            <div>
              <h2>Product Images</h2>

              <p>
                The main image is used as the primary product image.
                Additional images appear in the product gallery and on
                hover in the shop.
              </p>
            </div>
          </div>

          {/* MAIN IMAGE */}

          <div className="add-product-field">
            <label htmlFor="edit-main-image">Main Image URL</label>

            <input
              id="edit-main-image"
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/main-image.jpg"
            />
          </div>

          {formData.image && (
            <div className="add-product-image-preview">
              <img
                src={formData.image}
                alt={formData.name}
                onError={dimOnError}
                onLoad={restoreOnLoad}
              />
            </div>
          )}

          {/* ADDITIONAL IMAGES */}

          <div className="additional-images-section">
            <div className="additional-images-header">
              <div>
                <h3>Additional Images</h3>
                <p>Add up to {MAX_EXTRA_IMAGES} additional product images.</p>
              </div>

              <button
                type="button"
                className="add-additional-image-btn"
                onClick={addImage}
                disabled={imagesFull}
              >
                <Plus size={16} />
                Add Image
              </button>
            </div>

            {formData.images.length === 0 && (
              <div className="additional-images-empty">
                <ImagePlus size={24} />
                <span>No additional images added yet.</span>
              </div>
            )}

            {formData.images.map((image, index) => (
              <div
                className="additional-image-row"
                key={`additional-image-${index}`}
              >
                <div className="additional-image-input">
                  <label htmlFor={`additional-image-${index}`}>
                    Additional Image {index + 1}
                  </label>

                  <input
                    id={`additional-image-${index}`}
                    type="text"
                    value={image}
                    onChange={(e) => updateImage(index, e.target.value)}
                    placeholder="https://example.com/additional-image.jpg"
                  />
                </div>

                {image && (
                  <div className="additional-image-preview">
                    <img
                      src={image}
                      alt={`${formData.name} additional ${index + 1}`}
                      onError={dimOnError}
                      onLoad={restoreOnLoad}
                    />
                  </div>
                )}

                <button
                  type="button"
                  className="remove-additional-image-btn"
                  onClick={() => removeImage(index)}
                  title="Remove image"
                  aria-label={`Remove additional image ${index + 1}`}
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* AVAILABLE COLORS */}

        <section className="add-product-card">
          <div className="add-product-card-heading">
            <div>
              <h2>Available Colors</h2>
              <p>Select the colors available for this product.</p>
            </div>
          </div>

          <div className="admin-color-grid">
            {AVAILABLE_COLORS.map((color) => {
              const selected = formData.colors.some(
                (item) => item.value === color.value
              );

              return (
                <button
                  key={color.value}
                  type="button"
                  className={`admin-color-option ${
                    selected ? "selected" : ""
                  }`}
                  aria-pressed={selected}
                  onClick={() => toggleColor(color)}
                >
                  <span className="admin-color-checkbox">
                    {selected && <Check size={14} />}
                  </span>

                  <span
                    className="admin-color-circle"
                    style={{ backgroundColor: color.hex }}
                  />

                  <span className="admin-color-name">{color.name}</span>
                </button>
              );
            })}
          </div>

          {/* COLOR IMAGES */}

          {formData.colors.length > 0 && (
            <div className="admin-color-images-container">
              <div className="admin-color-images-heading">
                <h3>Color Images</h3>

                <p>
                  Add one product image for each selected color. If you
                  leave it empty, the main image is used.
                </p>
              </div>

              {formData.colors.map((color) => (
                <div className="admin-color-image-row" key={color.value}>
                  <div className="admin-color-image-color">
                    <span
                      className="admin-color-circle"
                      style={{ backgroundColor: color.code }}
                    />

                    <strong>{color.name}</strong>
                  </div>

                  <div className="admin-color-image-input">
                    <div className="admin-color-image-input-top">
                      <ImagePlus size={17} />
                      <span>{color.name} Image</span>
                    </div>

                    <input
                      type="text"
                      value={color.image}
                      onChange={(e) =>
                        updateColorImage(color.value, e.target.value)
                      }
                      placeholder={`Enter ${color.name} product image URL`}
                      aria-label={`${color.name} image URL`}
                    />
                  </div>

                  <div
                    className="admin-color-single-preview"
                    style={{ display: color.image ? "block" : "none" }}
                  >
                    {color.image && (
                      <img
                        src={color.image}
                        alt={`${color.name} product`}
                        onError={dimOnError}
                        onLoad={restoreOnLoad}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    className="admin-remove-color-btn"
                    onClick={() => removeColor(color.value)}
                    title={`Remove ${color.name}`}
                    aria-label={`Remove ${color.name}`}
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SELECTED COLOR TAGS */}

          {formData.colors.length > 0 && (
            <div className="admin-selected-colors">
              <span className="admin-selected-label">Selected Colors</span>

              {formData.colors.map((color) => (
                <span className="admin-selected-color-tag" key={color.value}>
                  <span
                    className="admin-selected-color-dot"
                    style={{ backgroundColor: color.code }}
                  />

                  {color.name}

                  <button
                    type="button"
                    onClick={() => removeColor(color.value)}
                    title={`Remove ${color.name}`}
                    aria-label={`Remove ${color.name}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* FEATURES */}

        <section className="add-product-card">
          <div className="add-product-card-heading">
            <div>
              <h2>Product Features</h2>
              <p>Add important product features.</p>
            </div>
          </div>

          <div className="add-product-feature-input">
            <input
              type="text"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              placeholder="Enter a feature"
              aria-label="Product feature"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeature();
                }
              }}
            />

            <button type="button" onClick={addFeature}>
              <Plus size={17} />
              Add
            </button>
          </div>

          {features.length > 0 && (
            <div className="add-product-features">
              {features.map((feature, index) => (
                <div
                  className="add-product-feature"
                  key={`${feature}-${index}`}
                >
                  <span>{feature}</span>

                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    aria-label={`Remove ${feature}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* STATUS */}

        <section className="add-product-card">
          <div className="add-product-status">
            <div>
              <h3>Product Status</h3>
              <p>Active products are visible on the customer website.</p>
            </div>

            <label className="add-product-switch">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />

              <span></span>
            </label>
          </div>
        </section>

        {/* ACTIONS */}

        <div className="add-product-actions">
          <button
            type="button"
            className="add-product-cancel"
            onClick={() => navigate("/admin/products")}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="add-product-submit"
            disabled={saving}
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
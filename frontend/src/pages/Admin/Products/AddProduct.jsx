import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ImagePlus,
  Plus,
  X,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./AddProduct.css";

/* =========================================================
   API CONFIG
   Same base URL as AdminProducts so both pages always talk
   to the same server.
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

/* =========================================================
   AVAILABLE COLORS
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

const createColorObject = (color) => ({
  name: color.name,
  value: color.value,
  code: color.hex,
  image: "",
  useMainImage: true,
});

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/* Preview images: hide on error, show again when a new URL loads */
const hideOnError = (e) => {
  e.currentTarget.style.display = "none";
};

const showOnLoad = (e) => {
  e.currentTarget.style.display = "";
};

/* =========================================================
   ADD PRODUCT
========================================================= */

const AddProduct = () => {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    oldPrice: "",
    category: "",
    image: "",
    images: [],
    stock: "",
    active: true,
    features: [],
    colors: [],
  });

  const [feature, setFeature] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Clear the redirect timer if the page is left early */
  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  /* =========================================================
     HANDLE INPUT CHANGE
  ========================================================= */

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* =========================================================
     COLORS
  ========================================================= */

  const toggleColor = (color) => {
    setForm((prev) => {
      const alreadySelected = prev.colors.some(
        (item) => item.value === color.value
      );

      if (alreadySelected) {
        return {
          ...prev,
          colors: prev.colors.filter(
            (item) => item.value !== color.value
          ),
        };
      }

      return {
        ...prev,
        colors: [...prev.colors, createColorObject(color)],
      };
    });
  };

  const toggleUseMainImage = (colorValue) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.map((color) =>
        color.value === colorValue
          ? { ...color, useMainImage: !color.useMainImage }
          : color
      ),
    }));
  };

  const updateColorImage = (colorValue, imageValue) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.map((color) =>
        color.value === colorValue
          ? { ...color, image: imageValue, useMainImage: false }
          : color
      ),
    }));
  };

  const removeColor = (colorValue) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.filter((color) => color.value !== colorValue),
    }));
  };

  /* =========================================================
     FEATURES
  ========================================================= */

  const addFeature = () => {
    const value = feature.trim();

    if (!value) {
      return;
    }

    if (form.features.includes(value)) {
      setError("This feature has already been added.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      features: [...prev.features, value],
    }));

    setFeature("");
    setError("");
  };

  const removeFeature = (index) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  /* =========================================================
     ADDITIONAL IMAGES
  ========================================================= */

  const addImage = () => {
    const value = imageUrl.trim();

    if (!value) {
      setError("Please enter an image URL.");
      return;
    }

    if (!isValidUrl(value)) {
      setError("Image URL must start with http:// or https://");
      return;
    }

    if (form.images.length >= MAX_EXTRA_IMAGES) {
      setError(
        `You can add up to ${MAX_EXTRA_IMAGES} additional images.`
      );
      return;
    }

    if (form.images.includes(value)) {
      setError("This image has already been added.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, value],
    }));

    setImageUrl("");
    setError("");
  };

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  /* =========================================================
     VALIDATION
     Returns an error message, or "" when the form is valid.
  ========================================================= */

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Product name is required.";
    }

    if (!ALLOWED_CATEGORIES.includes(form.category.trim())) {
      return "Please select a valid product category.";
    }

    if (
      form.price === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      return "Enter a valid price.";
    }

    if (form.oldPrice !== "") {
      if (
        !Number.isFinite(Number(form.oldPrice)) ||
        Number(form.oldPrice) < 0
      ) {
        return "Old price must be a valid number.";
      }

      if (Number(form.oldPrice) <= Number(form.price)) {
        return "Old price should be higher than the current price.";
      }
    }

    if (
      form.stock !== "" &&
      (!Number.isFinite(Number(form.stock)) || Number(form.stock) < 0)
    ) {
      return "Stock must be a valid number (0 or more).";
    }

    if (form.image.trim() && !isValidUrl(form.image.trim())) {
      return "Main image URL must start with http:// or https://";
    }

    for (const color of form.colors) {
      if (color.useMainImage) {
        if (!form.image.trim()) {
          return `Please add a main product image for ${color.name}.`;
        }
      } else {
        const colorImage = (color.image || "").trim();

        if (!colorImage) {
          return `Please add an image for ${color.name}.`;
        }

        if (!isValidUrl(colorImage)) {
          return `The image URL for ${color.name} must start with http:// or https://`;
        }
      }
    }

    return "";
  };

  /* =========================================================
     SUBMIT PRODUCT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      navigate("/admin");
      return;
    }

    try {
      setLoading(true);

      const mainImage = form.image.trim();

      /* Colors: resolve "use main image" into a real URL.
         useMainImage is UI-only and is not sent to the server. */

      const cleanedColors = form.colors.map((color) => ({
        name: color.name,
        value: color.value,
        code: color.code,
        image: color.useMainImage ? mainImage : color.image.trim(),
      }));

      const cleanedImages = [
        ...new Set(
          form.images
            .map((image) =>
              typeof image === "string" ? image.trim() : ""
            )
            .filter(Boolean)
        ),
      ].slice(0, MAX_EXTRA_IMAGES);

      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        oldPrice: form.oldPrice === "" ? null : Number(form.oldPrice),

        /* Exact category selected in the dropdown */
        category: form.category.trim(),

        image: mainImage,
        images: cleanedImages,
        stock: form.stock === "" ? 0 : Number(form.stock),
        active: form.active,
        features: form.features,
        colors: cleanedColors,
      };

      await axios.post(PRODUCTS_URL, productData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess("Product added successfully.");

      redirectTimer.current = setTimeout(() => {
        navigate("/admin/products");
      }, 800);
    } catch (err) {
      console.error("ADD PRODUCT ERROR:", err);

      const status = err.response?.status;

      if (status === 401 || status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        navigate("/admin");
        return;
      }

      if (err.request && !err.response) {
        setError(
          "Cannot reach the server. If it was idle, wait a minute and try again."
        );
      } else {
        setError(err.response?.data?.message || "Unable to add product.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     JSX
  ========================================================= */

  const imagesFull = form.images.length >= MAX_EXTRA_IMAGES;

  return (
    <section className="admin-add-product-page">
      <div className="admin-add-product-header">
        <button
          type="button"
          className="admin-back-button"
          onClick={() => navigate("/admin/products")}
        >
          <ArrowLeft size={18} />
          Back to Products
        </button>

        <div>
          <p className="admin-page-label">PRODUCT MANAGEMENT</p>

          <h1>Add New Product</h1>

          <p className="admin-page-description">
            Add a new product to the MAMTA store.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="admin-product-alert admin-product-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="admin-product-alert admin-product-success"
          role="status"
        >
          <Check size={18} />
          {success}
        </div>
      )}

      <form className="admin-add-product-form" onSubmit={handleSubmit}>
        {/* BASIC INFORMATION */}

        <div className="admin-product-card">
          <div className="admin-card-heading">
            <div>
              <span className="admin-card-eyebrow">BASIC INFORMATION</span>

              <h2>Product Details</h2>

              <p>Enter the main information about your product.</p>
            </div>
          </div>

          <div className="admin-form-group">
            <label htmlFor="product-name">
              Product Name <span>*</span>
            </label>

            <input
              id="product-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="product-description">Description</label>

            <textarea
              id="product-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Enter product description"
              rows="5"
            />
          </div>

          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label htmlFor="product-price">
                Price <span>*</span>
              </label>

              <input
                id="product-price"
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="any"
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="product-old-price">Old Price</label>

              <input
                id="product-old-price"
                type="number"
                name="oldPrice"
                value={form.oldPrice}
                onChange={handleChange}
                placeholder="Optional"
                min="0"
                step="any"
              />
            </div>
          </div>

          {/* CATEGORY DROPDOWN */}

          <div className="admin-form-group">
            <label htmlFor="product-category">
              Category <span>*</span>
            </label>

            <select
              id="product-category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>

              {ALLOWED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="product-stock">Stock</label>

            <input
              id="product-stock"
              type="number"
              name="stock"
              value={form.stock}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="1"
            />
          </div>

          <div className="admin-active-row">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
              />

              <span className="admin-custom-checkbox">
                {form.active && <Check size={14} />}
              </span>

              <span>Product is active</span>
            </label>
          </div>
        </div>

        {/* MAIN IMAGE */}

        <div className="admin-product-card">
          <div className="admin-card-heading">
            <div>
              <span className="admin-card-eyebrow">PRODUCT IMAGE</span>

              <h2>Main Product Image</h2>

              <p>Add the primary image for this product.</p>
            </div>
          </div>

          <div className="admin-form-group">
            <label htmlFor="product-main-image">Main Image URL</label>

            <input
              id="product-main-image"
              type="text"
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://example.com/product-image.jpg"
            />
          </div>

          {form.image && (
            <div className="admin-main-image-preview">
              <img
                src={form.image}
                alt={form.name || "Product"}
                onError={hideOnError}
                onLoad={showOnLoad}
              />
            </div>
          )}
        </div>

        {/* ADDITIONAL IMAGES */}

        <div className="admin-product-card">
          <div className="admin-card-heading">
            <div>
              <span className="admin-card-eyebrow">PRODUCT GALLERY</span>

              <h2>Additional Images</h2>

              <p>
                Add up to {MAX_EXTRA_IMAGES} additional images. These
                images become the automatic product gallery on
                ProductDetails.
              </p>
            </div>

            <div className="admin-selected-count">
              {form.images.length} / {MAX_EXTRA_IMAGES}
            </div>
          </div>

          <div className="admin-add-input-row">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addImage();
                }
              }}
              placeholder="Paste image URL"
              aria-label="Additional image URL"
              disabled={imagesFull}
            />

            <button
              type="button"
              className="admin-add-small-button"
              onClick={addImage}
              disabled={imagesFull}
            >
              <Plus size={18} />

              {imagesFull ? "Maximum" : "Add"}
            </button>
          </div>

          {form.images.length > 0 && (
            <div className="admin-image-list">
              {form.images.map((image, index) => (
                <div
                  className="admin-image-item"
                  key={`${image}-${index}`}
                >
                  <div className="admin-image-preview">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      onError={hideOnError}
                      onLoad={showOnLoad}
                    />
                  </div>

                  <div className="admin-image-url">
                    <span>Image {index + 1}</span>
                    {image}
                  </div>

                  <button
                    type="button"
                    className="admin-remove-button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FEATURES */}

        <div className="admin-product-card">
          <div className="admin-card-heading">
            <div>
              <span className="admin-card-eyebrow">PRODUCT FEATURES</span>

              <h2>Features</h2>

              <p>Add important features of this product.</p>
            </div>
          </div>

          <div className="admin-add-input-row">
            <input
              type="text"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeature();
                }
              }}
              placeholder="e.g. Soft memory foam"
              aria-label="Product feature"
            />

            <button
              type="button"
              className="admin-add-small-button"
              onClick={addFeature}
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {form.features.length > 0 && (
            <div className="admin-feature-list">
              {form.features.map((item, index) => (
                <div
                  className="admin-feature-item"
                  key={`${item}-${index}`}
                >
                  <div className="admin-feature-check">
                    <Check size={15} />
                  </div>

                  <span>{item}</span>

                  <button
                    type="button"
                    className="admin-remove-button"
                    onClick={() => removeFeature(index)}
                    aria-label={`Remove ${item}`}
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLORS */}

        <div className="admin-product-card">
          <div className="admin-card-heading">
            <div>
              <span className="admin-card-eyebrow">PRODUCT COLORS</span>

              <h2>Available Colors</h2>

              <p>
                Select the colors available for this product. Use the
                main image or add a separate image for each color.
              </p>
            </div>

            <div className="admin-selected-count">
              {form.colors.length} selected
            </div>
          </div>

          <div className="admin-color-grid">
            {AVAILABLE_COLORS.map((color) => {
              const selected = form.colors.some(
                (item) => item.value === color.value
              );

              return (
                <button
                  type="button"
                  key={color.value}
                  className={`admin-color-option ${
                    selected ? "selected" : ""
                  }`}
                  aria-pressed={selected}
                  onClick={() => toggleColor(color)}
                >
                  <span
                    className="admin-color-swatch"
                    style={{ backgroundColor: color.hex }}
                  />

                  <span className="admin-color-name">{color.name}</span>

                  {selected && (
                    <span className="admin-color-check">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {form.colors.length > 0 && (
            <div className="admin-selected-colors">
              <div className="admin-selected-colors-title">
                Selected Colors
              </div>

              {form.colors.map((color) => (
                <div
                  className="admin-selected-color-card"
                  key={color.value}
                >
                  <div className="admin-selected-color-header">
                    <div className="admin-selected-color-info">
                      <span
                        className="admin-color-swatch"
                        style={{ backgroundColor: color.code }}
                      />

                      <div>
                        <strong>{color.name}</strong>
                        <small>{color.value}</small>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="admin-remove-color"
                      onClick={() => removeColor(color.value)}
                      aria-label={`Remove ${color.name}`}
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="admin-color-image-section">
                    <label>
                      <ImagePlus size={17} />
                      Image for {color.name}
                      <span>*</span>
                    </label>

                    <label className="admin-use-main-image">
                      <input
                        type="checkbox"
                        checked={color.useMainImage}
                        onChange={() => toggleUseMainImage(color.value)}
                      />

                      <span className="admin-custom-checkbox">
                        {color.useMainImage && <Check size={14} />}
                      </span>

                      <span>Use Main Product Image</span>
                    </label>

                    {!color.useMainImage && (
                      <>
                        <input
                          type="text"
                          value={color.image}
                          onChange={(e) =>
                            updateColorImage(color.value, e.target.value)
                          }
                          placeholder={`Paste ${color.name} product image URL`}
                          aria-label={`${color.name} image URL`}
                        />

                        {color.image && (
                          <div className="admin-color-image-preview">
                            <img
                              src={color.image}
                              alt={color.name}
                              onError={hideOnError}
                              onLoad={showOnLoad}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {color.useMainImage && form.image && (
                      <div className="admin-color-image-preview">
                        <img
                          src={form.image}
                          alt={`${color.name} product`}
                          onError={hideOnError}
                          onLoad={showOnLoad}
                        />

                        <span className="admin-main-image-used">
                          <Check size={14} />
                          Using main product image
                        </span>
                      </div>
                    )}

                    {color.useMainImage && !form.image && (
                      <div className="admin-color-image-warning">
                        <ImagePlus size={16} />
                        Add the main product image above to use it for
                        this color.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FORM ACTIONS */}

        <div className="admin-product-form-actions">
          <button
            type="button"
            className="admin-cancel-button"
            onClick={() => navigate("/admin/products")}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="admin-save-product-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="admin-button-spinner" />
                Adding Product...
              </>
            ) : (
              <>
                <Check size={18} />
                Add Product
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};

export default AddProduct;
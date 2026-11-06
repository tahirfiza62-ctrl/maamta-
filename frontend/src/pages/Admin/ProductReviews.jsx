import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Star,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  Clock3,
  Package,
  Save,
} from "lucide-react";
import "./ProductReviews.css";

/* =========================================================
   API CONFIGURATION
   Same base URL as the other admin pages.
   Vite:  VITE_API_URL in .env (e.g. http://localhost:5000/api)
   CRA:   use process.env.REACT_APP_API_URL instead.

   NOTE: the list endpoint below is GET /api/admin/reviews/all,
   matching the products router (/all before /:id). The old code
   called /admin/reviews/admin/all. Confirm which path your
   backend router really defines and change LIST_URL if needed.
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || "https://maamta.onrender.com/api";

const REVIEWS_URL = `${API_BASE}/admin/reviews`;
const LIST_URL = `${REVIEWS_URL}/all`;

const TOKEN_KEY = "mamta_admin_token";
const USER_KEY = "mamta_admin_user";
const REQUEST_TIMEOUT = 15000;

/* =========================================================
   HELPERS
========================================================= */

const getAdminHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const isAuthError = (error) =>
  error.response?.status === 401 || error.response?.status === 403;

const getReviews = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getErrorMessage = (error) => {
  if (isAuthError(error)) {
    return "Admin authentication failed. Please sign in again.";
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.request && !error.response) {
    return "Cannot reach the server. If it was idle, wait a minute and try again.";
  }

  return error.message || "Something went wrong.";
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getProductName = (review) => {
  if (review.productId && typeof review.productId === "object") {
    return review.productId.name || "Product";
  }

  if (review.productId) {
    return `Product ID: ${review.productId}`;
  }

  return "General testimonial";
};

const getReviewText = (review) =>
  review.message || review.text || review.review || "";

const getReviewCity = (review) => review.city || review.place || "";

const emptyForm = {
  name: "",
  city: "",
  rating: 5,
  message: "",
  approved: true,
};

/* =========================================================
   RATING STARS
========================================================= */

function RatingStars({ rating }) {
  const numericRating = Number(rating) || 0;

  return (
    <div className="mamta-admin-review-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={15}
          fill={star <= numericRating ? "currentColor" : "none"}
        />
      ))}
      <span>{numericRating}/5</span>
    </div>
  );
}

/* =========================================================
   REVIEWS MANAGEMENT
========================================================= */

export default function Reviews() {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editingReview, setEditingReview] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  /* Prevents state updates after the page is left */
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  /* =======================================================
     AUTH FAILURE
  ======================================================= */

  const handleAuthFailure = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/admin");
  }, [navigate]);

  /* =======================================================
     FETCH REVIEWS (single source of truth)
     `isRefresh` shows the small refresh spinner. The initial
     load uses the full-page loader, which starts as true.
  ======================================================= */

  const fetchReviews = useCallback(
    async (isRefresh = false) => {
      if (!localStorage.getItem(TOKEN_KEY)) {
        navigate("/admin");
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        const response = await axios.get(LIST_URL, {
          headers: getAdminHeaders(),
          timeout: REQUEST_TIMEOUT,
        });

        if (response.data?.success === false) {
          throw new Error(response.data.message || "Unable to load reviews.");
        }

        if (mounted.current) {
          setReviews(getReviews(response.data));
          setLoadError("");
        }
      } catch (error) {
        console.error(
          "ADMIN REVIEWS ERROR:",
          error.response?.data || error.message
        );

        if (!mounted.current) {
          return;
        }

        if (isAuthError(error)) {
          handleAuthFailure();
          return;
        }

        const message = getErrorMessage(error);

        setLoadError(message);
        toast.error(message);
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [navigate, handleAuthFailure]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    fetchReviews(false);
  }, [fetchReviews]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const stats = useMemo(() => {
    const total = reviews.length;

    const approved = reviews.filter(
      (review) => review.approved !== false
    ).length;

    const pending = total - approved;

    const average = total
      ? (
          reviews.reduce(
            (sum, review) => sum + Number(review.rating || 0),
            0
          ) / total
        ).toFixed(1)
      : "0.0";

    return { total, approved, pending, average };
  }, [reviews]);

  /* =======================================================
     SEARCH AND FILTERS
  ======================================================= */

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchesSearch =
        !query ||
        [
          review.name,
          review.city,
          review.place,
          review.message,
          review.text,
          review.review,
          review.email,
          getProductName(review),
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

      const matchesRating =
        ratingFilter === "all" ||
        Number(review.rating) === Number(ratingFilter);

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "product" && Boolean(review.productId)) ||
        (typeFilter === "general" && !review.productId);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "approved" && review.approved !== false) ||
        (statusFilter === "pending" && review.approved === false);

      return matchesSearch && matchesRating && matchesType && matchesStatus;
    });
  }, [reviews, search, ratingFilter, typeFilter, statusFilter]);

  /* =======================================================
     EDIT REVIEW
  ======================================================= */

  const openEdit = (review) => {
    setEditingReview(review);

    setFormData({
      name: review.name || "",
      city: getReviewCity(review),
      rating: Number(review.rating) || 5,
      message: getReviewText(review),
      approved: review.approved !== false,
    });
  };

  const closeEdit = useCallback(() => {
    if (saving) return;

    setEditingReview(null);
    setFormData({ ...emptyForm });
  }, [saving]);

  /* Close the edit dialog with the Escape key */
  useEffect(() => {
    if (!editingReview) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeEdit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingReview, closeEdit]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =======================================================
     APPLY UPDATED REVIEW
     Uses the server's copy when it returns one; otherwise
     reloads the list.
  ======================================================= */

  const applyUpdatedReview = async (response) => {
    const updatedReview = response.data?.review;

    if (updatedReview?._id) {
      setReviews((previous) =>
        previous.map((review) =>
          review._id === updatedReview._id
            ? { ...review, ...updatedReview }
            : review
        )
      );
    } else {
      await fetchReviews(true);
    }
  };

  /* =======================================================
     SAVE REVIEW
     PUT /api/admin/reviews/:id
  ======================================================= */

  const handleSave = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!editingReview?._id) {
      toast.error("Review ID is missing.");
      return;
    }

    const name = formData.name.trim();
    const city = formData.city.trim();
    const message = formData.message.trim();
    const rating = Number(formData.rating);

    if (name.length < 2 || name.length > 50) {
      toast.error("Name must contain 2–50 characters.");
      return;
    }

    if (city.length < 2 || city.length > 50) {
      toast.error("City must contain 2–50 characters.");
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      toast.error("Please select a rating from 1 to 5.");
      return;
    }

    if (message.length < 10 || message.length > 500) {
      toast.error("Review must contain 10–500 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await axios.put(
        `${REVIEWS_URL}/${editingReview._id}`,
        {
          name,
          city,
          rating,
          message,
          approved: Boolean(formData.approved),
        },
        {
          headers: getAdminHeaders(),
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (response.data?.success === false) {
        throw new Error(response.data.message || "Unable to update review.");
      }

      await applyUpdatedReview(response);

      setEditingReview(null);
      setFormData({ ...emptyForm });
      toast.success("Review updated successfully.");
    } catch (error) {
      console.error(
        "UPDATE REVIEW ERROR:",
        error.response?.data || error.message
      );

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      toast.error(getErrorMessage(error));
    } finally {
      if (mounted.current) {
        setSaving(false);
      }
    }
  };

  /* =======================================================
     DELETE REVIEW
     DELETE /api/admin/reviews/:id
  ======================================================= */

  const handleDelete = async (review) => {
    if (!review?._id) {
      toast.error("Review ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the review from ${
        review.name || "this customer"
      }? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(review._id);

    try {
      const response = await axios.delete(`${REVIEWS_URL}/${review._id}`, {
        headers: getAdminHeaders(),
        timeout: REQUEST_TIMEOUT,
      });

      if (response.data?.success === false) {
        throw new Error(response.data.message || "Unable to delete review.");
      }

      setReviews((previous) =>
        previous.filter((item) => item._id !== review._id)
      );

      if (editingReview?._id === review._id) {
        setEditingReview(null);
        setFormData({ ...emptyForm });
      }

      toast.success("Review deleted successfully.");
    } catch (error) {
      console.error(
        "DELETE REVIEW ERROR:",
        error.response?.data || error.message
      );

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      toast.error(getErrorMessage(error));
    } finally {
      if (mounted.current) {
        setDeletingId(null);
      }
    }
  };

  /* =======================================================
     APPROVE / HIDE REVIEW
     PUT /api/admin/reviews/:id
  ======================================================= */

  const toggleApproval = async (review) => {
    if (!review?._id || togglingId) return;

    const nextApproved = review.approved === false;

    setTogglingId(review._id);

    try {
      const response = await axios.put(
        `${REVIEWS_URL}/${review._id}`,
        {
          name: review.name,
          city: getReviewCity(review),
          rating: Number(review.rating),
          message: getReviewText(review),
          approved: nextApproved,
        },
        {
          headers: getAdminHeaders(),
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Unable to update review status."
        );
      }

      await applyUpdatedReview(response);

      toast.success(
        nextApproved ? "Review approved." : "Review hidden from customers."
      );
    } catch (error) {
      console.error(
        "UPDATE REVIEW STATUS ERROR:",
        error.response?.data || error.message
      );

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      toast.error(getErrorMessage(error));
    } finally {
      if (mounted.current) {
        setTogglingId(null);
      }
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section className="mamta-admin-reviews">
      <header className="mamta-admin-reviews-header">
        <div>
          <span className="mamta-admin-reviews-eyebrow">
            CUSTOMER EXPERIENCE
          </span>
          <h1>Reviews Management</h1>
          <p>Manage customer feedback and product reviews for MAMTA.</p>
        </div>

        <button
          type="button"
          className="mamta-admin-refresh"
          onClick={() => fetchReviews(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "mamta-spin" : ""}
          />
          Refresh
        </button>
      </header>

      <div className="mamta-admin-review-stats">
        <article className="mamta-admin-stat-card">
          <span className="mamta-admin-stat-icon">
            <MessageSquare size={21} />
          </span>
          <div>
            <span>Total reviews</span>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className="mamta-admin-stat-card">
          <span className="mamta-admin-stat-icon">
            <CheckCircle2 size={21} />
          </span>
          <div>
            <span>Approved</span>
            <strong>{stats.approved}</strong>
          </div>
        </article>

        <article className="mamta-admin-stat-card">
          <span className="mamta-admin-stat-icon">
            <Clock3 size={21} />
          </span>
          <div>
            <span>Hidden / pending</span>
            <strong>{stats.pending}</strong>
          </div>
        </article>

        <article className="mamta-admin-stat-card">
          <span className="mamta-admin-stat-icon">
            <Star size={21} />
          </span>
          <div>
            <span>Average rating</span>
            <strong>
              {stats.average}
              <small> / 5</small>
            </strong>
          </div>
        </article>
      </div>

      <div className="mamta-admin-review-toolbar">
        <label className="mamta-admin-review-search">
          <Search size={19} />
          <input
            type="search"
            placeholder="Search customer, city, product or review..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          aria-label="Filter by rating"
          value={ratingFilter}
          onChange={(event) => setRatingFilter(event.target.value)}
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={String(rating)}>
              {rating} {rating === 1 ? "star" : "stars"}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by review type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">All types</option>
          <option value="product">Product reviews</option>
          <option value="general">General testimonials</option>
        </select>

        <select
          aria-label="Filter by approval status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Hidden / pending</option>
        </select>
      </div>

      <div className="mamta-admin-review-results">
        <span>
          Showing <strong>{filteredReviews.length}</strong> of{" "}
          <strong>{reviews.length}</strong> reviews
        </span>
      </div>

      {loading ? (
        <div className="mamta-admin-review-state">
          <RefreshCw size={25} className="mamta-spin" />
          <p>Loading reviews...</p>
        </div>
      ) : loadError && reviews.length === 0 ? (
        <div className="mamta-admin-review-state" role="alert">
          <MessageSquare size={34} />
          <h3>Unable to load reviews</h3>
          <p>{loadError}</p>
          <button
            type="button"
            className="mamta-admin-refresh"
            onClick={() => fetchReviews(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "mamta-spin" : ""}
            />
            Try again
          </button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="mamta-admin-review-state">
          <MessageSquare size={34} />
          <h3>No reviews found</h3>
          <p>
            {reviews.length
              ? "Try changing your search or filters."
              : "Customer reviews will appear here after they are saved."}
          </p>
          <button
            type="button"
            className="mamta-admin-refresh"
            onClick={() => fetchReviews(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "mamta-spin" : ""}
            />
            Refresh reviews
          </button>
        </div>
      ) : (
        <div className="mamta-admin-review-list">
          {filteredReviews.map((review) => {
            const isToggling = togglingId === review._id;
            const isDeleting = deletingId === review._id;

            return (
              <article className="mamta-admin-review-card" key={review._id}>
                <div className="mamta-admin-review-card-top">
                  <div className="mamta-admin-review-person">
                    <div className="mamta-admin-review-avatar">
                      {(review.name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3>{review.name || "Customer"}</h3>
                      <p>
                        {getReviewCity(review) || "City unavailable"}
                        {review.email ? ` · ${review.email}` : ""}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`mamta-admin-review-status ${
                      review.approved === false ? "is-hidden" : "is-approved"
                    }`}
                  >
                    {review.approved === false ? "Hidden" : "Approved"}
                  </span>
                </div>

                <RatingStars rating={review.rating} />

                <p className="mamta-admin-review-message">
                  {getReviewText(review)}
                </p>

                <div className="mamta-admin-review-meta">
                  <span>
                    <Package size={15} />
                    {getProductName(review)}
                  </span>
                  <span>{formatDate(review.createdAt)}</span>
                </div>

                <div className="mamta-admin-review-actions">
                  <button
                    type="button"
                    className="mamta-admin-action-approval"
                    onClick={() => toggleApproval(review)}
                    disabled={isToggling || isDeleting}
                  >
                    {isToggling
                      ? "Updating..."
                      : review.approved === false
                      ? "Approve review"
                      : "Hide review"}
                  </button>

                  <div className="mamta-admin-action-group">
                    <button
                      type="button"
                      className="mamta-admin-action-edit"
                      onClick={() => openEdit(review)}
                      disabled={isDeleting}
                      aria-label={`Edit review by ${review.name || "customer"}`}
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      className="mamta-admin-action-delete"
                      onClick={() => handleDelete(review)}
                      disabled={isDeleting}
                      aria-label={`Delete review by ${
                        review.name || "customer"
                      }`}
                    >
                      <Trash2 size={16} />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editingReview && (
        <div
          className="mamta-review-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEdit();
          }}
        >
          <section
            className="mamta-review-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mamta-review-edit-title"
          >
            <div className="mamta-review-modal-heading">
              <div>
                <span className="mamta-admin-reviews-eyebrow">
                  REVIEW MANAGEMENT
                </span>
                <h2 id="mamta-review-edit-title">Edit Review</h2>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                aria-label="Close edit dialog"
              >
                <X size={21} />
              </button>
            </div>

            <form className="mamta-review-edit-form" onSubmit={handleSave}>
              <div className="mamta-review-edit-grid">
                <label>
                  Customer name
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    minLength={2}
                    maxLength={50}
                    required
                  />
                </label>

                <label>
                  City
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    minLength={2}
                    maxLength={50}
                    required
                  />
                </label>
              </div>

              <label>
                Rating
                <select
                  name="rating"
                  value={formData.rating}
                  onChange={handleFormChange}
                  required
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} {rating === 1 ? "star" : "stars"}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Review message
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  rows={5}
                  minLength={10}
                  maxLength={500}
                  required
                />
                <small>{formData.message.length}/500 characters</small>
              </label>

              <label className="mamta-review-approval-checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(formData.approved)}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      approved: event.target.checked,
                    }))
                  }
                />
                Show this review to customers
              </label>

              <div className="mamta-review-modal-actions">
                <button
                  type="button"
                  className="mamta-review-cancel"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="mamta-review-save"
                  disabled={saving}
                >
                  <Save size={17} />
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
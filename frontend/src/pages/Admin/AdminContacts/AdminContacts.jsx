import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Mail,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import "./AdminContacts.css";

/* =========================================================
   API CONFIGURATION
   Same base URL as the other admin pages.
   Vite:  VITE_API_URL in .env (e.g. http://localhost:5000/api)
   CRA:   use process.env.REACT_APP_API_URL instead.
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || "https://maamta.onrender.com/api";

const CONTACTS_URL = `${API_BASE}/admin/contact`;

const TOKEN_KEY = "mamta_admin_token";
const USER_KEY = "mamta_admin_user";

const STATUSES = ["New", "Read", "Replied"];

/* =========================================================
   HELPERS
========================================================= */

const getStatus = (contact) => contact.status || "New";

const formatDate = (date) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  (error.request && !error.response
    ? "Cannot reach the server. If it was idle, wait a minute and try again."
    : fallback);

/* =========================================================
   ADMIN CONTACTS
========================================================= */

const AdminContacts = () => {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [busyId, setBusyId] = useState("");

  /* =========================================================
     AUTH FAILURE
  ========================================================= */

  const handleAuthFailure = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/admin");
  }, [navigate]);

  /* =========================================================
     FETCH CONTACTS (single source of truth)
     GET /api/admin/contact
     `isRefresh` shows the small refresh spinner. The initial
     load uses the loading state, which starts as true.
  ========================================================= */

  const fetchContacts = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        }

        setError("");

        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
          navigate("/admin");
          return;
        }

        const response = await axios.get(CONTACTS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data;

        setContacts(
          Array.isArray(data?.contacts)
            ? data.contacts
            : Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "ADMIN CONTACTS ERROR:",
          err.response?.data || err.message
        );

        const code = err.response?.status;

        if (code === 401 || code === 403) {
          handleAuthFailure();
          return;
        }

        setError(getErrorMessage(err, "Failed to load messages."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate, handleAuthFailure]
  );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  /* =========================================================
     UPDATE CONTACT STATUS
     PATCH /api/admin/contact/:id/status
  ========================================================= */

  const updateStatus = async (id, status) => {
    if (busyId) return;

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      navigate("/admin");
      return;
    }

    try {
      setBusyId(id);

      await axios.patch(
        `${CONTACTS_URL}/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setContacts((previousContacts) =>
        previousContacts.map((contact) =>
          contact._id === id ? { ...contact, status } : contact
        )
      );

      setSelectedContact((previousContact) =>
        previousContact?._id === id
          ? { ...previousContact, status }
          : previousContact
      );
    } catch (err) {
      console.error(
        "UPDATE CONTACT STATUS ERROR:",
        err.response?.data || err.message
      );

      const code = err.response?.status;

      if (code === 401 || code === 403) {
        handleAuthFailure();
        return;
      }

      alert(getErrorMessage(err, "Unable to update message status."));
    } finally {
      setBusyId("");
    }
  };

  /* =========================================================
     DELETE CONTACT
     DELETE /api/admin/contact/:id
  ========================================================= */

  const deleteContact = async (id) => {
    if (busyId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this message? This action cannot be undone."
    );

    if (!confirmed) return;

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      navigate("/admin");
      return;
    }

    try {
      setBusyId(id);

      await axios.delete(`${CONTACTS_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setContacts((previousContacts) =>
        previousContacts.filter((contact) => contact._id !== id)
      );

      setSelectedContact((previousContact) =>
        previousContact?._id === id ? null : previousContact
      );
    } catch (err) {
      console.error(
        "DELETE CONTACT ERROR:",
        err.response?.data || err.message
      );

      const code = err.response?.status;

      if (code === 401 || code === 403) {
        handleAuthFailure();
        return;
      }

      alert(getErrorMessage(err, "Unable to delete message."));
    } finally {
      setBusyId("");
    }
  };

  /* =========================================================
     STATISTICS
  ========================================================= */

  const stats = useMemo(
    () => ({
      total: contacts.length,
      new: contacts.filter((contact) => getStatus(contact) === "New").length,
      read: contacts.filter((contact) => getStatus(contact) === "Read").length,
      replied: contacts.filter((contact) => getStatus(contact) === "Replied")
        .length,
    }),
    [contacts]
  );

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <div className="admin-contacts">
      {/* HEADER */}

      <div className="admin-contacts-header">
        <div>
          <span>CUSTOMER COMMUNICATION</span>

          <h1>Contact Messages</h1>

          <p>Manage messages received from MAMTA customers.</p>
        </div>

        <button
          type="button"
          className="contacts-refresh-btn"
          onClick={() => fetchContacts(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw size={17} className={refreshing ? "refresh-spinning" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="contacts-error" role="alert">
          {error}
        </div>
      )}

      {/* STATISTICS */}

      <div className="contacts-stats">
        <div className="contact-stat-card">
          <div className="contact-stat-icon">
            <MessageCircle size={19} />
          </div>

          <div>
            <span>TOTAL</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="contact-stat-card">
          <div className="contact-stat-icon new">
            <Mail size={19} />
          </div>

          <div>
            <span>NEW</span>
            <strong>{stats.new}</strong>
          </div>
        </div>

        <div className="contact-stat-card">
          <div className="contact-stat-icon read">
            <Eye size={19} />
          </div>

          <div>
            <span>READ</span>
            <strong>{stats.read}</strong>
          </div>
        </div>

        <div className="contact-stat-card">
          <div className="contact-stat-icon replied">
            <CheckCircle size={19} />
          </div>

          <div>
            <span>REPLIED</span>
            <strong>{stats.replied}</strong>
          </div>
        </div>
      </div>

      {/* CONTACT CONTENT */}

      <div className="contacts-layout">
        {/* MESSAGE LIST */}

        <div className="contacts-list">
          <div className="contacts-list-header">
            <h2>Messages</h2>
            <span>{contacts.length}</span>
          </div>

          {loading ? (
            <div className="contacts-loading">Loading messages...</div>
          ) : contacts.length === 0 ? (
            <div className="contacts-empty">
              <Mail size={34} />

              <h3>{error ? "Unable to load messages" : "No messages yet"}</h3>

              <p>
                {error
                  ? "Press Refresh to try again."
                  : "Customer messages will appear here."}
              </p>
            </div>
          ) : (
            <div className="contacts-table-wrapper">
              <table className="contacts-table">
                <thead>
                  <tr>
                    <th>CUSTOMER</th>
                    <th>SUBJECT</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {contacts.map((contact) => {
                    const status = getStatus(contact);
                    const busy = busyId === contact._id;

                    return (
                      <tr key={contact._id}>
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">
                              {contact.name?.charAt(0)?.toUpperCase() || "C"}
                            </div>

                            <div>
                              <strong>{contact.name || "Unknown"}</strong>
                              <span>{contact.email || "No email"}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="subject-cell">
                            {contact.subject || "No subject"}
                          </span>
                        </td>

                        <td>
                          <span className="date-cell">
                            {formatDate(contact.createdAt)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`contact-status ${status.toLowerCase()}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td>
                          <div className="contact-actions">
                            <button
                              type="button"
                              onClick={() => setSelectedContact(contact)}
                              title="View message"
                              aria-label="View message"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete"
                              onClick={() => deleteContact(contact._id)}
                              disabled={busy}
                              title="Delete message"
                              aria-label="Delete message"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MESSAGE DETAILS */}

        <div className="contact-details">
          {!selectedContact ? (
            <div className="contact-details-empty">
              <MessageCircle size={38} />

              <h3>Select a message</h3>

              <p>Click the eye icon to view customer details.</p>
            </div>
          ) : (
            <>
              <div className="contact-details-header">
                <div>
                  <span>MESSAGE DETAILS</span>

                  <h2>{selectedContact.subject || "No subject"}</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  aria-label="Close message details"
                >
                  ×
                </button>
              </div>

              <div className="contact-customer-details">
                <div className="detail-avatar">
                  {selectedContact.name?.charAt(0)?.toUpperCase() || "C"}
                </div>

                <div>
                  <strong>{selectedContact.name || "Unknown"}</strong>

                  {selectedContact.email && (
                    <a href={`mailto:${selectedContact.email}`}>
                      {selectedContact.email}
                    </a>
                  )}

                  {selectedContact.phone && (
                    <a href={`tel:${selectedContact.phone}`}>
                      {selectedContact.phone}
                    </a>
                  )}
                </div>
              </div>

              <div className="contact-message-box">
                <span>MESSAGE</span>

                <p>{selectedContact.message}</p>
              </div>

              <div className="contact-message-meta">
                <div>
                  <Clock size={16} />

                  <span>{formatDate(selectedContact.createdAt)}</span>
                </div>

                <div>
                  <span>Status:</span>

                  <strong>{getStatus(selectedContact)}</strong>
                </div>
              </div>

              <div className="contact-status-actions">
                <span>UPDATE STATUS</span>

                <div>
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={
                        getStatus(selectedContact) === status ? "selected" : ""
                      }
                      disabled={busyId === selectedContact._id}
                      onClick={() => updateStatus(selectedContact._id, status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {selectedContact.email && (
                <a
                  href={`mailto:${selectedContact.email}?subject=${encodeURIComponent(
                    `Re: ${selectedContact.subject || "Your message"}`
                  )}`}
                  className="contact-reply-button"
                >
                  <Mail size={17} />
                  Reply via Email
                </a>
              )}

              <button
                type="button"
                className="contact-delete-button"
                disabled={busyId === selectedContact._id}
                onClick={() => deleteContact(selectedContact._id)}
              >
                <Trash2 size={16} />
                Delete Message
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminContacts;
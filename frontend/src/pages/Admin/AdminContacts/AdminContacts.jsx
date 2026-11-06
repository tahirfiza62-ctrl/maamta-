
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
========================================================= */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api"
).replace(/\/+$/, "");

const CONTACTS_URL = `${API_BASE}/contact`;

const TOKEN_KEY = "mamta_admin_token";
const USER_KEY = "mamta_admin_user";

const STATUSES = ["New", "Read", "Replied"];

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const getStatus = (contact) => contact.status || "New";

const getId = (contact) => contact._id || contact.id;

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

const getErrorMessage = (error, fallback) => {
  return (
    error.response?.data?.message ||
    (error.request && !error.response
      ? "Cannot connect to the server. Please try again."
      : fallback)
  );
};

/* =========================================================
   ADMIN CONTACTS COMPONENT
========================================================= */

const AdminContacts = () => {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [busyId, setBusyId] = useState("");

  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  const handleAuthFailure = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    navigate("/admin", { replace: true });
  }, [navigate]);

const getAuthHeaders = useCallback(() => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    handleAuthFailure();
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}, [handleAuthFailure]);

  /* =======================================================
     FETCH CONTACT MESSAGES

     GET /api/admin/contact
  ======================================================= */

  const fetchContacts = useCallback(
    async (isRefresh = false, signal) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const headers = getAuthHeaders();

        if (!headers) return;

        const response = await axios.get(CONTACTS_URL, {
          headers,
          signal,
        });

        const data = response.data;

        const contactList = Array.isArray(data?.contacts)
          ? data.contacts
          : Array.isArray(data)
          ? data
          : [];

        setContacts(contactList);

      } catch (err) {
        if (
          err.code === "ERR_CANCELED" ||
          axios.isCancel(err)
        ) {
          return;
        }

        console.error(
          "ADMIN CONTACTS ERROR:",
          err.response?.data || err.message
        );

        const status = err.response?.status;

        if (status === 401 || status === 403) {
          handleAuthFailure();
          return;
        }

        setError(
          getErrorMessage(
            err,
            "Unable to load contact messages."
          )
        );

      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
   [getAuthHeaders, handleAuthFailure]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */
useEffect(() => {
  const controller = new AbortController();

  Promise.resolve().then(() => {
    if (!controller.signal.aborted) {
      fetchContacts(false, controller.signal);
    }
  });

  return () => {
    controller.abort();
  };
}, [fetchContacts]);


  /* =======================================================
     UPDATE MESSAGE STATUS

     PATCH /api/admin/contact/:id/status
  ======================================================= */

  const updateStatus = async (id, status) => {
    if (busyId) return;

    const headers = getAuthHeaders();

    if (!headers) return;

    try {
      setBusyId(id);
      setError("");

      await axios.patch(
        `${CONTACTS_URL}/${id}/status`,
        { status },
        { headers }
      );

      setContacts((previous) =>
        previous.map((contact) =>
          getId(contact) === id
            ? { ...contact, status }
            : contact
        )
      );

      setSelectedContact((previous) =>
        previous && getId(previous) === id
          ? { ...previous, status }
          : previous
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

      alert(
        getErrorMessage(
          err,
          "Unable to update message status."
        )
      );

    } finally {
      setBusyId("");
    }
  };

  /* =======================================================
     DELETE CONTACT MESSAGE

     DELETE /api/admin/contact/:id
  ======================================================= */

  const deleteContact = async (id) => {
    if (busyId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this message?"
    );

    if (!confirmed) return;

    const headers = getAuthHeaders();

    if (!headers) return;

    try {
      setBusyId(id);

      await axios.delete(
        `${CONTACTS_URL}/${id}`,
        { headers }
      );

      setContacts((previous) =>
        previous.filter(
          (contact) => getId(contact) !== id
        )
      );

      setSelectedContact((previous) =>
        previous && getId(previous) === id
          ? null
          : previous
      );

      alert("Message deleted successfully.");

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

      alert(
        getErrorMessage(
          err,
          "Unable to delete message."
        )
      );

    } finally {
      setBusyId("");
    }
  };

  /* =======================================================
     STATISTICS
  ======================================================= */

  const stats = useMemo(() => ({
    total: contacts.length,

    new: contacts.filter(
      (contact) => getStatus(contact) === "New"
    ).length,

    read: contacts.filter(
      (contact) => getStatus(contact) === "Read"
    ).length,

    replied: contacts.filter(
      (contact) => getStatus(contact) === "Replied"
    ).length,

  }), [contacts]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="admin-contacts">

      {/* HEADER */}

      <div className="admin-contacts-header">

        <div>
          <span>CUSTOMER COMMUNICATION</span>

          <h1>Contact Messages</h1>

          <p>
            Manage messages received from MAMTA customers.
          </p>
        </div>

        <button
          type="button"
          className="contacts-refresh-btn"
          onClick={() => fetchContacts(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={17}
            className={
              refreshing ? "refresh-spinning" : ""
            }
          />

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

            <div className="contacts-loading">
              Loading messages...
            </div>

          ) : contacts.length === 0 ? (

            <div className="contacts-empty">

              <Mail size={34} />

              <h3>
                {error
                  ? "Unable to load messages"
                  : "No messages yet"}
              </h3>

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
                    const id = getId(contact);
                    const status = getStatus(contact);
                    const busy = busyId === id;

                    return (

                      <tr key={id}>

                        {/* CUSTOMER */}

                        <td>
                          <div className="customer-cell">

                            <div className="customer-avatar">
                              {contact.name
                                ?.charAt(0)
                                ?.toUpperCase() || "C"}
                            </div>

                            <div>
                              <strong>
                                {contact.name || "Unknown"}
                              </strong>

                              <span>
                                {contact.email || "No email"}
                              </span>
                            </div>

                          </div>
                        </td>

                        {/* SUBJECT */}

                        <td>
                          <span className="subject-cell">
                            {contact.subject || "No subject"}
                          </span>
                        </td>

                        {/* DATE */}

                        <td>
                          <span className="date-cell">
                            {formatDate(contact.createdAt)}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={`contact-status ${status.toLowerCase()}`}
                          >
                            {status}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="contact-actions">

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedContact(contact)
                              }
                              title="View message"
                              aria-label="View message"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete"
                              onClick={() => deleteContact(id)}
                              disabled={busy || Boolean(busyId)}
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

              <p>
                Click the eye icon to view customer details.
              </p>

            </div>

          ) : (

            <>

              {/* DETAILS HEADER */}

              <div className="contact-details-header">

                <div>
                  <span>MESSAGE DETAILS</span>

                  <h2>
                    {selectedContact.subject || "No subject"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  aria-label="Close message details"
                >
                  ×
                </button>

              </div>

              {/* CUSTOMER DETAILS */}

              <div className="contact-customer-details">

                <div className="detail-avatar">
                  {selectedContact.name
                    ?.charAt(0)
                    ?.toUpperCase() || "C"}
                </div>

                <div>

                  <strong>
                    {selectedContact.name || "Unknown"}
                  </strong>

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

              {/* MESSAGE */}

              <div className="contact-message-box">

                <span>MESSAGE</span>

                <p>
                  {selectedContact.message || "No message content."}
                </p>

              </div>

              {/* MESSAGE DATE AND STATUS */}

              <div className="contact-message-meta">

                <div>
                  <Clock size={16} />

                  <span>
                    {formatDate(selectedContact.createdAt)}
                  </span>
                </div>

                <div>
                  <span>Status:</span>

                  <strong>
                    {getStatus(selectedContact)}
                  </strong>
                </div>

              </div>

              {/* UPDATE STATUS */}

              <div className="contact-status-actions">

                <span>UPDATE STATUS</span>

                <div>

                  {STATUSES.map((status) => (

                    <button
                      key={status}
                      type="button"
                      className={
                        getStatus(selectedContact) === status
                          ? "selected"
                          : ""
                      }
                      disabled={
                        Boolean(busyId) ||
                        getStatus(selectedContact) === status
                      }
                      onClick={() =>
                        updateStatus(
                          getId(selectedContact),
                          status
                        )
                      }
                    >
                      {status}
                    </button>

                  ))}

                </div>

              </div>

              {/* EMAIL REPLY */}

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

              {/* DELETE */}

              <button
                type="button"
                className="contact-delete-button"
                disabled={Boolean(busyId)}
                onClick={() =>
                  deleteContact(getId(selectedContact))
                }
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

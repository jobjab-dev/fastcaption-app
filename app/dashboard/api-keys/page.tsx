"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/user/api-keys");
      const data = await res.json();
      if (data.apiKeys) {
        setKeys(data.apiKeys);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (data.apiKey) {
        setNewKeySecret(data.apiKey.key); // Show full key once
        fetchKeys(); // Refresh list
        setNewKeyName("");
      } else {
        alert(data.error || "Failed to create key");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key? Any apps using it will stop working.")) return;
    
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: "800px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ marginBottom: "8px" }}>API Keys</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Manage your API keys to access FastCaption services from external apps.
              {" "}
              <Link href="/api-docs" style={{ color: "var(--accent-light)" }}>
                View API Docs →
              </Link>
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>

        {newKeySecret && (
          <div className="card" style={{ marginBottom: "24px", borderColor: "var(--accent)", backgroundColor: "rgba(255, 77, 77, 0.05)" }}>
            <h3 style={{ color: "var(--accent)", marginBottom: "8px" }}>🎉 API Key Created</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
              Please copy this key and save it somewhere safe. For security reasons, <strong>you won't be able to see it again!</strong>
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input 
                type="text" 
                value={newKeySecret} 
                readOnly 
                className="input" 
                style={{ flex: 1, fontFamily: "monospace", color: "var(--accent)" }} 
              />
              <button onClick={() => copyToClipboard(newKeySecret)} className="btn btn-primary">
                Copy
              </button>
            </div>
            <button 
              onClick={() => setNewKeySecret(null)} 
              className="btn btn-secondary" 
              style={{ marginTop: "16px" }}
            >
              I have saved it
            </button>
          </div>
        )}

        <div className="card" style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Create New Key</h2>
          <form onSubmit={handleCreateKey} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Key Name</label>
              <input 
                type="text" 
                className="input" 
                value={newKeyName} 
                onChange={(e) => setNewKeyName(e.target.value)} 
                placeholder="e.g., Python Bot, Workflow" 
                required 
                maxLength={50}
                style={{ width: "100%" }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create API key"}
            </button>
          </form>
        </div>

        <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Your API Keys</h2>
        {loading ? (
          <p>Loading...</p>
        ) : keys.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ color: "var(--text-secondary)" }}>You don't have any API keys yet.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-card)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>NAME</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>KEY</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>CREATED</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}>{key.name}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                      {key.key}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button 
                        onClick={() => handleDeleteKey(key.id)}
                        style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", padding: "4px 8px" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

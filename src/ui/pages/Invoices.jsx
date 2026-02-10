import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = {
  studentId: "",
  number: "",
  status: "draft",
  dueDate: "",
  items: "",
  total: ""
};

export default function Invoices() {
  const [items, setItems] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [invoiceData, receiptData, studentData] = await Promise.all([
      api.get("/invoices").then((res) => res.data),
      api.get("/receipts").then((res) => res.data),
      api.get("/students").then((res) => res.data)
    ]);
    setItems(invoiceData);
    setReceipts(receiptData);
    setStudents(studentData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const itemLines = form.items
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, amount] = line.split("|").map((part) => part.trim());
        return { label, amount: Number(amount || 0) };
      });
    const payload = {
      studentId: form.studentId,
      number: form.number.trim(),
      status: form.status,
      dueDate: form.dueDate || null,
      items: itemLines,
      total: Number(form.total || 0)
    };
    if (editingId) {
      await api.put(`/invoices/${editingId}`, payload);
    } else {
      await api.post("/invoices", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const edit = (invoice) => {
    setEditingId(invoice._id);
    setForm({
      studentId: invoice.studentId || "",
      number: invoice.number || "",
      status: invoice.status || "draft",
      dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : "",
      items: (invoice.items || [])
        .map((item) => `${item.label} | ${item.amount}`)
        .join("\n"),
      total: invoice.total || ""
    });
  };

  const remove = async (id) => {
    await api.delete(`/invoices/${id}`);
    load();
  };

  const studentLookup = Object.fromEntries(students.map((item) => [item._id, item.name]));

  const printInvoice = (invoice) => {
    const win = window.open("", "invoice");
    if (!win) return;
    const rows = (invoice.items || [])
      .map((item) => `<tr><td>${item.label}</td><td>${item.amount}</td></tr>`)
      .join("");
    win.document.write(`
      <html>
        <head><title>Invoice ${invoice.number}</title></head>
        <body>
          <h2>Invoice ${invoice.number}</h2>
          <p>Student: ${studentLookup[invoice.studentId] || ""}</p>
          <p>Status: ${invoice.status}</p>
          <table border="1" cellspacing="0" cellpadding="6">
            <thead><tr><th>Item</th><th>Amount</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <h3>Total: ${invoice.total}</h3>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const printReceipt = (receipt) => {
    const win = window.open("", "receipt");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Receipt</title></head>
        <body>
          <h2>Receipt</h2>
          <p>Student: ${studentLookup[receipt.studentId] || ""}</p>
          <p>Amount: ${receipt.amount}</p>
          <p>Method: ${receipt.method}</p>
          <p>Date: ${receipt.paidOn ? new Date(receipt.paidOn).toLocaleDateString() : ""}</p>
          <p>Reference: ${receipt.reference || "-"}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices & Receipts</h1>
          <p className="page-subtitle">Generate invoices and provide receipts.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Create Invoice</h2>
        <form className="form" onSubmit={submit}>
          <select
            className="select"
            value={form.studentId}
            onChange={(event) => setForm({ ...form, studentId: event.target.value })}
            required
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Invoice number"
            value={form.number}
            onChange={(event) => setForm({ ...form, number: event.target.value })}
            required
          />
          <select
            className="select"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
          </select>
          <input
            className="input"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
          />
          <textarea
            className="input"
            rows="4"
            placeholder="Items: label | amount (one per line)"
            value={form.items}
            onChange={(event) => setForm({ ...form, items: event.target.value })}
          />
          <input
            className="input"
            type="number"
            placeholder="Total"
            value={form.total}
            onChange={(event) => setForm({ ...form, total: event.target.value })}
            required
          />
          <button className="btn" type="submit">
            {editingId ? "Update Invoice" : "Save Invoice"}
          </button>
          {editingId && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Invoices</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Student</th>
                <th>Status</th>
                <th>Total</th>
                <th>Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((invoice) => (
                <tr key={invoice._id}>
                  <td>{invoice.number}</td>
                  <td>{studentLookup[invoice.studentId] || "-"}</td>
                  <td>{invoice.status}</td>
                  <td>{invoice.total}</td>
                  <td>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => printInvoice(invoice)}>
                      Print
                    </button>
                    <button className="btn btn-ghost" onClick={() => edit(invoice)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => remove(invoice._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="6">No invoices yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Receipts</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt._id}>
                  <td>{studentLookup[receipt.studentId] || "-"}</td>
                  <td>{receipt.amount}</td>
                  <td>{receipt.method}</td>
                  <td>{receipt.paidOn ? new Date(receipt.paidOn).toLocaleDateString() : "-"}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => printReceipt(receipt)}>
                      Print
                    </button>
                  </td>
                </tr>
              ))}
              {!receipts.length && (
                <tr>
                  <td colSpan="5">No receipts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

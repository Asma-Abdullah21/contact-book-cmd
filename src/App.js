import React, { useState, useEffect } from 'react';
import './App.css';

const INITIAL_CONTACTS = [
  { id: 1, name: 'Alice Smith', email: 'alice@example.com', phone: '+1-555-0143', category: 'Work' },
  { id: 2, name: 'Bob Johnson', email: 'bob@example.com', phone: '+1-555-0188', category: 'Personal' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', phone: '+1-555-0199', category: 'Family' },
];

function App() {
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('contacts_data');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', category: 'Personal' });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [commandText, setCommandText] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  useEffect(() => {
    localStorage.setItem('contacts_data', JSON.stringify(contacts));
  }, [contacts]);

  const showFeedback = (msg, type = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      setContacts(contacts.map(c => c.id === editingId ? { ...formData, id: editingId } : c));
      setEditingId(null);
      showFeedback(`Updated contact: ${formData.name}`);
    } else {
      const newContact = { ...formData, id: Date.now() };
      setContacts([newContact, ...contacts]);
      showFeedback(`Added contact: ${formData.name}`);
    }
    setFormData({ name: '', email: '', phone: '', category: 'Personal' });
  };

  const handleEdit = (contact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      category: contact.category,
    });
  };

  const handleDelete = (id) => {
    const target = contacts.find(c => c.id === id);
    if (window.confirm(`Are you sure you want to delete ${target ? target.name : 'this contact'}?`)) {
      setContacts(contacts.filter(c => c.id !== id));
      showFeedback(`Deleted contact ${target ? target.name : ''}`);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', category: 'Personal' });
  };

  // Natural Language & Flexible Command Execution
  const executeCommand = (cmdStr) => {
    const text = cmdStr.trim();
    if (!text) return;

    const lower = text.toLowerCase();

    // 1. DELETE Command
    if (lower.startsWith('delete') || lower.startsWith('remove')) {
      const nameOrSearch = text.replace(/^(delete|remove)\s+/i, '').replace(/^contact\s+/i, '').trim();
      if (!nameOrSearch) {
        showFeedback('Please specify who to delete (e.g., "delete Alice")', 'error');
        return;
      }

      const matches = contacts.filter(c => 
        c.name.toLowerCase().includes(nameOrSearch.toLowerCase()) || 
        c.email.toLowerCase().includes(nameOrSearch.toLowerCase())
      );

      if (matches.length === 0) {
        showFeedback(`No contact found matching "${nameOrSearch}"`, 'error');
      } else if (matches.length > 1) {
        showFeedback(`Multiple contacts found for "${nameOrSearch}". Please be more specific.`, 'error');
      } else {
        const toDelete = matches[0];
        setContacts(contacts.filter(c => c.id !== toDelete.id));
        showFeedback(`Successfully deleted contact: ${toDelete.name}`);
      }
      return;
    }

    // 2. EDIT / UPDATE Command
    if (lower.startsWith('edit') || lower.startsWith('update')) {
      // Example: "edit Alice set email alice@new.com phone 1234" or "edit Alice, Bob@email.com, 123-456, Work"
      const args = text.replace(/^(edit|update)\s+/i, '').trim();
      
      // Find matching contact
      const firstWord = args.split(' ')[0];
      const target = contacts.find(c => c.name.toLowerCase().includes(firstWord.toLowerCase()));

      if (!target) {
        showFeedback(`Could not find a contact matching "${firstWord}" to edit.`, 'error');
        return;
      }

      // Extract new details if provided
      const emailMatch = args.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const phoneMatch = args.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
      let cat = target.category;
      if (lower.includes('work')) cat = 'Work';
      else if (lower.includes('personal')) cat = 'Personal';
      else if (lower.includes('family')) cat = 'Family';
      else if (lower.includes('other')) cat = 'Other';

      const updated = {
        ...target,
        email: emailMatch ? emailMatch[0] : target.email,
        phone: phoneMatch ? phoneMatch[0] : target.phone,
        category: cat
      };

      setContacts(contacts.map(c => c.id === target.id ? updated : c));
      showFeedback(`Successfully updated contact: ${target.name}`);
      return;
    }

    // 3. ADD / CREATE Command (Default fallback for flexible inputs)
    // Extract Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    // Extract Phone
    const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);

    let cleanText = text.replace(/^(add|create|insert|new)\s+/i, '');
    let category = 'Personal';

    if (lower.includes('work')) category = 'Work';
    else if (lower.includes('family')) category = 'Family';
    else if (lower.includes('other')) category = 'Other';

    // Remove email and phone strings from text to isolate the Name
    let nameStr = cleanText;
    if (emailMatch) nameStr = nameStr.replace(emailMatch[0], '');
    if (phoneMatch) nameStr = nameStr.replace(phoneMatch[0], '');
    nameStr = nameStr.replace(/work|personal|family|other/gi, '').replace(/[,;]/g, '').trim();

    if (!nameStr) {
      showFeedback('Please provide at least a name (e.g., "John Doe john@example.com 555-1234")', 'error');
      return;
    }

    const newContact = {
      id: Date.now(),
      name: nameStr,
      email: emailMatch ? emailMatch[0] : 'no-email@example.com',
      phone: phoneMatch ? phoneMatch[0] : 'N/A',
      category: category
    };

    setContacts([newContact, ...contacts]);
    showFeedback(`Successfully added contact: ${newContact.name}`);
  };

  const handleCommandKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(commandText);
      setCommandText('');
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="app-layout">
      <div className="container">
        <header>
          <h1>📖 Contact Book</h1>
          <p className="subtitle">Contacts list</p>
        </header>

        {feedback.message && (
          <div className={`toast-feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="main-content">
          <form onSubmit={handleSubmit} className="card form-card">
            <h2>{editingId ? 'Edit Contact' : 'Add New Contact'}</h2>
            
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                required
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                required
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Family">Family</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="btn-group">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Contact' : 'Add Contact'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="btn btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="contacts-section">
            <div className="search-bar">
              <input
                type="text"
                placeholder="🔍 Search contacts by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="contacts-list">
              {filteredContacts.length === 0 ? (
                <div className="card empty">No contacts found.</div>
              ) : (
                filteredContacts.map((contact) => (
                  <div key={contact.id} className="card contact-card">
                    <div className="contact-info">
                      <h3>{contact.name} <span className={`badge ${contact.category.toLowerCase()}`}>{contact.category}</span></h3>
                      <p>📧 {contact.email}</p>
                      <p>📞 {contact.phone}</p>
                    </div>
                    <div className="contact-actions">
                      <button onClick={() => handleEdit(contact)} className="btn btn-edit">Edit</button>
                      <button onClick={() => handleDelete(contact.id)} className="btn btn-delete">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom AI Command Bar */}
      <div className="command-bar-wrapper">
        <div className="command-bar-card">
          <input
            type="text"
            className="command-input"
            value={commandText}
            placeholder="Type / for skills"
            onChange={(e) => setCommandText(e.target.value)}
            onKeyDown={handleCommandKeyDown}
          />
          <div className="command-bar-footer">
            <div className="command-left-actions">
              <button className="icon-btn" type="button">+</button>
              <div className="pill-toggle">
                <span className="pill active">Chat</span>
                <span className="pill">Cowork</span>
              </div>
            </div>
            <div className="command-right-actions">
              <span className="model-tag">Sonnet 5.5 <span className="sub-tag">Medium</span></span>
              <button className="icon-btn mic-btn" type="button">🎤</button>
              <button className="icon-btn audio-btn" type="button">📊</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

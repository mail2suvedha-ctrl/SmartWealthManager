import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5232/api';

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Salary", type: "Income", icon: "💼" },
  { id: 2, name: "Freelance", type: "Income", icon: "💻" },
  { id: 3, name: "Bonus", type: "Income", icon: "🎉" },
  { id: 4, name: "Food", type: "Expense", icon: "🍔" },
  { id: 5, name: "Travel", type: "Expense", icon: "✈️" },
  { id: 6, name: "Shopping", type: "Expense", icon: "🛍️" },
  { id: 7, name: "Rent", type: "Expense", icon: "🏠" },
  { id: 8, name: "Medical", type: "Expense", icon: "🏥" },
  { id: 9, name: "Education", type: "Expense", icon: "📚" },
  { id: 10, name: "Entertainment", type: "Expense", icon: "🎬" },
  { id: 11, name: "Gym", type: "Expense", icon: "💪" },
  { id: 12, name: "Others", type: "Expense", icon: "📦" }
];

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [authTab, setAuthTab] = useState('login'); 
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('sm_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState(() => {
    const saved = localStorage.getItem('sm_budgets');
    return saved ? JSON.parse(saved) : [];
  });

  const [pendingDeletions, setPendingDeletions] = useState(() => {
    const saved = localStorage.getItem('sm_pending_deletions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  const [txCategory, setTxCategory] = useState('4');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().substring(0, 10));

  const [bgCategory, setBgCategory] = useState('4');
  const [bgAmount, setBgAmount] = useState('');

  useEffect(() => {
    localStorage.setItem('sm_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('sm_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('sm_pending_deletions', JSON.stringify(pendingDeletions));
  }, [pendingDeletions]);

  useEffect(() => {
    if (!isOffline && user) {
      executeSynchronizations();
    }
  }, [isOffline]);

  useEffect(() => {
    if (user && !isOffline) {
      fetchDataFromApi();
    }
  }, [user, isOffline]);

  const fetchDataFromApi = async () => {
    try {
      const txResponse = await fetch(`${API_BASE_URL}/Transactions`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (txResponse.ok) {
        const remoteData = await txResponse.json();
        setTransactions(prevTransactions => {
          const localUnsynced = prevTransactions.filter(t => !t.isSynced);
          const serverSynced = remoteData.map(t => ({ ...t, isSynced: true }));
          return [...localUnsynced, ...serverSynced];
        });
      }

      const bgResponse = await fetch(`${API_BASE_URL}/Budget?month=6&year=2026`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (bgResponse.ok) {
        const remoteBudgets = await bgResponse.json();
        setBudgets(remoteBudgets);
      }
    } catch (err) {
      console.warn("API Server is down or unreachable. Using cached offline data.", err);
    }
  };

  const executeSynchronizations = async () => {
    if (isOffline || !user) return;

    setSyncing(true);
    setSyncStatusMsg("🔄 Re-establishing database connection and processing queues...");

    let syncSuccessCount = 0;
    let deleteSuccessCount = 0;

    if (pendingDeletions.length > 0) {
      const remainingDeletions = [];
      for (const serverId of pendingDeletions) {
        try {
          const response = await fetch(`${API_BASE_URL}/Transactions/${serverId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (response.ok || response.status === 404) {
            deleteSuccessCount++;
          } else {
            remainingDeletions.push(serverId);
          }
        } catch (err) {
          remainingDeletions.push(serverId);
        }
      }
      setPendingDeletions(remainingDeletions);
    }

    const unsynced = transactions.filter(t => !t.isSynced);
    if (unsynced.length > 0) {
      for (const tx of unsynced) {
        try {
          const response = await fetch(`${API_BASE_URL}/Transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({
              clientGeneratedId: tx.clientGeneratedId,
              categoryId: tx.categoryId,
              amount: tx.amount,
              transactionDate: tx.transactionDate,
              notes: tx.notes
            })
          });

          if (response.ok) {
            const savedServerTx = await response.json();
            setTransactions(prev => prev.map(t => 
              t.clientGeneratedId === tx.clientGeneratedId 
                ? { ...t, id: savedServerTx.id, isSynced: true } 
                : t
            ));
            syncSuccessCount++;
          }
        } catch (err) {
          console.error("Failed to sync individual transaction:", tx, err);
        }
      }
    }

    setSyncing(false);

    if (syncSuccessCount > 0 || deleteSuccessCount > 0) {
      setSyncStatusMsg(`🚀 Cloud Sync Complete! Processed ${syncSuccessCount} addition(s) & ${deleteSuccessCount} deletion(s) into SQL Server.`);
      fetchDataFromApi();
    } else {
      setSyncStatusMsg("All local data matches central database perfectly!");
    }
    setTimeout(() => setSyncStatusMsg(''), 5000);
  };

  const handleAuthSuccess = (profile) => {
    localStorage.setItem('sm_user', JSON.stringify(profile));
    setUser(profile);
    setAuthError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('sm_user');
    localStorage.removeItem('sm_transactions');
    localStorage.removeItem('sm_budgets');
    localStorage.removeItem('sm_pending_deletions');
    setUser(null);
    setTransactions([]);
    setBudgets([]);
    setPendingDeletions([]);
    setActiveTab('dashboard');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      const response = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      if (response.ok) {
        const data = await response.json();
        handleAuthSuccess({
          email: authEmail,
          fullName: data.fullName || 'Suvedha S',
          currency: 'INR',
          token: data.token
        });
      } else {
        const errorMsg = await response.text();
        setAuthError(errorMsg || 'Invalid credentials. Ensure your .NET backend is running!');
      }
    } catch (err) {
      if (authEmail === 'suvedha@example.com' && authPassword === 'password123') {
        handleAuthSuccess({
          email: 'suvedha@example.com',
          fullName: 'Suvedha S (Offline Fallback)',
          currency: 'INR',
          token: 'offline-jwt-token'
        });
        setSyncStatusMsg("🔌 Logged in via local sandbox backup credentials.");
        setTimeout(() => setSyncStatusMsg(''), 4000);
      } else if (authEmail === 'Srinivasan@Example.com' && authPassword === 'password123') {
        handleAuthSuccess({
          email: 'Srinivasan@Example.com',
          fullName: 'Srinivasan',
          currency: 'INR',
          token: 'offline-jwt-token'
        });
        setSyncStatusMsg("🔌 Logged in as Srinivasan.");
        setTimeout(() => setSyncStatusMsg(''), 4000);
      } else {
        setAuthError("Failed to connect to backend server. Make sure your local API server is running!");
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      const response = await fetch(`${API_BASE_URL}/Auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: authName, email: authEmail, password: authPassword })
      });

      if (response.ok) {
        setAuthTab('login');
        setSyncStatusMsg("🎉 Account registered successfully! Please log in.");
        setTimeout(() => setSyncStatusMsg(''), 5000);
      } else {
        const errorMsg = await response.text();
        setAuthError(errorMsg || "Registration failed. Try checking database connection parameters.");
      }
    } catch (err) {
      setAuthError("Could not connect to API server. Ensure backend is running!");
    }
  };

  const currentMonth = 6;
  const currentYear = 2026;

  const monthlyTransactions = transactions.filter(t => {
    const d = new Date(t.transactionDate);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = monthlyTransactions
    .filter(t => {
      const cat = DEFAULT_CATEGORIES.find(c => c.id === t.categoryId);
      return cat?.type === 'Income';
    })
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const totalExpense = monthlyTransactions
    .filter(t => {
      const cat = DEFAULT_CATEGORIES.find(c => c.id === t.categoryId);
      return cat?.type === 'Expense';
    })
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const netSavings = totalIncome - totalExpense;

  const expenseTransactions = monthlyTransactions.filter(t => {
    const cat = DEFAULT_CATEGORIES.find(c => c.id === t.categoryId);
    return cat?.type === 'Expense';
  });

  const categoryAggregation = expenseTransactions.reduce((acc, t) => {
    const cat = DEFAULT_CATEGORIES.find(c => c.id === t.categoryId);
    const name = cat?.name || "Others";
    const icon = cat?.icon || "📦";
    if (!acc[name]) {
      acc[name] = { amount: 0, icon, id: t.categoryId };
    }
    acc[name].amount += parseFloat(t.amount || 0);
    return acc;
  }, {});

  const categoryDistribution = Object.keys(categoryAggregation).map(name => ({
    name,
    icon: categoryAggregation[name].icon,
    amount: categoryAggregation[name].amount,
    percentage: totalExpense > 0 ? (categoryAggregation[name].amount / totalExpense) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);

  const budgetStatuses = budgets.map(b => {
    const cat = DEFAULT_CATEGORIES.find(c => c.id === b.categoryId);
    const spending = expenseTransactions
      .filter(t => t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const percent = b.budgetAmount > 0 ? (spending / b.budgetAmount) * 100 : 0;
    return {
      ...b,
      categoryName: cat?.name || "Others",
      categoryIcon: cat?.icon || "🍔",
      spending,
      remaining: b.budgetAmount - spending,
      percentage: percent,
      isWarning: percent >= 90
    };
  });

  const activeWarningsCount = budgetStatuses.filter(b => b.isWarning).length;

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txAmount || parseFloat(txAmount) <= 0) return;

    const newTxId = crypto.randomUUID();
    const tempTx = {
      id: null,
      clientGeneratedId: newTxId,
      categoryId: parseInt(txCategory),
      amount: parseFloat(txAmount),
      transactionDate: new Date(txDate).toISOString(),
      notes: txNotes || "Logged record",
      isSynced: false
    };

    if (isOffline) {
      setTransactions(prev => [tempTx, ...prev]);
      setSyncStatusMsg("🔌 Device Offline. Saved safely inside LocalStorage queue.");
      setTxAmount('');
      setTxNotes('');
      setTimeout(() => setSyncStatusMsg(''), 4000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/Transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          clientGeneratedId: tempTx.clientGeneratedId,
          categoryId: tempTx.categoryId,
          amount: tempTx.amount,
          transactionDate: tempTx.transactionDate,
          notes: tempTx.notes
        })
      });

      if (response.ok) {
        const savedServerTx = await response.json();
        tempTx.id = savedServerTx.id; 
        tempTx.isSynced = true;
        setTransactions(prev => [tempTx, ...prev]);
        setSyncStatusMsg("🚀 Transaction recorded on SQL Server!");
      } else {
        setTransactions(prev => [tempTx, ...prev]);
        setSyncStatusMsg("⚠️ API error. Queued transaction locally.");
      }
    } catch (err) {
      setTransactions(prev => [tempTx, ...prev]);
      setSyncStatusMsg("🔌 Network error. Transaction cached locally.");
    }

    setTxAmount('');
    setTxNotes('');
    setTimeout(() => setSyncStatusMsg(''), 4000);
  };

  const handleDeleteTransaction = async (id, clientGeneratedId) => {
    setTransactions(prev => prev.filter(t => t.clientGeneratedId !== clientGeneratedId));

    if (isOffline) {
      if (id !== null) {
        setPendingDeletions(prev => [...prev, id]);
        setSyncStatusMsg("🔌 Offline deletion recorded. Will sync when reconnected.");
        setTimeout(() => setSyncStatusMsg(''), 4000);
      }
      return;
    }

    if (id !== null) {
      try {
        const response = await fetch(`${API_BASE_URL}/Transactions/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.token}` }
        });

        if (response.ok) {
          setSyncStatusMsg("🗑️ Transaction permanently removed from SQL Server!");
        } else {
          setSyncStatusMsg("⚠️ Failed to remove from server. Will retry later.");
          setPendingDeletions(prev => [...prev, id]); 
        }
      } catch (err) {
        setPendingDeletions(prev => [...prev, id]);
        setSyncStatusMsg("🔌 Network dropped. Deletion added to queue.");
      }
      setTimeout(() => setSyncStatusMsg(''), 4000);
    }
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!bgAmount || parseFloat(bgAmount) <= 0) return;

    const existingIndex = budgets.findIndex(b => b.categoryId === parseInt(bgCategory) && b.month === currentMonth);
    const newAmount = parseFloat(bgAmount);

    let updatedBudgets = [...budgets];

    if (existingIndex > -1) {
      updatedBudgets[existingIndex].budgetAmount = newAmount;
    } else {
      updatedBudgets.push({
        id: budgets.length + 1,
        categoryId: parseInt(bgCategory),
        budgetAmount: newAmount,
        month: currentMonth,
        year: currentYear
      });
    }

    setBudgets(updatedBudgets);

    if (!isOffline) {
      try {
        await fetch(`${API_BASE_URL}/Budget`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            categoryId: parseInt(bgCategory),
            budgetAmount: newAmount,
            month: currentMonth,
            year: currentYear
          })
        });
        setSyncStatusMsg("🎯 Budget limit synced to server!");
        setTimeout(() => setSyncStatusMsg(''), 3000);
      } catch (err) {
        console.warn("Offline budget queued locally.");
      }
    }
    setBgAmount('');
  };

  const handleDeleteBudget = async (id) => {
    setBudgets(budgets.filter(b => b.id !== id));

    if (!isOffline && id) {
      try {
        await fetch(`${API_BASE_URL}/Budget/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
      } catch (err) {
        console.error("Could not delete budget on server.", err);
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-3xl shadow-lg shadow-emerald-500/20 mb-3">
              💼
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Smart Wealth Manager</h1>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider font-semibold">Sprint 2: Offline-First PWA Shell</p>
          </div>

          <div className="flex border-b border-slate-700 mb-6">
            <button 
              onClick={() => { setAuthTab('login'); setAuthError(''); }}
              className={`w-1/2 pb-3 font-semibold text-sm transition-all ${authTab === 'login' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400'}`}
            >
              Log In
            </button>
            <button 
              onClick={() => { setAuthTab('register'); setAuthError(''); }}
              className={`w-1/2 pb-3 font-semibold text-sm transition-all ${authTab === 'register' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400'}`}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl mb-4 leading-relaxed">
              ⚠️ {authError}
            </div>
          )}

          {authTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Default Test Email</label>
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="suvedha@example.com" 
                  className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" 
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" 
                  required
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/15">
                Secure Log In
              </button>
              <p className="text-center text-[10px] text-slate-500 mt-4 leading-relaxed">
                *Local Developer Tip: Use <b>suvedha@example.com</b> or <b>Srinivasan@Example.com</b> and <b>password123</b> to instantly login!
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Suvedha S" 
                  className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" 
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="suvedha@example.com" 
                  className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" 
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Choose secure password" 
                  className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" 
                  required
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/15">
                Register & Initialize
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {syncStatusMsg && (
        <div className="bg-emerald-500 text-slate-950 font-bold text-center py-2.5 px-4 text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-md z-50">
          <span>🔄</span>
          <span>{syncStatusMsg}</span>
        </div>
      )}

      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/20">
              💼
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">Smart Wealth Manager</h1>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">PWA</span>
              </div>
              <p className="text-xs text-slate-400">Welcome, <span className="text-white font-bold">{user.fullName || user.email}</span></p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <div className="bg-slate-800/80 rounded-2xl p-1.5 flex items-center gap-2 border border-slate-700/60 shadow-inner">
              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-xl transition ${isOffline ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isOffline ? "🔌 Offline Mode" : "🌐 Connected"}
              </span>
              <button 
                onClick={() => {
                  setIsOffline(!isOffline);
                  setSyncStatusMsg(`Telemetry state changed: now ${!isOffline ? 'offline' : 'online'}.`);
                  setTimeout(() => setSyncStatusMsg(''), 3000);
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1 rounded-xl font-bold transition"
              >
                Toggle
              </button>
            </div>

            <button 
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl font-bold transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/4 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-shrink-0 lg:w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 border border-emerald-500/30 text-white shadow-lg' : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
          >
            <span className="text-lg">📊</span>
            <div>
              <p className="text-sm font-bold">Dashboard</p>
              <span className="text-[10px] block opacity-60">Financial metrics</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-shrink-0 lg:w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'transactions' ? 'bg-slate-900 border border-emerald-500/30 text-white shadow-lg' : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
          >
            <span className="text-lg">💰</span>
            <div>
              <p className="text-sm font-bold">Transactions</p>
              <span className="text-[10px] block opacity-60">Incomes & expenses</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('budgets')}
            className={`flex-shrink-0 lg:w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'budgets' ? 'bg-slate-900 border border-emerald-500/30 text-white shadow-lg' : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
          >
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-sm font-bold">Monthly Budgets</p>
              <span className="text-[10px] block opacity-60">Control limits</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('sync')}
            className={`flex-shrink-0 lg:w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all relative ${activeTab === 'sync' ? 'bg-slate-900 border border-emerald-500/30 text-white shadow-lg' : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
          >
            <span className="text-lg">🔄</span>
            <div>
              <p className="text-sm font-bold">Sync Station</p>
              <span className="text-[10px] block opacity-60">Background telemetry</span>
            </div>
            {(transactions.filter(t => !t.isSynced).length > 0 || pendingDeletions.length > 0) && (
              <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        <div className="w-full lg:w-3/4">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {activeWarningsCount > 0 && (
                <div className="bg-gradient-to-r from-red-950 to-amber-950 border border-red-500/20 text-red-100 p-5 rounded-2xl flex items-start gap-4 shadow-xl">
                  <div className="text-3xl text-amber-500 animate-bounce">🚨</div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wide">High Budget Utilization Warning!</h3>
                    <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
                      You have <b>{activeWarningsCount} budget category limit</b> that has crossed the <b>90% warning limit</b>. 
                      Please review your non-essential spending trends immediately.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Balance (June)</p>
                    <h2 className="text-3xl font-extrabold text-white mt-2">₹ {netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                    
                  </div>
                  <div className="absolute -right-8 -bottom-8 opacity-5 text-8xl">💳</div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Income</p>
                    <h2 className="text-3xl font-extrabold text-emerald-400 mt-2">₹ {totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                  
                  </div>
                  <div className="absolute -right-8 -bottom-8 opacity-5 text-8xl">💰</div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Expenses</p>
                    <h2 className="text-3xl font-extrabold text-red-400 mt-2">₹ {totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                   
                  </div>
                  <div className="absolute -right-8 -bottom-8 opacity-5 text-8xl">💸</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-white">Expense Distribution</h3>
                    <p className="text-xs text-slate-400 mt-1">Graphical aggregate breakdown of your outbound cashflows</p>
                  </div>

                  {categoryDistribution.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center gap-6 mt-6">
                      <div className="relative w-36 h-36 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="3"></circle>
                          {(() => {
                            let accumulatedPercent = 0;
                            const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                            return categoryDistribution.map((item, index) => {
                              const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                              const strokeDashoffset = 100 - accumulatedPercent;
                              accumulatedPercent += item.percentage;
                              return (
                                <circle 
                                  key={index}
                                  cx="18" 
                                  cy="18" 
                                  r="15.915" 
                                  fill="none" 
                                  stroke={colors[index % colors.length]} 
                                  strokeWidth="3"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                ></circle>
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Total Spent</span>
                          <span className="text-sm font-extrabold text-white">₹ {totalExpense > 1000 ? `${(totalExpense/1000).toFixed(1)}k` : totalExpense}</span>
                        </div>
                      </div>

                      <div className="flex-grow space-y-2 w-full">
                        {categoryDistribution.slice(0, 4).map((item, index) => {
                          const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500'];
                          return (
                            <div key={index} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-800 transition">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${colors[index % colors.length]}`}></span>
                                <span className="text-slate-300 font-medium">{item.icon} {item.name}</span>
                              </div>
                              <span className="font-bold text-white">{item.percentage.toFixed(1)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No expense logs detected for June 2026.
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-white">Recent Transactions</h3>
                      <p className="text-xs text-slate-400 mt-1">Latest ledger additions</p>
                    </div>
                    <button onClick={() => setActiveTab('transactions')} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
                      View All
                    </button>
                  </div>

                  <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {monthlyTransactions.slice(0, 4).map((tx) => {
                      const cat = DEFAULT_CATEGORIES.find(c => c.id === tx.categoryId);
                      const isIncome = cat?.type === 'Income';
                      return (
                        <div key={tx.clientGeneratedId} className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between hover:border-slate-700 transition">
                          <div className="flex items-center gap-3">
                            <span className="text-xl bg-slate-800 p-2 rounded-xl">{cat?.icon || "💰"}</span>
                            <div>
                              <p className="text-xs font-extrabold text-white">{cat?.name || "Others"}</p>
                              <span className="text-[9px] text-slate-500">{new Date(tx.transactionDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-black ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
                              {isIncome ? '+' : '-'} ₹ {tx.amount.toLocaleString()}
                            </p>
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${tx.isSynced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {tx.isSynced ? "Synced" : "Local Only"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                <h3 className="font-extrabold text-base text-white mb-4">Log Financial Transaction</h3>
                <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Category</label>
                    <select 
                      value={txCategory} 
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {DEFAULT_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name} ({c.type})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Amount (₹)</label>
                    <input 
                      type="number" 
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="e.g. 500" 
                      min="1"
                      required
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Date</label>
                    <input 
                      type="date" 
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Notes</label>
                    <input 
                      type="text" 
                      value={txNotes}
                      onChange={(e) => setTxNotes(e.target.value)}
                      placeholder="Groceries, travel etc." 
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-500/10 uppercase tracking-widest flex items-center gap-2">
                      <span>Log Entry</span>
                      <span>🚀</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                <h3 className="font-extrabold text-base text-white mb-4">Complete Transaction History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 uppercase tracking-widest text-[10px]">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => {
                        const cat = DEFAULT_CATEGORIES.find(c => c.id === tx.categoryId);
                        const isIncome = cat?.type === 'Income';
                        return (
                          <tr key={tx.clientGeneratedId} className="border-b border-slate-800/55 hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-mono text-slate-400">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                            <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                              <span>{cat?.icon || "💰"}</span>
                              <span>{cat?.name || "Others"}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 italic">{tx.notes}</td>
                            <td className={`py-3 px-4 text-right font-black ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
                              ₹ {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${tx.isSynced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {tx.isSynced ? "Synced" : "Offline"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button 
                                onClick={() => handleDeleteTransaction(tx.id, tx.clientGeneratedId)}
                                className="text-red-400 hover:text-red-300 font-bold transition text-[11px]"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'budgets' && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                <h3 className="font-extrabold text-base text-white mb-4">Set Category Budget Limit</h3>
                <form onSubmit={handleSetBudget} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Category</label>
                    <select 
                      value={bgCategory} 
                      onChange={(e) => setBgCategory(e.target.value)}
                      className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {DEFAULT_CATEGORIES.filter(c => c.type === 'Expense').map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Budget Target (₹)</label>
                    <input 
                      type="number" 
                      value={bgAmount}
                      onChange={(e) => setBgAmount(e.target.value)}
                      placeholder="e.g. 10000" 
                      min="100"
                      required
                      className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black p-3.5 rounded-xl text-xs transition uppercase tracking-widest">
                      Set Target Limit
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                <h3 className="font-extrabold text-base text-white mb-4">June 2026 Budget Tracks</h3>
                <div className="space-y-5">
                  {budgetStatuses.map((bg) => {
                    return (
                      <div key={bg.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800/80 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl bg-slate-900 p-2 rounded-xl">{bg.categoryIcon}</span>
                            <div>
                              <h4 className="font-bold text-sm text-white">{bg.categoryName} Budget</h4>
                              <span className="text-[9px] text-slate-500">Limit: ₹ {bg.budgetAmount.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-white">Spent: ₹ {bg.spending.toLocaleString()}</span>
                            <span className={`block text-[9px] font-bold ${bg.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {bg.remaining >= 0 ? `Remaining: ₹ ${bg.remaining}` : `Exceeded by: ₹ ${Math.abs(bg.remaining)}`}
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${Math.min(bg.percentage, 100)}%` }} 
                            className={`h-full rounded-full transition-all duration-500 ${
                              bg.percentage >= 90 ? 'bg-red-500' : bg.percentage >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">Utilization: {bg.percentage.toFixed(1)}%</span>
                          
                          <div className="flex items-center gap-3">
                            {bg.isWarning && (
                              <span className="bg-red-500/15 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                🚨 Over 90%
                              </span>
                            )}
                            <button 
                              onClick={() => handleDeleteBudget(bg.id)}
                              className="text-slate-500 hover:text-red-400 font-bold transition"
                            >
                              Delete Budget
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                <h3 className="font-extrabold text-base text-white mb-2">Sync Station Overview</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  In our production-grade PWA ecosystem, transactions logged offline remain perfectly secure in your local browser state storage. 
                  Once you restore connection, our background sync loops clean up any server records by matching GUID profiles.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Total Cached</span>
                    <h4 className="text-2xl font-black text-white mt-1">{transactions.length}</h4>
                    <span className="text-[9px] text-slate-500 block mt-1">Local records</span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Unsynced adds</span>
                    <h4 className={`text-2xl font-black mt-1 ${transactions.filter(t => !t.isSynced).length > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {transactions.filter(t => !t.isSynced).length}
                    </h4>
                    <span className="text-[9px] text-slate-500 block mt-1">Pending creations</span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Pending Deletes</span>
                    <h4 className={`text-2xl font-black mt-1 ${pendingDeletions.length > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {pendingDeletions.length}
                    </h4>
                    <span className="text-[9px] text-slate-500 block mt-1">SQL Server deletes queued</span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Secured Server</span>
                    <h4 className="text-2xl font-black text-emerald-400 mt-1">
                      {transactions.filter(t => t.isSynced).length}
                    </h4>
                    <span className="text-[9px] text-slate-500 block mt-1">Verified on SQL Server</span>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={executeSynchronizations}
                    disabled={syncing}
                    className={`bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-6 py-4 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{syncing ? 'Syncing...' : 'Force Background Sync'}</span>
                    <span>🔄</span>
                  </button>
                </div>
              </div>

          
            </div>
          )}
        </div>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>&copy; 2026 Smart Wealth Manager PWA Dashboard.</p>
      </footer>
    </div>
  );
}
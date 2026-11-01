import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, BookOpen, Settings, Sun, Moon, Search, Check, Power, Edit3, Wallet, TrendingUp, Activity, BellRing, ArrowUpCircle, ArrowDownCircle, PlusCircle, ShieldCheck, Server, Database, LogOut, UserCheck, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // State Modal Tambah Pelanggan
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custBlock, setCustBlock] = useState('');
  const [custPackage, setCustPackage] = useState('10mbps_150');
  const [custDueDate, setCustDueDate] = useState('10');

  // State Modal Edit Pelanggan
  const [showEditCustModal, setShowEditCustModal] = useState(false);
  const [editCustId, setEditCustId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBlock, setEditBlock] = useState('');
  const [editPackage, setEditPackage] = useState('10mbps_150');
  const [editDueDate, setEditDueDate] = useState('10');

  // State Modal Tambah Pengeluaran
  const [showAddExpModal, setShowAddExpModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Operasional');

  // State Multi-Admin Aktif
  const [activeAdmin, setActiveAdmin] = useState('Admin Utama');

  const date = new Date();
  const currentPeriodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const todayDay = date.getDate();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubCust = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a,b) => (a.block || '').localeCompare(b.block || ''));
      setCustomers(data);
    });

    const unsubExp = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setExpenses(data);
      setIsLoading(false);
    });

    return () => {
      unsubCust();
      unsubExp();
    };
  }, []);

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'customers', label: 'Pelanggan', icon: Users },
    { id: 'ledger', label: 'Buku Kas', icon: BookOpen },
    { id: 'settings', label: 'Admin', icon: Settings },
  ];

  const getPriceNumber = (pkgId) => {
    const packages = { '5mbps_100': 100000, '10mbps_150': 150000, '10mbps_180': 180000, '15mbps_200': 200000, '20mbps_250': 250000, '25mbps_300': 300000 };
    return packages[pkgId] || 150000;
  };
  const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Kalkulasi Statistik
  const activeCustomers = customers.filter(c => c.status === 'Aktif');
  const totalPotential = activeCustomers.reduce((sum, c) => sum + getPriceNumber(c.packageId), 0);
  const totalIncome = activeCustomers.filter(c => c.payments && c.payments[currentPeriodKey]).reduce((sum, c) => sum + getPriceNumber(c.packageId), 0);
  const unpaidCustomers = activeCustomers.filter(c => !c.payments || !c.payments[currentPeriodKey]);
  const dueToday = unpaidCustomers.filter(c => Number(c.dueDate) === todayDay);
  
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  // Handler Tambah Pelanggan
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!custName || !custBlock) return;
    try {
      await addDoc(collection(db, 'customers'), {
        name: custName,
        block: custBlock,
        packageId: custPackage,
        dueDate: Number(custDueDate),
        status: 'Aktif',
        createdAt: serverTimestamp()
      });
      setCustName('');
      setCustBlock('');
      setShowAddCustModal(false);
    } catch (err) {
      alert('Gagal menambah pelanggan: ' + err.message);
    }
  };

  // Handler Buka Modal Edit
  const openEditModal = (cust) => {
    setEditCustId(cust.id);
    setEditName(cust.name || '');
    setEditBlock(cust.block || '');
    setEditPackage(cust.packageId || '10mbps_150');
    setEditDueDate(cust.dueDate || 10);
    setShowEditCustModal(true);
  };

  // Handler Simpan Edit Pelanggan
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editCustId) return;
    try {
      const custRef = doc(db, 'customers', editCustId);
      await updateDoc(custRef, {
        name: editName,
        block: editBlock,
        packageId: editPackage,
        dueDate: Number(editDueDate)
      });
      setShowEditCustModal(false);
    } catch (err) {
      alert('Gagal memperbarui pelanggan: ' + err.message);
    }
  };

  // Handler Isolir Manual (Toggle Status Aktif / Non-Aktif)
  const toggleIsolir = async (cust) => {
    try {
      const custRef = doc(db, 'customers', cust.id);
      const newStatus = cust.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
      await updateDoc(custRef, { status: newStatus });
    } catch (err) {
      alert('Gagal mengubah status isolir: ' + err.message);
    }
  };

  // Handler Status Bayar
  const togglePayment = async (cust) => {
    try {
      const custRef = doc(db, 'customers', cust.id);
      const currentPayments = cust.payments || {};
      const isPaid = currentPayments[currentPeriodKey];
      
      const updatedPayments = {
        ...currentPayments,
        [currentPeriodKey]: !isPaid
      };

      await updateDoc(custRef, { payments: updatedPayments });
    } catch (err) {
      alert('Gagal mengubah status pembayaran: ' + err.message);
    }
  };

  // Handler Tambah Pengeluaran
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!desc || !amount) return;
    try {
      await addDoc(collection(db, 'expenses'), {
        desc,
        amount: Number(amount),
        category,
        createdAt: serverTimestamp(),
        dateStr: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      });
      setDesc('');
      setAmount('');
      setShowAddExpModal(false);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  // Filter Pencarian Pelanggan
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.block?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col relative pb-24 lg:pb-12 transition-colors duration-300">
      
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">M</div>
          <div>
            <h2 className="font-bold text-sm md:text-base leading-tight text-slate-800 dark:text-slate-100">MABUNET</h2>
            <p className="text-[10px] md:text-xs text-indigo-500 font-bold hidden sm:block">Real-time Cloud Gateway</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl hidden sm:inline-block">
            {activeAdmin}
          </span>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-7xl mx-auto pt-24 px-4">
        
        {/* 1. DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ringkasan Sistem</h1>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 text-slate-500 mb-3"><Users className="w-5 h-5 text-indigo-500"/> <span className="text-xs font-bold uppercase">Pelanggan</span></div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{customers.length}</h3>
                <p className="text-xs text-emerald-500 font-bold mt-1">{activeCustomers.length} Aktif</p>
              </div>
              
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 text-slate-500 mb-3"><Activity className="w-5 h-5 text-amber-500"/> <span className="text-xs font-bold uppercase">Potensi</span></div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">{formatIDR(totalPotential)}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Omset per bulan</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 text-slate-500 mb-3"><TrendingUp className="w-5 h-5 text-emerald-500"/> <span className="text-xs font-bold uppercase">Terbayar</span></div>
                <h3 className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatIDR(totalIncome)}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Pemasukan bulan ini</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 text-slate-500 mb-3"><Wallet className="w-5 h-5 text-rose-500"/> <span className="text-xs font-bold uppercase">Menunggu</span></div>
                <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400">{unpaidCustomers.length}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Belum lunas</p>
              </div>
            </div>

            {dueToday.length > 0 && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-5 rounded-3xl flex items-center gap-4 shadow-sm mt-6">
                <div className="p-3 bg-rose-200 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full animate-bounce"><BellRing className="w-6 h-6"/></div>
                <div>
                  <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400">Jatuh Tempo Hari Ini (Tgl {todayDay})</h3>
                  <p className="text-sm text-rose-600 dark:text-rose-300 mt-1">Ada <strong>{dueToday.length} pelanggan</strong> yang harus segera ditagih.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. PELANGGAN */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama atau blok..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-indigo-500 shadow-sm text-slate-800 dark:text-slate-100" 
                />
              </div>
              <button 
                onClick={() => setShowAddCustModal(true)}
                className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
              >
                + Tambah
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-10 animate-pulse font-medium text-slate-400">Sinkronisasi Cloud...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold">Tidak ada data pelanggan yang cocok.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map(cust => {
                  const isPaid = cust.payments && cust.payments[currentPeriodKey];
                  const isAktif = cust.status === 'Aktif';
                  return (
                    <div key={cust.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{cust.name}</h3>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg mt-1 inline-block">Blok {cust.block}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${isAktif ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                          {cust.status || 'Aktif'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-slate-500 text-[11px] font-semibold mb-0.5">Jatuh Tempo: Tgl {cust.dueDate}</p>
                          <p className="font-extrabold text-slate-800 dark:text-slate-100">{formatIDR(getPriceNumber(cust.packageId))}</p>
                        </div>
                        <button 
                          onClick={() => togglePayment(cust)}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${isPaid ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'border-slate-300 dark:border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-500'}`}
                        >
                          {isPaid ? <Check className="w-7 h-7" strokeWidth={3}/> : <span className="text-xs font-bold leading-tight text-center">Set<br/>Lunas</span>}
                        </button>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                        {/* Tombol Isolir Manual */}
                        <button 
                          onClick={() => toggleIsolir(cust)}
                          title={isAktif ? "Isolir Manual (Matikan)" : "Buka Isolir (Aktifkan)"}
                          className={`p-2.5 rounded-xl transition-colors ${isAktif ? 'bg-slate-50 dark:bg-slate-800/50 text-emerald-500 hover:bg-rose-100 hover:text-rose-600' : 'bg-rose-500 text-white shadow-md'}`}
                        >
                          <Power className="w-5 h-5"/>
                        </button>
                        {/* Tombol Edit Pelanggan */}
                        <button 
                          onClick={() => openEditModal(cust)}
                          title="Edit Pelanggan"
                          className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-500 hover:text-indigo-500 transition-colors"
                        >
                          <Edit3 className="w-5 h-5"/>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. BUKU KAS */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Buku Kas & Keuangan</h1>
              <button onClick={() => setShowAddExpModal(true)} className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 flex items-center gap-2 text-sm">
                <PlusCircle className="w-4 h-4"/> Catat Keluar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center"><ArrowUpCircle className="w-6 h-6"/></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Pemasukan</p>
                  <h3 className="text-xl font-black text-emerald-600 mt-0.5">{formatIDR(totalIncome)}</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 flex items-center justify-center"><ArrowDownCircle className="w-6 h-6"/></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Pengeluaran</p>
                  <h3 className="text-xl font-black text-rose-600 mt-0.5">{formatIDR(totalExpense)}</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center"><Wallet className="w-6 h-6"/></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Saldo Kas Bersih</p>
                  <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{formatIDR(netBalance)}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Riwayat Pengeluaran Operasional</h3>
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Belum ada catatan pengeluaran.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.map(exp => (
                    <div key={exp.id} className="py-3.5 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{exp.desc}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{exp.dateStr} • <span className="text-indigo-500 font-semibold">{exp.category}</span></p>
                      </div>
                      <span className="font-extrabold text-rose-600 text-sm">- {formatIDR(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. ADMIN & MULTI-ADMIN */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Panel Admin & Hak Akses</h1>

            {/* Pemilihan Multi-Admin */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Pilih Sesi Admin Aktif</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Admin Utama', 'Admin Zahra', 'Admin Fathir'].map(adminName => (
                  <button
                    key={adminName}
                    onClick={() => setActiveAdmin(adminName)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${activeAdmin === adminName ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    <div>
                      <p className="font-bold text-sm">{adminName}</p>
                      <p className={`text-[10px] mt-0.5 ${activeAdmin === adminName ? 'text-indigo-100' : 'text-slate-400'}`}>Hak Akses Penuh</p>
                    </div>
                    {activeAdmin === adminName && <UserCheck className="w-5 h-5"/>}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Sistem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl"><Server className="w-6 h-6"/></div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">Gateway MikroTik</h4>
                    <p className="text-xs text-emerald-500 font-bold">Terhubung (API Active)</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl"><Database className="w-6 h-6"/></div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">Firebase Firestore</h4>
                    <p className="text-xs text-emerald-500 font-bold">Sinkronisasi Cloud Aman</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL TAMBAH PELANGGAN */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tambah Pelanggan Baru</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nama Pelanggan</label>
                <input type="text" placeholder="Contoh: Budi Santoso" value={custName} onChange={e => setCustName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Blok / Alamat</label>
                <input type="text" placeholder="Contoh: Mabu Blok P11" value={custBlock} onChange={e => setCustBlock(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Pilih Paket</label>
                <select value={custPackage} onChange={e => setCustPackage(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100">
                  <option value="5mbps_100">5 Mbps - Rp 100.000</option>
                  <option value="10mbps_150">10 Mbps - Rp 150.000</option>
                  <option value="10mbps_180">10 Mbps - Rp 180.000</option>
                  <option value="15mbps_200">15 Mbps - Rp 200.000</option>
                  <option value="20mbps_250">20 Mbps - Rp 250.000</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Tanggal Jatuh Tempo (1-31)</label>
                <input type="number" min="1" max="31" value={custDueDate} onChange={e => setCustDueDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddCustModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-2xl text-slate-500">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PELANGGAN */}
      {showEditCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit Data Pelanggan</h3>
            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nama Pelanggan</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Blok / Alamat</label>
                <input type="text" value={editBlock} onChange={e => setEditBlock(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Pilih Paket</label>
                <select value={editPackage} onChange={e => setEditPackage(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100">
                  <option value="5mbps_100">5 Mbps - Rp 100.000</option>
                  <option value="10mbps_150">10 Mbps - Rp 150.000</option>
                  <option value="10mbps_180">10 Mbps - Rp 180.000</option>
                  <option value="15mbps_200">15 Mbps - Rp 200.000</option>
                  <option value="20mbps_250">20 Mbps - Rp 250.000</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Tanggal Jatuh Tempo (1-31)</label>
                <input type="number" min="1" max="31" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditCustModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-2xl text-slate-500">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PENGELUARAN */}
      {showAddExpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Catat Pengeluaran Baru</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Keterangan</label>
                <input type="text" placeholder="Contoh: Beli Kabel UTP" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nominal (Rp)</label>
                <input type="number" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Kategori</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none text-sm text-slate-800 dark:text-slate-100">
                  <option value="Operasional">Operasional / Jaringan</option>
                  <option value="Fam">Fam / Sosial</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddExpModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-2xl text-slate-500">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BALLOON MENU */}
      <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 z-50 flex items-center justify-between px-2 py-2 shadow-2xl rounded-full w-[90%] max-w-sm">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`relative flex flex-col items-center justify-center p-3.5 rounded-full transition-all duration-300 ${isActive ? 'text-white bg-indigo-600 shadow-lg transform -translate-y-2' : 'text-slate-400 hover:text-indigo-500'}`}>
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
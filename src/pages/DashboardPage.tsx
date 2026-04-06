import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Sparkles, 
  ShoppingBag, 
  FileText, 
  TrendingUp, 
  Clock, 
  LayoutGrid,
  ArrowUpRight,
  Loader2,
  Coins,
  Users,
  Database,
  Search,
  Filter,
  ChevronRight,
  Home,
  Palette,
  Eye,
  DollarSign,
  Package,
  Layers,
  CreditCard,
  Plus
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { SavedDesign } from '../types';
import { useFirebase } from '../components/FirebaseProvider';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { storage } from '../lib/storage';
import { onedriveService } from '../services/onedriveService';

const data = [
  { name: 'Mon', prompts: 4, rfq: 1 },
  { name: 'Tue', prompts: 7, rfq: 2 },
  { name: 'Wed', prompts: 5, rfq: 1 },
  { name: 'Thu', prompts: 12, rfq: 3 },
  { name: 'Fri', prompts: 8, rfq: 2 },
  { name: 'Sat', prompts: 15, rfq: 4 },
  { name: 'Sun', prompts: 9, rfq: 2 },
];

const COLORS = ['#EFBB76', '#000000', '#888888', '#CCCCCC'];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAuthReady, profileLoading } = useFirebase();
  const [designs, setDesigns] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msToken, setMsToken] = useState<string | null>(localStorage.getItem('ms_access_token'));
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  
  // Admin State
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPrompts, setAllPrompts] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allSamples, setAllSamples] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activePrompts: 0,
    savedDesigns: 0
  });

  const isAdmin = profile?.role === 'admin';
  const hasVisualization = !!storage.getSmall('rug_selected_variation') || !!localStorage.getItem('rug_selected_image');

  useEffect(() => {
    // Handle Microsoft OAuth Callback (Implicit Flow)
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setMsToken(token);
        localStorage.setItem('ms_access_token', token);
        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    const fetchData = async () => {
      if (!isAuthReady) return;
      
      if (user) {
        try {
          if (isAdmin) {
            // Fetch all data for admin
            const [usersSnap, promptsSnap, designsSnap, ordersSnap, samplesSnap] = await Promise.all([
              getDocs(collection(db, 'users')),
              getDocs(query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(50))),
              getDocs(query(collection(db, 'designs'), orderBy('createdAt', 'desc'), limit(50))),
              getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50))),
              getDocs(query(collection(db, 'sample_requests'), orderBy('createdAt', 'desc'), limit(50)))
            ]);

            const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const promptsData = promptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const designsData = designsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const ordersData = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const samplesData = samplesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setAllUsers(usersData);
            setAllPrompts(promptsData);
            setAllDesigns(designsData);
            setAllOrders(ordersData);
            setAllSamples(samplesData);

            setAdminStats({
              totalUsers: usersData.length,
              totalRevenue: ordersData.reduce((acc, curr: any) => acc + (curr.amount || 0), 0),
              activePrompts: promptsData.length,
              savedDesigns: designsData.length
            });
          }

          // Fetch user-specific designs
          const designsQ = query(
            collection(db, 'designs'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
          getDocs(designsQ).then(snapshot => {
            setDesigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }).catch(err => handleFirestoreError(err, OperationType.GET, 'designs'));

          // Fetch user-specific prompts
          const promptsQ = query(
            collection(db, 'prompts'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          getDocs(promptsQ).then(snapshot => {
            setPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }).catch(err => handleFirestoreError(err, OperationType.GET, 'prompts'));

          // Fetch user-specific orders
          const ordersQ = query(
            collection(db, 'orders'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          getDocs(ordersQ).then(snapshot => {
            setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }).catch(err => handleFirestoreError(err, OperationType.GET, 'orders'));

        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'dashboard');
        } finally {
          setLoading(false);
        }
      } else {
        // Guest fallback
        const saved = await storage.getLarge<any[]>('rug_saved_designs');
        setDesigns(saved || []);
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAuthReady, isAdmin]);

  const handleOneDriveSync = async (design: any) => {
    if (!msToken) {
      window.location.href = onedriveService.getAuthUrl();
      return;
    }

    setIsSyncing(design.id);
    try {
      // Fetch the image as a blob
      const response = await fetch(design.imageUrl);
      const blob = await response.blob();
      
      const fileName = `${design.name.replace(/\s+/g, '_')}_${design.id}.png`;
      await onedriveService.uploadDesign(msToken, fileName, blob);
      
      alert('Design successfully synced to OneDrive!');
    } catch (error: any) {
      console.error('OneDrive Sync Error:', error);
      if (error.message?.includes('Unauthorized') || error.message?.includes('expired')) {
        localStorage.removeItem('ms_access_token');
        setMsToken(null);
        alert('Microsoft session expired. Please connect again.');
      } else {
        alert('Failed to sync to OneDrive. Please try again.');
      }
    } finally {
      setIsSyncing(null);
    }
  };

  const dashboardNav = [
    { label: 'DESIGN', path: '/design', icon: <Palette className="w-4 h-4" /> },
    { label: 'VISUALIZE', path: '/visualizer', icon: <Eye className="w-4 h-4" /> },
    { label: 'PRICING', path: '/design-detail', icon: <DollarSign className="w-4 h-4" />, disabled: !hasVisualization },
    { label: 'SAMPLES', path: '/samples', icon: <Package className="w-4 h-4" /> },
    { label: 'CHECKOUT', path: '/checkout', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'COLLECTIONS', path: '/wishlist', icon: <Plus className="w-4 h-4" /> },
  ];

  const stats = [
    { label: 'Total Prompts', value: prompts.length.toString(), icon: <Sparkles className="w-5 h-5" />, trend: 'Real-time' },
    { label: 'Designs Saved', value: designs.length.toString(), icon: <LayoutGrid className="w-5 h-5" />, trend: 'Wishlist' },
    { label: 'Available Credits', value: profileLoading ? '...' : (profile?.credits?.toString() || '0'), icon: <Coins className="w-5 h-5" />, trend: 'Balance' },
    { label: 'Account Status', value: user ? 'Verified' : 'Guest', icon: <FileText className="w-5 h-5" />, trend: 'Profile' },
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#EFBB76]" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-6 py-12"
    >
      {/* Dashboard Navigation Bar */}
      <div className="mb-12 flex flex-wrap items-center justify-center gap-2 p-2 bg-black/5 rounded-[2rem] border border-black/5">
        {dashboardNav.map((item) => (
          item.disabled ? (
            <div 
              key={item.label}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black tracking-widest text-black/20 cursor-not-allowed"
            >
              {item.icon}
              {item.label}
            </div>
          ) : (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black tracking-widest transition-all ${
                location.pathname === item.path 
                  ? 'bg-black text-white shadow-lg' 
                  : 'text-black/60 hover:bg-black/10'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        ))}
      </div>

      {isAdmin ? (
        <div className="space-y-12">
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-serif font-bold text-black mb-2">Admin Control Center</h1>
              <p className="text-black/40 text-sm font-bold uppercase tracking-widest">Global platform oversight & user data</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-[#EFBB76]/10 text-[#EFBB76] px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-[#EFBB76]/20">
                <Users className="w-4 h-4" /> {allUsers.length} Users
              </div>
              <div className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                <Database className="w-4 h-4" /> System Healthy
              </div>
            </div>
          </header>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Users', value: adminStats.totalUsers, icon: <Users />, color: 'text-blue-600' },
              { label: 'Total Revenue', value: `$${adminStats.totalRevenue}`, icon: <DollarSign />, color: 'text-green-600' },
              { label: 'Active Prompts', value: adminStats.activePrompts, icon: <Sparkles />, color: 'text-[#EFBB76]' },
              { label: 'Saved Designs', value: adminStats.savedDesigns, icon: <Palette />, color: 'text-purple-600' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-black/10 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
                <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">{stat.label}</h3>
                <p className="text-3xl font-serif font-bold text-black">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Prompts (Admin) */}
            <div className="bg-white p-8 rounded-[3rem] border border-black/10 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-8 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#EFBB76]" /> Global Prompt Stream
              </h3>
              <div className="space-y-4">
                {allPrompts.map((p) => (
                  <div key={p.id} className="p-4 bg-black/5 rounded-2xl border border-black/5 flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-black/80 mb-1 italic">"{p.text}"</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">User: {p.userId.slice(0, 8)}...</span>
                        <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">•</span>
                        <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">
                          {p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Designs (Admin) */}
            <div className="bg-white p-8 rounded-[3rem] border border-black/10 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-8 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#EFBB76]" /> Recent Creations
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {allDesigns.slice(0, 6).map((design) => (
                  <div key={design.id} className="relative group rounded-2xl overflow-hidden aspect-square bg-black/5">
                    <img src={design.imageUrl} alt={design.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-[10px] font-bold text-white mb-1">{design.name}</p>
                      <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">User: {design.userId.slice(0, 8)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Admin Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Users List */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/10 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-black/5 pb-4">User Directory</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {allUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EFBB76]/10 flex items-center justify-center font-bold text-[#EFBB76]">
                        {u.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{u.displayName || 'Anonymous'}</p>
                        <p className="text-[10px] text-black/40">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#EFBB76]">{u.tier || 'Free'}</p>
                      <p className="text-[10px] text-black/40">{u.credits} Credits</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompts Tracking */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/10 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-black/5 pb-4">Recent Prompts</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {allPrompts.map((p: any) => (
                  <div key={p.id} className="p-4 bg-black/5 rounded-2xl space-y-2">
                    <p className="text-xs font-medium italic">"{p.text}"</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-black/20">
                        {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-[#EFBB76]">
                        UID: {p.userId?.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved Designs */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/10 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-black/5 pb-4">Global Designs</h3>
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {allDesigns.map((d: any) => (
                  <div key={d.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-black/10">
                    <img src={d.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-[8px] text-white font-bold uppercase tracking-widest mb-1">{d.config?.construction}</p>
                      <p className="text-[8px] text-[#EFBB76] font-bold uppercase tracking-widest">By: {d.userId?.slice(0, 8)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Requests & Deposits */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/10 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-black/5 pb-4">Requests & Deposits</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {/* Sample Requests */}
                {allSamples.map((s: any) => (
                  <div key={s.id} className="p-4 bg-[#EFBB76]/5 border border-[#EFBB76]/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-[#EFBB76]" />
                      <div>
                        <p className="text-xs font-bold">Sample Request</p>
                        <p className="text-[10px] text-black/40">{s.userEmail}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-[#EFBB76] text-black text-[8px] font-black uppercase tracking-widest rounded-full">
                      {s.status}
                    </span>
                  </div>
                ))}
                {/* Orders/Deposits */}
                {allOrders.map((o: any) => (
                  <div key={o.id} className="p-4 bg-black/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-black/40" />
                      <div>
                        <p className="text-xs font-bold">{o.type}</p>
                        <p className="text-[10px] text-black/40">${o.amount} - {o.status}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-black/20">
                      {o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-serif font-bold text-black mb-2">Welcome Back, Designer</h1>
              <p className="text-black/40 text-sm font-bold uppercase tracking-widest">Overview of your creative activity</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (msToken) {
                    localStorage.removeItem('ms_access_token');
                    setMsToken(null);
                  } else {
                    window.location.href = onedriveService.getAuthUrl();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  msToken ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_logo_%282019%E2%80%93present%29.svg" alt="OneDrive" className="w-4 h-4" />
                {msToken ? 'OneDrive Connected' : 'Connect OneDrive'}
              </button>
              <div className="flex items-center gap-2 bg-black/5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                <Clock className="w-4 h-4 text-[#EFBB76]" /> Last Sync: Just Now
              </div>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white p-8 rounded-3xl border border-black/10 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center text-[#EFBB76]">
                    {stat.icon}
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'bg-green-100 text-green-600' : 'bg-black/5 text-black/40'}`}>
                    {stat.trend}
                  </span>
                </div>
                <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">{stat.label}</h3>
                <p className="text-3xl font-serif font-bold text-black">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Profile & Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Profile Card */}
            <div className="bg-white p-8 rounded-[3rem] border border-black/10 shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-black/5 rounded-full overflow-hidden mb-6 border-4 border-[#EFBB76]/20">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#EFBB76] text-black font-black text-2xl">
                    {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-serif font-bold text-black mb-1">{user?.displayName || 'Designer'}</h3>
              <p className="text-xs text-black/40 font-bold mb-6">{user?.email || 'Guest User'}</p>
              
              <div className="w-full grid grid-cols-2 gap-4 pt-6 border-t border-black/5">
                <div>
                  <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest block mb-1">Member Since</span>
                  <p className="text-[10px] font-bold text-black">Mar 2026</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest block mb-1">Tier</span>
                  <p className="text-[10px] font-bold text-[#EFBB76] uppercase">{profile?.tier || 'FREE'}</p>
                </div>
              </div>
            </div>

            {/* Activity Chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-black/10 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#EFBB76]" /> Weekly Activity
                </h3>
                <select className="bg-black/5 border-none rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorPrompts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EFBB76" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EFBB76" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="prompts" 
                      stroke="#EFBB76" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrompts)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Prompts */}
            <div className="bg-white p-8 rounded-[3rem] border border-black/10 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-8">Your Prompts</h3>
              <div className="space-y-4">
                {prompts.length > 0 ? (
                  prompts.map((p) => (
                    <div key={p.id} className="p-4 bg-black/5 rounded-2xl border border-black/5">
                      <p className="text-[10px] font-bold text-black/60 line-clamp-2 italic mb-2">"{p.text}"</p>
                      <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">
                        {p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-xs font-bold text-black/20 uppercase tracking-widest">No prompts yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Wishlist */}
            <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] border border-black/10 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-8">Your Wishlist</h3>
              <div className="space-y-6">
                {designs.length > 0 ? (
                  designs.slice(0, 4).map((design) => (
                    <div 
                      key={design.id} 
                      className="flex items-start gap-4 group"
                    >
                      <div 
                        onClick={() => navigate(`/design-detail/${design.id}`)}
                        className="w-12 h-12 bg-black/5 rounded-xl overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-[#EFBB76] transition-all cursor-pointer"
                      >
                        <img 
                          src={design.imageUrl} 
                          alt={design.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 border-b border-black/5 pb-4">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-black/80 line-clamp-1">{design.name}</p>
                          <button 
                            onClick={() => handleOneDriveSync(design)}
                            disabled={isSyncing === design.id}
                            className="text-[#EFBB76] hover:text-[#DBA762] transition-colors"
                            title="Sync to OneDrive"
                          >
                            {isSyncing === design.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_logo_%282019%E2%80%93present%29.svg" alt="OneDrive" className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">
                          {design.createdAt ? new Date(design.createdAt).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <ArrowUpRight 
                        onClick={() => navigate(`/design-detail/${design.id}`)}
                        className="w-4 h-4 text-black/10 group-hover:text-[#EFBB76] transition-colors cursor-pointer" 
                      />
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-xs font-bold text-black/20 uppercase tracking-widest">No designs yet</p>
                  </div>
                )}
              </div>
              <button 
                onClick={() => navigate('/wishlist')}
                className="w-full mt-8 py-3 bg-black/5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/10 transition-colors"
              >
                View All Designs
              </button>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-[3rem] border border-black/10 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-black/5">
              <h3 className="text-sm font-bold uppercase tracking-widest">Recent Order Updates</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black/5">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Order ID</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Date</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-8 py-6 text-xs font-bold">#{order.id.slice(-6).toUpperCase()}</td>
                        <td className="px-8 py-6 text-xs text-black/40 font-bold">
                          {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            order.status === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-[#EFBB76]/10 text-[#EFBB76]'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-[#EFBB76]">{order.type}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-xs font-bold text-black/20 uppercase tracking-widest">
                        No active orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

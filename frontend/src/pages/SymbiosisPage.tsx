import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Zap, Camera, Clock, ShieldCheck, AlertTriangle, 
  Download, RefreshCw, Layers, CheckCircle2, ChevronRight,
  Activity, ArrowUpRight, GitMerge, FileText, BarChart2,
  Search, Filter, Plus, MapPin, Truck, TrendingUp, Leaf, 
  DollarSign, Droplets, Building, Send, Package, Check, X, 
  Eye, ArrowRight, Navigation, Compass, Info, Award
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend
} from 'recharts';
import { 
  Machine, SymbiosisEvaluation, 
  SymbiosisMaterialListing, SymbiosisSynergyMatch, 
  SymbiosisImpactMetrics, SymbiosisFactoryNode, SymbiosisTradeInquiry,
  CreateSymbiosisListingPayload, CreateSymbiosisInquiryPayload
} from '../types';
import { api } from '../services/api';

interface SymbiosisPageProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
}

type SubTab = 'matches' | 'marketplace' | 'analytics' | 'map' | 'deals' | 'fusion';

export const SymbiosisPage: React.FC<SymbiosisPageProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
}) => {
  // Navigation & Active Sub-Tab
  const [activeTab, setActiveTab] = useState<SubTab>('matches');
  const [activeCompanyId, setActiveCompanyId] = useState<string>('comp_udyon');

  // Predictive Diagnostics State
  const [evaluation, setEvaluation] = useState<SymbiosisEvaluation | null>(null);
  const [loadingFusion, setLoadingFusion] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Symbiosis AI Synergy Matching State
  const [matchStream, setMatchStream] = useState<'waste' | 'required'>('waste');
  const [minMatchScore, setMinMatchScore] = useState<number>(60);
  const [maxDistance, setMaxDistance] = useState<number>(500);
  const [producedMatches, setProducedMatches] = useState<SymbiosisSynergyMatch[]>([]);
  const [requiredMatches, setRequiredMatches] = useState<SymbiosisSynergyMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(false);

  // Marketplace State
  const [listings, setListings] = useState<SymbiosisMaterialListing[]>([]);
  const [marketFilterType, setMarketFilterType] = useState<string>('all');
  const [marketFilterCategory, setMarketFilterCategory] = useState<string>('all');
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [loadingMarket, setLoadingMarket] = useState<boolean>(false);

  // Analytics & Map & Inquiries State
  const [impactMetrics, setImpactMetrics] = useState<SymbiosisImpactMetrics | null>(null);
  const [factories, setFactories] = useState<SymbiosisFactoryNode[]>([]);
  const [selectedFactory, setSelectedFactory] = useState<SymbiosisFactoryNode | null>(null);
  const [inquiries, setInquiries] = useState<SymbiosisTradeInquiry[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Modals
  const [isPostListingOpen, setIsPostListingOpen] = useState<boolean>(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState<boolean>(false);
  const [targetListingForInquiry, setTargetListingForInquiry] = useState<SymbiosisMaterialListing | null>(null);

  // Form States
  const [newListingForm, setNewListingForm] = useState<CreateSymbiosisListingPayload>({
    title: '',
    type: 'waste',
    materialType: 'Steel Stamping Scrap',
    category: 'Metals & Metallurgy',
    description: '',
    quantity: 100,
    unit: 'Metric Tons',
    quality: { purity: 95, moisture: 2 },
    hazardous: 'non-hazardous',
    availability: 'continuous',
    pricing: { amount: 30000, unit: 'per MT', type: 'negotiable' }
  });

  const [inquiryForm, setInquiryForm] = useState<{
    quantity: number;
    offeredPrice: number;
    logistics: string;
    message: string;
  }>({
    quantity: 50,
    offeredPrice: 30000,
    logistics: 'Buyer Arranges Flatbed Trailer Transport',
    message: 'We are interested in establishing a recurring circular supply agreement.'
  });

  const currentMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  // Load Initial Data
  useEffect(() => {
    loadFusionData();
    loadMatches();
    loadMarketplace();
    loadImpactMetrics();
    loadFactories();
    loadInquiries();
  }, [activeCompanyId, currentMachine?.id]);

  const loadFusionData = async () => {
    if (!currentMachine) return;
    setLoadingFusion(true);
    try {
      const res = await api.getLatestSymbiosis(currentMachine.id);
      setEvaluation(res);
    } catch (err: any) {
      console.error('Error fetching Symbiosis fusion data:', err);
    } finally {
      setLoadingFusion(false);
    }
  };

  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await api.getSymbiosisMatches(activeCompanyId, minMatchScore, maxDistance);
      setProducedMatches(res.producedWasteMatches || []);
      setRequiredMatches(res.requiredMaterialMatches || []);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadMarketplace = async () => {
    setLoadingMarket(true);
    try {
      const res = await api.getSymbiosisMaterials({
        type: marketFilterType,
        category: marketFilterCategory,
        search: marketSearch
      });
      setListings(res.listings || []);
    } catch (err: any) {
      console.error('Error fetching marketplace listings:', err);
    } finally {
      setLoadingMarket(false);
    }
  };

  const loadImpactMetrics = async () => {
    try {
      const res = await api.getSymbiosisImpact(activeCompanyId);
      setImpactMetrics(res.metrics);
    } catch (err: any) {
      console.error('Error fetching impact metrics:', err);
    }
  };

  const loadFactories = async () => {
    try {
      const res = await api.getSymbiosisFactories();
      setFactories(res.factories || []);
      if (res.factories && res.factories.length > 0 && !selectedFactory) {
        setSelectedFactory(res.factories[0]);
      }
    } catch (err: any) {
      console.error('Error fetching factories:', err);
    }
  };

  const loadInquiries = async () => {
    try {
      const res = await api.getSymbiosisInquiries();
      setInquiries(res.inquiries || []);
    } catch (err: any) {
      console.error('Error fetching inquiries:', err);
    }
  };

  // Multimodal Fusion Handlers
  const handleRunEvaluation = async () => {
    if (!currentMachine) return;
    setIsEvaluating(true);
    setStatusMessage('Running Symbiosis Multimodal Fusion: Cross-referencing TENG telemetry, CV defect maps, and operational logs...');
    try {
      const res = await api.evaluateSymbiosis(currentMachine.id);
      setEvaluation(res);
      setStatusMessage(`Fusion complete: Composite health score evaluated at ${res.composite_health_index.toFixed(1)}%.`);
    } catch (err: any) {
      setStatusMessage(`Evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentMachine) return;
    setIsDownloading(true);
    setStatusMessage('Compiling final high-fidelity multimodal engineering PDF report...');
    try {
      const url = api.getReportDownloadUrl(currentMachine.id);
      const res = await fetch(url);
      if (!res.ok) throw new Error('PDF compilation failed on server');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Udyon_Multimodal_Report_${currentMachine.asset_tag}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setStatusMessage('Engineering inspection report downloaded successfully.');
    } catch (err: any) {
      setStatusMessage(`Download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Submit New Listing
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createSymbiosisListing(newListingForm);
      setStatusMessage(`Successfully published: "${res.listing.title}" on the circular marketplace!`);
      setIsPostListingOpen(false);
      loadMarketplace();
      loadMatches();
    } catch (err: any) {
      setStatusMessage(`Failed to create listing: ${err.message}`);
    }
  };

  // Submit Inquiry / Trade Proposal
  const handleOpenInquiry = (listing: SymbiosisMaterialListing) => {
    setTargetListingForInquiry(listing);
    setInquiryForm({
      quantity: listing.quantity,
      offeredPrice: listing.pricing?.amount || 1000,
      logistics: 'Buyer Arranges Transport Logistics',
      message: `Greetings from Udyon Precision. We are interested in procuring ${listing.quantity} ${listing.unit} of ${listing.materialType}.`
    });
    setIsInquiryModalOpen(true);
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetListingForInquiry) return;
    try {
      const payload: CreateSymbiosisInquiryPayload = {
        listingId: targetListingForInquiry.id,
        quantityRequested: inquiryForm.quantity,
        offeredPrice: inquiryForm.offeredPrice,
        logisticsType: inquiryForm.logistics,
        initialMessage: inquiryForm.message
      };
      const res = await api.createSymbiosisInquiry(payload);
      setStatusMessage(`Trade proposal submitted to ${targetListingForInquiry.companyName}! Tracking deal #${res.inquiry.id}`);
      setIsInquiryModalOpen(false);
      loadInquiries();
      setActiveTab('deals');
    } catch (err: any) {
      setStatusMessage(`Failed to submit trade proposal: ${err.message}`);
    }
  };

  const currentMatches = matchStream === 'waste' ? producedMatches : requiredMatches;

  return (
    <div className="space-y-6">
      {/* Top Header & Integrated Facility Context */}
      <div className="p-6 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-l from-[#FF5E1E]/10 via-[#00F0FF]/5 to-transparent pointer-events-none rounded-tr-2xl" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF5E1E]/20 via-[#FF8A3D]/15 to-[#00F0FF]/10 border border-[#FF5E1E]/40 flex items-center justify-center text-[#FF7A00] shadow-[0_0_28px_rgba(255,94,30,0.3)]">
              <Sparkles className="w-7 h-7 text-[#FF7A00]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
                  Symbiosis AI — Circular Synergy & Waste Exchange Platform
                </h1>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#251A14] text-[#FF7A00] border border-[#FF5E1E]/30 uppercase tracking-widest font-bold">
                  Zero-Waste Industrial Ecology
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Autonomous cross-industry byproduct matching, circular marketplace trading, decarbonization ESG analytics, and predictive asset fusion.
              </p>
            </div>
          </div>

          {/* Active Facility Context Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-[#1C2028] px-3.5 py-2 rounded-xl border border-white/10">
              <Building className="w-4 h-4 text-[#FF7A00]" />
              <label htmlFor="active-plant-select" className="text-xs text-slate-400 font-medium whitespace-nowrap">Active Facility:</label>
              <select
                id="active-plant-select"
                value={activeCompanyId}
                onChange={(e) => setActiveCompanyId(e.target.value)}
                className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="comp_udyon" className="bg-[#1C2028] text-white">Udyon Precision (Chennai Hub)</option>
                <option value="comp_techsteel" className="bg-[#1C2028] text-white">TechSteel Smelting (Salem)</option>
                <option value="comp_bharatcement" className="bg-[#1C2028] text-white">Bharat Ultratech (Coimbatore)</option>
                <option value="comp_ecopolymer" className="bg-[#1C2028] text-white">EcoPolymer Solutions (Hosur)</option>
                <option value="comp_greenchem" className="bg-[#1C2028] text-white">Apex Green Chemicals (Ranipet)</option>
              </select>
            </div>

            <button
              onClick={() => setIsPostListingOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D] text-[#0F1115] hover:brightness-110 shadow-[0_0_20px_rgba(255,94,30,0.35)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Post Material Listing</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto mt-6 pt-4 border-t border-white/10 scrollbar-none">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'matches'
                ? 'bg-gradient-to-r from-[#FF5E1E]/20 to-[#FF8A3D]/10 text-[#FF8A3D] border border-[#FF5E1E]/40 shadow-[0_0_15px_rgba(255,94,30,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>AI Synergy Matchmaker</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FF5E1E]/20 text-[#FF7A00] font-mono">
              {producedMatches.length + requiredMatches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'marketplace'
                ? 'bg-gradient-to-r from-[#FF5E1E]/20 to-[#FF8A3D]/10 text-[#FF8A3D] border border-[#FF5E1E]/40 shadow-[0_0_15px_rgba(255,94,30,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Circular Marketplace</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {listings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-[#FF5E1E]/20 to-[#FF8A3D]/10 text-[#FF8A3D] border border-[#FF5E1E]/40 shadow-[0_0_15px_rgba(255,94,30,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>ESG & Decarbonization</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-gradient-to-r from-[#FF5E1E]/20 to-[#FF8A3D]/10 text-[#FF8A3D] border border-[#FF5E1E]/40 shadow-[0_0_15px_rgba(255,94,30,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Industrial Cluster Map</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              {factories.length} Plants
            </span>
          </button>

          <button
            onClick={() => setActiveTab('deals')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'deals'
                ? 'bg-gradient-to-r from-[#FF5E1E]/20 to-[#FF8A3D]/10 text-[#FF8A3D] border border-[#FF5E1E]/40 shadow-[0_0_15px_rgba(255,94,30,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Trade Deals & Logistics</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
              {inquiries.length} Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fusion')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'fusion'
                ? 'bg-gradient-to-r from-[#FF5E1E]/20 to-[#FF8A3D]/10 text-[#FF8A3D] border border-[#FF5E1E]/40 shadow-[0_0_15px_rgba(255,94,30,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Predictive Asset Fusion</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FF5E1E]/20 text-[#FF7A00] font-mono">
              TENG + CV
            </span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-[#221713]/90 border border-[#FF5E1E]/40 text-xs text-[#FF9E66] flex items-center justify-between shadow-xl animate-fade-in">
          <span className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E1E] shadow-[0_0_10px_rgba(255,94,30,0.9)] animate-ping" />
            <span className="font-medium">{statusMessage}</span>
          </span>
          <button 
            onClick={() => setStatusMessage('')} 
            className="text-[#FF7A00] hover:text-white font-bold ml-3 p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: AI SYNERGY MATCHMAKER
         ========================================================================= */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Stream Selector */}
            <div className="flex items-center bg-[#1C2028] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setMatchStream('waste')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                  matchStream === 'waste'
                    ? 'bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D] text-[#0F1115] shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Need Your Waste ({producedMatches.length})</span>
              </button>
              <button
                onClick={() => setMatchStream('required')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                  matchStream === 'required'
                    ? 'bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D] text-[#0F1115] shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Produce What You Need ({requiredMatches.length})</span>
              </button>
            </div>

            {/* Sliders: Match Score & Distance */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-medium">Min Match Score:</span>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={minMatchScore}
                  onChange={(e) => setMinMatchScore(Number(e.target.value))}
                  onMouseUp={loadMatches}
                  className="w-24 accent-[#FF5E1E] cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-[#FF8A3D] w-8">{minMatchScore}%</span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-medium">Max Haulage:</span>
                <input
                  type="range"
                  min="50"
                  max="600"
                  step="50"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  onMouseUp={loadMatches}
                  className="w-24 accent-[#00F0FF] cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-cyan-400 w-14">{maxDistance} km</span>
              </div>

              <button
                onClick={loadMatches}
                disabled={loadingMatches}
                className="p-2 rounded-xl bg-[#1C2028] hover:bg-[#252B36] border border-white/10 text-slate-300 hover:text-white transition-colors"
                title="Refresh Synergies"
              >
                <RefreshCw className={`w-4 h-4 ${loadingMatches ? 'animate-spin text-[#FF7A00]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Matches Grid */}
          {loadingMatches ? (
            <div className="p-16 text-center rounded-2xl bg-[#161920]/60 border border-white/10">
              <RefreshCw className="w-8 h-8 text-[#FF7A00] animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">Calculating circular synergy correlations...</p>
              <p className="text-xs text-slate-500 mt-1">Cross-referencing material specifications, quantity alignment, and geospatial haulage logistics.</p>
            </div>
          ) : currentMatches.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-[#161920]/60 border border-white/10">
              <Filter className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Synergies Found with Current Filters</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Try reducing the minimum match score or expanding the maximum haulage distance to discover regional industrial partners.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {currentMatches.map((match) => {
                const scoreColor = 
                  match.matchScore >= 90 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' :
                  match.matchScore >= 75 ? 'text-[#FF8A3D] border-[#FF5E1E]/30 bg-[#2A1810]/60' :
                  'text-amber-400 border-amber-500/30 bg-amber-950/40';

                return (
                  <div
                    key={match.matchId}
                    className="p-6 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 hover:border-[#FF5E1E]/40 transition-all shadow-xl hover:shadow-[0_8px_30px_rgba(255,94,30,0.15)] flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Card Header: Score, Company & Distance */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                              {match.industryType}
                            </span>
                            <span className="text-xs font-mono text-cyan-400 flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{match.city}, {match.state} ({match.distanceKm} km)</span>
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mt-1.5 font-sans">
                            {match.companyName}
                          </h3>
                        </div>

                        {/* Match Score Gauge */}
                        <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center ${scoreColor}`}>
                          <span className="text-xl font-mono font-extrabold">{match.matchScore}%</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Synergy Score</span>
                        </div>
                      </div>

                      {/* Material Transformation Flow */}
                      <div className="mt-4 p-4 rounded-xl bg-[#1C2028] border border-white/5 space-y-3">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Material Exchange Route</span>
                          <span className="text-[#FF7A00] font-mono">
                            {match.synergyType === 'outbound_byproduct' ? 'Your Byproduct -> Consumer' : 'Supplier -> Your Demand'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[10px] text-slate-400 block">Producer Material:</span>
                            <span className="font-bold text-white block mt-0.5">{match.producerMaterial.materialType}</span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {match.producerMaterial.quantity} {match.producerMaterial.unit}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[10px] text-slate-400 block">Consumer Requirement:</span>
                            <span className="font-bold text-white block mt-0.5">{match.consumerRequirement.materialType}</span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {match.consumerRequirement.quantity} {match.consumerRequirement.unit}
                            </span>
                          </div>
                        </div>

                        {/* Compatibility Factors */}
                        <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                          {match.matchFactors.map((factor, idx) => (
                            <span 
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-mono flex items-center space-x-1"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>{factor}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Environmental & Financial Impact Box */}
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                          <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                            <Leaf className="w-3 h-3 text-emerald-400" />
                            <span>CO2 Saved</span>
                          </span>
                          <span className="text-sm font-mono font-bold text-emerald-400 block mt-1">
                            {match.environmentalImpact.co2SavedTons} MT
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                          <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                            <TrendingUp className="w-3 h-3 text-[#FF7A00]" />
                            <span>Landfill Offset</span>
                          </span>
                          <span className="text-sm font-mono font-bold text-[#FF8A3D] block mt-1">
                            {match.environmentalImpact.landfillDivertedTons} MT
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                          <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                            <DollarSign className="w-3 h-3 text-cyan-400" />
                            <span>Est. Savings</span>
                          </span>
                          <span className="text-sm font-mono font-bold text-cyan-400 block mt-1">
                            ₹{(match.estimatedAnnualSavingsINR / 100000).toFixed(1)}L/yr
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        const mockListing: SymbiosisMaterialListing = {
                          id: `match_${match.matchId}`,
                          title: `${match.producerMaterial.materialType} Circular Synergy Contract`,
                          companyId: match.companyId,
                          companyName: match.companyName,
                          city: match.city,
                          state: match.state,
                          coordinates: { latitude: 0, longitude: 0 },
                          type: match.synergyType === 'outbound_byproduct' ? 'waste' : 'requirement',
                          materialType: match.producerMaterial.materialType,
                          category: match.producerMaterial.category,
                          description: `Direct symbiotic match discovered between ${match.companyName} and Udyon.`,
                          quantity: match.producerMaterial.quantity,
                          unit: match.producerMaterial.unit,
                          quality: { purity: 95 },
                          hazardous: 'non-hazardous',
                          availability: 'continuous',
                          pricing: match.producerMaterial.pricing,
                          verified: true,
                          views: 45,
                          inquiries: 3,
                          createdAt: new Date().toISOString()
                        };
                        handleOpenInquiry(mockListing);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D] text-[#0F1115] font-bold text-xs hover:brightness-110 shadow-md transition-all flex items-center justify-center space-x-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Initiate Circular Trade Deal</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: CIRCULAR MATERIALS MARKETPLACE
         ========================================================================= */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Search, Filter Chips & Post CTA */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by material (e.g. Fly Ash, Steel Scrap, HDPE, Gypsum)..."
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadMarketplace()}
                  className="w-full bg-[#1C2028] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium">Type:</span>
                <select
                  value={marketFilterType}
                  onChange={(e) => {
                    setMarketFilterType(e.target.value);
                  }}
                  className="bg-[#1C2028] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                >
                  <option value="all">All Listings</option>
                  <option value="waste">Byproducts Available (Waste)</option>
                  <option value="requirement">Feedstock Needed (Demand)</option>
                </select>

                <button
                  onClick={loadMarketplace}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                'all',
                'Metals & Metallurgy',
                'Construction & Minerals',
                'Plastics & Polymers',
                'Chemical Byproducts',
                'Agricultural & Biomass'
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setMarketFilterCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    marketFilterCategory === cat
                      ? 'bg-[#FF5E1E]/20 text-[#FF8A3D] border border-[#FF5E1E]/40 font-bold'
                      : 'bg-[#1C2028] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Listings Grid */}
          {loadingMarket ? (
            <div className="p-16 text-center rounded-2xl bg-[#161920]/60 border border-white/10">
              <RefreshCw className="w-8 h-8 text-[#FF7A00] animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">Fetching verified industrial listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-[#161920]/60 border border-white/10">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Marketplace Listings Match Criteria</h3>
              <p className="text-xs text-slate-400 mt-1">Be the first to publish an industrial byproduct or feedstock requirement!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((item) => {
                const isWaste = item.type === 'waste';

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 hover:border-[#FF5E1E]/40 transition-all shadow-xl flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                          isWaste 
                            ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800' 
                            : 'bg-cyan-950/70 text-cyan-400 border-cyan-800'
                        }`}>
                          {isWaste ? 'Byproduct Available' : 'Feedstock Needed'}
                        </span>

                        {item.verified && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800 flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified Plant</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-base font-bold text-white mt-3 line-clamp-1 font-sans">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Technical Specs & Pricing */}
                      <div className="mt-4 p-3 rounded-xl bg-[#1C2028] border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Available Volume:</span>
                          <span className="font-mono font-bold text-white">{item.quantity} {item.unit}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Target Valuation:</span>
                          <span className="font-mono font-bold text-[#FF8A3D]">
                            ₹{item.pricing?.amount?.toLocaleString() || 'Negotiable'} {item.pricing?.unit}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Purity / Moisture:</span>
                          <span className="font-mono text-slate-200">
                            {item.quality?.purity ? `${item.quality.purity}% Purity` : 'Standard Grade'}
                            {item.quality?.moisture ? ` • ${item.quality.moisture}% H2O` : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                          <span className="text-slate-400">Facility Location:</span>
                          <span className="text-slate-300 font-medium">{item.city}, {item.state}</span>
                        </div>
                      </div>

                      {/* Origin Company */}
                      <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                        <span className="truncate">{item.companyName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{item.views} views</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleOpenInquiry(item)}
                      className="w-full py-2.5 rounded-xl bg-[#1C2028] hover:bg-[#252B36] border border-[#FF5E1E]/40 text-[#FF8A3D] hover:text-white font-bold text-xs transition-all flex items-center justify-center space-x-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isWaste ? 'Propose Purchase / Bid' : 'Supply Requirement'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: ESG & CIRCULAR DECARBONIZATION ANALYTICS
         ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key ESG Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#161920]/90 border border-white/10 shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Landfill Diverted</span>
              <div className="flex items-baseline space-x-1 mt-2">
                <span className="text-2xl font-mono font-extrabold text-emerald-400">
                  {impactMetrics?.landfillDivertedTons.toLocaleString() || '2,890'}
                </span>
                <span className="text-xs text-slate-500">MT</span>
              </div>
              <span className="text-[10px] text-emerald-500/80 font-mono mt-1 block">Zero-Waste diverted</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161920]/90 border border-white/10 shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CO2 Avoided</span>
              <div className="flex items-baseline space-x-1 mt-2">
                <span className="text-2xl font-mono font-extrabold text-[#FF8A3D]">
                  {impactMetrics?.co2EmissionsAvoidedTons.toLocaleString() || '4,120'}
                </span>
                <span className="text-xs text-slate-500">tCO2e</span>
              </div>
              <span className="text-[10px] text-[#FF8A3D]/80 font-mono mt-1 block">Scope 3 decarbonization</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161920]/90 border border-white/10 shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Financial Savings</span>
              <div className="flex items-baseline space-x-1 mt-2">
                <span className="text-2xl font-mono font-extrabold text-cyan-400">
                  ₹{(impactMetrics ? impactMetrics.totalCostSavingsINR / 10000000 : 4.82).toFixed(2)}
                </span>
                <span className="text-xs text-slate-500">Cr</span>
              </div>
              <span className="text-[10px] text-cyan-500/80 font-mono mt-1 block">Raw material cost offset</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161920]/90 border border-white/10 shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Water Conserved</span>
              <div className="flex items-baseline space-x-1 mt-2">
                <span className="text-2xl font-mono font-extrabold text-blue-400">
                  {impactMetrics?.waterConservedKiloliters.toLocaleString() || '18,400'}
                </span>
                <span className="text-xs text-slate-500">kL</span>
              </div>
              <span className="text-[10px] text-blue-500/80 font-mono mt-1 block">Industrial cooling offset</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161920]/90 border border-white/10 shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Energy Saved</span>
              <div className="flex items-baseline space-x-1 mt-2">
                <span className="text-2xl font-mono font-extrabold text-yellow-400">
                  {impactMetrics?.energyConservedGJ.toLocaleString() || '12,650'}
                </span>
                <span className="text-xs text-slate-500">GJ</span>
              </div>
              <span className="text-[10px] text-yellow-500/80 font-mono mt-1 block">Embodied energy retained</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161920]/90 border border-white/10 shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Circularity Index</span>
              <div className="flex items-baseline space-x-1 mt-2">
                <span className="text-2xl font-mono font-extrabold text-purple-400">
                  {impactMetrics?.circularityIndexPct || '84.6'}%
                </span>
              </div>
              <span className="text-[10px] text-purple-500/80 font-mono mt-1 block">Facility circularity score</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend Chart */}
            <div className="p-6 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Monthly Byproduct Flow & Decarbonization</h3>
                  <p className="text-xs text-slate-400">Metric tons exchanged vs CO2 saved over the past 6 months</p>
                </div>
                <TrendingUp className="w-5 h-5 text-[#FF7A00]" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={impactMetrics?.monthlyTrends || [
                    { month: 'May 2026', exchangedTons: 380, co2SavedTons: 460, savingsLakhs: 52 },
                    { month: 'Jun 2026', exchangedTons: 450, co2SavedTons: 540, savingsLakhs: 64 },
                    { month: 'Jul 2026', exchangedTons: 520, co2SavedTons: 620, savingsLakhs: 75 },
                    { month: 'Aug 2026', exchangedTons: 610, co2SavedTons: 730, savingsLakhs: 88 },
                    { month: 'Sep 2026', exchangedTons: 680, co2SavedTons: 820, savingsLakhs: 96 },
                    { month: 'Oct 2026', exchangedTons: 780, co2SavedTons: 950, savingsLakhs: 107 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D333F" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1C2028', borderColor: '#FF5E1E', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="exchangedTons" fill="#FF5E1E" name="Materials Exchanged (MT)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="co2SavedTons" fill="#00F0FF" name="CO2 Saved (MT)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown Donut Chart */}
            <div className="p-6 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Exchanged Byproducts by Category</h3>
                  <p className="text-xs text-slate-400">Share of materials recycled across industrial clusters</p>
                </div>
                <Leaf className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={impactMetrics?.categoryBreakdown || [
                        { category: 'Metals & Metallurgy', tonnage: 1350, percentage: 39.5 },
                        { category: 'Construction & Minerals', tonnage: 1100, percentage: 32.2 },
                        { category: 'Chemical Byproducts', tonnage: 450, percentage: 13.2 },
                        { category: 'Plastics & Polymers', tonnage: 320, percentage: 9.3 },
                        { category: 'Agricultural Biomass', tonnage: 200, percentage: 5.8 }
                      ]}
                      dataKey="tonnage"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {['#FF5E1E', '#00F0FF', '#10B981', '#A855F7', '#F59E0B'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1C2028', borderColor: '#FF5E1E', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tangible Real-World Environmental Equivalents */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#161920] via-[#1C2028] to-[#161920] border border-white/10 shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Real-World Decarbonization Equivalencies (EPA & IPCC Validated)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center justify-center">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-mono font-bold text-white">68,400</span>
                  <p className="text-xs text-slate-400">Mature tree seedlings planted & grown for 10 years</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#2A1810] text-[#FF8A3D] border border-[#FF5E1E]/40 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-mono font-bold text-white">892</span>
                  <p className="text-xs text-slate-400">Gasoline passenger vehicles removed from roads annually</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-mono font-bold text-white">1,420</span>
                  <p className="text-xs text-slate-400">Indian households provided with 100% clean electricity for 1 year</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: INDUSTRIAL LOGISTICS & CLUSTER MAP
         ========================================================================= */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Schematic Cluster Map Canvas */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Tamil Nadu Industrial Cluster Logistics Belt</h3>
                    <p className="text-xs text-slate-400">Haulage routes and verified production nodes across the corridor</p>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-[#251A14] text-[#FF7A00] border border-[#FF5E1E]/30">
                    Live Telemetry Grid
                  </span>
                </div>

                {/* SVG Visual Schematic */}
                <div className="relative w-full h-80 bg-[#0B0D11] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-4">
                  {/* Subtle Grid Background */}
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 1px 1px, #FF5E1E 1px, transparent 0)',
                      backgroundSize: '24px 24px'
                    }}
                  />

                  {/* SVG Nodes and Connections */}
                  <svg className="w-full h-full relative z-10" viewBox="0 0 600 300">
                    {/* Connection Lines from Chennai Hub (480, 70) */}
                    <line x1="480" y1="70" x2="160" y2="240" stroke="#FF5E1E" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                    <line x1="480" y1="70" x2="260" y2="180" stroke="#FF5E1E" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                    <line x1="480" y1="70" x2="230" y2="100" stroke="#FF5E1E" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                    <line x1="480" y1="70" x2="380" y2="90" stroke="#FF5E1E" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                    <line x1="480" y1="70" x2="200" y2="210" stroke="#FF5E1E" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />

                    {/* Nodes */}
                    {/* 1. Chennai (Udyon Hub) */}
                    <g 
                      className="cursor-pointer group"
                      onClick={() => setSelectedFactory(factories.find(f => f.id === 'comp_udyon') || null)}
                    >
                      <circle cx="480" cy="70" r="14" fill="#FF5E1E" fillOpacity="0.25" className="animate-ping" />
                      <circle cx="480" cy="70" r="9" fill="#FF5E1E" stroke="#FFF" strokeWidth="2" />
                      <text x="480" y="50" fill="#FFF" fontSize="11" fontWeight="bold" textAnchor="middle">Chennai Hub (Udyon)</text>
                    </g>

                    {/* 2. Ranipet (Apex Green Chemicals) */}
                    <g 
                      className="cursor-pointer group"
                      onClick={() => setSelectedFactory(factories.find(f => f.id === 'comp_greenchem') || null)}
                    >
                      <circle cx="380" cy="90" r="7" fill="#00F0FF" stroke="#FFF" strokeWidth="1.5" />
                      <text x="380" y="112" fill="#94A3B8" fontSize="10" textAnchor="middle">Ranipet (110 km)</text>
                    </g>

                    {/* 3. Hosur (EcoPolymer) */}
                    <g 
                      className="cursor-pointer group"
                      onClick={() => setSelectedFactory(factories.find(f => f.id === 'comp_ecopolymer') || null)}
                    >
                      <circle cx="230" cy="100" r="7" fill="#10B981" stroke="#FFF" strokeWidth="1.5" />
                      <text x="230" y="122" fill="#94A3B8" fontSize="10" textAnchor="middle">Hosur (295 km)</text>
                    </g>

                    {/* 4. Salem (TechSteel) */}
                    <g 
                      className="cursor-pointer group"
                      onClick={() => setSelectedFactory(factories.find(f => f.id === 'comp_techsteel') || null)}
                    >
                      <circle cx="260" cy="180" r="7" fill="#F59E0B" stroke="#FFF" strokeWidth="1.5" />
                      <text x="260" y="202" fill="#94A3B8" fontSize="10" textAnchor="middle">Salem (340 km)</text>
                    </g>

                    {/* 5. Tiruppur (Kovai BioEnergy) */}
                    <g 
                      className="cursor-pointer group"
                      onClick={() => setSelectedFactory(factories.find(f => f.id === 'comp_tiruppurbio') || null)}
                    >
                      <circle cx="200" cy="210" r="6" fill="#A855F7" stroke="#FFF" strokeWidth="1.5" />
                      <text x="200" y="232" fill="#94A3B8" fontSize="10" textAnchor="middle">Tiruppur (440 km)</text>
                    </g>

                    {/* 6. Coimbatore (Bharat Ultratech) */}
                    <g 
                      className="cursor-pointer group"
                      onClick={() => setSelectedFactory(factories.find(f => f.id === 'comp_bharatcement') || null)}
                    >
                      <circle cx="160" cy="240" r="7" fill="#00F0FF" stroke="#FFF" strokeWidth="1.5" />
                      <text x="160" y="262" fill="#94A3B8" fontSize="10" textAnchor="middle">Coimbatore (495 km)</text>
                    </g>
                  </svg>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-3 text-center">
                Click on any node on the radar grid to inspect participating facility specifications, available byproducts, and haulage transit.
              </p>
            </div>

            {/* Selected Factory Node Inspector */}
            <div className="p-6 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
              {selectedFactory ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Verified Cluster Node
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-2 font-sans">
                      {selectedFactory.companyName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedFactory.industryType} • {selectedFactory.city}, {selectedFactory.state}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1C2028] border border-white/5 space-y-3">
                    <div className="text-xs flex items-center justify-between">
                      <span className="text-slate-400">GPS Coordinates:</span>
                      <span className="font-mono text-cyan-400 text-[11px]">
                        {selectedFactory.coordinates.latitude.toFixed(4)}°N, {selectedFactory.coordinates.longitude.toFixed(4)}°E
                      </span>
                    </div>

                    <div className="text-xs flex items-center justify-between">
                      <span className="text-slate-400">Cluster Status:</span>
                      <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active Exchange Hub</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-2">Exchanged Industrial Materials:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFactory.materialsExchanged.map((mat, i) => (
                        <span 
                          key={i}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-[#251A14] text-[#FF8A3D] border border-[#FF5E1E]/30 font-medium"
                        >
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('matches');
                      setActiveCompanyId(selectedFactory.id);
                    }}
                    className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D] text-[#0F1115] font-bold text-xs hover:brightness-110 shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>View Synergies for this Plant</span>
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Compass className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Select any facility on the map to inspect details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: TRADE DEALS & ACTIVE LOGISTICS
         ========================================================================= */}
      {activeTab === 'deals' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Active Circular Deals & Material Transit Pipeline</h3>
              <p className="text-xs text-slate-400">Track purchase proposals, sample inspections, and weighbridge dispatches</p>
            </div>
            <button
              onClick={loadInquiries}
              className="px-3.5 py-2 rounded-xl bg-[#1C2028] hover:bg-[#252B36] border border-white/10 text-xs font-semibold text-slate-200 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Deals</span>
            </button>
          </div>

          <div className="space-y-4">
            {inquiries.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-[#161920]/60 border border-white/10">
                <Truck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white">No Active Trade Negotiations</h4>
                <p className="text-xs text-slate-400 mt-1">Initiate a circular trade from the Synergies or Marketplace tabs.</p>
              </div>
            ) : (
              inquiries.map((inq) => {
                const statusStyles = {
                  ACCEPTED: 'bg-emerald-950 text-emerald-400 border-emerald-800',
                  IN_TRANSIT: 'bg-blue-950 text-blue-400 border-blue-800',
                  NEGOTIATING: 'bg-amber-950 text-amber-400 border-amber-800',
                  PROPOSED: 'bg-[#2A1810] text-[#FF8A3D] border-[#FF5E1E]/40',
                  COMPLETED: 'bg-purple-950 text-purple-400 border-purple-800'
                }[inq.status] || 'bg-slate-800 text-slate-300 border-slate-700';

                return (
                  <div
                    key={inq.id}
                    className="p-5 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 hover:border-[#FF5E1E]/40 transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                          {inq.id}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusStyles}`}>
                          {inq.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(inq.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white font-sans">
                        {inq.materialTitle}
                      </h4>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>Buyer: <strong className="text-white">{inq.buyerCompanyName}</strong></span>
                        <span>Seller: <strong className="text-white">{inq.sellerCompanyName}</strong></span>
                        <span>Logistics: <span className="text-cyan-400">{inq.logisticsType}</span></span>
                      </div>

                      <p className="text-xs text-slate-300 bg-[#1C2028] p-2.5 rounded-xl border border-white/5 mt-2 italic">
                        "{inq.latestMessage}"
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6 min-w-[160px]">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Total Consignment:</span>
                        <span className="text-base font-mono font-bold text-white">
                          {inq.quantityRequested} {inq.unit}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#FF8A3D] block mt-0.5">
                          ₹{(inq.offeredPrice * inq.quantityRequested).toLocaleString()}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono">
                        (₹{inq.offeredPrice.toLocaleString()}/{inq.unit.includes('Tons') ? 'MT' : inq.unit})
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: MULTIMODAL PREDICTIVE DIAGNOSTICS (Original Udyon Fusion)
         ========================================================================= */}
      {activeTab === 'fusion' && (
        <div className="space-y-6">
          {/* Action Controls & Machine Picker */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161920]/85 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold text-white">Cross-Modal Machine Degradation Diagnostics</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Correlating continuous TENG kinetic telemetry, optical defect segmentations, and machine operational lifecycle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <label htmlFor="symbiosis-asset-select" className="text-xs text-slate-400 font-medium">Asset:</label>
                <select
                  id="symbiosis-asset-select"
                  value={currentMachine?.id || ''}
                  onChange={(e) => onSelectMachine(e.target.value)}
                  className="bg-[#1C2028] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#FF5E1E] min-h-[38px]"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.asset_tag})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D] text-[#0F1115] hover:brightness-110 shadow-[0_0_20px_rgba(255,94,30,0.35)] min-h-[38px] transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                <span>{isEvaluating ? 'Evaluating...' : 'Re-run Fusion'}</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1C2028] hover:bg-[#252B36] border border-[#FF5E1E]/40 text-[#FF9E66] min-h-[38px] transition-all shadow-md"
              >
                <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>{isDownloading ? 'Compiling PDF...' : 'Download PDF Report'}</span>
              </button>
            </div>
          </div>

          {/* Primary KPI Row: Composite Health, Severity, Confidence, Fault Cause */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Composite Health Index */}
            <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Composite Health Index</span>
                <ShieldCheck className={`w-4 h-4 ${(evaluation?.composite_health_index ?? 85) < 70 ? 'text-rose-400' : 'text-emerald-400'}`} />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className={`text-3xl font-extrabold font-mono ${
                  (evaluation?.composite_health_index ?? 85) < 70 ? 'text-rose-400' : (evaluation?.composite_health_index ?? 85) < 85 ? 'text-[#FF8A3D]' : 'text-emerald-400'
                }`}>
                  {(evaluation?.composite_health_index ?? 85).toFixed(1)}%
                </span>
                <span className="text-xs text-slate-500">Cross-modal weighted</span>
              </div>
              <div className="w-full bg-[#242A35] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (evaluation?.composite_health_index ?? 85) < 70 ? 'bg-rose-500' : (evaluation?.composite_health_index ?? 85) < 85 ? 'bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D]' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, evaluation?.composite_health_index ?? 85))}%` }}
                />
              </div>
            </div>

            {/* Overall Severity */}
            <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Overall Fault Severity</span>
                <AlertTriangle className={`w-4 h-4 ${(evaluation?.overall_severity ?? 'HEALTHY') === 'CRITICAL' ? 'text-rose-400' : 'text-[#FF7A00]'}`} />
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  (evaluation?.overall_severity ?? 'HEALTHY') === 'CRITICAL' ? 'bg-rose-950/80 text-rose-400 border border-rose-800' :
                  (evaluation?.overall_severity ?? 'HEALTHY') === 'HIGH' ? 'bg-[#2A1810] text-[#FF5E1E] border border-[#FF5E1E]/40' :
                  (evaluation?.overall_severity ?? 'HEALTHY') === 'MEDIUM' ? 'bg-yellow-950/80 text-yellow-400 border border-yellow-800' :
                  'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                }`}>
                  {evaluation?.overall_severity ?? 'HEALTHY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Aggregated impact across sensor shock + visual surface degradation.
              </p>
            </div>

            {/* Model Confidence */}
            <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Fusion Confidence</span>
                <Activity className="w-4 h-4 text-[#FF7A00]" />
              </div>
              <div className="text-3xl font-extrabold font-mono text-[#FF7A00]">
                {((evaluation?.confidence_score ?? 0.88) * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Harmonic agreement across multimodal evidence vectors.
              </p>
            </div>

            {/* Primary Root Cause */}
            <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Primary Fault Diagnosis</span>
                <GitMerge className="w-4 h-4 text-[#FF7A00]" />
              </div>
              <div className="text-sm font-bold text-white leading-tight font-sans line-clamp-2">
                {evaluation?.primary_fault_cause ?? 'No Critical Anomaly Detected'}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Verified through cross-modal telemetry correlation.
              </p>
            </div>
          </div>

          {/* Multimodal Vector Breakdown & Cross-Modal Correlations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attribution Breakdown Donut */}
            <div className="p-6 rounded-2xl bg-[#161920]/85 backdrop-blur-xl border border-white/10 shadow-xl">
              <h3 className="text-base font-bold text-white mb-1">Diagnostic Modality Attribution</h3>
              <p className="text-xs text-slate-400 mb-4">Relative weighting of sensor vs computer vision vs asset history</p>

              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'TENG Vibration Sensors', value: evaluation?.attribution_breakdown?.teng_sensor_pct ?? 45, color: '#FF5E1E' },
                        { name: 'AI Visual Inspection', value: evaluation?.attribution_breakdown?.visual_inspection_pct ?? 35, color: '#FF8A3D' },
                        { name: 'Machine History Logs', value: evaluation?.attribution_breakdown?.machine_history_pct ?? 20, color: '#00F0FF' }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {['#FF5E1E', '#FF8A3D', '#00F0FF'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1C2028', borderColor: '#FF5E1E', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cross-Modal Correlations List */}
            <div className="p-6 rounded-2xl bg-[#161920]/85 backdrop-blur-xl border border-white/10 shadow-xl">
              <h3 className="text-base font-bold text-white mb-1">Cross-Modal Fault Correlations</h3>
              <p className="text-xs text-slate-400 mb-4">Correlations detected between kinetic waveforms & optical defect maps</p>

              <div className="space-y-3 overflow-y-auto max-h-60 pr-1">
                {(evaluation?.cross_modal_correlations || []).map((corr, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#1C2028] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{corr.correlation_type}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF5E1E]/20 text-[#FF8A3D] font-bold">
                        {corr.significance}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{corr.explanation}</p>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-white/5">
                      <span>Signal: {corr.signal}</span>
                      <span>CV Defect: {corr.visual_defect}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Engineering Actions */}
          <div className="p-6 rounded-2xl bg-[#161920]/85 backdrop-blur-xl border border-white/10 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Prescribed Predictive Actions</h3>
            <p className="text-xs text-slate-400 mb-4">Action plan compiled by the Symbiosis AI reasoning engine</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Action Title</th>
                    <th className="py-2.5 px-3">Action Specification</th>
                    <th className="py-2.5 px-3">Timeframe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(evaluation?.recommended_actions || []).map((act, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          act.priority === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                          act.priority === 'HIGH' ? 'bg-[#2A1810] text-[#FF5E1E] border border-[#FF5E1E]/40' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {act.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">{act.title}</td>
                      <td className="py-2.5 px-3 text-slate-300">{act.action}</td>
                      <td className="py-2.5 px-3 font-mono text-[#FF7A00] font-semibold">{act.timeframe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: POST MATERIAL LISTING MODAL
         ========================================================================= */}
      {isPostListingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#161920] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPostListingOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#251A14] text-[#FF7A00] border border-[#FF5E1E]/30 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Publish Circular Material Listing</h3>
                <p className="text-xs text-slate-400">List an industrial byproduct or specify raw material requirement</p>
              </div>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Listing Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uncontaminated Structural Fly Ash Class F"
                  value={newListingForm.title}
                  onChange={(e) => setNewListingForm({ ...newListingForm, title: e.target.value })}
                  className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Listing Type</label>
                  <select
                    value={newListingForm.type}
                    onChange={(e) => setNewListingForm({ ...newListingForm, type: e.target.value as any })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  >
                    <option value="waste">Byproduct Available (Waste Output)</option>
                    <option value="requirement">Feedstock Required (Raw Input)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={newListingForm.category}
                    onChange={(e) => setNewListingForm({ ...newListingForm, category: e.target.value })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  >
                    <option value="Metals & Metallurgy">Metals & Metallurgy</option>
                    <option value="Construction & Minerals">Construction & Minerals</option>
                    <option value="Plastics & Polymers">Plastics & Polymers</option>
                    <option value="Chemical Byproducts">Chemical Byproducts</option>
                    <option value="Agricultural & Biomass">Agricultural & Biomass</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Material Name</label>
                  <input
                    type="text"
                    required
                    value={newListingForm.materialType}
                    onChange={(e) => setNewListingForm({ ...newListingForm, materialType: e.target.value })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newListingForm.quantity}
                    onChange={(e) => setNewListingForm({ ...newListingForm, quantity: Number(e.target.value) })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={newListingForm.unit}
                    onChange={(e) => setNewListingForm({ ...newListingForm, unit: e.target.value })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target Price (₹)</label>
                  <input
                    type="number"
                    value={newListingForm.pricing?.amount || 0}
                    onChange={(e) => setNewListingForm({
                      ...newListingForm,
                      pricing: { amount: Number(e.target.value), unit: 'per MT', type: 'fixed' }
                    })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Purity (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newListingForm.quality?.purity || 95}
                    onChange={(e) => setNewListingForm({
                      ...newListingForm,
                      quality: { ...newListingForm.quality, purity: Number(e.target.value) }
                    })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Technical Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail chemical composition, moisture levels, pickup conditions, and origin facility..."
                  value={newListingForm.description}
                  onChange={(e) => setNewListingForm({ ...newListingForm, description: e.target.value })}
                  className="w-full bg-[#1C2028] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPostListingOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D] text-[#0F1115] font-bold text-xs hover:brightness-110 shadow-lg"
                >
                  Publish to Network
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: SEND TRADE PROPOSAL / INQUIRY MODAL
         ========================================================================= */}
      {isInquiryModalOpen && targetListingForInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#161920] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsInquiryModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5E1E]/20 to-[#00F0FF]/20 border border-[#FF5E1E]/30 flex items-center justify-center text-[#FF7A00]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Initiate Circular Trade Deal</h3>
                <p className="text-xs text-slate-400">Direct proposal to {targetListingForInquiry.companyName}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C2028] border border-white/5 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Material:</span>
                <span className="font-bold text-white">{targetListingForInquiry.materialType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Listed Valuation:</span>
                <span className="font-mono text-[#FF8A3D]">
                  ₹{targetListingForInquiry.pricing?.amount?.toLocaleString()} {targetListingForInquiry.pricing?.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Destination:</span>
                <span className="text-slate-300">{targetListingForInquiry.city}, {targetListingForInquiry.state}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Volume Desired ({targetListingForInquiry.unit})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={inquiryForm.quantity}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, quantity: Number(e.target.value) })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Offer Price per Unit (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={inquiryForm.offeredPrice}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, offeredPrice: Number(e.target.value) })}
                    className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Logistics Arrangement</label>
                <select
                  value={inquiryForm.logistics}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, logistics: e.target.value })}
                  className="w-full bg-[#1C2028] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                >
                  <option value="Buyer Arranges Flatbed Trailer Transport">Buyer Arranges Flatbed Trailer Transport</option>
                  <option value="Pneumatic Bulk Bulker Tanker Dispatch">Pneumatic Bulk Bulker Tanker Dispatch</option>
                  <option value="Covered Tipper Truck Delivery">Covered Tipper Truck Delivery</option>
                  <option value="Ex-Works Factory Gate Pickup">Ex-Works Factory Gate Pickup</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Commercial Message / Specs</label>
                <textarea
                  rows={3}
                  required
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                  className="w-full bg-[#1C2028] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsInquiryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E1E] to-[#FF8A3D] text-[#0F1115] font-bold text-xs hover:brightness-110 shadow-lg flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Trade Bid</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

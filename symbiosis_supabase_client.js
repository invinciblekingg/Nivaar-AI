/**
 * ==============================================================================
 * SYMBIOSIS.AI -- SECURE SUPABASE CONNECTOR & DATA INTEGRATION MODULE
 * Allows Symbiosis.AI to connect to the unified Supabase project shared with Udyon.
 * Single source of truth for:
 *   - Machinery telemetry & byproduct potentials
 *   - Circular marketplace waste listings & raw material demands
 *   - AI synergy matches & cross-facility trade negotiations
 * ==============================================================================
 *
 * Usage in Symbiosis.AI (Node.js or Browser):
 *
 * 1. Install or load Supabase:
 *    Node.js: npm install @supabase/supabase-js
 *    HTML/Browser: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * 2. Configure credentials (stored in your .env or script config):
 *    SUPABASE_URL = "https://riwhpkqyhinysukujzfe.supabase.co"
 *    SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */

// If running in Node.js environment:
let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  // If running in browser window:
  if (typeof window !== 'undefined' && window.supabase) {
    createClient = window.supabase.createClient;
  }
}

const SUPABASE_CONFIG = {
  url: process?.env?.SUPABASE_URL || 'https://riwhpkqyhinysukujzfe.supabase.co',
  anonKey: process?.env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpd2hwa3F5aGlueXN1a3VqemZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjE3NDEsImV4cCI6MjEwODMzNzc0MX0.8kqFwFNWi7r5jw0lBeOXM1NcEypsgEH9N53fJ9UfKXU'
};

const supabase = createClient ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey) : null;

const SymbiosisConnector = {
  client: supabase,

  /**
   * 1. Query Udyon machinery telemetry and byproduct sources
   */
  async getMonitoredEquipment() {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('machines')
      .select('id, name, category, asset_tag, location_label, status, health_index')
      .order('health_index', { ascending: true });
    if (error) throw error;
    return data;
  },

  /**
   * 2. Query Circular Economy Marketplace Listings
   * Filter by type: 'waste' (byproduct for sale) or 'requirement' (material demand)
   */
  async getMarketplaceMaterials(filterType = null, category = null) {
    if (!supabase) throw new Error('Supabase client not initialized');
    let query = supabase.from('symbiosis_materials').select('*');
    if (filterType) query = query.eq('type', filterType);
    if (category) query = query.eq('category', category);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  /**
   * 3. Publish a new Waste Byproduct or Material Requirement
   * Automatically reflects in both Symbiosis.AI and Udyon
   */
  async publishMaterialListing(listing) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const id = listing.id || `list_${Date.now()}`;
    const payload = {
      id: id,
      title: listing.title,
      company_id: listing.companyId || 'comp_external',
      company_name: listing.companyName,
      type: listing.type, // 'waste' or 'requirement'
      material_type: listing.materialType,
      category: listing.category,
      description: listing.description || '',
      quantity: Number(listing.quantity),
      unit: listing.unit || 'Metric Tons',
      quality: listing.quality || {},
      pricing: listing.pricing || {},
      hazardous: listing.hazardous || 'non-hazardous',
      availability: listing.availability || 'continuous',
      verified: true,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('symbiosis_materials')
      .upsert(payload, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data;
  },

  /**
   * 4. Save Symbiosis.AI Synergy Match Results
   * Records cross-plant compatibility and carbon/financial savings
   */
  async saveSynergyMatch(match) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const payload = {
      id: match.id || `match_${Date.now()}`,
      producer_listing_id: match.producerListingId,
      consumer_listing_id: match.consumerListingId,
      producer_company: match.producerCompany,
      consumer_company: match.consumerCompany,
      material_type: match.materialType,
      compatibility_score: match.compatibilityScore,
      distance_km: match.distanceKm,
      co2_reduction_tonnes: match.co2ReductionTonnes || 0,
      annual_cost_savings_inr: match.annualCostSavingsINR || 0,
      status: match.status || 'IDENTIFIED',
      matching_factors: match.matchingFactors || [],
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('symbiosis_matches')
      .upsert(payload, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data;
  },

  /**
   * 5. Dispatch or reply to Trade Inquiries & Negotiation Threads
   */
  async sendTradeInquiry(inquiry) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const payload = {
      id: inquiry.id || `inq_${Date.now()}`,
      listing_id: inquiry.listingId,
      material_title: inquiry.materialTitle,
      buyer_company_id: inquiry.buyerCompanyId,
      buyer_company_name: inquiry.buyerCompanyName,
      seller_company_id: inquiry.sellerCompanyId,
      seller_company_name: inquiry.sellerCompanyName,
      quantity_requested: Number(inquiry.quantityRequested),
      unit: inquiry.unit || 'Metric Tons',
      offered_price: Number(inquiry.offeredPrice),
      status: inquiry.status || 'PROPOSED',
      logistics_type: inquiry.logisticsType || 'Buyer Organized Freight',
      latest_message: inquiry.latestMessage || '',
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('symbiosis_inquiries')
      .upsert(payload, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data;
  },

  /**
   * 6. Real-Time Listener: Listen for newly registered byproducts in real-time
   */
  subscribeToNewMaterials(callback) {
    if (!supabase) throw new Error('Supabase client not initialized');
    return supabase
      .channel('symbiosis_realtime_materials')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'symbiosis_materials' },
        (payload) => callback(payload)
      )
      .subscribe();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SymbiosisConnector, supabase };
}

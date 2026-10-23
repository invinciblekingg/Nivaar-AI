import math
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

router = APIRouter(prefix="/symbiosis/marketplace", tags=["Symbiosis.AI -- Industrial Waste Marketplace & Synergy Engine"])

# --------------------------------------------------------------------------
# Haversine Distance Calculation (Matches Symbiosis.AI routes/matches.js)
# --------------------------------------------------------------------------
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

# --------------------------------------------------------------------------
# Match Scoring Engine (Matches Symbiosis.AI matching algorithm)
# --------------------------------------------------------------------------
SIMILAR_MATERIAL_GROUPS = [
    ["Fly Ash", "Bottom Ash", "Coal Ash", "Cement Kiln Dust", "Pozzolanic Slag"],
    ["Ferrous Scrap", "Iron Scrap", "Steel Stamping Scrap", "Metal Turnings"],
    ["HDPE", "PET", "Polypropylene Scrap", "Plastic Regrind Flakes"],
    ["Spent Grain", "Bagasse", "Rice Husk", "Agricultural Residue", "Biomass Pellets"],
    ["Chemical Gypsum", "Phosphogypsum", "Lime Sludge", "Calcium Carbonate Slurry"]
]

def are_similar_materials(mat1: str, mat2: str) -> bool:
    if not mat1 or not mat2:
        return False
    m1 = mat1.lower()
    m2 = mat2.lower()
    if m1 == m2 or m1 in m2 or m2 in m1:
        return True
    for group in SIMILAR_MATERIAL_GROUPS:
        m1_in = any(g.lower() in m1 for g in group)
        m2_in = any(g.lower() in m2 for g in group)
        if m1_in and m2_in:
            return True
    return False

def calculate_match_score(producer: Dict[str, Any], consumer: Dict[str, Any], distance: Optional[float] = None) -> Dict[str, Any]:
    score = 0
    factors = []

    # 1. Material compatibility (40 pts)
    p_type = producer.get("materialType", "")
    c_type = consumer.get("materialType", "")
    if p_type.lower() == c_type.lower():
        score += 40
        factors.append("Direct Material Match (+40)")
    elif are_similar_materials(p_type, c_type):
        score += 28
        factors.append("Cross-Industry Compatible Byproduct (+28)")
    elif producer.get("category") == consumer.get("category"):
        score += 20
        factors.append("Same Material Category (+20)")

    # 2. Quantity compatibility (20 pts)
    p_qty = float(producer.get("quantity", 0))
    c_qty = float(consumer.get("quantity", 0))
    if p_qty >= c_qty and c_qty > 0:
        score += 20
        factors.append("Quantity Fully Meets Demand (+20)")
    elif p_qty >= c_qty * 0.6 and c_qty > 0:
        score += 12
        factors.append("Partial Quantity Match (+12)")
    else:
        score += 8
        factors.append("Batch Volume Negotiable (+8)")

    # 3. Quality specifications (20 pts)
    p_purity = float(producer.get("quality", {}).get("purity", 80))
    c_purity = float(consumer.get("quality", {}).get("minPurity", 70))
    if p_purity >= c_purity:
        score += 20
        factors.append(f"Purity ({p_purity}%) Exceeds Spec (+20)")
    elif p_purity >= c_purity * 0.85:
        score += 12
        factors.append("Purity Near Tolerance (+12)")
    else:
        score += 8
        factors.append("Quality Requires Treatment (+8)")

    # 4. Proximity & Logistics (20 pts)
    if distance is not None:
        if distance <= 50:
            score += 20
            factors.append(f"Local Cluster ({distance} km, +20)")
        elif distance <= 120:
            score += 15
            factors.append(f"Regional Haulage ({distance} km, +15)")
        elif distance <= 300:
            score += 10
            factors.append(f"Inter-State Freight ({distance} km, +10)")
        else:
            score += 5
            factors.append(f"Long-Distance Transport ({distance} km, +5)")
    else:
        score += 12
        factors.append("Logistics Coordination Available (+12)")

    final_score = min(100, max(0, score))
    return {
        "score": final_score,
        "factors": factors
    }

# --------------------------------------------------------------------------
# Seed Data: Participating Industrial Plants & Facilities
# --------------------------------------------------------------------------
COMPANIES_DB: Dict[str, Dict[str, Any]] = {
    "comp_nivaar": {
        "id": "comp_nivaar",
        "companyName": "Nivaar Precision Heavy Industries (Plant Alpha)",
        "industryType": "Automotive & Heavy Mechanical Equipment",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 13.0827, "longitude": 80.2707},
        "verified": True,
        "wasteProduced": [
            {
                "id": "mat_p1",
                "materialType": "Steel Stamping Scrap",
                "category": "Metals & Metallurgy",
                "quantity": 180,
                "unit": "Metric Tons/Month",
                "quality": {"purity": 96, "moisture": 1},
                "pricing": {"amount": 32000, "unit": "per MT", "type": "negotiable"},
                "hazardous": "non-hazardous"
            },
            {
                "id": "mat_p2",
                "materialType": "Fly Ash",
                "category": "Construction & Minerals",
                "quantity": 250,
                "unit": "Metric Tons/Month",
                "quality": {"purity": 88, "moisture": 4},
                "pricing": {"amount": 1100, "unit": "per MT", "type": "fixed"},
                "hazardous": "non-hazardous"
            }
        ],
        "materialsRequired": [
            {
                "id": "mat_r1",
                "materialType": "HDPE Regrind Flakes",
                "category": "Plastics & Polymers",
                "quantity": 60,
                "unit": "Metric Tons/Month",
                "quality": {"minPurity": 90, "maxMoisture": 2},
                "pricing": {"amount": 45000, "unit": "per MT", "type": "target"}
            },
            {
                "id": "mat_r2",
                "materialType": "Chemical Gypsum",
                "category": "Construction & Minerals",
                "quantity": 120,
                "unit": "Metric Tons/Month",
                "quality": {"minPurity": 85, "maxMoisture": 6},
                "pricing": {"amount": 950, "unit": "per MT", "type": "target"}
            }
        ]
    },
    "comp_techsteel": {
        "id": "comp_techsteel",
        "companyName": "TechSteel Smelting & Rolling Mills",
        "industryType": "Primary Metallurgy & Rebar Foundry",
        "city": "Salem",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 11.6643, "longitude": 78.1460},
        "verified": True,
        "wasteProduced": [
            {
                "id": "mat_ts1",
                "materialType": "Pozzolanic Slag",
                "category": "Construction & Minerals",
                "quantity": 400,
                "unit": "Metric Tons/Month",
                "quality": {"purity": 92, "moisture": 2},
                "pricing": {"amount": 850, "unit": "per MT", "type": "fixed"},
                "hazardous": "non-hazardous"
            }
        ],
        "materialsRequired": [
            {
                "id": "mat_ts_req",
                "materialType": "Steel Stamping Scrap",
                "category": "Metals & Metallurgy",
                "quantity": 200,
                "unit": "Metric Tons/Month",
                "quality": {"minPurity": 92, "maxMoisture": 3},
                "pricing": {"amount": 33500, "unit": "per MT", "type": "target"}
            }
        ]
    },
    "comp_bharatcement": {
        "id": "comp_bharatcement",
        "companyName": "Bharat Ultratech Cement Corporation",
        "industryType": "Cement & Ready-Mix Infrastructure",
        "city": "Coimbatore",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 11.0168, "longitude": 76.9558},
        "verified": True,
        "wasteProduced": [
            {
                "id": "mat_bc1",
                "materialType": "Cement Kiln Dust",
                "category": "Construction & Minerals",
                "quantity": 150,
                "unit": "Metric Tons/Month",
                "quality": {"purity": 82, "moisture": 3},
                "pricing": {"amount": 600, "unit": "per MT", "type": "negotiable"},
                "hazardous": "non-hazardous"
            }
        ],
        "materialsRequired": [
            {
                "id": "mat_bc_req",
                "materialType": "Fly Ash",
                "category": "Construction & Minerals",
                "quantity": 300,
                "unit": "Metric Tons/Month",
                "quality": {"minPurity": 85, "maxMoisture": 5},
                "pricing": {"amount": 1250, "unit": "per MT", "type": "target"}
            }
        ]
    },
    "comp_greenchem": {
        "id": "comp_greenchem",
        "companyName": "Apex Green Chemicals & Fertilizers",
        "industryType": "Specialty Chemicals & Agro-Inputs",
        "city": "Ranipet",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 12.9284, "longitude": 79.3320},
        "verified": True,
        "wasteProduced": [
            {
                "id": "mat_gc1",
                "materialType": "Chemical Gypsum",
                "category": "Construction & Minerals",
                "quantity": 220,
                "unit": "Metric Tons/Month",
                "quality": {"purity": 91, "moisture": 4},
                "pricing": {"amount": 900, "unit": "per MT", "type": "fixed"},
                "hazardous": "non-hazardous"
            }
        ],
        "materialsRequired": [
            {
                "id": "mat_gc_req",
                "materialType": "Biomass Pellets",
                "category": "Biomass & Agriculture",
                "quantity": 100,
                "unit": "Metric Tons/Month",
                "quality": {"minPurity": 90, "maxMoisture": 8},
                "pricing": {"amount": 4200, "unit": "per MT", "type": "target"}
            }
        ]
    },
    "comp_ecopolymer": {
        "id": "comp_ecopolymer",
        "companyName": "EcoPolymer Circular Solutions",
        "industryType": "Plastics Compounding & Extrusion",
        "city": "Hosur",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 12.7409, "longitude": 77.8253},
        "verified": True,
        "wasteProduced": [
            {
                "id": "mat_ep1",
                "materialType": "HDPE Regrind Flakes",
                "category": "Plastics & Polymers",
                "quantity": 85,
                "unit": "Metric Tons/Month",
                "quality": {"purity": 95, "moisture": 1},
                "pricing": {"amount": 44000, "unit": "per MT", "type": "fixed"},
                "hazardous": "non-hazardous"
            }
        ],
        "materialsRequired": [
            {
                "id": "mat_ep_req",
                "materialType": "Packaging Polymer Scrap",
                "category": "Plastics & Polymers",
                "quantity": 120,
                "unit": "Metric Tons/Month",
                "quality": {"minPurity": 85, "maxMoisture": 3},
                "pricing": {"amount": 28000, "unit": "per MT", "type": "target"}
            }
        ]
    }
}

# --------------------------------------------------------------------------
# Seed Data: Active Marketplace Listings
# --------------------------------------------------------------------------
LISTINGS_DB: List[Dict[str, Any]] = [
    {
        "id": "list_101",
        "title": "High-Grade Class F Fly Ash from Thermal Power Station",
        "companyId": "comp_nivaar",
        "companyName": "Nivaar Precision Heavy Industries",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 13.0827, "longitude": 80.2707},
        "type": "waste",
        "materialType": "Fly Ash",
        "category": "Construction & Minerals",
        "description": "Dry pulverized coal fly ash with high silica/alumina pozzolanic activity. Certified under IS 3812 standard for concrete admixture.",
        "quantity": 250,
        "unit": "Metric Tons",
        "quality": {"purity": 88, "moisture": 4, "grade": "Class F"},
        "hazardous": "non-hazardous",
        "availability": "continuous",
        "pricing": {"amount": 1100, "unit": "per MT", "type": "fixed"},
        "verified": True,
        "views": 184,
        "inquiries": 12,
        "createdAt": "2026-10-21T09:30:00Z"
    },
    {
        "id": "list_102",
        "title": "Clean Precision Steel Stamping & Cutting Offcuts (0.8mm - 2.5mm)",
        "companyId": "comp_nivaar",
        "companyName": "Nivaar Precision Heavy Industries",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 13.0827, "longitude": 80.2707},
        "type": "waste",
        "materialType": "Steel Stamping Scrap",
        "category": "Metals & Metallurgy",
        "description": "High-tensile carbon steel press scrap from CNC automotive chassis production. Zero oil contamination, bundled in standard 500kg cubes.",
        "quantity": 180,
        "unit": "Metric Tons",
        "quality": {"purity": 96, "moisture": 1, "grade": "CR4 Steel"},
        "hazardous": "non-hazardous",
        "availability": "continuous",
        "pricing": {"amount": 32000, "unit": "per MT", "type": "negotiable"},
        "verified": True,
        "views": 242,
        "inquiries": 19,
        "createdAt": "2026-10-22T14:15:00Z"
    },
    {
        "id": "list_103",
        "title": "Hydraulic Ground Granulated Blast Furnace Slag (GGBS)",
        "companyId": "comp_techsteel",
        "companyName": "TechSteel Smelting & Rolling Mills",
        "city": "Salem",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 11.6643, "longitude": 78.1460},
        "type": "waste",
        "materialType": "Pozzolanic Slag",
        "category": "Construction & Minerals",
        "description": "Vitreous glassy granulated slag, water quenched and pulverized for sulfate-resistant marine concrete manufacturing.",
        "quantity": 400,
        "unit": "Metric Tons",
        "quality": {"purity": 92, "moisture": 2, "grade": "GGBS Grade 120"},
        "hazardous": "non-hazardous",
        "availability": "continuous",
        "pricing": {"amount": 850, "unit": "per MT", "type": "fixed"},
        "verified": True,
        "views": 310,
        "inquiries": 24,
        "createdAt": "2026-10-20T11:00:00Z"
    },
    {
        "id": "list_104",
        "title": "Post-Industrial Washed HDPE Regrind Resin Flakes",
        "companyId": "comp_ecopolymer",
        "companyName": "EcoPolymer Circular Solutions",
        "city": "Hosur",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 12.7409, "longitude": 77.8253},
        "type": "waste",
        "materialType": "HDPE Regrind Flakes",
        "category": "Plastics & Polymers",
        "description": "High-density polyethylene flakes from blow-molding trim. Melt flow index 0.3 - 0.7 g/10min. Cleaned and hot-air dried.",
        "quantity": 85,
        "unit": "Metric Tons",
        "quality": {"purity": 95, "moisture": 1, "grade": "HDPE Blow Grade"},
        "hazardous": "non-hazardous",
        "availability": "continuous",
        "pricing": {"amount": 44000, "unit": "per MT", "type": "fixed"},
        "verified": True,
        "views": 156,
        "inquiries": 9,
        "createdAt": "2026-10-22T16:45:00Z"
    },
    {
        "id": "list_105",
        "title": "Neutralized Synthetic Chemical Gypsum (CaSO4·2H2O)",
        "companyId": "comp_greenchem",
        "companyName": "Apex Green Chemicals & Fertilizers",
        "city": "Ranipet",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 12.9284, "longitude": 79.3320},
        "type": "waste",
        "materialType": "Chemical Gypsum",
        "category": "Construction & Minerals",
        "description": "High-purity byproduct gypsum filtered from phosphoric acid neutralization. Ideal for plasterboard and portland cement setting retarder.",
        "quantity": 220,
        "unit": "Metric Tons",
        "quality": {"purity": 91, "moisture": 4, "grade": "Technical Gypsum"},
        "hazardous": "non-hazardous",
        "availability": "continuous",
        "pricing": {"amount": 900, "unit": "per MT", "type": "fixed"},
        "verified": True,
        "views": 198,
        "inquiries": 15,
        "createdAt": "2026-10-21T18:20:00Z"
    },
    {
        "id": "list_106",
        "title": "URGENT REQUIREMENT: Ferrous Stampings / Melting Scrap",
        "companyId": "comp_techsteel",
        "companyName": "TechSteel Smelting & Rolling Mills",
        "city": "Salem",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 11.6643, "longitude": 78.1460},
        "type": "requirement",
        "materialType": "Steel Stamping Scrap",
        "category": "Metals & Metallurgy",
        "description": "Electric Arc Furnace plant looking for guaranteed monthly supply of sheet offcuts. Immediate weighbridge payment upon delivery.",
        "quantity": 200,
        "unit": "Metric Tons",
        "quality": {"minPurity": 92, "maxMoisture": 3},
        "hazardous": "non-hazardous",
        "availability": "continuous",
        "pricing": {"amount": 33500, "unit": "per MT", "type": "target"},
        "verified": True,
        "views": 275,
        "inquiries": 21,
        "createdAt": "2026-10-22T08:00:00Z"
    },
    {
        "id": "list_107",
        "title": "URGENT REQUIREMENT: Dry Fly Ash for Pozzolanic Blending",
        "companyId": "comp_bharatcement",
        "companyName": "Bharat Ultratech Cement Corporation",
        "city": "Coimbatore",
        "state": "Tamil Nadu",
        "coordinates": {"latitude": 11.0168, "longitude": 76.9558},
        "type": "requirement",
        "materialType": "Fly Ash",
        "category": "Construction & Minerals",
        "description": "Looking for regular bulk pneumatic tanker deliveries of thermal fly ash for Portland Pozzolana Cement (PPC) production.",
        "quantity": 300,
        "unit": "Metric Tons",
        "quality": {"minPurity": 85, "maxMoisture": 5},
        "hazardous": "non-hazardous",
        "availability": "continuous",
        "pricing": {"amount": 1250, "unit": "per MT", "type": "target"},
        "verified": True,
        "views": 330,
        "inquiries": 28,
        "createdAt": "2026-10-23T06:30:00Z"
    }
]

# --------------------------------------------------------------------------
# Seed Data: Active Trade Inquiries & Proposals
# --------------------------------------------------------------------------
INQUIRIES_DB: List[Dict[str, Any]] = [
    {
        "id": "inq_501",
        "listingId": "list_102",
        "materialTitle": "Clean Precision Steel Stamping Scrap (0.8mm)",
        "buyerCompanyId": "comp_techsteel",
        "buyerCompanyName": "TechSteel Smelting & Rolling Mills",
        "sellerCompanyId": "comp_nivaar",
        "sellerCompanyName": "Nivaar Precision Heavy Industries",
        "quantityRequested": 180,
        "unit": "Metric Tons",
        "offeredPrice": 33000,
        "status": "ACCEPTED",
        "logisticsType": "Buyer Arranges Flatbed Trailer Transport",
        "latestMessage": "Contract approved! First 60MT dispatch scheduled for Monday 08:00 AM.",
        "updatedAt": "2026-10-23T11:45:00Z"
    },
    {
        "id": "inq_502",
        "listingId": "list_101",
        "materialTitle": "High-Grade Class F Fly Ash",
        "buyerCompanyId": "comp_bharatcement",
        "buyerCompanyName": "Bharat Ultratech Cement Corporation",
        "sellerCompanyId": "comp_nivaar",
        "sellerCompanyName": "Nivaar Precision Heavy Industries",
        "quantityRequested": 250,
        "unit": "Metric Tons",
        "offeredPrice": 1200,
        "status": "IN_TRANSIT",
        "logisticsType": "Pneumatic Bulk Bulker Tanker Dispatch",
        "latestMessage": "Consignment dispatched (Truck #TN-37-BY-8492). Expected ETA: 3.5 hrs.",
        "updatedAt": "2026-10-23T14:10:00Z"
    },
    {
        "id": "inq_503",
        "listingId": "list_105",
        "materialTitle": "Neutralized Synthetic Chemical Gypsum",
        "buyerCompanyId": "comp_nivaar",
        "buyerCompanyName": "Nivaar Precision Heavy Industries",
        "sellerCompanyId": "comp_greenchem",
        "sellerCompanyName": "Apex Green Chemicals & Fertilizers",
        "quantityRequested": 120,
        "unit": "Metric Tons",
        "offeredPrice": 920,
        "status": "NEGOTIATING",
        "logisticsType": "Covered Tipper Truck Delivery",
        "latestMessage": "Sample test passed moisture compliance (<4.2%). Finalizing purchase order.",
        "updatedAt": "2026-10-23T16:05:00Z"
    }
]

# --------------------------------------------------------------------------
# Request Schemas
# --------------------------------------------------------------------------
class CreateListingRequest(BaseModel):
    title: str
    companyId: Optional[str] = "comp_nivaar"
    companyName: Optional[str] = "Nivaar Precision Heavy Industries"
    city: Optional[str] = "Chennai"
    state: Optional[str] = "Tamil Nadu"
    type: str  # 'waste' or 'requirement'
    materialType: str
    category: str
    description: str
    quantity: float
    unit: str = "Metric Tons"
    quality: Optional[Dict[str, Any]] = None
    hazardous: str = "non-hazardous"
    availability: str = "continuous"
    pricing: Optional[Dict[str, Any]] = None

class CreateInquiryRequest(BaseModel):
    listingId: str
    buyerCompanyId: Optional[str] = "comp_nivaar"
    buyerCompanyName: Optional[str] = "Nivaar Precision Heavy Industries"
    quantityRequested: float
    unit: str = "Metric Tons"
    offeredPrice: float
    logisticsType: str = "Ex-Works Factory Gate Pickup"
    initialMessage: str

# --------------------------------------------------------------------------
# API Endpoints
# --------------------------------------------------------------------------

@router.get("/matches")
def get_symbiotic_matches(
    company_id: str = Query("comp_nivaar", description="Active facility ID to calculate circular synergies for"),
    min_score: int = Query(60, description="Minimum compatibility match score (0-100)"),
    max_distance_km: int = Query(500, description="Maximum haulage distance in kilometers")
):
    """
    Core Symbiosis.AI Matching Engine.
    Correlates factory byproducts with industrial consumer demand:
    1. 'needYourWaste' (Buyers who need what your facility produces)
    2. 'produceWhatYouNeed' (Suppliers who produce raw materials your facility requires)
    """
    my_company = COMPANIES_DB.get(company_id)
    if not my_company:
        my_company = COMPANIES_DB["comp_nivaar"]

    my_coords = my_company.get("coordinates", {"latitude": 13.0827, "longitude": 80.2707})
    my_lat = my_coords["latitude"]
    my_lon = my_coords["longitude"]

    need_your_waste = []
    produce_what_you_need = []

    # Stream 1: Factories that Need Your Waste
    for my_waste in my_company.get("wasteProduced", []):
        for other_id, other_co in COMPANIES_DB.items():
            if other_id == company_id:
                continue
            
            other_coords = other_co.get("coordinates", {})
            distance = None
            if other_coords:
                distance = calculate_distance(my_lat, my_lon, other_coords["latitude"], other_coords["longitude"])
                if distance > max_distance_km:
                    continue

            for requirement in other_co.get("materialsRequired", []):
                match_result = calculate_match_score(my_waste, requirement, distance)
                if match_result["score"] >= min_score:
                    # Calculate circular environmental impact
                    qty = min(float(my_waste["quantity"]), float(requirement["quantity"]))
                    co2_saved = round(qty * 1.84, 1) # ~1.84 tCO2e per ton of industrial waste diverted
                    cost_savings = round(qty * 650, 0) # Estimated logistics & raw material savings

                    need_your_waste.append({
                        "id": f"match_buyer_{my_waste['id']}_{other_id}",
                        "matchScore": match_result["score"],
                        "matchFactors": match_result["factors"],
                        "distanceKm": distance,
                        "partnerCompany": {
                            "id": other_co["id"],
                            "name": other_co["companyName"],
                            "industry": other_co["industryType"],
                            "city": other_co["city"],
                            "state": other_co["state"],
                            "coordinates": other_co["coordinates"],
                            "verified": other_co.get("verified", True)
                        },
                        "material": {
                            "yourByproduct": my_waste["materialType"],
                            "theirRequirement": requirement["materialType"],
                            "category": my_waste["category"],
                            "quantityExchange": qty,
                            "unit": my_waste["unit"],
                            "targetPrice": requirement.get("pricing", {}).get("amount", my_waste.get("pricing", {}).get("amount"))
                        },
                        "environmentalImpact": {
                            "tonsDiverted": qty,
                            "co2ReducedTonnes": co2_saved,
                            "costSavingsEstimated": cost_savings
                        }
                    })

    # Stream 2: Factories that Produce What You Need
    for my_requirement in my_company.get("materialsRequired", []):
        for other_id, other_co in COMPANIES_DB.items():
            if other_id == company_id:
                continue

            other_coords = other_co.get("coordinates", {})
            distance = None
            if other_coords:
                distance = calculate_distance(my_lat, my_lon, other_coords["latitude"], other_coords["longitude"])
                if distance > max_distance_km:
                    continue

            for supplier_waste in other_co.get("wasteProduced", []):
                match_result = calculate_match_score(supplier_waste, my_requirement, distance)
                if match_result["score"] >= min_score:
                    qty = min(float(supplier_waste["quantity"]), float(my_requirement["quantity"]))
                    co2_saved = round(qty * 1.95, 1)
                    cost_savings = round(qty * 820, 0)

                    produce_what_you_need.append({
                        "id": f"match_seller_{supplier_waste['id']}_{other_id}",
                        "matchScore": match_result["score"],
                        "matchFactors": match_result["factors"],
                        "distanceKm": distance,
                        "partnerCompany": {
                            "id": other_co["id"],
                            "name": other_co["companyName"],
                            "industry": other_co["industryType"],
                            "city": other_co["city"],
                            "state": other_co["state"],
                            "coordinates": other_co["coordinates"],
                            "verified": other_co.get("verified", True)
                        },
                        "material": {
                            "theirByproduct": supplier_waste["materialType"],
                            "yourRequirement": my_requirement["materialType"],
                            "category": supplier_waste["category"],
                            "quantityExchange": qty,
                            "unit": supplier_waste["unit"],
                            "offeredPrice": supplier_waste.get("pricing", {}).get("amount", my_requirement.get("pricing", {}).get("amount"))
                        },
                        "environmentalImpact": {
                            "tonsDiverted": qty,
                            "co2ReducedTonnes": co2_saved,
                            "costSavingsEstimated": cost_savings
                        }
                    })

    # Sort descending by match score
    need_your_waste.sort(key=lambda m: m["matchScore"], reverse=True)
    produce_what_you_need.sort(key=lambda m: m["matchScore"], reverse=True)

    return {
        "status": "success",
        "companyId": company_id,
        "companyName": my_company["companyName"],
        "totalMatches": len(need_your_waste) + len(produce_what_you_need),
        "needYourWaste": need_your_waste,
        "produceWhatYouNeed": produce_what_you_need
    }

@router.get("/materials")
def get_marketplace_materials(
    type: Optional[str] = Query(None, description="'waste' for byproducts available, 'requirement' for raw material bids"),
    category: Optional[str] = Query(None, description="Category filter"),
    query: Optional[str] = Query(None, description="Search query string")
):
    """Lists active marketplace material listings with search & category filters."""
    results = list(LISTINGS_DB)

    if type and type != "all":
        results = [m for m in results if m.get("type") == type]

    if category and category != "all":
        results = [m for m in results if m.get("category") == category]

    if query:
        q = query.lower()
        results = [
            m for m in results
            if q in m.get("title", "").lower()
            or q in m.get("materialType", "").lower()
            or q in m.get("description", "").lower()
            or q in m.get("city", "").lower()
        ]

    return {
        "status": "success",
        "count": len(results),
        "listings": results
    }

@router.post("/materials")
def create_marketplace_listing(payload: CreateListingRequest):
    """Creates a new industrial byproduct or raw material demand listing."""
    new_id = f"list_{len(LISTINGS_DB) + 101}_{int(datetime.utcnow().timestamp())}"
    listing_item = {
        "id": new_id,
        "title": payload.title,
        "companyId": payload.companyId or "comp_nivaar",
        "companyName": payload.companyName or "Nivaar Precision Heavy Industries",
        "city": payload.city or "Chennai",
        "state": payload.state or "Tamil Nadu",
        "coordinates": {"latitude": 13.0827, "longitude": 80.2707},
        "type": payload.type,
        "materialType": payload.materialType,
        "category": payload.category,
        "description": payload.description,
        "quantity": payload.quantity,
        "unit": payload.unit,
        "quality": payload.quality or {"purity": 90, "moisture": 3},
        "hazardous": payload.hazardous,
        "availability": payload.availability,
        "pricing": payload.pricing or {"amount": 1500, "unit": "per MT", "type": "negotiable"},
        "verified": True,
        "views": 1,
        "inquiries": 0,
        "createdAt": datetime.utcnow().isoformat()
    }

    LISTINGS_DB.insert(0, listing_item)

    return {
        "status": "success",
        "message": "Marketplace listing published successfully.",
        "listing": listing_item
    }

@router.get("/impact")
def get_circular_impact_stats(company_id: str = Query("comp_nivaar")):
    """Returns circular economy & environmental ESG metrics (CO2, landfill, water, financial)."""
    return {
        "status": "success",
        "companyId": company_id,
        "metrics": {
            "tonsDivertedFromLandfill": 1480.0,
            "co2ReducedTonnes": 2845.0,
            "waterSavedLiters": 420000,
            "energyConservedKwh": 890000,
            "financialSavingsINR": 3420000, # ₹34.2 Lakhs
            "treeEquivalence": 14200,
            "activeIndustrialConnections": 6,
            "circularityScore": 88.5
        },
        "byproductBreakdown": [
            {"material": "Fly Ash to Cement Mills", "sharePct": 42, "tonnes": 620, "color": "#FF5E1E"},
            {"material": "Steel Scrap to Smelters", "sharePct": 33, "tonnes": 490, "color": "#10B981"},
            {"material": "Chemical Gypsum to Plaster", "sharePct": 15, "tonnes": 220, "color": "#00F0FF"},
            {"material": "Polymer Regrind to Extrusion", "sharePct": 10, "tonnes": 150, "color": "#F59E0B"}
        ]
    }

@router.get("/companies")
def get_connected_factories():
    """Returns factory cluster nodes for logistics map & geospatial routing."""
    factories = []
    for cid, cdata in COMPANIES_DB.items():
        factories.append({
            "id": cdata["id"],
            "name": cdata["companyName"],
            "industry": cdata["industryType"],
            "city": cdata["city"],
            "state": cdata["state"],
            "coordinates": cdata["coordinates"],
            "verified": cdata.get("verified", True),
            "materialsExchanged": [m["materialType"] for m in cdata.get("wasteProduced", [])] + [m["materialType"] for m in cdata.get("materialsRequired", [])]
        })
    return {
        "status": "success",
        "count": len(factories),
        "factories": factories
    }

@router.get("/inquiries")
def get_trade_inquiries():
    """Returns active negotiation threads and byproduct deals."""
    return {
        "status": "success",
        "count": len(INQUIRIES_DB),
        "inquiries": INQUIRIES_DB
    }

@router.post("/inquiries")
def create_trade_inquiry(payload: CreateInquiryRequest):
    """Submits a purchase bid, sample request, or trade inquiry on a listing."""
    listing = next((l for l in LISTINGS_DB if l["id"] == payload.listingId), None)
    if not listing:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")

    new_inq = {
        "id": f"inq_{len(INQUIRIES_DB) + 501}",
        "listingId": payload.listingId,
        "materialTitle": listing["title"],
        "buyerCompanyId": payload.buyerCompanyId or "comp_nivaar",
        "buyerCompanyName": payload.buyerCompanyName or "Nivaar Precision Heavy Industries",
        "sellerCompanyId": listing["companyId"],
        "sellerCompanyName": listing["companyName"],
        "quantityRequested": payload.quantityRequested,
        "unit": payload.unit,
        "offeredPrice": payload.offeredPrice,
        "status": "PROPOSED",
        "logisticsType": payload.logisticsType,
        "latestMessage": payload.initialMessage,
        "updatedAt": datetime.utcnow().isoformat()
    }

    INQUIRIES_DB.insert(0, new_inq)
    listing["inquiries"] = listing.get("inquiries", 0) + 1

    return {
        "status": "success",
        "message": "Trade proposal dispatched to facility logistics desk.",
        "inquiry": new_inq
    }

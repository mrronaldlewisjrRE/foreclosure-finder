import React, { useEffect, useRef, useState } from 'react';
import { Award } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function MapView({ onSelectLead, maskedToggle = true }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch leads on mount
  useEffect(() => {
    async function fetchLeads() {
      try {
        setLoading(true);
        const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads?limit=100&masked=${maskedToggle}`);
        const data = await res.json();
        setLeads(data.leads || []);
      } catch (err) {
        console.error('Error fetching leads for map:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, [maskedToggle]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (loading || !window.L || !mapContainerRef.current) return;

    // 1. Create map instance if it doesn't exist
    if (!mapInstanceRef.current) {
      // Default center to Davidson County, TN
      const defaultCenter = [36.1627, -86.7816]; 
      
      // If we have leads, center on the first one
      const center = leads.length > 0 && leads[0].coordinates?.lat
        ? [leads[0].coordinates.lat, leads[0].coordinates.lng]
        : defaultCenter;

      mapInstanceRef.current = window.L.map(mapContainerRef.current, {
        center: center,
        zoom: 7,
        zoomControl: true,
        attributionControl: false
      });

      // Dark Mode Tile Layer CartoDB Dark Matter (highly premium look!)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }

    // 2. Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 3. Add new markers
    leads.forEach(lead => {
      const { lat, lng } = lead.coordinates || {};
      if (!lat || !lng) return;

      // Color-coding based on opportunity tier
      let tierColor = '#9ca3af'; // Tier C
      if (lead.score?.tier === 'A_PLUS') tierColor = '#10b981';
      else if (lead.score?.tier === 'A') tierColor = '#06b6d4';
      else if (lead.score?.tier === 'B') tierColor = '#f59e0b';

      // Custom HTML Marker utilizing premium pulsing effects
      const markerHtml = `
        <div style="
          width: 14px; 
          height: 14px; 
          border-radius: 50%; 
          background-color: ${tierColor}; 
          border: 2px solid white;
          box-shadow: 0 0 10px ${tierColor}, 0 0 20px ${tierColor};
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -4px;
            left: -4px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background-color: transparent;
            border: 2px solid ${tierColor};
            opacity: 0.7;
            animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          "></div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: markerHtml,
        className: 'custom-map-marker',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      // Popup HTML content with interactive inspection button
      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div class="map-popup-header">${lead.propertyAddress}</div>
        <div class="map-popup-body">
          <div><strong>Case:</strong> ${lead.caseNumber}</div>
          <div><strong>Type:</strong> ${lead.filingType}</div>
          <div><strong>Equity:</strong> $${(lead.valuation?.estimatedEquity || 0).toLocaleString()} (${lead.valuation?.equityPercentage}%)</div>
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px; font-weight: 700; color: ${tierColor};">
            Score: ${lead.score?.opportunityScore} (${lead.score?.tier?.replace('_', '+')})
          </div>
          <button id="popup-inspect-btn-${lead.id}" style="
            margin-top: 8px;
            background: linear-gradient(135deg, #06b6d4, #8b5cf6);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            text-align: center;
          ">Inspect Opportunity</button>
        </div>
      `;

      // Listen for popup open to bind the click event handler
      const marker = window.L.marker([lat, lng], { icon: customIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(window.L.popup({ minWidth: 200 }).setContent(popupContent));

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-inspect-btn-${lead.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            onSelectLead(lead.id);
          });
        }
      });

      markersRef.current.push(marker);
    });

    // Adjust map zoom bounds if we have markers
    if (leads.length > 0) {
      const validLatLngs = leads
        .map(l => l.coordinates)
        .filter(c => c?.lat && c?.lng)
        .map(c => [c.lat, c.lng]);
        
      if (validLatLngs.length > 1) {
        mapInstanceRef.current.fitBounds(validLatLngs, { padding: [40, 40] });
      }
    }

  }, [leads, loading]);

  // Clean up Leaflet instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="map-viewport-container">
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(8, 11, 17, 0.8)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          Loading Map overlays...
        </div>
      )}

      {/* Map Element Container */}
      <div ref={mapContainerRef} className="map-instance" />

      {/* Overlay Information Legend */}
      <div className="map-overlay-panel">
        <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--cyan)' }}>OPPORTUNITY LEGEND</span>
        <div className="map-legend-item">
          <div className="legend-color-dot" style={{ backgroundColor: '#10b981' }} />
          <span>Tier A+ (High Equity / Vacant)</span>
        </div>
        <div className="map-legend-item">
          <div className="legend-color-dot" style={{ backgroundColor: '#06b6d4' }} />
          <span>Tier A (Strong Equity / Distress)</span>
        </div>
        <div className="map-legend-item">
          <div className="legend-color-dot" style={{ backgroundColor: '#f59e0b' }} />
          <span>Tier B (Moderate Risk / Equity)</span>
        </div>
        <div className="map-legend-item">
          <div className="legend-color-dot" style={{ backgroundColor: '#9ca3af' }} />
          <span>Tier C (Low Equity / High Liens)</span>
        </div>
      </div>

      {/* Embedded Pulsing Keyframes */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.33); opacity: 0; }
          30% { opacity: 0.7; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Clock, Radio } from 'lucide-react';
import type { EmployeeProfile } from '../../types/staff';

export interface LastKnownLocation {
  latitude: number;
  longitude: number;
  capturedAt: string; // ISO timestamp of the check-in/out that produced this fix
  source: 'check_in' | 'check_out';
}

export interface SiteLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface GuardLocationMapProps {
  guard: EmployeeProfile | null;
  site: SiteLocation | null;
  lastKnownLocation: LastKnownLocation | null;
  onClose: () => void;
}

const siteIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#0F1B3D;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const guardIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#C81E3A;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitToMarkers({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => p.join(',')).join('|')]);
  return null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function GuardLocationMap({ guard, site, lastKnownLocation, onClose }: GuardLocationMapProps) {
  const points: [number, number][] = [];
  if (site) points.push([site.latitude, site.longitude]);
  if (lastKnownLocation) points.push([lastKnownLocation.latitude, lastKnownLocation.longitude]);

  return (
    <AnimatePresence>
      {guard && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-4 sm:inset-x-auto sm:inset-y-8 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl bg-white rounded-2xl z-50 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <p className="font-display font-bold text-slate-800">
                  {guard.user.first_name} {guard.user.last_name}
                </p>
                <p className="text-xs font-mono text-slate-400">{guard.employee_number}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="relative flex-1 min-h-[320px] bg-slate-100">
              {points.length > 0 ? (
                <MapContainer center={points[0]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitToMarkers points={points} />
                  {site && (
                    <Marker position={[site.latitude, site.longitude]} icon={siteIcon}>
                      <Popup>
                        <span className="font-medium">{site.name}</span>
                        <br />Assigned site
                      </Popup>
                    </Marker>
                  )}
                  {lastKnownLocation && (
                    <Marker position={[lastKnownLocation.latitude, lastKnownLocation.longitude]} icon={guardIcon}>
                      <Popup>
                        Last known location
                        <br />
                        {lastKnownLocation.source === 'check_in' ? 'From check-in' : 'From check-out'} · {timeAgo(lastKnownLocation.capturedAt)}
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-center px-6">
                  <p className="text-sm text-slate-400">
                    No location data available yet — this site has no coordinates on file and this guard has no GPS-tagged check-in.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-4 shrink-0 bg-slate-50/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-crimecurb-navy shrink-0" />
                <MapPin size={12} /> Site location
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-crimecurb-red shrink-0" />
                <Radio size={12} /> Last known guard location
              </div>
              {lastKnownLocation && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                  <Clock size={12} />
                  Captured {timeAgo(lastKnownLocation.capturedAt)} — not live, updates only on check-in/check-out
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
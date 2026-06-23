import React from "react";
import { NetworkStats, NetworkMode } from "../types";
import { Wifi, WifiOff, Zap, Shield, RefreshCw } from "lucide-react";

interface NetworkDashboardProps {
  stats: NetworkStats;
  savings: { standardKb: number; pingGtkb: number; savedPercent: number };
  onModeChange: (mode: NetworkMode) => void;
  onManualSync: () => void;
  isSyncing: boolean;
  timeSinceLastSync: number;
}

export default function NetworkDashboard({
  stats,
  savings,
  onModeChange,
  onManualSync,
  isSyncing,
  timeSinceLastSync
}: NetworkDashboardProps) {
  const getStatusText = () => {
    switch (stats.mode) {
      case "offline":
        return "Modo Desconectado (Simulado)";
      case "slow":
        return "Red Rural Inestable (Mínimo consumo - Delay de 3s)";
      default:
        return stats.latencyMs > 400 ? "Conexión Lenta" : "Conexión Estable";
    }
  };

  const getStatusColor = () => {
    switch (stats.mode) {
      case "offline":
        return "text-red-500 bg-red-50 border-red-200";
      case "slow":
        return "text-amber-600 bg-amber-50 border-amber-200";
      default:
        return stats.latencyMs > 400 
          ? "text-amber-500 bg-amber-50 border-amber-200" 
          : "text-emerald-600 bg-emerald-50 border-emerald-200";
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm" id="network-dashboard-container">
      {/* Network Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          {stats.mode === "offline" ? (
            <WifiOff className="w-5 h-5 text-red-500" />
          ) : (
            <Wifi className="w-5 h-5 text-emerald-600" />
          )}
          <div>
            <h3 className="font-sans font-semibold text-slate-800 text-sm">Estado de Red</h3>
            <p className="text-xs font-mono text-slate-500">Región de servicio: Guatemala (GT)</p>
          </div>
        </div>
        
        {/* Status indicator pill */}
        <div className={`px-2.5 py-1 rounded-md text-xs font-mono border ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Latency & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <div>
          <label className="block text-xs font-sans font-medium text-slate-600 mb-1">
            Simular condiciones de red:
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              id="network-mode-real"
              onClick={() => onModeChange("real")}
              className={`py-1.5 px-2 rounded-md text-xs font-sans font-medium transition-all ${
                stats.mode === "real"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Normal (Real)
            </button>
            <button
              id="network-mode-slow"
              onClick={() => onModeChange("slow")}
              className={`py-1.5 px-2 rounded-md text-xs font-sans font-medium transition-all ${
                stats.mode === "slow"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Rural (Lenta)
            </button>
            <button
              id="network-mode-offline"
              onClick={() => onModeChange("offline")}
              className={`py-1.5 px-2 rounded-md text-xs font-sans font-medium transition-all ${
                stats.mode === "offline"
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Sin Conexión
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <div className="flex items-center justify-between text-xs font-mono border-2 border-dashed border-slate-100 rounded-lg p-2 bg-slate-50">
            <div>
              <span className="text-slate-500">Sincronización: </span>
              <span className="font-semibold text-slate-800">
                {stats.mode === "offline" ? "Descon." : `${timeSinceLastSync}s atrás`}
              </span>
            </div>
            <button
              id="refresh-sync-btn"
              onClick={onManualSync}
              disabled={isSyncing || stats.mode === "offline"}
              className="flex items-center gap-1 py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sincronizar ahora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="text-[10px] font-sans font-medium">Sincronizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-slate-100 pt-3">
        {/* Latency card */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-center">
          <span className="block text-[10px] font-sans font-semibold text-slate-500 uppercase">Ping Diagnostic</span>
          <span className="text-lg font-mono font-bold text-slate-800">
            {stats.mode === "offline" ? "—" : `${stats.latencyMs} ms`}
          </span>
        </div>

        {/* Bytes transmitted */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-center">
          <span className="block text-[10px] font-sans font-semibold text-slate-500 uppercase">Datos Consumidos</span>
          <span className="text-lg font-mono font-bold text-emerald-600">
            {savings.pingGtkb} <span className="text-xs">KB</span>
          </span>
        </div>

        {/* Standard estimate comparison */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-center">
          <span className="block text-[10px] font-sans font-semibold text-slate-500 uppercase">Apps Estándar</span>
          <span className="text-lg font-mono font-bold text-slate-400">
            {savings.standardKb} <span className="text-xs">KB</span>
          </span>
        </div>

        {/* Combined Savings percentage */}
        <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100 text-center">
          <span className="block text-[10px] font-sans font-bold text-emerald-700 uppercase flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-400" /> Ahorrado (GT)
          </span>
          <span className="text-lg font-mono font-bold text-emerald-700">
            {savings.savedPercent}%
          </span>
        </div>
      </div>

      <p className="text-[10px] font-sans text-slate-500 mt-2 flex items-center gap-1 justify-center">
        <Shield className="w-3.5 h-3.5 text-slate-400" />
        Filosofía Lite: Sin trackers, logos pesados ni telemetría. Tráfico de red reducido de forma óptima.
      </p>
    </div>
  );
}

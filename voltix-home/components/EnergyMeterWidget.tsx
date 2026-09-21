'use client';
import { useState, useMemo } from 'react';
import { Zap, DollarSign, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ApplianceData {
  id: string;
  name: string;
  room: string;
  currentState: boolean;
  online: boolean;
  powerWatts: number;
}

interface EnergyMeterWidgetProps {
  appliances: ApplianceData[];
}

export function EnergyMeterWidget({ appliances }: EnergyMeterWidgetProps) {
  const [costPerKwh, setCostPerKwh] = useState<number>(0.14);
  const [currency, setCurrency] = useState<string>('$');

  const { activeWatts, totalRatedWatts, activeCount, highLoadAppliances } = useMemo(() => {
    let currentActiveWatts = 0;
    let maxRatedWatts = 0;
    let count = 0;
    const highLoad: ApplianceData[] = [];

    appliances.forEach((a) => {
      maxRatedWatts += a.powerWatts || 0;
      if (a.currentState) {
        currentActiveWatts += a.powerWatts || 0;
        count++;
        if ((a.powerWatts || 0) >= 1000) {
          highLoad.push(a);
        }
      }
    });

    return {
      activeWatts: currentActiveWatts,
      totalRatedWatts: maxRatedWatts,
      activeCount: count,
      highLoadAppliances: highLoad,
    };
  }, [appliances]);

  const hourlyCost = (activeWatts / 1000) * costPerKwh;
  const dailyKwh = ((activeWatts * 8) / 1000).toFixed(2);
  const monthlyCostEst = (Number(dailyKwh) * 30 * costPerKwh).toFixed(2);

  const loadPercentage = Math.min(
    100,
    Math.round((activeWatts / (totalRatedWatts || 1)) * 100)
  );

  return (
    <div className="anima-panel space-y-5">
      <div className="corner-lines">
        <div className="corner-lines__top-left" />
        <div className="corner-lines__top-right" />
        <div className="corner-lines__bottom-left" />
        <div className="corner-lines__bottom-right" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e6e6e6] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-tag text-[#808080]">004/</span>
            <h3 className="font-parabole text-2xl font-bold text-[#020202]">
              Power Telemetry & Expenditure Studio
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#575757] font-light mt-1">
            Real-time wattage draw, capacity utilization, and estimated utility cost projections
          </p>
        </div>

        {/* Currency & Rate Select */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#808080]">Rate:</span>
          <div className="flex items-center rounded-xl bg-[#f5f6f6] border border-[#e6e6e6] px-2.5 py-1">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Select currency"
              className="bg-transparent text-[#020202] font-bold focus:outline-none cursor-pointer"
            >
              <option value="$">$</option>
              <option value="₹">₹</option>
              <option value="€">€</option>
              <option value="£">£</option>
            </select>
            <input
              type="number"
              step="0.01"
              value={costPerKwh}
              onChange={(e) => setCostPerKwh(Math.max(0.01, Number(e.target.value)))}
              aria-label="Cost per kilowatt hour"
              className="w-12 bg-transparent text-[#020202] text-right font-bold focus:outline-none ml-1"
            />
            <span className="text-[#808080] text-[10px] ml-1">/kWh</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="rounded-xl bg-[#f5f6f6] border border-[#e6e6e6] p-3.5">
          <span className="text-xs text-[#808080]">Active Power</span>
          <p className="mt-1 font-parabole text-2xl font-bold text-[#020202]">
            {activeWatts.toLocaleString()} <span className="text-sm font-normal text-[#808080]">W</span>
          </p>
          <p className="text-[10px] text-[#808080] mt-0.5">{activeCount} of {appliances.length} devices ON</p>
        </div>

        <div className="rounded-xl bg-[#f5f6f6] border border-[#e6e6e6] p-3.5">
          <span className="text-xs text-[#808080]">Burn Rate / Hr</span>
          <p className="mt-1 font-parabole text-2xl font-bold text-[#020202]">
            {currency}{hourlyCost.toFixed(3)}
          </p>
          <p className="text-[10px] text-[#808080] mt-0.5">{(activeWatts / 1000).toFixed(2)} kWh current draw</p>
        </div>

        <div className="rounded-xl bg-[#f5f6f6] border border-[#e6e6e6] p-3.5">
          <span className="text-xs text-[#808080]">Est. Daily Usage</span>
          <p className="mt-1 font-parabole text-2xl font-bold text-[#020202]">
            {dailyKwh} <span className="text-sm font-normal text-[#808080]">kWh</span>
          </p>
          <p className="text-[10px] text-[#808080] mt-0.5">~8h avg duty cycle</p>
        </div>

        <div className="rounded-xl bg-[#dae4af]/30 border border-[#dae4af] p-3.5">
          <span className="text-xs text-[#576321] font-bold">Monthly Est.</span>
          <p className="mt-1 font-parabole text-2xl font-bold text-[#020202]">
            {currency}{monthlyCostEst}
          </p>
          <p className="text-[10px] text-[#576321] mt-0.5">Based on active habits</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between text-xs text-[#808080]">
          <span>Circuit Capacity Load ({activeWatts}W / {totalRatedWatts}W)</span>
          <span className="font-bold text-[#020202]">{loadPercentage}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#f0f0f0] border border-[#e6e6e6]">
          <div
            className="h-full bg-[#dae4af] rounded-full transition-all duration-500"
            style={{ width: `${Math.max(3, loadPercentage)}%` }}
          />
        </div>
      </div>

      {/* High-load warning */}
      {highLoadAppliances.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-[#ffc687]/30 border border-[#ffc687] px-3.5 py-2.5 text-xs text-[#7f5305]">
          <AlertTriangle className="h-4 w-4 text-[#ce8508] flex-shrink-0" />
          <div>
            <span className="font-bold">High Load Notice: </span>
            {highLoadAppliances.map((a) => `${a.name} (${a.powerWatts}W)`).join(', ')} is currently running. Turn off when leaving to reduce your bill!
          </div>
        </div>
      )}
    </div>
  );
}

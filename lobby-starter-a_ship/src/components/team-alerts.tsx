import { useLobbyContext } from '@/components/lobby/provider';
import { useSnapshot } from 'valtio';
import useServerTimer from '@/hooks/useServerTime';
import type { Role } from '@/types/teamship';
import * as React from 'react';

interface TeamAlert {
  id: string;
  priority: 'critical' | 'urgent' | 'info';
  message: string;
  consequence?: string;
  timeframe?: string;
  duration?: number;
}

const TeamAlerts: React.FC = () => {
  const { lobbyStore, lobbyAwareness } = useLobbyContext();
  const { ship, intents } = useSnapshot(lobbyStore.proxy) as any;
  const presence = useSnapshot(lobbyAwareness.proxy) as any;
  const now = useServerTimer(1000);
  
  const generateAlerts = (): TeamAlert[] => {
    const alerts: TeamAlert[] = [];
    
    // CRITICAL - Ship might sink
    if (ship.health <= 10) {
      alerts.push({
        id: 'health-critical',
        priority: 'critical',
        message: '🚨 SHIP STRUCTURAL FAILURE',
        consequence: 'Ship will sink if damage continues',
        timeframe: 'Immediate action required',
        duration: 0 // always show
      });
    } else if (ship.health <= 25) {
      alerts.push({
        id: 'health-low',
        priority: 'urgent',
        message: '⚠️ Ship taking damage',
        consequence: 'Hull integrity compromised - risk of sinking',
        timeframe: 'Damage accelerating'
      });
    }
    
    // WATER LEVEL - Progressive warnings
    if (ship.water >= 95) {
      alerts.push({
        id: 'water-overflow',
        priority: 'critical',
        message: '🌊 SHIP FLOODING',
        consequence: 'Ship will sink in seconds',
        timeframe: 'Critical - immediate response',
        duration: 0
      });
    } else if (ship.water >= 85) {
      alerts.push({
        id: 'water-critical',
        priority: 'urgent',
        message: '💧 Water level critical',
        consequence: 'Ship becoming unstable - will sink soon',
        timeframe: 'Less than 30 seconds'
      });
    } else if (ship.water >= 70) {
      alerts.push({
        id: 'water-high',
        priority: 'urgent',
        message: '🚰 Water level rising rapidly',
        consequence: 'Ship performance degrading - sinking risk',
        timeframe: 'Under 1 minute to critical'
      });
    }
    
    // HEEL/STABILITY
    if (ship.heel >= 85) {
      alerts.push({
        id: 'heel-critical',
        priority: 'critical',
        message: '⚖️ CAPSIZING IMMINENT',
        consequence: 'Ship will flip over',
        timeframe: 'Seconds to disaster'
      });
    } else if (ship.heel >= 65) {
      alerts.push({
        id: 'heel-high',
        priority: 'urgent',
        message: '⚖️ Ship listing dangerously',
        consequence: 'Risk of capsizing - losing control',
        timeframe: 'Situation worsening'
      });
    }
    
    // SPEED/PROGRESS warnings
    if (ship.speed < 2 && ship.distanceRemaining > 100) {
      alerts.push({
        id: 'speed-low',
        priority: 'info',
        message: '🐌 Making poor progress',
        consequence: 'May not reach destination in time',
        timeframe: 'Time running out'
      });
    }
    
    // EVENT-BASED alerts
    if (ship.eventName) {
      const eventMessages = {
        'gust_squall': {
          message: '🌪️ Sudden wind gust incoming',
          consequence: 'Sails may be overwhelmed - ship could heel dangerously',
          timeframe: 'Impact in seconds'
        },
        'flood_spike': {
          message: '🌊 Water surge detected',
          consequence: 'Rapid flooding - water level will spike',
          timeframe: 'Happening now'
        },
        'cross_set': {
          message: '🌀 Cross current affecting ship',
          consequence: 'Ship drifting off course - may miss target',
          timeframe: 'Ongoing deviation'
        },
        'broach_risk': {
          message: '⚡ Ship becoming uncontrollable',
          consequence: 'Risk of broaching - complete loss of steering',
          timeframe: 'Control deteriorating'
        }
      };
      
      const eventInfo = eventMessages[ship.eventName];
      if (eventInfo) {
        alerts.push({
          id: `event-${ship.eventName}`,
          priority: 'urgent',
          message: eventInfo.message,
          consequence: eventInfo.consequence,
          timeframe: eventInfo.timeframe
        });
      }
    }
    
    // TEAM COORDINATION - Missing roles & multi-player benefits
    const activeRoles = Object.values(presence)
      .map((p: any) => p?.data?.role)
      .filter(Boolean) as Role[];
      
    // Count role distribution  
    const roleCounts = activeRoles.reduce((acc, role) => {
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<Role, number>);
    
    const bailerCount = roleCounts['bailer'] || 0;
    const rowerCount = roleCounts['rower'] || 0;
    
    // Specific multi-player recommendations
    if (ship.water >= 75 && bailerCount < 2) {
      alerts.push({
        id: 'need-more-bailers',
        priority: 'urgent',
        message: `💧 Need more bailers (only ${bailerCount})`,
        consequence: 'Multiple bailers pump water much faster',
        timeframe: 'Water rising faster than current bail rate'
      });
    }
    
    if (ship.speed < 3 && rowerCount < 2 && ship.distanceRemaining > 200) {
      alerts.push({
        id: 'need-more-rowers',
        priority: 'info',
        message: `🚣‍♀️ More rowing power needed (${rowerCount} rowers)`,
        consequence: 'Multiple rowers provide significant speed boost',
        timeframe: 'Progress too slow to reach finish'
      });
    }
    
    if (activeRoles.length < 3) {
      alerts.push({
        id: 'need-crew',
        priority: 'info',
        message: '👥 Understaffed crew',
        consequence: 'Cannot handle multiple problems simultaneously',
        timeframe: 'Performance degraded'
      });
    }
    
    return alerts.sort((a, b) => {
      const priority = { critical: 0, urgent: 1, info: 2 };
      return priority[a.priority] - priority[b.priority];
    });
  };
  
  const alerts = generateAlerts();
  
  if (!alerts.length) return null;
  
  return (
    <div className="space-y-1">
      {alerts.slice(0, 3).map(alert => ( // Show max 3 alerts
        <div 
          key={alert.id}
          className={`alert py-2 px-3 text-left ${
            alert.priority === 'critical' 
              ? 'alert-error animate-pulse' 
              : alert.priority === 'urgent'
              ? 'alert-warning'
              : 'alert-info'
          }`}
        >
          <div className="flex-1">
            <div className="font-bold text-sm">
              {alert.message}
            </div>
            <div className="text-xs opacity-80">
              {alert.consequence && `⚠️ ${alert.consequence}`}
              {alert.consequence && alert.timeframe && ' • '}
              {alert.timeframe && `⏱️ ${alert.timeframe}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamAlerts;
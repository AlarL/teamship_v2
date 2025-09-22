import { useLobbyContext } from '@/components/lobby/provider';
import { useSetPresence } from '@/state/actions/player-actions';
import type { Role } from '@/types/teamship';
import { useSnapshot } from 'valtio';
import { kmClient } from '@/services/km-client';
import * as React from 'react';

interface QuickRoleSwitcherProps {
  className?: string;
}

const ROLE_LABELS: Record<Role, string> = {
  helmsman: '👑 Helmsman',
  sail: '⛵ Sail',
  bailer: '💧 Bailer', 
  rower: '🚣 Rower',
  lookout: '👁 Lookout'
};

const ROLE_ICONS: Record<Role, string> = {
  helmsman: '👑',
  sail: '⛵', 
  bailer: '💧',
  rower: '🚣',
  lookout: '👁'
};

const QuickRoleSwitcher: React.FC<QuickRoleSwitcherProps> = ({ className }) => {
  const { lobbyAwareness } = useLobbyContext();
  const presence = useSnapshot(lobbyAwareness.proxy) as any;
  const setPresence = useSetPresence();
  
  const me = presence[kmClient.connectionId]?.data ?? null;
  const myRole = me?.role ?? null;
  
  const teamMembers = Object.values(presence)
    .map((p: any) => ({ 
      name: (p?.data?.displayName || 'Anonymous').trim(), 
      role: p?.data?.role as Role | null 
    }));
    
  // Count roles instead of just checking if taken
  const roleCounts = teamMembers.reduce((acc, member) => {
    if (member.role) {
      acc[member.role] = (acc[member.role] || 0) + 1;
    }
    return acc;
  }, {} as Record<Role, number>);
  
  const allRoles = ['helmsman', 'sail', 'bailer', 'rower', 'lookout'] as Role[];
    
  const totalSlots = 5;
  const filledSlots = teamMembers.length;
  
  const onRoleChange = (role: Role) => {
    if (role !== myRole) {
      setPresence({ role });
    }
  };

  const containerClass = ['flex flex-wrap items-center gap-3', className].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {/* Team Status */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Team:</span>
        <div className="flex items-center gap-1">
          {Array(totalSlots).fill(0).map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < filledSlots ? 'bg-success' : 'bg-base-300'
              }`}
            />
          ))}
          <span className="ml-1 text-xs opacity-70">
            {filledSlots}/{totalSlots}
          </span>
        </div>
      </div>
      
      {/* Role Switcher */}
      <div className="dropdown dropdown-end w-full sm:w-auto">
        <div 
          tabIndex={0} 
          role="button" 
          className="btn btn-sm bg-primary/10 border-primary/20 hover:bg-primary/20 w-full sm:w-auto"
        >
          <span className="text-sm">
            {myRole ? ROLE_LABELS[myRole] : '🎯 Pick Role'}
          </span>
          <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        <ul 
          tabIndex={0} 
          className="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-full sm:w-60 border border-base-300"
        >
          {allRoles.map(role => {
            const count = roleCounts[role] || 0;
            const isMyRole = role === myRole;
            return (
              <li key={role}>
                <button 
                  onClick={() => onRoleChange(role)}
                  className={`flex items-center justify-between w-full ${
                    isMyRole ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <span>{ROLE_LABELS[role]}</span>
                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <span className={`badge badge-sm ${
                        count > 1 ? 'badge-success' : 'badge-outline'
                      }`}>
                        {count}
                      </span>
                    )}
                    {isMyRole && <span className="text-xs opacity-70">You</span>}
                  </div>
                </button>
              </li>
            );
          })}
          
        </ul>
      </div>
    </div>
  );
};

export default QuickRoleSwitcher;
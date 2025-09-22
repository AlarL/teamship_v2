import { useLobbyContext } from '@/components/lobby/provider';
import { playerActions, useSetPresence } from '@/state/actions/player-actions';
import type { Role } from '@/types/teamship';
import { useSnapshot } from 'valtio';
import { playerStore } from '@/state/stores/player-store';
import * as React from 'react';

const ROLES: { key: Role; name: string; hint: string }[] = [
  { key: 'helmsman', name: 'Helmsman', hint: 'Steer with left/right' },
  { key: 'sail', name: 'Sail Trimmer', hint: 'Trim & gust' },
  { key: 'bailer', name: 'Bailer', hint: 'Rhythmic taps' },
  { key: 'rower', name: 'Rower', hint: 'Alternate left/right' },
  { key: 'lookout', name: 'Lookout', hint: 'Spot hazards & gusts' }
];

const RoleSelectView: React.FC = () => {
  const setPresence = useSetPresence();
  const { lobbyAwareness } = useLobbyContext();
  const presence = useSnapshot(lobbyAwareness.proxy);
  const { displayName } = useSnapshot(playerStore.proxy);

  const takenRoles = new Set(
    Object.values(presence)
      .map((p: any) => p?.data?.role)
      .filter(Boolean) as Role[]
  );

  React.useEffect(() => {
    // keep name synced in awareness
    setPresence({ displayName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  const onPickRole = async (role: Role) => {
    if (takenRoles.has(role)) return;
    setPresence({ role });
    await playerActions.goTo('legend');
  };

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <div className="mx-auto max-w-screen-sm">
        <h2 className="text-xl font-bold mb-4">Pick your role</h2>
        <div className="grid grid-cols-1 gap-3">
          {ROLES.map((r) => {
            const occupiedBy = Object.values(presence).find((p: any) => p?.data?.role === r.key) as any;
            return (
              <button
                key={r.key}
                className={`btn w-full justify-start ${
                  takenRoles.has(r.key) ? 'btn-disabled' : 'btn-primary'
                }`}
                onClick={() => onPickRole(r.key)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-xs opacity-75">{r.hint}</span>
                </div>
                <div className="ml-auto text-xs">
                  {occupiedBy ? `Taken by ${occupiedBy.data?.displayName}` : 'Available'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoleSelectView;

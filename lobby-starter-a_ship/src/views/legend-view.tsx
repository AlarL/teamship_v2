import { useLobbyContext } from '@/components/lobby/provider';
import useHostController from '@/hooks/useHostController';
import { getGameActions } from '@/state/actions/game-actions';
import { playerActions } from '@/state/actions/player-actions';
import { LEGENDS } from '@/types/teamship';
import { useSnapshot } from 'valtio';
import { Rocket, Loader } from 'lucide-react';
import * as React from 'react';

const LegendView: React.FC = () => {
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy);
  const game = getGameActions(lobbyStore);
  const isHost = useHostController();

  const onStart = async () => {
    await game.startCountdown(3);
    await playerActions.goTo('play');
  };

  React.useEffect(() => {
    if (ship.phase === 'countdown' || ship.phase === 'playing') {
      playerActions.goTo('play');
    }
  }, [ship.phase]);

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <div className="mx-auto max-w-screen-sm space-y-4">
        <h2 className="text-xl font-bold">Legend</h2>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {Object.values(LEGENDS).map((l) => (
                <button
                  key={l.id}
                  className={`btn ${l.id === ship.legendId ? 'btn-primary' : ''}`}
                  disabled={!isHost}
                  onClick={() => game.setLegend(l.id)}
                >
                  {l.name}
                </button>
              ))}
            </div>
            <div className="text-sm opacity-80">
              <div>Wind: {LEGENDS[ship.legendId].windDir}° · Force {LEGENDS[ship.legendId].windForce}</div>
              <div>Variance: {LEGENDS[ship.legendId].windVariance}</div>
              <div>Current drift: {LEGENDS[ship.legendId].currentBias}°/s</div>
              <div>Reef severity: {LEGENDS[ship.legendId].reefSeverity}</div>
              <div>Target Distance: {LEGENDS[ship.legendId].targetDistance} m</div>
              <div>Time Limit: {Math.round(LEGENDS[ship.legendId].maxDurationMs / 60000)} min</div>
            </div>
          </div>
        </div>
        {isHost ? (
          <button className="btn btn-primary btn-lg w-full" onClick={onStart}>
            <Rocket className="w-5 h-5 inline mr-2" />Ready · Start Mission
          </button>
        ) : (
          <div className="text-center space-y-2">
            <div className="alert alert-info">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Waiting for Captain to start the mission...</span>
              </div>
            </div>
            <div className="text-sm opacity-70">
              The ship will set sail when the Captain gives the command
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegendView;

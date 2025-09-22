import { useLobbyContext } from '@/components/lobby/provider';
import { LEGENDS, type Role, type AttemptLogEntry } from '@/types/teamship';
import useHostController from '@/hooks/useHostController';
import { getGameActions } from '@/state/actions/game-actions';
import { playerActions } from '@/state/actions/player-actions';
import { useSnapshot } from 'valtio';
import * as React from 'react';
import { kmClient } from '@/services/km-client';
import { getAttemptCopy, describeAttemptOutcome } from '@/utils/attempt-copy';

const ROLE_LABELS: Record<Role, string> = {
  helmsman: 'Helmsman',
  sail: 'Sail Trimmer', 
  bailer: 'Bailer',
  rower: 'Rower',
  lookout: 'Lookout'
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface AttemptEntryProps {
	attempt: AttemptLogEntry;
	index: number;
	total: number;
}

const AttemptEntry: React.FC<AttemptEntryProps> = ({ attempt, index, total }) => {
	const duration = attempt.finishedAt - attempt.at;
	const isSuccess = attempt.reason === 'success';
	const isLatest = index === total - 1;
	const [isExpanded, setIsExpanded] = React.useState(isLatest);
	const attemptCopy = getAttemptCopy(attempt.reason);

	return (
		<div
			key={attempt.finishedAt || index}
			className={`border rounded-lg transition-all ${
				isSuccess ? 'bg-success/10 border-success/20' : 'bg-base-200 border-base-300'
			}`}
		>
			<div
				className="p-3 cursor-pointer hover:bg-base-300/50 transition-colors"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-2">
						<span role="img" aria-label={attemptCopy.title}>{attemptCopy.emoji}</span>
						<span className="font-medium">Attempt #{index + 1}</span>
						{isLatest && <span className="badge badge-primary badge-sm">Latest</span>}
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm opacity-70">{formatDuration(duration)}</span>
						<span
							className={`text-xs transform transition-transform ${
								isExpanded ? 'rotate-90' : ''
							}`}
						>
							▶
						</span>
					</div>
				</div>
				<div className="text-sm mt-1 flex items-center gap-2">
					<span
						className={`px-2 py-1 rounded text-xs font-semibold ${
							isSuccess
								? 'bg-success text-success-content'
								: attempt.reason === 'timeout'
								? 'bg-warning text-warning-content'
								: 'bg-error text-error-content'
						}`}
					>
						{attemptCopy.title}
					</span>
					{attempt.distLeft > 0 && (
						<span className="opacity-70">{Math.round(attempt.distLeft)}m left</span>
					)}
				</div>
			</div>

			{isExpanded && (
				<div className="px-3 pb-3 border-t border-base-300 mt-2 pt-3">
					<div className="bg-base-300/50 rounded p-2 mb-3">
						<div className="font-medium text-sm mb-1">💡 What happened:</div>
						<div className="text-sm">{describeAttemptOutcome(attempt.reason, attempt.distLeft)}</div>
					</div>
					{attempt.stats && (
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div className="bg-base-300/30 rounded p-2 text-center">
								<div className="font-bold">{Math.round(attempt.stats.maxWater || 0)}%</div>
								<div className="text-xs opacity-70">Peak Water</div>
							</div>
							<div className="bg-base-300/30 rounded p-2 text-center">
								<div className="font-bold">{Math.round(attempt.stats.minHealth || 100)}%</div>
								<div className="text-xs opacity-70">Lowest Health</div>
							</div>
							<div className="bg-base-300/30 rounded p-2 text-center">
								<div className="font-bold">{Math.round(attempt.stats.avgCoopScore || 0)}</div>
								<div className="text-xs opacity-70">Avg Teamwork</div>
							</div>
							<div className="bg-base-300/30 rounded p-2 text-center">
								<div className="font-bold">{attempt.stats.activePlayers || 0}</div>
								<div className="text-xs opacity-70">Active Players</div>
							</div>
						</div>
					)}
					{attempt.teamPerf && (
						<div className="mt-3">
							<div className="font-medium text-sm mb-2">👥 Team Performance:</div>
							<div className="space-y-1 text-xs">
								<div className="flex justify-between">
									<span>Most Active:</span>
									<span className="font-medium">{attempt.teamPerf.mostActive || 'N/A'}</span>
								</div>
								<div className="flex justify-between">
									<span>Best Responder:</span>
									<span className="font-medium">{attempt.teamPerf.bestResponder || 'N/A'}</span>
								</div>
								<div className="flex justify-between">
									<span>Role Switches:</span>
									<span className="font-medium">{attempt.teamPerf.totalSwitches || 0}</span>
								</div>
							</div>
						</div>
					)}
					<div className="mt-3 p-2 bg-info/10 border border-info/20 rounded">
						<div className="font-medium text-sm mb-1">📚 For next attempt:</div>
						<div className="text-xs space-y-1">
							{attempt.reason === 'overflow' && (
								<>
									<div>• Assign 2+ people to bailing during water events</div>
									<div>• Watch for high heel - it increases water ingress</div>
								</>
							)}
							{attempt.reason === 'dead' && (
								<>
									<div>• Keep water level below 75% to prevent hull damage</div>
									<div>• Reduce sail power during high heel warnings</div>
								</>
							)}
							{attempt.reason === 'timeout' && (
								<>
									<div>• Coordinate rowers and sails for higher sustained speed</div>
									<div>• Watch mission forecast to prep for late surges</div>
								</>
							)}
							{attempt.reason === 'success' && (
								<div>• Great job! Try a tougher legend for the next challenge.</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const ResultsView: React.FC = () => {
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy);
  const legend = LEGENDS[ship.legendId];
  const isHost = useHostController();
  const actions = getGameActions(lobbyStore);
  const [leaders, setLeaders] = React.useState<any[]>([]);
  const attemptLog = (ship.attemptLog ?? []) as AttemptLogEntry[];
  const lastAttempt = attemptLog.length > 0 ? attemptLog[attemptLog.length - 1] : null;
  const attemptCopy = lastAttempt ? getAttemptCopy(lastAttempt.reason) : null;
  const attemptCount = ship.attempts ?? attemptLog.length;
  const toneTextClass = attemptCopy
    ? attemptCopy.tone === 'success'
      ? 'text-success'
      : attemptCopy.tone === 'warning'
      ? 'text-warning'
      : 'text-error'
    : '';
  const toneBgClass = attemptCopy
    ? attemptCopy.tone === 'success'
      ? 'bg-success/10'
      : attemptCopy.tone === 'warning'
      ? 'bg-warning/10'
      : 'bg-error/10'
    : '';
  const toneBadgeClass = attemptCopy
    ? attemptCopy.tone === 'success'
      ? 'badge-success'
      : attemptCopy.tone === 'warning'
      ? 'badge-warning'
      : 'badge-error'
    : '';

  const attemptStats = lastAttempt?.stats;
  const attemptDurationMs = lastAttempt ? (attemptStats?.durationMs ?? (lastAttempt.finishedAt - lastAttempt.at)) : 0;
  const outcomeDetail = lastAttempt ? describeAttemptOutcome(lastAttempt.reason, lastAttempt.distLeft) : null;
  const distanceLeft = lastAttempt ? Math.max(0, Math.round(lastAttempt.distLeft)) : 0;
  const distanceLabel = !lastAttempt
    ? '--'
    : lastAttempt.reason === 'success'
    ? 'Goal reached'
    : `${distanceLeft}m`;
  const summaryTiles: Array<{ label: string; value: string }> = [
    { label: 'Run Duration', value: formatDuration(attemptDurationMs) },
    { label: 'Lowest Health', value: `${Math.round(attemptStats?.minHealth ?? ship.health)}%` },
    { label: 'Peak Water', value: `${Math.round(attemptStats?.maxWater ?? ship.water)}%` },
    { label: 'Avg Teamwork', value: attemptStats?.avgCoopScore != null ? Math.round(attemptStats.avgCoopScore).toString() : '--' },
    { label: 'Active Players', value: (attemptStats?.activePlayers ?? 0).toString() },
    { label: 'Distance Left', value: distanceLabel }
  ];

  React.useEffect(() => {
    const key = `legend:${ship.legendId}`;
    kmClient
      .listLeaderboardEntries(key, 'asc', { limit: 10 })
      .then((res) => setLeaders(res.entries || []))
      .catch(() => setLeaders([]));
  }, [ship.legendId]);

  // Navigate back to game when host restarts
  React.useEffect(() => {
    if (ship.phase === 'countdown' || ship.phase === 'playing') {
      playerActions.goTo('play');
    }
  }, [ship.phase]);

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <div className="mx-auto max-w-screen-sm space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>{attemptCopy?.emoji ?? '📊'}</span>
          {attemptCopy ? attemptCopy.title : 'Team Result'}
        </h2>
        {/* Main Result Card */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body space-y-3">
            <div className="text-lg font-semibold flex items-center justify-between">
              <span>Legend: {legend.name}</span>
              {lastAttempt && (
                <span className={`badge badge-outline ${toneBadgeClass}`}>{lastAttempt.reason}</span>
              )}
            </div>

            {attemptCopy && (
              <div className={`text-center p-4 rounded-lg ${toneBgClass}`}>
                <div className="text-3xl mb-1">{attemptCopy.emoji}</div>
                <div className={`text-xl font-bold ${toneTextClass}`}>{attemptCopy.title}</div>
                <div className="text-sm opacity-80 mt-1">
                  {attemptCopy.body}
                </div>
                {outcomeDetail && (
                  <div className="text-sm mt-2">{outcomeDetail}</div>
                )}
              </div>
            )}
            
            {/* Quick Stats Grid */}
            {summaryTiles.length > 0 && (
              <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
                {summaryTiles.map(({ label, value }) => (
                  <div key={label} className="bg-base-200 rounded p-3">
                    <div className="text-lg font-bold">{value}</div>
                    <div className="text-sm opacity-70">{label}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Restart / Play Again */}
            {lastAttempt && (
              isHost ? (
                <button
                  className="btn btn-primary btn-lg w-full"
                  onClick={async () => {
                    try {
                      await actions.restartMission(3);
                    } catch (err) {
                      console.error('Failed to restart mission', err);
                    }
                  }}
                >
                  🔄 Play Again
                </button>
              ) : (
                <div className="text-center space-y-2">
                  <div className="alert alert-info">
                    <div className="flex items-center gap-2">
                      <div className="loading loading-spinner loading-sm"></div>
                      <span>Waiting for the Captain to launch the next attempt…</span>
                    </div>
                  </div>
                  <div className="text-sm opacity-70">
                    Stay ready — the crew will embark again once the Captain restarts.
                  </div>
                </div>
              )
            )}
          </div>
        </div>
        
        {/* Team Performance Analysis */}
        {ship.teamAnalytics && (
          <div className="space-y-4">
            {/* Individual Player Performance */}
            {ship.teamAnalytics.playerStats && Object.keys(ship.teamAnalytics.playerStats).length > 0 && (
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title text-lg">👥 Individual Performance</h3>
                  <div className="space-y-3">
                    {Object.entries(ship.teamAnalytics.playerStats).map(([connId, stats]) => (
                      <div key={connId} className="bg-base-200 rounded p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{stats.displayName || `Player-${connId.slice(-4)}`}</div>
                          <div className="text-sm opacity-70">Score: {Math.round(stats.effectivenessScore)}/100</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Active Time: {formatDuration(stats.totalActiveTime)}</div>
                          <div>Actions: {stats.actionsPerformed}</div>
                          <div>Role Switches: {stats.rolesSwitched}</div>
                          <div>Critical Responses: {stats.criticalMoments.filter(m => m.responded).length}/{stats.criticalMoments.length}</div>
                        </div>
                        {/* Role Timeline */}
                        <div className="mt-2">
                          <div className="text-xs opacity-70 mb-1">Roles Played:</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.rolesPlayedLog.map((roleLog, idx) => (
                              <span key={idx} className="badge badge-sm">
                                {roleLog.role ? ROLE_LABELS[roleLog.role] : 'None'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Team Coordination Analysis */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title text-lg">🤝 Team Coordination</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-base-200 rounded p-3 text-center">
                    <div className="text-lg font-bold text-primary">{ship.teamAnalytics.teamwork.simultaneousActions}</div>
                    <div className="text-sm opacity-70">Coordinated Actions</div>
                  </div>
                  <div className="bg-base-200 rounded p-3 text-center">
                    <div className="text-lg font-bold text-info">{Math.round(ship.teamAnalytics.teamwork.roleBalance)}/100</div>
                    <div className="text-sm opacity-70">Role Balance</div>
                  </div>
                  <div className="bg-base-200 rounded p-3 text-center">
                    <div className="text-lg font-bold text-success">{Math.round(ship.teamAnalytics.teamwork.communicationScore)}/100</div>
                    <div className="text-sm opacity-70">Communication</div>
                  </div>
                  <div className="bg-base-200 rounded p-3 text-center">
                    <div className="text-lg font-bold text-warning">{ship.teamAnalytics.teamwork.criticalFailures.length}</div>
                    <div className="text-sm opacity-70">Missed Responses</div>
                  </div>
                </div>
                
                {/* Critical Failures Details */}
                {ship.teamAnalytics.teamwork.criticalFailures.length > 0 && (
                  <div className="mt-4">
                    <div className="font-medium mb-2">Critical Moments Missed:</div>
                    <div className="space-y-1">
                      {ship.teamAnalytics.teamwork.criticalFailures.slice(0, 3).map((failure, idx) => (
                        <div key={idx} className="text-sm bg-warning/10 text-warning rounded p-2">
                          <span className="font-medium">{formatDuration(failure.time - ship.startTimestamp)}</span> - {failure.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mission Progression */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title text-lg">📊 Mission Progression</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-base-200 rounded p-3 text-center">
                    <div className="text-lg font-bold">{ship.teamAnalytics.progression.phasesCompleted}</div>
                    <div className="text-sm opacity-70">Phases Completed</div>
                  </div>
                  <div className="bg-base-200 rounded p-3 text-center">
                    <div className="text-lg font-bold text-success">{ship.teamAnalytics.progression.eventsHandledWell}/{ship.teamAnalytics.progression.eventsEncountered}</div>
                    <div className="text-sm opacity-70">Events Handled Well</div>
                  </div>
                  <div className="bg-base-200 rounded p-3 text-center">
                    <div className="text-lg font-bold text-error">{formatDuration(ship.teamAnalytics.progression.timeSpentInDanger)}</div>
                    <div className="text-sm opacity-70">Time in Danger</div>
                  </div>
                  <div className="bg-base-200 rounded p-3 text-center">
                    <div className="text-lg font-bold text-info">{Math.round(ship.teamAnalytics.progression.averageHealthPerPhase.reduce((a, b) => a + b, 0) / ship.teamAnalytics.progression.averageHealthPerPhase.length || 0)}%</div>
                    <div className="text-sm opacity-70">Avg Health</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recommendations */}
            <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
              <div className="card-body">
                <h3 className="card-title text-lg">💡 Next Time Try:</h3>
                <div className="space-y-2">
                  {(() => {
                    const recommendations = [];
                    
                    if (ship.teamAnalytics.teamwork.roleBalance < 50) {
                      recommendations.push("🔄 Switch roles more frequently to balance workload");
                    }
                    
                    if (ship.teamAnalytics.teamwork.criticalFailures.length > 3) {
                      recommendations.push("⚡ React faster to critical events - practice spotting hazards");
                    }
                    
                    if (ship.teamAnalytics.teamwork.simultaneousActions < 2) {
                      recommendations.push("🤝 Coordinate better - act together during emergencies");
                    }
                    
                    if (ship.teamAnalytics.progression.timeSpentInDanger > 30000) {
                      recommendations.push("🚨 Keep ship healthier - focus more on bailing and repairs");
                    }
                    
                    if (Object.values(ship.teamAnalytics.playerStats || {}).some(p => p.actionsPerformed < 10)) {
                      recommendations.push("🎯 Everyone should stay more active - no passengers!");
                    }
                    
                    if (recommendations.length === 0) {
                      recommendations.push("🎉 Great teamwork! Try a harder legend next time.");
                    }
                    
                    return recommendations.slice(0, 3).map((rec, idx) => (
                      <div key={idx} className="text-sm">{rec}</div>
                    ));
                  })()} 
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body space-y-2">
            <h3 className="card-title">Leaderboard</h3>
            <div className="text-xs opacity-70">Sorted by finish time; coop as tiebreaker</div>
            <ul className="space-y-1">
              {leaders.map((e, i) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="opacity-70">{i + 1}.</span>
                  <span className="font-mono">{e.score} ms</span>
                  <span className="opacity-70">Coop {e.data?.avgCoop ?? '-'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Attempts History with Detailed Stats */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body space-y-3">
            <h3 className="card-title">📈 Mission Attempts</h3>
            <div className="text-sm opacity-70">Total attempts: {attemptCount}</div>
            {attemptLog.length === 0 ? (
              <div className="text-sm opacity-60">No attempts recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {attemptLog.map((attempt, idx) => (
                  <AttemptEntry
                    key={attempt.finishedAt || idx}
                    attempt={attempt}
                    index={idx}
                    total={attemptLog.length}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;

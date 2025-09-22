import { useLobbyContext } from '@/components/lobby/provider';
import { kmClient } from '@/services/km-client';
import { LEGENDS, MISSIONS } from '@/types/teamship';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import useServerTimer from './useServerTime';

export default function useHostController() {
	const { lobbyConnected, lobbyAwareness, lobbyStore } = useLobbyContext();
	const { hostConnectionId } = useSnapshot(lobbyStore.proxy);
	const connections = useSnapshot(lobbyAwareness.proxy);
	const isHost = hostConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(50); // ~20 Hz tick
	const lastTimeRef = useRef<number>(serverTime);
	const hostSinceRef = useRef<number | null>(null);

	// Maintain connection that is assigned to be the host
	useEffect(() => {
		if (!lobbyConnected) {
			return;
		}

		// Check if host is online
		if (connections[hostConnectionId]) {
			return;
		}

		// Select new host, sorting by connection id
		kmClient
			.transact(
				[lobbyStore, lobbyAwareness],
				([lobbyState, awarenessState]) => {
					const connectionIds = Object.keys(awarenessState);
					connectionIds.sort();
					lobbyState.hostConnectionId = connectionIds[0] || '';
				}
			)
			.then(() => {})
			.catch(() => {});
	}, [
		lobbyConnected,
		lobbyStore,
		lobbyAwareness,
		connections,
		hostConnectionId
	]);

	// Track when this client becomes host
	useEffect(() => {
		if (!lobbyConnected) {
			hostSinceRef.current = null;
			return;
		}
		if (isHost) {
			if (hostSinceRef.current === null) hostSinceRef.current = serverTime;
		} else {
			hostSinceRef.current = null;
		}
	}, [lobbyConnected, isHost, serverTime]);

	// Run host logic
	useEffect(() => {
		if (!lobbyConnected || !isHost) {
			return;
		}

		// Game loop
		const last = lastTimeRef.current;
		const dt = Math.max(0.01, Math.min(0.1, (serverTime - last) / 1000)); // clamp 10–100ms
		lastTimeRef.current = serverTime;
		kmClient
			.transact([lobbyStore, lobbyAwareness], ([s, aw]) => {
				const ship = s.ship;
				const legend = LEGENDS[ship.legendId];

				// Manual start only - no auto-start

				// Countdown -> start
				if (ship.phase === 'countdown') {
					if (!ship.startTimestamp) {
						ship.startTimestamp = serverTime + 1000; // mark reference
					}
					if (ship.countdown > 0) {
						ship.countdown = Math.max(0, ship.countdown - dt); // decrease by actual time delta
					}
					if (ship.countdown <= 0) {
						ship.phase = 'playing';
						ship.startTimestamp = serverTime;
						ship.angularVelocity = 0;
						ship.speed = 0;
						ship.water = 0;
						ship.health = 100;
					}
					return;
				}

				if (ship.phase !== 'playing') return;

				// Mission phase and effective environment
				const mission = MISSIONS[ship.missionId || 'maiden_voyage'];
				const elapsed = Math.max(
					0,
					serverTime - (ship.startTimestamp || serverTime)
				);
				let phaseIdx = 0;
				for (let i = 0; i < mission.phases.length; i++) {
					if (elapsed >= mission.phases[i].t) phaseIdx = i;
					else break;
				}
				const phase = mission.phases[phaseIdx];
				ship.missionPhaseIdx = phaseIdx;
				ship.missionPhaseName = phase.name;
				const mod = phase.modifiers;
				const eff = {
					windForce: LEGENDS[ship.legendId].windForce * (mod.windForce ?? 1),
					windVariance: Math.max(
						0,
						LEGENDS[ship.legendId].windVariance * (mod.windVariance ?? 1)
					),
					currentBias:
						LEGENDS[ship.legendId].currentBias + (mod.currentBias ?? 0),
					reefSeverity: Math.max(
						0,
						LEGENDS[ship.legendId].reefSeverity + (mod.reefSeverity ?? 0)
					),
					ingressAdd: mod.ingress ?? 0,
					heelRisk: mod.heelRisk ?? 1
				};
				// Late-stage intensifier (last 60s): ramp 0->1
				const totalDur =
					mission?.durationMs ?? LEGENDS[ship.legendId].maxDurationMs;
				const ramp = Math.max(
					0,
					Math.min(1, (elapsed - Math.max(0, totalDur - 60_000)) / 60_000)
				);
				eff.windForce *= 1 + 0.12 * ramp;
				eff.windVariance *= 1 + 0.5 * ramp;
				eff.currentBias += 0.02 * ramp;
				eff.reefSeverity = Math.min(1, eff.reefSeverity + 0.2 * ramp);
				eff.ingressAdd += 0.05 * ramp;
				eff.heelRisk *= 1 + 0.25 * ramp;

				// Event system - starts gentle and gradually increases intensity
				const now = serverTime;
				const eventActive = (ship.eventUntil ?? 0) > now;

				// Very gradual difficulty ramp-up - keep it calm for longer
				const gameTimeMinutes = elapsed / 60000;
				let eventInterval: number;

				if (gameTimeMinutes < 0.5) {
					// First 30 seconds - very calm, rare events
					eventInterval = 30000; // 30s between events
				} else if (gameTimeMinutes < 1.5) {
					// Next minute - still calm
					eventInterval = 25000; // 25s between events
				} else if (gameTimeMinutes < 2.5) {
					// Minutes 1.5-2.5 - gradual increase
					eventInterval = 20000; // 20s between events
				} else if (gameTimeMinutes < 3.5) {
					// Minutes 2.5-3.5 - moderate activity
					eventInterval = 15000; // 15s between events
				} else {
					// After 3.5 minutes - full challenge for final sprint
					eventInterval = 10000; // 10s between events - intense finish
				}

				const canStart =
					!eventActive && now - (ship.lastEventAt ?? 0) > eventInterval;
				if (canStart) {
					// deterministic pick using seed + elapsed
					const seed = ((ship as any).seed ?? 0) + Math.floor(elapsed / 8000);
					const r = Math.abs(Math.sin(seed * 1337.77));
					let pick: any = null;
					// MORE VARIED EVENTS
					if (r < 0.15) pick = 'flood_spike';
					else if (r < 0.3) pick = 'gust_squall';
					else if (r < 0.45) pick = 'cross_set';
					else if (r < 0.6) pick = 'broach_risk';
					else if (r < 0.75) pick = 'hull_breach';
					else if (r < 0.9) pick = 'sudden_wind_shift';
					else pick = 'steering_failure';
					ship.eventName = pick;
					ship.lastEventAt = now;
					ship.eventUntil = now + 6000; // SHORTER - 6s burst for urgency
				}

				if ((ship.eventUntil ?? 0) > now) {
					switch (ship.eventName) {
						case 'flood_spike':
							eff.ingressAdd += 0.04; // Significant spike - team must bail
							eff.reefSeverity = Math.min(1, eff.reefSeverity + 0.1);
							break;
						case 'gust_squall':
							eff.windForce *= 1.3; // Strong wind - need sail management
							eff.windVariance *= 1.4;
							eff.heelRisk *= 1.25;
							break;
						case 'cross_set':
							eff.currentBias += 0.08; // Strong drift - helmsman + rowers needed
							break;
						case 'broach_risk':
							eff.heelRisk *= 1.5; // Dangerous heel - coordinated response needed
							eff.windVariance *= 1.3;
							break;
						case 'hull_breach':
							eff.ingressAdd += 0.06; // Major leak - all hands bailing
							break;
						case 'sudden_wind_shift':
							eff.windForce *= 0.6; // Major wind drop - rowers take over
							eff.windVariance *= 1.8; // Very gusty - sail coordination critical
							break;
						case 'steering_failure':
							eff.currentBias += Math.random() * 0.12 - 0.06; // Unpredictable - team coordination
							break;
					}
				}

				// Determine target wind angle (45deg off wind for optimal speed)
				const seedVal = (ship as any).seed ?? 0;
				const baseWindDir =
					legend.windDir +
					Math.sin(serverTime / 1000 + seedVal) * 30 * eff.windVariance;
				const windDir = (baseWindDir + 360) % 360;
				let targetAngle = windDir + 90; // beam reach is ideal
				if (targetAngle >= 360) targetAngle -= 360;

				// Collect intents
				const intents = s.intents ?? {};
				const intentEntries = Object.entries(intents);

				// Collect active control effects from all players
				let helmEffect = 0; // -1..1
				let sailTrimTotal = 0,
					sailTrimCount = 0;
				let bailingPower = 0; // [0..1]
				let rowingPowerL = 0,
					rowingPowerR = 0; // 0..1

				// Aggregate intents from all players by role
				const rolesActive = Object.values(aw)
					.map((p: any) => p?.data?.role)
					.filter(Boolean);

				for (const [connId, intent] of intentEntries) {
					const player = aw[connId];
					const role = player?.data?.role;
					if (!intent || !role) continue;

					// Collect by role
					switch (role) {
						case 'helmsman':
							helmEffect = Math.max(
								-1,
								Math.min(1, helmEffect + (intent.helmDelta ?? 0))
							);
							break;
						case 'sail':
							if (typeof intent.sailTrim === 'number') {
								sailTrimTotal += intent.sailTrim;
								sailTrimCount++;
							}
							break;
						case 'bailer':
							const t1 = intent.bailTapAt1 ?? 0;
							const t2 = intent.bailTapAt2 ?? 0;
							const cadence = t1 && t2 ? Math.abs(t1 - t2) / 1000 : 0;
							if (cadence > 0.2 && cadence < 1.0) {
								// More frequent bailing = better power. Decay over time.
								const freshness = Math.max(0, 1 - (now - t1) / 2000); // 2s decay
								const efficiency = Math.max(
									0,
									1 - Math.abs(cadence - 0.5) / 0.5
								); // optimal is ~0.5s
								bailingPower = Math.max(bailingPower, freshness * efficiency);
							}
							break;
						case 'rower':
							const L1 = intent.rowLeftTapAt1 ?? 0;
							const R1 = intent.rowRightTapAt1 ?? 0;
							const L2 = intent.rowLeftTapAt2 ?? 0;
							const R2 = intent.rowRightTapAt2 ?? 0;

							// Left side power
							const leftCadence = L1 && L2 ? Math.abs(L1 - L2) / 1000 : 0;
							if (leftCadence > 0.3 && leftCadence < 1.2) {
								const leftFresh = Math.max(0, 1 - (now - L1) / 2000);
								const leftEff = Math.max(
									0,
									1 - Math.abs(leftCadence - 0.6) / 0.6
								);
								rowingPowerL = Math.max(rowingPowerL, leftFresh * leftEff);
							}

							// Right side power
							const rightCadence = R1 && R2 ? Math.abs(R1 - R2) / 1000 : 0;
							if (rightCadence > 0.3 && rightCadence < 1.2) {
								const rightFresh = Math.max(0, 1 - (now - R1) / 2000);
								const rightEff = Math.max(
									0,
									1 - Math.abs(rightCadence - 0.6) / 0.6
								);
								rowingPowerR = Math.max(rowingPowerR, rightFresh * rightEff);
							}
							break;
						case 'lookout':
							// Lookout provides team-wide buff when active
							if ((intent.lookoutAckAt ?? 0) + 5000 > now) {
								// Recent spot = team buff active
								ship.lookoutBuffUntil =
									now + Math.min(10000, (intent.lookoutFocus ?? 0.5) * 15000);
							}
							break;
					}
				}

				// Teamwork effectiveness - coordination is essential
				const lookoutBuffActive = (ship.lookoutBuffUntil ?? 0) > now;
				let teamEffMultiplier = lookoutBuffActive ? 1.3 : 1.0;

				// Team size penalty - need multiple people for effective operation
				const activePlayerCount = Object.values(aw).filter(
					(p) => p?.data?.role
				).length;
				if (activePlayerCount < 3)
					teamEffMultiplier *= 0.7; // Significant penalty for small teams
				else if (activePlayerCount < 4) teamEffMultiplier *= 0.85; // Moderate penalty

				// Role coverage bonus - incentivize role diversity
				const uniqueRolesForTeam = new Set(
					Object.values(aw)
						.map((p: any) => p?.data?.role)
						.filter(Boolean)
				);
				if (uniqueRolesForTeam.size >= 4) teamEffMultiplier *= 1.15; // Bonus for good role coverage

				// Wind calculation
				const relSigned = ((ship.heading - windDir + 540) % 360) - 180;
				const rel = Math.abs(relSigned);

				// Sail efficiency based on wind angle and trim
				const sailTrim =
					sailTrimCount > 0 ? sailTrimTotal / sailTrimCount : 0.5;
				const sailEff =
					Math.max(0, 1 - Math.abs(rel - 90) / 90) * teamEffMultiplier; // optimal at 90deg
				ship.sailEff = sailEff;
				const trimDiff = Math.abs(sailEff - sailTrim);
				const effectiveSailPower =
					Math.max(0, sailEff * (1 - trimDiff)) * eff.windForce;

				// Speed calculation (affected by sail efficiency and rowing)
				const rowingBonus = (rowingPowerL + rowingPowerR) * 0.7; // rowing gives moderate speed boost
				const totalThrust = effectiveSailPower + rowingBonus;
				ship.speed += (totalThrust * 8 - ship.speed * 2) * dt; // approach target with damping
				ship.speed = Math.max(0, Math.min(10, ship.speed));

				// Turning (helm + wind pressure + current + asymmetric rowing)
				let turnRate = helmEffect * 60; // deg/s base turn rate

				// Wind pressure on sails creates weather helm
				const weatherHelm = effectiveSailPower * 0.3 * (relSigned > 0 ? 1 : -1);
				turnRate += weatherHelm;

				// Current drift
				turnRate += eff.currentBias * 20;

				// Asymmetric rowing
				const rowingTurn = (rowingPowerR - rowingPowerL) * 30;
				turnRate += rowingTurn;

				// Heel affects turning (more heel = harder to turn accurately)
				const heelPenalty = Math.min(1, ship.heel / 100);
				turnRate *= 1 - heelPenalty * 0.5;

				ship.angularVelocity += (turnRate - ship.angularVelocity * 3) * dt; // smooth turn
				ship.heading += ship.angularVelocity * dt;
				ship.heading = (ship.heading + 360) % 360;

				// Heel calculation (wind force vs control)
				const baseHeelTarget = effectiveSailPower * 45 * eff.heelRisk; // wind heels the boat
				const heelTarget = Math.min(85, baseHeelTarget);
				ship.heel += (heelTarget - ship.heel * 0.8) * dt * 2;
				ship.heel = Math.max(0, Math.min(100, ship.heel));

				// Position update
				const speedMS = ship.speed * 0.5; // convert to abstract m/s
				ship.vx += Math.sin((ship.heading * Math.PI) / 180) * speedMS * dt;
				ship.vy += Math.cos((ship.heading * Math.PI) / 180) * speedMS * dt;
				ship.x += ship.vx * dt;
				ship.y += ship.vy * dt;
				ship.vx *= Math.pow(legend.seaDrag, dt); // drag
				ship.vy *= Math.pow(legend.seaDrag, dt);

				// Water ingress - gradual baseline plus event spikes
				let baseIngressRate = 0.005; // Small constant baseline - ship always needs some attention

				// Gradual increase over time to maintain challenge - adjusted for 5min game
				if (gameTimeMinutes > 1) baseIngressRate += 0.002;
				if (gameTimeMinutes > 2.5) baseIngressRate += 0.003;
				if (gameTimeMinutes > 4) baseIngressRate += 0.005;

				// Events create spikes requiring team response
				if (eventActive) {
					baseIngressRate += 0.015; // Significant spike during events
				}

				// Poor ship management increases ingress
				if (ship.heel > 60) baseIngressRate += (0.002 * (ship.heel - 60)) / 40; // Gradual increase
				if (ship.speed > 6) baseIngressRate += 0.001 * (ship.speed - 6); // Speed penalty

				let baseIngress =
					baseIngressRate + eff.reefSeverity * 0.2 + eff.ingressAdd;

				// Heel and speed create multiplicative effects - teamwork needed to manage
				const heelFactor = 1 + Math.pow(ship.heel / 100, 1.5) * 2; // Gradual exponential increase
				const speedFactor = 1 + (ship.speed / 10) * 0.8; // Speed always matters some
				baseIngress *= heelFactor * speedFactor;

				// Bailing effectiveness - powerful but requires good technique and teamwork
				const maxBailingRate = 0.5; // 50% per second max - more effective pumping
				const bailingReduction =
					bailingPower * maxBailingRate * teamEffMultiplier;

				const netIngress = Math.max(0, baseIngress - bailingReduction);
				ship.water += netIngress * 100 * dt; // convert to percentage
				ship.water = Math.max(0, Math.min(100, ship.water));

				// Health degradation - water level directly affects ship condition
				let healthLoss = 0;

				// Water level creates progressive health loss - logical connection
				if (ship.water > 50) {
					healthLoss += Math.pow((ship.water - 50) / 50, 2) * 0.08 * dt; // Exponential after 50%
				}

				// High heel damages structure over time
				if (ship.heel > 70) {
					healthLoss += Math.pow((ship.heel - 70) / 30, 2) * 0.05 * dt;
				}

				// Reef damage during events
				if (eventActive && eff.reefSeverity > 0.3) {
					healthLoss += eff.reefSeverity * 0.15 * dt;
				}

				// High speed in rough conditions damages hull
				if (ship.speed > 7 && (eventActive || ship.heel > 60)) {
					healthLoss += (ship.speed - 7) * 0.02 * dt;
				}

				ship.health -= healthLoss * 100;
				ship.health = Math.max(0, Math.min(100, ship.health));

				// Debug: Log when health is critically low
				if (ship.health <= 5) {
					console.log(`⚠️ Critical health: ${ship.health.toFixed(1)}%`);
				}

				// Distance calculation
				const targetX = legend.targetDistance;
				const distToTarget = Math.sqrt((ship.x - targetX) ** 2 + ship.y ** 2);
				ship.distanceRemaining = Math.max(0, distToTarget);

				// Cooperation score - heavily emphasizes active teamwork
				const activeRoles = Object.values(aw).filter((p: any) => {
					const role = p?.data?.role;
					const intent = intents[p?.connectionId];
					if (!role || !intent) return false;
					return serverTime - (intent.updatedAt ?? 0) < 2000; // active within 2s
				}).length;

				const teamSize = Object.values(aw).length;
				const participationRate = teamSize > 0 ? activeRoles / teamSize : 0;
				const baseCoopScore = participationRate * 50; // up to 50 for full participation

				// Bonus for role diversity
				const uniqueRoles = new Set(
					Object.values(aw)
						.map((p: any) => p?.data?.role)
						.filter(Boolean)
				);
				const diversityBonus = Math.min(25, uniqueRoles.size * 5); // up to 25 for 5 different roles

				// Effectiveness bonus
				const effectivenessBonus = Math.min(
					25,
					(bailingPower +
						(rowingPowerL + rowingPowerR) * 0.5 +
						(sailTrimCount > 0 ? 1 : 0) * 0.5) *
						25
				);

				const targetCoopScore =
					baseCoopScore + diversityBonus + effectivenessBonus;
				ship.coopScore += (targetCoopScore - ship.coopScore) * dt * 2;
				ship.coopScore = Math.max(0, Math.min(100, ship.coopScore));

				// Track attempt statistics during play
				if (!ship.currentAttemptStats) {
					ship.currentAttemptStats = {
						maxWater: 0,
						minHealth: 100,
						coopScoreSum: 0,
						coopSamples: 0,
						playerActions: {},
						startTime: ship.startTimestamp || now
					};
				}

				// Update running stats
				const stats = ship.currentAttemptStats;
				if (stats && stats.maxWater !== undefined) {
					stats.maxWater = Math.max(stats.maxWater, ship.water);
					stats.minHealth = Math.min(stats.minHealth, ship.health);
					stats.coopScoreSum += ship.coopScore;
					stats.coopSamples++;
				}

				// Track player activity
				if (stats) {
					for (const [connId, intent] of intentEntries) {
						const player = aw[connId];
						const displayName =
							player?.data?.displayName || `Player-${connId.slice(-4)}`;
						if (!stats.playerActions[connId]) {
							stats.playerActions[connId] = {
								displayName,
								actions: 0,
								lastActive: now
							};
						}
						if (intent.updatedAt > stats.playerActions[connId].lastActive) {
							stats.playerActions[connId].actions++;
							stats.playerActions[connId].lastActive = now;
						}
					}
				}

				// End conditions
				const timeElapsed = elapsed / 1000;
				const timeLimit = totalDur / 1000;

				// Flag to prevent multiple finalizeRun calls in same transaction
				let gameFinalized = false;

				const finalizeRun = (
					reason: 'success' | 'timeout' | 'dead' | 'overflow'
				) => {
					if (ship.phase === 'finished' || gameFinalized) {
						return;
					}
					gameFinalized = true;

					ship.phase = 'finished';
					ship.endTimestamp = now;

					const attemptLog = ship.attemptLog ?? [];
					const attemptStats = ship.currentAttemptStats || {
						maxWater: ship.water,
						minHealth: ship.health,
						coopScoreSum: ship.coopScore,
						coopSamples: 1,
						playerActions: {},
						startTime: ship.startTimestamp || now
					};
					const playerStats = Object.values(attemptStats.playerActions || {});
					const mostActive = playerStats.reduce(
						(best: any, current: any) =>
							current.actions > (best?.actions || 0) ? current : best,
						null as any
					);

					attemptLog.push({
						at: ship.startTimestamp || now,
						finishedAt: now,
						distLeft: reason === 'success' ? 0 : ship.distanceRemaining,
						reason,
						stats: {
							maxWater: attemptStats.maxWater ?? ship.water,
							minHealth: attemptStats.minHealth ?? ship.health,
							avgCoopScore:
								attemptStats.coopSamples && attemptStats.coopSamples > 0
									? attemptStats.coopScoreSum / attemptStats.coopSamples
									: ship.coopScore,
							activePlayers: playerStats.length,
							endHealth: ship.health,
							endWater: ship.water,
							durationMs: Math.max(0, now - (attemptStats.startTime ?? ship.startTimestamp ?? now))
						},
						teamPerf: {
							mostActive: mostActive?.displayName || 'N/A',
							bestResponder: mostActive?.displayName || 'N/A',
							totalSwitches: 0
						}
					});

					if (import.meta.env.DEV) {
						console.info('[Host] Finalized attempt', {
							reason,
							health: ship.health,
							water: ship.water,
							distanceLeft: ship.distanceRemaining,
							attemptLogSize: attemptLog.length
						});
					}

					ship.attemptLog = attemptLog;
					ship.attempts = attemptLog.length;
					ship.currentAttemptStats = null;
				};

					const hullGone = ship.health <= 1; // display rounds to 0 by then
					const floodedOut = ship.water >= 99;
					if (hullGone || floodedOut) {
						const reason = hullGone ? 'dead' : 'overflow';
						finalizeRun(reason);
						return;
					}

				if (ship.distanceRemaining <= 0) {
					finalizeRun('success');
					return;
				}

				if (timeElapsed >= timeLimit) {
					finalizeRun('timeout');
					return;
				}
			})
			.then(() => {})
			.catch((e) => {
				console.error('Host controller error:', e);
			});
	}, [isHost, lobbyConnected, serverTime, lobbyStore, lobbyAwareness]);

	return isHost;
}
